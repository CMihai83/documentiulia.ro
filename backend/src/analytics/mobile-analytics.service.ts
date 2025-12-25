import { Injectable } from '@nestjs/common';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type PlatformType = 'ios' | 'android' | 'web' | 'pwa';
export type EventCategory = 'navigation' | 'interaction' | 'transaction' | 'error' | 'performance' | 'engagement' | 'conversion' | 'custom';
export type SessionState = 'active' | 'background' | 'terminated';
export type CrashSeverity = 'fatal' | 'error' | 'warning' | 'info';
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timing';
export type FunnelStage = 'awareness' | 'interest' | 'consideration' | 'intent' | 'evaluation' | 'purchase';
export type CohortType = 'acquisition' | 'behavior' | 'demographic' | 'custom';
export type RetentionPeriod = 'daily' | 'weekly' | 'monthly';

export interface DeviceInfo {
  deviceId: string;
  platform: PlatformType;
  osVersion: string;
  appVersion: string;
  deviceModel: string;
  screenResolution: string;
  locale: string;
  timezone: string;
  isEmulator: boolean;
  batteryLevel?: number;
  networkType?: 'wifi' | 'cellular' | '2g' | '3g' | '4g' | '5g' | 'offline';
  carrier?: string;
}

export interface UserContext {
  userId?: string;
  tenantId: string;
  anonymousId: string;
  isAuthenticated: boolean;
  userProperties?: Record<string, any>;
  segments?: string[];
}

export interface AnalyticsEvent {
  id: string;
  eventName: string;
  category: EventCategory;
  timestamp: Date;
  device: DeviceInfo;
  user: UserContext;
  sessionId: string;
  properties?: Record<string, any>;
  metrics?: Record<string, number>;
  tags?: string[];
  source?: string;
  campaign?: CampaignAttribution;
}

export interface CampaignAttribution {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
  referrer?: string;
}

export interface MobileSession {
  id: string;
  userId?: string;
  anonymousId: string;
  tenantId: string;
  device: DeviceInfo;
  state: SessionState;
  startTime: Date;
  endTime?: Date;
  lastActivityTime: Date;
  duration: number;
  screenViews: ScreenView[];
  events: string[];
  eventCount: number;
  isFirstSession: boolean;
  entryScreen?: string;
  exitScreen?: string;
  attribution?: CampaignAttribution;
  crashCount: number;
  errorCount: number;
}

