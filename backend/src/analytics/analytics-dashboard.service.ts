import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type MetricType =
  | 'REVENUE'
  | 'EXPENSES'
  | 'PROFIT'
  | 'INVOICES'
  | 'CUSTOMERS'
  | 'ORDERS'
  | 'INVENTORY'
  | 'PAYROLL'
  | 'TAX'
  | 'CASH_FLOW'
  | 'CUSTOM';

export type AggregationType = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'MEDIAN';

export type TimeGranularity = 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

export type WidgetType =
  | 'KPI_CARD'
  | 'LINE_CHART'
  | 'BAR_CHART'
  | 'PIE_CHART'
  | 'TABLE'
  | 'GAUGE'
  | 'SPARKLINE'
  | 'HEATMAP'
  | 'FUNNEL';

export interface Metric {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: MetricType;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  unit: string;
  unitRo: string;
  format: 'NUMBER' | 'CURRENCY' | 'PERCENTAGE';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface TimeSeries {
  id: string;
  name: string;
  nameRo: string;
  metricType: MetricType;
  granularity: TimeGranularity;
  dataPoints: TimeSeriesDataPoint[];
  aggregation: AggregationType;
}

export interface DashboardWidget {
  id: string;
  name: string;
  nameRo: string;
  type: WidgetType;
  metricIds: string[];
  config: WidgetConfig;
  position: { x: number; y: number; width: number; height: number };
  refreshInterval: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WidgetConfig {
  title?: string;
  titleRo?: string;
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  showTrend?: boolean;
  thresholds?: { warning: number; critical: number };
  dateRange?: { start: Date; end: Date };
  filters?: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  nameRo: string;
  description?: string;
  descriptionRo?: string;
  widgets: string[];
  layout: 'GRID' | 'FREE';
  isDefault: boolean;
  isPublic: boolean;
  refreshInterval: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tenantId?: string;
}

export interface KPI {
  id: string;
  name: string;
  nameRo: string;
  category: string;
  categoryRo: string;
  current: number;
  target: number;
  achievement: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  trend: 'UP' | 'DOWN' | 'STABLE';
  period: string;
  periodRo: string;
}

export interface AnalyticsQuery {
  metrics: MetricType[];
  granularity: TimeGranularity;
  startDate: Date;
  endDate: Date;
  aggregation?: AggregationType;
  groupBy?: string[];
  filters?: Record<string, any>;
}

export interface AnalyticsResult {
  query: AnalyticsQuery;
  data: TimeSeries[];
  summary: Record<string, number>;
  generatedAt: Date;
}

// Romanian translations for metric types
const METRIC_TYPE_TRANSLATIONS: Record<MetricType, string> = {
  REVENUE: 'Venituri',
  EXPENSES: 'Cheltuieli',
  PROFIT: 'Profit',
  INVOICES: 'Facturi',
  CUSTOMERS: 'Clienți',
  ORDERS: 'Comenzi',
  INVENTORY: 'Stocuri',
  PAYROLL: 'Salarii',
  TAX: 'Taxe',
  CASH_FLOW: 'Flux Numerar',
  CUSTOM: 'Personalizat',
};

// Romanian translations for widget types
const WIDGET_TYPE_TRANSLATIONS: Record<WidgetType, string> = {
  KPI_CARD: 'Card KPI',
  LINE_CHART: 'Grafic Linie',
  BAR_CHART: 'Grafic Bare',
  PIE_CHART: 'Grafic Cerc',
  TABLE: 'Tabel',
  GAUGE: 'Indicator',
  SPARKLINE: 'Mini Grafic',
  HEATMAP: 'Hartă Căldură',
  FUNNEL: 'Pâlnie',
};

// Romanian translations for granularity
const GRANULARITY_TRANSLATIONS: Record<TimeGranularity, string> = {
  HOUR: 'Orar',
  DAY: 'Zilnic',
  WEEK: 'Săptămânal',
  MONTH: 'Lunar',
  QUARTER: 'Trimestrial',
  YEAR: 'Anual',
};

@Injectable()
export class AnalyticsDashboardService implements OnModuleInit {
  private metrics: Map<string, Metric> = new Map();
  private timeSeries: Map<string, TimeSeries> = new Map();
  private widgets: Map<string, DashboardWidget> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private kpis: Map<string, KPI> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    // Initialize default metrics
    await this.initializeDefaultMetrics();
    // Initialize default KPIs
    await this.initializeDefaultKPIs();
    // Create default dashboard
    await this.createDefaultDashboard();
  }

