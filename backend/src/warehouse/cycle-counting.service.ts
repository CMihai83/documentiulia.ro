import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Cycle Count Types
export enum CycleCountStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CountFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  ABC = 'abc',
  RANDOM = 'random',
}

export enum CountType {
  FULL = 'full',
  PARTIAL = 'partial',
  SPOT = 'spot',
  ABC = 'abc',
  BLIND = 'blind',
}

export enum AdjustmentType {
  COUNT_VARIANCE = 'count_variance',
  DAMAGE = 'damage',
  LOSS = 'loss',
  FOUND = 'found',
  EXPIRATION = 'expiration',
  QUALITY = 'quality',
  RECLASS = 'reclass',
  CORRECTION = 'correction',
}

export enum AdjustmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export enum ABCClass {
  A = 'A',
  B = 'B',
  C = 'C',
}

// Interfaces
export interface CycleCountPlan {
  id: string;
  tenantId: string;
  planNumber: string;
  name: string;
  status: CycleCountStatus;
  warehouseId: string;
  warehouseName: string;
  countType: CountType;
  frequency: CountFrequency;
  plannedDate: Date;
  dueDate?: Date;
  zones?: string[];
  locations?: string[];
  abcClass?: ABCClass;
  itemIds?: string[];
  totalLocations: number;
  countedLocations: number;
  totalItems: number;
  countedItems: number;
  varianceItems: number;
  tasks: CountTask[];
  blindCount: boolean;
  requiresApproval: boolean;
  approvalThreshold?: number;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CountTask {
  id: string;
  tenantId: string;
  planId: string;
  taskNumber: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'recount';
  locationId: string;
  locationCode: string;
  zoneId?: string;
  zoneName?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  expectedQuantity?: number;
  countedQuantity?: number;
  variance?: number;
  variancePercent?: number;
  varianceValue?: number;
  unitOfMeasure: string;
  unitCost?: number;
  lotNumber?: string;
  batchNumber?: string;
  expiryDate?: Date;
  assignedTo?: string;
  assignedToName?: string;
  countedBy?: string;
  countedByName?: string;
  countedAt?: Date;
  recountRequired: boolean;
  recountReason?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryAdjustment {
  id: string;
  tenantId: string;
  adjustmentNumber: string;
  status: AdjustmentStatus;
  type: AdjustmentType;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationCode: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  previousQuantity: number;
  adjustmentQuantity: number;
  newQuantity: number;
  unitOfMeasure: string;
  unitCost?: number;
  totalValue?: number;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  cycleCountPlanId?: string;
  cycleCountTaskId?: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  postedAt?: Date;
  attachmentIds?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs
export interface CreateCycleCountPlanDto {
  name: string;
  warehouseId: string;
  warehouseName: string;
  countType: CountType;
  frequency?: CountFrequency;
  plannedDate: Date;
  dueDate?: Date;
  zones?: string[];
  locations?: string[];
  abcClass?: ABCClass;
  itemIds?: string[];
  blindCount?: boolean;
  requiresApproval?: boolean;
  approvalThreshold?: number;
  createdBy: string;
  createdByName: string;
  notes?: string;
}

export interface AddCountTaskDto {
  locationId: string;
  locationCode: string;
  zoneId?: string;
  zoneName?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  expectedQuantity?: number;
  unitOfMeasure: string;
  unitCost?: number;
  lotNumber?: string;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface RecordCountDto {
  countedQuantity: number;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  notes?: string;
  countedBy: string;
  countedByName: string;
}

export interface CreateAdjustmentDto {
  type: AdjustmentType;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationCode: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  previousQuantity: number;
  adjustmentQuantity: number;
  unitOfMeasure: string;
  unitCost?: number;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  cycleCountPlanId?: string;
  cycleCountTaskId?: string;
  requestedBy: string;
  requestedByName: string;
}

@Injectable()
export class CycleCountingService {
  private plans = new Map<string, CycleCountPlan>();
  private tasks = new Map<string, CountTask>();
  private adjustments = new Map<string, InventoryAdjustment>();
  private planCounter = new Map<string, number>();
  private taskCounter = new Map<string, number>();
  private adjustmentCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Cycle Count Plan Operations
  async createCycleCountPlan(
    tenantId: string,
    dto: CreateCycleCountPlanDto,
  ): Promise<CycleCountPlan> {
    const id = `cc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const planNumber = await this.generatePlanNumber(tenantId);

    const plan: CycleCountPlan = {
      id,
      tenantId,
      planNumber,
      name: dto.name,
      status: CycleCountStatus.PLANNED,
      warehouseId: dto.warehouseId,
      warehouseName: dto.warehouseName,
      countType: dto.countType,
      frequency: dto.frequency || CountFrequency.RANDOM,
      plannedDate: new Date(dto.plannedDate),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      zones: dto.zones,
      locations: dto.locations,
      abcClass: dto.abcClass,
      itemIds: dto.itemIds,
      totalLocations: 0,
      countedLocations: 0,
      totalItems: 0,
      countedItems: 0,
      varianceItems: 0,
      tasks: [],
      blindCount: dto.blindCount ?? false,
      requiresApproval: dto.requiresApproval ?? true,
      approvalThreshold: dto.approvalThreshold,
      createdBy: dto.createdBy,
      createdByName: dto.createdByName,
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.plans.set(id, plan);

    this.eventEmitter.emit('cycle_count_plan.created', {
      tenantId,
      planId: id,
      countType: dto.countType,
    });

    return plan;
  }

  async addTasksToPlan(
    tenantId: string,
    planId: string,
    tasks: AddCountTaskDto[],
  ): Promise<CycleCountPlan> {
    const plan = await this.getCycleCountPlan(tenantId, planId);

    if (plan.status !== CycleCountStatus.PLANNED) {
      throw new BadRequestException('Can only add tasks to planned count');
    }

    for (const taskDto of tasks) {
      const task = await this.createCountTask(tenantId, planId, taskDto, plan.blindCount);
      plan.tasks.push(task);
    }

    const uniqueLocations = new Set(plan.tasks.map((t) => t.locationId));
    plan.totalLocations = uniqueLocations.size;
    plan.totalItems = plan.tasks.length;
    plan.updatedAt = new Date();

    this.plans.set(planId, plan);
    return plan;
  }

  async startCycleCount(tenantId: string, planId: string): Promise<CycleCountPlan> {
    const plan = await this.getCycleCountPlan(tenantId, planId);

    if (plan.status !== CycleCountStatus.PLANNED) {
      throw new BadRequestException('Can only start planned count');
    }

    if (plan.tasks.length === 0) {
      throw new BadRequestException('Plan must have at least one task');
    }

    plan.status = CycleCountStatus.IN_PROGRESS;
    plan.updatedAt = new Date();

    this.plans.set(planId, plan);

    this.eventEmitter.emit('cycle_count.started', {
      tenantId,
      planId,
      taskCount: plan.tasks.length,
    });

    return plan;
  }

  async assignCountTask(
    tenantId: string,
    taskId: string,
    assignedTo: string,
    assignedToName: string,
  ): Promise<CountTask> {
    const task = await this.getCountTask(tenantId, taskId);

    if (task.status !== 'pending' && task.status !== 'recount') {
      throw new BadRequestException('Task cannot be assigned');
    }

    task.status = 'assigned';
    task.assignedTo = assignedTo;
    task.assignedToName = assignedToName;
    task.updatedAt = new Date();

    this.tasks.set(taskId, task);
    return task;
  }

  async startCountTask(tenantId: string, taskId: string): Promise<CountTask> {
    const task = await this.getCountTask(tenantId, taskId);

    if (task.status !== 'assigned') {
      throw new BadRequestException('Task must be assigned first');
    }

    task.status = 'in_progress';
    task.updatedAt = new Date();

    this.tasks.set(taskId, task);
    return task;
  }

  async recordCount(
    tenantId: string,
    taskId: string,
    dto: RecordCountDto,
  ): Promise<CountTask> {
    const task = await this.getCountTask(tenantId, taskId);

    if (task.status !== 'in_progress') {
      throw new BadRequestException('Task must be in progress');
    }

    task.countedQuantity = dto.countedQuantity;
    task.countedBy = dto.countedBy;
    task.countedByName = dto.countedByName;
    task.countedAt = new Date();
    task.notes = dto.notes;

    if (dto.lotNumber) task.lotNumber = dto.lotNumber;
    if (dto.batchNumber) task.batchNumber = dto.batchNumber;

    // Calculate variance
    if (task.expectedQuantity !== undefined) {
      task.variance = dto.countedQuantity - task.expectedQuantity;
      task.variancePercent =
        task.expectedQuantity > 0
          ? (task.variance / task.expectedQuantity) * 100
          : dto.countedQuantity > 0
          ? 100
          : 0;
      task.varianceValue = task.unitCost
        ? Math.abs(task.variance) * task.unitCost
        : undefined;
    }

    task.status = 'completed';
    task.updatedAt = new Date();

    this.tasks.set(taskId, task);

    // Update plan progress
    await this.updatePlanProgress(tenantId, task.planId);

    this.eventEmitter.emit('count_task.completed', {
      tenantId,
      taskId,
      planId: task.planId,
      variance: task.variance,
    });

    return task;
  }

  async requestRecount(
    tenantId: string,
    taskId: string,
    reason: string,
  ): Promise<CountTask> {
    const task = await this.getCountTask(tenantId, taskId);

    if (task.status !== 'completed') {
      throw new BadRequestException('Can only request recount for completed task');
    }

    task.status = 'recount';
    task.recountRequired = true;
    task.recountReason = reason;
    task.countedQuantity = undefined;
    task.variance = undefined;
    task.variancePercent = undefined;
    task.assignedTo = undefined;
    task.assignedToName = undefined;
    task.updatedAt = new Date();

    this.tasks.set(taskId, task);

    // Update plan progress
    await this.updatePlanProgress(tenantId, task.planId);

    return task;
  }

  async submitPlanForApproval(
    tenantId: string,
    planId: string,
  ): Promise<CycleCountPlan> {
    const plan = await this.getCycleCountPlan(tenantId, planId);

    if (plan.status !== CycleCountStatus.IN_PROGRESS) {
      throw new BadRequestException('Count must be in progress');
    }

    const pendingTasks = plan.tasks.filter(
      (t) => t.status !== 'completed',
    );

    if (pendingTasks.length > 0) {
      throw new BadRequestException('All tasks must be completed');
    }

    if (plan.requiresApproval) {
      plan.status = CycleCountStatus.PENDING_APPROVAL;
    } else {
      plan.status = CycleCountStatus.APPROVED;
      plan.approvedAt = new Date();
    }

    plan.updatedAt = new Date();
    this.plans.set(planId, plan);

    this.eventEmitter.emit('cycle_count.submitted', {
      tenantId,
      planId,
      requiresApproval: plan.requiresApproval,
    });

    return plan;
  }

  async approveCycleCount(
    tenantId: string,
    planId: string,
    approverId: string,
  ): Promise<CycleCountPlan> {
    const plan = await this.getCycleCountPlan(tenantId, planId);

    if (plan.status !== CycleCountStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Plan is not pending approval');
    }

    plan.status = CycleCountStatus.APPROVED;
    plan.approvedBy = approverId;
    plan.approvedAt = new Date();
    plan.updatedAt = new Date();

    this.plans.set(planId, plan);

    this.eventEmitter.emit('cycle_count.approved', {
      tenantId,
      planId,
      approverId,
    });

    return plan;
  }

  async completeCycleCount(
    tenantId: string,
    planId: string,
  ): Promise<{ plan: CycleCountPlan; adjustments: InventoryAdjustment[] }> {
    const plan = await this.getCycleCountPlan(tenantId, planId);

    if (plan.status !== CycleCountStatus.APPROVED) {
      throw new BadRequestException('Plan must be approved first');
    }

    // Create adjustments for variance items
    const adjustments: InventoryAdjustment[] = [];

    for (const task of plan.tasks) {
      if (task.variance && task.variance !== 0) {
        const adjustment = await this.createAdjustment(tenantId, {
          type: AdjustmentType.COUNT_VARIANCE,
          warehouseId: plan.warehouseId,
          warehouseName: plan.warehouseName,
          locationId: task.locationId,
          locationCode: task.locationCode,
          itemId: task.itemId,
          itemCode: task.itemCode,
          itemName: task.itemName,
          previousQuantity: task.expectedQuantity || 0,
          adjustmentQuantity: task.variance,
          unitOfMeasure: task.unitOfMeasure,
          unitCost: task.unitCost,
          lotNumber: task.lotNumber,
          batchNumber: task.batchNumber,
          reason: `Cycle count variance: ${plan.planNumber}`,
          cycleCountPlanId: planId,
          cycleCountTaskId: task.id,
          requestedBy: plan.createdBy,
          requestedByName: plan.createdByName,
        });

        // Auto-approve and post adjustments from approved cycle count
        adjustment.status = AdjustmentStatus.APPROVED;
        adjustment.approvedBy = plan.approvedBy || plan.createdBy;
        adjustment.approvedAt = new Date();
        this.adjustments.set(adjustment.id, adjustment);

        await this.postAdjustment(tenantId, adjustment.id);
        adjustments.push(adjustment);
      }
    }

    plan.status = CycleCountStatus.COMPLETED;
    plan.completedAt = new Date();
    plan.updatedAt = new Date();

    this.plans.set(planId, plan);

    this.eventEmitter.emit('cycle_count.completed', {
      tenantId,
      planId,
      adjustmentCount: adjustments.length,
    });

    return { plan, adjustments };
  }

  async cancelCycleCount(
    tenantId: string,
    planId: string,
    reason: string,
  ): Promise<CycleCountPlan> {
    const plan = await this.getCycleCountPlan(tenantId, planId);

    if (plan.status === CycleCountStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed count');
    }

    plan.status = CycleCountStatus.CANCELLED;
    plan.metadata = { ...plan.metadata, cancellationReason: reason };
    plan.updatedAt = new Date();

    this.plans.set(planId, plan);

    this.eventEmitter.emit('cycle_count.cancelled', { tenantId, planId, reason });

    return plan;
  }

  async getCycleCountPlan(
    tenantId: string,
    planId: string,
  ): Promise<CycleCountPlan> {
    const plan = this.plans.get(planId);

    if (!plan || plan.tenantId !== tenantId) {
      throw new NotFoundException(`Cycle count plan ${planId} not found`);
    }

    // Refresh tasks from store
    plan.tasks = Array.from(this.tasks.values()).filter(
      (t) => t.planId === planId,
    );

    return plan;
  }

  async listCycleCountPlans(
    tenantId: string,
    filters: {
      warehouseId?: string;
      status?: CycleCountStatus;
      countType?: CountType;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<CycleCountPlan[]> {
    let plans = Array.from(this.plans.values()).filter(
      (p) => p.tenantId === tenantId,
    );

    if (filters.warehouseId) {
      plans = plans.filter((p) => p.warehouseId === filters.warehouseId);
    }

    if (filters.status) {
      plans = plans.filter((p) => p.status === filters.status);
    }

    if (filters.countType) {
      plans = plans.filter((p) => p.countType === filters.countType);
    }

    if (filters.dateFrom) {
      plans = plans.filter((p) => p.plannedDate >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      plans = plans.filter((p) => p.plannedDate <= filters.dateTo!);
    }

    return plans.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async createCountTask(
    tenantId: string,
    planId: string,
    dto: AddCountTaskDto,
    blindCount: boolean,
  ): Promise<CountTask> {
    const id = `ctask_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const taskNumber = await this.generateTaskNumber(tenantId);

    const task: CountTask = {
      id,
      tenantId,
      planId,
      taskNumber,
      status: 'pending',
      locationId: dto.locationId,
      locationCode: dto.locationCode,
      zoneId: dto.zoneId,
      zoneName: dto.zoneName,
      itemId: dto.itemId,
      itemCode: dto.itemCode,
      itemName: dto.itemName,
      expectedQuantity: blindCount ? undefined : dto.expectedQuantity,
      unitOfMeasure: dto.unitOfMeasure,
      unitCost: dto.unitCost,
      lotNumber: dto.lotNumber,
      batchNumber: dto.batchNumber,
      expiryDate: dto.expiryDate,
      recountRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(id, task);
    return task;
  }

  async getCountTask(tenantId: string, taskId: string): Promise<CountTask> {
    const task = this.tasks.get(taskId);

    if (!task || task.tenantId !== tenantId) {
      throw new NotFoundException(`Count task ${taskId} not found`);
    }

    return task;
  }

  async listCountTasks(
    tenantId: string,
    planId: string,
    filters?: {
      status?: CountTask['status'];
      assignedTo?: string;
      zoneId?: string;
    },
  ): Promise<CountTask[]> {
    let tasks = Array.from(this.tasks.values()).filter(
      (t) => t.tenantId === tenantId && t.planId === planId,
    );

    if (filters?.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    if (filters?.assignedTo) {
      tasks = tasks.filter((t) => t.assignedTo === filters.assignedTo);
    }

    if (filters?.zoneId) {
      tasks = tasks.filter((t) => t.zoneId === filters.zoneId);
    }

    return tasks;
  }

  private async updatePlanProgress(
    tenantId: string,
    planId: string,
  ): Promise<void> {
    const plan = await this.getCycleCountPlan(tenantId, planId);

    const completedTasks = plan.tasks.filter((t) => t.status === 'completed');
    const varianceTasks = plan.tasks.filter(
      (t) => t.status === 'completed' && t.variance && t.variance !== 0,
    );

    const countedLocations = new Set(
      completedTasks.map((t) => t.locationId),
    );

    plan.countedItems = completedTasks.length;
    plan.countedLocations = countedLocations.size;
    plan.varianceItems = varianceTasks.length;
    plan.updatedAt = new Date();

    this.plans.set(planId, plan);
  }

  // Inventory Adjustment Operations
  async createAdjustment(
    tenantId: string,
    dto: CreateAdjustmentDto,
  ): Promise<InventoryAdjustment> {
    const id = `adj_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const adjustmentNumber = await this.generateAdjustmentNumber(tenantId);

    const adjustment: InventoryAdjustment = {
      id,
      tenantId,
      adjustmentNumber,
      status: AdjustmentStatus.PENDING,
      type: dto.type,
      warehouseId: dto.warehouseId,
      warehouseName: dto.warehouseName,
      locationId: dto.locationId,
      locationCode: dto.locationCode,
      itemId: dto.itemId,
      itemCode: dto.itemCode,
      itemName: dto.itemName,
      previousQuantity: dto.previousQuantity,
      adjustmentQuantity: dto.adjustmentQuantity,
      newQuantity: dto.previousQuantity + dto.adjustmentQuantity,
      unitOfMeasure: dto.unitOfMeasure,
      unitCost: dto.unitCost,
      totalValue: dto.unitCost
        ? Math.abs(dto.adjustmentQuantity) * dto.unitCost
        : undefined,
      lotNumber: dto.lotNumber,
      batchNumber: dto.batchNumber,
      serialNumber: dto.serialNumber,
      reason: dto.reason,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      cycleCountPlanId: dto.cycleCountPlanId,
      cycleCountTaskId: dto.cycleCountTaskId,
      requestedBy: dto.requestedBy,
      requestedByName: dto.requestedByName,
      requestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.adjustments.set(id, adjustment);

    this.eventEmitter.emit('inventory_adjustment.created', {
      tenantId,
      adjustmentId: id,
      type: dto.type,
      itemId: dto.itemId,
      quantity: dto.adjustmentQuantity,
    });

    return adjustment;
  }

  async approveAdjustment(
    tenantId: string,
    adjustmentId: string,
    approverId: string,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.getAdjustment(tenantId, adjustmentId);

    if (adjustment.status !== AdjustmentStatus.PENDING) {
      throw new BadRequestException('Adjustment is not pending');
    }

    adjustment.status = AdjustmentStatus.APPROVED;
    adjustment.approvedBy = approverId;
    adjustment.approvedAt = new Date();
    adjustment.updatedAt = new Date();

    this.adjustments.set(adjustmentId, adjustment);

    this.eventEmitter.emit('inventory_adjustment.approved', {
      tenantId,
      adjustmentId,
      approverId,
    });

    return adjustment;
  }

  async rejectAdjustment(
    tenantId: string,
    adjustmentId: string,
    rejectorId: string,
    reason: string,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.getAdjustment(tenantId, adjustmentId);

    if (adjustment.status !== AdjustmentStatus.PENDING) {
      throw new BadRequestException('Adjustment is not pending');
    }

    adjustment.status = AdjustmentStatus.REJECTED;
    adjustment.rejectedBy = rejectorId;
    adjustment.rejectedAt = new Date();
    adjustment.rejectionReason = reason;
    adjustment.updatedAt = new Date();

    this.adjustments.set(adjustmentId, adjustment);

    this.eventEmitter.emit('inventory_adjustment.rejected', {
      tenantId,
      adjustmentId,
      rejectorId,
      reason,
    });

    return adjustment;
  }

  async postAdjustment(
    tenantId: string,
    adjustmentId: string,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.getAdjustment(tenantId, adjustmentId);

    if (adjustment.status !== AdjustmentStatus.APPROVED) {
      throw new BadRequestException('Adjustment must be approved first');
    }

    adjustment.status = AdjustmentStatus.POSTED;
    adjustment.postedAt = new Date();
    adjustment.updatedAt = new Date();

    this.adjustments.set(adjustmentId, adjustment);

    this.eventEmitter.emit('inventory_adjustment.posted', {
      tenantId,
      adjustmentId,
      itemId: adjustment.itemId,
      locationId: adjustment.locationId,
      quantityChange: adjustment.adjustmentQuantity,
    });

    return adjustment;
  }

  async getAdjustment(
    tenantId: string,
    adjustmentId: string,
  ): Promise<InventoryAdjustment> {
    const adjustment = this.adjustments.get(adjustmentId);

    if (!adjustment || adjustment.tenantId !== tenantId) {
      throw new NotFoundException(`Adjustment ${adjustmentId} not found`);
    }

    return adjustment;
  }

  async listAdjustments(
    tenantId: string,
    filters: {
      warehouseId?: string;
      status?: AdjustmentStatus;
      type?: AdjustmentType;
      itemId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<InventoryAdjustment[]> {
    let adjustments = Array.from(this.adjustments.values()).filter(
      (a) => a.tenantId === tenantId,
    );

    if (filters.warehouseId) {
      adjustments = adjustments.filter(
        (a) => a.warehouseId === filters.warehouseId,
      );
    }

    if (filters.status) {
      adjustments = adjustments.filter((a) => a.status === filters.status);
    }

    if (filters.type) {
      adjustments = adjustments.filter((a) => a.type === filters.type);
    }

    if (filters.itemId) {
      adjustments = adjustments.filter((a) => a.itemId === filters.itemId);
    }

    if (filters.dateFrom) {
      adjustments = adjustments.filter(
        (a) => a.createdAt >= filters.dateFrom!,
      );
    }

    if (filters.dateTo) {
      adjustments = adjustments.filter((a) => a.createdAt <= filters.dateTo!);
    }

    return adjustments.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  // Analytics
  async getCycleCountAnalytics(
    tenantId: string,
    warehouseId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalPlans: number;
    completedPlans: number;
    totalTasks: number;
    completedTasks: number;
    varianceCount: number;
    totalVarianceValue: number;
    accuracyRate: number;
    byCountType: Record<CountType, number>;
  }> {
    const plans = Array.from(this.plans.values()).filter(
      (p) =>
        p.tenantId === tenantId &&
        p.warehouseId === warehouseId &&
        p.createdAt >= dateFrom &&
        p.createdAt <= dateTo,
    );

    const completedPlans = plans.filter(
      (p) => p.status === CycleCountStatus.COMPLETED,
    );

    let totalTasks = 0;
    let completedTasks = 0;
    let varianceCount = 0;
    let totalVarianceValue = 0;

    const byCountType: Record<CountType, number> = {
      [CountType.FULL]: 0,
      [CountType.PARTIAL]: 0,
      [CountType.SPOT]: 0,
      [CountType.ABC]: 0,
      [CountType.BLIND]: 0,
    };

    for (const plan of plans) {
      byCountType[plan.countType]++;
      totalTasks += plan.totalItems;
      completedTasks += plan.countedItems;
      varianceCount += plan.varianceItems;

      // Get variance value from tasks
      const planTasks = Array.from(this.tasks.values()).filter(
        (t) => t.planId === plan.id,
      );

      for (const task of planTasks) {
        if (task.varianceValue) {
          totalVarianceValue += task.varianceValue;
        }
      }
    }

    const accuracyRate =
      completedTasks > 0
        ? ((completedTasks - varianceCount) / completedTasks) * 100
        : 0;

    return {
      totalPlans: plans.length,
      completedPlans: completedPlans.length,
      totalTasks,
      completedTasks,
      varianceCount,
      totalVarianceValue,
      accuracyRate,
      byCountType,
    };
  }

  async getAdjustmentAnalytics(
    tenantId: string,
    warehouseId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalAdjustments: number;
    byType: Record<AdjustmentType, number>;
    byStatus: Record<AdjustmentStatus, number>;
    totalPositive: number;
    totalNegative: number;
    totalValue: number;
    topItems: { itemId: string; itemCode: string; adjustments: number; totalValue: number }[];
  }> {
    const adjustments = Array.from(this.adjustments.values()).filter(
      (a) =>
        a.tenantId === tenantId &&
        a.warehouseId === warehouseId &&
        a.createdAt >= dateFrom &&
        a.createdAt <= dateTo,
    );

    const byType: Record<AdjustmentType, number> = {
      [AdjustmentType.COUNT_VARIANCE]: 0,
      [AdjustmentType.DAMAGE]: 0,
      [AdjustmentType.LOSS]: 0,
      [AdjustmentType.FOUND]: 0,
      [AdjustmentType.EXPIRATION]: 0,
      [AdjustmentType.QUALITY]: 0,
      [AdjustmentType.RECLASS]: 0,
      [AdjustmentType.CORRECTION]: 0,
    };

    const byStatus: Record<AdjustmentStatus, number> = {
      [AdjustmentStatus.PENDING]: 0,
      [AdjustmentStatus.APPROVED]: 0,
      [AdjustmentStatus.REJECTED]: 0,
      [AdjustmentStatus.POSTED]: 0,
      [AdjustmentStatus.CANCELLED]: 0,
    };

    let totalPositive = 0;
    let totalNegative = 0;
    let totalValue = 0;

    const itemStats = new Map<
      string,
      { itemCode: string; count: number; value: number }
    >();

    for (const adj of adjustments) {
      byType[adj.type]++;
      byStatus[adj.status]++;

      if (adj.adjustmentQuantity > 0) {
        totalPositive += adj.adjustmentQuantity;
      } else {
        totalNegative += Math.abs(adj.adjustmentQuantity);
      }

      totalValue += adj.totalValue || 0;

      const itemData = itemStats.get(adj.itemId) || {
        itemCode: adj.itemCode,
        count: 0,
        value: 0,
      };
      itemData.count++;
      itemData.value += adj.totalValue || 0;
      itemStats.set(adj.itemId, itemData);
    }

    const topItems = Array.from(itemStats.entries())
      .map(([itemId, data]) => ({
        itemId,
        itemCode: data.itemCode,
        adjustments: data.count,
        totalValue: data.value,
      }))
      .sort((a, b) => b.adjustments - a.adjustments)
      .slice(0, 10);

    return {
      totalAdjustments: adjustments.length,
      byType,
      byStatus,
      totalPositive,
      totalNegative,
      totalValue,
      topItems,
    };
  }

  // Helper Methods
  private async generatePlanNumber(tenantId: string): Promise<string> {
    const counter = (this.planCounter.get(tenantId) || 0) + 1;
    this.planCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `CC-${year}-${counter.toString().padStart(6, '0')}`;
  }

  private async generateTaskNumber(tenantId: string): Promise<string> {
    const counter = (this.taskCounter.get(tenantId) || 0) + 1;
    this.taskCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `CT-${year}-${counter.toString().padStart(8, '0')}`;
  }

  private async generateAdjustmentNumber(tenantId: string): Promise<string> {
    const counter = (this.adjustmentCounter.get(tenantId) || 0) + 1;
    this.adjustmentCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `ADJ-${year}-${counter.toString().padStart(6, '0')}`;
  }
}
