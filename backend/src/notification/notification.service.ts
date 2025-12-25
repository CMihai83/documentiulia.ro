import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'ALERT'
  | 'REMINDER'
  | 'TASK'
  | 'MESSAGE'
  | 'SYSTEM';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED';

export type NotificationCategory =
  | 'INVOICE'
  | 'PAYMENT'
  | 'TAX'
  | 'ANAF'
  | 'SAGA'
  | 'HR'
  | 'REPORT'
  | 'SECURITY'
  | 'SYSTEM'
  | 'MARKETING'
  | 'GENERAL';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  titleRo: string;
  message: string;
  messageRo: string;
  channels: NotificationChannel[];
  status: NotificationStatus;
  userId: string;
  organizationId?: string;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelRo?: string;
  icon?: string;
  image?: string;
  expiresAt?: Date;
  readAt?: Date;
  deliveredAt?: Date;
  deliveryResults: DeliveryResult[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryResult {
  channel: NotificationChannel;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  sentAt?: Date;
  error?: string;
  externalId?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: NotificationCategory;
  type: NotificationType;
  titleTemplate: string;
  titleTemplateRo: string;
  messageTemplate: string;
  messageTemplateRo: string;
  defaultChannels: NotificationChannel[];
  defaultPriority: NotificationPriority;
  variables: TemplateVariable[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  description: string;
  descriptionRo: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'URL';
  required: boolean;
  defaultValue?: any;
}

export interface UserNotificationPreferences {
  userId: string;
  enabled: boolean;
  channels: {
    [key in NotificationChannel]: boolean;
  };
  categories: {
    [key in NotificationCategory]: {
      enabled: boolean;
      channels: NotificationChannel[];
    };
  };
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  language: 'ro' | 'en';
  updatedAt: Date;
}

export interface NotificationStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  byType: Record<NotificationType, number>;
  byCategory: Record<NotificationCategory, number>;
  byChannel: Record<NotificationChannel, number>;
  deliveryRate: number;
  readRate: number;
  averageDeliveryTime: number;
  recentNotifications: Notification[];
}

export interface SendNotificationOptions {
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  actionLabelRo?: string;
  icon?: string;
  image?: string;
  expiresAt?: Date;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  organizationId?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private notifications: Map<string, Notification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private preferences: Map<string, UserNotificationPreferences> = new Map();
  private deliveryTimes: number[] = [];

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Invoice Created',
        nameRo: 'Factură Creată',
        description: 'Notification when a new invoice is created',
        descriptionRo: 'Notificare când se creează o factură nouă',
        category: 'INVOICE',
        type: 'SUCCESS',
        titleTemplate: 'Invoice {{invoiceNumber}} Created',
        titleTemplateRo: 'Factura {{invoiceNumber}} a fost creată',
        messageTemplate: 'Invoice {{invoiceNumber}} for {{amount}} {{currency}} has been created successfully.',
        messageTemplateRo: 'Factura {{invoiceNumber}} în valoare de {{amount}} {{currency}} a fost creată cu succes.',
        defaultChannels: ['IN_APP', 'EMAIL'],
        defaultPriority: 'NORMAL',
        variables: [
          { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
          { name: 'amount', description: 'Amount', descriptionRo: 'Sumă', type: 'CURRENCY', required: true },
          { name: 'currency', description: 'Currency', descriptionRo: 'Monedă', type: 'STRING', required: true, defaultValue: 'RON' },
        ],
        isActive: true,
      },
      {
        name: 'Payment Received',
        nameRo: 'Plată Primită',
        description: 'Notification when a payment is received',
        descriptionRo: 'Notificare când se primește o plată',
        category: 'PAYMENT',
        type: 'SUCCESS',
        titleTemplate: 'Payment Received',
        titleTemplateRo: 'Plată Primită',
        messageTemplate: 'Payment of {{amount}} {{currency}} received for invoice {{invoiceNumber}}.',
        messageTemplateRo: 'Plata de {{amount}} {{currency}} a fost primită pentru factura {{invoiceNumber}}.',
        defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
        defaultPriority: 'HIGH',
        variables: [
          { name: 'amount', description: 'Amount', descriptionRo: 'Sumă', type: 'CURRENCY', required: true },
          { name: 'currency', description: 'Currency', descriptionRo: 'Monedă', type: 'STRING', required: true, defaultValue: 'RON' },
          { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
        ],
        isActive: true,
      },
      {
        name: 'Payment Due Reminder',
        nameRo: 'Reamintire Plată Scadentă',
        description: 'Reminder for upcoming payment due date',
        descriptionRo: 'Reamintire pentru data scadentă apropiată',
        category: 'PAYMENT',
        type: 'REMINDER',
        titleTemplate: 'Payment Due in {{days}} Days',
        titleTemplateRo: 'Plată scadentă în {{days}} zile',
        messageTemplate: 'Invoice {{invoiceNumber}} for {{amount}} {{currency}} is due on {{dueDate}}.',
        messageTemplateRo: 'Factura {{invoiceNumber}} în valoare de {{amount}} {{currency}} are scadența la {{dueDate}}.',
        defaultChannels: ['IN_APP', 'EMAIL'],
        defaultPriority: 'HIGH',
        variables: [
          { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
          { name: 'amount', description: 'Amount', descriptionRo: 'Sumă', type: 'CURRENCY', required: true },
          { name: 'currency', description: 'Currency', descriptionRo: 'Monedă', type: 'STRING', required: true, defaultValue: 'RON' },
          { name: 'dueDate', description: 'Due date', descriptionRo: 'Data scadentă', type: 'DATE', required: true },
          { name: 'days', description: 'Days until due', descriptionRo: 'Zile până la scadență', type: 'NUMBER', required: true },
        ],
        isActive: true,
      },
      {
        name: 'ANAF Submission Status',
        nameRo: 'Status Trimitere ANAF',
        description: 'Notification about ANAF e-Factura submission status',
        descriptionRo: 'Notificare despre statusul trimiterii e-Factura către ANAF',
        category: 'ANAF',
        type: 'INFO',
        titleTemplate: 'ANAF Submission: {{status}}',
        titleTemplateRo: 'Trimitere ANAF: {{status}}',
        messageTemplate: 'Your e-Factura submission for {{invoiceNumber}} has been {{status}}. Reference: {{referenceId}}',
        messageTemplateRo: 'Trimiterea e-Factura pentru {{invoiceNumber}} a fost {{status}}. Referință: {{referenceId}}',
        defaultChannels: ['IN_APP', 'EMAIL'],
        defaultPriority: 'HIGH',
        variables: [
          { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
          { name: 'status', description: 'Submission status', descriptionRo: 'Status trimitere', type: 'STRING', required: true },
          { name: 'referenceId', description: 'Reference ID', descriptionRo: 'ID Referință', type: 'STRING', required: true },
        ],
        isActive: true,
      },
      {
        name: 'Tax Deadline Reminder',
        nameRo: 'Reamintire Termen Fiscal',
        description: 'Reminder for upcoming tax deadline',
        descriptionRo: 'Reamintire pentru termenul fiscal apropiat',
        category: 'TAX',
        type: 'ALERT',
        titleTemplate: 'Tax Deadline: {{declarationType}}',
        titleTemplateRo: 'Termen Fiscal: {{declarationType}}',
        messageTemplate: '{{declarationType}} is due on {{deadline}}. Please submit before the deadline.',
        messageTemplateRo: '{{declarationType}} are termen {{deadline}}. Vă rugăm să depuneți înainte de termen.',
        defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
        defaultPriority: 'URGENT',
        variables: [
          { name: 'declarationType', description: 'Declaration type', descriptionRo: 'Tip declarație', type: 'STRING', required: true },
          { name: 'deadline', description: 'Deadline date', descriptionRo: 'Data limită', type: 'DATE', required: true },
        ],
        isActive: true,
      },
      {
        name: 'SAGA Sync Complete',
        nameRo: 'Sincronizare SAGA Completă',
        description: 'Notification when SAGA sync is complete',
        descriptionRo: 'Notificare când sincronizarea SAGA este completă',
        category: 'SAGA',
        type: 'SUCCESS',
        titleTemplate: 'SAGA Sync Complete',
        titleTemplateRo: 'Sincronizare SAGA Completă',
        messageTemplate: 'SAGA synchronization completed. {{recordCount}} records synced.',
        messageTemplateRo: 'Sincronizarea SAGA s-a finalizat. {{recordCount}} înregistrări sincronizate.',
        defaultChannels: ['IN_APP'],
        defaultPriority: 'NORMAL',
        variables: [
          { name: 'recordCount', description: 'Number of records', descriptionRo: 'Număr înregistrări', type: 'NUMBER', required: true },
        ],
        isActive: true,
      },
      {
        name: 'Security Alert',
        nameRo: 'Alertă Securitate',
        description: 'Security-related alert',
        descriptionRo: 'Alertă legată de securitate',
        category: 'SECURITY',
        type: 'ALERT',
        titleTemplate: 'Security Alert: {{alertType}}',
        titleTemplateRo: 'Alertă Securitate: {{alertType}}',
        messageTemplate: '{{message}} from {{location}} at {{time}}.',
        messageTemplateRo: '{{message}} din {{location}} la {{time}}.',
        defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
        defaultPriority: 'URGENT',
        variables: [
          { name: 'alertType', description: 'Alert type', descriptionRo: 'Tip alertă', type: 'STRING', required: true },
          { name: 'message', description: 'Alert message', descriptionRo: 'Mesaj alertă', type: 'STRING', required: true },
          { name: 'location', description: 'Location', descriptionRo: 'Locație', type: 'STRING', required: false },
          { name: 'time', description: 'Time', descriptionRo: 'Ora', type: 'STRING', required: true },
        ],
        isActive: true,
      },
    ];

    const now = new Date();
    defaultTemplates.forEach((template) => {
      const id = this.generateId('tmpl');
      this.templates.set(id, { ...template, id, createdAt: now, updatedAt: now });
    });
  }

  // Sending Notifications

  async sendNotification(
    userId: string,
    type: NotificationType,
    category: NotificationCategory,
    title: string,
    titleRo: string,
    message: string,
    messageRo: string,
    options: SendNotificationOptions = {},
  ): Promise<Notification> {
    const prefs = this.preferences.get(userId);

    // Check if notifications are enabled
    if (prefs && !prefs.enabled) {
      throw new Error('Notifications are disabled for this user');
    }

    // Check category preferences
    if (prefs && !prefs.categories[category]?.enabled) {
      throw new Error(`Category ${category} is disabled for this user`);
    }

    // Determine channels
    let channels = options.channels || ['IN_APP'];
    if (prefs) {
      channels = channels.filter((ch) => prefs.channels[ch]);
      if (prefs.categories[category]?.channels) {
        channels = channels.filter((ch) => prefs.categories[category].channels.includes(ch));
      }
    }

    if (channels.length === 0) {
      channels = ['IN_APP']; // Fallback
    }

    const notificationId = this.generateId('notif');
    const now = new Date();

    const notification: Notification = {
      id: notificationId,
      type,
      category,
      priority: options.priority || 'NORMAL',
      title,
      titleRo,
      message,
      messageRo,
      channels,
      status: 'PENDING',
      userId,
      organizationId: options.organizationId,
      data: options.data,
      actionUrl: options.actionUrl,
      actionLabel: options.actionLabel,
      actionLabelRo: options.actionLabelRo,
      icon: options.icon,
      image: options.image,
      expiresAt: options.expiresAt,
      deliveryResults: [],
      metadata: options.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.notifications.set(notificationId, notification);

    // Deliver to channels
    await this.deliverNotification(notification);

    this.eventEmitter.emit('notification.created', {
      notificationId,
      userId,
      type,
      category,
    });

    this.logger.log(`Notification sent: ${notificationId} to ${userId}`);

    return notification;
  }

  async sendFromTemplate(
    userId: string,
    templateId: string,
    data: Record<string, any>,
    options: SendNotificationOptions = {},
  ): Promise<Notification> {
    const template = this.templates.get(templateId);
    if (!template) {
      // Try by name
      const byName = Array.from(this.templates.values()).find((t) => t.name === templateId);
      if (!byName) {
        throw new Error(`Template not found: ${templateId}`);
      }
      return this.sendFromTemplateObj(userId, byName, data, options);
    }

    return this.sendFromTemplateObj(userId, template, data, options);
  }

  private async sendFromTemplateObj(
    userId: string,
    template: NotificationTemplate,
    data: Record<string, any>,
    options: SendNotificationOptions = {},
  ): Promise<Notification> {
    if (!template.isActive) {
      throw new Error('Template is not active');
    }

    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && data[variable.name] === undefined) {
        if (variable.defaultValue !== undefined) {
          data[variable.name] = variable.defaultValue;
        } else {
          throw new Error(`Missing required variable: ${variable.name}`);
        }
      }
    }

    const title = this.interpolate(template.titleTemplate, data);
    const titleRo = this.interpolate(template.titleTemplateRo, data);
    const message = this.interpolate(template.messageTemplate, data);
    const messageRo = this.interpolate(template.messageTemplateRo, data);

    return this.sendNotification(
      userId,
      template.type,
      template.category,
      title,
      titleRo,
      message,
      messageRo,
      {
        ...options,
        channels: options.channels || template.defaultChannels,
        priority: options.priority || template.defaultPriority,
        data,
      },
    );
  }

  async sendBulkNotification(
    userIds: string[],
    type: NotificationType,
    category: NotificationCategory,
    title: string,
    titleRo: string,
    message: string,
    messageRo: string,
    options: SendNotificationOptions = {},
  ): Promise<{ sent: number; failed: number; notifications: Notification[] }> {
    const notifications: Notification[] = [];
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const notification = await this.sendNotification(
          userId,
          type,
          category,
          title,
          titleRo,
          message,
          messageRo,
          options,
        );
        notifications.push(notification);
        sent++;
      } catch (err) {
        failed++;
        this.logger.warn(`Failed to send notification to ${userId}: ${err}`);
      }
    }

    this.eventEmitter.emit('notification.bulk.completed', { sent, failed });

    return { sent, failed, notifications };
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    const startTime = Date.now();

    for (const channel of notification.channels) {
      try {
        await this.deliverToChannel(notification, channel);

        notification.deliveryResults.push({
          channel,
          status: 'SUCCESS',
          sentAt: new Date(),
        });
      } catch (err) {
        notification.deliveryResults.push({
          channel,
          status: 'FAILED',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Update status based on results
    const successCount = notification.deliveryResults.filter((r) => r.status === 'SUCCESS').length;
    if (successCount > 0) {
      notification.status = 'SENT';
      notification.deliveredAt = new Date();

      const deliveryTime = Date.now() - startTime;
      this.deliveryTimes.push(deliveryTime);
      if (this.deliveryTimes.length > 1000) {
        this.deliveryTimes = this.deliveryTimes.slice(-500);
      }

      this.eventEmitter.emit('notification.delivered', {
        notificationId: notification.id,
        channels: notification.channels,
      });
    } else {
      notification.status = 'FAILED';

      this.eventEmitter.emit('notification.failed', {
        notificationId: notification.id,
        errors: notification.deliveryResults.map((r) => r.error),
      });
    }

    notification.updatedAt = new Date();
    this.notifications.set(notification.id, notification);
  }

  private async deliverToChannel(notification: Notification, channel: NotificationChannel): Promise<void> {
    // Simulate delivery
    await new Promise((resolve) => setTimeout(resolve, 10));

    switch (channel) {
      case 'IN_APP':
        // In-app notifications are stored and immediately available
        break;
      case 'EMAIL':
        // Would integrate with email service
        break;
      case 'SMS':
        // Would integrate with SMS provider
        break;
      case 'PUSH':
        // Would integrate with push notification service
        break;
      case 'WEBHOOK':
        // Would call configured webhook
        break;
    }

    // Simulate failure for testing
    if (notification.data?.simulateFailure === channel) {
      throw new Error(`Simulated ${channel} failure`);
    }
  }

  // Notification Management

  async getNotification(notificationId: string): Promise<Notification | undefined> {
    return this.notifications.get(notificationId);
  }

  async getUserNotifications(
    userId: string,
    options?: { limit?: number; unreadOnly?: boolean; category?: NotificationCategory },
  ): Promise<Notification[]> {
    let notifications = Array.from(this.notifications.values())
      .filter((n) => n.userId === userId);

    if (options?.unreadOnly) {
      notifications = notifications.filter((n) => !n.readAt);
    }

    if (options?.category) {
      notifications = notifications.filter((n) => n.category === options.category);
    }

    return notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, options?.limit || 50);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId && !n.readAt)
      .length;
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      notification.status = 'READ';
      notification.updatedAt = new Date();
      this.notifications.set(notificationId, notification);

      this.eventEmitter.emit('notification.read', { notificationId });
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    let count = 0;
    const now = new Date();

    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId && !notification.readAt) {
        notification.readAt = now;
        notification.status = 'READ';
        notification.updatedAt = now;
        this.notifications.set(id, notification);
        count++;
      }
    }

    if (count > 0) {
      this.eventEmitter.emit('notification.all.read', { userId, count });
    }

    return count;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    if (!this.notifications.has(notificationId)) {
      throw new Error('Notification not found');
    }

    this.notifications.delete(notificationId);

    this.eventEmitter.emit('notification.deleted', { notificationId });
  }

  async deleteUserNotifications(userId: string): Promise<number> {
    let count = 0;

    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId) {
        this.notifications.delete(id);
        count++;
      }
    }

    return count;
  }

  // User Preferences

  async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    let prefs = this.preferences.get(userId);

    if (!prefs) {
      prefs = this.getDefaultPreferences(userId);
      this.preferences.set(userId, prefs);
    }

    return prefs;
  }

  async updateUserPreferences(
    userId: string,
    updates: Partial<Omit<UserNotificationPreferences, 'userId' | 'updatedAt'>>,
  ): Promise<UserNotificationPreferences> {
    let prefs = await this.getUserPreferences(userId);

    prefs = {
      ...prefs,
      ...updates,
      channels: { ...prefs.channels, ...updates.channels },
      categories: { ...prefs.categories, ...updates.categories },
      updatedAt: new Date(),
    };

    this.preferences.set(userId, prefs);

    this.eventEmitter.emit('notification.preferences.updated', { userId });

    return prefs;
  }

  private getDefaultPreferences(userId: string): UserNotificationPreferences {
    const categories: UserNotificationPreferences['categories'] = {} as any;
    const allCategories: NotificationCategory[] = [
      'INVOICE', 'PAYMENT', 'TAX', 'ANAF', 'SAGA', 'HR', 'REPORT', 'SECURITY', 'SYSTEM', 'MARKETING', 'GENERAL',
    ];

    allCategories.forEach((cat) => {
      categories[cat] = {
        enabled: true,
        channels: ['IN_APP', 'EMAIL'],
      };
    });

    // Security always gets all channels
    categories['SECURITY'] = {
      enabled: true,
      channels: ['IN_APP', 'EMAIL', 'PUSH'],
    };

    return {
      userId,
      enabled: true,
      channels: {
        IN_APP: true,
        EMAIL: true,
        SMS: false,
        PUSH: true,
        WEBHOOK: false,
      },
      categories,
      language: 'ro',
      updatedAt: new Date(),
    };
  }

  // Template Management

  async createTemplate(
    template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NotificationTemplate> {
    const id = this.generateId('tmpl');
    const now = new Date();

    const newTemplate: NotificationTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(id, newTemplate);

    this.eventEmitter.emit('notification.template.created', { templateId: id, name: template.name });

    return newTemplate;
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<NotificationTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const updated: NotificationTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);

    this.eventEmitter.emit('notification.template.updated', { templateId });

    return updated;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.templates.has(templateId)) {
      throw new Error('Template not found');
    }

    this.templates.delete(templateId);

    this.eventEmitter.emit('notification.template.deleted', { templateId });
  }

  async getTemplate(templateId: string): Promise<NotificationTemplate | undefined> {
    return this.templates.get(templateId);
  }

  async getTemplateByName(name: string): Promise<NotificationTemplate | undefined> {
    return Array.from(this.templates.values()).find((t) => t.name === name);
  }

  async getAllTemplates(): Promise<NotificationTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByCategory(category: NotificationCategory): Promise<NotificationTemplate[]> {
    return Array.from(this.templates.values()).filter((t) => t.category === category);
  }

  // Statistics

  async getStats(userId?: string): Promise<NotificationStats> {
    let notifications = Array.from(this.notifications.values());

    if (userId) {
      notifications = notifications.filter((n) => n.userId === userId);
    }

    const sent = notifications.filter((n) => n.status !== 'PENDING').length;
    const delivered = notifications.filter((n) => n.deliveredAt).length;
    const read = notifications.filter((n) => n.readAt).length;
    const failed = notifications.filter((n) => n.status === 'FAILED').length;

    const byType: Record<NotificationType, number> = {} as any;
    const byCategory: Record<NotificationCategory, number> = {} as any;
    const byChannel: Record<NotificationChannel, number> = {} as any;

    for (const notification of notifications) {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      byCategory[notification.category] = (byCategory[notification.category] || 0) + 1;

      for (const channel of notification.channels) {
        byChannel[channel] = (byChannel[channel] || 0) + 1;
      }
    }

    const avgDeliveryTime =
      this.deliveryTimes.length > 0
        ? this.deliveryTimes.reduce((a, b) => a + b, 0) / this.deliveryTimes.length
        : 0;

    return {
      total: notifications.length,
      sent,
      delivered,
      read,
      failed,
      byType,
      byCategory,
      byChannel,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      readRate: delivered > 0 ? (read / delivered) * 100 : 0,
      averageDeliveryTime: Math.floor(avgDeliveryTime),
      recentNotifications: notifications.slice(-10).reverse(),
    };
  }

  // Helper Methods

  private interpolate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
