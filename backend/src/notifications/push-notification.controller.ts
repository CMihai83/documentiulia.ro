import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  PushNotificationService,
  DeviceToken,
  DevicePlatform,
  NotificationPreferences,
  NotificationTemplate,
  NotificationCategory,
  NotificationPriority,
  ScheduledNotification,
  PushNotificationPayload,
  NotificationAction,
  BatchSendResult,
  NotificationStats,
  PushProvider,
} from './push-notification.service';

// ============================================================================
// DTOs
// ============================================================================

class RegisterDeviceDto {
  userId: string;
  tenantId: string;
  token: string;
  platform: DevicePlatform;
  deviceId: string;
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  locale?: string;
  timezone?: string;
  metadata?: Record<string, any>;
}

class UpdatePreferencesDto {
  enabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  categories?: NotificationPreferences['categories'];
  frequency?: 'instant' | 'batched' | 'digest';
  batchIntervalMinutes?: number;
  digestTime?: string;
}

class SetCategoryPreferenceDto {
  enabled?: boolean;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  priority?: NotificationPriority;
}

class CreateTemplateDto {
  name: string;
  category: NotificationCategory;
  titleTemplate: string;
  bodyTemplate: string;
  defaultIcon?: string;
  defaultSound?: string;
  defaultPriority: NotificationPriority;
  variables: string[];
  locale?: string;
}

class SendNotificationDto {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: number;
  sound?: string;
  tag?: string;
  clickAction?: string;
  data?: Record<string, any>;
  category: NotificationCategory;
  priority: NotificationPriority;
  ttl?: number;
  collapseKey?: string;
  mutableContent?: boolean;
  contentAvailable?: boolean;
  threadId?: string;
  targetUrl?: string;
  actions?: NotificationAction[];
}

class SendToUsersDto extends SendNotificationDto {
  userIds: string[];
}

class SendToTenantDto extends SendNotificationDto {
  tenantId: string;
}

class SendWithTemplateDto {
  templateName: string;
  userIds: string[];
  variables: Record<string, string>;
  locale?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
}

class ScheduleNotificationDto extends SendNotificationDto {
  targetUserIds: string[];
  tenantId: string;
  scheduledAt: string; // ISO date string
  timezone?: string;
  recurrence?: {
    type: 'once' | 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: string;
  };
}

class SendToTopicDto extends SendNotificationDto {
  topic: string;
}

class BatchNotificationDto {
  notifications: Array<{
    userId: string;
    payload: SendNotificationDto;
  }>;
}

class ConfigureProviderDto {
  provider: PushProvider;
  config: Record<string, any>;
}

class TestNotificationDto {
  deviceToken: string;
  platform: DevicePlatform;
}

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller('push-notifications')
export class PushNotificationController {
  constructor(private readonly pushService: PushNotificationService) {}

  // ==========================================================================
  // PROVIDER MANAGEMENT
  // ==========================================================================

  @Get('providers/status')
  getProviderStatus(): { fcm: boolean; apns: boolean; webPush: boolean } {
    return this.pushService.getProviderStatus();
  }

  @Post('providers/configure')
  configureProvider(@Body() dto: ConfigureProviderDto): { success: boolean; provider: PushProvider } {
    return this.pushService.configureProvider(dto.provider, dto.config);
  }

  // ==========================================================================
  // DEVICE TOKEN MANAGEMENT
  // ==========================================================================

  @Post('devices/register')
  registerDevice(@Body() dto: RegisterDeviceDto): DeviceToken {
    return this.pushService.registerDevice(dto);
  }

  @Delete('devices/:tokenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unregisterDevice(@Param('tokenId') tokenId: string): void {
    this.pushService.unregisterDevice(tokenId);
  }

  @Put('devices/:tokenId/token')
  updateDeviceToken(
    @Param('tokenId') tokenId: string,
    @Body('newToken') newToken: string,
  ): DeviceToken | null {
    return this.pushService.updateDeviceToken(tokenId, newToken);
  }

  @Get('devices/user/:userId')
  getDevicesByUser(@Param('userId') userId: string): DeviceToken[] {
    return this.pushService.getDevicesByUser(userId);
  }

  @Get('devices/tenant/:tenantId')
  getDevicesByTenant(@Param('tenantId') tenantId: string): DeviceToken[] {
    return this.pushService.getDevicesByTenant(tenantId);
  }

