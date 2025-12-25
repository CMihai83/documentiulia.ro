import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BudgetPlanningService, BudgetStatus } from './budget-planning.service';

// =================== TYPES ===================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested' | 'delegated';
export type ApprovalAction = 'approve' | 'reject' | 'request_revision' | 'delegate' | 'escalate';
export type ApprovalPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface ApprovalWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  budgetTypes?: string[];
  amountThresholds?: AmountThreshold[];
  steps: ApprovalStep[];
  escalationRules?: EscalationRule[];
  reminderSettings?: ReminderSettings;
  autoApprovalRules?: AutoApprovalRule[];
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AmountThreshold {
  minAmount: number;
  maxAmount?: number;
  requiredApprovers: number;
  additionalSteps?: string[];
}

export interface ApprovalStep {
  id: string;
  name: string;
  order: number;
  approverType: 'user' | 'role' | 'department_head' | 'budget_owner' | 'any_of';
  approverIds?: string[];
  approverRoles?: string[];
  requiredApprovals: number;
  canDelegate: boolean;
  canSkip: boolean;
  skipConditions?: SkipCondition[];
  timeoutDays?: number;
  timeoutAction?: 'escalate' | 'auto_approve' | 'auto_reject';
}

export interface SkipCondition {
  type: 'amount_below' | 'same_approver' | 'pre_approved_category';
  value: any;
}

export interface EscalationRule {
  triggerDays: number;
  escalateTo: string[];
  notifyOriginal: boolean;
  maxEscalations: number;
}

export interface ReminderSettings {
  enabled: boolean;
  reminderDays: number[];
  notifySubmitter: boolean;
  notifyApprovers: boolean;
}

export interface AutoApprovalRule {
  condition: 'amount_below' | 'category' | 'recurring' | 'pre_approved_vendor';
  value: any;
  maxAmount?: number;
}

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  workflowId: string;
  budgetId: string;
  budgetName: string;
  requestType: 'new_budget' | 'amendment' | 'transfer' | 'increase' | 'reallocation';
  requestedAmount: number;
  currentAmount?: number;
  changeAmount?: number;
  justification: string;
  attachments?: string[];
  priority: ApprovalPriority;
  status: ApprovalStatus;
  currentStepId: string;
  currentStepOrder: number;
  submittedBy: string;
  submittedByName: string;
  submittedAt: Date;
  dueDate?: Date;
  approvalHistory: ApprovalHistoryEntry[];
  comments: ApprovalComment[];
  escalationCount: number;
  autoApproved: boolean;
  completedAt?: Date;
  completedBy?: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  stepId: string;
  stepName: string;
  action: ApprovalAction;
  actionBy: string;
  actionByName: string;
  actionAt: Date;
  comments?: string;
  delegatedTo?: string;
  delegatedToName?: string;
}

export interface ApprovalComment {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  comment: string;
  isPrivate: boolean;
  createdAt: Date;
}

export interface ApprovalTask {
  id: string;
  requestId: string;
  stepId: string;
  assignedTo: string;
  assignedToName?: string;
  assignedAt: Date;
  dueDate?: Date;
  status: 'pending' | 'completed' | 'delegated' | 'expired';
  delegatedFrom?: string;
  completedAt?: Date;
}

export interface ApprovalDelegation {
  id: string;
  tenantId: string;
  delegatorId: string;
  delegatorName: string;
  delegateId: string;
  delegateName: string;
  startDate: Date;
  endDate?: Date;
  budgetTypes?: string[];
  maxAmount?: number;
  reason?: string;
  isActive: boolean;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class BudgetApprovalService {
  private workflows: Map<string, ApprovalWorkflow> = new Map();
  private requests: Map<string, ApprovalRequest> = new Map();
  private tasks: Map<string, ApprovalTask> = new Map();
  private delegations: Map<string, ApprovalDelegation> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private budgetService: BudgetPlanningService,
  ) {}

