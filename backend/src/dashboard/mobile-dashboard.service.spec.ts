import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  MobileDashboardService,
  DeviceType,
  ScreenOrientation,
  DeviceInfo,
  MobileWidget,
  WidgetSize,
} from './mobile-dashboard.service';

describe('MobileDashboardService', () => {
  let service: MobileDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileDashboardService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => ''),
          },
        },
      ],
    }).compile();

    service = module.get<MobileDashboardService>(MobileDashboardService);
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default presets', () => {
      const presets = service.listPresets();
      expect(presets.length).toBeGreaterThan(0);
    });

    it('should have finance preset', () => {
      const preset = service.getPreset('preset-finance');
      expect(preset).toBeDefined();
      expect(preset!.category).toBe('finance');
    });

    it('should have HR preset', () => {
      const preset = service.getPreset('preset-hr');
      expect(preset).toBeDefined();
      expect(preset!.category).toBe('hr');
    });

    it('should have logistics preset', () => {
      const preset = service.getPreset('preset-logistics');
      expect(preset).toBeDefined();
      expect(preset!.category).toBe('logistics');
    });
  });

  // ==========================================================================
  // LAYOUT MANAGEMENT TESTS
  // ==========================================================================

  describe('layout management', () => {
    it('should create a new layout', () => {
      const layout = service.createLayout({
        name: 'Test Layout',
        userId: 'user-1',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      expect(layout).toBeDefined();
      expect(layout.id).toBeDefined();
      expect(layout.name).toBe('Test Layout');
      expect(layout.userId).toBe('user-1');
      expect(layout.deviceType).toBe('phone');
    });

    it('should create layout from preset', () => {
      const layout = service.createLayout({
        name: 'Finance Dashboard',
        userId: 'user-1',
        tenantId: 'tenant-1',
        deviceType: 'phone',
        presetId: 'preset-finance',
      });

      expect(layout.widgets.length).toBeGreaterThan(0);
    });

    it('should get layout by ID', () => {
      const created = service.createLayout({
        name: 'Get Test',
        userId: 'user-1',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      const layout = service.getLayout(created.id);
      expect(layout).toBeDefined();
      expect(layout!.id).toBe(created.id);
    });

    it('should get user layouts', () => {
      service.createLayout({
        name: 'Layout 1',
        userId: 'user-multi',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });
      service.createLayout({
        name: 'Layout 2',
        userId: 'user-multi',
        tenantId: 'tenant-1',
        deviceType: 'tablet',
      });

      const layouts = service.getUserLayouts('user-multi');
      expect(layouts.length).toBe(2);
    });

    it('should get layout for device', () => {
      service.createLayout({
        name: 'Phone Portrait',
        userId: 'user-device',
        tenantId: 'tenant-1',
        deviceType: 'phone',
        orientation: 'portrait',
      });

      const layout = service.getLayoutForDevice('user-device', 'phone', 'portrait');
      expect(layout).toBeDefined();
      expect(layout!.orientation).toBe('portrait');
    });

    it('should update layout', () => {
      const created = service.createLayout({
        name: 'Update Test',
        userId: 'user-1',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      const updated = service.updateLayout(created.id, { name: 'Updated Name' });
      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Updated Name');
    });

    it('should delete layout', () => {
      const created = service.createLayout({
        name: 'Delete Test',
        userId: 'user-1',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      const result = service.deleteLayout(created.id);
      expect(result).toBe(true);

      const layout = service.getLayout(created.id);
      expect(layout).toBeNull();
    });

    it('should set default layout', () => {
      const layout = service.createLayout({
        name: 'Default Test',
        userId: 'user-default',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      const result = service.setDefaultLayout('user-default', layout.id);
      expect(result).toBe(true);

      const updated = service.getLayout(layout.id);
      expect(updated!.isDefault).toBe(true);
    });
  });

  // ==========================================================================
  // WIDGET MANAGEMENT TESTS
  // ==========================================================================

  describe('widget management', () => {
    let layoutId: string;

    beforeEach(() => {
      const layout = service.createLayout({
        name: 'Widget Test Layout',
        userId: 'user-widget',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });
      layoutId = layout.id;
    });

    it('should add widget to layout', () => {
      const widget = service.addWidget(layoutId, {
        type: 'kpi_card',
        title: 'Test KPI',
        size: 'medium',
        order: 1,
        isVisible: true,
        isCollapsible: false,
        isCollapsed: false,
        refreshStrategy: 'pull_to_refresh',
        config: { metric: 'revenue' },
        gestures: [],
      });

      expect(widget).toBeDefined();
      expect(widget!.id).toBeDefined();
      expect(widget!.title).toBe('Test KPI');
    });

    it('should update widget', () => {
      const widget = service.addWidget(layoutId, {
        type: 'kpi_card',
        title: 'Original',
        size: 'medium',
        order: 1,
        isVisible: true,
        isCollapsible: false,
        isCollapsed: false,
        refreshStrategy: 'pull_to_refresh',
        config: {},
        gestures: [],
      });

      const updated = service.updateWidget(layoutId, widget!.id, { title: 'Updated' });
      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Updated');
    });

    it('should remove widget', () => {
      const widget = service.addWidget(layoutId, {
        type: 'kpi_card',
        title: 'Remove Me',
        size: 'medium',
        order: 1,
        isVisible: true,
        isCollapsible: false,
        isCollapsed: false,
        refreshStrategy: 'pull_to_refresh',
        config: {},
        gestures: [],
      });

      const result = service.removeWidget(layoutId, widget!.id);
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      expect(layout!.widgets.find((w) => w.id === widget!.id)).toBeUndefined();
    });

    it('should reorder widgets', () => {
      const w1 = service.addWidget(layoutId, {
        type: 'kpi_card',
        title: 'Widget 1',
        size: 'small',
        order: 1,
        isVisible: true,
        isCollapsible: false,
        isCollapsed: false,
        refreshStrategy: 'manual',
        config: {},
        gestures: [],
      });
      const w2 = service.addWidget(layoutId, {
        type: 'kpi_card',
        title: 'Widget 2',
        size: 'small',
        order: 2,
        isVisible: true,
        isCollapsible: false,
        isCollapsed: false,
        refreshStrategy: 'manual',
        config: {},
        gestures: [],
      });

      const layout = service.reorderWidgets(layoutId, [w2!.id, w1!.id]);
      expect(layout).toBeDefined();
      expect(layout!.widgets[0].id).toBe(w2!.id);
      expect(layout!.widgets[1].id).toBe(w1!.id);
    });

    it('should toggle widget collapse', () => {
      const widget = service.addWidget(layoutId, {
        type: 'list_preview',
        title: 'Collapsible',
        size: 'large',
        order: 1,
        isVisible: true,
        isCollapsible: true,
        isCollapsed: false,
        refreshStrategy: 'pull_to_refresh',
        config: {},
        gestures: [],
      });

      const result = service.toggleWidgetCollapse(layoutId, widget!.id);
      expect(result).toBe(true);

      const layout = service.getLayout(layoutId);
      const updated = layout!.widgets.find((w) => w.id === widget!.id);
      expect(updated!.isCollapsed).toBe(true);
    });

    it('should not collapse non-collapsible widget', () => {
      const widget = service.addWidget(layoutId, {
        type: 'kpi_card',
        title: 'Not Collapsible',
        size: 'medium',
        order: 1,
        isVisible: true,
        isCollapsible: false,
        isCollapsed: false,
        refreshStrategy: 'pull_to_refresh',
        config: {},
        gestures: [],
      });

      const result = service.toggleWidgetCollapse(layoutId, widget!.id);
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // PRESET TESTS
  // ==========================================================================

  describe('presets', () => {
    it('should list all presets', () => {
      const presets = service.listPresets();
      expect(presets.length).toBeGreaterThanOrEqual(5);
    });

    it('should filter presets by category', () => {
      const hrPresets = service.listPresets('hr');
      expect(hrPresets.every((p) => p.category === 'hr')).toBe(true);
    });

    it('should get preset by ID', () => {
      const preset = service.getPreset('preset-executive');
      expect(preset).toBeDefined();
      expect(preset!.name).toBe('Executive Summary');
    });

    it('should apply preset to layout', () => {
      const layout = service.createLayout({
        name: 'Apply Preset Test',
        userId: 'user-1',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      const updated = service.applyPreset(layout.id, 'preset-sales');
      expect(updated).toBeDefined();
      expect(updated!.widgets.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // OFFLINE CACHING TESTS
  // ==========================================================================

  describe('offline caching', () => {
    it('should cache data', () => {
      const cached = service.cacheData('test-key', { value: 123 }, 3600);

      expect(cached).toBeDefined();
      expect(cached.key).toBe('test-key');
      expect(cached.data).toEqual({ value: 123 });
    });

    it('should get cached data', () => {
      service.cacheData('get-key', { data: 'test' }, 3600);

      const result = service.getCachedData('get-key');
      expect(result).toBeDefined();
      expect(result!.data).toEqual({ data: 'test' });
      expect(result!.isStale).toBe(false);
    });

    it('should return null for non-existent cache', () => {
      const result = service.getCachedData('non-existent');
      expect(result).toBeNull();
    });

    it('should invalidate cache', () => {
      service.cacheData('invalidate-key', { value: 1 }, 3600);

      const result = service.invalidateCache('invalidate-key');
      expect(result).toBe(true);

      const cached = service.getCachedData('invalidate-key');
      expect(cached).toBeNull();
    });

    it('should invalidate cache by pattern', () => {
      service.cacheData('user-1-data', { a: 1 }, 3600);
      service.cacheData('user-1-settings', { b: 2 }, 3600);
      service.cacheData('user-2-data', { c: 3 }, 3600);

      const invalidated = service.invalidateCacheByPattern('user-1-.*');
      expect(invalidated).toBe(2);
    });

    it('should get cache stats', () => {
      service.cacheData('stat-1', { value: 1 }, 3600);
      service.cacheData('stat-2', { value: 2 }, 3600);

      const stats = service.getCacheStats();
      expect(stats.totalItems).toBeGreaterThanOrEqual(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should cleanup expired cache', () => {
      // Note: Can't easily test with real expiration, so just test the method exists
      const cleaned = service.cleanupExpiredCache();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // SYNC STATUS TESTS
  // ==========================================================================

  describe('sync status', () => {
    it('should get sync status', () => {
      const status = service.getSyncStatus('user-sync');
      expect(status).toBeDefined();
      expect(status.pendingChanges).toBe(0);
    });

    it('should add pending change', () => {
      const count = service.addPendingChange('user-pending');
      expect(count).toBe(1);

      const count2 = service.addPendingChange('user-pending');
      expect(count2).toBe(2);
    });

    it('should mark sync complete', () => {
      service.addPendingChange('user-complete');
      service.addPendingChange('user-complete');

      const status = service.markSyncComplete('user-complete');
      expect(status.pendingChanges).toBe(0);
      expect(status.syncInProgress).toBe(false);
    });

    it('should add sync error', () => {
      service.addSyncError('user-error', 'data-key', 'Network error');

      const status = service.getSyncStatus('user-error');
      expect(status.errors.length).toBe(1);
      expect(status.errors[0].key).toBe('data-key');
    });

    it('should increment retry count on duplicate error', () => {
      service.addSyncError('user-retry', 'same-key', 'Error 1');
      service.addSyncError('user-retry', 'same-key', 'Error 2');

      const status = service.getSyncStatus('user-retry');
      expect(status.errors.length).toBe(1);
      expect(status.errors[0].retryCount).toBe(2);
    });
  });

  // ==========================================================================
  // THEME TESTS
  // ==========================================================================

  describe('theme management', () => {
    it('should update layout theme', () => {
      const layout = service.createLayout({
        name: 'Theme Test',
        userId: 'user-theme',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      const updated = service.updateTheme(layout.id, {
        mode: 'dark',
        primaryColor: '#FF0000',
      });

      expect(updated).toBeDefined();
      expect(updated!.theme.mode).toBe('dark');
      expect(updated!.theme.primaryColor).toBe('#FF0000');
    });

    it('should get theme for device', () => {
      const deviceInfo: DeviceInfo = {
        type: 'phone',
        screenWidth: 375,
        screenHeight: 812,
        pixelRatio: 3,
        orientation: 'portrait',
        platform: 'ios',
        hasNotch: true,
        safeAreaInsets: { top: 44, bottom: 34, left: 0, right: 0 },
        supportsHaptics: true,
        connectionType: 'wifi',
      };

      const theme = service.getThemeForDevice(deviceInfo);
      expect(theme).toBeDefined();
      expect(theme.fontScale).toBe(1.0);
    });

    it('should adjust font scale for small screens', () => {
      const deviceInfo: DeviceInfo = {
        type: 'phone',
        screenWidth: 320,
        screenHeight: 568,
        pixelRatio: 2,
        orientation: 'portrait',
        platform: 'android',
        hasNotch: false,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
        supportsHaptics: true,
        connectionType: 'wifi',
      };

      const theme = service.getThemeForDevice(deviceInfo);
      expect(theme.fontScale).toBe(0.9);
    });
  });

  // ==========================================================================
  // NAVIGATION TESTS
  // ==========================================================================

  describe('navigation configuration', () => {
    it('should update navigation config', () => {
      const layout = service.createLayout({
        name: 'Nav Test',
        userId: 'user-nav',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      const updated = service.updateNavigation(layout.id, {
        type: 'drawer',
        showLabels: false,
      });

      expect(updated).toBeDefined();
      expect(updated!.navigationConfig.type).toBe('drawer');
      expect(updated!.navigationConfig.showLabels).toBe(false);
    });

    it('should update navigation item', () => {
      const layout = service.createLayout({
        name: 'Nav Item Test',
        userId: 'user-nav-item',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      const item = service.updateNavigationItem(layout.id, 'home', {
        label: 'Dashboard',
        badge: 5,
      });

      expect(item).toBeDefined();
      expect(item!.label).toBe('Dashboard');
      expect(item!.badge).toBe(5);
    });

    it('should reorder navigation items', () => {
      const layout = service.createLayout({
        name: 'Nav Reorder',
        userId: 'user-nav-reorder',
        tenantId: 'tenant-1',
        deviceType: 'phone',
      });

      const itemIds = layout.navigationConfig.items.map((i) => i.id).reverse();
      const updated = service.reorderNavigation(layout.id, itemIds);

      expect(updated).toBeDefined();
      expect(updated!.navigationConfig.items[0].id).toBe(itemIds[0]);
    });
  });

  // ==========================================================================
  // ANALYTICS TESTS
  // ==========================================================================

  describe('analytics', () => {
    const deviceInfo: DeviceInfo = {
      type: 'phone',
      screenWidth: 375,
      screenHeight: 812,
      pixelRatio: 3,
      orientation: 'portrait',
      platform: 'ios',
      hasNotch: true,
      safeAreaInsets: { top: 44, bottom: 34, left: 0, right: 0 },
      supportsHaptics: true,
      connectionType: 'wifi',
    };

    it('should start session', () => {
      const sessionId = service.startSession('user-analytics', deviceInfo);
      expect(sessionId).toBeDefined();
      expect(sessionId).toContain('session-');
    });

    it('should track screen view', () => {
      const sessionId = service.startSession('user-screen', deviceInfo);
      service.trackScreenView(sessionId, '/dashboard');

      const analytics = service.getSessionAnalytics(sessionId);
      expect(analytics!.screenViews.length).toBe(1);
      expect(analytics!.screenViews[0].screen).toBe('/dashboard');
    });

    it('should track interaction', () => {
      const sessionId = service.startSession('user-interaction', deviceInfo);
      service.trackInteraction(sessionId, {
        type: 'tap',
        target: 'button-submit',
      });

      const analytics = service.getSessionAnalytics(sessionId);
      expect(analytics!.interactions.length).toBe(1);
      expect(analytics!.interactions[0].target).toBe('button-submit');
    });

    it('should update performance metrics', () => {
      const sessionId = service.startSession('user-perf', deviceInfo);
      service.updatePerformanceMetrics(sessionId, {
        timeToInteractive: 1500,
        frameRate: 58,
      });

      const analytics = service.getSessionAnalytics(sessionId);
      expect(analytics!.performance.timeToInteractive).toBe(1500);
      expect(analytics!.performance.frameRate).toBe(58);
    });

    it('should end session', () => {
      const sessionId = service.startSession('user-end', deviceInfo);
      service.trackScreenView(sessionId, '/home');

      const analytics = service.endSession(sessionId);
      expect(analytics).toBeDefined();
    });

    it('should calculate screen view duration', () => {
      const sessionId = service.startSession('user-duration', deviceInfo);
      service.trackScreenView(sessionId, '/screen1');

      // Wait a bit then track another screen
      service.trackScreenView(sessionId, '/screen2');

      const analytics = service.getSessionAnalytics(sessionId);
      expect(analytics!.screenViews[0].duration).toBeDefined();
    });
  });

  // ==========================================================================
  // RESPONSIVE HELPERS TESTS
  // ==========================================================================

  describe('responsive helpers', () => {
    it('should get optimal widget layout for small screen', () => {
      const deviceInfo: DeviceInfo = {
        type: 'phone',
        screenWidth: 320,
        screenHeight: 568,
        pixelRatio: 2,
        orientation: 'portrait',
        platform: 'android',
        hasNotch: false,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
        supportsHaptics: false,
        connectionType: 'wifi',
      };

      const widgets: MobileWidget[] = [
        {
          id: 'w1',
          type: 'kpi_card',
          title: 'Test',
          size: 'medium',
          order: 1,
          isVisible: true,
          isCollapsible: false,
          isCollapsed: false,
          refreshStrategy: 'manual',
          config: {},
          gestures: [],
        },
      ];

      const optimized = service.getOptimalWidgetLayout(deviceInfo, widgets);
      expect(optimized[0].size).toBe('full'); // Medium should become full on small screens
    });

    it('should get recommended refresh strategy for wifi', () => {
      const strategy = service.getRecommendedRefreshStrategy('wifi');
      expect(strategy).toBe('realtime');
    });

    it('should get recommended refresh strategy for offline', () => {
      const strategy = service.getRecommendedRefreshStrategy('offline');
      expect(strategy).toBe('manual');
    });

    it('should get recommended refresh strategy for cellular', () => {
      const strategy = service.getRecommendedRefreshStrategy('cellular');
      expect(strategy).toBe('interval');
    });
  });

  // ==========================================================================
  // QUICK ACTIONS TESTS
  // ==========================================================================

  describe('quick actions', () => {
    it('should execute quick action', () => {
      const layout = service.createLayout({
        name: 'Quick Action Test',
        userId: 'user-action',
        tenantId: 'tenant-1',
        deviceType: 'phone',
        presetId: 'preset-finance',
      });

      // Find a widget with quick actions
      const widgetWithActions = layout.widgets.find((w) => w.quickActions && w.quickActions.length > 0);
      if (widgetWithActions && widgetWithActions.quickActions) {
        const result = service.executeQuickAction(
          layout.id,
          widgetWithActions.id,
          widgetWithActions.quickActions[0].id,
        );
        expect(result.success).toBe(true);
      }
    });

    it('should return error for non-existent layout', () => {
      const result = service.executeQuickAction('non-existent', 'widget', 'action');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Layout not found');
    });
  });

  // ==========================================================================
  // WIDGET DATA REFRESH TESTS
  // ==========================================================================

  describe('widget data refresh', () => {
    it('should refresh widget data', async () => {
      const layout = service.createLayout({
        name: 'Refresh Test',
        userId: 'user-refresh',
        tenantId: 'tenant-1',
        deviceType: 'phone',
        presetId: 'preset-finance',
      });

      const widget = layout.widgets[0];
      const refreshed = await service.refreshWidgetData(layout.id, widget.id);

      expect(refreshed).toBeDefined();
      expect(refreshed!.data).toBeDefined();
      expect(refreshed!.lastRefreshed).toBeDefined();
    });

    it('should refresh all widgets', async () => {
      const layout = service.createLayout({
        name: 'Refresh All Test',
        userId: 'user-refresh-all',
        tenantId: 'tenant-1',
        deviceType: 'phone',
        presetId: 'preset-executive',
      });

      const refreshed = await service.refreshAllWidgets(layout.id);

      expect(refreshed).toBeDefined();
      refreshed!.widgets.forEach((w) => {
        if (w.isVisible && !w.isCollapsed) {
          expect(w.lastRefreshed).toBeDefined();
        }
      });
    });
  });
});
