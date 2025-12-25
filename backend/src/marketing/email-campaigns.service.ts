import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Email Campaigns Service
 * Create and manage email marketing campaigns
 *
 * Features:
 * - Email templates
 * - Campaign scheduling
 * - A/B testing
 * - Analytics tracking
 */

// =================== TYPES ===================

export interface EmailTemplate {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent?: string;
  category: 'marketing' | 'transactional' | 'notification' | 'newsletter';
  tags: string[];
  variables: string[];
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailCampaign {
  id: string;
  tenantId: string;
  name: string;
  subject: string;
  preheader?: string;
  templateId?: string;
  htmlContent: string;
  textContent?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  recipients: CampaignRecipients;
  schedule: CampaignSchedule;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  abTest?: ABTestConfig;
  tracking: TrackingOptions;
  stats: CampaignStats;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
}

export interface CampaignRecipients {
  type: 'all' | 'segment' | 'list' | 'manual';
  segmentId?: string;
  listId?: string;
  emails?: string[];
  excludeSegments?: string[];
  estimatedCount: number;
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'optimal';
  scheduledAt?: Date;
  timezone: string;
  optimalWindow?: {
    startHour: number;
    endHour: number;
  };
}

export interface ABTestConfig {
  enabled: boolean;
  testType: 'subject' | 'content' | 'send_time';
  variants: ABTestVariant[];
  winnerCriteria: 'open_rate' | 'click_rate' | 'conversion';
  testDuration: number; // hours
  testPercentage: number; // 0-100
  winnerSelected?: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  subject?: string;
  htmlContent?: string;
  sendTime?: Date;
  stats: {
    sent: number;
    opens: number;
    clicks: number;
    openRate: number;
    clickRate: number;
  };
}

export interface TrackingOptions {
  trackOpens: boolean;
  trackClicks: boolean;
  googleAnalytics?: {
    enabled: boolean;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

export interface CampaignStats {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  bounces: number;
  unsubscribes: number;
  complaints: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

export interface EmailList {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  subscriberCount: number;
  doubleOptIn: boolean;
  welcomeEmailId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscriber {
  id: string;
  tenantId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';
  lists: string[];
  tags: string[];
  customFields: Record<string, any>;
  source: string;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  lastEmailAt?: Date;
  engagement: {
    totalEmails: number;
    opens: number;
    clicks: number;
    lastOpenAt?: Date;
    lastClickAt?: Date;
  };
}

// =================== SERVICE ===================

@Injectable()
export class EmailCampaignsService {
  private readonly logger = new Logger(EmailCampaignsService.name);

  // Storage
  private templates = new Map<string, EmailTemplate>();
  private campaigns = new Map<string, EmailCampaign>();
  private lists = new Map<string, EmailList>();
  private subscribers = new Map<string, Subscriber>();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        tenantId: 'system',
        name: 'Welcome Email',
        subject: 'Welcome to {{company_name}}!',
        category: 'transactional',
        tags: ['welcome', 'onboarding'],
        variables: ['first_name', 'company_name', 'login_url'],
        htmlContent: `
          <h1>Welcome, {{first_name}}!</h1>
          <p>Thank you for joining {{company_name}}. We're excited to have you on board.</p>
          <a href="{{login_url}}">Get Started</a>
        `,
        isActive: true,
      },
      {
        tenantId: 'system',
        name: 'Newsletter Template',
        subject: '{{newsletter_title}}',
        category: 'newsletter',
        tags: ['newsletter'],
        variables: ['newsletter_title', 'content', 'unsubscribe_url'],
        htmlContent: `
          <h1>{{newsletter_title}}</h1>
          <div>{{content}}</div>
          <footer><a href="{{unsubscribe_url}}">Unsubscribe</a></footer>
        `,
        isActive: true,
      },
      {
        tenantId: 'system',
        name: 'Invoice Email',
        subject: 'Invoice #{{invoice_number}} from {{company_name}}',
        category: 'transactional',
        tags: ['invoice', 'billing'],
        variables: ['invoice_number', 'company_name', 'amount', 'due_date', 'payment_url'],
        htmlContent: `
          <h1>Invoice #{{invoice_number}}</h1>
          <p>Amount Due: {{amount}}</p>
          <p>Due Date: {{due_date}}</p>
          <a href="{{payment_url}}">Pay Now</a>
        `,
        isActive: true,
      },
      {
        tenantId: 'system',
        name: 'Promotional Email',
        subject: '{{promo_title}} - Limited Time Offer!',
        category: 'marketing',
        tags: ['promotion', 'offer'],
        variables: ['promo_title', 'promo_description', 'discount_code', 'cta_url'],
        htmlContent: `
          <h1>{{promo_title}}</h1>
          <p>{{promo_description}}</p>
          <p>Use code: <strong>{{discount_code}}</strong></p>
          <a href="{{cta_url}}">Shop Now</a>
        `,
        isActive: true,
      },
    ];

    defaultTemplates.forEach((template, index) => {
      const id = `tpl-system-${index + 1}`;
      this.templates.set(id, {
        ...template,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    this.logger.log(`Initialized ${this.templates.size} email templates`);
  }

  // =================== TEMPLATES ===================

  async createTemplate(params: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Extract variables from content
    const variables = this.extractVariables(params.htmlContent);

    const template: EmailTemplate = {
      ...params,
      id,
      variables,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);
    return template;
  }

  async updateTemplate(
    id: string,
    updates: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'preheader' | 'htmlContent' | 'textContent' | 'category' | 'tags' | 'isActive'>>,
  ): Promise<EmailTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    if (updates.htmlContent) {
      (updates as any).variables = this.extractVariables(updates.htmlContent);
    }

    Object.assign(template, updates, { updatedAt: new Date() });
    this.templates.set(id, template);

    return template;
  }

  async deleteTemplate(id: string): Promise<void> {
    this.templates.delete(id);
  }

  async getTemplates(tenantId: string, category?: EmailTemplate['category']): Promise<EmailTemplate[]> {
    let templates = Array.from(this.templates.values())
      .filter(t => t.tenantId === tenantId || t.tenantId === 'system');

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    return templates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTemplate(id: string): Promise<EmailTemplate | null> {
    return this.templates.get(id) || null;
  }

  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    return variables;
  }

  // =================== CAMPAIGNS ===================

  async createCampaign(params: {
    tenantId: string;
    name: string;
    subject: string;
    preheader?: string;
    templateId?: string;
    htmlContent: string;
    textContent?: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    recipients: CampaignRecipients;
    schedule: CampaignSchedule;
    abTest?: ABTestConfig;
    tracking?: Partial<TrackingOptions>;
  }): Promise<EmailCampaign> {
    const id = `camp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const campaign: EmailCampaign = {
      id,
      tenantId: params.tenantId,
      name: params.name,
      subject: params.subject,
      preheader: params.preheader,
      templateId: params.templateId,
      htmlContent: params.htmlContent,
      textContent: params.textContent,
      fromName: params.fromName,
      fromEmail: params.fromEmail,
      replyTo: params.replyTo,
      recipients: params.recipients,
      schedule: params.schedule,
      status: 'draft',
      abTest: params.abTest,
      tracking: {
        trackOpens: params.tracking?.trackOpens ?? true,
        trackClicks: params.tracking?.trackClicks ?? true,
        googleAnalytics: params.tracking?.googleAnalytics,
      },
      stats: this.initializeStats(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.campaigns.set(id, campaign);
    return campaign;
  }

  private initializeStats(): CampaignStats {
    return {
      totalRecipients: 0,
      sent: 0,
      delivered: 0,
      opens: 0,
      uniqueOpens: 0,
      clicks: 0,
      uniqueClicks: 0,
      bounces: 0,
      unsubscribes: 0,
      complaints: 0,
      openRate: 0,
      clickRate: 0,
      clickToOpenRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
    };
  }

  async updateCampaign(
    id: string,
    updates: Partial<Pick<EmailCampaign, 'name' | 'subject' | 'preheader' | 'htmlContent' | 'textContent' | 'recipients' | 'schedule' | 'abTest' | 'tracking'>>,
  ): Promise<EmailCampaign | null> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return null;

    if (campaign.status !== 'draft') {
      throw new BadRequestException('Can only update draft campaigns');
    }

    Object.assign(campaign, updates, { updatedAt: new Date() });
    this.campaigns.set(id, campaign);

    return campaign;
  }

  async scheduleCampaign(id: string, schedule: CampaignSchedule): Promise<EmailCampaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    campaign.schedule = schedule;
    campaign.status = schedule.type === 'immediate' ? 'sending' : 'scheduled';
    campaign.updatedAt = new Date();

    this.campaigns.set(id, campaign);

    if (schedule.type === 'immediate') {
      this.sendCampaign(campaign);
    }

    this.eventEmitter.emit('campaign.scheduled', { campaignId: id });

    return campaign;
  }

  async pauseCampaign(id: string): Promise<EmailCampaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== 'sending' && campaign.status !== 'scheduled') {
      throw new BadRequestException('Can only pause sending or scheduled campaigns');
    }

    campaign.status = 'paused';
    campaign.updatedAt = new Date();
    this.campaigns.set(id, campaign);

    return campaign;
  }

  async cancelCampaign(id: string): Promise<EmailCampaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    campaign.status = 'cancelled';
    campaign.updatedAt = new Date();
    this.campaigns.set(id, campaign);

    return campaign;
  }

  private async sendCampaign(campaign: EmailCampaign): Promise<void> {
    // Simulate sending
    const totalRecipients = campaign.recipients.estimatedCount || Math.floor(Math.random() * 1000) + 100;

    campaign.stats.totalRecipients = totalRecipients;

    const sendInterval = setInterval(() => {
      if (campaign.status !== 'sending') {
        clearInterval(sendInterval);
        return;
      }

      const increment = Math.min(50, totalRecipients - campaign.stats.sent);
      campaign.stats.sent += increment;
      campaign.stats.delivered += Math.floor(increment * 0.97);
      campaign.stats.bounces += Math.ceil(increment * 0.03);

      if (campaign.stats.sent >= totalRecipients) {
        clearInterval(sendInterval);
        campaign.status = 'sent';
        campaign.sentAt = new Date();

        // Simulate engagement over time
        this.simulateEngagement(campaign);
      }

      this.campaigns.set(campaign.id, campaign);
    }, 500);
  }

  private simulateEngagement(campaign: EmailCampaign): void {
    setTimeout(() => {
      const delivered = campaign.stats.delivered;
      campaign.stats.opens = Math.floor(delivered * (Math.random() * 0.3 + 0.15));
      campaign.stats.uniqueOpens = Math.floor(campaign.stats.opens * 0.85);
      campaign.stats.clicks = Math.floor(campaign.stats.opens * (Math.random() * 0.2 + 0.05));
      campaign.stats.uniqueClicks = Math.floor(campaign.stats.clicks * 0.8);
      campaign.stats.unsubscribes = Math.floor(delivered * 0.002);

      // Calculate rates
      campaign.stats.openRate = delivered > 0 ? Math.round((campaign.stats.uniqueOpens / delivered) * 100) : 0;
      campaign.stats.clickRate = delivered > 0 ? Math.round((campaign.stats.uniqueClicks / delivered) * 100) : 0;
      campaign.stats.clickToOpenRate = campaign.stats.uniqueOpens > 0
        ? Math.round((campaign.stats.uniqueClicks / campaign.stats.uniqueOpens) * 100)
        : 0;
      campaign.stats.bounceRate = campaign.stats.totalRecipients > 0
        ? Math.round((campaign.stats.bounces / campaign.stats.totalRecipients) * 100)
        : 0;
      campaign.stats.unsubscribeRate = delivered > 0
        ? Math.round((campaign.stats.unsubscribes / delivered) * 1000) / 10
        : 0;

      this.campaigns.set(campaign.id, campaign);
      this.eventEmitter.emit('campaign.completed', { campaign });
    }, 3000);
  }

  async deleteCampaign(id: string): Promise<void> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status === 'sending') {
      throw new BadRequestException('Cannot delete a sending campaign');
    }

    this.campaigns.delete(id);
  }

  async getCampaigns(tenantId: string, status?: EmailCampaign['status']): Promise<EmailCampaign[]> {
    let campaigns = Array.from(this.campaigns.values())
      .filter(c => c.tenantId === tenantId);

    if (status) {
      campaigns = campaigns.filter(c => c.status === status);
    }

    return campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCampaign(id: string): Promise<EmailCampaign | null> {
    return this.campaigns.get(id) || null;
  }

  async duplicateCampaign(id: string): Promise<EmailCampaign> {
    const original = this.campaigns.get(id);
    if (!original) {
      throw new NotFoundException('Campaign not found');
    }

    return this.createCampaign({
      tenantId: original.tenantId,
      name: `${original.name} (Copy)`,
      subject: original.subject,
      preheader: original.preheader,
      templateId: original.templateId,
      htmlContent: original.htmlContent,
      textContent: original.textContent,
      fromName: original.fromName,
      fromEmail: original.fromEmail,
      replyTo: original.replyTo,
      recipients: { ...original.recipients },
      schedule: { type: 'immediate', timezone: original.schedule.timezone },
      tracking: original.tracking,
    });
  }

  // =================== LISTS ===================

  async createList(params: {
    tenantId: string;
    name: string;
    description?: string;
    doubleOptIn?: boolean;
    welcomeEmailId?: string;
  }): Promise<EmailList> {
    const id = `list-${Date.now()}`;

    const list: EmailList = {
      id,
      tenantId: params.tenantId,
      name: params.name,
      description: params.description,
      subscriberCount: 0,
      doubleOptIn: params.doubleOptIn ?? true,
      welcomeEmailId: params.welcomeEmailId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.lists.set(id, list);
    return list;
  }

  async getLists(tenantId: string): Promise<EmailList[]> {
    return Array.from(this.lists.values())
      .filter(l => l.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteList(id: string): Promise<void> {
    this.lists.delete(id);
  }

  // =================== SUBSCRIBERS ===================

  async addSubscriber(params: {
    tenantId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    listIds: string[];
    tags?: string[];
    source: string;
  }): Promise<Subscriber> {
    const id = `sub-${Date.now()}`;

    const subscriber: Subscriber = {
      id,
      tenantId: params.tenantId,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      status: 'subscribed',
      lists: params.listIds,
      tags: params.tags || [],
      customFields: {},
      source: params.source,
      subscribedAt: new Date(),
      engagement: {
        totalEmails: 0,
        opens: 0,
        clicks: 0,
      },
    };

    this.subscribers.set(id, subscriber);

    // Update list counts
    for (const listId of params.listIds) {
      const list = this.lists.get(listId);
      if (list) {
        list.subscriberCount++;
        this.lists.set(listId, list);
      }
    }

    return subscriber;
  }

  async unsubscribe(email: string, listId?: string): Promise<void> {
    for (const subscriber of this.subscribers.values()) {
      if (subscriber.email === email) {
        if (listId) {
          subscriber.lists = subscriber.lists.filter(l => l !== listId);
          if (subscriber.lists.length === 0) {
            subscriber.status = 'unsubscribed';
            subscriber.unsubscribedAt = new Date();
          }
        } else {
          subscriber.status = 'unsubscribed';
          subscriber.unsubscribedAt = new Date();
        }
        this.subscribers.set(subscriber.id, subscriber);
        break;
      }
    }
  }

  async getSubscribers(tenantId: string, listId?: string): Promise<Subscriber[]> {
    let subscribers = Array.from(this.subscribers.values())
      .filter(s => s.tenantId === tenantId);

    if (listId) {
      subscribers = subscribers.filter(s => s.lists.includes(listId));
    }

    return subscribers;
  }

  // =================== ANALYTICS ===================

  async getCampaignAnalytics(id: string): Promise<{
    overview: CampaignStats;
    timeline: Array<{ timestamp: Date; opens: number; clicks: number }>;
    topLinks: Array<{ url: string; clicks: number }>;
    deviceBreakdown: Record<string, number>;
    locationBreakdown: Array<{ country: string; opens: number }>;
  }> {
    const campaign = this.campaigns.get(id);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return {
      overview: campaign.stats,
      timeline: [
        { timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), opens: Math.floor(campaign.stats.opens * 0.2), clicks: Math.floor(campaign.stats.clicks * 0.15) },
        { timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), opens: Math.floor(campaign.stats.opens * 0.5), clicks: Math.floor(campaign.stats.clicks * 0.4) },
        { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), opens: Math.floor(campaign.stats.opens * 0.8), clicks: Math.floor(campaign.stats.clicks * 0.7) },
        { timestamp: new Date(), opens: campaign.stats.opens, clicks: campaign.stats.clicks },
      ],
      topLinks: [
        { url: 'https://example.com/cta', clicks: Math.floor(campaign.stats.clicks * 0.6) },
        { url: 'https://example.com/learn-more', clicks: Math.floor(campaign.stats.clicks * 0.25) },
        { url: 'https://example.com/pricing', clicks: Math.floor(campaign.stats.clicks * 0.15) },
      ],
      deviceBreakdown: {
        desktop: 55,
        mobile: 40,
        tablet: 5,
      },
      locationBreakdown: [
        { country: 'Romania', opens: Math.floor(campaign.stats.opens * 0.7) },
        { country: 'Germany', opens: Math.floor(campaign.stats.opens * 0.15) },
        { country: 'United States', opens: Math.floor(campaign.stats.opens * 0.1) },
        { country: 'Other', opens: Math.floor(campaign.stats.opens * 0.05) },
      ],
    };
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalCampaigns: number;
    sentCampaigns: number;
    totalSubscribers: number;
    activeSubscribers: number;
    avgOpenRate: number;
    avgClickRate: number;
    totalLists: number;
    totalTemplates: number;
  }> {
    const campaigns = Array.from(this.campaigns.values()).filter(c => c.tenantId === tenantId);
    const subscribers = Array.from(this.subscribers.values()).filter(s => s.tenantId === tenantId);
    const lists = Array.from(this.lists.values()).filter(l => l.tenantId === tenantId);
    const templates = Array.from(this.templates.values()).filter(t => t.tenantId === tenantId || t.tenantId === 'system');

    const sentCampaigns = campaigns.filter(c => c.status === 'sent');
    const avgOpenRate = sentCampaigns.length > 0
      ? sentCampaigns.reduce((sum, c) => sum + c.stats.openRate, 0) / sentCampaigns.length
      : 0;
    const avgClickRate = sentCampaigns.length > 0
      ? sentCampaigns.reduce((sum, c) => sum + c.stats.clickRate, 0) / sentCampaigns.length
      : 0;

    return {
      totalCampaigns: campaigns.length,
      sentCampaigns: sentCampaigns.length,
      totalSubscribers: subscribers.length,
      activeSubscribers: subscribers.filter(s => s.status === 'subscribed').length,
      avgOpenRate: Math.round(avgOpenRate * 10) / 10,
      avgClickRate: Math.round(avgClickRate * 10) / 10,
      totalLists: lists.length,
      totalTemplates: templates.length,
    };
  }
}
