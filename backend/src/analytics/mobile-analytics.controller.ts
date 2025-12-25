import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  MobileAnalyticsService,
  AnalyticsEvent,
  MobileSession,
  ScreenView,
  PerformanceMetric,
  CrashReport,
  ANRReport,
  ConversionFunnel,
  FunnelAnalysis,
  Cohort,
  RetentionAnalysis,
  UserJourney,
  RealTimeStats,
  AnalyticsDashboard,
  DashboardWidget,
  AnalyticsAlert,
  EventCategory,
  PlatformType,
  SessionState,
  CrashSeverity,
  MetricType,
  CohortType,
  RetentionPeriod,
  DeviceInfo,
  UserContext,
  CampaignAttribution,
  FunnelStageConfig,
  CohortCriteria,
  AlertCondition,
  AppLaunchMetrics,
  MemoryMetrics,
  Breadcrumb,
  ExportConfig,
} from './mobile-analytics.service';

// ============================================================================
// DTOs
// ============================================================================

class TrackEventDto {
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
}

class TrackScreenViewDto {
  screenName: string;
  screenClass?: string;
  sessionId: string;
  device: DeviceInfo;
  user: UserContext;
  loadTime?: number;
  isEntryPoint?: boolean;
}

class TrackInteractionDto {
  interactionType: 'tap' | 'swipe' | 'long_press' | 'scroll' | 'pinch' | 'input' | 'gesture';
  elementId?: string;
  elementType?: string;
  screenName: string;
  sessionId: string;
  device: DeviceInfo;
  user: UserContext;
  properties?: Record<string, any>;
}

class TrackConversionDto {
  conversionName: string;
  value?: number;
  currency?: string;
  sessionId: string;
  device: DeviceInfo;
  user: UserContext;
  properties?: Record<string, any>;
}

class TrackCustomEventDto {
  eventName: string;
  sessionId: string;
  device: DeviceInfo;
  user: UserContext;
  properties?: Record<string, any>;
  metrics?: Record<string, number>;
}

class BatchTrackEventsDto {
  events: Array<{
    eventName: string;
    category: EventCategory;
    device: DeviceInfo;
    user: UserContext;
    sessionId: string;
    properties?: Record<string, any>;
    timestamp?: string;
  }>;
}

class StartSessionDto {
  device: DeviceInfo;
  user: UserContext;
  attribution?: CampaignAttribution;
}

class TrackPerformanceMetricDto {
  name: string;
  type: MetricType;
  value: number;
  unit: string;
  sessionId: string;
  device: DeviceInfo;
  tags?: Record<string, string>;
}

class TrackAppLaunchDto {
  sessionId: string;
  device: DeviceInfo;
  metrics: Partial<AppLaunchMetrics>;
}

class TrackNetworkRequestDto {
  sessionId: string;
  device: DeviceInfo;
  url: string;
  method: string;
  statusCode: number;
  latency: number;
  requestSize: number;
  responseSize: number;
  success: boolean;
}

class TrackMemoryUsageDto {
  sessionId: string;
  device: DeviceInfo;
  metrics: Partial<MemoryMetrics>;
}

class TrackFrameRateDto {
  sessionId: string;
  device: DeviceInfo;
  fps: number;
  droppedFrames: number;
  screenName: string;
}

class ReportCrashDto {
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
}

class ReportANRDto {
  sessionId: string;
  duration: number;
  mainThreadBlocked: boolean;
  stackTrace: string;
  device: DeviceInfo;
  foregroundActivity?: string;
}

