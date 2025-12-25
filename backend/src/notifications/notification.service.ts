import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationCategory =
  | 'SYSTEM'
  | 'INVOICE'
  | 'PAYMENT'
  | 'REMINDER'
  | 'ALERT'
  | 'ANAF'
  | 'APPROVAL'
  | 'TASK'
  | 'DOCUMENT'
  | 'SECURITY'
  | 'MARKETING'
  | 'UPDATE';

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED';

export interface Notification {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  titleRo: string;
  message: string;
  messageRo: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  status: NotificationStatus;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelRo?: string;
  iconType?: string;
  imageUrl?: string;
  expiresAt?: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: NotificationCategory;
  titleTemplate: string;
  titleTemplateRo: string;
  messageTemplate: string;
  messageTemplateRo: string;
  defaultChannels: NotificationChannel[];
  defaultPriority: NotificationPriority;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  organizationId: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  emailDigest: 'IMMEDIATE' | 'DAILY' | 'WEEKLY' | 'NONE';
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationGroup {
  id: string;
  organizationId: string;
  name: string;
  nameRo: string;
  userIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationDto {
  organizationId: string;
  userId: string;
  title: string;
  titleRo: string;
  message: string;
  messageRo: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelRo?: string;
  iconType?: string;
  imageUrl?: string;
  expiresAt?: Date;
  scheduledFor?: Date;
}

export interface SendFromTemplateDto {
  organizationId: string;
  userId: string;
  templateId: string;
  variables: Record<string, string>;
  channelOverride?: NotificationChannel[];
  priorityOverride?: NotificationPriority;
  data?: Record<string, any>;
  actionUrl?: string;
}

export interface BulkNotificationDto {
  organizationId: string;
  userIds: string[];
  title: string;
  titleRo: string;
  message: string;
  messageRo: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  data?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private preferences: Map<string, NotificationPreference> = new Map();
  private groups: Map<string, NotificationGroup> = new Map();
  private deviceTokens: Map<string, string[]> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Invoice Created',
        nameRo: 'Factură Creată',
        description: 'Notification when a new invoice is created',
        descriptionRo: 'Notificare când o factură nouă este creată',
        category: 'INVOICE',
        titleTemplate: 'New Invoice {{invoiceNumber}}',
        titleTemplateRo: 'Factură Nouă {{invoiceNumber}}',
        messageTemplate: 'Invoice {{invoiceNumber}} for {{amount}} RON has been created for {{customerName}}.',
        messageTemplateRo: 'Factura {{invoiceNumber}} în valoare de {{amount}} RON a fost creată pentru {{customerName}}.',
        defaultChannels: ['IN_APP', 'EMAIL'],
        defaultPriority: 'NORMAL',
        variables: ['invoiceNumber', 'amount', 'customerName'],
        isActive: true,
      },
      {
        name: 'Payment Received',
        nameRo: 'Plată Primită',
        description: 'Notification when payment is received',
        descriptionRo: 'Notificare când o plată este primită',
        category: 'PAYMENT',
        titleTemplate: 'Payment Received',
        titleTemplateRo: 'Plată Primită',
        messageTemplate: 'Payment of {{amount}} RON received for invoice {{invoiceNumber}}.',
        messageTemplateRo: 'Plată de {{amount}} RON primită pentru factura {{invoiceNumber}}.',
        defaultChannels: ['IN_APP', 'EMAIL'],
        defaultPriority: 'NORMAL',
        variables: ['amount', 'invoiceNumber'],
        isActive: true,
      },
      {
        name: 'Payment Due Reminder',
        nameRo: 'Reamintire Scadență Plată',
        description: 'Reminder for upcoming payment due date',
        descriptionRo: 'Reamintire pentru scadența plății',
        category: 'REMINDER',
        titleTemplate: 'Payment Due in {{days}} Days',
        titleTemplateRo: 'Plată Scadentă în {{days}} Zile',
        messageTemplate: 'Invoice {{invoiceNumber}} for {{amount}} RON is due on {{dueDate}}.',
        messageTemplateRo: 'Factura {{invoiceNumber}} în valoare de {{amount}} RON este scadentă pe {{dueDate}}.',
        defaultChannels: ['IN_APP', 'EMAIL'],
        defaultPriority: 'HIGH',
        variables: ['days', 'invoiceNumber', 'amount', 'dueDate'],
        isActive: true,
      },
      {
        name: 'ANAF Submission Success',
        nameRo: 'Depunere ANAF Reușită',
        description: 'Notification when ANAF submission is successful',
        descriptionRo: 'Notificare când depunerea ANAF a reușit',
        category: 'ANAF',
        titleTemplate: 'ANAF Submission Successful',
        titleTemplateRo: 'Depunere ANAF Reușită',
        messageTemplate: '{{documentType}} has been successfully submitted to ANAF. Reference: {{reference}}.',
        messageTemplateRo: '{{documentType}} a fost depus cu succes la ANAF. Referință: {{reference}}.',
        defaultChannels: ['IN_APP', 'EMAIL'],
        defaultPriority: 'NORMAL',
        variables: ['documentType', 'reference'],
        isActive: true,
      },
      {
        name: 'ANAF Submission Failed',
        nameRo: 'Depunere ANAF Eșuată',
        description: 'Notification when ANAF submission fails',
        descriptionRo: 'Notificare când depunerea ANAF a eșuat',
        category: 'ANAF',
        titleTemplate: 'ANAF Submission Failed',
        titleTemplateRo: 'Depunere ANAF Eșuată',
        messageTemplate: 'Failed to submit {{documentType}} to ANAF. Error: {{error}}. Please retry.',
        messageTemplateRo: 'Depunerea {{documentType}} la ANAF a eșuat. Eroare: {{error}}. Vă rugăm reîncercați.',
        defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
        defaultPriority: 'URGENT',
        variables: ['documentType', 'error'],
        isActive: true,
      },
      {
        name: 'Approval Required',
        nameRo: 'Aprobare Necesară',
        description: 'Notification when approval is needed',
        descriptionRo: 'Notificare când este necesară aprobare',
        category: 'APPROVAL',
        titleTemplate: 'Approval Required: {{itemType}}',
        titleTemplateRo: 'Aprobare Necesară: {{itemType}}',
        messageTemplate: '{{requesterName}} is requesting approval for {{itemType}} "{{itemName}}".',
        messageTemplateRo: '{{requesterName}} solicită aprobare pentru {{itemType}} "{{itemName}}".',
        defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
        defaultPriority: 'HIGH',
        variables: ['itemType', 'requesterName', 'itemName'],
        isActive: true,
      },
      {
        name: 'Task Assigned',
        nameRo: 'Sarcină Atribuită',
        description: 'Notification when a task is assigned',
        descriptionRo: 'Notificare când o sarcină este atribuită',
        category: 'TASK',
        titleTemplate: 'New Task: {{taskName}}',
        titleTemplateRo: 'Sarcină Nouă: {{taskName}}',
        messageTemplate: 'You have been assigned task "{{taskName}}" by {{assignerName}}. Due: {{dueDate}}.',
        messageTemplateRo: 'Vi s-a atribuit sarcina "{{taskName}}" de către {{assignerName}}. Termen: {{dueDate}}.',
        defaultChannels: ['IN_APP', 'EMAIL'],
        defaultPriority: 'NORMAL',
        variables: ['taskName', 'assignerName', 'dueDate'],
        isActive: true,
      },
      {
        name: 'Document Shared',
        nameRo: 'Document Partajat',
        description: 'Notification when a document is shared',
        descriptionRo: 'Notificare când un document este partajat',
        category: 'DOCUMENT',
        titleTemplate: 'Document Shared: {{documentName}}',
        titleTemplateRo: 'Document Partajat: {{documentName}}',
        messageTemplate: '{{sharerName}} shared document "{{documentName}}" with you.',
        messageTemplateRo: '{{sharerName}} a partajat documentul "{{documentName}}" cu dumneavoastră.',
        defaultChannels: ['IN_APP', 'EMAIL'],
        defaultPriority: 'NORMAL',
        variables: ['documentName', 'sharerName'],
        isActive: true,
      },
      {
        name: 'Security Alert',
        nameRo: 'Alertă Securitate',
        description: 'Security-related notification',
        descriptionRo: 'Notificare legată de securitate',
        category: 'SECURITY',
        titleTemplate: 'Security Alert: {{alertType}}',
        titleTemplateRo: 'Alertă Securitate: {{alertType}}',
        messageTemplate: '{{description}} detected from IP {{ipAddress}} at {{timestamp}}.',
        messageTemplateRo: '{{description}} detectat de la IP {{ipAddress}} la {{timestamp}}.',
        defaultChannels: ['IN_APP', 'EMAIL', 'SMS', 'PUSH'],
        defaultPriority: 'URGENT',
        variables: ['alertType', 'description', 'ipAddress', 'timestamp'],
        isActive: true,
      },
      {
        name: 'System Update',
        nameRo: 'Actualizare Sistem',
        description: 'System update notification',
        descriptionRo: 'Notificare actualizare sistem',
        category: 'UPDATE',
        titleTemplate: 'System Update: {{version}}',
        titleTemplateRo: 'Actualizare Sistem: {{version}}',
        messageTemplate: 'A new system update ({{version}}) is available. {{description}}',
        messageTemplateRo: 'O nouă actualizare de sistem ({{version}}) este disponibilă. {{description}}',
        defaultChannels: ['IN_APP'],
        defaultPriority: 'LOW',
        variables: ['version', 'description'],
        isActive: true,
      },
    ];

