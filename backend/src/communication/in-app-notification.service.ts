import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'alert' | 'announcement';
export type NotificationCategory = 'system' | 'workflow' | 'task' | 'document' | 'finance' | 'hr' | 'compliance' | 'social' | 'custom';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'unread' | 'read' | 'archived' | 'dismissed';

export interface InAppNotification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  icon?: string;
  imageUrl?: string;
  action?: NotificationAction;
  metadata?: Record<string, any>;
  status: NotificationStatus;
  readAt?: Date;
  archivedAt?: Date;
  expiresAt?: Date;
  groupId?: string;
  sourceType?: string;
  sourceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationAction {
  type: 'link' | 'route' | 'modal' | 'callback';
  label: string;
  url?: string;
  route?: string;
  modalId?: string;
  callbackData?: Record<string, any>;
  secondaryAction?: {
    type: 'link' | 'route' | 'dismiss';
    label: string;
    url?: string;
    route?: string;
  };
}

export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  enableInApp: boolean;
  enableSound: boolean;
  enableDesktopNotifications: boolean;
  categories: Record<NotificationCategory, {
    enabled: boolean;
    priority: NotificationPriority;
  }>;
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  digestEnabled: boolean;
  digestFrequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  updatedAt: Date;
}

export interface NotificationGroup {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  category: NotificationCategory;
  notifications: string[];
  count: number;
  unreadCount: number;
  latestAt: Date;
  createdAt: Date;
}

