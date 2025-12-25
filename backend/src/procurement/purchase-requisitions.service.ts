import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Purchase Requisition Types
export enum RequisitionStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  PARTIALLY_APPROVED = 'partially_approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  CONVERTED_TO_PO = 'converted_to_po',
}

export enum RequisitionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

export enum ApprovalAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_CHANGES = 'request_changes',
  DELEGATE = 'delegate',
  ESCALATE = 'escalate',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DELEGATED = 'delegated',
  ESCALATED = 'escalated',
  SKIPPED = 'skipped',
}

// Interfaces
export interface RequisitionLine {
  id: string;
  itemId?: string;
  description: string;
  category: string;
  quantity: number;
  unitOfMeasure: string;
  estimatedUnitPrice: number;
  currency: string;
  totalAmount: number;
  suggestedSupplierId?: string;
  deliveryDate?: Date;
  specifications?: string;
  attachmentIds?: string[];
  costCenter?: string;
  projectCode?: string;
  glAccount?: string;
  taxRate?: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  approverNotes?: string;
}

export interface ApprovalRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  conditions: ApprovalCondition[];
  approverLevels: ApproverLevel[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
}

export interface ApproverLevel {
  level: number;
  approverType: 'user' | 'role' | 'department_head' | 'manager' | 'custom';
  approverId?: string;
  roleName?: string;
  amountThreshold?: number;
  requiredApprovals: number;
  allowDelegation: boolean;
  autoApproveAfterDays?: number;
  escalateAfterDays?: number;
}

export interface ApprovalStep {
  id: string;
  level: number;
  approverId: string;
  approverName: string;
  approverRole?: string;
  status: ApprovalStatus;
  action?: ApprovalAction;
  comments?: string;
  delegatedTo?: string;
  delegatedBy?: string;
  actionDate?: Date;
  dueDate?: Date;
  remindersSent: number;
}

