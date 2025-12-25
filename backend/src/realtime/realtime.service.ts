import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================
// TYPES
// ============================================

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
export type MessageType =
  | 'notification'
  | 'chat'
  | 'presence'
  | 'dashboard_update'
  | 'invoice_update'
  | 'hr_update'
  | 'hse_alert'
  | 'logistics_update'
  | 'system'
  | 'typing'
  | 'read_receipt';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface WebSocketClient {
  id: string;
  socketId: string;
  userId: string;
  tenantId: string;
  roles: string[];
  connectedAt: Date;
  lastHeartbeat: Date;
  presence: PresenceStatus;
  metadata: Record<string, any>;
  rooms: Set<string>;
  subscriptions: Set<string>;
}

export interface Room {
  id: string;
  name: string;
  type: 'private' | 'public' | 'broadcast' | 'tenant';
  members: Set<string>; // client IDs
  createdAt: Date;
  metadata: Record<string, any>;
  maxMembers?: number;
  persistent: boolean;
}

export interface Message {
  id: string;
  type: MessageType;
  roomId?: string;
  senderId: string;
  recipientId?: string;
  content: any;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
  readAt?: Date;
  expiresAt?: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  contentType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  replyTo?: string;
  reactions: { emoji: string; userIds: string[] }[];
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  timestamp: Date;
  readBy: { userId: string; readAt: Date }[];
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name?: string;
  description?: string;
  avatarUrl?: string;
  participants: {
    userId: string;
    userName: string;
    role: 'admin' | 'member';
    joinedAt: Date;
    lastReadAt?: Date;
    muted: boolean;
    mutedUntil?: Date;
  }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: ChatMessage;
  unreadCount: Map<string, number>;
  pinned: boolean;
  archived: boolean;
  metadata: Record<string, any>;
}

export interface Notification {
  id: string;
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
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  metadata?: Record<string, any>;
}

