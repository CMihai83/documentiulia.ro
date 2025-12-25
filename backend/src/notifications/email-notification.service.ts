import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed' | 'opened' | 'clicked';
export type EmailType = 'transactional' | 'marketing' | 'notification' | 'report' | 'system';
export type EmailPriority = 'low' | 'normal' | 'high' | 'urgent';

// Interfaces
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: string[];
  category: string;
  isSystem: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Email {
  id: string;
  tenantId: string;
  templateId?: string;
  type: EmailType;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: EmailAttachment[];
  variables?: Record<string, any>;
  priority: EmailPriority;
  status: EmailStatus;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  bounceReason?: string;
  messageId?: string;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
  size: number;
}

export interface EmailStats {
  totalSent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface EmailPreferences {
  userId: string;
  tenantId: string;
  marketing: boolean;
  notifications: boolean;
  reports: boolean;
  transactional: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  unsubscribedAt?: Date;
  updatedAt: Date;
}

export interface BatchEmailResult {
  batchId: string;
  total: number;
  sent: number;
  failed: number;
  emails: { email: string; status: EmailStatus; error?: string }[];
}

export interface BounceRecord {
  id: string;
  email: string;
  type: 'hard' | 'soft';
  reason: string;
  originalEmailId: string;
  recordedAt: Date;
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);

  // Storage maps
  private templates: Map<string, EmailTemplate> = new Map();
  private emails: Map<string, Email> = new Map();
  private preferences: Map<string, EmailPreferences> = new Map();
  private bounces: Map<string, BounceRecord[]> = new Map();
  private suppressionList: Set<string> = new Set();

  // Counters
  private templateIdCounter = 0;
  private emailIdCounter = 0;
  private bounceIdCounter = 0;

  constructor(private configService: ConfigService) {
    this.initializeSystemTemplates();
  }

  private generateId(prefix: string): string {
    let counter = 0;
    switch (prefix) {
      case 'etpl': counter = ++this.templateIdCounter; break;
      case 'email': counter = ++this.emailIdCounter; break;
      case 'bounce': counter = ++this.bounceIdCounter; break;
      default: counter = Date.now();
    }
    return `${prefix}-${counter}-${Date.now()}`;
  }

  // =================== SYSTEM TEMPLATES ===================