  // =================== WORKFLOWS ===================

  async createWorkflow(data: {
    tenantId: string;
    name: string;
    description?: string;
    budgetTypes?: string[];
    amountThresholds?: AmountThreshold[];
    steps: Omit<ApprovalStep, 'id'>[];
    escalationRules?: EscalationRule[];
    reminderSettings?: ReminderSettings;
    autoApprovalRules?: AutoApprovalRule[];
    isDefault?: boolean;
    createdBy: string;
  }): Promise<ApprovalWorkflow> {
    const id = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate IDs for steps
    const steps = data.steps.map((step, index) => ({
      ...step,
      id: `step-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`,
    }));

    // If this is default, unset other defaults
    if (data.isDefault) {
      for (const workflow of this.workflows.values()) {
        if (workflow.tenantId === data.tenantId && workflow.isDefault) {
          workflow.isDefault = false;
        }
      }
    }

    const workflow: ApprovalWorkflow = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      budgetTypes: data.budgetTypes,
      amountThresholds: data.amountThresholds,
      steps,
      escalationRules: data.escalationRules,
      reminderSettings: data.reminderSettings,
      autoApprovalRules: data.autoApprovalRules,
      isActive: true,
      isDefault: data.isDefault || false,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(id, workflow);

    this.eventEmitter.emit('budget.workflow_created', { workflow });

    return workflow;
  }

  async getWorkflow(id: string): Promise<ApprovalWorkflow | null> {
    return this.workflows.get(id) || null;
  }

  async getWorkflows(
    tenantId: string,
    filters?: {
      isActive?: boolean;
      budgetType?: string;
    },
  ): Promise<ApprovalWorkflow[]> {
    let workflows = Array.from(this.workflows.values()).filter(
      (w) => w.tenantId === tenantId,
    );

    if (filters?.isActive !== undefined) {
      workflows = workflows.filter((w) => w.isActive === filters.isActive);
    }

    if (filters?.budgetType) {
      workflows = workflows.filter(
        (w) => !w.budgetTypes || w.budgetTypes.includes(filters.budgetType!),
      );
    }

    return workflows;
  }

  async updateWorkflow(
    id: string,
    updates: Partial<Omit<ApprovalWorkflow, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>>,
  ): Promise<ApprovalWorkflow | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;

    Object.assign(workflow, updates, { updatedAt: new Date() });

