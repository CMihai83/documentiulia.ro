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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { EmailTemplateService, EmailCategory, EmailPriority } from './email-template.service';

@ApiTags('Email Templates')
@Controller('email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmailTemplateController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  // =================== TEMPLATE CRUD ===================

  @Get()
  @ApiOperation({ summary: 'Get all email templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of email templates' })
  async getTemplates(
    @Request() req: any,
    @Query('category') category?: EmailCategory,
    @Query('isActive') isActive?: string,
  ) {
    return this.emailTemplateService.listTemplates({
      organizationId: req.user.organizationId || req.user.sub,
      category,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('built-in')
  @ApiOperation({ summary: 'Get built-in email templates' })
  @ApiResponse({ status: 200, description: 'List of built-in templates' })
  async getBuiltInTemplates() {
    // Get templates that are built-in (isBuiltIn = true)
    const templates = await this.emailTemplateService.listTemplates({});
    return templates.filter(t => t.isBuiltIn);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get email template by ID' })
  @ApiResponse({ status: 200, description: 'Email template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.emailTemplateService.getTemplate(id);
    return template || { error: 'Template not found' };
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get email template by code' })
  @ApiResponse({ status: 200, description: 'Email template details' })
  async getTemplateByCode(
    @Request() req: any,
    @Param('code') code: string,
  ) {
    const template = await this.emailTemplateService.getTemplateByCode(
      code,
      req.user.organizationId || req.user.sub,
    );
    return template || { error: 'Template not found' };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new email template' })
  @ApiResponse({ status: 201, description: 'Email template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      code: string;
      name: string;
      nameRo: string;
      description: string;
      descriptionRo: string;
      category: EmailCategory;
      subject: string;
      subjectRo: string;
      bodyHtml: string;
      bodyHtmlRo: string;
      bodyText?: string;
      bodyTextRo?: string;
      variables?: Array<{
        name: string;
        description: string;
        descriptionRo: string;
        type: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'URL' | 'IMAGE';
        required: boolean;
        defaultValue?: any;
      }>;
    },
  ) {
    return this.emailTemplateService.createTemplate({
      ...body,
      bodyText: body.bodyText || '',
      bodyTextRo: body.bodyTextRo || '',
      organizationId: req.user.organizationId || req.user.sub,
      createdBy: req.user.sub,
    });
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update email template' })
  @ApiResponse({ status: 200, description: 'Email template updated' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updates: {
      name?: string;
      nameRo?: string;
      description?: string;
      descriptionRo?: string;
      subject?: string;
      subjectRo?: string;
      bodyHtml?: string;
      bodyHtmlRo?: string;
      bodyText?: string;
      bodyTextRo?: string;
      variables?: Array<any>;
      isActive?: boolean;
    },
  ) {
    return this.emailTemplateService.updateTemplate(id, updates);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete email template' })
  @ApiResponse({ status: 200, description: 'Email template deleted' })
  async deleteTemplate(@Param('id') id: string) {
    await this.emailTemplateService.deleteTemplate(id);
    return { success: true };
  }

  // =================== TEMPLATE OPERATIONS ===================

  @Post(':id/clone')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clone email template' })
  @ApiResponse({ status: 201, description: 'Email template cloned' })
  async cloneTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { newCode: string },
  ) {
    return this.emailTemplateService.cloneTemplate(
      id,
      body.newCode,
      req.user.organizationId || req.user.sub,
      req.user.sub,
    );
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate email template' })
  @ApiResponse({ status: 200, description: 'Email template activated' })
  async activateTemplate(@Param('id') id: string) {
    return this.emailTemplateService.activateTemplate(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate email template' })
  @ApiResponse({ status: 200, description: 'Email template deactivated' })
  async deactivateTemplate(@Param('id') id: string) {
    return this.emailTemplateService.deactivateTemplate(id);
  }

  @Post(':code/preview')
  @ApiOperation({ summary: 'Preview email template with sample data' })
  @ApiResponse({ status: 200, description: 'Template preview' })
  async previewTemplate(
    @Request() req: any,
    @Param('code') code: string,
    @Body() body: {
      variables?: Record<string, any>;
      locale?: 'ro' | 'en';
    },
  ) {
    return this.emailTemplateService.previewEmail({
      templateCode: code,
      to: [],
      variables: body.variables,
      locale: body.locale,
      organizationId: req.user.organizationId || req.user.sub,
    });
  }

  @Post(':code/send')
  @ApiOperation({ summary: 'Send email using template' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  async sendEmail(
    @Request() req: any,
    @Param('code') code: string,
    @Body() body: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      variables?: Record<string, any>;
      locale?: 'ro' | 'en';
      priority?: EmailPriority;
    },
  ) {
    return this.emailTemplateService.sendEmail({
      templateCode: code,
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      variables: body.variables,
      locale: body.locale,
      priority: body.priority,
      organizationId: req.user.organizationId || req.user.sub,
    });
  }

  // =================== MESSAGES ===================

  @Get('messages')
  @ApiOperation({ summary: 'Get sent email messages' })
  @ApiQuery({ name: 'templateCode', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of email messages' })
  async getMessages(
    @Request() req: any,
    @Query('templateCode') templateCode?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.emailTemplateService.listMessages(
      req.user.organizationId || req.user.sub,
      {
        templateCode,
        status: status as any,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      },
    );
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get email message by ID' })
  @ApiResponse({ status: 200, description: 'Email message details' })
  async getMessage(@Param('id') id: string) {
    const message = await this.emailTemplateService.getMessage(id);
    return message || { error: 'Message not found' };
  }

  @Post('messages/:id/retry')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Retry failed email message' })
  @ApiResponse({ status: 200, description: 'Email message retried' })
  async retryMessage(@Param('id') id: string) {
    return this.emailTemplateService.retryMessage(id);
  }

  @Post('messages/:id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel pending email message' })
  @ApiResponse({ status: 200, description: 'Email message cancelled' })
  async cancelMessage(@Param('id') id: string) {
    return this.emailTemplateService.cancelMessage(id);
  }

  // =================== STATISTICS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get email statistics' })
  @ApiResponse({ status: 200, description: 'Email statistics' })
  async getStats(@Request() req: any) {
    return this.emailTemplateService.getEmailStats(
      req.user.organizationId || req.user.sub,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get email categories' })
  @ApiResponse({ status: 200, description: 'List of email categories' })
  async getCategories() {
    return this.emailTemplateService.getCategories();
  }

  // =================== CONFIGURATION ===================

  @Get('config/priorities')
  @ApiOperation({ summary: 'Get email priorities' })
  @ApiResponse({ status: 200, description: 'List of email priorities' })
  getPriorities() {
    return [
      { value: 'LOW', label: 'Low', labelRo: 'Scăzută' },
      { value: 'NORMAL', label: 'Normal', labelRo: 'Normală' },
      { value: 'HIGH', label: 'High', labelRo: 'Ridicată' },
      { value: 'URGENT', label: 'Urgent', labelRo: 'Urgentă' },
    ];
  }

  @Get('config/variable-types')
  @ApiOperation({ summary: 'Get variable types' })
  @ApiResponse({ status: 200, description: 'List of variable types' })
  getVariableTypes() {
    return [
      { value: 'STRING', label: 'Text', labelRo: 'Text' },
      { value: 'NUMBER', label: 'Number', labelRo: 'Număr' },
      { value: 'DATE', label: 'Date', labelRo: 'Dată' },
      { value: 'CURRENCY', label: 'Currency', labelRo: 'Monedă' },
      { value: 'BOOLEAN', label: 'Yes/No', labelRo: 'Da/Nu' },
      { value: 'URL', label: 'URL', labelRo: 'Link' },
      { value: 'IMAGE', label: 'Image', labelRo: 'Imagine' },
    ];
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate email template' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateTemplate(
    @Body() template: {
      code?: string;
      subject?: string;
      subjectRo?: string;
      bodyHtml?: string;
      bodyHtmlRo?: string;
      variables?: Array<any>;
    },
  ) {
    return this.emailTemplateService.validateTemplate(template);
  }
}
