import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * In-App Notification Center Service
 * Manages real-time in-app notifications for users
 */

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'unread' | 'read' | 'archived' | 'dismissed';

export interface InAppNotification {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  icon?: string;
  avatar?: string;
  actionUrl?: string;
  actionLabel?: string;
  secondaryActionUrl?: string;
  secondaryActionLabel?: string;
  metadata?: Record<string, any>;
  groupId?: string;
  expiresAt?: Date;
  readAt?: Date;
  archivedAt?: Date;
  dismissedAt?: Date;
  createdAt: Date;
}

export interface NotificationGroup {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  count: number;
  latestNotificationId: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreview {
  total: number;
  unread: number;
  urgent: number;
  recent: InAppNotification[];
}

export interface NotificationFilters {
  status?: NotificationStatus | NotificationStatus[];
  category?: string | string[];
  priority?: NotificationPriority | NotificationPriority[];
  type?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface BulkActionResult {
  success: boolean;
  affected: number;
  notificationIds: string[];
}

@Injectable()
export class NotificationCenterService {
  private readonly logger = new Logger(NotificationCenterService.name);

  // In-memory storage
  private notifications: Map<string, InAppNotification> = new Map();
  private userNotifications: Map<string, Set<string>> = new Map(); // userId -> notificationIds
  private groups: Map<string, NotificationGroup> = new Map();
  private idCounter = 0;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ============================================================================
  // CREATE NOTIFICATIONS
  // ============================================================================

  async createNotification(params: {
    userId: string;
    tenantId: string;
    title: string;
    message: string;
    type: string;
    category: string;
    priority?: NotificationPriority;
    icon?: string;
    avatar?: string;
    actionUrl?: string;
    actionLabel?: string;
    secondaryActionUrl?: string;
    secondaryActionLabel?: string;
    metadata?: Record<string, any>;
    groupId?: string;
    expiresAt?: Date;
  }): Promise<InAppNotification> {
    const id = `notif-${++this.idCounter}-${Date.now()}`;

    const notification: InAppNotification = {
      id,
      userId: params.userId,
      tenantId: params.tenantId,
      title: params.title,
      message: params.message,
      type: params.type,
      category: params.category,
      priority: params.priority || 'normal',
      status: 'unread',
      icon: params.icon,
      avatar: params.avatar,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel,
      secondaryActionUrl: params.secondaryActionUrl,
      secondaryActionLabel: params.secondaryActionLabel,
      metadata: params.metadata,
      groupId: params.groupId,
      expiresAt: params.expiresAt,
      createdAt: new Date(),
    };

    this.notifications.set(id, notification);

    // Track by user
    if (!this.userNotifications.has(params.userId)) {
      this.userNotifications.set(params.userId, new Set());
    }
    this.userNotifications.get(params.userId)!.add(id);

    // Update group if applicable
    if (params.groupId) {
      this.updateGroup(params.groupId, notification);
    }

    // Emit real-time event
    this.eventEmitter.emit('notification.created', {
      userId: params.userId,
      notification,
    });

    this.logger.debug(`Created notification ${id} for user ${params.userId}`);
    return notification;
  }

  async createBulkNotifications(
    notifications: Array<{
      userId: string;
      tenantId: string;
      title: string;
      message: string;
      type: string;
      category: string;
      priority?: NotificationPriority;
      actionUrl?: string;
      metadata?: Record<string, any>;
    }>,
  ): Promise<InAppNotification[]> {
    const created: InAppNotification[] = [];

    for (const notif of notifications) {
      const notification = await this.createNotification(notif);
      created.push(notification);
    }

    return created;
  }

  // ============================================================================
  // READ NOTIFICATIONS
  // ============================================================================

  async getNotification(notificationId: string): Promise<InAppNotification | null> {
    return this.notifications.get(notificationId) || null;
  }

  async getUserNotifications(
    userId: string,
    filters?: NotificationFilters,
  ): Promise<{ notifications: InAppNotification[]; total: number }> {
    const notificationIds = this.userNotifications.get(userId);
    if (!notificationIds) {
      return { notifications: [], total: 0 };
    }

    let notifications = Array.from(notificationIds)
      .map((id) => this.notifications.get(id))
      .filter((n): n is InAppNotification => n !== undefined);

    // Apply filters
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      notifications = notifications.filter((n) => statuses.includes(n.status));
    }

    if (filters?.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      notifications = notifications.filter((n) => categories.includes(n.category));
    }

    if (filters?.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      notifications = notifications.filter((n) => priorities.includes(n.priority));
    }

    if (filters?.type) {
      notifications = notifications.filter((n) => n.type === filters.type);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      notifications = notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.message.toLowerCase().includes(search),
      );
    }