export interface ScreenView {
  screenName: string;
  screenClass?: string;
  timestamp: Date;
  duration?: number;
  previousScreen?: string;
  isEntryPoint: boolean;
  loadTime?: number;
  interactions: number;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: Date;
  sessionId: string;
  device: DeviceInfo;
  tags?: Record<string, string>;
  percentiles?: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface AppLaunchMetrics {
  coldStartTime: number;
  warmStartTime: number;
  hotStartTime: number;
  timeToInteractive: number;
  timeToFirstContentfulPaint: number;
  timeToFirstMeaningfulPaint: number;
}

export interface NetworkMetrics {
  requestCount: number;
  failedRequestCount: number;
  averageLatency: number;
  totalDataSent: number;
  totalDataReceived: number;
  slowRequestCount: number;
  timeoutCount: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  peakMemory: number;
  memoryWarnings: number;
}

export interface BatteryMetrics {
  drainRate: number;
  sessionDrain: number;
  averageLevel: number;
  chargingTime: number;
  lowBatteryEvents: number;
}

export interface CrashReport {
  id: string;
  sessionId: string;
  timestamp: Date;
  severity: CrashSeverity;
  type: string;
  message: string;
  stackTrace: string;
  device: DeviceInfo;
  user: UserContext;
  breadcrumbs: Breadcrumb[];
  customData?: Record<string, any>;
  isHandled: boolean;
  groupHash: string;
  occurrences: number;
  affectedUsers: number;
  firstSeen: Date;
  lastSeen: Date;
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  assignee?: string;
  resolution?: string;
}

export interface Breadcrumb {
  timestamp: Date;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface ANRReport {
  id: string;
  sessionId: string;
  timestamp: Date;
  duration: number;
  mainThreadBlocked: boolean;
  stackTrace: string;
  device: DeviceInfo;
  foregroundActivity?: string;
}

export interface ConversionFunnel {
  id: string;
  name: string;
  tenantId: string;
  stages: FunnelStageConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FunnelStageConfig {
  name: string;
  eventName: string;
  eventProperties?: Record<string, any>;
  order: number;
}

export interface FunnelAnalysis {
  funnelId: string;
  funnelName: string;
  period: { start: Date; end: Date };
  stages: FunnelStageResult[];
  overallConversionRate: number;
  averageTimeToConvert: number;
  dropoffAnalysis: DropoffAnalysis[];
}

export interface FunnelStageResult {
  stageName: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  averageTimeInStage: number;
}

export interface DropoffAnalysis {
  fromStage: string;
  toStage: string;
  dropoffCount: number;
  dropoffRate: number;
  commonNextActions: { action: string; count: number }[];
}

export interface Cohort {
  id: string;
  name: string;
  type: CohortType;
  tenantId: string;
  criteria: CohortCriteria;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CohortCriteria {
  acquisitionDate?: { start: Date; end: Date };
  platform?: PlatformType[];
  events?: { eventName: string; count?: number; properties?: Record<string, any> }[];
  userProperties?: Record<string, any>;
  customQuery?: string;
}

export interface RetentionAnalysis {
  cohortId: string;
  cohortName: string;
  period: RetentionPeriod;
  startDate: Date;
  cohortSize: number;
  retentionData: RetentionDataPoint[];
  averageRetention: number;
  churnRate: number;
}

export interface RetentionDataPoint {
  periodIndex: number;
  periodLabel: string;
  retainedUsers: number;
  retentionRate: number;
  activeUsers: number;
}

export interface UserJourney {
  userId: string;
  sessions: MobileSession[];
  totalSessions: number;
  totalEvents: number;
  firstSeen: Date;
  lastSeen: Date;
  lifetimeValue?: number;
  topScreens: { screen: string; views: number }[];
  topActions: { action: string; count: number }[];
  conversionEvents: AnalyticsEvent[];
}

export interface RealTimeStats {
  activeUsers: number;
  activeUsersByPlatform: Record<PlatformType, number>;
  activeSessions: number;
  eventsPerMinute: number;
  topScreens: { screen: string; users: number }[];
  topEvents: { event: string; count: number }[];
  errorRate: number;
  crashFreeRate: number;
  averageSessionDuration: number;
  newUsers: number;
  returningUsers: number;
}

export interface AnalyticsDashboard {
  id: string;
  tenantId: string;
  name: string;
  widgets: DashboardWidget[];
  dateRange: { start: Date; end: Date };
  refreshInterval: number;
  isDefault: boolean;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'funnel' | 'retention' | 'map';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

export interface ExportConfig {
  format: 'csv' | 'json' | 'parquet';
  dateRange: { start: Date; end: Date };
  eventTypes?: string[];
  includeUserProperties: boolean;
  includeDeviceInfo: boolean;
  anonymize: boolean;
}

export interface AnalyticsAlert {
  id: string;
  tenantId: string;
  name: string;
  condition: AlertCondition;
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  window: number; // minutes
  channels: ('email' | 'webhook' | 'slack' | 'push')[];
  isEnabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface AlertCondition {
  metric: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'rate';
  filters?: Record<string, any>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

@Injectable()
export class MobileAnalyticsService {
  // In-memory storage (production would use PostgreSQL/ClickHouse/BigQuery)
  private events: Map<string, AnalyticsEvent> = new Map();
  private sessions: Map<string, MobileSession> = new Map();
  private crashReports: Map<string, CrashReport> = new Map();
  private anrReports: Map<string, ANRReport> = new Map();
  private performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private funnels: Map<string, ConversionFunnel> = new Map();
  private cohorts: Map<string, Cohort> = new Map();
  private dashboards: Map<string, AnalyticsDashboard> = new Map();
  private alerts: Map<string, AnalyticsAlert> = new Map();
  private userJourneys: Map<string, UserJourney> = new Map();

  // Real-time tracking
  private activeSessions: Set<string> = new Set();
  private recentEvents: AnalyticsEvent[] = [];
  private eventCounter = 0;

  // ==========================================================================
  // EVENT TRACKING
  // ==========================================================================

  trackEvent(params: {
    eventName: string;
    category: EventCategory;
    device: DeviceInfo;
    user: UserContext;
    sessionId: string;
    properties?: Record<string, any>;
    metrics?: Record<string, number>;
    tags?: string[];
    source?: string;
    campaign?: CampaignAttribution;
  }): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${++this.eventCounter}`,
      eventName: params.eventName,
      category: params.category,
      timestamp: new Date(),
      device: params.device,
      user: params.user,
      sessionId: params.sessionId,
      properties: params.properties,
      metrics: params.metrics,
      tags: params.tags,
      source: params.source,
      campaign: params.campaign,
    };

    this.events.set(event.id, event);
    this.recentEvents.push(event);

    // Keep only last 1000 events in memory for real-time
    if (this.recentEvents.length > 1000) {
      this.recentEvents.shift();
    }

    // Update session
    const session = this.sessions.get(params.sessionId);
    if (session) {
      session.events.push(event.id);
      session.eventCount++;
      session.lastActivityTime = new Date();
    }

    // Update user journey
    this.updateUserJourney(params.user.userId || params.user.anonymousId, event);

    // Check alerts
    this.checkAlerts(event);

    return event;
  }

  trackScreenView(params: {
    screenName: string;
    screenClass?: string;
    sessionId: string;
    device: DeviceInfo;
    user: UserContext;
    loadTime?: number;
    isEntryPoint?: boolean;
  }): ScreenView {
    const session = this.sessions.get(params.sessionId);

    const screenView: ScreenView = {
      screenName: params.screenName,
      screenClass: params.screenClass,
      timestamp: new Date(),
      loadTime: params.loadTime,
      isEntryPoint: params.isEntryPoint || false,
      interactions: 0,
      previousScreen: session?.screenViews[session.screenViews.length - 1]?.screenName,
    };

    if (session) {
      // Calculate duration of previous screen
      const prevScreen = session.screenViews[session.screenViews.length - 1];
      if (prevScreen) {
        prevScreen.duration = new Date().getTime() - prevScreen.timestamp.getTime();
      }

      session.screenViews.push(screenView);

      if (params.isEntryPoint) {
        session.entryScreen = params.screenName;
      }
      session.exitScreen = params.screenName;
    }

    // Track as event too
    this.trackEvent({
      eventName: 'screen_view',
      category: 'navigation',
      device: params.device,
      user: params.user,
      sessionId: params.sessionId,
      properties: {
        screen_name: params.screenName,
        screen_class: params.screenClass,
        load_time: params.loadTime,
      },
    });

    return screenView;
  }

  trackInteraction(params: {
    interactionType: 'tap' | 'swipe' | 'long_press' | 'scroll' | 'pinch' | 'input' | 'gesture';
    elementId?: string;
    elementType?: string;
    screenName: string;
    sessionId: string;
    device: DeviceInfo;
    user: UserContext;
    properties?: Record<string, any>;
  }): AnalyticsEvent {
    const session = this.sessions.get(params.sessionId);
    if (session) {
      const currentScreen = session.screenViews.find(s => s.screenName === params.screenName);
      if (currentScreen) {
        currentScreen.interactions++;
      }
    }

    return this.trackEvent({
      eventName: `interaction_${params.interactionType}`,
      category: 'interaction',
      device: params.device,
      user: params.user,
      sessionId: params.sessionId,
      properties: {
        interaction_type: params.interactionType,
        element_id: params.elementId,
        element_type: params.elementType,
        screen_name: params.screenName,
        ...params.properties,
      },
    });
  }

  trackConversion(params: {
    conversionName: string;
    value?: number;
    currency?: string;
    sessionId: string;
    device: DeviceInfo;
    user: UserContext;
    properties?: Record<string, any>;
  }): AnalyticsEvent {
    return this.trackEvent({
      eventName: params.conversionName,
      category: 'conversion',
      device: params.device,
      user: params.user,
      sessionId: params.sessionId,
      properties: {
        conversion_value: params.value,
        currency: params.currency,
        ...params.properties,
      },
      metrics: params.value ? { conversion_value: params.value } : undefined,
    });
  }

  trackCustomEvent(params: {
    eventName: string;
    sessionId: string;
    device: DeviceInfo;
    user: UserContext;
    properties?: Record<string, any>;
    metrics?: Record<string, number>;
  }): AnalyticsEvent {
    return this.trackEvent({
      eventName: params.eventName,
      category: 'custom',
      device: params.device,
      user: params.user,
      sessionId: params.sessionId,
      properties: params.properties,
      metrics: params.metrics,
    });
  }

  batchTrackEvents(events: Array<{
    eventName: string;
    category: EventCategory;
    device: DeviceInfo;
    user: UserContext;
    sessionId: string;
    properties?: Record<string, any>;
    timestamp?: Date;
  }>): AnalyticsEvent[] {
    return events.map(e => this.trackEvent(e));
  }

  getEvent(eventId: string): AnalyticsEvent | null {
    return this.events.get(eventId) || null;
  }

  getEventsBySession(sessionId: string): AnalyticsEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getEventsByUser(userId: string, limit = 100): AnalyticsEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.user.userId === userId || e.user.anonymousId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  queryEvents(params: {
    tenantId: string;
    eventNames?: string[];
    categories?: EventCategory[];
    startDate?: Date;
    endDate?: Date;
    platforms?: PlatformType[];
    userId?: string;
    limit?: number;
    offset?: number;
  }): { events: AnalyticsEvent[]; total: number } {
    let filtered = Array.from(this.events.values())
      .filter(e => e.user.tenantId === params.tenantId);

    if (params.eventNames?.length) {
      filtered = filtered.filter(e => params.eventNames!.includes(e.eventName));
    }

    if (params.categories?.length) {
      filtered = filtered.filter(e => params.categories!.includes(e.category));
    }

    if (params.startDate) {
      filtered = filtered.filter(e => e.timestamp >= params.startDate!);
    }

    if (params.endDate) {
      filtered = filtered.filter(e => e.timestamp <= params.endDate!);
    }

    if (params.platforms?.length) {
      filtered = filtered.filter(e => params.platforms!.includes(e.device.platform));
    }

    if (params.userId) {
      filtered = filtered.filter(e =>
        e.user.userId === params.userId || e.user.anonymousId === params.userId
      );
    }

    const total = filtered.length;
    const offset = params.offset || 0;
    const limit = params.limit || 100;

    filtered = filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);

    return { events: filtered, total };
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  startSession(params: {
    device: DeviceInfo;
    user: UserContext;
    attribution?: CampaignAttribution;
  }): MobileSession {
    const isFirstSession = !Array.from(this.sessions.values())
      .some(s => s.userId === params.user.userId || s.anonymousId === params.user.anonymousId);

    const session: MobileSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: params.user.userId,
      anonymousId: params.user.anonymousId,
      tenantId: params.user.tenantId,
      device: params.device,
      state: 'active',
      startTime: new Date(),
      lastActivityTime: new Date(),
      duration: 0,
      screenViews: [],
      events: [],
      eventCount: 0,
      isFirstSession,
      attribution: params.attribution,
      crashCount: 0,
      errorCount: 0,
    };

    this.sessions.set(session.id, session);
    this.activeSessions.add(session.id);

    // Track session start event
    this.trackEvent({
      eventName: 'session_start',
      category: 'engagement',
      device: params.device,
      user: params.user,
      sessionId: session.id,
      properties: {
        is_first_session: isFirstSession,
      },
    });

    return session;
  }

  updateSessionState(sessionId: string, state: SessionState): MobileSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const previousState = session.state;
    session.state = state;
    session.lastActivityTime = new Date();

    if (state === 'background' && previousState === 'active') {
      this.activeSessions.delete(sessionId);
    } else if (state === 'active' && previousState !== 'active') {
      this.activeSessions.add(sessionId);
    }

    return session;
  }

  endSession(sessionId: string): MobileSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.state = 'terminated';
    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();
    this.activeSessions.delete(sessionId);

    // Track session end event
    this.trackEvent({
      eventName: 'session_end',
      category: 'engagement',
      device: session.device,
      user: {
        userId: session.userId,
        tenantId: session.tenantId,
        anonymousId: session.anonymousId,
        isAuthenticated: !!session.userId,
      },
      sessionId,
      properties: {
        duration: session.duration,
        screen_views: session.screenViews.length,
        event_count: session.eventCount,
        entry_screen: session.entryScreen,
        exit_screen: session.exitScreen,
      },
    });

    return session;
  }

  getSession(sessionId: string): MobileSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getUserSessions(userId: string, limit = 50): MobileSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId || s.anonymousId === userId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  getActiveSessions(tenantId: string): MobileSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.tenantId === tenantId && this.activeSessions.has(s.id));
  }

  // ==========================================================================
  // PERFORMANCE MONITORING
  // ==========================================================================

  trackPerformanceMetric(params: {
    name: string;
    type: MetricType;
    value: number;
    unit: string;
    sessionId: string;
    device: DeviceInfo;
    tags?: Record<string, string>;
  }): PerformanceMetric {
    const metric: PerformanceMetric = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      type: params.type,
      value: params.value,
      unit: params.unit,
      timestamp: new Date(),
      sessionId: params.sessionId,
      device: params.device,
      tags: params.tags,
    };

    this.performanceMetrics.set(metric.id, metric);
    return metric;
  }

  trackAppLaunch(params: {
    sessionId: string;
    device: DeviceInfo;
    metrics: Partial<AppLaunchMetrics>;
  }): void {
    if (params.metrics.coldStartTime !== undefined) {
      this.trackPerformanceMetric({
        name: 'app_cold_start',
        type: 'timing',
        value: params.metrics.coldStartTime,
        unit: 'ms',
        sessionId: params.sessionId,
        device: params.device,
        tags: { launch_type: 'cold' },
      });
    }

    if (params.metrics.warmStartTime !== undefined) {
      this.trackPerformanceMetric({
        name: 'app_warm_start',
        type: 'timing',
        value: params.metrics.warmStartTime,
        unit: 'ms',
        sessionId: params.sessionId,
        device: params.device,
        tags: { launch_type: 'warm' },
      });
    }

    if (params.metrics.timeToInteractive !== undefined) {
      this.trackPerformanceMetric({
        name: 'time_to_interactive',
        type: 'timing',
        value: params.metrics.timeToInteractive,
        unit: 'ms',
        sessionId: params.sessionId,
        device: params.device,
      });
    }

    if (params.metrics.timeToFirstContentfulPaint !== undefined) {
      this.trackPerformanceMetric({
        name: 'fcp',
        type: 'timing',
        value: params.metrics.timeToFirstContentfulPaint,
        unit: 'ms',
        sessionId: params.sessionId,
        device: params.device,
      });
    }
  }

  trackNetworkRequest(params: {
    sessionId: string;
    device: DeviceInfo;
    url: string;
    method: string;
    statusCode: number;
    latency: number;
    requestSize: number;
    responseSize: number;
    success: boolean;
  }): void {
    this.trackPerformanceMetric({
      name: 'network_request',
      type: 'timing',
      value: params.latency,
      unit: 'ms',
      sessionId: params.sessionId,
      device: params.device,
      tags: {
        url: params.url,
        method: params.method,
        status_code: params.statusCode.toString(),
        success: params.success.toString(),
      },
    });
  }

  trackMemoryUsage(params: {
    sessionId: string;
    device: DeviceInfo;
    metrics: Partial<MemoryMetrics>;
  }): void {
    if (params.metrics.heapUsed !== undefined) {
      this.trackPerformanceMetric({
        name: 'memory_heap_used',
        type: 'gauge',
        value: params.metrics.heapUsed,
        unit: 'bytes',
        sessionId: params.sessionId,
        device: params.device,
      });
    }

    if (params.metrics.peakMemory !== undefined) {
      this.trackPerformanceMetric({
        name: 'memory_peak',
        type: 'gauge',
        value: params.metrics.peakMemory,
        unit: 'bytes',
        sessionId: params.sessionId,
        device: params.device,
      });
    }
  }

  trackFrameRate(params: {
    sessionId: string;
    device: DeviceInfo;
    fps: number;
    droppedFrames: number;
    screenName: string;
  }): void {
    this.trackPerformanceMetric({
      name: 'frame_rate',
      type: 'gauge',
      value: params.fps,
      unit: 'fps',
      sessionId: params.sessionId,
      device: params.device,
      tags: { screen_name: params.screenName },
    });

    if (params.droppedFrames > 0) {
      this.trackPerformanceMetric({
        name: 'dropped_frames',
        type: 'counter',
        value: params.droppedFrames,
        unit: 'frames',
        sessionId: params.sessionId,
        device: params.device,
        tags: { screen_name: params.screenName },
      });
    }
  }

  getPerformanceMetrics(params: {
    sessionId?: string;
    name?: string;
    startDate?: Date;
    endDate?: Date;
  }): PerformanceMetric[] {
    let metrics = Array.from(this.performanceMetrics.values());

    if (params.sessionId) {
      metrics = metrics.filter(m => m.sessionId === params.sessionId);
    }

    if (params.name) {
      metrics = metrics.filter(m => m.name === params.name);
    }

    if (params.startDate) {
      metrics = metrics.filter(m => m.timestamp >= params.startDate!);
    }

    if (params.endDate) {
      metrics = metrics.filter(m => m.timestamp <= params.endDate!);
    }

    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getPerformanceSummary(tenantId: string, period: { start: Date; end: Date }): {
    appLaunch: { avg: number; p50: number; p95: number };
    networkLatency: { avg: number; p50: number; p95: number };
    frameRate: { avg: number; min: number };
    memoryUsage: { avg: number; peak: number };
  } {
    const metrics = Array.from(this.performanceMetrics.values())
      .filter(m => m.timestamp >= period.start && m.timestamp <= period.end);

    const calculateStats = (values: number[]) => {
      if (values.length === 0) return { avg: 0, p50: 0, p95: 0, min: 0, peak: 0 };
      values.sort((a, b) => a - b);
      return {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: values[Math.floor(values.length * 0.5)] || 0,
        p95: values[Math.floor(values.length * 0.95)] || 0,
        min: values[0] || 0,
        peak: values[values.length - 1] || 0,
      };
    };

    const coldStartTimes = metrics.filter(m => m.name === 'app_cold_start').map(m => m.value);
    const networkLatencies = metrics.filter(m => m.name === 'network_request').map(m => m.value);
    const frameRates = metrics.filter(m => m.name === 'frame_rate').map(m => m.value);
    const memoryUsages = metrics.filter(m => m.name === 'memory_heap_used').map(m => m.value);

    const launchStats = calculateStats(coldStartTimes);
    const networkStats = calculateStats(networkLatencies);
    const fpsStats = calculateStats(frameRates);
    const memoryStats = calculateStats(memoryUsages);

    return {
      appLaunch: { avg: launchStats.avg, p50: launchStats.p50, p95: launchStats.p95 },
      networkLatency: { avg: networkStats.avg, p50: networkStats.p50, p95: networkStats.p95 },
      frameRate: { avg: fpsStats.avg, min: fpsStats.min },
      memoryUsage: { avg: memoryStats.avg, peak: memoryStats.peak },
    };
  }

  // ==========================================================================
  // CRASH REPORTING
  // ==========================================================================

  reportCrash(params: {
    sessionId: string;
    severity: CrashSeverity;
    type: string;
    message: string;
    stackTrace: string;
    device: DeviceInfo;
    user: UserContext;
    breadcrumbs?: Breadcrumb[];
    customData?: Record<string, any>;
    isHandled?: boolean;
  }): CrashReport {
    // Generate group hash for deduplication
    const groupHash = this.generateCrashGroupHash(params.type, params.message, params.stackTrace);

    // Check for existing crash group
    const existingCrash = Array.from(this.crashReports.values())
      .find(c => c.groupHash === groupHash);

    if (existingCrash) {
      existingCrash.occurrences++;
      existingCrash.lastSeen = new Date();
      existingCrash.affectedUsers = new Set([
        ...Array.from(this.crashReports.values())
          .filter(c => c.groupHash === groupHash)
          .map(c => c.user.userId || c.user.anonymousId)
      ]).size;
      return existingCrash;
    }

    const crash: CrashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: params.sessionId,
      timestamp: new Date(),
      severity: params.severity,
      type: params.type,
      message: params.message,
      stackTrace: params.stackTrace,
      device: params.device,
      user: params.user,
      breadcrumbs: params.breadcrumbs || [],
      customData: params.customData,
      isHandled: params.isHandled ?? false,
      groupHash,
      occurrences: 1,
      affectedUsers: 1,
      firstSeen: new Date(),
      lastSeen: new Date(),
      status: 'new',
    };

    this.crashReports.set(crash.id, crash);

    // Update session crash count
    const session = this.sessions.get(params.sessionId);
    if (session) {
      session.crashCount++;
      if (params.severity === 'error' || params.severity === 'warning') {
        session.errorCount++;
      }
    }

    // Check crash alerts
    this.checkCrashAlerts(crash);

    return crash;
  }

  reportANR(params: {
    sessionId: string;
    duration: number;
    mainThreadBlocked: boolean;
    stackTrace: string;
    device: DeviceInfo;
    foregroundActivity?: string;
  }): ANRReport {
    const anr: ANRReport = {
      id: `anr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: params.sessionId,
      timestamp: new Date(),
      duration: params.duration,
      mainThreadBlocked: params.mainThreadBlocked,
      stackTrace: params.stackTrace,
      device: params.device,
      foregroundActivity: params.foregroundActivity,
    };

    this.anrReports.set(anr.id, anr);
    return anr;
  }

