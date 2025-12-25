import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * GDPR Data Retention Service
 *
 * Implements automated data retention policies per Romanian law and GDPR:
 * - Financial data (invoices, VAT reports): 10 years (Codul Fiscal)
 * - HR data (employees, payroll): 50 years (Codul Muncii)
 * - Audit logs: 10 years (compliance requirement)
 * - Technical logs (AI queries): 12 months
 * - Deleted user data: 30 days grace period
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  // Retention periods in days
  private readonly RETENTION_PERIODS = {
    TECHNICAL_LOGS: 365, // 12 months
    AI_QUERIES: 365, // 12 months
    DELETED_USER_GRACE: 30, // 30 days grace period before permanent deletion
    AUDIT_LOGS: 3650, // 10 years
    FINANCIAL_DATA: 3650, // 10 years
    HR_DATA: 18250, // 50 years
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Run daily at 2 AM - Clean up technical logs older than 12 months
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupTechnicalLogs() {
    this.logger.log('Starting daily technical logs cleanup...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_PERIODS.TECHNICAL_LOGS);

    try {
      // Clean up old AI queries (non-essential, can be deleted after 12 months)
      const deletedQueries = await this.prisma.aIQuery.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(`Cleaned up ${deletedQueries.count} AI queries older than 12 months`);

      // Log this cleanup action
      await this.logRetentionAction('TECHNICAL_LOGS_CLEANUP', {
        deletedAiQueries: deletedQueries.count,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error) {
      this.logger.error('Failed to cleanup technical logs', error);
    }
  }

  /**
   * Run monthly on the 1st at 3 AM - Check for data approaching retention limits
   */
  @Cron('0 3 1 * *') // First day of each month at 3 AM
  async generateRetentionReport() {
    this.logger.log('Generating monthly retention report...');

    try {
      const now = new Date();

      // Check for data approaching 10-year retention limit (within 6 months)
      const sixMonthsBeforeRetention = new Date(now);
      sixMonthsBeforeRetention.setFullYear(sixMonthsBeforeRetention.getFullYear() - 9);
      sixMonthsBeforeRetention.setMonth(sixMonthsBeforeRetention.getMonth() - 6);

      const invoicesApproachingRetention = await this.prisma.invoice.count({
        where: {
          createdAt: {
            lt: sixMonthsBeforeRetention,
          },
        },
      });

      const vatReportsApproachingRetention = await this.prisma.vATReport.count({
        where: {
          createdAt: {
            lt: sixMonthsBeforeRetention,
          },
        },
      });

      const report = {
        generatedAt: now.toISOString(),
        invoicesApproachingRetention,
        vatReportsApproachingRetention,
        message: 'Review data before retention period expires per Romanian fiscal law',
      };

      this.logger.log(`Retention report: ${JSON.stringify(report)}`);

      await this.logRetentionAction('MONTHLY_RETENTION_REPORT', report);

      return report;
    } catch (error) {
      this.logger.error('Failed to generate retention report', error);
    }
  }

  /**
   * Schedule data deletion for a specific user (e.g., after account closure)
   */
  async scheduleDataDeletion(userId: string, retentionDays = 30) {
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + retentionDays);

    this.logger.log(`Scheduling data deletion for user ${userId} on ${deletionDate.toISOString()}`);

    // In a production system, you would store this in a scheduled_deletions table
    // For now, we log the scheduled deletion
    await this.logRetentionAction('DELETION_SCHEDULED', {
      userId,
      scheduledFor: deletionDate.toISOString(),
      retentionDays,
    });

    return {
      userId,
      scheduledDeletionDate: deletionDate.toISOString(),
      retentionDays,
      note: 'Financial and HR data will be retained per Romanian legal requirements',
    };
  }

  /**
   * Get retention status for a user's data
   */
  async getRetentionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        createdAt: true,
        _count: {
          select: {
            invoices: true,
            employees: true,
            documents: true,
            vatReports: true,
            saftReports: true,
            aiQueries: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const now = new Date();
    const accountAge = Math.floor(
      (now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      userId: user.id,
      accountCreated: user.createdAt.toISOString(),
      accountAgeDays: accountAge,
      dataCounts: user._count,
      retentionPolicies: [
        {
          dataType: 'Invoices & VAT Reports',
          count: user._count.invoices + user._count.vatReports,
          retentionPeriod: '10 years',
          legalBasis: 'Romanian Fiscal Code (Codul Fiscal)',
          canDelete: accountAge > this.RETENTION_PERIODS.FINANCIAL_DATA,
        },
        {
          dataType: 'Employee & Payroll Data',
          count: user._count.employees,
          retentionPeriod: '50 years',
          legalBasis: 'Romanian Labor Code (Codul Muncii)',
          canDelete: accountAge > this.RETENTION_PERIODS.HR_DATA,
        },
        {
          dataType: 'Documents',
          count: user._count.documents,
          retentionPeriod: '10 years',
          legalBasis: 'Romanian Fiscal Code',
          canDelete: accountAge > this.RETENTION_PERIODS.FINANCIAL_DATA,
        },
        {
          dataType: 'AI Queries',
          count: user._count.aiQueries,
          retentionPeriod: '12 months',
          legalBasis: 'GDPR legitimate interest',
          canDelete: true,
        },
      ],
    };
  }

  /**
   * Log retention actions for audit trail
   */
  private async logRetentionAction(action: string, details: any) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: 'system',
          action: `RETENTION_${action}`,
          entity: 'RetentionService',
          entityId: null,
          details,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log retention action', error);
    }
  }
}