  private initializeSystemTemplates(): void {
    // Welcome Email
    const welcome: EmailTemplate = {
      id: 'etpl-welcome',
      name: 'Welcome Email',
      subject: 'Bine ați venit la {{companyName}}!',
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bine ați venit!</h1>
    </div>
    <div class="content">
      <p>Dragă {{userName}},</p>
      <p>Vă mulțumim că v-ați alăturat {{companyName}}!</p>
      <p>Contul dumneavoastră a fost creat cu succes. Puteți începe acum să utilizați platforma noastră.</p>
      <p style="text-align: center;">
        <a href="{{loginUrl}}" class="button">Accesează Contul</a>
      </p>
    </div>
    <div class="footer">
      <p>© {{year}} {{companyName}}. Toate drepturile rezervate.</p>
      <p><a href="{{unsubscribeUrl}}">Dezabonare</a></p>
    </div>
  </div>
</body>
</html>`,
      textBody: 'Bine ați venit, {{userName}}! Contul dumneavoastră la {{companyName}} a fost creat cu succes.',
      variables: ['userName', 'companyName', 'loginUrl', 'unsubscribeUrl', 'year'],
      category: 'onboarding',
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Invoice Email
    const invoice: EmailTemplate = {
      id: 'etpl-invoice',
      name: 'Invoice Notification',
      subject: 'Factură nouă: {{invoiceNumber}}',
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; }
    .invoice-details { background: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .total { font-size: 24px; font-weight: bold; color: #1e40af; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Factură {{invoiceNumber}}</h1>
    </div>
    <div class="content">
      <p>Dragă {{customerName}},</p>
      <p>Vă transmitem factura cu numărul {{invoiceNumber}}.</p>
      <div class="invoice-details">
        <p><strong>Data emiterii:</strong> {{issueDate}}</p>
        <p><strong>Data scadenței:</strong> {{dueDate}}</p>
        <p><strong>Total:</strong> <span class="total">{{total}} RON</span></p>
      </div>
      <p style="text-align: center;">
        <a href="{{invoiceUrl}}" class="button">Vizualizează Factura</a>
      </p>
    </div>
  </div>
</body>
</html>`,
      variables: ['customerName', 'invoiceNumber', 'issueDate', 'dueDate', 'total', 'invoiceUrl'],
      category: 'billing',
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Password Reset
    const passwordReset: EmailTemplate = {
      id: 'etpl-password-reset',
      name: 'Password Reset',
      subject: 'Resetare parolă - {{companyName}}',
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .warning { background: #fef3c7; padding: 15px; border-radius: 4px; border-left: 4px solid #f59e0b; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Resetare Parolă</h2>
    <p>Bună {{userName}},</p>
    <p>Am primit o cerere de resetare a parolei pentru contul dumneavoastră.</p>
    <p style="text-align: center;">
      <a href="{{resetUrl}}" class="button">Resetează Parola</a>
    </p>
    <div class="warning">
      <p><strong>Important:</strong> Acest link va expira în {{expiryHours}} ore.</p>
      <p>Dacă nu ați solicitat resetarea parolei, ignorați acest email.</p>
    </div>
  </div>
</body>
</html>`,
      variables: ['userName', 'companyName', 'resetUrl', 'expiryHours'],
      category: 'security',
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Report Ready
    const reportReady: EmailTemplate = {
      id: 'etpl-report-ready',
      name: 'Report Ready',
      subject: 'Raportul {{reportName}} este gata',
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Raportul este gata</h2>
    <p>Dragă {{userName}},</p>
    <p>Raportul <strong>{{reportName}}</strong> a fost generat cu succes și este disponibil pentru descărcare.</p>
    <p><strong>Format:</strong> {{format}}</p>
    <p><strong>Generat la:</strong> {{generatedAt}}</p>
    <p style="text-align: center;">
      <a href="{{downloadUrl}}" class="button">Descarcă Raportul</a>
    </p>
  </div>
</body>
</html>`,
      variables: ['userName', 'reportName', 'format', 'generatedAt', 'downloadUrl'],
      category: 'reports',
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Delivery Update
    const deliveryUpdate: EmailTemplate = {
      id: 'etpl-delivery-update',
      name: 'Delivery Update',
      subject: 'Actualizare livrare: {{trackingNumber}}',
      htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .status { background: #dcfce7; color: #166534; padding: 10px 20px; border-radius: 4px; display: inline-block; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Actualizare Livrare</h2>
    <p>Dragă {{customerName}},</p>
    <p>Coletul dumneavoastră cu numărul de urmărire <strong>{{trackingNumber}}</strong> a primit o actualizare:</p>
    <p><span class="status">{{status}}</span></p>
    <p><strong>Locație:</strong> {{location}}</p>
    <p><strong>Data estimată de livrare:</strong> {{estimatedDelivery}}</p>
    <p style="text-align: center;">
      <a href="{{trackingUrl}}" class="button">Urmărește Coletul</a>
    </p>
  </div>
</body>
</html>`,
      variables: ['customerName', 'trackingNumber', 'status', 'location', 'estimatedDelivery', 'trackingUrl'],
      category: 'delivery',
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(welcome.id, welcome);
    this.templates.set(invoice.id, invoice);
    this.templates.set(passwordReset.id, passwordReset);
    this.templates.set(reportReady.id, reportReady);
    this.templates.set(deliveryUpdate.id, deliveryUpdate);

    this.logger.log(`Initialized ${this.templates.size} email templates`);
  }

  // =================== TEMPLATES ===================

  async createTemplate(
    name: string,
    subject: string,
    htmlBody: string,
    variables: string[],
    category: string,
    createdBy: string,
    textBody?: string,
  ): Promise<EmailTemplate> {
    const template: EmailTemplate = {
      id: this.generateId('etpl'),
      name,
      subject,
      htmlBody,
      textBody,
      variables,
      category,
      isSystem: false,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    this.logger.log(`Created email template: ${name} (${template.id})`);
    return template;
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getTemplates(category?: string, includeSystem = true): Promise<EmailTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    if (!includeSystem) {
      templates = templates.filter(t => !t.isSystem);
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<EmailTemplate, 'id' | 'isSystem' | 'createdAt' | 'createdBy'>>,
  ): Promise<EmailTemplate | null> {
    const template = this.templates.get(templateId);
    if (!template || template.isSystem) return null;

    const updated: EmailTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);
    return updated;
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    const template = this.templates.get(templateId);
    if (!template || template.isSystem) return false;
    return this.templates.delete(templateId);
  }

  // =================== SENDING EMAILS ===================

  async sendEmail(
    tenantId: string,
    to: EmailAddress | EmailAddress[],
    subject: string,
    htmlBody: string,
    createdBy: string,
    options?: {
      from?: EmailAddress;
      cc?: EmailAddress[];
      bcc?: EmailAddress[];
      replyTo?: EmailAddress;
      textBody?: string;
      attachments?: EmailAttachment[];
      type?: EmailType;
      priority?: EmailPriority;
      scheduledAt?: Date;
      metadata?: Record<string, any>;
    },
  ): Promise<Email> {
    const recipients = Array.isArray(to) ? to : [to];

    // Check suppression list
    const validRecipients = recipients.filter(r => !this.suppressionList.has(r.email.toLowerCase()));

    if (validRecipients.length === 0) {
      throw new Error('All recipients are on the suppression list');
    }

    const email: Email = {
      id: this.generateId('email'),
      tenantId,
      type: options?.type || 'transactional',
      from: options?.from || { email: 'noreply@documentiulia.ro', name: 'DocumentIulia' },
      to: validRecipients,
      cc: options?.cc,
      bcc: options?.bcc,
      replyTo: options?.replyTo,
      subject,
      htmlBody,
      textBody: options?.textBody,
      attachments: options?.attachments,
      priority: options?.priority || 'normal',
      status: options?.scheduledAt ? 'pending' : 'pending',
      scheduledAt: options?.scheduledAt,
      metadata: options?.metadata,
      createdBy,
      createdAt: new Date(),
    };

    this.emails.set(email.id, email);

    // Simulate sending (in production would use email provider)
    if (!options?.scheduledAt) {
      this.processEmail(email.id);
    }

    return email;
  }

  async sendTemplatedEmail(
    tenantId: string,
    templateId: string,
    to: EmailAddress | EmailAddress[],
    variables: Record<string, any>,
    createdBy: string,
    options?: {
      from?: EmailAddress;
      cc?: EmailAddress[];
      bcc?: EmailAddress[];
      replyTo?: EmailAddress;
      attachments?: EmailAttachment[];
      type?: EmailType;
      priority?: EmailPriority;
      scheduledAt?: Date;
      metadata?: Record<string, any>;
    },
  ): Promise<Email> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const subject = this.interpolateVariables(template.subject, variables);
    const htmlBody = this.interpolateVariables(template.htmlBody, variables);
    const textBody = template.textBody ? this.interpolateVariables(template.textBody, variables) : undefined;

    const email = await this.sendEmail(tenantId, to, subject, htmlBody, createdBy, {
      ...options,
      textBody,
    });

    email.templateId = templateId;
    email.variables = variables;
    this.emails.set(email.id, email);

    return email;
  }

  private interpolateVariables(text: string, variables: Record<string, any>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return result;
  }

  private async processEmail(emailId: string): Promise<void> {
    const email = this.emails.get(emailId);
    if (!email) return;

    // Simulate sending delay
    email.status = 'sent';
    email.sentAt = new Date();
    email.messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate delivery (90% success rate)
    if (Math.random() > 0.1) {
      email.status = 'delivered';
      email.deliveredAt = new Date();
    } else {
      email.status = 'bounced';
      email.bouncedAt = new Date();
      email.bounceReason = 'Mailbox not found';

      // Record bounce
      const bounceRecord: BounceRecord = {
        id: this.generateId('bounce'),
        email: email.to[0].email,
        type: 'hard',
        reason: 'Mailbox not found',
        originalEmailId: emailId,
        recordedAt: new Date(),
      };

      const emailBounces = this.bounces.get(email.to[0].email) || [];
      emailBounces.push(bounceRecord);
      this.bounces.set(email.to[0].email, emailBounces);

      // Add to suppression list after multiple bounces
      if (emailBounces.length >= 3) {
        this.suppressionList.add(email.to[0].email.toLowerCase());
      }
    }

    this.emails.set(emailId, email);
    this.logger.log(`Processed email ${emailId}: ${email.status}`);
  }

  // =================== BATCH SENDING ===================

  async sendBatch(
    tenantId: string,
    templateId: string,
    recipients: { email: string; name?: string; variables: Record<string, any> }[],
    createdBy: string,
    options?: {
      from?: EmailAddress;
      type?: EmailType;
      priority?: EmailPriority;
    },
  ): Promise<BatchEmailResult> {
    const batchId = `batch-${Date.now()}`;
    const results: { email: string; status: EmailStatus; error?: string }[] = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const email = await this.sendTemplatedEmail(
          tenantId,
          templateId,
          { email: recipient.email, name: recipient.name },
          recipient.variables,
          createdBy,
          { from: options?.from, type: options?.type, priority: options?.priority },
        );

        results.push({ email: recipient.email, status: email.status });
        if (email.status === 'delivered' || email.status === 'sent') {
          sent++;
        } else {
          failed++;
        }
      } catch (error: any) {
        results.push({ email: recipient.email, status: 'failed', error: error.message });
        failed++;
      }
    }

    return {
      batchId,
      total: recipients.length,
      sent,
      failed,
      emails: results,
    };
  }

  // =================== EMAIL RETRIEVAL ===================

  async getEmail(emailId: string): Promise<Email | null> {
    return this.emails.get(emailId) || null;
  }

  async getEmails(
    tenantId: string,
    filters?: {
      status?: EmailStatus;
      type?: EmailType;
      to?: string;
      limit?: number;
    },
  ): Promise<Email[]> {
    let emails = Array.from(this.emails.values())
      .filter(e => e.tenantId === tenantId);

    if (filters?.status) {
      emails = emails.filter(e => e.status === filters.status);
    }
    if (filters?.type) {
      emails = emails.filter(e => e.type === filters.type);
    }
    if (filters?.to) {
      emails = emails.filter(e => e.to.some(r => r.email === filters.to));
    }

    emails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      emails = emails.slice(0, filters.limit);
    }

    return emails;
  }

  // =================== TRACKING ===================

  async trackOpen(emailId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.openedAt) return false;

    email.openedAt = new Date();
    email.status = 'opened';
    this.emails.set(emailId, email);
    return true;
  }

  async trackClick(emailId: string): Promise<boolean> {
    const email = this.emails.get(emailId);
    if (!email || email.clickedAt) return false;

    email.clickedAt = new Date();
    email.status = 'clicked';
    this.emails.set(emailId, email);
    return true;
  }

  // =================== BOUNCE MANAGEMENT ===================

  async getBounces(email: string): Promise<BounceRecord[]> {
    return this.bounces.get(email) || [];
  }

  async isOnSuppressionList(email: string): Promise<boolean> {
    return this.suppressionList.has(email.toLowerCase());
  }

  async addToSuppressionList(email: string): Promise<void> {
    this.suppressionList.add(email.toLowerCase());
  }

  async removeFromSuppressionList(email: string): Promise<boolean> {
    return this.suppressionList.delete(email.toLowerCase());
  }

  async getSuppressionList(): Promise<string[]> {
    return Array.from(this.suppressionList);
  }

  // =================== PREFERENCES ===================

  async setPreferences(
    userId: string,
    tenantId: string,
    preferences: Partial<Omit<EmailPreferences, 'userId' | 'tenantId' | 'updatedAt'>>,
  ): Promise<EmailPreferences> {
    const key = `${tenantId}:${userId}`;
    const existing = this.preferences.get(key);

    const updated: EmailPreferences = {
      userId,
      tenantId,
      marketing: preferences.marketing ?? existing?.marketing ?? true,
      notifications: preferences.notifications ?? existing?.notifications ?? true,
      reports: preferences.reports ?? existing?.reports ?? true,
      transactional: existing?.transactional ?? true, // Always true for transactional
      frequency: preferences.frequency ?? existing?.frequency ?? 'immediate',
      unsubscribedAt: preferences.unsubscribedAt ?? existing?.unsubscribedAt,
      updatedAt: new Date(),
    };

    this.preferences.set(key, updated);
    return updated;
  }

  async getPreferences(userId: string, tenantId: string): Promise<EmailPreferences | null> {
    return this.preferences.get(`${tenantId}:${userId}`) || null;
  }

  async unsubscribe(userId: string, tenantId: string, category?: 'marketing' | 'notifications' | 'reports'): Promise<EmailPreferences> {
    const prefs = await this.getPreferences(userId, tenantId) || {
      userId,
      tenantId,
      marketing: true,
      notifications: true,
      reports: true,
      transactional: true,
      frequency: 'immediate' as const,
      updatedAt: new Date(),
    };

    if (category) {
      prefs[category] = false;
    } else {
      prefs.marketing = false;
      prefs.notifications = false;
      prefs.reports = false;
    }

    prefs.unsubscribedAt = new Date();
    prefs.updatedAt = new Date();

    this.preferences.set(`${tenantId}:${userId}`, prefs);
    return prefs;
  }

  // =================== STATISTICS ===================

  async getStats(tenantId: string, dateRange?: { start: Date; end: Date }): Promise<EmailStats> {
    let emails = Array.from(this.emails.values())
      .filter(e => e.tenantId === tenantId);

    if (dateRange) {
      emails = emails.filter(
        e => e.createdAt >= dateRange.start && e.createdAt <= dateRange.end,
      );
    }

    const totalSent = emails.filter(e => e.sentAt).length;
    const delivered = emails.filter(e => e.status === 'delivered' || e.status === 'opened' || e.status === 'clicked').length;
    const bounced = emails.filter(e => e.status === 'bounced').length;
    const opened = emails.filter(e => e.openedAt).length;
    const clicked = emails.filter(e => e.clickedAt).length;

    return {
      totalSent,
      delivered,
      bounced,
      opened,
      clicked,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
    };
  }

  // =================== METADATA ===================

  getEmailTypes(): EmailType[] {
    return ['transactional', 'marketing', 'notification', 'report', 'system'];
  }

  getEmailPriorities(): EmailPriority[] {
    return ['low', 'normal', 'high', 'urgent'];
  }

  getEmailStatuses(): EmailStatus[] {
    return ['pending', 'sent', 'delivered', 'bounced', 'failed', 'opened', 'clicked'];
  }
}