  @Put('devices/:tokenId/deactivate')
  deactivateDevice(@Param('tokenId') tokenId: string): { success: boolean } {
    const result = this.pushService.deactivateDevice(tokenId);
    return { success: result };
  }

  @Post('devices/cleanup')
  cleanupStaleDevices(@Body('maxAgeDays') maxAgeDays?: number): { cleaned: number } {
    const cleaned = this.pushService.cleanupStaleDevices(maxAgeDays);
    return { cleaned };
  }

  @Get('devices/count')
  getActiveDeviceCount(): { total: number; byPlatform: Record<DevicePlatform, number> } {
    return this.pushService.getActiveDeviceCount();
  }

  // ==========================================================================
  // NOTIFICATION PREFERENCES
  // ==========================================================================

  @Put('preferences/:userId/:tenantId')
  setPreferences(
    @Param('userId') userId: string,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdatePreferencesDto,
  ): NotificationPreferences {
    return this.pushService.setPreferences(userId, tenantId, dto);
  }

  @Get('preferences/:userId')
  getPreferences(@Param('userId') userId: string): NotificationPreferences | null {
    return this.pushService.getPreferences(userId);
  }

  @Put('preferences/:userId/category/:category')
  setCategoryPreference(
    @Param('userId') userId: string,
    @Param('category') category: NotificationCategory,
    @Body() dto: SetCategoryPreferenceDto,
  ): NotificationPreferences | null {
    return this.pushService.setCategoryPreference(userId, category, dto);
  }

  @Get('preferences/:userId/allowed/:category')
  isNotificationAllowed(
    @Param('userId') userId: string,
    @Param('category') category: NotificationCategory,
  ): { allowed: boolean } {
    return { allowed: this.pushService.isNotificationAllowed(userId, category) };
  }

