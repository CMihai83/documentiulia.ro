import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Driver Notifications Service
 * Push notifications and messaging for driver mobile app.
 *
 * Features:
 * - Push notification management
 * - Dispatcher-driver chat
 * - Route assignment notifications
 * - Emergency broadcasts
 * - Notification preferences
 */

export type NotificationType =
  | 'ROUTE_ASSIGNED'
  | 'ROUTE_UPDATED'
  | 'URGENT_DELIVERY'
  | 'DISPATCH_MESSAGE'
  | 'EMERGENCY_ALERT'
  | 'BREAK_REMINDER'
  | 'TRAFFIC_ALERT'
  | 'CUSTOMER_FEEDBACK'
  | 'MAINTENANCE_DUE'
  | 'SYSTEM';

export interface PushNotification {
  id: string;
  driverId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  read: boolean;
  sentAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'DRIVER' | 'DISPATCHER' | 'ADMIN';
  content: string;
  attachments?: {
    type: 'IMAGE' | 'DOCUMENT';
    url: string;
    name: string;
  }[];
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface Conversation {
  id: string;
  driverId: string;
  driverName: string;
  dispatcherId?: string;
  dispatcherName?: string;
  subject?: string;
  routeId?: string;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  lastMessageAt: Date;
  unreadCount: number;
  createdAt: Date;
}

export interface NotificationPreferences {
  driverId: string;
  pushEnabled: boolean;
  routeAssignments: boolean;
  urgentDeliveries: boolean;
  breakReminders: boolean;
  trafficAlerts: boolean;
  customerFeedback: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;
  };
  deviceTokens: {
    platform: 'IOS' | 'ANDROID';
    token: string;
    lastActive: Date;
  }[];
}

export interface BroadcastMessage {
  id: string;
  userId: string;
  targetType: 'ALL_DRIVERS' | 'ROUTE_DRIVERS' | 'SPECIFIC_DRIVERS';
  targetIds?: string[];
  routeId?: string;
  title: string;
  body: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  sentAt: Date;
  deliveredCount: number;
  readCount: number;
}

@Injectable()
export class DriverNotificationsService {
  private readonly logger = new Logger(DriverNotificationsService.name);

  // In-memory stores
  private notifications: Map<string, PushNotification[]> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private broadcasts: Map<string, BroadcastMessage[]> = new Map();

  private notificationCounter = 0;
  private messageCounter = 0;
  private conversationCounter = 0;
  private broadcastCounter = 0;

  constructor(private readonly prisma: PrismaService) {}

  // =================== PUSH NOTIFICATIONS ===================

  /**
   * Send push notification to driver
   */
  async sendNotification(
    driverId: string,
    notification: {
      type: NotificationType;
      title: string;
      body: string;
      data?: Record<string, any>;
      priority?: PushNotification['priority'];
      expiresAt?: Date;
    },
  ): Promise<PushNotification> {
    // Check preferences
    const prefs = await this.getPreferences(driverId);
    if (!prefs.pushEnabled) {
      this.logger.debug(`Push disabled for driver ${driverId}`);
    }

    // Check quiet hours
    if (prefs.quietHours.enabled && notification.priority !== 'URGENT') {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { start, end } = prefs.quietHours;

      if (this.isInQuietHours(currentTime, start, end)) {
        this.logger.debug(`Notification delayed due to quiet hours for driver ${driverId}`);
      }
    }

    const pushNotification: PushNotification = {
      id: `notif-${++this.notificationCounter}-${Date.now()}`,
      driverId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority: notification.priority || 'NORMAL',
      read: false,
      sentAt: new Date(),
      expiresAt: notification.expiresAt,
    };

    const driverNotifications = this.notifications.get(driverId) || [];
    driverNotifications.unshift(pushNotification);
    this.notifications.set(driverId, driverNotifications.slice(0, 100)); // Keep last 100

    this.logger.log(`Notification sent to driver ${driverId}: ${notification.title}`);

    // In real implementation: send via FCM/APNs
    // await this.pushToDevice(driverId, pushNotification);

    return pushNotification;
  }

