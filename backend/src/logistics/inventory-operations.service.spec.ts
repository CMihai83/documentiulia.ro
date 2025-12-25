import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import {
  InventoryOperationsService,
  StockMovementType,
  ReorderStrategy,
  BatchStatus,
} from './inventory-operations.service';

describe('InventoryOperationsService', () => {
  let service: InventoryOperationsService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryOperationsService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<InventoryOperationsService>(InventoryOperationsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Stock Movements', () => {
    it('should record an IN movement', async () => {
      const movement = await service.recordStockMovement({
        productId: 'prod-1',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 100,
        unitCost: 50,
        performedBy: 'user-1',
      });

      expect(movement.id).toBeDefined();
      expect(movement.type).toBe('IN');
      expect(movement.quantity).toBe(100);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'inventory.movement.recorded',
        expect.objectContaining({ type: 'IN', quantity: 100 }),
      );
    });

    it('should update stock levels on IN movement', async () => {
      await service.recordStockMovement({
        productId: 'prod-2',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 50,
        unitCost: 25,
        performedBy: 'user-1',
      });

      const stock = service.getStockLevel('prod-2', 'wh-1');
      expect(stock?.onHand).toBe(50);
      expect(stock?.available).toBe(50);
    });

    it('should reject movements with zero or negative quantity', async () => {
      await expect(
        service.recordStockMovement({
          productId: 'prod-3',
          warehouseId: 'wh-1',
          type: 'IN',
          quantity: 0,
          performedBy: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject OUT movement with insufficient stock', async () => {
      await expect(
        service.recordStockMovement({
          productId: 'prod-4',
          warehouseId: 'wh-1',
          type: 'OUT',
          quantity: 100,
          performedBy: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle OUT movement correctly', async () => {
      // First add stock
      await service.recordStockMovement({
        productId: 'prod-5',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 100,
        unitCost: 10,
        performedBy: 'user-1',
      });

      // Then remove stock
      await service.recordStockMovement({
        productId: 'prod-5',
        warehouseId: 'wh-1',
        type: 'OUT',
        quantity: 30,
        performedBy: 'user-1',
      });

      const stock = service.getStockLevel('prod-5', 'wh-1');
      expect(stock?.onHand).toBe(70);
      expect(stock?.available).toBe(70);
    });

    it('should handle TRANSFER movement', async () => {
      await service.recordStockMovement({
        productId: 'prod-6',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 100,
        performedBy: 'user-1',
      });

      await service.recordStockMovement({
        productId: 'prod-6',
        warehouseId: 'wh-1',
        type: 'TRANSFER',
        quantity: 25,
        destinationWarehouseId: 'wh-2',
        performedBy: 'user-1',
      });

      const stock = service.getStockLevel('prod-6', 'wh-1');
      expect(stock?.onHand).toBe(75);
      expect(stock?.inTransit).toBe(25);
    });

    it('should handle ADJUSTMENT movement', async () => {
      await service.recordStockMovement({
        productId: 'prod-7',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 100,
        performedBy: 'user-1',
      });

      await service.recordStockMovement({
        productId: 'prod-7',
        warehouseId: 'wh-1',
        type: 'ADJUSTMENT',
        quantity: -10,
        reason: 'Count discrepancy',
        performedBy: 'user-1',
      });

      const stock = service.getStockLevel('prod-7', 'wh-1');
      expect(stock?.onHand).toBe(90);
    });

    it('should filter movements by type and date', async () => {
      await service.recordStockMovement({
        productId: 'prod-8',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 50,
        performedBy: 'user-1',
      });

      await service.recordStockMovement({
        productId: 'prod-8',
        warehouseId: 'wh-1',
        type: 'OUT',
        quantity: 10,
        performedBy: 'user-1',
      });

      const inMovements = service.getStockMovements('prod-8', { type: 'IN' });
      expect(inMovements.length).toBe(1);
      expect(inMovements[0].type).toBe('IN');
    });
  });

  describe('Stock Levels', () => {
    it('should get stock level', async () => {
      await service.recordStockMovement({
        productId: 'stock-1',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 200,
        unitCost: 15,
        performedBy: 'user-1',
      });

      const stock = service.getStockLevel('stock-1', 'wh-1');
      expect(stock).toBeDefined();
      expect(stock?.onHand).toBe(200);
      expect(stock?.unitCost).toBe(15);
      expect(stock?.totalValue).toBe(3000);
    });

    it('should return undefined for non-existent stock', () => {
      const stock = service.getStockLevel('non-existent', 'wh-1');
      expect(stock).toBeUndefined();
    });

    it('should get all stock levels', async () => {
      await service.recordStockMovement({
        productId: 'multi-1',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 100,
        performedBy: 'user-1',
      });

      await service.recordStockMovement({
        productId: 'multi-2',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 200,
        performedBy: 'user-1',
      });

      const levels = service.getAllStockLevels('wh-1');
      expect(levels.length).toBe(2);
    });

    it('should update reorder settings', async () => {
      await service.recordStockMovement({
        productId: 'reorder-1',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 50,
        performedBy: 'user-1',
      });

      const updated = await service.updateReorderSettings('reorder-1', 'wh-1', {
        reorderPoint: 25,
        reorderQuantity: 100,
        maxStock: 500,
      });

      expect(updated.reorderPoint).toBe(25);
      expect(updated.reorderQuantity).toBe(100);
      expect(updated.maxStock).toBe(500);
    });

    it('should mark stock as needing reorder', async () => {
      await service.updateReorderSettings('low-stock', 'wh-1', {
        reorderPoint: 50,
      });

      await service.recordStockMovement({
        productId: 'low-stock',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 30,
        performedBy: 'user-1',
      });

      const stock = service.getStockLevel('low-stock', 'wh-1');
      expect(stock?.needsReorder).toBe(true);
    });
  });

  describe('Stock Reservations', () => {
    it('should reserve stock', async () => {
      await service.recordStockMovement({
        productId: 'reserve-1',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 100,
        performedBy: 'user-1',
      });

      const reserved = await service.reserveStock('reserve-1', 'wh-1', 30);
      expect(reserved).toBe(true);

      const stock = service.getStockLevel('reserve-1', 'wh-1');
      expect(stock?.available).toBe(70);
      expect(stock?.reserved).toBe(30);
    });

    it('should fail to reserve more than available', async () => {
      await service.recordStockMovement({
        productId: 'reserve-2',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 50,
        performedBy: 'user-1',
      });

      const reserved = await service.reserveStock('reserve-2', 'wh-1', 100);
      expect(reserved).toBe(false);
    });

    it('should release reservation', async () => {
      await service.recordStockMovement({
        productId: 'reserve-3',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 100,
        performedBy: 'user-1',
      });

      await service.reserveStock('reserve-3', 'wh-1', 40);
      const released = await service.releaseReservation('reserve-3', 'wh-1', 40);

      expect(released).toBe(true);

      const stock = service.getStockLevel('reserve-3', 'wh-1');
      expect(stock?.available).toBe(100);
      expect(stock?.reserved).toBe(0);
    });
  });

  describe('Batch Tracking', () => {
    it('should create a batch', async () => {
      const batch = await service.createBatch({
        batchNumber: 'BATCH-001',
        productId: 'batch-prod-1',
        warehouseId: 'wh-1',
        quantity: 500,
        receivedDate: new Date(),
        unitCost: 25,
        manufacturingDate: new Date('2025-01-01'),
        expiryDate: new Date('2026-01-01'),
        qualityChecked: true,
      });

      expect(batch.id).toBeDefined();
      expect(batch.batchNumber).toBe('BATCH-001');
      expect(batch.status).toBe('ACTIVE');
      expect(batch.availableQuantity).toBe(500);
    });

    it('should get batches for product', async () => {
      await service.createBatch({
        batchNumber: 'BATCH-A',
        productId: 'multi-batch',
        warehouseId: 'wh-1',
        quantity: 100,
        receivedDate: new Date(),
        unitCost: 10,
        qualityChecked: true,
      });

      await service.createBatch({
        batchNumber: 'BATCH-B',
        productId: 'multi-batch',
        warehouseId: 'wh-1',
        quantity: 200,
        receivedDate: new Date(),
        unitCost: 12,
        qualityChecked: true,
      });

      const batches = service.getBatches('multi-batch', 'wh-1');
      expect(batches.length).toBe(2);
    });

    it('should update batch status', async () => {
      const batch = await service.createBatch({
        batchNumber: 'STATUS-BATCH',
        productId: 'status-prod',
        warehouseId: 'wh-1',
        quantity: 50,
        receivedDate: new Date(),
        unitCost: 5,
        qualityChecked: false,
      });

      const updated = await service.updateBatchStatus(batch.id, 'QUARANTINE');
      expect(updated?.status).toBe('QUARANTINE');
    });

    it('should get expiring batches', async () => {
      const nearExpiry = new Date();
      nearExpiry.setDate(nearExpiry.getDate() + 10);

      await service.createBatch({
        batchNumber: 'EXPIRING',
        productId: 'exp-prod',
        warehouseId: 'wh-1',
        quantity: 100,
        receivedDate: new Date(),
        expiryDate: nearExpiry,
        unitCost: 15,
        qualityChecked: true,
      });

      const expiring = service.getExpiringBatches(30);
      expect(expiring.length).toBeGreaterThan(0);
      expect(expiring[0].batchNumber).toBe('EXPIRING');
    });
  });

  describe('Reorder Suggestions', () => {
    it('should generate reorder suggestions', async () => {
      await service.updateReorderSettings('reorder-suggest', 'wh-1', {
        reorderPoint: 100,
        reorderQuantity: 500,
      });

      await service.recordStockMovement({
        productId: 'reorder-suggest',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 50,
        unitCost: 20,
        performedBy: 'user-1',
      });

      const suggestions = service.generateReorderSuggestions('wh-1');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].productId).toBe('reorder-suggest');
      expect(suggestions[0].suggestedQuantity).toBeGreaterThan(0);
    });

    it('should sort suggestions by urgency', async () => {
      // Create critical stock item
      await service.updateReorderSettings('critical-1', 'wh-1', { reorderPoint: 100 });
      await service.recordStockMovement({
        productId: 'critical-1',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 5,
        unitCost: 10,
        performedBy: 'user-1',
      });

      // Create medium urgency item
      await service.updateReorderSettings('medium-1', 'wh-1', { reorderPoint: 50 });
      await service.recordStockMovement({
        productId: 'medium-1',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 30,
        unitCost: 10,
        performedBy: 'user-1',
      });

      const suggestions = service.generateReorderSuggestions('wh-1');

      // Critical should be first
      const urgencies = suggestions.map(s => s.urgency);
      expect(urgencies.indexOf('CRITICAL')).toBeLessThanOrEqual(urgencies.indexOf('MEDIUM'));
    });
  });

  describe('Inventory Valuation', () => {
    it('should calculate inventory valuation', async () => {
      await service.recordStockMovement({
        productId: 'val-1',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 100,
        unitCost: 50,
        performedBy: 'user-1',
      });

      await service.recordStockMovement({
        productId: 'val-2',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 200,
        unitCost: 25,
        performedBy: 'user-1',
      });

      const valuation = service.calculateInventoryValuation('wh-1');

      expect(valuation.totalUnits).toBe(300);
      expect(valuation.totalValue).toBe(10000); // 100*50 + 200*25
      expect(valuation.totalItems).toBe(2);
      expect(valuation.valuationMethod).toBe('AVERAGE');
    });

    it('should include warehouse breakdown', async () => {
      await service.recordStockMovement({
        productId: 'multi-wh-1',
        warehouseId: 'wh-1',
        type: 'IN',
        quantity: 100,
        unitCost: 10,
        performedBy: 'user-1',
      });

      await service.recordStockMovement({
        productId: 'multi-wh-2',
        warehouseId: 'wh-2',
        type: 'IN',
        quantity: 50,
        unitCost: 20,
        performedBy: 'user-1',
      });

      const valuation = service.calculateInventoryValuation();

      expect(valuation.byWarehouse?.length).toBeGreaterThan(0);
    });
  });

  describe('Cycle Counting', () => {
    it('should create a cycle count plan', async () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const plan = await service.createCycleCountPlan({
        name: 'Monthly Full Count',
        warehouseId: 'wh-1',
        frequency: 'MONTHLY',
        nextCountDate: nextMonth,
        countMethod: 'FULL',
        targetAccuracy: 99,
        itemsToCount: 100,
        assignedTo: ['user-1', 'user-2'],
      });

      expect(plan.id).toBeDefined();
      expect(plan.status).toBe('SCHEDULED');
    });

    it('should get cycle count plans', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      await service.createCycleCountPlan({
        name: 'Weekly ABC Count',
        warehouseId: 'wh-1',
        frequency: 'WEEKLY',
        nextCountDate: nextWeek,
        countMethod: 'ABC',
        targetAccuracy: 98,
        itemsToCount: 50,
        assignedTo: ['user-1'],
      });

      const plans = service.getCycleCountPlans('wh-1');
      expect(plans.length).toBe(1);
    });

    it('should record count result', async () => {
      const plan = await service.createCycleCountPlan({
        name: 'Test Count',
        warehouseId: 'wh-1',
        frequency: 'WEEKLY',
        nextCountDate: new Date(),
        countMethod: 'FULL',
        targetAccuracy: 99,
        itemsToCount: 10,
        assignedTo: ['user-1'],
      });

      const result = await service.recordCountResult({
        planId: plan.id,
        productId: 'count-prod-1',
        locationId: 'loc-1',
        systemQuantity: 100,
        countedQuantity: 95,
        resolved: false,
        countedBy: 'user-1',
      });

      expect(result.variance).toBe(-5);
      expect(result.variancePercent).toBe(-5);
    });

    it('should emit event for significant variance', async () => {
      const plan = await service.createCycleCountPlan({
        name: 'Variance Test',
        warehouseId: 'wh-1',
        frequency: 'DAILY',
        nextCountDate: new Date(),
        countMethod: 'FULL',
        targetAccuracy: 99,
        itemsToCount: 5,
        assignedTo: ['user-1'],
      });

      await service.recordCountResult({
        planId: plan.id,
        productId: 'variance-prod',
        locationId: 'loc-1',
        systemQuantity: 100,
        countedQuantity: 80, // 20% variance
        resolved: false,
        countedBy: 'user-1',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'inventory.count.variance_detected',
        expect.objectContaining({ variancePercent: -20 }),
      );
    });

    it('should resolve variance with adjustment', async () => {
      const plan = await service.createCycleCountPlan({
        name: 'Resolve Test',
        warehouseId: 'wh-1',
        frequency: 'WEEKLY',
        nextCountDate: new Date(),
        countMethod: 'FULL',
        targetAccuracy: 99,
        itemsToCount: 10,
        assignedTo: ['user-1'],
      });

      const result = await service.recordCountResult({
        planId: plan.id,
        productId: 'resolve-prod',
        locationId: 'loc-1',
        systemQuantity: 100,
        countedQuantity: 90,
        resolved: false,
        countedBy: 'user-1',
      });

      const resolved = await service.resolveVariance(result.id, 'ADJUSTMENT');

      expect(resolved?.resolved).toBe(true);
      expect(resolved?.resolution).toBe('ADJUSTMENT');
      expect(resolved?.adjustmentId).toBeDefined();
    });
  });

  describe('ABC Analysis', () => {
    it('should perform ABC analysis', async () => {
      // Create items with values that will distribute across A, B, C
      // A items should be <= 80% cumulative, B <= 95%, C rest
      // Creating 10 items to allow proper distribution
      for (let i = 1; i <= 10; i++) {
        await service.recordStockMovement({
          productId: `abc-item-${i}`,
          warehouseId: 'wh-1',
          type: 'IN',
          quantity: 100,
          unitCost: 110 - i * 10, // Decreasing values: 100, 90, 80...
          performedBy: 'user-1',
        });
      }

      const analysis = service.performABCAnalysis('wh-1');

      expect(analysis.classification.length).toBe(10);

      // Verify summary totals
      const totalCount = analysis.summary.A.count + analysis.summary.B.count + analysis.summary.C.count;
      expect(totalCount).toBe(10);

      // Verify items are sorted by value descending (first item has highest value)
      expect(analysis.classification[0].productId).toBe('abc-item-1');
      expect(analysis.classification[0].value).toBeGreaterThan(analysis.classification[1].value);

      // A items should exist (top value items)
      expect(analysis.summary.A.count).toBeGreaterThan(0);
    });
  });
});
