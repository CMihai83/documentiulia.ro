import {
  Controller,
  Get,
  Post,
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
  SMSWhatsAppService,
  SMSChannel,
  SMSStatus,
  MessageType,
  PhoneNumber,
  InteractiveMessage,
  LocationData,
  ContactData,
  SMSVariable,
  SMSTemplate,
} from './sms-whatsapp.service';

@ApiTags('Communication - SMS & WhatsApp')
@Controller('communication/sms-whatsapp')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SMSWhatsAppController {
  constructor(private readonly smsService: SMSWhatsAppService) {}

  // =================== SMS ===================

  @Post('sms/send')
  @ApiOperation({ summary: 'Send SMS' })
  @ApiResponse({ status: 201, description: 'SMS sent' })
  async sendSMS(
    @Request() req: any,
    @Body() body: {
      to: PhoneNumber;
      body: string;
      from?: PhoneNumber;
      templateId?: string;
      templateData?: Record<string, any>;
      scheduledAt?: string;
      campaignId?: string;
    },
  ) {
    try {
      return await this.smsService.sendSMS({
        tenantId: req.user.tenantId,
        to: body.to,
        body: body.body,
        from: body.from,
        templateId: body.templateId,
        templateData: body.templateData,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        campaignId: body.campaignId,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('sms/send/bulk')
  @ApiOperation({ summary: 'Send bulk SMS' })
  @ApiResponse({ status: 201, description: 'SMS queued' })
  async sendBulkSMS(
    @Request() req: any,
    @Body() body: {
      recipients: Array<PhoneNumber & { data?: Record<string, any> }>;
      body?: string;
      templateId?: string;
      campaignId?: string;
    },
  ) {
    return this.smsService.sendBulkSMS({
      tenantId: req.user.tenantId,
      recipients: body.recipients,
      body: body.body,
      templateId: body.templateId,
      campaignId: body.campaignId,
      createdBy: req.user.id,
    });
  }

  // =================== WHATSAPP ===================

  @Post('whatsapp/send')
  @ApiOperation({ summary: 'Send WhatsApp message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendWhatsApp(
    @Request() req: any,
    @Body() body: {
      to: PhoneNumber;
      type: MessageType;
      body?: string;
      mediaUrl?: string;
      mediaType?: string;
      templateId?: string;
      templateData?: Record<string, any>;
      interactiveData?: InteractiveMessage;
      location?: LocationData;
      contact?: ContactData;
      conversationId?: string;
    },
  ) {
    try {
      return await this.smsService.sendWhatsApp({
        tenantId: req.user.tenantId,
        to: body.to,
        type: body.type,
        body: body.body,
        mediaUrl: body.mediaUrl,
        mediaType: body.mediaType,
        templateId: body.templateId,
        templateData: body.templateData,
        interactiveData: body.interactiveData,
        location: body.location,
        contact: body.contact,
        conversationId: body.conversationId,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('whatsapp/send/interactive')
  @ApiOperation({ summary: 'Send WhatsApp interactive message' })
  @ApiResponse({ status: 201, description: 'Interactive message sent' })
  async sendWhatsAppInteractive(
    @Request() req: any,
    @Body() body: {
      to: PhoneNumber;
      interactiveData: InteractiveMessage;
      conversationId?: string;
    },
  ) {
    return this.smsService.sendWhatsApp({
      tenantId: req.user.tenantId,
      to: body.to,
      type: 'interactive',
      interactiveData: body.interactiveData,
      conversationId: body.conversationId,
      createdBy: req.user.id,
    });
  }

  @Post('whatsapp/send/location')
  @ApiOperation({ summary: 'Send WhatsApp location' })
  @ApiResponse({ status: 201, description: 'Location sent' })
  async sendWhatsAppLocation(
    @Request() req: any,
    @Body() body: {
      to: PhoneNumber;
      location: LocationData;
      conversationId?: string;
    },
  ) {
    return this.smsService.sendWhatsApp({
      tenantId: req.user.tenantId,
      to: body.to,
      type: 'location',
      location: body.location,
      conversationId: body.conversationId,
      createdBy: req.user.id,
    });
  }

  // =================== MESSAGES ===================

  @Get('messages')
  @ApiOperation({ summary: 'Get messages' })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'phoneNumber', required: false })
  @ApiQuery({ name: 'campaignId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Messages list' })
  async getMessages(
    @Request() req: any,
    @Query('channel') channel?: SMSChannel,
    @Query('status') status?: SMSStatus,
    @Query('phoneNumber') phoneNumber?: string,
    @Query('campaignId') campaignId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const messages = await this.smsService.getMessages(req.user.tenantId, {
      channel,
      status,
      phoneNumber,
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
    const message = await this.smsService.getMessage(id);
    if (!message) {
      return { error: 'Message not found' };
    }
    return message;
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
      channel: SMSChannel;
      category: string;
      language: string;
      body: string;
      variables: SMSVariable[];
      buttons?: SMSTemplate['buttons'];
    },
  ) {
    return this.smsService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get templates' })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(
    @Request() req: any,
    @Query('channel') channel?: SMSChannel,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const templates = await this.smsService.getTemplates(req.user.tenantId, {
      channel,
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.smsService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  // =================== CONVERSATIONS ===================

  @Post('conversations')
  @ApiOperation({ summary: 'Create conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @Request() req: any,
    @Body() body: {
      channel: SMSChannel;
      phoneNumber: PhoneNumber;
      contactName?: string;
      assignedTo?: string;
    },
  ) {
    return this.smsService.createConversation({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get conversations' })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Conversations list' })
  async getConversations(
    @Request() req: any,
    @Query('channel') channel?: SMSChannel,
    @Query('status') status?: 'active' | 'closed' | 'expired',
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit?: string,
  ) {
    const conversations = await this.smsService.getConversations(req.user.tenantId, {
      channel,
      status,
      assignedTo,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { conversations, total: conversations.length };
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  async getConversation(@Param('id') id: string) {
    const conversation = await this.smsService.getConversation(id);
    if (!conversation) {
      return { error: 'Conversation not found' };
    }
    return conversation;
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiResponse({ status: 200, description: 'Conversation messages' })
  async getConversationMessages(@Param('id') id: string) {
    const messages = await this.smsService.getConversationMessages(id);
    return { messages, total: messages.length };
  }

  // =================== VERIFICATION ===================

  @Post('verify/send')
  @ApiOperation({ summary: 'Send verification code' })
  @ApiResponse({ status: 201, description: 'Verification sent' })
  async sendVerificationCode(
    @Request() req: any,
    @Body() body: {
      phoneNumber: PhoneNumber;
      channel?: 'sms' | 'whatsapp' | 'call';
      codeLength?: number;
      expiryMinutes?: number;
    },
  ) {
    return this.smsService.sendVerificationCode({
      tenantId: req.user.tenantId,
      phoneNumber: body.phoneNumber,
      channel: body.channel,
      codeLength: body.codeLength,
      expiryMinutes: body.expiryMinutes,
      createdBy: req.user.id,
    });
  }

  @Post('verify/check')
  @ApiOperation({ summary: 'Verify code' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyCode(
    @Body() body: { verificationId: string; code: string },
  ) {
    return this.smsService.verifyCode(body.verificationId, body.code);
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get SMS/WhatsApp stats' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStats(@Request() req: any) {
    return this.smsService.getStats(req.user.tenantId);
  }
}
