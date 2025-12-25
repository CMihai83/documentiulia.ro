import {
  Controller,
  Get,
  Post,
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
  PushNotificationService,
  PushPlatform,
  PushStatus,
  PushPriority,
  PushVariable,
  PushCampaign,
} from './push-notification.service';

@ApiTags('Communication - Push Notifications')
@Controller('communication/push')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PushNotificationController {
  constructor(private readonly pushService: PushNotificationService) {}

  // =================== TOKENS ===================

  @Post('tokens/register')
  @ApiOperation({ summary: 'Register push token' })
  @ApiResponse({ status: 201, description: 'Token registered' })
  async registerToken(
    @Request() req: any,
    @Body() body: {
      token: string;
      platform: PushPlatform;
      deviceId?: string;
      deviceName?: string;
      deviceModel?: string;
      appVersion?: string;
    },
  ) {
    return this.pushService.registerToken({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      token: body.token,
      platform: body.platform,
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      deviceModel: body.deviceModel,
      appVersion: body.appVersion,
    });
  }

  @Delete('tokens/:id')
  @ApiOperation({ summary: 'Unregister push token' })
  @ApiResponse({ status: 200, description: 'Token unregistered' })
  async unregisterToken(@Param('id') id: string) {
    const success = await this.pushService.unregisterToken(id);
    return { success };
  }

  @Get('tokens')
  @ApiOperation({ summary: 'Get my push tokens' })
  @ApiQuery({ name: 'platform', required: false })
  @ApiResponse({ status: 200, description: 'Tokens list' })
  async getMyTokens(
    @Request() req: any,
    @Query('platform') platform?: PushPlatform,
  ) {
    const tokens = await this.pushService.getUserTokens(req.user.id, platform);
    return { tokens, total: tokens.length };
  }

  @Post('tokens/refresh')
  @ApiOperation({ summary: 'Refresh push token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refreshToken(
    @Body() body: { oldToken: string; newToken: string },
  ) {
    const token = await this.pushService.refreshToken(body.oldToken, body.newToken);
    if (!token) {
      return { error: 'Token not found' };
    }
    return token;
  }

  // =================== SEND NOTIFICATIONS ===================

  @Post('send')
  @ApiOperation({ summary: 'Send push notification to user' })
  @ApiResponse({ status: 201, description: 'Notification sent' })
  async sendToUser(
    @Request() req: any,
    @Body() body: {
      userId: string;
      platform?: PushPlatform;
      title: string;
      body: string;
      icon?: string;
      image?: string;
      badge?: number;
      sound?: string;
      clickAction?: string;
      data?: Record<string, any>;
      priority?: PushPriority;
      ttl?: number;
      collapseKey?: string;
    },
  ) {
    try {
      return await this.pushService.sendToUser({
        tenantId: req.user.tenantId,
        userId: body.userId,
        platform: body.platform,
        title: body.title,
        body: body.body,
        icon: body.icon,
        image: body.image,
        badge: body.badge,
        sound: body.sound,
        clickAction: body.clickAction,
        data: body.data,
        priority: body.priority,
        ttl: body.ttl,
        collapseKey: body.collapseKey,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('send/bulk')
  @ApiOperation({ summary: 'Send push to multiple users' })
  @ApiResponse({ status: 201, description: 'Notifications sent' })
  async sendToUsers(
    @Request() req: any,
    @Body() body: {
      userIds: string[];
      platform?: PushPlatform;
      title: string;
      body: string;
      icon?: string;
      image?: string;
      clickAction?: string;
      data?: Record<string, any>;
      priority?: PushPriority;
    },
  ) {
    return this.pushService.sendToUsers({
      tenantId: req.user.tenantId,
      userIds: body.userIds,
      platform: body.platform,
      title: body.title,
      body: body.body,
      icon: body.icon,
      image: body.image,
      clickAction: body.clickAction,
      data: body.data,
      priority: body.priority,
      createdBy: req.user.id,
    });
  }

  @Post('send/topic')
  @ApiOperation({ summary: 'Send push to topic' })
  @ApiResponse({ status: 201, description: 'Notification sent to topic' })
  async sendToTopic(
    @Request() req: any,
    @Body() body: {
      topicId: string;
      title: string;
      body: string;
      icon?: string;
      image?: string;
      clickAction?: string;
      data?: Record<string, any>;
      priority?: PushPriority;
    },
  ) {
    try {
      return await this.pushService.sendToTopic({
        tenantId: req.user.tenantId,
        topicId: body.topicId,
        title: body.title,
        body: body.body,
        icon: body.icon,
        image: body.image,
        clickAction: body.clickAction,
        data: body.data,
        priority: body.priority,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('send/template')
  @ApiOperation({ summary: 'Send push from template' })
  @ApiResponse({ status: 201, description: 'Notification sent' })
  async sendFromTemplate(
    @Request() req: any,
    @Body() body: {
      userId: string;
      templateId: string;
      templateData: Record<string, any>;
      platform?: PushPlatform;
    },
  ) {
    try {
      return await this.pushService.sendFromTemplate({
        tenantId: req.user.tenantId,
        userId: body.userId,
        templateId: body.templateId,
        templateData: body.templateData,
        platform: body.platform,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== NOTIFICATIONS ===================

  @Get('notifications')
  @ApiOperation({ summary: 'Get push notifications' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Notifications list' })
  async getNotifications(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('status') status?: PushStatus,
    @Query('platform') platform?: PushPlatform,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const notifications = await this.pushService.getNotifications(req.user.tenantId, {
      userId,
      status,
      platform,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { notifications, total: notifications.length };
  }

  @Get('notifications/:id')
  @ApiOperation({ summary: 'Get notification details' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  async getNotification(@Param('id') id: string) {
    const notification = await this.pushService.getNotification(id);
    if (!notification) {
      return { error: 'Notification not found' };
    }
    return notification;
  }

  @Post('notifications/:id/track/click')
  @ApiOperation({ summary: 'Track notification click' })
  @ApiResponse({ status: 200, description: 'Click tracked' })
  async trackClick(@Param('id') id: string) {
    await this.pushService.trackClick(id);
    return { success: true };
  }

  // =================== TOPICS ===================

  @Post('topics')
  @ApiOperation({ summary: 'Create topic' })
  @ApiResponse({ status: 201, description: 'Topic created' })
  async createTopic(
    @Request() req: any,
    @Body() body: { name: string; description?: string },
  ) {
    return this.pushService.createTopic({
      tenantId: req.user.tenantId,
      name: body.name,
      description: body.description,
    });
  }

  @Get('topics')
  @ApiOperation({ summary: 'Get topics' })
  @ApiResponse({ status: 200, description: 'Topics list' })
  async getTopics(@Request() req: any) {
    const topics = await this.pushService.getTopics(req.user.tenantId);
    return { topics, total: topics.length };
  }

  @Get('topics/:id')
  @ApiOperation({ summary: 'Get topic details' })
  @ApiResponse({ status: 200, description: 'Topic details' })
  async getTopic(@Param('id') id: string) {
    const topic = await this.pushService.getTopic(id);
    if (!topic) {
      return { error: 'Topic not found' };
    }
    return topic;
  }

  @Post('topics/:id/subscribe')
  @ApiOperation({ summary: 'Subscribe to topic' })
  @ApiResponse({ status: 201, description: 'Subscribed' })
  async subscribeToTopic(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { tokenId: string },
  ) {
    try {
      return await this.pushService.subscribeToTopic({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        topicId: id,
        tokenId: body.tokenId,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: 'Unsubscribe from topic' })
  @ApiResponse({ status: 200, description: 'Unsubscribed' })
  async unsubscribeFromTopic(@Param('id') id: string) {
    const success = await this.pushService.unsubscribeFromTopic(id);
    return { success };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get my topic subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions list' })
  async getMySubscriptions(@Request() req: any) {
    const subscriptions = await this.pushService.getUserTopicSubscriptions(req.user.id);
    return { subscriptions, total: subscriptions.length };
  }

  // =================== CAMPAIGNS ===================

  @Post('campaigns')
  @ApiOperation({ summary: 'Create push campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async createCampaign(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      platform: PushPlatform;
      title: string;
      body: string;
      icon?: string;
      image?: string;
      clickAction?: string;
      data?: Record<string, any>;
      audience: PushCampaign['audience'];
      scheduledAt?: string;
    },
  ) {
    return this.pushService.createCampaign({
      tenantId: req.user.tenantId,
      name: body.name,
      description: body.description,
      platform: body.platform,
      title: body.title,
      body: body.body,
      icon: body.icon,
      image: body.image,
      clickAction: body.clickAction,
      data: body.data,
      audience: body.audience,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      createdBy: req.user.id,
    });
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'Get push campaigns' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Campaigns list' })
  async getCampaigns(
    @Request() req: any,
    @Query('status') status?: PushCampaign['status'],
    @Query('limit') limit?: string,
  ) {
    const campaigns = await this.pushService.getCampaigns(req.user.tenantId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { campaigns, total: campaigns.length };
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  async getCampaign(@Param('id') id: string) {
    const campaign = await this.pushService.getCampaign(id);
    if (!campaign) {
      return { error: 'Campaign not found' };
    }
    return campaign;
  }

  @Post('campaigns/:id/send')
  @ApiOperation({ summary: 'Send push campaign' })
  @ApiResponse({ status: 200, description: 'Campaign sent' })
  async sendCampaign(@Param('id') id: string) {
    try {
      return await this.pushService.sendCampaign(id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('campaigns/:id/cancel')
  @ApiOperation({ summary: 'Cancel push campaign' })
  @ApiResponse({ status: 200, description: 'Campaign cancelled' })
  async cancelCampaign(@Param('id') id: string) {
    try {
      return await this.pushService.cancelCampaign(id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create push template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      title: string;
      body: string;
      icon?: string;
      image?: string;
      clickAction?: string;
      data?: Record<string, any>;
      variables: PushVariable[];
    },
  ) {
    return this.pushService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get push templates' })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(@Request() req: any) {
    const templates = await this.pushService.getTemplates(req.user.tenantId);
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.pushService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get push notification stats' })
  @ApiResponse({ status: 200, description: 'Push statistics' })
  async getStats(@Request() req: any) {
    return this.pushService.getStats(req.user.tenantId);
  }
}