  addBreadcrumb(sessionId: string, breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    // Store breadcrumbs for crash context
    const session = this.sessions.get(sessionId);
    if (session) {
      // Breadcrumbs would be stored per-session in production
    }
  }

  getCrashReport(crashId: string): CrashReport | null {
    return this.crashReports.get(crashId) || null;
  }

  getCrashReports(params: {
    tenantId: string;
    status?: CrashReport['status'];
    severity?: CrashSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): CrashReport[] {
    let crashes = Array.from(this.crashReports.values())
      .filter(c => c.user.tenantId === params.tenantId);

    if (params.status) {
      crashes = crashes.filter(c => c.status === params.status);
    }

    if (params.severity) {
      crashes = crashes.filter(c => c.severity === params.severity);
    }

    if (params.startDate) {
      crashes = crashes.filter(c => c.timestamp >= params.startDate!);
    }

    if (params.endDate) {
      crashes = crashes.filter(c => c.timestamp <= params.endDate!);
    }

    return crashes
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, params.limit || 100);
  }

  updateCrashStatus(crashId: string, status: CrashReport['status'], assignee?: string, resolution?: string): CrashReport | null {
    const crash = this.crashReports.get(crashId);
    if (!crash) return null;

    crash.status = status;
    if (assignee) crash.assignee = assignee;
    if (resolution) crash.resolution = resolution;

    return crash;
  }

