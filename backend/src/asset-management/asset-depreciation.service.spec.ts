import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssetDepreciationService, DepreciationSchedule } from './asset-depreciation.service';
import { Asset, DepreciationMethod } from './asset-management.service';

describe('AssetDepreciationService', () => {
  let service: AssetDepreciationService;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const tenantId = 'tenant-123';

  const createMockAsset = (overrides: Partial<Asset> = {}): Asset => ({
    id: 'asset-001',
    tenantId,
    name: 'Dell Server PowerEdge R740',
    assetTag: 'AST-001',
    category: 'it_hardware',
    status: 'active',
    condition: 'good',
    purchasePrice: 50000,
    purchaseDate: new Date('2024-01-01'),
    depreciationMethod: 'straight_line',
    usefulLifeMonths: 60,
    salvageValue: 5000,
    currentValue: 45000,
    locationId: 'loc-datacenter',
    serialNumber: 'SN-123456',
    createdBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetDepreciationService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AssetDepreciationService>(AssetDepreciationService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== CREATE DEPRECIATION SCHEDULE ===================

  describe('createDepreciationSchedule', () => {
    it('should create a depreciation schedule for an asset', async () => {
      const asset = createMockAsset();
      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule).toBeDefined();
      expect(schedule.assetId).toBe(asset.id);
      expect(schedule.assetName).toBe(asset.name);
      expect(schedule.tenantId).toBe(tenantId);
    });

    it('should throw error if asset has no purchase price', async () => {
      const asset = createMockAsset({ purchasePrice: undefined });

      await expect(
        service.createDepreciationSchedule(asset, tenantId),
      ).rejects.toThrow('Asset must have purchase price and useful life defined');
    });

    it('should throw error if asset has no useful life', async () => {
      const asset = createMockAsset({ usefulLifeMonths: undefined });

      await expect(
        service.createDepreciationSchedule(asset, tenantId),
      ).rejects.toThrow('Asset must have purchase price and useful life defined');
    });

    it('should calculate straight-line monthly depreciation correctly', async () => {
      const asset = createMockAsset({
        purchasePrice: 12000,
        salvageValue: 0,
        usefulLifeMonths: 12,
        depreciationMethod: 'straight_line',
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.monthlyDepreciation).toBe(1000);
    });

    it('should use salvage value in straight-line calculation', async () => {
      const asset = createMockAsset({
        purchasePrice: 12000,
        salvageValue: 2000,
        usefulLifeMonths: 10,
        depreciationMethod: 'straight_line',
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      // (12000 - 2000) / 10 = 1000
      expect(schedule.monthlyDepreciation).toBe(1000);
    });

    it('should calculate declining balance depreciation', async () => {
      const asset = createMockAsset({
        purchasePrice: 10000,
        salvageValue: 1000,
        usefulLifeMonths: 60,
        depreciationMethod: 'declining_balance',
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.method).toBe('declining_balance');
      expect(schedule.entries.length).toBe(60);
    });

    it('should calculate sum of years digits depreciation', async () => {
      const asset = createMockAsset({
        purchasePrice: 10000,
        salvageValue: 1000,
        usefulLifeMonths: 60,
        depreciationMethod: 'sum_of_years_digits',
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.method).toBe('sum_of_years_digits');
    });

    it('should handle units of production method', async () => {
      const asset = createMockAsset({
        depreciationMethod: 'units_of_production',
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.method).toBe('units_of_production');
    });

    it('should generate correct number of entries', async () => {
      const asset = createMockAsset({ usefulLifeMonths: 24 });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.entries.length).toBe(24);
    });

    it('should default to straight_line if no method specified', async () => {
      const asset = createMockAsset({ depreciationMethod: undefined });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.method).toBe('straight_line');
    });

    it('should set schedule status to active', async () => {
      const asset = createMockAsset();

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.status).toBe('active');
    });

    it('should emit depreciation.schedule_created event', async () => {
      const asset = createMockAsset();

      await service.createDepreciationSchedule(asset, tenantId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'depreciation.schedule_created',
        expect.objectContaining({ schedule: expect.any(Object) }),
      );
    });

    it('should use asset depreciationStartDate if provided', async () => {
      const startDate = new Date('2024-06-01');
      const asset = createMockAsset({ depreciationStartDate: startDate });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.startDate).toEqual(startDate);
    });

    it('should round depreciation amounts to 2 decimal places', async () => {
      const asset = createMockAsset({
        purchasePrice: 10000,
        salvageValue: 0,
        usefulLifeMonths: 7,
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      // Each entry should have rounded values
      schedule.entries.forEach((entry) => {
        const decimalPlaces = (entry.depreciationAmount.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      });
    });

    it('should not depreciate below salvage value', async () => {
      const asset = createMockAsset({
        purchasePrice: 10000,
        salvageValue: 2000,
        usefulLifeMonths: 60,
        depreciationMethod: 'declining_balance',
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      const lastEntry = schedule.entries[schedule.entries.length - 1];
      expect(lastEntry.closingValue).toBeGreaterThanOrEqual(2000);
    });
  });

  // =================== GET DEPRECIATION SCHEDULES ===================

  describe('getDepreciationSchedule', () => {
    it('should return schedule by asset ID', async () => {
      const asset = createMockAsset();
      await service.createDepreciationSchedule(asset, tenantId);

      const schedule = await service.getDepreciationSchedule(asset.id);

      expect(schedule).toBeDefined();
      expect(schedule?.assetId).toBe(asset.id);
    });

    it('should return null for non-existent asset', async () => {
      const schedule = await service.getDepreciationSchedule('non-existent');

      expect(schedule).toBeNull();
    });
  });

  describe('getDepreciationSchedules', () => {
    beforeEach(async () => {
      const assets = [
        createMockAsset({ id: 'asset-1', depreciationMethod: 'straight_line' }),
        createMockAsset({ id: 'asset-2', depreciationMethod: 'declining_balance' }),
        createMockAsset({ id: 'asset-3', depreciationMethod: 'straight_line' }),
      ];

      for (const asset of assets) {
        await service.createDepreciationSchedule(asset, tenantId);
      }
    });

    it('should return all schedules for tenant', async () => {
      const schedules = await service.getDepreciationSchedules(tenantId);

      expect(schedules.length).toBe(3);
    });

    it('should filter by depreciation method', async () => {
      const schedules = await service.getDepreciationSchedules(tenantId, {
        method: 'straight_line',
      });

      expect(schedules.length).toBe(2);
      schedules.forEach((s) => expect(s.method).toBe('straight_line'));
    });

    it('should filter by status', async () => {
      const schedules = await service.getDepreciationSchedules(tenantId, {
        status: 'active',
      });

      expect(schedules.length).toBe(3);
    });

    it('should limit results', async () => {
      const schedules = await service.getDepreciationSchedules(tenantId, {
        limit: 2,
      });

      expect(schedules.length).toBe(2);
    });

    it('should sort by createdAt descending', async () => {
      const schedules = await service.getDepreciationSchedules(tenantId);

      for (let i = 1; i < schedules.length; i++) {
        expect(schedules[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          schedules[i].createdAt.getTime(),
        );
      }
    });

    it('should return empty array for different tenant', async () => {
      const schedules = await service.getDepreciationSchedules('other-tenant');

      expect(schedules).toEqual([]);
    });
  });

  // =================== POST DEPRECIATION ENTRY ===================

  describe('postDepreciationEntry', () => {
    let schedule: DepreciationSchedule;

    beforeEach(async () => {
      const asset = createMockAsset();
      schedule = await service.createDepreciationSchedule(asset, tenantId);
    });

    it('should post a depreciation entry', async () => {
      const period = schedule.entries[0].period;
      const entry = await service.postDepreciationEntry(
        schedule.id,
        period,
        'user-123',
      );

      expect(entry).toBeDefined();
      expect(entry?.status).toBe('posted');
      expect(entry?.postedBy).toBe('user-123');
    });

    it('should set postedAt timestamp', async () => {
      const period = schedule.entries[0].period;
      const before = new Date();

      const entry = await service.postDepreciationEntry(
        schedule.id,
        period,
        'user-123',
      );

      expect(entry?.postedAt).toBeDefined();
      expect(entry?.postedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should return null for non-existent schedule', async () => {
      const entry = await service.postDepreciationEntry(
        'non-existent',
        '2024-01',
        'user-123',
      );

      expect(entry).toBeNull();
    });

    it('should return null for non-existent period', async () => {
      const entry = await service.postDepreciationEntry(
        schedule.id,
        '1999-01',
        'user-123',
      );

      expect(entry).toBeNull();
    });

    it('should emit depreciation.entry_posted event', async () => {
      const period = schedule.entries[0].period;
      mockEventEmitter.emit.mockClear();

      await service.postDepreciationEntry(schedule.id, period, 'user-123');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'depreciation.entry_posted',
        expect.objectContaining({
          schedule: expect.any(Object),
          entry: expect.any(Object),
        }),
      );
    });
  });

  // =================== ADJUST DEPRECIATION ENTRY ===================

  describe('adjustDepreciationEntry', () => {
    let schedule: DepreciationSchedule;

    beforeEach(async () => {
      const asset = createMockAsset({
        purchasePrice: 12000,
        salvageValue: 0,
        usefulLifeMonths: 12,
      });
      schedule = await service.createDepreciationSchedule(asset, tenantId);
    });

    it('should adjust depreciation amount', async () => {
      const period = schedule.entries[0].period;
      const entry = await service.adjustDepreciationEntry(schedule.id, period, {
        newAmount: 500,
        reason: 'Correction',
        adjustedBy: 'user-123',
      });

      expect(entry?.depreciationAmount).toBe(500);
      expect(entry?.status).toBe('adjusted');
    });

    it('should record adjustment reason', async () => {
      const period = schedule.entries[0].period;
      const entry = await service.adjustDepreciationEntry(schedule.id, period, {
        newAmount: 500,
        reason: 'Impairment adjustment',
        adjustedBy: 'user-123',
      });

      expect(entry?.adjustmentReason).toBe('Impairment adjustment');
    });

    it('should update closing value', async () => {
      const period = schedule.entries[0].period;
      const openingValue = schedule.entries[0].openingValue;

      const entry = await service.adjustDepreciationEntry(schedule.id, period, {
        newAmount: 800,
        reason: 'Test',
        adjustedBy: 'user-123',
      });

      expect(entry?.closingValue).toBe(openingValue - 800);
    });

    it('should return null for non-existent schedule', async () => {
      const entry = await service.adjustDepreciationEntry('non-existent', '2024-01', {
        newAmount: 500,
        reason: 'Test',
        adjustedBy: 'user-123',
      });

      expect(entry).toBeNull();
    });

    it('should emit depreciation.entry_adjusted event', async () => {
      const period = schedule.entries[0].period;
      mockEventEmitter.emit.mockClear();

      await service.adjustDepreciationEntry(schedule.id, period, {
        newAmount: 500,
        reason: 'Test',
        adjustedBy: 'user-123',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'depreciation.entry_adjusted',
        expect.any(Object),
      );
    });
  });

  // =================== CALCULATE CURRENT BOOK VALUE ===================

  describe('calculateCurrentBookValue', () => {
    it('should calculate straight-line book value', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const asset = createMockAsset({
        purchasePrice: 60000,
        salvageValue: 0,
        usefulLifeMonths: 60,
        purchaseDate: twoYearsAgo,
        depreciationMethod: 'straight_line',
      });

      const bookValue = service.calculateCurrentBookValue(asset);

      // After 24 months: 60000 - (60000/60 * 24) = 60000 - 24000 = 36000
      expect(bookValue).toBeCloseTo(36000, -2);
    });

    it('should return salvage value if fully depreciated', () => {
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

      const asset = createMockAsset({
        purchasePrice: 10000,
        salvageValue: 1000,
        usefulLifeMonths: 60,
        purchaseDate: tenYearsAgo,
        depreciationMethod: 'straight_line',
      });

      const bookValue = service.calculateCurrentBookValue(asset);

      expect(bookValue).toBe(1000);
    });

    it('should return current value if no purchase info', () => {
      const asset = createMockAsset({
        purchasePrice: undefined,
        currentValue: 5000,
      });

      const bookValue = service.calculateCurrentBookValue(asset);

      expect(bookValue).toBe(5000);
    });

    it('should default to 60 months useful life', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const asset = createMockAsset({
        purchasePrice: 12000,
        salvageValue: 0,
        usefulLifeMonths: undefined,
        purchaseDate: oneYearAgo,
      });

      const bookValue = service.calculateCurrentBookValue(asset);

      // After 12 months with 60 month life: 12000 - (12000/60 * 12) = 12000 - 2400 = 9600
      expect(bookValue).toBeCloseTo(9600, -2);
    });

    it('should calculate declining balance', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const asset = createMockAsset({
        purchasePrice: 10000,
        salvageValue: 1000,
        usefulLifeMonths: 60,
        purchaseDate: oneYearAgo,
        depreciationMethod: 'declining_balance',
      });

      const bookValue = service.calculateCurrentBookValue(asset);

      expect(bookValue).toBeLessThan(10000);
      expect(bookValue).toBeGreaterThanOrEqual(1000);
    });
  });

  // =================== DEPRECIATION SUMMARY ===================

  describe('getDepreciationSummary', () => {
    beforeEach(async () => {
      const assets = [
        createMockAsset({ id: 'asset-1', purchasePrice: 10000, depreciationMethod: 'straight_line' }),
        createMockAsset({ id: 'asset-2', purchasePrice: 20000, depreciationMethod: 'straight_line' }),
        createMockAsset({ id: 'asset-3', purchasePrice: 15000, depreciationMethod: 'declining_balance' }),
      ];

      for (const asset of assets) {
        await service.createDepreciationSchedule(asset, tenantId);
      }
    });

    it('should return total assets count', async () => {
      const summary = await service.getDepreciationSummary(tenantId);

      expect(summary.totalAssets).toBe(3);
    });

    it('should return total original value', async () => {
      const summary = await service.getDepreciationSummary(tenantId);

      expect(summary.totalOriginalValue).toBe(45000);
    });

    it('should group by method', async () => {
      const summary = await service.getDepreciationSummary(tenantId);

      const straightLine = summary.byMethod.find((m) => m.method === 'straight_line');
      expect(straightLine?.assetCount).toBe(2);
    });

    it('should return empty summary for different tenant', async () => {
      const summary = await service.getDepreciationSummary('other-tenant');

      expect(summary.totalAssets).toBe(0);
      expect(summary.totalOriginalValue).toBe(0);
    });
  });

  // =================== ASSET VALUATION ===================

  describe('getAssetValuation', () => {
    it('should return null for non-existent valuation', async () => {
      const valuation = await service.getAssetValuation('non-existent');

      expect(valuation).toBeNull();
    });
  });

  describe('revalueAsset', () => {
    it('should create valuation if not exists', async () => {
      const asset = createMockAsset();
      const valuation = await service.revalueAsset(asset, {
        newValue: 40000,
        reason: 'Market adjustment',
        adjustedBy: 'user-123',
      });

      expect(valuation).toBeDefined();
      expect(valuation.currentBookValue).toBe(40000);
    });

    it('should add to revaluation history', async () => {
      const asset = createMockAsset();

      await service.revalueAsset(asset, {
        newValue: 40000,
        reason: 'First adjustment',
        adjustedBy: 'user-1',
      });

      const valuation = await service.revalueAsset(asset, {
        newValue: 35000,
        reason: 'Second adjustment',
        adjustedBy: 'user-2',
      });

      expect(valuation.revaluationHistory.length).toBe(2);
      expect(valuation.revaluationHistory[1].previousValue).toBe(40000);
      expect(valuation.revaluationHistory[1].newValue).toBe(35000);
    });

    it('should emit asset.revalued event', async () => {
      const asset = createMockAsset();

      await service.revalueAsset(asset, {
        newValue: 40000,
        reason: 'Test',
        adjustedBy: 'user-123',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'asset.revalued',
        expect.objectContaining({ valuation: expect.any(Object) }),
      );
    });

    it('should record adjustment reason', async () => {
      const asset = createMockAsset();
      const valuation = await service.revalueAsset(asset, {
        newValue: 40000,
        reason: 'Impairment due to damage',
        adjustedBy: 'user-123',
      });

      expect(valuation.revaluationHistory[0].reason).toBe('Impairment due to damage');
    });
  });

  // =================== DEPRECIATION REPORT ===================

  describe('generateDepreciationReport', () => {
    beforeEach(async () => {
      const asset = createMockAsset({
        purchasePrice: 12000,
        salvageValue: 0,
        usefulLifeMonths: 12,
        purchaseDate: new Date('2024-01-01'),
        depreciationStartDate: new Date('2024-01-01'),
      });
      await service.createDepreciationSchedule(asset, tenantId);
    });

    it('should generate monthly report', async () => {
      const report = await service.generateDepreciationReport(tenantId, {
        year: 2024,
        month: 1,
      });

      expect(report.period).toBe('2024-01');
      expect(report.schedules.length).toBe(1);
    });

    it('should generate yearly report', async () => {
      const report = await service.generateDepreciationReport(tenantId, {
        year: 2024,
      });

      expect(report.period).toBe('2024');
    });

    it('should include totals', async () => {
      const report = await service.generateDepreciationReport(tenantId, {
        year: 2024,
        month: 1,
      });

      expect(report.totals.openingValue).toBeDefined();
      expect(report.totals.depreciation).toBeDefined();
      expect(report.totals.closingValue).toBeDefined();
    });

    it('should include generatedAt timestamp', async () => {
      const before = new Date();
      const report = await service.generateDepreciationReport(tenantId, {
        year: 2024,
      });

      expect(report.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  // =================== ASSETS BY STATUS ===================

  describe('getAssetsByDepreciationStatus', () => {
    it('should categorize assets by depreciation status', async () => {
      const asset = createMockAsset();
      await service.createDepreciationSchedule(asset, tenantId);

      const status = await service.getAssetsByDepreciationStatus(tenantId);

      expect(status.fullyDepreciated).toBeDefined();
      expect(status.nearFullyDepreciated).toBeDefined();
      expect(status.active).toBeDefined();
    });

    it('should return empty arrays for different tenant', async () => {
      const status = await service.getAssetsByDepreciationStatus('other-tenant');

      expect(status.fullyDepreciated).toEqual([]);
      expect(status.nearFullyDepreciated).toEqual([]);
      expect(status.active).toEqual([]);
    });
  });

  // =================== ROMANIAN FISCAL COMPLIANCE ===================

  describe('Romanian Fiscal Compliance', () => {
    it('should support straight-line method per Codul Fiscal', async () => {
      const asset = createMockAsset({ depreciationMethod: 'straight_line' });
      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.method).toBe('straight_line');
    });

    it('should support declining balance per Codul Fiscal', async () => {
      const asset = createMockAsset({ depreciationMethod: 'declining_balance' });
      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.method).toBe('declining_balance');
    });

    it('should handle 5-year useful life (common for IT equipment)', async () => {
      const asset = createMockAsset({
        usefulLifeMonths: 60,
        category: 'it_hardware',
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.usefulLifeMonths).toBe(60);
      expect(schedule.entries.length).toBe(60);
    });

    it('should handle 3-year useful life (common for software)', async () => {
      const asset = createMockAsset({
        usefulLifeMonths: 36,
        category: 'software',
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.usefulLifeMonths).toBe(36);
    });

    it('should handle 10-year useful life (common for vehicles)', async () => {
      const asset = createMockAsset({
        usefulLifeMonths: 120,
        category: 'vehicle',
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.usefulLifeMonths).toBe(120);
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle zero salvage value', async () => {
      const asset = createMockAsset({ salvageValue: 0 });
      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.salvageValue).toBe(0);
    });

    it('should handle undefined salvage value', async () => {
      const asset = createMockAsset({ salvageValue: undefined });
      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.salvageValue).toBe(0);
    });

    it('should handle very short useful life (1 month)', async () => {
      const asset = createMockAsset({
        purchasePrice: 1000,
        usefulLifeMonths: 1,
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.entries.length).toBe(1);
    });

    it('should handle very long useful life (50 years)', async () => {
      const asset = createMockAsset({
        usefulLifeMonths: 600,
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.entries.length).toBe(600);
    });

    it('should handle high value assets', async () => {
      const asset = createMockAsset({
        purchasePrice: 10000000,
        salvageValue: 100000,
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.purchasePrice).toBe(10000000);
    });

    it('should handle low value assets', async () => {
      const asset = createMockAsset({
        purchasePrice: 100,
        salvageValue: 10,
      });

      const schedule = await service.createDepreciationSchedule(asset, tenantId);

      expect(schedule.purchasePrice).toBe(100);
    });
  });
});
