import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Pick Wave & Task Types
export enum PickWaveStatus {
  DRAFT = 'draft',
  RELEASED = 'released',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PickTaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SHORT_PICKED = 'short_picked',
  CANCELLED = 'cancelled',
}

export enum PickStrategy {
  FIFO = 'fifo',
  LIFO = 'lifo',
  FEFO = 'fefo', // First Expired First Out
  ZONE = 'zone',
  BATCH = 'batch',
  WAVE = 'wave',
}

export enum PackingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PACKED = 'packed',
  VERIFIED = 'verified',
  SHIPPED = 'shipped',
  CANCELLED = 'cancelled',
}

export enum ContainerType {
  CARTON = 'carton',
  PALLET = 'pallet',
  TOTE = 'tote',
  ENVELOPE = 'envelope',
  CUSTOM = 'custom',
}

// Interfaces
export interface PickWave {
  id: string;
  tenantId: string;
  waveNumber: string;
  status: PickWaveStatus;
  warehouseId: string;
  warehouseName: string;
  strategy: PickStrategy;
  priority: number;
  orderIds: string[];
  totalOrders: number;
  totalLines: number;
  totalQuantity: number;
  pickedQuantity: number;
  tasks: PickTask[];
  releaseDate?: Date;
  startDate?: Date;
  completedDate?: Date;
  createdBy: string;
  createdByName: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PickTask {
  id: string;
  tenantId: string;
  waveId?: string;
  taskNumber: string;
  status: PickTaskStatus;
  orderId: string;
  orderNumber: string;
  orderLineId: string;
  warehouseId: string;
  locationId: string;
  locationCode: string;
  zoneId?: string;
  zoneName?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requestedQuantity: number;
  pickedQuantity: number;
  shortQuantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  expiryDate?: Date;
  pickSequence: number;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  binLocation?: string;
  notes?: string;
  shortReason?: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackingSession {
  id: string;
  tenantId: string;
  sessionNumber: string;
  status: PackingStatus;
  warehouseId: string;
  warehouseName: string;
  packingStationId?: string;
  packingStationName?: string;
  orderId: string;
  orderNumber: string;
  shipmentId?: string;
  containers: PackingContainer[];
  totalItems: number;
  packedItems: number;
  packedBy: string;
  packedByName: string;
  startedAt?: Date;
  completedAt?: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  shippingLabelGenerated: boolean;
  shippingLabelUrl?: string;
  packingSlipPrinted: boolean;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackingContainer {
  id: string;
  containerNumber: string;
  containerType: ContainerType;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  weight?: number;
  weightUnit?: string;
  items: PackedItem[];
  totalQuantity: number;
  sealed: boolean;
  sealedAt?: Date;
  trackingNumber?: string;
}

export interface PackedItem {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  pickTaskId?: string;
}

// DTOs
export interface CreatePickWaveDto {
  warehouseId: string;
  warehouseName: string;
  strategy?: PickStrategy;
  priority?: number;
  orderIds: string[];
  notes?: string;
  createdBy: string;
  createdByName: string;
}

export interface CreatePickTaskDto {
  waveId?: string;
  orderId: string;
  orderNumber: string;
  orderLineId: string;
  warehouseId: string;
  locationId: string;
  locationCode: string;
  zoneId?: string;
  zoneName?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requestedQuantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  batchNumber?: string;
  expiryDate?: Date;
  pickSequence?: number;
}

export interface AssignTaskDto {
  assignedTo: string;
  assignedToName: string;
}

export interface CompletePickDto {
  pickedQuantity: number;
  shortQuantity?: number;
  shortReason?: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  notes?: string;
}

export interface CreatePackingSessionDto {
  warehouseId: string;
  warehouseName: string;
  packingStationId?: string;
  packingStationName?: string;
  orderId: string;
  orderNumber: string;
  packedBy: string;
  packedByName: string;
}

export interface AddContainerDto {
  containerType: ContainerType;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
}

export interface PackItemDto {
  containerId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  pickTaskId?: string;
}

export interface SealContainerDto {
  weight?: number;
  weightUnit?: string;
  trackingNumber?: string;
}

@Injectable()
export class PickingPackingService {
  private waves = new Map<string, PickWave>();
  private tasks = new Map<string, PickTask>();
  private sessions = new Map<string, PackingSession>();
  private waveCounter = new Map<string, number>();
  private taskCounter = new Map<string, number>();
  private sessionCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Pick Wave Operations
  async createPickWave(tenantId: string, dto: CreatePickWaveDto): Promise<PickWave> {
    if (dto.orderIds.length === 0) {
      throw new BadRequestException('At least one order is required');
    }

    const id = `wave_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const waveNumber = await this.generateWaveNumber(tenantId);

    const wave: PickWave = {
      id,
      tenantId,
      waveNumber,
      status: PickWaveStatus.DRAFT,
      warehouseId: dto.warehouseId,
      warehouseName: dto.warehouseName,
      strategy: dto.strategy || PickStrategy.FIFO,
      priority: dto.priority || 5,
      orderIds: dto.orderIds,
      totalOrders: dto.orderIds.length,
      totalLines: 0,
      totalQuantity: 0,
      pickedQuantity: 0,
      tasks: [],
      createdBy: dto.createdBy,
      createdByName: dto.createdByName,
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.waves.set(id, wave);

    this.eventEmitter.emit('pick_wave.created', {
      tenantId,
      waveId: id,
      orderCount: dto.orderIds.length,
    });

    return wave;
  }

  async addTasksToWave(
    tenantId: string,
    waveId: string,
    tasks: CreatePickTaskDto[],
  ): Promise<PickWave> {
    const wave = await this.getPickWave(tenantId, waveId);

    if (wave.status !== PickWaveStatus.DRAFT) {
      throw new BadRequestException('Can only add tasks to draft wave');
    }

    for (const taskDto of tasks) {
      const task = await this.createPickTask(tenantId, { ...taskDto, waveId });
      wave.tasks.push(task);
    }

    wave.totalLines = wave.tasks.length;
    wave.totalQuantity = wave.tasks.reduce((sum, t) => sum + t.requestedQuantity, 0);
    wave.updatedAt = new Date();

    this.waves.set(waveId, wave);
    return wave;
  }

  async releasePickWave(tenantId: string, waveId: string): Promise<PickWave> {
    const wave = await this.getPickWave(tenantId, waveId);

    if (wave.status !== PickWaveStatus.DRAFT) {
      throw new BadRequestException('Can only release draft wave');
    }

    if (wave.tasks.length === 0) {
      throw new BadRequestException('Wave must have at least one task');
    }

    wave.status = PickWaveStatus.RELEASED;
    wave.releaseDate = new Date();
    wave.updatedAt = new Date();

    // Update all tasks to pending
    for (const task of wave.tasks) {
      task.status = PickTaskStatus.PENDING;
      this.tasks.set(task.id, task);
    }

    this.waves.set(waveId, wave);

    this.eventEmitter.emit('pick_wave.released', {
      tenantId,
      waveId,
      taskCount: wave.tasks.length,
    });

    return wave;
  }

  async getPickWave(tenantId: string, waveId: string): Promise<PickWave> {
    const wave = this.waves.get(waveId);

    if (!wave || wave.tenantId !== tenantId) {
      throw new NotFoundException(`Pick wave ${waveId} not found`);
    }

    return wave;
  }

  async listPickWaves(
    tenantId: string,
    warehouseId?: string,
    status?: PickWaveStatus,
  ): Promise<PickWave[]> {
    let waves = Array.from(this.waves.values()).filter(
      (w) => w.tenantId === tenantId,
    );

    if (warehouseId) {
      waves = waves.filter((w) => w.warehouseId === warehouseId);
    }

    if (status) {
      waves = waves.filter((w) => w.status === status);
    }

    return waves.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async cancelPickWave(
    tenantId: string,
    waveId: string,
    reason: string,
  ): Promise<PickWave> {
    const wave = await this.getPickWave(tenantId, waveId);

    if (wave.status === PickWaveStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed wave');
    }

    wave.status = PickWaveStatus.CANCELLED;
    wave.metadata = { ...wave.metadata, cancellationReason: reason };
    wave.updatedAt = new Date();

    // Cancel all pending tasks
    for (const task of wave.tasks) {
      if (task.status !== PickTaskStatus.COMPLETED) {
        task.status = PickTaskStatus.CANCELLED;
        this.tasks.set(task.id, task);
      }
    }

    this.waves.set(waveId, wave);

    this.eventEmitter.emit('pick_wave.cancelled', { tenantId, waveId, reason });

    return wave;
  }

  // Pick Task Operations
  async createPickTask(
    tenantId: string,
    dto: CreatePickTaskDto,
  ): Promise<PickTask> {
    const id = `pick_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const taskNumber = await this.generateTaskNumber(tenantId);

    const task: PickTask = {
      id,
      tenantId,
      waveId: dto.waveId,
      taskNumber,
      status: PickTaskStatus.PENDING,
      orderId: dto.orderId,
      orderNumber: dto.orderNumber,
      orderLineId: dto.orderLineId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId,
      locationCode: dto.locationCode,
      zoneId: dto.zoneId,
      zoneName: dto.zoneName,
      itemId: dto.itemId,
      itemCode: dto.itemCode,
      itemName: dto.itemName,
      requestedQuantity: dto.requestedQuantity,
      pickedQuantity: 0,
      shortQuantity: 0,
      unitOfMeasure: dto.unitOfMeasure,
      lotNumber: dto.lotNumber,
      batchNumber: dto.batchNumber,
      expiryDate: dto.expiryDate,
      pickSequence: dto.pickSequence || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(id, task);

    this.eventEmitter.emit('pick_task.created', {
      tenantId,
      taskId: id,
      orderId: dto.orderId,
      itemId: dto.itemId,
    });

    return task;
  }

  async assignPickTask(
    tenantId: string,
    taskId: string,
    dto: AssignTaskDto,
  ): Promise<PickTask> {
    const task = await this.getPickTask(tenantId, taskId);

    if (task.status !== PickTaskStatus.PENDING) {
      throw new BadRequestException('Can only assign pending tasks');
    }

    task.status = PickTaskStatus.ASSIGNED;
    task.assignedTo = dto.assignedTo;
    task.assignedToName = dto.assignedToName;
    task.assignedAt = new Date();
    task.updatedAt = new Date();

    this.tasks.set(taskId, task);

    this.eventEmitter.emit('pick_task.assigned', {
      tenantId,
      taskId,
      assignedTo: dto.assignedTo,
    });

    return task;
  }

  async startPickTask(tenantId: string, taskId: string): Promise<PickTask> {
    const task = await this.getPickTask(tenantId, taskId);

    if (task.status !== PickTaskStatus.ASSIGNED) {
      throw new BadRequestException('Task must be assigned before starting');
    }

    task.status = PickTaskStatus.IN_PROGRESS;
    task.startedAt = new Date();
    task.updatedAt = new Date();

    this.tasks.set(taskId, task);

    // Update wave status
    if (task.waveId) {
      await this.updateWaveProgress(tenantId, task.waveId);
    }

    this.eventEmitter.emit('pick_task.started', { tenantId, taskId });

    return task;
  }

  async completePickTask(
    tenantId: string,
    taskId: string,
    dto: CompletePickDto,
  ): Promise<PickTask> {
    const task = await this.getPickTask(tenantId, taskId);

    if (task.status !== PickTaskStatus.IN_PROGRESS) {
      throw new BadRequestException('Task must be in progress to complete');
    }

    const totalPicked = dto.pickedQuantity + (dto.shortQuantity || 0);
    if (totalPicked > task.requestedQuantity) {
      throw new BadRequestException('Cannot pick more than requested');
    }

    task.pickedQuantity = dto.pickedQuantity;
    task.shortQuantity = dto.shortQuantity || 0;
    task.shortReason = dto.shortReason;
    task.lotNumber = dto.lotNumber || task.lotNumber;
    task.batchNumber = dto.batchNumber || task.batchNumber;
    task.serialNumbers = dto.serialNumbers;
    task.notes = dto.notes;
    task.completedAt = new Date();
    task.updatedAt = new Date();

    if (task.shortQuantity > 0) {
      task.status = PickTaskStatus.SHORT_PICKED;
    } else {
      task.status = PickTaskStatus.COMPLETED;
    }

    this.tasks.set(taskId, task);

    // Update wave progress
    if (task.waveId) {
      await this.updateWaveProgress(tenantId, task.waveId);
    }

    this.eventEmitter.emit('pick_task.completed', {
      tenantId,
      taskId,
      pickedQuantity: dto.pickedQuantity,
      shortQuantity: dto.shortQuantity,
    });

    return task;
  }

  async getPickTask(tenantId: string, taskId: string): Promise<PickTask> {
    const task = this.tasks.get(taskId);

    if (!task || task.tenantId !== tenantId) {
      throw new NotFoundException(`Pick task ${taskId} not found`);
    }

    return task;
  }

  async listPickTasks(
    tenantId: string,
    filters: {
      warehouseId?: string;
      waveId?: string;
      orderId?: string;
      status?: PickTaskStatus;
      assignedTo?: string;
      zoneId?: string;
    },
  ): Promise<PickTask[]> {
    let tasks = Array.from(this.tasks.values()).filter(
      (t) => t.tenantId === tenantId,
    );

    if (filters.warehouseId) {
      tasks = tasks.filter((t) => t.warehouseId === filters.warehouseId);
    }

    if (filters.waveId) {
      tasks = tasks.filter((t) => t.waveId === filters.waveId);
    }

    if (filters.orderId) {
      tasks = tasks.filter((t) => t.orderId === filters.orderId);
    }

    if (filters.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    if (filters.assignedTo) {
      tasks = tasks.filter((t) => t.assignedTo === filters.assignedTo);
    }

    if (filters.zoneId) {
      tasks = tasks.filter((t) => t.zoneId === filters.zoneId);
    }

    return tasks.sort((a, b) => a.pickSequence - b.pickSequence);
  }

  async getPickerTasks(tenantId: string, pickerId: string): Promise<PickTask[]> {
    return this.listPickTasks(tenantId, {
      assignedTo: pickerId,
      status: PickTaskStatus.ASSIGNED,
    });
  }

  private async updateWaveProgress(
    tenantId: string,
    waveId: string,
  ): Promise<void> {
    const wave = await this.getPickWave(tenantId, waveId);

    const waveTasks = Array.from(this.tasks.values()).filter(
      (t) => t.waveId === waveId,
    );

    wave.pickedQuantity = waveTasks.reduce((sum, t) => sum + t.pickedQuantity, 0);

    const allCompleted = waveTasks.every(
      (t) =>
        t.status === PickTaskStatus.COMPLETED ||
        t.status === PickTaskStatus.SHORT_PICKED ||
        t.status === PickTaskStatus.CANCELLED,
    );

    const anyInProgress = waveTasks.some(
      (t) =>
        t.status === PickTaskStatus.IN_PROGRESS ||
        t.status === PickTaskStatus.ASSIGNED,
    );

    if (allCompleted) {
      wave.status = PickWaveStatus.COMPLETED;
      wave.completedDate = new Date();
    } else if (anyInProgress) {
      wave.status = PickWaveStatus.IN_PROGRESS;
      if (!wave.startDate) {
        wave.startDate = new Date();
      }
    }

    wave.updatedAt = new Date();
    this.waves.set(waveId, wave);
  }

  // Packing Session Operations
  async createPackingSession(
    tenantId: string,
    dto: CreatePackingSessionDto,
  ): Promise<PackingSession> {
    const id = `pack_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const sessionNumber = await this.generateSessionNumber(tenantId);

    const session: PackingSession = {
      id,
      tenantId,
      sessionNumber,
      status: PackingStatus.PENDING,
      warehouseId: dto.warehouseId,
      warehouseName: dto.warehouseName,
      packingStationId: dto.packingStationId,
      packingStationName: dto.packingStationName,
      orderId: dto.orderId,
      orderNumber: dto.orderNumber,
      containers: [],
      totalItems: 0,
      packedItems: 0,
      packedBy: dto.packedBy,
      packedByName: dto.packedByName,
      shippingLabelGenerated: false,
      packingSlipPrinted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(id, session);

    this.eventEmitter.emit('packing_session.created', {
      tenantId,
      sessionId: id,
      orderId: dto.orderId,
    });

    return session;
  }

  async startPackingSession(
    tenantId: string,
    sessionId: string,
  ): Promise<PackingSession> {
    const session = await this.getPackingSession(tenantId, sessionId);

    if (session.status !== PackingStatus.PENDING) {
      throw new BadRequestException('Session is not pending');
    }

    session.status = PackingStatus.IN_PROGRESS;
    session.startedAt = new Date();
    session.updatedAt = new Date();

    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('packing_session.started', { tenantId, sessionId });

    return session;
  }

  async addContainer(
    tenantId: string,
    sessionId: string,
    dto: AddContainerDto,
  ): Promise<PackingSession> {
    const session = await this.getPackingSession(tenantId, sessionId);

    if (session.status !== PackingStatus.IN_PROGRESS) {
      throw new BadRequestException('Session must be in progress');
    }

    const container: PackingContainer = {
      id: `cont_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      containerNumber: `${session.sessionNumber}-${session.containers.length + 1}`,
      containerType: dto.containerType,
      length: dto.length,
      width: dto.width,
      height: dto.height,
      dimensionUnit: dto.dimensionUnit,
      items: [],
      totalQuantity: 0,
      sealed: false,
    };

    session.containers.push(container);
    session.updatedAt = new Date();

    this.sessions.set(sessionId, session);

    return session;
  }

  async packItem(
    tenantId: string,
    sessionId: string,
    dto: PackItemDto,
  ): Promise<PackingSession> {
    const session = await this.getPackingSession(tenantId, sessionId);

    if (session.status !== PackingStatus.IN_PROGRESS) {
      throw new BadRequestException('Session must be in progress');
    }

    const container = session.containers.find((c) => c.id === dto.containerId);
    if (!container) {
      throw new NotFoundException(`Container ${dto.containerId} not found`);
    }

    if (container.sealed) {
      throw new BadRequestException('Cannot add items to sealed container');
    }

    const packedItem: PackedItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      itemId: dto.itemId,
      itemCode: dto.itemCode,
      itemName: dto.itemName,
      quantity: dto.quantity,
      unitOfMeasure: dto.unitOfMeasure,
      lotNumber: dto.lotNumber,
      batchNumber: dto.batchNumber,
      serialNumber: dto.serialNumber,
      pickTaskId: dto.pickTaskId,
    };

    container.items.push(packedItem);
    container.totalQuantity += dto.quantity;
    session.packedItems += dto.quantity;
    session.updatedAt = new Date();

    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('packing_session.item_packed', {
      tenantId,
      sessionId,
      itemId: dto.itemId,
      quantity: dto.quantity,
    });

    return session;
  }

  async sealContainer(
    tenantId: string,
    sessionId: string,
    containerId: string,
    dto: SealContainerDto,
  ): Promise<PackingSession> {
    const session = await this.getPackingSession(tenantId, sessionId);

    const container = session.containers.find((c) => c.id === containerId);
    if (!container) {
      throw new NotFoundException(`Container ${containerId} not found`);
    }

    if (container.sealed) {
      throw new BadRequestException('Container already sealed');
    }

    if (container.items.length === 0) {
      throw new BadRequestException('Cannot seal empty container');
    }

    container.sealed = true;
    container.sealedAt = new Date();
    container.weight = dto.weight;
    container.weightUnit = dto.weightUnit;
    container.trackingNumber = dto.trackingNumber;
    session.updatedAt = new Date();

    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('packing_container.sealed', {
      tenantId,
      sessionId,
      containerId,
    });

    return session;
  }

  async completePackingSession(
    tenantId: string,
    sessionId: string,
  ): Promise<PackingSession> {
    const session = await this.getPackingSession(tenantId, sessionId);

    if (session.status !== PackingStatus.IN_PROGRESS) {
      throw new BadRequestException('Session must be in progress');
    }

    const unsealedContainers = session.containers.filter((c) => !c.sealed);
    if (unsealedContainers.length > 0) {
      throw new BadRequestException('All containers must be sealed');
    }

    session.status = PackingStatus.PACKED;
    session.completedAt = new Date();
    session.updatedAt = new Date();

    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('packing_session.completed', {
      tenantId,
      sessionId,
      orderId: session.orderId,
      containerCount: session.containers.length,
    });

    return session;
  }

  async verifyPackingSession(
    tenantId: string,
    sessionId: string,
    verifierId: string,
  ): Promise<PackingSession> {
    const session = await this.getPackingSession(tenantId, sessionId);

    if (session.status !== PackingStatus.PACKED) {
      throw new BadRequestException('Session must be packed to verify');
    }

    session.status = PackingStatus.VERIFIED;
    session.verifiedBy = verifierId;
    session.verifiedAt = new Date();
    session.updatedAt = new Date();

    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('packing_session.verified', {
      tenantId,
      sessionId,
      verifierId,
    });

    return session;
  }

  async generateShippingLabel(
    tenantId: string,
    sessionId: string,
    labelUrl: string,
  ): Promise<PackingSession> {
    const session = await this.getPackingSession(tenantId, sessionId);

    session.shippingLabelGenerated = true;
    session.shippingLabelUrl = labelUrl;
    session.updatedAt = new Date();

    this.sessions.set(sessionId, session);

    return session;
  }

  async markShipped(
    tenantId: string,
    sessionId: string,
    shipmentId: string,
  ): Promise<PackingSession> {
    const session = await this.getPackingSession(tenantId, sessionId);

    if (session.status !== PackingStatus.VERIFIED) {
      throw new BadRequestException('Session must be verified before shipping');
    }

    session.status = PackingStatus.SHIPPED;
    session.shipmentId = shipmentId;
    session.updatedAt = new Date();

    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('packing_session.shipped', {
      tenantId,
      sessionId,
      shipmentId,
    });

    return session;
  }

  async getPackingSession(
    tenantId: string,
    sessionId: string,
  ): Promise<PackingSession> {
    const session = this.sessions.get(sessionId);

    if (!session || session.tenantId !== tenantId) {
      throw new NotFoundException(`Packing session ${sessionId} not found`);
    }

    return session;
  }

  async listPackingSessions(
    tenantId: string,
    filters: {
      warehouseId?: string;
      orderId?: string;
      status?: PackingStatus;
      packedBy?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<PackingSession[]> {
    let sessions = Array.from(this.sessions.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    if (filters.warehouseId) {
      sessions = sessions.filter((s) => s.warehouseId === filters.warehouseId);
    }

    if (filters.orderId) {
      sessions = sessions.filter((s) => s.orderId === filters.orderId);
    }

    if (filters.status) {
      sessions = sessions.filter((s) => s.status === filters.status);
    }

    if (filters.packedBy) {
      sessions = sessions.filter((s) => s.packedBy === filters.packedBy);
    }

    if (filters.dateFrom) {
      sessions = sessions.filter((s) => s.createdAt >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      sessions = sessions.filter((s) => s.createdAt <= filters.dateTo!);
    }

    return sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Analytics
  async getPickingPerformance(
    tenantId: string,
    warehouseId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalTasks: number;
    completedTasks: number;
    shortPickedTasks: number;
    completionRate: number;
    averagePickTime: number;
    topPickers: { pickerId: string; pickerName: string; taskCount: number; accuracy: number }[];
  }> {
    const tasks = Array.from(this.tasks.values()).filter(
      (t) =>
        t.tenantId === tenantId &&
        t.warehouseId === warehouseId &&
        t.createdAt >= dateFrom &&
        t.createdAt <= dateTo,
    );

    const completedTasks = tasks.filter(
      (t) =>
        t.status === PickTaskStatus.COMPLETED ||
        t.status === PickTaskStatus.SHORT_PICKED,
    );

    const shortPickedTasks = tasks.filter(
      (t) => t.status === PickTaskStatus.SHORT_PICKED,
    );

    const totalPickTime = completedTasks.reduce((sum, t) => {
      if (t.startedAt && t.completedAt) {
        return sum + (t.completedAt.getTime() - t.startedAt.getTime());
      }
      return sum;
    }, 0);

    const pickerStats = new Map<
      string,
      { name: string; tasks: number; accurate: number }
    >();

    for (const task of completedTasks) {
      if (task.assignedTo) {
        const stats = pickerStats.get(task.assignedTo) || {
          name: task.assignedToName || '',
          tasks: 0,
          accurate: 0,
        };
        stats.tasks++;
        if (task.status === PickTaskStatus.COMPLETED) {
          stats.accurate++;
        }
        pickerStats.set(task.assignedTo, stats);
      }
    }

    const topPickers = Array.from(pickerStats.entries())
      .map(([pickerId, stats]) => ({
        pickerId,
        pickerName: stats.name,
        taskCount: stats.tasks,
        accuracy: stats.tasks > 0 ? (stats.accurate / stats.tasks) * 100 : 0,
      }))
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 10);

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      shortPickedTasks: shortPickedTasks.length,
      completionRate:
        tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
      averagePickTime:
        completedTasks.length > 0 ? totalPickTime / completedTasks.length : 0,
      topPickers,
    };
  }

  async getPackingPerformance(
    tenantId: string,
    warehouseId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalContainers: number;
    totalItemsPacked: number;
    averagePackTime: number;
    topPackers: { packerId: string; packerName: string; sessionCount: number }[];
  }> {
    const sessions = Array.from(this.sessions.values()).filter(
      (s) =>
        s.tenantId === tenantId &&
        s.warehouseId === warehouseId &&
        s.createdAt >= dateFrom &&
        s.createdAt <= dateTo,
    );

    const completedSessions = sessions.filter(
      (s) =>
        s.status === PackingStatus.PACKED ||
        s.status === PackingStatus.VERIFIED ||
        s.status === PackingStatus.SHIPPED,
    );

    const totalContainers = sessions.reduce(
      (sum, s) => sum + s.containers.length,
      0,
    );

    const totalItemsPacked = sessions.reduce((sum, s) => sum + s.packedItems, 0);

    const totalPackTime = completedSessions.reduce((sum, s) => {
      if (s.startedAt && s.completedAt) {
        return sum + (s.completedAt.getTime() - s.startedAt.getTime());
      }
      return sum;
    }, 0);

    const packerStats = new Map<string, { name: string; count: number }>();

    for (const session of completedSessions) {
      const stats = packerStats.get(session.packedBy) || {
        name: session.packedByName,
        count: 0,
      };
      stats.count++;
      packerStats.set(session.packedBy, stats);
    }

    const topPackers = Array.from(packerStats.entries())
      .map(([packerId, stats]) => ({
        packerId,
        packerName: stats.name,
        sessionCount: stats.count,
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 10);

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalContainers,
      totalItemsPacked,
      averagePackTime:
        completedSessions.length > 0 ? totalPackTime / completedSessions.length : 0,
      topPackers,
    };
  }

  // Helper Methods
  private async generateWaveNumber(tenantId: string): Promise<string> {
    const counter = (this.waveCounter.get(tenantId) || 0) + 1;
    this.waveCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `WAVE-${year}-${counter.toString().padStart(6, '0')}`;
  }

  private async generateTaskNumber(tenantId: string): Promise<string> {
    const counter = (this.taskCounter.get(tenantId) || 0) + 1;
    this.taskCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `PICK-${year}-${counter.toString().padStart(8, '0')}`;
  }

  private async generateSessionNumber(tenantId: string): Promise<string> {
    const counter = (this.sessionCounter.get(tenantId) || 0) + 1;
    this.sessionCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `PACK-${year}-${counter.toString().padStart(6, '0')}`;
  }
}