  private async initializeDefaultMetrics(): Promise<void> {
    const defaultMetrics: Partial<Metric>[] = [
      {
        id: 'metric-revenue',
        name: 'Total Revenue',
        nameRo: 'Venituri Totale',
        description: 'Total revenue for the period',
        descriptionRo: 'Venituri totale pentru perioadă',
        type: 'REVENUE',
        value: 150000,
        previousValue: 135000,
        unit: 'RON',
        unitRo: 'RON',
        format: 'CURRENCY',
      },
      {
        id: 'metric-expenses',
        name: 'Total Expenses',
        nameRo: 'Cheltuieli Totale',
        description: 'Total expenses for the period',
        descriptionRo: 'Cheltuieli totale pentru perioadă',
        type: 'EXPENSES',
        value: 95000,
        previousValue: 90000,
        unit: 'RON',
        unitRo: 'RON',
        format: 'CURRENCY',
      },
      {
        id: 'metric-profit',
        name: 'Net Profit',
        nameRo: 'Profit Net',
        description: 'Net profit for the period',
        descriptionRo: 'Profit net pentru perioadă',
        type: 'PROFIT',
        value: 55000,
        previousValue: 45000,
        unit: 'RON',
        unitRo: 'RON',
        format: 'CURRENCY',
      },
      {
        id: 'metric-invoices',
        name: 'Invoices Issued',
        nameRo: 'Facturi Emise',
        description: 'Number of invoices issued',
        descriptionRo: 'Numărul de facturi emise',
        type: 'INVOICES',
        value: 245,
        previousValue: 220,
        unit: 'invoices',
        unitRo: 'facturi',
        format: 'NUMBER',
      },
      {
        id: 'metric-customers',
        name: 'Active Customers',
        nameRo: 'Clienți Activi',
        description: 'Number of active customers',
        descriptionRo: 'Numărul de clienți activi',
        type: 'CUSTOMERS',
        value: 87,
        previousValue: 82,
        unit: 'customers',
        unitRo: 'clienți',
        format: 'NUMBER',
      },
    ];

    for (const m of defaultMetrics) {
      const metric = this.calculateMetricTrend(m as Metric);
      this.metrics.set(metric.id, metric);
    }
  }

  private calculateMetricTrend(metric: Metric): Metric {
    if (metric.previousValue !== undefined) {
      metric.change = metric.value - metric.previousValue;
      metric.changePercent = metric.previousValue > 0
        ? ((metric.value - metric.previousValue) / metric.previousValue) * 100
        : 0;
      metric.trend = metric.change > 0 ? 'UP' : metric.change < 0 ? 'DOWN' : 'STABLE';
    } else {
      metric.trend = 'STABLE';
    }
    metric.timestamp = new Date();
    return metric;
  }

  private async initializeDefaultKPIs(): Promise<void> {
    const defaultKPIs: KPI[] = [
      {
        id: 'kpi-revenue-target',
        name: 'Revenue Target',
        nameRo: 'Obiectiv Venituri',
        category: 'Financial',
        categoryRo: 'Financiar',
        current: 150000,
        target: 180000,
        achievement: 83.33,
        status: 'AT_RISK',
        trend: 'UP',
        period: 'Q4 2024',
        periodRo: 'T4 2024',
      },
      {
        id: 'kpi-customer-satisfaction',
        name: 'Customer Satisfaction',
        nameRo: 'Satisfacție Clienți',
        category: 'Customer',
        categoryRo: 'Clienți',
        current: 92,
        target: 90,
        achievement: 102.22,
        status: 'ON_TRACK',
        trend: 'UP',
        period: 'December 2024',
        periodRo: 'Decembrie 2024',
      },
      {
        id: 'kpi-invoice-collection',
        name: 'Invoice Collection Rate',
        nameRo: 'Rată Încasare Facturi',
        category: 'Financial',
        categoryRo: 'Financiar',
        current: 78,
        target: 85,
        achievement: 91.76,
        status: 'AT_RISK',
        trend: 'STABLE',
        period: 'December 2024',
        periodRo: 'Decembrie 2024',
      },
    ];

    for (const kpi of defaultKPIs) {
      this.kpis.set(kpi.id, kpi);
    }
  }

