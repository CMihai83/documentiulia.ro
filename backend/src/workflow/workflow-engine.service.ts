import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

const uuidv4 = () => randomUUID();

export type TriggerType = 'EVENT' | 'SCHEDULE' | 'MANUAL' | 'WEBHOOK' | 'CONDITION';
export type ActionType = 'EMAIL' | 'NOTIFICATION' | 'API_CALL' | 'DATA_UPDATE' | 'APPROVAL' | 'DOCUMENT' | 'INTEGRATION' | 'CUSTOM';
export type StepType = 'ACTION' | 'CONDITION' | 'PARALLEL' | 'LOOP' | 'WAIT' | 'APPROVAL';
export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'WAITING_APPROVAL';
export type ConditionOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'NOT_CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'IN' | 'NOT_IN' | 'IS_NULL' | 'IS_NOT_NULL' | 'MATCHES_REGEX';

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  event?: string;
  schedule?: string; // cron expression
  webhookPath?: string;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  name: string;
  nameRo: string;
  config: Record<string, any>;
  retryOnFailure?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  nameRo: string;
  order: number;
  action?: WorkflowAction;
  conditions?: WorkflowCondition[];
  trueBranch?: string; // step id
  falseBranch?: string; // step id
  parallelSteps?: string[]; // step ids
  loopConfig?: {
    collection: string;
    itemVariable: string;
    maxIterations?: number;
  };
  waitConfig?: {
    durationMs?: number;
    untilCondition?: WorkflowCondition;
    untilEvent?: string;
  };
  approvalConfig?: {
    approvers: string[];
    requiredApprovals: number;
    timeoutHours?: number;
    escalateTo?: string[];
  };
  nextStep?: string; // step id
  onError?: 'STOP' | 'CONTINUE' | 'RETRY' | 'GOTO';
  errorGotoStep?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: string;
  version: number;
  status: WorkflowStatus;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  variables: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tenantId?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  triggeredBy: string;
  triggerType: TriggerType;
  triggerData: Record<string, any>;
  variables: Record<string, any>;
  currentStepId?: string;
  stepResults: StepResult[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  logs: ExecutionLog[];
  approvals: ApprovalRecord[];
}

export interface StepResult {
  stepId: string;
  stepName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startedAt?: Date;
  completedAt?: Date;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  stepId?: string;
  data?: Record<string, any>;
}

export interface ApprovalRecord {
  id: string;
  stepId: string;
  approverId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  decidedAt?: Date;
}

export type CreateConditionDto = Omit<WorkflowCondition, 'id'>;
export type CreateActionDto = Omit<WorkflowAction, 'id'>;
export type CreateTriggerDto = Omit<WorkflowTrigger, 'id' | 'conditions'> & { conditions?: CreateConditionDto[] };
export type CreateStepDto = Omit<WorkflowStep, 'id' | 'action' | 'conditions'> & {
  action?: CreateActionDto;
  conditions?: CreateConditionDto[];
};

export interface CreateWorkflowDto {
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: string;
  triggers: CreateTriggerDto[];
  steps: CreateStepDto[];
  variables?: Record<string, any>;
  tenantId?: string;
  tags?: string[];
  createdBy: string;
}

export interface ExecuteWorkflowDto {
  workflowId: string;
  triggeredBy: string;
  triggerType?: TriggerType;
  triggerData?: Record<string, any>;
  variables?: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: string;
  workflow: Omit<CreateWorkflowDto, 'createdBy' | 'tenantId'>;
  usageCount: number;
}

export interface WorkflowAnalytics {
  workflowId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDurationMs: number;
  executionsByDay: { date: string; count: number }[];
  stepPerformance: { stepId: string; stepName: string; avgDurationMs: number; failureRate: number }[];
  bottlenecks: { stepId: string; stepName: string; avgWaitTimeMs: number }[];
}

