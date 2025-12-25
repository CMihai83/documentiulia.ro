import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type WidgetType =
  | 'chart'
  | 'metric'
  | 'table'
  | 'list'
  | 'map'
  | 'gauge'
  | 'progress'
  | 'calendar'
  | 'timeline'
  | 'heatmap'
  | 'funnel'
  | 'treemap'
  | 'custom';

export type ChartType =
  | 'line'
  | 'bar'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'radar'
  | 'waterfall'
  | 'candlestick'
  | 'bubble';

export interface DataSource {
  id: string;
  type: 'api' | 'database' | 'static' | 'calculated';
  endpoint?: string;
  query?: string;
  data?: any;
  refreshInterval?: number; // seconds
  transformations?: DataTransformation[];
}

export interface DataTransformation {
  type: 'filter' | 'aggregate' | 'sort' | 'limit' | 'map' | 'join';
  config: Record<string, any>;
}

export interface Widget {
  id: string;
  dashboardId: string;
  tenantId: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dataSource: DataSource;
  config: WidgetConfig;
  styling?: WidgetStyling;
  interactions?: WidgetInteraction[];
  drillDown?: DrillDownConfig;
  refreshInterval?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetConfig {
  chartType?: ChartType;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  series?: SeriesConfig[];
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  colors?: string[];
  thresholds?: ThresholdConfig[];
  format?: FormatConfig;
  columns?: TableColumn[];
  pagination?: PaginationConfig;
  filters?: FilterConfig[];
}

export interface AxisConfig {
  field: string;
  label?: string;
  type?: 'category' | 'value' | 'time' | 'log';
  format?: string;
  min?: number;
  max?: number;
}

export interface SeriesConfig {
  field: string;
  name: string;
  type?: ChartType;
  color?: string;
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface TooltipConfig {
  show: boolean;
  format?: string;
}

export interface ThresholdConfig {
  value: number;
  color: string;
  label?: string;
}

export interface FormatConfig {
  type: 'number' | 'currency' | 'percent' | 'date' | 'duration';
  locale?: string;
  currency?: string;
  decimals?: number;
}

export interface TableColumn {
  field: string;
  header: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  format?: FormatConfig;
}

export interface PaginationConfig {
  enabled: boolean;
  pageSize: number;
}

export interface FilterConfig {
  field: string;
  type: 'select' | 'range' | 'date' | 'search';
  options?: any[];
  defaultValue?: any;
}

export interface WidgetStyling {
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  shadow?: boolean;
  titleStyle?: TextStyle;
  valueStyle?: TextStyle;
}

export interface TextStyle {
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export interface WidgetInteraction {
  type: 'click' | 'hover' | 'select';
  action: 'filter' | 'drillDown' | 'navigate' | 'custom';
  target?: string;
  config?: Record<string, any>;
}

export interface DrillDownConfig {
  enabled: boolean;
  levels: DrillDownLevel[];
}

export interface DrillDownLevel {
  field: string;
  dataSource: DataSource;
  widgetConfig: Partial<WidgetConfig>;
}

export interface Dashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  slug: string;
  layout: DashboardLayout;
  widgets: Widget[];
  filters: GlobalFilter[];
  variables: DashboardVariable[];
  theme?: DashboardTheme;
  permissions: DashboardPermission[];
  isDefault?: boolean;
  isPublic?: boolean;
  publicToken?: string;
  refreshInterval?: number;
  tags?: string[];
  category?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  type: 'grid' | 'freeform';
  columns: number;
  rowHeight: number;
  gap: number;
  responsive?: ResponsiveBreakpoint[];
}

export interface ResponsiveBreakpoint {
  breakpoint: number;
  columns: number;
  rowHeight: number;
}

export interface GlobalFilter {
  id: string;
  field: string;
  label: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'search';
  options?: any[];
  defaultValue?: any;
  affectsWidgets: string[]; // widget IDs
}

export interface DashboardVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'array';
  defaultValue: any;
  source?: 'static' | 'query';
  query?: string;
}

export interface DashboardTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  chartColors: string[];
}