export interface PurchaseRequisition {
  id: string;
  tenantId: string;
  requisitionNumber: string;
  title: string;
  description?: string;
  requesterId: string;
  requesterName: string;
  requesterDepartment?: string;
  status: RequisitionStatus;
  priority: RequisitionPriority;
  lines: RequisitionLine[];
  totalAmount: number;
  currency: string;
  budgetId?: string;
  budgetAllocationId?: string;
  costCenter?: string;
  projectCode?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  requiredDate?: Date;
  justification?: string;
  attachmentIds?: string[];
  approvalRuleId?: string;
  approvalSteps: ApprovalStep[];
  currentApprovalLevel: number;
  approvalHistory: ApprovalHistoryEntry[];
  linkedPurchaseOrderIds?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalHistoryEntry {
  timestamp: Date;
  action: string;
  userId: string;
  userName: string;
  level?: number;
  comments?: string;
  previousStatus: RequisitionStatus;
  newStatus: RequisitionStatus;
}

export interface CreateRequisitionDto {
  title: string;
  description?: string;
  requesterId: string;
  requesterName: string;
  requesterDepartment?: string;
  priority?: RequisitionPriority;
  lines: Omit<RequisitionLine, 'id' | 'status' | 'totalAmount'>[];
  currency?: string;
  budgetId?: string;
  costCenter?: string;
  projectCode?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  requiredDate?: Date;
  justification?: string;
  attachmentIds?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateRequisitionDto {
  title?: string;
  description?: string;
  priority?: RequisitionPriority;
  lines?: Omit<RequisitionLine, 'id' | 'status' | 'totalAmount'>[];
  currency?: string;
  budgetId?: string;
  costCenter?: string;
  projectCode?: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  requiredDate?: Date;
  justification?: string;
  attachmentIds?: string[];
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ApprovalActionDto {
  action: ApprovalAction;
  comments?: string;
  delegateTo?: string;
  lineApprovals?: { lineId: string; approved: boolean; comments?: string }[];
}

export interface CreateApprovalRuleDto {
  name: string;
  description?: string;
  conditions: ApprovalCondition[];
  approverLevels: ApproverLevel[];
  priority?: number;
}

export interface RequisitionSearchParams {
  status?: RequisitionStatus;
  priority?: RequisitionPriority;
  requesterId?: string;
  approverId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface ApprovalQueueItem {
  requisition: PurchaseRequisition;
  pendingStep: ApprovalStep;
  daysWaiting: number;
  isOverdue: boolean;
}

@Injectable()
export class PurchaseRequisitionsService {
  private requisitions = new Map<string, PurchaseRequisition>();
  private approvalRules = new Map<string, ApprovalRule>();
  private requisitionCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Requisition Management
  async createRequisition(
    tenantId: string,
    dto: CreateRequisitionDto,
  ): Promise<PurchaseRequisition> {
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const requisitionNumber = await this.generateRequisitionNumber(tenantId);

    const lines: RequisitionLine[] = dto.lines.map((line, index) => ({
      ...line,
      id: `line_${index}_${Date.now()}`,
      totalAmount: line.quantity * line.estimatedUnitPrice,
      status: 'pending' as const,
    }));

    const totalAmount = lines.reduce((sum, line) => sum + line.totalAmount, 0);

    const requisition: PurchaseRequisition = {
      id,
      tenantId,
      requisitionNumber,
      title: dto.title,
      description: dto.description,
      requesterId: dto.requesterId,
      requesterName: dto.requesterName,
      requesterDepartment: dto.requesterDepartment,
      status: RequisitionStatus.DRAFT,
      priority: dto.priority || RequisitionPriority.MEDIUM,
      lines,
      totalAmount,
      currency: dto.currency || 'RON',
      budgetId: dto.budgetId,
      costCenter: dto.costCenter,
      projectCode: dto.projectCode,
      deliveryAddress: dto.deliveryAddress,
      deliveryInstructions: dto.deliveryInstructions,
      requiredDate: dto.requiredDate,
      justification: dto.justification,
      attachmentIds: dto.attachmentIds || [],
      approvalSteps: [],
      currentApprovalLevel: 0,
      approvalHistory: [],
      tags: dto.tags || [],
      metadata: dto.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.requisitions.set(id, requisition);

    this.eventEmitter.emit('requisition.created', {
      tenantId,
      requisitionId: id,
      requisitionNumber,
      requesterId: dto.requesterId,
      totalAmount,
    });

    return requisition;
  }

  async updateRequisition(
    tenantId: string,
    requisitionId: string,
    dto: UpdateRequisitionDto,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.getRequisition(tenantId, requisitionId);

    if (requisition.status !== RequisitionStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft requisitions can be modified',
      );
    }

    if (dto.lines) {
      requisition.lines = dto.lines.map((line, index) => ({
        ...line,
        id: `line_${index}_${Date.now()}`,
        totalAmount: line.quantity * line.estimatedUnitPrice,
        status: 'pending' as const,
      }));
      requisition.totalAmount = requisition.lines.reduce(
        (sum, line) => sum + line.totalAmount,
        0,
      );
    }

    Object.assign(requisition, {
      ...dto,
      lines: requisition.lines,
      totalAmount: requisition.totalAmount,
      updatedAt: new Date(),
    });

    this.requisitions.set(requisitionId, requisition);

    this.eventEmitter.emit('requisition.updated', {
      tenantId,
      requisitionId,
      changes: Object.keys(dto),
    });

    return requisition;
  }

  async getRequisition(
    tenantId: string,
    requisitionId: string,
  ): Promise<PurchaseRequisition> {
    const requisition = this.requisitions.get(requisitionId);

    if (!requisition || requisition.tenantId !== tenantId) {
      throw new NotFoundException(`Requisition ${requisitionId} not found`);
    }

    return requisition;
  }

  async searchRequisitions(
    tenantId: string,
    params: RequisitionSearchParams,
  ): Promise<{ data: PurchaseRequisition[]; total: number; page: number; limit: number }> {
    let requisitions = Array.from(this.requisitions.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    // Apply filters
    if (params.status) {
      requisitions = requisitions.filter((r) => r.status === params.status);
    }

    if (params.priority) {
      requisitions = requisitions.filter((r) => r.priority === params.priority);
    }

    if (params.requesterId) {
      requisitions = requisitions.filter(
        (r) => r.requesterId === params.requesterId,
      );
    }

    if (params.approverId) {
      requisitions = requisitions.filter((r) =>
        r.approvalSteps.some(
          (step) =>
            step.approverId === params.approverId &&
            step.status === ApprovalStatus.PENDING,
        ),
      );
    }

    if (params.dateFrom) {
      requisitions = requisitions.filter(
        (r) => r.createdAt >= params.dateFrom!,
      );
    }

    if (params.dateTo) {
      requisitions = requisitions.filter((r) => r.createdAt <= params.dateTo!);
    }

    if (params.minAmount !== undefined) {
      requisitions = requisitions.filter(
        (r) => r.totalAmount >= params.minAmount!,
      );
    }

    if (params.maxAmount !== undefined) {
      requisitions = requisitions.filter(
        (r) => r.totalAmount <= params.maxAmount!,
      );
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      requisitions = requisitions.filter(
        (r) =>
          r.title.toLowerCase().includes(searchLower) ||
          r.requisitionNumber.toLowerCase().includes(searchLower) ||
          r.description?.toLowerCase().includes(searchLower),
      );
    }

    if (params.tags?.length) {
      requisitions = requisitions.filter((r) =>
        params.tags!.some((tag) => r.tags?.includes(tag)),
      );
    }

    // Sort by created date descending
    requisitions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const total = requisitions.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;

    return {
      data: requisitions.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
    };
  }

  async deleteRequisition(
    tenantId: string,
    requisitionId: string,
  ): Promise<void> {
    const requisition = await this.getRequisition(tenantId, requisitionId);

    if (requisition.status !== RequisitionStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft requisitions can be deleted',
      );
    }

    this.requisitions.delete(requisitionId);

    this.eventEmitter.emit('requisition.deleted', {
      tenantId,
      requisitionId,
    });
  }

  // Submission and Approval
  async submitForApproval(
    tenantId: string,
    requisitionId: string,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.getRequisition(tenantId, requisitionId);

    if (requisition.status !== RequisitionStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft requisitions can be submitted for approval',
      );
    }

    if (requisition.lines.length === 0) {
      throw new BadRequestException(
        'Requisition must have at least one line item',
      );
    }

    // Find matching approval rule
    const rule = await this.findMatchingApprovalRule(tenantId, requisition);

    if (rule) {
      requisition.approvalRuleId = rule.id;
      requisition.approvalSteps = this.createApprovalSteps(rule);
      requisition.currentApprovalLevel = 1;
    } else {
      // Auto-approve if no rule matches (configurable)
      requisition.status = RequisitionStatus.APPROVED;
      requisition.approvedAt = new Date();
      requisition.approvalHistory.push({
        timestamp: new Date(),
        action: 'auto_approved',
        userId: 'system',
        userName: 'System',
        comments: 'Auto-approved: No approval rule matched',
        previousStatus: RequisitionStatus.DRAFT,
        newStatus: RequisitionStatus.APPROVED,
      });

      this.eventEmitter.emit('requisition.approved', {
        tenantId,
        requisitionId,
        totalAmount: requisition.totalAmount,
      });

      requisition.updatedAt = new Date();
      this.requisitions.set(requisitionId, requisition);
      return requisition;
    }

    requisition.status = RequisitionStatus.PENDING_APPROVAL;
    requisition.submittedAt = new Date();
    requisition.approvalHistory.push({
      timestamp: new Date(),
      action: 'submitted',
      userId: requisition.requesterId,
      userName: requisition.requesterName,
      previousStatus: RequisitionStatus.DRAFT,
      newStatus: RequisitionStatus.PENDING_APPROVAL,
    });

    requisition.updatedAt = new Date();
    this.requisitions.set(requisitionId, requisition);

    this.eventEmitter.emit('requisition.submitted', {
      tenantId,
      requisitionId,
      approverIds: requisition.approvalSteps
        .filter((s) => s.level === 1)
        .map((s) => s.approverId),
    });

    return requisition;
  }

  async processApproval(
    tenantId: string,
    requisitionId: string,
    approverId: string,
    approverName: string,
    dto: ApprovalActionDto,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.getRequisition(tenantId, requisitionId);

    if (requisition.status !== RequisitionStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Requisition is not pending approval',
      );
    }

    // Find pending step for this approver
    const pendingStep = requisition.approvalSteps.find(
      (step) =>
        step.approverId === approverId &&
        step.level === requisition.currentApprovalLevel &&
        step.status === ApprovalStatus.PENDING,
    );

    if (!pendingStep) {
      throw new BadRequestException(
        'No pending approval step found for this approver',
      );
    }

    switch (dto.action) {
      case ApprovalAction.APPROVE:
        await this.handleApprove(requisition, pendingStep, approverId, approverName, dto);
        break;

      case ApprovalAction.REJECT:
        await this.handleReject(requisition, pendingStep, approverId, approverName, dto);
        break;

      case ApprovalAction.REQUEST_CHANGES:
        await this.handleRequestChanges(requisition, pendingStep, approverId, approverName, dto);
        break;

      case ApprovalAction.DELEGATE:
        await this.handleDelegate(requisition, pendingStep, approverId, approverName, dto);
        break;

      case ApprovalAction.ESCALATE:
        await this.handleEscalate(requisition, pendingStep, approverId, approverName, dto);
        break;
    }

    requisition.updatedAt = new Date();
    this.requisitions.set(requisitionId, requisition);

    return requisition;
  }

  private async handleApprove(
    requisition: PurchaseRequisition,
    step: ApprovalStep,
    approverId: string,
    approverName: string,
    dto: ApprovalActionDto,
  ): Promise<void> {
    step.status = ApprovalStatus.APPROVED;
    step.action = ApprovalAction.APPROVE;
    step.comments = dto.comments;
    step.actionDate = new Date();

    // Process line-level approvals if provided
    if (dto.lineApprovals) {
      for (const lineApproval of dto.lineApprovals) {
        const line = requisition.lines.find((l) => l.id === lineApproval.lineId);
        if (line) {
          line.status = lineApproval.approved ? 'approved' : 'rejected';
          line.approverNotes = lineApproval.comments;
        }
      }
    }

    requisition.approvalHistory.push({
      timestamp: new Date(),
      action: 'approved',
      userId: approverId,
      userName: approverName,
      level: step.level,
      comments: dto.comments,
      previousStatus: requisition.status,
      newStatus: requisition.status,
    });

    // Check if all approvals at current level are complete
    const currentLevelSteps = requisition.approvalSteps.filter(
      (s) => s.level === requisition.currentApprovalLevel,
    );
    const approvedAtLevel = currentLevelSteps.filter(
      (s) => s.status === ApprovalStatus.APPROVED,
    ).length;

    // Find the rule to check required approvals
    const rule = requisition.approvalRuleId
      ? this.approvalRules.get(requisition.approvalRuleId)
      : null;
    const levelConfig = rule?.approverLevels.find(
      (l) => l.level === requisition.currentApprovalLevel,
    );
    const requiredApprovals = levelConfig?.requiredApprovals || 1;

    if (approvedAtLevel >= requiredApprovals) {
      // Move to next level or complete
      const maxLevel = Math.max(
        ...requisition.approvalSteps.map((s) => s.level),
      );

      if (requisition.currentApprovalLevel >= maxLevel) {
        // Check for any rejected lines
        const hasRejectedLines = requisition.lines.some(
          (l) => l.status === 'rejected',
        );

        if (hasRejectedLines) {
          requisition.status = RequisitionStatus.PARTIALLY_APPROVED;
        } else {
          requisition.status = RequisitionStatus.APPROVED;
        }
        requisition.approvedAt = new Date();

        requisition.approvalHistory.push({
          timestamp: new Date(),
          action: 'fully_approved',
          userId: 'system',
          userName: 'System',
          previousStatus: RequisitionStatus.PENDING_APPROVAL,
          newStatus: requisition.status,
        });

        this.eventEmitter.emit('requisition.approved', {
          tenantId: requisition.tenantId,
          requisitionId: requisition.id,
          totalAmount: requisition.totalAmount,
          partiallyApproved: hasRejectedLines,
        });
      } else {
        requisition.currentApprovalLevel++;

        this.eventEmitter.emit('requisition.level_approved', {
          tenantId: requisition.tenantId,
          requisitionId: requisition.id,
          level: requisition.currentApprovalLevel - 1,
          nextLevel: requisition.currentApprovalLevel,
        });
      }
    }
  }

  private async handleReject(
    requisition: PurchaseRequisition,
    step: ApprovalStep,
    approverId: string,
    approverName: string,
    dto: ApprovalActionDto,
  ): Promise<void> {
    step.status = ApprovalStatus.REJECTED;
    step.action = ApprovalAction.REJECT;
    step.comments = dto.comments;
    step.actionDate = new Date();

    requisition.status = RequisitionStatus.REJECTED;
    requisition.rejectedAt = new Date();

    requisition.approvalHistory.push({
      timestamp: new Date(),
      action: 'rejected',
      userId: approverId,
      userName: approverName,
      level: step.level,
      comments: dto.comments,
      previousStatus: RequisitionStatus.PENDING_APPROVAL,
      newStatus: RequisitionStatus.REJECTED,
    });

    this.eventEmitter.emit('requisition.rejected', {
      tenantId: requisition.tenantId,
      requisitionId: requisition.id,
      rejectedBy: approverId,
      reason: dto.comments,
    });
  }

  private async handleRequestChanges(
    requisition: PurchaseRequisition,
    step: ApprovalStep,
    approverId: string,
    approverName: string,
    dto: ApprovalActionDto,
  ): Promise<void> {
    step.status = ApprovalStatus.PENDING; // Keep pending for re-review
    step.action = ApprovalAction.REQUEST_CHANGES;
    step.comments = dto.comments;

    requisition.status = RequisitionStatus.DRAFT; // Return to draft for changes

    requisition.approvalHistory.push({
      timestamp: new Date(),
      action: 'changes_requested',
      userId: approverId,
      userName: approverName,
      level: step.level,
      comments: dto.comments,
      previousStatus: RequisitionStatus.PENDING_APPROVAL,
      newStatus: RequisitionStatus.DRAFT,
    });

    this.eventEmitter.emit('requisition.changes_requested', {
      tenantId: requisition.tenantId,
      requisitionId: requisition.id,
      requesterId: requisition.requesterId,
      comments: dto.comments,
    });
  }

  private async handleDelegate(
    requisition: PurchaseRequisition,
    step: ApprovalStep,
    approverId: string,
    approverName: string,
    dto: ApprovalActionDto,
  ): Promise<void> {
    if (!dto.delegateTo) {
      throw new BadRequestException('Delegation target is required');
    }

    step.status = ApprovalStatus.DELEGATED;
    step.action = ApprovalAction.DELEGATE;
    step.comments = dto.comments;
    step.delegatedTo = dto.delegateTo;
    step.delegatedBy = approverId;
    step.actionDate = new Date();

    // Create new step for delegate
    const newStep: ApprovalStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      level: step.level,
      approverId: dto.delegateTo,
      approverName: `Delegated from ${approverName}`,
      status: ApprovalStatus.PENDING,
      remindersSent: 0,
    };

    requisition.approvalSteps.push(newStep);

    requisition.approvalHistory.push({
      timestamp: new Date(),
      action: 'delegated',
      userId: approverId,
      userName: approverName,
      level: step.level,
      comments: `Delegated to ${dto.delegateTo}: ${dto.comments || ''}`,
      previousStatus: requisition.status,
      newStatus: requisition.status,
    });

    this.eventEmitter.emit('requisition.delegated', {
      tenantId: requisition.tenantId,
      requisitionId: requisition.id,
      fromApprover: approverId,
      toApprover: dto.delegateTo,
    });
  }