  private async createDefaultDashboard(): Promise<void> {
    // Create default widgets
    const revenueWidget = await this.createWidget(
      'Revenue Overview',
      'Prezentare Venituri',
      'KPI_CARD',
      ['metric-revenue'],
      'system',
      {
        config: { showTrend: true },
        position: { x: 0, y: 0, width: 3, height: 2 },
      },
    );

    const profitWidget = await this.createWidget(
      'Profit Margin',
      'Marjă Profit',
      'GAUGE',
      ['metric-profit'],
      'system',
      {
        config: { thresholds: { warning: 15, critical: 10 } },
        position: { x: 3, y: 0, width: 3, height: 2 },
      },
    );

    const invoicesWidget = await this.createWidget(
      'Invoice Trend',
      'Trend Facturi',
      'LINE_CHART',
      ['metric-invoices'],
      'system',
      {
        config: { showLabels: true },
        position: { x: 6, y: 0, width: 6, height: 2 },
      },
    );

    // Create default dashboard
    const dashboard: Dashboard = {
      id: 'dashboard-default',
      name: 'Main Dashboard',
      nameRo: 'Panou Principal',
      description: 'Default business overview dashboard',
      descriptionRo: 'Panou implicit de prezentare business',
      widgets: [revenueWidget.id, profitWidget.id, invoicesWidget.id],
      layout: 'GRID',
      isDefault: true,
      isPublic: false,
      refreshInterval: 60000,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    };

    this.dashboards.set(dashboard.id, dashboard);
  }

  // Metric Management
  async createMetric(
    name: string,
    nameRo: string,
    type: MetricType,
    value: number,
    unit: string,
    unitRo: string,
    options: {
      description?: string;
      descriptionRo?: string;
      previousValue?: number;
      format?: Metric['format'];
      metadata?: Record<string, any>;
    } = {},
  ): Promise<Metric> {
    const metric: Metric = {
      id: this.generateId('metric'),
      name,
      nameRo,
      description: options.description || '',
      descriptionRo: options.descriptionRo || '',
      type,
      value,
      previousValue: options.previousValue,
      unit,
      unitRo,
      format: options.format || 'NUMBER',
      trend: 'STABLE',
      timestamp: new Date(),
      metadata: options.metadata,
    };

    const calculated = this.calculateMetricTrend(metric);
    this.metrics.set(calculated.id, calculated);

    this.eventEmitter.emit('metric.created', {
      metricId: calculated.id,
      name: calculated.name,
      type: calculated.type,
    });

    return calculated;
  }

  async getMetric(metricId: string): Promise<Metric | undefined> {
    return this.metrics.get(metricId);
  }

  async listMetrics(type?: MetricType): Promise<Metric[]> {
    let metrics = Array.from(this.metrics.values());
    if (type) {
      metrics = metrics.filter((m) => m.type === type);
    }
    return metrics;
  }

  async updateMetricValue(metricId: string, value: number): Promise<Metric> {
    const metric = this.metrics.get(metricId);
    if (!metric) {
      throw new Error(`Metric not found: ${metricId}`);
    }

    metric.previousValue = metric.value;
    metric.value = value;
    const updated = this.calculateMetricTrend(metric);
    this.metrics.set(metricId, updated);

    this.eventEmitter.emit('metric.updated', {
      metricId: updated.id,
      value: updated.value,
      change: updated.change,
      trend: updated.trend,
    });

    return updated;
  }

  async deleteMetric(metricId: string): Promise<boolean> {
    return this.metrics.delete(metricId);
  }

