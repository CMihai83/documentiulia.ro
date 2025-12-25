import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type ChannelType = 'email' | 'sms' | 'whatsapp' | 'push' | 'in_app' | 'slack' | 'teams' | 'webhook';
export type MessageStatus = 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Recipient {
  id?: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  userId?: string;
  name?: string;
  preferences?: ChannelPreferences;
  metadata?: Record<string, any>;
}

export interface ChannelPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  inApp: boolean;
  preferredChannel?: ChannelType;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

export interface MessageContent {
  subject?: string;
  body: string;
  htmlBody?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Attachment[];
  actions?: MessageAction[];
  metadata?: Record<string, any>;
}

export interface Attachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
  size?: number;
  url?: string;
}

export interface MessageAction {
  type: 'button' | 'link' | 'quick_reply';
  label: string;
  action: string;
  url?: string;
  payload?: Record<string, any>;
}

export interface Message {
  id: string;
  tenantId: string;
  channel: ChannelType;
  recipient: Recipient;
  content: MessageContent;
  priority: MessagePriority;
  status: MessageStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  externalId?: string;
  campaignId?: string;
  threadId?: string;
  parentMessageId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageThread {
  id: string;
  tenantId: string;
  subject?: string;
  participants: Recipient[];
  messages: string[];
  channel: ChannelType;
  status: 'active' | 'closed' | 'archived';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'broadcast' | 'drip' | 'triggered' | 'transactional';
  channels: ChannelType[];
  content: MessageContent;
  audience: AudienceFilter;
  schedule?: CampaignSchedule;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  stats: CampaignStats;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AudienceFilter {
  type: 'all' | 'segment' | 'list' | 'query';
  segmentId?: string;
  listIds?: string[];
  query?: Record<string, any>;
  excludeIds?: string[];
  limit?: number;
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  sendAt?: Date;
  timezone?: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    endDate?: Date;
    maxOccurrences?: number;
  };
  sendWindow?: {
    startHour: number;
    endHour: number;
  };
}

export interface CampaignStats {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface ChannelConfig {
  type: ChannelType;
  enabled: boolean;
  provider?: string;
  credentials?: Record<string, any>;
  settings?: Record<string, any>;
  rateLimit?: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface CommunicationTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  channel: ChannelType;
  category: string;
  subject?: string;
  body: string;
  htmlBody?: string;
  variables: TemplateVariable[];
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

// =================== SERVICE ===================

@Injectable()
export class CommunicationHubService {
  private messages: Map<string, Message> = new Map();
  private threads: Map<string, MessageThread> = new Map();
  private campaigns: Map<string, Campaign> = new Map();
  private templates: Map<string, CommunicationTemplate> = new Map();
  private channelConfigs: Map<string, ChannelConfig> = new Map();
  private messageQueue: Message[] = [];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
    this.initializeChannelConfigs();
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<CommunicationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        tenantId: 'system',
        name: 'Welcome Email',
        description: 'Welcome email for new users',
        channel: 'email',
        category: 'onboarding',
        subject: 'Welcome to {{company_name}}!',
        body: 'Hi {{user_name}},\n\nWelcome to {{company_name}}! We\'re excited to have you on board.\n\nBest regards,\nThe {{company_name}} Team',
        htmlBody: '<h1>Welcome to {{company_name}}!</h1><p>Hi {{user_name}},</p><p>We\'re excited to have you on board.</p><p>Best regards,<br>The {{company_name}} Team</p>',
        variables: [
          { name: 'user_name', type: 'string', required: true, description: 'User\'s name' },
          { name: 'company_name', type: 'string', required: true, description: 'Company name' },
        ],
        isActive: true,
        version: 1,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Password Reset',
        description: 'Password reset request email',
        channel: 'email',
        category: 'security',
        subject: 'Reset Your Password',
        body: 'Hi {{user_name}},\n\nClick the link below to reset your password:\n{{reset_link}}\n\nThis link expires in {{expiry_hours}} hours.',
        htmlBody: '<h2>Reset Your Password</h2><p>Hi {{user_name}},</p><p><a href="{{reset_link}}">Click here to reset your password</a></p><p>This link expires in {{expiry_hours}} hours.</p>',
        variables: [
          { name: 'user_name', type: 'string', required: true },
          { name: 'reset_link', type: 'string', required: true },
          { name: 'expiry_hours', type: 'number', required: false, defaultValue: 24 },
        ],
        isActive: true,
        version: 1,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Invoice Notification',
        description: 'Invoice payment reminder',
        channel: 'email',
        category: 'billing',
        subject: 'Invoice #{{invoice_number}} - {{status}}',
        body: 'Hi {{client_name}},\n\nYour invoice #{{invoice_number}} for {{amount}} {{currency}} is {{status}}.\n\nDue date: {{due_date}}\n\nThank you for your business!',
        htmlBody: '<h2>Invoice #{{invoice_number}}</h2><p>Hi {{client_name}},</p><p>Your invoice for <strong>{{amount}} {{currency}}</strong> is {{status}}.</p><p>Due date: {{due_date}}</p>',
        variables: [
          { name: 'client_name', type: 'string', required: true },
          { name: 'invoice_number', type: 'string', required: true },
          { name: 'amount', type: 'number', required: true },
          { name: 'currency', type: 'string', required: true, defaultValue: 'RON' },
          { name: 'status', type: 'string', required: true },
          { name: 'due_date', type: 'date', required: true },
        ],
        isActive: true,
        version: 1,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Document Approval Request',
        description: 'Request for document approval',
        channel: 'email',
        category: 'workflow',
        subject: 'Action Required: Approve {{document_name}}',
        body: 'Hi {{approver_name}},\n\n{{requester_name}} has requested your approval for "{{document_name}}".\n\nPlease review and approve: {{approval_link}}\n\nDeadline: {{deadline}}',
        htmlBody: '<h2>Approval Required</h2><p>Hi {{approver_name}},</p><p>{{requester_name}} has requested your approval for "<strong>{{document_name}}</strong>".</p><p><a href="{{approval_link}}">Review and Approve</a></p><p>Deadline: {{deadline}}</p>',
        variables: [
          { name: 'approver_name', type: 'string', required: true },
          { name: 'requester_name', type: 'string', required: true },
          { name: 'document_name', type: 'string', required: true },
          { name: 'approval_link', type: 'string', required: true },
          { name: 'deadline', type: 'date', required: false },
        ],
        isActive: true,
        version: 1,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'SMS Verification',
        description: 'SMS verification code',
        channel: 'sms',
        category: 'security',
        body: 'Your verification code is: {{code}}. Valid for {{expiry_minutes}} minutes.',
        variables: [
          { name: 'code', type: 'string', required: true },
          { name: 'expiry_minutes', type: 'number', required: false, defaultValue: 10 },
        ],
        isActive: true,
        version: 1,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Push Notification - Task Assigned',
        description: 'Push notification for task assignment',
        channel: 'push',
        category: 'tasks',
        subject: 'New Task Assigned',
        body: '{{assigner_name}} assigned you a task: {{task_name}}',
        variables: [
          { name: 'assigner_name', type: 'string', required: true },
          { name: 'task_name', type: 'string', required: true },
        ],
        isActive: true,
        version: 1,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'ANAF Submission Reminder',
        description: 'Reminder for ANAF declaration submission',
        channel: 'email',
        category: 'compliance',
        subject: 'Reminder: {{declaration_type}} Due in {{days_remaining}} Days',
        body: 'Hi {{user_name}},\n\nThis is a reminder that your {{declaration_type}} submission is due on {{due_date}}.\n\nDays remaining: {{days_remaining}}\n\nPlease ensure timely submission to avoid penalties.',
        htmlBody: '<h2>ANAF Submission Reminder</h2><p>Hi {{user_name}},</p><p>Your <strong>{{declaration_type}}</strong> is due on {{due_date}}.</p><p>Days remaining: <strong>{{days_remaining}}</strong></p>',
        variables: [
          { name: 'user_name', type: 'string', required: true },
          { name: 'declaration_type', type: 'string', required: true },
          { name: 'due_date', type: 'date', required: true },
          { name: 'days_remaining', type: 'number', required: true },
        ],
        isActive: true,
        version: 1,
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'WhatsApp Order Confirmation',
        description: 'WhatsApp order confirmation message',
        channel: 'whatsapp',
        category: 'orders',
        body: 'Hi {{customer_name}}! Your order #{{order_number}} has been confirmed. Total: {{total}} {{currency}}. Expected delivery: {{delivery_date}}. Track: {{tracking_link}}',
        variables: [
          { name: 'customer_name', type: 'string', required: true },
          { name: 'order_number', type: 'string', required: true },
          { name: 'total', type: 'number', required: true },
          { name: 'currency', type: 'string', required: true, defaultValue: 'RON' },
          { name: 'delivery_date', type: 'date', required: true },
          { name: 'tracking_link', type: 'string', required: false },
        ],
        isActive: true,
        version: 1,
        createdBy: 'system',
      },
    ];

