import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Notification Scheduler Service
 *
 * Automated scheduled notifications for:
 * - Payment reminders (3 days before due date)
 * - Overdue invoice notifications
 * - Daily summary reports (optional)
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Daily at 8:00 AM - Send payment reminders for invoices due in 3 days
   * Romanian business hours to ensure users receive reminders during work time
   */
  @Cron('0 8 * * *') // 8:00 AM every day
  async sendDailyPaymentReminders() {
    this.logger.log('Starting daily payment reminder job...');

    try {
      const sentCount = await this.notificationsService.sendPaymentReminders();
      this.logger.log(`Payment reminder job completed: ${sentCount} reminders sent`);

      await this.logScheduledJob('PAYMENT_REMINDERS', {
        remindersSent: sentCount,
        executedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Payment reminder job failed:', error.message);
      await this.logScheduledJob('PAYMENT_REMINDERS', {
        error: error.message,
        executedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Daily at 9:00 AM - Send overdue notifications for past-due invoices
   * Slightly after payment reminders to prioritize urgent notifications
   */
  @Cron('0 9 * * *') // 9:00 AM every day
  async sendDailyOverdueNotifications() {
    this.logger.log('Starting daily overdue notification job...');

    try {
      const sentCount = await this.notificationsService.sendOverdueNotifications();
      this.logger.log(`Overdue notification job completed: ${sentCount} notifications sent`);

      await this.logScheduledJob('OVERDUE_NOTIFICATIONS', {
        notificationsSent: sentCount,
        executedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Overdue notification job failed:', error.message);
      await this.logScheduledJob('OVERDUE_NOTIFICATIONS', {
        error: error.message,
        executedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Weekly on Monday at 7:00 AM - Send weekly invoice summary
   * Provides users with a weekly overview of their invoice status
   */
  @Cron('0 7 * * 1') // 7:00 AM every Monday
  async sendWeeklyInvoiceSummary() {
    this.logger.log('Starting weekly invoice summary job...');

    try {
      // Get all active users with invoices
      const usersWithInvoices = await this.prisma.user.findMany({
        where: {
          invoices: {
            some: {},
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
        },
      });

      let sentCount = 0;
      for (const user of usersWithInvoices) {
        if (!user.email) continue;

        // Get invoice statistics for the user
        const stats = await this.getWeeklyStats(user.id);

        if (stats.totalPending > 0 || stats.totalOverdue > 0) {
          await this.notificationsService.send({
            type: 'COMPLIANCE_ALERT' as any,
            userId: user.id,
            recipientEmail: user.email,
            recipientName: user.name || user.company || undefined,
            data: {
              alertType: 'Sumar săptămânal facturi',
              alertMessage: `Aveți ${stats.totalPending} facturi în așteptare și ${stats.totalOverdue} facturi restante.`,
              deadline: 'N/A',
              requiredAction: 'Verificați facturile și contactați clienții pentru plată.',
              legalReference: 'Codul Fiscal - termene plată facturi',
              ...stats,
            },
          });
          sentCount++;
        }
      }

      this.logger.log(`Weekly summary job completed: ${sentCount} summaries sent`);

      await this.logScheduledJob('WEEKLY_SUMMARY', {
        summariesSent: sentCount,
        executedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Weekly summary job failed:', error.message);
      await this.logScheduledJob('WEEKLY_SUMMARY', {
        error: error.message,
        executedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Monthly on the 1st at 6:00 AM - Remind about SAF-T D406 submission
   * Per ANAF Order 1783/2021 - monthly submission required
   */
  @Cron('0 6 1 * *') // 6:00 AM on the 1st of each month
  async sendMonthlySaftReminder() {
    this.logger.log('Starting monthly SAF-T D406 reminder job...');

    try {
      const users = await this.prisma.user.findMany({
        where: {
          cui: { not: null },
        },
        select: {
          id: true,
          email: true,
          name: true,
          company: true,
        },
      });

      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const monthName = previousMonth.toLocaleString('ro-RO', { month: 'long', year: 'numeric' });

      let sentCount = 0;
      for (const user of users) {
        if (!user.email) continue;

        await this.notificationsService.send({
          type: 'COMPLIANCE_ALERT' as any,
          userId: user.id,
          recipientEmail: user.email,
          recipientName: user.name || user.company || undefined,
          data: {
            alertType: 'Reminder SAF-T D406',
            alertMessage: `Nu uitați să transmiteți declarația SAF-T D406 pentru luna ${monthName}.`,
            deadline: `25 ${new Date().toLocaleString('ro-RO', { month: 'long' })}`,
            requiredAction: 'Generați și transmiteți SAF-T D406 în sistemul ANAF.',
            legalReference: 'OPANAF 1783/2021 - SAF-T D406 obligatoriu',
          },
        });
        sentCount++;
      }

      this.logger.log(`SAF-T reminder job completed: ${sentCount} reminders sent`);

      await this.logScheduledJob('SAFT_REMINDER', {
        remindersSent: sentCount,
        executedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('SAF-T reminder job failed:', error.message);
      await this.logScheduledJob('SAFT_REMINDER', {
        error: error.message,
        executedAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Helper: Get weekly invoice statistics for a user
   */
  private async getWeeklyStats(userId: string) {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [pending, overdue, paidThisWeek, issuedThisWeek] = await Promise.all([
      this.prisma.invoice.count({
        where: {
          userId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
          paymentStatus: 'UNPAID',
        },
      }),
      this.prisma.invoice.count({
        where: {
          userId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
          dueDate: { lt: today },
        },
      }),
      this.prisma.invoice.count({
        where: {
          userId,
          status: 'PAID',
          paidAt: { gte: weekAgo },
        },
      }),
      this.prisma.invoice.count({
        where: {
          userId,
          createdAt: { gte: weekAgo },
        },
      }),
    ]);

    return {
      totalPending: pending,
      totalOverdue: overdue,
      paidThisWeek,
      issuedThisWeek,
    };
  }

  /**
   * Log scheduled job execution for audit trail
   */
  private async logScheduledJob(jobName: string, details: Record<string, any>) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'system',
          action: `SCHEDULED_JOB_${jobName}`,
          entity: 'NotificationScheduler',
          entityId: null,
          details,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log scheduled job ${jobName}:`, error.message);
    }
  }

  /**
   * Manual trigger for testing - send payment reminders immediately
   */
  async triggerPaymentReminders(): Promise<{ sentCount: number }> {
    const sentCount = await this.notificationsService.sendPaymentReminders();
    return { sentCount };
  }

  /**
   * Manual trigger for testing - send overdue notifications immediately
   */
  async triggerOverdueNotifications(): Promise<{ sentCount: number }> {
    const sentCount = await this.notificationsService.sendOverdueNotifications();
    return { sentCount };
  }
}