    if (filters?.startDate) {
      notifications = notifications.filter((n) => n.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      notifications = notifications.filter((n) => n.createdAt <= filters.endDate!);
    }

    // Filter expired
    const now = new Date();
    notifications = notifications.filter((n) => !n.expiresAt || n.expiresAt > now);

    // Sort by date (newest first) and priority
    notifications.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      if (a.status === 'unread' && b.status !== 'unread') return -1;
      if (a.status !== 'unread' && b.status === 'unread') return 1;
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = notifications.length;

    // Apply pagination
    if (filters?.offset) {
      notifications = notifications.slice(filters.offset);
    }
    if (filters?.limit) {
      notifications = notifications.slice(0, filters.limit);
    }

    return { notifications, total };
  }

  async getNotificationPreview(userId: string): Promise<NotificationPreview> {
    const { notifications, total } = await this.getUserNotifications(userId, {
      status: 'unread',
      limit: 5,
    });

    const unread = notifications.length;
    const urgent = notifications.filter((n) => n.priority === 'urgent').length;

    return {
      total,
      unread,
      urgent,
      recent: notifications,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { total } = await this.getUserNotifications(userId, { status: 'unread' });
    return total;
  }

  async getNotificationsByCategory(
    userId: string,
  ): Promise<Map<string, { count: number; unread: number }>> {
    const { notifications } = await this.getUserNotifications(userId);
    const categoryMap = new Map<string, { count: number; unread: number }>();

    for (const notification of notifications) {
      const current = categoryMap.get(notification.category) || { count: 0, unread: 0 };
      current.count++;
      if (notification.status === 'unread') {
        current.unread++;
      }
      categoryMap.set(notification.category, current);
    }

    return categoryMap;
  }

  // ============================================================================
  // UPDATE NOTIFICATIONS
  // ============================================================================

  async markAsRead(notificationId: string): Promise<InAppNotification | null> {
    const notification = this.notifications.get(notificationId);
    if (!notification || notification.status === 'read') return notification || null;

    notification.status = 'read';
    notification.readAt = new Date();
    this.notifications.set(notificationId, notification);

    this.eventEmitter.emit('notification.read', {
      userId: notification.userId,
      notificationId,
    });

    return notification;
  }

  async markAsUnread(notificationId: string): Promise<InAppNotification | null> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.status = 'unread';
    notification.readAt = undefined;
    this.notifications.set(notificationId, notification);

    return notification;
  }

  async markAllAsRead(userId: string, category?: string): Promise<BulkActionResult> {
    const notificationIds = this.userNotifications.get(userId);
    if (!notificationIds) {
      return { success: true, affected: 0, notificationIds: [] };
    }

    const affected: string[] = [];
    const now = new Date();

    for (const id of notificationIds) {
      const notification = this.notifications.get(id);
      if (notification && notification.status === 'unread') {
        if (!category || notification.category === category) {
          notification.status = 'read';
          notification.readAt = now;
          this.notifications.set(id, notification);
          affected.push(id);
        }
      }
    }

    this.eventEmitter.emit('notifications.bulk_read', {
      userId,
      notificationIds: affected,
    });

    return { success: true, affected: affected.length, notificationIds: affected };
  }

  async archiveNotification(notificationId: string): Promise<InAppNotification | null> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.status = 'archived';
    notification.archivedAt = new Date();
    this.notifications.set(notificationId, notification);

    return notification;
  }

  async archiveAll(userId: string, olderThanDays: number = 30): Promise<BulkActionResult> {
    const notificationIds = this.userNotifications.get(userId);
    if (!notificationIds) {
      return { success: true, affected: 0, notificationIds: [] };
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const affected: string[] = [];
    const now = new Date();

    for (const id of notificationIds) {
      const notification = this.notifications.get(id);
      if (notification && notification.status !== 'archived' && notification.createdAt < cutoff) {
        notification.status = 'archived';
        notification.archivedAt = now;
        this.notifications.set(id, notification);
        affected.push(id);
      }
    }

    return { success: true, affected: affected.length, notificationIds: affected };
  }

  async dismissNotification(notificationId: string): Promise<InAppNotification | null> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.status = 'dismissed';
    notification.dismissedAt = new Date();
    this.notifications.set(notificationId, notification);

    return notification;
  }

  // ============================================================================
  // DELETE NOTIFICATIONS
  // ============================================================================

  async deleteNotification(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    this.notifications.delete(notificationId);
    this.userNotifications.get(notification.userId)?.delete(notificationId);

    return true;
  }

