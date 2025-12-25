import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReportQueryDto,
  ProfitLossReportDto,
  BalanceSheetReportDto,
  CashFlowReportDto,
  FinancialSummaryDto,
  TrendDataDto,
} from './dto/reports.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  private getDateRange(query: ReportQueryDto): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (query.startDate && query.endDate) {
      start = new Date(query.startDate);
      end = new Date(query.endDate);
    } else {
      // Default to current month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { start, end };
  }

  private getPreviousPeriodRange(start: Date, end: Date): { start: Date; end: Date } {
    const duration = end.getTime() - start.getTime();
    return {
      start: new Date(start.getTime() - duration),
      end: new Date(end.getTime() - duration),
    };
  }

  async getProfitLossReport(userId: string, query: ReportQueryDto): Promise<ProfitLossReportDto> {
    const { start, end } = this.getDateRange(query);
    const previousPeriod = this.getPreviousPeriodRange(start, end);
    const currency = query.currency || 'RON';

    // OPTIMIZED: Get all invoices for both periods in a single query (TD-004)
    // Reduces 4 queries to 1 query with field selection
    const allInvoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: { gte: previousPeriod.start, lte: end },
        ...(currency !== 'ALL' && { currency }),
      },
      select: {
        type: true,
        invoiceDate: true,
        netAmount: true,
        vatAmount: true,
        partnerName: true,
      },
    });

    // Split invoices by period and type in application code
    const issuedInvoices = allInvoices.filter(
      inv => inv.type === 'ISSUED' && inv.invoiceDate >= start && inv.invoiceDate <= end
    );
    const receivedInvoices = allInvoices.filter(
      inv => inv.type === 'RECEIVED' && inv.invoiceDate >= start && inv.invoiceDate <= end
    );
    const prevIssued = allInvoices.filter(
      inv => inv.type === 'ISSUED' && inv.invoiceDate >= previousPeriod.start && inv.invoiceDate <= previousPeriod.end
    );
    const prevReceived = allInvoices.filter(
      inv => inv.type === 'RECEIVED' && inv.invoiceDate >= previousPeriod.start && inv.invoiceDate <= previousPeriod.end
    );

    // Calculate revenue by category (partnerName as category for now)
    const revenueByPartner = new Map<string, number>();
    let totalRevenue = 0;
    let vatCollected = 0;

    for (const inv of issuedInvoices) {
      const net = Number(inv.netAmount);
      totalRevenue += net;
      vatCollected += Number(inv.vatAmount);
      const current = revenueByPartner.get(inv.partnerName) || 0;
      revenueByPartner.set(inv.partnerName, current + net);
    }

    // Calculate expenses by category
    const expensesByPartner = new Map<string, number>();
    let totalExpenses = 0;
    let vatDeductible = 0;

    for (const inv of receivedInvoices) {
      const net = Number(inv.netAmount);
      totalExpenses += net;
      vatDeductible += Number(inv.vatAmount);
      const current = expensesByPartner.get(inv.partnerName) || 0;
      expensesByPartner.set(inv.partnerName, current + net);
    }

    // Previous period totals
    const prevTotalRevenue = prevIssued.reduce((sum, inv) => sum + Number(inv.netAmount), 0);
    const prevTotalExpenses = prevReceived.reduce((sum, inv) => sum + Number(inv.netAmount), 0);
    const prevNetProfit = prevTotalRevenue - prevTotalExpenses;

    // Build revenue items (top 10)
    const revenueItems = Array.from(revenueByPartner.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([partner, amount]) => ({
        category: 'Vanzari',
        label: partner,
        amount,
        percentChange: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
      }));

    // Build expense items (top 10)
    const expenseItems = Array.from(expensesByPartner.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([partner, amount]) => ({
        category: 'Achizitii',
        label: partner,
        amount,
        percentChange: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }));

    const grossProfit = totalRevenue - totalExpenses;
    const vatPayable = vatCollected - vatDeductible;
    const netProfit = grossProfit;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      currency,
      revenue: revenueItems,
      totalRevenue,
      expenses: expenseItems,
      totalExpenses,
      grossProfit,
      vatCollected,
      vatDeductible,
      vatPayable,
      netProfit,
      profitMargin,
      previousPeriod: {
        totalRevenue: prevTotalRevenue,
        totalExpenses: prevTotalExpenses,
        netProfit: prevNetProfit,
      },
    };
  }

  async getBalanceSheet(userId: string, query: ReportQueryDto): Promise<BalanceSheetReportDto> {
    const asOfDate = query.endDate ? new Date(query.endDate) : new Date();
    const currency = query.currency || 'RON';

    // Get all invoices up to the date
    const [issuedInvoices, receivedInvoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          userId,
          type: 'ISSUED',
          invoiceDate: { lte: asOfDate },
          ...(currency !== 'ALL' && { currency }),
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          userId,
          type: 'RECEIVED',
          invoiceDate: { lte: asOfDate },
          ...(currency !== 'ALL' && { currency }),
        },
      }),
      this.prisma.payment.findMany({
        where: {
          invoice: {
            userId,
          },
          paymentDate: { lte: asOfDate },
        },
      }),
    ]);

    // Calculate receivables (issued invoices - payments received)
    const totalIssued = issuedInvoices.reduce((sum, inv) => sum + Number(inv.grossAmount), 0);
    const receivedPayments = payments
      .filter((p) => issuedInvoices.some((inv) => inv.id === p.invoiceId))
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const accountsReceivable = totalIssued - receivedPayments;

    // Calculate payables (received invoices - payments made)
    const totalReceived = receivedInvoices.reduce((sum, inv) => sum + Number(inv.grossAmount), 0);
    const madePayments = payments
      .filter((p) => receivedInvoices.some((inv) => inv.id === p.invoiceId))
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const accountsPayable = totalReceived - madePayments;

    // VAT position
    const vatCollected = issuedInvoices.reduce((sum, inv) => sum + Number(inv.vatAmount), 0);
    const vatDeductible = receivedInvoices.reduce((sum, inv) => sum + Number(inv.vatAmount), 0);
    const vatPayable = vatCollected - vatDeductible;

    // Simplified balance sheet based on invoice data
    const currentAssets = [
      { code: '4111', label: 'Clienti (Accounts Receivable)', amount: accountsReceivable },
      { code: '4423', label: 'TVA de recuperat', amount: vatPayable < 0 ? Math.abs(vatPayable) : 0 },
    ];

    const fixedAssets = [
      { code: '2xxx', label: 'Active imobilizate', amount: 0 }, // Placeholder
    ];

    const currentLiabilities = [
      { code: '401', label: 'Furnizori (Accounts Payable)', amount: accountsPayable },
      { code: '4423', label: 'TVA de plata', amount: vatPayable > 0 ? vatPayable : 0 },
    ];

    const longTermLiabilities = [
      { code: '162', label: 'Credite bancare pe termen lung', amount: 0 }, // Placeholder
    ];

    // Calculate retained earnings (simplified: total revenue - total expenses)
    const totalRevenue = issuedInvoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0);
    const totalExpenses = receivedInvoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0);
    const retainedEarnings = totalRevenue - totalExpenses;

    const equity = [
      { code: '1012', label: 'Capital subscris varsat', amount: 0 }, // Placeholder
      { code: '121', label: 'Profit/Pierdere cumulat', amount: retainedEarnings },
    ];

    const totalCurrentAssets = currentAssets.reduce((sum, item) => sum + item.amount, 0);
    const totalFixedAssets = fixedAssets.reduce((sum, item) => sum + item.amount, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    const totalCurrentLiabilities = currentLiabilities.reduce((sum, item) => sum + item.amount, 0);
    const totalLongTermLiabilities = longTermLiabilities.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    const totalEquity = equity.reduce((sum, item) => sum + item.amount, 0);

    // Check if balanced (Assets = Liabilities + Equity)
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    return {
      asOfDate: asOfDate.toISOString().split('T')[0],
      currency,
      currentAssets,
      totalCurrentAssets,
      fixedAssets,
      totalFixedAssets,
      totalAssets,
      currentLiabilities,
      totalCurrentLiabilities,
      longTermLiabilities,
      totalLongTermLiabilities,
      totalLiabilities,
      equity,
      totalEquity,
      isBalanced,
    };
  }

  async getCashFlowReport(userId: string, query: ReportQueryDto): Promise<CashFlowReportDto> {
    const { start, end } = this.getDateRange(query);
    const currency = query.currency || 'RON';

    // Get payments in the period
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: {
          userId,
          ...(currency !== 'ALL' && { currency }),
        },
        paymentDate: { gte: start, lte: end },
      },
      include: {
        invoice: true,
      },
    });

    // Cash from customers (payments on issued invoices)
    const cashFromCustomers = payments
      .filter((p) => p.invoice.type === 'ISSUED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Cash to suppliers (payments on received invoices)
    const cashToSuppliers = payments
      .filter((p) => p.invoice.type === 'RECEIVED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Get VAT reports for the period
    const vatReports = await this.prisma.vATReport.findMany({
      where: {
        userId,
        period: {
          gte: start.toISOString().slice(0, 7),
          lte: end.toISOString().slice(0, 7),
        },
      },
    });

    const vatPaid = vatReports
      .filter((r) => r.status === 'SUBMITTED')
      .reduce((sum, r) => sum + Math.max(0, Number(r.vatPayable)), 0);

    const operatingActivities = {
      cashFromCustomers,
      cashToSuppliers,
      cashToEmployees: 0, // Placeholder - would need payroll integration
      vatPaid,
      netOperating: cashFromCustomers - cashToSuppliers - vatPaid,
    };

    // Simplified - no investing or financing activities tracked yet
    const investingActivities = {
      purchaseOfAssets: 0,
      saleOfAssets: 0,
      netInvesting: 0,
    };

    const financingActivities = {
      loansReceived: 0,
      loansRepaid: 0,
      dividendsPaid: 0,
      netFinancing: 0,
    };

    const netCashFlow =
      operatingActivities.netOperating +
      investingActivities.netInvesting +
      financingActivities.netFinancing;

    // Opening balance would need a cash account - simplified to 0
    const openingBalance = 0;
    const closingBalance = openingBalance + netCashFlow;

    return {
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      },
      currency,
      operatingActivities,
      investingActivities,
      financingActivities,
      netCashFlow,
      openingBalance,
      closingBalance,
    };
  }

  async getFinancialSummary(userId: string, query: ReportQueryDto): Promise<FinancialSummaryDto> {
    const { start, end } = this.getDateRange(query);
    const now = new Date();

    // Current period data
    const [issuedInvoices, receivedInvoices, overdueInvoices] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          userId,
          type: 'ISSUED',
          invoiceDate: { gte: start, lte: end },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          userId,
          type: 'RECEIVED',
          invoiceDate: { gte: start, lte: end },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          userId,
          type: 'ISSUED',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
          dueDate: { lt: now },
        },
      }),
    ]);

    const revenue = issuedInvoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0);
    const expenses = receivedInvoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0);
    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const paymentsPending = issuedInvoices.filter(
      (inv) => inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIAL',
    ).length;
    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.grossAmount) - Number(inv.paidAmount),
      0,
    );

    // Get 12-month trends - OPTIMIZED: Single batched query instead of 36 queries (TD-004)
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const trendEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch all invoices for the 12-month period in a single query with only needed fields
    const [trendInvoices, vatReports] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          userId,
          invoiceDate: { gte: trendStart, lte: trendEnd },
        },
        select: {
          type: true,
          invoiceDate: true,
          netAmount: true,
          vatAmount: true,
        },
      }),
      this.prisma.vATReport.findMany({
        where: {
          userId,
          period: {
            gte: trendStart.toISOString().slice(0, 7),
            lte: trendEnd.toISOString().slice(0, 7),
          },
        },
        select: {
          period: true,
          vatPayable: true,
        },
      }),
    ]);

    // Create VAT lookup map for O(1) access
    const vatMap = new Map(vatReports.map(v => [v.period, Number(v.vatPayable)]));

    // Aggregate invoices by month in application code
    const monthlyData = new Map<string, { revenue: number; expenses: number }>();
    for (const inv of trendInvoices) {
      const period = inv.invoiceDate.toISOString().slice(0, 7);
      const existing = monthlyData.get(period) || { revenue: 0, expenses: 0 };
      if (inv.type === 'ISSUED') {
        existing.revenue += Number(inv.netAmount);
      } else {
        existing.expenses += Number(inv.netAmount);
      }
      monthlyData.set(period, existing);
    }

    // Build trends array for last 12 months
    const trends: TrendDataDto[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = monthDate.toISOString().slice(0, 7);
      const data = monthlyData.get(period) || { revenue: 0, expenses: 0 };

      trends.push({
        period,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
        vatPayable: vatMap.get(period) || 0,
      });
    }

    // Top customers
    const customerStats = await this.prisma.invoice.groupBy({
      by: ['partnerName', 'partnerCui'],
      where: {
        userId,
        type: 'ISSUED',
        invoiceDate: { gte: start, lte: end },
      },
      _sum: { grossAmount: true },
      _count: true,
      orderBy: { _sum: { grossAmount: 'desc' } },
      take: 5,
    });

    // Top suppliers
    const supplierStats = await this.prisma.invoice.groupBy({
      by: ['partnerName', 'partnerCui'],
      where: {
        userId,
        type: 'RECEIVED',
        invoiceDate: { gte: start, lte: end },
      },
      _sum: { grossAmount: true },
      _count: true,
      orderBy: { _sum: { grossAmount: 'desc' } },
      take: 5,
    });

    return {
      currentPeriod: {
        revenue,
        expenses,
        profit,
        profitMargin,
        invoicesIssued: issuedInvoices.length,
        invoicesReceived: receivedInvoices.length,
        paymentsPending,
        overdueAmount,
      },
      trends,
      topCustomers: customerStats.map((c) => ({
        name: c.partnerName,
        cui: c.partnerCui || '',
        totalAmount: Number(c._sum.grossAmount || 0),
        invoiceCount: c._count,
      })),
      topSuppliers: supplierStats.map((s) => ({
        name: s.partnerName,
        cui: s.partnerCui || '',
        totalAmount: Number(s._sum.grossAmount || 0),
        invoiceCount: s._count,
      })),
    };
  }

  async getMonthlyComparison(userId: string, year: number) {
    const months = [];

    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const period = start.toISOString().slice(0, 7);

      const [issued, received] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            userId,
            type: 'ISSUED',
            invoiceDate: { gte: start, lte: end },
          },
          _sum: { netAmount: true, vatAmount: true, grossAmount: true },
          _count: true,
        }),
        this.prisma.invoice.aggregate({
          where: {
            userId,
            type: 'RECEIVED',
            invoiceDate: { gte: start, lte: end },
          },
          _sum: { netAmount: true, vatAmount: true, grossAmount: true },
          _count: true,
        }),
      ]);

      const revenue = Number(issued._sum.netAmount || 0);
      const expenses = Number(received._sum.netAmount || 0);
      const vatCollected = Number(issued._sum.vatAmount || 0);
      const vatDeductible = Number(received._sum.vatAmount || 0);

      months.push({
        period,
        month: month + 1,
        monthName: new Intl.DateTimeFormat('ro-RO', { month: 'long' }).format(start),
        revenue,
        expenses,
        profit: revenue - expenses,
        vatCollected,
        vatDeductible,
        vatPayable: vatCollected - vatDeductible,
        invoicesIssued: issued._count,
        invoicesReceived: received._count,
      });
    }

    // Calculate year totals
    const totals = months.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        expenses: acc.expenses + m.expenses,
        profit: acc.profit + m.profit,
        vatCollected: acc.vatCollected + m.vatCollected,
        vatDeductible: acc.vatDeductible + m.vatDeductible,
        vatPayable: acc.vatPayable + m.vatPayable,
        invoicesIssued: acc.invoicesIssued + m.invoicesIssued,
        invoicesReceived: acc.invoicesReceived + m.invoicesReceived,
      }),
      {
        revenue: 0,
        expenses: 0,
        profit: 0,
        vatCollected: 0,
        vatDeductible: 0,
        vatPayable: 0,
        invoicesIssued: 0,
        invoicesReceived: 0,
      },
    );

    return {
      year,
      months,
      totals,
      averages: {
        revenue: totals.revenue / 12,
        expenses: totals.expenses / 12,
        profit: totals.profit / 12,
      },
    };
  }

  /**
   * Get invoice aging report
   * Groups unpaid invoices by aging buckets (0-30, 31-60, 61-90, 90+ days)
   */
  async getAgingReport(userId: string, type: 'ISSUED' | 'RECEIVED' = 'ISSUED') {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Get all unpaid invoices
    const unpaidInvoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type,
        status: { in: ['DRAFT', 'PENDING', 'APPROVED', 'SUBMITTED'] },
        dueDate: { not: null },
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Define aging buckets
    const agingBuckets = {
      current: { min: -Infinity, max: 0, label: 'Curente', invoices: [] as any[], total: 0 },
      days0to30: { min: 0, max: 30, label: '0-30 zile', invoices: [] as any[], total: 0 },
      days31to60: { min: 30, max: 60, label: '31-60 zile', invoices: [] as any[], total: 0 },
      days61to90: { min: 60, max: 90, label: '61-90 zile', invoices: [] as any[], total: 0 },
      over90: { min: 90, max: Infinity, label: '90+ zile', invoices: [] as any[], total: 0 },
    };

    let totalOutstanding = 0;
    let totalOverdue = 0;

    // Categorize invoices into buckets
    for (const invoice of unpaidInvoices) {
      if (!invoice.dueDate) continue;

      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const outstanding = Number(invoice.grossAmount) - Number(invoice.paidAmount || 0);

      if (outstanding <= 0) continue;

      totalOutstanding += outstanding;

      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate.toISOString().split('T')[0],
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        partnerName: invoice.partnerName,
        partnerCui: invoice.partnerCui,
        partner: invoice.partner,
        grossAmount: Number(invoice.grossAmount),
        paidAmount: Number(invoice.paidAmount || 0),
        outstanding,
        currency: invoice.currency,
        daysOverdue: Math.max(0, daysOverdue),
      };

      if (daysOverdue < 0) {
        // Not yet due
        agingBuckets.current.invoices.push(invoiceData);
        agingBuckets.current.total += outstanding;
      } else if (daysOverdue <= 30) {
        agingBuckets.days0to30.invoices.push(invoiceData);
        agingBuckets.days0to30.total += outstanding;
        totalOverdue += outstanding;
      } else if (daysOverdue <= 60) {
        agingBuckets.days31to60.invoices.push(invoiceData);
        agingBuckets.days31to60.total += outstanding;
        totalOverdue += outstanding;
      } else if (daysOverdue <= 90) {
        agingBuckets.days61to90.invoices.push(invoiceData);
        agingBuckets.days61to90.total += outstanding;
        totalOverdue += outstanding;
      } else {
        agingBuckets.over90.invoices.push(invoiceData);
        agingBuckets.over90.total += outstanding;
        totalOverdue += outstanding;
      }
    }

    // Calculate percentages
    const buckets = Object.entries(agingBuckets).map(([key, bucket]) => ({
      key,
      label: bucket.label,
      total: bucket.total,
      count: bucket.invoices.length,
      percentage: totalOutstanding > 0 ? (bucket.total / totalOutstanding) * 100 : 0,
      invoices: bucket.invoices.slice(0, 10), // Limit to first 10 for display
    }));

    // Get partner breakdown
    const partnerTotals = new Map<string, { name: string; total: number; count: number }>();
    for (const invoice of unpaidInvoices) {
      const outstanding = Number(invoice.grossAmount) - Number(invoice.paidAmount || 0);
      if (outstanding <= 0) continue;

      const key = invoice.partnerCui || invoice.partnerName;
      const existing = partnerTotals.get(key) || { name: invoice.partnerName, total: 0, count: 0 };
      existing.total += outstanding;
      existing.count++;
      partnerTotals.set(key, existing);
    }

    const topDebtors = Array.from(partnerTotals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Calculate average days outstanding
    let totalDays = 0;
    let overdueCount = 0;
    for (const invoice of unpaidInvoices) {
      if (!invoice.dueDate) continue;
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue > 0) {
        totalDays += daysOverdue;
        overdueCount++;
      }
    }

    const averageDaysOverdue = overdueCount > 0 ? Math.round(totalDays / overdueCount) : 0;

    return {
      reportType: type === 'ISSUED' ? 'Receivables' : 'Payables',
      reportDate: now.toISOString().split('T')[0],
      summary: {
        totalOutstanding,
        totalOverdue,
        totalCurrent: agingBuckets.current.total,
        invoiceCount: unpaidInvoices.length,
        overdueCount: overdueCount,
        averageDaysOverdue,
        currency: 'RON', // Primary currency
      },
      buckets,
      topDebtors,
      // Chart data for visualization
      chartData: {
        labels: buckets.map(b => b.label),
        values: buckets.map(b => b.total),
        counts: buckets.map(b => b.count),
        colors: ['#22c55e', '#eab308', '#f97316', '#ef4444', '#dc2626'],
      },
    };
  }
}