class AddBreadcrumbDto {
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

class CreateFunnelDto {
  name: string;
  tenantId: string;
  stages: FunnelStageConfig[];
}

class UpdateFunnelDto {
  name?: string;
  stages?: FunnelStageConfig[];
}

class CreateCohortDto {
  name: string;
  type: CohortType;
  tenantId: string;
  criteria: CohortCriteria;
}

class CreateDashboardDto {
  tenantId: string;
  name: string;
  widgets?: DashboardWidget[];
  dateRange?: { start: string; end: string };
  isDefault?: boolean;
}

class UpdateDashboardDto {
  name?: string;
  widgets?: DashboardWidget[];
  dateRange?: { start: string; end: string };
  refreshInterval?: number;
}

class AddWidgetDto {
  type: 'metric' | 'chart' | 'table' | 'funnel' | 'retention' | 'map';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

class CreateAlertDto {
  tenantId: string;
  name: string;
  condition: AlertCondition;
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  window: number;
  channels: ('email' | 'webhook' | 'slack' | 'push')[];
}

class UpdateAlertDto {
  name?: string;
  threshold?: number;
  comparison?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  window?: number;
  channels?: ('email' | 'webhook' | 'slack' | 'push')[];
  isEnabled?: boolean;
}

class ExportEventsDto {
  tenantId: string;
  format: 'csv' | 'json' | 'parquet';
  startDate: string;
  endDate: string;
  eventTypes?: string[];
  includeUserProperties: boolean;
  includeDeviceInfo: boolean;
  anonymize: boolean;
}

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller('mobile-analytics')
export class MobileAnalyticsController {
  constructor(private readonly mobileAnalyticsService: MobileAnalyticsService) {}

  // ==========================================================================
  // EVENT TRACKING
  // ==========================================================================

  @Post('events')
  trackEvent(@Body() dto: TrackEventDto): AnalyticsEvent {
    return this.mobileAnalyticsService.trackEvent(dto);
  }

  @Post('events/screen-view')
  trackScreenView(@Body() dto: TrackScreenViewDto): ScreenView {
    return this.mobileAnalyticsService.trackScreenView(dto);
  }

  @Post('events/interaction')
  trackInteraction(@Body() dto: TrackInteractionDto): AnalyticsEvent {
    return this.mobileAnalyticsService.trackInteraction(dto);
  }

  @Post('events/conversion')
  trackConversion(@Body() dto: TrackConversionDto): AnalyticsEvent {
    return this.mobileAnalyticsService.trackConversion(dto);
  }

  @Post('events/custom')
  trackCustomEvent(@Body() dto: TrackCustomEventDto): AnalyticsEvent {
    return this.mobileAnalyticsService.trackCustomEvent(dto);
  }

  @Post('events/batch')
  batchTrackEvents(@Body() dto: BatchTrackEventsDto): AnalyticsEvent[] {
    const events = dto.events.map(e => ({
      ...e,
      timestamp: e.timestamp ? new Date(e.timestamp) : undefined,
    }));
    return this.mobileAnalyticsService.batchTrackEvents(events);
  }

  @Get('events/:eventId')
  getEvent(@Param('eventId') eventId: string): AnalyticsEvent | null {
    return this.mobileAnalyticsService.getEvent(eventId);
  }

  @Get('events/session/:sessionId')
  getEventsBySession(@Param('sessionId') sessionId: string): AnalyticsEvent[] {
    return this.mobileAnalyticsService.getEventsBySession(sessionId);
  }

  @Get('events/user/:userId')
  getEventsByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ): AnalyticsEvent[] {
    return this.mobileAnalyticsService.getEventsByUser(userId, limit);
  }

