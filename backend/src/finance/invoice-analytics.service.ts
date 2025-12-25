import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sprint 14 - US-004: Invoice Analytics & Insights Service
 *
 * Provides analytics and insights for invoices:
 * - Monthly/quarterly/yearly summaries
 * - Revenue trends
 * - Client analysis
 * - Payment behavior patterns
 * - Forecasting
 */

export interface MonthlyStats {
  period: string;
  invoiceCount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  avgInvoiceValue: number;
}

export interface ClientAnalytics {
  clientId: string;
  clientName: string;
  clientCui: string;
  invoiceCount: number;
  totalRevenue: number;
  paidAmount: number;
  outstandingAmount: number;
  avgPaymentDays: number;
  lastInvoiceDate: Date | null;
}

export interface RevenueInsights {
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  revenueGrowth: number;
  invoiceCount: number;
  avgInvoiceValue: number;
  topClients: ClientAnalytics[];
  monthlyTrend: MonthlyStats[];
  paymentDistribution: {
    onTime: number;
    late: number;
    pending: number;
  };
}

export interface InvoiceForecast {
  nextMonth: {
    estimatedRevenue: number;
    estimatedInvoices: number;
    confidence: number;
  };
  nextQuarter: {
    estimatedRevenue: number;
    estimatedInvoices: number;
    confidence: number;
  };
}

@Injectable()
export class InvoiceAnalyticsService {
  private readonly logger = new Logger(InvoiceAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive revenue insights
   */
  async getRevenueInsights(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<RevenueInsights> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), 0, 1); // Start of year
    const end = endDate || now;

