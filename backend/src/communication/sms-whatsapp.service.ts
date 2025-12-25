import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type SMSChannel = 'sms' | 'whatsapp';
export type SMSStatus = 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered';
export type MessageType = 'text' | 'template' | 'media' | 'interactive' | 'location' | 'contact';

export interface PhoneNumber {
  number: string;
  countryCode?: string;
  formatted?: string;
  isVerified?: boolean;
}

export interface SMSMessage {
  id: string;
  tenantId: string;
  channel: SMSChannel;
  from: PhoneNumber;
  to: PhoneNumber;
  type: MessageType;
  body: string;
  mediaUrl?: string;
  mediaType?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  interactiveData?: InteractiveMessage;
  location?: LocationData;
  contact?: ContactData;
  status: SMSStatus;
  provider?: string;
  externalId?: string;
  price?: number;
  currency?: string;
  segments?: number;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureCode?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  conversationId?: string;
  campaignId?: string;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InteractiveMessage {
  type: 'button' | 'list' | 'product' | 'product_list';
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    mediaUrl?: string;
  };
  body: string;
  footer?: string;
  buttons?: Array<{
    type: 'reply' | 'url' | 'phone';
    id?: string;
    title: string;
    url?: string;
    phone?: string;
  }>;
  sections?: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ContactData {
  name: { formatted: string; first?: string; last?: string };
  phones?: Array<{ type: string; phone: string }>;
  emails?: Array<{ type: string; email: string }>;
  addresses?: Array<{ type: string; street?: string; city?: string; country?: string }>;
  org?: { company?: string; title?: string };
}

export interface SMSTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  channel: SMSChannel;
  category: string;
  language: string;
  body: string;
  variables: SMSVariable[];
  buttons?: Array<{
    type: 'quick_reply' | 'url' | 'phone';
    text: string;
    url?: string;
    phone?: string;
  }>;
  isApproved: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  externalTemplateId?: string;
  isActive: boolean;
  stats: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SMSVariable {
  index: number;
  name: string;
  type: 'text' | 'currency' | 'date_time' | 'url';
  example?: string;
  required: boolean;
}

export interface SMSConversation {
  id: string;
  tenantId: string;
  channel: SMSChannel;
  phoneNumber: PhoneNumber;
  contactName?: string;
  messages: string[];
  status: 'active' | 'closed' | 'expired';
  lastMessageAt: Date;
  windowExpiresAt?: Date;
  assignedTo?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SMSProvider {
  id: string;
  name: string;
  type: 'twilio' | 'vonage' | 'messagebird' | 'infobip' | 'plivo';
  isDefault: boolean;
  isActive: boolean;
  credentials: {
    accountSid?: string;
    authToken?: string;
    apiKey?: string;
    apiSecret?: string;
    senderId?: string;
    whatsappBusinessId?: string;
  };
  capabilities: {
    sms: boolean;
    whatsapp: boolean;
    mms: boolean;
    voice: boolean;
  };
  phoneNumbers: PhoneNumber[];
  rateLimit: {
    smsPerSecond: number;
    whatsappPerSecond: number;
  };
  pricing: {
    smsOutbound: number;
    smsInbound: number;
    whatsappSession: number;
    whatsappTemplate: number;
    currency: string;
  };
  stats: {
    smsSent: number;
    smsDelivered: number;
    whatsappSent: number;
    whatsappDelivered: number;
  };
}

export interface VerificationRequest {
  id: string;
  tenantId: string;
  phoneNumber: PhoneNumber;
  channel: 'sms' | 'whatsapp' | 'call';
  code: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class SMSWhatsAppService {
  private messages: Map<string, SMSMessage> = new Map();
  private templates: Map<string, SMSTemplate> = new Map();
  private conversations: Map<string, SMSConversation> = new Map();
  private providers: Map<string, SMSProvider> = new Map();
  private verifications: Map<string, VerificationRequest> = new Map();
  private messageQueue: SMSMessage[] = [];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
    this.initializeDefaultProvider();
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<SMSTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        tenantId: 'system',
        name: 'Verification Code',
        description: 'OTP verification code',
        channel: 'sms',
        category: 'authentication',
        language: 'en',
        body: 'Your verification code is: {{1}}. Valid for {{2}} minutes. Do not share this code.',
        variables: [
          { index: 1, name: 'code', type: 'text', example: '123456', required: true },
          { index: 2, name: 'expiry', type: 'text', example: '10', required: true },
        ],
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Order Confirmation',
        description: 'Order confirmation SMS',
        channel: 'sms',
        category: 'transactional',
        language: 'en',
        body: 'Order #{{1}} confirmed! Total: {{2}} {{3}}. Track: {{4}}',
        variables: [
          { index: 1, name: 'order_number', type: 'text', required: true },
          { index: 2, name: 'total', type: 'currency', required: true },
          { index: 3, name: 'currency', type: 'text', example: 'RON', required: true },
          { index: 4, name: 'tracking_url', type: 'url', required: false },
        ],
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Appointment Reminder',
        description: 'Appointment reminder',
        channel: 'sms',
        category: 'reminder',
        language: 'en',
        body: 'Reminder: Your appointment is on {{1}} at {{2}}. Location: {{3}}. Reply YES to confirm or NO to cancel.',
        variables: [
          { index: 1, name: 'date', type: 'date_time', required: true },
          { index: 2, name: 'time', type: 'text', required: true },
          { index: 3, name: 'location', type: 'text', required: true },
        ],
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'WhatsApp Welcome',
        description: 'WhatsApp welcome message',
        channel: 'whatsapp',
        category: 'marketing',
        language: 'en',
        body: 'Hi {{1}}! Welcome to {{2}}. How can we help you today?\n\nReply with:\n1 - Support\n2 - Orders\n3 - Information',
        variables: [
          { index: 1, name: 'name', type: 'text', required: true },
          { index: 2, name: 'company', type: 'text', required: true },
        ],
        buttons: [
          { type: 'quick_reply', text: 'Support' },
          { type: 'quick_reply', text: 'Orders' },
          { type: 'quick_reply', text: 'Information' },
        ],
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'WhatsApp Order Update',
        description: 'WhatsApp order status update',
        channel: 'whatsapp',
        category: 'transactional',
        language: 'en',
        body: 'Hi {{1}}! Your order #{{2}} is now {{3}}.\n\n{{4}}\n\nTrack your order: {{5}}',
        variables: [
          { index: 1, name: 'name', type: 'text', required: true },
          { index: 2, name: 'order_number', type: 'text', required: true },
          { index: 3, name: 'status', type: 'text', required: true },
          { index: 4, name: 'details', type: 'text', required: false },
          { index: 5, name: 'tracking_url', type: 'url', required: false },
        ],
        buttons: [
          { type: 'url', text: 'Track Order', url: '{{5}}' },
          { type: 'phone', text: 'Call Support', phone: '+40123456789' },
        ],
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'ANAF Alert',
        description: 'ANAF deadline alert',
        channel: 'sms',
        category: 'compliance',
        language: 'ro',
        body: 'ALERT: {{1}} scade in {{2}} zile ({{3}}). Depuneti declaratia pentru a evita penalitatile.',
        variables: [
          { index: 1, name: 'declaration_type', type: 'text', required: true },
          { index: 2, name: 'days_remaining', type: 'text', required: true },
          { index: 3, name: 'due_date', type: 'date_time', required: true },
        ],
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Invoice Reminder',
        description: 'Invoice payment reminder',
        channel: 'whatsapp',
        category: 'billing',
        language: 'en',
        body: 'Hi {{1}}, this is a reminder that invoice #{{2}} for {{3}} {{4}} is {{5}}.\n\nDue date: {{6}}\n\nPay now: {{7}}',
        variables: [
          { index: 1, name: 'client_name', type: 'text', required: true },
          { index: 2, name: 'invoice_number', type: 'text', required: true },
          { index: 3, name: 'amount', type: 'currency', required: true },
          { index: 4, name: 'currency', type: 'text', required: true },
          { index: 5, name: 'status', type: 'text', required: true },
          { index: 6, name: 'due_date', type: 'date_time', required: true },
          { index: 7, name: 'payment_url', type: 'url', required: true },
        ],
        buttons: [
          { type: 'url', text: 'Pay Now', url: '{{7}}' },
        ],
        isApproved: true,
        approvalStatus: 'approved',
        isActive: true,
        stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
        createdBy: 'system',
      },
    ];