  // Time Series Management
  async createTimeSeries(
    name: string,
    nameRo: string,
    metricType: MetricType,
    granularity: TimeGranularity,
    dataPoints: TimeSeriesDataPoint[],
    aggregation: AggregationType = 'SUM',
  ): Promise<TimeSeries> {
    const series: TimeSeries = {
      id: this.generateId('ts'),
      name,
      nameRo,
      metricType,
      granularity,
      dataPoints,
      aggregation,
    };

    this.timeSeries.set(series.id, series);

    return series;
  }

  async getTimeSeries(seriesId: string): Promise<TimeSeries | undefined> {
    return this.timeSeries.get(seriesId);
  }

  async addDataPoint(seriesId: string, dataPoint: TimeSeriesDataPoint): Promise<TimeSeries> {
    const series = this.timeSeries.get(seriesId);
    if (!series) {
      throw new Error(`Time series not found: ${seriesId}`);
    }

    series.dataPoints.push(dataPoint);
    series.dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    this.timeSeries.set(seriesId, series);

    return series;
  }

  async getTimeSeriesData(
    metricType: MetricType,
    granularity: TimeGranularity,
    startDate: Date,
    endDate: Date,
  ): Promise<TimeSeriesDataPoint[]> {
    // Generate sample time series data
    const dataPoints: TimeSeriesDataPoint[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dataPoints.push({
        timestamp: new Date(current),
        value: Math.random() * 10000 + 5000,
      });

      switch (granularity) {
        case 'HOUR':
          current.setHours(current.getHours() + 1);
          break;
        case 'DAY':
          current.setDate(current.getDate() + 1);
          break;
        case 'WEEK':
          current.setDate(current.getDate() + 7);
          break;
        case 'MONTH':
          current.setMonth(current.getMonth() + 1);
          break;
        case 'QUARTER':
          current.setMonth(current.getMonth() + 3);
          break;
        case 'YEAR':
          current.setFullYear(current.getFullYear() + 1);
          break;
      }
    }

    return dataPoints;
  }

  // Widget Management
  async createWidget(
    name: string,
    nameRo: string,
    type: WidgetType,
    metricIds: string[],
    createdBy: string,
    options: {
      config?: WidgetConfig;
      position?: { x: number; y: number; width: number; height: number };
      refreshInterval?: number;
    } = {},
  ): Promise<DashboardWidget> {
    const widget: DashboardWidget = {
      id: this.generateId('widget'),
      name,
      nameRo,
      type,
      metricIds,
      config: options.config || {},
      position: options.position || { x: 0, y: 0, width: 4, height: 2 },
      refreshInterval: options.refreshInterval || 60000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    };

    this.widgets.set(widget.id, widget);

    this.eventEmitter.emit('widget.created', {
      widgetId: widget.id,
      name: widget.name,
      type: widget.type,
    });

    return widget;
  }

  async getWidget(widgetId: string): Promise<DashboardWidget | undefined> {
    return this.widgets.get(widgetId);
  }

  async listWidgets(type?: WidgetType): Promise<DashboardWidget[]> {
    let widgets = Array.from(this.widgets.values());
    if (type) {
      widgets = widgets.filter((w) => w.type === type);
    }
    return widgets.filter((w) => w.isActive);
  }

  async updateWidget(
    widgetId: string,
    updates: Partial<Omit<DashboardWidget, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<DashboardWidget> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    const updated: DashboardWidget = {
      ...widget,
      ...updates,
      updatedAt: new Date(),
    };
    this.widgets.set(widgetId, updated);

    return updated;
  }

  async deleteWidget(widgetId: string): Promise<boolean> {
    const widget = this.widgets.get(widgetId);
    if (widget) {
      widget.isActive = false;
      this.widgets.set(widgetId, widget);
      return true;
    }
    return false;
  }

  async getWidgetData(widgetId: string): Promise<{
    widget: DashboardWidget;
    metrics: Metric[];
    timeSeries?: TimeSeriesDataPoint[];
  }> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    const metrics = widget.metricIds
      .map((id) => this.metrics.get(id))
      .filter((m): m is Metric => m !== undefined);

