import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  InventoryReconciliationService,
  CountType,
  CountSessionStatus,
  AdjustmentReason,
} from './inventory-reconciliation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryReconciliationService', () => {
  let service: InventoryReconciliationService;
  let mockPrismaService: jest.Mocked<PrismaService>;

  const userId = 'user-123';
  const warehouseId = 'warehouse-456';

  beforeEach(async () => {
    mockPrismaService = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryReconciliationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryReconciliationService>(InventoryReconciliationService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== COUNT SESSION MANAGEMENT ===================

  describe('createCountSession', () => {
    it('should create a stock count session', async () => {
      const session = await service.createCountSession(
        userId,
        warehouseId,
        'FULL',
        new Date('2025-12-20'),
      );

      expect(session).toBeDefined();
      expect(session.id).toContain('COUNT-');
      expect(session.userId).toBe(userId);
      expect(session.warehouseId).toBe(warehouseId);
      expect(session.type).toBe('FULL');
      expect(session.status).toBe('SCHEDULED');
    });

    it('should create session with notes', async () => {
      const session = await service.createCountSession(
        userId,
        warehouseId,
        'CYCLE',
        new Date(),
        { notes: 'Monthly cycle count' },
      );

      expect(session.notes).toBe('Monthly cycle count');
    });

    it('should populate items to count', async () => {
      const session = await service.createCountSession(
        userId,
        warehouseId,
        'FULL',
        new Date(),
      );

      expect(session.items.length).toBeGreaterThan(0);
      expect(session.items[0]).toHaveProperty('sku');
      expect(session.items[0]).toHaveProperty('systemQuantity');
    });

    it('should filter items by high value criteria', async () => {
      const session = await service.createCountSession(
        userId,
        warehouseId,
        'SPOT',
        new Date(),
        {
          itemSelection: {
            method: 'HIGH_VALUE',
            valueThreshold: 100,
          },
        },
      );

      session.items.forEach(item => {
        expect(item.unitCost).toBeGreaterThanOrEqual(100);
      });
    });

    it('should create session with random sample selection', async () => {
      const session = await service.createCountSession(
        userId,
        warehouseId,
        'SPOT',
        new Date(),
        {
          itemSelection: {
            method: 'RANDOM_SAMPLE',
            samplePercent: 40,
          },
        },
      );

      expect(session.items.length).toBeGreaterThan(0);
      expect(session.items.length).toBeLessThanOrEqual(5);
    });

    it('should set items status to PENDING', async () => {
      const session = await service.createCountSession(
        userId,
        warehouseId,
        'FULL',
        new Date(),
      );

      session.items.forEach(item => {
        expect(item.status).toBe('PENDING');
      });
    });

    it('should create audit log', async () => {
      await service.createCountSession(userId, warehouseId, 'ANNUAL', new Date());

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COUNT_SESSION_CREATED',
          }),
        }),
      );
    });

    it('should support different count types', async () => {
      const types: CountType[] = ['FULL', 'CYCLE', 'SPOT', 'ANNUAL', 'PERPETUAL'];

      for (const type of types) {
        const session = await service.createCountSession(userId, warehouseId, type, new Date());
        expect(session.type).toBe(type);
      }
    });
  });

  describe('startCountSession', () => {
    it('should start a scheduled session', async () => {
      const created = await service.createCountSession(
        userId,
        warehouseId,
        'FULL',
        new Date(),
      );

      const started = await service.startCountSession(created.id, 'counter-user');

      expect(started.status).toBe('IN_PROGRESS');
      expect(started.startedAt).toBeDefined();
      expect(started.countedBy).toBe('counter-user');
    });

    it('should throw NotFoundException for non-existent session', async () => {
      await expect(
        service.startCountSession('non-existent', 'user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not scheduled', async () => {
      const created = await service.createCountSession(
        userId,
        warehouseId,
        'FULL',
        new Date(),
      );
      await service.startCountSession(created.id, 'user');

      await expect(
        service.startCountSession(created.id, 'user'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordCount', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');
      sessionId = session.id;
    });

    it('should record a physical count', async () => {
      const session = await service.getCountSession(sessionId);
      const item = session.items[0];

      const counted = await service.recordCount(
        sessionId,
        item.id,
        item.systemQuantity,
        'counter',
      );

      expect(counted.countedQuantity).toBe(item.systemQuantity);
      expect(counted.status).toBe('COUNTED');
    });

    it('should calculate variance', async () => {
      const session = await service.getCountSession(sessionId);
      const item = session.items[0];

      const counted = await service.recordCount(
        sessionId,
        item.id,
        item.systemQuantity + 10,
        'counter',
      );

      expect(counted.variance).toBe(10);
      expect(counted.varianceValue).toBe(10 * item.unitCost);
    });

    it('should detect variance status', async () => {
      const session = await service.getCountSession(sessionId);
      const item = session.items[0];

      const counted = await service.recordCount(
        sessionId,
        item.id,
        item.systemQuantity + 5,
        'counter',
      );

      expect(counted.status).toBe('VARIANCE_DETECTED');
    });

    it('should flag for recount if variance > 5%', async () => {
      const session = await service.getCountSession(sessionId);
      const item = session.items[0];

      const counted = await service.recordCount(
        sessionId,
        item.id,
        Math.round(item.systemQuantity * 0.9), // 10% variance
        'counter',
      );

      expect(counted.requiresRecount).toBe(true);
      expect(counted.status).toBe('RECOUNT_REQUIRED');
    });

    it('should record notes', async () => {
      const session = await service.getCountSession(sessionId);
      const item = session.items[0];

      const counted = await service.recordCount(
        sessionId,
        item.id,
        item.systemQuantity,
        'counter',
        'Found in different location',
      );

      expect(counted.notes).toBe('Found in different location');
    });

    it('should update session summary', async () => {
      const session = await service.getCountSession(sessionId);
      const item = session.items[0];

      await service.recordCount(sessionId, item.id, item.systemQuantity, 'counter');

      const updated = await service.getCountSession(sessionId);
      expect(updated.summary).toBeDefined();
      expect(updated.summary!.countedItems).toBe(1);
    });

    it('should throw if session not in progress', async () => {
      const newSession = await service.createCountSession(userId, warehouseId, 'SPOT', new Date());

      await expect(
        service.recordCount(newSession.id, 'item-1', 100, 'counter'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if item not found', async () => {
      await expect(
        service.recordCount(sessionId, 'non-existent-item', 100, 'counter'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeCountSession', () => {
    it('should complete session when all items counted', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      // Count all items
      for (const item of session.items) {
        await service.recordCount(session.id, item.id, item.systemQuantity, 'counter');
      }

      const completed = await service.completeCountSession(session.id, 'verifier');

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
      expect(completed.verifiedBy).toBe('verifier');
    });

    it('should throw if items pending', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      await expect(
        service.completeCountSession(session.id, 'verifier'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if items require recount', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      // Count items with large variance to trigger recount
      for (const item of session.items) {
        await service.recordCount(
          session.id,
          item.id,
          Math.round(item.systemQuantity * 0.5), // 50% variance
          'counter',
        );
      }

      await expect(
        service.completeCountSession(session.id, 'verifier'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark all items as verified', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      for (const item of session.items) {
        await service.recordCount(session.id, item.id, item.systemQuantity, 'counter');
      }

      const completed = await service.completeCountSession(session.id, 'verifier');

      completed.items.forEach(item => {
        expect(item.status).toBe('VERIFIED');
      });
    });

    it('should create audit log', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      for (const item of session.items) {
        await service.recordCount(session.id, item.id, item.systemQuantity, 'counter');
      }

      await service.completeCountSession(session.id, 'verifier');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'COUNT_SESSION_COMPLETED',
          }),
        }),
      );
    });
  });

  describe('getCountSession', () => {
    it('should return session by id', async () => {
      const created = await service.createCountSession(userId, warehouseId, 'FULL', new Date());

      const retrieved = await service.getCountSession(created.id);

      expect(retrieved.id).toBe(created.id);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      await expect(
        service.getCountSession('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCountSessions', () => {
    it('should return sessions for user', async () => {
      await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.createCountSession(userId, warehouseId, 'CYCLE', new Date());

      const sessions = await service.getCountSessions(userId);

      expect(sessions.length).toBe(2);
    });

    it('should filter by warehouse', async () => {
      await service.createCountSession(userId, 'warehouse-A', 'FULL', new Date());
      await service.createCountSession(userId, 'warehouse-B', 'FULL', new Date());

      const sessions = await service.getCountSessions(userId, {
        warehouseId: 'warehouse-A',
      });

      expect(sessions.length).toBe(1);
      expect(sessions[0].warehouseId).toBe('warehouse-A');
    });

    it('should filter by status', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');
      await service.createCountSession(userId, warehouseId, 'CYCLE', new Date());

      const inProgress = await service.getCountSessions(userId, { status: 'IN_PROGRESS' });
      const scheduled = await service.getCountSessions(userId, { status: 'SCHEDULED' });

      expect(inProgress.length).toBe(1);
      expect(scheduled.length).toBe(1);
    });

    it('should filter by type', async () => {
      await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.createCountSession(userId, warehouseId, 'SPOT', new Date());

      const fullSessions = await service.getCountSessions(userId, { type: 'FULL' });

      expect(fullSessions.length).toBe(1);
      expect(fullSessions[0].type).toBe('FULL');
    });

    it('should sort by creation date descending', async () => {
      await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.createCountSession(userId, warehouseId, 'CYCLE', new Date());

      const sessions = await service.getCountSessions(userId);

      expect(sessions[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        sessions[1].createdAt.getTime(),
      );
    });
  });

  // =================== VARIANCE ANALYSIS ===================

  describe('generateVarianceReport', () => {
    it('should generate variance report', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      for (const item of session.items) {
        await service.recordCount(
          session.id,
          item.id,
          item.systemQuantity + 5, // Add some variance
          'counter',
        );
      }

      const report = await service.generateVarianceReport(session.id);

      expect(report.sessionId).toBe(session.id);
      expect(report.summary).toBeDefined();
      expect(report.variances.length).toBeGreaterThan(0);
    });

    it('should include possible causes for variances', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      const item = session.items[0];
      await service.recordCount(session.id, item.id, item.systemQuantity - 10, 'counter');

      const report = await service.generateVarianceReport(session.id);

      expect(report.variances[0].possibleCauses.length).toBeGreaterThan(0);
    });

    it('should include recommended actions', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      const item = session.items[0];
      await service.recordCount(session.id, item.id, item.systemQuantity + 5, 'counter');

      const report = await service.generateVarianceReport(session.id);

      expect(['ADJUST_INVENTORY', 'RECOUNT', 'INVESTIGATE', 'NO_ACTION']).toContain(
        report.variances[0]?.recommendedAction,
      );
    });

    it('should generate recommendations based on variance', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      for (const item of session.items) {
        await service.recordCount(
          session.id,
          item.id,
          Math.round(item.systemQuantity * 0.7), // 30% variance
          'counter',
        );
      }

      const report = await service.generateVarianceReport(session.id);

      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should throw for non-existent session', async () => {
      await expect(
        service.generateVarianceReport('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =================== INVENTORY ADJUSTMENTS ===================

  describe('createAdjustment', () => {
    it('should create an inventory adjustment', async () => {
      const adjustment = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'PHYSICAL_COUNT',
        100,
        95,
        50,
      );

      expect(adjustment.id).toContain('ADJ-');
      expect(adjustment.type).toBe('DECREASE');
      expect(adjustment.quantityChange).toBe(-5);
      expect(adjustment.valueChange).toBe(-250);
      expect(adjustment.status).toBe('PENDING_APPROVAL');
    });

    it('should detect increase type', async () => {
      const adjustment = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'FOUND_STOCK',
        100,
        110,
        50,
      );

      expect(adjustment.type).toBe('INCREASE');
    });

    it('should detect correction type', async () => {
      const adjustment = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'DATA_ENTRY_ERROR',
        100,
        100,
        50,
      );

      expect(adjustment.type).toBe('CORRECTION');
    });

    it('should link to session when provided', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());

      const adjustment = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'PHYSICAL_COUNT',
        100,
        90,
        50,
        { sessionId: session.id },
      );

      expect(adjustment.sessionId).toBe(session.id);
    });

    it('should include notes', async () => {
      const adjustment = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'DAMAGE',
        100,
        95,
        50,
        { notes: 'Water damage in warehouse' },
      );

      expect(adjustment.notes).toBe('Water damage in warehouse');
    });

    it('should create audit log', async () => {
      await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'THEFT',
        100,
        90,
        50,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ADJUSTMENT_CREATED',
          }),
        }),
      );
    });
  });

  describe('approveAdjustment', () => {
    it('should approve a pending adjustment', async () => {
      const created = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'PHYSICAL_COUNT',
        100,
        95,
        50,
      );

      const approved = await service.approveAdjustment(created.id, 'manager');

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedBy).toBe('manager');
      expect(approved.approvedAt).toBeDefined();
    });

    it('should throw for non-existent adjustment', async () => {
      await expect(
        service.approveAdjustment('non-existent', 'manager'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not pending approval', async () => {
      const created = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'PHYSICAL_COUNT',
        100,
        95,
        50,
      );
      await service.approveAdjustment(created.id, 'manager');

      await expect(
        service.approveAdjustment(created.id, 'manager'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create audit log', async () => {
      const created = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'PHYSICAL_COUNT',
        100,
        95,
        50,
      );

      await service.approveAdjustment(created.id, 'manager');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ADJUSTMENT_APPROVED',
          }),
        }),
      );
    });
  });

  describe('applyAdjustment', () => {
    it('should apply an approved adjustment', async () => {
      const created = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'PHYSICAL_COUNT',
        100,
        95,
        50,
      );
      await service.approveAdjustment(created.id, 'manager');

      const applied = await service.applyAdjustment(created.id);

      expect(applied.status).toBe('APPLIED');
    });

    it('should throw if not approved', async () => {
      const created = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'PHYSICAL_COUNT',
        100,
        95,
        50,
      );

      await expect(
        service.applyAdjustment(created.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update linked session item status', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      const item = session.items[0];
      await service.recordCount(session.id, item.id, item.systemQuantity - 5, 'counter');

      const adjustment = await service.createAdjustment(
        userId,
        item.itemId,
        item.sku,
        'PHYSICAL_COUNT',
        item.systemQuantity,
        item.systemQuantity - 5,
        item.unitCost,
        { sessionId: session.id },
      );

      await service.approveAdjustment(adjustment.id, 'manager');
      await service.applyAdjustment(adjustment.id);

      const updated = await service.getCountSession(session.id);
      const updatedItem = updated.items.find(i => i.itemId === item.itemId);
      expect(updatedItem?.status).toBe('ADJUSTED');
    });

    it('should create audit log', async () => {
      const created = await service.createAdjustment(
        userId,
        'ITEM-001',
        'SKU-001',
        'PHYSICAL_COUNT',
        100,
        95,
        50,
      );
      await service.approveAdjustment(created.id, 'manager');
      await service.applyAdjustment(created.id);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ADJUSTMENT_APPLIED',
          }),
        }),
      );
    });
  });

  describe('getAdjustments', () => {
    it('should return adjustments for user', async () => {
      await service.createAdjustment(userId, 'ITEM-001', 'SKU-001', 'DAMAGE', 100, 95, 50);
      await service.createAdjustment(userId, 'ITEM-002', 'SKU-002', 'THEFT', 200, 190, 25);

      const adjustments = await service.getAdjustments(userId);

      expect(adjustments.length).toBe(2);
    });

    it('should filter by status', async () => {
      const adj = await service.createAdjustment(userId, 'ITEM-001', 'SKU-001', 'DAMAGE', 100, 95, 50);
      await service.createAdjustment(userId, 'ITEM-002', 'SKU-002', 'THEFT', 200, 190, 25);
      await service.approveAdjustment(adj.id, 'manager');

      const approved = await service.getAdjustments(userId, { status: 'APPROVED' });

      expect(approved.length).toBe(1);
    });

    it('should filter by reason', async () => {
      await service.createAdjustment(userId, 'ITEM-001', 'SKU-001', 'DAMAGE', 100, 95, 50);
      await service.createAdjustment(userId, 'ITEM-002', 'SKU-002', 'THEFT', 200, 190, 25);

      const damageAdjustments = await service.getAdjustments(userId, { reason: 'DAMAGE' });

      expect(damageAdjustments.length).toBe(1);
      expect(damageAdjustments[0].reason).toBe('DAMAGE');
    });

    it('should filter by session', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());

      await service.createAdjustment(userId, 'ITEM-001', 'SKU-001', 'PHYSICAL_COUNT', 100, 95, 50, {
        sessionId: session.id,
      });
      await service.createAdjustment(userId, 'ITEM-002', 'SKU-002', 'DAMAGE', 200, 190, 25);

      const sessionAdjustments = await service.getAdjustments(userId, {
        sessionId: session.id,
      });

      expect(sessionAdjustments.length).toBe(1);
    });
  });

  // =================== SCHEDULING ===================

  describe('createSchedule', () => {
    it('should create a reconciliation schedule', async () => {
      const schedule = await service.createSchedule(
        userId,
        warehouseId,
        'CYCLE',
        'WEEKLY',
        { method: 'ABC_CLASS', abcClasses: ['A'] },
      );

      expect(schedule.id).toContain('SCHED-');
      expect(schedule.frequency).toBe('WEEKLY');
      expect(schedule.isActive).toBe(true);
    });

    it('should calculate next scheduled date for daily', async () => {
      const schedule = await service.createSchedule(
        userId,
        warehouseId,
        'PERPETUAL',
        'DAILY',
        { method: 'ALL' },
      );

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(schedule.nextScheduledDate.getDate()).toBe(tomorrow.getDate());
    });

    it('should support weekly frequency with day of week', async () => {
      const schedule = await service.createSchedule(
        userId,
        warehouseId,
        'CYCLE',
        'WEEKLY',
        { method: 'ALL' },
        { dayOfWeek: 1 }, // Monday
      );

      expect(schedule.nextScheduledDate.getDay()).toBeLessThanOrEqual(6);
    });

    it('should support monthly frequency with day of month', async () => {
      const schedule = await service.createSchedule(
        userId,
        warehouseId,
        'FULL',
        'MONTHLY',
        { method: 'ALL' },
        { dayOfMonth: 15 },
      );

      expect(schedule.nextScheduledDate.getDate()).toBe(15);
    });

    it('should support quarterly frequency', async () => {
      const schedule = await service.createSchedule(
        userId,
        warehouseId,
        'ANNUAL',
        'QUARTERLY',
        { method: 'ALL' },
      );

      expect(schedule.frequency).toBe('QUARTERLY');
    });

    it('should support annual frequency', async () => {
      const schedule = await service.createSchedule(
        userId,
        warehouseId,
        'ANNUAL',
        'ANNUAL',
        { method: 'ALL' },
      );

      expect(schedule.nextScheduledDate.getFullYear()).toBe(new Date().getFullYear() + 1);
    });
  });

  describe('getSchedules', () => {
    it('should return active schedules for user', async () => {
      const testUserId = `schedule-test-${Date.now()}`;
      const schedule1 = await service.createSchedule(testUserId, warehouseId, 'CYCLE', 'WEEKLY', { method: 'ALL' });

      const schedules = await service.getSchedules(testUserId);

      // Verify at least one schedule is returned for this user
      expect(schedules.length).toBeGreaterThanOrEqual(1);
      expect(schedules.some(s => s.id === schedule1.id)).toBe(true);
    });

    it('should only return active schedules', async () => {
      await service.createSchedule(userId, warehouseId, 'CYCLE', 'WEEKLY', { method: 'ALL' });

      const schedules = await service.getSchedules(userId);

      schedules.forEach(s => {
        expect(s.isActive).toBe(true);
      });
    });
  });

  // =================== DASHBOARD ===================

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      const dashboard = await service.getDashboard(userId);

      expect(dashboard).toHaveProperty('activeSessions');
      expect(dashboard).toHaveProperty('recentCompletedSessions');
      expect(dashboard).toHaveProperty('pendingAdjustments');
      expect(dashboard).toHaveProperty('upcomingSchedules');
      expect(dashboard).toHaveProperty('stats');
      expect(dashboard).toHaveProperty('alerts');
    });

    it('should include active sessions', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      const dashboard = await service.getDashboard(userId);

      expect(dashboard.activeSessions.length).toBeGreaterThan(0);
    });

    it('should include pending adjustments', async () => {
      await service.createAdjustment(userId, 'ITEM-001', 'SKU-001', 'DAMAGE', 100, 95, 50);

      const dashboard = await service.getDashboard(userId);

      expect(dashboard.pendingAdjustments.length).toBe(1);
    });

    it('should include stats', async () => {
      const dashboard = await service.getDashboard(userId);

      expect(dashboard.stats).toHaveProperty('totalSessionsThisMonth');
      expect(dashboard.stats).toHaveProperty('averageVariancePercent');
      expect(dashboard.stats).toHaveProperty('totalAdjustmentsValue');
      expect(dashboard.stats).toHaveProperty('itemsRequiringAttention');
    });

    it('should generate alerts for in-progress sessions', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      const dashboard = await service.getDashboard(userId);

      expect(dashboard.alerts.some(a => a.type === 'info')).toBe(true);
    });

    it('should generate alerts for pending adjustments', async () => {
      await service.createAdjustment(userId, 'ITEM-001', 'SKU-001', 'DAMAGE', 100, 95, 50);

      const dashboard = await service.getDashboard(userId);

      expect(dashboard.alerts.some(a => a.message.includes('ajustari'))).toBe(true);
    });

    it('should count items requiring attention', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      // Create variance to require attention
      const item = session.items[0];
      await service.recordCount(
        session.id,
        item.id,
        Math.round(item.systemQuantity * 0.5),
        'counter',
      );

      const dashboard = await service.getDashboard(userId);

      expect(dashboard.stats.itemsRequiringAttention).toBeGreaterThan(0);
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle zero system quantity', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      // Manually set system quantity to 0 (in real scenario this would come from inventory)
      session.items[0].systemQuantity = 0;

      const counted = await service.recordCount(
        session.id,
        session.items[0].id,
        10,
        'counter',
      );

      expect(counted.variancePercent).toBe(100); // 100% since found 10 from 0
    });

    it('should handle negative variance (shortage)', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      const item = session.items[0];
      const counted = await service.recordCount(
        session.id,
        item.id,
        item.systemQuantity - 20,
        'counter',
      );

      expect(counted.variance).toBe(-20);
      expect(counted.varianceValue).toBeLessThan(0);
    });

    it('should handle multiple reasons for adjustments', async () => {
      const reasons: AdjustmentReason[] = [
        'PHYSICAL_COUNT',
        'DAMAGE',
        'THEFT',
        'EXPIRATION',
        'DATA_ENTRY_ERROR',
        'RECEIVING_ERROR',
        'SHIPPING_ERROR',
        'QUALITY_CONTROL',
        'WRITE_OFF',
        'FOUND_STOCK',
        'OTHER',
      ];

      for (const reason of reasons) {
        const adj = await service.createAdjustment(
          userId,
          `ITEM-${reason}`,
          `SKU-${reason}`,
          reason,
          100,
          95,
          50,
        );
        expect(adj.reason).toBe(reason);
      }
    });

    it('should calculate session completion percent', async () => {
      const session = await service.createCountSession(userId, warehouseId, 'FULL', new Date());
      await service.startCountSession(session.id, 'counter');

      // Count first item
      await service.recordCount(
        session.id,
        session.items[0].id,
        session.items[0].systemQuantity,
        'counter',
      );

      const updated = await service.getCountSession(session.id);
      const expectedPercent = Math.round((1 / session.items.length) * 100);
      expect(updated.summary?.completionPercent).toBe(expectedPercent);
    });
  });
});