    for (const template of templates) {
      const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, {
        id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  private initializeChannelConfigs(): void {
    const configs: ChannelConfig[] = [
      {
        type: 'email',
        enabled: true,
        provider: 'smtp',
        rateLimit: { maxPerSecond: 10, maxPerMinute: 100, maxPerHour: 1000, maxPerDay: 10000 },
        retryPolicy: { maxRetries: 3, retryDelay: 60000, backoffMultiplier: 2 },
      },
      {
        type: 'sms',
        enabled: true,
        provider: 'twilio',
        rateLimit: { maxPerSecond: 5, maxPerMinute: 50, maxPerHour: 500, maxPerDay: 5000 },
        retryPolicy: { maxRetries: 2, retryDelay: 30000, backoffMultiplier: 2 },
      },
      {
        type: 'whatsapp',
        enabled: true,
        provider: 'twilio',
        rateLimit: { maxPerSecond: 5, maxPerMinute: 50, maxPerHour: 500, maxPerDay: 5000 },
        retryPolicy: { maxRetries: 2, retryDelay: 30000, backoffMultiplier: 2 },
      },
      {
        type: 'push',
        enabled: true,
        provider: 'firebase',
        rateLimit: { maxPerSecond: 100, maxPerMinute: 1000, maxPerHour: 10000, maxPerDay: 100000 },
        retryPolicy: { maxRetries: 3, retryDelay: 5000, backoffMultiplier: 2 },
      },
      {
        type: 'in_app',
        enabled: true,
        rateLimit: { maxPerSecond: 100, maxPerMinute: 1000, maxPerHour: 10000, maxPerDay: 100000 },
        retryPolicy: { maxRetries: 1, retryDelay: 1000, backoffMultiplier: 1 },
      },
      {
        type: 'slack',
        enabled: false,
        provider: 'slack',
        rateLimit: { maxPerSecond: 1, maxPerMinute: 30, maxPerHour: 100, maxPerDay: 1000 },
        retryPolicy: { maxRetries: 3, retryDelay: 60000, backoffMultiplier: 2 },
      },
      {
        type: 'webhook',
        enabled: true,
        rateLimit: { maxPerSecond: 10, maxPerMinute: 100, maxPerHour: 1000, maxPerDay: 10000 },
        retryPolicy: { maxRetries: 5, retryDelay: 30000, backoffMultiplier: 2 },
      },
    ];

    for (const config of configs) {
      this.channelConfigs.set(config.type, config);
    }
  }

  // =================== MESSAGE SENDING ===================

  async sendMessage(data: {
    tenantId: string;
    channel: ChannelType;
    recipient: Recipient;
    content: MessageContent;
    priority?: MessagePriority;
    scheduledAt?: Date;
    campaignId?: string;
    threadId?: string;
    createdBy: string;
  }): Promise<Message> {
    const channelConfig = this.channelConfigs.get(data.channel);
    if (!channelConfig?.enabled) {
      throw new Error(`Channel ${data.channel} is not enabled`);
    }

    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Process template if provided
    let processedContent = { ...data.content };
    if (data.content.templateId) {
      processedContent = await this.processTemplate(data.content.templateId, data.content.templateData || {});
    }

    const message: Message = {
      id,
      tenantId: data.tenantId,
      channel: data.channel,
      recipient: data.recipient,
      content: processedContent,
      priority: data.priority || 'normal',
      status: data.scheduledAt ? 'pending' : 'queued',
      scheduledAt: data.scheduledAt,
      retryCount: 0,
      maxRetries: channelConfig.retryPolicy?.maxRetries || 3,
      campaignId: data.campaignId,
      threadId: data.threadId,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.messages.set(id, message);

    // Add to thread if specified
    if (data.threadId) {
      await this.addMessageToThread(data.threadId, id);
    }

    // Queue or send immediately
    if (!data.scheduledAt) {
      this.messageQueue.push(message);
      await this.processMessageQueue();
    }

    this.eventEmitter.emit('communication.message.created', { message });

    return message;
  }

  async sendBulkMessages(data: {
    tenantId: string;
    channel: ChannelType;
    recipients: Recipient[];
    content: MessageContent;
    priority?: MessagePriority;
    campaignId?: string;
    createdBy: string;
  }): Promise<{ total: number; queued: number; failed: number; messages: Message[] }> {
    const results: Message[] = [];
    let failed = 0;

    for (const recipient of data.recipients) {
      try {
        const message = await this.sendMessage({
          tenantId: data.tenantId,
          channel: data.channel,
          recipient,
          content: data.content,
          priority: data.priority,
          campaignId: data.campaignId,
          createdBy: data.createdBy,
        });
        results.push(message);
      } catch (error) {
        failed++;
      }
    }

    return {
      total: data.recipients.length,
      queued: results.length,
      failed,
      messages: results,
    };
  }

  async sendMultiChannel(data: {
    tenantId: string;
    channels: ChannelType[];
    recipient: Recipient;
    content: MessageContent;
    priority?: MessagePriority;
    createdBy: string;
  }): Promise<Message[]> {
    const messages: Message[] = [];

    for (const channel of data.channels) {
      try {
        const message = await this.sendMessage({
          tenantId: data.tenantId,
          channel,
          recipient: data.recipient,
          content: data.content,
          priority: data.priority,
          createdBy: data.createdBy,
        });
        messages.push(message);
      } catch (error) {
        // Continue with other channels
      }
    }

    return messages;
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.deliverMessage(message);
      }
    }
  }

  private async deliverMessage(message: Message): Promise<void> {
    message.status = 'sending';
    message.updatedAt = new Date();

    try {
      // Simulate delivery based on channel
      await this.simulateChannelDelivery(message);

      message.status = 'sent';
      message.sentAt = new Date();

      // Simulate delivery confirmation
      setTimeout(() => {
        message.status = 'delivered';
        message.deliveredAt = new Date();
        message.updatedAt = new Date();
        this.eventEmitter.emit('communication.message.delivered', { message });
      }, 1000);

      this.eventEmitter.emit('communication.message.sent', { message });
    } catch (error: any) {
      message.status = 'failed';
      message.failureReason = error.message;
      message.retryCount++;
      message.updatedAt = new Date();

      if (message.retryCount < message.maxRetries) {
        // Retry later
        setTimeout(() => this.deliverMessage(message), 60000 * message.retryCount);
      }

      this.eventEmitter.emit('communication.message.failed', { message, error });
    }
  }

  private async simulateChannelDelivery(message: Message): Promise<void> {
    // Simulate different channel delivery times
    const delays: Record<ChannelType, number> = {
      email: 500,
      sms: 200,
      whatsapp: 300,
      push: 100,
      in_app: 50,
      slack: 400,
      teams: 400,
      webhook: 200,
    };

    await new Promise((resolve) => setTimeout(resolve, delays[message.channel] || 100));

    // Generate external ID for tracking
    message.externalId = `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // =================== TEMPLATES ===================

  async processTemplate(templateId: string, data: Record<string, any>): Promise<MessageContent> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
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

    // Replace variables in content
    const replaceVariables = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? String(data[key]) : match;
      });
    };

    return {
      subject: template.subject ? replaceVariables(template.subject) : undefined,
      body: replaceVariables(template.body),
      htmlBody: template.htmlBody ? replaceVariables(template.htmlBody) : undefined,
      templateId,
      templateData: data,
    };
  }

  async getTemplates(
    tenantId: string,
    filters?: {
      channel?: ChannelType;
      category?: string;
      search?: string;
      isActive?: boolean;
    },
  ): Promise<CommunicationTemplate[]> {
    let templates = Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId || t.tenantId === 'system',
    );

    if (filters?.channel) {
      templates = templates.filter((t) => t.channel === filters.channel);
    }

    if (filters?.category) {
      templates = templates.filter((t) => t.category === filters.category);
    }

    if (filters?.isActive !== undefined) {
      templates = templates.filter((t) => t.isActive === filters.isActive);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          (t.description && t.description.toLowerCase().includes(search)),
      );
    }

    return templates;
  }

  async getTemplate(id: string): Promise<CommunicationTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createTemplate(data: {
    tenantId: string;
    name: string;
    description?: string;
    channel: ChannelType;
    category: string;
    subject?: string;
    body: string;
    htmlBody?: string;
    variables: TemplateVariable[];
    createdBy: string;
  }): Promise<CommunicationTemplate> {
    const id = `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: CommunicationTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      channel: data.channel,
      category: data.category,
      subject: data.subject,
      body: data.body,
      htmlBody: data.htmlBody,
      variables: data.variables,
      isActive: true,
      version: 1,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);

    return template;
  }

