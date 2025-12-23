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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  EmailService,
  EmailType,
  EmailStatus,
  EmailPriority,
  EmailProvider,
  SendEmailOptions,
  EmailAddress,
  TemplateVariable,
} from './email.service';

@ApiTags('mail')
@ApiBearerAuth()
@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // ===== Config Metadata Endpoints (MUST BE FIRST - most specific) =====

  @Get('config/email-types')
  @ApiOperation({
    summary: 'Get email types',
    description: 'Get available email types / Obtine tipurile de email disponibile',
  })
  getEmailTypes() {
    const types: { value: EmailType; label: string; labelRo: string }[] = [
      { value: 'TRANSACTIONAL', label: 'Transactional', labelRo: 'Tranzactional' },
      { value: 'NOTIFICATION', label: 'Notification', labelRo: 'Notificare' },
      { value: 'MARKETING', label: 'Marketing', labelRo: 'Marketing' },
      { value: 'INVOICE', label: 'Invoice', labelRo: 'Factura' },
      { value: 'REMINDER', label: 'Reminder', labelRo: 'Reamintire' },
      { value: 'WELCOME', label: 'Welcome', labelRo: 'Bun Venit' },
      { value: 'PASSWORD_RESET', label: 'Password Reset', labelRo: 'Resetare Parola' },
      { value: 'VERIFICATION', label: 'Verification', labelRo: 'Verificare' },
      { value: 'REPORT', label: 'Report', labelRo: 'Raport' },
      { value: 'ALERT', label: 'Alert', labelRo: 'Alerta' },
      { value: 'ANAF_NOTIFICATION', label: 'ANAF Notification', labelRo: 'Notificare ANAF' },
      { value: 'SAGA_SYNC', label: 'SAGA Sync', labelRo: 'Sincronizare SAGA' },
    ];
    return { success: true, data: types };
  }

  @Get('config/email-statuses')
  @ApiOperation({
    summary: 'Get email statuses',
    description: 'Get available email statuses / Obtine statusurile de email disponibile',
  })
  getEmailStatuses() {
    const statuses: { value: EmailStatus; label: string; labelRo: string }[] = [
      { value: 'PENDING', label: 'Pending', labelRo: 'In Asteptare' },
      { value: 'QUEUED', label: 'Queued', labelRo: 'In Coada' },
      { value: 'SENDING', label: 'Sending', labelRo: 'Se Trimite' },
      { value: 'SENT', label: 'Sent', labelRo: 'Trimis' },
      { value: 'DELIVERED', label: 'Delivered', labelRo: 'Livrat' },
      { value: 'BOUNCED', label: 'Bounced', labelRo: 'Respins' },
      { value: 'FAILED', label: 'Failed', labelRo: 'Esuat' },
      { value: 'SPAM', label: 'Spam', labelRo: 'Spam' },
    ];
    return { success: true, data: statuses };
  }

  @Get('config/providers')
  @ApiOperation({
    summary: 'Get email providers',
    description: 'Get available email providers / Obtine furnizorii de email disponibili',
  })
  getEmailProviders() {
    const providers: { value: EmailProvider; label: string; description: string }[] = [
      { value: 'SMTP', label: 'SMTP', description: 'Standard SMTP server' },
      { value: 'SENDGRID', label: 'SendGrid', description: 'SendGrid email service' },
      { value: 'MAILGUN', label: 'Mailgun', description: 'Mailgun email service' },
      { value: 'SES', label: 'Amazon SES', description: 'Amazon Simple Email Service' },
      { value: 'POSTMARK', label: 'Postmark', description: 'Postmark transactional email' },
    ];
    return { success: true, data: providers };
  }

  @Get('config/priorities')
  @ApiOperation({
    summary: 'Get email priorities',
    description: 'Get available email priorities / Obtine prioritatile de email disponibile',
  })
  getEmailPriorities() {
    const priorities: { value: EmailPriority; label: string; labelRo: string }[] = [
      { value: 'LOW', label: 'Low', labelRo: 'Scazuta' },
      { value: 'NORMAL', label: 'Normal', labelRo: 'Normala' },
      { value: 'HIGH', label: 'High', labelRo: 'Ridicata' },
      { value: 'URGENT', label: 'Urgent', labelRo: 'Urgenta' },
    ];
    return { success: true, data: priorities };
  }

  @Get('config/current')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get email config',
    description: 'Get current email configuration (admin only) / Obtine configuratia de email curenta (doar admin)',
  })
  getConfig() {
    const config = this.emailService.getConfig();
    return { success: true, data: config };
  }

  @Put('config/update')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update email config',
    description: 'Update email configuration (admin only) / Actualizeaza configuratia de email (doar admin)',
  })
  updateConfig(
    @Body() body: Partial<{
      provider: EmailProvider;
      host: string;
      port: number;
      secure: boolean;
      fromEmail: string;
      fromName: string;
      replyToEmail: string;
      maxRetries: number;
      retryDelay: number;
      rateLimit: number;
      rateLimitPeriod: number;
    }>,
  ) {
    this.emailService.updateConfig(body);
    return { success: true, message: 'Config updated / Configuratie actualizata' };
  }

  // ===== Statistics Endpoints =====

  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get email statistics',
    description: 'Get email delivery statistics / Obtine statisticile de livrare email',
  })
  @ApiQuery({ name: 'since', required: false, description: 'Start date (ISO format)' })
  async getStats(@Query('since') since?: string) {
    const stats = await this.emailService.getStats(since ? new Date(since) : undefined);
    return { success: true, data: stats };
  }

  // ===== Template Endpoints =====

  @Get('templates')
  @ApiOperation({
    summary: 'Get all templates',
    description: 'Get all email templates / Obtine toate sabloanele de email',
  })
  async getAllTemplates() {
    const templates = await this.emailService.getAllTemplates();
    return { success: true, data: templates, count: templates.length };
  }

  @Post('templates')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Create email template',
    description: 'Create new email template (admin/accountant only) / Creeaza sablon de email nou (doar admin/contabil)',
  })
  async createTemplate(
    @Body() body: {
      name: string;
      nameRo: string;
      description: string;
      descriptionRo: string;
      type: EmailType;
      subject: string;
      subjectRo: string;
      textBody: string;
      textBodyRo: string;
      htmlBody: string;
      htmlBodyRo: string;
      variables?: TemplateVariable[];
      isActive?: boolean;
    },
  ) {
    const template = await this.emailService.createTemplate({
      name: body.name,
      nameRo: body.nameRo,
      description: body.description,
      descriptionRo: body.descriptionRo,
      type: body.type,
      subject: body.subject,
      subjectRo: body.subjectRo,
      textBody: body.textBody,
      textBodyRo: body.textBodyRo,
      htmlBody: body.htmlBody,
      htmlBodyRo: body.htmlBodyRo,
      variables: body.variables || [],
      isActive: body.isActive ?? true,
      version: 1,
    });
    return { success: true, data: template, message: 'Template created / Sablon creat' };
  }

  @Get('templates/by-type/:type')
  @ApiOperation({
    summary: 'Get templates by type',
    description: 'Get email templates by type / Obtine sabloanele de email dupa tip',
  })
  @ApiParam({ name: 'type', description: 'Email type' })
  async getTemplatesByType(@Param('type') type: EmailType) {
    const templates = await this.emailService.getTemplatesByType(type);
    return { success: true, data: templates, count: templates.length };
  }

  @Get('template/:templateId')
  @ApiOperation({
    summary: 'Get template by ID',
    description: 'Get email template by ID / Obtine sablonul de email dupa ID',
  })
  @ApiParam({ name: 'templateId', description: 'Template ID' })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = await this.emailService.getTemplate(templateId);
    if (!template) {
      return { success: false, message: 'Template not found / Sablon negasit' };
    }
    return { success: true, data: template };
  }

  @Put('template/:templateId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Update email template',
    description: 'Update email template (admin/accountant only) / Actualizeaza sablonul de email (doar admin/contabil)',
  })
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() body: Partial<{
      name: string;
      nameRo: string;
      description: string;
      descriptionRo: string;
      type: EmailType;
      subject: string;
      subjectRo: string;
      textBody: string;
      textBodyRo: string;
      htmlBody: string;
      htmlBodyRo: string;
      variables: TemplateVariable[];
      isActive: boolean;
    }>,
  ) {
    try {
      const template = await this.emailService.updateTemplate(templateId, body);
      return { success: true, data: template, message: 'Template updated / Sablon actualizat' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Update failed' };
    }
  }

  @Delete('template/:templateId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete email template',
    description: 'Delete email template (admin only) / Sterge sablonul de email (doar admin)',
  })
  async deleteTemplate(@Param('templateId') templateId: string) {
    try {
      await this.emailService.deleteTemplate(templateId);
      return { success: true, message: 'Template deleted / Sablon sters' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Delete failed' };
    }
  }

  @Post('template/:templateId/activate')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Activate template',
    description: 'Activate email template / Activeaza sablonul de email',
  })
  async activateTemplate(@Param('templateId') templateId: string) {
    try {
      const template = await this.emailService.activateTemplate(templateId);
      return { success: true, data: template, message: 'Template activated / Sablon activat' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Activation failed' };
    }
  }

  @Post('template/:templateId/deactivate')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Deactivate template',
    description: 'Deactivate email template / Dezactiveaza sablonul de email',
  })
  async deactivateTemplate(@Param('templateId') templateId: string) {
    try {
      const template = await this.emailService.deactivateTemplate(templateId);
      return { success: true, data: template, message: 'Template deactivated / Sablon dezactivat' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Deactivation failed' };
    }
  }

  // ===== Email Sending Endpoints =====

  @Post('send')
  @ApiOperation({
    summary: 'Send email',
    description: 'Send a transactional or notification email / Trimite un email tranzactional sau de notificare',
  })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email parameters' })
  async sendEmail(
    @Request() req: any,
    @Body() body: {
      to: string | string[] | EmailAddress | EmailAddress[];
      subject: string;
      subjectRo?: string;
      textBody?: string;
      htmlBody?: string;
      type?: EmailType;
      priority?: EmailPriority;
      templateId?: string;
      templateData?: Record<string, any>;
      attachments?: { filename: string; content: string; contentType: string }[];
      tags?: string[];
      scheduledAt?: string;
      language?: 'ro' | 'en';
    },
  ) {
    const options: SendEmailOptions = {
      type: body.type,
      priority: body.priority,
      templateId: body.templateId,
      templateData: body.templateData,
      attachments: body.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
      tags: body.tags,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      organizationId: req.user.organizationId || req.user.sub,
      userId: req.user.sub,
      language: body.language,
    };

    return this.emailService.sendEmail(
      body.to,
      body.subject,
      { text: body.textBody, html: body.htmlBody },
      options,
    );
  }

  @Post('send-template')
  @ApiOperation({
    summary: 'Send template email',
    description: 'Send email using a predefined template / Trimite email folosind un sablon predefinit',
  })
  @ApiResponse({ status: 201, description: 'Template email sent successfully' })
  async sendTemplateEmail(
    @Request() req: any,
    @Body() body: {
      to: string | string[] | EmailAddress | EmailAddress[];
      templateId: string;
      data: Record<string, any>;
      priority?: EmailPriority;
      tags?: string[];
      scheduledAt?: string;
      language?: 'ro' | 'en';
    },
  ) {
    return this.emailService.sendTemplateEmail(body.to, body.templateId, body.data, {
      priority: body.priority,
      tags: body.tags,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      organizationId: req.user.organizationId || req.user.sub,
      userId: req.user.sub,
      language: body.language,
    });
  }

  @Post('send-bulk')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({
    summary: 'Send bulk emails',
    description: 'Send email to multiple recipients (admin/accountant only) / Trimite email catre mai multi destinatari (doar admin/contabil)',
  })
  @ApiResponse({ status: 201, description: 'Bulk email sent' })
  async sendBulkEmail(
    @Request() req: any,
    @Body() body: {
      recipients: (string | EmailAddress)[];
      subject: string;
      textBody?: string;
      htmlBody?: string;
      type?: EmailType;
      priority?: EmailPriority;
      tags?: string[];
    },
  ) {
    return this.emailService.sendBulkEmail(
      body.recipients,
      body.subject,
      { text: body.textBody, html: body.htmlBody },
      {
        type: body.type,
        priority: body.priority,
        tags: body.tags,
        organizationId: req.user.organizationId || req.user.sub,
        userId: req.user.sub,
      },
    );
  }

  // ===== Email Query Endpoints (with path segments) =====

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get emails by user',
    description: 'Get all emails for a user / Obtine toate emailurile unui utilizator',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 50)' })
  async getEmailsByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const emails = await this.emailService.getEmailsByUser(userId, limit ? parseInt(limit) : 50);
    return { success: true, data: emails, count: emails.length };
  }

  @Get('organization/:organizationId')
  @ApiOperation({
    summary: 'Get emails by organization',
    description: 'Get all emails for an organization / Obtine toate emailurile unei organizatii',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 50)' })
  async getEmailsByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
  ) {
    const emails = await this.emailService.getEmailsByOrganization(organizationId, limit ? parseInt(limit) : 50);
    return { success: true, data: emails, count: emails.length };
  }

  @Get('status/:status')
  @ApiOperation({
    summary: 'Get emails by status',
    description: 'Get all emails with a specific status / Obtine toate emailurile cu un anumit status',
  })
  @ApiParam({ name: 'status', enum: ['PENDING', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'SPAM'] })
  async getEmailsByStatus(@Param('status') status: EmailStatus) {
    const emails = await this.emailService.getEmailsByStatus(status);
    return { success: true, data: emails, count: emails.length };
  }

  // ===== Single Email Operations (MUST BE LAST - catch-all pattern) =====

  @Get('message/:emailId')
  @ApiOperation({
    summary: 'Get email by ID',
    description: 'Get email details by ID / Obtine detaliile emailului dupa ID',
  })
  @ApiParam({ name: 'emailId', description: 'Email ID / ID email' })
  @ApiResponse({ status: 200, description: 'Email details' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  async getEmail(@Param('emailId') emailId: string) {
    const email = await this.emailService.getEmail(emailId);
    if (!email) {
      return { success: false, message: 'Email not found / Email negasit' };
    }
    return { success: true, data: email };
  }

  @Post('message/:emailId/retry')
  @ApiOperation({
    summary: 'Retry failed email',
    description: 'Retry sending a failed or bounced email / Retrimite un email esuat sau respins',
  })
  @ApiParam({ name: 'emailId', description: 'Email ID' })
  @ApiResponse({ status: 200, description: 'Email queued for retry' })
  async retryEmail(@Param('emailId') emailId: string) {
    try {
      const email = await this.emailService.retryEmail(emailId);
      return { success: true, data: email, message: 'Email queued for retry / Email programat pentru retrimitere' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Retry failed' };
    }
  }

  @Post('message/:emailId/cancel')
  @ApiOperation({
    summary: 'Cancel email',
    description: 'Cancel a pending or queued email / Anuleaza un email in asteptare',
  })
  @ApiParam({ name: 'emailId', description: 'Email ID' })
  @ApiResponse({ status: 200, description: 'Email cancelled' })
  async cancelEmail(@Param('emailId') emailId: string) {
    try {
      const email = await this.emailService.cancelEmail(emailId);
      return { success: true, data: email, message: 'Email cancelled / Email anulat' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Cancel failed' };
    }
  }

  // ===== Email Tracking Endpoints =====

  @Post('message/:emailId/opened')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark email as opened',
    description: 'Track email open event / Inregistreaza deschiderea emailului',
  })
  async markAsOpened(@Param('emailId') emailId: string) {
    try {
      const email = await this.emailService.markAsOpened(emailId);
      return { success: true, openedAt: email.openedAt };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Tracking failed' };
    }
  }

  @Post('message/:emailId/clicked')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark email as clicked',
    description: 'Track email link click event / Inregistreaza click-ul pe link din email',
  })
  async markAsClicked(
    @Param('emailId') emailId: string,
    @Body() body: { link?: string },
  ) {
    try {
      const email = await this.emailService.markAsClicked(emailId, body.link);
      return { success: true, clickedAt: email.clickedAt };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Tracking failed' };
    }
  }
}
