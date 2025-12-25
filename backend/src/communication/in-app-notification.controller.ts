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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  InAppNotificationService,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
  NotificationAction,
  BroadcastNotification,
  NotificationTemplate,
} from './in-app-notification.service';

@ApiTags('Communication - In-App Notifications')
@Controller('communication/notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InAppNotificationController {
  constructor(private readonly notificationService: InAppNotificationService) {}

  // =================== NOTIFICATIONS ===================

  @Post()
  @ApiOperation({ summary: 'Create notification' })
  @ApiResponse({ status: 201, description: 'Notification created' })
  async createNotification(
    @Request() req: any,
    @Body() body: {
      userId: string;
      type: NotificationType;
      category: NotificationCategory;
      priority?: NotificationPriority;
      title: string;
      message: string;
      icon?: string;
      imageUrl?: string;
      action?: NotificationAction;
      metadata?: Record<string, any>;
      expiresAt?: string;
      groupId?: string;
      sourceType?: string;
      sourceId?: string;
    },
  ) {
    try {
      return await this.notificationService.createNotification({
        tenantId: req.user.tenantId,
        userId: body.userId,
        type: body.type,
        category: body.category,
        priority: body.priority,
        title: body.title,
        message: body.message,
        icon: body.icon,
        imageUrl: body.imageUrl,
        action: body.action,
        metadata: body.metadata,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        groupId: body.groupId,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Create notification from template' })
  @ApiResponse({ status: 201, description: 'Notification created' })
  async createFromTemplate(
    @Request() req: any,
    @Body() body: {
      userId: string;
      templateId: string;
      templateData: Record<string, any>;
      priority?: NotificationPriority;
      groupId?: string;
      sourceType?: string;
      sourceId?: string;
    },
  ) {
    try {
      return await this.notificationService.createFromTemplate({
        tenantId: req.user.tenantId,
        userId: body.userId,
        templateId: body.templateId,
        templateData: body.templateData,
        priority: body.priority,
        groupId: body.groupId,
        sourceType: body.sourceType,
        sourceId: body.sourceId,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Notifications list' })
  async getNotifications(
    @Request() req: any,
    @Query('status') status?: NotificationStatus,
    @Query('category') category?: NotificationCategory,
    @Query('type') type?: NotificationType,
    @Query('priority') priority?: NotificationPriority,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.notificationService.getNotifications(req.user.id, req.user.tenantId, {
      status,
      category,
      type,
      priority,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification details' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  async getNotification(@Param('id') id: string) {
    const notification = await this.notificationService.getNotification(id);
    if (!notification) {
      return { error: 'Notification not found' };
    }
    return notification;
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark as read' })
  @ApiResponse({ status: 200, description: 'Marked as read' })
  async markAsRead(@Param('id') id: string) {
    const notification = await this.notificationService.markAsRead(id);
    if (!notification) {
      return { error: 'Notification not found' };
    }
    return notification;
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  @ApiResponse({ status: 200, description: 'All marked as read' })
  async markAllAsRead(
    @Request() req: any,
    @Body() body: { category?: NotificationCategory },
  ) {
    const count = await this.notificationService.markAllAsRead(
      req.user.id,
      req.user.tenantId,
      body.category,
    );
    return { success: true, count };
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive notification' })
  @ApiResponse({ status: 200, description: 'Notification archived' })
  async archiveNotification(@Param('id') id: string) {
    const notification = await this.notificationService.archiveNotification(id);
    if (!notification) {
      return { error: 'Notification not found' };
    }
    return notification;
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss notification' })
  @ApiResponse({ status: 200, description: 'Notification dismissed' })
  async dismissNotification(@Param('id') id: string) {
    const success = await this.notificationService.dismissNotification(id);
    return { success };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async deleteNotification(@Param('id') id: string) {
    const success = await this.notificationService.deleteNotification(id);
    return { success };
  }

  @Delete('old')
  @ApiOperation({ summary: 'Delete old notifications' })
  @ApiResponse({ status: 200, description: 'Old notifications deleted' })
  async deleteOldNotifications(
    @Request() req: any,
    @Body() body: { olderThanDays: number },
  ) {
    const count = await this.notificationService.deleteOldNotifications(
      req.user.id,
      req.user.tenantId,
      body.olderThanDays,
    );
    return { success: true, count };
  }

  // =================== GROUPS ===================

  @Get('groups/list')
  @ApiOperation({ summary: 'Get notification groups' })
  @ApiResponse({ status: 200, description: 'Groups list' })
  async getGroups(@Request() req: any) {
    const groups = await this.notificationService.getGroups(req.user.id, req.user.tenantId);
    return { groups, total: groups.length };
  }

  // =================== BROADCASTS ===================

  @Post('broadcasts')
  @ApiOperation({ summary: 'Create broadcast' })
  @ApiResponse({ status: 201, description: 'Broadcast created' })
  async createBroadcast(
    @Request() req: any,
    @Body() body: {
      title: string;
      message: string;
      type: NotificationType;
      category: NotificationCategory;
      priority?: NotificationPriority;
      audience: BroadcastNotification['audience'];
      action?: NotificationAction;
      scheduledAt?: string;
      expiresAt?: string;
    },
  ) {
    return this.notificationService.createBroadcast({
      tenantId: req.user.tenantId,
      title: body.title,
      message: body.message,
      type: body.type,
      category: body.category,
      priority: body.priority,
      audience: body.audience,
      action: body.action,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      createdBy: req.user.id,
    });
  }

  @Get('broadcasts')
  @ApiOperation({ summary: 'Get broadcasts' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Broadcasts list' })
  async getBroadcasts(
    @Request() req: any,
    @Query('status') status?: BroadcastNotification['status'],
    @Query('limit') limit?: string,
  ) {
    const broadcasts = await this.notificationService.getBroadcasts(req.user.tenantId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { broadcasts, total: broadcasts.length };
  }

  @Post('broadcasts/:id/send')
  @ApiOperation({ summary: 'Send broadcast' })
  @ApiResponse({ status: 200, description: 'Broadcast sent' })
  async sendBroadcast(@Param('id') id: string) {
    try {
      return await this.notificationService.sendBroadcast(id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== PREFERENCES ===================

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'User preferences' })
  async getPreferences(@Request() req: any) {
    return this.notificationService.getUserPreferences(req.user.id, req.user.tenantId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @Request() req: any,
    @Body() body: {
      enableInApp?: boolean;
      enableSound?: boolean;
      enableDesktopNotifications?: boolean;
      categories?: Record<NotificationCategory, { enabled: boolean; priority: NotificationPriority }>;
      quietHours?: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        timezone: string;
      };
      digestEnabled?: boolean;
      digestFrequency?: 'instant' | 'hourly' | 'daily' | 'weekly';
    },
  ) {
    return this.notificationService.updateUserPreferences(req.user.id, req.user.tenantId, body);
  }

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: NotificationType;
      category: NotificationCategory;
      titleTemplate: string;
      messageTemplate: string;
      icon?: string;
      defaultAction?: NotificationAction;
      variables: NotificationTemplate['variables'];
    },
  ) {
    return this.notificationService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get notification templates' })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(@Request() req: any) {
    const templates = await this.notificationService.getTemplates(req.user.tenantId);
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.notificationService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get notification stats' })
  @ApiResponse({ status: 200, description: 'Notification statistics' })
  async getStats(@Request() req: any) {
    return this.notificationService.getStats(req.user.id, req.user.tenantId);
  }
}
