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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  EmailNotificationService,
  EmailType,
  EmailStatus,
  EmailPriority,
  EmailAddress,
  EmailAttachment,
} from './email-notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Email Notifications')
@Controller('email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailNotificationController {
  constructor(private readonly emailService: EmailNotificationService) {}

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create email template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        subject: { type: 'string' },
        htmlBody: { type: 'string' },
        variables: { type: 'array', items: { type: 'string' } },
        category: { type: 'string' },
        createdBy: { type: 'string' },
        textBody: { type: 'string' },
      },
      required: ['name', 'subject', 'htmlBody', 'variables', 'category', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Body('name') name: string,
    @Body('subject') subject: string,
    @Body('htmlBody') htmlBody: string,
    @Body('variables') variables: string[],
    @Body('category') category: string,
    @Body('createdBy') createdBy: string,
    @Body('textBody') textBody?: string,
  ) {
    return this.emailService.createTemplate(name, subject, htmlBody, variables, category, createdBy, textBody);
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = await this.emailService.getTemplate(templateId);
    if (!template) return { error: 'Template not found' };
    return template;
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'includeSystem', required: false })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getTemplates(
    @Query('category') category?: string,
    @Query('includeSystem') includeSystem?: string,
  ) {
    return {
      templates: await this.emailService.getTemplates(category, includeSystem !== 'false'),
    };
  }

  @Put('templates/:templateId')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() updates: Record<string, any>,
  ) {
    const template = await this.emailService.updateTemplate(templateId, updates);
    if (!template) return { error: 'Template not found or is a system template' };
    return template;
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('templateId') templateId: string) {
    const success = await this.emailService.deleteTemplate(templateId);
    return { success };
  }

  // =================== SENDING ===================

  @Post('send')
  @ApiOperation({ summary: 'Send email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        to: { type: 'array' },
        subject: { type: 'string' },
        htmlBody: { type: 'string' },
        createdBy: { type: 'string' },
        from: { type: 'object' },
        textBody: { type: 'string' },
        type: { type: 'string' },
        priority: { type: 'string' },
      },
      required: ['tenantId', 'to', 'subject', 'htmlBody', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Email sent' })
  async sendEmail(
    @Body('tenantId') tenantId: string,
    @Body('to') to: EmailAddress | EmailAddress[],
    @Body('subject') subject: string,
    @Body('htmlBody') htmlBody: string,
    @Body('createdBy') createdBy: string,
    @Body('from') from?: EmailAddress,
    @Body('cc') cc?: EmailAddress[],
    @Body('bcc') bcc?: EmailAddress[],
    @Body('replyTo') replyTo?: EmailAddress,
    @Body('textBody') textBody?: string,
    @Body('attachments') attachments?: EmailAttachment[],
    @Body('type') type?: EmailType,
    @Body('priority') priority?: EmailPriority,
    @Body('scheduledAt') scheduledAt?: string,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    try {
      const email = await this.emailService.sendEmail(tenantId, to, subject, htmlBody, createdBy, {
        from,
        cc,
        bcc,
        replyTo,
        textBody,
        attachments,
        type,
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        metadata,
      });
      return email;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('send-templated')
  @ApiOperation({ summary: 'Send templated email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        templateId: { type: 'string' },
        to: { type: 'array' },
        variables: { type: 'object' },
        createdBy: { type: 'string' },
      },
      required: ['tenantId', 'templateId', 'to', 'variables', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Email sent' })
  async sendTemplatedEmail(
    @Body('tenantId') tenantId: string,
    @Body('templateId') templateId: string,
    @Body('to') to: EmailAddress | EmailAddress[],
    @Body('variables') variables: Record<string, any>,
    @Body('createdBy') createdBy: string,
    @Body('from') from?: EmailAddress,
    @Body('cc') cc?: EmailAddress[],
    @Body('bcc') bcc?: EmailAddress[],
    @Body('replyTo') replyTo?: EmailAddress,
    @Body('attachments') attachments?: EmailAttachment[],
    @Body('type') type?: EmailType,
    @Body('priority') priority?: EmailPriority,
    @Body('scheduledAt') scheduledAt?: string,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    try {
      const email = await this.emailService.sendTemplatedEmail(
        tenantId,
        templateId,
        to,
        variables,
        createdBy,
        { from, cc, bcc, replyTo, attachments, type, priority, scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined, metadata },
      );
      return email;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('send-batch')
  @ApiOperation({ summary: 'Send batch emails' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        templateId: { type: 'string' },
        recipients: { type: 'array' },
        createdBy: { type: 'string' },
      },
      required: ['tenantId', 'templateId', 'recipients', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Batch sent' })
  async sendBatch(
    @Body('tenantId') tenantId: string,
    @Body('templateId') templateId: string,
    @Body('recipients') recipients: { email: string; name?: string; variables: Record<string, any> }[],
    @Body('createdBy') createdBy: string,
    @Body('from') from?: EmailAddress,
    @Body('type') type?: EmailType,
    @Body('priority') priority?: EmailPriority,
  ) {
    return this.emailService.sendBatch(tenantId, templateId, recipients, createdBy, { from, type, priority });
  }

  // =================== EMAIL RETRIEVAL ===================

  @Get('emails/:emailId')
  @ApiOperation({ summary: 'Get email by ID' })
  @ApiResponse({ status: 200, description: 'Email details' })
  async getEmail(@Param('emailId') emailId: string) {
    const email = await this.emailService.getEmail(emailId);
    if (!email) return { error: 'Email not found' };
    return email;
  }

  @Get('emails/tenant/:tenantId')
  @ApiOperation({ summary: 'Get emails for tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of emails' })
  async getEmails(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: EmailStatus,
    @Query('type') type?: EmailType,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      emails: await this.emailService.getEmails(tenantId, {
        status,
        type,
        to,
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  // =================== TRACKING ===================

  @Post('track/open/:emailId')
  @ApiOperation({ summary: 'Track email open' })
  @ApiResponse({ status: 200, description: 'Open tracked' })
  async trackOpen(@Param('emailId') emailId: string) {
    const tracked = await this.emailService.trackOpen(emailId);
    return { tracked };
  }

  @Post('track/click/:emailId')
  @ApiOperation({ summary: 'Track email click' })
  @ApiResponse({ status: 200, description: 'Click tracked' })
  async trackClick(@Param('emailId') emailId: string) {
    const tracked = await this.emailService.trackClick(emailId);
    return { tracked };
  }

  // =================== BOUNCES ===================

  @Get('bounces/:email')
  @ApiOperation({ summary: 'Get bounces for email' })
  @ApiResponse({ status: 200, description: 'List of bounces' })
  async getBounces(@Param('email') email: string) {
    return { bounces: await this.emailService.getBounces(email) };
  }

  @Get('suppression-list')
  @ApiOperation({ summary: 'Get suppression list' })
  @ApiResponse({ status: 200, description: 'Suppression list' })
  async getSuppressionList() {
    return { emails: await this.emailService.getSuppressionList() };
  }

  @Post('suppression-list')
  @ApiOperation({ summary: 'Add to suppression list' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { email: { type: 'string' } },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Added to suppression list' })
  async addToSuppressionList(@Body('email') email: string) {
    await this.emailService.addToSuppressionList(email);
    return { success: true };
  }

  @Delete('suppression-list/:email')
  @ApiOperation({ summary: 'Remove from suppression list' })
  @ApiResponse({ status: 200, description: 'Removed from suppression list' })
  async removeFromSuppressionList(@Param('email') email: string) {
    const removed = await this.emailService.removeFromSuppressionList(email);
    return { removed };
  }

  @Get('suppression-list/check/:email')
  @ApiOperation({ summary: 'Check if on suppression list' })
  @ApiResponse({ status: 200, description: 'Check result' })
  async isOnSuppressionList(@Param('email') email: string) {
    const isOnList = await this.emailService.isOnSuppressionList(email);
    return { isOnList };
  }

  // =================== PREFERENCES ===================

  @Put('preferences/:tenantId/:userId')
  @ApiOperation({ summary: 'Set email preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async setPreferences(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() preferences: Record<string, any>,
  ) {
    return this.emailService.setPreferences(userId, tenantId, preferences);
  }

  @Get('preferences/:tenantId/:userId')
  @ApiOperation({ summary: 'Get email preferences' })
  @ApiResponse({ status: 200, description: 'User preferences' })
  async getPreferences(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    const prefs = await this.emailService.getPreferences(userId, tenantId);
    return prefs || { error: 'Preferences not found' };
  }

  @Post('unsubscribe/:tenantId/:userId')
  @ApiOperation({ summary: 'Unsubscribe user' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Unsubscribed' })
  async unsubscribe(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Query('category') category?: 'marketing' | 'notifications' | 'reports',
  ) {
    return this.emailService.unsubscribe(userId, tenantId, category);
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Email stats' })
  async getStats(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;

    return { stats: await this.emailService.getStats(tenantId, dateRange) };
  }

  // =================== METADATA ===================

  @Get('metadata/types')
  @ApiOperation({ summary: 'Get email types' })
  async getEmailTypes() {
    return { types: this.emailService.getEmailTypes() };
  }

  @Get('metadata/priorities')
  @ApiOperation({ summary: 'Get email priorities' })
  async getEmailPriorities() {
    return { priorities: this.emailService.getEmailPriorities() };
  }

  @Get('metadata/statuses')
  @ApiOperation({ summary: 'Get email statuses' })
  async getEmailStatuses() {
    return { statuses: this.emailService.getEmailStatuses() };
  }
}
