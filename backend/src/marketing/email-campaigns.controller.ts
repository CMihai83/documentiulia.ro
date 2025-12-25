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
  EmailCampaignsService,
  EmailTemplate,
  CampaignRecipients,
  CampaignSchedule,
  TrackingOptions,
  ABTestConfig,
} from './email-campaigns.service';

@ApiTags('Marketing - Email Campaigns')
@Controller('marketing/email')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmailCampaignsController {
  constructor(private readonly emailService: EmailCampaignsService) {}

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create email template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      subject: string;
      htmlContent: string;
      textContent?: string;
      preheader?: string;
      category?: 'marketing' | 'transactional' | 'notification' | 'newsletter';
      tags?: string[];
    },
  ) {
    return this.emailService.createTemplate({
      tenantId: req.user.tenantId,
      name: body.name,
      subject: body.subject,
      htmlContent: body.htmlContent,
      textContent: body.textContent,
      preheader: body.preheader,
      category: body.category || 'marketing',
      tags: body.tags || [],
      variables: [],
      isActive: true,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get email templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Templates' })
  async getTemplates(
    @Request() req: any,
    @Query('category') category?: 'marketing' | 'transactional' | 'notification' | 'newsletter',
  ) {
    const templates = await this.emailService.getTemplates(
      req.user.tenantId,
      category,
    );
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
    @Body() body: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'preheader' | 'htmlContent' | 'textContent' | 'category' | 'tags' | 'isActive'>>,
  ) {
    const template = await this.emailService.updateTemplate(id, body);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('id') id: string) {
    await this.emailService.deleteTemplate(id);
    return { success: true };
  }

  // =================== CAMPAIGNS ===================

  @Post('campaigns')
  @ApiOperation({ summary: 'Create email campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async createCampaign(
    @Request() req: any,
    @Body() body: {
      name: string;
      subject: string;
      htmlContent: string;
      textContent?: string;
      preheader?: string;
      templateId?: string;
      fromName: string;
      fromEmail: string;
      replyTo?: string;
      recipients: CampaignRecipients;
      schedule: CampaignSchedule;
      tracking?: Partial<TrackingOptions>;
      abTest?: ABTestConfig;
    },
  ) {
    return this.emailService.createCampaign({
      tenantId: req.user.tenantId,
      name: body.name,
      subject: body.subject,
      htmlContent: body.htmlContent,
      textContent: body.textContent,
      preheader: body.preheader,
      templateId: body.templateId,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
      replyTo: body.replyTo,
      recipients: body.recipients,
      schedule: body.schedule,
      tracking: body.tracking,
      abTest: body.abTest,
    });
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get email campaigns' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'Campaigns' })
  async getCampaigns(
    @Request() req: any,
    @Query('status') status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled',
  ) {
    const campaigns = await this.emailService.getCampaigns(
      req.user.tenantId,
      status,
    );
    return { campaigns, total: campaigns.length };
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  async getCampaign(@Param('id') id: string) {
    const campaign = await this.emailService.getCampaign(id);
    if (!campaign) {
      return { error: 'Campaign not found' };
    }
    return campaign;
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() body: Partial<Pick<
      Parameters<typeof EmailCampaignsService.prototype.updateCampaign>[1],
      'name' | 'subject' | 'preheader' | 'htmlContent' | 'textContent' | 'recipients' | 'schedule' | 'abTest' | 'tracking'
    >>,
  ) {
    const campaign = await this.emailService.updateCampaign(id, body);
    if (!campaign) {
      return { error: 'Campaign not found' };
    }
    return campaign;
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted' })
  async deleteCampaign(@Param('id') id: string) {
    await this.emailService.deleteCampaign(id);
    return { success: true };
  }

  @Post('campaigns/:id/schedule')
  @ApiOperation({ summary: 'Schedule campaign' })
  @ApiResponse({ status: 200, description: 'Campaign scheduled' })
  async scheduleCampaign(
    @Param('id') id: string,
    @Body() body: { schedule: CampaignSchedule },
  ) {
    return this.emailService.scheduleCampaign(id, body.schedule);
  }

  @Post('campaigns/:id/pause')
  @ApiOperation({ summary: 'Pause campaign' })
  @ApiResponse({ status: 200, description: 'Campaign paused' })
  async pauseCampaign(@Param('id') id: string) {
    return this.emailService.pauseCampaign(id);
  }

  @Post('campaigns/:id/cancel')
  @ApiOperation({ summary: 'Cancel campaign' })
  @ApiResponse({ status: 200, description: 'Campaign cancelled' })
  async cancelCampaign(@Param('id') id: string) {
    return this.emailService.cancelCampaign(id);
  }

  @Post('campaigns/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate campaign' })
  @ApiResponse({ status: 201, description: 'Campaign duplicated' })
  async duplicateCampaign(@Param('id') id: string) {
    return this.emailService.duplicateCampaign(id);
  }

  @Get('campaigns/:id/analytics')
  @ApiOperation({ summary: 'Get campaign analytics' })
  @ApiResponse({ status: 200, description: 'Campaign analytics' })
  async getCampaignAnalytics(@Param('id') id: string) {
    return this.emailService.getCampaignAnalytics(id);
  }

  // =================== LISTS ===================

  @Post('lists')
  @ApiOperation({ summary: 'Create email list' })
  @ApiResponse({ status: 201, description: 'List created' })
  async createList(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      doubleOptIn?: boolean;
      welcomeEmailId?: string;
    },
  ) {
    return this.emailService.createList({
      tenantId: req.user.tenantId,
      name: body.name,
      description: body.description,
      doubleOptIn: body.doubleOptIn,
      welcomeEmailId: body.welcomeEmailId,
    });
  }

  @Get('lists')
  @ApiOperation({ summary: 'Get email lists' })
  @ApiResponse({ status: 200, description: 'Lists' })
  async getLists(@Request() req: any) {
    const lists = await this.emailService.getLists(req.user.tenantId);
    return { lists, total: lists.length };
  }

  @Delete('lists/:id')
  @ApiOperation({ summary: 'Delete list' })
  @ApiResponse({ status: 200, description: 'List deleted' })
  async deleteList(@Param('id') id: string) {
    await this.emailService.deleteList(id);
    return { success: true };
  }

  // =================== SUBSCRIBERS ===================

  @Post('subscribers')
  @ApiOperation({ summary: 'Add subscriber' })
  @ApiResponse({ status: 201, description: 'Subscriber added' })
  async addSubscriber(
    @Request() req: any,
    @Body() body: {
      email: string;
      firstName?: string;
      lastName?: string;
      listIds: string[];
      tags?: string[];
      source?: string;
    },
  ) {
    return this.emailService.addSubscriber({
      tenantId: req.user.tenantId,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      listIds: body.listIds,
      tags: body.tags,
      source: body.source || 'api',
    });
  }

  @Get('subscribers')
  @ApiOperation({ summary: 'Get subscribers' })
  @ApiQuery({ name: 'listId', required: false })
  @ApiResponse({ status: 200, description: 'Subscribers' })
  async getSubscribers(
    @Request() req: any,
    @Query('listId') listId?: string,
  ) {
    const subscribers = await this.emailService.getSubscribers(
      req.user.tenantId,
      listId,
    );
    return { subscribers, total: subscribers.length };
  }

  @Post('subscribers/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe email' })
  @ApiResponse({ status: 200, description: 'Unsubscribed' })
  async unsubscribe(
    @Body() body: { email: string; listId?: string },
  ) {
    await this.emailService.unsubscribe(body.email, body.listId);
    return { success: true };
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get email marketing stats' })
  @ApiResponse({ status: 200, description: 'Stats' })
  async getStats(@Request() req: any) {
    return this.emailService.getStats(req.user.tenantId);
  }
}
