import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  RealtimeService,
  PresenceStatus,
  MessageType,
} from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  private readonly logger = new Logger(RealtimeController.name);

  constructor(private readonly realtimeService: RealtimeService) {}

  // ============================================
  // CLIENT CONNECTION MANAGEMENT
  // ============================================

  @Post('connect')
  connectClient(
    @Body() data: {
      socketId: string;
      userId: string;
      tenantId: string;
      roles: string[];
      metadata?: Record<string, any>;
    },
  ) {
    return this.realtimeService.connectClient(data);
  }

  @Post('disconnect/:clientId')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnectClient(
    @Param('clientId') clientId: string,
    @Body('reason') reason?: string,
  ) {
    this.realtimeService.disconnectClient(clientId, reason);
  }

  @Post('heartbeat/:clientId')
  @HttpCode(HttpStatus.NO_CONTENT)
  heartbeat(@Param('clientId') clientId: string) {
    this.realtimeService.heartbeat(clientId);
  }

  @Get('client/:clientId')
  getClient(@Param('clientId') clientId: string) {
    const client = this.realtimeService.getClient(clientId);
    if (!client) {
      return { error: 'Client not found' };
    }
    return {
      ...client,
      rooms: Array.from(client.rooms),
      subscriptions: Array.from(client.subscriptions),
    };
  }

  @Get('clients/user/:userId')
  getClientsByUser(@Param('userId') userId: string) {
    const clients = this.realtimeService.getClientsByUser(userId);
    return clients.map(c => ({
      ...c,
      rooms: Array.from(c.rooms),
      subscriptions: Array.from(c.subscriptions),
    }));
  }

  @Get('clients/tenant/:tenantId')
  getClientsByTenant(@Param('tenantId') tenantId: string) {
    const clients = this.realtimeService.getClientsByTenant(tenantId);
    return clients.map(c => ({
      ...c,
      rooms: Array.from(c.rooms),
      subscriptions: Array.from(c.subscriptions),
    }));
  }

  // ============================================
  // ROOM MANAGEMENT
  // ============================================

  @Post('rooms')
  createRoom(
    @Body() data: {
      name: string;
      type: 'private' | 'public' | 'broadcast' | 'tenant';
      maxMembers?: number;
      persistent?: boolean;
      metadata?: Record<string, any>;
    },
  ) {
    const room = this.realtimeService.createRoom(data);
    return {
      ...room,
      members: Array.from(room.members),
    };
  }

  @Get('rooms/:roomId')
  getRoom(@Param('roomId') roomId: string) {
    const room = this.realtimeService.getRoom(roomId);
    if (!room) {
      return { error: 'Room not found' };
    }
    return {
      ...room,
      members: Array.from(room.members),
    };
  }

  @Post('rooms/:roomId/join')
  joinRoom(
    @Param('roomId') roomId: string,
    @Body('clientId') clientId: string,
  ) {
    const success = this.realtimeService.joinRoom(clientId, roomId);
    return { success };
  }

  @Post('rooms/:roomId/leave')
  leaveRoom(
    @Param('roomId') roomId: string,
    @Body('clientId') clientId: string,
  ) {
    const success = this.realtimeService.leaveRoom(clientId, roomId);
    return { success };
  }

  @Get('rooms/:roomId/members')
  getRoomMembers(@Param('roomId') roomId: string) {
    const members = this.realtimeService.getRoomMembers(roomId);
    return members.map(c => ({
      ...c,
      rooms: Array.from(c.rooms),
      subscriptions: Array.from(c.subscriptions),
    }));
  }

  // ============================================
  // MESSAGING
  // ============================================

  @Post('messages')
  sendMessage(
    @Body() data: {
      type: MessageType;
      roomId?: string;
      senderId: string;
      recipientId?: string;
      content: any;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      metadata?: Record<string, any>;
    },
  ) {
    return this.realtimeService.sendMessage({
      ...data,
      priority: data.priority || 'normal',
    });
  }

  @Post('messages/room/:roomId')
  broadcastToRoom(
    @Param('roomId') roomId: string,
    @Body() data: {
      senderId: string;
      type: MessageType;
      content: any;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
  ) {
    const message = this.realtimeService.sendMessage({
      ...data,
      roomId,
      priority: data.priority || 'normal',
    });
    return message;
  }

  @Post('messages/user/:userId')
  sendToUser(
    @Param('userId') userId: string,
    @Body() data: {
      senderId: string;
      type: MessageType;
      content: any;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
  ) {
    const message = this.realtimeService.sendMessage({
      ...data,
      recipientId: userId,
      priority: data.priority || 'normal',
    });
    return message;
  }

  @Post('messages/tenant/:tenantId')
  broadcastToTenant(
    @Param('tenantId') tenantId: string,
    @Body() data: {
      senderId: string;
      type: MessageType;
      content: any;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
  ) {
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      timestamp: new Date(),
      delivered: false,
      read: false,
      priority: data.priority || 'normal',
    };
    this.realtimeService.broadcastToTenant(tenantId, message as any);
    return message;
  }

  // ============================================
  // CHAT
  // ============================================

  @Post('conversations')
  createConversation(
    @Body() data: {
      type: 'direct' | 'group' | 'channel';
      name?: string;
      description?: string;
      createdBy: string;
      participants: { userId: string; userName: string }[];
      metadata?: Record<string, any>;
    },
  ) {
    const conv = this.realtimeService.createConversation(data);
    return {
      ...conv,
      unreadCount: Object.fromEntries(conv.unreadCount),
    };
  }

  @Get('conversations/:conversationId')
  getConversation(@Param('conversationId') conversationId: string) {
    const conv = this.realtimeService.getConversation(conversationId);
    if (!conv) {
      return { error: 'Conversation not found' };
    }
    return {
      ...conv,
      unreadCount: Object.fromEntries(conv.unreadCount),
    };
  }

  @Get('conversations/user/:userId')
  getUserConversations(@Param('userId') userId: string) {
    const convs = this.realtimeService.getUserConversations(userId);
    return convs.map(c => ({
      ...c,
      unreadCount: Object.fromEntries(c.unreadCount),
    }));
  }

  @Post('conversations/:conversationId/messages')
  sendChatMessage(
    @Param('conversationId') conversationId: string,
    @Body() data: {
      senderId: string;
      senderName: string;
      content: string;
      contentType?: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location';
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      replyTo?: string;
    },
  ) {
    return this.realtimeService.sendChatMessage({
      ...data,
      conversationId,
    });
  }

  @Get('conversations/:conversationId/messages')
  getChatMessages(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.realtimeService.getChatMessages(
      conversationId,
      limit ? parseInt(limit, 10) : 50,
      before ? new Date(before) : undefined,
    );
  }

  @Post('conversations/:conversationId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markConversationAsRead(
    @Param('conversationId') conversationId: string,
    @Body('userId') userId: string,
  ) {
    this.realtimeService.markConversationAsRead(conversationId, userId);
  }

  @Post('conversations/:conversationId/typing')
  setTypingIndicator(
    @Param('conversationId') conversationId: string,
    @Body() data: {
      userId: string;
      userName: string;
      isTyping: boolean;
    },
  ) {
    this.realtimeService.setTypingIndicator(
      conversationId,
      data.userId,
      data.userName,
      data.isTyping,
    );
    return { success: true };
  }

  @Get('conversations/:conversationId/typing')
  getTypingIndicators(@Param('conversationId') conversationId: string) {
    return this.realtimeService.getTypingIndicators(conversationId);
  }

  @Post('conversations/:conversationId/messages/:messageId/reactions')
  addReaction(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() data: { userId: string; emoji: string },
  ) {
    this.realtimeService.addReaction(
      conversationId,
      messageId,
      data.userId,
      data.emoji,
    );
    return { success: true };
  }

  @Delete('conversations/:conversationId/messages/:messageId/reactions')
  removeReaction(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() data: { userId: string; emoji: string },
  ) {
    this.realtimeService.removeReaction(
      conversationId,
      messageId,
      data.userId,
      data.emoji,
    );
    return { success: true };
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  @Post('notifications')
  sendNotification(
    @Body() data: {
      userId: string;
      tenantId: string;
      type: string;
      title: string;
      body: string;
      icon?: string;
      action?: {
        type: 'link' | 'action';
        url?: string;
        actionId?: string;
        params?: Record<string, any>;
      };
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      category: string;
      expiresAt?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.realtimeService.sendNotification({
      ...data,
      priority: data.priority || 'normal',
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
  }

  @Get('notifications/:userId')
  getUserNotifications(
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.realtimeService.getUserNotifications(
      userId,
      unreadOnly === 'true',
    );
  }

  @Get('notifications/:userId/count')
  getUnreadNotificationCount(@Param('userId') userId: string) {
    const count = this.realtimeService.getUnreadNotificationCount(userId);
    return { count };
  }

  @Put('notifications/:notificationId/read')
  markNotificationAsRead(
    @Param('notificationId') notificationId: string,
    @Body('userId') userId: string,
  ) {
    const success = this.realtimeService.markNotificationAsRead(
      notificationId,
      userId,
    );
    return { success };
  }

  @Put('notifications/:userId/read-all')
  markAllNotificationsAsRead(@Param('userId') userId: string) {
    const count = this.realtimeService.markAllNotificationsAsRead(userId);
    return { markedAsRead: count };
  }

  // ============================================
  // PRESENCE
  // ============================================

  @Put('presence/:userId')
  setPresence(
    @Param('userId') userId: string,
    @Body('status') status: PresenceStatus,
  ) {
    this.realtimeService.setPresence(userId, status);
    return { success: true, status };
  }

  @Get('presence/:userId')
  getPresence(@Param('userId') userId: string) {
    const status = this.realtimeService.getPresence(userId);
    return { userId, status };
  }

  @Post('presence/bulk')
  getPresenceForUsers(@Body('userIds') userIds: string[]) {
    const presenceMap = this.realtimeService.getPresenceForUsers(userIds);
    return Object.fromEntries(presenceMap);
  }

  @Get('presence/online')
  getOnlineUsers(@Query('tenantId') tenantId?: string) {
    return this.realtimeService.getOnlineUsers(tenantId);
  }

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  @Post('subscriptions/:topic/subscribe')
  subscribe(
    @Param('topic') topic: string,
    @Body('clientId') clientId: string,
  ) {
    const success = this.realtimeService.subscribe(clientId, topic);
    return { success };
  }

  @Post('subscriptions/:topic/unsubscribe')
  unsubscribe(
    @Param('topic') topic: string,
    @Body('clientId') clientId: string,
  ) {
    const success = this.realtimeService.unsubscribe(clientId, topic);
    return { success };
  }

  @Post('subscriptions/:topic/publish')
  publishToTopic(
    @Param('topic') topic: string,
    @Body() data: {
      senderId: string;
      type: MessageType;
      content: any;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
  ) {
    this.realtimeService.publishToTopic(topic, {
      ...data,
      priority: data.priority || 'normal',
    });
    return { success: true };
  }

  @Get('subscriptions/:topic/subscribers')
  getTopicSubscribers(@Param('topic') topic: string) {
    const subscribers = this.realtimeService.getTopicSubscribers(topic);
    return subscribers.map(c => ({
      ...c,
      rooms: Array.from(c.rooms),
      subscriptions: Array.from(c.subscriptions),
    }));
  }

  // ============================================
  // DASHBOARD UPDATES
  // ============================================

  @Post('dashboard/update')
  sendDashboardUpdate(
    @Body() data: {
      type: string;
      module: string;
      data: any;
      affectedUsers?: string[];
      affectedTenants?: string[];
    },
  ) {
    this.realtimeService.sendDashboardUpdate({
      ...data,
      timestamp: new Date(),
    });
    return { success: true };
  }

  @Post('dashboard/invoice-update')
  sendInvoiceUpdate(
    @Body() data: {
      invoiceId: string;
      action: string;
      tenantId: string;
      data?: any;
    },
  ) {
    this.realtimeService.sendInvoiceUpdate(
      data.invoiceId,
      data.action,
      data.data || {},
      data.tenantId,
    );
    return { success: true };
  }

  @Post('dashboard/hr-update')
  sendHRUpdate(
    @Body() data: {
      employeeId: string;
      action: string;
      tenantId: string;
      data?: any;
    },
  ) {
    this.realtimeService.sendHRUpdate(
      data.employeeId,
      data.action,
      data.data || {},
      data.tenantId,
    );
    return { success: true };
  }

  @Post('dashboard/hse-alert')
  sendHSEAlert(
    @Body() data: {
      type: string;
      severity: string;
      location?: string;
      description: string;
      tenantId: string;
      userIds?: string[];
    },
  ) {
    this.realtimeService.sendHSEAlert(
      {
        type: data.type,
        severity: data.severity,
        location: data.location,
        description: data.description,
      },
      data.tenantId,
      data.userIds,
    );
    return { success: true };
  }

  @Post('dashboard/logistics-update')
  sendLogisticsUpdate(
    @Body() data: {
      shipmentId: string;
      status: string;
      location: any;
      tenantId: string;
    },
  ) {
    this.realtimeService.sendLogisticsUpdate(
      data.shipmentId,
      data.status,
      data.location,
      data.tenantId,
    );
    return { success: true };
  }

  // ============================================
  // SYSTEM
  // ============================================

  @Post('system/announcement')
  sendSystemAnnouncement(
    @Body() data: {
      title: string;
      body: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
  ) {
    this.realtimeService.sendSystemAnnouncement(
      data.title,
      data.body,
      data.priority,
    );
    return { success: true };
  }

  @Post('system/maintenance')
  sendMaintenanceAlert(
    @Body() data: {
      message: string;
      scheduledAt?: string;
      estimatedDuration?: number;
    },
  ) {
    this.realtimeService.sendMaintenanceAlert(
      data.message,
      data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      data.estimatedDuration,
    );
    return { success: true };
  }

  // ============================================
  // METRICS
  // ============================================

  @Get('metrics')
  getMetrics() {
    return this.realtimeService.getMetrics();
  }

  @Get('metrics/detailed')
  getDetailedMetrics() {
    return this.realtimeService.getDetailedMetrics();
  }
}