  getCrashFreeRate(tenantId: string, period: { start: Date; end: Date }): number {
    const sessions = Array.from(this.sessions.values())
      .filter(s =>
        s.tenantId === tenantId &&
        s.startTime >= period.start &&
        s.startTime <= period.end
      );

    if (sessions.length === 0) return 100;

    const sessionsWithCrashes = sessions.filter(s => s.crashCount > 0).length;
    return ((sessions.length - sessionsWithCrashes) / sessions.length) * 100;
  }

  private generateCrashGroupHash(type: string, message: string, stackTrace: string): string {
    // Simplified grouping - in production use proper hashing
    const relevantStack = stackTrace.split('\n').slice(0, 5).join('\n');
    return Buffer.from(`${type}:${message}:${relevantStack}`).toString('base64').slice(0, 32);
  }

  private checkCrashAlerts(crash: CrashReport): void {
    // Check if crash rate exceeds threshold
    const alerts = Array.from(this.alerts.values())
      .filter(a => a.isEnabled && a.condition.metric === 'crash_rate');

    // Would trigger alerts in production
  }

  // ==========================================================================
  // FUNNEL ANALYSIS
  // ==========================================================================

  createFunnel(params: {
    name: string;
    tenantId: string;
    stages: FunnelStageConfig[];
  }): ConversionFunnel {
    const funnel: ConversionFunnel = {
      id: `funnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      tenantId: params.tenantId,
      stages: params.stages.map((s, i) => ({ ...s, order: i })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.funnels.set(funnel.id, funnel);
    return funnel;
  }

  getFunnel(funnelId: string): ConversionFunnel | null {
    return this.funnels.get(funnelId) || null;
  }

  getFunnels(tenantId: string): ConversionFunnel[] {
    return Array.from(this.funnels.values())
      .filter(f => f.tenantId === tenantId);
  }

  updateFunnel(funnelId: string, updates: Partial<Pick<ConversionFunnel, 'name' | 'stages'>>): ConversionFunnel | null {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return null;

    if (updates.name) funnel.name = updates.name;
    if (updates.stages) funnel.stages = updates.stages.map((s, i) => ({ ...s, order: i }));
    funnel.updatedAt = new Date();

    return funnel;
  }

  deleteFunnel(funnelId: string): boolean {
    return this.funnels.delete(funnelId);
  }

  analyzeFunnel(funnelId: string, period: { start: Date; end: Date }): FunnelAnalysis | null {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return null;

    const events = Array.from(this.events.values())
      .filter(e =>
        e.user.tenantId === funnel.tenantId &&
        e.timestamp >= period.start &&
        e.timestamp <= period.end
      );

    // Group events by user
    const userEvents = new Map<string, AnalyticsEvent[]>();
    events.forEach(e => {
      const userId = e.user.userId || e.user.anonymousId;
      if (!userEvents.has(userId)) {
        userEvents.set(userId, []);
      }
      userEvents.get(userId)!.push(e);
    });

    // Calculate funnel metrics
    const stageResults: FunnelStageResult[] = [];
    let previousStageUsers = userEvents.size;

    funnel.stages.forEach((stage, index) => {
      const usersAtStage = Array.from(userEvents.entries())
        .filter(([_, userEvts]) =>
          userEvts.some(e => e.eventName === stage.eventName)
        ).length;

      const conversionRate = previousStageUsers > 0
        ? (usersAtStage / previousStageUsers) * 100
        : 0;

      stageResults.push({
        stageName: stage.name,
        users: usersAtStage,
        conversionRate,
        dropoffRate: 100 - conversionRate,
        averageTimeInStage: 0, // Would calculate from timestamps
      });

      previousStageUsers = usersAtStage;
    });

    // Calculate dropoff analysis
    const dropoffAnalysis: DropoffAnalysis[] = [];
    for (let i = 0; i < stageResults.length - 1; i++) {
      dropoffAnalysis.push({
        fromStage: stageResults[i].stageName,
        toStage: stageResults[i + 1].stageName,
        dropoffCount: stageResults[i].users - stageResults[i + 1].users,
        dropoffRate: stageResults[i].dropoffRate,
        commonNextActions: [], // Would analyze next events after dropoff
      });
    }

    const overallConversionRate = stageResults.length > 0 && stageResults[0].users > 0
      ? (stageResults[stageResults.length - 1].users / stageResults[0].users) * 100
      : 0;

    return {
      funnelId,
      funnelName: funnel.name,
      period,
      stages: stageResults,
      overallConversionRate,
      averageTimeToConvert: 0, // Would calculate from timestamps
      dropoffAnalysis,
    };
  }

  // ==========================================================================
  // COHORT ANALYSIS
  // ==========================================================================

  createCohort(params: {
    name: string;
    type: CohortType;
    tenantId: string;
    criteria: CohortCriteria;
  }): Cohort {
    const cohort: Cohort = {
      id: `cohort_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      type: params.type,
      tenantId: params.tenantId,
      criteria: params.criteria,
      userCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Calculate user count
    cohort.userCount = this.getCohortUsers(cohort).length;

    this.cohorts.set(cohort.id, cohort);
    return cohort;
  }

  getCohort(cohortId: string): Cohort | null {
    return this.cohorts.get(cohortId) || null;
  }

  getCohorts(tenantId: string): Cohort[] {
    return Array.from(this.cohorts.values())
      .filter(c => c.tenantId === tenantId);
  }

  deleteCohort(cohortId: string): boolean {
    return this.cohorts.delete(cohortId);
  }

  private getCohortUsers(cohort: Cohort): string[] {
    const sessions = Array.from(this.sessions.values())
      .filter(s => s.tenantId === cohort.tenantId);

    let userIds = new Set<string>();

    sessions.forEach(s => {
      const userId = s.userId || s.anonymousId;
      let matches = true;

      if (cohort.criteria.acquisitionDate) {
        const firstSession = Array.from(this.sessions.values())
          .filter(sess => sess.userId === s.userId || sess.anonymousId === s.anonymousId)
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];

        if (firstSession) {
          matches = matches &&
            firstSession.startTime >= cohort.criteria.acquisitionDate.start &&
            firstSession.startTime <= cohort.criteria.acquisitionDate.end;
        }
      }

      if (cohort.criteria.platform?.length) {
        matches = matches && cohort.criteria.platform.includes(s.device.platform);
      }

      if (matches) {
        userIds.add(userId);
      }
    });

    return Array.from(userIds);
  }