  private async handleEscalate(
    requisition: PurchaseRequisition,
    step: ApprovalStep,
    approverId: string,
    approverName: string,
    dto: ApprovalActionDto,
  ): Promise<void> {
    step.status = ApprovalStatus.ESCALATED;
    step.action = ApprovalAction.ESCALATE;
    step.comments = dto.comments;
    step.actionDate = new Date();

    // Move to next level immediately
    const maxLevel = Math.max(...requisition.approvalSteps.map((s) => s.level));

    if (requisition.currentApprovalLevel < maxLevel) {
      requisition.currentApprovalLevel++;
    }

    requisition.approvalHistory.push({
      timestamp: new Date(),
      action: 'escalated',
      userId: approverId,
      userName: approverName,
      level: step.level,
      comments: dto.comments,
      previousStatus: requisition.status,
      newStatus: requisition.status,
    });

    this.eventEmitter.emit('requisition.escalated', {
      tenantId: requisition.tenantId,
      requisitionId: requisition.id,
      fromLevel: step.level,
      toLevel: requisition.currentApprovalLevel,
    });
  }

  async cancelRequisition(
    tenantId: string,
    requisitionId: string,
    userId: string,
    userName: string,
    reason?: string,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.getRequisition(tenantId, requisitionId);

    if (
      requisition.status === RequisitionStatus.CONVERTED_TO_PO ||
      requisition.status === RequisitionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot cancel this requisition',
      );
    }

