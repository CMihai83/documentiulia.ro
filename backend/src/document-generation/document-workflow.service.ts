import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'error';
export type StepType = 'approval' | 'review' | 'signature' | 'notification' | 'condition' | 'parallel' | 'automated';
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'rejected' | 'error';

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  order: number;
  config: StepConfig;
  assignees?: string[];
  assigneeRoles?: string[];
  dueInHours?: number;
  required: boolean;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  completedBy?: string;
  result?: StepResult;
  nextSteps?: string[];
}

export interface StepConfig {
  // Approval/Review config
  approvalType?: 'any' | 'all' | 'majority';
  minApprovals?: number;
  allowDelegation?: boolean;

  // Signature config
  signatureFields?: Array<{ page: number; x: number; y: number }>;

  // Notification config
  notificationType?: 'email' | 'sms' | 'in_app' | 'all';
  notificationTemplate?: string;
  recipients?: string[];

  // Condition config
  condition?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
  truePath?: string;
  falsePath?: string;

  // Parallel config
  parallelSteps?: string[];
  waitForAll?: boolean;

  // Automated config
  action?: 'update_status' | 'send_notification' | 'create_task' | 'trigger_webhook' | 'run_script';
  actionConfig?: Record<string, any>;
}

export interface StepResult {
  decision?: 'approved' | 'rejected' | 'needs_revision';
  comment?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
}

export interface DocumentWorkflow {
  id: string;
  tenantId: string;
  documentId: string;
  documentName: string;
  templateId?: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  currentStepId?: string;
  variables: Record<string, any>;
  history: WorkflowHistoryEntry[];
  escalation?: EscalationConfig;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueAt?: Date;
}

export interface WorkflowHistoryEntry {
  id: string;
  timestamp: Date;
  stepId?: string;
  stepName?: string;
  action: string;
  actor: string;
  actorName?: string;
  details?: Record<string, any>;
}

export interface EscalationConfig {
  enabled: boolean;
  escalateAfterHours: number;
  escalateTo: string[];
  maxEscalations: number;
  currentEscalations: number;
  lastEscalatedAt?: Date;
}