    for (const template of templates) {
      const id = `stpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, {
        id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  private initializeDefaultProvider(): void {
    const provider: SMSProvider = {
      id: 'default-twilio',
      name: 'Twilio',
      type: 'twilio',
      isDefault: true,
      isActive: true,
      credentials: {
        accountSid: '',
        authToken: '',
        senderId: 'DocumentIulia',
      },
      capabilities: {
        sms: true,
        whatsapp: true,
        mms: true,
        voice: true,
      },
      phoneNumbers: [],
      rateLimit: {
        smsPerSecond: 10,
        whatsappPerSecond: 80,
      },
      pricing: {
        smsOutbound: 0.05,
        smsInbound: 0.01,
        whatsappSession: 0.005,
        whatsappTemplate: 0.05,
        currency: 'USD',
      },
      stats: {
        smsSent: 0,
        smsDelivered: 0,
        whatsappSent: 0,
        whatsappDelivered: 0,
      },
    };

    this.providers.set(provider.id, provider);
  }

  // =================== MESSAGE SENDING ===================

  async sendSMS(data: {
    tenantId: string;
    to: PhoneNumber;
    body: string;
    from?: PhoneNumber;
    templateId?: string;
    templateData?: Record<string, any>;
    scheduledAt?: Date;
    campaignId?: string;
    metadata?: Record<string, any>;
    createdBy: string;
  }): Promise<SMSMessage> {
    const id = `sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Process template if provided
    let body = data.body;
    if (data.templateId) {
      body = await this.processTemplate(data.templateId, data.templateData || {});
    }

    // Calculate segments
    const segments = Math.ceil(body.length / 160);

    const message: SMSMessage = {
      id,
      tenantId: data.tenantId,
      channel: 'sms',
      from: data.from || { number: '+40700000000' },
      to: data.to,
      type: data.templateId ? 'template' : 'text',
      body,
      templateId: data.templateId,
      templateData: data.templateData,
      status: data.scheduledAt ? 'pending' : 'queued',
      segments,
      scheduledAt: data.scheduledAt,
      retryCount: 0,
      maxRetries: 3,
      campaignId: data.campaignId,
      metadata: data.metadata,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.messages.set(id, message);

    if (!data.scheduledAt) {
      this.messageQueue.push(message);
      await this.processMessageQueue();
    }

    this.eventEmitter.emit('sms.created', { message });

    return message;
  }

  async sendWhatsApp(data: {
    tenantId: string;
    to: PhoneNumber;
    type: MessageType;
    body?: string;
    mediaUrl?: string;
    mediaType?: string;
    templateId?: string;
    templateData?: Record<string, any>;
    interactiveData?: InteractiveMessage;
    location?: LocationData;
    contact?: ContactData;
    conversationId?: string;
    metadata?: Record<string, any>;
    createdBy: string;
  }): Promise<SMSMessage> {
    const id = `wa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Process template if provided
    let body = data.body || '';
    if (data.templateId) {
      body = await this.processTemplate(data.templateId, data.templateData || {});
    }

    const message: SMSMessage = {
      id,
      tenantId: data.tenantId,
      channel: 'whatsapp',
      from: { number: '+40700000000' },
      to: data.to,
      type: data.type,
      body,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      templateId: data.templateId,
      templateData: data.templateData,
      interactiveData: data.interactiveData,
      location: data.location,
      contact: data.contact,
      status: 'queued',
      retryCount: 0,
      maxRetries: 3,
      conversationId: data.conversationId,
      metadata: data.metadata,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.messages.set(id, message);

    // Add to conversation if specified
    if (data.conversationId) {
      await this.addMessageToConversation(data.conversationId, id);
    }

    this.messageQueue.push(message);
    await this.processMessageQueue();

    this.eventEmitter.emit('whatsapp.created', { message });

    return message;
  }

  async sendBulkSMS(data: {
    tenantId: string;
    recipients: Array<PhoneNumber & { data?: Record<string, any> }>;
    body?: string;
    templateId?: string;
    campaignId?: string;
    createdBy: string;
  }): Promise<{ total: number; queued: number; failed: number }> {
    let queued = 0;
    let failed = 0;

    for (const recipient of data.recipients) {
      try {
        await this.sendSMS({
          tenantId: data.tenantId,
          to: { number: recipient.number, countryCode: recipient.countryCode },
          body: data.body || '',
          templateId: data.templateId,
          templateData: recipient.data,
          campaignId: data.campaignId,
          createdBy: data.createdBy,
        });
        queued++;
      } catch (error) {
        failed++;
      }
    }

    return { total: data.recipients.length, queued, failed };
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.deliverMessage(message);
      }
    }
  }

  private async deliverMessage(message: SMSMessage): Promise<void> {
    message.status = 'sending';
    message.updatedAt = new Date();

    try {
      // Simulate delivery
      await new Promise((resolve) => setTimeout(resolve, 100));

      message.status = 'sent';
      message.sentAt = new Date();
      message.externalId = `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Simulate pricing
      if (message.channel === 'sms') {
        message.price = (message.segments || 1) * 0.05;
        message.currency = 'USD';
      } else {
        message.price = 0.005;
        message.currency = 'USD';
      }

      // Update template stats
      if (message.templateId) {
        const template = this.templates.get(message.templateId);
        if (template) template.stats.sent++;
      }

      // Simulate delivery confirmation
      setTimeout(() => {
        message.status = 'delivered';
        message.deliveredAt = new Date();
        message.updatedAt = new Date();

        if (message.templateId) {
          const template = this.templates.get(message.templateId);
          if (template) template.stats.delivered++;
        }

        this.eventEmitter.emit(`${message.channel}.delivered`, { message });
      }, 500);

      // Simulate read for WhatsApp
      if (message.channel === 'whatsapp') {
        setTimeout(() => {
          message.status = 'read';
          message.readAt = new Date();
          message.updatedAt = new Date();

          if (message.templateId) {
            const template = this.templates.get(message.templateId);
            if (template) template.stats.read++;
          }

          this.eventEmitter.emit('whatsapp.read', { message });
        }, 2000);
      }

      this.eventEmitter.emit(`${message.channel}.sent`, { message });
    } catch (error: any) {
      message.status = 'failed';
      message.failureReason = error.message;
      message.retryCount++;
      message.updatedAt = new Date();

      if (message.templateId) {
        const template = this.templates.get(message.templateId);
        if (template) template.stats.failed++;
      }

      if (message.retryCount < message.maxRetries) {
        setTimeout(() => this.deliverMessage(message), 30000 * message.retryCount);
      }

      this.eventEmitter.emit(`${message.channel}.failed`, { message, error });
    }
  }

