import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type EmailStatus = 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'spam' | 'unsubscribed';
export type EmailPriority = 'low' | 'normal' | 'high';
export type BounceType = 'hard' | 'soft' | 'complaint';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
  encoding?: 'base64' | 'utf-8';
  contentId?: string;
  inline?: boolean;
}

export interface EmailMessage {
  id: string;
  tenantId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  subject: string;
  textBody: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
  priority: EmailPriority;
  status: EmailStatus;
  provider?: string;
  externalId?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  bounceType?: BounceType;
  bounceReason?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  opens: number;
  clicks: number;
  clickedLinks?: string[];
  campaignId?: string;
  templateId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  variables: EmailVariable[];
  previewText?: string;
  isActive: boolean;
  version: number;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'url' | 'html';
  required: boolean;
  defaultValue?: any;
  description?: string;
  sampleValue?: any;
}

export interface EmailProvider {
  id: string;
  name: string;
  type: 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'postmark' | 'mailjet';
  isDefault: boolean;
  isActive: boolean;
  config: SMTPConfig | APIConfig;
  rateLimit: {
    perSecond: number;
    perMinute: number;
    perHour: number;
    perDay: number;
  };
  stats: {
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
  };
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  pool?: boolean;
  maxConnections?: number;
}

export interface APIConfig {
  apiKey: string;
  apiSecret?: string;
  domain?: string;
  region?: string;
}

