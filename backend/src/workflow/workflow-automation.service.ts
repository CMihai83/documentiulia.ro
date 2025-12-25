import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface WorkflowStep {
  id: string;
  name: string;
  nameRo: string;
  type: WorkflowStepType;
  order: number;
  config: Record<string, any>;
  conditions?: WorkflowCondition[];
  timeout?: number;
  retryCount?: number;
  assignee?: string;
  status: StepStatus;
}

export type WorkflowStepType =
  | 'START'
  | 'END'
  | 'APPROVAL'
  | 'TASK'
  | 'NOTIFICATION'
  | 'CONDITION'
  | 'PARALLEL'
  | 'DELAY'
  | 'WEBHOOK'
  | 'SCRIPT'
  | 'EMAIL'
  | 'SMS'
  | 'DOCUMENT_GENERATION'
  | 'DATA_TRANSFORM'
  | 'API_CALL'
  | 'HUMAN_TASK';

export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'WAITING' | 'TIMEOUT';

export interface WorkflowCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'IN' | 'NOT_IN' | 'IS_NULL' | 'IS_NOT_NULL';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  version: number;
  category: WorkflowCategory;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  isActive: boolean;
  isTemplate: boolean;
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkflowCategory =
  | 'INVOICE_PROCESSING'
  | 'APPROVAL_WORKFLOW'
  | 'EMPLOYEE_ONBOARDING'
  | 'EMPLOYEE_OFFBOARDING'
  | 'EXPENSE_APPROVAL'
  | 'PURCHASE_ORDER'
  | 'CONTRACT_MANAGEMENT'
  | 'COMPLIANCE_CHECK'
  | 'DOCUMENT_REVIEW'
  | 'CUSTOMER_SUPPORT'
  | 'SALES_PIPELINE'
  | 'CUSTOM';

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  config: Record<string, any>;
  isActive: boolean;
}

export type TriggerType = 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'WEBHOOK' | 'CONDITION' | 'API';

export interface WorkflowVariable {
  name: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'OBJECT' | 'ARRAY';
  defaultValue?: any;
  required: boolean;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  status: InstanceStatus;
  currentStepId: string | null;
  currentStepOrder: number;
  variables: Record<string, any>;
  stepHistory: StepExecution[];
  startedAt: Date;
  completedAt: Date | null;
  startedBy: string;
  organizationId: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  dueDate?: Date;
  error?: string;
}

export type InstanceStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'WAITING_APPROVAL' | 'TIMEOUT';

export interface StepExecution {
  stepId: string;
  stepName: string;
  status: StepStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration?: number;
  input: Record<string, any>;
  output: Record<string, any>;
  error?: string;
  executedBy?: string;
  retryCount: number;
}

export interface ApprovalRequest {
  id: string;
  instanceId: string;
  stepId: string;
  workflowName: string;
  stepName: string;
  requestedAt: Date;
  requestedBy: string;
  assignee: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'EXPIRED';
  dueDate?: Date;
  data: Record<string, any>;
  comments?: string;
  respondedAt?: Date;
  respondedBy?: string;
  delegatedTo?: string;
  organizationId: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: WorkflowCategory;
  definition: Partial<WorkflowDefinition>;
  isBuiltIn: boolean;
  usageCount: number;
  rating: number;
}

export interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalInstances: number;
  runningInstances: number;
  completedInstances: number;
  failedInstances: number;
  averageCompletionTime: number;
  approvalsPending: number;
  instancesByCategory: Record<string, number>;
  completionRate: number;
}

export interface CreateWorkflowDto {
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: WorkflowCategory;
  steps: Omit<WorkflowStep, 'id' | 'status'>[];
  triggers?: Omit<WorkflowTrigger, 'id'>[];
  variables?: WorkflowVariable[];
  organizationId: string;
  createdBy: string;
}

export interface StartWorkflowDto {
  workflowId: string;
  variables?: Record<string, any>;
  startedBy: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  dueDate?: Date;
}

