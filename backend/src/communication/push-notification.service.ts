import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type PushPlatform = 'web' | 'ios' | 'android' | 'all';
export type PushStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'clicked';
export type PushPriority = 'low' | 'normal' | 'high';

export interface PushToken {
  id: string;
  tenantId: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  deviceId?: string;
  deviceName?: string;
  deviceModel?: string;
  appVersion?: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PushNotification {
  id: string;
  tenantId: string;
  userId?: string;
  tokens?: string[];
  platform: PushPlatform;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  data?: Record<string, any>;
  collapseKey?: string;
  priority: PushPriority;
  ttl?: number;
  status: PushStatus;
  provider?: string;
  externalIds?: string[];
  sentAt?: Date;
  deliveredCount: number;
  clickedCount: number;
  failedCount: number;
  failureReasons?: string[];
  campaignId?: string;
  topicId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PushTopic {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  subscriberCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicSubscription {
  id: string;
  tenantId: string;
  userId: string;
  topicId: string;
  tokenId: string;
  subscribedAt: Date;
}

export interface PushTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  clickAction?: string;
  data?: Record<string, any>;
  variables: PushVariable[];
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PushVariable {
  name: string;
  type: 'string' | 'number' | 'url';
  required: boolean;
  defaultValue?: any;
}

export interface PushCampaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  platform: PushPlatform;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  clickAction?: string;
  data?: Record<string, any>;
  audience: {
    type: 'all' | 'topic' | 'segment' | 'users';
    topicId?: string;
    segmentId?: string;
    userIds?: string[];
  };
  scheduledAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  stats: {
    targeted: number;
    sent: number;
    delivered: number;
    clicked: number;
    failed: number;
  };
  createdBy: string;
  createdAt: Date;
  sentAt?: Date;
}

export interface WebPushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  subject: string;
}

export interface FCMConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export interface APNSConfig {
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
  production: boolean;
}

// =================== SERVICE ===================

@Injectable()
export class PushNotificationService {
  private tokens: Map<string, PushToken> = new Map();
  private notifications: Map<string, PushNotification> = new Map();
  private topics: Map<string, PushTopic> = new Map();
  private subscriptions: Map<string, TopicSubscription> = new Map();
  private templates: Map<string, PushTemplate> = new Map();
  private campaigns: Map<string, PushCampaign> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
    this.initializeDefaultTopics();
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<PushTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        tenantId: 'system',
        name: 'New Message',
        description: 'Notification for new messages',
        title: 'New message from {{sender_name}}',
        body: '{{message_preview}}',
        icon: '/icons/message.png',
        clickAction: '/messages/{{message_id}}',
        variables: [
          { name: 'sender_name', type: 'string', required: true },
          { name: 'message_preview', type: 'string', required: true },
          { name: 'message_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Task Reminder',
        description: 'Task due reminder',
        title: 'Task Due: {{task_name}}',
        body: 'Your task "{{task_name}}" is due {{due_time}}',
        icon: '/icons/task.png',
        clickAction: '/tasks/{{task_id}}',
        variables: [
          { name: 'task_name', type: 'string', required: true },
          { name: 'due_time', type: 'string', required: true },
          { name: 'task_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Approval Request',
        description: 'Document approval notification',
        title: 'Approval Needed',
        body: '{{requester}} needs your approval for "{{document_name}}"',
        icon: '/icons/approval.png',
        clickAction: '/approvals/{{approval_id}}',
        variables: [
          { name: 'requester', type: 'string', required: true },
          { name: 'document_name', type: 'string', required: true },
          { name: 'approval_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Payment Received',
        description: 'Payment confirmation notification',
        title: 'Payment Received',
        body: 'You received {{amount}} {{currency}} from {{payer}}',
        icon: '/icons/payment.png',
        clickAction: '/payments/{{payment_id}}',
        variables: [
          { name: 'amount', type: 'number', required: true },
          { name: 'currency', type: 'string', required: true },
          { name: 'payer', type: 'string', required: true },
          { name: 'payment_id', type: 'string', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'ANAF Alert',
        description: 'ANAF deadline alert',
        title: 'ANAF Deadline Alert',
        body: '{{declaration_type}} due in {{days}} days',
        icon: '/icons/alert.png',
        clickAction: '/compliance/anaf',
        variables: [
          { name: 'declaration_type', type: 'string', required: true },
          { name: 'days', type: 'number', required: true },
        ],
        isActive: true,
        usageCount: 0,
        createdBy: 'system',
      },
    ];

    for (const template of templates) {
      const id = `ptpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, {
        id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  private initializeDefaultTopics(): void {
    const topics = [
      { name: 'announcements', description: 'General announcements' },
      { name: 'updates', description: 'Product updates and features' },
      { name: 'promotions', description: 'Special offers and promotions' },
      { name: 'compliance', description: 'Compliance and regulatory alerts' },
      { name: 'maintenance', description: 'System maintenance notices' },
    ];

    for (const topic of topics) {
      const id = `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.topics.set(id, {
        id,
        tenantId: 'system',
        name: topic.name,
        description: topic.description,
        subscriberCount: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // =================== TOKEN MANAGEMENT ===================

  async registerToken(data: {
    tenantId: string;
    userId: string;
    token: string;
    platform: PushPlatform;
    deviceId?: string;
    deviceName?: string;
    deviceModel?: string;
    appVersion?: string;
  }): Promise<PushToken> {
    // Check if token already exists
    const existing = Array.from(this.tokens.values()).find(
      (t) => t.token === data.token && t.userId === data.userId,
    );

    if (existing) {
      existing.lastUsedAt = new Date();
      existing.updatedAt = new Date();
      existing.isActive = true;
      return existing;
    }

    const id = `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const pushToken: PushToken = {
      id,
      tenantId: data.tenantId,
      userId: data.userId,
      token: data.token,
      platform: data.platform,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      deviceModel: data.deviceModel,
      appVersion: data.appVersion,
      isActive: true,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tokens.set(id, pushToken);

    this.eventEmitter.emit('push.token.registered', { token: pushToken });

    return pushToken;
  }

  async unregisterToken(tokenId: string): Promise<boolean> {
    const token = this.tokens.get(tokenId);
    if (token) {
      token.isActive = false;
      token.updatedAt = new Date();
      return true;
    }
    return false;
  }

  async getUserTokens(userId: string, platform?: PushPlatform): Promise<PushToken[]> {
    let tokens = Array.from(this.tokens.values()).filter(
      (t) => t.userId === userId && t.isActive,
    );

    if (platform && platform !== 'all') {
      tokens = tokens.filter((t) => t.platform === platform);
    }

    return tokens;
  }

  async refreshToken(oldToken: string, newToken: string): Promise<PushToken | null> {
    const existing = Array.from(this.tokens.values()).find((t) => t.token === oldToken);
    if (!existing) return null;

    existing.token = newToken;
    existing.lastUsedAt = new Date();
    existing.updatedAt = new Date();

    return existing;
  }

  // =================== SEND NOTIFICATIONS ===================

  async sendToUser(data: {
    tenantId: string;
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
    createdBy: string;
  }): Promise<PushNotification> {
    const tokens = await this.getUserTokens(data.userId, data.platform);

    if (tokens.length === 0) {
      throw new Error('No active push tokens found for user');
    }

    const id = `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification: PushNotification = {
      id,
      tenantId: data.tenantId,
      userId: data.userId,
      tokens: tokens.map((t) => t.token),
      platform: data.platform || 'all',
      title: data.title,
      body: data.body,
      icon: data.icon,
      image: data.image,
      badge: data.badge,
      sound: data.sound,
      clickAction: data.clickAction,
      data: data.data,
      collapseKey: data.collapseKey,
      priority: data.priority || 'normal',
      ttl: data.ttl,
      status: 'pending',
      deliveredCount: 0,
      clickedCount: 0,
      failedCount: 0,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.notifications.set(id, notification);

    // Send notification
    await this.deliverNotification(notification, tokens);

    return notification;
  }

  async sendToUsers(data: {
    tenantId: string;
    userIds: string[];
    platform?: PushPlatform;
    title: string;
    body: string;
    icon?: string;
    image?: string;
    clickAction?: string;
    data?: Record<string, any>;
    priority?: PushPriority;
    campaignId?: string;
    createdBy: string;
  }): Promise<{ total: number; sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of data.userIds) {
      try {
        await this.sendToUser({
          tenantId: data.tenantId,
          userId,
          platform: data.platform,
          title: data.title,
          body: data.body,
          icon: data.icon,
          image: data.image,
          clickAction: data.clickAction,
          data: data.data,
          priority: data.priority,
          createdBy: data.createdBy,
        });
        sent++;
      } catch (error) {
        failed++;
      }
    }

    return { total: data.userIds.length, sent, failed };
  }

  async sendToTopic(data: {
    tenantId: string;
    topicId: string;
    title: string;
    body: string;
    icon?: string;
    image?: string;
    clickAction?: string;
    data?: Record<string, any>;
    priority?: PushPriority;
    createdBy: string;
  }): Promise<PushNotification> {
    const topic = this.topics.get(data.topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }

    const id = `push-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const notification: PushNotification = {
      id,
      tenantId: data.tenantId,
      platform: 'all',
      title: data.title,
      body: data.body,
      icon: data.icon,
      image: data.image,
      clickAction: data.clickAction,
      data: data.data,
      priority: data.priority || 'normal',
      status: 'pending',
      topicId: data.topicId,
      deliveredCount: 0,
      clickedCount: 0,
      failedCount: 0,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.notifications.set(id, notification);

    // Simulate topic delivery
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.deliveredCount = topic.subscriberCount;

    this.eventEmitter.emit('push.topic.sent', { notification, topic });

    return notification;
  }

  async sendFromTemplate(data: {
    tenantId: string;
    userId: string;
    templateId: string;
    templateData: Record<string, any>;
    platform?: PushPlatform;
    createdBy: string;
  }): Promise<PushNotification> {
    const template = this.templates.get(data.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const title = this.processTemplateString(template.title, data.templateData);
    const body = this.processTemplateString(template.body, data.templateData);
    const clickAction = template.clickAction
      ? this.processTemplateString(template.clickAction, data.templateData)
      : undefined;

    template.usageCount++;
    template.updatedAt = new Date();

    return this.sendToUser({
      tenantId: data.tenantId,
      userId: data.userId,
      platform: data.platform,
      title,
      body,
      icon: template.icon,
      image: template.image,
      clickAction,
      data: template.data,
      createdBy: data.createdBy,
    });
  }

  private processTemplateString(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private async deliverNotification(notification: PushNotification, tokens: PushToken[]): Promise<void> {
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.externalIds = [];

    for (const token of tokens) {
      try {
        // Simulate delivery
        await new Promise((resolve) => setTimeout(resolve, 50));

        const externalId = `fcm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        notification.externalIds!.push(externalId);
        notification.deliveredCount++;

        // Update token last used
        token.lastUsedAt = new Date();
      } catch (error: any) {
        notification.failedCount++;
        notification.failureReasons = notification.failureReasons || [];
        notification.failureReasons.push(`${token.id}: ${error.message}`);

        // Mark invalid tokens as inactive
        if (error.message?.includes('invalid') || error.message?.includes('expired')) {
          token.isActive = false;
          token.updatedAt = new Date();
        }
      }
    }

    notification.updatedAt = new Date();

    if (notification.deliveredCount > 0) {
      this.eventEmitter.emit('push.sent', { notification });
    }

    if (notification.failedCount > 0) {
      this.eventEmitter.emit('push.failed', { notification, failedCount: notification.failedCount });
    }
  }

  // =================== TOPICS ===================

  async createTopic(data: {
    tenantId: string;
    name: string;
    description?: string;
  }): Promise<PushTopic> {
    const id = `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const topic: PushTopic = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      subscriberCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.topics.set(id, topic);

    return topic;
  }

  async getTopics(tenantId: string): Promise<PushTopic[]> {
    return Array.from(this.topics.values()).filter(
      (t) => t.tenantId === tenantId || t.tenantId === 'system',
    );
  }

  async getTopic(id: string): Promise<PushTopic | null> {
    return this.topics.get(id) || null;
  }

  async subscribeToTopic(data: {
    tenantId: string;
    userId: string;
    topicId: string;
    tokenId: string;
  }): Promise<TopicSubscription> {
    const topic = this.topics.get(data.topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }

    const token = this.tokens.get(data.tokenId);
    if (!token) {
      throw new Error('Token not found');
    }

    const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const subscription: TopicSubscription = {
      id,
      tenantId: data.tenantId,
      userId: data.userId,
      topicId: data.topicId,
      tokenId: data.tokenId,
      subscribedAt: new Date(),
    };

    this.subscriptions.set(id, subscription);

    topic.subscriberCount++;
    topic.updatedAt = new Date();

    return subscription;
  }

  async unsubscribeFromTopic(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    const topic = this.topics.get(subscription.topicId);
    if (topic) {
      topic.subscriberCount = Math.max(0, topic.subscriberCount - 1);
      topic.updatedAt = new Date();
    }

    return this.subscriptions.delete(subscriptionId);
  }

  async getUserTopicSubscriptions(userId: string): Promise<TopicSubscription[]> {
    return Array.from(this.subscriptions.values()).filter((s) => s.userId === userId);
  }

  // =================== CAMPAIGNS ===================

  async createCampaign(data: {
    tenantId: string;
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
    scheduledAt?: Date;
    createdBy: string;
  }): Promise<PushCampaign> {
    const id = `camp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const campaign: PushCampaign = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      platform: data.platform,
      title: data.title,
      body: data.body,
      icon: data.icon,
      image: data.image,
      clickAction: data.clickAction,
      data: data.data,
      audience: data.audience,
      scheduledAt: data.scheduledAt,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      stats: {
        targeted: 0,
        sent: 0,
        delivered: 0,
        clicked: 0,
        failed: 0,
      },
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.campaigns.set(id, campaign);

    return campaign;
  }

  async getCampaigns(
    tenantId: string,
    filters?: {
      status?: PushCampaign['status'];
      limit?: number;
    },
  ): Promise<PushCampaign[]> {
    let campaigns = Array.from(this.campaigns.values()).filter((c) => c.tenantId === tenantId);

    if (filters?.status) {
      campaigns = campaigns.filter((c) => c.status === filters.status);
    }

    campaigns = campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      campaigns = campaigns.slice(0, filters.limit);
    }

    return campaigns;
  }

  async getCampaign(id: string): Promise<PushCampaign | null> {
    return this.campaigns.get(id) || null;
  }

  async sendCampaign(campaignId: string): Promise<PushCampaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.status = 'sending';

    // Calculate audience size
    let targetedCount = 0;
    switch (campaign.audience.type) {
      case 'all':
        targetedCount = Array.from(this.tokens.values()).filter((t) => t.isActive).length;
        break;
      case 'topic':
        const topic = this.topics.get(campaign.audience.topicId!);
        targetedCount = topic?.subscriberCount || 0;
        break;
      case 'users':
        targetedCount = campaign.audience.userIds?.length || 0;
        break;
    }

    campaign.stats.targeted = targetedCount;

    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 500));

    campaign.stats.sent = targetedCount;
    campaign.stats.delivered = Math.floor(targetedCount * 0.95);
    campaign.stats.clicked = Math.floor(campaign.stats.delivered * 0.15);
    campaign.stats.failed = targetedCount - campaign.stats.delivered;

    campaign.status = 'sent';
    campaign.sentAt = new Date();

    this.eventEmitter.emit('push.campaign.sent', { campaign });

    return campaign;
  }

  async cancelCampaign(campaignId: string): Promise<PushCampaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.status = 'cancelled';

    return campaign;
  }

  // =================== TEMPLATES ===================

  async getTemplates(tenantId: string): Promise<PushTemplate[]> {
    return Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId || t.tenantId === 'system',
    );
  }

  async getTemplate(id: string): Promise<PushTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createTemplate(data: {
    tenantId: string;
    name: string;
    description?: string;
    title: string;
    body: string;
    icon?: string;
    image?: string;
    clickAction?: string;
    data?: Record<string, any>;
    variables: PushVariable[];
    createdBy: string;
  }): Promise<PushTemplate> {
    const id = `ptpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: PushTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      title: data.title,
      body: data.body,
      icon: data.icon,
      image: data.image,
      clickAction: data.clickAction,
      data: data.data,
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

  // =================== TRACKING ===================

  async trackDelivery(notificationId: string, tokenId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.deliveredCount++;
      notification.updatedAt = new Date();
    }
  }

  async trackClick(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'clicked';
      notification.clickedCount++;
      notification.updatedAt = new Date();

      this.eventEmitter.emit('push.clicked', { notification });
    }
  }

  // =================== RETRIEVAL ===================

  async getNotification(id: string): Promise<PushNotification | null> {
    return this.notifications.get(id) || null;
  }

  async getNotifications(
    tenantId: string,
    filters?: {
      userId?: string;
      status?: PushStatus;
      platform?: PushPlatform;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<PushNotification[]> {
    let notifications = Array.from(this.notifications.values()).filter(
      (n) => n.tenantId === tenantId,
    );

    if (filters?.userId) {
      notifications = notifications.filter((n) => n.userId === filters.userId);
    }

    if (filters?.status) {
      notifications = notifications.filter((n) => n.status === filters.status);
    }

    if (filters?.platform && filters.platform !== 'all') {
      notifications = notifications.filter((n) => n.platform === filters.platform);
    }

    if (filters?.startDate) {
      notifications = notifications.filter((n) => n.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      notifications = notifications.filter((n) => n.createdAt <= filters.endDate!);
    }

    notifications = notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      notifications = notifications.slice(0, filters.limit);
    }

    return notifications;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalTokens: number;
    activeTokens: number;
    byPlatform: Record<string, number>;
    totalNotifications: number;
    deliveryRate: number;
    clickRate: number;
    topicCount: number;
    activeCampaigns: number;
  }> {
    const tokens = Array.from(this.tokens.values()).filter((t) => t.tenantId === tenantId);
    const notifications = await this.getNotifications(tenantId);
    const topics = await this.getTopics(tenantId);
    const campaigns = await this.getCampaigns(tenantId);

    const byPlatform: Record<string, number> = {};
    let activeTokens = 0;
    let totalDelivered = 0;
    let totalClicked = 0;
    let totalSent = 0;

    for (const token of tokens) {
      byPlatform[token.platform] = (byPlatform[token.platform] || 0) + 1;
      if (token.isActive) activeTokens++;
    }

    for (const notification of notifications) {
      if (notification.status === 'sent' || notification.status === 'delivered' || notification.status === 'clicked') {
        totalSent += notification.deliveredCount + notification.failedCount;
        totalDelivered += notification.deliveredCount;
        totalClicked += notification.clickedCount;
      }
    }

    return {
      totalTokens: tokens.length,
      activeTokens,
      byPlatform,
      totalNotifications: notifications.length,
      deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      clickRate: totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 100) : 0,
      topicCount: topics.length,
      activeCampaigns: campaigns.filter((c) => c.status === 'sending').length,
    };
  }
}
