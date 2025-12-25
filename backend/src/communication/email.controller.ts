import {
  Controller,
  Get,
  Post,
  Put,
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
  EmailService,
  EmailStatus,
  EmailPriority,
  EmailAddress,
  EmailAttachment,
  EmailVariable,
  BounceType,
} from './email.service';

@ApiTags('Communication - Email')
@Controller('communication/email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // =================== SEND EMAILS ===================

  @Post('send')
  @ApiOperation({ summary: 'Send email' })
  @ApiResponse({ status: 201, description: 'Email sent' })
  async sendEmail(
    @Request() req: any,
    @Body() body: {
      from?: EmailAddress;
      to: EmailAddress[];
      cc?: EmailAddress[];
      bcc?: EmailAddress[];
      replyTo?: EmailAddress;
      subject: string;
      textBody: string;
      htmlBody?: string;
      attachments?: EmailAttachment[];
      templateId?: string;
      templateData?: Record<string, any>;
      tags?: string[];
      priority?: EmailPriority;
      scheduledAt?: string;
    },
  ) {
    try {
      return await this.emailService.sendEmail({
        tenantId: req.user.tenantId,
        from: body.from,
        to: body.to,
        cc: body.cc,
        bcc: body.bcc,
        replyTo: body.replyTo,
        subject: body.subject,
        textBody: body.textBody,
        htmlBody: body.htmlBody,
        attachments: body.attachments,
        templateId: body.templateId,
        templateData: body.templateData,
        tags: body.tags,
        priority: body.priority,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('send/bulk')
  @ApiOperation({ summary: 'Send bulk emails' })
  @ApiResponse({ status: 201, description: 'Emails queued' })
  async sendBulkEmails(
    @Request() req: any,
    @Body() body: {
      recipients: Array<EmailAddress & { data?: Record<string, any> }>;
      templateId: string;
      from?: EmailAddress;
      tags?: string[];
      campaignId?: string;
    },
  ) {
    return this.emailService.sendBulkEmails({
      tenantId: req.user.tenantId,
      recipients: body.recipients,
      templateId: body.templateId,
      from: body.from,
      tags: body.tags,
      campaignId: body.campaignId,
      createdBy: req.user.id,
    });
  }

  // =================== EMAILS ===================

  @Get('emails')
  @ApiOperation({ summary: 'Get emails' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'recipientEmail', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'templateId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Emails list' })
  async getEmails(
    @Request() req: any,
    @Query('status') status?: EmailStatus,
    @Query('recipientEmail') recipientEmail?: string,
    @Query('campaignId') campaignId?: string,
    @Query('templateId') templateId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const emails = await this.emailService.getEmails(req.user.tenantId, {
      status,
      recipientEmail,
      campaignId,
      templateId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { emails, total: emails.length };
  }

  @Get('emails/:id')
  @ApiOperation({ summary: 'Get email details' })
  @ApiResponse({ status: 200, description: 'Email details' })
  async getEmail(@Param('id') id: string) {
    const email = await this.emailService.getEmail(id);
    if (!email) {
      return { error: 'Email not found' };
    }
    return email;
  }

  // =================== TRACKING ===================

  @Post('track/open/:id')
  @ApiOperation({ summary: 'Track email open' })
  @ApiResponse({ status: 200, description: 'Open tracked' })
  async trackOpen(@Param('id') id: string) {
    await this.emailService.trackOpen(id);
    return { success: true };
  }

  @Post('track/click/:id')
  @ApiOperation({ summary: 'Track email click' })
  @ApiResponse({ status: 200, description: 'Click tracked' })
  async trackClick(
    @Param('id') id: string,
    @Body() body: { link?: string },
  ) {
    await this.emailService.trackClick(id, body.link);
    return { success: true };
  }

  @Post('bounce/:id')
  @ApiOperation({ summary: 'Record email bounce' })
  @ApiResponse({ status: 200, description: 'Bounce recorded' })
  async recordBounce(
    @Param('id') id: string,
    @Body() body: { type: BounceType; reason: string },
  ) {
    await this.emailService.recordBounce(id, body.type, body.reason);
    return { success: true };
  }

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create email template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      category: string;
      fromName: string;
      fromEmail: string;
      replyToEmail?: string;
      subject: string;
      textBody: string;
      htmlBody: string;
      variables: EmailVariable[];
      previewText?: string;
    },
  ) {
    return this.emailService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get email templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const templates = await this.emailService.getTemplates(req.user.tenantId, {
      category,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.emailService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      fromName?: string;
      fromEmail?: string;
      subject?: string;
      textBody?: string;
      htmlBody?: string;
      variables?: EmailVariable[];
      isActive?: boolean;
    },
  ) {
    const template = await this.emailService.updateTemplate(id, body);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Post('templates/:id/preview')
  @ApiOperation({ summary: 'Preview template' })
  @ApiResponse({ status: 200, description: 'Template preview' })
  async previewTemplate(
    @Param('id') id: string,
    @Body() body: { data: Record<string, any> },
  ) {
    try {
      return await this.emailService.previewTemplate(id, body.data);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== UNSUBSCRIBE ===================

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe email' })
  @ApiResponse({ status: 200, description: 'Email unsubscribed' })
  async unsubscribe(
    @Body() body: { email: string; listId?: string; reason?: string },
  ) {
    await this.emailService.unsubscribe(body.email, body.listId, body.reason);
    return { success: true };
  }

  @Get('unsubscribes')
  @ApiOperation({ summary: 'Get unsubscribes' })
  @ApiResponse({ status: 200, description: 'Unsubscribe list' })
  async getUnsubscribes(@Request() req: any) {
    const unsubscribes = await this.emailService.getUnsubscribes(req.user.tenantId);
    return { unsubscribes, total: unsubscribes.length };
  }

  // =================== DOMAINS ===================

  @Post('domains')
  @ApiOperation({ summary: 'Add domain' })
  @ApiResponse({ status: 201, description: 'Domain added' })
  async addDomain(
    @Request() req: any,
    @Body() body: { domain: string; verificationMethod: 'dns' | 'file' },
  ) {
    return this.emailService.addDomain({
      tenantId: req.user.tenantId,
      domain: body.domain,
      verificationMethod: body.verificationMethod,
    });
  }

  @Get('domains')
  @ApiOperation({ summary: 'Get domains' })
  @ApiResponse({ status: 200, description: 'Domains list' })
  async getDomains(@Request() req: any) {
    const domains = await this.emailService.getDomains(req.user.tenantId);
    return { domains, total: domains.length };
  }

  @Post('domains/:id/verify')
  @ApiOperation({ summary: 'Verify domain' })
  @ApiResponse({ status: 200, description: 'Domain verified' })
  async verifyDomain(@Param('id') id: string) {
    const domain = await this.emailService.verifyDomain(id);
    if (!domain) {
      return { error: 'Domain not found' };
    }
    return domain;
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get email stats' })
  @ApiResponse({ status: 200, description: 'Email statistics' })
  async getStats(@Request() req: any) {
    return this.emailService.getStats(req.user.tenantId);
  }
}