  // =================== TEMPLATES ===================

  async processTemplate(templateId: string, data: Record<string, any>): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    let body = template.body;

    // Replace indexed variables {{1}}, {{2}}, etc.
    for (const variable of template.variables) {
      const value = data[variable.name] || data[String(variable.index)] || variable.example || '';
      body = body.replace(new RegExp(`\\{\\{${variable.index}\\}\\}`, 'g'), String(value));
    }

    return body;
  }

  async getTemplates(
    tenantId: string,
    filters?: {
      channel?: SMSChannel;
      category?: string;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<SMSTemplate[]> {
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

  async getTemplate(id: string): Promise<SMSTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createTemplate(data: {
    tenantId: string;
    name: string;
    description?: string;
    channel: SMSChannel;
    category: string;
    language: string;
    body: string;
    variables: SMSVariable[];
    buttons?: SMSTemplate['buttons'];
    createdBy: string;
  }): Promise<SMSTemplate> {
    const id = `stpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: SMSTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      channel: data.channel,
      category: data.category,
      language: data.language,
      body: data.body,
      variables: data.variables,
      buttons: data.buttons,
      isApproved: data.channel === 'sms',
      approvalStatus: data.channel === 'whatsapp' ? 'pending' : 'approved',
      isActive: data.channel === 'sms',
      stats: { sent: 0, delivered: 0, read: 0, failed: 0 },
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);

    return template;
  }

  // =================== CONVERSATIONS ===================

  async createConversation(data: {
    tenantId: string;
    channel: SMSChannel;
    phoneNumber: PhoneNumber;
    contactName?: string;
    assignedTo?: string;
  }): Promise<SMSConversation> {
    const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // WhatsApp 24-hour window
    const windowExpiresAt = data.channel === 'whatsapp'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : undefined;

    const conversation: SMSConversation = {
      id,
      tenantId: data.tenantId,
      channel: data.channel,
      phoneNumber: data.phoneNumber,
      contactName: data.contactName,
      messages: [],
      status: 'active',
      lastMessageAt: new Date(),
      windowExpiresAt,
      assignedTo: data.assignedTo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(id, conversation);

    return conversation;
  }

  async getConversation(id: string): Promise<SMSConversation | null> {
    return this.conversations.get(id) || null;
  }

  async getConversations(
    tenantId: string,
    filters?: {
      channel?: SMSChannel;
      status?: SMSConversation['status'];
      assignedTo?: string;
      limit?: number;
    },
  ): Promise<SMSConversation[]> {
    let conversations = Array.from(this.conversations.values()).filter(
      (c) => c.tenantId === tenantId,
    );

    if (filters?.channel) {
      conversations = conversations.filter((c) => c.channel === filters.channel);
    }

    if (filters?.status) {
      conversations = conversations.filter((c) => c.status === filters.status);
    }

    if (filters?.assignedTo) {
      conversations = conversations.filter((c) => c.assignedTo === filters.assignedTo);
    }

    conversations = conversations.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

    if (filters?.limit) {
      conversations = conversations.slice(0, filters.limit);
    }

    return conversations;
  }

  async getConversationMessages(conversationId: string): Promise<SMSMessage[]> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];

    return conversation.messages
      .map((id) => this.messages.get(id))
      .filter((m): m is SMSMessage => m !== undefined)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  private async addMessageToConversation(conversationId: string, messageId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.messages.push(messageId);
      conversation.lastMessageAt = new Date();
      conversation.updatedAt = new Date();

      // Extend WhatsApp window
      if (conversation.channel === 'whatsapp') {
        conversation.windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    }
  }

  // =================== VERIFICATION ===================

  async sendVerificationCode(data: {
    tenantId: string;
    phoneNumber: PhoneNumber;
    channel?: 'sms' | 'whatsapp' | 'call';
    codeLength?: number;
    expiryMinutes?: number;
    createdBy: string;
  }): Promise<VerificationRequest> {
    const id = `ver-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const codeLength = data.codeLength || 6;
    const code = Math.random().toString().slice(2, 2 + codeLength);
    const expiryMinutes = data.expiryMinutes || 10;

    const verification: VerificationRequest = {
      id,
      tenantId: data.tenantId,
      phoneNumber: data.phoneNumber,
      channel: data.channel || 'sms',
      code,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
      createdAt: new Date(),
    };

    this.verifications.set(id, verification);

    // Send the code
    if (verification.channel === 'sms') {
      await this.sendSMS({
        tenantId: data.tenantId,
        to: data.phoneNumber,
        body: `Your verification code is: ${code}. Valid for ${expiryMinutes} minutes.`,
        createdBy: data.createdBy,
      });
    } else if (verification.channel === 'whatsapp') {
      await this.sendWhatsApp({
        tenantId: data.tenantId,
        to: data.phoneNumber,
        type: 'text',
        body: `Your verification code is: ${code}. Valid for ${expiryMinutes} minutes.`,
        createdBy: data.createdBy,
      });
    }

    return { ...verification, code: '******' };
  }

  async verifyCode(verificationId: string, code: string): Promise<{ success: boolean; message: string }> {
    const verification = this.verifications.get(verificationId);

    if (!verification) {
      return { success: false, message: 'Verification not found' };
    }

    if (verification.status !== 'pending') {
      return { success: false, message: 'Verification already processed' };
    }

    if (new Date() > verification.expiresAt) {
      verification.status = 'expired';
      return { success: false, message: 'Verification code expired' };
    }

    verification.attempts++;

    if (verification.attempts > verification.maxAttempts) {
      verification.status = 'failed';
      return { success: false, message: 'Maximum attempts exceeded' };
    }

    if (verification.code !== code) {
      return { success: false, message: 'Invalid code' };
    }

    verification.status = 'verified';
    verification.verifiedAt = new Date();

    return { success: true, message: 'Phone number verified successfully' };
  }

  // =================== MESSAGE RETRIEVAL ===================

  async getMessage(id: string): Promise<SMSMessage | null> {
    return this.messages.get(id) || null;
  }

  async getMessages(
    tenantId: string,
    filters?: {
      channel?: SMSChannel;
      status?: SMSStatus;
      phoneNumber?: string;
      campaignId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<SMSMessage[]> {
    let messages = Array.from(this.messages.values()).filter((m) => m.tenantId === tenantId);

    if (filters?.channel) {
      messages = messages.filter((m) => m.channel === filters.channel);
    }

    if (filters?.status) {
      messages = messages.filter((m) => m.status === filters.status);
    }

    if (filters?.phoneNumber) {
      messages = messages.filter((m) => m.to.number === filters.phoneNumber);
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

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalSMS: number;
    totalWhatsApp: number;
    smsByStatus: Record<string, number>;
    whatsappByStatus: Record<string, number>;
    smsDeliveryRate: number;
    whatsappDeliveryRate: number;
    whatsappReadRate: number;
    totalCost: number;
    activeConversations: number;
  }> {
    const messages = await this.getMessages(tenantId);
    const conversations = await this.getConversations(tenantId);

    const smsMessages = messages.filter((m) => m.channel === 'sms');
    const whatsappMessages = messages.filter((m) => m.channel === 'whatsapp');

    const smsByStatus: Record<string, number> = {};
    const whatsappByStatus: Record<string, number> = {};

    let smsDelivered = 0;
    let whatsappDelivered = 0;
    let whatsappRead = 0;
    let totalCost = 0;

    for (const msg of smsMessages) {
      smsByStatus[msg.status] = (smsByStatus[msg.status] || 0) + 1;
      if (msg.status === 'delivered' || msg.status === 'read') smsDelivered++;
      totalCost += msg.price || 0;
    }

    for (const msg of whatsappMessages) {
      whatsappByStatus[msg.status] = (whatsappByStatus[msg.status] || 0) + 1;
      if (msg.status === 'delivered' || msg.status === 'read') whatsappDelivered++;
      if (msg.status === 'read') whatsappRead++;
      totalCost += msg.price || 0;
    }

    return {
      totalSMS: smsMessages.length,
      totalWhatsApp: whatsappMessages.length,
      smsByStatus,
      whatsappByStatus,
      smsDeliveryRate: smsMessages.length > 0 ? Math.round((smsDelivered / smsMessages.length) * 100) : 0,
      whatsappDeliveryRate: whatsappMessages.length > 0 ? Math.round((whatsappDelivered / whatsappMessages.length) * 100) : 0,
      whatsappReadRate: whatsappDelivered > 0 ? Math.round((whatsappRead / whatsappDelivered) * 100) : 0,
      totalCost: Math.round(totalCost * 100) / 100,
      activeConversations: conversations.filter((c) => c.status === 'active').length,
    };
  }
}
