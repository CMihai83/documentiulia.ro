import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
export type WidgetType = 'chart' | 'kpi' | 'table' | 'list' | 'map' | 'calendar' | 'progress' | 'custom';
export type ChartType = 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' | 'radar' | 'gauge';
export type DataSource = 'invoices' | 'customers' | 'orders' | 'payments' | 'employees' | 'deliveries' | 'documents' | 'custom';
export type RefreshInterval = 'realtime' | '1min' | '5min' | '15min' | '30min' | '1hour' | 'manual';
export type DashboardVisibility = 'private' | 'team' | 'organization' | 'public';

// Interfaces
export interface Dashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  ownerId: string;
  visibility: DashboardVisibility;
  layout: DashboardLayout;
  theme?: DashboardTheme;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  sharedWith: string[];
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  widgets: WidgetPosition[];
}

export interface WidgetPosition {
  widgetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  borderRadius?: number;
}

export interface Widget {
  id: string;
  tenantId: string;
  name: string;
  type: WidgetType;
  config: WidgetConfig;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetConfig {
  dataSource: DataSource;
  chartType?: ChartType;
  query?: WidgetQuery;
  refreshInterval: RefreshInterval;
  displayOptions: DisplayOptions;
  filters?: WidgetFilter[];
  drillDown?: DrillDownConfig;
}

export interface WidgetQuery {
  metrics: string[];
  dimensions?: string[];
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  groupBy?: string;
  orderBy?: string;
  limit?: number;
  dateRange?: DateRange;
}

export interface DateRange {
  type: 'relative' | 'absolute';
  value?: string; // e.g., "7d", "1m", "1y"
  start?: Date;
  end?: Date;
}

export interface DisplayOptions {
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  colors?: string[];
  format?: string;
  precision?: number;
  prefix?: string;
  suffix?: string;
  thresholds?: Threshold[];
}

export interface Threshold {
  value: number;
  color: string;
  label?: string;
}

export interface WidgetFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
}

export interface DrillDownConfig {
  enabled: boolean;
  targetDashboard?: string;
  targetWidget?: string;
  passFilters?: boolean;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  type: WidgetType;
  category: string;
  thumbnail?: string;
  defaultConfig: Partial<WidgetConfig>;
  isSystem: boolean;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  layout: DashboardLayout;
  widgets: Widget[];
  isSystem: boolean;
}

export interface WidgetData {
  widgetId: string;
  data: any;
  lastUpdated: Date;
  error?: string;
}

export interface DashboardStats {
  totalDashboards: number;
  privateDashboards: number;
  sharedDashboards: number;
  totalWidgets: number;
  widgetsByType: { type: WidgetType; count: number }[];
  mostUsedDataSources: { source: DataSource; count: number }[];
}

@Injectable()
export class DashboardBuilderService {
  private readonly logger = new Logger(DashboardBuilderService.name);

  // In-memory storage
  private dashboards: Map<string, Dashboard> = new Map();
  private widgets: Map<string, Widget> = new Map();
  private widgetTemplates: Map<string, WidgetTemplate> = new Map();
  private dashboardTemplates: Map<string, DashboardTemplate> = new Map();

  // ID counters
  private dashboardIdCounter = 0;
  private widgetIdCounter = 0;