@Injectable()
export class WorkflowAutomationService {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeBuiltInTemplates();
  }

  private generateId(prefix: string): string {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private initializeBuiltInTemplates(): void {
    const invoiceApproval: WorkflowTemplate = {
      id: 'tpl-invoice-approval',
      name: 'Invoice Approval Workflow',
      nameRo: 'Flux de Aprobare Factură',
      description: 'Standard invoice approval workflow with multi-level approval',
      descriptionRo: 'Flux standard de aprobare factură cu aprobare pe mai multe niveluri',
      category: 'INVOICE_PROCESSING',
      definition: {
        steps: [
          { id: 's1', name: 'Start', nameRo: 'Start', type: 'START', order: 1, config: {}, status: 'PENDING' },
          { id: 's2', name: 'Initial Review', nameRo: 'Verificare Inițială', type: 'HUMAN_TASK', order: 2, config: { taskType: 'REVIEW' }, status: 'PENDING' },
          { id: 's3', name: 'Amount Check', nameRo: 'Verificare Sumă', type: 'CONDITION', order: 3, config: { field: 'amount', threshold: 10000 }, status: 'PENDING' },
          { id: 's4', name: 'Manager Approval', nameRo: 'Aprobare Manager', type: 'APPROVAL', order: 4, config: { role: 'MANAGER' }, status: 'PENDING' },
          { id: 's5', name: 'Director Approval', nameRo: 'Aprobare Director', type: 'APPROVAL', order: 5, config: { role: 'DIRECTOR' }, conditions: [{ field: 'amount', operator: 'GREATER_THAN', value: 10000 }], status: 'PENDING' },
          { id: 's6', name: 'Send Notification', nameRo: 'Trimitere Notificare', type: 'EMAIL', order: 6, config: { template: 'invoice-approved' }, status: 'PENDING' },
          { id: 's7', name: 'End', nameRo: 'Sfârșit', type: 'END', order: 7, config: {}, status: 'PENDING' },
        ],
      },
      isBuiltIn: true,
      usageCount: 0,
      rating: 4.8,
    };

    const employeeOnboarding: WorkflowTemplate = {
      id: 'tpl-employee-onboarding',
      name: 'Employee Onboarding',
      nameRo: 'Integrare Angajat Nou',
      description: 'Complete employee onboarding workflow',
      descriptionRo: 'Flux complet de integrare angajat nou',
      category: 'EMPLOYEE_ONBOARDING',
      definition: {
        steps: [
          { id: 's1', name: 'Start', nameRo: 'Start', type: 'START', order: 1, config: {}, status: 'PENDING' },
          { id: 's2', name: 'Create Accounts', nameRo: 'Creare Conturi', type: 'TASK', order: 2, config: { taskType: 'IT_SETUP' }, status: 'PENDING' },
          { id: 's3', name: 'Prepare Workstation', nameRo: 'Pregătire Stație de Lucru', type: 'TASK', order: 3, config: { taskType: 'WORKSTATION' }, status: 'PENDING' },
          { id: 's4', name: 'Generate Contract', nameRo: 'Generare Contract', type: 'DOCUMENT_GENERATION', order: 4, config: { template: 'employment-contract' }, status: 'PENDING' },
          { id: 's5', name: 'HR Approval', nameRo: 'Aprobare HR', type: 'APPROVAL', order: 5, config: { role: 'HR' }, status: 'PENDING' },
          { id: 's6', name: 'Welcome Email', nameRo: 'Email de Bun Venit', type: 'EMAIL', order: 6, config: { template: 'welcome-employee' }, status: 'PENDING' },
          { id: 's7', name: 'Schedule Training', nameRo: 'Programare Training', type: 'TASK', order: 7, config: { taskType: 'TRAINING' }, status: 'PENDING' },
          { id: 's8', name: 'End', nameRo: 'Sfârșit', type: 'END', order: 8, config: {}, status: 'PENDING' },
        ],
      },
      isBuiltIn: true,
      usageCount: 0,
      rating: 4.9,
    };

    const expenseApproval: WorkflowTemplate = {
      id: 'tpl-expense-approval',
      name: 'Expense Approval',
      nameRo: 'Aprobare Cheltuieli',
      description: 'Expense report approval workflow',
      descriptionRo: 'Flux de aprobare raport de cheltuieli',
      category: 'EXPENSE_APPROVAL',
      definition: {
        steps: [
          { id: 's1', name: 'Start', nameRo: 'Start', type: 'START', order: 1, config: {}, status: 'PENDING' },
          { id: 's2', name: 'Validate Receipts', nameRo: 'Validare Chitanțe', type: 'TASK', order: 2, config: { taskType: 'VALIDATION' }, status: 'PENDING' },
          { id: 's3', name: 'Manager Approval', nameRo: 'Aprobare Manager', type: 'APPROVAL', order: 3, config: { role: 'MANAGER' }, status: 'PENDING' },
          { id: 's4', name: 'Finance Review', nameRo: 'Verificare Financiar', type: 'APPROVAL', order: 4, config: { role: 'FINANCE' }, status: 'PENDING' },
          { id: 's5', name: 'Process Payment', nameRo: 'Procesare Plată', type: 'API_CALL', order: 5, config: { endpoint: 'payments/process' }, status: 'PENDING' },
          { id: 's6', name: 'End', nameRo: 'Sfârșit', type: 'END', order: 6, config: {}, status: 'PENDING' },
        ],
      },
      isBuiltIn: true,
      usageCount: 0,
      rating: 4.7,
    };

    const purchaseOrder: WorkflowTemplate = {
      id: 'tpl-purchase-order',
      name: 'Purchase Order Approval',
      nameRo: 'Aprobare Comandă de Achiziție',
      description: 'Purchase order processing and approval',
      descriptionRo: 'Procesare și aprobare comandă de achiziție',
      category: 'PURCHASE_ORDER',
      definition: {
        steps: [
          { id: 's1', name: 'Start', nameRo: 'Start', type: 'START', order: 1, config: {}, status: 'PENDING' },
          { id: 's2', name: 'Vendor Check', nameRo: 'Verificare Furnizor', type: 'TASK', order: 2, config: { taskType: 'VENDOR_CHECK' }, status: 'PENDING' },
          { id: 's3', name: 'Budget Check', nameRo: 'Verificare Buget', type: 'CONDITION', order: 3, config: { field: 'withinBudget' }, status: 'PENDING' },
          { id: 's4', name: 'Department Approval', nameRo: 'Aprobare Departament', type: 'APPROVAL', order: 4, config: { role: 'DEPARTMENT_HEAD' }, status: 'PENDING' },
          { id: 's5', name: 'CFO Approval', nameRo: 'Aprobare CFO', type: 'APPROVAL', order: 5, config: { role: 'CFO' }, conditions: [{ field: 'amount', operator: 'GREATER_THAN', value: 50000 }], status: 'PENDING' },
          { id: 's6', name: 'Generate PO', nameRo: 'Generare Comandă', type: 'DOCUMENT_GENERATION', order: 6, config: { template: 'purchase-order' }, status: 'PENDING' },
          { id: 's7', name: 'Send to Vendor', nameRo: 'Trimitere la Furnizor', type: 'EMAIL', order: 7, config: { template: 'po-to-vendor' }, status: 'PENDING' },
          { id: 's8', name: 'End', nameRo: 'Sfârșit', type: 'END', order: 8, config: {}, status: 'PENDING' },
        ],
      },
      isBuiltIn: true,
      usageCount: 0,
      rating: 4.6,
    };

    this.templates.set(invoiceApproval.id, invoiceApproval);
    this.templates.set(employeeOnboarding.id, employeeOnboarding);
    this.templates.set(expenseApproval.id, expenseApproval);
    this.templates.set(purchaseOrder.id, purchaseOrder);
  }

  async createWorkflow(dto: CreateWorkflowDto): Promise<WorkflowDefinition> {
    const workflow: WorkflowDefinition = {
      id: this.generateId('wf'),
      name: dto.name,
      nameRo: dto.nameRo,
      description: dto.description,
      descriptionRo: dto.descriptionRo,
      version: 1,
      category: dto.category,
      steps: dto.steps.map((step, index) => ({
        ...step,
        id: this.generateId('step'),
        status: 'PENDING' as StepStatus,
      })),
      triggers: (dto.triggers || []).map((trigger, index) => ({
        ...trigger,
        id: this.generateId('trigger'),
      })),
      variables: dto.variables || [],
      isActive: false,
      isTemplate: false,
      organizationId: dto.organizationId,
      createdBy: dto.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);
    this.eventEmitter.emit('workflow.created', { workflow });
    return workflow;
  }

  async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    return this.workflows.get(workflowId) || null;
  }

  async listWorkflows(organizationId: string, options?: {
    category?: WorkflowCategory;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ workflows: WorkflowDefinition[]; total: number }> {
    let workflows = Array.from(this.workflows.values())
      .filter(w => w.organizationId === organizationId);

    if (options?.category) {
      workflows = workflows.filter(w => w.category === options.category);
    }

    if (options?.isActive !== undefined) {
      workflows = workflows.filter(w => w.isActive === options.isActive);
    }

    const total = workflows.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const start = (page - 1) * limit;

    return {
      workflows: workflows.slice(start, start + limit),
      total,
    };
  }

  async updateWorkflow(workflowId: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const updated: WorkflowDefinition = {
      ...workflow,
      ...updates,
      version: workflow.version + 1,
      updatedAt: new Date(),
    };

    this.workflows.set(workflowId, updated);
    this.eventEmitter.emit('workflow.updated', { workflow: updated });
    return updated;
  }

  async activateWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.steps.length < 2) {
      throw new Error('Workflow must have at least 2 steps');
    }

    const hasStart = workflow.steps.some(s => s.type === 'START');
    const hasEnd = workflow.steps.some(s => s.type === 'END');

    if (!hasStart || !hasEnd) {
      throw new Error('Workflow must have START and END steps');
    }

    workflow.isActive = true;
    workflow.updatedAt = new Date();
    this.eventEmitter.emit('workflow.activated', { workflowId });
    return workflow;
  }

  async deactivateWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.isActive = false;
    workflow.updatedAt = new Date();
    this.eventEmitter.emit('workflow.deactivated', { workflowId });
    return workflow;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const runningInstances = Array.from(this.instances.values())
      .filter(i => i.workflowId === workflowId && i.status === 'RUNNING');

    if (runningInstances.length > 0) {
      throw new Error('Cannot delete workflow with running instances');
    }

    this.workflows.delete(workflowId);
    this.eventEmitter.emit('workflow.deleted', { workflowId });
  }

  async cloneWorkflow(workflowId: string, newName: string, newNameRo: string): Promise<WorkflowDefinition> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const cloned: WorkflowDefinition = {
      ...JSON.parse(JSON.stringify(workflow)),
      id: this.generateId('wf'),
      name: newName,
      nameRo: newNameRo,
      version: 1,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(cloned.id, cloned);
    this.eventEmitter.emit('workflow.cloned', { originalId: workflowId, newId: cloned.id });
    return cloned;
  }

  async startWorkflow(dto: StartWorkflowDto): Promise<WorkflowInstance> {
    const workflow = this.workflows.get(dto.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    const startStep = workflow.steps.find(s => s.type === 'START');
    if (!startStep) {
      throw new Error('Workflow has no START step');
    }

    const instance: WorkflowInstance = {
      id: this.generateId('inst'),
      workflowId: dto.workflowId,
      workflowName: workflow.name,
      status: 'RUNNING',
      currentStepId: startStep.id,
      currentStepOrder: startStep.order,
      variables: { ...dto.variables },
      stepHistory: [],
      startedAt: new Date(),
      completedAt: null,
      startedBy: dto.startedBy,
      organizationId: workflow.organizationId,
      priority: dto.priority || 'NORMAL',
      dueDate: dto.dueDate,
    };

    this.instances.set(instance.id, instance);
    this.eventEmitter.emit('workflow.instance.started', { instance });

    await this.executeStep(instance.id, startStep.id);

    return this.instances.get(instance.id)!;
  }

  async getInstance(instanceId: string): Promise<WorkflowInstance | null> {
    return this.instances.get(instanceId) || null;
  }

  async listInstances(organizationId: string, options?: {
    workflowId?: string;
    status?: InstanceStatus;
    startedBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ instances: WorkflowInstance[]; total: number }> {
    let instances = Array.from(this.instances.values())
      .filter(i => i.organizationId === organizationId);

    if (options?.workflowId) {
      instances = instances.filter(i => i.workflowId === options.workflowId);
    }

    if (options?.status) {
      instances = instances.filter(i => i.status === options.status);
    }

    if (options?.startedBy) {
      instances = instances.filter(i => i.startedBy === options.startedBy);
    }

    instances.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const total = instances.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const start = (page - 1) * limit;

    return {
      instances: instances.slice(start, start + limit),
      total,
    };
  }

  async executeStep(instanceId: string, stepId: string): Promise<StepExecution> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    const workflow = this.workflows.get(instance.workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error('Step not found');
    }

    if (step.conditions && step.conditions.length > 0) {
      const conditionsMet = this.evaluateConditions(step.conditions, instance.variables);
      if (!conditionsMet) {
        const skippedExecution: StepExecution = {
          stepId: step.id,
          stepName: step.name,
          status: 'SKIPPED',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 0,
          input: instance.variables,
          output: {},
          retryCount: 0,
        };
        instance.stepHistory.push(skippedExecution);
        await this.advanceToNextStep(instance, workflow);
        return skippedExecution;
      }
    }

    const execution: StepExecution = {
      stepId: step.id,
      stepName: step.name,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      completedAt: null,
      input: { ...instance.variables },
      output: {},
      retryCount: 0,
    };

    instance.currentStepId = step.id;
    instance.currentStepOrder = step.order;

    try {
      const output = await this.processStep(step, instance);
      execution.output = output;
      execution.status = 'COMPLETED';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      Object.assign(instance.variables, output);

      instance.stepHistory.push(execution);
      this.eventEmitter.emit('workflow.step.completed', { instanceId, stepId, execution });

      if (!['APPROVAL', 'HUMAN_TASK'].includes(step.type)) {
        await this.advanceToNextStep(instance, workflow);
      }
    } catch (error: any) {
      execution.status = 'FAILED';
      execution.error = error.message;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      instance.stepHistory.push(execution);
      instance.status = 'FAILED';
      instance.error = error.message;
      this.eventEmitter.emit('workflow.step.failed', { instanceId, stepId, error: error.message });
    }

    return execution;
  }

  private async processStep(step: WorkflowStep, instance: WorkflowInstance): Promise<Record<string, any>> {
    switch (step.type) {
      case 'START':
        return { startedAt: new Date().toISOString() };

      case 'END':
        instance.status = 'COMPLETED';
        instance.completedAt = new Date();
        this.eventEmitter.emit('workflow.instance.completed', { instance });
        return { completedAt: new Date().toISOString() };

      case 'APPROVAL':
        await this.createApprovalRequest(instance, step);
        instance.status = 'WAITING_APPROVAL';
        return { approvalRequested: true, assignee: step.assignee || step.config.role };

      case 'TASK':
      case 'HUMAN_TASK':
        return { taskAssigned: true, taskType: step.config.taskType };

      case 'NOTIFICATION':
      case 'EMAIL':
        return { notificationSent: true, template: step.config.template };

      case 'SMS':
        return { smsSent: true, recipient: step.config.recipient };

      case 'CONDITION':
        const conditionResult = this.evaluateCondition(step.config, instance.variables);
        return { conditionMet: conditionResult, evaluatedField: step.config.field };

      case 'PARALLEL':
        return { parallelStarted: true, branches: step.config.branches };

      case 'DELAY':
        return { delayed: true, delayMs: step.config.delayMs };

      case 'WEBHOOK':
        return { webhookCalled: true, url: step.config.url };

      case 'SCRIPT':
        return { scriptExecuted: true, scriptName: step.config.scriptName };

      case 'DOCUMENT_GENERATION':
        return {
          documentGenerated: true,
          template: step.config.template,
          documentId: this.generateId('doc'),
        };

      case 'DATA_TRANSFORM':
        return { transformed: true, outputFormat: step.config.outputFormat };

      case 'API_CALL':
        return {
          apiCalled: true,
          endpoint: step.config.endpoint,
          responseCode: 200,
        };

      default:
        return {};
    }
  }

  private async createApprovalRequest(instance: WorkflowInstance, step: WorkflowStep): Promise<void> {
    const request: ApprovalRequest = {
      id: this.generateId('apr'),
      instanceId: instance.id,
      stepId: step.id,
      workflowName: instance.workflowName,
      stepName: step.name,
      requestedAt: new Date(),
      requestedBy: instance.startedBy,
      assignee: step.assignee || step.config.role || 'UNASSIGNED',
      status: 'PENDING',
      dueDate: step.timeout ? new Date(Date.now() + step.timeout) : undefined,
      data: { ...instance.variables },
      organizationId: instance.organizationId,
    };

    this.approvalRequests.set(request.id, request);
    this.eventEmitter.emit('workflow.approval.requested', { request });
  }

  private async advanceToNextStep(instance: WorkflowInstance, workflow: WorkflowDefinition): Promise<void> {
    const currentStep = workflow.steps.find(s => s.id === instance.currentStepId);
    if (!currentStep || currentStep.type === 'END') {
      return;
    }

    const nextStep = workflow.steps.find(s => s.order === currentStep.order + 1);
    if (nextStep) {
      await this.executeStep(instance.id, nextStep.id);
    }
  }

  private evaluateConditions(conditions: WorkflowCondition[], variables: Record<string, any>): boolean {
    if (conditions.length === 0) return true;

    let result = this.evaluateSingleCondition(conditions[0], variables);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateSingleCondition(condition, variables);

      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  private evaluateSingleCondition(condition: WorkflowCondition, variables: Record<string, any>): boolean {
    const fieldValue = variables[condition.field];

    switch (condition.operator) {
      case 'EQUALS':
        return fieldValue === condition.value;
      case 'NOT_EQUALS':
        return fieldValue !== condition.value;
      case 'GREATER_THAN':
        return fieldValue > condition.value;
      case 'LESS_THAN':
        return fieldValue < condition.value;
      case 'CONTAINS':
        return String(fieldValue).includes(condition.value);
      case 'IN':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'NOT_IN':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'IS_NULL':
        return fieldValue === null || fieldValue === undefined;
      case 'IS_NOT_NULL':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  private evaluateCondition(config: Record<string, any>, variables: Record<string, any>): boolean {
    const fieldValue = variables[config.field];
    if (config.threshold !== undefined) {
      return fieldValue > config.threshold;
    }
    return Boolean(fieldValue);
  }

  async approveStep(approvalId: string, approvedBy: string, comments?: string): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(approvalId);
    if (!request) {
      throw new Error('Approval request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Approval request is not pending');
    }

    request.status = 'APPROVED';
    request.respondedAt = new Date();
    request.respondedBy = approvedBy;
    request.comments = comments;

    const instance = this.instances.get(request.instanceId);
    if (instance) {
      instance.status = 'RUNNING';
      instance.variables.lastApproval = {
        stepId: request.stepId,
        approvedBy,
        approvedAt: request.respondedAt,
        comments,
      };

      const workflow = this.workflows.get(instance.workflowId);
      if (workflow) {
        await this.advanceToNextStep(instance, workflow);
      }
    }

    this.eventEmitter.emit('workflow.approval.approved', { request });
    return request;
  }

  async rejectStep(approvalId: string, rejectedBy: string, reason: string): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(approvalId);
    if (!request) {
      throw new Error('Approval request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Approval request is not pending');
    }

    request.status = 'REJECTED';
    request.respondedAt = new Date();
    request.respondedBy = rejectedBy;
    request.comments = reason;

    const instance = this.instances.get(request.instanceId);
    if (instance) {
      instance.status = 'FAILED';
      instance.error = 'Rejected by ' + rejectedBy + ': ' + reason;
      instance.completedAt = new Date();
    }

    this.eventEmitter.emit('workflow.approval.rejected', { request });
    return request;
  }

  async delegateApproval(approvalId: string, delegatedTo: string, delegatedBy: string): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(approvalId);
    if (!request) {
      throw new Error('Approval request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Approval request is not pending');
    }

    request.status = 'DELEGATED';
    request.delegatedTo = delegatedTo;
    request.comments = 'Delegated by ' + delegatedBy;

    const newRequest: ApprovalRequest = {
      ...request,
      id: this.generateId('apr'),
      assignee: delegatedTo,
      status: 'PENDING',
      requestedAt: new Date(),
    };

    this.approvalRequests.set(newRequest.id, newRequest);
    this.eventEmitter.emit('workflow.approval.delegated', { originalRequest: request, newRequest });
    return newRequest;
  }

  async getPendingApprovals(userId: string, organizationId: string): Promise<ApprovalRequest[]> {
    return Array.from(this.approvalRequests.values())
      .filter(r =>
        r.organizationId === organizationId &&
        r.status === 'PENDING' &&
        (r.assignee === userId || r.assignee === 'UNASSIGNED')
      )
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  }

  async getApprovalHistory(instanceId: string): Promise<ApprovalRequest[]> {
    return Array.from(this.approvalRequests.values())
      .filter(r => r.instanceId === instanceId)
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  }

  async pauseInstance(instanceId: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    if (instance.status !== 'RUNNING') {
      throw new Error('Instance is not running');
    }

    instance.status = 'PAUSED';
    this.eventEmitter.emit('workflow.instance.paused', { instanceId });
    return instance;
  }

  async resumeInstance(instanceId: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    if (instance.status !== 'PAUSED') {
      throw new Error('Instance is not paused');
    }

    instance.status = 'RUNNING';
    this.eventEmitter.emit('workflow.instance.resumed', { instanceId });

    const workflow = this.workflows.get(instance.workflowId);
    if (workflow && instance.currentStepId) {
      await this.advanceToNextStep(instance, workflow);
    }

    return instance;
  }

  async cancelInstance(instanceId: string, reason: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    if (['COMPLETED', 'CANCELLED'].includes(instance.status)) {
      throw new Error('Instance is already completed or cancelled');
    }

    instance.status = 'CANCELLED';
    instance.error = reason;
    instance.completedAt = new Date();
    this.eventEmitter.emit('workflow.instance.cancelled', { instanceId, reason });
    return instance;
  }

  async retryFailedStep(instanceId: string): Promise<StepExecution> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    if (instance.status !== 'FAILED') {
      throw new Error('Instance is not in failed state');
    }

    const lastExecution = instance.stepHistory[instance.stepHistory.length - 1];
    if (!lastExecution || lastExecution.status !== 'FAILED') {
      throw new Error('No failed step to retry');
    }

    instance.status = 'RUNNING';
    return this.executeStep(instanceId, lastExecution.stepId);
  }

  async getTemplates(category?: WorkflowCategory): Promise<WorkflowTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    return templates.sort((a, b) => b.rating - a.rating);
  }

  async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async createWorkflowFromTemplate(
    templateId: string,
    organizationId: string,
    createdBy: string,
    customizations?: Partial<CreateWorkflowDto>
  ): Promise<WorkflowDefinition> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    template.usageCount++;

    const dto: CreateWorkflowDto = {
      name: customizations?.name || template.name,
      nameRo: customizations?.nameRo || template.nameRo,
      description: customizations?.description || template.description,
      descriptionRo: customizations?.descriptionRo || template.descriptionRo,
      category: template.category,
      steps: template.definition.steps as Omit<WorkflowStep, 'id' | 'status'>[],
      organizationId,
      createdBy,
    };

    return this.createWorkflow(dto);
  }

  async getWorkflowStats(organizationId: string): Promise<WorkflowStats> {
    const workflows = Array.from(this.workflows.values())
      .filter(w => w.organizationId === organizationId);

    const instances = Array.from(this.instances.values())
      .filter(i => i.organizationId === organizationId);

    const completedInstances = instances.filter(i => i.status === 'COMPLETED');
    const completionTimes = completedInstances
      .filter(i => i.completedAt)
      .map(i => i.completedAt!.getTime() - i.startedAt.getTime());

    const instancesByCategory: Record<string, number> = {};
    for (const instance of instances) {
      const workflow = this.workflows.get(instance.workflowId);
      if (workflow) {
        instancesByCategory[workflow.category] = (instancesByCategory[workflow.category] || 0) + 1;
      }
    }

    const pendingApprovals = Array.from(this.approvalRequests.values())
      .filter(r => r.organizationId === organizationId && r.status === 'PENDING')
      .length;

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.isActive).length,
      totalInstances: instances.length,
      runningInstances: instances.filter(i => i.status === 'RUNNING').length,
      completedInstances: completedInstances.length,
      failedInstances: instances.filter(i => i.status === 'FAILED').length,
      averageCompletionTime: completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0,
      approvalsPending: pendingApprovals,
      instancesByCategory,
      completionRate: instances.length > 0
        ? (completedInstances.length / instances.length) * 100
        : 0,
    };
  }

  async searchWorkflows(organizationId: string, query: string): Promise<WorkflowDefinition[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.workflows.values())
      .filter(w =>
        w.organizationId === organizationId &&
        (w.name.toLowerCase().includes(lowerQuery) ||
         w.nameRo.toLowerCase().includes(lowerQuery) ||
         w.description.toLowerCase().includes(lowerQuery) ||
         w.descriptionRo.toLowerCase().includes(lowerQuery))
      );
  }

  async getInstanceTimeline(instanceId: string): Promise<StepExecution[]> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    return [...instance.stepHistory];
  }

  async setInstanceVariable(instanceId: string, key: string, value: any): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    instance.variables[key] = value;
    this.eventEmitter.emit('workflow.instance.variable.set', { instanceId, key, value });
  }

  async getInstanceVariables(instanceId: string): Promise<Record<string, any>> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instance not found');
    }

    return { ...instance.variables };
  }
}