export interface DashboardPermission {
  userId?: string;
  roleId?: string;
  permission: 'view' | 'edit' | 'admin';
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  layout: DashboardLayout;
  widgets: Omit<Widget, 'id' | 'dashboardId' | 'tenantId' | 'createdAt' | 'updatedAt'>[];
  filters: Omit<GlobalFilter, 'id'>[];
  variables: Omit<DashboardVariable, 'id'>[];
  theme?: DashboardTheme;
}

@Injectable()
export class DashboardBuilderService {
  private dashboards: Map<string, Dashboard> = new Map();
  private widgets: Map<string, Widget> = new Map();
  private templates: Map<string, DashboardTemplate> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const templates: DashboardTemplate[] = [
      {
        id: 'finance-overview',
        name: 'Finance Overview',
        description: 'Track revenue, expenses, cash flow, and key financial metrics',
        category: 'finance',
        layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
        widgets: [
          {
            type: 'metric',
            title: 'Total Revenue',
            dataSource: { id: 'revenue', type: 'api', endpoint: '/api/finance/revenue' },
            config: { format: { type: 'currency', currency: 'RON' } },
            position: { x: 0, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Total Expenses',
            dataSource: { id: 'expenses', type: 'api', endpoint: '/api/finance/expenses' },
            config: { format: { type: 'currency', currency: 'RON' } },
            position: { x: 3, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Net Profit',
            dataSource: { id: 'profit', type: 'api', endpoint: '/api/finance/profit' },
            config: { format: { type: 'currency', currency: 'RON' } },
            position: { x: 6, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Cash Flow',
            dataSource: { id: 'cashflow', type: 'api', endpoint: '/api/finance/cashflow' },
            config: { format: { type: 'currency', currency: 'RON' } },
            position: { x: 9, y: 0, width: 3, height: 2 },
          },
          {
            type: 'chart',
            title: 'Revenue Trend',
            dataSource: { id: 'revenue-trend', type: 'api', endpoint: '/api/finance/revenue/trend' },
            config: {
              chartType: 'area',
              xAxis: { field: 'date', type: 'time' },
              yAxis: { field: 'amount', type: 'value' },
              series: [{ field: 'revenue', name: 'Revenue', color: '#4CAF50' }],
            },
            position: { x: 0, y: 2, width: 8, height: 4 },
          },
          {
            type: 'chart',
            title: 'Expense Breakdown',
            dataSource: { id: 'expense-breakdown', type: 'api', endpoint: '/api/finance/expenses/breakdown' },
            config: {
              chartType: 'donut',
              series: [{ field: 'amount', name: 'Amount' }],
            },
            position: { x: 8, y: 2, width: 4, height: 4 },
          },
        ],
        filters: [
          { field: 'dateRange', label: 'Date Range', type: 'daterange', affectsWidgets: ['all'] },
          { field: 'currency', label: 'Currency', type: 'select', affectsWidgets: ['all'] },
        ],
        variables: [],
      },
      {
        id: 'sales-dashboard',
        name: 'Sales Dashboard',
        description: 'Monitor sales performance, pipeline, and team metrics',
        category: 'sales',
        layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
        widgets: [
          {
            type: 'metric',
            title: 'Total Sales',
            dataSource: { id: 'sales', type: 'api', endpoint: '/api/sales/total' },
            config: { format: { type: 'currency', currency: 'RON' } },
            position: { x: 0, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Deals Won',
            dataSource: { id: 'deals-won', type: 'api', endpoint: '/api/crm/deals/won/count' },
            config: { format: { type: 'number' } },
            position: { x: 3, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Win Rate',
            dataSource: { id: 'win-rate', type: 'api', endpoint: '/api/crm/deals/win-rate' },
            config: { format: { type: 'percent' } },
            position: { x: 6, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Avg Deal Size',
            dataSource: { id: 'avg-deal', type: 'api', endpoint: '/api/crm/deals/avg-size' },
            config: { format: { type: 'currency', currency: 'RON' } },
            position: { x: 9, y: 0, width: 3, height: 2 },
          },
          {
            type: 'funnel',
            title: 'Sales Funnel',
            dataSource: { id: 'funnel', type: 'api', endpoint: '/api/crm/pipeline/funnel' },
            config: { series: [{ field: 'count', name: 'Deals' }] },
            position: { x: 0, y: 2, width: 6, height: 4 },
          },
          {
            type: 'chart',
            title: 'Sales by Rep',
            dataSource: { id: 'sales-rep', type: 'api', endpoint: '/api/sales/by-rep' },
            config: {
              chartType: 'bar',
              xAxis: { field: 'rep', type: 'category' },
              yAxis: { field: 'sales', type: 'value' },
            },
            position: { x: 6, y: 2, width: 6, height: 4 },
          },
        ],
        filters: [
          { field: 'dateRange', label: 'Period', type: 'daterange', affectsWidgets: ['all'] },
          { field: 'team', label: 'Team', type: 'select', affectsWidgets: ['all'] },
        ],
        variables: [],
      },
      {
        id: 'hr-analytics',
        name: 'HR Analytics',
        description: 'Employee metrics, attendance, and workforce analytics',
        category: 'hr',
        layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
        widgets: [
          {
            type: 'metric',
            title: 'Total Employees',
            dataSource: { id: 'employees', type: 'api', endpoint: '/api/hr/employees/count' },
            config: { format: { type: 'number' } },
            position: { x: 0, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Turnover Rate',
            dataSource: { id: 'turnover', type: 'api', endpoint: '/api/hr/turnover' },
            config: { format: { type: 'percent' } },
            position: { x: 3, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Avg Tenure',
            dataSource: { id: 'tenure', type: 'api', endpoint: '/api/hr/avg-tenure' },
            config: { format: { type: 'duration' } },
            position: { x: 6, y: 0, width: 3, height: 2 },
          },
          {
            type: 'gauge',
            title: 'Satisfaction',
            dataSource: { id: 'satisfaction', type: 'api', endpoint: '/api/hr/satisfaction' },
            config: {
              thresholds: [
                { value: 60, color: '#f44336' },
                { value: 80, color: '#ff9800' },
                { value: 100, color: '#4caf50' },
              ],
            },
            position: { x: 9, y: 0, width: 3, height: 2 },
          },
          {
            type: 'chart',
            title: 'Headcount Trend',
            dataSource: { id: 'headcount', type: 'api', endpoint: '/api/hr/headcount/trend' },
            config: {
              chartType: 'line',
              xAxis: { field: 'month', type: 'time' },
              yAxis: { field: 'count', type: 'value' },
            },
            position: { x: 0, y: 2, width: 6, height: 4 },
          },
          {
            type: 'chart',
            title: 'Department Distribution',
            dataSource: { id: 'departments', type: 'api', endpoint: '/api/hr/by-department' },
            config: { chartType: 'donut' },
            position: { x: 6, y: 2, width: 6, height: 4 },
          },
        ],
        filters: [],
        variables: [],
      },
      {
        id: 'operations-kpi',
        name: 'Operations KPI',
        description: 'Track operational efficiency, inventory, and logistics',
        category: 'operations',
        layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
        widgets: [
          {
            type: 'metric',
            title: 'Orders Today',
            dataSource: { id: 'orders', type: 'api', endpoint: '/api/operations/orders/today' },
            config: { format: { type: 'number' } },
            position: { x: 0, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Fulfillment Rate',
            dataSource: { id: 'fulfillment', type: 'api', endpoint: '/api/operations/fulfillment-rate' },
            config: { format: { type: 'percent' } },
            position: { x: 3, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Inventory Value',
            dataSource: { id: 'inventory', type: 'api', endpoint: '/api/warehouse/value' },
            config: { format: { type: 'currency', currency: 'RON' } },
            position: { x: 6, y: 0, width: 3, height: 2 },
          },
          {
            type: 'metric',
            title: 'Avg Delivery Time',
            dataSource: { id: 'delivery', type: 'api', endpoint: '/api/logistics/avg-delivery' },
            config: { format: { type: 'duration' } },
            position: { x: 9, y: 0, width: 3, height: 2 },
          },
        ],
        filters: [],
        variables: [],
      },
      {
        id: 'executive-summary',
        name: 'Executive Summary',
        description: 'High-level business overview for executives',
        category: 'executive',
        layout: { type: 'grid', columns: 12, rowHeight: 80, gap: 16 },
        widgets: [
          {
            type: 'metric',
            title: 'Revenue YTD',
            dataSource: { id: 'ytd-revenue', type: 'api', endpoint: '/api/finance/ytd/revenue' },
            config: { format: { type: 'currency', currency: 'RON' } },
            position: { x: 0, y: 0, width: 4, height: 2 },
          },
          {
            type: 'metric',
            title: 'Growth Rate',
            dataSource: { id: 'growth', type: 'api', endpoint: '/api/finance/growth' },
            config: { format: { type: 'percent' } },
            position: { x: 4, y: 0, width: 4, height: 2 },
          },
          {
            type: 'metric',
            title: 'Customer Count',
            dataSource: { id: 'customers', type: 'api', endpoint: '/api/crm/customers/count' },
            config: { format: { type: 'number' } },
            position: { x: 8, y: 0, width: 4, height: 2 },
          },
        ],
        filters: [
          { field: 'period', label: 'Period', type: 'select', affectsWidgets: ['all'] },
        ],
        variables: [],
      },
    ];

    templates.forEach(t => this.templates.set(t.id, t));
  }

  // =================== DASHBOARDS ===================

  async createDashboard(data: {
    tenantId: string;
    name: string;
    description?: string;
    layout?: DashboardLayout;
    theme?: DashboardTheme;
    isDefault?: boolean;
    createdBy: string;
    templateId?: string;
  }): Promise<Dashboard> {
    const id = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const slug = this.generateSlug(data.name);

    let widgets: Widget[] = [];
    let filters: GlobalFilter[] = [];
    let variables: DashboardVariable[] = [];
    let layout = data.layout || { type: 'grid', columns: 12, rowHeight: 80, gap: 16 };
    let theme = data.theme;

    // Apply template if specified
    if (data.templateId) {
      const template = this.templates.get(data.templateId);
      if (template) {
        layout = template.layout;
        theme = template.theme;

        // Create widgets from template
        widgets = template.widgets.map((w, idx) => ({
          ...w,
          id: `widget_${Date.now()}_${idx}`,
          dashboardId: id,
          tenantId: data.tenantId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        filters = template.filters.map((f, idx) => ({
          ...f,
          id: `filter_${Date.now()}_${idx}`,
        }));

        variables = template.variables.map((v, idx) => ({
          ...v,
          id: `var_${Date.now()}_${idx}`,
        }));
      }
    }

    const dashboard: Dashboard = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      slug,
      layout,
      widgets,
      filters,
      variables,
      theme,
      permissions: [{ userId: data.createdBy, permission: 'admin' }],
      isDefault: data.isDefault || false,
      isPublic: false,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(id, dashboard);
    widgets.forEach(w => this.widgets.set(w.id, w));

    // If set as default, unset other defaults
    if (data.isDefault) {
      this.dashboards.forEach((d, key) => {
        if (key !== id && d.tenantId === data.tenantId && d.isDefault) {
          d.isDefault = false;
        }
      });
    }

    this.eventEmitter.emit('dashboard.created', { dashboard });
    return dashboard;
  }

  async getDashboard(id: string): Promise<Dashboard | undefined> {
    return this.dashboards.get(id);
  }

  async getDashboardBySlug(tenantId: string, slug: string): Promise<Dashboard | undefined> {
    return Array.from(this.dashboards.values()).find(
      d => d.tenantId === tenantId && d.slug === slug
    );
  }

  async getDashboards(tenantId: string, options?: {
    category?: string;
    tag?: string;
    userId?: string;
  }): Promise<Dashboard[]> {
    let dashboards = Array.from(this.dashboards.values()).filter(
      d => d.tenantId === tenantId
    );

    if (options?.category) {
      dashboards = dashboards.filter(d => d.category === options.category);
    }

    if (options?.tag) {
      dashboards = dashboards.filter(d => d.tags?.includes(options.tag!));
    }

    if (options?.userId) {
      dashboards = dashboards.filter(d =>
        d.permissions.some(p => p.userId === options.userId)
      );
    }

    return dashboards.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  async updateDashboard(id: string, updates: Partial<{
    name: string;
    description: string;
    layout: DashboardLayout;
    theme: DashboardTheme;
    filters: GlobalFilter[];
    variables: DashboardVariable[];
    isDefault: boolean;
    isPublic: boolean;
    tags: string[];
    category: string;
    refreshInterval: number;
  }>): Promise<Dashboard | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;

    Object.assign(dashboard, updates, { updatedAt: new Date() });

    if (updates.name) {
      dashboard.slug = this.generateSlug(updates.name);
    }

    if (updates.isDefault) {
      this.dashboards.forEach((d, key) => {
        if (key !== id && d.tenantId === dashboard.tenantId && d.isDefault) {
          d.isDefault = false;
        }
      });
    }

    this.eventEmitter.emit('dashboard.updated', { dashboard });
    return dashboard;
  }

  async deleteDashboard(id: string): Promise<void> {
    const dashboard = this.dashboards.get(id);
    if (dashboard) {
      // Delete associated widgets
      dashboard.widgets.forEach(w => this.widgets.delete(w.id));
      this.dashboards.delete(id);
      this.eventEmitter.emit('dashboard.deleted', { dashboardId: id });
    }
  }

  async duplicateDashboard(id: string, newName: string, userId: string): Promise<Dashboard | undefined> {
    const original = this.dashboards.get(id);
    if (!original) return undefined;

    const newDashboard = await this.createDashboard({
      tenantId: original.tenantId,
      name: newName,
      description: original.description,
      layout: { ...original.layout },
      theme: original.theme ? { ...original.theme } : undefined,
      createdBy: userId,
    });

    // Duplicate widgets
    for (const widget of original.widgets) {
      await this.addWidget(newDashboard.id, {
        type: widget.type,
        title: widget.title,
        description: widget.description,
        position: { ...widget.position },
        dataSource: { ...widget.dataSource },
        config: { ...widget.config },
        styling: widget.styling ? { ...widget.styling } : undefined,
        refreshInterval: widget.refreshInterval,
      });
    }

    // Copy filters and variables
    newDashboard.filters = original.filters.map((f, idx) => ({
      ...f,
      id: `filter_${Date.now()}_${idx}`,
    }));

    newDashboard.variables = original.variables.map((v, idx) => ({
      ...v,
      id: `var_${Date.now()}_${idx}`,
    }));

    return newDashboard;
  }

  async generatePublicLink(id: string): Promise<string | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;

    const token = `pub_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    dashboard.isPublic = true;
    dashboard.publicToken = token;
    dashboard.updatedAt = new Date();

    return `/public/dashboard/${token}`;
  }

  async revokePublicLink(id: string): Promise<void> {
    const dashboard = this.dashboards.get(id);
    if (dashboard) {
      dashboard.isPublic = false;
      dashboard.publicToken = undefined;
      dashboard.updatedAt = new Date();
    }
  }

  // =================== WIDGETS ===================

  async addWidget(dashboardId: string, data: {
    type: WidgetType;
    title: string;
    description?: string;
    position: Widget['position'];
    dataSource: DataSource;
    config: WidgetConfig;
    styling?: WidgetStyling;
    interactions?: WidgetInteraction[];
    drillDown?: DrillDownConfig;
    refreshInterval?: number;
  }): Promise<Widget | undefined> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return undefined;

    const id = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const widget: Widget = {
      id,
      dashboardId,
      tenantId: dashboard.tenantId,
      type: data.type,
      title: data.title,
      description: data.description,
      position: data.position,
      dataSource: data.dataSource,
      config: data.config,
      styling: data.styling,
      interactions: data.interactions,
      drillDown: data.drillDown,
      refreshInterval: data.refreshInterval,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.widgets.set(id, widget);
    dashboard.widgets.push(widget);
    dashboard.updatedAt = new Date();

    this.eventEmitter.emit('widget.added', { widget, dashboardId });
    return widget;
  }

  async getWidget(id: string): Promise<Widget | undefined> {
    return this.widgets.get(id);
  }

  async updateWidget(id: string, updates: Partial<{
    title: string;
    description: string;
    position: Widget['position'];
    dataSource: DataSource;
    config: WidgetConfig;
    styling: WidgetStyling;
    interactions: WidgetInteraction[];
    drillDown: DrillDownConfig;
    refreshInterval: number;
  }>): Promise<Widget | undefined> {
    const widget = this.widgets.get(id);
    if (!widget) return undefined;

    Object.assign(widget, updates, { updatedAt: new Date() });

    const dashboard = this.dashboards.get(widget.dashboardId);
    if (dashboard) {
      dashboard.updatedAt = new Date();
    }

    this.eventEmitter.emit('widget.updated', { widget });
    return widget;
  }

  async removeWidget(id: string): Promise<void> {
    const widget = this.widgets.get(id);
    if (widget) {
      const dashboard = this.dashboards.get(widget.dashboardId);
      if (dashboard) {
        dashboard.widgets = dashboard.widgets.filter(w => w.id !== id);
        dashboard.updatedAt = new Date();
      }
      this.widgets.delete(id);
      this.eventEmitter.emit('widget.removed', { widgetId: id });
    }
  }

  async duplicateWidget(id: string): Promise<Widget | undefined> {
    const original = this.widgets.get(id);
    if (!original) return undefined;

    return this.addWidget(original.dashboardId, {
      type: original.type,
      title: `${original.title} (Copy)`,
      description: original.description,
      position: {
        ...original.position,
        x: original.position.x + 1,
        y: original.position.y + 1,
      },
      dataSource: { ...original.dataSource },
      config: { ...original.config },
      styling: original.styling ? { ...original.styling } : undefined,
      interactions: original.interactions?.map(i => ({ ...i })),
      drillDown: original.drillDown ? { ...original.drillDown } : undefined,
      refreshInterval: original.refreshInterval,
    });
  }

  async moveWidget(id: string, position: Widget['position']): Promise<Widget | undefined> {
    return this.updateWidget(id, { position });
  }

  async resizeWidget(id: string, width: number, height: number): Promise<Widget | undefined> {
    const widget = this.widgets.get(id);
    if (!widget) return undefined;

    return this.updateWidget(id, {
      position: { ...widget.position, width, height },
    });
  }

  // =================== DATA FETCHING ===================

  async fetchWidgetData(widgetId: string, filters?: Record<string, any>): Promise<any> {
    const widget = this.widgets.get(widgetId);
    if (!widget) return null;

    // Simulate data fetching based on data source type
    const { dataSource } = widget;

    switch (dataSource.type) {
      case 'static':
        return dataSource.data;

      case 'api':
        // In production, this would make actual API calls
        return this.simulateApiData(dataSource.endpoint!, widget.type);

      case 'database':
        // In production, this would execute database queries
        return this.simulateDatabaseData(dataSource.query!);

      case 'calculated':
        return this.calculateData(dataSource, filters);

      default:
        return null;
    }
  }

  private simulateApiData(endpoint: string, widgetType: WidgetType): any {
    // Generate sample data based on endpoint and widget type
    if (widgetType === 'metric') {
      return { value: Math.floor(Math.random() * 100000), change: (Math.random() - 0.5) * 20 };
    }

    if (widgetType === 'chart') {
      return Array.from({ length: 12 }, (_, i) => ({
        date: new Date(2024, i, 1).toISOString(),
        value: Math.floor(Math.random() * 50000) + 10000,
      }));
    }

    if (widgetType === 'table') {
      return Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.floor(Math.random() * 1000),
        status: ['active', 'pending', 'completed'][i % 3],
      }));
    }

    return { data: [] };
  }

  private simulateDatabaseData(_query: string): any {
    return { rows: [], count: 0 };
  }

  private calculateData(_source: DataSource, _filters?: Record<string, any>): any {
    return { result: 0 };
  }

  async refreshDashboard(id: string): Promise<Record<string, any>> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return {};

    const data: Record<string, any> = {};

    for (const widget of dashboard.widgets) {
      data[widget.id] = await this.fetchWidgetData(widget.id);
    }

    this.eventEmitter.emit('dashboard.refreshed', { dashboardId: id, data });
    return data;
  }

  // =================== TEMPLATES ===================

  async getTemplates(category?: string): Promise<DashboardTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    return templates;
  }

  async getTemplate(id: string): Promise<DashboardTemplate | undefined> {
    return this.templates.get(id);
  }

  async createTemplateFromDashboard(dashboardId: string, data: {
    name: string;
    description: string;
    category: string;
  }): Promise<DashboardTemplate | undefined> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return undefined;

    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const template: DashboardTemplate = {
      id,
      name: data.name,
      description: data.description,
      category: data.category,
      layout: { ...dashboard.layout },
      widgets: dashboard.widgets.map(w => ({
        type: w.type,
        title: w.title,
        description: w.description,
        position: { ...w.position },
        dataSource: { ...w.dataSource },
        config: { ...w.config },
        styling: w.styling ? { ...w.styling } : undefined,
      })),
      filters: dashboard.filters.map(f => ({
        field: f.field,
        label: f.label,
        type: f.type,
        options: f.options,
        defaultValue: f.defaultValue,
        affectsWidgets: [...f.affectsWidgets],
      })),
      variables: dashboard.variables.map(v => ({
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue,
        source: v.source,
        query: v.query,
      })),
      theme: dashboard.theme ? { ...dashboard.theme } : undefined,
    };

    this.templates.set(id, template);
    return template;
  }

  // =================== PERMISSIONS ===================

  async setPermission(dashboardId: string, permission: DashboardPermission): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return;

    const existingIdx = dashboard.permissions.findIndex(
      p => (permission.userId && p.userId === permission.userId) ||
           (permission.roleId && p.roleId === permission.roleId)
    );

    if (existingIdx >= 0) {
      dashboard.permissions[existingIdx] = permission;
    } else {
      dashboard.permissions.push(permission);
    }

    dashboard.updatedAt = new Date();
  }

  async removePermission(dashboardId: string, userId?: string, roleId?: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return;

    dashboard.permissions = dashboard.permissions.filter(
      p => !(userId && p.userId === userId) && !(roleId && p.roleId === roleId)
    );

    dashboard.updatedAt = new Date();
  }

  async checkPermission(dashboardId: string, userId: string, required: 'view' | 'edit' | 'admin'): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    if (dashboard.isPublic && required === 'view') return true;

    const userPermission = dashboard.permissions.find(p => p.userId === userId);
    if (!userPermission) return false;

    const levels = { view: 1, edit: 2, admin: 3 };
    return levels[userPermission.permission] >= levels[required];
  }

  // =================== EXPORT/IMPORT ===================

  async exportDashboard(id: string): Promise<object | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      dashboard: {
        name: dashboard.name,
        description: dashboard.description,
        layout: dashboard.layout,
        widgets: dashboard.widgets.map(w => ({
          type: w.type,
          title: w.title,
          description: w.description,
          position: w.position,
          dataSource: w.dataSource,
          config: w.config,
          styling: w.styling,
        })),
        filters: dashboard.filters,
        variables: dashboard.variables,
        theme: dashboard.theme,
      },
    };
  }

  async importDashboard(tenantId: string, userId: string, data: any): Promise<Dashboard> {
    const { dashboard: d } = data;

    return this.createDashboard({
      tenantId,
      name: `${d.name} (Imported)`,
      description: d.description,
      layout: d.layout,
      theme: d.theme,
      createdBy: userId,
    });
  }

  // =================== HELPERS ===================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async getStats(tenantId: string): Promise<{
    totalDashboards: number;
    totalWidgets: number;
    publicDashboards: number;
    byCategory: Record<string, number>;
    recentlyUpdated: Dashboard[];
  }> {
    const dashboards = Array.from(this.dashboards.values()).filter(
      d => d.tenantId === tenantId
    );

    const byCategory: Record<string, number> = {};
    dashboards.forEach(d => {
      const cat = d.category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    return {
      totalDashboards: dashboards.length,
      totalWidgets: dashboards.reduce((sum, d) => sum + d.widgets.length, 0),
      publicDashboards: dashboards.filter(d => d.isPublic).length,
      byCategory,
      recentlyUpdated: dashboards
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 5),
    };
  }
}
