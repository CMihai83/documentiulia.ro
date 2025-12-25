import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SystemSettingsService, SettingCategory } from './system-settings.service';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { UserImpersonationService, ImpersonationPermission } from './user-impersonation.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly settingsService: SystemSettingsService,
    private readonly analyticsService: PlatformAnalyticsService,
    private readonly impersonationService: UserImpersonationService,
  ) {}

  // =================== SYSTEM SETTINGS ===================

  @Get('settings')
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'System settings' })
  async getSettings(@Query('category') category?: SettingCategory) {
    if (category) {
      const settings = await this.settingsService.getSettingsByCategory(category);
      return { settings, total: settings.length };
    }
    const settings = await this.settingsService.getAllSettings();
    return { settings, total: settings.length };
  }

  @Get('settings/public')
  @ApiOperation({ summary: 'Get public settings' })
  @ApiResponse({ status: 200, description: 'Public settings' })
  async getPublicSettings() {
    const settings = await this.settingsService.getPublicSettings();
    return { settings, total: settings.length };
  }

  @Get('settings/:key')
  @ApiOperation({ summary: 'Get a specific setting' })
  @ApiResponse({ status: 200, description: 'Setting value' })
  async getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Put('settings/:key')
  @ApiOperation({ summary: 'Update a setting' })
  @ApiResponse({ status: 200, description: 'Setting updated' })
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: any },
    @Request() req: any,
  ) {
    return this.settingsService.updateSetting(key, body.value, req.user.id);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Bulk update settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async bulkUpdateSettings(
    @Body() body: { updates: Array<{ key: string; value: any }> },
    @Request() req: any,
  ) {
    const results = await this.settingsService.bulkUpdateSettings(
      body.updates,
      req.user.id,
    );
    return { updated: results.length };
  }

  @Post('settings/:key/reset')
  @ApiOperation({ summary: 'Reset setting to default' })
  @ApiResponse({ status: 200, description: 'Setting reset' })
  async resetSetting(@Param('key') key: string, @Request() req: any) {
    return this.settingsService.resetToDefault(key, req.user.id);
  }

  @Get('settings/history')
  @ApiOperation({ summary: 'Get settings change history' })
  @ApiQuery({ name: 'key', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Settings history' })
  async getSettingsHistory(
    @Query('key') key?: string,
    @Query('limit') limit?: string,
  ) {
    const history = await this.settingsService.getSettingsHistory(
      key,
      limit ? parseInt(limit) : 50,
    );
    return { history, total: history.length };
  }

  // =================== MAINTENANCE MODE ===================

  @Get('maintenance')
  @ApiOperation({ summary: 'Get maintenance mode status' })
  @ApiResponse({ status: 200, description: 'Maintenance mode status' })
  async getMaintenanceMode() {
    return this.settingsService.getMaintenanceMode();
  }

  @Post('maintenance/enable')
  @ApiOperation({ summary: 'Enable maintenance mode' })
  @ApiResponse({ status: 200, description: 'Maintenance mode enabled' })
  async enableMaintenanceMode(
    @Body() body: {
      message: string;
      allowedRoles?: string[];
      allowedIPs?: string[];
      scheduledEnd?: string;
    },
    @Request() req: any,
  ) {
    return this.settingsService.enableMaintenanceMode(body.message, req.user.id, {
      allowedRoles: body.allowedRoles,
      allowedIPs: body.allowedIPs,
      scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : undefined,
    });
  }

  @Post('maintenance/disable')
  @ApiOperation({ summary: 'Disable maintenance mode' })
  @ApiResponse({ status: 200, description: 'Maintenance mode disabled' })
  async disableMaintenanceMode(@Request() req: any) {
    return this.settingsService.disableMaintenanceMode(req.user.id);
  }

  // =================== ANNOUNCEMENTS ===================

  @Get('announcements')
  @ApiOperation({ summary: 'Get all announcements' })
  @ApiResponse({ status: 200, description: 'Announcements' })
  async getAllAnnouncements() {
    const announcements = await this.settingsService.getAllAnnouncements();
    return { announcements, total: announcements.length };
  }

  @Get('announcements/active')
  @ApiOperation({ summary: 'Get active announcements' })
  @ApiResponse({ status: 200, description: 'Active announcements' })
  async getActiveAnnouncements(@Request() req: any) {
    const announcements = await this.settingsService.getActiveAnnouncements({
      userRole: req.user.role,
      tenantId: req.user.tenantId,
    });
    return { announcements, total: announcements.length };
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create announcement' })
  @ApiResponse({ status: 201, description: 'Announcement created' })
  async createAnnouncement(
    @Body() body: {
      type: 'info' | 'warning' | 'error' | 'success';
      title: string;
      message: string;
      targetAudience: 'all' | 'admins' | 'users' | 'specific_tenants';
      targetTenantIds?: string[];
      dismissible?: boolean;
      startsAt?: string;
      endsAt?: string;
    },
    @Request() req: any,
  ) {
    return this.settingsService.createAnnouncement(
      {
        ...body,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      },
      req.user.id,
    );
  }

  @Put('announcements/:id')
  @ApiOperation({ summary: 'Update announcement' })
  @ApiResponse({ status: 200, description: 'Announcement updated' })
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      message?: string;
      isActive?: boolean;
      endsAt?: string;
    },
  ) {
    return this.settingsService.updateAnnouncement(id, {
      ...body,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    });
  }

  @Delete('announcements/:id')
  @ApiOperation({ summary: 'Delete announcement' })
  @ApiResponse({ status: 200, description: 'Announcement deleted' })
  async deleteAnnouncement(@Param('id') id: string) {
    await this.settingsService.deleteAnnouncement(id);
    return { success: true };
  }

  // =================== PLATFORM ANALYTICS ===================

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get platform overview' })
  @ApiResponse({ status: 200, description: 'Platform overview' })
  async getPlatformOverview() {
    return this.analyticsService.getPlatformOverview();
  }

  @Get('analytics/users')
  @ApiOperation({ summary: 'Get user activity metrics' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'User activity metrics' })
  async getUserActivityMetrics(
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getUserActivityMetrics(period);
  }

  @Get('analytics/users/countries')
  @ApiOperation({ summary: 'Get users by country' })
  @ApiResponse({ status: 200, description: 'Users by country' })
  async getUsersByCountry() {
    return this.analyticsService.getActiveUsersByCountry();
  }

  @Get('analytics/revenue')
  @ApiOperation({ summary: 'Get revenue metrics' })
  @ApiResponse({ status: 200, description: 'Revenue metrics' })
  async getRevenueMetrics() {
    return this.analyticsService.getRevenueMetrics();
  }

  @Get('analytics/subscriptions')
  @ApiOperation({ summary: 'Get subscription metrics' })
  @ApiResponse({ status: 200, description: 'Subscription metrics' })
  async getSubscriptionMetrics() {
    return this.analyticsService.getSubscriptionMetrics();
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  async getPerformanceMetrics() {
    return this.analyticsService.getSystemPerformance();
  }

  @Get('analytics/performance/history')
  @ApiOperation({ summary: 'Get performance history' })
  @ApiQuery({ name: 'metric', enum: ['response_time', 'error_rate', 'requests'] })
  @ApiQuery({ name: 'period', enum: ['hour', 'day', 'week'] })
  @ApiResponse({ status: 200, description: 'Performance history' })
  async getPerformanceHistory(
    @Query('metric') metric: 'response_time' | 'error_rate' | 'requests',
    @Query('period') period: 'hour' | 'day' | 'week' = 'day',
  ) {
    return this.analyticsService.getPerformanceHistory(metric, period);
  }

  @Get('analytics/errors')
  @ApiOperation({ summary: 'Get error metrics' })
  @ApiResponse({ status: 200, description: 'Error metrics' })
  async getErrorMetrics() {
    return this.analyticsService.getErrorMetrics();
  }

  @Get('analytics/growth')
  @ApiOperation({ summary: 'Get growth metrics' })
  @ApiQuery({ name: 'period', enum: ['week', 'month', 'quarter', 'year'] })
  @ApiResponse({ status: 200, description: 'Growth metrics' })
  async getGrowthMetrics(
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ) {
    return this.analyticsService.getGrowthMetrics(period);
  }

  @Get('analytics/features')
  @ApiOperation({ summary: 'Get feature usage' })
  @ApiResponse({ status: 200, description: 'Feature usage' })
  async getFeatureUsage() {
    return this.analyticsService.getFeatureUsage();
  }

  @Get('analytics/integrations')
  @ApiOperation({ summary: 'Get integration metrics' })
  @ApiResponse({ status: 200, description: 'Integration metrics' })
  async getIntegrationMetrics() {
    return this.analyticsService.getIntegrationMetrics();
  }

  @Get('analytics/realtime')
  @ApiOperation({ summary: 'Get real-time metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics' })
  async getRealTimeMetrics() {
    return this.analyticsService.getRealTimeMetrics();
  }

  @Get('analytics/export')
  @ApiOperation({ summary: 'Export analytics' })
  @ApiQuery({ name: 'type', enum: ['overview', 'users', 'revenue', 'performance', 'all'] })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'] })
  @ApiResponse({ status: 200, description: 'Export URL' })
  async exportAnalytics(
    @Query('type') type: 'overview' | 'users' | 'revenue' | 'performance' | 'all',
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    return this.analyticsService.exportAnalytics(type, format);
  }

  // =================== USER IMPERSONATION ===================

  @Post('impersonation/start')
  @ApiOperation({ summary: 'Start user impersonation' })
  @ApiResponse({ status: 201, description: 'Impersonation started' })
  async startImpersonation(
    @Request() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Body() body: {
      targetUserId: string;
      targetUserEmail: string;
      targetTenantId: string;
      targetUserRole: string;
      reason: string;
      ticketId?: string;
      permissions?: ImpersonationPermission[];
      duration?: number;
    },
  ) {
    return this.impersonationService.startImpersonation({
      adminId: req.user.id,
      adminEmail: req.user.email,
      adminRole: req.user.role,
      targetUserId: body.targetUserId,
      targetUserEmail: body.targetUserEmail,
      targetTenantId: body.targetTenantId,
      targetUserRole: body.targetUserRole,
      reason: body.reason,
      ticketId: body.ticketId,
      permissions: body.permissions,
      duration: body.duration,
      ipAddress: ip,
      userAgent,
    });
  }

  @Post('impersonation/:sessionId/end')
  @ApiOperation({ summary: 'End impersonation session' })
  @ApiResponse({ status: 200, description: 'Impersonation ended' })
  async endImpersonation(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    await this.impersonationService.endImpersonation(sessionId, req.user.id);
    return { success: true };
  }

  @Get('impersonation/active')
  @ApiOperation({ summary: 'Get my active impersonation session' })
  @ApiResponse({ status: 200, description: 'Active session or null' })
  async getMyActiveSession(@Request() req: any) {
    const session = await this.impersonationService.getActiveSessionForAdmin(
      req.user.id,
    );
    return { session };
  }

  @Get('impersonation/sessions')
  @ApiOperation({ summary: 'Get all impersonation sessions' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'adminId', required: false })
  @ApiQuery({ name: 'targetUserId', required: false })
  @ApiResponse({ status: 200, description: 'Impersonation sessions' })
  async getSessions(
    @Query('active') active?: string,
    @Query('adminId') adminId?: string,
    @Query('targetUserId') targetUserId?: string,
  ) {
    const sessions = await this.impersonationService.getAllSessions({
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      adminId,
      targetUserId,
    });
    return { sessions, total: sessions.length };
  }

  @Get('impersonation/sessions/:sessionId')
  @ApiOperation({ summary: 'Get impersonation session details' })
  @ApiResponse({ status: 200, description: 'Session details' })
  async getSession(@Param('sessionId') sessionId: string) {
    const session = await this.impersonationService.getSession(sessionId);
    const audit = await this.impersonationService.getSessionAuditLog(sessionId);
    return { session, audit };
  }

  @Post('impersonation/sessions/:sessionId/force-end')
  @ApiOperation({ summary: 'Force end impersonation session (super admin)' })
  @ApiResponse({ status: 200, description: 'Session force ended' })
  async forceEndSession(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    await this.impersonationService.forceEndSession(sessionId, req.user.id);
    return { success: true };
  }

  @Get('impersonation/stats')
  @ApiOperation({ summary: 'Get impersonation statistics' })
  @ApiResponse({ status: 200, description: 'Impersonation stats' })
  async getImpersonationStats() {
    return this.impersonationService.getStats();
  }

  // =================== SYSTEM STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get combined system stats' })
  @ApiResponse({ status: 200, description: 'System stats' })
  async getSystemStats() {
    const [settings, analytics, impersonation] = await Promise.all([
      this.settingsService.getSystemStats(),
      this.analyticsService.getPlatformOverview(),
      this.impersonationService.getStats(),
    ]);

    return {
      settings,
      platform: analytics,
      impersonation,
    };
  }
}
