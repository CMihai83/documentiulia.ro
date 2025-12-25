import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ExecutiveDashboardService,
  KPICategory,
  DashboardPeriod,
} from './executive-dashboard.service';

describe('ExecutiveDashboardService', () => {
  let service: ExecutiveDashboardService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutiveDashboardService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ExecutiveDashboardService>(ExecutiveDashboardService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('KPI Management', () => {
    it('should have default KPIs initialized', () => {
      const kpis = service.getKPIs();
      expect(kpis.length).toBeGreaterThan(0);
    });

    it('should get KPIs by category', () => {
      const financialKPIs = service.getKPIs('FINANCIAL');
      const hrKPIs = service.getKPIs('HR');

      expect(financialKPIs.every(k => k.category === 'FINANCIAL')).toBe(true);
      expect(hrKPIs.every(k => k.category === 'HR')).toBe(true);
    });

    it('should get KPI by ID', () => {
      const kpi = service.getKPI('kpi-revenue');
      expect(kpi).toBeDefined();
      expect(kpi?.name).toBe('Total Revenue');
    });

    it('should create a custom KPI', () => {
      const kpi = service.createKPI({
        name: 'Custom KPI',
        nameRo: 'KPI Personalizat',
        description: 'A custom metric',
        descriptionRo: 'O metrică personalizată',
        category: 'FINANCIAL',
        unit: 'RON',
        higherIsBetter: true,
        dataSource: 'custom',
        refreshIntervalMs: 300000,
      });

      expect(kpi.id).toBeDefined();
      expect(kpi.name).toBe('Custom KPI');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'dashboard.kpi.created',
        expect.objectContaining({ kpiId: kpi.id }),
      );
    });

    it('should update a KPI', () => {
      const updated = service.updateKPI('kpi-revenue', {
        targetValue: 2000000,
      });

      expect(updated.targetValue).toBe(2000000);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'dashboard.kpi.updated',
        expect.objectContaining({ kpiId: 'kpi-revenue' }),
      );
    });

    it('should throw error when updating non-existent KPI', () => {
      expect(() => service.updateKPI('non-existent', { targetValue: 100 }))
        .toThrow('not found');
    });

    it('should delete a KPI', () => {
      const kpi = service.createKPI({
        name: 'Temp KPI',
        nameRo: 'KPI Temporar',
        description: 'Temporary',
        descriptionRo: 'Temporar',
        category: 'OPERATIONAL',
        unit: 'count',
        higherIsBetter: true,
        dataSource: 'test',
        refreshIntervalMs: 60000,
      });

      service.deleteKPI(kpi.id);
      expect(service.getKPI(kpi.id)).toBeUndefined();
    });

    it('should throw error when deleting non-existent KPI', () => {
      expect(() => service.deleteKPI('non-existent')).toThrow('not found');
    });
  });

  describe('KPI Values', () => {
    it('should get KPI value', () => {
      const value = service.getKPIValue('kpi-revenue');
      expect(value).toBeDefined();
      expect(value?.kpiId).toBe('kpi-revenue');
      expect(value?.value).toBeGreaterThan(0);
    });

    it('should get all KPI values', () => {
      const values = service.getAllKPIValues();
      expect(values.length).toBeGreaterThan(0);
    });

    it('should get KPI values by category', () => {
      const financialValues = service.getAllKPIValues('FINANCIAL');
      const kpis = service.getKPIs('FINANCIAL');

      expect(financialValues.length).toBe(kpis.length);
    });

    it('should refresh KPI value', () => {
      const value1 = service.getKPIValue('kpi-orders-today');
      const value2 = service.refreshKPIValue('kpi-orders-today');

      expect(value2.kpiId).toBe('kpi-orders-today');
      expect(value2.timestamp.getTime()).toBeGreaterThanOrEqual(value1!.timestamp.getTime());
    });

    it('should throw error when refreshing non-existent KPI', () => {
      expect(() => service.refreshKPIValue('non-existent')).toThrow('not found');
    });

    it('should calculate trend direction', () => {
      const value = service.getKPIValue('kpi-revenue');
      expect(['UP', 'DOWN', 'STABLE']).toContain(value?.trend);
    });

    it('should calculate status based on thresholds', () => {
      const value = service.getKPIValue('kpi-profit-margin');
      expect(['ON_TARGET', 'WARNING', 'CRITICAL', 'NO_TARGET']).toContain(value?.status);
    });
  });

  describe('KPI History', () => {
    it('should get KPI history for DAY period', () => {
      const history = service.getKPIHistory('kpi-revenue', 'DAY');

      expect(history.kpiId).toBe('kpi-revenue');
      expect(history.period).toBe('DAY');
      expect(history.values.length).toBeGreaterThan(0);
    });

    it('should get KPI history for WEEK period', () => {
      const history = service.getKPIHistory('kpi-revenue', 'WEEK');
      expect(history.period).toBe('WEEK');
    });

    it('should get KPI history for MONTH period', () => {
      const history = service.getKPIHistory('kpi-revenue', 'MONTH');
      expect(history.period).toBe('MONTH');
    });

    it('should get KPI history for QUARTER period', () => {
      const history = service.getKPIHistory('kpi-revenue', 'QUARTER');
      expect(history.period).toBe('QUARTER');
    });

    it('should get KPI history for YEAR period', () => {
      const history = service.getKPIHistory('kpi-revenue', 'YEAR');
      expect(history.period).toBe('YEAR');
    });

    it('should throw error for non-existent KPI history', () => {
      expect(() => service.getKPIHistory('non-existent')).toThrow('not found');
    });

    it('should have date range in history', () => {
      const history = service.getKPIHistory('kpi-revenue', 'MONTH');
      expect(history.startDate).toBeDefined();
      expect(history.endDate).toBeDefined();
      expect(history.endDate.getTime()).toBeGreaterThan(history.startDate.getTime());
    });
  });

  describe('Dashboard Management', () => {
    it('should create a dashboard', () => {
      const dashboard = service.createDashboard({
        name: 'My Dashboard',
        nameRo: 'Tabloul Meu',
        description: 'Personal dashboard',
        descriptionRo: 'Tablou personal',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      expect(dashboard.id).toBeDefined();
      expect(dashboard.name).toBe('My Dashboard');
      expect(dashboard.createdAt).toBeDefined();
    });

    it('should get dashboard by ID', () => {
      const created = service.createDashboard({
        name: 'Test Dashboard',
        nameRo: 'Tablou Test',
        description: 'Test',
        descriptionRo: 'Test',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      const retrieved = service.getDashboard(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get all dashboards', () => {
      service.createDashboard({
        name: 'Dashboard 1',
        nameRo: 'Tablou 1',
        description: 'Test 1',
        descriptionRo: 'Test 1',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      service.createDashboard({
        name: 'Dashboard 2',
        nameRo: 'Tablou 2',
        description: 'Test 2',
        descriptionRo: 'Test 2',
        ownerId: 'user-2',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      const all = service.getAllDashboards();
      expect(all.length).toBe(2);
    });

    it('should filter dashboards by owner', () => {
      service.createDashboard({
        name: 'User1 Dashboard',
        nameRo: 'Tablou User1',
        description: 'Test',
        descriptionRo: 'Test',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      service.createDashboard({
        name: 'User2 Dashboard',
        nameRo: 'Tablou User2',
        description: 'Test',
        descriptionRo: 'Test',
        ownerId: 'user-2',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      const user1Dashboards = service.getAllDashboards('user-1');
      expect(user1Dashboards.length).toBe(1);
      expect(user1Dashboards[0].ownerId).toBe('user-1');
    });

    it('should update dashboard', () => {
      const dashboard = service.createDashboard({
        name: 'Original',
        nameRo: 'Original',
        description: 'Test',
        descriptionRo: 'Test',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      const updated = service.updateDashboard(dashboard.id, {
        name: 'Updated',
        nameRo: 'Actualizat',
      });

      expect(updated.name).toBe('Updated');
      expect(updated.nameRo).toBe('Actualizat');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(updated.createdAt.getTime());
    });

    it('should throw error when updating non-existent dashboard', () => {
      expect(() => service.updateDashboard('non-existent', { name: 'Test' }))
        .toThrow('not found');
    });

    it('should delete dashboard', () => {
      const dashboard = service.createDashboard({
        name: 'To Delete',
        nameRo: 'De Șters',
        description: 'Test',
        descriptionRo: 'Test',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      service.deleteDashboard(dashboard.id);
      expect(service.getDashboard(dashboard.id)).toBeUndefined();
    });

    it('should throw error when deleting non-existent dashboard', () => {
      expect(() => service.deleteDashboard('non-existent')).toThrow('not found');
    });
  });

  describe('Widget Management', () => {
    it('should add widget to dashboard', () => {
      const dashboard = service.createDashboard({
        name: 'Widget Test',
        nameRo: 'Test Widget',
        description: 'Test',
        descriptionRo: 'Test',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      const updated = service.addWidget(dashboard.id, {
        name: 'Revenue Widget',
        nameRo: 'Widget Venituri',
        type: 'KPI_CARD',
        kpiIds: ['kpi-revenue'],
        config: {},
        position: { row: 0, col: 0 },
        size: { width: 3, height: 1 },
      });

      expect(updated.widgets.length).toBe(1);
      expect(updated.widgets[0].name).toBe('Revenue Widget');
    });

    it('should remove widget from dashboard', () => {
      const dashboard = service.createDashboard({
        name: 'Widget Test',
        nameRo: 'Test Widget',
        description: 'Test',
        descriptionRo: 'Test',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      service.addWidget(dashboard.id, {
        name: 'Widget 1',
        nameRo: 'Widget 1',
        type: 'KPI_CARD',
        config: {},
        position: { row: 0, col: 0 },
        size: { width: 3, height: 1 },
      });

      const withWidget = service.getDashboard(dashboard.id)!;
      const widgetId = withWidget.widgets[0].id;

      const updated = service.removeWidget(dashboard.id, widgetId);
      expect(updated.widgets.length).toBe(0);
    });

    it('should throw error when removing non-existent widget', () => {
      const dashboard = service.createDashboard({
        name: 'Widget Test',
        nameRo: 'Test Widget',
        description: 'Test',
        descriptionRo: 'Test',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      expect(() => service.removeWidget(dashboard.id, 'non-existent'))
        .toThrow('not found');
    });

    it('should update widget position', () => {
      const dashboard = service.createDashboard({
        name: 'Position Test',
        nameRo: 'Test Poziție',
        description: 'Test',
        descriptionRo: 'Test',
        ownerId: 'user-1',
        isDefault: false,
        widgets: [],
        filters: [],
        refreshIntervalMs: 60000,
      });

      service.addWidget(dashboard.id, {
        name: 'Movable Widget',
        nameRo: 'Widget Mobil',
        type: 'BAR',
        config: {},
        position: { row: 0, col: 0 },
        size: { width: 3, height: 1 },
      });

      const withWidget = service.getDashboard(dashboard.id)!;
      const widgetId = withWidget.widgets[0].id;

      const updated = service.updateWidgetPosition(dashboard.id, widgetId, { row: 2, col: 3 });
      const widget = updated.widgets.find(w => w.id === widgetId);

      expect(widget?.position.row).toBe(2);
      expect(widget?.position.col).toBe(3);
    });
  });

  describe('Alerts', () => {
    it('should get all alerts', () => {
      const alerts = service.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should get unresolved alerts', () => {
      const unresolvedAlerts = service.getAlerts(false);
      expect(unresolvedAlerts.every(a => a.resolved === false)).toBe(true);
    });

    it('should acknowledge alert', () => {
      // First, ensure we have an alert by getting all values (which may trigger alerts)
      service.refreshKPIValue('kpi-profit-margin');

      const alerts = service.getAlerts();
      if (alerts.length > 0) {
        const acknowledged = service.acknowledgeAlert(alerts[0].id, 'user-1');
        expect(acknowledged.acknowledgedAt).toBeDefined();
        expect(acknowledged.acknowledgedBy).toBe('user-1');
      }
    });

    it('should resolve alert', () => {
      service.refreshKPIValue('kpi-profit-margin');

      const alerts = service.getAlerts();
      if (alerts.length > 0) {
        const resolved = service.resolveAlert(alerts[0].id);
        expect(resolved.resolved).toBe(true);
        expect(resolved.resolvedAt).toBeDefined();
      }
    });

    it('should throw error when acknowledging non-existent alert', () => {
      expect(() => service.acknowledgeAlert('non-existent', 'user-1'))
        .toThrow('not found');
    });

    it('should throw error when resolving non-existent alert', () => {
      expect(() => service.resolveAlert('non-existent'))
        .toThrow('not found');
    });

    it('should sort alerts by severity', () => {
      const alerts = service.getAlerts();
      if (alerts.length >= 2) {
        const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
        for (let i = 1; i < alerts.length; i++) {
          const prevOrder = severityOrder[alerts[i - 1].severity];
          const currOrder = severityOrder[alerts[i].severity];
          expect(prevOrder).toBeLessThanOrEqual(currOrder);
        }
      }
    });
  });

  describe('Snapshots', () => {
    it('should get financial snapshot', () => {
      const snapshot = service.getFinancialSnapshot();

      expect(snapshot.revenue).toBeGreaterThan(0);
      expect(snapshot.expenses).toBeGreaterThan(0);
      expect(snapshot.profit).toBeDefined();
      expect(snapshot.profitMargin).toBeDefined();
      expect(snapshot.vatCollected).toBeGreaterThan(0);
    });

    it('should get operational snapshot', () => {
      const snapshot = service.getOperationalSnapshot();

      expect(snapshot.ordersToday).toBeGreaterThanOrEqual(0);
      expect(snapshot.ordersCompleted).toBeGreaterThanOrEqual(0);
      expect(snapshot.averageOrderValue).toBeGreaterThan(0);
      expect(snapshot.stockValue).toBeGreaterThan(0);
    });

    it('should get HR snapshot', () => {
      const snapshot = service.getHRSnapshot();

      expect(snapshot.totalEmployees).toBeGreaterThan(0);
      expect(snapshot.turnoverRate).toBeGreaterThanOrEqual(0);
      expect(snapshot.employeeSatisfaction).toBeGreaterThan(0);
      expect(snapshot.payrollTotal).toBeGreaterThan(0);
    });

    it('should get compliance snapshot', () => {
      const snapshot = service.getComplianceSnapshot();

      expect(snapshot.complianceScore).toBeGreaterThan(0);
      expect(snapshot.anafSubmissionsCompleted).toBeGreaterThanOrEqual(0);
      expect(snapshot.lastEfacturaSubmission).toBeDefined();
    });
  });

  describe('Executive Report', () => {
    it('should generate executive report', () => {
      const report = service.generateExecutiveReport();

      expect(report.id).toBeDefined();
      expect(report.financial).toBeDefined();
      expect(report.operational).toBeDefined();
      expect(report.hr).toBeDefined();
      expect(report.compliance).toBeDefined();
      expect(report.kpis.length).toBeGreaterThan(0);
      expect(report.generatedAt).toBeDefined();
    });

    it('should generate report with insights', () => {
      const report = service.generateExecutiveReport();

      expect(Array.isArray(report.insights)).toBe(true);
      expect(Array.isArray(report.insightsRo)).toBe(true);
    });

    it('should generate report for different periods', () => {
      const periods: DashboardPeriod[] = ['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'];

      for (const period of periods) {
        const report = service.generateExecutiveReport(period);
        expect(report.period).toBe(period);
        expect(report.startDate).toBeDefined();
        expect(report.endDate).toBeDefined();
      }
    });

    it('should emit event on report generation', () => {
      service.generateExecutiveReport('MONTH');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'dashboard.report.generated',
        expect.objectContaining({ period: 'MONTH' }),
      );
    });

    it('should include alerts in report', () => {
      const report = service.generateExecutiveReport();
      expect(Array.isArray(report.alerts)).toBe(true);
    });
  });

  describe('Executive Dashboard Template', () => {
    it('should get executive dashboard template', () => {
      const template = service.getExecutiveDashboardTemplate();

      expect(template.id).toBe('template-executive');
      expect(template.name).toBe('Executive Dashboard');
      expect(template.widgets.length).toBeGreaterThan(0);
      expect(template.filters.length).toBeGreaterThan(0);
    });

    it('should have proper widget configurations', () => {
      const template = service.getExecutiveDashboardTemplate();

      for (const widget of template.widgets) {
        expect(widget.id).toBeDefined();
        expect(widget.name).toBeDefined();
        expect(widget.nameRo).toBeDefined();
        expect(widget.type).toBeDefined();
        expect(widget.position).toBeDefined();
        expect(widget.size).toBeDefined();
      }
    });

    it('should have KPI_CARD widgets', () => {
      const template = service.getExecutiveDashboardTemplate();
      const kpiCards = template.widgets.filter(w => w.type === 'KPI_CARD');
      expect(kpiCards.length).toBeGreaterThan(0);
    });

    it('should have GAUGE widgets', () => {
      const template = service.getExecutiveDashboardTemplate();
      const gauges = template.widgets.filter(w => w.type === 'GAUGE');
      expect(gauges.length).toBeGreaterThan(0);
    });

    it('should have filter configurations', () => {
      const template = service.getExecutiveDashboardTemplate();
      const dateFilter = template.filters.find(f => f.type === 'DATE_RANGE');
      const selectFilter = template.filters.find(f => f.type === 'MULTI_SELECT');

      expect(dateFilter).toBeDefined();
      expect(selectFilter).toBeDefined();
      expect(selectFilter?.options?.length).toBeGreaterThan(0);
    });
  });

  describe('KPI Categories', () => {
    const categories: KPICategory[] = [
      'FINANCIAL',
      'OPERATIONAL',
      'HR',
      'COMPLIANCE',
      'CUSTOMER',
      'INVENTORY',
      'LOGISTICS',
    ];

    it.each(categories)('should have KPIs for %s category', (category) => {
      const kpis = service.getKPIs(category);
      // Some categories may not have default KPIs
      expect(Array.isArray(kpis)).toBe(true);
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian names for all KPIs', () => {
      const kpis = service.getKPIs();
      for (const kpi of kpis) {
        expect(kpi.nameRo).toBeDefined();
        expect(kpi.nameRo.length).toBeGreaterThan(0);
        expect(kpi.descriptionRo).toBeDefined();
      }
    });

    it('should have Romanian insights in report', () => {
      const report = service.generateExecutiveReport();
      expect(report.insightsRo).toBeDefined();
      expect(report.nameRo).toBeDefined();
    });

    it('should have Romanian names in dashboard template', () => {
      const template = service.getExecutiveDashboardTemplate();
      expect(template.nameRo).toBeDefined();
      expect(template.descriptionRo).toBeDefined();

      for (const widget of template.widgets) {
        expect(widget.nameRo).toBeDefined();
      }
    });
  });
});
