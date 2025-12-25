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
  CommunicationHubService,
  ChannelType,
  MessageStatus,
  MessagePriority,
  Recipient,
  MessageContent,
  TemplateVariable,
  AudienceFilter,
  CampaignSchedule,
  Campaign,
} from './communication-hub.service';

@ApiTags('Communication Hub')
@Controller('communication')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunicationHubController {
  constructor(private readonly commService: CommunicationHubService) {}

  // =================== MESSAGES ===================

  @Post('messages')
  @ApiOperation({ summary: 'Send message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Request() req: any,
    @Body() body: {
      channel: ChannelType;
      recipient: Recipient;
      content: MessageContent;
      priority?: MessagePriority;
      scheduledAt?: string;
      threadId?: string;
    },
  ) {
    try {
      return await this.commService.sendMessage({
        tenantId: req.user.tenantId,
        channel: body.channel,
        recipient: body.recipient,
        content: body.content,
        priority: body.priority,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        threadId: body.threadId,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('messages/bulk')
  @ApiOperation({ summary: 'Send bulk messages' })
  @ApiResponse({ status: 201, description: 'Messages queued' })
  async sendBulkMessages(
    @Request() req: any,
    @Body() body: {
      channel: ChannelType;
      recipients: Recipient[];
      content: MessageContent;
      priority?: MessagePriority;
      campaignId?: string;
    },
  ) {
    return this.commService.sendBulkMessages({
      tenantId: req.user.tenantId,
      channel: body.channel,
      recipients: body.recipients,
      content: body.content,
      priority: body.priority,
      campaignId: body.campaignId,
      createdBy: req.user.id,
    });
  }

  @Post('messages/multi-channel')
  @ApiOperation({ summary: 'Send to multiple channels' })
  @ApiResponse({ status: 201, description: 'Messages sent' })
  async sendMultiChannel(
    @Request() req: any,
    @Body() body: {
      channels: ChannelType[];
      recipient: Recipient;
      content: MessageContent;
      priority?: MessagePriority;
    },
  ) {
    return this.commService.sendMultiChannel({
      tenantId: req.user.tenantId,
      channels: body.channels,
      recipient: body.recipient,
      content: body.content,
      priority: body.priority,
      createdBy: req.user.id,
    });
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get messages' })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'recipientId', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Messages list' })
  async getMessages(
    @Request() req: any,
    @Query('channel') channel?: ChannelType,
    @Query('status') status?: MessageStatus,
    @Query('recipientId') recipientId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const messages = await this.commService.getMessages(req.user.tenantId, {
      channel,
      status,
      recipientId,
      campaignId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { messages, total: messages.length };
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get message details' })
  @ApiResponse({ status: 200, description: 'Message details' })
  async getMessage(@Param('id') id: string) {
    const message = await this.commService.getMessage(id);
    if (!message) {
      return { error: 'Message not found' };
    }
    return message;
  }

  @Post('messages/:id/track/open')
  @ApiOperation({ summary: 'Track message open' })
  @ApiResponse({ status: 200, description: 'Open tracked' })
  async trackOpen(@Param('id') id: string) {
    await this.commService.trackMessageOpen(id);
    return { success: true };
  }

  @Post('messages/:id/track/click')
  @ApiOperation({ summary: 'Track message click' })
  @ApiResponse({ status: 200, description: 'Click tracked' })
  async trackClick(
    @Param('id') id: string,
    @Body() body: { action?: string },
  ) {
    await this.commService.trackMessageClick(id, body.action);
    return { success: true };
  }

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      channel: ChannelType;
      category: string;
      subject?: string;
      body: string;
      htmlBody?: string;
      variables: TemplateVariable[];
    },
  ) {
    return this.commService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get templates' })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(
    @Request() req: any,
    @Query('channel') channel?: ChannelType,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const templates = await this.commService.getTemplates(req.user.tenantId, {
      channel,
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
    const template = await this.commService.getTemplate(id);
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
      subject?: string;
      body?: string;
      htmlBody?: string;
      variables?: TemplateVariable[];
      isActive?: boolean;
    },
  ) {
    const template = await this.commService.updateTemplate(id, body);
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
      return await this.commService.processTemplate(id, body.data);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== THREADS ===================

  @Post('threads')
  @ApiOperation({ summary: 'Create thread' })
  @ApiResponse({ status: 201, description: 'Thread created' })
  async createThread(
    @Request() req: any,
    @Body() body: {
      subject?: string;
      participants: Recipient[];
      channel: ChannelType;
      initialMessage?: MessageContent;
    },
  ) {
    return this.commService.createThread({
      tenantId: req.user.tenantId,
      subject: body.subject,
      participants: body.participants,
      channel: body.channel,
      initialMessage: body.initialMessage,
      createdBy: req.user.id,
    });
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Get thread details' })
  @ApiResponse({ status: 200, description: 'Thread details' })
  async getThread(@Param('id') id: string) {
    const thread = await this.commService.getThread(id);
    if (!thread) {
      return { error: 'Thread not found' };
    }
    return thread;
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: 'Get thread messages' })
  @ApiResponse({ status: 200, description: 'Thread messages' })
  async getThreadMessages(@Param('id') id: string) {
    const messages = await this.commService.getThreadMessages(id);
    return { messages, total: messages.length };
  }

  // =================== CAMPAIGNS ===================

  @Post('campaigns')
  @ApiOperation({ summary: 'Create campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async createCampaign(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: Campaign['type'];
      channels: ChannelType[];
      content: MessageContent;
      audience: AudienceFilter;
      schedule?: CampaignSchedule;
    },
  ) {
    return this.commService.createCampaign({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get campaigns' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Campaigns list' })
  async getCampaigns(
    @Request() req: any,
    @Query('status') status?: Campaign['status'],
    @Query('type') type?: Campaign['type'],
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const campaigns = await this.commService.getCampaigns(req.user.tenantId, {
      status,
      type,
      search,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { campaigns, total: campaigns.length };
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  async getCampaign(@Param('id') id: string) {
    const campaign = await this.commService.getCampaign(id);
    if (!campaign) {
      return { error: 'Campaign not found' };
    }
    return campaign;
  }

  @Post('campaigns/:id/start')
  @ApiOperation({ summary: 'Start campaign' })
  @ApiResponse({ status: 200, description: 'Campaign started' })
  async startCampaign(@Request() req: any, @Param('id') id: string) {
    try {
      return await this.commService.startCampaign(id, req.user.id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('campaigns/:id/pause')
  @ApiOperation({ summary: 'Pause campaign' })
  @ApiResponse({ status: 200, description: 'Campaign paused' })
  async pauseCampaign(@Param('id') id: string) {
    try {
      return await this.commService.pauseCampaign(id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('campaigns/:id/cancel')
  @ApiOperation({ summary: 'Cancel campaign' })
  @ApiResponse({ status: 200, description: 'Campaign cancelled' })
  async cancelCampaign(@Param('id') id: string) {
    try {
      return await this.commService.cancelCampaign(id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== CHANNELS ===================

  @Get('channels')
  @ApiOperation({ summary: 'Get channel configurations' })
  @ApiResponse({ status: 200, description: 'Channel configs' })
  async getChannelConfigs() {
    const configs = await this.commService.getChannelConfigs();
    return { configs, total: configs.length };
  }

  @Get('channels/:channel')
  @ApiOperation({ summary: 'Get channel config' })
  @ApiResponse({ status: 200, description: 'Channel config' })
  async getChannelConfig(@Param('channel') channel: ChannelType) {
    const config = await this.commService.getChannelConfig(channel);
    if (!config) {
      return { error: 'Channel not found' };
    }
    return config;
  }

  @Put('channels/:channel')
  @ApiOperation({ summary: 'Update channel config' })
  @ApiResponse({ status: 200, description: 'Channel updated' })
  async updateChannelConfig(
    @Param('channel') channel: ChannelType,
    @Body() body: {
      enabled?: boolean;
      provider?: string;
      credentials?: Record<string, any>;
      settings?: Record<string, any>;
    },
  ) {
    const config = await this.commService.updateChannelConfig(channel, body);
    if (!config) {
      return { error: 'Channel not found' };
    }
    return config;
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get communication stats' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStats(@Request() req: any) {
    return this.commService.getStats(req.user.tenantId);
  }
}
