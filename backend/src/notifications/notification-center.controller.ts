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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  NotificationCenterService,
  NotificationStatus,
  NotificationPriority,
  NotificationFilters,
} from './notification-center.service';

@ApiTags('Notification Center')
@Controller('notifications/center')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationCenterController {
  constructor(private readonly centerService: NotificationCenterService) {}

  // =================== CONFIG ENDPOINTS ===================

  @Get('config/statuses')
  @ApiOperation({
    summary: 'Get notification statuses',
    description: 'Get available notification statuses / Statusurile disponibile pentru notificări',
  })
  getStatuses() {
    return {
      success: true,
      data: [
        { value: 'unread', label: 'Unread', labelRo: 'Necitite' },
        { value: 'read', label: 'Read', labelRo: 'Citite' },
        { value: 'archived', label: 'Archived', labelRo: 'Arhivate' },
        { value: 'dismissed', label: 'Dismissed', labelRo: 'Respinse' },
      ],
    };
  }

  @Get('config/priorities')
  @ApiOperation({
    summary: 'Get notification priorities',
    description: 'Get available notification priorities / Prioritățile disponibile pentru notificări',
  })
  getPriorities() {
    return {
      success: true,
      data: [
        { value: 'low', label: 'Low', labelRo: 'Scăzută' },
        { value: 'normal', label: 'Normal', labelRo: 'Normală' },
        { value: 'high', label: 'High', labelRo: 'Înaltă' },
        { value: 'urgent', label: 'Urgent', labelRo: 'Urgentă' },
      ],
    };
  }

  @Get('config/categories')
  @ApiOperation({
    summary: 'Get notification categories',
    description: 'Get available notification categories / Categoriile disponibile pentru notificări',
  })
  getCategories() {
    return {
      success: true,
      data: [
        { value: 'finance', label: 'Finance', labelRo: 'Finanțe' },
        { value: 'hr', label: 'Human Resources', labelRo: 'Resurse Umane' },
        { value: 'hse', label: 'Health & Safety', labelRo: 'Sănătate și Securitate' },
        { value: 'system', label: 'System', labelRo: 'Sistem' },
        { value: 'reminder', label: 'Reminders', labelRo: 'Remindere' },
        { value: 'fleet', label: 'Fleet', labelRo: 'Flotă' },
        { value: 'compliance', label: 'Compliance', labelRo: 'Conformitate' },
      ],
    };
  }

  @Get('config/templates')
  @ApiOperation({
    summary: 'Get notification template types',
    description: 'Get available notification template types / Tipurile de template-uri disponibile',
  })
  getTemplateTypes() {
    return {
      success: true,
      data: [
        { value: 'invoice_created', label: 'Invoice Created', labelRo: 'Factură Creată' },
        { value: 'invoice_due', label: 'Invoice Due', labelRo: 'Factură Scadentă' },
        { value: 'payment_received', label: 'Payment Received', labelRo: 'Plată Primită' },
        { value: 'hr_leave_approved', label: 'Leave Approved', labelRo: 'Concediu Aprobat' },
        { value: 'hr_contract_expiring', label: 'Contract Expiring', labelRo: 'Contract în Expirare' },
        { value: 'hse_incident', label: 'HSE Incident', labelRo: 'Incident HSE' },
        { value: 'system_update', label: 'System Update', labelRo: 'Actualizare Sistem' },
        { value: 'deadline_reminder', label: 'Deadline Reminder', labelRo: 'Reminder Termen Limită' },
      ],
    };
  }

  // =================== PREVIEW & STATS ===================

  @Get('preview')
  @ApiOperation({
    summary: 'Get notification preview',
    description: 'Get notification preview with counts and recent notifications / Preview notificări cu contoare și cele recente',
  })
  @ApiResponse({ status: 200, description: 'Notification preview' })
  async getPreview(@Request() req: any) {
    const preview = await this.centerService.getNotificationPreview(req.user.sub);
    return { success: true, data: preview };
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Get count of unread notifications / Numărul notificărilor necitite',
  })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.centerService.getUnreadCount(req.user.sub);
    return { success: true, data: { count } };
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get notification statistics',
    description: 'Get detailed notification statistics / Statistici detaliate notificări',
  })
  @ApiResponse({ status: 200, description: 'Notification statistics' })
  async getStatistics(@Request() req: any) {
    const stats = await this.centerService.getStatistics(req.user.sub);
    return { success: true, data: stats };
  }

  @Get('by-category')
  @ApiOperation({
    summary: 'Get notifications grouped by category',
    description: 'Get notification counts grouped by category / Notificări grupate pe categorii',
  })
  @ApiResponse({ status: 200, description: 'Notifications by category' })
  async getByCategory(@Request() req: any) {
    const categoryMap = await this.centerService.getNotificationsByCategory(req.user.sub);
    const categories = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      ...stats,
    }));
    return { success: true, data: categories };
  }

  // =================== LIST & FILTER ===================

  @Get('list')
  @ApiOperation({
    summary: 'Get user notifications',
    description: 'Get all notifications for the current user with filtering / Lista notificărilor cu filtrare',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (unread, read, archived, dismissed)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority (low, normal, high, urgent)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title and message' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default 20)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @Request() req: any,
    @Query('status') status?: NotificationStatus,
    @Query('category') category?: string,
    @Query('priority') priority?: NotificationPriority,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters: NotificationFilters = {
      status,
      category,
      priority,
      search,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    };

    const result = await this.centerService.getUserNotifications(req.user.sub, filters);
    return {
      success: true,
      data: result.notifications,
      pagination: {
        total: result.total,
        limit: filters.limit,
        offset: filters.offset,
      },
    };
  }

  // =================== GROUPS ===================

  @Get('groups')
  @ApiOperation({
    summary: 'Get notification groups',
    description: 'Get grouped notifications for the current user / Grupurile de notificări',
  })
  @ApiResponse({ status: 200, description: 'Notification groups' })
  async getGroups(@Request() req: any) {
    const groups = await this.centerService.getGroups(req.user.sub);
    return { success: true, data: groups };
  }

  @Get('groups/:groupId')
  @ApiOperation({
    summary: 'Get notifications in a group',
    description: 'Get all notifications within a specific group / Notificările dintr-un grup specific',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results (default 20)' })
  @ApiResponse({ status: 200, description: 'Group notifications' })
  async getGroupNotifications(
    @Param('groupId') groupId: string,
    @Query('limit') limit?: string,
  ) {
    const notifications = await this.centerService.getGroupNotifications(
      groupId,
      limit ? parseInt(limit) : 20,
    );
    return { success: true, data: notifications };
  }

  // =================== SINGLE NOTIFICATION OPERATIONS ===================

  @Get('item/:notificationId')
  @ApiOperation({
    summary: 'Get single notification',
    description: 'Get a specific notification by ID / Obține o notificare specifică',
  })
  @ApiResponse({ status: 200, description: 'Notification details' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotification(@Param('notificationId') notificationId: string) {
    const notification = await this.centerService.getNotification(notificationId);
    if (!notification) {
      return { success: false, error: 'Notification not found / Notificarea nu a fost găsită' };
    }
    return { success: true, data: notification };
  }

  @Put('item/:notificationId/read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a notification as read / Marchează notificarea ca citită',
  })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('notificationId') notificationId: string) {
    const notification = await this.centerService.markAsRead(notificationId);
    return { success: true, data: notification };
  }

  @Put('item/:notificationId/unread')
  @ApiOperation({
    summary: 'Mark notification as unread',
    description: 'Mark a notification as unread / Marchează notificarea ca necitită',
  })
  @ApiResponse({ status: 200, description: 'Notification marked as unread' })
  async markAsUnread(@Param('notificationId') notificationId: string) {
    const notification = await this.centerService.markAsUnread(notificationId);
    return { success: true, data: notification };
  }

  @Put('item/:notificationId/archive')
  @ApiOperation({
    summary: 'Archive notification',
    description: 'Archive a notification / Arhivează notificarea',
  })
  @ApiResponse({ status: 200, description: 'Notification archived' })
  async archiveNotification(@Param('notificationId') notificationId: string) {
    const notification = await this.centerService.archiveNotification(notificationId);
    return { success: true, data: notification };
  }

  @Put('item/:notificationId/dismiss')
  @ApiOperation({
    summary: 'Dismiss notification',
    description: 'Dismiss a notification / Respinge notificarea',
  })
  @ApiResponse({ status: 200, description: 'Notification dismissed' })
  async dismissNotification(@Param('notificationId') notificationId: string) {
    const notification = await this.centerService.dismissNotification(notificationId);
    return { success: true, data: notification };
  }

  @Delete('item/:notificationId')
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Permanently delete a notification / Șterge permanent notificarea',
  })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async deleteNotification(@Param('notificationId') notificationId: string) {
    const result = await this.centerService.deleteNotification(notificationId);
    return {
      success: result,
      message: result
        ? 'Notification deleted / Notificarea a fost ștearsă'
        : 'Notification not found / Notificarea nu a fost găsită',
    };
  }

  // =================== BULK OPERATIONS ===================

  @Post('bulk/mark-all-read')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all notifications as read, optionally filtered by category / Marchează toate notificările ca citite',
  })
  @ApiQuery({ name: 'category', required: false, description: 'Optional category filter' })
  @ApiResponse({ status: 200, description: 'Bulk operation result' })
  async markAllAsRead(
    @Request() req: any,
    @Query('category') category?: string,
  ) {
    const result = await this.centerService.markAllAsRead(req.user.sub, category);
    return {
      success: result.success,
      message: `${result.affected} notifications marked as read / notificări marcate ca citite`,
      data: result,
    };
  }

  @Post('bulk/archive-old')
  @ApiOperation({
    summary: 'Archive old notifications',
    description: 'Archive notifications older than specified days / Arhivează notificările mai vechi de zilele specificate',
  })
  @ApiQuery({ name: 'olderThanDays', required: false, description: 'Days threshold (default 30)' })
  @ApiResponse({ status: 200, description: 'Bulk operation result' })
  async archiveOld(
    @Request() req: any,
    @Query('olderThanDays') olderThanDays?: string,
  ) {
    const days = olderThanDays ? parseInt(olderThanDays) : 30;
    const result = await this.centerService.archiveAll(req.user.sub, days);
    return {
      success: result.success,
      message: `${result.affected} notifications archived / notificări arhivate`,
      data: result,
    };
  }

  @Delete('bulk/delete-read')
  @ApiOperation({
    summary: 'Delete all read notifications',
    description: 'Permanently delete all read notifications / Șterge permanent toate notificările citite',
  })
  @ApiResponse({ status: 200, description: 'Bulk operation result' })
  async deleteAllRead(@Request() req: any) {
    const result = await this.centerService.deleteAllRead(req.user.sub);
    return {
      success: result.success,
      message: `${result.affected} notifications deleted / notificări șterse`,
      data: result,
    };
  }

  // =================== CREATE NOTIFICATIONS ===================

  @Post('create')
  @ApiOperation({
    summary: 'Create notification',
    description: 'Create a new in-app notification / Creează o nouă notificare',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification message' },
        type: { type: 'string', description: 'Notification type' },
        category: { type: 'string', description: 'Notification category' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
        actionUrl: { type: 'string', description: 'Action URL' },
        actionLabel: { type: 'string', description: 'Action button label' },
      },
      required: ['title', 'message', 'type', 'category'],
    },
  })
  @ApiResponse({ status: 201, description: 'Notification created' })
  async createNotification(
    @Request() req: any,
    @Body() body: {
      title: string;
      message: string;
      type: string;
      category: string;
      priority?: NotificationPriority;
      actionUrl?: string;
      actionLabel?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const notification = await this.centerService.createNotification({
      userId: req.user.sub,
      tenantId: req.user.tenantId || 'default',
      title: body.title,
      message: body.message,
      type: body.type,
      category: body.category,
      priority: body.priority,
      actionUrl: body.actionUrl,
      actionLabel: body.actionLabel,
      metadata: body.metadata,
    });
    return { success: true, data: notification };
  }

  @Post('create-from-template')
  @ApiOperation({
    summary: 'Create notification from template',
    description: 'Create a notification using a predefined template / Creează notificare din template',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateType: { type: 'string', description: 'Template type (e.g., invoice_created, payment_received)' },
        data: { type: 'object', description: 'Template data' },
      },
      required: ['templateType', 'data'],
    },
  })
  @ApiResponse({ status: 201, description: 'Notification created from template' })
  async createFromTemplate(
    @Request() req: any,
    @Body() body: {
      templateType: string;
      data: Record<string, any>;
    },
  ) {
    const notification = await this.centerService.createFromTemplate(
      body.templateType,
      req.user.sub,
      req.user.tenantId || 'default',
      body.data,
    );
    return { success: true, data: notification };
  }
}
