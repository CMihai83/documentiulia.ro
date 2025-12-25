import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type EmailCategory =
  | 'TRANSACTIONAL'
  | 'INVOICE'
  | 'PAYMENT'
  | 'REMINDER'
  | 'NOTIFICATION'
  | 'MARKETING'
  | 'SYSTEM'
  | 'WELCOME'
  | 'PASSWORD'
  | 'VERIFICATION'
  | 'REPORT'
  | 'COMPLIANCE'
  | 'HR';

export type EmailPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface EmailTemplate {
  id: string;
  code: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: EmailCategory;
  subject: string;
  subjectRo: string;
  bodyHtml: string;
  bodyHtmlRo: string;
  bodyText: string;
  bodyTextRo: string;
  variables: TemplateVariable[];
  isActive: boolean;
  isBuiltIn: boolean;
  version: number;
  organizationId?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVariable {
  name: string;
  description: string;
  descriptionRo: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'URL' | 'IMAGE';
  required: boolean;
  defaultValue?: any;
  format?: string;
}

export interface EmailMessage {
  id: string;
  templateId: string;
  templateCode: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  replyTo?: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  attachments?: EmailAttachment[];
  variables: Record<string, any>;
  locale: 'ro' | 'en';
  priority: EmailPriority;
  status: EmailStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  errorMessage?: string;
  organizationId: string;
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
}

export type EmailStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'FAILED'
  | 'CANCELLED';

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
  size: number;
}

export interface CreateTemplateDto {
  code: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  category: EmailCategory;
  subject: string;
  subjectRo: string;
  bodyHtml: string;
  bodyHtmlRo: string;
  bodyText: string;
  bodyTextRo: string;
  variables?: TemplateVariable[];
  organizationId: string;
  createdBy: string;
}

export interface SendEmailDto {
  templateCode: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  variables?: Record<string, any>;
  locale?: 'ro' | 'en';
  priority?: EmailPriority;
  attachments?: EmailAttachment[];
  organizationId: string;
}

export interface EmailStats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  pending: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  byCategory: Record<EmailCategory, number>;
  byStatus: Record<EmailStatus, number>;
}

export interface PreviewResult {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: Record<string, any>;
  errors: string[];
}

