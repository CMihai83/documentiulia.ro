import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Movement Types
export enum MovementType {
  RECEIPT = 'receipt',
  ISSUE = 'issue',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
  SCRAP = 'scrap',
  CYCLE_COUNT = 'cycle_count',
  PUTAWAY = 'putaway',
  PICK = 'pick',
  REPLENISHMENT = 'replenishment',
}

export enum MovementStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum TransferStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  IN_TRANSIT = 'in_transit',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export enum MovementReason {
  PURCHASE = 'purchase',
  SALES = 'sales',
  PRODUCTION = 'production',
  QUALITY_ISSUE = 'quality_issue',
  DAMAGED = 'damaged',
  EXPIRED = 'expired',
  RECOUNT = 'recount',
  CORRECTION = 'correction',
  RELOCATION = 'relocation',
  REPLENISHMENT = 'replenishment',
  CUSTOMER_RETURN = 'customer_return',
  SUPPLIER_RETURN = 'supplier_return',
  OTHER = 'other',
}

// Interfaces
export interface StockMovement {
  id: string;
  tenantId: string;
  movementNumber: string;
  type: MovementType;
  status: MovementStatus;
  reason: MovementReason;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  warehouseId: string;
  warehouseName: string;
  fromLocationId?: string;
  fromLocationCode?: string;
  toLocationId?: string;
  toLocationCode?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: Date;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  performedBy: string;
  performedByName: string;
  performedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockTransfer {
  id: string;
  tenantId: string;
  transferNumber: string;
  status: TransferStatus;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  lines: TransferLine[];
  totalItems: number;
  totalQuantity: number;
  estimatedValue: number;
  requestedDate?: Date;
  expectedDeliveryDate?: Date;
  actualShipDate?: Date;
  actualDeliveryDate?: Date;
  carrierName?: string;
  trackingNumber?: string;
  notes?: string;
  requiresApproval: boolean;
  requestedBy: string;
  requestedByName: string;
  approvedBy?: string;
  approvedAt?: Date;
  shippedBy?: string;
  shippedAt?: Date;
  receivedBy?: string;
  receivedAt?: Date;
  attachmentIds?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferLine {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  fromLocationId?: string;
  fromLocationCode?: string;
  toLocationId?: string;
  toLocationCode?: string;
  requestedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  unitCost?: number;
  lineValue?: number;
  notes?: string;
  status: 'pending' | 'shipped' | 'partially_received' | 'received' | 'cancelled';
}

// DTOs
export interface CreateMovementDto {
  type: MovementType;
  reason: MovementReason;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  warehouseId: string;
  warehouseName: string;
  fromLocationId?: string;
  fromLocationCode?: string;
  toLocationId?: string;
  toLocationCode?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: Date;
  unitCost?: number;
  notes?: string;
  performedBy: string;
  performedByName: string;
}

export interface CreateTransferDto {
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  lines: CreateTransferLineDto[];
  expectedDeliveryDate?: Date;
  notes?: string;
  requiresApproval?: boolean;
  requestedBy: string;
  requestedByName: string;
}

export interface CreateTransferLineDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  fromLocationId?: string;
  fromLocationCode?: string;
  requestedQuantity: number;
  unitOfMeasure: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  unitCost?: number;
  notes?: string;
}

export interface ShipTransferDto {
  lines: {
    lineId: string;
    shippedQuantity: number;
    toLocationId?: string;
    toLocationCode?: string;
  }[];
  carrierName?: string;
  trackingNumber?: string;
  shippedBy: string;
}

export interface ReceiveTransferDto {
  lines: {
    lineId: string;
    receivedQuantity: number;
    damagedQuantity?: number;
    toLocationId?: string;
    toLocationCode?: string;
    notes?: string;
  }[];
  receivedBy: string;
}

export interface MovementSearchParams {
  type?: MovementType;
  status?: MovementStatus;
  warehouseId?: string;
  itemId?: string;
  locationId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  referenceType?: string;
  referenceId?: string;
  page?: number;
  limit?: number;
}

export interface TransferSearchParams {
  status?: TransferStatus;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class StockMovementsService {
  private movements = new Map<string, StockMovement>();
  private transfers = new Map<string, StockTransfer>();
  private movementCounter = new Map<string, number>();
  private transferCounter = new Map<string, number>();

  constructor(private eventEmitter: EventEmitter2) {}

  // Stock Movement Operations
  async createMovement(
    tenantId: string,
    dto: CreateMovementDto,
  ): Promise<StockMovement> {
    const id = `mov_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const movementNumber = await this.generateMovementNumber(tenantId);

    const movement: StockMovement = {
      id,
      tenantId,
      movementNumber,
      type: dto.type,
      status: MovementStatus.PENDING,
      reason: dto.reason,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      referenceNumber: dto.referenceNumber,
      warehouseId: dto.warehouseId,
      warehouseName: dto.warehouseName,
      fromLocationId: dto.fromLocationId,
      fromLocationCode: dto.fromLocationCode,
      toLocationId: dto.toLocationId,
      toLocationCode: dto.toLocationCode,
      itemId: dto.itemId,
      itemCode: dto.itemCode,
      itemName: dto.itemName,
      quantity: dto.quantity,
      unitOfMeasure: dto.unitOfMeasure,
      lotNumber: dto.lotNumber,
      batchNumber: dto.batchNumber,
      serialNumber: dto.serialNumber,
      expiryDate: dto.expiryDate,
      unitCost: dto.unitCost,
      totalCost: dto.unitCost ? dto.unitCost * dto.quantity : undefined,
      notes: dto.notes,
      performedBy: dto.performedBy,
      performedByName: dto.performedByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.movements.set(id, movement);

    this.eventEmitter.emit('stock_movement.created', {
      tenantId,
      movementId: id,
      type: dto.type,
      itemId: dto.itemId,
      quantity: dto.quantity,
    });

    return movement;
  }

  async executeMovement(
    tenantId: string,
    movementId: string,
  ): Promise<StockMovement> {
    const movement = await this.getMovement(tenantId, movementId);

    if (movement.status !== MovementStatus.PENDING) {
      throw new BadRequestException('Movement is not in pending status');
    }

    // Validate based on movement type
    this.validateMovement(movement);

    movement.status = MovementStatus.IN_PROGRESS;
    movement.updatedAt = new Date();

    // In a real implementation, this would update actual inventory
    // For now, we just mark it as completed
    movement.status = MovementStatus.COMPLETED;
    movement.performedAt = new Date();

    this.movements.set(movementId, movement);

    this.eventEmitter.emit('stock_movement.executed', {
      tenantId,
      movementId,
      type: movement.type,
      itemId: movement.itemId,
      quantity: movement.quantity,
      fromLocation: movement.fromLocationId,
      toLocation: movement.toLocationId,
    });

    return movement;
  }

  async cancelMovement(
    tenantId: string,
    movementId: string,
    reason: string,
  ): Promise<StockMovement> {
    const movement = await this.getMovement(tenantId, movementId);

    if (movement.status === MovementStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed movement');
    }

    movement.status = MovementStatus.CANCELLED;
    movement.metadata = { ...movement.metadata, cancellationReason: reason };
    movement.updatedAt = new Date();

    this.movements.set(movementId, movement);

    this.eventEmitter.emit('stock_movement.cancelled', {
      tenantId,
      movementId,
      reason,
    });

    return movement;
  }

  async getMovement(tenantId: string, movementId: string): Promise<StockMovement> {
    const movement = this.movements.get(movementId);

    if (!movement || movement.tenantId !== tenantId) {
      throw new NotFoundException(`Movement ${movementId} not found`);
    }

    return movement;
  }

  async searchMovements(
    tenantId: string,
    params: MovementSearchParams,
  ): Promise<{ data: StockMovement[]; total: number; page: number; limit: number }> {
    let movements = Array.from(this.movements.values()).filter(
      (m) => m.tenantId === tenantId,
    );

    if (params.type) {
      movements = movements.filter((m) => m.type === params.type);
    }

    if (params.status) {
      movements = movements.filter((m) => m.status === params.status);
    }

    if (params.warehouseId) {
      movements = movements.filter((m) => m.warehouseId === params.warehouseId);
    }

    if (params.itemId) {
      movements = movements.filter((m) => m.itemId === params.itemId);
    }

    if (params.locationId) {
      movements = movements.filter(
        (m) =>
          m.fromLocationId === params.locationId ||
          m.toLocationId === params.locationId,
      );
    }

    if (params.dateFrom) {
      movements = movements.filter((m) => m.createdAt >= params.dateFrom!);
    }

    if (params.dateTo) {
      movements = movements.filter((m) => m.createdAt <= params.dateTo!);
    }

    if (params.referenceType) {
      movements = movements.filter((m) => m.referenceType === params.referenceType);
    }

    if (params.referenceId) {
      movements = movements.filter((m) => m.referenceId === params.referenceId);
    }

    movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = movements.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;

    return {
      data: movements.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
    };
  }

  async getMovementHistory(
    tenantId: string,
    itemId: string,
    warehouseId?: string,
    limit: number = 50,
  ): Promise<StockMovement[]> {
    let movements = Array.from(this.movements.values())
      .filter((m) => m.tenantId === tenantId && m.itemId === itemId)
      .filter((m) => m.status === MovementStatus.COMPLETED);

    if (warehouseId) {
      movements = movements.filter((m) => m.warehouseId === warehouseId);
    }

    return movements
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Stock Transfer Operations
  async createTransfer(
    tenantId: string,
    dto: CreateTransferDto,
  ): Promise<StockTransfer> {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Cannot transfer to the same warehouse');
    }

    const id = `xfer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const transferNumber = await this.generateTransferNumber(tenantId);

    const lines: TransferLine[] = dto.lines.map((line, index) => ({
      id: `xfer_line_${index}_${Date.now()}`,
      itemId: line.itemId,
      itemCode: line.itemCode,
      itemName: line.itemName,
      fromLocationId: line.fromLocationId,
      fromLocationCode: line.fromLocationCode,
      requestedQuantity: line.requestedQuantity,
      shippedQuantity: 0,
      receivedQuantity: 0,
      damagedQuantity: 0,
      unitOfMeasure: line.unitOfMeasure,
      lotNumber: line.lotNumber,
      batchNumber: line.batchNumber,
      serialNumbers: line.serialNumbers,
      unitCost: line.unitCost,
      lineValue: line.unitCost ? line.unitCost * line.requestedQuantity : undefined,
      notes: line.notes,
      status: 'pending',
    }));

    const totalQuantity = lines.reduce((sum, l) => sum + l.requestedQuantity, 0);
    const estimatedValue = lines.reduce((sum, l) => sum + (l.lineValue || 0), 0);

    const transfer: StockTransfer = {
      id,
      tenantId,
      transferNumber,
      status: TransferStatus.DRAFT,
      fromWarehouseId: dto.fromWarehouseId,
      fromWarehouseName: dto.fromWarehouseName,
      toWarehouseId: dto.toWarehouseId,
      toWarehouseName: dto.toWarehouseName,
      lines,
      totalItems: lines.length,
      totalQuantity,
      estimatedValue,
      expectedDeliveryDate: dto.expectedDeliveryDate
        ? new Date(dto.expectedDeliveryDate)
        : undefined,
      notes: dto.notes,
      requiresApproval: dto.requiresApproval ?? false,
      requestedBy: dto.requestedBy,
      requestedByName: dto.requestedByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.transfers.set(id, transfer);

    this.eventEmitter.emit('stock_transfer.created', {
      tenantId,
      transferId: id,
      fromWarehouse: dto.fromWarehouseId,
      toWarehouse: dto.toWarehouseId,
      totalItems: lines.length,
    });

    return transfer;
  }

  async submitTransfer(tenantId: string, transferId: string): Promise<StockTransfer> {
    const transfer = await this.getTransfer(tenantId, transferId);

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new BadRequestException('Transfer is not in draft status');
    }

    if (transfer.lines.length === 0) {
      throw new BadRequestException('Transfer must have at least one line');
    }

    if (transfer.requiresApproval) {
      transfer.status = TransferStatus.PENDING_APPROVAL;
    } else {
      transfer.status = TransferStatus.APPROVED;
      transfer.approvedAt = new Date();
    }

    transfer.requestedDate = new Date();
    transfer.updatedAt = new Date();

    this.transfers.set(transferId, transfer);

    this.eventEmitter.emit('stock_transfer.submitted', {
      tenantId,
      transferId,
      requiresApproval: transfer.requiresApproval,
    });

    return transfer;
  }

  async approveTransfer(
    tenantId: string,
    transferId: string,
    approverId: string,
  ): Promise<StockTransfer> {
    const transfer = await this.getTransfer(tenantId, transferId);

    if (transfer.status !== TransferStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Transfer is not pending approval');
    }

    transfer.status = TransferStatus.APPROVED;
    transfer.approvedBy = approverId;
    transfer.approvedAt = new Date();
    transfer.updatedAt = new Date();

    this.transfers.set(transferId, transfer);

    this.eventEmitter.emit('stock_transfer.approved', {
      tenantId,
      transferId,
      approverId,
    });

    return transfer;
  }

  async shipTransfer(
    tenantId: string,
    transferId: string,
    dto: ShipTransferDto,
  ): Promise<StockTransfer> {
    const transfer = await this.getTransfer(tenantId, transferId);

    if (transfer.status !== TransferStatus.APPROVED) {
      throw new BadRequestException('Transfer must be approved before shipping');
    }

    for (const shipLine of dto.lines) {
      const line = transfer.lines.find((l) => l.id === shipLine.lineId);
      if (!line) {
        throw new NotFoundException(`Line ${shipLine.lineId} not found`);
      }

      if (shipLine.shippedQuantity > line.requestedQuantity) {
        throw new BadRequestException(
          `Cannot ship more than requested for line ${line.itemCode}`,
        );
      }

      line.shippedQuantity = shipLine.shippedQuantity;
      line.toLocationId = shipLine.toLocationId;
      line.toLocationCode = shipLine.toLocationCode;
      line.status = 'shipped';
    }

    transfer.status = TransferStatus.IN_TRANSIT;
    transfer.carrierName = dto.carrierName;
    transfer.trackingNumber = dto.trackingNumber;
    transfer.shippedBy = dto.shippedBy;
    transfer.shippedAt = new Date();
    transfer.actualShipDate = new Date();
    transfer.updatedAt = new Date();

    this.transfers.set(transferId, transfer);

    // Create outbound movement for source warehouse
    for (const line of transfer.lines) {
      if (line.shippedQuantity > 0) {
        await this.createMovement(tenantId, {
          type: MovementType.TRANSFER,
          reason: MovementReason.RELOCATION,
          referenceType: 'transfer',
          referenceId: transferId,
          referenceNumber: transfer.transferNumber,
          warehouseId: transfer.fromWarehouseId,
          warehouseName: transfer.fromWarehouseName,
          fromLocationId: line.fromLocationId,
          fromLocationCode: line.fromLocationCode,
          itemId: line.itemId,
          itemCode: line.itemCode,
          itemName: line.itemName,
          quantity: -line.shippedQuantity, // Negative for outbound
          unitOfMeasure: line.unitOfMeasure,
          lotNumber: line.lotNumber,
          batchNumber: line.batchNumber,
          unitCost: line.unitCost,
          performedBy: dto.shippedBy,
          performedByName: 'System',
        });
      }
    }

    this.eventEmitter.emit('stock_transfer.shipped', {
      tenantId,
      transferId,
      shippedBy: dto.shippedBy,
      trackingNumber: dto.trackingNumber,
    });

    return transfer;
  }

  async receiveTransfer(
    tenantId: string,
    transferId: string,
    dto: ReceiveTransferDto,
  ): Promise<StockTransfer> {
    const transfer = await this.getTransfer(tenantId, transferId);

    if (
      transfer.status !== TransferStatus.IN_TRANSIT &&
      transfer.status !== TransferStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException('Transfer is not in transit');
    }

    for (const receiveLine of dto.lines) {
      const line = transfer.lines.find((l) => l.id === receiveLine.lineId);
      if (!line) {
        throw new NotFoundException(`Line ${receiveLine.lineId} not found`);
      }

      const totalReceiving =
        receiveLine.receivedQuantity + (receiveLine.damagedQuantity || 0);
      if (totalReceiving > line.shippedQuantity - line.receivedQuantity) {
        throw new BadRequestException(
          `Cannot receive more than shipped for line ${line.itemCode}`,
        );
      }

      line.receivedQuantity += receiveLine.receivedQuantity;
      line.damagedQuantity += receiveLine.damagedQuantity || 0;
      line.toLocationId = receiveLine.toLocationId || line.toLocationId;
      line.toLocationCode = receiveLine.toLocationCode || line.toLocationCode;
      if (receiveLine.notes) {
        line.notes = `${line.notes || ''} ${receiveLine.notes}`.trim();
      }

      if (line.receivedQuantity + line.damagedQuantity >= line.shippedQuantity) {
        line.status = 'received';
      } else {
        line.status = 'partially_received';
      }
    }

    // Determine transfer status
    const allReceived = transfer.lines.every(
      (l) => l.status === 'received' || l.status === 'cancelled',
    );
    const someReceived = transfer.lines.some(
      (l) => l.status === 'received' || l.status === 'partially_received',
    );

    if (allReceived) {
      transfer.status = TransferStatus.RECEIVED;
      transfer.actualDeliveryDate = new Date();
    } else if (someReceived) {
      transfer.status = TransferStatus.PARTIALLY_RECEIVED;
    }

    transfer.receivedBy = dto.receivedBy;
    transfer.receivedAt = new Date();
    transfer.updatedAt = new Date();

    this.transfers.set(transferId, transfer);

    // Create inbound movement for destination warehouse
    for (const receiveLine of dto.lines) {
      const line = transfer.lines.find((l) => l.id === receiveLine.lineId);
      if (line && receiveLine.receivedQuantity > 0) {
        await this.createMovement(tenantId, {
          type: MovementType.TRANSFER,
          reason: MovementReason.RELOCATION,
          referenceType: 'transfer',
          referenceId: transferId,
          referenceNumber: transfer.transferNumber,
          warehouseId: transfer.toWarehouseId,
          warehouseName: transfer.toWarehouseName,
          toLocationId: receiveLine.toLocationId || line.toLocationId,
          toLocationCode: receiveLine.toLocationCode || line.toLocationCode,
          itemId: line.itemId,
          itemCode: line.itemCode,
          itemName: line.itemName,
          quantity: receiveLine.receivedQuantity, // Positive for inbound
          unitOfMeasure: line.unitOfMeasure,
          lotNumber: line.lotNumber,
          batchNumber: line.batchNumber,
          unitCost: line.unitCost,
          performedBy: dto.receivedBy,
          performedByName: 'System',
        });
      }
    }

    this.eventEmitter.emit('stock_transfer.received', {
      tenantId,
      transferId,
      receivedBy: dto.receivedBy,
      status: transfer.status,
    });

    return transfer;
  }

  async cancelTransfer(
    tenantId: string,
    transferId: string,
    reason: string,
  ): Promise<StockTransfer> {
    const transfer = await this.getTransfer(tenantId, transferId);

    if (
      transfer.status === TransferStatus.RECEIVED ||
      transfer.status === TransferStatus.CANCELLED
    ) {
      throw new BadRequestException('Cannot cancel this transfer');
    }

    if (transfer.status === TransferStatus.IN_TRANSIT) {
      throw new BadRequestException(
        'Cannot cancel transfer in transit. Receive first.',
      );
    }

    transfer.status = TransferStatus.CANCELLED;
    transfer.metadata = { ...transfer.metadata, cancellationReason: reason };
    transfer.updatedAt = new Date();

    for (const line of transfer.lines) {
      line.status = 'cancelled';
    }

    this.transfers.set(transferId, transfer);

    this.eventEmitter.emit('stock_transfer.cancelled', {
      tenantId,
      transferId,
      reason,
    });

    return transfer;
  }

  async getTransfer(tenantId: string, transferId: string): Promise<StockTransfer> {
    const transfer = this.transfers.get(transferId);

    if (!transfer || transfer.tenantId !== tenantId) {
      throw new NotFoundException(`Transfer ${transferId} not found`);
    }

    return transfer;
  }

  async searchTransfers(
    tenantId: string,
    params: TransferSearchParams,
  ): Promise<{ data: StockTransfer[]; total: number; page: number; limit: number }> {
    let transfers = Array.from(this.transfers.values()).filter(
      (t) => t.tenantId === tenantId,
    );

    if (params.status) {
      transfers = transfers.filter((t) => t.status === params.status);
    }

    if (params.fromWarehouseId) {
      transfers = transfers.filter(
        (t) => t.fromWarehouseId === params.fromWarehouseId,
      );
    }

    if (params.toWarehouseId) {
      transfers = transfers.filter((t) => t.toWarehouseId === params.toWarehouseId);
    }

    if (params.dateFrom) {
      transfers = transfers.filter((t) => t.createdAt >= params.dateFrom!);
    }

    if (params.dateTo) {
      transfers = transfers.filter((t) => t.createdAt <= params.dateTo!);
    }

    if (params.search) {
      const searchLower = params.search.toLowerCase();
      transfers = transfers.filter(
        (t) =>
          t.transferNumber.toLowerCase().includes(searchLower) ||
          t.fromWarehouseName.toLowerCase().includes(searchLower) ||
          t.toWarehouseName.toLowerCase().includes(searchLower),
      );
    }

    transfers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = transfers.length;
    const page = params.page || 1;
    const limit = params.limit || 20;
    const startIndex = (page - 1) * limit;

    return {
      data: transfers.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
    };
  }

  // Helper Methods
  private async generateMovementNumber(tenantId: string): Promise<string> {
    const counter = (this.movementCounter.get(tenantId) || 0) + 1;
    this.movementCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `MOV-${year}-${counter.toString().padStart(8, '0')}`;
  }

  private async generateTransferNumber(tenantId: string): Promise<string> {
    const counter = (this.transferCounter.get(tenantId) || 0) + 1;
    this.transferCounter.set(tenantId, counter);
    const year = new Date().getFullYear();
    return `XFER-${year}-${counter.toString().padStart(6, '0')}`;
  }

  private validateMovement(movement: StockMovement): void {
    switch (movement.type) {
      case MovementType.RECEIPT:
      case MovementType.PUTAWAY:
        if (!movement.toLocationId) {
          throw new BadRequestException('To location is required for receipt');
        }
        break;

      case MovementType.ISSUE:
      case MovementType.PICK:
        if (!movement.fromLocationId) {
          throw new BadRequestException('From location is required for issue');
        }
        break;

      case MovementType.TRANSFER:
        if (!movement.fromLocationId || !movement.toLocationId) {
          throw new BadRequestException(
            'Both from and to locations are required for transfer',
          );
        }
        break;
    }
  }

  // Analytics
  async getMovementAnalytics(
    tenantId: string,
    warehouseId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<{
    totalMovements: number;
    byType: Record<MovementType, number>;
    byStatus: Record<MovementStatus, number>;
    totalInbound: number;
    totalOutbound: number;
    topItems: { itemId: string; itemCode: string; movements: number }[];
  }> {
    const movements = Array.from(this.movements.values()).filter(
      (m) =>
        m.tenantId === tenantId &&
        m.warehouseId === warehouseId &&
        m.createdAt >= dateFrom &&
        m.createdAt <= dateTo,
    );

    const byType: Record<MovementType, number> = {
      [MovementType.RECEIPT]: 0,
      [MovementType.ISSUE]: 0,
      [MovementType.TRANSFER]: 0,
      [MovementType.ADJUSTMENT]: 0,
      [MovementType.RETURN]: 0,
      [MovementType.SCRAP]: 0,
      [MovementType.CYCLE_COUNT]: 0,
      [MovementType.PUTAWAY]: 0,
      [MovementType.PICK]: 0,
      [MovementType.REPLENISHMENT]: 0,
    };

    const byStatus: Record<MovementStatus, number> = {
      [MovementStatus.PENDING]: 0,
      [MovementStatus.IN_PROGRESS]: 0,
      [MovementStatus.COMPLETED]: 0,
      [MovementStatus.CANCELLED]: 0,
      [MovementStatus.FAILED]: 0,
    };

    let totalInbound = 0;
    let totalOutbound = 0;
    const itemCounts = new Map<string, { itemId: string; itemCode: string; count: number }>();

    for (const mov of movements) {
      byType[mov.type]++;
      byStatus[mov.status]++;

      if (mov.quantity > 0) {
        totalInbound += mov.quantity;
      } else {
        totalOutbound += Math.abs(mov.quantity);
      }

      const itemData = itemCounts.get(mov.itemId) || {
        itemId: mov.itemId,
        itemCode: mov.itemCode,
        count: 0,
      };
      itemData.count++;
      itemCounts.set(mov.itemId, itemData);
    }

    const topItems = Array.from(itemCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((i) => ({ itemId: i.itemId, itemCode: i.itemCode, movements: i.count }));

    return {
      totalMovements: movements.length,
      byType,
      byStatus,
      totalInbound,
      totalOutbound,
      topItems,
    };
  }
}