    // Get all issued invoices for the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'ISSUED',
        invoiceDate: { gte: start, lte: end },
      },
    });

    // Calculate totals
    const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.grossAmount), 0);
    const totalPaid = invoices.reduce((sum, i) => sum + Number(i.paidAmount), 0);
    const totalOutstanding = totalRevenue - totalPaid;
    const avgInvoiceValue = invoices.length > 0 ? totalRevenue / invoices.length : 0;

    // Calculate growth vs previous period
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(start.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start.getTime() - 1);

    const prevInvoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'ISSUED',
        invoiceDate: { gte: prevStart, lte: prevEnd },
      },
    });
    const prevRevenue = prevInvoices.reduce((sum, i) => sum + Number(i.grossAmount), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Payment distribution
    let onTime = 0;
    let late = 0;
    let pending = 0;

    for (const inv of invoices) {
      if (inv.paymentStatus === 'PAID') {
        if (inv.paidAt && inv.dueDate && inv.paidAt <= inv.dueDate) {
          onTime++;
        } else {
          late++;
        }
      } else {
        pending++;
      }
    }

    // Get top clients
    const topClients = await this.getTopClients(userId, start, end, 5);

    // Get monthly trend
    const monthlyTrend = await this.getMonthlyTrend(userId, start, end);

    return {
      totalRevenue,
      totalPaid,
      totalOutstanding,
      revenueGrowth,
      invoiceCount: invoices.length,
      avgInvoiceValue,
      topClients,
      monthlyTrend,
      paymentDistribution: { onTime, late, pending },
    };
  }

  /**
   * Get top clients by revenue
   */
  async getTopClients(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit = 10,
  ): Promise<ClientAnalytics[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'ISSUED',
        invoiceDate: { gte: startDate, lte: endDate },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Group by partner
    const clientMap = new Map<string, {
      name: string;
      cui: string;
      invoices: typeof invoices;
    }>();

    for (const inv of invoices) {
      const key = inv.partnerCui || inv.partnerName;
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          name: inv.partnerName,
          cui: inv.partnerCui || '',
          invoices: [],
        });
      }
      clientMap.get(key)!.invoices.push(inv);
    }

    // Calculate analytics for each client
    const clients: ClientAnalytics[] = [];
    for (const [key, data] of clientMap) {
      const totalRevenue = data.invoices.reduce((sum, i) => sum + Number(i.grossAmount), 0);
      const paidAmount = data.invoices.reduce((sum, i) => sum + Number(i.paidAmount), 0);

      // Calculate average payment days for paid invoices
      const paidInvoices = data.invoices.filter(
        (i) => i.paymentStatus === 'PAID' && i.paidAt && i.invoiceDate,
      );
      const totalPaymentDays = paidInvoices.reduce((sum, i) => {
        if (i.paidAt && i.invoiceDate) {
          return sum + Math.ceil((i.paidAt.getTime() - i.invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        return sum;
      }, 0);
      const avgPaymentDays = paidInvoices.length > 0 ? Math.round(totalPaymentDays / paidInvoices.length) : 0;

      const lastInvoice = data.invoices[0];

      clients.push({
        clientId: key,
        clientName: data.name,
        clientCui: data.cui,
        invoiceCount: data.invoices.length,
        totalRevenue,
        paidAmount,
        outstandingAmount: totalRevenue - paidAmount,
        avgPaymentDays,
        lastInvoiceDate: lastInvoice?.invoiceDate || null,
      });
    }

    // Sort by revenue and limit
    clients.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return clients.slice(0, limit);
  }

  /**
   * Get monthly invoice trend
   */
  async getMonthlyTrend(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MonthlyStats[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'ISSUED',
        invoiceDate: { gte: startDate, lte: endDate },
      },
    });

    // Group by month
    const monthMap = new Map<string, typeof invoices>();

    for (const inv of invoices) {
      const date = new Date(inv.invoiceDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, []);
      }
      monthMap.get(key)!.push(inv);
    }

    // Calculate stats for each month
    const trend: MonthlyStats[] = [];
    for (const [period, monthInvoices] of monthMap) {
      const totalAmount = monthInvoices.reduce((sum, i) => sum + Number(i.grossAmount), 0);
      const paidAmount = monthInvoices.reduce((sum, i) => sum + Number(i.paidAmount), 0);

      trend.push({
        period,
        invoiceCount: monthInvoices.length,
        totalAmount,
        paidAmount,
        outstandingAmount: totalAmount - paidAmount,
        avgInvoiceValue: monthInvoices.length > 0 ? totalAmount / monthInvoices.length : 0,
      });
    }

    // Sort by period
    trend.sort((a, b) => a.period.localeCompare(b.period));
    return trend;
  }

  /**
   * Get revenue forecast based on historical data
   */
  async getForecast(userId: string): Promise<InvoiceForecast> {
    const now = new Date();

    // Get last 6 months of data
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'ISSUED',
        invoiceDate: { gte: sixMonthsAgo, lte: now },
      },
    });

    // Group by month and calculate averages
    const monthMap = new Map<string, number>();
    for (const inv of invoices) {
      const date = new Date(inv.invoiceDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) || 0) + Number(inv.grossAmount));
    }

    const monthlyValues = Array.from(monthMap.values());
    const avgMonthlyRevenue =
      monthlyValues.length > 0
        ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length
        : 0;

    // Simple trend calculation (slope)
    let trend = 0;
    if (monthlyValues.length >= 2) {
      const recentAvg = (monthlyValues[monthlyValues.length - 1] + monthlyValues[monthlyValues.length - 2]) / 2;
      const olderAvg = monthlyValues.slice(0, Math.ceil(monthlyValues.length / 2))
        .reduce((a, b) => a + b, 0) / Math.ceil(monthlyValues.length / 2);
      trend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
    }

    const avgInvoicesPerMonth =
      invoices.length / (monthMap.size || 1);

    // Calculate confidence based on data availability
    const confidence = Math.min(100, monthlyValues.length * 15);

    return {
      nextMonth: {
        estimatedRevenue: Math.round(avgMonthlyRevenue * (1 + trend)),
        estimatedInvoices: Math.round(avgInvoicesPerMonth),
        confidence: confidence,
      },
      nextQuarter: {
        estimatedRevenue: Math.round(avgMonthlyRevenue * 3 * (1 + trend)),
        estimatedInvoices: Math.round(avgInvoicesPerMonth * 3),
        confidence: Math.max(0, confidence - 20),
      },
    };
  }

  /**
   * Get invoice status distribution
   */
  async getStatusDistribution(userId: string): Promise<{
    draft: number;
    sent: number;
    paid: number;
    partial: number;
    overdue: number;
  }> {
    const now = new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'ISSUED',
      },
      select: {
        status: true,
        paymentStatus: true,
        dueDate: true,
      },
    });

    let draft = 0;
    let sent = 0;
    let paid = 0;
    let partial = 0;
    let overdue = 0;

    for (const inv of invoices) {
      if (inv.paymentStatus === 'PAID') {
        paid++;
      } else if (inv.paymentStatus === 'PARTIAL') {
        partial++;
      } else if (inv.dueDate && inv.dueDate < now) {
        overdue++;
      } else if (inv.status === 'DRAFT') {
        draft++;
      } else {
        sent++;
      }
    }

    return { draft, sent, paid, partial, overdue };
  }

  /**
   * Get VAT summary for a period
   */
  async getVatSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalVatCollected: number;
    totalVatDeductible: number;
    vatBalance: number;
    byRate: { rate: number; collected: number; deductible: number }[];
  }> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || now;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: { gte: start, lte: end },
      },
    });

    const issuedInvoices = invoices.filter((i) => i.type === 'ISSUED');
    const receivedInvoices = invoices.filter((i) => i.type === 'RECEIVED');

    const totalVatCollected = issuedInvoices.reduce((sum, i) => sum + Number(i.vatAmount), 0);
    const totalVatDeductible = receivedInvoices.reduce((sum, i) => sum + Number(i.vatAmount), 0);

    // Group by VAT rate
    const rateMap = new Map<number, { collected: number; deductible: number }>();

    for (const inv of issuedInvoices) {
      const rate = Number(inv.vatRate);
      if (!rateMap.has(rate)) {
        rateMap.set(rate, { collected: 0, deductible: 0 });
      }
      rateMap.get(rate)!.collected += Number(inv.vatAmount);
    }

    for (const inv of receivedInvoices) {
      const rate = Number(inv.vatRate);
      if (!rateMap.has(rate)) {
        rateMap.set(rate, { collected: 0, deductible: 0 });
      }
      rateMap.get(rate)!.deductible += Number(inv.vatAmount);
    }

    const byRate = Array.from(rateMap.entries()).map(([rate, data]) => ({
      rate,
      ...data,
    }));
    byRate.sort((a, b) => b.rate - a.rate);

    return {
      totalVatCollected,
      totalVatDeductible,
      vatBalance: totalVatCollected - totalVatDeductible,
      byRate,
    };
  }
}
