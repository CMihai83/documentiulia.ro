import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardMetrics {
  revenue: {
    total: number;
    change: number;
    currency: string;
  };
  invoices: {
    total: number;
    change: number;
    paid: number;
    pending: number;
    overdue: number;
    cancelled: number;
  };
  clients: {
    total: number;
    change: number;
    active: number;
    new: number;
  };
  documents: {
    processed: number;
    avgAccuracy: number;
    avgProcessingTime: number;
  };
}

export interface RevenueDataPoint {
  month: string;
  year: number;
  value: number;
  previousYearValue: number | null;
}

export interface ActivityItem {
  id: string;
  type: 'invoice' | 'document' | 'payment' | 'user' | 'alert';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, unknown>;
}

export interface GoalProgress {
  name: string;
  current: number;
  target: number;
  unit: string;
  percentComplete: number;
}

export type DateRangeType = '7d' | '30d' | '90d' | '1y';

@Injectable()
export class DashboardAnalyticsService {
  private readonly logger = new Logger(DashboardAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dashboard metrics for an organization
   */
  async getDashboardMetrics(
    organizationId: string,
    dateRange: DateRangeType = '30d',
  ): Promise<DashboardMetrics> {
    this.logger.log(`Getting dashboard metrics for org ${organizationId}, range: ${dateRange}`);

    const { startDate, previousStartDate, previousEndDate } = this.getDateRanges(dateRange);
    const now = new Date();

    // Get current period invoices
    const currentInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
    });

