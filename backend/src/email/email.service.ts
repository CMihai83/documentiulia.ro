import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type EmailProvider = 'SMTP' | 'SENDGRID' | 'MAILGUN' | 'SES' | 'POSTMARK';

export type EmailStatus = 'PENDING' | 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'BOUNCED' | 'FAILED' | 'SPAM';

export type EmailPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type EmailType =
  | 'TRANSACTIONAL'
  | 'NOTIFICATION'
  | 'MARKETING'
  | 'INVOICE'
  | 'REMINDER'
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | 'VERIFICATION'
  | 'REPORT'
  | 'ALERT'
  | 'ANAF_NOTIFICATION'
  | 'SAGA_SYNC';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  encoding?: 'base64' | 'utf8';
  cid?: string;
  size: number;
}

export interface EmailMessage {
  id: string;
  type: EmailType;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  subject: string;
  subjectRo?: string;
  textBody?: string;
  htmlBody?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments: EmailAttachment[];
  headers: Record<string, string>;
  metadata: Record<string, any>;
  tags: string[];
  priority: EmailPriority;
  status: EmailStatus;
  provider?: EmailProvider;
  providerId?: string;
  organizationId?: string;
  userId?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  bounceReason?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: EmailType;
  subject: string;
  subjectRo: string;
  textBody: string;
  textBodyRo: string;
  htmlBody: string;
  htmlBodyRo: string;
  variables: TemplateVariable[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  description: string;
  descriptionRo: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  required: boolean;
  defaultValue?: any;
}

export interface EmailConfig {
  provider: EmailProvider;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  password?: string;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
  maxRetries: number;
  retryDelay: number;
  rateLimit: number;
  rateLimitPeriod: number;
}

export interface SendEmailOptions {
  type?: EmailType;
  priority?: EmailPriority;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Omit<EmailAttachment, 'size'>[];
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  tags?: string[];
  scheduledAt?: Date;
  organizationId?: string;
  userId?: string;
  language?: 'ro' | 'en';
  maxRetries?: number;
}

export interface EmailStats {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  byType: Record<EmailType, number>;
  byStatus: Record<EmailStatus, number>;
  recentEmails: EmailMessage[];
}

export interface BulkEmailResult {
  id: string;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  results: { email: string; success: boolean; error?: string }[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private emails: Map<string, EmailMessage> = new Map();
  private templates: Map<string, EmailTemplate> = new Map();
  private config: EmailConfig;
  private rateLimitCounter: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.config = this.getDefaultConfig();
    this.initializeDefaultTemplates();
  }