    const now = new Date();
    for (const template of templates) {
      const id = randomUUID();
      this.templates.set(id, {
        id,
        ...template,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const now = new Date();
    const notification: Notification = {
      id: randomUUID(),
      organizationId: dto.organizationId,
      userId: dto.userId,
      title: dto.title,
      titleRo: dto.titleRo,
      message: dto.message,
      messageRo: dto.messageRo,
      category: dto.category,
      priority: dto.priority || 'NORMAL',
      channels: dto.channels || ['IN_APP'],
      status: dto.scheduledFor && dto.scheduledFor > now ? 'PENDING' : 'PENDING',
      data: dto.data,
      actionUrl: dto.actionUrl,
      actionLabel: dto.actionLabel,
      actionLabelRo: dto.actionLabelRo,
      iconType: dto.iconType,
      imageUrl: dto.imageUrl,
      expiresAt: dto.expiresAt,
      scheduledFor: dto.scheduledFor,
      retryCount: 0,
      maxRetries: 3,
      createdAt: now,
      updatedAt: now,
    };

    this.notifications.set(notification.id, notification);
    this.eventEmitter.emit('notification.created', { notification });

    // Auto-send if not scheduled for later
    if (!dto.scheduledFor || dto.scheduledFor <= now) {
      await this.send(notification.id);
    }

    return notification;
  }

  async sendFromTemplate(dto: SendFromTemplateDto): Promise<Notification> {
    const template = this.templates.get(dto.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.isActive) {
      throw new Error('Template is not active');
    }

    const title = this.interpolateTemplate(template.titleTemplate, dto.variables);
    const titleRo = this.interpolateTemplate(template.titleTemplateRo, dto.variables);
    const message = this.interpolateTemplate(template.messageTemplate, dto.variables);
    const messageRo = this.interpolateTemplate(template.messageTemplateRo, dto.variables);

    return this.create({
      organizationId: dto.organizationId,
      userId: dto.userId,
      title,
      titleRo,
      message,
      messageRo,
      category: template.category,
      priority: dto.priorityOverride || template.defaultPriority,
      channels: dto.channelOverride || template.defaultChannels,
      data: dto.data,
      actionUrl: dto.actionUrl,
    });
  }

  private interpolateTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  async send(notificationId: string): Promise<Notification> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    // Check user preferences
    const prefKey = `${notification.userId}:${notification.category}`;
    const preference = this.preferences.get(prefKey);

    if (preference && !preference.enabled) {
      notification.status = 'CANCELLED';
      notification.updatedAt = new Date();
      this.notifications.set(notificationId, notification);
      return notification;
    }

    // Filter channels based on preferences
    let channels = notification.channels;
    if (preference) {
      channels = channels.filter(c => preference.channels.includes(c));
    }

    // Check quiet hours
    if (preference?.quietHoursStart && preference?.quietHoursEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (currentTime >= preference.quietHoursStart && currentTime <= preference.quietHoursEnd) {
        // Only send urgent notifications during quiet hours
        if (notification.priority !== 'URGENT') {
          channels = channels.filter(c => c === 'IN_APP');
        }
      }
    }

    try {
      // Simulate sending to each channel
      for (const channel of channels) {
        await this.sendToChannel(notification, channel);
      }

      notification.status = 'SENT';
      notification.sentAt = new Date();
      notification.updatedAt = new Date();
      this.eventEmitter.emit('notification.sent', { notification, channels });
    } catch (error) {
      notification.retryCount++;
      if (notification.retryCount >= notification.maxRetries) {
        notification.status = 'FAILED';
        notification.failedAt = new Date();
        notification.failureReason = error instanceof Error ? error.message : 'Unknown error';
        this.eventEmitter.emit('notification.failed', { notification, error });
      }
      notification.updatedAt = new Date();
    }

    this.notifications.set(notificationId, notification);
    return notification;
  }

  private async sendToChannel(notification: Notification, channel: NotificationChannel): Promise<void> {
    this.eventEmitter.emit(`notification.channel.${channel.toLowerCase()}`, { notification });

    // Simulate channel-specific sending
    switch (channel) {
      case 'IN_APP':
        // Store for in-app display
        break;
      case 'EMAIL':
        // Would integrate with email service
        break;
      case 'SMS':
        // Would integrate with SMS provider
        break;
      case 'PUSH':
        // Would send push notification
        const tokens = this.deviceTokens.get(notification.userId) || [];
        for (const _token of tokens) {
          // Send to each device
        }
        break;
      case 'WEBHOOK':
        // Would call webhook URL
        break;
    }
  }

  async sendBulk(dto: BulkNotificationDto): Promise<Notification[]> {
    const notifications: Notification[] = [];

    for (const userId of dto.userIds) {
      const notification = await this.create({
        organizationId: dto.organizationId,
        userId,
        title: dto.title,
        titleRo: dto.titleRo,
        message: dto.message,
        messageRo: dto.messageRo,
        category: dto.category,
        priority: dto.priority,
        channels: dto.channels,
        data: dto.data,
      });
      notifications.push(notification);
    }

    this.eventEmitter.emit('notification.bulk.sent', { count: notifications.length });
    return notifications;
  }

  async sendToGroup(groupId: string, dto: Omit<BulkNotificationDto, 'userIds'>): Promise<Notification[]> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    return this.sendBulk({
      ...dto,
      userIds: group.userIds,
    });
  }