  analyzeRetention(cohortId: string, period: RetentionPeriod, weeks = 8): RetentionAnalysis | null {
    const cohort = this.cohorts.get(cohortId);
    if (!cohort) return null;

    const cohortUsers = this.getCohortUsers(cohort);
    const cohortSize = cohortUsers.length;

    if (cohortSize === 0) {
      return {
        cohortId,
        cohortName: cohort.name,
        period,
        startDate: new Date(),
        cohortSize: 0,
        retentionData: [],
        averageRetention: 0,
        churnRate: 100,
      };
    }

    // Calculate retention for each period
    const periodMs = period === 'daily' ? 86400000 : period === 'weekly' ? 604800000 : 2592000000;
    const retentionData: RetentionDataPoint[] = [];

    for (let i = 0; i <= weeks; i++) {
      const periodStart = new Date(Date.now() - (weeks - i) * periodMs);
      const periodEnd = new Date(periodStart.getTime() + periodMs);

      const activeUsers = cohortUsers.filter(userId => {
        const userSessions = Array.from(this.sessions.values())
          .filter(s =>
            (s.userId === userId || s.anonymousId === userId) &&
            s.startTime >= periodStart &&
            s.startTime < periodEnd
          );
        return userSessions.length > 0;
      });

      retentionData.push({
        periodIndex: i,
        periodLabel: `${period === 'daily' ? 'Day' : period === 'weekly' ? 'Week' : 'Month'} ${i}`,
        retainedUsers: activeUsers.length,
        retentionRate: (activeUsers.length / cohortSize) * 100,
        activeUsers: activeUsers.length,
      });
    }

    const avgRetention = retentionData.length > 0
      ? retentionData.reduce((sum, d) => sum + d.retentionRate, 0) / retentionData.length
      : 0;

    const lastPeriodRetention = retentionData[retentionData.length - 1]?.retentionRate || 0;

    return {
      cohortId,
      cohortName: cohort.name,
      period,
      startDate: cohort.createdAt,
      cohortSize,
      retentionData,
      averageRetention: avgRetention,
      churnRate: 100 - lastPeriodRetention,
    };
  }