  async updateTemplate(
    id: string,
    updates: Partial<Omit<CommunicationTemplate, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>>,
  ): Promise<CommunicationTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    Object.assign(template, updates, {
      version: template.version + 1,
      updatedAt: new Date(),
    });

    return template;
  }

  // =================== THREADS ===================

  async createThread(data: {
    tenantId: string;
    subject?: string;
    participants: Recipient[];
    channel: ChannelType;
    initialMessage?: MessageContent;
    createdBy: string;
  }): Promise<MessageThread> {
    const id = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const thread: MessageThread = {
      id,
      tenantId: data.tenantId,
      subject: data.subject,
      participants: data.participants,
      messages: [],
      channel: data.channel,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageAt: new Date(),
    };

    this.threads.set(id, thread);

    // Send initial message if provided
    if (data.initialMessage) {
      for (const participant of data.participants) {
        await this.sendMessage({
          tenantId: data.tenantId,
          channel: data.channel,
          recipient: participant,
          content: data.initialMessage,
          threadId: id,
          createdBy: data.createdBy,
        });
      }
    }

    return thread;
  }

  async getThread(id: string): Promise<MessageThread | null> {
    return this.threads.get(id) || null;
  }

  async getThreadMessages(threadId: string): Promise<Message[]> {
    const thread = this.threads.get(threadId);
    if (!thread) return [];

    return thread.messages
      .map((id) => this.messages.get(id))
      .filter((m): m is Message => m !== undefined)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  private async addMessageToThread(threadId: string, messageId: string): Promise<void> {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.messages.push(messageId);
      thread.lastMessageAt = new Date();
      thread.updatedAt = new Date();
    }
  }