export interface WorkflowTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  steps: Omit<WorkflowStep, 'id' | 'status' | 'startedAt' | 'completedAt' | 'completedBy' | 'result'>[];
  defaultDueInDays?: number;
  escalation?: Omit<EscalationConfig, 'currentEscalations' | 'lastEscalatedAt'>;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTask {
  id: string;
  workflowId: string;
  stepId: string;
  stepName: string;
  documentId: string;
  documentName: string;
  assigneeId: string;
  type: StepType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  dueAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

// =================== SERVICE ===================

@Injectable()
export class DocumentWorkflowService {
  private workflows: Map<string, DocumentWorkflow> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private tasks: Map<string, WorkflowTask> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        tenantId: 'system',
        name: 'Simple Approval',
        description: 'Single-level document approval workflow',
        category: 'approval',
        steps: [
          {
            name: 'Manager Approval',
            type: 'approval',
            order: 1,
            config: { approvalType: 'any' },
            assigneeRoles: ['manager'],
            dueInHours: 48,
            required: true,
          },
          {
            name: 'Notify Submitter',
            type: 'notification',
            order: 2,
            config: {
              notificationType: 'email',
              notificationTemplate: 'document-approved',
            },
            required: true,
          },
        ],
        defaultDueInDays: 3,
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Multi-Level Approval',
        description: 'Three-level approval for important documents',
        category: 'approval',
        steps: [
          {
            name: 'Department Review',
            type: 'review',
            order: 1,
            config: { approvalType: 'any' },
            assigneeRoles: ['reviewer'],
            dueInHours: 24,
            required: true,
          },
          {
            name: 'Manager Approval',
            type: 'approval',
            order: 2,
            config: { approvalType: 'any' },
            assigneeRoles: ['manager'],
            dueInHours: 48,
            required: true,
          },
          {
            name: 'Director Approval',
            type: 'approval',
            order: 3,
            config: { approvalType: 'any' },
            assigneeRoles: ['director'],
            dueInHours: 72,
            required: true,
          },
          {
            name: 'Final Notification',
            type: 'notification',
            order: 4,
            config: { notificationType: 'all' },
            required: true,
          },
        ],
        defaultDueInDays: 7,
        escalation: {
          enabled: true,
          escalateAfterHours: 24,
          escalateTo: ['admin'],
          maxEscalations: 3,
        },
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Contract Signing',
        description: 'Document review followed by e-signature',
        category: 'signature',
        steps: [
          {
            name: 'Legal Review',
            type: 'review',
            order: 1,
            config: { approvalType: 'all' },
            assigneeRoles: ['legal'],
            dueInHours: 72,
            required: true,
          },
          {
            name: 'Internal Signature',
            type: 'signature',
            order: 2,
            config: {
              signatureFields: [{ page: 1, x: 100, y: 700 }],
            },
            assigneeRoles: ['signatory'],
            dueInHours: 48,
            required: true,
          },
          {
            name: 'External Signature',
            type: 'signature',
            order: 3,
            config: {
              signatureFields: [{ page: 1, x: 400, y: 700 }],
            },
            required: true,
          },
          {
            name: 'Archive Document',
            type: 'automated',
            order: 4,
            config: {
              action: 'update_status',
              actionConfig: { status: 'archived' },
            },
            required: true,
          },
        ],
        defaultDueInDays: 14,
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Conditional Approval',
        description: 'Approval path based on document value',
        category: 'approval',
        steps: [
          {
            name: 'Initial Review',
            type: 'review',
            order: 1,
            config: {},
            assigneeRoles: ['reviewer'],
            dueInHours: 24,
            required: true,
            nextSteps: ['value-check'],
          },
          {
            name: 'Value Check',
            type: 'condition',
            order: 2,
            config: {
              condition: { field: 'amount', operator: 'greater_than', value: 10000 },
              truePath: 'director-approval',
              falsePath: 'manager-approval',
            },
            required: true,
          },
          {
            name: 'Manager Approval',
            type: 'approval',
            order: 3,
            config: { approvalType: 'any' },
            assigneeRoles: ['manager'],
            dueInHours: 48,
            required: true,
            nextSteps: ['complete'],
          },
          {
            name: 'Director Approval',
            type: 'approval',
            order: 4,
            config: { approvalType: 'any' },
            assigneeRoles: ['director'],
            dueInHours: 72,
            required: true,
            nextSteps: ['complete'],
          },
          {
            name: 'Complete',
            type: 'notification',
            order: 5,
            config: { notificationType: 'email' },
            required: true,
          },
        ],
        defaultDueInDays: 5,
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
    ];

    for (const template of templates) {
      const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, {
        id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // =================== WORKFLOW MANAGEMENT ===================

  async createWorkflow(data: {
    tenantId: string;
    documentId: string;
    documentName: string;
    templateId?: string;
    name: string;
    description?: string;
    steps?: Omit<WorkflowStep, 'id' | 'status'>[];
    variables?: Record<string, any>;
    dueInDays?: number;
    createdBy: string;
  }): Promise<DocumentWorkflow> {
    const id = `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let steps: WorkflowStep[] = [];

    if (data.templateId) {
      const template = this.templates.get(data.templateId);
      if (template) {
        steps = template.steps.map((s, index) => ({
          id: `step-${Date.now()}-${index}`,
          ...s,
          status: 'pending' as StepStatus,
        }));
      }
    } else if (data.steps) {
      steps = data.steps.map((s, index) => ({
        id: `step-${Date.now()}-${index}`,
        ...s,
        status: 'pending' as StepStatus,
      }));
    }

    const workflow: DocumentWorkflow = {
      id,
      tenantId: data.tenantId,
      documentId: data.documentId,
      documentName: data.documentName,
      templateId: data.templateId,
      name: data.name,
      description: data.description,
      status: 'draft',
      steps,
      variables: data.variables || {},
      history: [
        {
          id: `hist-${Date.now()}`,
          timestamp: new Date(),
          action: 'created',
          actor: data.createdBy,
          details: { templateId: data.templateId },
        },
      ],
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      dueAt: data.dueInDays ? new Date(Date.now() + data.dueInDays * 24 * 60 * 60 * 1000) : undefined,
    };

    this.workflows.set(id, workflow);

    this.eventEmitter.emit('document.workflow.created', { workflow });

    return workflow;
  }

  async getWorkflow(id: string): Promise<DocumentWorkflow | null> {
    return this.workflows.get(id) || null;
  }

  async getWorkflows(
    tenantId: string,
    filters?: {
      documentId?: string;
      status?: WorkflowStatus;
      createdBy?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      limit?: number;
    },
  ): Promise<DocumentWorkflow[]> {
    let workflows = Array.from(this.workflows.values()).filter(
      (w) => w.tenantId === tenantId,
    );

    if (filters?.documentId) {
      workflows = workflows.filter((w) => w.documentId === filters.documentId);
    }

    if (filters?.status) {
      workflows = workflows.filter((w) => w.status === filters.status);
    }

    if (filters?.createdBy) {
      workflows = workflows.filter((w) => w.createdBy === filters.createdBy);
    }

    if (filters?.startDate) {
      workflows = workflows.filter((w) => w.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      workflows = workflows.filter((w) => w.createdAt <= filters.endDate!);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      workflows = workflows.filter(
        (w) =>
          w.name.toLowerCase().includes(search) ||
          w.documentName.toLowerCase().includes(search),
      );
    }

    workflows = workflows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      workflows = workflows.slice(0, filters.limit);
    }

    return workflows;
  }

  // =================== WORKFLOW EXECUTION ===================

  async startWorkflow(workflowId: string, userId: string): Promise<DocumentWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'draft') {
      throw new Error('Workflow already started');
    }

    workflow.status = 'active';
    workflow.startedAt = new Date();
    workflow.updatedAt = new Date();

    // Start first step(s)
    const firstSteps = workflow.steps.filter((s) => s.order === 1);
    for (const step of firstSteps) {
      await this.activateStep(workflow, step, userId);
    }

    workflow.currentStepId = firstSteps[0]?.id;

    this.addHistoryEntry(workflow, 'started', userId);

    this.eventEmitter.emit('document.workflow.started', { workflow });

    return workflow;
  }

  private async activateStep(workflow: DocumentWorkflow, step: WorkflowStep, userId: string): Promise<void> {
    step.status = 'in_progress';
    step.startedAt = new Date();

    // Create tasks for assignees
    if (step.assignees && step.assignees.length > 0) {
      for (const assigneeId of step.assignees) {
        await this.createTask(workflow, step, assigneeId);
      }
    }

    this.addHistoryEntry(workflow, `step_started`, userId, {
      stepId: step.id,
      stepName: step.name,
    });

    this.eventEmitter.emit('document.workflow.step.started', { workflow, step });

    // Handle automated steps
    if (step.type === 'automated') {
      await this.executeAutomatedStep(workflow, step, userId);
    }
  }

  async completeStep(
    workflowId: string,
    stepId: string,
    userId: string,
    result: StepResult,
  ): Promise<DocumentWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error('Step not found');
    }

    if (step.status !== 'in_progress') {
      throw new Error('Step is not in progress');
    }

    step.status = 'completed';
    step.completedAt = new Date();
    step.completedBy = userId;
    step.result = result;

    this.addHistoryEntry(workflow, 'step_completed', userId, {
      stepId: step.id,
      stepName: step.name,
      decision: result.decision,
    });

    // Handle rejection
    if (result.decision === 'rejected') {
      workflow.status = 'completed';
      workflow.completedAt = new Date();
      this.addHistoryEntry(workflow, 'rejected', userId, { stepName: step.name });
      this.eventEmitter.emit('document.workflow.rejected', { workflow, step, result });
      return workflow;
    }

    // Handle needs revision
    if (result.decision === 'needs_revision') {
      workflow.status = 'paused';
      this.addHistoryEntry(workflow, 'revision_requested', userId, {
        stepName: step.name,
        comment: result.comment,
      });
      this.eventEmitter.emit('document.workflow.revision.requested', { workflow, step, result });
      return workflow;
    }

    // Complete associated tasks
    await this.completeTasksForStep(workflow.id, stepId);

    // Determine next step
    await this.advanceWorkflow(workflow, step, userId);

    workflow.updatedAt = new Date();

    this.eventEmitter.emit('document.workflow.step.completed', { workflow, step, result });

    return workflow;
  }

  private async advanceWorkflow(workflow: DocumentWorkflow, completedStep: WorkflowStep, userId: string): Promise<void> {
    // Check for explicit next steps
    if (completedStep.nextSteps && completedStep.nextSteps.length > 0) {
      for (const nextStepId of completedStep.nextSteps) {
        const nextStep = workflow.steps.find((s) => s.id === nextStepId || s.name.toLowerCase().replace(/\s+/g, '-') === nextStepId);
        if (nextStep && nextStep.status === 'pending') {
          await this.activateStep(workflow, nextStep, userId);
        }
      }
      return;
    }

    // Handle condition step results
    if (completedStep.type === 'condition' && completedStep.result?.metadata?.pathTaken) {
      const pathStepName = completedStep.result.metadata.pathTaken;
      const pathStep = workflow.steps.find((s) => s.name.toLowerCase().replace(/\s+/g, '-') === pathStepName);
      if (pathStep) {
        await this.activateStep(workflow, pathStep, userId);
      }
      return;
    }

    // Check for parallel steps completion
    if (completedStep.type === 'parallel') {
      const parallelSteps = workflow.steps.filter((s) =>
        completedStep.config.parallelSteps?.includes(s.id),
      );
      const allCompleted = parallelSteps.every((s) => s.status === 'completed');
      if (!allCompleted && completedStep.config.waitForAll) {
        return;
      }
    }

    // Find next sequential step
    const nextStep = workflow.steps.find((s) => s.order === completedStep.order + 1 && s.status === 'pending');

    if (nextStep) {
      await this.activateStep(workflow, nextStep, userId);
      workflow.currentStepId = nextStep.id;
    } else {
      // Check if all steps are completed
      const allCompleted = workflow.steps
        .filter((s) => s.required)
        .every((s) => s.status === 'completed' || s.status === 'skipped');

      if (allCompleted) {
        workflow.status = 'completed';
        workflow.completedAt = new Date();
        this.addHistoryEntry(workflow, 'completed', userId);
        this.eventEmitter.emit('document.workflow.completed', { workflow });
      }
    }
  }

  private async executeAutomatedStep(workflow: DocumentWorkflow, step: WorkflowStep, userId: string): Promise<void> {
    const config = step.config;

    try {
      switch (config.action) {
        case 'update_status':
          // Update document status
          this.eventEmitter.emit('document.status.update', {
            documentId: workflow.documentId,
            status: config.actionConfig?.status,
          });
          break;

        case 'send_notification':
          // Send notifications
          this.eventEmitter.emit('notification.send', {
            recipients: config.recipients,
            template: config.notificationTemplate,
            data: { workflow, document: workflow.documentId },
          });
          break;

        case 'create_task':
          // Create external task
          this.eventEmitter.emit('task.create', config.actionConfig);
          break;

        case 'trigger_webhook':
          // Trigger webhook
          this.eventEmitter.emit('webhook.trigger', {
            url: config.actionConfig?.url,
            payload: { workflow, document: workflow.documentId },
          });
          break;
      }

      // Auto-complete automated steps
      await this.completeStep(workflow.id, step.id, 'system', {
        decision: 'approved',
        metadata: { automated: true },
      });
    } catch (error: any) {
      step.status = 'error';
      step.result = { metadata: { error: error.message } };
      this.addHistoryEntry(workflow, 'step_error', 'system', {
        stepId: step.id,
        error: error.message,
      });
    }
  }

  async pauseWorkflow(workflowId: string, userId: string, reason?: string): Promise<DocumentWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.status = 'paused';
    workflow.updatedAt = new Date();

    this.addHistoryEntry(workflow, 'paused', userId, { reason });

    this.eventEmitter.emit('document.workflow.paused', { workflow, reason });

    return workflow;
  }

  async resumeWorkflow(workflowId: string, userId: string): Promise<DocumentWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'paused') {
      throw new Error('Workflow is not paused');
    }

    workflow.status = 'active';
    workflow.updatedAt = new Date();

    this.addHistoryEntry(workflow, 'resumed', userId);

    this.eventEmitter.emit('document.workflow.resumed', { workflow });

    return workflow;
  }

  async cancelWorkflow(workflowId: string, userId: string, reason?: string): Promise<DocumentWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.status = 'cancelled';
    workflow.completedAt = new Date();
    workflow.updatedAt = new Date();

    // Cancel all pending tasks
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.workflowId === workflowId && task.status !== 'completed') {
        task.status = 'completed';
        task.completedAt = new Date();
      }
    }

    this.addHistoryEntry(workflow, 'cancelled', userId, { reason });

    this.eventEmitter.emit('document.workflow.cancelled', { workflow, reason });

    return workflow;
  }

  // =================== TASKS ===================

  private async createTask(workflow: DocumentWorkflow, step: WorkflowStep, assigneeId: string): Promise<WorkflowTask> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const task: WorkflowTask = {
      id,
      workflowId: workflow.id,
      stepId: step.id,
      stepName: step.name,
      documentId: workflow.documentId,
      documentName: workflow.documentName,
      assigneeId,
      type: step.type,
      priority: 'medium',
      status: 'pending',
      dueAt: step.dueInHours ? new Date(Date.now() + step.dueInHours * 60 * 60 * 1000) : undefined,
      createdAt: new Date(),
    };

    this.tasks.set(id, task);

    this.eventEmitter.emit('document.workflow.task.created', { task, workflow, step });

    return task;
  }

  private async completeTasksForStep(workflowId: string, stepId: string): Promise<void> {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.workflowId === workflowId && task.stepId === stepId && task.status !== 'completed') {
        task.status = 'completed';
        task.completedAt = new Date();
      }
    }
  }

  async getMyTasks(
    userId: string,
    filters?: {
      status?: WorkflowTask['status'];
      type?: StepType;
      limit?: number;
    },
  ): Promise<WorkflowTask[]> {
    let tasks = Array.from(this.tasks.values()).filter((t) => t.assigneeId === userId);

    if (filters?.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    if (filters?.type) {
      tasks = tasks.filter((t) => t.type === filters.type);
    }

    // Check for overdue
    const now = new Date();
    for (const task of tasks) {
      if (task.dueAt && task.dueAt < now && task.status === 'pending') {
        task.status = 'overdue';
      }
    }

    tasks = tasks.sort((a, b) => {
      // Sort by priority and due date
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.dueAt && b.dueAt) {
        return a.dueAt.getTime() - b.dueAt.getTime();
      }
      return 0;
    });

    if (filters?.limit) {
      tasks = tasks.slice(0, filters.limit);
    }

    return tasks;
  }

  // =================== TEMPLATES ===================

  async getTemplates(
    tenantId: string,
    filters?: {
      category?: string;
      search?: string;
      isActive?: boolean;
    },
  ): Promise<WorkflowTemplate[]> {
    let templates = Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId || t.tenantId === 'system',
    );

    if (filters?.category) {
      templates = templates.filter((t) => t.category === filters.category);
    }

    if (filters?.isActive !== undefined) {
      templates = templates.filter((t) => t.isActive === filters.isActive);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          (t.description && t.description.toLowerCase().includes(search)),
      );
    }

    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createTemplate(data: {
    tenantId: string;
    name: string;
    description?: string;
    category?: string;
    steps: WorkflowTemplate['steps'];
    defaultDueInDays?: number;
    escalation?: WorkflowTemplate['escalation'];
    createdBy: string;
  }): Promise<WorkflowTemplate> {
    const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: WorkflowTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      steps: data.steps,
      defaultDueInDays: data.defaultDueInDays,
      escalation: data.escalation,
      isActive: true,
      usageCount: 0,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);

    return template;
  }

  // =================== HISTORY ===================

  private addHistoryEntry(
    workflow: DocumentWorkflow,
    action: string,
    actor: string,
    details?: Record<string, any>,
  ): void {
    workflow.history.push({
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      action,
      actor,
      details,
    });
  }

  async getWorkflowHistory(workflowId: string): Promise<WorkflowHistoryEntry[]> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return [];
    return workflow.history;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalWorkflows: number;
    byStatus: Record<string, number>;
    activeWorkflows: number;
    completionRate: number;
    averageCompletionTime: number;
    pendingTasks: number;
    overdueTasks: number;
  }> {
    const workflows = await this.getWorkflows(tenantId);
    const tasks = Array.from(this.tasks.values());
    const now = new Date();

    const byStatus: Record<string, number> = {};
    let completedCount = 0;
    let totalCompletionTime = 0;

    for (const workflow of workflows) {
      byStatus[workflow.status] = (byStatus[workflow.status] || 0) + 1;

      if (workflow.status === 'completed' && workflow.completedAt && workflow.startedAt) {
        completedCount++;
        totalCompletionTime += workflow.completedAt.getTime() - workflow.startedAt.getTime();
      }
    }

    const pendingTasks = tasks.filter((t) => t.status === 'pending').length;
    const overdueTasks = tasks.filter((t) => t.dueAt && t.dueAt < now && t.status !== 'completed').length;

    return {
      totalWorkflows: workflows.length,
      byStatus,
      activeWorkflows: byStatus['active'] || 0,
      completionRate: workflows.length > 0 ? Math.round((completedCount / workflows.length) * 100) : 0,
      averageCompletionTime: completedCount > 0 ? Math.round(totalCompletionTime / completedCount / (1000 * 60 * 60)) : 0,
      pendingTasks,
      overdueTasks,
    };
  }
}
