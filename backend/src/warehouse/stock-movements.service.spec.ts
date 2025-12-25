import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  StockMovementsService,
  MovementType,
  MovementStatus,
  MovementReason,
  TransferStatus,
  CreateMovementDto,
  CreateTransferDto,
} from './stock-movements.service';

describe('StockMovementsService', () => {
  let service: StockMovementsService;
  let eventEmitter: EventEmitter2;
  let tenantId: string;

  beforeEach(async () => {
    tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StockMovementsService>(StockMovementsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Stock Movement Operations', () => {
    const createMovementDto: CreateMovementDto = {
      type: MovementType.RECEIPT,
      reason: MovementReason.PURCHASE,
      warehouseId: 'warehouse_1',
      warehouseName: 'Main Warehouse',
      toLocationId: 'loc_1',
      toLocationCode: 'A-01-01',
      itemId: 'item_1',
      itemCode: 'SKU001',
      itemName: 'Test Product',
      quantity: 100,
      unitOfMeasure: 'EA',
      unitCost: 50,
      performedBy: 'user_1',
      performedByName: 'John Doe',
    };

    it('should create a stock movement', async () => {
      const movement = await service.createMovement(tenantId, createMovementDto);

      expect(movement).toBeDefined();
      expect(movement.id).toBeDefined();
      expect(movement.movementNumber).toMatch(/^MOV-\d{4}-\d{8}$/);
      expect(movement.type).toBe(MovementType.RECEIPT);
      expect(movement.status).toBe(MovementStatus.PENDING);
      expect(movement.quantity).toBe(100);
      expect(movement.totalCost).toBe(5000);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'stock_movement.created',
        expect.any(Object),
      );
    });

    it('should execute a pending movement', async () => {
      const movement = await service.createMovement(tenantId, createMovementDto);
      const executed = await service.executeMovement(tenantId, movement.id);

      expect(executed.status).toBe(MovementStatus.COMPLETED);
      expect(executed.performedAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'stock_movement.executed',
        expect.any(Object),
      );
    });

    it('should not execute non-pending movement', async () => {
      const movement = await service.createMovement(tenantId, createMovementDto);
      await service.executeMovement(tenantId, movement.id);

      await expect(
        service.executeMovement(tenantId, movement.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate receipt requires to location', async () => {
      const dto = { ...createMovementDto, toLocationId: undefined };
      const movement = await service.createMovement(tenantId, dto);

      await expect(
        service.executeMovement(tenantId, movement.id),
      ).rejects.toThrow('To location is required for receipt');
    });

    it('should validate issue requires from location', async () => {
      const dto: CreateMovementDto = {
        ...createMovementDto,
        type: MovementType.ISSUE,
        reason: MovementReason.SALES,
        toLocationId: undefined,
      };
      const movement = await service.createMovement(tenantId, dto);

      await expect(
        service.executeMovement(tenantId, movement.id),
      ).rejects.toThrow('From location is required for issue');
    });

    it('should validate transfer requires both locations', async () => {
      const dto: CreateMovementDto = {
        ...createMovementDto,
        type: MovementType.TRANSFER,
        reason: MovementReason.RELOCATION,
        fromLocationId: 'loc_1',
        fromLocationCode: 'A-01-01',
        toLocationId: undefined,
        toLocationCode: undefined,
      };
      const movement = await service.createMovement(tenantId, dto);

      await expect(
        service.executeMovement(tenantId, movement.id),
      ).rejects.toThrow('Both from and to locations are required for transfer');
    });

    it('should cancel a pending movement', async () => {
      const movement = await service.createMovement(tenantId, createMovementDto);
      const cancelled = await service.cancelMovement(
        tenantId,
        movement.id,
        'No longer needed',
      );

      expect(cancelled.status).toBe(MovementStatus.CANCELLED);
      expect(cancelled.metadata?.cancellationReason).toBe('No longer needed');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'stock_movement.cancelled',
        expect.any(Object),
      );
    });

    it('should not cancel completed movement', async () => {
      const movement = await service.createMovement(tenantId, createMovementDto);
      await service.executeMovement(tenantId, movement.id);

      await expect(
        service.cancelMovement(tenantId, movement.id, 'Reason'),
      ).rejects.toThrow('Cannot cancel completed movement');
    });

    it('should get movement by id', async () => {
      const created = await service.createMovement(tenantId, createMovementDto);
      const movement = await service.getMovement(tenantId, created.id);

      expect(movement.id).toBe(created.id);
    });

    it('should throw when movement not found', async () => {
      await expect(
        service.getMovement(tenantId, 'non_existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should search movements with filters', async () => {
      await service.createMovement(tenantId, createMovementDto);
      await service.createMovement(tenantId, {
        ...createMovementDto,
        type: MovementType.ISSUE,
        fromLocationId: 'loc_1',
        toLocationId: undefined,
      });

      const result = await service.searchMovements(tenantId, {
        type: MovementType.RECEIPT,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe(MovementType.RECEIPT);
    });

    it('should get movement history for item', async () => {
      const movement = await service.createMovement(tenantId, createMovementDto);
      await service.executeMovement(tenantId, movement.id);

      const history = await service.getMovementHistory(
        tenantId,
        createMovementDto.itemId,
      );

      expect(history).toHaveLength(1);
      expect(history[0].itemId).toBe(createMovementDto.itemId);
    });
  });

  describe('Stock Transfer Operations', () => {
    const createTransferDto: CreateTransferDto = {
      fromWarehouseId: 'warehouse_1',
      fromWarehouseName: 'Main Warehouse',
      toWarehouseId: 'warehouse_2',
      toWarehouseName: 'Branch Warehouse',
      lines: [
        {
          itemId: 'item_1',
          itemCode: 'SKU001',
          itemName: 'Test Product',
          fromLocationId: 'loc_1',
          fromLocationCode: 'A-01-01',
          requestedQuantity: 50,
          unitOfMeasure: 'EA',
          unitCost: 100,
        },
      ],
      requestedBy: 'user_1',
      requestedByName: 'John Doe',
    };

    it('should create a stock transfer', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);

      expect(transfer).toBeDefined();
      expect(transfer.id).toBeDefined();
      expect(transfer.transferNumber).toMatch(/^XFER-\d{4}-\d{6}$/);
      expect(transfer.status).toBe(TransferStatus.DRAFT);
      expect(transfer.lines).toHaveLength(1);
      expect(transfer.totalQuantity).toBe(50);
      expect(transfer.estimatedValue).toBe(5000);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'stock_transfer.created',
        expect.any(Object),
      );
    });

    it('should not create transfer to same warehouse', async () => {
      const dto = { ...createTransferDto, toWarehouseId: 'warehouse_1' };

      await expect(service.createTransfer(tenantId, dto)).rejects.toThrow(
        'Cannot transfer to the same warehouse',
      );
    });

    it('should submit transfer without approval', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);
      const submitted = await service.submitTransfer(tenantId, transfer.id);

      expect(submitted.status).toBe(TransferStatus.APPROVED);
      expect(submitted.requestedDate).toBeDefined();
    });

    it('should submit transfer with approval required', async () => {
      const dto = { ...createTransferDto, requiresApproval: true };
      const transfer = await service.createTransfer(tenantId, dto);
      const submitted = await service.submitTransfer(tenantId, transfer.id);

      expect(submitted.status).toBe(TransferStatus.PENDING_APPROVAL);
    });

    it('should not submit transfer without lines', async () => {
      const dto = { ...createTransferDto, lines: [] };
      const transfer = await service.createTransfer(tenantId, dto);

      await expect(
        service.submitTransfer(tenantId, transfer.id),
      ).rejects.toThrow('Transfer must have at least one line');
    });

    it('should approve transfer', async () => {
      const dto = { ...createTransferDto, requiresApproval: true };
      const transfer = await service.createTransfer(tenantId, dto);
      await service.submitTransfer(tenantId, transfer.id);

      const approved = await service.approveTransfer(
        tenantId,
        transfer.id,
        'approver_1',
      );

      expect(approved.status).toBe(TransferStatus.APPROVED);
      expect(approved.approvedBy).toBe('approver_1');
      expect(approved.approvedAt).toBeDefined();
    });

    it('should not approve transfer not pending approval', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);

      await expect(
        service.approveTransfer(tenantId, transfer.id, 'approver_1'),
      ).rejects.toThrow('Transfer is not pending approval');
    });

    it('should ship transfer', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);
      await service.submitTransfer(tenantId, transfer.id);

      const shipped = await service.shipTransfer(tenantId, transfer.id, {
        lines: [
          {
            lineId: transfer.lines[0].id,
            shippedQuantity: 50,
            toLocationId: 'loc_dest_1',
            toLocationCode: 'B-01-01',
          },
        ],
        carrierName: 'Internal Logistics',
        trackingNumber: 'TRACK123',
        shippedBy: 'shipper_1',
      });

      expect(shipped.status).toBe(TransferStatus.IN_TRANSIT);
      expect(shipped.lines[0].shippedQuantity).toBe(50);
      expect(shipped.carrierName).toBe('Internal Logistics');
    });

    it('should not ship more than requested', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);
      await service.submitTransfer(tenantId, transfer.id);

      await expect(
        service.shipTransfer(tenantId, transfer.id, {
          lines: [
            {
              lineId: transfer.lines[0].id,
              shippedQuantity: 100,
            },
          ],
          shippedBy: 'shipper_1',
        }),
      ).rejects.toThrow('Cannot ship more than requested');
    });

    it('should receive transfer fully', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);
      await service.submitTransfer(tenantId, transfer.id);
      await service.shipTransfer(tenantId, transfer.id, {
        lines: [
          {
            lineId: transfer.lines[0].id,
            shippedQuantity: 50,
          },
        ],
        shippedBy: 'shipper_1',
      });

      const received = await service.receiveTransfer(tenantId, transfer.id, {
        lines: [
          {
            lineId: transfer.lines[0].id,
            receivedQuantity: 50,
            toLocationId: 'loc_dest_1',
            toLocationCode: 'B-01-01',
          },
        ],
        receivedBy: 'receiver_1',
      });

      expect(received.status).toBe(TransferStatus.RECEIVED);
      expect(received.lines[0].receivedQuantity).toBe(50);
      expect(received.lines[0].status).toBe('received');
    });

    it('should receive transfer partially', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);
      await service.submitTransfer(tenantId, transfer.id);
      await service.shipTransfer(tenantId, transfer.id, {
        lines: [
          {
            lineId: transfer.lines[0].id,
            shippedQuantity: 50,
          },
        ],
        shippedBy: 'shipper_1',
      });

      const received = await service.receiveTransfer(tenantId, transfer.id, {
        lines: [
          {
            lineId: transfer.lines[0].id,
            receivedQuantity: 30,
          },
        ],
        receivedBy: 'receiver_1',
      });

      expect(received.status).toBe(TransferStatus.PARTIALLY_RECEIVED);
      expect(received.lines[0].receivedQuantity).toBe(30);
      expect(received.lines[0].status).toBe('partially_received');
    });

    it('should handle damaged quantities', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);
      await service.submitTransfer(tenantId, transfer.id);
      await service.shipTransfer(tenantId, transfer.id, {
        lines: [
          {
            lineId: transfer.lines[0].id,
            shippedQuantity: 50,
          },
        ],
        shippedBy: 'shipper_1',
      });

      const received = await service.receiveTransfer(tenantId, transfer.id, {
        lines: [
          {
            lineId: transfer.lines[0].id,
            receivedQuantity: 45,
            damagedQuantity: 5,
          },
        ],
        receivedBy: 'receiver_1',
      });

      expect(received.status).toBe(TransferStatus.RECEIVED);
      expect(received.lines[0].receivedQuantity).toBe(45);
      expect(received.lines[0].damagedQuantity).toBe(5);
    });

    it('should not receive more than shipped', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);
      await service.submitTransfer(tenantId, transfer.id);
      await service.shipTransfer(tenantId, transfer.id, {
        lines: [
          {
            lineId: transfer.lines[0].id,
            shippedQuantity: 50,
          },
        ],
        shippedBy: 'shipper_1',
      });

      await expect(
        service.receiveTransfer(tenantId, transfer.id, {
          lines: [
            {
              lineId: transfer.lines[0].id,
              receivedQuantity: 60,
            },
          ],
          receivedBy: 'receiver_1',
        }),
      ).rejects.toThrow('Cannot receive more than shipped');
    });

    it('should cancel draft transfer', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);
      const cancelled = await service.cancelTransfer(
        tenantId,
        transfer.id,
        'No longer needed',
      );

      expect(cancelled.status).toBe(TransferStatus.CANCELLED);
      expect(cancelled.lines[0].status).toBe('cancelled');
    });

    it('should not cancel transfer in transit', async () => {
      const transfer = await service.createTransfer(tenantId, createTransferDto);
      await service.submitTransfer(tenantId, transfer.id);
      await service.shipTransfer(tenantId, transfer.id, {
        lines: [
          {
            lineId: transfer.lines[0].id,
            shippedQuantity: 50,
          },
        ],
        shippedBy: 'shipper_1',
      });

      await expect(
        service.cancelTransfer(tenantId, transfer.id, 'Reason'),
      ).rejects.toThrow('Cannot cancel transfer in transit');
    });

    it('should get transfer by id', async () => {
      const created = await service.createTransfer(tenantId, createTransferDto);
      const transfer = await service.getTransfer(tenantId, created.id);

      expect(transfer.id).toBe(created.id);
    });

    it('should throw when transfer not found', async () => {
      await expect(
        service.getTransfer(tenantId, 'non_existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should search transfers with filters', async () => {
      await service.createTransfer(tenantId, createTransferDto);
      await service.createTransfer(tenantId, {
        ...createTransferDto,
        fromWarehouseId: 'warehouse_3',
        fromWarehouseName: 'Third Warehouse',
      });

      const result = await service.searchTransfers(tenantId, {
        fromWarehouseId: 'warehouse_1',
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].fromWarehouseId).toBe('warehouse_1');
    });

    it('should search transfers by text', async () => {
      await service.createTransfer(tenantId, createTransferDto);

      const result = await service.searchTransfers(tenantId, {
        search: 'Main',
      });

      expect(result.data).toHaveLength(1);
    });
  });

  describe('Movement Analytics', () => {
    it('should calculate movement analytics', async () => {
      const warehouseId = 'warehouse_analytics';
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() + 1);

      // Create receipt
      const receipt = await service.createMovement(tenantId, {
        type: MovementType.RECEIPT,
        reason: MovementReason.PURCHASE,
        warehouseId,
        warehouseName: 'Analytics Warehouse',
        toLocationId: 'loc_1',
        toLocationCode: 'A-01',
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product 1',
        quantity: 100,
        unitOfMeasure: 'EA',
        performedBy: 'user_1',
        performedByName: 'User',
      });
      await service.executeMovement(tenantId, receipt.id);

      // Create issue
      const issue = await service.createMovement(tenantId, {
        type: MovementType.ISSUE,
        reason: MovementReason.SALES,
        warehouseId,
        warehouseName: 'Analytics Warehouse',
        fromLocationId: 'loc_1',
        fromLocationCode: 'A-01',
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product 1',
        quantity: -30,
        unitOfMeasure: 'EA',
        performedBy: 'user_1',
        performedByName: 'User',
      });

      const analytics = await service.getMovementAnalytics(
        tenantId,
        warehouseId,
        dateFrom,
        dateTo,
      );

      expect(analytics.totalMovements).toBe(2);
      expect(analytics.byType[MovementType.RECEIPT]).toBe(1);
      expect(analytics.byType[MovementType.ISSUE]).toBe(1);
      expect(analytics.totalInbound).toBe(100);
      expect(analytics.totalOutbound).toBe(30);
      expect(analytics.topItems).toHaveLength(1);
      expect(analytics.topItems[0].itemCode).toBe('SKU001');
    });
  });
});
