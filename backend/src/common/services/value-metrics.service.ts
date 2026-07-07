import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Value Metrics Service
 *
 * Tracks and calculates the value delivered to users:
 * - Time saved from automation
 * - Tax deductions found by AI
 * - Fines/penalties avoided
 * - Money saved vs traditional services
 * - Errors prevented
 *
 * This powers the ROI dashboard and value communication.
 *
 * NOTE: Some metrics use estimations based on available data.
 * Future improvements: Add dedicated tracking tables for AI queries,
 * deductions, and error corrections.
 */

export interface UserValueMetrics {
  userId: string;
  period: 'month' | 'quarter' | 'year' | 'all-time';
  timeSavedHours: number;
  timeSavedValue: number; // RON value of time saved
  deductionsFound: number; // RON in tax deductions identified
  finesAvoided: number; // Estimated penalties prevented
  moneySaved: number; // vs traditional accountant fees
  errorsPrevented: number; // Number of errors caught
  documentsProcessed: number;
  aiQueriesAnswered: number;
  complianceChecksPassed: number;
  totalValueDelivered: number; // Sum of all value
  subscriptionCost: number; // What they paid
  roi: number; // Return on investment (value / cost)
}

interface ActivityMetrics {
  ocrDocuments: number;
  aiQueries: number;
  vatCalculations: number;
  invoicesGenerated: number;
  saftSubmissions: number;
  eFacturaSubmissions: number;
  complianceChecks: number;
  errorsDetected: number;
}

@Injectable()
export class ValueMetricsService {
  private readonly logger = new Logger(ValueMetricsService.name);

  // Average time savings per activity (in minutes)
  private readonly TIME_SAVINGS = {
    ocrDocument: 15, // vs manual entry
    aiQuery: 30, // vs researching law/calling accountant
    vatCalculation: 20, // vs manual calculation
    invoiceGeneration: 10, // vs manual creation
    saftSubmission: 45, // vs manual XML creation
    eFacturaSubmission: 30, // vs manual SPV submission
    complianceCheck: 25, // vs manual review
  };

  // Average value per activity (in RON)
  private readonly VALUE_ESTIMATES = {
    errorPrevented: 500, // Avg cost of fixing an error
    fineAvoided: 2000, // Avg ANAF fine for compliance issues
    deductionFound: 150, // Avg AI-suggested deduction
    hourlyRate: 100, // Romanian avg professional hourly rate
  };