  /**
   * Get notifications for driver
   */
  async getNotifications(
    driverId: string,
    options?: { unreadOnly?: boolean; type?: NotificationType; limit?: number },
  ): Promise<PushNotification[]> {
    let notifications = this.notifications.get(driverId) || [];

    // Filter expired
    const now = new Date();
    notifications = notifications.filter(n => !n.expiresAt || n.expiresAt > now);

    if (options?.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    if (options?.type) {
      notifications = notifications.filter(n => n.type === options.type);
    }

    return notifications.slice(0, options?.limit || 50);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(driverId: string, notificationId: string): Promise<void> {
    const notifications = this.notifications.get(driverId) || [];
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date();
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(driverId: string): Promise<number> {
    const notifications = this.notifications.get(driverId) || [];
    let count = 0;
    notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        n.readAt = new Date();
        count++;
      }
    });
    return count;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(driverId: string): Promise<number> {
    const notifications = this.notifications.get(driverId) || [];
    return notifications.filter(n => !n.read).length;
  }

  // =================== ROUTE NOTIFICATIONS ===================

  /**
   * Notify driver of new route assignment
   */
  async notifyRouteAssignment(
    driverId: string,
    routeId: string,
    routeName: string,
    stopsCount: number,
  ): Promise<PushNotification> {
    return this.sendNotification(driverId, {
      type: 'ROUTE_ASSIGNED',
      title: 'Neue Route zugewiesen',
      body: `${routeName}: ${stopsCount} Stopps für heute`,
      data: { routeId, routeName, stopsCount },
      priority: 'HIGH',
    });
  }

  /**
   * Notify driver of route update
   */
  async notifyRouteUpdate(
    driverId: string,
    routeId: string,
    updateType: 'STOP_ADDED' | 'STOP_REMOVED' | 'REORDERED' | 'CANCELLED',
    details?: string,
  ): Promise<PushNotification> {
    const messages = {
      STOP_ADDED: 'Neuer Stopp hinzugefügt',
      STOP_REMOVED: 'Stopp entfernt',
      REORDERED: 'Route wurde neu geordnet',
      CANCELLED: 'Route wurde storniert',
    };

    return this.sendNotification(driverId, {
      type: 'ROUTE_UPDATED',
      title: 'Route aktualisiert',
      body: details || messages[updateType],
      data: { routeId, updateType },
      priority: updateType === 'CANCELLED' ? 'HIGH' : 'NORMAL',
    });
  }

  /**
   * Notify driver of urgent delivery
   */
  async notifyUrgentDelivery(
    driverId: string,
    stopId: string,
    recipientName: string,
    deadline: Date,
  ): Promise<PushNotification> {
    const timeLeft = Math.round((deadline.getTime() - Date.now()) / 60000);

    return this.sendNotification(driverId, {
      type: 'URGENT_DELIVERY',
      title: 'Dringende Lieferung!',
      body: `${recipientName} muss bis ${deadline.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} zugestellt werden (${timeLeft} Min.)`,
      data: { stopId, recipientName, deadline: deadline.toISOString() },
      priority: 'URGENT',
    });
  }

  // =================== DRIVER-DISPATCHER CHAT ===================

  /**
   * Start or get conversation
   */
  async getOrCreateConversation(
    driverId: string,
    dispatcherId?: string,
    subject?: string,
    routeId?: string,
  ): Promise<Conversation> {
    // Check for existing active conversation
    const existing = Array.from(this.conversations.values()).find(
      c =>
        c.driverId === driverId &&
        c.status === 'ACTIVE' &&
        (routeId ? c.routeId === routeId : true),
    );

    if (existing) return existing;

    // Get driver and dispatcher names
    const driver = await this.prisma.employee.findFirst({
      where: { id: driverId },
      select: { firstName: true, lastName: true },
    });

    let dispatcherName = 'Disposition';
    if (dispatcherId) {
      const dispatcher = await this.prisma.user.findUnique({
        where: { id: dispatcherId },
        select: { name: true },
      });
      dispatcherName = dispatcher?.name || 'Disposition';
    }

    const conversation: Conversation = {
      id: `conv-${++this.conversationCounter}-${Date.now()}`,
      driverId,
      driverName: driver ? `${driver.firstName} ${driver.lastName}` : 'Fahrer',
      dispatcherId,
      dispatcherName,
      subject,
      routeId,
      status: 'ACTIVE',
      lastMessageAt: new Date(),
      unreadCount: 0,
      createdAt: new Date(),
    };

    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);

    return conversation;
  }