  // ==========================================================================
  // NOTIFICATION TEMPLATES
  // ==========================================================================

  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto): NotificationTemplate {
    return this.pushService.createTemplate(dto);
  }

  @Get('templates/:templateId')
  getTemplate(@Param('templateId') templateId: string): NotificationTemplate | null {
    return this.pushService.getTemplate(templateId);
  }

  @Get('templates/by-name/:name')
  getTemplateByName(
    @Param('name') name: string,
    @Query('locale') locale?: string,
  ): NotificationTemplate | null {
    return this.pushService.getTemplateByName(name, locale);
  }

  @Get('templates')
  listTemplates(@Query('category') category?: NotificationCategory): NotificationTemplate[] {
    return this.pushService.listTemplates(category);
  }

  @Put('templates/:templateId')
  updateTemplate(
    @Param('templateId') templateId: string,
    @Body() updates: Partial<NotificationTemplate>,
  ): NotificationTemplate | null {
    return this.pushService.updateTemplate(templateId, updates);
  }

  @Delete('templates/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTemplate(@Param('templateId') templateId: string): void {
    this.pushService.deleteTemplate(templateId);
  }

  @Post('templates/:templateId/render')
  renderTemplate(
    @Param('templateId') templateId: string,
    @Body('variables') variables: Record<string, string>,
  ): { title: string; body: string } | null {
    return this.pushService.renderTemplate(templateId, variables);
  }

  // ==========================================================================
  // SEND NOTIFICATIONS
  // ==========================================================================

  @Post('send/user/:userId')
  async sendToUser(
    @Param('userId') userId: string,
    @Body() dto: SendNotificationDto,
  ): Promise<BatchSendResult> {
    return this.pushService.sendToUser(userId, dto);
  }

  @Post('send/users')
  async sendToUsers(@Body() dto: SendToUsersDto): Promise<BatchSendResult> {
    const { userIds, ...payload } = dto;
    return this.pushService.sendToUsers(userIds, payload);
  }

  @Post('send/tenant')
  async sendToTenant(@Body() dto: SendToTenantDto): Promise<BatchSendResult> {
    const { tenantId, ...payload } = dto;
    return this.pushService.sendToTenant(tenantId, payload);
  }

  @Post('send/template')
  async sendWithTemplate(@Body() dto: SendWithTemplateDto): Promise<BatchSendResult> {
    return this.pushService.sendWithTemplate(dto.templateName, dto.userIds, dto.variables, {
      locale: dto.locale,
      data: dto.data,
      actions: dto.actions,
    });
  }

  @Post('send/batch')
  async sendBatch(@Body() dto: BatchNotificationDto): Promise<BatchSendResult> {
    return this.pushService.sendBatch(dto.notifications);
  }

  @Post('send/topic')
  async sendToTopic(@Body() dto: SendToTopicDto): Promise<BatchSendResult> {
    const { topic, ...payload } = dto;
    return this.pushService.sendToTopic(topic, payload);
  }

  // ==========================================================================
  // SCHEDULED NOTIFICATIONS
  // ==========================================================================

  @Post('scheduled')
  scheduleNotification(@Body() dto: ScheduleNotificationDto): ScheduledNotification {
    const { targetUserIds, tenantId, scheduledAt, timezone, recurrence, ...payload } = dto;
    return this.pushService.scheduleNotification({
      payload,
      targetUserIds,
      tenantId,
      scheduledAt: new Date(scheduledAt),
      timezone,
      recurrence: recurrence
        ? {
            ...recurrence,
            endDate: recurrence.endDate ? new Date(recurrence.endDate) : undefined,
          }
        : undefined,
    });
  }

  @Delete('scheduled/:scheduledId')
  cancelScheduledNotification(@Param('scheduledId') scheduledId: string): { success: boolean } {
    const result = this.pushService.cancelScheduledNotification(scheduledId);
    return { success: result };
  }

  @Get('scheduled/:scheduledId')
  getScheduledNotification(@Param('scheduledId') scheduledId: string): ScheduledNotification | null {
    return this.pushService.getScheduledNotification(scheduledId);
  }

  @Get('scheduled/tenant/:tenantId')
  listScheduledNotifications(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: ScheduledNotification['status'],
  ): ScheduledNotification[] {
    return this.pushService.listScheduledNotifications(tenantId, status);
  }

  @Post('scheduled/process')
  async processScheduledNotifications(): Promise<{ processed: number; sent: number; failed: number }> {
    return this.pushService.processScheduledNotifications();
  }

  // ==========================================================================
  // DELIVERY TRACKING & ANALYTICS
  // ==========================================================================

  @Post('tracking/:notificationId/delivered')
  @HttpCode(HttpStatus.NO_CONTENT)
  trackDelivered(@Param('notificationId') notificationId: string): void {
    this.pushService.trackDelivered(notificationId);
  }

  @Post('tracking/:notificationId/opened')
  @HttpCode(HttpStatus.NO_CONTENT)
  trackOpened(
    @Param('notificationId') notificationId: string,
    @Body('platform') platform?: DevicePlatform,
  ): void {
    this.pushService.trackOpened(notificationId, platform);
  }

  @Get('history/:userId')
  getNotificationHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ): PushNotificationPayload[] {
    return this.pushService.getNotificationHistory(userId, limit);
  }

  @Get('stats')
  getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): NotificationStats {
    return this.pushService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ==========================================================================
  // TOPIC SUBSCRIPTIONS
  // ==========================================================================

  @Post('topics/:topic/subscribe/:userId')
  subscribeToTopic(
    @Param('topic') topic: string,
    @Param('userId') userId: string,
  ): { success: boolean } {
    const result = this.pushService.subscribeToTopic(userId, topic);
    return { success: result };
  }

  @Delete('topics/:topic/unsubscribe/:userId')
  unsubscribeFromTopic(
    @Param('topic') topic: string,
    @Param('userId') userId: string,
  ): { success: boolean } {
    const result = this.pushService.unsubscribeFromTopic(userId, topic);
    return { success: result };
  }

  @Get('topics/:topic/subscribers')
  getTopicSubscribers(@Param('topic') topic: string): string[] {
    return this.pushService.getTopicSubscribers(topic);
  }

  @Get('topics/user/:userId')
  getUserTopics(@Param('userId') userId: string): string[] {
    return this.pushService.getUserTopics(userId);
  }

  // ==========================================================================
  // UTILITY ENDPOINTS
  // ==========================================================================

  @Get('users/count')
  getRegisteredUserCount(): { count: number } {
    return { count: this.pushService.getRegisteredUserCount() };
  }

  @Post('test')
  async testNotification(@Body() dto: TestNotificationDto): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const result = await this.pushService.testNotification(dto.deviceToken, dto.platform);
    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }
}