  async deleteAllRead(userId: string): Promise<BulkActionResult> {
    const notificationIds = this.userNotifications.get(userId);
    if (!notificationIds) {
      return { success: true, affected: 0, notificationIds: [] };
    }

    const affected: string[] = [];

    for (const id of Array.from(notificationIds)) {
      const notification = this.notifications.get(id);
      if (notification && notification.status === 'read') {
        this.notifications.delete(id);
        notificationIds.delete(id);
        affected.push(id);
      }
    }

    return { success: true, affected: affected.length, notificationIds: affected };
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, notification] of this.notifications) {
      if (notification.expiresAt && notification.expiresAt < now) {
        this.notifications.delete(id);
        this.userNotifications.get(notification.userId)?.delete(id);
        cleaned++;
      }
    }

    this.logger.log(`Cleaned up ${cleaned} expired notifications`);
    return cleaned;
  }

  // ============================================================================
  // NOTIFICATION GROUPS
  // ============================================================================

  private updateGroup(groupId: string, notification: InAppNotification): void {
    const existing = this.groups.get(groupId);
    if (existing) {
      existing.count++;
      existing.latestNotificationId = notification.id;
      existing.updatedAt = new Date();
    } else {
      this.groups.set(groupId, {
        id: groupId,
        userId: notification.userId,
        tenantId: notification.tenantId,
        title: notification.title,
        count: 1,
        latestNotificationId: notification.id,
        category: notification.category,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  async getGroups(userId: string): Promise<NotificationGroup[]> {
    return Array.from(this.groups.values())
      .filter((g) => g.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getGroupNotifications(
    groupId: string,
    limit: number = 20,
  ): Promise<InAppNotification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.groupId === groupId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // ============================================================================
  // REAL-TIME SUPPORT
  // ============================================================================

  async subscribeToUserNotifications(
    userId: string,
    callback: (notification: InAppNotification) => void,
  ): Promise<() => void> {
    const handler = (data: { userId: string; notification: InAppNotification }) => {
      if (data.userId === userId) {
        callback(data.notification);
      }
    };

    this.eventEmitter.on('notification.created', handler);

    return () => {
      this.eventEmitter.off('notification.created', handler);
    };
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  async getStatistics(userId: string): Promise<{
    total: number;
    unread: number;
    read: number;
    archived: number;
    byCategory: Record<string, number>;
    byPriority: Record<NotificationPriority, number>;
    avgReadTime: number | null;
  }> {
    const { notifications } = await this.getUserNotifications(userId);

    const byCategory: Record<string, number> = {};
    const byPriority: Record<NotificationPriority, number> = {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    };

    let readTimes: number[] = [];

    for (const notification of notifications) {
      byCategory[notification.category] = (byCategory[notification.category] || 0) + 1;
      byPriority[notification.priority]++;

      if (notification.readAt) {
        readTimes.push(notification.readAt.getTime() - notification.createdAt.getTime());
      }
    }

    return {
      total: notifications.length,
      unread: notifications.filter((n) => n.status === 'unread').length,
      read: notifications.filter((n) => n.status === 'read').length,
      archived: notifications.filter((n) => n.status === 'archived').length,
      byCategory,
      byPriority,
      avgReadTime: readTimes.length > 0
        ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length
        : null,
    };
  }

  // ============================================================================
  // NOTIFICATION TEMPLATES
  // ============================================================================

  async createFromTemplate(
    templateType: string,
    userId: string,
    tenantId: string,
    data: Record<string, any>,
  ): Promise<InAppNotification> {
    const templates: Record<string, { title: string; message: string; category: string; icon: string; priority: NotificationPriority }> = {
      invoice_created: {
        title: 'Factură nouă creată',
        message: `Factura ${data.invoiceNumber} pentru ${data.clientName} (${data.amount} RON) a fost creată`,
        category: 'finance',
        icon: 'file-text',
        priority: 'normal',
      },
      invoice_due: {
        title: 'Factură scadentă',
        message: `Factura ${data.invoiceNumber} în valoare de ${data.amount} RON este scadentă astăzi`,
        category: 'finance',
        icon: 'alert-triangle',
        priority: 'high',
      },
      payment_received: {
        title: 'Plată primită',
        message: `Ați primit o plată de ${data.amount} RON de la ${data.payerName}`,
        category: 'finance',
        icon: 'check-circle',
        priority: 'normal',
      },
      hr_leave_approved: {
        title: 'Cerere aprobată',
        message: `Cererea de concediu pentru ${data.startDate} - ${data.endDate} a fost aprobată`,
        category: 'hr',
        icon: 'calendar-check',
        priority: 'normal',
      },
      hr_contract_expiring: {
        title: 'Contract în expirare',
        message: `Contractul angajatului ${data.employeeName} expiră în ${data.daysRemaining} zile`,
        category: 'hr',
        icon: 'alert-circle',
        priority: 'high',
      },
      hse_incident: {
        title: 'Incident HSE raportat',
        message: `Incident ${data.incidentType} raportat la ${data.location}`,
        category: 'hse',
        icon: 'shield-alert',
        priority: 'urgent',
      },
      system_update: {
        title: 'Actualizare sistem',
        message: data.message,
        category: 'system',
        icon: 'info',
        priority: 'low',
      },
      deadline_reminder: {
        title: 'Reminder termen limită',
        message: `${data.taskName} - termen: ${data.deadline}`,
        category: 'reminder',
        icon: 'clock',
        priority: 'high',
      },
    };

    const template = templates[templateType];
    if (!template) {
      throw new Error(`Unknown template type: ${templateType}`);
    }

    return this.createNotification({
      userId,
      tenantId,
      title: template.title,
      message: template.message,
      type: templateType,
      category: template.category,
      icon: template.icon,
      priority: template.priority,
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
      metadata: data,
    });
  }
}