export interface BroadcastNotification {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  audience: {
    type: 'all' | 'role' | 'department' | 'team' | 'custom';
    roleIds?: string[];
    departmentIds?: string[];
    teamIds?: string[];
    userIds?: string[];
    excludeUserIds?: string[];
  };
  action?: NotificationAction;
  scheduledAt?: Date;
  expiresAt?: Date;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  recipientCount: number;
  readCount: number;
  createdBy: string;
  createdAt: Date;
  sentAt?: Date;
}

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: NotificationType;
  category: NotificationCategory;
  titleTemplate: string;
  messageTemplate: string;
  icon?: string;
  defaultAction?: NotificationAction;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'url';
    required: boolean;
    defaultValue?: any;
  }>;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class InAppNotificationService {
  private notifications: Map<string, InAppNotification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private groups: Map<string, NotificationGroup> = new Map();
  private broadcasts: Map<string, BroadcastNotification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        tenantId: 'system',
        name: 'Task Assigned',
        description: 'Notification when a task is assigned',
        type: 'info',
        category: 'task',
        titleTemplate: 'New Task Assigned',
        messageTemplate: '{{assigner_name}} assigned you a task: "{{task_name}}"',
        icon: 'task',
        defaultAction: { type: 'route', label: 'View Task', route: '/tasks/{{task_id}}' },
        variables: [
          { name: 'assigner_name', type: 'string', required: true },
          { name: 'task_name', type: 'string', required: true },
          { name: 'task_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Document Approval Required',
        description: 'Notification for pending document approval',
        type: 'warning',
        category: 'workflow',
        titleTemplate: 'Approval Required',
        messageTemplate: '{{requester_name}} requests your approval for "{{document_name}}"',
        icon: 'approval',
        defaultAction: { type: 'route', label: 'Review', route: '/documents/{{document_id}}/approve' },
        variables: [
          { name: 'requester_name', type: 'string', required: true },
          { name: 'document_name', type: 'string', required: true },
          { name: 'document_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Invoice Received',
        description: 'Notification for new invoice',
        type: 'info',
        category: 'finance',
        titleTemplate: 'New Invoice',
        messageTemplate: 'Invoice #{{invoice_number}} for {{amount}} {{currency}} from {{vendor_name}}',
        icon: 'invoice',
        defaultAction: { type: 'route', label: 'View Invoice', route: '/invoices/{{invoice_id}}' },
        variables: [
          { name: 'invoice_number', type: 'string', required: true },
          { name: 'amount', type: 'number', required: true },
          { name: 'currency', type: 'string', required: true },
          { name: 'vendor_name', type: 'string', required: true },
          { name: 'invoice_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'ANAF Deadline Alert',
        description: 'Alert for upcoming ANAF deadlines',
        type: 'alert',
        category: 'compliance',
        titleTemplate: 'ANAF Deadline Alert',
        messageTemplate: '{{declaration_type}} is due in {{days_remaining}} days ({{due_date}})',
        icon: 'warning',
        defaultAction: { type: 'route', label: 'Submit Now', route: '/compliance/anaf/{{declaration_id}}' },
        variables: [
          { name: 'declaration_type', type: 'string', required: true },
          { name: 'days_remaining', type: 'number', required: true },
          { name: 'due_date', type: 'date', required: true },
          { name: 'declaration_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Leave Request',
        description: 'Notification for leave request',
        type: 'info',
        category: 'hr',
        titleTemplate: 'Leave Request',
        messageTemplate: '{{employee_name}} requested {{leave_type}} from {{start_date}} to {{end_date}}',
        icon: 'calendar',
        defaultAction: { type: 'route', label: 'Review', route: '/hr/leave/{{request_id}}' },
        variables: [
          { name: 'employee_name', type: 'string', required: true },
          { name: 'leave_type', type: 'string', required: true },
          { name: 'start_date', type: 'date', required: true },
          { name: 'end_date', type: 'date', required: true },
          { name: 'request_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'System Maintenance',
        description: 'System maintenance announcement',
        type: 'announcement',
        category: 'system',
        titleTemplate: 'Scheduled Maintenance',
        messageTemplate: 'System maintenance scheduled for {{date}} at {{time}}. Expected duration: {{duration}}',
        icon: 'maintenance',
        variables: [
          { name: 'date', type: 'date', required: true },
          { name: 'time', type: 'string', required: true },
          { name: 'duration', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Comment Mention',
        description: 'Notification when mentioned in a comment',
        type: 'info',
        category: 'social',
        titleTemplate: 'You were mentioned',
        messageTemplate: '{{author_name}} mentioned you in a comment on "{{item_name}}"',
        icon: 'mention',
        defaultAction: { type: 'route', label: 'View', route: '{{item_url}}' },
        variables: [
          { name: 'author_name', type: 'string', required: true },
          { name: 'item_name', type: 'string', required: true },
          { name: 'item_url', type: 'url', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Payment Received',
        description: 'Notification for received payment',
        type: 'success',
        category: 'finance',
        titleTemplate: 'Payment Received',
        messageTemplate: 'Payment of {{amount}} {{currency}} received from {{payer_name}}',
        icon: 'payment',
        defaultAction: { type: 'route', label: 'View Details', route: '/payments/{{payment_id}}' },
        variables: [
          { name: 'amount', type: 'number', required: true },
          { name: 'currency', type: 'string', required: true },
          { name: 'payer_name', type: 'string', required: true },
          { name: 'payment_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
    ];

    for (const template of templates) {
      const id = `ntpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, {
        id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // =================== NOTIFICATIONS ===================

  async createNotification(data: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    category: NotificationCategory;
    priority?: NotificationPriority;
    title: string;
    message: string;
    icon?: string;
    imageUrl?: string;
    action?: NotificationAction;
    metadata?: Record<string, any>;
    expiresAt?: Date;
    groupId?: string;
    sourceType?: string;
    sourceId?: string;
  }): Promise<InAppNotification> {
    // Check user preferences
    const prefs = await this.getUserPreferences(data.userId, data.tenantId);
    if (!prefs.enableInApp) {
      throw new Error('User has disabled in-app notifications');
    }

    const categoryPref = prefs.categories[data.category];
    if (categoryPref && !categoryPref.enabled) {
      throw new Error(`User has disabled ${data.category} notifications`);
    }

    // Check quiet hours
    if (prefs.quietHours?.enabled && this.isQuietHours(prefs.quietHours)) {
      // Queue for later or skip based on priority
      if (data.priority !== 'urgent') {
        throw new Error('Currently in quiet hours');
      }
    }

    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification: InAppNotification = {
      id,
      tenantId: data.tenantId,
      userId: data.userId,
      type: data.type,
      category: data.category,
      priority: data.priority || 'normal',
      title: data.title,
      message: data.message,
      icon: data.icon,
      imageUrl: data.imageUrl,
      action: data.action,
      metadata: data.metadata,
      status: 'unread',
      expiresAt: data.expiresAt,
      groupId: data.groupId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.notifications.set(id, notification);

    // Add to group if specified
    if (data.groupId) {
      await this.addToGroup(data.groupId, notification);
    }

    this.eventEmitter.emit('notification.created', { notification });

    return notification;
  }

  async createFromTemplate(data: {
    tenantId: string;
    userId: string;
    templateId: string;
    templateData: Record<string, any>;
    priority?: NotificationPriority;
    groupId?: string;
    sourceType?: string;
    sourceId?: string;
  }): Promise<InAppNotification> {
    const template = this.templates.get(data.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Process template
    const title = this.processTemplateString(template.titleTemplate, data.templateData);
    const message = this.processTemplateString(template.messageTemplate, data.templateData);

    // Process action URL if present
    let action = template.defaultAction;
    if (action && action.route) {
      action = {
        ...action,
        route: this.processTemplateString(action.route, data.templateData),
      };
    }

    // Update usage count
    template.usageCount++;
    template.updatedAt = new Date();

    return this.createNotification({
      tenantId: data.tenantId,
      userId: data.userId,
      type: template.type,
      category: template.category,
      priority: data.priority,
      title,
      message,
      icon: template.icon,
      action,
      groupId: data.groupId,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
    });
  }

  private processTemplateString(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  async getNotifications(
    userId: string,
    tenantId: string,
    filters?: {
      status?: NotificationStatus;
      category?: NotificationCategory;
      type?: NotificationType;
      priority?: NotificationPriority;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ notifications: InAppNotification[]; total: number; unreadCount: number }> {
    let notifications = Array.from(this.notifications.values()).filter(
      (n) => n.userId === userId && n.tenantId === tenantId,
    );

    // Filter expired
    const now = new Date();
    notifications = notifications.filter((n) => !n.expiresAt || n.expiresAt > now);

    if (filters?.status) {
      notifications = notifications.filter((n) => n.status === filters.status);
    }

    if (filters?.category) {
      notifications = notifications.filter((n) => n.category === filters.category);
    }

    if (filters?.type) {
      notifications = notifications.filter((n) => n.type === filters.type);
    }

    if (filters?.priority) {
      notifications = notifications.filter((n) => n.priority === filters.priority);
    }

    if (filters?.startDate) {
      notifications = notifications.filter((n) => n.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      notifications = notifications.filter((n) => n.createdAt <= filters.endDate!);
    }

    const total = notifications.length;
    const unreadCount = notifications.filter((n) => n.status === 'unread').length;

    // Sort by priority and date
    notifications = notifications.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    if (filters?.offset) {
      notifications = notifications.slice(filters.offset);
    }

    if (filters?.limit) {
      notifications = notifications.slice(0, filters.limit);
    }

    return { notifications, total, unreadCount };
  }

  async getNotification(id: string): Promise<InAppNotification | null> {
    return this.notifications.get(id) || null;
  }

  async markAsRead(notificationId: string): Promise<InAppNotification | null> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.status = 'read';
    notification.readAt = new Date();
    notification.updatedAt = new Date();

    // Update group unread count
    if (notification.groupId) {
      const group = this.groups.get(notification.groupId);
      if (group) {
        group.unreadCount = Math.max(0, group.unreadCount - 1);
      }
    }

    this.eventEmitter.emit('notification.read', { notification });

    return notification;
  }

  async markAllAsRead(userId: string, tenantId: string, category?: NotificationCategory): Promise<number> {
    let count = 0;

    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId && notification.tenantId === tenantId && notification.status === 'unread') {
        if (!category || notification.category === category) {
          notification.status = 'read';
          notification.readAt = new Date();
          notification.updatedAt = new Date();
          count++;
        }
      }
    }

    return count;
  }

  async archiveNotification(notificationId: string): Promise<InAppNotification | null> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.status = 'archived';
    notification.archivedAt = new Date();
    notification.updatedAt = new Date();

    return notification;
  }

  async dismissNotification(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.status = 'dismissed';
    notification.updatedAt = new Date();

    return true;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    return this.notifications.delete(notificationId);
  }

  async deleteOldNotifications(userId: string, tenantId: string, olderThanDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let count = 0;

    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId && notification.tenantId === tenantId && notification.createdAt < cutoff) {
        this.notifications.delete(id);
        count++;
      }
    }

    return count;
  }

  // =================== GROUPS ===================

  private async addToGroup(groupId: string, notification: InAppNotification): Promise<void> {
    let group = this.groups.get(groupId);

    if (!group) {
      group = {
        id: groupId,
        tenantId: notification.tenantId,
        userId: notification.userId,
        title: notification.title,
        category: notification.category,
        notifications: [],
        count: 0,
        unreadCount: 0,
        latestAt: new Date(),
        createdAt: new Date(),
      };
      this.groups.set(groupId, group);
    }

    group.notifications.push(notification.id);
    group.count++;
    group.unreadCount++;
    group.latestAt = new Date();
  }

  async getGroups(userId: string, tenantId: string): Promise<NotificationGroup[]> {
    return Array.from(this.groups.values())
      .filter((g) => g.userId === userId && g.tenantId === tenantId)
      .sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
  }

  // =================== BROADCASTS ===================

  async createBroadcast(data: {
    tenantId: string;
    title: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    priority?: NotificationPriority;
    audience: BroadcastNotification['audience'];
    action?: NotificationAction;
    scheduledAt?: Date;
    expiresAt?: Date;
    createdBy: string;
  }): Promise<BroadcastNotification> {
    const id = `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const broadcast: BroadcastNotification = {
      id,
      tenantId: data.tenantId,
      title: data.title,
      message: data.message,
      type: data.type,
      category: data.category,
      priority: data.priority || 'normal',
      audience: data.audience,
      action: data.action,
      scheduledAt: data.scheduledAt,
      expiresAt: data.expiresAt,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      recipientCount: 0,
      readCount: 0,
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.broadcasts.set(id, broadcast);

    return broadcast;
  }

  async sendBroadcast(broadcastId: string): Promise<BroadcastNotification> {
    const broadcast = this.broadcasts.get(broadcastId);
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    // Simulate sending to audience
    const recipientCount = this.calculateAudienceSize(broadcast.audience);
    broadcast.recipientCount = recipientCount;
    broadcast.status = 'sent';
    broadcast.sentAt = new Date();

    this.eventEmitter.emit('broadcast.sent', { broadcast });

    return broadcast;
  }

  private calculateAudienceSize(audience: BroadcastNotification['audience']): number {
    // Simulate audience size calculation
    switch (audience.type) {
      case 'all':
        return Math.floor(Math.random() * 1000) + 100;
      case 'role':
        return (audience.roleIds?.length || 0) * 50;
      case 'department':
        return (audience.departmentIds?.length || 0) * 30;
      case 'team':
        return (audience.teamIds?.length || 0) * 10;
      case 'custom':
        return audience.userIds?.length || 0;
      default:
        return 0;
    }
  }

  async getBroadcasts(
    tenantId: string,
    filters?: {
      status?: BroadcastNotification['status'];
      limit?: number;
    },
  ): Promise<BroadcastNotification[]> {
    let broadcasts = Array.from(this.broadcasts.values()).filter((b) => b.tenantId === tenantId);

    if (filters?.status) {
      broadcasts = broadcasts.filter((b) => b.status === filters.status);
    }

    broadcasts = broadcasts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      broadcasts = broadcasts.slice(0, filters.limit);
    }

    return broadcasts;
  }

  // =================== PREFERENCES ===================

  async getUserPreferences(userId: string, tenantId: string): Promise<NotificationPreferences> {
    const key = `${tenantId}:${userId}`;
    let prefs = this.preferences.get(key);

    if (!prefs) {
      // Return defaults
      prefs = {
        userId,
        tenantId,
        enableInApp: true,
        enableSound: true,
        enableDesktopNotifications: true,
        categories: {
          system: { enabled: true, priority: 'normal' },
          workflow: { enabled: true, priority: 'high' },
          task: { enabled: true, priority: 'normal' },
          document: { enabled: true, priority: 'normal' },
          finance: { enabled: true, priority: 'high' },
          hr: { enabled: true, priority: 'normal' },
          compliance: { enabled: true, priority: 'urgent' },
          social: { enabled: true, priority: 'low' },
          custom: { enabled: true, priority: 'normal' },
        },
        digestEnabled: false,
        digestFrequency: 'daily',
        updatedAt: new Date(),
      };
      this.preferences.set(key, prefs);
    }

    return prefs;
  }

  async updateUserPreferences(
    userId: string,
    tenantId: string,
    updates: Partial<Omit<NotificationPreferences, 'userId' | 'tenantId'>>,
  ): Promise<NotificationPreferences> {
    const prefs = await this.getUserPreferences(userId, tenantId);

    Object.assign(prefs, updates, { updatedAt: new Date() });

    return prefs;
  }

  private isQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
    if (!quietHours) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // =================== TEMPLATES ===================

  async getTemplates(tenantId: string): Promise<NotificationTemplate[]> {
    return Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId || t.tenantId === 'system',
    );
  }

  async getTemplate(id: string): Promise<NotificationTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createTemplate(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: NotificationType;
    category: NotificationCategory;
    titleTemplate: string;
    messageTemplate: string;
    icon?: string;
    defaultAction?: NotificationAction;
    variables: NotificationTemplate['variables'];
    createdBy: string;
  }): Promise<NotificationTemplate> {
    const id = `ntpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: NotificationTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      category: data.category,
      titleTemplate: data.titleTemplate,
      messageTemplate: data.messageTemplate,
      icon: data.icon,
      defaultAction: data.defaultAction,
      variables: data.variables,
      isActive: true,
      usageCount: 0,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);

    return template;
  }

  // =================== STATS ===================

  async getStats(userId: string, tenantId: string): Promise<{
    total: number;
    unread: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    recentCount: number;
  }> {
    const { notifications, total, unreadCount } = await this.getNotifications(userId, tenantId);

    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let recentCount = 0;

    for (const notification of notifications) {
      byCategory[notification.category] = (byCategory[notification.category] || 0) + 1;
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      if (notification.createdAt > oneDayAgo) recentCount++;
    }

    return {
      total,
      unread: unreadCount,
      byCategory,
      byType,
      recentCount,
    };
  }
}
