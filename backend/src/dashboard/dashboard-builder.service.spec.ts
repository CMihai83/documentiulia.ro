import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  DashboardBuilderService,
  WidgetType,
  WidgetConfig,
  DashboardVisibility,
} from './dashboard-builder.service';

describe('DashboardBuilderService', () => {
  let service: DashboardBuilderService;
  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardBuilderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardBuilderService>(DashboardBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard CRUD', () => {
    it('should create a dashboard', async () => {
      const dashboard = await service.createDashboard(tenantId, 'My Dashboard', userId, {
        description: 'Test dashboard',
        visibility: 'private',
      });

      expect(dashboard).toBeDefined();
      expect(dashboard.id).toMatch(/^dash-/);
      expect(dashboard.name).toBe('My Dashboard');
      expect(dashboard.tenantId).toBe(tenantId);
      expect(dashboard.ownerId).toBe(userId);
      expect(dashboard.visibility).toBe('private');
      expect(dashboard.description).toBe('Test dashboard');
      expect(dashboard.layout.columns).toBe(12);
      expect(dashboard.layout.rows).toBe(8);
    });

    it('should get dashboard by ID', async () => {
      const created = await service.createDashboard(tenantId, 'Dashboard', userId);
      const retrieved = await service.getDashboard(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent dashboard', async () => {
      const result = await service.getDashboard('non-existent');
      expect(result).toBeNull();
    });

    it('should get dashboards for tenant', async () => {
      await service.createDashboard(tenantId, 'Dashboard 1', userId);
      await service.createDashboard(tenantId, 'Dashboard 2', userId);
      await service.createDashboard('other-tenant', 'Dashboard 3', userId);

      const dashboards = await service.getDashboards(tenantId);
      expect(dashboards).toHaveLength(2);
    });

    it('should filter dashboards by owner', async () => {
      await service.createDashboard(tenantId, 'Dashboard 1', userId);
      await service.createDashboard(tenantId, 'Dashboard 2', 'other-user');

      const dashboards = await service.getDashboards(tenantId, { ownerId: userId });
      expect(dashboards).toHaveLength(1);
      expect(dashboards[0].ownerId).toBe(userId);
    });

    it('should filter dashboards by visibility', async () => {
      await service.createDashboard(tenantId, 'Private', userId, { visibility: 'private' });
      await service.createDashboard(tenantId, 'Public', userId, { visibility: 'public' });

      const publicDashboards = await service.getDashboards(tenantId, { visibility: 'public' });
      expect(publicDashboards).toHaveLength(1);
      expect(publicDashboards[0].visibility).toBe('public');
    });

    it('should update dashboard', async () => {
      const created = await service.createDashboard(tenantId, 'Original', userId);
      const updated = await service.updateDashboard(created.id, {
        name: 'Updated',
        description: 'New description',
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('New description');
    });

    it('should delete dashboard', async () => {
      const created = await service.createDashboard(tenantId, 'To Delete', userId);
      const deleted = await service.deleteDashboard(created.id);

      expect(deleted).toBe(true);
      expect(await service.getDashboard(created.id)).toBeNull();
    });

    it('should create dashboard with custom layout', async () => {
      const dashboard = await service.createDashboard(tenantId, 'Custom Layout', userId, {
        layout: { columns: 24, rows: 16 },
      });

      expect(dashboard.layout.columns).toBe(24);
      expect(dashboard.layout.rows).toBe(16);
    });

    it('should create dashboard with theme', async () => {
      const theme = {
        primaryColor: '#3b82f6',
        backgroundColor: '#1f2937',
        textColor: '#ffffff',
      };

      const dashboard = await service.createDashboard(tenantId, 'Themed', userId, { theme });
      expect(dashboard.theme).toEqual(theme);
    });
  });

  describe('Default Dashboard', () => {
    it('should set default dashboard', async () => {
      const dash1 = await service.createDashboard(tenantId, 'Dashboard 1', userId);
      const dash2 = await service.createDashboard(tenantId, 'Dashboard 2', userId);

      await service.setDefaultDashboard(dash1.id, userId);
      let retrieved = await service.getDashboard(dash1.id);
      expect(retrieved?.isDefault).toBe(true);

      await service.setDefaultDashboard(dash2.id, userId);
      retrieved = await service.getDashboard(dash1.id);
      expect(retrieved?.isDefault).toBe(false);
      retrieved = await service.getDashboard(dash2.id);
      expect(retrieved?.isDefault).toBe(true);
    });

    it('should filter by isDefault', async () => {
      await service.createDashboard(tenantId, 'Dashboard 1', userId, { isDefault: true });
      await service.createDashboard(tenantId, 'Dashboard 2', userId);

      const defaults = await service.getDashboards(tenantId, { isDefault: true });
      expect(defaults).toHaveLength(1);
    });
  });

  describe('Dashboard Duplication', () => {
    it('should duplicate dashboard', async () => {
      const original = await service.createDashboard(tenantId, 'Original', userId, {
        description: 'Original description',
      });

      const duplicate = await service.duplicateDashboard(original.id, 'Copy', userId);

      expect(duplicate).toBeDefined();
      expect(duplicate?.name).toBe('Copy');
      expect(duplicate?.description).toBe('Original description');
      expect(duplicate?.id).not.toBe(original.id);
    });

    it('should duplicate dashboard with widgets', async () => {
      const original = await service.createDashboard(tenantId, 'Original', userId);

      const config: WidgetConfig = {
        dataSource: 'invoices',
        refreshInterval: '5min',
        displayOptions: { showLabels: true },
      };
      const widget = await service.createWidget(tenantId, 'Widget', 'kpi', config, userId);
      await service.addWidgetToDashboard(original.id, widget.id, { x: 0, y: 0, width: 4, height: 3 });

      const duplicate = await service.duplicateDashboard(original.id, 'Copy', userId);
      expect(duplicate?.layout.widgets).toHaveLength(1);
      expect(duplicate?.layout.widgets[0].widgetId).not.toBe(widget.id);
    });
  });

  describe('Dashboard Sharing', () => {
    it('should share dashboard', async () => {
      const dashboard = await service.createDashboard(tenantId, 'Shared', userId);
      await service.shareDashboard(dashboard.id, ['user-1', 'user-2']);

      const retrieved = await service.getDashboard(dashboard.id);
      expect(retrieved?.sharedWith).toContain('user-1');
      expect(retrieved?.sharedWith).toContain('user-2');
    });

    it('should not duplicate shares', async () => {
      const dashboard = await service.createDashboard(tenantId, 'Shared', userId);
      await service.shareDashboard(dashboard.id, ['user-1']);
      await service.shareDashboard(dashboard.id, ['user-1', 'user-2']);

      const retrieved = await service.getDashboard(dashboard.id);
      expect(retrieved?.sharedWith.filter(u => u === 'user-1')).toHaveLength(1);
    });

    it('should unshare dashboard', async () => {
      const dashboard = await service.createDashboard(tenantId, 'Shared', userId);
      await service.shareDashboard(dashboard.id, ['user-1', 'user-2']);
      await service.unshareDashboard(dashboard.id, 'user-1');

      const retrieved = await service.getDashboard(dashboard.id);
      expect(retrieved?.sharedWith).not.toContain('user-1');
      expect(retrieved?.sharedWith).toContain('user-2');
    });

    it('should get accessible dashboards', async () => {
      await service.createDashboard(tenantId, 'Own', userId);
      const shared = await service.createDashboard(tenantId, 'Shared', 'other-user');
      await service.shareDashboard(shared.id, [userId]);
      await service.createDashboard(tenantId, 'Org', 'other-user', { visibility: 'organization' });
      await service.createDashboard(tenantId, 'Private Other', 'other-user', { visibility: 'private' });

      const accessible = await service.getAccessibleDashboards(tenantId, userId);
      expect(accessible).toHaveLength(3); // Own, Shared, Org (not Private Other)
    });
  });

  describe('Widget CRUD', () => {
    it('should create widget', async () => {
      const config: WidgetConfig = {
        dataSource: 'invoices',
        chartType: 'line',
        refreshInterval: '5min',
        displayOptions: { showLegend: true, showGrid: true },
      };

      const widget = await service.createWidget(tenantId, 'Revenue Chart', 'chart', config, userId);

      expect(widget).toBeDefined();
      expect(widget.id).toMatch(/^widget-/);
      expect(widget.name).toBe('Revenue Chart');
      expect(widget.type).toBe('chart');
      expect(widget.config.dataSource).toBe('invoices');
    });

    it('should get widget by ID', async () => {
      const config: WidgetConfig = {
        dataSource: 'customers',
        refreshInterval: '5min',
        displayOptions: {},
      };
      const created = await service.createWidget(tenantId, 'Widget', 'kpi', config, userId);
      const retrieved = await service.getWidget(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get widgets for tenant', async () => {
      const config: WidgetConfig = {
        dataSource: 'custom',
        refreshInterval: '5min',
        displayOptions: {},
      };

      await service.createWidget(tenantId, 'Widget 1', 'kpi', config, userId);
      await service.createWidget(tenantId, 'Widget 2', 'chart', config, userId);
      await service.createWidget('other-tenant', 'Widget 3', 'table', config, userId);

      const widgets = await service.getWidgets(tenantId);
      expect(widgets).toHaveLength(2);
    });

    it('should filter widgets by type', async () => {
      const config: WidgetConfig = {
        dataSource: 'custom',
        refreshInterval: '5min',
        displayOptions: {},
      };

      await service.createWidget(tenantId, 'KPI 1', 'kpi', config, userId);
      await service.createWidget(tenantId, 'KPI 2', 'kpi', config, userId);
      await service.createWidget(tenantId, 'Chart', 'chart', config, userId);

      const kpis = await service.getWidgets(tenantId, 'kpi');
      expect(kpis).toHaveLength(2);
    });

    it('should update widget', async () => {
      const config: WidgetConfig = {
        dataSource: 'invoices',
        refreshInterval: '5min',
        displayOptions: { showLabels: true },
      };

      const created = await service.createWidget(tenantId, 'Original', 'kpi', config, userId);
      const updated = await service.updateWidget(created.id, {
        name: 'Updated',
        config: { refreshInterval: '1min' } as Partial<WidgetConfig>,
      } as any);

      expect(updated?.name).toBe('Updated');
      expect(updated?.config.refreshInterval).toBe('1min');
      expect(updated?.config.dataSource).toBe('invoices'); // Preserved
    });

    it('should delete widget', async () => {
      const config: WidgetConfig = {
        dataSource: 'custom',
        refreshInterval: '5min',
        displayOptions: {},
      };

      const widget = await service.createWidget(tenantId, 'To Delete', 'kpi', config, userId);
      const deleted = await service.deleteWidget(widget.id);

      expect(deleted).toBe(true);
      expect(await service.getWidget(widget.id)).toBeNull();
    });

    it('should remove widget from dashboards when deleted', async () => {
      const dashboard = await service.createDashboard(tenantId, 'Dashboard', userId);
      const config: WidgetConfig = {
        dataSource: 'custom',
        refreshInterval: '5min',
        displayOptions: {},
      };
      const widget = await service.createWidget(tenantId, 'Widget', 'kpi', config, userId);

      await service.addWidgetToDashboard(dashboard.id, widget.id, { x: 0, y: 0, width: 4, height: 3 });
      await service.deleteWidget(widget.id);

      const retrieved = await service.getDashboard(dashboard.id);
      expect(retrieved?.layout.widgets).toHaveLength(0);
    });
  });

  describe('Widget from Template', () => {
    it('should create widget from template', async () => {
      const widget = await service.createWidgetFromTemplate(
        tenantId,
        'tpl-kpi-basic',
        'My KPI',
        { dataSource: 'payments' },
        userId,
      );

      expect(widget).toBeDefined();
      expect(widget?.type).toBe('kpi');
      expect(widget?.config.dataSource).toBe('payments');
      expect(widget?.config.refreshInterval).toBe('5min');
    });

    it('should return null for non-existent template', async () => {
      const widget = await service.createWidgetFromTemplate(
        tenantId,
        'non-existent',
        'Widget',
        {},
        userId,
      );

      expect(widget).toBeNull();
    });

    it('should merge custom config with template defaults', async () => {
      const widget = await service.createWidgetFromTemplate(
        tenantId,
        'tpl-chart-line',
        'My Chart',
        {
          dataSource: 'orders',
          displayOptions: { showLabels: true, colors: ['#ff0000'] },
        },
        userId,
      );

      expect(widget?.config.chartType).toBe('line'); // From template
      expect(widget?.config.dataSource).toBe('orders'); // From custom
      expect(widget?.config.displayOptions.showLegend).toBe(true); // From template
      expect(widget?.config.displayOptions.showLabels).toBe(true); // From custom
    });
  });

  describe('Layout Management', () => {
    let dashboardId: string;
    let widgetId: string;

    beforeEach(async () => {
      const dashboard = await service.createDashboard(tenantId, 'Dashboard', userId);
      dashboardId = dashboard.id;

      const config: WidgetConfig = {
        dataSource: 'custom',
        refreshInterval: '5min',
        displayOptions: {},
      };
      const widget = await service.createWidget(tenantId, 'Widget', 'kpi', config, userId);
      widgetId = widget.id;
    });

    it('should add widget to dashboard', async () => {
      const result = await service.addWidgetToDashboard(dashboardId, widgetId, {
        x: 0,
        y: 0,
        width: 4,
        height: 3,
      });

      expect(result?.layout.widgets).toHaveLength(1);
      expect(result?.layout.widgets[0]).toEqual({
        widgetId,
        x: 0,
        y: 0,
        width: 4,
        height: 3,
      });
    });

    it('should update widget position when re-adding', async () => {
      await service.addWidgetToDashboard(dashboardId, widgetId, { x: 0, y: 0, width: 4, height: 3 });
      const result = await service.addWidgetToDashboard(dashboardId, widgetId, {
        x: 4,
        y: 0,
        width: 6,
        height: 4,
      });

      expect(result?.layout.widgets).toHaveLength(1);
      expect(result?.layout.widgets[0].x).toBe(4);
    });

    it('should remove widget from dashboard', async () => {
      await service.addWidgetToDashboard(dashboardId, widgetId, { x: 0, y: 0, width: 4, height: 3 });
      const result = await service.removeWidgetFromDashboard(dashboardId, widgetId);

      expect(result?.layout.widgets).toHaveLength(0);
    });

    it('should update widget position', async () => {
      await service.addWidgetToDashboard(dashboardId, widgetId, { x: 0, y: 0, width: 4, height: 3 });
      const result = await service.updateWidgetPosition(dashboardId, widgetId, {
        x: 2,
        width: 8,
      });

      expect(result?.layout.widgets[0].x).toBe(2);
      expect(result?.layout.widgets[0].y).toBe(0); // Unchanged
      expect(result?.layout.widgets[0].width).toBe(8);
      expect(result?.layout.widgets[0].height).toBe(3); // Unchanged
    });

    it('should update entire layout', async () => {
      const newLayout = {
        columns: 24,
        rows: 12,
        widgets: [{ widgetId, x: 0, y: 0, width: 12, height: 6 }],
      };

      const result = await service.updateLayout(dashboardId, newLayout);
      expect(result?.layout).toEqual(newLayout);
    });
  });

  describe('Widget Data', () => {
    it('should get KPI widget data', async () => {
      const config: WidgetConfig = {
        dataSource: 'invoices',
        refreshInterval: '5min',
        displayOptions: {},
      };
      const widget = await service.createWidget(tenantId, 'KPI', 'kpi', config, userId);
      const data = await service.getWidgetData(widget.id);

      expect(data).toBeDefined();
      expect(data?.widgetId).toBe(widget.id);
      expect(data?.data).toHaveProperty('value');
      expect(data?.data).toHaveProperty('change');
      expect(data?.data).toHaveProperty('trend');
    });

    it('should get chart widget data', async () => {
      const config: WidgetConfig = {
        dataSource: 'invoices',
        chartType: 'line',
        refreshInterval: '5min',
        displayOptions: {},
      };
      const widget = await service.createWidget(tenantId, 'Chart', 'chart', config, userId);
      const data = await service.getWidgetData(widget.id);

      expect(data?.data).toHaveProperty('series');
      expect(data?.data.series[0].data).toHaveLength(12);
    });

    it('should get table widget data', async () => {
      const config: WidgetConfig = {
        dataSource: 'customers',
        refreshInterval: '5min',
        displayOptions: {},
      };
      const widget = await service.createWidget(tenantId, 'Table', 'table', config, userId);
      const data = await service.getWidgetData(widget.id);

      expect(data?.data).toHaveProperty('columns');
      expect(data?.data).toHaveProperty('rows');
      expect(data?.data.rows).toHaveLength(10);
    });

    it('should get list widget data', async () => {
      const config: WidgetConfig = {
        dataSource: 'orders',
        refreshInterval: '5min',
        displayOptions: {},
      };
      const widget = await service.createWidget(tenantId, 'List', 'list', config, userId);
      const data = await service.getWidgetData(widget.id);

      expect(data?.data).toHaveProperty('items');
      expect(data?.data.items).toHaveLength(5);
    });

    it('should refresh widget data', async () => {
      const config: WidgetConfig = {
        dataSource: 'custom',
        refreshInterval: '5min',
        displayOptions: {},
      };
      const widget = await service.createWidget(tenantId, 'Widget', 'kpi', config, userId);

      const data1 = await service.getWidgetData(widget.id);
      const data2 = await service.refreshWidgetData(widget.id);

      expect(data1?.lastUpdated).toBeDefined();
      expect(data2?.lastUpdated).toBeDefined();
    });

    it('should return null for non-existent widget', async () => {
      const data = await service.getWidgetData('non-existent');
      expect(data).toBeNull();
    });
  });

  describe('Templates', () => {
    it('should get widget templates', async () => {
      const templates = await service.getWidgetTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.find(t => t.id === 'tpl-kpi-basic')).toBeDefined();
    });

    it('should filter widget templates by category', async () => {
      const charts = await service.getWidgetTemplates('charts');
      expect(charts.every(t => t.category === 'charts')).toBe(true);
    });

    it('should get widget template by ID', async () => {
      const template = await service.getWidgetTemplate('tpl-chart-line');
      expect(template).toBeDefined();
      expect(template?.type).toBe('chart');
    });

    it('should create custom widget template', async () => {
      const template = await service.createWidgetTemplate(
        'Custom KPI',
        'A custom KPI template',
        'kpi',
        'custom',
        { dataSource: 'custom', refreshInterval: '1min', displayOptions: {} },
      );

      expect(template.id).toMatch(/^wt-/);
      expect(template.isSystem).toBe(false);

      const retrieved = await service.getWidgetTemplate(template.id);
      expect(retrieved).toBeDefined();
    });

    it('should get dashboard templates', async () => {
      const templates = await service.getDashboardTemplates();
      expect(templates).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should get dashboard stats', async () => {
      await service.createDashboard(tenantId, 'Private', userId, { visibility: 'private' });
      await service.createDashboard(tenantId, 'Public', userId, { visibility: 'public' });

      const config: WidgetConfig = {
        dataSource: 'invoices',
        refreshInterval: '5min',
        displayOptions: {},
      };
      await service.createWidget(tenantId, 'KPI 1', 'kpi', config, userId);
      await service.createWidget(tenantId, 'KPI 2', 'kpi', config, userId);
      await service.createWidget(tenantId, 'Chart', 'chart', { ...config, dataSource: 'customers' }, userId);

      const stats = await service.getDashboardStats(tenantId);

      expect(stats.totalDashboards).toBe(2);
      expect(stats.privateDashboards).toBe(1);
      expect(stats.sharedDashboards).toBe(1);
      expect(stats.totalWidgets).toBe(3);
      expect(stats.widgetsByType.find(w => w.type === 'kpi')?.count).toBe(2);
      expect(stats.mostUsedDataSources.find(s => s.source === 'invoices')?.count).toBe(2);
    });
  });

  describe('Metadata', () => {
    it('should get widget types', () => {
      const types = service.getWidgetTypes();
      expect(types).toContain('chart');
      expect(types).toContain('kpi');
      expect(types).toContain('table');
      expect(types).toContain('list');
      expect(types).toContain('map');
    });

    it('should get chart types', () => {
      const types = service.getChartTypes();
      expect(types).toContain('line');
      expect(types).toContain('bar');
      expect(types).toContain('pie');
      expect(types).toContain('donut');
    });

    it('should get data sources', () => {
      const sources = service.getDataSources();
      expect(sources).toContain('invoices');
      expect(sources).toContain('customers');
      expect(sources).toContain('orders');
      expect(sources).toContain('custom');
    });

    it('should get refresh intervals', () => {
      const intervals = service.getRefreshIntervals();
      expect(intervals).toContain('realtime');
      expect(intervals).toContain('5min');
      expect(intervals).toContain('manual');
    });

    it('should get visibility options', () => {
      const options = service.getVisibilityOptions();
      expect(options).toContain('private');
      expect(options).toContain('team');
      expect(options).toContain('organization');
      expect(options).toContain('public');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tenant', async () => {
      const dashboards = await service.getDashboards('empty-tenant');
      expect(dashboards).toHaveLength(0);
    });

    it('should handle updating non-existent dashboard', async () => {
      const result = await service.updateDashboard('non-existent', { name: 'New' });
      expect(result).toBeNull();
    });

    it('should handle updating non-existent widget', async () => {
      const result = await service.updateWidget('non-existent', { name: 'New' });
      expect(result).toBeNull();
    });

    it('should handle adding widget to non-existent dashboard', async () => {
      const config: WidgetConfig = {
        dataSource: 'custom',
        refreshInterval: '5min',
        displayOptions: {},
      };
      const widget = await service.createWidget(tenantId, 'Widget', 'kpi', config, userId);
      const result = await service.addWidgetToDashboard('non-existent', widget.id, {
        x: 0, y: 0, width: 4, height: 3,
      });

      expect(result).toBeNull();
    });

    it('should handle adding non-existent widget to dashboard', async () => {
      const dashboard = await service.createDashboard(tenantId, 'Dashboard', userId);
      const result = await service.addWidgetToDashboard(dashboard.id, 'non-existent', {
        x: 0, y: 0, width: 4, height: 3,
      });

      expect(result).toBeNull();
    });

    it('should handle updating position of widget not in dashboard', async () => {
      const dashboard = await service.createDashboard(tenantId, 'Dashboard', userId);
      const result = await service.updateWidgetPosition(dashboard.id, 'non-existent', { x: 5 });

      expect(result).toBeNull();
    });
  });
});
