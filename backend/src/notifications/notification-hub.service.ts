import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'SLACK' | 'WEBHOOK';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type NotificationCategory = 'SYSTEM' | 'BILLING' | 'SECURITY' | 'MARKETING' | 'UPDATES' | 'REMINDERS' | 'ALERTS';

export interface NotificationTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  subject: string;
  subjectRo: string;
  body: string;
  bodyRo: string;
  variables: TemplateVariable[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TemplateVariable {
  name: string;
  label: string;
  labelRo: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'URL';
  required: boolean;
  defaultValue?: string;
}

export interface UserNotificationPreferences {
  userId: string;
  channels: {
    [key in NotificationChannel]: {
      enabled: boolean;
      address?: string;
    };
  };
  categories: {
    [key in NotificationCategory]: {
      enabled: boolean;
      channels: NotificationChannel[];
    };
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  language: 'RO' | 'EN';
  updatedAt: Date;
}

export interface Notification {
  id: string;
  templateId?: string;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  priority: NotificationPriority;
  subject: string;
  body: string;
  variables: Record<string, any>;
  status: NotificationStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface NotificationBatch {
  id: string;
  name: string;
  templateId: string;
  recipients: string[];
  channel: NotificationChannel;
  status: 'DRAFT' | 'SCHEDULED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  createdBy: string;
}

export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  config: Record<string, any>;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  dailyLimit?: number;
}

export interface NotificationStats {
  totalNotifications: number;
  byChannel: Record<NotificationChannel, number>;
  byStatus: Record<NotificationStatus, number>;
  byCategory: Record<NotificationCategory, number>;
  deliveryRate: number;
  averageDeliveryTimeMs: number;
}

export interface CreateNotificationDto {
  templateId?: string;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  subject?: string;
  body?: string;
  variables?: Record<string, any>;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface CreateTemplateDto {
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: NotificationCategory;
  channels: NotificationChannel[];
  subject: string;
  subjectRo: string;
  body: string;
  bodyRo: string;
  variables?: TemplateVariable[];
  createdBy: string;
}

@Injectable()
export class NotificationHubService {
  private templates = new Map<string, NotificationTemplate>();
  private notifications = new Map<string, Notification>();
  private preferences = new Map<string, UserNotificationPreferences>();
  private batches = new Map<string, NotificationBatch>();
  private channelConfigs = new Map<NotificationChannel, ChannelConfig>();
  private channelUsage = new Map<NotificationChannel, { minute: number; hour: number; day: number; lastReset: Date }>();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeChannelConfigs();
    this.initializeSystemTemplates();
  }

  private initializeChannelConfigs(): void {
    const channels: NotificationChannel[] = ['EMAIL', 'SMS', 'PUSH', 'IN_APP', 'SLACK', 'WEBHOOK'];

    channels.forEach((channel) => {
      this.channelConfigs.set(channel, {
        channel,
        enabled: true,
        config: {},
        rateLimitPerMinute: channel === 'SMS' ? 60 : 300,
        rateLimitPerHour: channel === 'SMS' ? 1000 : 5000,
        dailyLimit: channel === 'SMS' ? 10000 : undefined,
      });

      this.channelUsage.set(channel, {
        minute: 0,
        hour: 0,
        day: 0,
        lastReset: new Date(),
      });
    });
  }

  private initializeSystemTemplates(): void {
    const systemTemplates: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Welcome Email',
        nameRo: 'Email de Bun Venit',
        description: 'Welcome email for new users',
        descriptionRo: 'Email de bun venit pentru utilizatori noi',
        category: 'SYSTEM',
        channels: ['EMAIL'],
        subject: 'Welcome to DocumentIulia!',
        subjectRo: 'Bine ați venit la DocumentIulia!',
        body: 'Dear {{userName}},\n\nWelcome to DocumentIulia! Your account has been created successfully.\n\nBest regards,\nThe DocumentIulia Team',
        bodyRo: 'Dragă {{userName}},\n\nBine ați venit la DocumentIulia! Contul dumneavoastră a fost creat cu succes.\n\nCu stimă,\nEchipa DocumentIulia',
        variables: [
          { name: 'userName', label: 'User Name', labelRo: 'Nume Utilizator', type: 'STRING', required: true },
        ],
        isActive: true,
        createdBy: 'system',
      },
      {
        name: 'Password Reset',
        nameRo: 'Resetare Parolă',
        description: 'Password reset notification',
        descriptionRo: 'Notificare pentru resetare parolă',
        category: 'SECURITY',
        channels: ['EMAIL'],
        subject: 'Password Reset Request',
        subjectRo: 'Cerere de Resetare a Parolei',
        body: 'Hello {{userName}},\n\nA password reset was requested for your account. Click here to reset: {{resetUrl}}\n\nIf you did not request this, please ignore this email.',
        bodyRo: 'Bună ziua {{userName}},\n\nA fost solicitată resetarea parolei pentru contul dumneavoastră. Apăsați aici pentru resetare: {{resetUrl}}\n\nDacă nu ați solicitat aceasta, ignorați acest email.',
        variables: [
          { name: 'userName', label: 'User Name', labelRo: 'Nume Utilizator', type: 'STRING', required: true },
          { name: 'resetUrl', label: 'Reset URL', labelRo: 'URL Resetare', type: 'URL', required: true },
        ],
        isActive: true,
        createdBy: 'system',
      },
      {
        name: 'Invoice Due Reminder',
        nameRo: 'Memento Scadență Factură',
        description: 'Reminder for upcoming invoice due date',
        descriptionRo: 'Memento pentru scadența apropiată a facturii',
        category: 'BILLING',
        channels: ['EMAIL', 'SMS', 'PUSH'],
        subject: 'Invoice {{invoiceNumber}} Due Soon',
        subjectRo: 'Factura {{invoiceNumber}} Scadentă în Curând',
        body: 'Dear {{customerName}},\n\nThis is a reminder that invoice {{invoiceNumber}} for {{amount}} RON is due on {{dueDate}}.\n\nPlease ensure timely payment to avoid any late fees.',
        bodyRo: 'Stimate {{customerName}},\n\nAceasta este o reamintire că factura {{invoiceNumber}} în valoare de {{amount}} RON este scadentă pe {{dueDate}}.\n\nVă rugăm să efectuați plata la timp pentru a evita penalitățile.',
        variables: [
          { name: 'customerName', label: 'Customer Name', labelRo: 'Nume Client', type: 'STRING', required: true },
          { name: 'invoiceNumber', label: 'Invoice Number', labelRo: 'Număr Factură', type: 'STRING', required: true },
          { name: 'amount', label: 'Amount', labelRo: 'Sumă', type: 'NUMBER', required: true },
          { name: 'dueDate', label: 'Due Date', labelRo: 'Data Scadenței', type: 'DATE', required: true },
        ],
        isActive: true,
        createdBy: 'system',
      },
      {
        name: 'ANAF Deadline Alert',
        nameRo: 'Alertă Termen ANAF',
        description: 'Alert for upcoming ANAF submission deadline',
        descriptionRo: 'Alertă pentru termen apropiat de depunere ANAF',
        category: 'ALERTS',
        channels: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'],
        subject: 'ANAF Deadline: {{declarationType}} due in {{daysLeft}} days',
        subjectRo: 'Termen ANAF: {{declarationType}} scadent în {{daysLeft}} zile',
        body: 'Important: Your {{declarationType}} declaration must be submitted by {{deadline}}. Only {{daysLeft}} days remaining.\n\nClick here to submit: {{submissionUrl}}',
        bodyRo: 'Important: Declarația {{declarationType}} trebuie depusă până la {{deadline}}. Mai sunt {{daysLeft}} zile.\n\nApăsați aici pentru depunere: {{submissionUrl}}',
        variables: [
          { name: 'declarationType', label: 'Declaration Type', labelRo: 'Tip Declarație', type: 'STRING', required: true },
          { name: 'deadline', label: 'Deadline', labelRo: 'Termen Limită', type: 'DATE', required: true },
          { name: 'daysLeft', label: 'Days Left', labelRo: 'Zile Rămase', type: 'NUMBER', required: true },
          { name: 'submissionUrl', label: 'Submission URL', labelRo: 'URL Depunere', type: 'URL', required: true },
        ],
        isActive: true,
        createdBy: 'system',
      },
    ];

    systemTemplates.forEach((template) => {
      const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  // Template Management
  createTemplate(dto: CreateTemplateDto): NotificationTemplate {
    const template: NotificationTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: dto.name,
      nameRo: dto.nameRo,
      description: dto.description,
      descriptionRo: dto.descriptionRo,
      category: dto.category,
      channels: dto.channels,
      subject: dto.subject,
      subjectRo: dto.subjectRo,
      body: dto.body,
      bodyRo: dto.bodyRo,
      variables: dto.variables || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: dto.createdBy,
    };

    this.templates.set(template.id, template);
    this.eventEmitter.emit('notification.template.created', { templateId: template.id });
    return template;
  }

  getTemplate(templateId: string): NotificationTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    return template;
  }

  getTemplates(filters?: { category?: NotificationCategory; channel?: NotificationChannel; active?: boolean }): NotificationTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filters?.category) {
      templates = templates.filter((t) => t.category === filters.category);
    }
    if (filters?.channel) {
      templates = templates.filter((t) => t.channels.includes(filters.channel!));
    }
    if (filters?.active !== undefined) {
      templates = templates.filter((t) => t.isActive === filters.active);
    }

    return templates;
  }

  updateTemplate(templateId: string, updates: Partial<CreateTemplateDto>): NotificationTemplate {
    const template = this.getTemplate(templateId);

    if (template.createdBy === 'system') {
      throw new BadRequestException('Cannot modify system templates');
    }

    const updated: NotificationTemplate = {
      ...template,
      ...updates,
      id: template.id,
      createdAt: template.createdAt,
      createdBy: template.createdBy,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);
    return updated;
  }

  deleteTemplate(templateId: string): void {
    const template = this.getTemplate(templateId);

    if (template.createdBy === 'system') {
      throw new BadRequestException('Cannot delete system templates');
    }

    this.templates.delete(templateId);
    this.eventEmitter.emit('notification.template.deleted', { templateId });
  }

  // User Preferences
  getUserPreferences(userId: string): UserNotificationPreferences {
    let prefs = this.preferences.get(userId);

    if (!prefs) {
      prefs = this.createDefaultPreferences(userId);
      this.preferences.set(userId, prefs);
    }

    return prefs;
  }

  private createDefaultPreferences(userId: string): UserNotificationPreferences {
    const channels: { [key in NotificationChannel]: { enabled: boolean; address?: string } } = {
      EMAIL: { enabled: true },
      SMS: { enabled: true },
      PUSH: { enabled: true },
      IN_APP: { enabled: true },
      SLACK: { enabled: false },
      WEBHOOK: { enabled: false },
    };

    const categories: { [key in NotificationCategory]: { enabled: boolean; channels: NotificationChannel[] } } = {
      SYSTEM: { enabled: true, channels: ['EMAIL', 'IN_APP'] },
      BILLING: { enabled: true, channels: ['EMAIL', 'SMS', 'IN_APP'] },
      SECURITY: { enabled: true, channels: ['EMAIL', 'SMS', 'PUSH'] },
      MARKETING: { enabled: false, channels: ['EMAIL'] },
      UPDATES: { enabled: true, channels: ['EMAIL', 'IN_APP'] },
      REMINDERS: { enabled: true, channels: ['EMAIL', 'PUSH', 'IN_APP'] },
      ALERTS: { enabled: true, channels: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'] },
    };

    return {
      userId,
      channels,
      categories,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'Europe/Bucharest',
      },
      language: 'RO',
      updatedAt: new Date(),
    };
  }

  updateUserPreferences(userId: string, updates: Partial<UserNotificationPreferences>): UserNotificationPreferences {
    const current = this.getUserPreferences(userId);

    const updated: UserNotificationPreferences = {
      ...current,
      ...updates,
      userId,
      updatedAt: new Date(),
    };

    this.preferences.set(userId, updated);
    this.eventEmitter.emit('notification.preferences.updated', { userId });
    return updated;
  }

  // Notification Sending
  async send(dto: CreateNotificationDto): Promise<Notification> {
    const channelConfig = this.channelConfigs.get(dto.channel);
    if (!channelConfig?.enabled) {
      throw new BadRequestException(`Channel ${dto.channel} is disabled`);
    }

    if (!this.checkRateLimit(dto.channel)) {
      throw new BadRequestException(`Rate limit exceeded for channel ${dto.channel}`);
    }

    const prefs = this.getUserPreferences(dto.recipientId);
    const category = dto.category || 'SYSTEM';

    if (!prefs.channels[dto.channel]?.enabled) {
      throw new BadRequestException(`User has disabled ${dto.channel} notifications`);
    }

    if (!prefs.categories[category]?.enabled) {
      throw new BadRequestException(`User has disabled ${category} notifications`);
    }

    let subject = dto.subject || '';
    let body = dto.body || '';

    if (dto.templateId) {
      const template = this.getTemplate(dto.templateId);
      if (!template.isActive) {
        throw new BadRequestException('Template is not active');
      }
      if (!template.channels.includes(dto.channel)) {
        throw new BadRequestException(`Template does not support ${dto.channel} channel`);
      }

      const lang = prefs.language;
      subject = lang === 'RO' ? template.subjectRo : template.subject;
      body = lang === 'RO' ? template.bodyRo : template.body;

      // Variable substitution
      if (dto.variables) {
        for (const [key, value] of Object.entries(dto.variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          subject = subject.replace(regex, String(value));
          body = body.replace(regex, String(value));
        }
      }
    }

    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      templateId: dto.templateId,
      recipientId: dto.recipientId,
      recipientEmail: dto.recipientEmail,
      recipientPhone: dto.recipientPhone,
      channel: dto.channel,
      category,
      priority: dto.priority || 'NORMAL',
      subject,
      body,
      variables: dto.variables || {},
      status: dto.scheduledAt && dto.scheduledAt > new Date() ? 'PENDING' : 'QUEUED',
      scheduledAt: dto.scheduledAt,
      retryCount: 0,
      maxRetries: 3,
      metadata: dto.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: dto.createdBy,
    };

    this.notifications.set(notification.id, notification);
    this.incrementChannelUsage(dto.channel);

    if (notification.status === 'QUEUED') {
      await this.processNotification(notification);
    }

    this.eventEmitter.emit('notification.created', { notificationId: notification.id });
    return notification;
  }

  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Simulate sending based on channel
      await this.simulateSend(notification);

      notification.status = 'SENT';
      notification.sentAt = new Date();
      notification.updatedAt = new Date();

      // Simulate delivery confirmation
      setTimeout(() => {
        notification.status = 'DELIVERED';
        notification.deliveredAt = new Date();
        notification.updatedAt = new Date();
        this.notifications.set(notification.id, notification);
        this.eventEmitter.emit('notification.delivered', { notificationId: notification.id });
      }, 1000);

      this.notifications.set(notification.id, notification);
      this.eventEmitter.emit('notification.sent', { notificationId: notification.id });
    } catch (error) {
      notification.status = 'FAILED';
      notification.failedAt = new Date();
      notification.failureReason = error instanceof Error ? error.message : 'Unknown error';
      notification.updatedAt = new Date();
      this.notifications.set(notification.id, notification);
      this.eventEmitter.emit('notification.failed', { notificationId: notification.id, error: notification.failureReason });
    }
  }

  private async simulateSend(notification: Notification): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate occasional failures for testing
    if (notification.metadata?.simulateFailure) {
      throw new Error('Simulated delivery failure');
    }
  }

  private checkRateLimit(channel: NotificationChannel): boolean {
    const config = this.channelConfigs.get(channel);
    const usage = this.channelUsage.get(channel);

    if (!config || !usage) return true;

    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60000);
    const hourAgo = new Date(now.getTime() - 3600000);
    const dayAgo = new Date(now.getTime() - 86400000);

    // Reset counters if needed
    if (usage.lastReset < minuteAgo) {
      usage.minute = 0;
    }
    if (usage.lastReset < hourAgo) {
      usage.hour = 0;
    }
    if (usage.lastReset < dayAgo) {
      usage.day = 0;
    }

    if (usage.minute >= config.rateLimitPerMinute) return false;
    if (usage.hour >= config.rateLimitPerHour) return false;
    if (config.dailyLimit && usage.day >= config.dailyLimit) return false;

    return true;
  }

  private incrementChannelUsage(channel: NotificationChannel): void {
    const usage = this.channelUsage.get(channel);
    if (usage) {
      usage.minute++;
      usage.hour++;
      usage.day++;
      usage.lastReset = new Date();
      this.channelUsage.set(channel, usage);
    }
  }

  // Notification Retrieval
  getNotification(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    return notification;
  }

  getNotifications(filters?: {
    recipientId?: string;
    channel?: NotificationChannel;
    category?: NotificationCategory;
    status?: NotificationStatus;
    limit?: number;
  }): Notification[] {
    let notifications = Array.from(this.notifications.values());

    if (filters?.recipientId) {
      notifications = notifications.filter((n) => n.recipientId === filters.recipientId);
    }
    if (filters?.channel) {
      notifications = notifications.filter((n) => n.channel === filters.channel);
    }
    if (filters?.category) {
      notifications = notifications.filter((n) => n.category === filters.category);
    }
    if (filters?.status) {
      notifications = notifications.filter((n) => n.status === filters.status);
    }

    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      notifications = notifications.slice(0, filters.limit);
    }

    return notifications;
  }

  cancelNotification(notificationId: string): Notification {
    const notification = this.getNotification(notificationId);

    if (notification.status !== 'PENDING' && notification.status !== 'QUEUED') {
      throw new BadRequestException('Can only cancel pending or queued notifications');
    }

    notification.status = 'CANCELLED';
    notification.updatedAt = new Date();
    this.notifications.set(notificationId, notification);

    this.eventEmitter.emit('notification.cancelled', { notificationId });
    return notification;
  }

  async retryNotification(notificationId: string): Promise<Notification> {
    const notification = this.getNotification(notificationId);

    if (notification.status !== 'FAILED') {
      throw new BadRequestException('Can only retry failed notifications');
    }

    if (notification.retryCount >= notification.maxRetries) {
      throw new BadRequestException('Maximum retry attempts exceeded');
    }

    notification.status = 'QUEUED';
    notification.retryCount++;
    notification.failureReason = undefined;
    notification.updatedAt = new Date();

    await this.processNotification(notification);
    return notification;
  }

  // Batch Notifications
  createBatch(
    name: string,
    templateId: string,
    recipients: string[],
    channel: NotificationChannel,
    scheduledAt: Date | undefined,
    createdBy: string,
  ): NotificationBatch {
    const template = this.getTemplate(templateId);
    if (!template.channels.includes(channel)) {
      throw new BadRequestException(`Template does not support ${channel} channel`);
    }

    const batch: NotificationBatch = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      templateId,
      recipients,
      channel,
      status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
      scheduledAt,
      totalCount: recipients.length,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      createdBy,
    };

    this.batches.set(batch.id, batch);
    this.eventEmitter.emit('notification.batch.created', { batchId: batch.id });
    return batch;
  }

  getBatch(batchId: string): NotificationBatch {
    const batch = this.batches.get(batchId);
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }
    return batch;
  }

  getBatches(filters?: { status?: string }): NotificationBatch[] {
    let batches = Array.from(this.batches.values());

    if (filters?.status) {
      batches = batches.filter((b) => b.status === filters.status);
    }

    return batches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async processBatch(batchId: string): Promise<NotificationBatch> {
    const batch = this.getBatch(batchId);

    if (batch.status !== 'DRAFT' && batch.status !== 'SCHEDULED') {
      throw new BadRequestException('Batch cannot be processed');
    }

    batch.status = 'PROCESSING';
    batch.startedAt = new Date();
    this.batches.set(batchId, batch);

    const template = this.getTemplate(batch.templateId);

    for (const recipientId of batch.recipients) {
      try {
        await this.send({
          templateId: batch.templateId,
          recipientId,
          channel: batch.channel,
          category: template.category,
          createdBy: batch.createdBy,
        });
        batch.sentCount++;
      } catch {
        batch.failedCount++;
      }
    }

    batch.status = batch.failedCount === batch.totalCount ? 'FAILED' : 'COMPLETED';
    batch.completedAt = new Date();
    this.batches.set(batchId, batch);

    this.eventEmitter.emit('notification.batch.completed', { batchId, sentCount: batch.sentCount, failedCount: batch.failedCount });
    return batch;
  }

  cancelBatch(batchId: string): NotificationBatch {
    const batch = this.getBatch(batchId);

    if (batch.status !== 'DRAFT' && batch.status !== 'SCHEDULED') {
      throw new BadRequestException('Can only cancel draft or scheduled batches');
    }

    batch.status = 'FAILED';
    batch.completedAt = new Date();
    this.batches.set(batchId, batch);

    this.eventEmitter.emit('notification.batch.cancelled', { batchId });
    return batch;
  }

  // Channel Configuration
  getChannelConfig(channel: NotificationChannel): ChannelConfig {
    const config = this.channelConfigs.get(channel);
    if (!config) {
      throw new NotFoundException(`Channel ${channel} not found`);
    }
    return config;
  }

  getChannelConfigs(): ChannelConfig[] {
    return Array.from(this.channelConfigs.values());
  }

  updateChannelConfig(channel: NotificationChannel, updates: Partial<ChannelConfig>): ChannelConfig {
    const config = this.getChannelConfig(channel);

    const updated: ChannelConfig = {
      ...config,
      ...updates,
      channel,
    };

    this.channelConfigs.set(channel, updated);
    this.eventEmitter.emit('notification.channel.updated', { channel });
    return updated;
  }

  // Statistics
  getStats(): NotificationStats {
    const notifications = Array.from(this.notifications.values());

    const byChannel: Record<NotificationChannel, number> = {
      EMAIL: 0, SMS: 0, PUSH: 0, IN_APP: 0, SLACK: 0, WEBHOOK: 0,
    };
    const byStatus: Record<NotificationStatus, number> = {
      PENDING: 0, QUEUED: 0, SENT: 0, DELIVERED: 0, FAILED: 0, CANCELLED: 0,
    };
    const byCategory: Record<NotificationCategory, number> = {
      SYSTEM: 0, BILLING: 0, SECURITY: 0, MARKETING: 0, UPDATES: 0, REMINDERS: 0, ALERTS: 0,
    };

    let deliveredCount = 0;
    let totalDeliveryTime = 0;

    notifications.forEach((n) => {
      byChannel[n.channel]++;
      byStatus[n.status]++;
      byCategory[n.category]++;

      if (n.status === 'DELIVERED' && n.sentAt && n.deliveredAt) {
        deliveredCount++;
        totalDeliveryTime += n.deliveredAt.getTime() - n.sentAt.getTime();
      }
    });

    const sentAndDelivered = byStatus.SENT + byStatus.DELIVERED;
    const totalAttempted = sentAndDelivered + byStatus.FAILED;

    return {
      totalNotifications: notifications.length,
      byChannel,
      byStatus,
      byCategory,
      deliveryRate: totalAttempted > 0 ? (sentAndDelivered / totalAttempted) * 100 : 100,
      averageDeliveryTimeMs: deliveredCount > 0 ? totalDeliveryTime / deliveredCount : 0,
    };
  }

  // Mark notification as read (for IN_APP)
  markAsRead(notificationId: string): Notification {
    const notification = this.getNotification(notificationId);
    notification.metadata = { ...notification.metadata, readAt: new Date() };
    notification.updatedAt = new Date();
    this.notifications.set(notificationId, notification);
    return notification;
  }

  // Get unread count
  getUnreadCount(userId: string): number {
    const notifications = this.getNotifications({ recipientId: userId, channel: 'IN_APP' });
    return notifications.filter((n) => !n.metadata?.readAt).length;
  }

  // Subscribe to notifications (for real-time)
  subscribe(userId: string, callback: (notification: Notification) => void): () => void {
    const handler = (event: { notificationId: string }) => {
      const notification = this.notifications.get(event.notificationId);
      if (notification && notification.recipientId === userId) {
        callback(notification);
      }
    };

    this.eventEmitter.on('notification.sent', handler);
    return () => this.eventEmitter.off('notification.sent', handler);
  }
}
