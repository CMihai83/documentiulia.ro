import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { NotificationsService, NotificationType } from './notifications.service';
import { CustomerDeliveryNotificationsService } from './customer-delivery-notifications.service';
import { WhatsAppSmsService, MessageChannel, WhatsAppTemplateType } from './whatsapp-sms.service';
import { UpdateNotificationPreferencesDto, DEFAULT_NOTIFICATION_PREFERENCES } from './dto/notification-preferences.dto';
import { PrismaService } from '../prisma/prisma.service';

class SendNotificationDto {
  type: NotificationType;
  recipientEmail: string;
  recipientName?: string;
  data: Record<string, any>;
}

class TestEmailDto {
  email: string;
}

// DTOs for delivery notifications
class DeliveryFailedDto {
  failureReason: string;
}

class DeliveryRescheduledDto {
  newDeliveryDate: string; // ISO date string
}

class DeliveryCompletedDto {
  parcelCount?: number;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly deliveryNotificationsService: CustomerDeliveryNotificationsService,
    private readonly whatsappSmsService: WhatsAppSmsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a notification email' })
  @ApiBody({ type: SendNotificationDto })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async sendNotification(
    @Request() req: any,
    @Body() dto: SendNotificationDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    if (!dto.type || !dto.recipientEmail) {
      throw new BadRequestException('Notification type and recipient email are required');
    }

    const result = await this.notificationsService.send({
      type: dto.type,
      userId,
      recipientEmail: dto.recipientEmail,
      recipientName: dto.recipientName,
      data: dto.data || {},
    });

    return {
      success: result.success,
      messageId: result.messageId,
      message: result.success
        ? 'Notification sent successfully'
        : 'Failed to send notification',
    };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test email to verify SMTP configuration' })
  @ApiBody({ type: TestEmailDto })
  @Roles(UserRole.ADMIN)
  async sendTestEmail(
    @Request() req: any,
    @Body() dto: TestEmailDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    if (!dto.email) {
      throw new BadRequestException('Email address is required');
    }

    const result = await this.notificationsService.send({
      type: NotificationType.WELCOME,
      userId,
      recipientEmail: dto.email,
      recipientName: 'Test User',
      data: {},
    });

    return {
      success: result.success,
      message: result.success
        ? `Test email sent to ${dto.email}`
        : 'Failed to send test email. Check SMTP configuration.',
    };
  }

  @Post('payment-reminders')
  @ApiOperation({ summary: 'Send payment reminders for upcoming invoices' })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async sendPaymentReminders() {
    const count = await this.notificationsService.sendPaymentReminders();
    return {
      success: true,
      message: `Sent ${count} payment reminder(s)`,
      count,
    };
  }

  @Post('overdue-notifications')
  @ApiOperation({ summary: 'Send notifications for overdue invoices' })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async sendOverdueNotifications() {
    const count = await this.notificationsService.sendOverdueNotifications();
    return {
      success: true,
      message: `Sent ${count} overdue notification(s)`,
      count,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getNotifications(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // Alias to /list endpoint
    return this.getNotificationList(req, limit, offset);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available notification types' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  getNotificationTypes() {
    return {
      types: Object.values(NotificationType),
      descriptions: {
        [NotificationType.INVOICE_CREATED]: 'Sent when a new invoice is created',
        [NotificationType.INVOICE_SENT]: 'Sent when an invoice is delivered to client',
        [NotificationType.INVOICE_PAID]: 'Sent when an invoice is marked as paid',
        [NotificationType.INVOICE_OVERDUE]: 'Sent when an invoice is past due date',
        [NotificationType.PAYMENT_REMINDER]: 'Reminder before invoice due date',
        [NotificationType.EFACTURA_SUBMITTED]: 'Sent when e-Factura is submitted to ANAF',
        [NotificationType.EFACTURA_ACCEPTED]: 'Sent when ANAF accepts the e-Factura',
        [NotificationType.EFACTURA_REJECTED]: 'Sent when ANAF rejects the e-Factura',
        [NotificationType.COMPLIANCE_ALERT]: 'Alert for compliance deadlines',
        [NotificationType.GDPR_DATA_EXPORT]: 'Sent with GDPR data export',
        [NotificationType.GDPR_DATA_DELETED]: 'Confirmation of GDPR data deletion',
        [NotificationType.WELCOME]: 'Welcome email for new users',
        [NotificationType.PASSWORD_RESET]: 'Password reset link',
      },
    };
  }

  @Get('list')
  @ApiOperation({ summary: 'Get notification list for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getNotificationList(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const userId = req.user?.id;
    const limitNum = parseInt(limit || '20', 10);
    const offsetNum = parseInt(offset || '0', 10);

    // Get notifications from audit log
    const whereClause: any = {
      userId,
      action: { in: ['NOTIFICATION_SENT', 'NOTIFICATION_CREATED'] },
    };

    const [notifications, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip: offsetNum,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          details: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where: whereClause }),
    ]);

    return {
      notifications: notifications.map(n => ({
        id: n.id,
        type: (n.details as any)?.type || 'GENERAL',
        title: (n.details as any)?.title || 'Notificare',
        message: (n.details as any)?.message || '',
        read: (n.details as any)?.read || false,
        createdAt: n.createdAt,
      })),
      total,
      limit: limitNum,
      offset: offsetNum,
      unreadCount: total, // Simplified - all shown as unread
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get notification history for current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getNotificationHistory(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // Alias to list endpoint for backwards compatibility
    return this.getNotificationList(req, limit, offset);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getNotificationPreferences(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Parse preferences or use defaults
    let preferences = DEFAULT_NOTIFICATION_PREFERENCES;
    if (user.notificationPreferences) {
      try {
        preferences = typeof user.notificationPreferences === 'string'
          ? JSON.parse(user.notificationPreferences)
          : user.notificationPreferences;
      } catch {
        // Use defaults if parsing fails
      }
    }

    return {
      preferences,
      message: 'Notification preferences retrieved successfully',
    };
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async updateNotificationPreferences(
    @Request() req: any,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    // Get current preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Parse existing preferences or use defaults
    let currentPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
    if (user.notificationPreferences) {
      try {
        currentPreferences = typeof user.notificationPreferences === 'string'
          ? JSON.parse(user.notificationPreferences)
          : user.notificationPreferences;
      } catch {
        // Use defaults if parsing fails
      }
    }

    // Merge with new preferences
    const updatedPreferences = {
      email: {
        ...currentPreferences.email,
        ...dto.email,
      },
    };

    // Update user preferences
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: updatedPreferences,
      },
    });

    // Log the update
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'NOTIFICATION_PREFERENCES_UPDATED',
        entity: 'User',
        entityId: userId,
        details: updatedPreferences,
      },
    });