    return workflow;
  }

  async getDefaultWorkflow(tenantId: string): Promise<ApprovalWorkflow | null> {
    return Array.from(this.workflows.values()).find(
      (w) => w.tenantId === tenantId && w.isDefault && w.isActive,
    ) || null;
  }

  // =================== APPROVAL REQUESTS ===================

  async submitForApproval(data: {
    tenantId: string;
    budgetId: string;
    requestType: ApprovalRequest['requestType'];
    requestedAmount: number;
    justification: string;
    attachments?: string[];
    priority?: ApprovalPriority;
    submittedBy: string;
    submittedByName: string;
    workflowId?: string;
  }): Promise<ApprovalRequest> {
    const budget = await this.budgetService.getBudget(data.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    // Find applicable workflow
    let workflow: ApprovalWorkflow | null = null;
    if (data.workflowId) {
      workflow = await this.getWorkflow(data.workflowId);
    }
    if (!workflow) {
      workflow = await this.getDefaultWorkflow(data.tenantId);
    }
    if (!workflow) {
      throw new Error('No approval workflow found');
    }

    const id = `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Check for auto-approval
    const autoApproved = this.checkAutoApproval(workflow, data.requestedAmount, budget);

    const firstStep = workflow.steps.sort((a, b) => a.order - b.order)[0];

    const request: ApprovalRequest = {
      id,
      tenantId: data.tenantId,
      workflowId: workflow.id,
      budgetId: data.budgetId,
      budgetName: budget.name,
      requestType: data.requestType,
      requestedAmount: data.requestedAmount,
      currentAmount: budget.totalAmount,
      changeAmount: data.requestType === 'new_budget' ? data.requestedAmount : data.requestedAmount - budget.totalAmount,
      justification: data.justification,
      attachments: data.attachments,
      priority: data.priority || 'normal',
      status: autoApproved ? 'approved' : 'pending',
      currentStepId: firstStep.id,
      currentStepOrder: firstStep.order,
      submittedBy: data.submittedBy,
      submittedByName: data.submittedByName,
      submittedAt: new Date(),
      dueDate: firstStep.timeoutDays
        ? new Date(Date.now() + firstStep.timeoutDays * 24 * 60 * 60 * 1000)
        : undefined,
      approvalHistory: [],
      comments: [],
      escalationCount: 0,
      autoApproved,
      completedAt: autoApproved ? new Date() : undefined,
    };

    if (autoApproved) {
      request.approvalHistory.push({
        id: `history-${Date.now()}`,
        stepId: 'auto',
        stepName: 'Auto-Approval',
        action: 'approve',
        actionBy: 'system',
        actionByName: 'System Auto-Approval',
        actionAt: new Date(),
        comments: 'Automatically approved based on workflow rules',
      });

      // Update budget status
      await this.budgetService.submitForApproval(data.budgetId, data.submittedBy);
      await this.budgetService.approveBudget(data.budgetId, 'system', 'System');
    } else {
      // Create approval tasks for first step
      await this.createApprovalTasks(request, firstStep, workflow);
    }

    this.requests.set(id, request);

    this.eventEmitter.emit('budget.approval_submitted', { request });

    return request;
  }

  private checkAutoApproval(
    workflow: ApprovalWorkflow,
    amount: number,
    budget: any,
  ): boolean {
    if (!workflow.autoApprovalRules || workflow.autoApprovalRules.length === 0) {
      return false;
    }

    for (const rule of workflow.autoApprovalRules) {
      switch (rule.condition) {
        case 'amount_below':
          if (amount < rule.value) return true;
          break;
        case 'recurring':
          if (rule.value === true) return true;
          break;
      }
    }

    return false;
  }

  private async createApprovalTasks(
    request: ApprovalRequest,
    step: ApprovalStep,
    workflow: ApprovalWorkflow,
  ): Promise<void> {
    const approvers = this.getApproversForStep(step, request.tenantId);

    for (const approver of approvers) {
      // Check for delegation
      const delegate = await this.getActiveDelegate(approver.id, request.tenantId);
      const assignTo = delegate || approver;

      const task: ApprovalTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        requestId: request.id,
        stepId: step.id,
        assignedTo: assignTo.id,
        assignedToName: assignTo.name,
        assignedAt: new Date(),
        dueDate: step.timeoutDays
          ? new Date(Date.now() + step.timeoutDays * 24 * 60 * 60 * 1000)
          : undefined,
        status: 'pending',
        delegatedFrom: delegate ? approver.id : undefined,
      };

      this.tasks.set(task.id, task);
    }

    this.eventEmitter.emit('budget.approval_tasks_created', {
      requestId: request.id,
      stepId: step.id,
      approverCount: approvers.length,
    });
  }

  private getApproversForStep(
    step: ApprovalStep,
    tenantId: string,
  ): Array<{ id: string; name: string }> {
    // In a real implementation, this would query users based on approver type
    // For now, return placeholder based on approverIds
    if (step.approverIds && step.approverIds.length > 0) {
      return step.approverIds.map((id) => ({ id, name: `Approver ${id}` }));
    }

    if (step.approverRoles && step.approverRoles.length > 0) {
      // Would query users by role
      return [{ id: 'role-approver', name: 'Role-based Approver' }];
    }

    return [{ id: 'default-approver', name: 'Default Approver' }];
  }

  async processApprovalAction(data: {
    requestId: string;
    action: ApprovalAction;
    actionBy: string;
    actionByName: string;
    comments?: string;
    delegateTo?: string;
    delegateToName?: string;
  }): Promise<ApprovalRequest | null> {
    const request = this.requests.get(data.requestId);
    if (!request || request.status !== 'pending') {
      return null;
    }

    const workflow = await this.getWorkflow(request.workflowId);
    if (!workflow) {
      return null;
    }

    const currentStep = workflow.steps.find((s) => s.id === request.currentStepId);
    if (!currentStep) {
      return null;
    }

    // Record in history
    const historyEntry: ApprovalHistoryEntry = {
      id: `history-${Date.now()}`,
      stepId: currentStep.id,
      stepName: currentStep.name,
      action: data.action,
      actionBy: data.actionBy,
      actionByName: data.actionByName,
      actionAt: new Date(),
      comments: data.comments,
      delegatedTo: data.delegateTo,
      delegatedToName: data.delegateToName,
    };
    request.approvalHistory.push(historyEntry);

    // Update tasks
    const tasks = Array.from(this.tasks.values()).filter(
      (t) => t.requestId === request.id && t.stepId === currentStep.id,
    );

    for (const task of tasks) {
      if (task.assignedTo === data.actionBy) {
        task.status = 'completed';
        task.completedAt = new Date();
      }
    }

    // Process action
    switch (data.action) {
      case 'approve':
        await this.processApproval(request, workflow, currentStep);
        break;
      case 'reject':
        request.status = 'rejected';
        request.completedAt = new Date();
        request.completedBy = data.actionBy;
        await this.budgetService.rejectBudget(request.budgetId, data.actionBy, data.actionByName);
        break;
      case 'request_revision':
        request.status = 'revision_requested';
        break;
      case 'delegate':
        if (data.delegateTo && currentStep.canDelegate) {
          await this.delegateApproval(request, currentStep, data.delegateTo, data.delegateToName || '');
        }
        break;
      case 'escalate':
        await this.escalateRequest(request, workflow);
        break;
    }

    this.eventEmitter.emit('budget.approval_action', {
      request,
      action: data.action,
      actionBy: data.actionBy,
    });

    return request;
  }

  private async processApproval(
    request: ApprovalRequest,
    workflow: ApprovalWorkflow,
    currentStep: ApprovalStep,
  ): Promise<void> {
    // Check if step is complete (enough approvals)
    const stepApprovals = request.approvalHistory.filter(
      (h) => h.stepId === currentStep.id && h.action === 'approve',
    );

    if (stepApprovals.length >= currentStep.requiredApprovals) {
      // Move to next step
      const nextStep = workflow.steps
        .filter((s) => s.order > currentStep.order)
        .sort((a, b) => a.order - b.order)[0];

      if (nextStep) {
        request.currentStepId = nextStep.id;
        request.currentStepOrder = nextStep.order;
        request.dueDate = nextStep.timeoutDays
          ? new Date(Date.now() + nextStep.timeoutDays * 24 * 60 * 60 * 1000)
          : undefined;

        await this.createApprovalTasks(request, nextStep, workflow);
      } else {
        // All steps complete - approve the budget
        request.status = 'approved';
        request.completedAt = new Date();

        await this.budgetService.approveBudget(
          request.budgetId,
          request.approvalHistory[request.approvalHistory.length - 1].actionBy,
          request.approvalHistory[request.approvalHistory.length - 1].actionByName,
        );

        this.eventEmitter.emit('budget.fully_approved', { request });
      }
    }
  }

  private async delegateApproval(
    request: ApprovalRequest,
    step: ApprovalStep,
    delegateId: string,
    delegateName: string,
  ): Promise<void> {
    const task: ApprovalTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      requestId: request.id,
      stepId: step.id,
      assignedTo: delegateId,
      assignedToName: delegateName,
      assignedAt: new Date(),
      dueDate: step.timeoutDays
        ? new Date(Date.now() + step.timeoutDays * 24 * 60 * 60 * 1000)
        : undefined,
      status: 'pending',
    };

    this.tasks.set(task.id, task);
  }

  private async escalateRequest(
    request: ApprovalRequest,
    workflow: ApprovalWorkflow,
  ): Promise<void> {
    if (!workflow.escalationRules || workflow.escalationRules.length === 0) {
      return;
    }

    const rule = workflow.escalationRules[0];
    if (request.escalationCount >= rule.maxEscalations) {
      return;
    }

    request.escalationCount++;

    // Create tasks for escalation targets
    for (const escalateTo of rule.escalateTo) {
      const task: ApprovalTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        requestId: request.id,
        stepId: request.currentStepId,
        assignedTo: escalateTo,
        assignedAt: new Date(),
        status: 'pending',
      };

      this.tasks.set(task.id, task);
    }

    this.eventEmitter.emit('budget.approval_escalated', {
      request,
      escalateTo: rule.escalateTo,
    });
  }

  async getApprovalRequest(id: string): Promise<ApprovalRequest | null> {
    return this.requests.get(id) || null;
  }

  async getApprovalRequests(
    tenantId: string,
    filters?: {
      budgetId?: string;
      status?: ApprovalStatus;
      submittedBy?: string;
      limit?: number;
    },
  ): Promise<ApprovalRequest[]> {
    let requests = Array.from(this.requests.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    if (filters?.budgetId) {
      requests = requests.filter((r) => r.budgetId === filters.budgetId);
    }

    if (filters?.status) {
      requests = requests.filter((r) => r.status === filters.status);
    }

    if (filters?.submittedBy) {
      requests = requests.filter((r) => r.submittedBy === filters.submittedBy);
    }

    requests = requests.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

    if (filters?.limit) {
      requests = requests.slice(0, filters.limit);
    }

    return requests;
  }

  // =================== APPROVAL TASKS ===================

  async getMyApprovalTasks(
    userId: string,
    tenantId: string,
    status?: 'pending' | 'completed',
  ): Promise<Array<ApprovalTask & { request: ApprovalRequest }>> {
    let tasks = Array.from(this.tasks.values()).filter(
      (t) => t.assignedTo === userId,
    );

    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    const result: Array<ApprovalTask & { request: ApprovalRequest }> = [];
    for (const task of tasks) {
      const request = this.requests.get(task.requestId);
      if (request && request.tenantId === tenantId) {
        result.push({ ...task, request });
      }
    }

    return result.sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.assignedAt.getTime() - a.assignedAt.getTime();
    });
  }

  async getApprovalTasksForRequest(requestId: string): Promise<ApprovalTask[]> {
    return Array.from(this.tasks.values()).filter(
      (t) => t.requestId === requestId,
    );
  }

  // =================== DELEGATIONS ===================

  async createDelegation(data: {
    tenantId: string;
    delegatorId: string;
    delegatorName: string;
    delegateId: string;
    delegateName: string;
    startDate: Date;
    endDate?: Date;
    budgetTypes?: string[];
    maxAmount?: number;
    reason?: string;
  }): Promise<ApprovalDelegation> {
    const id = `delegation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const delegation: ApprovalDelegation = {
      id,
      tenantId: data.tenantId,
      delegatorId: data.delegatorId,
      delegatorName: data.delegatorName,
      delegateId: data.delegateId,
      delegateName: data.delegateName,
      startDate: data.startDate,
      endDate: data.endDate,
      budgetTypes: data.budgetTypes,
      maxAmount: data.maxAmount,
      reason: data.reason,
      isActive: true,
      createdAt: new Date(),
    };

    this.delegations.set(id, delegation);

    this.eventEmitter.emit('budget.delegation_created', { delegation });

    return delegation;
  }

  async getActiveDelegate(
    userId: string,
    tenantId: string,
  ): Promise<{ id: string; name: string } | null> {
    const now = new Date();

    const delegation = Array.from(this.delegations.values()).find(
      (d) =>
        d.tenantId === tenantId &&
        d.delegatorId === userId &&
        d.isActive &&
        d.startDate <= now &&
        (!d.endDate || d.endDate >= now),
    );

    if (delegation) {
      return { id: delegation.delegateId, name: delegation.delegateName };
    }

    return null;
  }

  async getDelegations(
    tenantId: string,
    userId?: string,
  ): Promise<ApprovalDelegation[]> {
    let delegations = Array.from(this.delegations.values()).filter(
      (d) => d.tenantId === tenantId,
    );

    if (userId) {
      delegations = delegations.filter(
        (d) => d.delegatorId === userId || d.delegateId === userId,
      );
    }

    return delegations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async revokeDelegation(id: string): Promise<boolean> {
    const delegation = this.delegations.get(id);
    if (!delegation) return false;

    delegation.isActive = false;
    delegation.endDate = new Date();

    this.eventEmitter.emit('budget.delegation_revoked', { delegation });

    return true;
  }

  // =================== COMMENTS ===================

  async addComment(data: {
    requestId: string;
    userId: string;
    userName: string;
    comment: string;
    isPrivate?: boolean;
  }): Promise<ApprovalComment | null> {
    const request = this.requests.get(data.requestId);
    if (!request) return null;

    const comment: ApprovalComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      requestId: data.requestId,
      userId: data.userId,
      userName: data.userName,
      comment: data.comment,
      isPrivate: data.isPrivate || false,
      createdAt: new Date(),
    };

    request.comments.push(comment);

    this.eventEmitter.emit('budget.comment_added', { comment, request });

    return comment;
  }

  async getComments(
    requestId: string,
    includePrivate: boolean = false,
  ): Promise<ApprovalComment[]> {
    const request = this.requests.get(requestId);
    if (!request) return [];

    let comments = request.comments;
    if (!includePrivate) {
      comments = comments.filter((c) => !c.isPrivate);
    }

    return comments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // =================== STATISTICS ===================

  async getApprovalStatistics(tenantId: string): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    averageApprovalTime: number;
    pendingTasks: number;
    activeWorkflows: number;
    activeDelegations: number;
    autoApprovalRate: number;
  }> {
    const requests = Array.from(this.requests.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    const pendingRequests = requests.filter((r) => r.status === 'pending').length;
    const approvedRequests = requests.filter((r) => r.status === 'approved').length;
    const rejectedRequests = requests.filter((r) => r.status === 'rejected').length;
    const autoApprovedCount = requests.filter((r) => r.autoApproved).length;

    // Calculate average approval time for completed requests
    const completedRequests = requests.filter(
      (r) => r.status === 'approved' && r.completedAt,
    );
    const avgTime = completedRequests.length > 0
      ? completedRequests.reduce((sum, r) => {
        const diff = r.completedAt!.getTime() - r.submittedAt.getTime();
        return sum + diff / (1000 * 60 * 60 * 24); // Convert to days
      }, 0) / completedRequests.length
      : 0;

    const tasks = Array.from(this.tasks.values()).filter((t) => {
      const request = this.requests.get(t.requestId);
      return request && request.tenantId === tenantId && t.status === 'pending';
    });

    const workflows = Array.from(this.workflows.values()).filter(
      (w) => w.tenantId === tenantId && w.isActive,
    );

    const delegations = Array.from(this.delegations.values()).filter(
      (d) => d.tenantId === tenantId && d.isActive,
    );

    return {
      totalRequests: requests.length,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      averageApprovalTime: Math.round(avgTime * 100) / 100,
      pendingTasks: tasks.length,
      activeWorkflows: workflows.length,
      activeDelegations: delegations.length,
      autoApprovalRate: requests.length > 0
        ? Math.round((autoApprovedCount / requests.length) * 100)
        : 0,
    };
  }
}
