import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationService } from '../notifications/email-notification.service';

export interface ReminderSettings {
  enabled: boolean;
  daysBeforeDue: number[];  // e.g., [7, 3, 1] - send reminders 7, 3, and 1 days before
  daysAfterDue: number[];   // e.g., [1, 7, 14, 30] - send reminders 1, 7, 14, 30 days after
  includeInvoicePdf: boolean;
  customMessage?: string;
}

export interface ReminderLog {
  id: string;
  invoiceId: string;
  organizationId: string;
  reminderType: 'before_due' | 'on_due' | 'after_due';
  dayOffset: number;
  sentAt: Date;
  recipientEmail: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
}

@Injectable()
export class InvoiceReminderService {
  private readonly logger = new Logger(InvoiceReminderService.name);

  // In-memory storage for reminder logs (should be persisted in production)
  private reminderLogs: Map<string, ReminderLog> = new Map();
  private logIdCounter = 0;

  // Default reminder settings
  private defaultSettings: ReminderSettings = {
    enabled: true,
    daysBeforeDue: [7, 3, 1],
    daysAfterDue: [1, 7, 14, 30],
    includeInvoicePdf: true,
  };

  constructor(
    private prisma: PrismaService,
    private emailService: EmailNotificationService,
  ) {}

  /**
   * Cron job: Process invoice reminders every day at 8:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processInvoiceReminders(): Promise<void> {
    this.logger.log('Processing invoice payment reminders...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all organizations with active invoices
      const organizations = await this.prisma.organization.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          settings: true,
        },
      });

      let totalReminders = 0;

      for (const org of organizations) {
        const settings = this.getReminderSettings(org.settings);
        if (!settings.enabled) continue;

        // Process before-due reminders
        for (const daysBefore of settings.daysBeforeDue) {
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + daysBefore);

          const count = await this.sendRemindersForDate(
            org.id,
            targetDate,
            'before_due',
            daysBefore,
            settings,
          );
          totalReminders += count;
        }

        // Process on-due reminders (due today)
        const dueTodayCount = await this.sendRemindersForDate(
          org.id,
          today,
          'on_due',
          0,
          settings,
        );
        totalReminders += dueTodayCount;

        // Process after-due reminders (overdue)
        for (const daysAfter of settings.daysAfterDue) {
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() - daysAfter);

          const count = await this.sendRemindersForDate(
            org.id,
            targetDate,
            'after_due',
            daysAfter,
            settings,
          );
          totalReminders += count;
        }
      }

      this.logger.log(`Processed ${totalReminders} invoice reminders`);
    } catch (error: any) {
      this.logger.error(`Failed to process invoice reminders: ${error.message}`);
    }
  }

  /**
   * Send reminders for invoices with a specific due date
   */
  private async sendRemindersForDate(
    organizationId: string,
    dueDate: Date,
    reminderType: 'before_due' | 'on_due' | 'after_due',
    dayOffset: number,
    settings: ReminderSettings,
  ): Promise<number> {
    const startOfDay = new Date(dueDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dueDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find unpaid invoices with this due date
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        type: 'ISSUED',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        partner: true,
        organization: true,
      },
    });

    let sentCount = 0;

    for (const invoice of invoices) {
      // Check if reminder was already sent for this invoice and type
      const reminderKey = `${invoice.id}-${reminderType}-${dayOffset}`;
      if (this.wasReminderSent(reminderKey)) {
        continue;
      }

      // Get partner email
      const partnerEmail = invoice.partner?.email;
      if (!partnerEmail) {
        this.logger.warn(`No email for partner of invoice ${invoice.invoiceNumber}`);
        continue;
      }

      try {
        await this.sendReminderEmail(invoice, partnerEmail, reminderType, dayOffset, settings);

        // Log the reminder
        this.logReminder({
          invoiceId: invoice.id,
          organizationId,
          reminderType,
          dayOffset,
          recipientEmail: partnerEmail,
          status: 'sent',
        });

        sentCount++;
        this.logger.log(`Sent ${reminderType} reminder for invoice ${invoice.invoiceNumber}`);
      } catch (error: any) {
        this.logReminder({
          invoiceId: invoice.id,
          organizationId,
          reminderType,
          dayOffset,
          recipientEmail: partnerEmail,
          status: 'failed',
          errorMessage: error.message,
        });
        this.logger.error(`Failed to send reminder for invoice ${invoice.invoiceNumber}: ${error.message}`);
      }
    }

    return sentCount;
  }

  /**
   * Send a reminder email for an invoice
   */
  private async sendReminderEmail(
    invoice: any,
    recipientEmail: string,
    reminderType: 'before_due' | 'on_due' | 'after_due',
    dayOffset: number,
    settings: ReminderSettings,
  ): Promise<void> {
    const subject = this.getReminderSubject(invoice, reminderType, dayOffset);
    const htmlBody = this.getReminderEmailBody(invoice, reminderType, dayOffset, settings);

    await this.emailService.sendEmail(
      invoice.organizationId,
      { email: recipientEmail, name: invoice.partner?.name },
      subject,
      htmlBody,
      'system',
      {
        type: 'notification',
        priority: reminderType === 'after_due' ? 'high' : 'normal',
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          reminderType,
          dayOffset,
        },
      },
    );
  }

  /**
   * Get the email subject based on reminder type
   */
  private getReminderSubject(invoice: any, reminderType: string, dayOffset: number): string {
    const invoiceNumber = invoice.invoiceNumber;

    switch (reminderType) {
      case 'before_due':
        return `Reamintire: Factura ${invoiceNumber} scadentă în ${dayOffset} ${dayOffset === 1 ? 'zi' : 'zile'}`;
      case 'on_due':
        return `Reamintire: Factura ${invoiceNumber} scadentă astăzi`;
      case 'after_due':
        return `Urgență: Factura ${invoiceNumber} restantă de ${dayOffset} ${dayOffset === 1 ? 'zi' : 'zile'}`;
      default:
        return `Reamintire plată factură ${invoiceNumber}`;
    }
  }

  /**
   * Generate reminder email HTML body
   */
  private getReminderEmailBody(
    invoice: any,
    reminderType: string,
    dayOffset: number,
    settings: ReminderSettings,
  ): string {
    const org = invoice.organization;
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('ro-RO', { style: 'currency', currency: invoice.currency }).format(amount);

    const dueDate = new Date(invoice.dueDate).toLocaleDateString('ro-RO');
    const remainingAmount = Number(invoice.grossAmount) - Number(invoice.paidAmount || 0);

    let urgencyClass = '';
    let urgencyText = '';
    let actionText = '';

    switch (reminderType) {
      case 'before_due':
        urgencyClass = 'before-due';
        urgencyText = `Factura va fi scadentă în ${dayOffset} ${dayOffset === 1 ? 'zi' : 'zile'}.`;
        actionText = 'Vă rugăm să efectuați plata până la data scadenței.';
        break;
      case 'on_due':
        urgencyClass = 'on-due';
        urgencyText = 'Factura este scadentă astăzi.';
        actionText = 'Vă rugăm să efectuați plata cât mai curând posibil.';
        break;
      case 'after_due':
        urgencyClass = 'overdue';
        urgencyText = `Factura este restantă de ${dayOffset} ${dayOffset === 1 ? 'zi' : 'zile'}.`;
        actionText = 'Vă rugăm să efectuați plata urgentă pentru a evita penalități.';
        break;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .invoice-box { background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .amount { font-size: 24px; font-weight: bold; color: #1e40af; }
    .before-due { border-left: 4px solid #f59e0b; }
    .on-due { border-left: 4px solid #3b82f6; }
    .overdue { border-left: 4px solid #ef4444; background: #fef2f2; }
    .urgency { padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .urgency.before-due { background: #fffbeb; color: #92400e; }
    .urgency.on-due { background: #eff6ff; color: #1e40af; }
    .urgency.overdue { background: #fef2f2; color: #dc2626; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 20px; }
    table { width: 100%; }
    td { padding: 8px 0; }
    .label { color: #666; }
    .value { font-weight: 500; text-align: right; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reamintire Plată</h1>
    </div>
    <div class="content">
      <p>Stimate client,</p>

      <div class="urgency ${urgencyClass}">
        <strong>${urgencyText}</strong>
        <p style="margin: 5px 0 0 0;">${actionText}</p>
      </div>

      <div class="invoice-box ${urgencyClass}">
        <table>
          <tr>
            <td class="label">Nr. Factură:</td>
            <td class="value">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td class="label">Data emiterii:</td>
            <td class="value">${new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}</td>
          </tr>
          <tr>
            <td class="label">Data scadenței:</td>
            <td class="value">${dueDate}</td>
          </tr>
          <tr>
            <td class="label">Valoare totală:</td>
            <td class="value">${formatCurrency(Number(invoice.grossAmount))}</td>
          </tr>
          ${Number(invoice.paidAmount) > 0 ? `
          <tr>
            <td class="label">Suma achitată:</td>
            <td class="value">${formatCurrency(Number(invoice.paidAmount))}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="label"><strong>Rest de plată:</strong></td>
            <td class="value"><span class="amount">${formatCurrency(remainingAmount)}</span></td>
          </tr>
        </table>
      </div>

      ${settings.customMessage ? `<p>${settings.customMessage}</p>` : ''}

      <p>Pentru detalii privind modalitățile de plată, vă rugăm să ne contactați.</p>

      <p>Cu stimă,<br>${org.name}</p>
    </div>
    <div class="footer">
      <p>Acest email a fost trimis automat de sistemul DocumentIulia.ro</p>
      ${org.email ? `<p>Contact: ${org.email}</p>` : ''}
      ${org.phone ? `<p>Telefon: ${org.phone}</p>` : ''}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Get reminder settings for an organization
   */
  private getReminderSettings(orgSettings: any): ReminderSettings {
    if (!orgSettings) return this.defaultSettings;

    try {
      const settings = typeof orgSettings === 'string' ? JSON.parse(orgSettings) : orgSettings;
      return {
        enabled: settings.invoiceReminders?.enabled ?? this.defaultSettings.enabled,
        daysBeforeDue: settings.invoiceReminders?.daysBeforeDue ?? this.defaultSettings.daysBeforeDue,
        daysAfterDue: settings.invoiceReminders?.daysAfterDue ?? this.defaultSettings.daysAfterDue,
        includeInvoicePdf: settings.invoiceReminders?.includeInvoicePdf ?? this.defaultSettings.includeInvoicePdf,
        customMessage: settings.invoiceReminders?.customMessage,
      };
    } catch {
      return this.defaultSettings;
    }
  }

  /**
   * Check if a reminder was already sent
   */
  private wasReminderSent(reminderKey: string): boolean {
    // Check in the last 24 hours
    const recentLogs = Array.from(this.reminderLogs.values()).filter(log => {
      const logKey = `${log.invoiceId}-${log.reminderType}-${log.dayOffset}`;
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      return logKey === reminderKey && log.sentAt > oneDayAgo && log.status === 'sent';
    });
    return recentLogs.length > 0;
  }

  /**
   * Log a reminder
   */
  private logReminder(data: Omit<ReminderLog, 'id' | 'sentAt'>): void {
    const log: ReminderLog = {
      id: `reminder-${++this.logIdCounter}-${Date.now()}`,
      ...data,
      sentAt: new Date(),
    };
    this.reminderLogs.set(log.id, log);
  }

  /**
   * Get reminder logs for an organization
   */
  async getReminderLogs(
    organizationId: string,
    limit = 50,
  ): Promise<ReminderLog[]> {
    return Array.from(this.reminderLogs.values())
      .filter(log => log.organizationId === organizationId)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats(organizationId: string): Promise<{
    totalSent: number;
    sentToday: number;
    sentThisWeek: number;
    sentThisMonth: number;
    failedCount: number;
    byType: Record<string, number>;
  }> {
    const logs = Array.from(this.reminderLogs.values())
      .filter(log => log.organizationId === organizationId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      totalSent: logs.filter(l => l.status === 'sent').length,
      sentToday: logs.filter(l => l.status === 'sent' && l.sentAt >= startOfToday).length,
      sentThisWeek: logs.filter(l => l.status === 'sent' && l.sentAt >= startOfWeek).length,
      sentThisMonth: logs.filter(l => l.status === 'sent' && l.sentAt >= startOfMonth).length,
      failedCount: logs.filter(l => l.status === 'failed').length,
      byType: {
        before_due: logs.filter(l => l.status === 'sent' && l.reminderType === 'before_due').length,
        on_due: logs.filter(l => l.status === 'sent' && l.reminderType === 'on_due').length,
        after_due: logs.filter(l => l.status === 'sent' && l.reminderType === 'after_due').length,
      },
    };
  }

  /**
   * Manually trigger a reminder for a specific invoice
   */
  async sendManualReminder(
    invoiceId: string,
    userId: string,
    customMessage?: string,
  ): Promise<{ success: boolean; message: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        partner: true,
        organization: true,
      },
    });

    if (!invoice) {
      return { success: false, message: 'Factura nu a fost găsită' };
    }

    if (!invoice.partner?.email) {
      return { success: false, message: 'Partenerul nu are adresă de email' };
    }

    const settings: ReminderSettings = {
      ...this.defaultSettings,
      customMessage,
    };

    const dueDate = new Date(invoice.dueDate!);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    let reminderType: 'before_due' | 'on_due' | 'after_due';
    let dayOffset: number;

    if (dueDate > today) {
      reminderType = 'before_due';
      dayOffset = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else if (dueDate.getTime() === today.getTime()) {
      reminderType = 'on_due';
      dayOffset = 0;
    } else {
      reminderType = 'after_due';
      dayOffset = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    try {
      await this.sendReminderEmail(invoice, invoice.partner.email, reminderType, dayOffset, settings);

      this.logReminder({
        invoiceId: invoice.id,
        organizationId: invoice.organizationId!,
        reminderType,
        dayOffset,
        recipientEmail: invoice.partner.email,
        status: 'sent',
      });

      return { success: true, message: 'Reamintirea a fost trimisă cu succes' };
    } catch (error: any) {
      this.logReminder({
        invoiceId: invoice.id,
        organizationId: invoice.organizationId!,
        reminderType,
        dayOffset,
        recipientEmail: invoice.partner.email,
        status: 'failed',
        errorMessage: error.message,
      });

      return { success: false, message: `Eroare la trimitere: ${error.message}` };
    }
  }

  /**
   * Update reminder settings for an organization
   */
  async updateReminderSettings(
    organizationId: string,
    userId: string,
    newSettings: Partial<ReminderSettings>,
  ): Promise<ReminderSettings> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = typeof org?.settings === 'string'
      ? JSON.parse(org.settings)
      : org?.settings || {};

    const updatedSettings = {
      ...currentSettings,
      invoiceReminders: {
        ...this.defaultSettings,
        ...currentSettings.invoiceReminders,
        ...newSettings,
      },
    };

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
    });

    return updatedSettings.invoiceReminders;
  }
}