  // ==========================================================================
  // USER JOURNEY
  // ==========================================================================

  getUserJourney(userId: string): UserJourney | null {
    const journey = this.userJourneys.get(userId);
    if (journey) return journey;

    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId || s.anonymousId === userId)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    if (userSessions.length === 0) return null;

    const userEvents = Array.from(this.events.values())
      .filter(e => e.user.userId === userId || e.user.anonymousId === userId);

    // Calculate top screens
    const screenCounts = new Map<string, number>();
    userSessions.forEach(s => {
      s.screenViews.forEach(sv => {
        screenCounts.set(sv.screenName, (screenCounts.get(sv.screenName) || 0) + 1);
      });
    });

    const topScreens = Array.from(screenCounts.entries())
      .map(([screen, views]) => ({ screen, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Calculate top actions
    const actionCounts = new Map<string, number>();
    userEvents.forEach(e => {
      actionCounts.set(e.eventName, (actionCounts.get(e.eventName) || 0) + 1);
    });

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get conversion events
    const conversionEvents = userEvents.filter(e => e.category === 'conversion');

    const newJourney: UserJourney = {
      userId,
      sessions: userSessions,
      totalSessions: userSessions.length,
      totalEvents: userEvents.length,
      firstSeen: userSessions[0].startTime,
      lastSeen: userSessions[userSessions.length - 1].lastActivityTime,
      topScreens,
      topActions,
      conversionEvents,
    };

    this.userJourneys.set(userId, newJourney);
    return newJourney;
  }

  private updateUserJourney(userId: string, event: AnalyticsEvent): void {
    // Would update journey in real-time
  }

  // ==========================================================================
  // REAL-TIME ANALYTICS
  // ==========================================================================

  getRealTimeStats(tenantId: string): RealTimeStats {
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.tenantId === tenantId && this.activeSessions.has(s.id));

    const activeUsersByPlatform: Record<PlatformType, number> = {
      ios: 0,
      android: 0,
      web: 0,
      pwa: 0,
    };

    const uniqueUsers = new Set<string>();
    activeSessions.forEach(s => {
      activeUsersByPlatform[s.device.platform]++;
      uniqueUsers.add(s.userId || s.anonymousId);
    });

    // Calculate events per minute (last 5 minutes)
    const fiveMinAgo = new Date(Date.now() - 300000);
    const recentEventsCount = this.recentEvents
      .filter(e => e.user.tenantId === tenantId && e.timestamp >= fiveMinAgo)
      .length;
    const eventsPerMinute = recentEventsCount / 5;

    // Top screens
    const screenCounts = new Map<string, number>();
    activeSessions.forEach(s => {
      const currentScreen = s.screenViews[s.screenViews.length - 1];
      if (currentScreen) {
        screenCounts.set(currentScreen.screenName, (screenCounts.get(currentScreen.screenName) || 0) + 1);
      }
    });

    const topScreens = Array.from(screenCounts.entries())
      .map(([screen, users]) => ({ screen, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 5);

    // Top events
    const eventCounts = new Map<string, number>();
    this.recentEvents
      .filter(e => e.user.tenantId === tenantId && e.timestamp >= fiveMinAgo)
      .forEach(e => {
        eventCounts.set(e.eventName, (eventCounts.get(e.eventName) || 0) + 1);
      });

    const topEvents = Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Error and crash rates
    const sessionsWithErrors = activeSessions.filter(s => s.errorCount > 0).length;
    const sessionsWithCrashes = activeSessions.filter(s => s.crashCount > 0).length;
    const errorRate = activeSessions.length > 0 ? (sessionsWithErrors / activeSessions.length) * 100 : 0;
    const crashFreeRate = activeSessions.length > 0
      ? ((activeSessions.length - sessionsWithCrashes) / activeSessions.length) * 100
      : 100;

    // Average session duration
    const avgDuration = activeSessions.length > 0
      ? activeSessions.reduce((sum, s) => sum + (Date.now() - s.startTime.getTime()), 0) / activeSessions.length
      : 0;

    // New vs returning users
    const newUsers = activeSessions.filter(s => s.isFirstSession).length;
    const returningUsers = uniqueUsers.size - newUsers;

    return {
      activeUsers: uniqueUsers.size,
      activeUsersByPlatform,
      activeSessions: activeSessions.length,
      eventsPerMinute,
      topScreens,
      topEvents,
      errorRate,
      crashFreeRate,
      averageSessionDuration: avgDuration,
      newUsers,
      returningUsers,
    };
  }

  // ==========================================================================
  // DASHBOARDS
  // ==========================================================================

  createDashboard(params: {
    tenantId: string;
    name: string;
    widgets?: DashboardWidget[];
    dateRange?: { start: Date; end: Date };
    isDefault?: boolean;
  }): AnalyticsDashboard {
    const dashboard: AnalyticsDashboard = {
      id: `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      name: params.name,
      widgets: params.widgets || [],
      dateRange: params.dateRange || {
        start: new Date(Date.now() - 7 * 86400000),
        end: new Date(),
      },
      refreshInterval: 300, // 5 minutes
      isDefault: params.isDefault || false,
    };

    this.dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }

  getDashboard(dashboardId: string): AnalyticsDashboard | null {
    return this.dashboards.get(dashboardId) || null;
  }

  getDashboards(tenantId: string): AnalyticsDashboard[] {
    return Array.from(this.dashboards.values())
      .filter(d => d.tenantId === tenantId);
  }

  updateDashboard(dashboardId: string, updates: Partial<Pick<AnalyticsDashboard, 'name' | 'widgets' | 'dateRange' | 'refreshInterval'>>): AnalyticsDashboard | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    Object.assign(dashboard, updates);
    return dashboard;
  }

  addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): DashboardWidget | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    dashboard.widgets.push(newWidget);
    return newWidget;
  }

  removeWidget(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    const index = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (index === -1) return false;

    dashboard.widgets.splice(index, 1);
    return true;
  }

  deleteDashboard(dashboardId: string): boolean {
    return this.dashboards.delete(dashboardId);
  }

  // ==========================================================================
  // ALERTS
  // ==========================================================================

  createAlert(params: {
    tenantId: string;
    name: string;
    condition: AlertCondition;
    threshold: number;
    comparison: AnalyticsAlert['comparison'];
    window: number;
    channels: AnalyticsAlert['channels'];
  }): AnalyticsAlert {
    const alert: AnalyticsAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      name: params.name,
      condition: params.condition,
      threshold: params.threshold,
      comparison: params.comparison,
      window: params.window,
      channels: params.channels,
      isEnabled: true,
      triggerCount: 0,
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  getAlert(alertId: string): AnalyticsAlert | null {
    return this.alerts.get(alertId) || null;
  }

  getAlerts(tenantId: string): AnalyticsAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.tenantId === tenantId);
  }

  updateAlert(alertId: string, updates: Partial<Pick<AnalyticsAlert, 'name' | 'threshold' | 'comparison' | 'window' | 'channels' | 'isEnabled'>>): AnalyticsAlert | null {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    Object.assign(alert, updates);
    return alert;
  }

  deleteAlert(alertId: string): boolean {
    return this.alerts.delete(alertId);
  }

  private checkAlerts(event: AnalyticsEvent): void {
    // Would check event against alert conditions
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  exportEvents(config: ExportConfig & { tenantId: string }): { data: any; filename: string } {
    let events = Array.from(this.events.values())
      .filter(e =>
        e.user.tenantId === config.tenantId &&
        e.timestamp >= config.dateRange.start &&
        e.timestamp <= config.dateRange.end
      );

    if (config.eventTypes?.length) {
      events = events.filter(e => config.eventTypes!.includes(e.eventName));
    }

    const exportData = events.map(e => {
      const data: any = {
        id: e.id,
        eventName: e.eventName,
        category: e.category,
        timestamp: e.timestamp.toISOString(),
        sessionId: e.sessionId,
        properties: e.properties,
      };

      if (config.includeUserProperties && !config.anonymize) {
        data.userId = e.user.userId;
        data.userProperties = e.user.userProperties;
      } else if (config.anonymize) {
        data.anonymousId = e.user.anonymousId;
      }

      if (config.includeDeviceInfo) {
        data.device = config.anonymize
          ? { platform: e.device.platform, osVersion: e.device.osVersion, appVersion: e.device.appVersion }
          : e.device;
      }

      return data;
    });

    const filename = `events_${config.dateRange.start.toISOString().split('T')[0]}_${config.dateRange.end.toISOString().split('T')[0]}.${config.format}`;

    return {
      data: config.format === 'json' ? exportData : this.convertToCSV(exportData),
      filename,
    };
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // ==========================================================================
  // AGGREGATION & METRICS
  // ==========================================================================

  getEventCounts(params: {
    tenantId: string;
    groupBy: 'hour' | 'day' | 'week' | 'month';
    startDate: Date;
    endDate: Date;
    eventNames?: string[];
  }): { period: string; count: number; breakdown?: Record<string, number> }[] {
    let events = Array.from(this.events.values())
      .filter(e =>
        e.user.tenantId === params.tenantId &&
        e.timestamp >= params.startDate &&
        e.timestamp <= params.endDate
      );

    if (params.eventNames?.length) {
      events = events.filter(e => params.eventNames!.includes(e.eventName));
    }

    const buckets = new Map<string, { count: number; breakdown: Map<string, number> }>();

    events.forEach(e => {
      const key = this.getBucketKey(e.timestamp, params.groupBy);
      if (!buckets.has(key)) {
        buckets.set(key, { count: 0, breakdown: new Map() });
      }
      const bucket = buckets.get(key)!;
      bucket.count++;
      bucket.breakdown.set(e.eventName, (bucket.breakdown.get(e.eventName) || 0) + 1);
    });

    return Array.from(buckets.entries())
      .map(([period, data]) => ({
        period,
        count: data.count,
        breakdown: Object.fromEntries(data.breakdown),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  getUserMetrics(params: {
    tenantId: string;
    startDate: Date;
    endDate: Date;
  }): {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    avgSessionsPerUser: number;
    avgEventsPerUser: number;
    avgSessionDuration: number;
  } {
    const sessions = Array.from(this.sessions.values())
      .filter(s =>
        s.tenantId === params.tenantId &&
        s.startTime >= params.startDate &&
        s.startTime <= params.endDate
      );

    const uniqueUsers = new Set<string>();
    const newUsers = new Set<string>();
    let totalEvents = 0;
    let totalDuration = 0;

    sessions.forEach(s => {
      const userId = s.userId || s.anonymousId;
      uniqueUsers.add(userId);
      if (s.isFirstSession) {
        newUsers.add(userId);
      }
      totalEvents += s.eventCount;
      totalDuration += s.duration || (Date.now() - s.startTime.getTime());
    });

    const userCount = uniqueUsers.size;

    return {
      totalUsers: userCount,
      newUsers: newUsers.size,
      activeUsers: userCount,
      avgSessionsPerUser: userCount > 0 ? sessions.length / userCount : 0,
      avgEventsPerUser: userCount > 0 ? totalEvents / userCount : 0,
      avgSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
    };
  }

  getTopEvents(tenantId: string, limit = 10, period?: { start: Date; end: Date }): { eventName: string; count: number; uniqueUsers: number }[] {
    let events = Array.from(this.events.values())
      .filter(e => e.user.tenantId === tenantId);

    if (period) {
      events = events.filter(e => e.timestamp >= period.start && e.timestamp <= period.end);
    }

    const eventStats = new Map<string, { count: number; users: Set<string> }>();

    events.forEach(e => {
      if (!eventStats.has(e.eventName)) {
        eventStats.set(e.eventName, { count: 0, users: new Set() });
      }
      const stat = eventStats.get(e.eventName)!;
      stat.count++;
      stat.users.add(e.user.userId || e.user.anonymousId);
    });

    return Array.from(eventStats.entries())
      .map(([eventName, stats]) => ({
        eventName,
        count: stats.count,
        uniqueUsers: stats.users.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getPlatformBreakdown(tenantId: string, period: { start: Date; end: Date }): Record<PlatformType, { sessions: number; users: number; events: number }> {
    const sessions = Array.from(this.sessions.values())
      .filter(s =>
        s.tenantId === tenantId &&
        s.startTime >= period.start &&
        s.startTime <= period.end
      );

    const breakdown: Record<PlatformType, { sessions: number; users: Set<string>; events: number }> = {
      ios: { sessions: 0, users: new Set(), events: 0 },
      android: { sessions: 0, users: new Set(), events: 0 },
      web: { sessions: 0, users: new Set(), events: 0 },
      pwa: { sessions: 0, users: new Set(), events: 0 },
    };

    sessions.forEach(s => {
      const platform = s.device.platform;
      breakdown[platform].sessions++;
      breakdown[platform].users.add(s.userId || s.anonymousId);
      breakdown[platform].events += s.eventCount;
    });

    return {
      ios: { sessions: breakdown.ios.sessions, users: breakdown.ios.users.size, events: breakdown.ios.events },
      android: { sessions: breakdown.android.sessions, users: breakdown.android.users.size, events: breakdown.android.events },
      web: { sessions: breakdown.web.sessions, users: breakdown.web.users.size, events: breakdown.web.events },
      pwa: { sessions: breakdown.pwa.sessions, users: breakdown.pwa.users.size, events: breakdown.pwa.events },
    };
  }

  private getBucketKey(date: Date, groupBy: 'hour' | 'day' | 'week' | 'month'): string {
    const d = new Date(date);
    switch (groupBy) {
      case 'hour':
        return `${d.toISOString().split('T')[0]}T${d.getHours().toString().padStart(2, '0')}:00`;
      case 'day':
        return d.toISOString().split('T')[0];
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'month':
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }
  }
}