  private getDefaultConfig(): EmailConfig {
    return {
      provider: 'SMTP',
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      fromEmail: 'noreply@documentiulia.ro',
      fromName: 'DocumentIulia',
      maxRetries: 3,
      retryDelay: 5000,
      rateLimit: 100,
      rateLimitPeriod: 60000,
    };
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Welcome Email',
        nameRo: 'Email de Bun Venit',
        description: 'Sent to new users after registration',
        descriptionRo: 'Trimis utilizatorilor noi după înregistrare',
        type: 'WELCOME',
        subject: 'Welcome to DocumentIulia, {{userName}}!',
        subjectRo: 'Bine ați venit la DocumentIulia, {{userName}}!',
        textBody: 'Hello {{userName}},\n\nWelcome to DocumentIulia! Your account has been created successfully.',
        textBodyRo: 'Bună {{userName}},\n\nBine ați venit la DocumentIulia! Contul dumneavoastră a fost creat cu succes.',
        htmlBody: '<h1>Welcome, {{userName}}!</h1><p>Your account has been created successfully.</p>',
        htmlBodyRo: '<h1>Bine ați venit, {{userName}}!</h1><p>Contul dumneavoastră a fost creat cu succes.</p>',
        variables: [
          { name: 'userName', description: 'User full name', descriptionRo: 'Numele complet al utilizatorului', type: 'STRING', required: true },
          { name: 'email', description: 'User email', descriptionRo: 'Email utilizator', type: 'STRING', required: true },
        ],
        isActive: true,
        version: 1,
      },
      {
        name: 'Password Reset',
        nameRo: 'Resetare Parolă',
        description: 'Sent when user requests password reset',
        descriptionRo: 'Trimis când utilizatorul solicită resetarea parolei',
        type: 'PASSWORD_RESET',
        subject: 'Reset Your Password',
        subjectRo: 'Resetați Parola',
        textBody: 'Hello {{userName}},\n\nClick the link below to reset your password:\n{{resetLink}}\n\nThis link expires in {{expiresIn}} minutes.',
        textBodyRo: 'Bună {{userName}},\n\nFaceți clic pe linkul de mai jos pentru a reseta parola:\n{{resetLink}}\n\nAcest link expiră în {{expiresIn}} minute.',
        htmlBody: '<h1>Password Reset</h1><p>Hello {{userName}},</p><p>Click <a href="{{resetLink}}">here</a> to reset your password.</p><p>This link expires in {{expiresIn}} minutes.</p>',
        htmlBodyRo: '<h1>Resetare Parolă</h1><p>Bună {{userName}},</p><p>Faceți clic <a href="{{resetLink}}">aici</a> pentru a reseta parola.</p><p>Acest link expiră în {{expiresIn}} minute.</p>',
        variables: [
          { name: 'userName', description: 'User name', descriptionRo: 'Nume utilizator', type: 'STRING', required: true },
          { name: 'resetLink', description: 'Password reset link', descriptionRo: 'Link resetare parolă', type: 'STRING', required: true },
          { name: 'expiresIn', description: 'Expiration time in minutes', descriptionRo: 'Timp expirare în minute', type: 'NUMBER', required: true, defaultValue: 60 },
        ],
        isActive: true,
        version: 1,
      },
      {
        name: 'Invoice Email',
        nameRo: 'Email Factură',
        description: 'Sent with invoice attachment',
        descriptionRo: 'Trimis cu atașament factură',
        type: 'INVOICE',
        subject: 'Invoice #{{invoiceNumber}} from {{companyName}}',
        subjectRo: 'Factura #{{invoiceNumber}} de la {{companyName}}',
        textBody: 'Dear {{clientName}},\n\nPlease find attached invoice #{{invoiceNumber}} for {{amount}} {{currency}}.\n\nDue date: {{dueDate}}\n\nThank you for your business.',
        textBodyRo: 'Stimate {{clientName}},\n\nVă rugăm să găsiți atașată factura #{{invoiceNumber}} în valoare de {{amount}} {{currency}}.\n\nData scadentă: {{dueDate}}\n\nVă mulțumim pentru colaborare.',
        htmlBody: '<h1>Invoice #{{invoiceNumber}}</h1><p>Dear {{clientName}},</p><p>Amount: {{amount}} {{currency}}</p><p>Due date: {{dueDate}}</p>',
        htmlBodyRo: '<h1>Factura #{{invoiceNumber}}</h1><p>Stimate {{clientName}},</p><p>Sumă: {{amount}} {{currency}}</p><p>Data scadentă: {{dueDate}}</p>',
        variables: [
          { name: 'clientName', description: 'Client name', descriptionRo: 'Nume client', type: 'STRING', required: true },
          { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
          { name: 'amount', description: 'Invoice amount', descriptionRo: 'Suma facturii', type: 'NUMBER', required: true },
          { name: 'currency', description: 'Currency code', descriptionRo: 'Cod valută', type: 'STRING', required: true, defaultValue: 'RON' },
          { name: 'dueDate', description: 'Due date', descriptionRo: 'Data scadentă', type: 'DATE', required: true },
          { name: 'companyName', description: 'Company name', descriptionRo: 'Nume companie', type: 'STRING', required: true },
        ],
        isActive: true,
        version: 1,
      },
      {
        name: 'ANAF Submission Notification',
        nameRo: 'Notificare Trimitere ANAF',
        description: 'Notification about ANAF e-Factura submission',
        descriptionRo: 'Notificare despre trimiterea e-Factura către ANAF',
        type: 'ANAF_NOTIFICATION',
        subject: 'ANAF e-Factura Submission: {{status}}',
        subjectRo: 'Trimitere e-Factura ANAF: {{status}}',
        textBody: 'Dear {{userName}},\n\nYour e-Factura submission has been {{status}}.\n\nInvoice: {{invoiceNumber}}\nSubmission ID: {{submissionId}}\nDate: {{submissionDate}}\n\n{{message}}',
        textBodyRo: 'Stimate {{userName}},\n\nTrimiterea e-Factura a fost {{status}}.\n\nFactură: {{invoiceNumber}}\nID Trimitere: {{submissionId}}\nData: {{submissionDate}}\n\n{{message}}',
        htmlBody: '<h1>ANAF e-Factura {{status}}</h1><p>Invoice: {{invoiceNumber}}</p><p>Submission ID: {{submissionId}}</p><p>{{message}}</p>',
        htmlBodyRo: '<h1>e-Factura ANAF {{status}}</h1><p>Factură: {{invoiceNumber}}</p><p>ID Trimitere: {{submissionId}}</p><p>{{message}}</p>',
        variables: [
          { name: 'userName', description: 'User name', descriptionRo: 'Nume utilizator', type: 'STRING', required: true },
          { name: 'status', description: 'Submission status', descriptionRo: 'Status trimitere', type: 'STRING', required: true },
          { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
          { name: 'submissionId', description: 'ANAF submission ID', descriptionRo: 'ID trimitere ANAF', type: 'STRING', required: true },
          { name: 'submissionDate', description: 'Submission date', descriptionRo: 'Data trimiterii', type: 'DATE', required: true },
          { name: 'message', description: 'Additional message', descriptionRo: 'Mesaj suplimentar', type: 'STRING', required: false },
        ],
        isActive: true,
        version: 1,
      },
      {
        name: 'Payment Reminder',
        nameRo: 'Reamintire Plată',
        description: 'Reminder for overdue invoices',
        descriptionRo: 'Reamintire pentru facturi restante',
        type: 'REMINDER',
        subject: 'Payment Reminder: Invoice #{{invoiceNumber}} is overdue',
        subjectRo: 'Reamintire Plată: Factura #{{invoiceNumber}} este restantă',
        textBody: 'Dear {{clientName}},\n\nThis is a friendly reminder that invoice #{{invoiceNumber}} for {{amount}} {{currency}} was due on {{dueDate}}.\n\nPlease arrange payment at your earliest convenience.',
        textBodyRo: 'Stimate {{clientName}},\n\nAceasta este o reamintire că factura #{{invoiceNumber}} în valoare de {{amount}} {{currency}} a avut scadența în {{dueDate}}.\n\nVă rugăm să efectuați plata cât mai curând posibil.',
        htmlBody: '<h1>Payment Reminder</h1><p>Invoice #{{invoiceNumber}} for {{amount}} {{currency}} was due on {{dueDate}}.</p>',
        htmlBodyRo: '<h1>Reamintire Plată</h1><p>Factura #{{invoiceNumber}} în valoare de {{amount}} {{currency}} a avut scadența în {{dueDate}}.</p>',
        variables: [
          { name: 'clientName', description: 'Client name', descriptionRo: 'Nume client', type: 'STRING', required: true },
          { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
          { name: 'amount', description: 'Amount due', descriptionRo: 'Sumă de plată', type: 'NUMBER', required: true },
          { name: 'currency', description: 'Currency', descriptionRo: 'Valută', type: 'STRING', required: true, defaultValue: 'RON' },
          { name: 'dueDate', description: 'Original due date', descriptionRo: 'Data scadentă originală', type: 'DATE', required: true },
          { name: 'daysOverdue', description: 'Days overdue', descriptionRo: 'Zile întârziere', type: 'NUMBER', required: false },
        ],
        isActive: true,
        version: 1,
      },
    ];

    const now = new Date();
    defaultTemplates.forEach((template) => {
      const id = this.generateId('tmpl');
      this.templates.set(id, { ...template, id, createdAt: now, updatedAt: now });
    });
  }

  async sendEmail(
    to: string | string[] | EmailAddress | EmailAddress[],
    subject: string,
    body: { text?: string; html?: string },
    options: SendEmailOptions = {},
  ): Promise<EmailMessage> {
    const recipients = this.normalizeRecipients(to);

    if (recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    const emailId = this.generateId('email');
    const now = new Date();

    const attachments = (options.attachments || []).map((a) => ({
      ...a,
      size: typeof a.content === 'string' ? a.content.length : a.content.length,
    }));

    const email: EmailMessage = {
      id: emailId,
      type: options.type || 'TRANSACTIONAL',
      from: { email: this.config.fromEmail, name: this.config.fromName },
      to: recipients,
      subject,
      textBody: body.text,
      htmlBody: body.html,
      templateId: options.templateId,
      templateData: options.templateData,
      attachments,
      headers: options.headers || {},
      metadata: options.metadata || {},
      tags: options.tags || [],
      priority: options.priority || 'NORMAL',
      status: options.scheduledAt ? 'QUEUED' : 'PENDING',
      organizationId: options.organizationId,
      userId: options.userId,
      scheduledAt: options.scheduledAt,
      retryCount: 0,
      maxRetries: options.maxRetries !== undefined ? options.maxRetries : this.config.maxRetries,
      createdAt: now,
      updatedAt: now,
    };

    this.emails.set(emailId, email);

    // If not scheduled, send immediately
    if (!options.scheduledAt) {
      await this.processEmail(email);
    }

    this.eventEmitter.emit('email.created', {
      emailId,
      to: recipients.map((r) => r.email),
      subject,
      type: email.type,
    });

    this.logger.log(`Email created: ${emailId} to ${recipients.map((r) => r.email).join(', ')}`);

    return email;
  }

  async sendTemplateEmail(
    to: string | string[] | EmailAddress | EmailAddress[],
    templateId: string,
    data: Record<string, any>,
    options: Omit<SendEmailOptions, 'templateId' | 'templateData'> = {},
  ): Promise<EmailMessage> {
    const template = this.templates.get(templateId);
    if (!template) {
      // Try to find by name
      const found = Array.from(this.templates.values()).find((t) => t.name === templateId);
      if (!found) {
        throw new Error(`Template not found: ${templateId}`);
      }
      return this.sendTemplateEmailByTemplate(to, found, data, options);
    }

    return this.sendTemplateEmailByTemplate(to, template, data, options);
  }

  private async sendTemplateEmailByTemplate(
    to: string | string[] | EmailAddress | EmailAddress[],
    template: EmailTemplate,
    data: Record<string, any>,
    options: Omit<SendEmailOptions, 'templateId' | 'templateData'> = {},
  ): Promise<EmailMessage> {
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

    const language = options.language || 'ro';
    const subject = this.renderTemplate(
      language === 'ro' ? template.subjectRo : template.subject,
      data,
    );
    const textBody = this.renderTemplate(
      language === 'ro' ? template.textBodyRo : template.textBody,
      data,
    );
    const htmlBody = this.renderTemplate(
      language === 'ro' ? template.htmlBodyRo : template.htmlBody,
      data,
    );

    return this.sendEmail(to, subject, { text: textBody, html: htmlBody }, {
      ...options,
      type: template.type,
      templateId: template.id,
      templateData: data,
    });
  }

  async sendBulkEmail(
    recipients: (string | EmailAddress)[],
    subject: string,
    body: { text?: string; html?: string },
    options: SendEmailOptions = {},
  ): Promise<BulkEmailResult> {
    const bulkId = this.generateId('bulk');
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const recipient of recipients) {
      const emailAddr = typeof recipient === 'string' ? recipient : recipient.email;
      try {
        const sentEmail = await this.sendEmail(recipient, subject, body, options);
        // Check actual status after processing
        if (sentEmail.status === 'FAILED' || sentEmail.status === 'BOUNCED') {
          results.push({
            email: emailAddr,
            success: false,
            error: sentEmail.bounceReason || 'Send failed',
          });
        } else {
          results.push({ email: emailAddr, success: true });
        }
      } catch (err) {
        results.push({
          email: emailAddr,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const result: BulkEmailResult = {
      id: bulkId,
      totalRecipients: recipients.length,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
      results,
    };

    this.eventEmitter.emit('email.bulk.completed', result);

    return result;
  }

  private async processEmail(email: EmailMessage): Promise<void> {
    email.status = 'SENDING';
    email.updatedAt = new Date();
    this.emails.set(email.id, email);

    try {
      // Simulate sending
      await this.simulateSend(email);

      email.status = 'SENT';
      email.sentAt = new Date();

      // Simulate delivery (in real world, this would be a webhook)
      setTimeout(() => {
        email.status = 'DELIVERED';
        email.deliveredAt = new Date();
        email.updatedAt = new Date();
        this.emails.set(email.id, email);

        this.eventEmitter.emit('email.delivered', { emailId: email.id });
      }, 100);

      this.eventEmitter.emit('email.sent', {
        emailId: email.id,
        to: email.to.map((r) => r.email),
      });

    } catch (err) {
      email.retryCount++;

      if (email.retryCount < email.maxRetries) {
        email.status = 'QUEUED';
        this.eventEmitter.emit('email.retry', {
          emailId: email.id,
          attempt: email.retryCount,
        });
      } else {
        email.status = 'FAILED';
        email.bounceReason = err instanceof Error ? err.message : 'Unknown error';

        this.eventEmitter.emit('email.failed', {
          emailId: email.id,
          error: email.bounceReason,
        });
      }
    }

    email.updatedAt = new Date();
    this.emails.set(email.id, email);
  }

  private async simulateSend(email: EmailMessage): Promise<void> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate occasional failures for testing
    if (email.to.some((r) => r.email.includes('fail@'))) {
      throw new Error('Simulated send failure');
    }

    if (email.to.some((r) => r.email.includes('bounce@'))) {
      email.status = 'BOUNCED';
      email.bouncedAt = new Date();
      email.bounceReason = 'Mailbox not found';
      throw new Error('Bounce: Mailbox not found');
    }
  }

  async getEmail(emailId: string): Promise<EmailMessage | undefined> {
    return this.emails.get(emailId);
  }

  async getEmailsByUser(userId: string, limit: number = 50): Promise<EmailMessage[]> {
    return Array.from(this.emails.values())
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getEmailsByOrganization(organizationId: string, limit: number = 50): Promise<EmailMessage[]> {
    return Array.from(this.emails.values())
      .filter((e) => e.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getEmailsByStatus(status: EmailStatus): Promise<EmailMessage[]> {
    return Array.from(this.emails.values()).filter((e) => e.status === status);
  }

  async retryEmail(emailId: string): Promise<EmailMessage> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error('Email not found');
    }

    if (email.status !== 'FAILED' && email.status !== 'BOUNCED') {
      throw new Error('Only failed or bounced emails can be retried');
    }

    email.status = 'PENDING';
    email.retryCount = 0;
    email.bounceReason = undefined;
    email.bouncedAt = undefined;
    email.updatedAt = new Date();

    this.emails.set(emailId, email);
    await this.processEmail(email);

    return email;
  }

  async cancelEmail(emailId: string): Promise<EmailMessage> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error('Email not found');
    }

    if (email.status !== 'QUEUED' && email.status !== 'PENDING') {
      throw new Error('Only queued or pending emails can be cancelled');
    }

    email.status = 'FAILED';
    email.bounceReason = 'Cancelled by user';
    email.updatedAt = new Date();

    this.emails.set(emailId, email);

    this.eventEmitter.emit('email.cancelled', { emailId });

    return email;
  }

  async markAsOpened(emailId: string): Promise<EmailMessage> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error('Email not found');
    }

    if (!email.openedAt) {
      email.openedAt = new Date();
      email.updatedAt = new Date();
      this.emails.set(emailId, email);

      this.eventEmitter.emit('email.opened', { emailId });
    }

    return email;
  }

  async markAsClicked(emailId: string, link?: string): Promise<EmailMessage> {
    const email = this.emails.get(emailId);
    if (!email) {
      throw new Error('Email not found');
    }

    if (!email.clickedAt) {
      email.clickedAt = new Date();
      email.updatedAt = new Date();
      this.emails.set(emailId, email);

      this.eventEmitter.emit('email.clicked', { emailId, link });
    }

    return email;
  }

  // Template Management

  async createTemplate(
    template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<EmailTemplate> {
    const id = this.generateId('tmpl');
    const now = new Date();

    const newTemplate: EmailTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(id, newTemplate);

    this.eventEmitter.emit('template.created', { templateId: id, name: template.name });

    return newTemplate;
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<EmailTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const updated: EmailTemplate = {
      ...template,
      ...updates,
      version: template.version + 1,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);

    this.eventEmitter.emit('template.updated', { templateId });

    return updated;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.templates.has(templateId)) {
      throw new Error('Template not found');
    }

    this.templates.delete(templateId);

    this.eventEmitter.emit('template.deleted', { templateId });
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | undefined> {
    return this.templates.get(templateId);
  }

  async getTemplateByName(name: string): Promise<EmailTemplate | undefined> {
    return Array.from(this.templates.values()).find((t) => t.name === name);
  }

  async getAllTemplates(): Promise<EmailTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByType(type: EmailType): Promise<EmailTemplate[]> {
    return Array.from(this.templates.values()).filter((t) => t.type === type);
  }

  async activateTemplate(templateId: string): Promise<EmailTemplate> {
    return this.updateTemplate(templateId, { isActive: true });
  }

  async deactivateTemplate(templateId: string): Promise<EmailTemplate> {
    return this.updateTemplate(templateId, { isActive: false });
  }

  // Statistics

  async getStats(since?: Date): Promise<EmailStats> {
    let emails = Array.from(this.emails.values());
    if (since) {
      emails = emails.filter((e) => e.createdAt >= since);
    }

    const totalSent = emails.filter((e) => e.status !== 'PENDING' && e.status !== 'QUEUED').length;
    const totalDelivered = emails.filter((e) => e.status === 'DELIVERED').length;
    const totalBounced = emails.filter((e) => e.status === 'BOUNCED').length;
    const totalFailed = emails.filter((e) => e.status === 'FAILED').length;
    const totalOpened = emails.filter((e) => e.openedAt).length;
    const totalClicked = emails.filter((e) => e.clickedAt).length;

    const byType: Record<EmailType, number> = {} as any;
    const byStatus: Record<EmailStatus, number> = {} as any;

    for (const email of emails) {
      byType[email.type] = (byType[email.type] || 0) + 1;
      byStatus[email.status] = (byStatus[email.status] || 0) + 1;
    }

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      totalFailed,
      totalOpened,
      totalClicked,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
      bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
      byType,
      byStatus,
      recentEmails: emails.slice(-10).reverse(),
    };
  }

  // Configuration

  getConfig(): Omit<EmailConfig, 'password' | 'apiKey'> {
    const { password, apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }

  updateConfig(updates: Partial<EmailConfig>): void {
    this.config = { ...this.config, ...updates };

    this.eventEmitter.emit('email.config.updated', {
      provider: this.config.provider,
    });

    this.logger.log(`Email config updated: provider=${this.config.provider}`);
  }

  // Helper methods

  private normalizeRecipients(
    to: string | string[] | EmailAddress | EmailAddress[],
  ): EmailAddress[] {
    if (typeof to === 'string') {
      return [{ email: to }];
    }

    if (Array.isArray(to)) {
      return to.map((r) => (typeof r === 'string' ? { email: r } : r));
    }

    return [to];
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private checkRateLimit(): boolean {
    const key = 'global';
    const now = Date.now();
    const counter = this.rateLimitCounter.get(key);

    if (!counter || counter.resetAt < now) {
      this.rateLimitCounter.set(key, {
        count: 1,
        resetAt: now + this.config.rateLimitPeriod,
      });
      return true;
    }

    if (counter.count >= this.config.rateLimit) {
      return false;
    }

    counter.count++;
    this.rateLimitCounter.set(key, counter);
    return true;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