    // Get time series for chart widgets
    let timeSeries: TimeSeriesDataPoint[] | undefined;
    if (['LINE_CHART', 'BAR_CHART', 'SPARKLINE'].includes(widget.type)) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      if (metrics.length > 0) {
        timeSeries = await this.getTimeSeriesData(metrics[0].type, 'DAY', startDate, endDate);
      }
    }

    return { widget, metrics, timeSeries };
  }

  // Dashboard Management
  async createDashboard(
    name: string,
    nameRo: string,
    createdBy: string,
    options: {
      description?: string;
      descriptionRo?: string;
      widgets?: string[];
      layout?: Dashboard['layout'];
      isPublic?: boolean;
      refreshInterval?: number;
      tenantId?: string;
    } = {},
  ): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: this.generateId('dashboard'),
      name,
      nameRo,
      description: options.description,
      descriptionRo: options.descriptionRo,
      widgets: options.widgets || [],
      layout: options.layout || 'GRID',
      isDefault: false,
      isPublic: options.isPublic || false,
      refreshInterval: options.refreshInterval || 60000,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      tenantId: options.tenantId,
    };

    this.dashboards.set(dashboard.id, dashboard);

    this.eventEmitter.emit('dashboard.created', {
      dashboardId: dashboard.id,
      name: dashboard.name,
    });

    return dashboard;
  }

  async getDashboard(dashboardId: string): Promise<Dashboard | undefined> {
    return this.dashboards.get(dashboardId);
  }

  async getDefaultDashboard(): Promise<Dashboard | undefined> {
    return Array.from(this.dashboards.values()).find((d) => d.isDefault);
  }

  async listDashboards(options: { isPublic?: boolean; createdBy?: string } = {}): Promise<Dashboard[]> {
    let dashboards = Array.from(this.dashboards.values());

    if (options.isPublic !== undefined) {
      dashboards = dashboards.filter((d) => d.isPublic === options.isPublic);
    }
    if (options.createdBy) {
      dashboards = dashboards.filter((d) => d.createdBy === options.createdBy);
    }

    return dashboards;
  }

  async updateDashboard(
    dashboardId: string,
    updates: Partial<Omit<Dashboard, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<Dashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const updated: Dashboard = {
      ...dashboard,
      ...updates,
      updatedAt: new Date(),
    };
    this.dashboards.set(dashboardId, updated);

    return updated;
  }

  async addWidgetToDashboard(dashboardId: string, widgetId: string): Promise<Dashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    if (!dashboard.widgets.includes(widgetId)) {
      dashboard.widgets.push(widgetId);
      dashboard.updatedAt = new Date();
      this.dashboards.set(dashboardId, dashboard);
    }

    return dashboard;
  }

  async removeWidgetFromDashboard(dashboardId: string, widgetId: string): Promise<Dashboard> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    dashboard.widgets = dashboard.widgets.filter((id) => id !== widgetId);
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);

    return dashboard;
  }

  async deleteDashboard(dashboardId: string): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return false;
    }

    if (dashboard.isDefault) {
      throw new Error('Cannot delete default dashboard');
    }

    return this.dashboards.delete(dashboardId);
  }

  // KPI Management
  async createKPI(
    name: string,
    nameRo: string,
    category: string,
    categoryRo: string,
    current: number,
    target: number,
    period: string,
    periodRo: string,
  ): Promise<KPI> {
    const achievement = target > 0 ? (current / target) * 100 : 0;
    let status: KPI['status'] = 'ON_TRACK';
    if (achievement < 70) status = 'OFF_TRACK';
    else if (achievement < 90) status = 'AT_RISK';

    const kpi: KPI = {
      id: this.generateId('kpi'),
      name,
      nameRo,
      category,
      categoryRo,
      current,
      target,
      achievement,
      status,
      trend: 'STABLE',
      period,
      periodRo,
    };

    this.kpis.set(kpi.id, kpi);

    this.eventEmitter.emit('kpi.created', {
      kpiId: kpi.id,
      name: kpi.name,
      status: kpi.status,
    });

    return kpi;
  }

  async getKPI(kpiId: string): Promise<KPI | undefined> {
    return this.kpis.get(kpiId);
  }

  async listKPIs(category?: string): Promise<KPI[]> {
    let kpis = Array.from(this.kpis.values());
    if (category) {
      kpis = kpis.filter((k) => k.category === category);
    }
    return kpis;
  }

  async updateKPIValue(kpiId: string, current: number): Promise<KPI> {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    const previousCurrent = kpi.current;
    kpi.current = current;
    kpi.achievement = kpi.target > 0 ? (current / kpi.target) * 100 : 0;

    if (kpi.achievement < 70) kpi.status = 'OFF_TRACK';
    else if (kpi.achievement < 90) kpi.status = 'AT_RISK';
    else kpi.status = 'ON_TRACK';

    kpi.trend = current > previousCurrent ? 'UP' : current < previousCurrent ? 'DOWN' : 'STABLE';

    this.kpis.set(kpiId, kpi);

    return kpi;
  }

  // Analytics Queries
  async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const data: TimeSeries[] = [];
    const summary: Record<string, number> = {};

    for (const metricType of query.metrics) {
      const dataPoints = await this.getTimeSeriesData(
        metricType,
        query.granularity,
        query.startDate,
        query.endDate,
      );

      const series: TimeSeries = {
        id: this.generateId('query-ts'),
        name: metricType,
        nameRo: METRIC_TYPE_TRANSLATIONS[metricType],
        metricType,
        granularity: query.granularity,
        dataPoints,
        aggregation: query.aggregation || 'SUM',
      };

      data.push(series);

      // Calculate summary
      const values = dataPoints.map((dp) => dp.value);
      summary[`${metricType}_sum`] = values.reduce((a, b) => a + b, 0);
      summary[`${metricType}_avg`] = summary[`${metricType}_sum`] / values.length;
      summary[`${metricType}_min`] = Math.min(...values);
      summary[`${metricType}_max`] = Math.max(...values);
    }

    return {
      query,
      data,
      summary,
      generatedAt: new Date(),
    };
  }

  // Financial Summary
  async getFinancialSummary(): Promise<{
    revenue: Metric;
    expenses: Metric;
    profit: Metric;
    profitMargin: number;
    vatCollected: number;
    vatPaid: number;
    netVat: number;
  }> {
    const revenue = this.metrics.get('metric-revenue')!;
    const expenses = this.metrics.get('metric-expenses')!;
    const profit = this.metrics.get('metric-profit')!;

    const profitMargin = revenue.value > 0 ? (profit.value / revenue.value) * 100 : 0;
    const vatCollected = revenue.value * 0.19; // 19% VAT
    const vatPaid = expenses.value * 0.19;
    const netVat = vatCollected - vatPaid;

    return {
      revenue,
      expenses,
      profit,
      profitMargin,
      vatCollected,
      vatPaid,
      netVat,
    };
  }

  // Romanian Localization
  getMetricTypeName(type: MetricType): string {
    return METRIC_TYPE_TRANSLATIONS[type];
  }

  getWidgetTypeName(type: WidgetType): string {
    return WIDGET_TYPE_TRANSLATIONS[type];
  }

  getGranularityName(granularity: TimeGranularity): string {
    return GRANULARITY_TRANSLATIONS[granularity];
  }

  getAllMetricTypes(): Array<{ type: MetricType; name: string; nameRo: string }> {
    return (Object.keys(METRIC_TYPE_TRANSLATIONS) as MetricType[]).map((type) => ({
      type,
      name: type,
      nameRo: METRIC_TYPE_TRANSLATIONS[type],
    }));
  }

  getAllWidgetTypes(): Array<{ type: WidgetType; name: string; nameRo: string }> {
    return (Object.keys(WIDGET_TYPE_TRANSLATIONS) as WidgetType[]).map((type) => ({
      type,
      name: type.replace(/_/g, ' '),
      nameRo: WIDGET_TYPE_TRANSLATIONS[type],
    }));
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