export interface EmailDomain {
  id: string;
  tenantId: string;
  domain: string;
  isVerified: boolean;
  verificationMethod: 'dns' | 'file';
  dkimSelector?: string;
  dkimPublicKey?: string;
  spfRecord?: string;
  dmarcPolicy?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface EmailList {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  subscribers: EmailSubscriber[];
  tags?: string[];
  doubleOptIn: boolean;
  welcomeEmailId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSubscriber {
  id: string;
  email: string;
  name?: string;
  status: 'subscribed' | 'unsubscribed' | 'bounced' | 'cleaned';
  source?: string;
  subscribedAt: Date;
  unsubscribedAt?: Date;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UnsubscribeRecord {
  id: string;
  email: string;
  listId?: string;
  reason?: string;
  feedback?: string;
  unsubscribedAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class EmailService {
  private emails: Map<string, EmailMessage> = new Map();
  private templates: Map<string, EmailTemplate> = new Map();
  private providers: Map<string, EmailProvider> = new Map();
  private domains: Map<string, EmailDomain> = new Map();
  private lists: Map<string, EmailList> = new Map();
  private unsubscribes: Map<string, UnsubscribeRecord> = new Map();
  private emailQueue: EmailMessage[] = [];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultTemplates();
    this.initializeDefaultProvider();
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        tenantId: 'system',
        name: 'Welcome Email',
        description: 'Welcome new users to the platform',
        category: 'onboarding',
        fromName: '{{company_name}}',
        fromEmail: 'noreply@{{domain}}',
        subject: 'Welcome to {{company_name}}, {{first_name}}!',
        textBody: `Hi {{first_name}},

Welcome to {{company_name}}! We're thrilled to have you on board.

Here's what you can do next:
- Complete your profile: {{profile_url}}
- Explore our features: {{features_url}}
- Get help: {{help_url}}

If you have any questions, reply to this email or contact our support team.

Best regards,
The {{company_name}} Team`,
        htmlBody: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#4F46E5;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb}.btn{display:inline-block;background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin:10px 5px}</style></head>
<body>
<div class="container">
<div class="header"><h1>Welcome to {{company_name}}!</h1></div>
<div class="content">
<p>Hi {{first_name}},</p>
<p>We're thrilled to have you on board. Let's get you started!</p>
<p style="text-align:center">
<a href="{{profile_url}}" class="btn">Complete Profile</a>
<a href="{{features_url}}" class="btn">Explore Features</a>
</p>
<p>If you need any help, our team is here for you.</p>
<p>Best regards,<br>The {{company_name}} Team</p>
</div>
</div>
</body>
</html>`,
        variables: [
          { name: 'first_name', type: 'string', required: true, sampleValue: 'John' },
          { name: 'company_name', type: 'string', required: true, sampleValue: 'DocumentIulia' },
          { name: 'domain', type: 'string', required: true, sampleValue: 'documentiulia.ro' },
          { name: 'profile_url', type: 'url', required: true, sampleValue: 'https://app.documentiulia.ro/profile' },
          { name: 'features_url', type: 'url', required: true, sampleValue: 'https://app.documentiulia.ro/features' },
          { name: 'help_url', type: 'url', required: false, sampleValue: 'https://help.documentiulia.ro' },
        ],
        previewText: 'Welcome! Let\'s get you started with {{company_name}}',
        isActive: true,
        version: 1,
        stats: { sent: 0, opened: 0, clicked: 0, bounced: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Password Reset',
        description: 'Password reset request email',
        category: 'security',
        fromName: '{{company_name}} Security',
        fromEmail: 'security@{{domain}}',
        subject: 'Reset Your Password',
        textBody: `Hi {{first_name}},

We received a request to reset your password for your {{company_name}} account.

Click here to reset your password: {{reset_url}}

This link will expire in {{expiry_hours}} hours.

If you didn't request this, please ignore this email or contact support if you have concerns.

Best regards,
{{company_name}} Security Team`,
        htmlBody: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#DC2626;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb}.btn{display:inline-block;background:#DC2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px}.warning{background:#FEF3C7;border:1px solid #F59E0B;padding:15px;border-radius:6px;margin:20px 0}</style></head>
<body>
<div class="container">
<div class="header"><h1>Password Reset</h1></div>
<div class="content">
<p>Hi {{first_name}},</p>
<p>We received a request to reset your password.</p>
<p style="text-align:center"><a href="{{reset_url}}" class="btn">Reset Password</a></p>
<p>This link expires in <strong>{{expiry_hours}} hours</strong>.</p>
<div class="warning"><strong>Didn't request this?</strong> If you didn't make this request, you can safely ignore this email.</div>
<p>Best regards,<br>{{company_name}} Security Team</p>
</div>
</div>
</body>
</html>`,
        variables: [
          { name: 'first_name', type: 'string', required: true, sampleValue: 'John' },
          { name: 'company_name', type: 'string', required: true, sampleValue: 'DocumentIulia' },
          { name: 'domain', type: 'string', required: true, sampleValue: 'documentiulia.ro' },
          { name: 'reset_url', type: 'url', required: true },
          { name: 'expiry_hours', type: 'number', required: false, defaultValue: 24 },
        ],
        previewText: 'Reset your password - link expires in {{expiry_hours}} hours',
        isActive: true,
        version: 1,
        stats: { sent: 0, opened: 0, clicked: 0, bounced: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Invoice',
        description: 'Invoice notification email',
        category: 'billing',
        fromName: '{{company_name}} Billing',
        fromEmail: 'billing@{{domain}}',
        subject: 'Invoice #{{invoice_number}} - {{total}} {{currency}}',
        textBody: `Hi {{client_name}},

Please find attached your invoice #{{invoice_number}}.

Invoice Details:
- Invoice Number: {{invoice_number}}
- Issue Date: {{issue_date}}
- Due Date: {{due_date}}
- Amount: {{total}} {{currency}}
- Status: {{status}}

View online: {{invoice_url}}

Thank you for your business!

Best regards,
{{company_name}}`,
        htmlBody: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#059669;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb}.invoice-box{background:#F3F4F6;padding:20px;border-radius:8px;margin:20px 0}.btn{display:inline-block;background:#059669;color:white;padding:12px 24px;text-decoration:none;border-radius:6px}table{width:100%;border-collapse:collapse}td{padding:8px 0}</style></head>
<body>
<div class="container">
<div class="header"><h1>Invoice #{{invoice_number}}</h1></div>
<div class="content">
<p>Hi {{client_name}},</p>
<p>Your invoice is ready.</p>
<div class="invoice-box">
<table>
<tr><td><strong>Invoice Number:</strong></td><td>{{invoice_number}}</td></tr>
<tr><td><strong>Issue Date:</strong></td><td>{{issue_date}}</td></tr>
<tr><td><strong>Due Date:</strong></td><td>{{due_date}}</td></tr>
<tr><td><strong>Amount:</strong></td><td><strong>{{total}} {{currency}}</strong></td></tr>
<tr><td><strong>Status:</strong></td><td>{{status}}</td></tr>
</table>
</div>
<p style="text-align:center"><a href="{{invoice_url}}" class="btn">View Invoice</a></p>
<p>Thank you for your business!</p>
<p>Best regards,<br>{{company_name}}</p>
</div>
</div>
</body>
</html>`,
        variables: [
          { name: 'client_name', type: 'string', required: true },
          { name: 'company_name', type: 'string', required: true },
          { name: 'domain', type: 'string', required: true },
          { name: 'invoice_number', type: 'string', required: true },
          { name: 'issue_date', type: 'date', required: true },
          { name: 'due_date', type: 'date', required: true },
          { name: 'total', type: 'number', required: true },
          { name: 'currency', type: 'string', required: true, defaultValue: 'RON' },
          { name: 'status', type: 'string', required: true },
          { name: 'invoice_url', type: 'url', required: true },
        ],
        previewText: 'Invoice #{{invoice_number}} for {{total}} {{currency}}',
        isActive: true,
        version: 1,
        stats: { sent: 0, opened: 0, clicked: 0, bounced: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'Document Approval Required',
        description: 'Notification for pending document approval',
        category: 'workflow',
        fromName: '{{company_name}}',
        fromEmail: 'workflow@{{domain}}',
        subject: 'Action Required: Approve "{{document_name}}"',
        textBody: `Hi {{approver_name}},

{{requester_name}} has submitted "{{document_name}}" for your approval.

Document: {{document_name}}
Submitted by: {{requester_name}}
Submitted on: {{submitted_date}}
Deadline: {{deadline}}

Review and approve: {{approval_url}}

Please review this document at your earliest convenience.

Best regards,
{{company_name}}`,
        htmlBody: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#7C3AED;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb}.doc-box{background:#F3F4F6;padding:20px;border-radius:8px;margin:20px 0}.btn{display:inline-block;background:#7C3AED;color:white;padding:12px 24px;text-decoration:none;border-radius:6px}.btn-secondary{background:#6B7280}</style></head>
<body>
<div class="container">
<div class="header"><h1>Approval Required</h1></div>
<div class="content">
<p>Hi {{approver_name}},</p>
<p><strong>{{requester_name}}</strong> has submitted a document for your approval.</p>
<div class="doc-box">
<h3 style="margin-top:0">{{document_name}}</h3>
<p><strong>Submitted by:</strong> {{requester_name}}<br>
<strong>Submitted on:</strong> {{submitted_date}}<br>
<strong>Deadline:</strong> {{deadline}}</p>
</div>
<p style="text-align:center">
<a href="{{approval_url}}" class="btn">Review & Approve</a>
</p>
<p>Best regards,<br>{{company_name}}</p>
</div>
</div>
</body>
</html>`,
        variables: [
          { name: 'approver_name', type: 'string', required: true },
          { name: 'requester_name', type: 'string', required: true },
          { name: 'document_name', type: 'string', required: true },
          { name: 'submitted_date', type: 'date', required: true },
          { name: 'deadline', type: 'date', required: false },
          { name: 'approval_url', type: 'url', required: true },
          { name: 'company_name', type: 'string', required: true },
          { name: 'domain', type: 'string', required: true },
        ],
        previewText: '{{requester_name}} needs your approval for "{{document_name}}"',
        isActive: true,
        version: 1,
        stats: { sent: 0, opened: 0, clicked: 0, bounced: 0 },
        createdBy: 'system',
      },
      {
        tenantId: 'system',
        name: 'ANAF Declaration Reminder',
        description: 'Reminder for upcoming ANAF declaration deadline',
        category: 'compliance',
        fromName: '{{company_name}} Compliance',
        fromEmail: 'compliance@{{domain}}',
        subject: 'Reminder: {{declaration_type}} Due in {{days_remaining}} Days',
        textBody: `Hi {{user_name}},

This is a reminder that your {{declaration_type}} submission is due soon.

Declaration: {{declaration_type}}
Due Date: {{due_date}}
Days Remaining: {{days_remaining}}
Period: {{period}}

Submit your declaration: {{submission_url}}

Please ensure timely submission to avoid penalties.

Best regards,
{{company_name}} Compliance Team`,
        htmlBody: `<!DOCTYPE html>
<html>
<head><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:#DC2626;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb}.alert-box{background:#FEE2E2;border:1px solid #DC2626;padding:20px;border-radius:8px;margin:20px 0}.countdown{font-size:48px;font-weight:bold;color:#DC2626;text-align:center}.btn{display:inline-block;background:#DC2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px}</style></head>
<body>
<div class="container">
<div class="header"><h1>ANAF Declaration Reminder</h1></div>
<div class="content">
<p>Hi {{user_name}},</p>
<div class="alert-box">
<p class="countdown">{{days_remaining}}</p>
<p style="text-align:center;margin:0">days until deadline</p>
</div>
<p><strong>Declaration:</strong> {{declaration_type}}<br>
<strong>Period:</strong> {{period}}<br>
<strong>Due Date:</strong> {{due_date}}</p>
<p style="text-align:center"><a href="{{submission_url}}" class="btn">Submit Declaration</a></p>
<p><strong>Note:</strong> Late submissions may result in penalties from ANAF.</p>
<p>Best regards,<br>{{company_name}} Compliance Team</p>
</div>
</div>
</body>
</html>`,
        variables: [
          { name: 'user_name', type: 'string', required: true },
          { name: 'declaration_type', type: 'string', required: true },
          { name: 'due_date', type: 'date', required: true },
          { name: 'days_remaining', type: 'number', required: true },
          { name: 'period', type: 'string', required: true },
          { name: 'submission_url', type: 'url', required: true },
          { name: 'company_name', type: 'string', required: true },
          { name: 'domain', type: 'string', required: true },
        ],
        previewText: 'Your {{declaration_type}} is due in {{days_remaining}} days',
        isActive: true,
        version: 1,
        stats: { sent: 0, opened: 0, clicked: 0, bounced: 0 },
        createdBy: 'system',
      },
    ];

    for (const template of templates) {
      const id = `etpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.templates.set(id, {
        id,
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  private initializeDefaultProvider(): void {
    const provider: EmailProvider = {
      id: 'default-smtp',
      name: 'Default SMTP',
      type: 'smtp',
      isDefault: true,
      isActive: true,
      config: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: '', pass: '' },
        pool: true,
        maxConnections: 5,
      },
      rateLimit: {
        perSecond: 10,
        perMinute: 100,
        perHour: 1000,
        perDay: 10000,
      },
      stats: { sent: 0, delivered: 0, bounced: 0, failed: 0 },
    };

    this.providers.set(provider.id, provider);
  }

  // =================== EMAIL SENDING ===================

  async sendEmail(data: {
    tenantId: string;
    from?: EmailAddress;
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    replyTo?: EmailAddress;
    subject: string;
    textBody: string;
    htmlBody?: string;
    attachments?: EmailAttachment[];
    templateId?: string;
    templateData?: Record<string, any>;
    headers?: Record<string, string>;
    tags?: string[];
    priority?: EmailPriority;
    scheduledAt?: Date;
    campaignId?: string;
    createdBy: string;
  }): Promise<EmailMessage> {
    const id = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Process template if provided
    let subject = data.subject;
    let textBody = data.textBody;
    let htmlBody = data.htmlBody;

    if (data.templateId) {
      const processed = await this.processTemplate(data.templateId, data.templateData || {});
      subject = processed.subject;
      textBody = processed.textBody;
      htmlBody = processed.htmlBody;
    }

    const email: EmailMessage = {
      id,
      tenantId: data.tenantId,
      from: data.from || { email: 'noreply@documentiulia.ro', name: 'DocumentIulia' },
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      replyTo: data.replyTo,
      subject,
      textBody,
      htmlBody,
      attachments: data.attachments,
      headers: data.headers,
      tags: data.tags,
      priority: data.priority || 'normal',
      status: data.scheduledAt ? 'pending' : 'queued',
      scheduledAt: data.scheduledAt,
      retryCount: 0,
      maxRetries: 3,
      opens: 0,
      clicks: 0,
      campaignId: data.campaignId,
      templateId: data.templateId,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.emails.set(id, email);

    // Check unsubscribes
    const unsubscribed = data.to.filter((r) => this.isUnsubscribed(r.email));
    if (unsubscribed.length > 0) {
      email.to = email.to.filter((r) => !this.isUnsubscribed(r.email));
      if (email.to.length === 0) {
        email.status = 'failed';
        email.failureReason = 'All recipients unsubscribed';
        return email;
      }
    }

    // Queue for sending
    if (!data.scheduledAt) {
      this.emailQueue.push(email);
      await this.processEmailQueue();
    }

    this.eventEmitter.emit('email.created', { email });

    return email;
  }

  async sendBulkEmails(data: {
    tenantId: string;
    recipients: Array<EmailAddress & { data?: Record<string, any> }>;
    templateId: string;
    from?: EmailAddress;
    tags?: string[];
    campaignId?: string;
    createdBy: string;
  }): Promise<{ total: number; queued: number; skipped: number }> {
    let queued = 0;
    let skipped = 0;

    for (const recipient of data.recipients) {
      if (this.isUnsubscribed(recipient.email)) {
        skipped++;
        continue;
      }

      try {
        await this.sendEmail({
          tenantId: data.tenantId,
          from: data.from,
          to: [{ email: recipient.email, name: recipient.name }],
          subject: '',
          textBody: '',
          templateId: data.templateId,
          templateData: recipient.data,
          tags: data.tags,
          campaignId: data.campaignId,
          createdBy: data.createdBy,
        });
        queued++;
      } catch (error) {
        skipped++;
      }
    }

    return {
      total: data.recipients.length,
      queued,
      skipped,
    };
  }

  private async processEmailQueue(): Promise<void> {
    while (this.emailQueue.length > 0) {
      const email = this.emailQueue.shift();
      if (email) {
        await this.deliverEmail(email);
      }
    }
  }

  private async deliverEmail(email: EmailMessage): Promise<void> {
    email.status = 'sending';
    email.updatedAt = new Date();

    try {
      // Simulate SMTP delivery
      await new Promise((resolve) => setTimeout(resolve, 200));

      email.status = 'sent';
      email.sentAt = new Date();
      email.externalId = `ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Update template stats
      if (email.templateId) {
        const template = this.templates.get(email.templateId);
        if (template) {
          template.stats.sent++;
        }
      }

      // Simulate delivery confirmation
      setTimeout(() => {
        email.status = 'delivered';
        email.deliveredAt = new Date();
        email.updatedAt = new Date();
        this.eventEmitter.emit('email.delivered', { email });
      }, 500);

      this.eventEmitter.emit('email.sent', { email });
    } catch (error: any) {
      email.status = 'failed';
      email.failureReason = error.message;
      email.retryCount++;
      email.updatedAt = new Date();

      if (email.retryCount < email.maxRetries) {
        setTimeout(() => this.deliverEmail(email), 60000 * email.retryCount);
      }

      this.eventEmitter.emit('email.failed', { email, error });
    }
  }

  // =================== TEMPLATES ===================

  async processTemplate(
    templateId: string,
    data: Record<string, any>,
  ): Promise<{ subject: string; textBody: string; htmlBody?: string }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Apply defaults
    for (const variable of template.variables) {
      if (data[variable.name] === undefined && variable.defaultValue !== undefined) {
        data[variable.name] = variable.defaultValue;
      }
    }

    // Validate required
    for (const variable of template.variables) {
      if (variable.required && data[variable.name] === undefined) {
        throw new Error(`Missing required variable: ${variable.name}`);
      }
    }

    const replaceVariables = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? String(data[key]) : match;
      });
    };

    return {
      subject: replaceVariables(template.subject),
      textBody: replaceVariables(template.textBody),
      htmlBody: template.htmlBody ? replaceVariables(template.htmlBody) : undefined,
    };
  }

  async getTemplates(
    tenantId: string,
    filters?: {
      category?: string;
      search?: string;
      isActive?: boolean;
    },
  ): Promise<EmailTemplate[]> {
    let templates = Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId || t.tenantId === 'system',
    );

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

  async getTemplate(id: string): Promise<EmailTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createTemplate(data: {
    tenantId: string;
    name: string;
    description?: string;
    category: string;
    fromName: string;
    fromEmail: string;
    replyToEmail?: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    variables: EmailVariable[];
    previewText?: string;
    createdBy: string;
  }): Promise<EmailTemplate> {
    const id = `etpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: EmailTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
      replyToEmail: data.replyToEmail,
      subject: data.subject,
      textBody: data.textBody,
      htmlBody: data.htmlBody,
      variables: data.variables,
      previewText: data.previewText,
      isActive: true,
      version: 1,
      stats: { sent: 0, opened: 0, clicked: 0, bounced: 0 },
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(id, template);

    return template;
  }

  async updateTemplate(
    id: string,
    updates: Partial<Omit<EmailTemplate, 'id' | 'tenantId' | 'createdAt' | 'createdBy' | 'stats'>>,
  ): Promise<EmailTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    Object.assign(template, updates, {
      version: template.version + 1,
      updatedAt: new Date(),
    });

    return template;
  }

  async previewTemplate(
    templateId: string,
    data: Record<string, any>,
  ): Promise<{ subject: string; textBody: string; htmlBody?: string }> {
    return this.processTemplate(templateId, data);
  }

  // =================== TRACKING ===================

  async trackOpen(emailId: string): Promise<void> {
    const email = this.emails.get(emailId);
    if (email) {
      if (!email.openedAt) {
        email.status = 'opened';
        email.openedAt = new Date();
      }
      email.opens++;
      email.updatedAt = new Date();

      if (email.templateId) {
        const template = this.templates.get(email.templateId);
        if (template) template.stats.opened++;
      }

      this.eventEmitter.emit('email.opened', { email });
    }
  }

  async trackClick(emailId: string, link?: string): Promise<void> {
    const email = this.emails.get(emailId);
    if (email) {
      if (!email.clickedAt) {
        email.status = 'clicked';
        email.clickedAt = new Date();
      }
      email.clicks++;
      if (link) {
        email.clickedLinks = email.clickedLinks || [];
        email.clickedLinks.push(link);
      }
      email.updatedAt = new Date();

      if (email.templateId) {
        const template = this.templates.get(email.templateId);
        if (template) template.stats.clicked++;
      }

      this.eventEmitter.emit('email.clicked', { email, link });
    }
  }

  async recordBounce(emailId: string, type: BounceType, reason: string): Promise<void> {
    const email = this.emails.get(emailId);
    if (email) {
      email.status = 'bounced';
      email.bouncedAt = new Date();
      email.bounceType = type;
      email.bounceReason = reason;
      email.updatedAt = new Date();

      if (email.templateId) {
        const template = this.templates.get(email.templateId);
        if (template) template.stats.bounced++;
      }

      // Auto-unsubscribe hard bounces
      if (type === 'hard') {
        for (const recipient of email.to) {
          await this.unsubscribe(recipient.email, undefined, 'hard_bounce');
        }
      }

      this.eventEmitter.emit('email.bounced', { email, type, reason });
    }
  }

  // =================== UNSUBSCRIBE ===================

  async unsubscribe(email: string, listId?: string, reason?: string): Promise<void> {
    const id = `unsub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const record: UnsubscribeRecord = {
      id,
      email,
      listId,
      reason,
      unsubscribedAt: new Date(),
    };

    this.unsubscribes.set(email, record);

    this.eventEmitter.emit('email.unsubscribed', { record });
  }

  private isUnsubscribed(email: string): boolean {
    return this.unsubscribes.has(email);
  }

  async getUnsubscribes(tenantId: string): Promise<UnsubscribeRecord[]> {
    return Array.from(this.unsubscribes.values());
  }

  // =================== EMAIL RETRIEVAL ===================

  async getEmail(id: string): Promise<EmailMessage | null> {
    return this.emails.get(id) || null;
  }

  async getEmails(
    tenantId: string,
    filters?: {
      status?: EmailStatus;
      startDate?: Date;
      endDate?: Date;
      recipientEmail?: string;
      campaignId?: string;
      templateId?: string;
      limit?: number;
    },
  ): Promise<EmailMessage[]> {
    let emails = Array.from(this.emails.values()).filter((e) => e.tenantId === tenantId);

    if (filters?.status) {
      emails = emails.filter((e) => e.status === filters.status);
    }

    if (filters?.startDate) {
      emails = emails.filter((e) => e.createdAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      emails = emails.filter((e) => e.createdAt <= filters.endDate!);
    }

    if (filters?.recipientEmail) {
      emails = emails.filter((e) => e.to.some((r) => r.email === filters.recipientEmail));
    }

    if (filters?.campaignId) {
      emails = emails.filter((e) => e.campaignId === filters.campaignId);
    }

    if (filters?.templateId) {
      emails = emails.filter((e) => e.templateId === filters.templateId);
    }

    emails = emails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      emails = emails.slice(0, filters.limit);
    }

    return emails;
  }

  // =================== DOMAINS ===================

  async addDomain(data: {
    tenantId: string;
    domain: string;
    verificationMethod: 'dns' | 'file';
  }): Promise<EmailDomain> {
    const id = `dom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const emailDomain: EmailDomain = {
      id,
      tenantId: data.tenantId,
      domain: data.domain,
      isVerified: false,
      verificationMethod: data.verificationMethod,
      dkimSelector: `documentiulia-${Date.now()}`,
      createdAt: new Date(),
    };

    this.domains.set(id, emailDomain);

    return emailDomain;
  }

  async verifyDomain(domainId: string): Promise<EmailDomain | null> {
    const domain = this.domains.get(domainId);
    if (!domain) return null;

    // Simulate verification
    domain.isVerified = true;
    domain.verifiedAt = new Date();

    return domain;
  }

  async getDomains(tenantId: string): Promise<EmailDomain[]> {
    return Array.from(this.domains.values()).filter((d) => d.tenantId === tenantId);
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    byTemplate: Record<string, { sent: number; opened: number; clicked: number }>;
  }> {
    const emails = await this.getEmails(tenantId);

    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;
    let failed = 0;
    const byTemplate: Record<string, { sent: number; opened: number; clicked: number }> = {};

    for (const email of emails) {
      if (email.status === 'delivered' || email.status === 'opened' || email.status === 'clicked') {
        delivered++;
      }
      if (email.status === 'opened' || email.status === 'clicked') {
        opened++;
      }
      if (email.status === 'clicked') {
        clicked++;
      }
      if (email.status === 'bounced') {
        bounced++;
      }
      if (email.status === 'failed') {
        failed++;
      }

      if (email.templateId) {
        if (!byTemplate[email.templateId]) {
          byTemplate[email.templateId] = { sent: 0, opened: 0, clicked: 0 };
        }
        byTemplate[email.templateId].sent++;
        if (email.status === 'opened' || email.status === 'clicked') {
          byTemplate[email.templateId].opened++;
        }
        if (email.status === 'clicked') {
          byTemplate[email.templateId].clicked++;
        }
      }
    }

    return {
      totalSent: emails.length,
      delivered,
      opened,
      clicked,
      bounced,
      failed,
      deliveryRate: emails.length > 0 ? Math.round((delivered / emails.length) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      bounceRate: emails.length > 0 ? Math.round((bounced / emails.length) * 100) : 0,
      byTemplate,
    };
  }
}
