import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Analytics Controller - Root endpoint for analytics overview
 * Provides consolidated analytics data for the dashboard
 */
@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Get analytics overview',
    description: 'Returns consolidated analytics data for the current user',
  })
  @ApiResponse({ status: 200, description: 'Analytics overview retrieved successfully' })
  async getAnalyticsOverview(@Request() req: any) {
    const userId = req.user?.id;

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get previous month date range
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get invoice statistics
    const [invoiceStats, prevInvoiceStats] = await Promise.all([
      this.getInvoiceStats(userId, startOfMonth, endOfMonth),
      this.getInvoiceStats(userId, startOfPrevMonth, endOfPrevMonth),
    ]);

    // Calculate trends
    const revenueTrend = this.calculateTrend(invoiceStats.totalRevenue, prevInvoiceStats.totalRevenue);
    const invoiceCountTrend = this.calculateTrend(invoiceStats.count, prevInvoiceStats.count);

    return {
      summary: {
        period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        revenue: {
          current: invoiceStats.totalRevenue,
          previous: prevInvoiceStats.totalRevenue,
          trend: revenueTrend,
          currency: 'RON',
        },
        invoices: {
          current: invoiceStats.count,
          previous: prevInvoiceStats.count,
          trend: invoiceCountTrend,
          paid: invoiceStats.paidCount,
          pending: invoiceStats.pendingCount,
          overdue: invoiceStats.overdueCount,
        },
        partners: {
          total: await this.getPartnerCount(userId),
          active: await this.getActivePartnerCount(userId),
        },
      },
      charts: {
        revenueByMonth: await this.getRevenueByMonth(userId, 6),
        invoicesByStatus: {
          paid: invoiceStats.paidCount,
          pending: invoiceStats.pendingCount,
          overdue: invoiceStats.overdueCount,
          draft: invoiceStats.draftCount,
        },
      },
      compliance: {
        efacturaSubmitted: invoiceStats.efacturaSubmitted,
        efacturaPending: invoiceStats.efacturaPending,
        vatDue: this.calculateVatDue(invoiceStats.totalRevenue),
      },
      endpoints: {
        dashboard: '/api/v1/analytics/dashboard',
        predictive: '/api/v1/analytics/predictive',
        forecasting: '/api/v1/forecasting',
        anomalyDetection: '/api/v1/anomaly-detection',
      },
    };
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get brief analytics summary',
    description: 'Returns a brief summary of key metrics',
  })
  @ApiQuery({ name: 'period', required: false, description: 'Period (current, previous, year)' })
  async getSummary(
    @Request() req: any,
    @Query('period') period?: string,
  ) {
    const userId = req.user?.id;
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'previous':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const stats = await this.getInvoiceStats(userId, startDate, endDate);

    return {
      period: {
        start: startDate,
        end: endDate,
        label: period || 'current',
      },
      metrics: {
        totalRevenue: stats.totalRevenue,
        totalExpenses: stats.totalExpenses,
        netProfit: stats.totalRevenue - stats.totalExpenses,
        invoiceCount: stats.count,
        averageInvoiceValue: stats.count > 0 ? stats.totalRevenue / stats.count : 0,
      },
      currency: 'RON',
    };
  }

  @Get('kpis')
  @ApiOperation({
    summary: 'Get key performance indicators',
    description: 'Returns KPIs for the business dashboard',
  })
  async getKPIs(@Request() req: any) {
    const userId = req.user?.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const stats = await this.getInvoiceStats(userId, startOfMonth, endOfMonth);
    const targetRevenue = 100000; // Example target

    return {
      kpis: [
        {
          id: 'revenue',
          name: 'Monthly Revenue',
          nameRo: 'Venituri Lunare',
          current: stats.totalRevenue,
          target: targetRevenue,
          achievement: targetRevenue > 0 ? (stats.totalRevenue / targetRevenue) * 100 : 0,
          status: stats.totalRevenue >= targetRevenue ? 'ON_TRACK' : 'AT_RISK',
          unit: 'RON',
        },
        {
          id: 'invoices',
          name: 'Invoices Issued',
          nameRo: 'Facturi Emise',
          current: stats.count,
          target: 50,
          achievement: (stats.count / 50) * 100,
          status: stats.count >= 50 ? 'ON_TRACK' : stats.count >= 35 ? 'AT_RISK' : 'OFF_TRACK',
          unit: 'facturi',
        },
        {
          id: 'collection_rate',
          name: 'Collection Rate',
          nameRo: 'Rata de Incasare',
          current: stats.count > 0 ? (stats.paidCount / stats.count) * 100 : 0,
          target: 85,
          achievement: stats.count > 0 ? ((stats.paidCount / stats.count) / 0.85) * 100 : 0,
          status: (stats.paidCount / stats.count) * 100 >= 85 ? 'ON_TRACK' : 'AT_RISK',
          unit: '%',
        },
        {
          id: 'efactura_compliance',
          name: 'e-Factura Compliance',
          nameRo: 'Conformitate e-Factura',
          current: stats.efacturaSubmitted,
          target: stats.count,
          achievement: stats.count > 0 ? (stats.efacturaSubmitted / stats.count) * 100 : 100,
          status: stats.efacturaPending === 0 ? 'ON_TRACK' : 'AT_RISK',
          unit: 'facturi',
        },
      ],
    };
  }

  private async getInvoiceStats(userId: string, startDate: Date, endDate: Date) {
    const whereClause = {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [invoices, aggregation] = await Promise.all([
      this.prisma.invoice.findMany({
        where: whereClause,
        select: {
          id: true,
          status: true,
          grossAmount: true,
          efacturaStatus: true,
          dueDate: true,
        },
      }),
      this.prisma.invoice.aggregate({
        where: whereClause,
        _sum: { grossAmount: true },
        _count: true,
      }),
    ]);

    const now = new Date();
    const paidCount = invoices.filter(i => i.status === 'PAID').length;
    const pendingCount = invoices.filter(i => i.status === 'PENDING' || i.status === 'SUBMITTED').length;
    const overdueCount = invoices.filter(i =>
      (i.status === 'PENDING' || i.status === 'SUBMITTED') &&
      i.dueDate && new Date(i.dueDate) < now
    ).length;
    const draftCount = invoices.filter(i => i.status === 'DRAFT').length;
    const efacturaSubmitted = invoices.filter(i => i.efacturaStatus === 'ACCEPTED').length;
    const efacturaPending = invoices.filter(i =>
      i.efacturaStatus === 'PENDING' || i.efacturaStatus === 'SUBMITTED'
    ).length;

    return {
      count: aggregation._count || 0,
      totalRevenue: Number(aggregation._sum?.grossAmount) || 0,
      totalExpenses: 0, // Would come from expense tracking module
      paidCount,
      pendingCount,
      overdueCount,
      draftCount,
      efacturaSubmitted,
      efacturaPending,
    };
  }

  private async getPartnerCount(userId: string): Promise<number> {
    return this.prisma.partner.count({ where: { userId } });
  }

  private async getActivePartnerCount(userId: string): Promise<number> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Partners with recent invoices
    const activePartners = await this.prisma.invoice.groupBy({
      by: ['partnerId'],
      where: {
        userId,
        createdAt: { gte: threeMonthsAgo },
      },
    });

    return activePartners.length;
  }

  private async getRevenueByMonth(userId: string, months: number) {
    const result: Array<{ month: string; revenue: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const aggregation = await this.prisma.invoice.aggregate({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { grossAmount: true },
      });

      result.push({
        month: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        revenue: Number(aggregation._sum?.grossAmount) || 0,
      });
    }

    return result;
  }

  private calculateTrend(current: number, previous: number): {
    direction: 'UP' | 'DOWN' | 'STABLE';
    percentage: number;
  } {
    if (previous === 0) {
      return { direction: current > 0 ? 'UP' : 'STABLE', percentage: 0 };
    }

    const percentage = ((current - previous) / previous) * 100;

    if (percentage > 1) {
      return { direction: 'UP', percentage };
    } else if (percentage < -1) {
      return { direction: 'DOWN', percentage };
    } else {
      return { direction: 'STABLE', percentage };
    }
  }

  private calculateVatDue(revenue: number): number {
    // Simplified VAT calculation (19% standard rate)
    return revenue * 0.19;
  }
}