  /**
   * Get conversations for driver
   */
  async getDriverConversations(driverId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(c => c.driverId === driverId && c.status !== 'ARCHIVED')
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  /**
   * Get conversations for dispatcher
   */
  async getDispatcherConversations(dispatcherId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(c => (c.dispatcherId === dispatcherId || !c.dispatcherId) && c.status === 'ACTIVE')
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  /**
   * Send message in conversation
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderRole: ChatMessage['senderRole'],
    content: string,
    attachments?: ChatMessage['attachments'],
  ): Promise<ChatMessage> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get sender name
    let senderName = 'Unbekannt';
    if (senderRole === 'DRIVER') {
      const driver = await this.prisma.employee.findFirst({
        where: { id: senderId },
        select: { firstName: true, lastName: true },
      });
      senderName = driver ? `${driver.firstName} ${driver.lastName}` : 'Fahrer';
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: { name: true },
      });
      senderName = user?.name || 'Disposition';
    }

    const message: ChatMessage = {
      id: `msg-${++this.messageCounter}-${Date.now()}`,
      conversationId,
      senderId,
      senderName,
      senderRole,
      content,
      attachments,
      sentAt: new Date(),
    };

    const conversationMessages = this.messages.get(conversationId) || [];
    conversationMessages.push(message);
    this.messages.set(conversationId, conversationMessages);

    // Update conversation
    conversation.lastMessageAt = new Date();
    if (senderRole === 'DRIVER' && conversation.dispatcherId) {
      // Notify dispatcher
    } else if (senderRole !== 'DRIVER') {
      conversation.unreadCount++;
      // Notify driver
      await this.sendNotification(conversation.driverId, {
        type: 'DISPATCH_MESSAGE',
        title: 'Neue Nachricht von Disposition',
        body: content.substring(0, 100),
        data: { conversationId, messageId: message.id },
        priority: 'NORMAL',
      });
    }

    return message;
  }

  /**
   * Get messages in conversation
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: Date },
  ): Promise<ChatMessage[]> {
    let messages = this.messages.get(conversationId) || [];

    if (options?.before) {
      messages = messages.filter(m => m.sentAt < options.before!);
    }

    return messages
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, options?.limit || 50)
      .reverse();
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    conversationId: string,
    readerId: string,
  ): Promise<number> {
    const conversation = this.conversations.get(conversationId);
    const messages = this.messages.get(conversationId) || [];

    let count = 0;
    messages.forEach(m => {
      if (m.senderId !== readerId && !m.readAt) {
        m.readAt = new Date();
        count++;
      }
    });

    if (conversation) {
      conversation.unreadCount = 0;
    }

    return count;
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'CLOSED';
    }
  }

  // =================== BROADCAST MESSAGES ===================

  /**
   * Send broadcast to drivers
   */
  async sendBroadcast(
    userId: string,
    broadcast: {
      targetType: BroadcastMessage['targetType'];
      targetIds?: string[];
      routeId?: string;
      title: string;
      body: string;
      priority?: BroadcastMessage['priority'];
    },
  ): Promise<BroadcastMessage> {
    let targetDriverIds: string[] = [];

    if (broadcast.targetType === 'ALL_DRIVERS') {
      const drivers = await this.prisma.employee.findMany({
        where: { userId },
        select: { id: true },
      });
      targetDriverIds = drivers.map(d => d.id);
    } else if (broadcast.targetType === 'ROUTE_DRIVERS' && broadcast.routeId) {
      const routes = await this.prisma.deliveryRoute.findMany({
        where: {
          userId,
          id: broadcast.routeId,
        },
        select: { driverId: true },
      });
      targetDriverIds = routes.filter(r => r.driverId).map(r => r.driverId!);
    } else if (broadcast.targetType === 'SPECIFIC_DRIVERS' && broadcast.targetIds) {
      targetDriverIds = broadcast.targetIds;
    }

    const broadcastMsg: BroadcastMessage = {
      id: `bcast-${++this.broadcastCounter}-${Date.now()}`,
      userId,
      targetType: broadcast.targetType,
      targetIds: broadcast.targetIds,
      routeId: broadcast.routeId,
      title: broadcast.title,
      body: broadcast.body,
      priority: broadcast.priority || 'NORMAL',
      sentAt: new Date(),
      deliveredCount: 0,
      readCount: 0,
    };

    // Send notifications to all targets
    for (const driverId of targetDriverIds) {
      await this.sendNotification(driverId, {
        type: 'DISPATCH_MESSAGE',
        title: broadcast.title,
        body: broadcast.body,
        data: { broadcastId: broadcastMsg.id },
        priority: broadcast.priority || 'NORMAL',
      });
      broadcastMsg.deliveredCount++;
    }

    const userBroadcasts = this.broadcasts.get(userId) || [];
    userBroadcasts.unshift(broadcastMsg);
    this.broadcasts.set(userId, userBroadcasts.slice(0, 50));

    this.logger.log(`Broadcast sent to ${targetDriverIds.length} drivers: ${broadcast.title}`);

    return broadcastMsg;
  }

  /**
   * Get broadcast history
   */
  async getBroadcastHistory(userId: string, limit: number = 20): Promise<BroadcastMessage[]> {
    return (this.broadcasts.get(userId) || []).slice(0, limit);
  }

  // =================== EMERGENCY ALERTS ===================

  /**
   * Send emergency alert to all drivers
   */
  async sendEmergencyAlert(
    userId: string,
    message: string,
    instructions?: string,
  ): Promise<{ sentTo: number }> {
    const drivers = await this.prisma.employee.findMany({
      where: { userId },
      select: { id: true },
    });

    for (const driver of drivers) {
      await this.sendNotification(driver.id, {
        type: 'EMERGENCY_ALERT',
        title: '⚠️ NOTFALL ALARM',
        body: message,
        data: { instructions },
        priority: 'URGENT',
      });
    }

    this.logger.warn(`Emergency alert sent to ${drivers.length} drivers: ${message}`);

    return { sentTo: drivers.length };
  }

  /**
   * Send driver SOS alert to dispatchers
   */
  async sendDriverSOS(
    driverId: string,
    location: { lat: number; lng: number },
    reason?: string,
  ): Promise<void> {
    const driver = await this.prisma.employee.findFirst({
      where: { id: driverId },
      include: { user: true },
    });

    if (!driver?.userId) return;

    // Get all admin users (dispatchers)
    // In real app, would have dedicated dispatcher role
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    this.logger.error(`SOS from driver ${driverId}: ${reason || 'No reason provided'}`);

    // In real implementation: trigger alerts to dispatchers
    // await this.alertDispatchers(driver, location, reason);
  }

  // =================== NOTIFICATION PREFERENCES ===================

  /**
   * Get notification preferences
   */
  async getPreferences(driverId: string): Promise<NotificationPreferences> {
    const existing = this.preferences.get(driverId);
    if (existing) return existing;

    const defaults: NotificationPreferences = {
      driverId,
      pushEnabled: true,
      routeAssignments: true,
      urgentDeliveries: true,
      breakReminders: true,
      trafficAlerts: true,
      customerFeedback: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
      deviceTokens: [],
    };

    this.preferences.set(driverId, defaults);
    return defaults;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    driverId: string,
    updates: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const prefs = await this.getPreferences(driverId);
    Object.assign(prefs, updates);
    this.preferences.set(driverId, prefs);
    return prefs;
  }

  /**
   * Register device token
   */
  async registerDeviceToken(
    driverId: string,
    platform: 'IOS' | 'ANDROID',
    token: string,
  ): Promise<void> {
    const prefs = await this.getPreferences(driverId);

    // Remove old token if exists
    prefs.deviceTokens = prefs.deviceTokens.filter(t => t.token !== token);

    // Add new token
    prefs.deviceTokens.push({
      platform,
      token,
      lastActive: new Date(),
    });

    // Keep only last 3 tokens per platform
    const iosTokens = prefs.deviceTokens.filter(t => t.platform === 'IOS').slice(-3);
    const androidTokens = prefs.deviceTokens.filter(t => t.platform === 'ANDROID').slice(-3);
    prefs.deviceTokens = [...iosTokens, ...androidTokens];

    this.logger.debug(`Device token registered for driver ${driverId}: ${platform}`);
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(driverId: string, token: string): Promise<void> {
    const prefs = await this.getPreferences(driverId);
    prefs.deviceTokens = prefs.deviceTokens.filter(t => t.token !== token);
  }

  // =================== DASHBOARD ===================

  /**
   * Get notification dashboard for dispatcher
   */
  async getNotificationsDashboard(userId: string): Promise<{
    activeConversations: number;
    unreadMessages: number;
    recentBroadcasts: number;
    driversOnline: number;
    driversPushEnabled: number;
  }> {
    const conversations = await this.getDispatcherConversations(userId);
    const broadcasts = await this.getBroadcastHistory(userId, 5);

    // Get all driver preferences
    const drivers = await this.prisma.employee.findMany({
      where: { userId },
      select: { id: true },
    });

    let pushEnabledCount = 0;
    for (const driver of drivers) {
      const prefs = await this.getPreferences(driver.id);
      if (prefs.pushEnabled && prefs.deviceTokens.length > 0) {
        pushEnabledCount++;
      }
    }

    return {
      activeConversations: conversations.filter(c => c.status === 'ACTIVE').length,
      unreadMessages: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
      recentBroadcasts: broadcasts.length,
      driversOnline: drivers.length, // Would check lastActive in real implementation
      driversPushEnabled: pushEnabledCount,
    };
  }

  // =================== HELPERS ===================

  private isInQuietHours(current: string, start: string, end: string): boolean {
    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (start > end) {
      return current >= start || current < end;
    }
    return current >= start && current < end;
  }
}
