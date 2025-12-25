import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AnalyticsDashboardService,
  MetricType,
  WidgetType,
  TimeGranularity,
} from './analytics-dashboard.service';

describe('AnalyticsDashboardService', () => {
  let service: AnalyticsDashboardService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsDashboardService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<AnalyticsDashboardService>(AnalyticsDashboardService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('Default Initialization', () => {
    it('should have default metrics', async () => {
      const metrics = await service.listMetrics();

      expect(metrics.length).toBeGreaterThanOrEqual(5);
    });

    it('should have revenue metric', async () => {
      const metric = await service.getMetric('metric-revenue');

      expect(metric).toBeDefined();
      expect(metric!.type).toBe('REVENUE');
      expect(metric!.nameRo).toBe('Venituri Totale');
    });

    it('should have default KPIs', async () => {
      const kpis = await service.listKPIs();

      expect(kpis.length).toBeGreaterThanOrEqual(3);
    });

    it('should have default dashboard', async () => {
      const dashboard = await service.getDefaultDashboard();

      expect(dashboard).toBeDefined();
      expect(dashboard!.isDefault).toBe(true);
      expect(dashboard!.widgets.length).toBeGreaterThan(0);
    });
  });

  describe('Metric Management', () => {
    it('should create metric', async () => {
      const metric = await service.createMetric(
        'New Metric',
        'Metrică Nouă',
        'CUSTOM',
        1000,
        'units',
        'unități',
      );

      expect(metric.id).toBeDefined();
      expect(metric.name).toBe('New Metric');
      expect(metric.nameRo).toBe('Metrică Nouă');
      expect(metric.value).toBe(1000);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'metric.created',
        expect.objectContaining({ metricId: metric.id }),
      );
    });

    it('should calculate trend on creation', async () => {
      const metric = await service.createMetric('Test', 'Test', 'REVENUE', 100, 'RON', 'RON', {
        previousValue: 80,
      });

      expect(metric.trend).toBe('UP');
      expect(metric.change).toBe(20);
      expect(metric.changePercent).toBe(25);
    });

    it('should detect downward trend', async () => {
      const metric = await service.createMetric('Test', 'Test', 'EXPENSES', 80, 'RON', 'RON', {
        previousValue: 100,
      });

      expect(metric.trend).toBe('DOWN');
      expect(metric.change).toBe(-20);
    });

    it('should detect stable trend', async () => {
      const metric = await service.createMetric('Test', 'Test', 'PROFIT', 100, 'RON', 'RON', {
        previousValue: 100,
      });

      expect(metric.trend).toBe('STABLE');
      expect(metric.change).toBe(0);
    });

    it('should get metric by id', async () => {
      const created = await service.createMetric('Test', 'Test', 'CUSTOM', 500, 'u', 'u');
      const metric = await service.getMetric(created.id);

      expect(metric).toBeDefined();
      expect(metric!.id).toBe(created.id);
    });

    it('should filter metrics by type', async () => {
      const metrics = await service.listMetrics('REVENUE');

      expect(metrics.every((m) => m.type === 'REVENUE')).toBe(true);
    });

    it('should update metric value', async () => {
      const metric = await service.createMetric('Test', 'Test', 'CUSTOM', 100, 'u', 'u');
      const updated = await service.updateMetricValue(metric.id, 150);

      expect(updated.value).toBe(150);
      expect(updated.previousValue).toBe(100);
      expect(updated.trend).toBe('UP');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'metric.updated',
        expect.objectContaining({ metricId: metric.id }),
      );
    });

    it('should throw error when updating non-existent metric', async () => {
      await expect(service.updateMetricValue('invalid-id', 100)).rejects.toThrow('Metric not found');
    });

    it('should delete metric', async () => {
      const metric = await service.createMetric('Delete Me', 'Delete Me', 'CUSTOM', 100, 'u', 'u');

      const result = await service.deleteMetric(metric.id);

      expect(result).toBe(true);
      const deleted = await service.getMetric(metric.id);
      expect(deleted).toBeUndefined();
    });
  });

  describe('Time Series', () => {
    it('should create time series', async () => {
      const dataPoints = [
        { timestamp: new Date('2024-01-01'), value: 100 },
        { timestamp: new Date('2024-01-02'), value: 120 },
      ];

      const series = await service.createTimeSeries(
        'Daily Revenue',
        'Venituri Zilnice',
        'REVENUE',
        'DAY',
        dataPoints,
      );

      expect(series.id).toBeDefined();
      expect(series.dataPoints).toHaveLength(2);
    });

    it('should get time series by id', async () => {
      const dataPoints = [{ timestamp: new Date(), value: 100 }];
      const created = await service.createTimeSeries('Test', 'Test', 'REVENUE', 'DAY', dataPoints);

      const series = await service.getTimeSeries(created.id);

      expect(series).toBeDefined();
      expect(series!.id).toBe(created.id);
    });

    it('should add data point to series', async () => {
      const series = await service.createTimeSeries('Test', 'Test', 'REVENUE', 'DAY', []);

      const updated = await service.addDataPoint(series.id, {
        timestamp: new Date(),
        value: 200,
      });

      expect(updated.dataPoints).toHaveLength(1);
    });

    it('should generate time series data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');

      const dataPoints = await service.getTimeSeriesData('REVENUE', 'DAY', startDate, endDate);

      expect(dataPoints.length).toBeGreaterThan(0);
      expect(dataPoints[0].timestamp).toBeDefined();
      expect(dataPoints[0].value).toBeDefined();
    });

    it('should generate hourly data', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

      const dataPoints = await service.getTimeSeriesData('EXPENSES', 'HOUR', startDate, endDate);

      expect(dataPoints.length).toBeGreaterThanOrEqual(24);
    });
  });

  describe('Widget Management', () => {
    it('should create widget', async () => {
      const widget = await service.createWidget(
        'Revenue Card',
        'Card Venituri',
        'KPI_CARD',
        ['metric-revenue'],
        'user-1',
      );

      expect(widget.id).toBeDefined();
      expect(widget.name).toBe('Revenue Card');
      expect(widget.nameRo).toBe('Card Venituri');
      expect(widget.type).toBe('KPI_CARD');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'widget.created',
        expect.objectContaining({ widgetId: widget.id }),
      );
    });

    it('should create widget with config', async () => {
      const widget = await service.createWidget(
        'Chart',
        'Grafic',
        'LINE_CHART',
        ['metric-revenue'],
        'user-1',
        {
          config: { showLegend: true, colors: ['#ff0000'] },
          position: { x: 0, y: 0, width: 6, height: 4 },
        },
      );

      expect(widget.config.showLegend).toBe(true);
      expect(widget.config.colors).toContain('#ff0000');
      expect(widget.position.width).toBe(6);
    });

    it('should get widget by id', async () => {
      const created = await service.createWidget('Test', 'Test', 'TABLE', [], 'user-1');
      const widget = await service.getWidget(created.id);

      expect(widget).toBeDefined();
      expect(widget!.id).toBe(created.id);
    });

    it('should list widgets', async () => {
      await service.createWidget('Widget 1', 'Widget 1', 'KPI_CARD', [], 'user-1');
      await service.createWidget('Widget 2', 'Widget 2', 'BAR_CHART', [], 'user-1');

      const widgets = await service.listWidgets();

      expect(widgets.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter widgets by type', async () => {
      await service.createWidget('KPI', 'KPI', 'KPI_CARD', [], 'user-1');
      await service.createWidget('Chart', 'Grafic', 'LINE_CHART', [], 'user-1');

      const widgets = await service.listWidgets('KPI_CARD');

      expect(widgets.every((w) => w.type === 'KPI_CARD')).toBe(true);
    });

    it('should update widget', async () => {
      const widget = await service.createWidget('Test', 'Test', 'TABLE', [], 'user-1');

      const updated = await service.updateWidget(widget.id, {
        name: 'Updated Widget',
        config: { showLabels: true },
      });

      expect(updated.name).toBe('Updated Widget');
      expect(updated.config.showLabels).toBe(true);
    });

    it('should throw error when updating non-existent widget', async () => {
      await expect(service.updateWidget('invalid-id', {})).rejects.toThrow('Widget not found');
    });

    it('should soft delete widget', async () => {
      const widget = await service.createWidget('Delete Me', 'Delete Me', 'GAUGE', [], 'user-1');

      const result = await service.deleteWidget(widget.id);

      expect(result).toBe(true);
      const deleted = await service.getWidget(widget.id);
      expect(deleted!.isActive).toBe(false);
    });

    it('should get widget data with metrics', async () => {
      const widget = await service.createWidget('Revenue', 'Venituri', 'KPI_CARD', ['metric-revenue'], 'user-1');

      const data = await service.getWidgetData(widget.id);

      expect(data.widget).toBeDefined();
      expect(data.metrics).toHaveLength(1);
      expect(data.metrics[0].type).toBe('REVENUE');
    });

    it('should get widget data with time series for charts', async () => {
      const widget = await service.createWidget('Chart', 'Grafic', 'LINE_CHART', ['metric-revenue'], 'user-1');

      const data = await service.getWidgetData(widget.id);

      expect(data.timeSeries).toBeDefined();
      expect(data.timeSeries!.length).toBeGreaterThan(0);
    });
  });

  describe('Dashboard Management', () => {
    it('should create dashboard', async () => {
      const dashboard = await service.createDashboard('New Dashboard', 'Panou Nou', 'user-1');

      expect(dashboard.id).toBeDefined();
      expect(dashboard.name).toBe('New Dashboard');
      expect(dashboard.nameRo).toBe('Panou Nou');
      expect(dashboard.isDefault).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'dashboard.created',
        expect.objectContaining({ dashboardId: dashboard.id }),
      );
    });

    it('should create dashboard with widgets', async () => {
      const widget = await service.createWidget('Test', 'Test', 'TABLE', [], 'user-1');
      const dashboard = await service.createDashboard('With Widgets', 'Cu Widgeturi', 'user-1', {
        widgets: [widget.id],
      });

      expect(dashboard.widgets).toContain(widget.id);
    });

    it('should get dashboard by id', async () => {
      const created = await service.createDashboard('Test', 'Test', 'user-1');
      const dashboard = await service.getDashboard(created.id);

      expect(dashboard).toBeDefined();
      expect(dashboard!.id).toBe(created.id);
    });

    it('should get default dashboard', async () => {
      const dashboard = await service.getDefaultDashboard();

      expect(dashboard).toBeDefined();
      expect(dashboard!.isDefault).toBe(true);
    });

    it('should list dashboards', async () => {
      await service.createDashboard('Dashboard 1', 'Panou 1', 'user-1');
      await service.createDashboard('Dashboard 2', 'Panou 2', 'user-1');

      const dashboards = await service.listDashboards();

      expect(dashboards.length).toBeGreaterThanOrEqual(3); // 2 new + default
    });

    it('should filter dashboards by creator', async () => {
      await service.createDashboard('User 1', 'User 1', 'user-1');
      await service.createDashboard('User 2', 'User 2', 'user-2');

      const dashboards = await service.listDashboards({ createdBy: 'user-1' });

      expect(dashboards.every((d) => d.createdBy === 'user-1')).toBe(true);
    });

    it('should update dashboard', async () => {
      const dashboard = await service.createDashboard('Test', 'Test', 'user-1');

      const updated = await service.updateDashboard(dashboard.id, {
        name: 'Updated Dashboard',
        isPublic: true,
      });

      expect(updated.name).toBe('Updated Dashboard');
      expect(updated.isPublic).toBe(true);
    });

    it('should throw error when updating non-existent dashboard', async () => {
      await expect(service.updateDashboard('invalid-id', {})).rejects.toThrow('Dashboard not found');
    });

    it('should add widget to dashboard', async () => {
      const dashboard = await service.createDashboard('Test', 'Test', 'user-1');
      const widget = await service.createWidget('New Widget', 'Widget Nou', 'TABLE', [], 'user-1');

      const updated = await service.addWidgetToDashboard(dashboard.id, widget.id);

      expect(updated.widgets).toContain(widget.id);
    });

    it('should remove widget from dashboard', async () => {
      const widget = await service.createWidget('To Remove', 'De Șters', 'TABLE', [], 'user-1');
      const dashboard = await service.createDashboard('Test', 'Test', 'user-1', {
        widgets: [widget.id],
      });

      const updated = await service.removeWidgetFromDashboard(dashboard.id, widget.id);

      expect(updated.widgets).not.toContain(widget.id);
    });

    it('should delete dashboard', async () => {
      const dashboard = await service.createDashboard('Delete Me', 'Delete Me', 'user-1');

      const result = await service.deleteDashboard(dashboard.id);

      expect(result).toBe(true);
      const deleted = await service.getDashboard(dashboard.id);
      expect(deleted).toBeUndefined();
    });

    it('should not delete default dashboard', async () => {
      const defaultDashboard = await service.getDefaultDashboard();

      await expect(service.deleteDashboard(defaultDashboard!.id)).rejects.toThrow(
        'Cannot delete default dashboard',
      );
    });
  });

  describe('KPI Management', () => {
    it('should create KPI', async () => {
      const kpi = await service.createKPI(
        'Sales Target',
        'Obiectiv Vânzări',
        'Sales',
        'Vânzări',
        80000,
        100000,
        'Q4 2024',
        'T4 2024',
      );

      expect(kpi.id).toBeDefined();
      expect(kpi.achievement).toBe(80);
      expect(kpi.status).toBe('AT_RISK');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'kpi.created',
        expect.objectContaining({ kpiId: kpi.id }),
      );
    });

    it('should set ON_TRACK status for high achievement', async () => {
      const kpi = await service.createKPI('Test', 'Test', 'Cat', 'Cat', 95, 100, 'Q1', 'T1');

      expect(kpi.status).toBe('ON_TRACK');
    });

    it('should set OFF_TRACK status for low achievement', async () => {
      const kpi = await service.createKPI('Test', 'Test', 'Cat', 'Cat', 50, 100, 'Q1', 'T1');

      expect(kpi.status).toBe('OFF_TRACK');
    });

    it('should get KPI by id', async () => {
      const created = await service.createKPI('Test', 'Test', 'Cat', 'Cat', 80, 100, 'Q1', 'T1');
      const kpi = await service.getKPI(created.id);

      expect(kpi).toBeDefined();
      expect(kpi!.id).toBe(created.id);
    });

    it('should list KPIs', async () => {
      await service.createKPI('KPI 1', 'KPI 1', 'Cat', 'Cat', 80, 100, 'Q1', 'T1');
      await service.createKPI('KPI 2', 'KPI 2', 'Cat', 'Cat', 90, 100, 'Q1', 'T1');

      const kpis = await service.listKPIs();

      expect(kpis.length).toBeGreaterThanOrEqual(5); // 2 new + 3 default
    });

    it('should filter KPIs by category', async () => {
      const kpis = await service.listKPIs('Financial');

      expect(kpis.every((k) => k.category === 'Financial')).toBe(true);
    });

    it('should update KPI value', async () => {
      const kpi = await service.createKPI('Test', 'Test', 'Cat', 'Cat', 50, 100, 'Q1', 'T1');

      const updated = await service.updateKPIValue(kpi.id, 95);

      expect(updated.current).toBe(95);
      expect(updated.achievement).toBe(95);
      expect(updated.status).toBe('ON_TRACK');
      expect(updated.trend).toBe('UP');
    });

    it('should throw error when updating non-existent KPI', async () => {
      await expect(service.updateKPIValue('invalid-id', 100)).rejects.toThrow('KPI not found');
    });
  });

  describe('Analytics Queries', () => {
    it('should execute query', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await service.executeQuery({
        metrics: ['REVENUE', 'EXPENSES'],
        granularity: 'DAY',
        startDate,
        endDate,
      });

      expect(result.data).toHaveLength(2);
      expect(result.summary).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('should calculate summary statistics', async () => {
      const result = await service.executeQuery({
        metrics: ['REVENUE'],
        granularity: 'DAY',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
      });

      expect(result.summary.REVENUE_sum).toBeDefined();
      expect(result.summary.REVENUE_avg).toBeDefined();
      expect(result.summary.REVENUE_min).toBeDefined();
      expect(result.summary.REVENUE_max).toBeDefined();
    });
  });

  describe('Financial Summary', () => {
    it('should get financial summary', async () => {
      const summary = await service.getFinancialSummary();

      expect(summary.revenue).toBeDefined();
      expect(summary.expenses).toBeDefined();
      expect(summary.profit).toBeDefined();
      expect(summary.profitMargin).toBeDefined();
    });

    it('should calculate profit margin', async () => {
      const summary = await service.getFinancialSummary();

      expect(summary.profitMargin).toBeGreaterThan(0);
      expect(summary.profitMargin).toBeLessThan(100);
    });

    it('should calculate VAT amounts', async () => {
      const summary = await service.getFinancialSummary();

      expect(summary.vatCollected).toBeGreaterThan(0);
      expect(summary.vatPaid).toBeGreaterThan(0);
      expect(summary.netVat).toBeDefined();
    });
  });

  describe('Romanian Localization', () => {
    it('should translate metric types', () => {
      expect(service.getMetricTypeName('REVENUE')).toBe('Venituri');
      expect(service.getMetricTypeName('EXPENSES')).toBe('Cheltuieli');
      expect(service.getMetricTypeName('PROFIT')).toBe('Profit');
    });

    it('should translate widget types', () => {
      expect(service.getWidgetTypeName('KPI_CARD')).toBe('Card KPI');
      expect(service.getWidgetTypeName('LINE_CHART')).toBe('Grafic Linie');
      expect(service.getWidgetTypeName('PIE_CHART')).toBe('Grafic Cerc');
    });

    it('should translate granularity', () => {
      expect(service.getGranularityName('DAY')).toBe('Zilnic');
      expect(service.getGranularityName('MONTH')).toBe('Lunar');
      expect(service.getGranularityName('WEEK')).toBe('Săptămânal');
    });

    it('should get all metric types with translations', () => {
      const types = service.getAllMetricTypes();

      expect(types.length).toBeGreaterThan(0);
      expect(types.every((t) => t.nameRo)).toBe(true);
    });

    it('should get all widget types with translations', () => {
      const types = service.getAllWidgetTypes();

      expect(types.length).toBeGreaterThan(0);
      expect(types.every((t) => t.nameRo)).toBe(true);
    });

    it('should have Romanian diacritics', () => {
      expect(service.getMetricTypeName('CUSTOMERS')).toContain('ț'); // Clienți
      expect(service.getWidgetTypeName('HEATMAP')).toContain('ă'); // Hartă
      expect(service.getGranularityName('WEEK')).toContain('ă'); // Săptămânal
    });

    it('should have Romanian names in default metrics', async () => {
      const metric = await service.getMetric('metric-revenue');

      expect(metric!.nameRo).toBe('Venituri Totale');
      expect(metric!.descriptionRo).toBeDefined();
    });

    it('should have Romanian names in default dashboard', async () => {
      const dashboard = await service.getDefaultDashboard();

      expect(dashboard!.nameRo).toBe('Panou Principal');
    });
  });

  describe('Events', () => {
    it('should emit metric.created event', async () => {
      await service.createMetric('Test', 'Test', 'CUSTOM', 100, 'u', 'u');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('metric.created', expect.any(Object));
    });

    it('should emit metric.updated event', async () => {
      const metric = await service.createMetric('Test', 'Test', 'CUSTOM', 100, 'u', 'u');
      await service.updateMetricValue(metric.id, 200);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('metric.updated', expect.any(Object));
    });

    it('should emit widget.created event', async () => {
      await service.createWidget('Test', 'Test', 'TABLE', [], 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('widget.created', expect.any(Object));
    });

    it('should emit dashboard.created event', async () => {
      await service.createDashboard('Test', 'Test', 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('dashboard.created', expect.any(Object));
    });

    it('should emit kpi.created event', async () => {
      await service.createKPI('Test', 'Test', 'Cat', 'Cat', 80, 100, 'Q1', 'T1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('kpi.created', expect.any(Object));
    });
  });
});
