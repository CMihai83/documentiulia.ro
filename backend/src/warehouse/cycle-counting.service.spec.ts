import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CycleCountingService,
  CycleCountStatus,
  CountType,
  CountFrequency,
  AdjustmentType,
  AdjustmentStatus,
  CreateCycleCountPlanDto,
  AddCountTaskDto,
  CreateAdjustmentDto,
} from './cycle-counting.service';

describe('CycleCountingService', () => {
  let service: CycleCountingService;
  let eventEmitter: EventEmitter2;
  let tenantId: string;

  beforeEach(async () => {
    tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CycleCountingService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CycleCountingService>(CycleCountingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Cycle Count Plan Operations', () => {
    const createPlanDto: CreateCycleCountPlanDto = {
      name: 'Monthly Cycle Count',
      warehouseId: 'warehouse_1',
      warehouseName: 'Main Warehouse',
      countType: CountType.FULL,
      frequency: CountFrequency.MONTHLY,
      plannedDate: new Date(),
      createdBy: 'user_1',
      createdByName: 'John Doe',
    };

    const countTaskDto: AddCountTaskDto = {
      locationId: 'loc_1',
      locationCode: 'A-01-01',
      zoneId: 'zone_1',
      zoneName: 'Zone A',
      itemId: 'item_1',
      itemCode: 'SKU001',
      itemName: 'Test Product',
      expectedQuantity: 100,
      unitOfMeasure: 'EA',
      unitCost: 50,
    };

    it('should create a cycle count plan', async () => {
      const plan = await service.createCycleCountPlan(tenantId, createPlanDto);

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.planNumber).toMatch(/^CC-\d{4}-\d{6}$/);
      expect(plan.status).toBe(CycleCountStatus.PLANNED);
      expect(plan.countType).toBe(CountType.FULL);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'cycle_count_plan.created',
        expect.any(Object),
      );
    });

    it('should add tasks to plan', async () => {
      const plan = await service.createCycleCountPlan(tenantId, createPlanDto);
      const updated = await service.addTasksToPlan(tenantId, plan.id, [
        countTaskDto,
      ]);

      expect(updated.tasks).toHaveLength(1);
      expect(updated.totalItems).toBe(1);
      expect(updated.totalLocations).toBe(1);
    });

    it('should not add tasks to non-planned status', async () => {
      const plan = await service.createCycleCountPlan(tenantId, createPlanDto);
      await service.addTasksToPlan(tenantId, plan.id, [countTaskDto]);
      await service.startCycleCount(tenantId, plan.id);

      await expect(
        service.addTasksToPlan(tenantId, plan.id, [countTaskDto]),
      ).rejects.toThrow('Can only add tasks to planned count');
    });

    it('should start cycle count', async () => {
      const plan = await service.createCycleCountPlan(tenantId, createPlanDto);
      await service.addTasksToPlan(tenantId, plan.id, [countTaskDto]);
      const started = await service.startCycleCount(tenantId, plan.id);

      expect(started.status).toBe(CycleCountStatus.IN_PROGRESS);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'cycle_count.started',
        expect.any(Object),
      );
    });

    it('should not start without tasks', async () => {
      const plan = await service.createCycleCountPlan(tenantId, createPlanDto);

      await expect(service.startCycleCount(tenantId, plan.id)).rejects.toThrow(
        'Plan must have at least one task',
      );
    });

    it('should cancel cycle count', async () => {
      const plan = await service.createCycleCountPlan(tenantId, createPlanDto);
      const cancelled = await service.cancelCycleCount(
        tenantId,
        plan.id,
        'No longer needed',
      );

      expect(cancelled.status).toBe(CycleCountStatus.CANCELLED);
      expect(cancelled.metadata?.cancellationReason).toBe('No longer needed');
    });

    it('should not cancel completed count', async () => {
      const plan = await service.createCycleCountPlan(tenantId, {
        ...createPlanDto,
        requiresApproval: false,
      });
      await service.addTasksToPlan(tenantId, plan.id, [countTaskDto]);
      await service.startCycleCount(tenantId, plan.id);

      const refreshedPlan = await service.getCycleCountPlan(tenantId, plan.id);
      const taskId = refreshedPlan.tasks[0].id;
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Counter');
      await service.startCountTask(tenantId, taskId);
      await service.recordCount(tenantId, taskId, {
        countedQuantity: 100,
        countedBy: 'counter_1',
        countedByName: 'Counter',
      });
      await service.submitPlanForApproval(tenantId, plan.id);
      await service.completeCycleCount(tenantId, plan.id);

      await expect(
        service.cancelCycleCount(tenantId, plan.id, 'Reason'),
      ).rejects.toThrow('Cannot cancel completed count');
    });

    it('should get plan by id', async () => {
      const created = await service.createCycleCountPlan(tenantId, createPlanDto);
      const plan = await service.getCycleCountPlan(tenantId, created.id);

      expect(plan.id).toBe(created.id);
    });

    it('should throw when plan not found', async () => {
      await expect(
        service.getCycleCountPlan(tenantId, 'non_existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should list plans with filters', async () => {
      await service.createCycleCountPlan(tenantId, createPlanDto);
      await service.createCycleCountPlan(tenantId, {
        ...createPlanDto,
        countType: CountType.SPOT,
      });

      const plans = await service.listCycleCountPlans(tenantId, {
        countType: CountType.FULL,
      });

      expect(plans).toHaveLength(1);
      expect(plans[0].countType).toBe(CountType.FULL);
    });
  });

  describe('Count Task Operations', () => {
    let plan: any;
    let taskId: string;

    beforeEach(async () => {
      plan = await service.createCycleCountPlan(tenantId, {
        name: 'Test Count',
        warehouseId: 'warehouse_1',
        warehouseName: 'Main Warehouse',
        countType: CountType.FULL,
        plannedDate: new Date(),
        createdBy: 'user_1',
        createdByName: 'User',
      });
      await service.addTasksToPlan(tenantId, plan.id, [
        {
          locationId: 'loc_1',
          locationCode: 'A-01',
          itemId: 'item_1',
          itemCode: 'SKU001',
          itemName: 'Product',
          expectedQuantity: 100,
          unitOfMeasure: 'EA',
          unitCost: 50,
        },
      ]);
      await service.startCycleCount(tenantId, plan.id);
      const refreshedPlan = await service.getCycleCountPlan(tenantId, plan.id);
      taskId = refreshedPlan.tasks[0].id;
    });

    it('should assign count task', async () => {
      const task = await service.assignCountTask(
        tenantId,
        taskId,
        'counter_1',
        'Jane Counter',
      );

      expect(task.status).toBe('assigned');
      expect(task.assignedTo).toBe('counter_1');
    });

    it('should not assign already assigned task', async () => {
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Jane');
      await service.startCountTask(tenantId, taskId);

      await expect(
        service.assignCountTask(tenantId, taskId, 'counter_2', 'Bob'),
      ).rejects.toThrow('Task cannot be assigned');
    });

    it('should start count task', async () => {
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Jane');
      const task = await service.startCountTask(tenantId, taskId);

      expect(task.status).toBe('in_progress');
    });

    it('should not start unassigned task', async () => {
      await expect(service.startCountTask(tenantId, taskId)).rejects.toThrow(
        'Task must be assigned first',
      );
    });

    it('should record count with variance', async () => {
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Jane');
      await service.startCountTask(tenantId, taskId);

      const task = await service.recordCount(tenantId, taskId, {
        countedQuantity: 95,
        countedBy: 'counter_1',
        countedByName: 'Jane',
      });

      expect(task.status).toBe('completed');
      expect(task.countedQuantity).toBe(95);
      expect(task.variance).toBe(-5);
      expect(task.variancePercent).toBe(-5);
      expect(task.varianceValue).toBe(250);
    });

    it('should record count without variance', async () => {
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Jane');
      await service.startCountTask(tenantId, taskId);

      const task = await service.recordCount(tenantId, taskId, {
        countedQuantity: 100,
        countedBy: 'counter_1',
        countedByName: 'Jane',
      });

      expect(task.variance).toBe(0);
    });

    it('should request recount', async () => {
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Jane');
      await service.startCountTask(tenantId, taskId);
      await service.recordCount(tenantId, taskId, {
        countedQuantity: 95,
        countedBy: 'counter_1',
        countedByName: 'Jane',
      });

      const task = await service.requestRecount(
        tenantId,
        taskId,
        'Suspicious variance',
      );

      expect(task.status).toBe('recount');
      expect(task.recountRequired).toBe(true);
      expect(task.recountReason).toBe('Suspicious variance');
      expect(task.countedQuantity).toBeUndefined();
    });

    it('should list count tasks', async () => {
      const tasks = await service.listCountTasks(tenantId, plan.id);

      expect(tasks).toHaveLength(1);
    });

    it('should get task by id', async () => {
      const task = await service.getCountTask(tenantId, taskId);

      expect(task.id).toBe(taskId);
    });
  });

  describe('Cycle Count Approval and Completion', () => {
    it('should submit for approval', async () => {
      const plan = await service.createCycleCountPlan(tenantId, {
        name: 'Test Count',
        warehouseId: 'warehouse_1',
        warehouseName: 'Main Warehouse',
        countType: CountType.FULL,
        plannedDate: new Date(),
        requiresApproval: true,
        createdBy: 'user_1',
        createdByName: 'User',
      });
      await service.addTasksToPlan(tenantId, plan.id, [
        {
          locationId: 'loc_1',
          locationCode: 'A-01',
          itemId: 'item_1',
          itemCode: 'SKU001',
          itemName: 'Product',
          expectedQuantity: 100,
          unitOfMeasure: 'EA',
        },
      ]);
      await service.startCycleCount(tenantId, plan.id);

      const refreshed = await service.getCycleCountPlan(tenantId, plan.id);
      const taskId = refreshed.tasks[0].id;
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Counter');
      await service.startCountTask(tenantId, taskId);
      await service.recordCount(tenantId, taskId, {
        countedQuantity: 100,
        countedBy: 'counter_1',
        countedByName: 'Counter',
      });

      const submitted = await service.submitPlanForApproval(tenantId, plan.id);

      expect(submitted.status).toBe(CycleCountStatus.PENDING_APPROVAL);
    });

    it('should auto-approve if not required', async () => {
      const plan = await service.createCycleCountPlan(tenantId, {
        name: 'Test Count',
        warehouseId: 'warehouse_1',
        warehouseName: 'Main Warehouse',
        countType: CountType.FULL,
        plannedDate: new Date(),
        requiresApproval: false,
        createdBy: 'user_1',
        createdByName: 'User',
      });
      await service.addTasksToPlan(tenantId, plan.id, [
        {
          locationId: 'loc_1',
          locationCode: 'A-01',
          itemId: 'item_1',
          itemCode: 'SKU001',
          itemName: 'Product',
          expectedQuantity: 100,
          unitOfMeasure: 'EA',
        },
      ]);
      await service.startCycleCount(tenantId, plan.id);

      const refreshed = await service.getCycleCountPlan(tenantId, plan.id);
      const taskId = refreshed.tasks[0].id;
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Counter');
      await service.startCountTask(tenantId, taskId);
      await service.recordCount(tenantId, taskId, {
        countedQuantity: 100,
        countedBy: 'counter_1',
        countedByName: 'Counter',
      });

      const submitted = await service.submitPlanForApproval(tenantId, plan.id);

      expect(submitted.status).toBe(CycleCountStatus.APPROVED);
    });

    it('should not submit with pending tasks', async () => {
      const plan = await service.createCycleCountPlan(tenantId, {
        name: 'Test Count',
        warehouseId: 'warehouse_1',
        warehouseName: 'Main Warehouse',
        countType: CountType.FULL,
        plannedDate: new Date(),
        createdBy: 'user_1',
        createdByName: 'User',
      });
      await service.addTasksToPlan(tenantId, plan.id, [
        {
          locationId: 'loc_1',
          locationCode: 'A-01',
          itemId: 'item_1',
          itemCode: 'SKU001',
          itemName: 'Product',
          expectedQuantity: 100,
          unitOfMeasure: 'EA',
        },
      ]);
      await service.startCycleCount(tenantId, plan.id);

      await expect(
        service.submitPlanForApproval(tenantId, plan.id),
      ).rejects.toThrow('All tasks must be completed');
    });

    it('should approve cycle count', async () => {
      const plan = await service.createCycleCountPlan(tenantId, {
        name: 'Test Count',
        warehouseId: 'warehouse_1',
        warehouseName: 'Main Warehouse',
        countType: CountType.FULL,
        plannedDate: new Date(),
        requiresApproval: true,
        createdBy: 'user_1',
        createdByName: 'User',
      });
      await service.addTasksToPlan(tenantId, plan.id, [
        {
          locationId: 'loc_1',
          locationCode: 'A-01',
          itemId: 'item_1',
          itemCode: 'SKU001',
          itemName: 'Product',
          expectedQuantity: 100,
          unitOfMeasure: 'EA',
        },
      ]);
      await service.startCycleCount(tenantId, plan.id);

      const refreshed = await service.getCycleCountPlan(tenantId, plan.id);
      const taskId = refreshed.tasks[0].id;
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Counter');
      await service.startCountTask(tenantId, taskId);
      await service.recordCount(tenantId, taskId, {
        countedQuantity: 100,
        countedBy: 'counter_1',
        countedByName: 'Counter',
      });
      await service.submitPlanForApproval(tenantId, plan.id);

      const approved = await service.approveCycleCount(
        tenantId,
        plan.id,
        'approver_1',
      );

      expect(approved.status).toBe(CycleCountStatus.APPROVED);
      expect(approved.approvedBy).toBe('approver_1');
    });

    it('should complete cycle count and create adjustments', async () => {
      const plan = await service.createCycleCountPlan(tenantId, {
        name: 'Test Count',
        warehouseId: 'warehouse_1',
        warehouseName: 'Main Warehouse',
        countType: CountType.FULL,
        plannedDate: new Date(),
        requiresApproval: false,
        createdBy: 'user_1',
        createdByName: 'User',
      });
      await service.addTasksToPlan(tenantId, plan.id, [
        {
          locationId: 'loc_1',
          locationCode: 'A-01',
          itemId: 'item_1',
          itemCode: 'SKU001',
          itemName: 'Product',
          expectedQuantity: 100,
          unitOfMeasure: 'EA',
          unitCost: 50,
        },
      ]);
      await service.startCycleCount(tenantId, plan.id);

      const refreshed = await service.getCycleCountPlan(tenantId, plan.id);
      const taskId = refreshed.tasks[0].id;
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Counter');
      await service.startCountTask(tenantId, taskId);
      await service.recordCount(tenantId, taskId, {
        countedQuantity: 95, // Variance of -5
        countedBy: 'counter_1',
        countedByName: 'Counter',
      });
      await service.submitPlanForApproval(tenantId, plan.id);

      const result = await service.completeCycleCount(tenantId, plan.id);

      expect(result.plan.status).toBe(CycleCountStatus.COMPLETED);
      expect(result.adjustments).toHaveLength(1);
      expect(result.adjustments[0].adjustmentQuantity).toBe(-5);
      expect(result.adjustments[0].status).toBe(AdjustmentStatus.POSTED);
    });
  });

  describe('Inventory Adjustment Operations', () => {
    const createAdjustmentDto: CreateAdjustmentDto = {
      type: AdjustmentType.DAMAGE,
      warehouseId: 'warehouse_1',
      warehouseName: 'Main Warehouse',
      locationId: 'loc_1',
      locationCode: 'A-01',
      itemId: 'item_1',
      itemCode: 'SKU001',
      itemName: 'Test Product',
      previousQuantity: 100,
      adjustmentQuantity: -5,
      unitOfMeasure: 'EA',
      unitCost: 50,
      reason: 'Damaged during handling',
      requestedBy: 'user_1',
      requestedByName: 'John Doe',
    };

    it('should create inventory adjustment', async () => {
      const adjustment = await service.createAdjustment(
        tenantId,
        createAdjustmentDto,
      );

      expect(adjustment).toBeDefined();
      expect(adjustment.id).toBeDefined();
      expect(adjustment.adjustmentNumber).toMatch(/^ADJ-\d{4}-\d{6}$/);
      expect(adjustment.status).toBe(AdjustmentStatus.PENDING);
      expect(adjustment.newQuantity).toBe(95);
      expect(adjustment.totalValue).toBe(250);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'inventory_adjustment.created',
        expect.any(Object),
      );
    });

    it('should approve adjustment', async () => {
      const adjustment = await service.createAdjustment(
        tenantId,
        createAdjustmentDto,
      );
      const approved = await service.approveAdjustment(
        tenantId,
        adjustment.id,
        'approver_1',
      );

      expect(approved.status).toBe(AdjustmentStatus.APPROVED);
      expect(approved.approvedBy).toBe('approver_1');
      expect(approved.approvedAt).toBeDefined();
    });

    it('should reject adjustment', async () => {
      const adjustment = await service.createAdjustment(
        tenantId,
        createAdjustmentDto,
      );
      const rejected = await service.rejectAdjustment(
        tenantId,
        adjustment.id,
        'rejector_1',
        'Invalid reason',
      );

      expect(rejected.status).toBe(AdjustmentStatus.REJECTED);
      expect(rejected.rejectedBy).toBe('rejector_1');
      expect(rejected.rejectionReason).toBe('Invalid reason');
    });

    it('should not approve non-pending adjustment', async () => {
      const adjustment = await service.createAdjustment(
        tenantId,
        createAdjustmentDto,
      );
      await service.approveAdjustment(tenantId, adjustment.id, 'approver_1');

      await expect(
        service.approveAdjustment(tenantId, adjustment.id, 'approver_2'),
      ).rejects.toThrow('Adjustment is not pending');
    });

    it('should post approved adjustment', async () => {
      const adjustment = await service.createAdjustment(
        tenantId,
        createAdjustmentDto,
      );
      await service.approveAdjustment(tenantId, adjustment.id, 'approver_1');
      const posted = await service.postAdjustment(tenantId, adjustment.id);

      expect(posted.status).toBe(AdjustmentStatus.POSTED);
      expect(posted.postedAt).toBeDefined();
    });

    it('should not post unapproved adjustment', async () => {
      const adjustment = await service.createAdjustment(
        tenantId,
        createAdjustmentDto,
      );

      await expect(
        service.postAdjustment(tenantId, adjustment.id),
      ).rejects.toThrow('Adjustment must be approved first');
    });

    it('should list adjustments with filters', async () => {
      await service.createAdjustment(tenantId, createAdjustmentDto);
      await service.createAdjustment(tenantId, {
        ...createAdjustmentDto,
        type: AdjustmentType.LOSS,
      });

      const adjustments = await service.listAdjustments(tenantId, {
        type: AdjustmentType.DAMAGE,
      });

      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].type).toBe(AdjustmentType.DAMAGE);
    });
  });

  describe('Analytics', () => {
    it('should calculate cycle count analytics', async () => {
      const warehouseId = 'warehouse_analytics';
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() + 1);

      const plan = await service.createCycleCountPlan(tenantId, {
        name: 'Analytics Count',
        warehouseId,
        warehouseName: 'Analytics Warehouse',
        countType: CountType.FULL,
        plannedDate: new Date(),
        requiresApproval: false,
        createdBy: 'user_1',
        createdByName: 'User',
      });
      await service.addTasksToPlan(tenantId, plan.id, [
        {
          locationId: 'loc_1',
          locationCode: 'A-01',
          itemId: 'item_1',
          itemCode: 'SKU001',
          itemName: 'Product',
          expectedQuantity: 100,
          unitOfMeasure: 'EA',
          unitCost: 50,
        },
      ]);
      await service.startCycleCount(tenantId, plan.id);

      const refreshed = await service.getCycleCountPlan(tenantId, plan.id);
      const taskId = refreshed.tasks[0].id;
      await service.assignCountTask(tenantId, taskId, 'counter_1', 'Counter');
      await service.startCountTask(tenantId, taskId);
      await service.recordCount(tenantId, taskId, {
        countedQuantity: 95,
        countedBy: 'counter_1',
        countedByName: 'Counter',
      });
      await service.submitPlanForApproval(tenantId, plan.id);
      await service.completeCycleCount(tenantId, plan.id);

      const analytics = await service.getCycleCountAnalytics(
        tenantId,
        warehouseId,
        dateFrom,
        dateTo,
      );

      expect(analytics.totalPlans).toBe(1);
      expect(analytics.completedPlans).toBe(1);
      expect(analytics.totalTasks).toBe(1);
      expect(analytics.completedTasks).toBe(1);
      expect(analytics.varianceCount).toBe(1);
      expect(analytics.byCountType[CountType.FULL]).toBe(1);
    });

    it('should calculate adjustment analytics', async () => {
      const warehouseId = 'warehouse_adj_analytics';
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() + 1);

      await service.createAdjustment(tenantId, {
        type: AdjustmentType.DAMAGE,
        warehouseId,
        warehouseName: 'Analytics Warehouse',
        locationId: 'loc_1',
        locationCode: 'A-01',
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product',
        previousQuantity: 100,
        adjustmentQuantity: -5,
        unitOfMeasure: 'EA',
        unitCost: 50,
        reason: 'Damaged',
        requestedBy: 'user_1',
        requestedByName: 'User',
      });

      const analytics = await service.getAdjustmentAnalytics(
        tenantId,
        warehouseId,
        dateFrom,
        dateTo,
      );

      expect(analytics.totalAdjustments).toBe(1);
      expect(analytics.byType[AdjustmentType.DAMAGE]).toBe(1);
      expect(analytics.totalNegative).toBe(5);
      expect(analytics.totalValue).toBe(250);
      expect(analytics.topItems).toHaveLength(1);
    });
  });
});