@Injectable()
export class EmailTemplateService {
  private templates: Map<string, EmailTemplate> = new Map();
  private messages: Map<string, EmailMessage> = new Map();
  private defaultFrom = 'noreply@documentiulia.ro';

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeBuiltInTemplates();
  }

  private generateId(prefix: string): string {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private initializeBuiltInTemplates(): void {
    const welcomeTemplate: EmailTemplate = {
      id: 'tpl-welcome',
      code: 'WELCOME',
      name: 'Welcome Email',
      nameRo: 'Email de Bun Venit',
      description: 'Welcome email for new users',
      descriptionRo: 'Email de bun venit pentru utilizatori noi',
      category: 'WELCOME',
      subject: 'Welcome to DocumentIulia - {{userName}}!',
      subjectRo: 'Bun venit pe DocumentIulia - {{userName}}!',
      bodyHtml: '<h1>Welcome, {{userName}}!</h1><p>Thank you for joining DocumentIulia. Start managing your business efficiently.</p><p><a href="{{dashboardUrl}}">Go to Dashboard</a></p>',
      bodyHtmlRo: '<h1>Bun venit, {{userName}}!</h1><p>Mulțumim că te-ai alăturat DocumentIulia. Începe să îți gestionezi afacerea eficient.</p><p><a href="{{dashboardUrl}}">Mergi la Tabloul de Bord</a></p>',
      bodyText: 'Welcome, {{userName}}! Thank you for joining DocumentIulia. Start managing your business efficiently. Go to Dashboard: {{dashboardUrl}}',
      bodyTextRo: 'Bun venit, {{userName}}! Mulțumim că te-ai alăturat DocumentIulia. Începe să îți gestionezi afacerea eficient. Mergi la Tabloul de Bord: {{dashboardUrl}}',
      variables: [
        { name: 'userName', description: 'User name', descriptionRo: 'Numele utilizatorului', type: 'STRING', required: true },
        { name: 'dashboardUrl', description: 'Dashboard URL', descriptionRo: 'URL tablou de bord', type: 'URL', required: true },
      ],
      isActive: true,
      isBuiltIn: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const invoiceTemplate: EmailTemplate = {
      id: 'tpl-invoice',
      code: 'INVOICE_SENT',
      name: 'Invoice Sent',
      nameRo: 'Factură Trimisă',
      description: 'Email sent when invoice is issued',
      descriptionRo: 'Email trimis când se emite o factură',
      category: 'INVOICE',
      subject: 'Invoice {{invoiceNumber}} - {{companyName}}',
      subjectRo: 'Factură {{invoiceNumber}} - {{companyName}}',
      bodyHtml: '<h1>Factură Nr. {{invoiceNumber}}</h1><p>Stimate {{customerName}},</p><p>Vă transmitem factura nr. {{invoiceNumber}} în valoare de {{totalAmount}} {{currency}}.</p><p>Data scadenței: {{dueDate}}</p><p><a href="{{invoiceUrl}}">Vizualizare Factură</a></p><p>Cu stimă,<br>{{companyName}}</p>',
      bodyHtmlRo: '<h1>Factură Nr. {{invoiceNumber}}</h1><p>Stimate {{customerName}},</p><p>Vă transmitem factura nr. {{invoiceNumber}} în valoare de {{totalAmount}} {{currency}}.</p><p>Data scadenței: {{dueDate}}</p><p><a href="{{invoiceUrl}}">Vizualizare Factură</a></p><p>Cu stimă,<br>{{companyName}}</p>',
      bodyText: 'Factură Nr. {{invoiceNumber}}\n\nStimate {{customerName}},\n\nVă transmitem factura nr. {{invoiceNumber}} în valoare de {{totalAmount}} {{currency}}.\nData scadenței: {{dueDate}}\n\nVizualizare Factură: {{invoiceUrl}}\n\nCu stimă,\n{{companyName}}',
      bodyTextRo: 'Factură Nr. {{invoiceNumber}}\n\nStimate {{customerName}},\n\nVă transmitem factura nr. {{invoiceNumber}} în valoare de {{totalAmount}} {{currency}}.\nData scadenței: {{dueDate}}\n\nVizualizare Factură: {{invoiceUrl}}\n\nCu stimă,\n{{companyName}}',
      variables: [
        { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
        { name: 'customerName', description: 'Customer name', descriptionRo: 'Nume client', type: 'STRING', required: true },
        { name: 'totalAmount', description: 'Total amount', descriptionRo: 'Suma totală', type: 'CURRENCY', required: true },
        { name: 'currency', description: 'Currency', descriptionRo: 'Moneda', type: 'STRING', required: true, defaultValue: 'RON' },
        { name: 'dueDate', description: 'Due date', descriptionRo: 'Data scadenței', type: 'DATE', required: true, format: 'DD.MM.YYYY' },
        { name: 'invoiceUrl', description: 'Invoice URL', descriptionRo: 'URL factură', type: 'URL', required: true },
        { name: 'companyName', description: 'Company name', descriptionRo: 'Nume companie', type: 'STRING', required: true },
      ],
      isActive: true,
      isBuiltIn: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const paymentReminderTemplate: EmailTemplate = {
      id: 'tpl-payment-reminder',
      code: 'PAYMENT_REMINDER',
      name: 'Payment Reminder',
      nameRo: 'Reamintire Plată',
      description: 'Reminder for overdue payments',
      descriptionRo: 'Reamintire pentru plăți restante',
      category: 'REMINDER',
      subject: 'Payment Reminder - Invoice {{invoiceNumber}}',
      subjectRo: 'Reamintire Plată - Factură {{invoiceNumber}}',
      bodyHtml: '<h1>Reamintire Plată</h1><p>Stimate {{customerName}},</p><p>Vă reamintim că factura nr. {{invoiceNumber}} în valoare de {{totalAmount}} {{currency}} a depășit data scadenței ({{dueDate}}).</p><p>Suma restantă: {{overdueAmount}} {{currency}}</p><p>Zile de întârziere: {{overdueDays}}</p><p>Vă rugăm să efectuați plata în cel mai scurt timp posibil.</p><p><a href="{{paymentUrl}}">Plătește Acum</a></p>',
      bodyHtmlRo: '<h1>Reamintire Plată</h1><p>Stimate {{customerName}},</p><p>Vă reamintim că factura nr. {{invoiceNumber}} în valoare de {{totalAmount}} {{currency}} a depășit data scadenței ({{dueDate}}).</p><p>Suma restantă: {{overdueAmount}} {{currency}}</p><p>Zile de întârziere: {{overdueDays}}</p><p>Vă rugăm să efectuați plata în cel mai scurt timp posibil.</p><p><a href="{{paymentUrl}}">Plătește Acum</a></p>',
      bodyText: 'Reamintire Plată\n\nStimate {{customerName}},\n\nVă reamintim că factura nr. {{invoiceNumber}} în valoare de {{totalAmount}} {{currency}} a depășit data scadenței ({{dueDate}}).\n\nSuma restantă: {{overdueAmount}} {{currency}}\nZile de întârziere: {{overdueDays}}\n\nVă rugăm să efectuați plata în cel mai scurt timp posibil.\n\nPlătește Acum: {{paymentUrl}}',
      bodyTextRo: 'Reamintire Plată\n\nStimate {{customerName}},\n\nVă reamintim că factura nr. {{invoiceNumber}} în valoare de {{totalAmount}} {{currency}} a depășit data scadenței ({{dueDate}}).\n\nSuma restantă: {{overdueAmount}} {{currency}}\nZile de întârziere: {{overdueDays}}\n\nVă rugăm să efectuați plata în cel mai scurt timp posibil.\n\nPlătește Acum: {{paymentUrl}}',
      variables: [
        { name: 'customerName', description: 'Customer name', descriptionRo: 'Nume client', type: 'STRING', required: true },
        { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
        { name: 'totalAmount', description: 'Total amount', descriptionRo: 'Suma totală', type: 'CURRENCY', required: true },
        { name: 'overdueAmount', description: 'Overdue amount', descriptionRo: 'Suma restantă', type: 'CURRENCY', required: true },
        { name: 'overdueDays', description: 'Overdue days', descriptionRo: 'Zile întârziere', type: 'NUMBER', required: true },
        { name: 'currency', description: 'Currency', descriptionRo: 'Moneda', type: 'STRING', required: true, defaultValue: 'RON' },
        { name: 'dueDate', description: 'Due date', descriptionRo: 'Data scadenței', type: 'DATE', required: true, format: 'DD.MM.YYYY' },
        { name: 'paymentUrl', description: 'Payment URL', descriptionRo: 'URL plată', type: 'URL', required: true },
      ],
      isActive: true,
      isBuiltIn: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const paymentConfirmationTemplate: EmailTemplate = {
      id: 'tpl-payment-confirmed',
      code: 'PAYMENT_CONFIRMED',
      name: 'Payment Confirmation',
      nameRo: 'Confirmare Plată',
      description: 'Confirmation email for received payment',
      descriptionRo: 'Email de confirmare pentru plata primită',
      category: 'PAYMENT',
      subject: 'Payment Confirmed - {{invoiceNumber}}',
      subjectRo: 'Plată Confirmată - {{invoiceNumber}}',
      bodyHtml: '<h1>Plată Confirmată</h1><p>Stimate {{customerName}},</p><p>Vă confirmăm că am primit plata pentru factura nr. {{invoiceNumber}}.</p><p>Suma: {{amount}} {{currency}}</p><p>Data plății: {{paymentDate}}</p><p>Metoda: {{paymentMethod}}</p><p>Vă mulțumim!</p>',
      bodyHtmlRo: '<h1>Plată Confirmată</h1><p>Stimate {{customerName}},</p><p>Vă confirmăm că am primit plata pentru factura nr. {{invoiceNumber}}.</p><p>Suma: {{amount}} {{currency}}</p><p>Data plății: {{paymentDate}}</p><p>Metoda: {{paymentMethod}}</p><p>Vă mulțumim!</p>',
      bodyText: 'Plată Confirmată\n\nStimate {{customerName}},\n\nVă confirmăm că am primit plata pentru factura nr. {{invoiceNumber}}.\n\nSuma: {{amount}} {{currency}}\nData plății: {{paymentDate}}\nMetoda: {{paymentMethod}}\n\nVă mulțumim!',
      bodyTextRo: 'Plată Confirmată\n\nStimate {{customerName}},\n\nVă confirmăm că am primit plata pentru factura nr. {{invoiceNumber}}.\n\nSuma: {{amount}} {{currency}}\nData plății: {{paymentDate}}\nMetoda: {{paymentMethod}}\n\nVă mulțumim!',
      variables: [
        { name: 'customerName', description: 'Customer name', descriptionRo: 'Nume client', type: 'STRING', required: true },
        { name: 'invoiceNumber', description: 'Invoice number', descriptionRo: 'Număr factură', type: 'STRING', required: true },
        { name: 'amount', description: 'Payment amount', descriptionRo: 'Suma plătită', type: 'CURRENCY', required: true },
        { name: 'currency', description: 'Currency', descriptionRo: 'Moneda', type: 'STRING', required: true, defaultValue: 'RON' },
        { name: 'paymentDate', description: 'Payment date', descriptionRo: 'Data plății', type: 'DATE', required: true, format: 'DD.MM.YYYY' },
        { name: 'paymentMethod', description: 'Payment method', descriptionRo: 'Metoda de plată', type: 'STRING', required: true },
      ],
      isActive: true,
      isBuiltIn: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const passwordResetTemplate: EmailTemplate = {
      id: 'tpl-password-reset',
      code: 'PASSWORD_RESET',
      name: 'Password Reset',
      nameRo: 'Resetare Parolă',
      description: 'Password reset request email',
      descriptionRo: 'Email pentru cerere de resetare parolă',
      category: 'PASSWORD',
      subject: 'Reset Your Password - DocumentIulia',
      subjectRo: 'Resetează-ți Parola - DocumentIulia',
      bodyHtml: '<h1>Resetare Parolă</h1><p>Ați solicitat resetarea parolei pentru contul dvs.</p><p>Faceți clic pe linkul de mai jos pentru a vă reseta parola:</p><p><a href="{{resetUrl}}">Resetează Parola</a></p><p>Acest link este valabil pentru {{expiresIn}} minute.</p><p>Dacă nu ați solicitat această resetare, vă rugăm să ignorați acest email.</p>',
      bodyHtmlRo: '<h1>Resetare Parolă</h1><p>Ați solicitat resetarea parolei pentru contul dvs.</p><p>Faceți clic pe linkul de mai jos pentru a vă reseta parola:</p><p><a href="{{resetUrl}}">Resetează Parola</a></p><p>Acest link este valabil pentru {{expiresIn}} minute.</p><p>Dacă nu ați solicitat această resetare, vă rugăm să ignorați acest email.</p>',
      bodyText: 'Resetare Parolă\n\nAți solicitat resetarea parolei pentru contul dvs.\n\nFaceți clic pe linkul de mai jos pentru a vă reseta parola:\n{{resetUrl}}\n\nAcest link este valabil pentru {{expiresIn}} minute.\n\nDacă nu ați solicitat această resetare, vă rugăm să ignorați acest email.',
      bodyTextRo: 'Resetare Parolă\n\nAți solicitat resetarea parolei pentru contul dvs.\n\nFaceți clic pe linkul de mai jos pentru a vă reseta parola:\n{{resetUrl}}\n\nAcest link este valabil pentru {{expiresIn}} minute.\n\nDacă nu ați solicitat această resetare, vă rugăm să ignorați acest email.',
      variables: [
        { name: 'resetUrl', description: 'Password reset URL', descriptionRo: 'URL resetare parolă', type: 'URL', required: true },
        { name: 'expiresIn', description: 'Link expiration time in minutes', descriptionRo: 'Timp expirare link în minute', type: 'NUMBER', required: true, defaultValue: 60 },
      ],
      isActive: true,
      isBuiltIn: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const anafNotificationTemplate: EmailTemplate = {
      id: 'tpl-anaf-notification',
      code: 'ANAF_SUBMISSION',
      name: 'ANAF Submission Notification',
      nameRo: 'Notificare Depunere ANAF',
      description: 'Notification for ANAF document submission',
      descriptionRo: 'Notificare pentru depunere documente ANAF',
      category: 'COMPLIANCE',
      subject: 'ANAF Submission - {{documentType}} - {{status}}',
      subjectRo: 'Depunere ANAF - {{documentType}} - {{status}}',
      bodyHtml: '<h1>Notificare Depunere ANAF</h1><p>Tipul documentului: {{documentType}}</p><p>Număr index: {{indexNumber}}</p><p>Status: {{status}}</p><p>Data depunerii: {{submissionDate}}</p><p>{{#if errorMessage}}<strong>Eroare:</strong> {{errorMessage}}{{/if}}</p><p><a href="{{detailsUrl}}">Vezi Detalii</a></p>',
      bodyHtmlRo: '<h1>Notificare Depunere ANAF</h1><p>Tipul documentului: {{documentType}}</p><p>Număr index: {{indexNumber}}</p><p>Status: {{status}}</p><p>Data depunerii: {{submissionDate}}</p><p>{{#if errorMessage}}<strong>Eroare:</strong> {{errorMessage}}{{/if}}</p><p><a href="{{detailsUrl}}">Vezi Detalii</a></p>',
      bodyText: 'Notificare Depunere ANAF\n\nTipul documentului: {{documentType}}\nNumăr index: {{indexNumber}}\nStatus: {{status}}\nData depunerii: {{submissionDate}}\n{{#if errorMessage}}Eroare: {{errorMessage}}{{/if}}\n\nVezi Detalii: {{detailsUrl}}',
      bodyTextRo: 'Notificare Depunere ANAF\n\nTipul documentului: {{documentType}}\nNumăr index: {{indexNumber}}\nStatus: {{status}}\nData depunerii: {{submissionDate}}\n{{#if errorMessage}}Eroare: {{errorMessage}}{{/if}}\n\nVezi Detalii: {{detailsUrl}}',
      variables: [
        { name: 'documentType', description: 'Document type (e-Factura, SAF-T)', descriptionRo: 'Tip document (e-Factura, SAF-T)', type: 'STRING', required: true },
        { name: 'indexNumber', description: 'ANAF index number', descriptionRo: 'Număr index ANAF', type: 'STRING', required: true },
        { name: 'status', description: 'Submission status', descriptionRo: 'Status depunere', type: 'STRING', required: true },
        { name: 'submissionDate', description: 'Submission date', descriptionRo: 'Data depunerii', type: 'DATE', required: true, format: 'DD.MM.YYYY HH:mm' },
        { name: 'errorMessage', description: 'Error message if failed', descriptionRo: 'Mesaj eroare dacă a eșuat', type: 'STRING', required: false },
        { name: 'detailsUrl', description: 'Details URL', descriptionRo: 'URL detalii', type: 'URL', required: true },
      ],
      isActive: true,
      isBuiltIn: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(welcomeTemplate.id, welcomeTemplate);
    this.templates.set(invoiceTemplate.id, invoiceTemplate);
    this.templates.set(paymentReminderTemplate.id, paymentReminderTemplate);
    this.templates.set(paymentConfirmationTemplate.id, paymentConfirmationTemplate);
    this.templates.set(passwordResetTemplate.id, passwordResetTemplate);
    this.templates.set(anafNotificationTemplate.id, anafNotificationTemplate);
  }

  async createTemplate(dto: CreateTemplateDto): Promise<EmailTemplate> {
    const existingByCode = Array.from(this.templates.values())
      .find(t => t.code === dto.code && (!t.organizationId || t.organizationId === dto.organizationId));

    if (existingByCode) {
      throw new Error('Template with this code already exists');
    }

    const template: EmailTemplate = {
      id: this.generateId('tpl'),
      code: dto.code,
      name: dto.name,
      nameRo: dto.nameRo,
      description: dto.description,
      descriptionRo: dto.descriptionRo,
      category: dto.category,
      subject: dto.subject,
      subjectRo: dto.subjectRo,
      bodyHtml: dto.bodyHtml,
      bodyHtmlRo: dto.bodyHtmlRo,
      bodyText: dto.bodyText,
      bodyTextRo: dto.bodyTextRo,
      variables: dto.variables || [],
      isActive: true,
      isBuiltIn: false,
      version: 1,
      organizationId: dto.organizationId,
      createdBy: dto.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    this.eventEmitter.emit('email.template.created', { template });
    return template;
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async getTemplateByCode(code: string, organizationId?: string): Promise<EmailTemplate | null> {
    const templates = Array.from(this.templates.values())
      .filter(t => t.code === code);

    // Prefer organization-specific template
    if (organizationId) {
      const orgTemplate = templates.find(t => t.organizationId === organizationId);
      if (orgTemplate) return orgTemplate;
    }

    // Fall back to built-in template
    return templates.find(t => t.isBuiltIn) || templates[0] || null;
  }

  async listTemplates(options?: {
    organizationId?: string;
    category?: EmailCategory;
    isActive?: boolean;
  }): Promise<EmailTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (options?.organizationId) {
      templates = templates.filter(t => t.isBuiltIn || t.organizationId === options.organizationId);
    }

    if (options?.category) {
      templates = templates.filter(t => t.category === options.category);
    }

    if (options?.isActive !== undefined) {
      templates = templates.filter(t => t.isActive === options.isActive);
    }

    return templates.sort((a, b) => {
      if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isBuiltIn) {
      throw new Error('Built-in templates cannot be modified');
    }

    const updated: EmailTemplate = {
      ...template,
      ...updates,
      version: template.version + 1,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updated);
    this.eventEmitter.emit('email.template.updated', { template: updated });
    return updated;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.isBuiltIn) {
      throw new Error('Built-in templates cannot be deleted');
    }

    this.templates.delete(templateId);
    this.eventEmitter.emit('email.template.deleted', { templateId });
  }

  async activateTemplate(templateId: string): Promise<EmailTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    template.isActive = true;
    template.updatedAt = new Date();
    return template;
  }

  async deactivateTemplate(templateId: string): Promise<EmailTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    template.isActive = false;
    template.updatedAt = new Date();
    return template;
  }

  async cloneTemplate(templateId: string, newCode: string, organizationId: string, createdBy: string): Promise<EmailTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const cloned: EmailTemplate = {
      ...JSON.parse(JSON.stringify(template)),
      id: this.generateId('tpl'),
      code: newCode,
      isBuiltIn: false,
      version: 1,
      organizationId,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(cloned.id, cloned);
    this.eventEmitter.emit('email.template.cloned', { originalId: templateId, newId: cloned.id });
    return cloned;
  }

  async sendEmail(dto: SendEmailDto): Promise<EmailMessage> {
    const template = await this.getTemplateByCode(dto.templateCode, dto.organizationId);
    if (!template) {
      throw new Error('Template not found: ' + dto.templateCode);
    }

    if (!template.isActive) {
      throw new Error('Template is not active');
    }

    const locale = dto.locale || 'ro';
    const variables = { ...dto.variables };

    // Apply default values
    for (const v of template.variables) {
      if (v.defaultValue !== undefined && variables[v.name] === undefined) {
        variables[v.name] = v.defaultValue;
      }
    }

    // Validate required variables
    const missingVars = template.variables
      .filter(v => v.required && variables[v.name] === undefined)
      .map(v => v.name);

    if (missingVars.length > 0) {
      throw new Error('Missing required variables: ' + missingVars.join(', '));
    }

    const subject = this.renderTemplate(locale === 'ro' ? template.subjectRo : template.subject, variables);
    const bodyHtml = this.renderTemplate(locale === 'ro' ? template.bodyHtmlRo : template.bodyHtml, variables);
    const bodyText = this.renderTemplate(locale === 'ro' ? template.bodyTextRo : template.bodyText, variables);

    const message: EmailMessage = {
      id: this.generateId('msg'),
      templateId: template.id,
      templateCode: template.code,
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      from: this.defaultFrom,
      subject,
      bodyHtml,
      bodyText,
      attachments: dto.attachments,
      variables,
      locale,
      priority: dto.priority || 'NORMAL',
      status: 'PENDING',
      organizationId: dto.organizationId,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.messages.set(message.id, message);
    this.eventEmitter.emit('email.queued', { message });

    // Simulate sending
    await this.processEmail(message.id);

    return this.messages.get(message.id)!;
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp('\\{\\{' + key + '\\}\\}', 'g');
      result = result.replace(regex, this.formatValue(value));
    }

    // Handle conditionals (simple implementation)
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, varName, content) => {
      return variables[varName] ? content : '';
    });

    return result;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) {
      return value.getDate().toString().padStart(2, '0') + '.' +
             (value.getMonth() + 1).toString().padStart(2, '0') + '.' +
             value.getFullYear();
    }
    if (typeof value === 'number') {
      return value.toLocaleString('ro-RO');
    }
    return String(value);
  }

  private async processEmail(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) return;

    message.status = 'SENDING';
    this.eventEmitter.emit('email.sending', { messageId });

    // Simulate sending (in production would use nodemailer/SES/etc.)
    await new Promise(resolve => setTimeout(resolve, 10));

    message.status = 'SENT';
    message.sentAt = new Date();
    this.eventEmitter.emit('email.sent', { messageId });
  }

  async previewEmail(dto: SendEmailDto): Promise<PreviewResult> {
    const template = await this.getTemplateByCode(dto.templateCode, dto.organizationId);
    if (!template) {
      throw new Error('Template not found: ' + dto.templateCode);
    }

    const locale = dto.locale || 'ro';
    const variables = { ...dto.variables };
    const errors: string[] = [];

    // Apply default values
    for (const v of template.variables) {
      if (v.defaultValue !== undefined && variables[v.name] === undefined) {
        variables[v.name] = v.defaultValue;
      }
    }

    // Check for missing required variables
    for (const v of template.variables) {
      if (v.required && variables[v.name] === undefined) {
        errors.push('Missing required variable: ' + v.name);
        variables[v.name] = '{{' + v.name + '}}'; // Keep placeholder
      }
    }

    const subject = this.renderTemplate(locale === 'ro' ? template.subjectRo : template.subject, variables);
    const bodyHtml = this.renderTemplate(locale === 'ro' ? template.bodyHtmlRo : template.bodyHtml, variables);
    const bodyText = this.renderTemplate(locale === 'ro' ? template.bodyTextRo : template.bodyText, variables);

    return {
      subject,
      bodyHtml,
      bodyText,
      variables,
      errors,
    };
  }

  async getMessage(messageId: string): Promise<EmailMessage | null> {
    return this.messages.get(messageId) || null;
  }

  async listMessages(organizationId: string, options?: {
    templateCode?: string;
    status?: EmailStatus;
    to?: string;
    from?: Date;
    to_date?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ messages: EmailMessage[]; total: number }> {
    let messages = Array.from(this.messages.values())
      .filter(m => m.organizationId === organizationId);

    if (options?.templateCode) {
      messages = messages.filter(m => m.templateCode === options.templateCode);
    }

    if (options?.status) {
      messages = messages.filter(m => m.status === options.status);
    }

    if (options?.to) {
      messages = messages.filter(m => m.to.includes(options.to!));
    }

    if (options?.from) {
      messages = messages.filter(m => m.createdAt >= options.from!);
    }

    if (options?.to_date) {
      messages = messages.filter(m => m.createdAt <= options.to_date!);
    }

    messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = messages.length;
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const start = (page - 1) * limit;

    return {
      messages: messages.slice(start, start + limit),
      total,
    };
  }

  async retryMessage(messageId: string): Promise<EmailMessage> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.status !== 'FAILED') {
      throw new Error('Only failed messages can be retried');
    }

    if (message.retryCount >= message.maxRetries) {
      throw new Error('Maximum retry count reached');
    }

    message.retryCount++;
    message.status = 'PENDING';
    message.errorMessage = undefined;

    await this.processEmail(messageId);

    return this.messages.get(messageId)!;
  }

  async cancelMessage(messageId: string): Promise<EmailMessage> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (!['PENDING', 'QUEUED'].includes(message.status)) {
      throw new Error('Message cannot be cancelled');
    }

    message.status = 'CANCELLED';
    this.eventEmitter.emit('email.cancelled', { messageId });
    return message;
  }

  async markAsOpened(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) return;

    if (message.status === 'SENT' || message.status === 'DELIVERED') {
      message.status = 'OPENED';
      message.openedAt = new Date();
      this.eventEmitter.emit('email.opened', { messageId });
    }
  }

  async markAsClicked(messageId: string, url?: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) return;

    if (['SENT', 'DELIVERED', 'OPENED'].includes(message.status)) {
      message.status = 'CLICKED';
      message.clickedAt = new Date();
      this.eventEmitter.emit('email.clicked', { messageId, url });
    }
  }

  async getEmailStats(organizationId: string): Promise<EmailStats> {
    const messages = Array.from(this.messages.values())
      .filter(m => m.organizationId === organizationId);

    const byCategory: Record<EmailCategory, number> = {} as any;
    const byStatus: Record<EmailStatus, number> = {} as any;

    for (const cat of ['TRANSACTIONAL', 'INVOICE', 'PAYMENT', 'REMINDER', 'NOTIFICATION', 'MARKETING', 'SYSTEM', 'WELCOME', 'PASSWORD', 'VERIFICATION', 'REPORT', 'COMPLIANCE', 'HR'] as EmailCategory[]) {
      byCategory[cat] = 0;
    }

    for (const status of ['PENDING', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED', 'CANCELLED'] as EmailStatus[]) {
      byStatus[status] = messages.filter(m => m.status === status).length;
    }

    // Count by category from templates
    for (const msg of messages) {
      const template = this.templates.get(msg.templateId);
      if (template) {
        byCategory[template.category] = (byCategory[template.category] || 0) + 1;
      }
    }

    const sent = messages.filter(m => ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'].includes(m.status)).length;
    const opened = messages.filter(m => ['OPENED', 'CLICKED'].includes(m.status)).length;
    const clicked = messages.filter(m => m.status === 'CLICKED').length;
    const bounced = messages.filter(m => m.status === 'BOUNCED').length;

    return {
      totalSent: sent,
      delivered: messages.filter(m => m.status === 'DELIVERED').length,
      opened,
      clicked,
      bounced,
      failed: messages.filter(m => m.status === 'FAILED').length,
      pending: messages.filter(m => ['PENDING', 'QUEUED', 'SENDING'].includes(m.status)).length,
      openRate: sent > 0 ? (opened / sent) * 100 : 0,
      clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      byCategory,
      byStatus,
    };
  }

  async validateTemplate(template: Partial<EmailTemplate>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!template.code) errors.push('Template code is required');
    if (!template.subject) errors.push('Subject is required');
    if (!template.subjectRo) errors.push('Romanian subject is required');
    if (!template.bodyHtml) errors.push('HTML body is required');
    if (!template.bodyHtmlRo) errors.push('Romanian HTML body is required');

    // Check for unbalanced template tags
    const subjectVars = (template.subject || '').match(/\{\{(\w+)\}\}/g) || [];
    const subjectRoVars = (template.subjectRo || '').match(/\{\{(\w+)\}\}/g) || [];
    const bodyVars = (template.bodyHtml || '').match(/\{\{(\w+)\}\}/g) || [];
    const bodyRoVars = (template.bodyHtmlRo || '').match(/\{\{(\w+)\}\}/g) || [];

    const allVars = new Set([...subjectVars, ...subjectRoVars, ...bodyVars, ...bodyRoVars]
      .map(v => v.replace(/[{}]/g, '')));

    if (template.variables) {
      const declaredVars = new Set(template.variables.map(v => v.name));
      for (const usedVar of allVars) {
        if (!declaredVars.has(usedVar) && !usedVar.startsWith('#') && !usedVar.startsWith('/')) {
          errors.push('Variable used but not declared: ' + usedVar);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async getCategories(): Promise<{ category: EmailCategory; name: string; nameRo: string }[]> {
    return [
      { category: 'TRANSACTIONAL', name: 'Transactional', nameRo: 'Tranzacțional' },
      { category: 'INVOICE', name: 'Invoice', nameRo: 'Factură' },
      { category: 'PAYMENT', name: 'Payment', nameRo: 'Plată' },
      { category: 'REMINDER', name: 'Reminder', nameRo: 'Reamintire' },
      { category: 'NOTIFICATION', name: 'Notification', nameRo: 'Notificare' },
      { category: 'MARKETING', name: 'Marketing', nameRo: 'Marketing' },
      { category: 'SYSTEM', name: 'System', nameRo: 'Sistem' },
      { category: 'WELCOME', name: 'Welcome', nameRo: 'Bun Venit' },
      { category: 'PASSWORD', name: 'Password', nameRo: 'Parolă' },
      { category: 'VERIFICATION', name: 'Verification', nameRo: 'Verificare' },
      { category: 'REPORT', name: 'Report', nameRo: 'Raport' },
      { category: 'COMPLIANCE', name: 'Compliance', nameRo: 'Conformitate' },
      { category: 'HR', name: 'HR', nameRo: 'Resurse Umane' },
    ];
  }
}