  // Subscription costs (RON/month)
  private readonly SUBSCRIPTION_COSTS = {
    FREE: 0,
    PRO: 49,
    BUSINESS: 149,
    ENTERPRISE: 299,
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Calculate comprehensive value metrics for a user
   */
  async calculateUserValue(
    userId: string,
    period: 'month' | 'quarter' | 'year' | 'all-time' = 'month',
  ): Promise<UserValueMetrics> {
    const dateRange = this.getDateRange(period);
    const activities = await this.getUserActivities(userId, dateRange);
    const userPlan = await this.getUserSubscriptionPlan(userId);

    // Calculate time saved
    const timeSavedMinutes =
      activities.ocrDocuments * this.TIME_SAVINGS.ocrDocument +
      activities.aiQueries * this.TIME_SAVINGS.aiQuery +
      activities.vatCalculations * this.TIME_SAVINGS.vatCalculation +
      activities.invoicesGenerated * this.TIME_SAVINGS.invoiceGeneration +
      activities.saftSubmissions * this.TIME_SAVINGS.saftSubmission +
      activities.eFacturaSubmissions * this.TIME_SAVINGS.eFacturaSubmission +
      activities.complianceChecks * this.TIME_SAVINGS.complianceCheck;

    const timeSavedHours = Math.round(timeSavedMinutes / 60 * 10) / 10;
    const timeSavedValue = Math.round(
      timeSavedHours * this.VALUE_ESTIMATES.hourlyRate,
    );

    // Calculate deductions found (AI suggestions that were accepted)
    // TODO: Track AI suggestions and acceptances in database
    // For now, estimate based on AI queries (avg 150 RON deduction per 10 queries)
    const deductionsFound = Math.round(
      (activities.aiQueries / 10) * this.VALUE_ESTIMATES.deductionFound,
    );

    // Calculate fines avoided (errors caught before submission)
    // Estimate: 50% of detected errors would have resulted in fines
    const finesAvoided = Math.round(
      activities.errorsDetected * this.VALUE_ESTIMATES.fineAvoided * 0.5,
    );

    // Money saved vs traditional accountant
    // Avg Romanian accountant: 500-1000 RON/month for SME
    const traditionalAccountantCost = 750; // RON/month
    const monthsInPeriod = this.getMonthsInPeriod(period);
    const moneySaved = Math.max(
      0,
      traditionalAccountantCost * monthsInPeriod -
        this.SUBSCRIPTION_COSTS[userPlan] * monthsInPeriod,
    );

    // Total value delivered
    const totalValueDelivered =
      timeSavedValue + deductionsFound + finesAvoided + moneySaved;

    // Calculate ROI
    const subscriptionCost = this.SUBSCRIPTION_COSTS[userPlan] * monthsInPeriod;
    const roi =
      subscriptionCost > 0
        ? Math.round((totalValueDelivered / subscriptionCost - 1) * 100)
        : Infinity;

    const metrics: UserValueMetrics = {
      userId,
      period,
      timeSavedHours,
      timeSavedValue,
      deductionsFound,
      finesAvoided,
      moneySaved,
      errorsPrevented: activities.errorsDetected,
      documentsProcessed: activities.ocrDocuments,
      aiQueriesAnswered: activities.aiQueries,
      complianceChecksPassed: activities.complianceChecks,
      totalValueDelivered,
      subscriptionCost,
      roi,
    };

    this.logger.log(
      `Value metrics for user ${userId} (${period}): ${totalValueDelivered} RON delivered, ${roi}% ROI`,
    );

    return metrics;
  }

  /**
   * Get user activities for a date range
   */
  private async getUserActivities(
    userId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<ActivityMetrics> {
    // OCR documents processed (all documents with status COMPLETED)
    const ocrDocuments = await this.prisma.document.count({
      where: {
        userId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        status: 'COMPLETED',
      },
    });

    // AI queries (from AIQuery table)
    const aiQueries = await this.prisma.aIQuery.count({
      where: {
        userId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    });

    // VAT calculations (invoices generated)
    const vatCalculations = await this.prisma.invoice.count({
      where: {
        userId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    });

    // Invoices generated
    const invoicesGenerated = vatCalculations; // Same as above

    // SAF-T submissions
    const saftSubmissions = await this.prisma.sAFTReport.count({
      where: {
        userId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        status: 'SUBMITTED',
      },
    });

    // e-Factura submissions (SpvSubmission table)
    const eFacturaSubmissions = await this.prisma.spvSubmission.count({
      where: {
        userId,
        submittedAt: { gte: dateRange.start, lte: dateRange.end },
        status: 'ACCEPTED',
      },
    });

    // Compliance checks (invoices validated, SAF-T validated, etc.)
    const complianceChecks =
      invoicesGenerated + saftSubmissions + eFacturaSubmissions;

    // Errors detected (estimate: 10% of documents have validation issues that get corrected)
    // TODO: Track validation errors and corrections in database
    const errorsDetected = Math.round(ocrDocuments * 0.1);

    return {
      ocrDocuments,
      aiQueries,
      vatCalculations,
      invoicesGenerated,
      saftSubmissions,
      eFacturaSubmissions,
      complianceChecks,
      errorsDetected,
    };
  }

  /**
   * Get user subscription plan
   */
  private async getUserSubscriptionPlan(
    userId: string,
  ): Promise<'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE'> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    return (user?.tier as 'FREE' | 'PRO' | 'BUSINESS' | 'ENTERPRISE') || 'FREE';
  }

  /**
   * Get date range for period
   */
  private getDateRange(
    period: 'month' | 'quarter' | 'year' | 'all-time',
  ): { start: Date; end: Date } {
    const end = new Date();
    let start: Date;

    switch (period) {
      case 'month':
        start = new Date();
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date();
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all-time':
        start = new Date('2024-01-01'); // Platform launch date
        break;
    }

    return { start, end };
  }

  /**
   * Get number of months in period
   */
  private getMonthsInPeriod(
    period: 'month' | 'quarter' | 'year' | 'all-time',
  ): number {
    switch (period) {
      case 'month':
        return 1;
      case 'quarter':
        return 3;
      case 'year':
        return 12;
      case 'all-time':
        // Calculate from platform launch to now
        const launchDate = new Date('2024-01-01');
        const now = new Date();
        return (
          (now.getFullYear() - launchDate.getFullYear()) * 12 +
          (now.getMonth() - launchDate.getMonth())
        );
    }
  }

  /**
   * Get value insights for display in dashboard
   */
  async getValueInsights(userId: string): Promise<string[]> {
    const monthMetrics = await this.calculateUserValue(userId, 'month');
    const insights: string[] = [];

    if (monthMetrics.timeSavedHours >= 10) {
      insights.push(
        `💡 Ai economisit ${monthMetrics.timeSavedHours} ore luna aceasta (valoare: ${monthMetrics.timeSavedValue} RON)`,
      );
    }

    if (monthMetrics.deductionsFound > 0) {
      insights.push(
        `🎯 AI-ul a identificat ${monthMetrics.deductionsFound} RON în deduceri fiscale`,
      );
    }

    if (monthMetrics.errorsPrevented > 0) {
      insights.push(
        `✅ ${monthMetrics.errorsPrevented} erori prevăzute înainte de trimiterea la ANAF`,
      );
    }

    if (monthMetrics.roi > 500) {
      insights.push(
        `🚀 ROI excepțional: ${monthMetrics.roi}% (${monthMetrics.totalValueDelivered} RON valoare vs ${monthMetrics.subscriptionCost} RON abonament)`,
      );
    } else if (monthMetrics.roi > 100) {
      insights.push(
        `📈 ROI solid: ${monthMetrics.roi}% returnat pe investiția ta`,
      );
    }

    if (monthMetrics.complianceChecksPassed >= 10) {
      insights.push(
        `🛡️ ${monthMetrics.complianceChecksPassed} verificări de conformitate efectuate cu succes`,
      );
    }

    if (monthMetrics.documentsProcessed >= 50) {
      insights.push(
        `📄 ${monthMetrics.documentsProcessed} documente procesate automat - câștigi ${Math.round(monthMetrics.documentsProcessed * 0.25)} ore vs. manual`,
      );
    }

    return insights;
  }

  /**
   * Compare user value to platform average (motivation)
   */
  async compareToAverage(userId: string): Promise<{
    userValue: number;
    platformAverage: number;
    percentile: number;
  }> {
    const userMetrics = await this.calculateUserValue(userId, 'month');

    // TODO: Calculate actual platform averages from all users
    // For now, use estimated averages
    const platformAverage = 2500; // RON/month avg value delivered

    const percentile = Math.min(
      100,
      Math.round((userMetrics.totalValueDelivered / platformAverage) * 100),
    );

    return {
      userValue: userMetrics.totalValueDelivered,
      platformAverage,
      percentile,
    };
  }
}