  @Get('events/query/:tenantId')
  queryEvents(
    @Param('tenantId') tenantId: string,
    @Query('eventNames') eventNames?: string,
    @Query('categories') categories?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('platforms') platforms?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): { events: AnalyticsEvent[]; total: number } {
    return this.mobileAnalyticsService.queryEvents({
      tenantId,
      eventNames: eventNames?.split(','),
      categories: categories?.split(',') as EventCategory[],
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      platforms: platforms?.split(',') as PlatformType[],
      userId,
      limit,
      offset,
    });
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  @Post('sessions')
  startSession(@Body() dto: StartSessionDto): MobileSession {
    return this.mobileAnalyticsService.startSession(dto);
  }

  @Put('sessions/:sessionId/state')
  updateSessionState(
    @Param('sessionId') sessionId: string,
    @Body('state') state: SessionState,
  ): MobileSession | null {
    return this.mobileAnalyticsService.updateSessionState(sessionId, state);
  }

  @Post('sessions/:sessionId/end')
  endSession(@Param('sessionId') sessionId: string): MobileSession | null {
    return this.mobileAnalyticsService.endSession(sessionId);
  }

  @Get('sessions/:sessionId')
  getSession(@Param('sessionId') sessionId: string): MobileSession | null {
    return this.mobileAnalyticsService.getSession(sessionId);
  }

  @Get('sessions/user/:userId')
  getUserSessions(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ): MobileSession[] {
    return this.mobileAnalyticsService.getUserSessions(userId, limit);
  }

  @Get('sessions/active/:tenantId')
  getActiveSessions(@Param('tenantId') tenantId: string): MobileSession[] {
    return this.mobileAnalyticsService.getActiveSessions(tenantId);
  }

  // ==========================================================================
  // PERFORMANCE MONITORING
  // ==========================================================================

  @Post('performance/metrics')
  trackPerformanceMetric(@Body() dto: TrackPerformanceMetricDto): PerformanceMetric {
    return this.mobileAnalyticsService.trackPerformanceMetric(dto);
  }

  @Post('performance/app-launch')
  @HttpCode(HttpStatus.OK)
  trackAppLaunch(@Body() dto: TrackAppLaunchDto): { tracked: boolean } {
    this.mobileAnalyticsService.trackAppLaunch(dto);
    return { tracked: true };
  }

  @Post('performance/network-request')
  @HttpCode(HttpStatus.OK)
  trackNetworkRequest(@Body() dto: TrackNetworkRequestDto): { tracked: boolean } {
    this.mobileAnalyticsService.trackNetworkRequest(dto);
    return { tracked: true };
  }

  @Post('performance/memory')
  @HttpCode(HttpStatus.OK)
  trackMemoryUsage(@Body() dto: TrackMemoryUsageDto): { tracked: boolean } {
    this.mobileAnalyticsService.trackMemoryUsage(dto);
    return { tracked: true };
  }

  @Post('performance/frame-rate')
  @HttpCode(HttpStatus.OK)
  trackFrameRate(@Body() dto: TrackFrameRateDto): { tracked: boolean } {
    this.mobileAnalyticsService.trackFrameRate(dto);
    return { tracked: true };
  }

  @Get('performance/metrics')
  getPerformanceMetrics(
    @Query('sessionId') sessionId?: string,
    @Query('name') name?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): PerformanceMetric[] {
    return this.mobileAnalyticsService.getPerformanceMetrics({
      sessionId,
      name,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('performance/summary/:tenantId')
  getPerformanceSummary(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): {
    appLaunch: { avg: number; p50: number; p95: number };
    networkLatency: { avg: number; p50: number; p95: number };
    frameRate: { avg: number; min: number };
    memoryUsage: { avg: number; peak: number };
  } {
    return this.mobileAnalyticsService.getPerformanceSummary(tenantId, {
      start: new Date(startDate),
      end: new Date(endDate),
    });
  }

  // ==========================================================================
  // CRASH REPORTING
  // ==========================================================================

  @Post('crashes')
  reportCrash(@Body() dto: ReportCrashDto): CrashReport {
    return this.mobileAnalyticsService.reportCrash(dto);
  }

  @Post('crashes/anr')
  reportANR(@Body() dto: ReportANRDto): ANRReport {
    return this.mobileAnalyticsService.reportANR(dto);
  }

  @Post('crashes/breadcrumb/:sessionId')
  @HttpCode(HttpStatus.OK)
  addBreadcrumb(
    @Param('sessionId') sessionId: string,
    @Body() dto: AddBreadcrumbDto,
  ): { added: boolean } {
    this.mobileAnalyticsService.addBreadcrumb(sessionId, dto);
    return { added: true };
  }

  @Get('crashes/:crashId')
  getCrashReport(@Param('crashId') crashId: string): CrashReport | null {
    return this.mobileAnalyticsService.getCrashReport(crashId);
  }

  @Get('crashes/tenant/:tenantId')
  getCrashReports(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: CrashReport['status'],
    @Query('severity') severity?: CrashSeverity,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ): CrashReport[] {
    return this.mobileAnalyticsService.getCrashReports({
      tenantId,
      status,
      severity,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
    });
  }

  @Put('crashes/:crashId/status')
  updateCrashStatus(
    @Param('crashId') crashId: string,
    @Body('status') status: CrashReport['status'],
    @Body('assignee') assignee?: string,
    @Body('resolution') resolution?: string,
  ): CrashReport | null {
    return this.mobileAnalyticsService.updateCrashStatus(crashId, status, assignee, resolution);
  }

  @Get('crashes/crash-free-rate/:tenantId')
  getCrashFreeRate(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): { crashFreeRate: number } {
    const rate = this.mobileAnalyticsService.getCrashFreeRate(tenantId, {
      start: new Date(startDate),
      end: new Date(endDate),
    });
    return { crashFreeRate: rate };
  }

  // ==========================================================================
  // FUNNEL ANALYSIS
  // ==========================================================================

  @Post('funnels')
  createFunnel(@Body() dto: CreateFunnelDto): ConversionFunnel {
    return this.mobileAnalyticsService.createFunnel(dto);
  }

  @Get('funnels/:funnelId')
  getFunnel(@Param('funnelId') funnelId: string): ConversionFunnel | null {
    return this.mobileAnalyticsService.getFunnel(funnelId);
  }

  @Get('funnels/tenant/:tenantId')
  getFunnels(@Param('tenantId') tenantId: string): ConversionFunnel[] {
    return this.mobileAnalyticsService.getFunnels(tenantId);
  }

  @Put('funnels/:funnelId')
  updateFunnel(
    @Param('funnelId') funnelId: string,
    @Body() dto: UpdateFunnelDto,
  ): ConversionFunnel | null {
    return this.mobileAnalyticsService.updateFunnel(funnelId, dto);
  }

  @Delete('funnels/:funnelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFunnel(@Param('funnelId') funnelId: string): void {
    this.mobileAnalyticsService.deleteFunnel(funnelId);
  }

  @Get('funnels/:funnelId/analyze')
  analyzeFunnel(
    @Param('funnelId') funnelId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): FunnelAnalysis | null {
    return this.mobileAnalyticsService.analyzeFunnel(funnelId, {
      start: new Date(startDate),
      end: new Date(endDate),
    });
  }

  // ==========================================================================
  // COHORT ANALYSIS
  // ==========================================================================

  @Post('cohorts')
  createCohort(@Body() dto: CreateCohortDto): Cohort {
    return this.mobileAnalyticsService.createCohort(dto);
  }

  @Get('cohorts/:cohortId')
  getCohort(@Param('cohortId') cohortId: string): Cohort | null {
    return this.mobileAnalyticsService.getCohort(cohortId);
  }

  @Get('cohorts/tenant/:tenantId')
  getCohorts(@Param('tenantId') tenantId: string): Cohort[] {
    return this.mobileAnalyticsService.getCohorts(tenantId);
  }

  @Delete('cohorts/:cohortId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCohort(@Param('cohortId') cohortId: string): void {
    this.mobileAnalyticsService.deleteCohort(cohortId);
  }

  @Get('cohorts/:cohortId/retention')
  analyzeRetention(
    @Param('cohortId') cohortId: string,
    @Query('period') period: RetentionPeriod = 'weekly',
    @Query('weeks') weeks?: number,
  ): RetentionAnalysis | null {
    return this.mobileAnalyticsService.analyzeRetention(cohortId, period, weeks);
  }

  // ==========================================================================
  // USER JOURNEY
  // ==========================================================================

  @Get('journeys/:userId')
  getUserJourney(@Param('userId') userId: string): UserJourney | null {
    return this.mobileAnalyticsService.getUserJourney(userId);
  }

  // ==========================================================================
  // REAL-TIME ANALYTICS
  // ==========================================================================

  @Get('realtime/:tenantId')
  getRealTimeStats(@Param('tenantId') tenantId: string): RealTimeStats {
    return this.mobileAnalyticsService.getRealTimeStats(tenantId);
  }

  // ==========================================================================
  // DASHBOARDS
  // ==========================================================================

  @Post('dashboards')
  createDashboard(@Body() dto: CreateDashboardDto): AnalyticsDashboard {
    return this.mobileAnalyticsService.createDashboard({
      ...dto,
      dateRange: dto.dateRange ? {
        start: new Date(dto.dateRange.start),
        end: new Date(dto.dateRange.end),
      } : undefined,
    });
  }

  @Get('dashboards/:dashboardId')
  getDashboard(@Param('dashboardId') dashboardId: string): AnalyticsDashboard | null {
    return this.mobileAnalyticsService.getDashboard(dashboardId);
  }

  @Get('dashboards/tenant/:tenantId')
  getDashboards(@Param('tenantId') tenantId: string): AnalyticsDashboard[] {
    return this.mobileAnalyticsService.getDashboards(tenantId);
  }

  @Put('dashboards/:dashboardId')
  updateDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body() dto: UpdateDashboardDto,
  ): AnalyticsDashboard | null {
    return this.mobileAnalyticsService.updateDashboard(dashboardId, {
      ...dto,
      dateRange: dto.dateRange ? {
        start: new Date(dto.dateRange.start),
        end: new Date(dto.dateRange.end),
      } : undefined,
    });
  }

  @Post('dashboards/:dashboardId/widgets')
  addWidget(
    @Param('dashboardId') dashboardId: string,
    @Body() dto: AddWidgetDto,
  ): DashboardWidget | null {
    return this.mobileAnalyticsService.addWidget(dashboardId, dto);
  }

  @Delete('dashboards/:dashboardId/widgets/:widgetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeWidget(
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
  ): void {
    this.mobileAnalyticsService.removeWidget(dashboardId, widgetId);
  }

  @Delete('dashboards/:dashboardId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDashboard(@Param('dashboardId') dashboardId: string): void {
    this.mobileAnalyticsService.deleteDashboard(dashboardId);
  }

  // ==========================================================================
  // ALERTS
  // ==========================================================================

  @Post('alerts')
  createAlert(@Body() dto: CreateAlertDto): AnalyticsAlert {
    return this.mobileAnalyticsService.createAlert(dto);
  }

  @Get('alerts/:alertId')
  getAlert(@Param('alertId') alertId: string): AnalyticsAlert | null {
    return this.mobileAnalyticsService.getAlert(alertId);
  }

  @Get('alerts/tenant/:tenantId')
  getAlerts(@Param('tenantId') tenantId: string): AnalyticsAlert[] {
    return this.mobileAnalyticsService.getAlerts(tenantId);
  }

  @Put('alerts/:alertId')
  updateAlert(
    @Param('alertId') alertId: string,
    @Body() dto: UpdateAlertDto,
  ): AnalyticsAlert | null {
    return this.mobileAnalyticsService.updateAlert(alertId, dto);
  }

  @Delete('alerts/:alertId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAlert(@Param('alertId') alertId: string): void {
    this.mobileAnalyticsService.deleteAlert(alertId);
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  @Post('export')
  exportEvents(@Body() dto: ExportEventsDto): { data: any; filename: string } {
    return this.mobileAnalyticsService.exportEvents({
      tenantId: dto.tenantId,
      format: dto.format,
      dateRange: {
        start: new Date(dto.startDate),
        end: new Date(dto.endDate),
      },
      eventTypes: dto.eventTypes,
      includeUserProperties: dto.includeUserProperties,
      includeDeviceInfo: dto.includeDeviceInfo,
      anonymize: dto.anonymize,
    });
  }

  // ==========================================================================
  // AGGREGATION & METRICS
  // ==========================================================================

  @Get('metrics/event-counts/:tenantId')
  getEventCounts(
    @Param('tenantId') tenantId: string,
    @Query('groupBy') groupBy: 'hour' | 'day' | 'week' | 'month' = 'day',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('eventNames') eventNames?: string,
  ): { period: string; count: number; breakdown?: Record<string, number> }[] {
    return this.mobileAnalyticsService.getEventCounts({
      tenantId,
      groupBy,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      eventNames: eventNames?.split(','),
    });
  }

  @Get('metrics/users/:tenantId')
  getUserMetrics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    avgSessionsPerUser: number;
    avgEventsPerUser: number;
    avgSessionDuration: number;
  } {
    return this.mobileAnalyticsService.getUserMetrics({
      tenantId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }

  @Get('metrics/top-events/:tenantId')
  getTopEvents(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): { eventName: string; count: number; uniqueUsers: number }[] {
    const period = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;
    return this.mobileAnalyticsService.getTopEvents(tenantId, limit, period);
  }

  @Get('metrics/platforms/:tenantId')
  getPlatformBreakdown(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Record<PlatformType, { sessions: number; users: number; events: number }> {
    return this.mobileAnalyticsService.getPlatformBreakdown(tenantId, {
      start: new Date(startDate),
      end: new Date(endDate),
    });
  }
}