    const previousStatus = requisition.status;
    requisition.status = RequisitionStatus.CANCELLED;
    requisition.cancelledAt = new Date();

    requisition.approvalHistory.push({
      timestamp: new Date(),
      action: 'cancelled',
      userId,
      userName,
      comments: reason,
      previousStatus,
      newStatus: RequisitionStatus.CANCELLED,
    });

    requisition.updatedAt = new Date();
    this.requisitions.set(requisitionId, requisition);

    this.eventEmitter.emit('requisition.cancelled', {
      tenantId,
      requisitionId,
      cancelledBy: userId,
      reason,
    });

    return requisition;
  }

  // Approval Queue
  async getApprovalQueue(
    tenantId: string,
    approverId: string,
  ): Promise<ApprovalQueueItem[]> {
    const queue: ApprovalQueueItem[] = [];
    const now = new Date();

    for (const requisition of this.requisitions.values()) {
      if (
        requisition.tenantId !== tenantId ||
        requisition.status !== RequisitionStatus.PENDING_APPROVAL
      ) {
        continue;
      }

      const pendingStep = requisition.approvalSteps.find(
        (step) =>
          step.approverId === approverId &&
          step.level === requisition.currentApprovalLevel &&
          step.status === ApprovalStatus.PENDING,
      );

      if (pendingStep) {
        const submittedAt = requisition.submittedAt || requisition.createdAt;
        const daysWaiting = Math.floor(
          (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        const isOverdue = pendingStep.dueDate
          ? now > pendingStep.dueDate
          : daysWaiting > 5;

        queue.push({
          requisition,
          pendingStep,
          daysWaiting,
          isOverdue,
        });
      }
    }

    // Sort by overdue first, then by days waiting descending
    queue.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) {
        return a.isOverdue ? -1 : 1;
      }
      return b.daysWaiting - a.daysWaiting;
    });