export interface DashboardUpdate {
  type: string;
  module: string;
  data: any;
  timestamp: Date;
  affectedUsers?: string[];
  affectedTenants?: string[];
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  messagesPerSecond: number;
  messagesTotal: number;
  roomsActive: number;
  peakConnections: number;
  peakConnectionsTime: Date;
  averageLatency: number;
  uptime: number;
}

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);

  // Client management
  private readonly clients = new Map<string, WebSocketClient>();
  private readonly userToClients = new Map<string, Set<string>>(); // userId -> clientIds
  private readonly tenantToClients = new Map<string, Set<string>>(); // tenantId -> clientIds

  // Room management
  private readonly rooms = new Map<string, Room>();
  private readonly systemRooms = new Set<string>();

  // Message queues and history
  private readonly messageQueue = new Map<string, Message[]>(); // offline message queue
  private readonly messageHistory = new Map<string, Message[]>(); // room -> messages
  private readonly maxHistoryPerRoom = 100;

  // Chat
  private readonly conversations = new Map<string, Conversation>();
  private readonly chatMessages = new Map<string, ChatMessage[]>(); // conversationId -> messages
  private readonly maxChatHistory = 500;

  // Notifications
  private readonly notifications = new Map<string, Notification[]>(); // userId -> notifications
  private readonly maxNotifications = 100;

  // Presence
  private readonly presenceStatus = new Map<string, PresenceStatus>(); // userId -> status
  private readonly typingIndicators = new Map<string, TypingIndicator[]>(); // conversationId -> typing

  // Subscriptions
  private readonly topicSubscriptions = new Map<string, Set<string>>(); // topic -> clientIds

  // Metrics
  private metrics: ConnectionMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    messagesPerSecond: 0,
    messagesTotal: 0,
    roomsActive: 0,
    peakConnections: 0,
    peakConnectionsTime: new Date(),
    averageLatency: 0,
    uptime: 0,
  };
  private startTime = new Date();
  private messageCountLastSecond = 0;
  private metricsInterval?: NodeJS.Timeout;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Realtime Service');
    this.initializeSystemRooms();
    this.startMetricsCollection();
    this.startHeartbeatMonitor();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  private initializeSystemRooms(): void {
    const systemRoomConfigs = [
      { id: 'system:announcements', name: 'System Announcements', type: 'broadcast' as const },
      { id: 'system:maintenance', name: 'Maintenance Alerts', type: 'broadcast' as const },
      { id: 'dashboard:global', name: 'Global Dashboard', type: 'broadcast' as const },
    ];

    for (const config of systemRoomConfigs) {
      this.createRoom({
        ...config,
        persistent: true,
        metadata: { system: true },
      });
      this.systemRooms.add(config.id);
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.metrics.messagesPerSecond = this.messageCountLastSecond;
      this.messageCountLastSecond = 0;
      this.metrics.uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
      this.metrics.roomsActive = this.rooms.size;
    }, 1000);
  }

  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 60000; // 60 seconds

      for (const [clientId, client] of this.clients) {
        const elapsed = now.getTime() - client.lastHeartbeat.getTime();
        if (elapsed > timeout) {
          this.logger.warn(`Client ${clientId} timed out (${elapsed}ms since last heartbeat)`);
          this.disconnectClient(clientId, 'heartbeat_timeout');
        }
      }
    }, 30000);
  }

  // ============================================
  // CLIENT CONNECTION MANAGEMENT
  // ============================================

  connectClient(data: {
    socketId: string;
    userId: string;
    tenantId: string;
    roles: string[];
    metadata?: Record<string, any>;
  }): WebSocketClient {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const client: WebSocketClient = {
      id: clientId,
      socketId: data.socketId,
      userId: data.userId,
      tenantId: data.tenantId,
      roles: data.roles,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      presence: 'online',
      metadata: data.metadata || {},
      rooms: new Set(),
      subscriptions: new Set(),
    };

    this.clients.set(clientId, client);

    // Track by user
    if (!this.userToClients.has(data.userId)) {
      this.userToClients.set(data.userId, new Set());
    }
    this.userToClients.get(data.userId)!.add(clientId);

    // Track by tenant
    if (!this.tenantToClients.has(data.tenantId)) {
      this.tenantToClients.set(data.tenantId, new Set());
    }
    this.tenantToClients.get(data.tenantId)!.add(clientId);

    // Update presence
    this.presenceStatus.set(data.userId, 'online');

    // Auto-join tenant room
    const tenantRoom = `tenant:${data.tenantId}`;
    this.joinRoom(clientId, tenantRoom);

    // Join system rooms
    for (const systemRoom of this.systemRooms) {
      this.joinRoom(clientId, systemRoom);
    }

    // Update metrics
    this.metrics.totalConnections++;
    this.metrics.activeConnections = this.clients.size;
    if (this.clients.size > this.metrics.peakConnections) {
      this.metrics.peakConnections = this.clients.size;
      this.metrics.peakConnectionsTime = new Date();
    }

    // Deliver queued messages
    this.deliverQueuedMessages(data.userId);

    // Broadcast presence update
    this.broadcastPresenceUpdate(data.userId, 'online');

    this.logger.log(`Client ${clientId} connected (user: ${data.userId}, tenant: ${data.tenantId})`);

    return client;
  }

  disconnectClient(clientId: string, reason: string = 'client_disconnect'): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Leave all rooms
    for (const roomId of client.rooms) {
      this.leaveRoom(clientId, roomId);
    }

    // Unsubscribe from topics
    for (const topic of client.subscriptions) {
      this.unsubscribe(clientId, topic);
    }

    // Remove from user tracking
    const userClients = this.userToClients.get(client.userId);
    if (userClients) {
      userClients.delete(clientId);
      if (userClients.size === 0) {
        this.userToClients.delete(client.userId);
        this.presenceStatus.set(client.userId, 'offline');
        this.broadcastPresenceUpdate(client.userId, 'offline');
      }
    }

    // Remove from tenant tracking
    const tenantClients = this.tenantToClients.get(client.tenantId);
    if (tenantClients) {
      tenantClients.delete(clientId);
      if (tenantClients.size === 0) {
        this.tenantToClients.delete(client.tenantId);
      }
    }

    this.clients.delete(clientId);
    this.metrics.activeConnections = this.clients.size;

    this.logger.log(`Client ${clientId} disconnected (reason: ${reason})`);
  }

  heartbeat(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastHeartbeat = new Date();
    }
  }

  getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  getClientsByUser(userId: string): WebSocketClient[] {
    const clientIds = this.userToClients.get(userId);
    if (!clientIds) return [];
    return Array.from(clientIds)
      .map(id => this.clients.get(id))
      .filter((c): c is WebSocketClient => c !== undefined);
  }

  getClientsByTenant(tenantId: string): WebSocketClient[] {
    const clientIds = this.tenantToClients.get(tenantId);
    if (!clientIds) return [];
    return Array.from(clientIds)
      .map(id => this.clients.get(id))
      .filter((c): c is WebSocketClient => c !== undefined);
  }

  // ============================================
  // ROOM MANAGEMENT
  // ============================================

  createRoom(data: {
    id?: string;
    name: string;
    type: 'private' | 'public' | 'broadcast' | 'tenant';
    maxMembers?: number;
    persistent?: boolean;
    metadata?: Record<string, any>;
  }): Room {
    const roomId = data.id || `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const room: Room = {
      id: roomId,
      name: data.name,
      type: data.type,
      members: new Set(),
      createdAt: new Date(),
      metadata: data.metadata || {},
      maxMembers: data.maxMembers,
      persistent: data.persistent || false,
    };

    this.rooms.set(roomId, room);
    this.messageHistory.set(roomId, []);

    this.logger.log(`Room ${roomId} created (type: ${data.type})`);

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(clientId: string, roomId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    let room = this.rooms.get(roomId);

    // Auto-create tenant rooms
    if (!room && roomId.startsWith('tenant:')) {
      room = this.createRoom({
        id: roomId,
        name: `Tenant ${roomId.replace('tenant:', '')}`,
        type: 'tenant',
        persistent: true,
      });
    }

    if (!room) return false;

    if (room.maxMembers && room.members.size >= room.maxMembers) {
      return false;
    }

    room.members.add(clientId);
    client.rooms.add(roomId);

    // Send recent history
    const history = this.messageHistory.get(roomId) || [];
    const recentHistory = history.slice(-20);

    return true;
  }

  leaveRoom(clientId: string, roomId: string): boolean {
    const client = this.clients.get(clientId);
    const room = this.rooms.get(roomId);

    if (!client || !room) return false;

    room.members.delete(clientId);
    client.rooms.delete(roomId);

    // Clean up empty non-persistent rooms
    if (room.members.size === 0 && !room.persistent) {
      this.rooms.delete(roomId);
      this.messageHistory.delete(roomId);
    }

    return true;
  }

  getRoomMembers(roomId: string): WebSocketClient[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.members)
      .map(id => this.clients.get(id))
      .filter((c): c is WebSocketClient => c !== undefined);
  }

  // ============================================
  // MESSAGING
  // ============================================

  sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'delivered' | 'read'>): Message {
    const fullMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...message,
      timestamp: new Date(),
      delivered: false,
      read: false,
    };

    this.metrics.messagesTotal++;
    this.messageCountLastSecond++;

    if (message.roomId) {
      // Room message
      this.broadcastToRoom(message.roomId, fullMessage);

      // Store in history
      const history = this.messageHistory.get(message.roomId) || [];
      history.push(fullMessage);
      if (history.length > this.maxHistoryPerRoom) {
        history.shift();
      }
      this.messageHistory.set(message.roomId, history);
    } else if (message.recipientId) {
      // Direct message
      this.sendToUser(message.recipientId, fullMessage);
    }

    return fullMessage;
  }

  broadcastToRoom(roomId: string, message: Message): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const clientId of room.members) {
      const client = this.clients.get(clientId);
      if (client && client.userId !== message.senderId) {
        // In real implementation, emit via WebSocket
        message.delivered = true;
      }
    }
  }

  sendToUser(userId: string, message: Message): void {
    const clients = this.getClientsByUser(userId);

    if (clients.length === 0) {
      // User offline - queue message
      const queue = this.messageQueue.get(userId) || [];
      queue.push(message);
      this.messageQueue.set(userId, queue);
      return;
    }

    for (const client of clients) {
      // In real implementation, emit via WebSocket
      message.delivered = true;
    }
  }

  broadcastToTenant(tenantId: string, message: Message): void {
    const clients = this.getClientsByTenant(tenantId);

    for (const client of clients) {
      if (client.userId !== message.senderId) {
        // In real implementation, emit via WebSocket
        message.delivered = true;
      }
    }
  }

  broadcastToAll(message: Message): void {
    for (const client of this.clients.values()) {
      if (client.userId !== message.senderId) {
        // In real implementation, emit via WebSocket
        message.delivered = true;
      }
    }
  }

  private deliverQueuedMessages(userId: string): void {
    const queue = this.messageQueue.get(userId);
    if (!queue || queue.length === 0) return;

    const clients = this.getClientsByUser(userId);
    if (clients.length === 0) return;

    for (const message of queue) {
      this.sendToUser(userId, message);
    }

    this.messageQueue.delete(userId);
    this.logger.log(`Delivered ${queue.length} queued messages to user ${userId}`);
  }

  // ============================================
  // CHAT SYSTEM
  // ============================================

  createConversation(data: {
    type: 'direct' | 'group' | 'channel';
    name?: string;
    description?: string;
    createdBy: string;
    participants: { userId: string; userName: string }[];
    metadata?: Record<string, any>;
  }): Conversation {
    // For direct conversations, check if one already exists
    if (data.type === 'direct' && data.participants.length === 2) {
      const existing = this.findDirectConversation(
        data.participants[0].userId,
        data.participants[1].userId
      );
      if (existing) return existing;
    }

    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const conversation: Conversation = {
      id: conversationId,
      type: data.type,
      name: data.name,
      description: data.description,
      participants: data.participants.map(p => ({
        ...p,
        role: p.userId === data.createdBy ? 'admin' as const : 'member' as const,
        joinedAt: new Date(),
        muted: false,
      })),
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      unreadCount: new Map(),
      pinned: false,
      archived: false,
      metadata: data.metadata || {},
    };

    this.conversations.set(conversationId, conversation);
    this.chatMessages.set(conversationId, []);
    this.typingIndicators.set(conversationId, []);

    return conversation;
  }

  private findDirectConversation(userId1: string, userId2: string): Conversation | undefined {
    for (const conv of this.conversations.values()) {
      if (conv.type !== 'direct') continue;
      const participantIds = conv.participants.map(p => p.userId);
      if (participantIds.includes(userId1) && participantIds.includes(userId2)) {
        return conv;
      }
    }
    return undefined;
  }

  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  getUserConversations(userId: string): Conversation[] {
    return Array.from(this.conversations.values())
      .filter(c => c.participants.some(p => p.userId === userId))
      .filter(c => !c.archived)
      .sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || a.updatedAt;
        const bTime = b.lastMessage?.timestamp || b.updatedAt;
        return bTime.getTime() - aTime.getTime();
      });
  }

  sendChatMessage(data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    content: string;
    contentType?: 'text' | 'image' | 'file' | 'audio' | 'video' | 'location';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    replyTo?: string;
  }): ChatMessage {
    const conversation = this.conversations.get(data.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const messageId = `chatmsg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const message: ChatMessage = {
      id: messageId,
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      contentType: data.contentType || 'text',
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      replyTo: data.replyTo,
      reactions: [],
      edited: false,
      deleted: false,
      timestamp: new Date(),
      readBy: [{ userId: data.senderId, readAt: new Date() }],
    };

    // Store message
    const messages = this.chatMessages.get(data.conversationId) || [];
    messages.push(message);
    if (messages.length > this.maxChatHistory) {
      messages.shift();
    }
    this.chatMessages.set(data.conversationId, messages);

    // Update conversation
    conversation.lastMessage = message;
    conversation.updatedAt = new Date();

    // Update unread counts
    for (const participant of conversation.participants) {
      if (participant.userId !== data.senderId) {
        const current = conversation.unreadCount.get(participant.userId) || 0;
        conversation.unreadCount.set(participant.userId, current + 1);
      }
    }

    // Clear typing indicator
    this.clearTypingIndicator(data.conversationId, data.senderId);

    // Notify participants
    for (const participant of conversation.participants) {
      if (participant.userId !== data.senderId) {
        this.sendToUser(participant.userId, {
          id: `msg-${Date.now()}`,
          type: 'chat',
          senderId: data.senderId,
          recipientId: participant.userId,
          content: message,
          timestamp: new Date(),
          delivered: false,
          read: false,
          priority: 'normal',
        });
      }
    }

    this.metrics.messagesTotal++;
    this.messageCountLastSecond++;

    return message;
  }

  getChatMessages(conversationId: string, limit: number = 50, before?: Date): ChatMessage[] {
    const messages = this.chatMessages.get(conversationId) || [];

    let filtered = messages.filter(m => !m.deleted);

    if (before) {
      filtered = filtered.filter(m => m.timestamp < before);
    }

    return filtered.slice(-limit);
  }

  markConversationAsRead(conversationId: string, userId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    const participant = conversation.participants.find(p => p.userId === userId);
    if (participant) {
      participant.lastReadAt = new Date();
    }

    conversation.unreadCount.set(userId, 0);

    // Mark messages as read
    const messages = this.chatMessages.get(conversationId) || [];
    for (const message of messages) {
      if (!message.readBy.some(r => r.userId === userId)) {
        message.readBy.push({ userId, readAt: new Date() });
      }
    }

    // Send read receipt
    const otherParticipants = conversation.participants.filter(p => p.userId !== userId);
    for (const participant of otherParticipants) {
      this.sendToUser(participant.userId, {
        id: `msg-${Date.now()}`,
        type: 'read_receipt',
        senderId: userId,
        recipientId: participant.userId,
        content: { conversationId, userId, readAt: new Date() },
        timestamp: new Date(),
        delivered: false,
        read: false,
        priority: 'low',
      });
    }
  }

  setTypingIndicator(conversationId: string, userId: string, userName: string, isTyping: boolean): void {
    const indicators = this.typingIndicators.get(conversationId) || [];

    const existingIndex = indicators.findIndex(i => i.userId === userId);

    if (isTyping) {
      const indicator: TypingIndicator = {
        conversationId,
        userId,
        userName,
        isTyping: true,
        timestamp: new Date(),
      };

      if (existingIndex >= 0) {
        indicators[existingIndex] = indicator;
      } else {
        indicators.push(indicator);
      }
    } else if (existingIndex >= 0) {
      indicators.splice(existingIndex, 1);
    }

    this.typingIndicators.set(conversationId, indicators);

    // Broadcast typing status
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      for (const participant of conversation.participants) {
        if (participant.userId !== userId) {
          this.sendToUser(participant.userId, {
            id: `msg-${Date.now()}`,
            type: 'typing',
            senderId: userId,
            recipientId: participant.userId,
            content: { conversationId, userId, userName, isTyping },
            timestamp: new Date(),
            delivered: false,
            read: false,
            priority: 'low',
          });
        }
      }
    }
  }

  private clearTypingIndicator(conversationId: string, userId: string): void {
    const indicators = this.typingIndicators.get(conversationId) || [];
    const filtered = indicators.filter(i => i.userId !== userId);
    this.typingIndicators.set(conversationId, filtered);
  }

  getTypingIndicators(conversationId: string): TypingIndicator[] {
    const indicators = this.typingIndicators.get(conversationId) || [];
    const now = Date.now();
    // Only return indicators from last 5 seconds
    return indicators.filter(i => now - i.timestamp.getTime() < 5000);
  }

  addReaction(conversationId: string, messageId: string, userId: string, emoji: string): void {
    const messages = this.chatMessages.get(conversationId) || [];
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      if (!existingReaction.userIds.includes(userId)) {
        existingReaction.userIds.push(userId);
      }
    } else {
      message.reactions.push({ emoji, userIds: [userId] });
    }
  }

  removeReaction(conversationId: string, messageId: string, userId: string, emoji: string): void {
    const messages = this.chatMessages.get(conversationId) || [];
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const reaction = message.reactions.find(r => r.emoji === emoji);
    if (reaction) {
      reaction.userIds = reaction.userIds.filter(id => id !== userId);
      if (reaction.userIds.length === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  sendNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): Notification {
    const fullNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      read: false,
      createdAt: new Date(),
    };

    // Store notification
    const userNotifications = this.notifications.get(notification.userId) || [];
    userNotifications.unshift(fullNotification);
    if (userNotifications.length > this.maxNotifications) {
      userNotifications.pop();
    }
    this.notifications.set(notification.userId, userNotifications);

    // Send real-time
    this.sendToUser(notification.userId, {
      id: `msg-${Date.now()}`,
      type: 'notification',
      senderId: 'system',
      recipientId: notification.userId,
      content: fullNotification,
      timestamp: new Date(),
      delivered: false,
      read: false,
      priority: notification.priority,
    });

    return fullNotification;
  }

  getUserNotifications(userId: string, unreadOnly: boolean = false): Notification[] {
    const notifications = this.notifications.get(userId) || [];
    if (unreadOnly) {
      return notifications.filter(n => !n.read);
    }
    return notifications;
  }

  markNotificationAsRead(notificationId: string, userId: string): boolean {
    const notifications = this.notifications.get(userId);
    if (!notifications) return false;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return false;

    notification.read = true;
    notification.readAt = new Date();
    return true;
  }

  markAllNotificationsAsRead(userId: string): number {
    const notifications = this.notifications.get(userId);
    if (!notifications) return 0;

    let count = 0;
    for (const notification of notifications) {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date();
        count++;
      }
    }
    return count;
  }

  getUnreadNotificationCount(userId: string): number {
    const notifications = this.notifications.get(userId) || [];
    return notifications.filter(n => !n.read).length;
  }

  // ============================================
  // PRESENCE
  // ============================================

  setPresence(userId: string, status: PresenceStatus): void {
    const previousStatus = this.presenceStatus.get(userId);
    if (previousStatus === status) return;

    this.presenceStatus.set(userId, status);
    this.broadcastPresenceUpdate(userId, status);
  }

  getPresence(userId: string): PresenceStatus {
    return this.presenceStatus.get(userId) || 'offline';
  }

  getPresenceForUsers(userIds: string[]): Map<string, PresenceStatus> {
    const result = new Map<string, PresenceStatus>();
    for (const userId of userIds) {
      result.set(userId, this.presenceStatus.get(userId) || 'offline');
    }
    return result;
  }

  private broadcastPresenceUpdate(userId: string, status: PresenceStatus): void {
    // Get all clients that might be interested (e.g., users who have conversations with this user)
    const conversations = this.getUserConversations(userId);
    const interestedUsers = new Set<string>();

    for (const conv of conversations) {
      for (const participant of conv.participants) {
        if (participant.userId !== userId) {
          interestedUsers.add(participant.userId);
        }
      }
    }

    for (const interestedUserId of interestedUsers) {
      this.sendToUser(interestedUserId, {
        id: `msg-${Date.now()}`,
        type: 'presence',
        senderId: userId,
        recipientId: interestedUserId,
        content: { userId, status },
        timestamp: new Date(),
        delivered: false,
        read: false,
        priority: 'low',
      });
    }
  }

  getOnlineUsers(tenantId?: string): { userId: string; status: PresenceStatus }[] {
    const result: { userId: string; status: PresenceStatus }[] = [];

    if (tenantId) {
      const clients = this.getClientsByTenant(tenantId);
      const seen = new Set<string>();
      for (const client of clients) {
        if (!seen.has(client.userId)) {
          result.push({
            userId: client.userId,
            status: this.presenceStatus.get(client.userId) || 'online',
          });
          seen.add(client.userId);
        }
      }
    } else {
      for (const [userId, status] of this.presenceStatus) {
        if (status !== 'offline') {
          result.push({ userId, status });
        }
      }
    }

    return result;
  }

  // ============================================
  // SUBSCRIPTIONS (Topics/Channels)
  // ============================================

  subscribe(clientId: string, topic: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    if (!this.topicSubscriptions.has(topic)) {
      this.topicSubscriptions.set(topic, new Set());
    }
    this.topicSubscriptions.get(topic)!.add(clientId);
    client.subscriptions.add(topic);

    return true;
  }

  unsubscribe(clientId: string, topic: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    const subscribers = this.topicSubscriptions.get(topic);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.topicSubscriptions.delete(topic);
      }
    }
    client.subscriptions.delete(topic);

    return true;
  }

  publishToTopic(topic: string, message: Omit<Message, 'id' | 'timestamp' | 'delivered' | 'read'>): void {
    const subscribers = this.topicSubscriptions.get(topic);
    if (!subscribers) return;

    const fullMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...message,
      timestamp: new Date(),
      delivered: false,
      read: false,
    };

    this.metrics.messagesTotal++;
    this.messageCountLastSecond++;

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.userId !== message.senderId) {
        // In real implementation, emit via WebSocket
        fullMessage.delivered = true;
      }
    }
  }

  getTopicSubscribers(topic: string): WebSocketClient[] {
    const subscribers = this.topicSubscriptions.get(topic);
    if (!subscribers) return [];

    return Array.from(subscribers)
      .map(id => this.clients.get(id))
      .filter((c): c is WebSocketClient => c !== undefined);
  }

  // ============================================
  // DASHBOARD UPDATES
  // ============================================

  sendDashboardUpdate(update: DashboardUpdate): void {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'dashboard_update',
      senderId: 'system',
      content: update,
      timestamp: new Date(),
      delivered: false,
      read: false,
      priority: 'normal',
    };

    if (update.affectedUsers) {
      for (const userId of update.affectedUsers) {
        this.sendToUser(userId, { ...message, recipientId: userId });
      }
    } else if (update.affectedTenants) {
      for (const tenantId of update.affectedTenants) {
        this.broadcastToTenant(tenantId, message);
      }
    } else {
      // Broadcast to dashboard room
      this.broadcastToRoom('dashboard:global', message);
    }
  }

  sendInvoiceUpdate(invoiceId: string, action: string, data: any, tenantId: string): void {
    this.sendDashboardUpdate({
      type: 'invoice_update',
      module: 'finance',
      data: { invoiceId, action, ...data },
      timestamp: new Date(),
      affectedTenants: [tenantId],
    });
  }

  sendHRUpdate(employeeId: string, action: string, data: any, tenantId: string): void {
    this.sendDashboardUpdate({
      type: 'hr_update',
      module: 'hr',
      data: { employeeId, action, ...data },
      timestamp: new Date(),
      affectedTenants: [tenantId],
    });
  }

  sendHSEAlert(alert: { type: string; severity: string; location?: string; description: string }, tenantId: string, userIds?: string[]): void {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'hse_alert',
      senderId: 'system',
      content: alert,
      timestamp: new Date(),
      delivered: false,
      read: false,
      priority: alert.severity === 'critical' ? 'urgent' : 'high',
    };

    if (userIds) {
      for (const userId of userIds) {
        this.sendToUser(userId, { ...message, recipientId: userId });
      }
    } else {
      this.broadcastToTenant(tenantId, message);
    }
  }

  sendLogisticsUpdate(shipmentId: string, status: string, location: any, tenantId: string): void {
    this.sendDashboardUpdate({
      type: 'logistics_update',
      module: 'logistics',
      data: { shipmentId, status, location },
      timestamp: new Date(),
      affectedTenants: [tenantId],
    });
  }

  // ============================================
  // METRICS
  // ============================================

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  getDetailedMetrics(): {
    connections: ConnectionMetrics;
    rooms: { total: number; byType: Record<string, number> };
    messages: { total: number; queued: number; historySize: number };
    notifications: { total: number; unread: number };
    conversations: { total: number; messages: number };
    presence: { online: number; away: number; busy: number; offline: number };
  } {
    // Room stats
    const roomsByType: Record<string, number> = { private: 0, public: 0, broadcast: 0, tenant: 0 };
    for (const room of this.rooms.values()) {
      roomsByType[room.type]++;
    }

    // Message stats
    let historySize = 0;
    for (const history of this.messageHistory.values()) {
      historySize += history.length;
    }

    let queuedMessages = 0;
    for (const queue of this.messageQueue.values()) {
      queuedMessages += queue.length;
    }

    // Notification stats
    let totalNotifications = 0;
    let unreadNotifications = 0;
    for (const notifs of this.notifications.values()) {
      totalNotifications += notifs.length;
      unreadNotifications += notifs.filter(n => !n.read).length;
    }

    // Chat stats
    let totalChatMessages = 0;
    for (const msgs of this.chatMessages.values()) {
      totalChatMessages += msgs.length;
    }

    // Presence stats
    const presenceStats = { online: 0, away: 0, busy: 0, offline: 0 };
    for (const status of this.presenceStatus.values()) {
      presenceStats[status]++;
    }

    return {
      connections: this.metrics,
      rooms: {
        total: this.rooms.size,
        byType: roomsByType,
      },
      messages: {
        total: this.metrics.messagesTotal,
        queued: queuedMessages,
        historySize,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
      conversations: {
        total: this.conversations.size,
        messages: totalChatMessages,
      },
      presence: presenceStats,
    };
  }

  // ============================================
  // SYSTEM
  // ============================================

  sendSystemAnnouncement(title: string, body: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'): void {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      roomId: 'system:announcements',
      senderId: 'system',
      content: { title, body },
      timestamp: new Date(),
      delivered: false,
      read: false,
      priority,
    };

    this.broadcastToRoom('system:announcements', message);
  }

  sendMaintenanceAlert(message: string, scheduledAt?: Date, estimatedDuration?: number): void {
    const alertMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      roomId: 'system:maintenance',
      senderId: 'system',
      content: {
        type: 'maintenance',
        message,
        scheduledAt,
        estimatedDuration,
      },
      timestamp: new Date(),
      delivered: false,
      read: false,
      priority: 'high',
    };

    this.broadcastToRoom('system:maintenance', alertMessage);
  }

  // Reset for testing
  resetState(): void {
    this.clients.clear();
    this.userToClients.clear();
    this.tenantToClients.clear();
    this.rooms.clear();
    this.systemRooms.clear();
    this.messageQueue.clear();
    this.messageHistory.clear();
    this.conversations.clear();
    this.chatMessages.clear();
    this.notifications.clear();
    this.presenceStatus.clear();
    this.typingIndicators.clear();
    this.topicSubscriptions.clear();
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesPerSecond: 0,
      messagesTotal: 0,
      roomsActive: 0,
      peakConnections: 0,
      peakConnectionsTime: new Date(),
      averageLatency: 0,
      uptime: 0,
    };
    this.initializeSystemRooms();
  }
}
