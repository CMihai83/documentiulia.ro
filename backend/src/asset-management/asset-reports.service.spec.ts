import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AssetReportsService,
  ReportType,
  ReportFormat,
} from './asset-reports.service';
import { AssetManagementService } from './asset-management.service';
import { AssetDepreciationService } from './asset-depreciation.service';
import { AssetMaintenanceService } from './asset-maintenance.service';
import { AssetLocationService } from './asset-location.service';

describe('AssetReportsService', () => {
  let service: AssetReportsService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockAssets = [
    {
      id: 'asset_1',
      assetTag: 'IT-001',
      name: 'Server Dell PowerEdge',
      category: 'it_hardware',
      status: 'active',
      condition: 'good',
      locationName: 'Data Center București',
      departmentName: 'IT',
      assignedToUserName: 'Ion Popescu',
      purchaseDate: new Date('2023-01-15'),
      purchasePrice: 25000,
      currentValue: 20000,
      serialNumber: 'SRV-123456',
      warrantyExpiry: new Date('2026-01-15'),
      insuranceExpiry: new Date('2025-06-30'),
      insurancePolicyNumber: 'POL-001',
      usefulLifeMonths: 60,
      salvageValue: 2500,
      depreciationMethod: 'straight_line',
      supplierName: 'Dell Romania',
    },
    {
      id: 'asset_2',
      assetTag: 'IT-002',
      name: 'Laptop HP EliteBook',
      category: 'it_hardware',
      status: 'active',
      condition: 'excellent',
      locationName: 'Birou Cluj',
      departmentName: 'Marketing',
      purchaseDate: new Date('2024-03-01'),
      purchasePrice: 5000,
      currentValue: 4500,
      warrantyExpiry: new Date('2025-03-01'),
      usefulLifeMonths: 36,
      salvageValue: 500,
      depreciationMethod: 'straight_line',
    },
  ];

  const mockMaintenanceRecords = [
    { id: 'mr_1', assetId: 'asset_1', type: 'preventive', performedAt: new Date(), totalCost: 500 },
    { id: 'mr_2', assetId: 'asset_1', type: 'corrective', performedAt: new Date(), totalCost: 1200 },
  ];

  const mockSchedules = [
    { id: 'sch_1', assetId: 'asset_1', status: 'scheduled', scheduledDate: new Date(Date.now() + 86400000 * 30) },
    { id: 'sch_2', assetId: 'asset_1', status: 'overdue', scheduledDate: new Date(Date.now() - 86400000 * 10) },
  ];

  const mockAssetManagementService = {
    getAssets: jest.fn().mockResolvedValue({ assets: mockAssets, total: 2 }),
    getAssetStatistics: jest.fn().mockResolvedValue({
      total: 2,
      totalValue: 25000,
      byStatus: { active: 2 },
      byCategory: { it_hardware: 2 },
      byCondition: { excellent: 1, good: 1, poor: 0, broken: 0 },
      warrantyExpiringSoon: 1,
    }),
  };

  const mockDepreciationService = {
    calculateCurrentBookValue: jest.fn().mockImplementation((asset) => asset.currentValue || 0),
    getDepreciationSummary: jest.fn().mockResolvedValue({
      totalDepreciationThisYear: 5000,
      totalAccumulatedDepreciation: 5500,
    }),
  };

  const mockMaintenanceService = {
    getMaintenanceRecords: jest.fn().mockResolvedValue(mockMaintenanceRecords),
    getSchedules: jest.fn().mockResolvedValue(mockSchedules),
    getMaintenanceStatistics: jest.fn().mockResolvedValue({
      totalCostThisYear: 1700,
      overdue: 1,
      scheduled: 1,
    }),
  };

  const mockLocationService = {};

  const createReportDefinitionData = {
    tenantId: 'tenant_123',
    name: 'Raport Active Fixe',
    description: 'Registrul activelor fixe',
    type: 'asset_register' as ReportType,
    createdBy: 'user_admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetReportsService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AssetManagementService, useValue: mockAssetManagementService },
        { provide: AssetDepreciationService, useValue: mockDepreciationService },
        { provide: AssetMaintenanceService, useValue: mockMaintenanceService },
        { provide: AssetLocationService, useValue: mockLocationService },
      ],
    }).compile();

    service = module.get<AssetReportsService>(AssetReportsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Report Definitions', () => {
    it('should create report definition', async () => {
      const definition = await service.createReportDefinition(createReportDefinitionData);

      expect(definition).toBeDefined();
      expect(definition.id).toMatch(/^reportdef-/);
      expect(definition.name).toBe('Raport Active Fixe');
    });

    it('should generate unique definition IDs', async () => {
      const def1 = await service.createReportDefinition(createReportDefinitionData);
      const def2 = await service.createReportDefinition(createReportDefinitionData);

      expect(def1.id).not.toBe(def2.id);
    });

    it('should set default columns based on type', async () => {
      const definition = await service.createReportDefinition(createReportDefinitionData);

      expect(definition.columns).toBeDefined();
      expect(definition.columns.length).toBeGreaterThan(0);
      expect(definition.columns).toContain('assetTag');
    });

    it('should get report definitions by tenant', async () => {
      await service.createReportDefinition(createReportDefinitionData);
      await service.createReportDefinition(createReportDefinitionData);

      const definitions = await service.getReportDefinitions('tenant_123');

      expect(definitions.length).toBe(2);
    });

    it('should get report definition by ID', async () => {
      const created = await service.createReportDefinition(createReportDefinitionData);
      const retrieved = await service.getReportDefinition(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should return null for non-existent definition', async () => {
      const retrieved = await service.getReportDefinition('nonexistent');

      expect(retrieved).toBeNull();
    });

    it('should sort definitions by date descending', async () => {
      await service.createReportDefinition(createReportDefinitionData);
      await service.createReportDefinition(createReportDefinitionData);

      const definitions = await service.getReportDefinitions('tenant_123');

      expect(definitions[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        definitions[1].createdAt.getTime()
      );
    });
  });

  describe('Asset Register Report', () => {
    it('should generate asset register report', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^report-/);
      expect(report.type).toBe('asset_register');
      expect(report.name).toBe('Asset Register Report');
    });

    it('should include all assets', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');

      expect(report.rowCount).toBe(2);
      expect(report.data.length).toBe(2);
    });

    it('should calculate summary', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');

      expect(report.summary).toBeDefined();
      expect(report.summary!.totalAssets).toBe(2);
      expect(report.summary!.totalPurchaseValue).toBeGreaterThan(0);
      expect(report.summary!.totalCurrentValue).toBeGreaterThan(0);
    });

    it('should group by status', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');

      expect(report.summary!.byStatus).toBeDefined();
      expect(report.summary!.byStatus.active).toBe(2);
    });

    it('should group by category', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');

      expect(report.summary!.byCategory).toBeDefined();
      expect(report.summary!.byCategory.it_hardware).toBe(2);
    });

    it('should emit report.generated event', async () => {
      await service.generateAssetRegisterReport('tenant_123');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'report.generated',
        expect.any(Object)
      );
    });

    it('should filter by category', async () => {
      await service.generateAssetRegisterReport('tenant_123', { category: 'it_hardware' });

      expect(mockAssetManagementService.getAssets).toHaveBeenCalledWith(
        'tenant_123',
        expect.objectContaining({ category: 'it_hardware' })
      );
    });

    it('should filter by status', async () => {
      await service.generateAssetRegisterReport('tenant_123', { status: 'active' });

      expect(mockAssetManagementService.getAssets).toHaveBeenCalledWith(
        'tenant_123',
        expect.objectContaining({ status: 'active' })
      );
    });
  });

  describe('Depreciation Report', () => {
    it('should generate depreciation report', async () => {
      const report = await service.generateDepreciationReport('tenant_123', { year: 2025 });

      expect(report).toBeDefined();
      expect(report.type).toBe('depreciation');
    });

    it('should include year in report name', async () => {
      const report = await service.generateDepreciationReport('tenant_123', { year: 2025 });

      expect(report.name).toContain('2025');
    });

    it('should include month in report name if provided', async () => {
      const report = await service.generateDepreciationReport('tenant_123', { year: 2025, month: 6 });

      expect(report.name).toContain('2025-06');
    });

    it('should calculate accumulated depreciation', async () => {
      const report = await service.generateDepreciationReport('tenant_123', { year: 2025 });

      expect(report.summary).toBeDefined();
      expect(report.summary!.totalAccumulatedDepreciation).toBeDefined();
    });

    it('should calculate depreciation progress', async () => {
      const report = await service.generateDepreciationReport('tenant_123', { year: 2025 });

      report.data.forEach((entry: any) => {
        expect(entry.depreciationProgress).toBeDefined();
      });
    });
  });

  describe('Maintenance Report', () => {
    it('should generate maintenance report', async () => {
      const report = await service.generateMaintenanceReport('tenant_123');

      expect(report).toBeDefined();
      expect(report.type).toBe('maintenance');
    });

    it('should include maintenance counts', async () => {
      const report = await service.generateMaintenanceReport('tenant_123');

      expect(report.summary).toBeDefined();
      expect(report.summary!.totalMaintenanceRecords).toBeDefined();
    });

    it('should calculate total maintenance cost', async () => {
      const report = await service.generateMaintenanceReport('tenant_123');

      expect(report.summary!.totalMaintenanceCost).toBeGreaterThanOrEqual(0);
    });

    it('should track overdue maintenance', async () => {
      const report = await service.generateMaintenanceReport('tenant_123');

      expect(report.summary!.totalOverdue).toBeDefined();
    });

    it('should calculate preventive ratio', async () => {
      const report = await service.generateMaintenanceReport('tenant_123');

      expect(report.summary!.preventiveRatio).toBeDefined();
    });

    it('should support period filtering', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31'),
      };

      const report = await service.generateMaintenanceReport('tenant_123', period);

      expect(report.period).toEqual(period);
    });
  });

  describe('Warranty Report', () => {
    it('should generate warranty report', async () => {
      const report = await service.generateWarrantyReport('tenant_123');

      expect(report).toBeDefined();
      expect(report.type).toBe('warranty');
    });

    it('should default to 90 days ahead', async () => {
      const report = await service.generateWarrantyReport('tenant_123');

      expect(report.name).toContain('90 Days');
    });

    it('should support custom days ahead', async () => {
      const report = await service.generateWarrantyReport('tenant_123', 180);

      expect(report.name).toContain('180 Days');
    });

    it('should categorize warranty status', async () => {
      const report = await service.generateWarrantyReport('tenant_123');

      expect(report.summary).toBeDefined();
      expect(report.summary!.expired).toBeDefined();
      expect(report.summary!.expiringSoon).toBeDefined();
      expect(report.summary!.active).toBeDefined();
    });

    it('should calculate days until expiry', async () => {
      const report = await service.generateWarrantyReport('tenant_123');

      report.data.forEach((entry: any) => {
        expect(entry.daysUntilExpiry).toBeDefined();
      });
    });

    it('should calculate total value expiring', async () => {
      const report = await service.generateWarrantyReport('tenant_123');

      expect(report.summary!.totalValueExpiring).toBeDefined();
    });
  });

  describe('Insurance Report', () => {
    it('should generate insurance report', async () => {
      const report = await service.generateInsuranceReport('tenant_123');

      expect(report).toBeDefined();
      expect(report.type).toBe('insurance');
    });

    it('should categorize insurance status', async () => {
      const report = await service.generateInsuranceReport('tenant_123');

      expect(report.summary).toBeDefined();
      expect(report.summary!.expired).toBeDefined();
      expect(report.summary!.expiringSoon).toBeDefined();
      expect(report.summary!.active).toBeDefined();
    });

    it('should track value at risk', async () => {
      const report = await service.generateInsuranceReport('tenant_123');

      expect(report.summary!.valueAtRisk).toBeDefined();
    });

    it('should include policy numbers', async () => {
      const report = await service.generateInsuranceReport('tenant_123');
      const entryWithPolicy = report.data.find((e: any) => e.policyNumber);

      expect(entryWithPolicy).toBeDefined();
    });
  });

  describe('KPI Metrics', () => {
    it('should get asset KPIs', async () => {
      const kpis = await service.getAssetKPIs('tenant_123');

      expect(kpis).toBeDefined();
      expect(kpis.length).toBeGreaterThan(0);
    });

    it('should include total asset value KPI', async () => {
      const kpis = await service.getAssetKPIs('tenant_123');
      const kpi = kpis.find((k) => k.name === 'Total Asset Value');

      expect(kpi).toBeDefined();
      expect(kpi?.unit).toBe('RON');
    });

    it('should include utilization rate KPI', async () => {
      const kpis = await service.getAssetKPIs('tenant_123');
      const kpi = kpis.find((k) => k.name === 'Asset Utilization Rate');

      expect(kpi).toBeDefined();
      expect(kpi?.unit).toBe('%');
      expect(kpi?.benchmark).toBe(85);
    });

    it('should include depreciation KPI', async () => {
      const kpis = await service.getAssetKPIs('tenant_123');
      const kpi = kpis.find((k) => k.name === 'Depreciation This Year');

      expect(kpi).toBeDefined();
    });

    it('should include maintenance cost KPI', async () => {
      const kpis = await service.getAssetKPIs('tenant_123');
      const kpi = kpis.find((k) => k.name === 'Maintenance Cost This Year');

      expect(kpi).toBeDefined();
    });

    it('should include overdue maintenance KPI', async () => {
      const kpis = await service.getAssetKPIs('tenant_123');
      const kpi = kpis.find((k) => k.name === 'Overdue Maintenance');

      expect(kpi).toBeDefined();
      expect(kpi?.benchmark).toBe(0);
    });

    it('should include warranty expiring KPI', async () => {
      const kpis = await service.getAssetKPIs('tenant_123');
      const kpi = kpis.find((k) => k.name === 'Warranty Expiring Soon');

      expect(kpi).toBeDefined();
    });

    it('should set KPI status based on thresholds', async () => {
      const kpis = await service.getAssetKPIs('tenant_123');

      kpis.forEach((kpi) => {
        expect(['good', 'warning', 'critical']).toContain(kpi.status);
      });
    });
  });

  describe('Generated Reports Retrieval', () => {
    it('should get generated reports by tenant', async () => {
      await service.generateAssetRegisterReport('tenant_123');
      await service.generateDepreciationReport('tenant_123', { year: 2025 });

      const reports = await service.getGeneratedReports('tenant_123');

      expect(reports.length).toBe(2);
    });

    it('should filter by report type', async () => {
      await service.generateAssetRegisterReport('tenant_123');
      await service.generateDepreciationReport('tenant_123', { year: 2025 });

      const reports = await service.getGeneratedReports('tenant_123', { type: 'asset_register' });

      expect(reports.every((r) => r.type === 'asset_register')).toBe(true);
    });

    it('should limit results', async () => {
      await service.generateAssetRegisterReport('tenant_123');
      await service.generateDepreciationReport('tenant_123', { year: 2025 });
      await service.generateMaintenanceReport('tenant_123');

      const reports = await service.getGeneratedReports('tenant_123', { limit: 2 });

      expect(reports.length).toBe(2);
    });

    it('should filter by date range', async () => {
      await service.generateAssetRegisterReport('tenant_123');

      const reports = await service.getGeneratedReports('tenant_123', {
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
      });

      expect(reports.length).toBeGreaterThan(0);
    });

    it('should get generated report by ID', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');
      const retrieved = await service.getGeneratedReport(report.id);

      expect(retrieved).toEqual(report);
    });

    it('should return null for non-existent report', async () => {
      const retrieved = await service.getGeneratedReport('nonexistent');

      expect(retrieved).toBeNull();
    });
  });

  describe('Report Export', () => {
    it('should export report as JSON', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');
      const exported = await service.exportReport(report.id, 'json');

      expect(exported.contentType).toBe('application/json');
      expect(exported.filename).toContain('.json');
    });

    it('should export report as CSV', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');
      const exported = await service.exportReport(report.id, 'csv');

      expect(exported.contentType).toBe('text/csv');
      expect(exported.filename).toContain('.csv');
    });

    it('should include report name in filename', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');
      const exported = await service.exportReport(report.id, 'json');

      expect(exported.filename).toContain('Asset_Register_Report');
    });

    it('should include date in filename', async () => {
      const report = await service.generateAssetRegisterReport('tenant_123');
      const exported = await service.exportReport(report.id, 'json');
      const today = new Date().toISOString().split('T')[0];

      expect(exported.filename).toContain(today);
    });

    it('should throw error for non-existent report', async () => {
      await expect(service.exportReport('nonexistent', 'json')).rejects.toThrow('Report not found');
    });
  });

  describe('Report Types', () => {
    it('should support asset_register type', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        type: 'asset_register',
      });

      expect(definition.type).toBe('asset_register');
    });

    it('should support depreciation type', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        type: 'depreciation',
      });

      expect(definition.type).toBe('depreciation');
    });

    it('should support maintenance type', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        type: 'maintenance',
      });

      expect(definition.type).toBe('maintenance');
    });

    it('should support warranty type', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        type: 'warranty',
      });

      expect(definition.type).toBe('warranty');
    });

    it('should support insurance type', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        type: 'insurance',
      });

      expect(definition.type).toBe('insurance');
    });
  });

  describe('Scheduled Reports', () => {
    it('should create scheduled report definition', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        isScheduled: true,
        schedule: {
          frequency: 'monthly',
          dayOfMonth: 1,
          time: '08:00',
          recipients: ['admin@example.ro'],
        },
      });

      expect(definition.isScheduled).toBe(true);
      expect(definition.schedule).toBeDefined();
      expect(definition.schedule?.frequency).toBe('monthly');
    });

    it('should support different frequencies', async () => {
      const frequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];

      for (const frequency of frequencies) {
        const definition = await service.createReportDefinition({
          ...createReportDefinitionData,
          isScheduled: true,
          schedule: {
            frequency: frequency as any,
            recipients: ['admin@example.ro'],
          },
        });

        expect(definition.schedule?.frequency).toBe(frequency);
      }
    });
  });

  describe('Romanian Localization', () => {
    it('should support Romanian report names', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        name: 'Registrul Mijloacelor Fixe',
        description: 'Raport cu toate activele fixe ale companiei',
      });

      expect(definition.name).toBe('Registrul Mijloacelor Fixe');
    });

    it('should use RON currency in KPIs', async () => {
      const kpis = await service.getAssetKPIs('tenant_123');
      const valueKpi = kpis.find((k) => k.name === 'Total Asset Value');

      expect(valueKpi?.unit).toBe('RON');
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt on definition creation', async () => {
      const before = new Date();
      const definition = await service.createReportDefinition(createReportDefinitionData);
      const after = new Date();

      expect(definition.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(definition.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should set generatedAt on report generation', async () => {
      const before = new Date();
      const report = await service.generateAssetRegisterReport('tenant_123');
      const after = new Date();

      expect(report.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(report.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Default Columns', () => {
    it('should set default columns for asset_register', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        type: 'asset_register',
      });

      expect(definition.columns).toContain('assetTag');
      expect(definition.columns).toContain('name');
      expect(definition.columns).toContain('status');
    });

    it('should set default columns for depreciation', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        type: 'depreciation',
      });

      expect(definition.columns).toContain('purchasePrice');
      expect(definition.columns).toContain('accumulatedDepreciation');
      expect(definition.columns).toContain('currentValue');
    });

    it('should set default columns for maintenance', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        type: 'maintenance',
      });

      expect(definition.columns).toContain('totalMaintenanceCount');
      expect(definition.columns).toContain('totalMaintenanceCost');
    });
  });
});