@Injectable()
export class WorkflowEngineService {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private webhookHandlers: Map<string, string> = new Map(); // path -> workflowId

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeTemplates();
    this.setupEventListeners();
  }

  private initializeTemplates(): void {
    const templates: WorkflowTemplate[] = [
      {
        id: 'tpl-invoice-approval',
        name: 'Invoice Approval Workflow',
        nameRo: 'Flux Aprobare Factură',
        description: 'Automated invoice approval with multi-level authorization',
        descriptionRo: 'Aprobare automată a facturilor cu autorizare multi-nivel',
        category: 'FINANCE',
        workflow: {
          name: 'Invoice Approval',
          nameRo: 'Aprobare Factură',
          description: 'Automated invoice approval workflow',
          descriptionRo: 'Flux de lucru pentru aprobarea automată a facturilor',
          category: 'FINANCE',
          triggers: [{ type: 'EVENT', event: 'invoice.created' }],
          steps: [
            {
              type: 'CONDITION',
              name: 'Check Amount',
              nameRo: 'Verificare Sumă',
              order: 1,
              conditions: [{ field: 'amount', operator: 'GREATER_THAN', value: 10000 }],
              trueBranch: 'step-2',
              falseBranch: 'step-3',
            },
            {
              type: 'APPROVAL',
              name: 'Manager Approval',
              nameRo: 'Aprobare Manager',
              order: 2,
              approvalConfig: { approvers: ['manager'], requiredApprovals: 1, timeoutHours: 48 },
              nextStep: 'step-3',
            },
            {
              type: 'ACTION',
              name: 'Auto Approve',
              nameRo: 'Aprobare Automată',
              order: 3,
              action: {
                type: 'DATA_UPDATE',
                name: 'Update Status',
                nameRo: 'Actualizare Status',
                config: { entity: 'invoice', field: 'status', value: 'APPROVED' },
              },
            },
          ],
          variables: { notifyFinance: true },
          tags: ['finance', 'approval', 'invoice'],
        },
        usageCount: 156,
      },
      {
        id: 'tpl-employee-onboarding',
        name: 'Employee Onboarding',
        nameRo: 'Onboarding Angajat',
        description: 'Complete employee onboarding process automation',
        descriptionRo: 'Automatizarea completă a procesului de onboarding',
        category: 'HR',
        workflow: {
          name: 'Employee Onboarding',
          nameRo: 'Onboarding Angajat',
          description: 'Automated employee onboarding workflow',
          descriptionRo: 'Flux de lucru pentru onboarding automat angajați',
          category: 'HR',
          triggers: [{ type: 'EVENT', event: 'employee.hired' }],
          steps: [
            {
              type: 'PARALLEL',
              name: 'Setup Tasks',
              nameRo: 'Sarcini Configurare',
              order: 1,
              parallelSteps: ['step-2', 'step-3', 'step-4'],
              nextStep: 'step-5',
            },
            {
              type: 'ACTION',
              name: 'Create Email',
              nameRo: 'Creare Email',
              order: 2,
              action: {
                type: 'INTEGRATION',
                name: 'Create Email Account',
                nameRo: 'Creare Cont Email',
                config: { service: 'email', action: 'create_account' },
              },
            },
            {
              type: 'ACTION',
              name: 'Setup Access',
              nameRo: 'Configurare Acces',
              order: 3,
              action: {
                type: 'INTEGRATION',
                name: 'Grant System Access',
                nameRo: 'Acordare Acces Sistem',
                config: { service: 'access', action: 'grant_default_permissions' },
              },
            },
            {
              type: 'ACTION',
              name: 'Assign Equipment',
              nameRo: 'Alocare Echipament',
              order: 4,
              action: {
                type: 'NOTIFICATION',
                name: 'Notify IT',
                nameRo: 'Notificare IT',
                config: { channel: 'email', recipient: 'it@company.com', template: 'equipment_request' },
              },
            },
            {
              type: 'ACTION',
              name: 'Welcome Email',
              nameRo: 'Email Bun Venit',
              order: 5,
              action: {
                type: 'EMAIL',
                name: 'Send Welcome',
                nameRo: 'Trimite Bun Venit',
                config: { template: 'welcome_employee', recipient: '{{employee.email}}' },
              },
            },
          ],
          variables: { department: '', startDate: '' },
          tags: ['hr', 'onboarding', 'employee'],
        },
        usageCount: 89,
      },
      {
        id: 'tpl-anaf-submission',
        name: 'ANAF Document Submission',
        nameRo: 'Depunere Document ANAF',
        description: 'Automated ANAF e-Factura and SAF-T submission',
        descriptionRo: 'Depunere automată e-Factura și SAF-T la ANAF',
        category: 'COMPLIANCE',
        workflow: {
          name: 'ANAF Submission',
          nameRo: 'Depunere ANAF',
          description: 'Automated ANAF compliance submission',
          descriptionRo: 'Depunere automată pentru conformitate ANAF',
          category: 'COMPLIANCE',
          triggers: [{ type: 'SCHEDULE', schedule: '0 9 * * 1' }], // Every Monday at 9 AM
          steps: [
            {
              type: 'ACTION',
              name: 'Generate XML',
              nameRo: 'Generare XML',
              order: 1,
              action: {
                type: 'DOCUMENT',
                name: 'Generate e-Factura XML',
                nameRo: 'Generare XML e-Factura',
                config: { format: 'RO_CIUS_UBL_2.1', validate: true },
              },
              nextStep: 'step-2',
            },
            {
              type: 'ACTION',
              name: 'Validate XML',
              nameRo: 'Validare XML',
              order: 2,
              action: {
                type: 'INTEGRATION',
                name: 'DUKIntegrator Validation',
                nameRo: 'Validare DUKIntegrator',
                config: { service: 'duk_integrator', action: 'validate' },
              },
              nextStep: 'step-3',
              onError: 'GOTO',
              errorGotoStep: 'step-error',
            },
            {
              type: 'ACTION',
              name: 'Submit to ANAF',
              nameRo: 'Depunere ANAF',
              order: 3,
              action: {
                type: 'API_CALL',
                name: 'ANAF SPV Submit',
                nameRo: 'Depunere ANAF SPV',
                config: { endpoint: 'anaf_spv', method: 'POST', retryOnFailure: true, maxRetries: 3 },
                retryOnFailure: true,
                maxRetries: 3,
              },
              nextStep: 'step-4',
            },
            {
              type: 'ACTION',
              name: 'Notify Success',
              nameRo: 'Notificare Succes',
              order: 4,
              action: {
                type: 'NOTIFICATION',
                name: 'Submission Complete',
                nameRo: 'Depunere Completă',
                config: { channel: 'email', recipient: 'accounting@company.com', template: 'anaf_success' },
              },
            },
          ],
          variables: { period: 'monthly', documentType: 'e-factura' },
          tags: ['anaf', 'compliance', 'e-factura', 'saf-t'],
        },
        usageCount: 234,
      },
      {
        id: 'tpl-inventory-reorder',
        name: 'Inventory Reorder',
        nameRo: 'Reaprovizionare Stoc',
        description: 'Automatic inventory reorder when stock is low',
        descriptionRo: 'Reaprovizionare automată când stocul este scăzut',
        category: 'LOGISTICS',
        workflow: {
          name: 'Inventory Reorder',
          nameRo: 'Reaprovizionare Stoc',
          description: 'Automated inventory reorder workflow',
          descriptionRo: 'Flux de lucru pentru reaprovizionare automată',
          category: 'LOGISTICS',
          triggers: [{ type: 'EVENT', event: 'inventory.low_stock' }],
          steps: [
            {
              type: 'CONDITION',
              name: 'Check Supplier',
              nameRo: 'Verificare Furnizor',
              order: 1,
              conditions: [{ field: 'preferredSupplier', operator: 'IS_NOT_NULL', value: null }],
              trueBranch: 'step-2',
              falseBranch: 'step-3',
            },
            {
              type: 'ACTION',
              name: 'Auto Order',
              nameRo: 'Comandă Automată',
              order: 2,
              action: {
                type: 'API_CALL',
                name: 'Create Purchase Order',
                nameRo: 'Creare Comandă Achiziție',
                config: { endpoint: 'purchase_orders', method: 'POST', body: '{{orderData}}' },
              },
              nextStep: 'step-4',
            },
            {
              type: 'ACTION',
              name: 'Notify Procurement',
              nameRo: 'Notificare Achiziții',
              order: 3,
              action: {
                type: 'NOTIFICATION',
                name: 'Manual Order Required',
                nameRo: 'Comandă Manuală Necesară',
                config: { channel: 'email', recipient: 'procurement@company.com', template: 'manual_order_required' },
              },
              nextStep: 'step-4',
            },
            {
              type: 'ACTION',
              name: 'Update Stock Status',
              nameRo: 'Actualizare Status Stoc',
              order: 4,
              action: {
                type: 'DATA_UPDATE',
                name: 'Mark as Reordering',
                nameRo: 'Marcare În Reaprovizionare',
                config: { entity: 'inventory_item', field: 'reorderStatus', value: 'IN_PROGRESS' },
              },
            },
          ],
          variables: { minOrderQuantity: 100, leadTimeDays: 7 },
          tags: ['inventory', 'logistics', 'reorder', 'procurement'],
        },
        usageCount: 178,
      },
    ];

    templates.forEach(t => this.templates.set(t.id, t));
  }

  private setupEventListeners(): void {
    // Listen for any event and check if it triggers a workflow
    this.eventEmitter.on('**', (data: any, eventName?: string) => {
      if (eventName) {
        this.handleEvent(eventName, data);
      }
    });
  }

  private async handleEvent(eventName: string, data: any): Promise<void> {
    for (const workflow of this.workflows.values()) {
      if (workflow.status !== 'ACTIVE') continue;

      for (const trigger of workflow.triggers) {
        if (trigger.type === 'EVENT' && trigger.event === eventName) {
          // Check trigger conditions if any
          if (trigger.conditions && trigger.conditions.length > 0) {
            if (!this.evaluateConditions(trigger.conditions, data)) {
              continue;
            }
          }

          await this.executeWorkflow({
            workflowId: workflow.id,
            triggeredBy: 'system',
            triggerType: 'EVENT',
            triggerData: { event: eventName, ...data },
          });
        }
      }
    }
  }

  async createWorkflow(data: CreateWorkflowDto): Promise<Workflow> {
    if (!data.name || !data.nameRo) {
      throw new BadRequestException('Name is required in both languages');
    }

    if (!data.steps || data.steps.length === 0) {
      throw new BadRequestException('At least one step is required');
    }

    const workflow: Workflow = {
      id: `wf-${uuidv4()}`,
      name: data.name,
      nameRo: data.nameRo,
      description: data.description,
      descriptionRo: data.descriptionRo,
      category: data.category,
      version: 1,
      status: 'DRAFT',
      triggers: data.triggers.map(t => ({
        ...t,
        id: `trg-${uuidv4()}`,
        conditions: t.conditions?.map(c => ({ ...c, id: `cond-${uuidv4()}` })),
      })),
      steps: data.steps.map(s => ({
        ...s,
        id: `step-${uuidv4()}`,
        action: s.action ? { ...s.action, id: `act-${uuidv4()}` } : undefined,
        conditions: s.conditions?.map(c => ({ ...c, id: `cond-${uuidv4()}` })),
      })),
      variables: data.variables || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: data.createdBy,
      tenantId: data.tenantId,
      tags: data.tags || [],
      metadata: {},
    };

    this.workflows.set(workflow.id, workflow);

    this.eventEmitter.emit('workflow.created', { workflowId: workflow.id, name: workflow.name });

    return workflow;
  }

  async updateWorkflow(workflowId: string, updates: Partial<CreateWorkflowDto>): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    // Create new version
    const updatedWorkflow: Workflow = {
      ...workflow,
      ...updates,
      version: workflow.version + 1,
      updatedAt: new Date(),
      triggers: updates.triggers
        ? updates.triggers.map(t => ({
            ...t,
            id: `trg-${uuidv4()}`,
            conditions: t.conditions?.map(c => ({ ...c, id: `cond-${uuidv4()}` })),
          }))
        : workflow.triggers,
      steps: updates.steps
        ? updates.steps.map(s => ({
            ...s,
            id: `step-${uuidv4()}`,
            action: s.action ? { ...s.action, id: `act-${uuidv4()}` } : undefined,
            conditions: s.conditions?.map(c => ({ ...c, id: `cond-${uuidv4()}` })),
          }))
        : workflow.steps,
    };

    this.workflows.set(workflowId, updatedWorkflow);

    this.eventEmitter.emit('workflow.updated', { workflowId, version: updatedWorkflow.version });

    return updatedWorkflow;
  }

  async activateWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    workflow.status = 'ACTIVE';
    workflow.updatedAt = new Date();

    // Setup scheduled triggers
    for (const trigger of workflow.triggers) {
      if (trigger.type === 'SCHEDULE' && trigger.schedule) {
        this.setupScheduledTrigger(workflow.id, trigger);
      }
      if (trigger.type === 'WEBHOOK' && trigger.webhookPath) {
        this.webhookHandlers.set(trigger.webhookPath, workflow.id);
      }
    }

    this.eventEmitter.emit('workflow.activated', { workflowId });

    return workflow;
  }

  async pauseWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    workflow.status = 'PAUSED';
    workflow.updatedAt = new Date();

    // Cancel scheduled triggers
    const jobKey = `${workflowId}-schedule`;
    if (this.scheduledJobs.has(jobKey)) {
      clearInterval(this.scheduledJobs.get(jobKey));
      this.scheduledJobs.delete(jobKey);
    }

    this.eventEmitter.emit('workflow.paused', { workflowId });

    return workflow;
  }

  async archiveWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    workflow.status = 'ARCHIVED';
    workflow.updatedAt = new Date();

    // Cleanup triggers
    const jobKey = `${workflowId}-schedule`;
    if (this.scheduledJobs.has(jobKey)) {
      clearInterval(this.scheduledJobs.get(jobKey));
      this.scheduledJobs.delete(jobKey);
    }

    for (const trigger of workflow.triggers) {
      if (trigger.type === 'WEBHOOK' && trigger.webhookPath) {
        this.webhookHandlers.delete(trigger.webhookPath);
      }
    }

    this.eventEmitter.emit('workflow.archived', { workflowId });

    return workflow;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    // Archive first to cleanup triggers
    await this.archiveWorkflow(workflowId);

    this.workflows.delete(workflowId);

    this.eventEmitter.emit('workflow.deleted', { workflowId });
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  getAllWorkflows(filters?: { status?: WorkflowStatus; category?: string; tenantId?: string }): Workflow[] {
    let workflows = Array.from(this.workflows.values());

    if (filters?.status) {
      workflows = workflows.filter(w => w.status === filters.status);
    }
    if (filters?.category) {
      workflows = workflows.filter(w => w.category === filters.category);
    }
    if (filters?.tenantId) {
      workflows = workflows.filter(w => w.tenantId === filters.tenantId);
    }

    return workflows;
  }

  private setupScheduledTrigger(workflowId: string, trigger: WorkflowTrigger): void {
    // Simple interval-based scheduling (in production, use node-cron or similar)
    const intervalMs = this.parseScheduleToMs(trigger.schedule!);
    if (intervalMs > 0) {
      const jobKey = `${workflowId}-schedule`;
      const interval = setInterval(async () => {
        await this.executeWorkflow({
          workflowId,
          triggeredBy: 'scheduler',
          triggerType: 'SCHEDULE',
          triggerData: { schedule: trigger.schedule },
        });
      }, intervalMs);
      this.scheduledJobs.set(jobKey, interval);
    }
  }

  private parseScheduleToMs(schedule: string): number {
    // Simple parsing for demo - in production use node-cron
    if (schedule.includes('* * * * *')) return 60000; // every minute
    if (schedule.startsWith('0 * * * *')) return 3600000; // every hour
    if (schedule.startsWith('0 0 * * *')) return 86400000; // daily
    if (schedule.startsWith('0 9 * * 1')) return 604800000; // weekly
    return 86400000; // default daily
  }

  async executeWorkflow(data: ExecuteWorkflowDto): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(data.workflowId);
    if (!workflow) {
      throw new NotFoundException(`Workflow ${data.workflowId} not found`);
    }

    if (workflow.status !== 'ACTIVE' && data.triggerType !== 'MANUAL') {
      throw new BadRequestException('Workflow is not active');
    }

    const execution: WorkflowExecution = {
      id: `exec-${uuidv4()}`,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: 'RUNNING',
      triggeredBy: data.triggeredBy,
      triggerType: data.triggerType || 'MANUAL',
      triggerData: data.triggerData || {},
      variables: { ...workflow.variables, ...data.variables },
      stepResults: [],
      startedAt: new Date(),
      logs: [],
      approvals: [],
    };

    this.executions.set(execution.id, execution);

    this.addLog(execution, 'INFO', `Workflow execution started`, undefined, { triggeredBy: data.triggeredBy });

    // Execute steps
    await this.executeSteps(workflow, execution);

    return execution;
  }

  private async executeSteps(workflow: Workflow, execution: WorkflowExecution): Promise<void> {
    const steps = [...workflow.steps].sort((a, b) => a.order - b.order);

    let currentStepIndex = 0;
    const stepMap = new Map<string, WorkflowStep>();
    steps.forEach(s => stepMap.set(s.id, s));

    while (currentStepIndex < steps.length && execution.status === 'RUNNING') {
      const step = steps[currentStepIndex];
      execution.currentStepId = step.id;

      const result = await this.executeStep(step, execution, stepMap);
      execution.stepResults.push(result);

      if (result.status === 'FAILED') {
        if (step.onError === 'STOP') {
          execution.status = 'FAILED';
          execution.error = result.error;
          break;
        } else if (step.onError === 'GOTO' && step.errorGotoStep) {
          const gotoIndex = steps.findIndex(s => s.id === step.errorGotoStep);
          if (gotoIndex >= 0) {
            currentStepIndex = gotoIndex;
            continue;
          }
        } else if (step.onError === 'RETRY' && result.retryCount < (step.action?.maxRetries || 3)) {
          // Retry will be handled in executeStep
        }
        // CONTINUE - just move to next step
      }

      // Handle branching
      if (step.type === 'CONDITION' && result.output?.branch) {
        const branchStepId = result.output.branch;
        const branchIndex = steps.findIndex(s => s.id === branchStepId);
        if (branchIndex >= 0) {
          currentStepIndex = branchIndex;
          continue;
        }
      }

      // Handle next step
      if (step.nextStep) {
        const nextIndex = steps.findIndex(s => s.id === step.nextStep);
        if (nextIndex >= 0) {
          currentStepIndex = nextIndex;
          continue;
        }
      }

      currentStepIndex++;
    }

    if (execution.status === 'RUNNING') {
      execution.status = 'COMPLETED';
    }

    execution.completedAt = new Date();
    execution.currentStepId = undefined;

    this.addLog(execution, 'INFO', `Workflow execution ${execution.status.toLowerCase()}`);

    this.eventEmitter.emit('workflow.execution.completed', {
      executionId: execution.id,
      workflowId: workflow.id,
      status: execution.status,
    });
  }

  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    stepMap: Map<string, WorkflowStep>,
  ): Promise<StepResult> {
    const result: StepResult = {
      stepId: step.id,
      stepName: step.name,
      status: 'RUNNING',
      startedAt: new Date(),
      retryCount: 0,
    };

    this.addLog(execution, 'INFO', `Executing step: ${step.name}`, step.id);

    try {
      switch (step.type) {
        case 'ACTION':
          await this.executeAction(step.action!, execution);
          result.output = { actionCompleted: true };
          break;

        case 'CONDITION':
          const conditionResult = this.evaluateConditions(step.conditions || [], execution.variables);
          result.output = {
            conditionResult,
            branch: conditionResult ? step.trueBranch : step.falseBranch,
          };
          break;

        case 'PARALLEL':
          if (step.parallelSteps && step.parallelSteps.length > 0) {
            const parallelResults = await Promise.all(
              step.parallelSteps.map(stepId => {
                const parallelStep = stepMap.get(stepId);
                if (parallelStep) {
                  return this.executeStep(parallelStep, execution, stepMap);
                }
                return Promise.resolve({ stepId, stepName: 'Unknown', status: 'SKIPPED' as const, retryCount: 0 });
              }),
            );
            result.output = { parallelResults };
          }
          break;

        case 'LOOP':
          if (step.loopConfig) {
            const collection = this.resolveVariable(step.loopConfig.collection, execution.variables);
            if (Array.isArray(collection)) {
              const loopResults: any[] = [];
              const maxIterations = step.loopConfig.maxIterations || collection.length;
              for (let i = 0; i < Math.min(collection.length, maxIterations); i++) {
                execution.variables[step.loopConfig.itemVariable] = collection[i];
                loopResults.push({ iteration: i, item: collection[i] });
              }
              result.output = { loopResults, iterations: loopResults.length };
            }
          }
          break;

        case 'WAIT':
          if (step.waitConfig?.durationMs) {
            await this.delay(step.waitConfig.durationMs);
          }
          result.output = { waited: true, durationMs: step.waitConfig?.durationMs };
          break;

        case 'APPROVAL':
          if (step.approvalConfig) {
            const approval = await this.createApprovalRequest(step, execution);
            if (approval.status === 'PENDING') {
              execution.status = 'WAITING_APPROVAL';
              result.status = 'PENDING';
              result.output = { approvalId: approval.id, status: 'PENDING' };
              return result;
            }
            result.output = { approvalId: approval.id, status: approval.status };
          }
          break;
      }

      result.status = 'COMPLETED';
      result.completedAt = new Date();
    } catch (error) {
      result.status = 'FAILED';
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = new Date();

      this.addLog(execution, 'ERROR', `Step failed: ${result.error}`, step.id);

      // Handle retry
      if (step.action?.retryOnFailure && result.retryCount < (step.action.maxRetries || 3)) {
        result.retryCount++;
        await this.delay(1000 * result.retryCount); // Exponential backoff
        return this.executeStep(step, execution, stepMap);
      }
    }

    return result;
  }

  private async executeAction(action: WorkflowAction, execution: WorkflowExecution): Promise<void> {
    this.addLog(execution, 'INFO', `Executing action: ${action.name}`, undefined, { type: action.type });

    switch (action.type) {
      case 'EMAIL':
        // Simulate email sending
        this.addLog(execution, 'INFO', `Sending email to ${action.config.recipient}`);
        await this.delay(100);
        break;

      case 'NOTIFICATION':
        // Simulate notification
        this.addLog(execution, 'INFO', `Sending notification via ${action.config.channel}`);
        await this.delay(50);
        break;

      case 'API_CALL':
        // Simulate API call
        this.addLog(execution, 'INFO', `Making API call to ${action.config.endpoint}`);
        await this.delay(200);
        break;

      case 'DATA_UPDATE':
        // Simulate data update
        this.addLog(execution, 'INFO', `Updating ${action.config.entity}.${action.config.field}`);
        execution.variables[`${action.config.entity}_${action.config.field}`] = action.config.value;
        break;

      case 'DOCUMENT':
        // Simulate document generation
        this.addLog(execution, 'INFO', `Generating document: ${action.config.format}`);
        await this.delay(300);
        break;

      case 'INTEGRATION':
        // Simulate integration call
        this.addLog(execution, 'INFO', `Calling integration: ${action.config.service}`);
        await this.delay(250);
        break;

      case 'CUSTOM':
        // Custom action handler
        this.addLog(execution, 'INFO', `Executing custom action`);
        break;

      case 'APPROVAL':
        // Handled in step execution
        break;
    }
  }

  private evaluateConditions(conditions: WorkflowCondition[], context: Record<string, any>): boolean {
    if (conditions.length === 0) return true;

    let result = this.evaluateCondition(conditions[0], context);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, context);

      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(condition: WorkflowCondition, context: Record<string, any>): boolean {
    const fieldValue = this.resolveVariable(condition.field, context);
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'EQUALS':
        return fieldValue === compareValue;
      case 'NOT_EQUALS':
        return fieldValue !== compareValue;
      case 'GREATER_THAN':
        return Number(fieldValue) > Number(compareValue);
      case 'LESS_THAN':
        return Number(fieldValue) < Number(compareValue);
      case 'CONTAINS':
        return String(fieldValue).includes(String(compareValue));
      case 'NOT_CONTAINS':
        return !String(fieldValue).includes(String(compareValue));
      case 'STARTS_WITH':
        return String(fieldValue).startsWith(String(compareValue));
      case 'ENDS_WITH':
        return String(fieldValue).endsWith(String(compareValue));
      case 'IN':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'NOT_IN':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      case 'IS_NULL':
        return fieldValue === null || fieldValue === undefined;
      case 'IS_NOT_NULL':
        return fieldValue !== null && fieldValue !== undefined;
      case 'MATCHES_REGEX':
        return new RegExp(String(compareValue)).test(String(fieldValue));
      default:
        return false;
    }
  }

  private resolveVariable(path: string, context: Record<string, any>): any {
    if (path.startsWith('{{') && path.endsWith('}}')) {
      path = path.slice(2, -2);
    }

    const parts = path.split('.');
    let value = context;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }

    return value;
  }

  private async createApprovalRequest(step: WorkflowStep, execution: WorkflowExecution): Promise<ApprovalRecord> {
    const approval: ApprovalRecord = {
      id: `apr-${uuidv4()}`,
      stepId: step.id,
      approverId: step.approvalConfig!.approvers[0],
      status: 'PENDING',
    };

    execution.approvals.push(approval);

    this.eventEmitter.emit('workflow.approval.requested', {
      executionId: execution.id,
      approvalId: approval.id,
      approvers: step.approvalConfig!.approvers,
    });

    // For testing, auto-approve after short delay
    setTimeout(() => {
      approval.status = 'APPROVED';
      approval.decidedAt = new Date();
      if (execution.status === 'WAITING_APPROVAL') {
        execution.status = 'RUNNING';
        // Resume execution...
      }
    }, 100);

    return approval;
  }

  async handleApproval(executionId: string, approvalId: string, decision: 'APPROVED' | 'REJECTED', approverId: string, comment?: string): Promise<ApprovalRecord> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    const approval = execution.approvals.find(a => a.id === approvalId);
    if (!approval) {
      throw new NotFoundException(`Approval ${approvalId} not found`);
    }

    approval.status = decision;
    approval.approverId = approverId;
    approval.comment = comment;
    approval.decidedAt = new Date();

    this.addLog(execution, 'INFO', `Approval ${decision.toLowerCase()} by ${approverId}`, approval.stepId);

    if (decision === 'APPROVED' && execution.status === 'WAITING_APPROVAL') {
      execution.status = 'RUNNING';
      // Resume workflow execution
    } else if (decision === 'REJECTED') {
      execution.status = 'FAILED';
      execution.error = `Approval rejected: ${comment || 'No reason provided'}`;
      execution.completedAt = new Date();
    }

    this.eventEmitter.emit('workflow.approval.decided', {
      executionId,
      approvalId,
      decision,
      approverId,
    });

    return approval;
  }

  async handleWebhook(path: string, payload: Record<string, any>): Promise<WorkflowExecution | null> {
    const workflowId = this.webhookHandlers.get(path);
    if (!workflowId) {
      return null;
    }

    return this.executeWorkflow({
      workflowId,
      triggeredBy: 'webhook',
      triggerType: 'WEBHOOK',
      triggerData: { path, payload },
    });
  }

  async cancelExecution(executionId: string, reason?: string): Promise<WorkflowExecution> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    execution.status = 'CANCELLED';
    execution.error = reason || 'Cancelled by user';
    execution.completedAt = new Date();

    this.addLog(execution, 'INFO', `Execution cancelled: ${execution.error}`);

    this.eventEmitter.emit('workflow.execution.cancelled', {
      executionId,
      reason,
    });

    return execution;
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  getExecutions(workflowId?: string): WorkflowExecution[] {
    let executions = Array.from(this.executions.values());

    if (workflowId) {
      executions = executions.filter(e => e.workflowId === workflowId);
    }

    return executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  getTemplates(category?: string): WorkflowTemplate[] {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  getTemplate(templateId: string): WorkflowTemplate | undefined {
    return this.templates.get(templateId);
  }

  async createFromTemplate(templateId: string, overrides: Partial<CreateWorkflowDto> & { createdBy: string }): Promise<Workflow> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    template.usageCount++;

    return this.createWorkflow({
      ...template.workflow,
      ...overrides,
      createdBy: overrides.createdBy,
    });
  }

  getAnalytics(workflowId: string): WorkflowAnalytics {
    const executions = this.getExecutions(workflowId);

    const successfulExecutions = executions.filter(e => e.status === 'COMPLETED');
    const failedExecutions = executions.filter(e => e.status === 'FAILED');

    const durations = successfulExecutions
      .filter(e => e.completedAt)
      .map(e => e.completedAt!.getTime() - e.startedAt.getTime());

    const averageDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Group by day
    const executionsByDay: { date: string; count: number }[] = [];
    const dayMap = new Map<string, number>();
    executions.forEach(e => {
      const date = e.startedAt.toISOString().split('T')[0];
      dayMap.set(date, (dayMap.get(date) || 0) + 1);
    });
    dayMap.forEach((count, date) => executionsByDay.push({ date, count }));

    // Step performance
    const stepStats = new Map<string, { name: string; durations: number[]; failures: number }>();
    executions.forEach(e => {
      e.stepResults.forEach(r => {
        const stats = stepStats.get(r.stepId) || { name: r.stepName, durations: [], failures: 0 };
        if (r.startedAt && r.completedAt) {
          stats.durations.push(r.completedAt.getTime() - r.startedAt.getTime());
        }
        if (r.status === 'FAILED') {
          stats.failures++;
        }
        stepStats.set(r.stepId, stats);
      });
    });

    const stepPerformance = Array.from(stepStats.entries()).map(([stepId, stats]) => ({
      stepId,
      stepName: stats.name,
      avgDurationMs: stats.durations.length > 0
        ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
        : 0,
      failureRate: executions.length > 0 ? stats.failures / executions.length : 0,
    }));

    // Identify bottlenecks (steps with highest avg duration)
    const bottlenecks = stepPerformance
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
      .slice(0, 3)
      .map(s => ({ stepId: s.stepId, stepName: s.stepName, avgWaitTimeMs: s.avgDurationMs }));

    return {
      workflowId,
      totalExecutions: executions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      averageDurationMs,
      executionsByDay,
      stepPerformance,
      bottlenecks,
    };
  }

  private addLog(
    execution: WorkflowExecution,
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
    message: string,
    stepId?: string,
    data?: Record<string, any>,
  ): void {
    execution.logs.push({
      timestamp: new Date(),
      level,
      message,
      stepId,
      data,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup
  async onModuleDestroy(): Promise<void> {
    // Clear all scheduled jobs
    for (const [key, interval] of this.scheduledJobs) {
      clearInterval(interval);
    }
    this.scheduledJobs.clear();
  }
}