    // Get previous period invoices for comparison
    const previousInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        createdAt: { gte: previousStartDate, lt: previousEndDate },
      },
    });

    // Calculate revenue using grossAmount
    const currentRevenue = currentInvoices.reduce(
      (sum, inv) => sum + (inv.grossAmount?.toNumber() || 0),
      0,
    );
    const previousRevenue = previousInvoices.reduce(
      (sum, inv) => sum + (inv.grossAmount?.toNumber() || 0),
      0,
    );
    const revenueChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    // Invoice stats by status
    const paidInvoices = currentInvoices.filter(inv => inv.paymentStatus === 'PAID').length;
    const pendingInvoices = currentInvoices.filter(inv => inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIAL').length;
    const overdueInvoices = currentInvoices.filter(
      inv => (inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIAL') && inv.dueDate && new Date(inv.dueDate) < now,
    ).length;
    const cancelledInvoices = currentInvoices.filter(inv => inv.status === 'CANCELLED').length;

    const invoiceChange = previousInvoices.length > 0
      ? ((currentInvoices.length - previousInvoices.length) / previousInvoices.length) * 100
      : 0;

    // Get partners (clients) created in current period
    const currentPartners = await this.prisma.partner.count({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
    });

    // Total partners
    const totalPartners = await this.prisma.partner.count({
      where: { organizationId },
    });

    // Partners in previous period
    const previousPartners = await this.prisma.partner.count({
      where: {
        organizationId,
        createdAt: { gte: previousStartDate, lt: previousEndDate },
      },
    });

    const partnerChange = previousPartners > 0
      ? ((currentPartners - previousPartners) / previousPartners) * 100
      : 0;

    // Get document processing stats
    const documents = await this.prisma.document.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
        status: 'COMPLETED',
      },
      select: {
        confidence: true,
        processedAt: true,
        createdAt: true,
      },
    });

    // Calculate average confidence (accuracy)
    const avgAccuracy = documents.length > 0
      ? documents.reduce((sum, doc) => sum + (doc.confidence || 99.0), 0) / documents.length
      : 99.0;

    // Calculate average processing time in seconds
    const avgProcessingTime = documents.length > 0
      ? documents.reduce((sum, doc) => {
          if (doc.processedAt && doc.createdAt) {
            return sum + (doc.processedAt.getTime() - doc.createdAt.getTime()) / 1000;
          }
          return sum + 2.4; // Default processing time
        }, 0) / documents.length
      : 2.4;

    return {
      revenue: {
        total: currentRevenue,
        change: Math.round(revenueChange * 10) / 10,
        currency: 'RON',
      },
      invoices: {
        total: currentInvoices.length,
        change: Math.round(invoiceChange * 10) / 10,
        paid: paidInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices,
        cancelled: cancelledInvoices,
      },
      clients: {
        total: totalPartners,
        change: Math.round(partnerChange * 10) / 10,
        active: totalPartners,
        new: currentPartners,
      },
      documents: {
        processed: documents.length,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
        avgProcessingTime: Math.round(avgProcessingTime * 10) / 10,
      },
    };
  }

  /**
   * Get revenue trend data for charts
   */
  async getRevenueTrend(
    organizationId: string,
    months: number = 6,
  ): Promise<RevenueDataPoint[]> {
    this.logger.log(`Getting revenue trend for org ${organizationId}, months: ${months}`);

    const results: RevenueDataPoint[] = [];
    const now = new Date();

    const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

      // Current year revenue
      const currentYearInvoices = await this.prisma.invoice.findMany({
        where: {
          organizationId,
          createdAt: { gte: monthStart, lte: monthEnd },
          status: { in: ['SUBMITTED', 'APPROVED', 'DRAFT'] },
        },
        select: { grossAmount: true },
      });

      const currentValue = currentYearInvoices.reduce(
        (sum, inv) => sum + (inv.grossAmount?.toNumber() || 0),
        0,
      );

      // Previous year same month
      const prevYearMonthStart = new Date(monthStart);
      prevYearMonthStart.setFullYear(prevYearMonthStart.getFullYear() - 1);
      const prevYearMonthEnd = new Date(monthEnd);
      prevYearMonthEnd.setFullYear(prevYearMonthEnd.getFullYear() - 1);

      const previousYearInvoices = await this.prisma.invoice.findMany({
        where: {
          organizationId,
          createdAt: { gte: prevYearMonthStart, lte: prevYearMonthEnd },
          status: { in: ['SUBMITTED', 'APPROVED', 'DRAFT'] },
        },
        select: { grossAmount: true },
      });

      const previousValue = previousYearInvoices.reduce(
        (sum, inv) => sum + (inv.grossAmount?.toNumber() || 0),
        0,
      );

      results.push({
        month: monthNames[targetDate.getMonth()],
        year: targetDate.getFullYear(),
        value: Math.round(currentValue),
        previousYearValue: previousValue > 0 ? Math.round(previousValue) : null,
      });
    }

    return results;
  }

  /**
   * Get recent activity feed
   */
  async getRecentActivity(
    organizationId: string,
    limit: number = 10,
  ): Promise<ActivityItem[]> {
    this.logger.log(`Getting recent activity for org ${organizationId}`);

    const activities: ActivityItem[] = [];

    // Get recent invoices
    const recentInvoices = await this.prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 3),
    });

    for (const invoice of recentInvoices) {
      activities.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        title: invoice.paymentStatus === 'PAID' ? 'Plată primită' : 'Factură nouă emisă',
        description: `${invoice.invoiceNumber} către ${invoice.partnerName || 'Client'}`,
        timestamp: invoice.createdAt,
        status: invoice.paymentStatus === 'PAID' ? 'success' : invoice.status === 'CANCELLED' ? 'error' : 'info',
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.grossAmount?.toNumber(),
          status: invoice.status,
          paymentStatus: invoice.paymentStatus,
        },
      });
    }

    // Get recent documents
    const recentDocuments = await this.prisma.document.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: Math.ceil(limit / 3),
    });

    for (const doc of recentDocuments) {
      activities.push({
        id: `document-${doc.id}`,
        type: 'document',
        title: 'Document procesat OCR',
        description: `${doc.filename} - ${Math.round(doc.confidence || 99)}% acuratețe`,
        timestamp: doc.createdAt,
        status: doc.status === 'COMPLETED' ? 'success' : doc.status === 'FAILED' ? 'error' : 'info',
        metadata: {
          filename: doc.filename,
          fileType: doc.fileType,
          accuracy: doc.confidence,
          status: doc.status,
        },
      });
    }

    // Sort by timestamp and limit
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, limit);
  }

  /**
   * Get goals progress
   */
  async getGoalsProgress(
    organizationId: string,
  ): Promise<GoalProgress[]> {
    this.logger.log(`Getting goals progress for org ${organizationId}`);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Revenue goal
    const monthlyRevenue = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        createdAt: { gte: monthStart },
        status: { in: ['SUBMITTED', 'APPROVED', 'DRAFT'] },
      },
      _sum: { grossAmount: true },
    });

    const currentRevenue = monthlyRevenue._sum?.grossAmount?.toNumber() || 0;
    const revenueTarget = 50000; // Could be configurable per organization

    // Invoice goal
    const monthlyInvoiceCount = await this.prisma.invoice.count({
      where: {
        organizationId,
        createdAt: { gte: monthStart },
      },
    });

    const invoiceTarget = 150;

    // New clients goal
    const newPartnersCount = await this.prisma.partner.count({
      where: {
        organizationId,
        createdAt: { gte: monthStart },
      },
    });

    const partnersTarget = 10;

    return [
      {
        name: 'Venituri',
        current: Math.round(currentRevenue),
        target: revenueTarget,
        unit: 'RON',
        percentComplete: Math.min(100, Math.round((currentRevenue / revenueTarget) * 100)),
      },
      {
        name: 'Facturi noi',
        current: monthlyInvoiceCount,
        target: invoiceTarget,
        unit: '',
        percentComplete: Math.min(100, Math.round((monthlyInvoiceCount / invoiceTarget) * 100)),
      },
      {
        name: 'Clienți noi',
        current: newPartnersCount,
        target: partnersTarget,
        unit: '',
        percentComplete: Math.min(100, Math.round((newPartnersCount / partnersTarget) * 100)),
      },
    ];
  }

  /**
   * Get date ranges for comparison
   */
  private getDateRanges(dateRange: DateRangeType): {
    startDate: Date;
    previousStartDate: Date;
    previousEndDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(previousEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(previousEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(previousEndDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(previousEndDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(previousEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, previousStartDate, previousEndDate };
  }
}
