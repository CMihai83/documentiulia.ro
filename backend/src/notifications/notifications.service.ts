import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';
import { NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from './dto/notification-preferences.dto';

export enum NotificationType {
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_SENT = 'INVOICE_SENT',
  INVOICE_PAID = 'INVOICE_PAID',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  EFACTURA_SUBMITTED = 'EFACTURA_SUBMITTED',
  EFACTURA_ACCEPTED = 'EFACTURA_ACCEPTED',
  EFACTURA_REJECTED = 'EFACTURA_REJECTED',
  COMPLIANCE_ALERT = 'COMPLIANCE_ALERT',
  GDPR_DATA_EXPORT = 'GDPR_DATA_EXPORT',
  GDPR_DATA_DELETED = 'GDPR_DATA_DELETED',
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface NotificationPayload {
  type: NotificationType;
  userId: string;
  recipientEmail: string;
  recipientName?: string;
  data: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeTransporter();
  }

  private smtpEnabled = false;
  private consoleFallback = false;

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.consoleFallback = this.configService.get<string>('SMTP_FALLBACK_CONSOLE') === 'true';

    if (!user || !pass) {
      this.logger.warn('SMTP credentials not configured - email notifications disabled');
      if (this.consoleFallback) {
        this.logger.log('Console fallback enabled - emails will be logged');
      }
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error.message);
        this.smtpEnabled = false;
        if (this.consoleFallback) {
          this.logger.log('Console fallback enabled - emails will be logged instead of sent');
        }
      } else {
        this.logger.log('SMTP transporter ready');
        this.smtpEnabled = true;
      }
    });
  }

  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string; skipped?: boolean }> {
    const { type, userId, recipientEmail, recipientName, data, attachments } = payload;

    try {
      // Check user notification preferences before sending
      const shouldSend = await this.checkUserPreferences(userId, type);
      if (!shouldSend) {
        this.logger.log(`Notification ${type} skipped for user ${userId} - disabled in preferences`);
        return { success: true, skipped: true };
      }

      const template = this.getTemplate(type, { ...data, recipientName });

      const result = await this.sendEmail({
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        attachments,
      });

      await this.logNotification(userId, type, recipientEmail, true);

      this.logger.log(`Notification sent: ${type} to ${recipientEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error(`Failed to send notification ${type}:`, error.message);
      await this.logNotification(userId, type, recipientEmail, false, error.message);
      return { success: false };
    }
  }

  private async sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
    const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'DocumentIulia.ro');
    const fromEmail = this.configService.get<string>('SMTP_FROM', 'noreply@documentiulia.ro');

    // Console fallback when SMTP is not available
    if (!this.transporter || !this.smtpEnabled) {
      if (this.consoleFallback) {
        this.logger.log(`[EMAIL FALLBACK] To: ${options.to}`);
        this.logger.log(`[EMAIL FALLBACK] Subject: ${options.subject}`);
        this.logger.debug(`[EMAIL FALLBACK] Body preview: ${options.html?.substring(0, 200)}...`);
        return { messageId: `console-${Date.now()}` };
      }
      throw new Error('Email transporter not configured');
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      });
      return { messageId: result.messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
      if (this.consoleFallback) {
        this.logger.log(`[EMAIL FALLBACK] To: ${options.to}, Subject: ${options.subject}`);
        return { messageId: `fallback-${Date.now()}` };
      }
      throw error;
    }
  }

  private async logNotification(
    userId: string,
    type: NotificationType,
    recipient: string,
    success: boolean,
    error?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'NOTIFICATION_SENT',
          entity: 'NOTIFICATION',
          entityId: type,
          details: {
            type,
            recipient,
            success,
            error,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (e) {
      this.logger.error('Failed to log notification:', e.message);
    }
  }

  /**
   * Check if user has enabled notifications for this type
   * Maps NotificationType to user preference flags
   */
  private async checkUserPreferences(userId: string, type: NotificationType): Promise<boolean> {
    // System-critical notifications always send (cannot be disabled)
    const alwaysSendTypes = [
      NotificationType.WELCOME,
      NotificationType.PASSWORD_RESET,
      NotificationType.GDPR_DATA_EXPORT,
      NotificationType.GDPR_DATA_DELETED,
    ];

    if (alwaysSendTypes.includes(type)) {
      return true;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPreferences: true },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found, defaulting to send notification`);
        return true;
      }

      // Parse preferences or use defaults
      let preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
      if (user.notificationPreferences) {
        try {
          preferences = typeof user.notificationPreferences === 'string'
            ? JSON.parse(user.notificationPreferences)
            : (user.notificationPreferences as unknown as NotificationPreferences);
        } catch {
          // Use defaults if parsing fails
        }
      }

      // Map notification types to preference flags
      const typeToPreferenceMap: Record<NotificationType, keyof NotificationPreferences['email'] | null> = {
        [NotificationType.INVOICE_CREATED]: 'invoiceReminders',
        [NotificationType.INVOICE_SENT]: 'invoiceReminders',
        [NotificationType.INVOICE_PAID]: 'invoiceReminders',
        [NotificationType.INVOICE_OVERDUE]: 'overdueAlerts',
        [NotificationType.PAYMENT_REMINDER]: 'invoiceReminders',
        [NotificationType.EFACTURA_SUBMITTED]: 'systemAlerts',
        [NotificationType.EFACTURA_ACCEPTED]: 'systemAlerts',
        [NotificationType.EFACTURA_REJECTED]: 'systemAlerts',
        [NotificationType.COMPLIANCE_ALERT]: 'complianceDeadlines',
        [NotificationType.GDPR_DATA_EXPORT]: null, // Always send
        [NotificationType.GDPR_DATA_DELETED]: null, // Always send
        [NotificationType.WELCOME]: null, // Always send
        [NotificationType.PASSWORD_RESET]: null, // Always send
        [NotificationType.EMAIL_VERIFICATION]: null, // Always send
      };

      const preferenceKey = typeToPreferenceMap[type];
      if (!preferenceKey) {
        return true; // No preference mapping = always send
      }

      return preferences.email[preferenceKey] !== false;
    } catch (error) {
      this.logger.error(`Error checking preferences for user ${userId}:`, error.message);
      return true; // Default to sending on error
    }
  }

  private getTemplate(type: NotificationType, data: Record<string, any>): { subject: string; html: string } {
    const templates: Record<NotificationType, () => { subject: string; html: string }> = {
      [NotificationType.INVOICE_CREATED]: () => this.invoiceCreatedTemplate(data),
      [NotificationType.INVOICE_SENT]: () => this.invoiceSentTemplate(data),
      [NotificationType.INVOICE_PAID]: () => this.invoicePaidTemplate(data),
      [NotificationType.INVOICE_OVERDUE]: () => this.invoiceOverdueTemplate(data),
      [NotificationType.PAYMENT_REMINDER]: () => this.paymentReminderTemplate(data),
      [NotificationType.EFACTURA_SUBMITTED]: () => this.efacturaSubmittedTemplate(data),
      [NotificationType.EFACTURA_ACCEPTED]: () => this.efacturaAcceptedTemplate(data),
      [NotificationType.EFACTURA_REJECTED]: () => this.efacturaRejectedTemplate(data),
      [NotificationType.COMPLIANCE_ALERT]: () => this.complianceAlertTemplate(data),
      [NotificationType.GDPR_DATA_EXPORT]: () => this.gdprDataExportTemplate(data),
      [NotificationType.GDPR_DATA_DELETED]: () => this.gdprDataDeletedTemplate(data),
      [NotificationType.WELCOME]: () => this.welcomeTemplate(data),
      [NotificationType.PASSWORD_RESET]: () => this.passwordResetTemplate(data),
      [NotificationType.EMAIL_VERIFICATION]: () => this.emailVerificationTemplate(data),
    };

    return templates[type]();
  }

  private baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .button:hover { background: #1e3a8a; }
    .alert { padding: 15px; border-radius: 5px; margin: 15px 0; }
    .alert-warning { background: #fef3cd; border-left: 4px solid #f59e0b; }
    .alert-success { background: #d1fae5; border-left: 4px solid #10b981; }
    .alert-danger { background: #fee2e2; border-left: 4px solid #ef4444; }
    .invoice-details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 15px 0; }
    .invoice-details table { width: 100%; }
    .invoice-details td { padding: 8px 0; }
    .invoice-details td:last-child { text-align: right; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DocumentIulia.ro</h1>
      <p style="margin: 5px 0 0; opacity: 0.9;">Platforma ERP pentru afacerea ta</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} DocumentIulia.ro - Toate drepturile rezervate</p>
      <p>Acest email a fost trimis automat. Nu răspundeți la acest mesaj.</p>
      <p><a href="https://documentiulia.ro/privacy">Politica de confidențialitate</a> | <a href="https://documentiulia.ro/terms">Termeni și condiții</a></p>
    </div>
  </div>
</body>
</html>`;
  }

  private invoiceCreatedTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: `Factură nouă creată: ${data.invoiceNumber}`,
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>
        <p>O nouă factură a fost creată în sistemul DocumentIulia.ro.</p>

        <div class="invoice-details">
          <table>
            <tr><td>Număr factură:</td><td>${data.invoiceNumber}</td></tr>
            <tr><td>Data emiterii:</td><td>${data.issueDate}</td></tr>
            <tr><td>Data scadentă:</td><td>${data.dueDate}</td></tr>
            <tr><td>Client:</td><td>${data.customerName}</td></tr>
            <tr><td>Valoare fără TVA:</td><td>${data.netAmount} ${data.currency || 'RON'}</td></tr>
            <tr><td>TVA:</td><td>${data.vatAmount} ${data.currency || 'RON'}</td></tr>
            <tr><td><strong>Total:</strong></td><td><strong>${data.grossAmount} ${data.currency || 'RON'}</strong></td></tr>
          </table>
        </div>

        <a href="https://documentiulia.ro/dashboard/invoices/${data.invoiceId}" class="button">Vizualizează factura</a>
      `),
    };
  }

  private invoiceSentTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: `Factură trimisă: ${data.invoiceNumber}`,
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>
        <p>Factura <strong>${data.invoiceNumber}</strong> a fost trimisă cu succes către client.</p>

        <div class="alert alert-success">
          <strong>✓ Factură trimisă</strong><br>
          Destinatar: ${data.customerEmail}
        </div>

        <div class="invoice-details">
          <table>
            <tr><td>Număr factură:</td><td>${data.invoiceNumber}</td></tr>
            <tr><td>Client:</td><td>${data.customerName}</td></tr>
            <tr><td>Total:</td><td>${data.grossAmount} ${data.currency || 'RON'}</td></tr>
          </table>
        </div>
      `),
    };
  }

  private invoicePaidTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: `Factură plătită: ${data.invoiceNumber}`,
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <div class="alert alert-success">
          <strong>✓ Plată înregistrată</strong><br>
          Factura ${data.invoiceNumber} a fost marcată ca plătită.
        </div>

        <div class="invoice-details">
          <table>
            <tr><td>Număr factură:</td><td>${data.invoiceNumber}</td></tr>
            <tr><td>Client:</td><td>${data.customerName}</td></tr>
            <tr><td>Sumă plătită:</td><td>${data.grossAmount} ${data.currency || 'RON'}</td></tr>
            <tr><td>Data plății:</td><td>${data.paymentDate}</td></tr>
            <tr><td>Metodă plată:</td><td>${data.paymentMethod || 'N/A'}</td></tr>
          </table>
        </div>
      `),
    };
  }

  private invoiceOverdueTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: `⚠️ Factură restantă: ${data.invoiceNumber}`,
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <div class="alert alert-danger">
          <strong>⚠️ Factură restantă</strong><br>
          Factura ${data.invoiceNumber} a depășit termenul de plată.
        </div>

        <div class="invoice-details">
          <table>
            <tr><td>Număr factură:</td><td>${data.invoiceNumber}</td></tr>
            <tr><td>Client:</td><td>${data.customerName}</td></tr>
            <tr><td>Data scadentă:</td><td style="color: #ef4444;">${data.dueDate}</td></tr>
            <tr><td>Zile întârziere:</td><td style="color: #ef4444;">${data.daysOverdue} zile</td></tr>
            <tr><td>Sumă restantă:</td><td>${data.grossAmount} ${data.currency || 'RON'}</td></tr>
          </table>
        </div>

        <p>Vă recomandăm să contactați clientul pentru regularizarea situației.</p>

        <a href="https://documentiulia.ro/dashboard/invoices/${data.invoiceId}" class="button">Vezi detalii factură</a>
      `),
    };
  }

  private paymentReminderTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: `Reminder plată: Factură ${data.invoiceNumber}`,
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <div class="alert alert-warning">
          <strong>📅 Reminder plată</strong><br>
          Factura ${data.invoiceNumber} are scadența apropiată.
        </div>

        <div class="invoice-details">
          <table>
            <tr><td>Număr factură:</td><td>${data.invoiceNumber}</td></tr>
            <tr><td>Client:</td><td>${data.customerName}</td></tr>
            <tr><td>Data scadentă:</td><td>${data.dueDate}</td></tr>
            <tr><td>Zile rămase:</td><td>${data.daysUntilDue} zile</td></tr>
            <tr><td>Sumă de plată:</td><td>${data.grossAmount} ${data.currency || 'RON'}</td></tr>
          </table>
        </div>

        <a href="https://documentiulia.ro/dashboard/invoices/${data.invoiceId}" class="button">Vezi factură</a>
      `),
    };
  }

  private efacturaSubmittedTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: `e-Factură trimisă la ANAF: ${data.invoiceNumber}`,
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <div class="alert alert-success">
          <strong>✓ e-Factură transmisă</strong><br>
          Factura ${data.invoiceNumber} a fost trimisă cu succes în sistemul SPV ANAF.
        </div>

        <div class="invoice-details">
          <table>
            <tr><td>Număr factură:</td><td>${data.invoiceNumber}</td></tr>
            <tr><td>Index încărcare ANAF:</td><td>${data.uploadIndex}</td></tr>
            <tr><td>Data transmiterii:</td><td>${data.submissionDate}</td></tr>
            <tr><td>Status:</td><td>În procesare ANAF</td></tr>
          </table>
        </div>

        <p>Veți fi notificat când ANAF va procesa factura.</p>
      `),
    };
  }

  private efacturaAcceptedTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: `✓ e-Factură acceptată de ANAF: ${data.invoiceNumber}`,
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <div class="alert alert-success">
          <strong>✓ e-Factură acceptată</strong><br>
          Factura ${data.invoiceNumber} a fost acceptată de ANAF.
        </div>

        <div class="invoice-details">
          <table>
            <tr><td>Număr factură:</td><td>${data.invoiceNumber}</td></tr>
            <tr><td>Index ANAF:</td><td>${data.uploadIndex}</td></tr>
            <tr><td>ID răspuns:</td><td>${data.responseId}</td></tr>
            <tr><td>Data acceptării:</td><td>${data.acceptanceDate}</td></tr>
          </table>
        </div>
      `),
    };
  }

  private efacturaRejectedTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: `❌ e-Factură respinsă de ANAF: ${data.invoiceNumber}`,
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <div class="alert alert-danger">
          <strong>❌ e-Factură respinsă</strong><br>
          Factura ${data.invoiceNumber} a fost respinsă de ANAF.
        </div>

        <div class="invoice-details">
          <table>
            <tr><td>Număr factură:</td><td>${data.invoiceNumber}</td></tr>
            <tr><td>Motiv respingere:</td><td style="color: #ef4444;">${data.rejectionReason}</td></tr>
            <tr><td>Cod eroare:</td><td>${data.errorCode}</td></tr>
          </table>
        </div>

        <p>Vă rugăm să corectați erorile și să retrimiteți factura.</p>

        <a href="https://documentiulia.ro/dashboard/invoices/${data.invoiceId}" class="button">Corectează factura</a>
      `),
    };
  }

  private complianceAlertTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: `⚠️ Alertă conformitate: ${data.alertType}`,
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <div class="alert alert-warning">
          <strong>⚠️ Alertă conformitate</strong><br>
          ${data.alertMessage}
        </div>

        <div class="invoice-details">
          <table>
            <tr><td>Tip alertă:</td><td>${data.alertType}</td></tr>
            <tr><td>Termen limită:</td><td style="color: #f59e0b;">${data.deadline}</td></tr>
            <tr><td>Acțiune necesară:</td><td>${data.requiredAction}</td></tr>
          </table>
        </div>

        <p><strong>Referință legală:</strong> ${data.legalReference || 'N/A'}</p>

        <a href="https://documentiulia.ro/dashboard/compliance" class="button">Vezi detalii</a>
      `),
    };
  }

  private gdprDataExportTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: 'Export date GDPR finalizat',
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <div class="alert alert-success">
          <strong>✓ Export date finalizat</strong><br>
          Datele dvs. personale au fost exportate conform GDPR.
        </div>

        <p>Fișierul atașat conține toate datele personale stocate în sistemul DocumentIulia.ro:</p>
        <ul>
          <li>Informații profil</li>
          <li>Facturile emise și primite</li>
          <li>Documente încărcate</li>
          <li>Istoricul activităților</li>
        </ul>

        <p><strong>Important:</strong> Linkul de descărcare expiră în 24 de ore.</p>

        <a href="${data.downloadUrl}" class="button">Descarcă datele</a>

        <p style="font-size: 12px; color: #666; margin-top: 20px;">
          Această solicitare a fost procesată în conformitate cu Art. 20 GDPR (Dreptul la portabilitatea datelor).
        </p>
      `),
    };
  }

  private gdprDataDeletedTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: 'Confirmare ștergere date GDPR',
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <div class="alert alert-success">
          <strong>✓ Ștergere date finalizată</strong><br>
          Datele dvs. personale au fost șterse din sistemul DocumentIulia.ro.
        </div>

        <p>Conform solicitării dvs. GDPR, următoarele date au fost șterse permanent:</p>
        <ul>
          <li>Informații cont și profil</li>
          <li>Documente încărcate</li>
          <li>Jurnale de activitate</li>
        </ul>

        <p><strong>Rețineri legale:</strong> Conform legislației românești, facturile fiscale sunt păstrate pentru perioada legală obligatorie (10 ani) în format anonimizat.</p>

        <p style="font-size: 12px; color: #666; margin-top: 20px;">
          Această solicitare a fost procesată în conformitate cu Art. 17 GDPR (Dreptul la ștergere).
        </p>
      `),
    };
  }

  private welcomeTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: 'Bine ați venit la DocumentIulia.ro!',
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <p>Vă mulțumim că v-ați înregistrat pe DocumentIulia.ro!</p>

        <p>Platforma noastră vă ajută să:</p>
        <ul>
          <li>✓ Emiteți facturi conforme cu legislația română</li>
          <li>✓ Generați automat e-Facturi pentru ANAF</li>
          <li>✓ Exportați rapoarte SAF-T D406</li>
          <li>✓ Sincronizați cu SAGA și alte ERP-uri</li>
          <li>✓ Digitalizați documente cu OCR inteligent</li>
        </ul>

        <a href="https://documentiulia.ro/dashboard" class="button">Accesează dashboard</a>

        <p>Aveți întrebări? Echipa noastră de suport este disponibilă la support@documentiulia.ro</p>
      `),
    };
  }

  private passwordResetTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: 'Resetare parolă DocumentIulia.ro',
      html: this.baseTemplate(`
        <h2>Bună ziua${data.recipientName ? `, ${data.recipientName}` : ''},</h2>

        <p>Am primit o solicitare de resetare a parolei pentru contul dvs.</p>

        <a href="${data.resetUrl}" class="button">Resetează parola</a>

        <p>Acest link expiră în <strong>1 oră</strong>.</p>

        <div class="alert alert-warning">
          <strong>Nu ați solicitat această resetare?</strong><br>
          Dacă nu ați făcut această solicitare, ignorați acest email. Parola dvs. rămâne neschimbată.
        </div>

        <p style="font-size: 12px; color: #666;">
          Din motive de securitate, nu partajați niciodată acest link cu alte persoane.
        </p>
      `),
    };
  }

  private emailVerificationTemplate(data: Record<string, any>): { subject: string; html: string } {
    return {
      subject: 'Verificare email DocumentIulia.ro',
      html: this.baseTemplate(`
        <h2>Bună ziua${data.userName ? `, ${data.userName}` : ''},</h2>

        <p>Vă mulțumim pentru înregistrare! Vă rugăm să verificați adresa de email făcând clic pe butonul de mai jos:</p>

        <a href="${data.verificationUrl}" class="button">Verifică email</a>

        <p>Acest link expiră în <strong>${data.expiryHours || 24} ore</strong>.</p>

        <div class="alert alert-info">
          <strong>De ce este necesară verificarea?</strong><br>
          Verificarea adresei de email ne ajută să protejăm contul dvs. și să vă trimitem notificări importante despre facturile și declarațiile dvs.
        </div>

        <p style="font-size: 12px; color: #666;">
          Dacă nu v-ați creat un cont pe DocumentIulia.ro, vă rugăm să ignorați acest email.
        </p>
      `),
    };
  }

  // Batch notification methods
  async sendPaymentReminders(): Promise<number> {
    const daysBeforeDue = 3;
    const today = new Date();
    const reminderDate = new Date(today.getTime() + daysBeforeDue * 24 * 60 * 60 * 1000);

    const upcomingInvoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.SUBMITTED,
        dueDate: {
          lte: reminderDate,
          gte: new Date(),
          not: null,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        userId: true,
        dueDate: true,
        grossAmount: true,
        currency: true,
        partnerName: true,
      },
    });

    let sentCount = 0;
    for (const invoice of upcomingInvoices) {
      if (!invoice.dueDate) continue;

      // Get user info separately
      const user = await this.prisma.user.findUnique({
        where: { id: invoice.userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        const daysUntilDue = Math.ceil(
          (invoice.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        );

        await this.send({
          type: NotificationType.PAYMENT_REMINDER,
          userId: invoice.userId,
          recipientEmail: user.email,
          recipientName: user.name || undefined,
          data: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.partnerName || 'N/A',
            dueDate: invoice.dueDate.toLocaleDateString('ro-RO'),
            daysUntilDue,
            grossAmount: invoice.grossAmount.toFixed(2),
            currency: invoice.currency,
          },
        });
        sentCount++;
      }
    }

    return sentCount;
  }

  async sendOverdueNotifications(): Promise<number> {
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.SUBMITTED,
        dueDate: {
          lt: new Date(),
          not: null,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        userId: true,
        dueDate: true,
        grossAmount: true,
        currency: true,
        partnerName: true,
      },
    });

    let sentCount = 0;
    for (const invoice of overdueInvoices) {
      if (!invoice.dueDate) continue;

      // Get user info separately
      const user = await this.prisma.user.findUnique({
        where: { id: invoice.userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
        const daysOverdue = Math.ceil(
          (new Date().getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        await this.send({
          type: NotificationType.INVOICE_OVERDUE,
          userId: invoice.userId,
          recipientEmail: user.email,
          recipientName: user.name || undefined,
          data: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.partnerName || 'N/A',
            dueDate: invoice.dueDate.toLocaleDateString('ro-RO'),
            daysOverdue,
            grossAmount: invoice.grossAmount.toFixed(2),
            currency: invoice.currency,
          },
        });
        sentCount++;
      }
    }

    return sentCount;
  }
}
