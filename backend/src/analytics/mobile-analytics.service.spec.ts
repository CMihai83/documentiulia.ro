import { Test, TestingModule } from '@nestjs/testing';
import {
  MobileAnalyticsService,
  DeviceInfo,
  UserContext,
  EventCategory,
  PlatformType,
  CrashSeverity,
  RetentionPeriod,
} from './mobile-analytics.service';

describe('MobileAnalyticsService', () => {
  let service: MobileAnalyticsService;

  // Test fixtures
  const testDevice: DeviceInfo = {
    deviceId: 'device-123',
    platform: 'ios',
    osVersion: '17.0',
    appVersion: '2.0.0',
    deviceModel: 'iPhone 15',
    screenResolution: '1179x2556',
    locale: 'en-US',
    timezone: 'America/New_York',
    isEmulator: false,
    networkType: 'wifi',
  };

  const testUser: UserContext = {
    userId: 'user-123',
    tenantId: 'tenant-001',
    anonymousId: 'anon-456',
    isAuthenticated: true,
    userProperties: { plan: 'pro' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MobileAnalyticsService],
    }).compile();

    service = module.get<MobileAnalyticsService>(MobileAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('event tracking', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = service.startSession({ device: testDevice, user: testUser });
      sessionId = session.id;
    });

    it('should track an event', () => {
      const event = service.trackEvent({
        eventName: 'button_click',
        category: 'interaction',
        device: testDevice,
        user: testUser,
        sessionId,
        properties: { button_id: 'submit-btn' },
      });

      expect(event.id).toBeDefined();
      expect(event.eventName).toBe('button_click');
      expect(event.category).toBe('interaction');
      expect(event.properties?.button_id).toBe('submit-btn');
    });

    it('should track screen view', () => {
      const screenView = service.trackScreenView({
        screenName: 'Dashboard',
        screenClass: 'DashboardViewController',
        sessionId,
        device: testDevice,
        user: testUser,
        loadTime: 250,
        isEntryPoint: true,
      });

      expect(screenView.screenName).toBe('Dashboard');
      expect(screenView.loadTime).toBe(250);
      expect(screenView.isEntryPoint).toBe(true);
    });

    it('should track interaction', () => {
      const event = service.trackInteraction({
        interactionType: 'tap',
        elementId: 'nav-btn',
        elementType: 'button',
        screenName: 'Home',
        sessionId,
        device: testDevice,
        user: testUser,
      });

      expect(event.eventName).toBe('interaction_tap');
      expect(event.category).toBe('interaction');
      expect(event.properties?.element_id).toBe('nav-btn');
    });

    it('should track conversion', () => {
      const event = service.trackConversion({
        conversionName: 'purchase_complete',
        value: 99.99,
        currency: 'USD',
        sessionId,
        device: testDevice,
        user: testUser,
      });

      expect(event.eventName).toBe('purchase_complete');
      expect(event.category).toBe('conversion');
      expect(event.properties?.conversion_value).toBe(99.99);
    });

    it('should track custom event', () => {
      const event = service.trackCustomEvent({
        eventName: 'feature_used',
        sessionId,
        device: testDevice,
        user: testUser,
        properties: { feature: 'dark_mode' },
        metrics: { usage_count: 5 },
      });

      expect(event.eventName).toBe('feature_used');
      expect(event.category).toBe('custom');
      expect(event.metrics?.usage_count).toBe(5);
    });

    it('should batch track events', () => {
      const events = service.batchTrackEvents([
        { eventName: 'event1', category: 'interaction', device: testDevice, user: testUser, sessionId },
        { eventName: 'event2', category: 'navigation', device: testDevice, user: testUser, sessionId },
        { eventName: 'event3', category: 'custom', device: testDevice, user: testUser, sessionId },
      ]);

      expect(events).toHaveLength(3);
      expect(events[0].eventName).toBe('event1');
      expect(events[1].eventName).toBe('event2');
      expect(events[2].eventName).toBe('event3');
    });

    it('should get event by id', () => {
      const event = service.trackEvent({
        eventName: 'test_event',
        category: 'custom',
        device: testDevice,
        user: testUser,
        sessionId,
      });

      const retrieved = service.getEvent(event.id);
      expect(retrieved).toEqual(event);
    });

    it('should get events by session', () => {
      service.trackEvent({ eventName: 'e1', category: 'custom', device: testDevice, user: testUser, sessionId });
      service.trackEvent({ eventName: 'e2', category: 'custom', device: testDevice, user: testUser, sessionId });

      const events = service.getEventsBySession(sessionId);
      expect(events.length).toBeGreaterThanOrEqual(2);
    });

    it('should get events by user', () => {
      service.trackEvent({ eventName: 'e1', category: 'custom', device: testDevice, user: testUser, sessionId });

      const events = service.getEventsByUser(testUser.userId!);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should query events with filters', () => {
      service.trackEvent({ eventName: 'query_test', category: 'interaction', device: testDevice, user: testUser, sessionId });

      const result = service.queryEvents({
        tenantId: testUser.tenantId,
        eventNames: ['query_test'],
        categories: ['interaction'],
      });

      expect(result.events.length).toBeGreaterThanOrEqual(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('session management', () => {
    it('should start a session', () => {
      const session = service.startSession({ device: testDevice, user: testUser });

      expect(session.id).toBeDefined();
      expect(session.state).toBe('active');
      expect(session.device).toEqual(testDevice);
      expect(session.tenantId).toBe(testUser.tenantId);
    });

    it('should detect first session', () => {
      const session = service.startSession({ device: testDevice, user: testUser });
      expect(session.isFirstSession).toBe(true);

      // Start another session for same user
      const session2 = service.startSession({ device: testDevice, user: testUser });
      expect(session2.isFirstSession).toBe(false);
    });

    it('should update session state', () => {
      const session = service.startSession({ device: testDevice, user: testUser });

      const updated = service.updateSessionState(session.id, 'background');
      expect(updated?.state).toBe('background');
    });

    it('should end session', () => {
      const session = service.startSession({ device: testDevice, user: testUser });

      const ended = service.endSession(session.id);
      expect(ended?.state).toBe('terminated');
      expect(ended?.endTime).toBeDefined();
      expect(ended?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should get session by id', () => {
      const session = service.startSession({ device: testDevice, user: testUser });

      const retrieved = service.getSession(session.id);
      expect(retrieved?.id).toBe(session.id);
    });

    it('should get user sessions', () => {
      service.startSession({ device: testDevice, user: testUser });
      service.startSession({ device: testDevice, user: testUser });

      const sessions = service.getUserSessions(testUser.userId!);
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('should get active sessions for tenant', () => {
      service.startSession({ device: testDevice, user: testUser });

      const active = service.getActiveSessions(testUser.tenantId);
      expect(active.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('performance monitoring', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = service.startSession({ device: testDevice, user: testUser });
      sessionId = session.id;
    });

    it('should track performance metric', () => {
      const metric = service.trackPerformanceMetric({
        name: 'api_latency',
        type: 'timing',
        value: 150,
        unit: 'ms',
        sessionId,
        device: testDevice,
        tags: { endpoint: '/api/data' },
      });

      expect(metric.id).toBeDefined();
      expect(metric.name).toBe('api_latency');
      expect(metric.value).toBe(150);
      expect(metric.unit).toBe('ms');
    });

    it('should track app launch metrics', () => {
      service.trackAppLaunch({
        sessionId,
        device: testDevice,
        metrics: {
          coldStartTime: 1200,
          timeToInteractive: 1500,
          timeToFirstContentfulPaint: 800,
        },
      });

      const metrics = service.getPerformanceMetrics({ sessionId, name: 'app_cold_start' });
      expect(metrics.length).toBeGreaterThanOrEqual(1);
      expect(metrics[0].value).toBe(1200);
    });

    it('should track network request', () => {
      service.trackNetworkRequest({
        sessionId,
        device: testDevice,
        url: 'https://api.example.com/data',
        method: 'GET',
        statusCode: 200,
        latency: 250,
        requestSize: 100,
        responseSize: 5000,
        success: true,
      });

      const metrics = service.getPerformanceMetrics({ sessionId, name: 'network_request' });
      expect(metrics.length).toBeGreaterThanOrEqual(1);
    });

    it('should track memory usage', () => {
      service.trackMemoryUsage({
        sessionId,
        device: testDevice,
        metrics: {
          heapUsed: 50000000,
          peakMemory: 75000000,
        },
      });

      const metrics = service.getPerformanceMetrics({ sessionId, name: 'memory_heap_used' });
      expect(metrics.length).toBeGreaterThanOrEqual(1);
    });

    it('should track frame rate', () => {
      service.trackFrameRate({
        sessionId,
        device: testDevice,
        fps: 60,
        droppedFrames: 2,
        screenName: 'Animation',
      });

      const fpsMetrics = service.getPerformanceMetrics({ sessionId, name: 'frame_rate' });
      expect(fpsMetrics.length).toBeGreaterThanOrEqual(1);
    });

    it('should get performance summary', () => {
      service.trackAppLaunch({ sessionId, device: testDevice, metrics: { coldStartTime: 1000 } });
      service.trackNetworkRequest({
        sessionId, device: testDevice, url: 'test', method: 'GET',
        statusCode: 200, latency: 100, requestSize: 0, responseSize: 0, success: true,
      });

      const summary = service.getPerformanceSummary(testUser.tenantId, {
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      });

      expect(summary.appLaunch).toBeDefined();
      expect(summary.networkLatency).toBeDefined();
    });
  });

  describe('crash reporting', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = service.startSession({ device: testDevice, user: testUser });
      sessionId = session.id;
    });

    it('should report a crash', () => {
      const crash = service.reportCrash({
        sessionId,
        severity: 'fatal',
        type: 'NullPointerException',
        message: 'Cannot read property of null',
        stackTrace: 'at Object.handleClick (app.js:42:15)\nat HTMLElement.onclick (index.html:10:1)',
        device: testDevice,
        user: testUser,
        isHandled: false,
      });

      expect(crash.id).toBeDefined();
      expect(crash.severity).toBe('fatal');
      expect(crash.type).toBe('NullPointerException');
      expect(crash.occurrences).toBe(1);
      expect(crash.status).toBe('new');
    });

    it('should deduplicate similar crashes', () => {
      const crash1 = service.reportCrash({
        sessionId,
        severity: 'error',
        type: 'TypeError',
        message: 'undefined is not a function',
        stackTrace: 'at callFunction (util.js:10:5)',
        device: testDevice,
        user: testUser,
      });

      const crash2 = service.reportCrash({
        sessionId,
        severity: 'error',
        type: 'TypeError',
        message: 'undefined is not a function',
        stackTrace: 'at callFunction (util.js:10:5)',
        device: testDevice,
        user: testUser,
      });

      expect(crash1.id).toBe(crash2.id);
      expect(crash2.occurrences).toBe(2);
    });

    it('should report ANR', () => {
      const anr = service.reportANR({
        sessionId,
        duration: 5000,
        mainThreadBlocked: true,
        stackTrace: 'at heavyComputation (app.js:100:1)',
        device: testDevice,
        foregroundActivity: 'MainActivity',
      });

      expect(anr.id).toBeDefined();
      expect(anr.duration).toBe(5000);
      expect(anr.mainThreadBlocked).toBe(true);
    });

    it('should get crash report by id', () => {
      const crash = service.reportCrash({
        sessionId,
        severity: 'warning',
        type: 'NetworkError',
        message: 'Request timeout',
        stackTrace: 'at fetch (network.js:50:1)',
        device: testDevice,
        user: testUser,
      });

      const retrieved = service.getCrashReport(crash.id);
      expect(retrieved?.id).toBe(crash.id);
    });

    it('should get crash reports for tenant', () => {
      service.reportCrash({
        sessionId,
        severity: 'fatal',
        type: 'CrashError',
        message: 'App crashed',
        stackTrace: 'stack',
        device: testDevice,
        user: testUser,
      });

      const crashes = service.getCrashReports({ tenantId: testUser.tenantId });
      expect(crashes.length).toBeGreaterThanOrEqual(1);
    });

    it('should update crash status', () => {
      const crash = service.reportCrash({
        sessionId,
        severity: 'error',
        type: 'RuntimeError',
        message: 'Runtime error',
        stackTrace: 'stack',
        device: testDevice,
        user: testUser,
      });

      const updated = service.updateCrashStatus(crash.id, 'investigating', 'dev@example.com');
      expect(updated?.status).toBe('investigating');
      expect(updated?.assignee).toBe('dev@example.com');
    });

    it('should calculate crash free rate', () => {
      // Start a session without crashes
      service.startSession({ device: testDevice, user: testUser });

      const rate = service.getCrashFreeRate(testUser.tenantId, {
        start: new Date(Date.now() - 3600000),
        end: new Date(),
      });

      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });

  describe('funnel analysis', () => {
    it('should create a funnel', () => {
      const funnel = service.createFunnel({
        name: 'Onboarding Flow',
        tenantId: testUser.tenantId,
        stages: [
          { name: 'Sign Up', eventName: 'signup_complete', order: 0 },
          { name: 'Profile Setup', eventName: 'profile_setup', order: 1 },
          { name: 'First Action', eventName: 'first_action', order: 2 },
        ],
      });

      expect(funnel.id).toBeDefined();
      expect(funnel.name).toBe('Onboarding Flow');
      expect(funnel.stages).toHaveLength(3);
    });

    it('should get funnel by id', () => {
      const funnel = service.createFunnel({
        name: 'Test Funnel',
        tenantId: testUser.tenantId,
        stages: [{ name: 'Step 1', eventName: 'step1', order: 0 }],
      });

      const retrieved = service.getFunnel(funnel.id);
      expect(retrieved?.id).toBe(funnel.id);
    });

    it('should get funnels for tenant', () => {
      service.createFunnel({
        name: 'Funnel A',
        tenantId: testUser.tenantId,
        stages: [{ name: 'Step', eventName: 'step', order: 0 }],
      });

      const funnels = service.getFunnels(testUser.tenantId);
      expect(funnels.length).toBeGreaterThanOrEqual(1);
    });

    it('should update funnel', () => {
      const funnel = service.createFunnel({
        name: 'Original Name',
        tenantId: testUser.tenantId,
        stages: [{ name: 'Step', eventName: 'step', order: 0 }],
      });

      const updated = service.updateFunnel(funnel.id, { name: 'Updated Name' });
      expect(updated?.name).toBe('Updated Name');
    });

    it('should delete funnel', () => {
      const funnel = service.createFunnel({
        name: 'To Delete',
        tenantId: testUser.tenantId,
        stages: [{ name: 'Step', eventName: 'step', order: 0 }],
      });

      const deleted = service.deleteFunnel(funnel.id);
      expect(deleted).toBe(true);

      const retrieved = service.getFunnel(funnel.id);
      expect(retrieved).toBeNull();
    });

    it('should analyze funnel', () => {
      const funnel = service.createFunnel({
        name: 'Analysis Funnel',
        tenantId: testUser.tenantId,
        stages: [
          { name: 'View', eventName: 'page_view', order: 0 },
          { name: 'Click', eventName: 'button_click', order: 1 },
        ],
      });

      const analysis = service.analyzeFunnel(funnel.id, {
        start: new Date(Date.now() - 86400000),
        end: new Date(),
      });

      expect(analysis).toBeDefined();
      expect(analysis?.funnelId).toBe(funnel.id);
      expect(analysis?.stages).toHaveLength(2);
    });
  });

  describe('cohort analysis', () => {
    it('should create a cohort', () => {
      const cohort = service.createCohort({
        name: 'iOS Users',
        type: 'behavior',
        tenantId: testUser.tenantId,
        criteria: {
          platform: ['ios'],
        },
      });

      expect(cohort.id).toBeDefined();
      expect(cohort.name).toBe('iOS Users');
      expect(cohort.type).toBe('behavior');
    });

    it('should get cohort by id', () => {
      const cohort = service.createCohort({
        name: 'Test Cohort',
        type: 'acquisition',
        tenantId: testUser.tenantId,
        criteria: {},
      });

      const retrieved = service.getCohort(cohort.id);
      expect(retrieved?.id).toBe(cohort.id);
    });

    it('should get cohorts for tenant', () => {
      service.createCohort({
        name: 'Cohort A',
        type: 'demographic',
        tenantId: testUser.tenantId,
        criteria: {},
      });

      const cohorts = service.getCohorts(testUser.tenantId);
      expect(cohorts.length).toBeGreaterThanOrEqual(1);
    });

    it('should delete cohort', () => {
      const cohort = service.createCohort({
        name: 'To Delete',
        type: 'custom',
        tenantId: testUser.tenantId,
        criteria: {},
      });

      const deleted = service.deleteCohort(cohort.id);
      expect(deleted).toBe(true);
    });

    it('should analyze retention', () => {
      // Create some sessions for the cohort
      service.startSession({ device: testDevice, user: testUser });

      const cohort = service.createCohort({
        name: 'Retention Test',
        type: 'acquisition',
        tenantId: testUser.tenantId,
        criteria: {},
      });

      const analysis = service.analyzeRetention(cohort.id, 'weekly', 4);

      expect(analysis).toBeDefined();
      expect(analysis?.cohortId).toBe(cohort.id);
      expect(analysis?.period).toBe('weekly');
    });
  });

  describe('user journey', () => {
    it('should get user journey', () => {
      const session = service.startSession({ device: testDevice, user: testUser });

      service.trackScreenView({
        screenName: 'Home',
        sessionId: session.id,
        device: testDevice,
        user: testUser,
      });

      service.trackEvent({
        eventName: 'action',
        category: 'interaction',
        device: testDevice,
        user: testUser,
        sessionId: session.id,
      });

      const journey = service.getUserJourney(testUser.userId!);

      expect(journey).toBeDefined();
      expect(journey?.userId).toBe(testUser.userId);
      expect(journey?.totalSessions).toBeGreaterThanOrEqual(1);
    });
  });

  describe('real-time analytics', () => {
    it('should get real-time stats', () => {
      service.startSession({ device: testDevice, user: testUser });

      const stats = service.getRealTimeStats(testUser.tenantId);

      expect(stats).toBeDefined();
      expect(stats.activeUsers).toBeGreaterThanOrEqual(1);
      expect(stats.activeSessions).toBeGreaterThanOrEqual(1);
      expect(stats.activeUsersByPlatform).toBeDefined();
    });
  });

  describe('dashboards', () => {
    it('should create a dashboard', () => {
      const dashboard = service.createDashboard({
        tenantId: testUser.tenantId,
        name: 'Main Dashboard',
        isDefault: true,
      });

      expect(dashboard.id).toBeDefined();
      expect(dashboard.name).toBe('Main Dashboard');
      expect(dashboard.isDefault).toBe(true);
    });

    it('should get dashboard by id', () => {
      const dashboard = service.createDashboard({
        tenantId: testUser.tenantId,
        name: 'Test Dashboard',
      });

      const retrieved = service.getDashboard(dashboard.id);
      expect(retrieved?.id).toBe(dashboard.id);
    });

    it('should get dashboards for tenant', () => {
      service.createDashboard({
        tenantId: testUser.tenantId,
        name: 'Dashboard A',
      });

      const dashboards = service.getDashboards(testUser.tenantId);
      expect(dashboards.length).toBeGreaterThanOrEqual(1);
    });

    it('should update dashboard', () => {
      const dashboard = service.createDashboard({
        tenantId: testUser.tenantId,
        name: 'Original',
      });

      const updated = service.updateDashboard(dashboard.id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    it('should add widget to dashboard', () => {
      const dashboard = service.createDashboard({
        tenantId: testUser.tenantId,
        name: 'Widget Test',
      });

      const widget = service.addWidget(dashboard.id, {
        type: 'metric',
        title: 'Active Users',
        config: { metric: 'active_users' },
        position: { x: 0, y: 0, width: 4, height: 2 },
      });

      expect(widget?.id).toBeDefined();
      expect(widget?.title).toBe('Active Users');
    });

    it('should remove widget from dashboard', () => {
      const dashboard = service.createDashboard({
        tenantId: testUser.tenantId,
        name: 'Widget Test',
      });

      const widget = service.addWidget(dashboard.id, {
        type: 'chart',
        title: 'Test Chart',
        config: {},
        position: { x: 0, y: 0, width: 4, height: 2 },
      });

      const removed = service.removeWidget(dashboard.id, widget!.id);
      expect(removed).toBe(true);
    });

    it('should delete dashboard', () => {
      const dashboard = service.createDashboard({
        tenantId: testUser.tenantId,
        name: 'To Delete',
      });

      const deleted = service.deleteDashboard(dashboard.id);
      expect(deleted).toBe(true);
    });
  });

  describe('alerts', () => {
    it('should create an alert', () => {
      const alert = service.createAlert({
        tenantId: testUser.tenantId,
        name: 'High Error Rate',
        condition: { metric: 'error_rate', aggregation: 'avg' },
        threshold: 5,
        comparison: 'gt',
        window: 15,
        channels: ['email', 'slack'],
      });

      expect(alert.id).toBeDefined();
      expect(alert.name).toBe('High Error Rate');
      expect(alert.isEnabled).toBe(true);
    });

    it('should get alert by id', () => {
      const alert = service.createAlert({
        tenantId: testUser.tenantId,
        name: 'Test Alert',
        condition: { metric: 'crash_rate', aggregation: 'rate' },
        threshold: 1,
        comparison: 'gt',
        window: 60,
        channels: ['webhook'],
      });

      const retrieved = service.getAlert(alert.id);
      expect(retrieved?.id).toBe(alert.id);
    });

    it('should get alerts for tenant', () => {
      service.createAlert({
        tenantId: testUser.tenantId,
        name: 'Alert A',
        condition: { metric: 'latency', aggregation: 'avg' },
        threshold: 1000,
        comparison: 'gt',
        window: 5,
        channels: ['push'],
      });

      const alerts = service.getAlerts(testUser.tenantId);
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });

    it('should update alert', () => {
      const alert = service.createAlert({
        tenantId: testUser.tenantId,
        name: 'Original Alert',
        condition: { metric: 'events', aggregation: 'count' },
        threshold: 100,
        comparison: 'lt',
        window: 30,
        channels: ['email'],
      });

      const updated = service.updateAlert(alert.id, { threshold: 50, isEnabled: false });
      expect(updated?.threshold).toBe(50);
      expect(updated?.isEnabled).toBe(false);
    });

    it('should delete alert', () => {
      const alert = service.createAlert({
        tenantId: testUser.tenantId,
        name: 'To Delete',
        condition: { metric: 'test', aggregation: 'count' },
        threshold: 1,
        comparison: 'eq',
        window: 1,
        channels: [],
      });

      const deleted = service.deleteAlert(alert.id);
      expect(deleted).toBe(true);
    });
  });

  describe('export', () => {
    it('should export events as JSON', () => {
      const session = service.startSession({ device: testDevice, user: testUser });
      service.trackEvent({
        eventName: 'export_test',
        category: 'custom',
        device: testDevice,
        user: testUser,
        sessionId: session.id,
      });

      const result = service.exportEvents({
        tenantId: testUser.tenantId,
        format: 'json',
        dateRange: {
          start: new Date(Date.now() - 86400000),
          end: new Date(),
        },
        includeUserProperties: true,
        includeDeviceInfo: true,
        anonymize: false,
      });

      expect(result.filename).toContain('.json');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should export events as CSV', () => {
      const session = service.startSession({ device: testDevice, user: testUser });
      service.trackEvent({
        eventName: 'csv_test',
        category: 'custom',
        device: testDevice,
        user: testUser,
        sessionId: session.id,
      });

      const result = service.exportEvents({
        tenantId: testUser.tenantId,
        format: 'csv',
        dateRange: {
          start: new Date(Date.now() - 86400000),
          end: new Date(),
        },
        includeUserProperties: false,
        includeDeviceInfo: false,
        anonymize: true,
      });

      expect(result.filename).toContain('.csv');
      expect(typeof result.data).toBe('string');
    });
  });

  describe('aggregation & metrics', () => {
    let sessionId: string;

    beforeEach(() => {
      const session = service.startSession({ device: testDevice, user: testUser });
      sessionId = session.id;
    });

    it('should get event counts grouped by day', () => {
      service.trackEvent({ eventName: 'daily_test', category: 'custom', device: testDevice, user: testUser, sessionId });

      const counts = service.getEventCounts({
        tenantId: testUser.tenantId,
        groupBy: 'day',
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(),
      });

      expect(Array.isArray(counts)).toBe(true);
    });

    it('should get user metrics', () => {
      const metrics = service.getUserMetrics({
        tenantId: testUser.tenantId,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(),
      });

      expect(metrics.totalUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.avgSessionsPerUser).toBeGreaterThanOrEqual(0);
    });

    it('should get top events', () => {
      service.trackEvent({ eventName: 'popular_event', category: 'custom', device: testDevice, user: testUser, sessionId });
      service.trackEvent({ eventName: 'popular_event', category: 'custom', device: testDevice, user: testUser, sessionId });

      const topEvents = service.getTopEvents(testUser.tenantId, 10);

      expect(Array.isArray(topEvents)).toBe(true);
    });

    it('should get platform breakdown', () => {
      const breakdown = service.getPlatformBreakdown(testUser.tenantId, {
        start: new Date(Date.now() - 86400000),
        end: new Date(),
      });

      expect(breakdown.ios).toBeDefined();
      expect(breakdown.android).toBeDefined();
      expect(breakdown.web).toBeDefined();
      expect(breakdown.pwa).toBeDefined();
    });
  });
});
