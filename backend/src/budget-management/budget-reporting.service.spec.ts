import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BudgetReportingService,
  ReportType,
  ReportFormat,
  ReportFilters,
  ChartConfig,
} from './budget-reporting.service';
import { BudgetPlanningService } from './budget-planning.service';
import { BudgetTrackingService } from './budget-tracking.service';
import { BudgetVarianceService } from './budget-variance.service';
import { BudgetForecastingService } from './budget-forecasting.service';

describe('BudgetReportingService', () => {
  let service: BudgetReportingService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockBudgets = [
    {
      id: 'budget_1',
      name: 'Buget Operațional 2025',
      type: 'operational',
      status: 'active',
      totalAmount: 100000,
      allocatedAmount: 80000,
      spentAmount: 45000,
      remainingAmount: 35000,
      departmentName: 'IT',
      fiscalYear: '2025',
    },
    {
      id: 'budget_2',
      name: 'Buget Marketing 2025',
      type: 'operational',
      status: 'active',
      totalAmount: 50000,
      allocatedAmount: 50000,
      spentAmount: 30000,
      remainingAmount: 20000,
      departmentName: 'Marketing',
      fiscalYear: '2025',
    },
  ];

  const mockLineItems = [
    { id: 'li_1', categoryName: 'Software', subcategoryName: 'Licențe', plannedAmount: 20000 },
    { id: 'li_2', categoryName: 'Hardware', subcategoryName: 'Echipamente', plannedAmount: 30000 },
  ];

  const mockTransactions = [
    { id: 'tx_1', lineItemId: 'li_1', amount: 15000, status: 'posted', costCenterName: 'IT' },
    { id: 'tx_2', lineItemId: 'li_2', amount: 20000, status: 'posted', costCenterName: 'IT' },
  ];

  const mockVarianceAnalyses = [
    {
      id: 'va_1',
      budgetId: 'budget_1',
      budgetName: 'Buget Operațional',
      period: '2025-01',
      analysisDate: new Date(),
      summary: {
        totalPlanned: 50000,
        totalActual: 45000,
        totalVariance: 5000,
        variancePercentage: 10,
        varianceType: 'favorable',
      },
      lineItemVariances: [
        { category: 'Software', planned: 20000, actual: 15000, variance: 5000 },
      ],
      recommendations: ['Continuați tendința'],
    },
  ];

  const mockCommitments = [
    { id: 'c_1', reference: 'PO-001', type: 'purchase_order', description: 'Server', vendorName: 'Dell', amount: 10000, status: 'open', expectedDate: new Date(), actualAmount: 0, createdAt: new Date() },
  ];

  const mockTransfers = [
    { id: 't_1', fromBudgetId: 'budget_1', fromLineItemId: 'li_1', toBudgetId: 'budget_2', toLineItemId: 'li_3', amount: 5000, reason: 'Realocare', status: 'completed', createdAt: new Date(), approvedAt: new Date() },
  ];

  const mockBudgetPlanningService = {
    getBudgets: jest.fn().mockResolvedValue({ budgets: mockBudgets, total: 2 }),
    getLineItems: jest.fn().mockResolvedValue(mockLineItems),
    getBudgetStatistics: jest.fn().mockResolvedValue({
      totalBudgets: 2,
      totalAllocated: 130000,
      totalSpent: 75000,
      byStatus: { active: 2 },
    }),
  };

  const mockBudgetTrackingService = {
    getTransactions: jest.fn().mockResolvedValue(mockTransactions),
    getCommitments: jest.fn().mockResolvedValue(mockCommitments),
    getTransfers: jest.fn().mockResolvedValue(mockTransfers),
    getTrackingStatistics: jest.fn().mockResolvedValue({
      pendingApproval: 3,
      activeAlerts: 1,
    }),
  };

  const mockBudgetVarianceService = {
    getVarianceHistory: jest.fn().mockResolvedValue(mockVarianceAnalyses),
    getVarianceTrends: jest.fn().mockResolvedValue([
      { period: '2025-01', budgetName: 'Budget 1', variance: 5000, variancePercentage: 10, varianceType: 'favorable', trend: 'improving' },
      { period: '2025-02', budgetName: 'Budget 1', variance: 3000, variancePercentage: 6, varianceType: 'favorable', trend: 'improving' },
    ]),
  };

  const mockBudgetForecastingService = {};

  const createReportDefinitionData = {
    tenantId: 'tenant_123',
    name: 'Raport Buget Lunar',
    description: 'Raport cu situația bugetară lunară',
    type: 'budget_summary' as ReportType,
    filters: { fiscalYear: '2025' },
    createdBy: 'user_admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetReportingService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: BudgetPlanningService, useValue: mockBudgetPlanningService },
        { provide: BudgetTrackingService, useValue: mockBudgetTrackingService },
        { provide: BudgetVarianceService, useValue: mockBudgetVarianceService },
        { provide: BudgetForecastingService, useValue: mockBudgetForecastingService },
      ],
    }).compile();

    service = module.get<BudgetReportingService>(BudgetReportingService);
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
      expect(definition.id).toMatch(/^report-def-/);
      expect(definition.name).toBe('Raport Buget Lunar');
      expect(definition.tenantId).toBe('tenant_123');
    });

    it('should generate unique definition IDs', async () => {
      const def1 = await service.createReportDefinition(createReportDefinitionData);
      const def2 = await service.createReportDefinition(createReportDefinitionData);

      expect(def1.id).not.toBe(def2.id);
    });

    it('should set default values', async () => {
      const definition = await service.createReportDefinition(createReportDefinitionData);

      expect(definition.isActive).toBe(true);
      expect(definition.sortOrder).toBe('desc');
    });

    it('should emit report_definition_created event', async () => {
      await service.createReportDefinition(createReportDefinitionData);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'budget.report_definition_created',
        expect.any(Object)
      );
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

    it('should get report definitions by tenant', async () => {
      await service.createReportDefinition(createReportDefinitionData);
      await service.createReportDefinition(createReportDefinitionData);

      const definitions = await service.getReportDefinitions('tenant_123');

      expect(definitions.length).toBe(2);
    });

    it('should filter definitions by type', async () => {
      await service.createReportDefinition(createReportDefinitionData);
      await service.createReportDefinition({ ...createReportDefinitionData, type: 'variance_analysis' });

      const definitions = await service.getReportDefinitions('tenant_123', 'budget_summary');

      expect(definitions.every((d) => d.type === 'budget_summary')).toBe(true);
    });

    it('should update report definition', async () => {
      const definition = await service.createReportDefinition(createReportDefinitionData);
      const updated = await service.updateReportDefinition(definition.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');
    });

    it('should soft delete report definition', async () => {
      const definition = await service.createReportDefinition(createReportDefinitionData);
      await service.deleteReportDefinition(definition.id);

      const retrieved = await service.getReportDefinition(definition.id);
      expect(retrieved?.isActive).toBe(false);
    });
  });

  describe('Report Generation', () => {
    it('should generate budget summary report', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        filters: { fiscalYear: '2025' },
        generatedBy: 'user_123',
      });

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^report-/);
      expect(report.reportType).toBe('budget_summary');
    });

    it('should emit report_generated event', async () => {
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'budget.report_generated',
        expect.any(Object)
      );
    });

    it('should use definition if provided', async () => {
      const definition = await service.createReportDefinition(createReportDefinitionData);
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        definitionId: definition.id,
        generatedBy: 'user_123',
      });

      expect(report.reportName).toBe(definition.name);
    });

    it('should include metadata', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });

      expect(report.metadata).toBeDefined();
      expect(report.metadata.generationTime).toBeGreaterThanOrEqual(0);
      expect(report.metadata.dataAsOf).toBeDefined();
    });

    it('should set expiration date', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });

      expect(report.expiresAt).toBeDefined();
      expect(report.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate budget vs actual report', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_vs_actual',
        generatedBy: 'user_123',
      });

      expect(report.reportType).toBe('budget_vs_actual');
      expect(report.data.summary).toBeDefined();
    });

    it('should generate variance analysis report', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'variance_analysis',
        generatedBy: 'user_123',
      });

      expect(report.reportType).toBe('variance_analysis');
    });

    it('should generate spending by category report', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'spending_by_category',
        generatedBy: 'user_123',
      });

      expect(report.reportType).toBe('spending_by_category');
    });

    it('should generate spending by department report', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'spending_by_department',
        generatedBy: 'user_123',
      });

      expect(report.reportType).toBe('spending_by_department');
    });

    it('should generate trend analysis report', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'trend_analysis',
        generatedBy: 'user_123',
      });

      expect(report.reportType).toBe('trend_analysis');
    });

    it('should generate commitment report', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'commitment_report',
        generatedBy: 'user_123',
      });

      expect(report.reportType).toBe('commitment_report');
    });

    it('should generate transfer history report', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'transfer_history',
        generatedBy: 'user_123',
      });

      expect(report.reportType).toBe('transfer_history');
    });
  });

  describe('Report Formats', () => {
    it('should support JSON format', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        format: 'json',
        generatedBy: 'user_123',
      });

      expect(report.format).toBe('json');
    });

    it('should support CSV format', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        format: 'csv',
        generatedBy: 'user_123',
      });

      expect(report.format).toBe('csv');
    });

    it('should support Excel format', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        format: 'excel',
        generatedBy: 'user_123',
      });

      expect(report.format).toBe('excel');
    });

    it('should support PDF format', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        format: 'pdf',
        generatedBy: 'user_123',
      });

      expect(report.format).toBe('pdf');
    });
  });

  describe('Generated Reports Retrieval', () => {
    it('should get generated report by ID', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });

      const retrieved = await service.getGeneratedReport(report.id);
      expect(retrieved).toEqual(report);
    });

    it('should get generated reports by tenant', async () => {
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'variance_analysis',
        generatedBy: 'user_123',
      });

      const reports = await service.getGeneratedReports('tenant_123');
      expect(reports.length).toBe(2);
    });

    it('should limit generated reports', async () => {
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'variance_analysis',
        generatedBy: 'user_123',
      });

      const reports = await service.getGeneratedReports('tenant_123', 1);
      expect(reports.length).toBe(1);
    });

    it('should sort reports by generation date descending', async () => {
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'variance_analysis',
        generatedBy: 'user_123',
      });

      const reports = await service.getGeneratedReports('tenant_123');
      expect(reports[0].generatedAt.getTime()).toBeGreaterThanOrEqual(
        reports[1].generatedAt.getTime()
      );
    });
  });

  describe('Dashboards', () => {
    const createDashboardData = {
      tenantId: 'tenant_123',
      name: 'Dashboard Buget Principal',
      description: 'Dashboard cu KPI-uri bugetare',
      widgets: [
        {
          name: 'Total Buget',
          type: 'kpi' as const,
          config: { dataSource: 'budget' as const, metric: 'totalAllocated' },
          position: { x: 0, y: 0, width: 2, height: 1 },
          isActive: true,
        },
      ],
      createdBy: 'user_admin',
    };

    it('should create dashboard', async () => {
      const dashboard = await service.createDashboard(createDashboardData);

      expect(dashboard).toBeDefined();
      expect(dashboard.id).toMatch(/^dashboard-/);
      expect(dashboard.name).toBe('Dashboard Buget Principal');
    });

    it('should generate widget IDs', async () => {
      const dashboard = await service.createDashboard(createDashboardData);

      expect(dashboard.widgets[0].id).toMatch(/^widget-/);
    });

    it('should emit dashboard_created event', async () => {
      await service.createDashboard(createDashboardData);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'budget.dashboard_created',
        expect.any(Object)
      );
    });

    it('should get dashboard by ID', async () => {
      const created = await service.createDashboard(createDashboardData);
      const retrieved = await service.getDashboard(created.id);

      expect(retrieved).toEqual(created);
    });

    it('should get dashboards by tenant', async () => {
      await service.createDashboard(createDashboardData);
      await service.createDashboard({ ...createDashboardData, name: 'Dashboard 2' });

      const dashboards = await service.getDashboards('tenant_123');
      expect(dashboards.length).toBe(2);
    });

    it('should set default dashboard', async () => {
      const dashboard = await service.createDashboard({
        ...createDashboardData,
        isDefault: true,
      });

      expect(dashboard.isDefault).toBe(true);
    });

    it('should unset previous default when setting new default', async () => {
      const dashboard1 = await service.createDashboard({
        ...createDashboardData,
        isDefault: true,
      });
      await service.createDashboard({
        ...createDashboardData,
        name: 'Dashboard 2',
        isDefault: true,
      });

      const retrieved1 = await service.getDashboard(dashboard1.id);
      expect(retrieved1?.isDefault).toBe(false);
    });

    it('should update dashboard', async () => {
      const dashboard = await service.createDashboard(createDashboardData);
      const updated = await service.updateDashboard(dashboard.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete dashboard', async () => {
      const dashboard = await service.createDashboard(createDashboardData);
      await service.deleteDashboard(dashboard.id);

      const retrieved = await service.getDashboard(dashboard.id);
      expect(retrieved).toBeNull();
    });

    it('should get default dashboard', async () => {
      await service.createDashboard({ ...createDashboardData, isDefault: true });

      const defaultDashboard = await service.getDefaultDashboard('tenant_123');
      expect(defaultDashboard?.isDefault).toBe(true);
    });

    it('should filter dashboards by user access', async () => {
      await service.createDashboard({ ...createDashboardData, isShared: false });
      await service.createDashboard({ ...createDashboardData, name: 'Shared', isShared: true });

      const dashboards = await service.getDashboards('tenant_123', 'other_user');
      expect(dashboards.some((d) => d.isShared)).toBe(true);
    });
  });

  describe('KPI Metrics', () => {
    it('should get budget KPIs', async () => {
      const kpis = await service.getBudgetKPIs('tenant_123');

      expect(kpis).toBeDefined();
      expect(kpis.length).toBeGreaterThan(0);
    });

    it('should include total budgets KPI', async () => {
      const kpis = await service.getBudgetKPIs('tenant_123');

      expect(kpis.find((k) => k.name === 'Total Budgets')).toBeDefined();
    });

    it('should include total allocated KPI', async () => {
      const kpis = await service.getBudgetKPIs('tenant_123');
      const kpi = kpis.find((k) => k.name === 'Total Allocated');

      expect(kpi).toBeDefined();
      expect(kpi?.unit).toBe('RON');
    });

    it('should include utilization KPI', async () => {
      const kpis = await service.getBudgetKPIs('tenant_123');
      const kpi = kpis.find((k) => k.name === 'Overall Utilization');

      expect(kpi).toBeDefined();
      expect(kpi?.unit).toBe('%');
    });

    it('should include pending approval KPI', async () => {
      const kpis = await service.getBudgetKPIs('tenant_123');

      expect(kpis.find((k) => k.name === 'Pending Approval')).toBeDefined();
    });

    it('should set KPI status based on thresholds', async () => {
      const kpis = await service.getBudgetKPIs('tenant_123');

      kpis.forEach((kpi) => {
        expect(['good', 'warning', 'critical']).toContain(kpi.status);
      });
    });

    it('should set KPI trend', async () => {
      const kpis = await service.getBudgetKPIs('tenant_123');

      kpis.forEach((kpi) => {
        expect(['up', 'down', 'stable']).toContain(kpi.trend);
      });
    });
  });

  describe('Reporting Statistics', () => {
    it('should get reporting statistics', async () => {
      await service.createReportDefinition(createReportDefinitionData);
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });
      await service.createDashboard({
        tenantId: 'tenant_123',
        name: 'Dashboard',
        widgets: [],
        createdBy: 'user_123',
      });

      const stats = await service.getReportingStatistics('tenant_123');

      expect(stats.totalReportDefinitions).toBe(1);
      expect(stats.totalGeneratedReports).toBe(1);
      expect(stats.totalDashboards).toBe(1);
    });

    it('should count reports this month', async () => {
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });

      const stats = await service.getReportingStatistics('tenant_123');

      expect(stats.reportsThisMonth).toBeGreaterThan(0);
    });

    it('should track popular report types', async () => {
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });
      await service.generateReport({
        tenantId: 'tenant_123',
        type: 'variance_analysis',
        generatedBy: 'user_123',
      });

      const stats = await service.getReportingStatistics('tenant_123');

      expect(stats.popularReportTypes[0].type).toBe('budget_summary');
      expect(stats.popularReportTypes[0].count).toBe(2);
    });
  });

  describe('Report Filters', () => {
    it('should filter by budget IDs', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        filters: { budgetIds: ['budget_1'] },
        generatedBy: 'user_123',
      });

      expect(report.filters.budgetIds).toContain('budget_1');
    });

    it('should filter by fiscal year', async () => {
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        filters: { fiscalYear: '2025' },
        generatedBy: 'user_123',
      });

      expect(report.filters.fiscalYear).toBe('2025');
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'spending_by_category',
        filters: { startDate, endDate },
        generatedBy: 'user_123',
      });

      expect(report.filters.startDate).toEqual(startDate);
      expect(report.filters.endDate).toEqual(endDate);
    });
  });

  describe('Romanian Localization', () => {
    it('should support Romanian report names', async () => {
      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        name: 'Raport Financiar Lunar',
        description: 'Raport cu situația financiară',
      });

      expect(definition.name).toBe('Raport Financiar Lunar');
    });

    it('should support Romanian dashboard names', async () => {
      const dashboard = await service.createDashboard({
        tenantId: 'tenant_123',
        name: 'Tablou de Bord Principal',
        description: 'Dashboard cu indicatori',
        widgets: [],
        createdBy: 'user_123',
      });

      expect(dashboard.name).toBe('Tablou de Bord Principal');
    });

    it('should use RON currency in KPIs', async () => {
      const kpis = await service.getBudgetKPIs('tenant_123');
      const allocatedKpi = kpis.find((k) => k.name === 'Total Allocated');

      expect(allocatedKpi?.unit).toBe('RON');
    });
  });

  describe('Chart Configuration', () => {
    it('should support chart config in definition', async () => {
      const charts: ChartConfig[] = [
        { type: 'bar', title: 'Spending by Category', xAxis: 'category', yAxis: 'amount' },
      ];

      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        charts,
      });

      expect(definition.charts?.length).toBe(1);
      expect(definition.charts?.[0].type).toBe('bar');
    });

    it('should support multiple chart types', async () => {
      const charts: ChartConfig[] = [
        { type: 'bar', title: 'Bar Chart' },
        { type: 'line', title: 'Line Chart' },
        { type: 'pie', title: 'Pie Chart' },
      ];

      const definition = await service.createReportDefinition({
        ...createReportDefinitionData,
        charts,
      });

      expect(definition.charts?.length).toBe(3);
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

    it('should update updatedAt on definition update', async () => {
      const definition = await service.createReportDefinition(createReportDefinitionData);
      const originalUpdatedAt = definition.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.updateReportDefinition(definition.id, { name: 'Updated' });

      const updated = await service.getReportDefinition(definition.id);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should set generatedAt on report generation', async () => {
      const before = new Date();
      const report = await service.generateReport({
        tenantId: 'tenant_123',
        type: 'budget_summary',
        generatedBy: 'user_123',
      });
      const after = new Date();

      expect(report.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(report.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