    return {
      preferences: updatedPreferences,
      message: 'Notification preferences updated successfully',
    };
  }

  // =================== DELIVERY NOTIFICATION ENDPOINTS ===================

  @Post('delivery/route-started/:routeId')
  @ApiOperation({ summary: 'Send OUT_FOR_DELIVERY notifications when route starts' })
  @ApiParam({ name: 'routeId', description: 'The delivery route ID' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async notifyRouteStarted(@Param('routeId') routeId: string) {
    const results = await this.deliveryNotificationsService.notifyRouteStarted(routeId);
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return {
      success: successCount > 0,
      message: `Sent ${successCount} notification(s), ${failedCount} failed`,
      results,
    };
  }

  @Post('delivery/arriving-soon/:stopId')
  @ApiOperation({ summary: 'Send ARRIVING_SOON notification to customer' })
  @ApiParam({ name: 'stopId', description: 'The delivery stop ID' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async notifyArrivingSoon(@Param('stopId') stopId: string) {
    const results = await this.deliveryNotificationsService.notifyArrivingSoon(stopId);
    const success = results.some(r => r.success);

    return {
      success,
      message: success ? 'Arriving soon notification sent' : 'Failed to send notification',
      results,
    };
  }

  @Post('delivery/delivered/:stopId')
  @ApiOperation({ summary: 'Send DELIVERED notification to customer' })
  @ApiParam({ name: 'stopId', description: 'The delivery stop ID' })
  @ApiBody({ type: DeliveryCompletedDto, required: false })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async notifyDelivered(
    @Param('stopId') stopId: string,
    @Body() dto: DeliveryCompletedDto,
  ) {
    const results = await this.deliveryNotificationsService.notifyDelivered(
      stopId,
      dto?.parcelCount || 1,
    );
    const success = results.some(r => r.success);

    return {
      success,
      message: success ? 'Delivery confirmation sent' : 'Failed to send notification',
      results,
    };
  }

  @Post('delivery/failed/:stopId')
  @ApiOperation({ summary: 'Send DELIVERY_FAILED notification to customer' })
  @ApiParam({ name: 'stopId', description: 'The delivery stop ID' })
  @ApiBody({ type: DeliveryFailedDto })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async notifyDeliveryFailed(
    @Param('stopId') stopId: string,
    @Body() dto: DeliveryFailedDto,
  ) {
    if (!dto.failureReason) {
      throw new BadRequestException('Failure reason is required');
    }

    const results = await this.deliveryNotificationsService.notifyDeliveryFailed(
      stopId,
      dto.failureReason,
    );
    const success = results.some(r => r.success);

    return {
      success,
      message: success ? 'Delivery failure notification sent' : 'Failed to send notification',
      results,
    };
  }

  @Post('delivery/rescheduled/:stopId')
  @ApiOperation({ summary: 'Send RESCHEDULED notification to customer' })
  @ApiParam({ name: 'stopId', description: 'The delivery stop ID' })
  @ApiBody({ type: DeliveryRescheduledDto })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async notifyRescheduled(
    @Param('stopId') stopId: string,
    @Body() dto: DeliveryRescheduledDto,
  ) {
    if (!dto.newDeliveryDate) {
      throw new BadRequestException('New delivery date is required');
    }

    const newDate = new Date(dto.newDeliveryDate);
    if (isNaN(newDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const results = await this.deliveryNotificationsService.notifyRescheduled(stopId, newDate);
    const success = results.some(r => r.success);

    return {
      success,
      message: success ? 'Reschedule notification sent' : 'Failed to send notification',
      results,
    };
  }

  @Get('delivery/history/:stopId')
  @ApiOperation({ summary: 'Get notification history for a delivery stop' })
  @ApiParam({ name: 'stopId', description: 'The delivery stop ID' })
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getDeliveryNotificationHistory(@Param('stopId') stopId: string) {
    const history = await this.deliveryNotificationsService.getNotificationHistory(stopId);

    return {
      stopId,
      history,
      count: history.length,
    };
  }

  @Get('delivery/stats')
  @ApiOperation({ summary: 'Get delivery notification statistics' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getDeliveryNotificationStats(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const stats = await this.deliveryNotificationsService.getNotificationStats(
      userId,
      fromDate,
      toDate,
    );

    return {
      period: { from: fromDate, to: toDate },
      stats,
    };
  }

  // =================== WHATSAPP/SMS ENDPOINTS ===================

  @Post('sms/send')
  @ApiOperation({ summary: 'Send an SMS message' })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async sendSms(
    @Request() req: any,
    @Body() body: {
      to: string;
      body?: string;
      templateType?: WhatsAppTemplateType;
      variables?: Record<string, string>;
      language?: 'de' | 'en';
    },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    if (!body.to) {
      throw new BadRequestException('Phone number is required');
    }

    if (!body.body && !body.templateType) {
      throw new BadRequestException('Either body or templateType is required');
    }

    const result = await this.whatsappSmsService.sendSms(userId, {
      to: body.to,
      channel: 'SMS',
      body: body.body,
      templateType: body.templateType,
      variables: body.variables,
      language: body.language,
    });

    return result;
  }

  @Post('whatsapp/send')
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async sendWhatsApp(
    @Request() req: any,
    @Body() body: {
      to: string;
      body?: string;
      templateType?: WhatsAppTemplateType;
      variables?: Record<string, string>;
      language?: 'de' | 'en';
    },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    if (!body.to) {
      throw new BadRequestException('Phone number is required');
    }

    if (!body.body && !body.templateType) {
      throw new BadRequestException('Either body or templateType is required');
    }

    const result = await this.whatsappSmsService.sendWhatsApp(userId, {
      to: body.to,
      channel: 'WHATSAPP',
      body: body.body,
      templateType: body.templateType,
      variables: body.variables,
      language: body.language,
    });

    return result;
  }

  @Post('messaging/delivery-notification')
  @ApiOperation({ summary: 'Send delivery notification via WhatsApp or SMS' })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.USER)
  async sendDeliveryNotificationMessage(
    @Request() req: any,
    @Body() body: {
      recipientName: string;
      recipientPhone: string;
      trackingNumber: string;
      address: string;
      notificationType: WhatsAppTemplateType;
      channel?: MessageChannel;
      language?: 'de' | 'en';
      estimatedTime?: string;
      driverName?: string;
      vehiclePlate?: string;
      failureReason?: string;
      newDeliveryDate?: string;
      trackingUrl?: string;
    },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    const result = await this.whatsappSmsService.sendDeliveryNotification(
      userId,
      {
        recipientName: body.recipientName,
        recipientPhone: body.recipientPhone,
        trackingNumber: body.trackingNumber,
        address: body.address,
        estimatedTime: body.estimatedTime,
        driverName: body.driverName,
        vehiclePlate: body.vehiclePlate,
        failureReason: body.failureReason,
        newDeliveryDate: body.newDeliveryDate,
        trackingUrl: body.trackingUrl,
      },
      body.notificationType,
      body.channel || 'WHATSAPP',
      body.language || 'de',
    );

    return result;
  }

  @Post('messaging/bulk')
  @ApiOperation({ summary: 'Send bulk messages via WhatsApp or SMS' })
  @Roles(UserRole.ADMIN)
  async sendBulkMessages(
    @Request() req: any,
    @Body() body: {
      recipients: Array<{ to: string; variables?: Record<string, string> }>;
      channel: MessageChannel;
      templateType?: WhatsAppTemplateType;
      body?: string;
      language?: 'de' | 'en';
    },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    if (!body.recipients || body.recipients.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    if (body.recipients.length > 100) {
      throw new BadRequestException('Maximum 100 recipients per batch');
    }

    const result = await this.whatsappSmsService.sendBulkMessages(userId, {
      recipients: body.recipients,
      channel: body.channel,
      templateType: body.templateType,
      body: body.body,
      language: body.language,
    });

    return result;
  }

  @Post('messaging/schedule')
  @ApiOperation({ summary: 'Schedule a message for later delivery' })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async scheduleMessage(
    @Request() req: any,
    @Body() body: {
      to: string;
      channel: MessageChannel;
      body?: string;
      templateType?: WhatsAppTemplateType;
      variables?: Record<string, string>;
      language?: 'de' | 'en';
      scheduleAt: string;
    },
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    const scheduleAt = new Date(body.scheduleAt);
    if (isNaN(scheduleAt.getTime())) {
      throw new BadRequestException('Invalid scheduleAt date format');
    }

    const result = await this.whatsappSmsService.scheduleMessage(userId, {
      to: body.to,
      channel: body.channel,
      body: body.body,
      templateType: body.templateType,
      variables: body.variables,
      language: body.language,
      scheduleAt,
    });

    return result;
  }

  @Get('messaging/history')
  @ApiOperation({ summary: 'Get messaging history' })
  @ApiQuery({ name: 'channel', required: false, enum: ['SMS', 'WHATSAPP'] })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getMessageHistory(
    @Request() req: any,
    @Query('channel') channel?: MessageChannel,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.whatsappSmsService.getMessageHistory(userId, {
      channel,
      status: status as any,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('messaging/stats')
  @ApiOperation({ summary: 'Get messaging statistics' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async getMessageStats(
    @Request() req: any,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.whatsappSmsService.getMessageStats(userId, period);
  }

  @Get('messaging/templates')
  @ApiOperation({ summary: 'Get available WhatsApp message templates' })
  @ApiQuery({ name: 'language', required: false, enum: ['de', 'en'] })
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.USER)
  getMessageTemplates(@Query('language') language?: 'de' | 'en') {
    return {
      templates: this.whatsappSmsService.getAvailableTemplates(language || 'de'),
    };
  }

  @Get('messaging/rate-limits')
  @ApiOperation({ summary: 'Get current rate limit status' })
  @Roles(UserRole.ADMIN)
  getRateLimitStatus() {
    return this.whatsappSmsService.getRateLimitStatus();
  }

  @Post('messaging/webhook/status')
  @ApiOperation({ summary: 'Handle delivery status webhook from Twilio' })
  async handleStatusWebhook(
    @Body() body: {
      MessageSid: string;
      MessageStatus: string;
      ErrorCode?: string;
      ErrorMessage?: string;
    },
  ) {
    await this.whatsappSmsService.handleDeliveryStatusWebhook(
      body.MessageSid,
      body.MessageStatus,
      body.ErrorCode,
      body.ErrorMessage,
    );

    return { received: true };
  }
}