  // =================== CAMPAIGNS ===================

  async createCampaign(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: Campaign['type'];
    channels: ChannelType[];
    content: MessageContent;
    audience: AudienceFilter;
    schedule?: CampaignSchedule;
    createdBy: string;
  }): Promise<Campaign> {
    const id = `camp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const campaign: Campaign = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      channels: data.channels,
      content: data.content,
      audience: data.audience,
      schedule: data.schedule,
      status: 'draft',
      stats: {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        failed: 0,
        unsubscribed: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
      },
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.campaigns.set(id, campaign);

    return campaign;
  }

  async getCampaigns(
    tenantId: string,
    filters?: {
      status?: Campaign['status'];
      type?: Campaign['type'];
      search?: string;
      limit?: number;
    },
  ): Promise<Campaign[]> {
    let campaigns = Array.from(this.campaigns.values()).filter((c) => c.tenantId === tenantId);

    if (filters?.status) {
      campaigns = campaigns.filter((c) => c.status === filters.status);
    }

    if (filters?.type) {
      campaigns = campaigns.filter((c) => c.type === filters.type);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      campaigns = campaigns.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          (c.description && c.description.toLowerCase().includes(search)),
      );
    }

    campaigns = campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      campaigns = campaigns.slice(0, filters.limit);
    }

    return campaigns;
  }

  async getCampaign(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) || null;
  }

  async startCampaign(campaignId: string, userId: string): Promise<Campaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Campaign cannot be started');
    }

    campaign.status = 'active';
    campaign.startedAt = new Date();
    campaign.updatedAt = new Date();

    // Simulate sending to audience
    this.executeCampaign(campaign);

    this.eventEmitter.emit('communication.campaign.started', { campaign });

    return campaign;
  }

  private async executeCampaign(campaign: Campaign): Promise<void> {
    // Simulate audience size based on filter type
    const audienceSize = campaign.audience.limit || Math.floor(Math.random() * 1000) + 100;
    campaign.stats.totalRecipients = audienceSize;

    // Simulate sending
    for (let i = 0; i < audienceSize; i++) {
      campaign.stats.sent++;

      // Simulate delivery rate (95%)
      if (Math.random() < 0.95) {
        campaign.stats.delivered++;

        // Simulate open rate (25-35%)
        if (Math.random() < 0.30) {
          campaign.stats.opened++;

          // Simulate click rate (5-15% of opens)
          if (Math.random() < 0.10) {
            campaign.stats.clicked++;
          }
        }
      } else {
        if (Math.random() < 0.5) {
          campaign.stats.bounced++;
        } else {
          campaign.stats.failed++;
        }
      }
    }

    // Calculate rates
    campaign.stats.openRate = campaign.stats.delivered > 0
      ? Math.round((campaign.stats.opened / campaign.stats.delivered) * 100)
      : 0;
    campaign.stats.clickRate = campaign.stats.opened > 0
      ? Math.round((campaign.stats.clicked / campaign.stats.opened) * 100)
      : 0;
    campaign.stats.bounceRate = campaign.stats.sent > 0
      ? Math.round((campaign.stats.bounced / campaign.stats.sent) * 100)
      : 0;

    campaign.status = 'completed';
    campaign.completedAt = new Date();
    campaign.updatedAt = new Date();

    this.eventEmitter.emit('communication.campaign.completed', { campaign });
  }

  async pauseCampaign(campaignId: string): Promise<Campaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.status = 'paused';
    campaign.updatedAt = new Date();

    return campaign;
  }

  async cancelCampaign(campaignId: string): Promise<Campaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.status = 'cancelled';
    campaign.updatedAt = new Date();

    return campaign;
  }

  // =================== MESSAGE TRACKING ===================

  async getMessage(id: string): Promise<Message | null> {
    return this.messages.get(id) || null;
  }

  async getMessages(
    tenantId: string,
    filters?: {
      channel?: ChannelType;
      status?: MessageStatus;
      recipientId?: string;
      campaignId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<Message[]> {
    let messages = Array.from(this.messages.values()).filter((m) => m.tenantId === tenantId);

    if (filters?.channel) {
      messages = messages.filter((m) => m.channel === filters.channel);
    }

    if (filters?.status) {
      messages = messages.filter((m) => m.status === filters.status);
    }

    if (filters?.recipientId) {
      messages = messages.filter((m) => m.recipient.id === filters.recipientId);
    }

    if (filters?.campaignId) {
      messages = messages.filter((m) => m.campaignId === filters.campaignId);
    }

    if (filters?.startDate) {
      messages = messages.filter((m) => m.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      messages = messages.filter((m) => m.createdAt <= filters.endDate!);
    }

    messages = messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      messages = messages.slice(0, filters.limit);
    }

    return messages;
  }

  async trackMessageOpen(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message && !message.openedAt) {
      message.status = 'opened';
      message.openedAt = new Date();
      message.updatedAt = new Date();

      this.eventEmitter.emit('communication.message.opened', { message });
    }
  }

  async trackMessageClick(messageId: string, action?: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message) {
      message.status = 'clicked';
      message.clickedAt = new Date();
      message.updatedAt = new Date();

      this.eventEmitter.emit('communication.message.clicked', { message, action });
    }
  }

  // =================== CHANNEL CONFIGURATION ===================

  async getChannelConfigs(): Promise<ChannelConfig[]> {
    return Array.from(this.channelConfigs.values());
  }

  async getChannelConfig(channel: ChannelType): Promise<ChannelConfig | null> {
    return this.channelConfigs.get(channel) || null;
  }

  async updateChannelConfig(channel: ChannelType, updates: Partial<ChannelConfig>): Promise<ChannelConfig | null> {
    const config = this.channelConfigs.get(channel);
    if (!config) return null;

    Object.assign(config, updates);
    return config;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalMessages: number;
    byChannel: Record<string, number>;
    byStatus: Record<string, number>;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    activeCampaigns: number;
    totalCampaigns: number;
  }> {
    const messages = await this.getMessages(tenantId);
    const campaigns = await this.getCampaigns(tenantId);

    const byChannel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let delivered = 0;
    let opened = 0;
    let clicked = 0;

    for (const message of messages) {
      byChannel[message.channel] = (byChannel[message.channel] || 0) + 1;
      byStatus[message.status] = (byStatus[message.status] || 0) + 1;

      if (message.status === 'delivered' || message.status === 'opened' || message.status === 'clicked') {
        delivered++;
      }
      if (message.status === 'opened' || message.status === 'clicked') {
        opened++;
      }
      if (message.status === 'clicked') {
        clicked++;
      }
    }

    return {
      totalMessages: messages.length,
      byChannel,
      byStatus,
      deliveryRate: messages.length > 0 ? Math.round((delivered / messages.length) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
      totalCampaigns: campaigns.length,
    };
  }
}