    return queue;
  }

  // Approval Rules Management
  async createApprovalRule(
    tenantId: string,
    dto: CreateApprovalRuleDto,
  ): Promise<ApprovalRule> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const rule: ApprovalRule = {
      id,
      tenantId,
      name: dto.name,
      description: dto.description,
      conditions: dto.conditions,
      approverLevels: dto.approverLevels.sort((a, b) => a.level - b.level),
      isActive: true,
      priority: dto.priority || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.approvalRules.set(id, rule);

    this.eventEmitter.emit('approval_rule.created', {
      tenantId,
      ruleId: id,
      name: dto.name,
    });

    return rule;
  }

  async getApprovalRules(tenantId: string): Promise<ApprovalRule[]> {
    return Array.from(this.approvalRules.values())
      .filter((r) => r.tenantId === tenantId && r.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  async updateApprovalRule(
    tenantId: string,
    ruleId: string,
    updates: Partial<CreateApprovalRuleDto>,
  ): Promise<ApprovalRule> {
    const rule = this.approvalRules.get(ruleId);

    if (!rule || rule.tenantId !== tenantId) {
      throw new NotFoundException(`Approval rule ${ruleId} not found`);
    }

    Object.assign(rule, {
      ...updates,
      approverLevels: updates.approverLevels
        ? updates.approverLevels.sort((a, b) => a.level - b.level)
        : rule.approverLevels,
      updatedAt: new Date(),
    });

    this.approvalRules.set(ruleId, rule);

    return rule;
  }

  async deleteApprovalRule(tenantId: string, ruleId: string): Promise<void> {
    const rule = this.approvalRules.get(ruleId);

    if (!rule || rule.tenantId !== tenantId) {
      throw new NotFoundException(`Approval rule ${ruleId} not found`);
    }

    rule.isActive = false;
    rule.updatedAt = new Date();
    this.approvalRules.set(ruleId, rule);
  }

  // Helper Methods
  private async generateRequisitionNumber(tenantId: string): Promise<string> {
    const counter = (this.requisitionCounter.get(tenantId) || 0) + 1;
    this.requisitionCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `PR-${year}-${counter.toString().padStart(6, '0')}`;
  }

  private async findMatchingApprovalRule(
    tenantId: string,
    requisition: PurchaseRequisition,
  ): Promise<ApprovalRule | null> {
    const rules = await this.getApprovalRules(tenantId);

    for (const rule of rules) {
      if (this.evaluateConditions(rule.conditions, requisition)) {
        return rule;
      }
    }

    return null;
  }

  private evaluateConditions(
    conditions: ApprovalCondition[],
    requisition: PurchaseRequisition,
  ): boolean {
    for (const condition of conditions) {
      const value = this.getFieldValue(requisition, condition.field);

      switch (condition.operator) {
        case 'eq':
          if (value !== condition.value) return false;
          break;
        case 'ne':
          if (value === condition.value) return false;
          break;
        case 'gt':
          if (value <= condition.value) return false;
          break;
        case 'gte':
          if (value < condition.value) return false;
          break;
        case 'lt':
          if (value >= condition.value) return false;
          break;
        case 'lte':
          if (value > condition.value) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(value))
            return false;
          break;
        case 'nin':
          if (Array.isArray(condition.value) && condition.value.includes(value))
            return false;
          break;
        case 'contains':
          if (typeof value !== 'string' || !value.includes(condition.value))
            return false;
          break;
      }
    }

    return true;
  }

  private getFieldValue(requisition: PurchaseRequisition, field: string): any {
    const parts = field.split('.');
    let value: any = requisition;

    for (const part of parts) {
      value = value?.[part];
    }

    return value;
  }

  private createApprovalSteps(rule: ApprovalRule): ApprovalStep[] {
    const steps: ApprovalStep[] = [];

    for (const level of rule.approverLevels) {
      // For simplicity, create one step per level
      // In production, this would look up actual approvers based on type
      const step: ApprovalStep = {
        id: `step_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        level: level.level,
        approverId: level.approverId || `approver_level_${level.level}`,
        approverName: `Level ${level.level} Approver`,
        approverRole: level.roleName,
        status: ApprovalStatus.PENDING,
        remindersSent: 0,
        dueDate: level.autoApproveAfterDays
          ? new Date(
              Date.now() + level.autoApproveAfterDays * 24 * 60 * 60 * 1000,
            )
          : undefined,
      };

      steps.push(step);
    }

    return steps;
  }

  // Analytics
  async getRequisitionAnalytics(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalRequisitions: number;
    totalAmount: number;
    byStatus: Record<RequisitionStatus, number>;
    byPriority: Record<RequisitionPriority, number>;
    averageApprovalTime: number;
    approvalRate: number;
  }> {
    const requisitions = Array.from(this.requisitions.values()).filter(
      (r) =>
        r.tenantId === tenantId &&
        r.createdAt >= dateFrom &&
        r.createdAt <= dateTo,
    );

    const byStatus: Record<RequisitionStatus, number> = {
      [RequisitionStatus.DRAFT]: 0,
      [RequisitionStatus.PENDING_APPROVAL]: 0,
      [RequisitionStatus.APPROVED]: 0,
      [RequisitionStatus.PARTIALLY_APPROVED]: 0,
      [RequisitionStatus.REJECTED]: 0,
      [RequisitionStatus.CANCELLED]: 0,
      [RequisitionStatus.CONVERTED_TO_PO]: 0,
    };

    const byPriority: Record<RequisitionPriority, number> = {
      [RequisitionPriority.LOW]: 0,
      [RequisitionPriority.MEDIUM]: 0,
      [RequisitionPriority.HIGH]: 0,
      [RequisitionPriority.URGENT]: 0,
      [RequisitionPriority.CRITICAL]: 0,
    };

    let totalAmount = 0;
    let totalApprovalTime = 0;
    let approvedCount = 0;
    let decidedCount = 0;

    for (const req of requisitions) {
      byStatus[req.status]++;
      byPriority[req.priority]++;
      totalAmount += req.totalAmount;

      if (req.approvedAt && req.submittedAt) {
        totalApprovalTime +=
          req.approvedAt.getTime() - req.submittedAt.getTime();
        approvedCount++;
      }

      if (
        req.status === RequisitionStatus.APPROVED ||
        req.status === RequisitionStatus.PARTIALLY_APPROVED ||
        req.status === RequisitionStatus.REJECTED
      ) {
        decidedCount++;
      }
    }

    const averageApprovalTime =
      approvedCount > 0
        ? totalApprovalTime / approvedCount / (1000 * 60 * 60) // Convert to hours
        : 0;

    const approvalRate =
      decidedCount > 0
        ? ((byStatus[RequisitionStatus.APPROVED] +
            byStatus[RequisitionStatus.PARTIALLY_APPROVED]) /
            decidedCount) *
          100
        : 0;

    return {
      totalRequisitions: requisitions.length,
      totalAmount,
      byStatus,
      byPriority,
      averageApprovalTime,
      approvalRate,
    };
  }

  // Convert to Purchase Order
  async markAsConvertedToPO(
    tenantId: string,
    requisitionId: string,
    purchaseOrderId: string,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.getRequisition(tenantId, requisitionId);

    if (
      requisition.status !== RequisitionStatus.APPROVED &&
      requisition.status !== RequisitionStatus.PARTIALLY_APPROVED
    ) {
      throw new BadRequestException(
        'Only approved requisitions can be converted to purchase orders',
      );
    }

    requisition.status = RequisitionStatus.CONVERTED_TO_PO;
    requisition.linkedPurchaseOrderIds = [
      ...(requisition.linkedPurchaseOrderIds || []),
      purchaseOrderId,
    ];
    requisition.updatedAt = new Date();

    requisition.approvalHistory.push({
      timestamp: new Date(),
      action: 'converted_to_po',
      userId: 'system',
      userName: 'System',
      comments: `Converted to Purchase Order ${purchaseOrderId}`,
      previousStatus: requisition.status,
      newStatus: RequisitionStatus.CONVERTED_TO_PO,
    });

    this.requisitions.set(requisitionId, requisition);

    this.eventEmitter.emit('requisition.converted', {
      tenantId,
      requisitionId,
      purchaseOrderId,
    });

    return requisition;
  }
}
