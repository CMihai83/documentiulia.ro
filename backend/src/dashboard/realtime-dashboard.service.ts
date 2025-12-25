import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Dashboard Widget Types
export type WidgetType =
  | 'kpi_card'
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'donut_chart'
  | 'area_chart'
  | 'table'
  | 'map'
  | 'gauge'
  | 'heatmap'
  | 'timeline'
  | 'funnel'
  | 'scatter';

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';
export type RefreshInterval = 5 | 10 | 30 | 60 | 300 | 600 | 0; // 0 = manual

// Dashboard Interfaces
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  dataSource: DataSource;
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
  refreshInterval: RefreshInterval;
  lastUpdated?: Date;
}

export interface DataSource {
  type: 'api' | 'websocket' | 'computed' | 'static';
  endpoint?: string;
  query?: Record<string, any>;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  groupBy?: string;
  orderBy?: string;
  limit?: number;
}

export interface WidgetConfig {
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  stacked?: boolean;
  format?: 'number' | 'currency' | 'percent' | 'date';
  currency?: string;
  precision?: number;
  threshold?: { warning: number; critical: number };
  trend?: boolean;
  sparkline?: boolean;
  comparison?: 'previous_period' | 'same_period_last_year';
  drilldown?: boolean;
  interactive?: boolean;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  isDefault: boolean;
  widgets: DashboardWidget[];
  layout: 'grid' | 'freeform';
  gridColumns: number;
  theme: 'light' | 'dark' | 'system';
  timeRange: TimeRange;
  customTimeRange?: { start: Date; end: Date };
  autoRefresh: boolean;
  refreshInterval: RefreshInterval;
  filters: DashboardFilter[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardFilter {
  id: string;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
  label: string;
}

export interface KpiData {
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
  status: 'success' | 'warning' | 'danger' | 'neutral';
  sparklineData?: number[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
  date?: Date;
  metadata?: Record<string, any>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area';
}

export interface RealtimeMetrics {
  timestamp: Date;
  metrics: {
    activeUsers: number;
    ordersPerMinute: number;
    revenueToday: number;
    pendingInvoices: number;
    lowStockItems: number;
    systemHealth: number;
    apiLatency: number;
    errorRate: number;
  };
}

// Dashboard Templates
export const DASHBOARD_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  widgets: Partial<DashboardWidget>[];
}> = [
  {
    id: 'financial-overview',
    name: 'Financial Overview',
    description: 'Key financial metrics and trends',
    category: 'Finance',
    widgets: [
      { type: 'kpi_card', title: 'Total Revenue', position: { x: 0, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Expenses', position: { x: 3, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Profit Margin', position: { x: 6, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Outstanding Invoices', position: { x: 9, y: 0, w: 3, h: 2 } },
      { type: 'line_chart', title: 'Revenue Trend', position: { x: 0, y: 2, w: 6, h: 4 } },
      { type: 'bar_chart', title: 'Expenses by Category', position: { x: 6, y: 2, w: 6, h: 4 } },
      { type: 'pie_chart', title: 'Revenue by Product', position: { x: 0, y: 6, w: 4, h: 4 } },
      { type: 'table', title: 'Recent Transactions', position: { x: 4, y: 6, w: 8, h: 4 } },
    ],
  },
  {
    id: 'ecommerce-performance',
    name: 'E-commerce Performance',
    description: 'Sales, orders, and inventory metrics',
    category: 'E-commerce',
    widgets: [
      { type: 'kpi_card', title: 'Orders Today', position: { x: 0, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Conversion Rate', position: { x: 3, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Avg Order Value', position: { x: 6, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Cart Abandonment', position: { x: 9, y: 0, w: 3, h: 2 } },
      { type: 'area_chart', title: 'Sales Trend', position: { x: 0, y: 2, w: 8, h: 4 } },
      { type: 'donut_chart', title: 'Orders by Status', position: { x: 8, y: 2, w: 4, h: 4 } },
      { type: 'bar_chart', title: 'Top Products', position: { x: 0, y: 6, w: 6, h: 4 } },
      { type: 'table', title: 'Low Stock Items', position: { x: 6, y: 6, w: 6, h: 4 } },
    ],
  },
  {
    id: 'fleet-operations',
    name: 'Fleet Operations',
    description: 'Vehicle tracking and delivery metrics',
    category: 'Logistics',
    widgets: [
      { type: 'kpi_card', title: 'Active Vehicles', position: { x: 0, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Deliveries Today', position: { x: 3, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'On-Time Rate', position: { x: 6, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Fuel Consumption', position: { x: 9, y: 0, w: 3, h: 2 } },
      { type: 'map', title: 'Live Fleet Map', position: { x: 0, y: 2, w: 8, h: 6 } },
      { type: 'gauge', title: 'Fleet Utilization', position: { x: 8, y: 2, w: 4, h: 3 } },
      { type: 'timeline', title: 'Delivery Timeline', position: { x: 8, y: 5, w: 4, h: 3 } },
      { type: 'table', title: 'Active Routes', position: { x: 0, y: 8, w: 12, h: 4 } },
    ],
  },
  {
    id: 'hr-analytics',
    name: 'HR Analytics',
    description: 'Employee and workforce metrics',
    category: 'HR',
    widgets: [
      { type: 'kpi_card', title: 'Total Employees', position: { x: 0, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Attendance Rate', position: { x: 3, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Open Positions', position: { x: 6, y: 0, w: 3, h: 2 } },
      { type: 'kpi_card', title: 'Training Hours', position: { x: 9, y: 0, w: 3, h: 2 } },
      { type: 'bar_chart', title: 'Employees by Department', position: { x: 0, y: 2, w: 6, h: 4 } },
      { type: 'pie_chart', title: 'Age Distribution', position: { x: 6, y: 2, w: 6, h: 4 } },
      { type: 'heatmap', title: 'Leave Calendar', position: { x: 0, y: 6, w: 8, h: 4 } },
      { type: 'funnel', title: 'Hiring Pipeline', position: { x: 8, y: 6, w: 4, h: 4 } },
    ],
  },
];

@Injectable()
export class RealtimeDashboardService {
  private readonly logger = new Logger(RealtimeDashboardService.name);
  private dashboards: Map<string, Dashboard> = new Map();
  private widgetDataCache: Map<string, { data: any; timestamp: Date }> = new Map();
  private realtimeConnections: Set<string> = new Set();

  constructor(private configService: ConfigService) {
    this.initializeDefaultDashboards();
  }

  private initializeDefaultDashboards(): void {
    // Create default system dashboard
    const systemDashboard: Dashboard = {
      id: 'system-overview',
      name: 'System Overview',
      description: 'Real-time system health and performance',
      ownerId: 'system',
      isPublic: true,
      isDefault: true,
      widgets: this.createSystemOverviewWidgets(),
      layout: 'grid',
      gridColumns: 12,
      theme: 'system',
      timeRange: '24h',
      autoRefresh: true,
      refreshInterval: 30,
      filters: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(systemDashboard.id, systemDashboard);
  }

  private createSystemOverviewWidgets(): DashboardWidget[] {
    return [
      {
        id: 'widget-1',
        type: 'kpi_card',
        title: 'Active Users',
        dataSource: { type: 'api', endpoint: '/metrics/active-users' },
        config: { trend: true, sparkline: true },
        position: { x: 0, y: 0, w: 3, h: 2 },
        refreshInterval: 10,
      },
      {
        id: 'widget-2',
        type: 'kpi_card',
        title: 'API Latency',
        dataSource: { type: 'api', endpoint: '/metrics/latency' },
        config: { format: 'number', threshold: { warning: 200, critical: 500 } },
        position: { x: 3, y: 0, w: 3, h: 2 },
        refreshInterval: 5,
      },
      {
        id: 'widget-3',
        type: 'kpi_card',
        title: 'Error Rate',
        dataSource: { type: 'api', endpoint: '/metrics/error-rate' },
        config: { format: 'percent', threshold: { warning: 1, critical: 5 } },
        position: { x: 6, y: 0, w: 3, h: 2 },
        refreshInterval: 10,
      },
      {
        id: 'widget-4',
        type: 'gauge',
        title: 'System Health',
        dataSource: { type: 'api', endpoint: '/metrics/health' },
        config: { threshold: { warning: 80, critical: 60 } },
        position: { x: 9, y: 0, w: 3, h: 2 },
        refreshInterval: 30,
      },
      {
        id: 'widget-5',
        type: 'line_chart',
        title: 'Request Volume',
        dataSource: { type: 'api', endpoint: '/metrics/requests', query: { interval: '1h' } },
        config: { showGrid: true, animate: true, showTooltip: true },
        position: { x: 0, y: 2, w: 8, h: 4 },
        refreshInterval: 60,
      },
      {
        id: 'widget-6',
        type: 'donut_chart',
        title: 'Request Distribution',
        dataSource: { type: 'api', endpoint: '/metrics/endpoints' },
        config: { showLegend: true },
        position: { x: 8, y: 2, w: 4, h: 4 },
        refreshInterval: 60,
      },
    ];
  }

  // =================== DASHBOARD MANAGEMENT ===================

  async createDashboard(
    data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Dashboard> {
    const id = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    const dashboard: Dashboard = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(id, dashboard);
    this.logger.log(`Dashboard created: ${id}`);

    return dashboard;
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    return this.dashboards.get(id) || null;
  }

  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return null;

    const updated = {
      ...dashboard,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.dashboards.set(id, updated);
    return updated;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    return this.dashboards.delete(id);
  }

  async listDashboards(ownerId?: string): Promise<Dashboard[]> {
    let dashboards = Array.from(this.dashboards.values());

    if (ownerId) {
      dashboards = dashboards.filter((d) => d.ownerId === ownerId || d.isPublic);
    }

    return dashboards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async duplicateDashboard(id: string, newOwnerId: string): Promise<Dashboard | null> {
    const original = this.dashboards.get(id);
    if (!original) return null;

    return this.createDashboard({
      ...original,
      name: `${original.name} (Copy)`,
      ownerId: newOwnerId,
      isDefault: false,
    });
  }

  // =================== WIDGET MANAGEMENT ===================

  async addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): Promise<DashboardWidget | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const newWidget: DashboardWidget = { ...widget, id: widgetId };

    dashboard.widgets.push(newWidget);
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);

    return newWidget;
  }

  async updateWidget(
    dashboardId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>,
  ): Promise<DashboardWidget | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widgetIndex = dashboard.widgets.findIndex((w) => w.id === widgetId);
    if (widgetIndex === -1) return null;

    dashboard.widgets[widgetIndex] = {
      ...dashboard.widgets[widgetIndex],
      ...updates,
      id: widgetId,
    };
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);

    return dashboard.widgets[widgetIndex];
  }

  async removeWidget(dashboardId: string, widgetId: string): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    const initialLength = dashboard.widgets.length;
    dashboard.widgets = dashboard.widgets.filter((w) => w.id !== widgetId);

    if (dashboard.widgets.length < initialLength) {
      dashboard.updatedAt = new Date();
      this.dashboards.set(dashboardId, dashboard);
      return true;
    }

    return false;
  }

  async updateWidgetPositions(
    dashboardId: string,
    positions: Array<{ id: string; x: number; y: number; w: number; h: number }>,
  ): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    for (const pos of positions) {
      const widget = dashboard.widgets.find((w) => w.id === pos.id);
      if (widget) {
        widget.position = { x: pos.x, y: pos.y, w: pos.w, h: pos.h };
      }
    }

    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);
    return true;
  }

  // =================== DATA FETCHING ===================

  async getWidgetData(widgetId: string, timeRange?: TimeRange): Promise<any> {
    // Check cache first
    const cached = this.widgetDataCache.get(widgetId);
    if (cached && Date.now() - cached.timestamp.getTime() < 5000) {
      return cached.data;
    }

    // Generate mock data based on widget type
    const data = this.generateMockWidgetData(widgetId, timeRange);

    // Update cache
    this.widgetDataCache.set(widgetId, { data, timestamp: new Date() });

    return data;
  }

  private generateMockWidgetData(widgetId: string, timeRange?: TimeRange): any {
    // Find widget to determine type
    for (const dashboard of this.dashboards.values()) {
      const widget = dashboard.widgets.find((w) => w.id === widgetId);
      if (widget) {
        return this.generateDataForWidgetType(widget.type, widget.title);
      }
    }
    return null;
  }

  private generateDataForWidgetType(type: WidgetType, title: string): any {
    switch (type) {
      case 'kpi_card':
        return this.generateKpiData(title);
      case 'line_chart':
      case 'area_chart':
        return this.generateTimeSeriesData(24);
      case 'bar_chart':
        return this.generateCategoryData(6);
      case 'pie_chart':
      case 'donut_chart':
        return this.generatePieData(5);
      case 'gauge':
        return { value: Math.floor(Math.random() * 100), max: 100 };
      case 'table':
        return this.generateTableData(10);
      default:
        return { value: Math.random() * 1000 };
    }
  }

  private generateKpiData(title: string): KpiData {
    const value = Math.floor(Math.random() * 10000);
    const previousValue = value * (0.8 + Math.random() * 0.4);
    const change = value - previousValue;
    const changePercent = (change / previousValue) * 100;

    return {
      value,
      previousValue,
      change,
      changePercent,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      status: changePercent > 10 ? 'success' : changePercent < -10 ? 'danger' : 'neutral',
      sparklineData: Array.from({ length: 7 }, () => Math.floor(Math.random() * value)),
    };
  }

  private generateTimeSeriesData(points: number): ChartSeries[] {
    const now = new Date();
    return [
      {
        name: 'Current Period',
        data: Array.from({ length: points }, (_, i) => ({
          label: new Date(now.getTime() - (points - i) * 3600000).toISOString(),
          value: Math.floor(Math.random() * 1000),
          date: new Date(now.getTime() - (points - i) * 3600000),
        })),
        color: '#3B82F6',
      },
      {
        name: 'Previous Period',
        data: Array.from({ length: points }, (_, i) => ({
          label: new Date(now.getTime() - (points - i) * 3600000).toISOString(),
          value: Math.floor(Math.random() * 800),
          date: new Date(now.getTime() - (points - i) * 3600000),
        })),
        color: '#9CA3AF',
      },
    ];
  }

  private generateCategoryData(categories: number): ChartDataPoint[] {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return labels.slice(0, categories).map((label) => ({
      label,
      value: Math.floor(Math.random() * 5000),
    }));
  }

  private generatePieData(segments: number): ChartDataPoint[] {
    const labels = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E', 'Other'];
    return labels.slice(0, segments).map((label) => ({
      label,
      value: Math.floor(Math.random() * 1000),
    }));
  }

  private generateTableData(rows: number): Array<Record<string, any>> {
    return Array.from({ length: rows }, (_, i) => ({
      id: `ROW-${i + 1}`,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 10000),
      status: ['Active', 'Pending', 'Completed'][i % 3],
      date: new Date(Date.now() - i * 24 * 3600000).toISOString(),
    }));
  }

  // =================== REALTIME METRICS ===================

  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    return {
      timestamp: new Date(),
      metrics: {
        activeUsers: Math.floor(Math.random() * 100) + 50,
        ordersPerMinute: Math.floor(Math.random() * 20) + 5,
        revenueToday: Math.floor(Math.random() * 50000) + 10000,
        pendingInvoices: Math.floor(Math.random() * 50) + 10,
        lowStockItems: Math.floor(Math.random() * 20),
        systemHealth: 85 + Math.floor(Math.random() * 15),
        apiLatency: 50 + Math.floor(Math.random() * 100),
        errorRate: Math.random() * 2,
      },
    };
  }

  subscribeToRealtimeUpdates(connectionId: string): void {
    this.realtimeConnections.add(connectionId);
    this.logger.log(`Realtime subscription added: ${connectionId}`);
  }

  unsubscribeFromRealtimeUpdates(connectionId: string): void {
    this.realtimeConnections.delete(connectionId);
    this.logger.log(`Realtime subscription removed: ${connectionId}`);
  }

  getActiveConnections(): number {
    return this.realtimeConnections.size;
  }

  // =================== TEMPLATES ===================

  getTemplates(): typeof DASHBOARD_TEMPLATES {
    return DASHBOARD_TEMPLATES;
  }

  getTemplate(templateId: string): typeof DASHBOARD_TEMPLATES[0] | null {
    return DASHBOARD_TEMPLATES.find((t) => t.id === templateId) || null;
  }

  async createFromTemplate(templateId: string, ownerId: string, name?: string): Promise<Dashboard | null> {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    const widgets: DashboardWidget[] = template.widgets.map((w, i) => ({
      id: `widget_${Date.now()}_${i}`,
      type: w.type!,
      title: w.title!,
      dataSource: { type: 'api' as const, endpoint: `/metrics/${w.title?.toLowerCase().replace(/\s+/g, '-')}` },
      config: { trend: true, showTooltip: true },
      position: w.position!,
      refreshInterval: 60 as RefreshInterval,
    }));

    return this.createDashboard({
      name: name || template.name,
      description: template.description,
      ownerId,
      isPublic: false,
      isDefault: false,
      widgets,
      layout: 'grid',
      gridColumns: 12,
      theme: 'system',
      timeRange: '7d',
      autoRefresh: true,
      refreshInterval: 60,
      filters: [],
    });
  }

  // =================== FILTERS ===================

  async addFilter(dashboardId: string, filter: Omit<DashboardFilter, 'id'>): Promise<DashboardFilter | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const filterId = `filter_${Date.now()}`;
    const newFilter: DashboardFilter = { ...filter, id: filterId };

    dashboard.filters.push(newFilter);
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);

    return newFilter;
  }

  async removeFilter(dashboardId: string, filterId: string): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    const initialLength = dashboard.filters.length;
    dashboard.filters = dashboard.filters.filter((f) => f.id !== filterId);

    if (dashboard.filters.length < initialLength) {
      dashboard.updatedAt = new Date();
      this.dashboards.set(dashboardId, dashboard);
      return true;
    }

    return false;
  }

  // =================== EXPORT ===================

  async exportDashboard(dashboardId: string, format: 'json' | 'pdf'): Promise<{ data: string; filename: string }> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    if (format === 'json') {
      return {
        data: JSON.stringify(dashboard, null, 2),
        filename: `${dashboard.name.toLowerCase().replace(/\s+/g, '-')}.json`,
      };
    }

    // For PDF, return a placeholder
    return {
      data: 'PDF_PLACEHOLDER',
      filename: `${dashboard.name.toLowerCase().replace(/\s+/g, '-')}.pdf`,
    };
  }

  async importDashboard(jsonData: string, ownerId: string): Promise<Dashboard> {
    const parsed = JSON.parse(jsonData);
    return this.createDashboard({
      ...parsed,
      ownerId,
      isDefault: false,
    });
  }
}