  async getById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) || null;
  }

  async getUserNotifications(
    userId: string,
    organizationId: string,
    options?: {
      status?: NotificationStatus;
      category?: NotificationCategory;
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    let notifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId && n.organizationId === organizationId);

    if (options?.status) {
      notifications = notifications.filter(n => n.status === options.status);
    }

    if (options?.category) {
      notifications = notifications.filter(n => n.category === options.category);
    }

    if (options?.unreadOnly) {
      notifications = notifications.filter(n => !n.readAt);
    }

    // Sort by created date (newest first)
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = notifications.length;
    const unreadCount = notifications.filter(n => !n.readAt).length;

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    notifications = notifications.slice(offset, offset + limit);

    return { notifications, total, unreadCount };
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.status = 'READ';
    notification.readAt = new Date();
    notification.updatedAt = new Date();
    this.notifications.set(notificationId, notification);
    this.eventEmitter.emit('notification.read', { notification });
    return notification;
  }

  async markAllAsRead(userId: string, organizationId: string): Promise<number> {
    let count = 0;
    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId &&
          notification.organizationId === organizationId &&
          !notification.readAt) {
        notification.status = 'READ';
        notification.readAt = new Date();
        notification.updatedAt = new Date();
        this.notifications.set(id, notification);
        count++;
      }
    }
    this.eventEmitter.emit('notification.all.read', { userId, organizationId, count });
    return count;
  }

  async markAsDelivered(notificationId: string): Promise<Notification> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.status = 'DELIVERED';
    notification.deliveredAt = new Date();
    notification.updatedAt = new Date();
    this.notifications.set(notificationId, notification);
    this.eventEmitter.emit('notification.delivered', { notification });
    return notification;
  }

  async delete(notificationId: string): Promise<void> {
    if (!this.notifications.has(notificationId)) {
      throw new Error('Notification not found');
    }
    this.notifications.delete(notificationId);
    this.eventEmitter.emit('notification.deleted', { notificationId });
  }

  async deleteOld(olderThanDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let count = 0;
    for (const [id, notification] of this.notifications) {
      if (notification.createdAt < cutoff) {
        this.notifications.delete(id);
        count++;
      }
    }
    this.eventEmitter.emit('notification.cleanup', { deletedCount: count });
    return count;
  }

  // Template Management
  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    const now = new Date();
    const newTemplate: NotificationTemplate = {
      id: randomUUID(),
      ...template,
      createdAt: now,
      updatedAt: now,
    };
    this.templates.set(newTemplate.id, newTemplate);
    this.eventEmitter.emit('notification.template.created', { template: newTemplate });
    return newTemplate;
  }

  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const updated = {
      ...template,
      ...updates,
      id: template.id,
      createdAt: template.createdAt,
      updatedAt: new Date(),
    };
    this.templates.set(templateId, updated);
    this.eventEmitter.emit('notification.template.updated', { template: updated });
    return updated;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.templates.has(templateId)) {
      throw new Error('Template not found');
    }
    this.templates.delete(templateId);
    this.eventEmitter.emit('notification.template.deleted', { templateId });
  }

  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getTemplates(): Promise<NotificationTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByCategory(category: NotificationCategory): Promise<NotificationTemplate[]> {
    return Array.from(this.templates.values())
      .filter(t => t.category === category && t.isActive);
  }

  // Preference Management
  async setPreference(
    userId: string,
    organizationId: string,
    category: NotificationCategory,
    preference: Partial<Omit<NotificationPreference, 'id' | 'userId' | 'organizationId' | 'category' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationPreference> {
    const key = `${userId}:${category}`;
    const existing = this.preferences.get(key);
    const now = new Date();

    const updated: NotificationPreference = {
      id: existing?.id || randomUUID(),
      userId,
      organizationId,
      category,
      channels: preference.channels || existing?.channels || ['IN_APP', 'EMAIL'],
      enabled: preference.enabled ?? existing?.enabled ?? true,
      quietHoursStart: preference.quietHoursStart || existing?.quietHoursStart,
      quietHoursEnd: preference.quietHoursEnd || existing?.quietHoursEnd,
      emailDigest: preference.emailDigest || existing?.emailDigest || 'IMMEDIATE',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.preferences.set(key, updated);
    this.eventEmitter.emit('notification.preference.updated', { preference: updated });
    return updated;
  }

  async getPreference(userId: string, category: NotificationCategory): Promise<NotificationPreference | null> {
    return this.preferences.get(`${userId}:${category}`) || null;
  }

  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return Array.from(this.preferences.values())
      .filter(p => p.userId === userId);
  }

  async disableCategory(userId: string, organizationId: string, category: NotificationCategory): Promise<void> {
    await this.setPreference(userId, organizationId, category, { enabled: false });
  }

  async enableCategory(userId: string, organizationId: string, category: NotificationCategory): Promise<void> {
    await this.setPreference(userId, organizationId, category, { enabled: true });
  }

  // Group Management
  async createGroup(organizationId: string, name: string, nameRo: string, userIds: string[]): Promise<NotificationGroup> {
    const now = new Date();
    const group: NotificationGroup = {
      id: randomUUID(),
      organizationId,
      name,
      nameRo,
      userIds,
      createdAt: now,
      updatedAt: now,
    };
    this.groups.set(group.id, group);
    this.eventEmitter.emit('notification.group.created', { group });
    return group;
  }

  async updateGroup(groupId: string, updates: Partial<Omit<NotificationGroup, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>): Promise<NotificationGroup> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const updated = {
      ...group,
      ...updates,
      updatedAt: new Date(),
    };
    this.groups.set(groupId, updated);
    this.eventEmitter.emit('notification.group.updated', { group: updated });
    return updated;
  }

  async deleteGroup(groupId: string): Promise<void> {
    if (!this.groups.has(groupId)) {
      throw new Error('Group not found');
    }
    this.groups.delete(groupId);
    this.eventEmitter.emit('notification.group.deleted', { groupId });
  }

  async getGroup(groupId: string): Promise<NotificationGroup | null> {
    return this.groups.get(groupId) || null;
  }

  async getGroups(organizationId: string): Promise<NotificationGroup[]> {
    return Array.from(this.groups.values())
      .filter(g => g.organizationId === organizationId);
  }

  async addUserToGroup(groupId: string, userId: string): Promise<NotificationGroup> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    if (!group.userIds.includes(userId)) {
      group.userIds.push(userId);
      group.updatedAt = new Date();
      this.groups.set(groupId, group);
    }
    return group;
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<NotificationGroup> {
    const group = this.groups.get(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    group.userIds = group.userIds.filter(id => id !== userId);
    group.updatedAt = new Date();
    this.groups.set(groupId, group);
    return group;
  }

  // Device Token Management (for push notifications)
  async registerDeviceToken(userId: string, token: string): Promise<void> {
    const tokens = this.deviceTokens.get(userId) || [];
    if (!tokens.includes(token)) {
      tokens.push(token);
      this.deviceTokens.set(userId, tokens);
    }
    this.eventEmitter.emit('notification.device.registered', { userId, token });
  }

  async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    const tokens = this.deviceTokens.get(userId) || [];
    this.deviceTokens.set(userId, tokens.filter(t => t !== token));
    this.eventEmitter.emit('notification.device.unregistered', { userId, token });
  }

  async getUserDeviceTokens(userId: string): Promise<string[]> {
    return this.deviceTokens.get(userId) || [];
  }

  // Statistics
  async getStatistics(organizationId: string, from?: Date, to?: Date): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    byCategory: Record<NotificationCategory, number>;
    byChannel: Record<NotificationChannel, number>;
    deliveryRate: number;
    readRate: number;
  }> {
    let notifications = Array.from(this.notifications.values())
      .filter(n => n.organizationId === organizationId);

    if (from) {
      notifications = notifications.filter(n => n.createdAt >= from);
    }
    if (to) {
      notifications = notifications.filter(n => n.createdAt <= to);
    }

    const totalSent = notifications.filter(n => n.sentAt).length;
    const totalDelivered = notifications.filter(n => n.deliveredAt).length;
    const totalRead = notifications.filter(n => n.readAt).length;
    const totalFailed = notifications.filter(n => n.status === 'FAILED').length;

    const byCategory = {} as Record<NotificationCategory, number>;
    const byChannel = {} as Record<NotificationChannel, number>;

    for (const notification of notifications) {
      byCategory[notification.category] = (byCategory[notification.category] || 0) + 1;
      for (const channel of notification.channels) {
        byChannel[channel] = (byChannel[channel] || 0) + 1;
      }
    }

    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      byCategory,
      byChannel,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      readRate: totalDelivered > 0 ? (totalRead / totalDelivered) * 100 : 0,
    };
  }

  // Metadata
  async getCategories(): Promise<{ category: NotificationCategory; name: string; nameRo: string }[]> {
    return [
      { category: 'SYSTEM', name: 'System', nameRo: 'Sistem' },
      { category: 'INVOICE', name: 'Invoice', nameRo: 'Factură' },
      { category: 'PAYMENT', name: 'Payment', nameRo: 'Plată' },
      { category: 'REMINDER', name: 'Reminder', nameRo: 'Reamintire' },
      { category: 'ALERT', name: 'Alert', nameRo: 'Alertă' },
      { category: 'ANAF', name: 'ANAF', nameRo: 'ANAF' },
      { category: 'APPROVAL', name: 'Approval', nameRo: 'Aprobare' },
      { category: 'TASK', name: 'Task', nameRo: 'Sarcină' },
      { category: 'DOCUMENT', name: 'Document', nameRo: 'Document' },
      { category: 'SECURITY', name: 'Security', nameRo: 'Securitate' },
      { category: 'MARKETING', name: 'Marketing', nameRo: 'Marketing' },
      { category: 'UPDATE', name: 'Update', nameRo: 'Actualizare' },
    ];
  }

  async getChannels(): Promise<{ channel: NotificationChannel; name: string; nameRo: string }[]> {
    return [
      { channel: 'IN_APP', name: 'In-App', nameRo: 'În Aplicație' },
      { channel: 'EMAIL', name: 'Email', nameRo: 'Email' },
      { channel: 'SMS', name: 'SMS', nameRo: 'SMS' },
      { channel: 'PUSH', name: 'Push Notification', nameRo: 'Notificare Push' },
      { channel: 'WEBHOOK', name: 'Webhook', nameRo: 'Webhook' },
    ];
  }

  async getPriorities(): Promise<{ priority: NotificationPriority; name: string; nameRo: string }[]> {
    return [
      { priority: 'LOW', name: 'Low', nameRo: 'Scăzută' },
      { priority: 'NORMAL', name: 'Normal', nameRo: 'Normală' },
      { priority: 'HIGH', name: 'High', nameRo: 'Ridicată' },
      { priority: 'URGENT', name: 'Urgent', nameRo: 'Urgentă' },
    ];
  }
}
