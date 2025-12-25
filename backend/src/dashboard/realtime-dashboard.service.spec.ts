import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RealtimeDashboardService, DASHBOARD_TEMPLATES } from './realtime-dashboard.service';

describe('RealtimeDashboardService', () => {
  let service: RealtimeDashboardService;
  let dashboardId: string;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeDashboardService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RealtimeDashboardService>(RealtimeDashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default system dashboard', async () => {
      const dashboards = await service.listDashboards();
      expect(dashboards.some((d) => d.id === 'system-overview')).toBe(true);
    });

    it('should have dashboard templates', () => {
      expect(DASHBOARD_TEMPLATES.length).toBeGreaterThan(0);
    });
  });

  describe('dashboard CRUD', () => {
    it('should create a dashboard', async () => {
      const dashboard = await service.createDashboard({
        name: 'Test Dashboard',
        description: 'A test dashboard',
        ownerId: 'user-123',
        isPublic: false,
        isDefault: false,
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'light',
        timeRange: '7d',
        autoRefresh: true,
        refreshInterval: 60,
        filters: [],
      });

      expect(dashboard.id).toBeDefined();
      expect(dashboard.name).toBe('Test Dashboard');
      dashboardId = dashboard.id;
    });

    it('should get a dashboard by ID', async () => {
      const created = await service.createDashboard({
        name: 'Get Test',
        ownerId: 'user-123',
        isPublic: false,
        isDefault: false,
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'system',
        timeRange: '24h',
        autoRefresh: true,
        refreshInterval: 30,
        filters: [],
      });

      const dashboard = await service.getDashboard(created.id);
      expect(dashboard).toBeDefined();
      expect(dashboard?.name).toBe('Get Test');
    });

    it('should update a dashboard', async () => {
      const created = await service.createDashboard({
        name: 'Update Test',
        ownerId: 'user-123',
        isPublic: false,
        isDefault: false,
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'light',
        timeRange: '7d',
        autoRefresh: true,
        refreshInterval: 60,
        filters: [],
      });

      const updated = await service.updateDashboard(created.id, {
        name: 'Updated Name',
        theme: 'dark',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.theme).toBe('dark');
    });

    it('should delete a dashboard', async () => {
      const created = await service.createDashboard({
        name: 'Delete Test',
        ownerId: 'user-123',
        isPublic: false,
        isDefault: false,
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'system',
        timeRange: '7d',
        autoRefresh: true,
        refreshInterval: 60,
        filters: [],
      });

      const result = await service.deleteDashboard(created.id);
      expect(result).toBe(true);

      const deleted = await service.getDashboard(created.id);
      expect(deleted).toBeNull();
    });

    it('should list dashboards', async () => {
      const dashboards = await service.listDashboards();
      expect(dashboards.length).toBeGreaterThan(0);
    });

    it('should filter dashboards by owner', async () => {
      await service.createDashboard({
        name: 'Owner Test',
        ownerId: 'specific-owner',
        isPublic: false,
        isDefault: false,
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'system',
        timeRange: '7d',
        autoRefresh: true,
        refreshInterval: 60,
        filters: [],
      });

      const dashboards = await service.listDashboards('specific-owner');
      expect(dashboards.some((d) => d.ownerId === 'specific-owner')).toBe(true);
    });

    it('should duplicate a dashboard', async () => {
      const original = await service.createDashboard({
        name: 'Original',
        ownerId: 'user-1',
        isPublic: false,
        isDefault: false,
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'system',
        timeRange: '7d',
        autoRefresh: true,
        refreshInterval: 60,
        filters: [],
      });

      const duplicate = await service.duplicateDashboard(original.id, 'user-2');

      expect(duplicate).toBeDefined();
      expect(duplicate?.name).toContain('Copy');
      expect(duplicate?.ownerId).toBe('user-2');
    });
  });

  describe('widget management', () => {
    beforeEach(async () => {
      const dashboard = await service.createDashboard({
        name: 'Widget Test',
        ownerId: 'user-123',
        isPublic: false,
        isDefault: false,
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'system',
        timeRange: '7d',
        autoRefresh: true,
        refreshInterval: 60,
        filters: [],
      });
      dashboardId = dashboard.id;
    });

    it('should add a widget', async () => {
      const widget = await service.addWidget(dashboardId, {
        type: 'kpi_card',
        title: 'Test KPI',
        dataSource: { type: 'api', endpoint: '/metrics/test' },
        config: { trend: true },
        position: { x: 0, y: 0, w: 3, h: 2 },
        refreshInterval: 30,
      });

      expect(widget).toBeDefined();
      expect(widget?.id).toBeDefined();
      expect(widget?.title).toBe('Test KPI');
    });

    it('should update a widget', async () => {
      const widget = await service.addWidget(dashboardId, {
        type: 'bar_chart',
        title: 'Original Title',
        dataSource: { type: 'api', endpoint: '/metrics/test' },
        config: {},
        position: { x: 0, y: 0, w: 6, h: 4 },
        refreshInterval: 60,
      });

      const updated = await service.updateWidget(dashboardId, widget!.id, {
        title: 'Updated Title',
      });

      expect(updated?.title).toBe('Updated Title');
    });

    it('should remove a widget', async () => {
      const widget = await service.addWidget(dashboardId, {
        type: 'pie_chart',
        title: 'To Remove',
        dataSource: { type: 'api', endpoint: '/metrics/test' },
        config: {},
        position: { x: 0, y: 0, w: 4, h: 4 },
        refreshInterval: 60,
      });

      const result = await service.removeWidget(dashboardId, widget!.id);
      expect(result).toBe(true);

      const dashboard = await service.getDashboard(dashboardId);
      expect(dashboard?.widgets.find((w) => w.id === widget?.id)).toBeUndefined();
    });

    it('should update widget positions', async () => {
      const widget1 = await service.addWidget(dashboardId, {
        type: 'kpi_card',
        title: 'Widget 1',
        dataSource: { type: 'api', endpoint: '/metrics/1' },
        config: {},
        position: { x: 0, y: 0, w: 3, h: 2 },
        refreshInterval: 30,
      });

      const widget2 = await service.addWidget(dashboardId, {
        type: 'kpi_card',
        title: 'Widget 2',
        dataSource: { type: 'api', endpoint: '/metrics/2' },
        config: {},
        position: { x: 3, y: 0, w: 3, h: 2 },
        refreshInterval: 30,
      });

      const result = await service.updateWidgetPositions(dashboardId, [
        { id: widget1!.id, x: 6, y: 0, w: 3, h: 2 },
        { id: widget2!.id, x: 0, y: 0, w: 3, h: 2 },
      ]);

      expect(result).toBe(true);

      const dashboard = await service.getDashboard(dashboardId);
      const w1 = dashboard?.widgets.find((w) => w.id === widget1?.id);
      expect(w1?.position.x).toBe(6);
    });
  });

  describe('data fetching', () => {
    it('should get widget data', async () => {
      const dashboard = await service.getDashboard('system-overview');
      const widget = dashboard?.widgets[0];

      if (widget) {
        const data = await service.getWidgetData(widget.id);
        expect(data).toBeDefined();
      }
    });

    it('should get realtime metrics', async () => {
      const metrics = await service.getRealtimeMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(metrics.metrics.activeUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.metrics.systemHealth).toBeGreaterThanOrEqual(0);
    });
  });

  describe('templates', () => {
    it('should get all templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBe(4);
    });

    it('should get template by ID', () => {
      const template = service.getTemplate('financial-overview');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Financial Overview');
    });

    it('should return null for unknown template', () => {
      const template = service.getTemplate('unknown');
      expect(template).toBeNull();
    });

    it('should create dashboard from template', async () => {
      const dashboard = await service.createFromTemplate('financial-overview', 'user-123');

      expect(dashboard).toBeDefined();
      expect(dashboard?.widgets.length).toBeGreaterThan(0);
    });

    it('should create dashboard with custom name from template', async () => {
      const dashboard = await service.createFromTemplate(
        'ecommerce-performance',
        'user-123',
        'My E-commerce Dashboard'
      );

      expect(dashboard?.name).toBe('My E-commerce Dashboard');
    });
  });

  describe('filters', () => {
    beforeEach(async () => {
      const dashboard = await service.createDashboard({
        name: 'Filter Test',
        ownerId: 'user-123',
        isPublic: false,
        isDefault: false,
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'system',
        timeRange: '7d',
        autoRefresh: true,
        refreshInterval: 60,
        filters: [],
      });
      dashboardId = dashboard.id;
    });

    it('should add a filter', async () => {
      const filter = await service.addFilter(dashboardId, {
        field: 'status',
        operator: 'eq',
        value: 'active',
        label: 'Status: Active',
      });

      expect(filter).toBeDefined();
      expect(filter?.id).toBeDefined();
      expect(filter?.field).toBe('status');
    });

    it('should remove a filter', async () => {
      const filter = await service.addFilter(dashboardId, {
        field: 'category',
        operator: 'in',
        value: ['A', 'B'],
        label: 'Category',
      });

      const result = await service.removeFilter(dashboardId, filter!.id);
      expect(result).toBe(true);

      const dashboard = await service.getDashboard(dashboardId);
      expect(dashboard?.filters.find((f) => f.id === filter?.id)).toBeUndefined();
    });
  });

  describe('realtime subscriptions', () => {
    it('should subscribe to updates', () => {
      service.subscribeToRealtimeUpdates('conn-1');
      expect(service.getActiveConnections()).toBe(1);
    });

    it('should unsubscribe from updates', () => {
      service.subscribeToRealtimeUpdates('conn-2');
      service.subscribeToRealtimeUpdates('conn-3');
      service.unsubscribeFromRealtimeUpdates('conn-2');

      expect(service.getActiveConnections()).toBeGreaterThanOrEqual(1);
    });

    it('should track active connections', () => {
      const initial = service.getActiveConnections();
      service.subscribeToRealtimeUpdates('conn-new');
      expect(service.getActiveConnections()).toBe(initial + 1);
    });
  });

  describe('export/import', () => {
    it('should export dashboard as JSON', async () => {
      const dashboard = await service.createDashboard({
        name: 'Export Test',
        ownerId: 'user-123',
        isPublic: false,
        isDefault: false,
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'system',
        timeRange: '7d',
        autoRefresh: true,
        refreshInterval: 60,
        filters: [],
      });

      const exported = await service.exportDashboard(dashboard.id, 'json');

      expect(exported.data).toBeDefined();
      expect(exported.filename).toContain('.json');
    });

    it('should import dashboard from JSON', async () => {
      const jsonData = JSON.stringify({
        name: 'Imported Dashboard',
        widgets: [],
        layout: 'grid',
        gridColumns: 12,
        theme: 'light',
        timeRange: '30d',
        autoRefresh: false,
        refreshInterval: 0,
        filters: [],
      });

      const imported = await service.importDashboard(jsonData, 'user-456');

      expect(imported.name).toBe('Imported Dashboard');
      expect(imported.ownerId).toBe('user-456');
    });

    it('should throw for non-existent dashboard export', async () => {
      await expect(service.exportDashboard('nonexistent', 'json')).rejects.toThrow();
    });
  });

  describe('template categories', () => {
    it('should have financial template', () => {
      const template = DASHBOARD_TEMPLATES.find((t) => t.category === 'Finance');
      expect(template).toBeDefined();
    });

    it('should have ecommerce template', () => {
      const template = DASHBOARD_TEMPLATES.find((t) => t.category === 'E-commerce');
      expect(template).toBeDefined();
    });

    it('should have logistics template', () => {
      const template = DASHBOARD_TEMPLATES.find((t) => t.category === 'Logistics');
      expect(template).toBeDefined();
    });

    it('should have HR template', () => {
      const template = DASHBOARD_TEMPLATES.find((t) => t.category === 'HR');
      expect(template).toBeDefined();
    });
  });
});