  constructor(private configService: ConfigService) {
    this.initializeSystemTemplates();
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private initializeSystemTemplates(): void {
    // Widget templates
    const kpiTemplate: WidgetTemplate = {
      id: 'tpl-kpi-basic',
      name: 'Basic KPI',
      description: 'Single value KPI with trend indicator',
      type: 'kpi',
      category: 'metrics',
      isSystem: true,
      defaultConfig: {
        dataSource: 'custom',
        refreshInterval: '5min',
        displayOptions: { showLabels: true },
      },
    };

    const chartTemplate: WidgetTemplate = {
      id: 'tpl-chart-line',
      name: 'Line Chart',
      description: 'Time series line chart',
      type: 'chart',
      category: 'charts',
      isSystem: true,
      defaultConfig: {
        dataSource: 'custom',
        chartType: 'line',
        refreshInterval: '5min',
        displayOptions: { showLegend: true, showGrid: true },
      },
    };

    const tableTemplate: WidgetTemplate = {
      id: 'tpl-table-basic',
      name: 'Data Table',
      description: 'Tabular data display',
      type: 'table',
      category: 'data',
      isSystem: true,
      defaultConfig: {
        dataSource: 'custom',
        refreshInterval: '5min',
        displayOptions: { showLabels: true },
      },
    };

    this.widgetTemplates.set(kpiTemplate.id, kpiTemplate);
    this.widgetTemplates.set(chartTemplate.id, chartTemplate);
    this.widgetTemplates.set(tableTemplate.id, tableTemplate);

    this.logger.log('Initialized system templates');
  }

  // =================== DASHBOARDS ===================

  async createDashboard(
    tenantId: string,
    name: string,
    ownerId: string,
    options?: {
      description?: string;
      visibility?: DashboardVisibility;
      layout?: Partial<DashboardLayout>;
      theme?: DashboardTheme;
      isDefault?: boolean;
    },
  ): Promise<Dashboard> {
    // If setting as default, unset other defaults
    if (options?.isDefault) {
      const existing = await this.getDashboards(tenantId, { ownerId });
      for (const d of existing) {
        if (d.isDefault) {
          d.isDefault = false;
          this.dashboards.set(d.id, d);
        }
      }
    }

    const dashboard: Dashboard = {
      id: this.generateId('dash', ++this.dashboardIdCounter),
      tenantId,
      name,
      description: options?.description,
      ownerId,
      visibility: options?.visibility || 'private',
      layout: {
        columns: options?.layout?.columns || 12,
        rows: options?.layout?.rows || 8,
        widgets: options?.layout?.widgets || [],
      },
      theme: options?.theme,
      isDefault: options?.isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      sharedWith: [],
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.logger.log(`Created dashboard: ${name} (${dashboard.id})`);
    return dashboard;
  }

  async getDashboard(dashboardId: string): Promise<Dashboard | null> {
    return this.dashboards.get(dashboardId) || null;
  }

  async getDashboards(
    tenantId: string,
    filters?: {
      ownerId?: string;
      visibility?: DashboardVisibility;
      isDefault?: boolean;
    },
  ): Promise<Dashboard[]> {
    let dashboards = Array.from(this.dashboards.values())
      .filter(d => d.tenantId === tenantId);

    if (filters?.ownerId) {
      dashboards = dashboards.filter(d => d.ownerId === filters.ownerId);
    }
    if (filters?.visibility) {
      dashboards = dashboards.filter(d => d.visibility === filters.visibility);
    }
    if (filters?.isDefault !== undefined) {
      dashboards = dashboards.filter(d => d.isDefault === filters.isDefault);
    }

    return dashboards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getAccessibleDashboards(tenantId: string, userId: string): Promise<Dashboard[]> {
    return Array.from(this.dashboards.values())
      .filter(d =>
        d.tenantId === tenantId && (
          d.ownerId === userId ||
          d.sharedWith.includes(userId) ||
          d.visibility === 'organization' ||
          d.visibility === 'public'
        )
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateDashboard(
    dashboardId: string,
    updates: Partial<Omit<Dashboard, 'id' | 'tenantId' | 'ownerId' | 'createdAt'>>,
  ): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const updated: Dashboard = {
      ...dashboard,
      ...updates,
      updatedAt: new Date(),
      layout: updates.layout ? { ...dashboard.layout, ...updates.layout } : dashboard.layout,
    };

    this.dashboards.set(dashboardId, updated);
    return updated;
  }

  async deleteDashboard(dashboardId: string): Promise<boolean> {
    return this.dashboards.delete(dashboardId);
  }

  async duplicateDashboard(dashboardId: string, newName: string, userId: string): Promise<Dashboard | null> {
    const original = this.dashboards.get(dashboardId);
    if (!original) return null;

    // Duplicate widgets
    const widgetIdMap = new Map<string, string>();
    for (const pos of original.layout.widgets) {
      const widget = this.widgets.get(pos.widgetId);
      if (widget) {
        const newWidget = await this.createWidget(
          original.tenantId,
          `${widget.name} (copy)`,
          widget.type,
          widget.config,
          userId,
        );
        widgetIdMap.set(pos.widgetId, newWidget.id);
      }
    }

    // Create new dashboard with new widget IDs
    const newLayout: DashboardLayout = {
      ...original.layout,
      widgets: original.layout.widgets.map(pos => ({
        ...pos,
        widgetId: widgetIdMap.get(pos.widgetId) || pos.widgetId,
      })),
    };

    return this.createDashboard(original.tenantId, newName, userId, {
      description: original.description,
      layout: newLayout,
      theme: original.theme,
    });
  }

  async setDefaultDashboard(dashboardId: string, userId: string): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    // Unset other defaults for this user
    const userDashboards = await this.getDashboards(dashboard.tenantId, { ownerId: userId });
    for (const d of userDashboards) {
      if (d.isDefault && d.id !== dashboardId) {
        d.isDefault = false;
        this.dashboards.set(d.id, d);
      }
    }

    dashboard.isDefault = true;
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  async shareDashboard(dashboardId: string, userIds: string[]): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const newShares = userIds.filter(id => !dashboard.sharedWith.includes(id));
    dashboard.sharedWith = [...dashboard.sharedWith, ...newShares];
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  async unshareDashboard(dashboardId: string, userId: string): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    dashboard.sharedWith = dashboard.sharedWith.filter(id => id !== userId);
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  // =================== WIDGETS ===================

  async createWidget(
    tenantId: string,
    name: string,
    type: WidgetType,
    config: WidgetConfig,
    createdBy: string,
  ): Promise<Widget> {
    const widget: Widget = {
      id: this.generateId('widget', ++this.widgetIdCounter),
      tenantId,
      name,
      type,
      config,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.widgets.set(widget.id, widget);
    return widget;
  }

  async getWidget(widgetId: string): Promise<Widget | null> {
    return this.widgets.get(widgetId) || null;
  }

  async getWidgets(tenantId: string, type?: WidgetType): Promise<Widget[]> {
    let widgets = Array.from(this.widgets.values())
      .filter(w => w.tenantId === tenantId);

    if (type) {
      widgets = widgets.filter(w => w.type === type);
    }

    return widgets.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateWidget(
    widgetId: string,
    updates: Partial<Omit<Widget, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>>,
  ): Promise<Widget | null> {
    const widget = this.widgets.get(widgetId);
    if (!widget) return null;

    const updated: Widget = {
      ...widget,
      ...updates,
      updatedAt: new Date(),
      config: updates.config ? { ...widget.config, ...updates.config } : widget.config,
    };

    this.widgets.set(widgetId, updated);
    return updated;
  }

  async deleteWidget(widgetId: string): Promise<boolean> {
    // Remove from all dashboards
    for (const dashboard of this.dashboards.values()) {
      dashboard.layout.widgets = dashboard.layout.widgets.filter(w => w.widgetId !== widgetId);
    }

    return this.widgets.delete(widgetId);
  }

  async createWidgetFromTemplate(
    tenantId: string,
    templateId: string,
    name: string,
    customConfig: Partial<WidgetConfig>,
    createdBy: string,
  ): Promise<Widget | null> {
    const template = this.widgetTemplates.get(templateId);
    if (!template) return null;

    const config: WidgetConfig = {
      dataSource: customConfig.dataSource || template.defaultConfig.dataSource || 'custom',
      chartType: customConfig.chartType || template.defaultConfig.chartType,
      refreshInterval: customConfig.refreshInterval || template.defaultConfig.refreshInterval || '5min',
      displayOptions: { ...template.defaultConfig.displayOptions, ...customConfig.displayOptions },
      query: customConfig.query,
      filters: customConfig.filters,
    };

    return this.createWidget(tenantId, name, template.type, config, createdBy);
  }

  // =================== LAYOUT ===================

  async addWidgetToDashboard(
    dashboardId: string,
    widgetId: string,
    position: { x: number; y: number; width: number; height: number },
  ): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widget = this.widgets.get(widgetId);
    if (!widget) return null;

    // Remove if already exists
    dashboard.layout.widgets = dashboard.layout.widgets.filter(w => w.widgetId !== widgetId);

    // Add at new position
    dashboard.layout.widgets.push({
      widgetId,
      ...position,
    });

    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  async removeWidgetFromDashboard(dashboardId: string, widgetId: string): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    dashboard.layout.widgets = dashboard.layout.widgets.filter(w => w.widgetId !== widgetId);
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  async updateWidgetPosition(
    dashboardId: string,
    widgetId: string,
    position: { x?: number; y?: number; width?: number; height?: number },
  ): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widgetPos = dashboard.layout.widgets.find(w => w.widgetId === widgetId);
    if (!widgetPos) return null;

    if (position.x !== undefined) widgetPos.x = position.x;
    if (position.y !== undefined) widgetPos.y = position.y;
    if (position.width !== undefined) widgetPos.width = position.width;
    if (position.height !== undefined) widgetPos.height = position.height;

    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  async updateLayout(dashboardId: string, layout: DashboardLayout): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    dashboard.layout = layout;
    dashboard.updatedAt = new Date();
    this.dashboards.set(dashboardId, dashboard);
    return dashboard;
  }

  // =================== WIDGET DATA ===================

  async getWidgetData(widgetId: string): Promise<WidgetData | null> {
    const widget = this.widgets.get(widgetId);
    if (!widget) return null;

    // Generate mock data based on widget type
    const data = this.generateMockData(widget);

    return {
      widgetId,
      data,
      lastUpdated: new Date(),
    };
  }

  private generateMockData(widget: Widget): any {
    switch (widget.type) {
      case 'kpi':
        return {
          value: Math.floor(Math.random() * 10000),
          change: (Math.random() * 20 - 10).toFixed(2),
          trend: Math.random() > 0.5 ? 'up' : 'down',
        };

      case 'chart':
        const points = [];
        for (let i = 0; i < 12; i++) {
          points.push({
            label: `Month ${i + 1}`,
            value: Math.floor(Math.random() * 1000),
          });
        }
        return { series: [{ name: 'Data', data: points }] };

      case 'table':
        return {
          columns: ['ID', 'Name', 'Value', 'Status'],
          rows: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
            value: Math.floor(Math.random() * 100),
            status: ['Active', 'Pending', 'Completed'][Math.floor(Math.random() * 3)],
          })),
        };

      case 'list':
        return {
          items: Array.from({ length: 5 }, (_, i) => ({
            title: `List Item ${i + 1}`,
            subtitle: `Description ${i + 1}`,
            value: Math.floor(Math.random() * 100),
          })),
        };

      default:
        return { message: 'Data not available' };
    }
  }

  async refreshWidgetData(widgetId: string): Promise<WidgetData | null> {
    return this.getWidgetData(widgetId);
  }

  // =================== TEMPLATES ===================

  async getWidgetTemplates(category?: string): Promise<WidgetTemplate[]> {
    let templates = Array.from(this.widgetTemplates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    return templates;
  }

  async getWidgetTemplate(templateId: string): Promise<WidgetTemplate | null> {
    return this.widgetTemplates.get(templateId) || null;
  }

  async createWidgetTemplate(
    name: string,
    description: string,
    type: WidgetType,
    category: string,
    defaultConfig: Partial<WidgetConfig>,
  ): Promise<WidgetTemplate> {
    const template: WidgetTemplate = {
      id: this.generateId('wt', Date.now()),
      name,
      description,
      type,
      category,
      defaultConfig,
      isSystem: false,
    };

    this.widgetTemplates.set(template.id, template);
    return template;
  }

  async getDashboardTemplates(category?: string): Promise<DashboardTemplate[]> {
    let templates = Array.from(this.dashboardTemplates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    return templates;
  }

  async createDashboardFromTemplate(
    templateId: string,
    tenantId: string,
    name: string,
    userId: string,
  ): Promise<Dashboard | null> {
    const template = this.dashboardTemplates.get(templateId);
    if (!template) return null;

    // Create widgets from template
    const widgetIdMap = new Map<string, string>();
    for (const templateWidget of template.widgets) {
      const newWidget = await this.createWidget(
        tenantId,
        templateWidget.name,
        templateWidget.type,
        templateWidget.config,
        userId,
      );
      widgetIdMap.set(templateWidget.id, newWidget.id);
    }

    // Create dashboard with mapped widget IDs
    const layout: DashboardLayout = {
      ...template.layout,
      widgets: template.layout.widgets.map(pos => ({
        ...pos,
        widgetId: widgetIdMap.get(pos.widgetId) || pos.widgetId,
      })),
    };

    return this.createDashboard(tenantId, name, userId, { layout });
  }

  // =================== STATISTICS ===================

  async getDashboardStats(tenantId: string): Promise<DashboardStats> {
    const dashboards = Array.from(this.dashboards.values())
      .filter(d => d.tenantId === tenantId);

    const widgets = Array.from(this.widgets.values())
      .filter(w => w.tenantId === tenantId);

    const typeMap = new Map<WidgetType, number>();
    const sourceMap = new Map<DataSource, number>();

    for (const widget of widgets) {
      typeMap.set(widget.type, (typeMap.get(widget.type) || 0) + 1);
      sourceMap.set(widget.config.dataSource, (sourceMap.get(widget.config.dataSource) || 0) + 1);
    }

    return {
      totalDashboards: dashboards.length,
      privateDashboards: dashboards.filter(d => d.visibility === 'private').length,
      sharedDashboards: dashboards.filter(d => d.visibility !== 'private').length,
      totalWidgets: widgets.length,
      widgetsByType: Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      mostUsedDataSources: Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  // =================== METADATA ===================

  getWidgetTypes(): WidgetType[] {
    return ['chart', 'kpi', 'table', 'list', 'map', 'calendar', 'progress', 'custom'];
  }

  getChartTypes(): ChartType[] {
    return ['line', 'bar', 'pie', 'donut', 'area', 'scatter', 'radar', 'gauge'];
  }

  getDataSources(): DataSource[] {
    return ['invoices', 'customers', 'orders', 'payments', 'employees', 'deliveries', 'documents', 'custom'];
  }

  getRefreshIntervals(): RefreshInterval[] {
    return ['realtime', '1min', '5min', '15min', '30min', '1hour', 'manual'];
  }

  getVisibilityOptions(): DashboardVisibility[] {
    return ['private', 'team', 'organization', 'public'];
  }
}
