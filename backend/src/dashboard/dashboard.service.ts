import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardSummaryDto, CashFlowItemDto, VatSummaryItemDto, ComplianceStatusItemDto, RecentActivityItemDto, InvoiceStatusCountDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<DashboardSummaryDto> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Get invoices for cash flow calculation
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        invoiceDate: true,
        grossAmount: true,
        vatAmount: true,
        type: true,
        status: true,
      },
    });

    // Calculate cash flow by month
    const cashFlow = this.calculateCashFlow(invoices, sixMonthsAgo);

    // Calculate VAT totals
    const vatTotals = this.calculateVatTotals(invoices);

    // Get compliance status
    const complianceStatus = await this.getComplianceStatus(userId);

    // Calculate totals
    const totalIncome = invoices
      .filter(inv => inv.type === 'ISSUED')
      .reduce((sum, inv) => sum + Number(inv.grossAmount || 0), 0);

    const totalExpenses = invoices
      .filter(inv => inv.type === 'RECEIVED')
      .reduce((sum, inv) => sum + Number(inv.grossAmount || 0), 0);

    // Count invoices
    const invoiceCount = invoices.length;
    const pendingInvoices = invoices.filter(inv =>
      inv.status === 'PENDING' || inv.status === 'DRAFT'
    ).length;

    // Get recent activity
    const recentActivity = await this.getRecentActivity(userId);

    // Get invoice status breakdown
    const invoiceStatusBreakdown = await this.getInvoiceStatusBreakdown(userId);

    return {
      cashFlow,
      vatSummary: [
        { name: 'TVA Colectat', value: vatTotals.collected, color: '#3b82f6' },
        { name: 'TVA Deductibil', value: vatTotals.deductible, color: '#22c55e' },
        { name: 'TVA de Plată', value: vatTotals.payable, color: '#f59e0b' },
      ],
      complianceStatus,
      recentActivity,
      invoiceStatusBreakdown,
      totalIncome,
      totalExpenses,
      vatCollected: vatTotals.collected,
      vatDeductible: vatTotals.deductible,
      vatPayable: vatTotals.payable,
      invoiceCount,
      pendingInvoices,
    };
  }

  private calculateCashFlow(
    invoices: Array<{ invoiceDate: Date; grossAmount: any; type: string }>,
    startDate: Date
  ): CashFlowItemDto[] {
    const cashFlowMap = new Map<string, { income: number; expenses: number }>();

    // Initialize all months
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      cashFlowMap.set(key, { income: 0, expenses: 0 });
    }

    // Aggregate invoice data
    for (const invoice of invoices) {
      const date = new Date(invoice.invoiceDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const current = cashFlowMap.get(key) || { income: 0, expenses: 0 };

      if (invoice.type === 'ISSUED') {
        current.income += Number(invoice.grossAmount || 0);
      } else {
        current.expenses += Number(invoice.grossAmount || 0);
      }

      cashFlowMap.set(key, current);
    }

    // Convert to array
    const result: CashFlowItemDto[] = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const data = cashFlowMap.get(key) || { income: 0, expenses: 0 };
      result.push({
        month: this.monthNames[date.getMonth()],
        income: Math.round(data.income),
        expenses: Math.round(data.expenses),
      });
    }

    return result;
  }

  private calculateVatTotals(
    invoices: Array<{ vatAmount: any; type: string }>
  ): { collected: number; deductible: number; payable: number } {
    let collected = 0;
    let deductible = 0;

    for (const invoice of invoices) {
      const vat = Number(invoice.vatAmount || 0);
      if (invoice.type === 'ISSUED') {
        collected += vat;
      } else {
        deductible += vat;
      }
    }

    const payable = Math.max(0, collected - deductible);

    return {
      collected: Math.round(collected),
      deductible: Math.round(deductible),
      payable: Math.round(payable),
    };
  }

  private async getComplianceStatus(userId: string): Promise<ComplianceStatusItemDto[]> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check SAF-T status
    const saftReport = await this.prisma.sAFTReport.findFirst({
      where: {
        userId,
        period: {
          contains: currentMonth.slice(0, 7),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check e-Factura status (most recent submission)
    const lastEfactura = await this.prisma.invoice.findFirst({
      where: {
        userId,
        efacturaStatus: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Check VAT declaration status
    const vatReport = await this.prisma.vATReport.findFirst({
      where: {
        userId,
        period: {
          contains: currentMonth.slice(0, 7),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return [
      {
        name: 'SAF-T D406',
        status: saftReport?.status === 'SUBMITTED' ? 'ok' : 'pending',
        date: saftReport?.submittedAt?.toISOString().split('T')[0] || now.toISOString().split('T')[0],
      },
      {
        name: 'e-Factura SPV',
        status: lastEfactura?.efacturaStatus === 'ACCEPTED' ? 'ok' :
                lastEfactura?.efacturaStatus === 'REJECTED' ? 'error' : 'pending',
        date: lastEfactura?.updatedAt?.toISOString().split('T')[0] || now.toISOString().split('T')[0],
      },
      {
        name: 'Declarație TVA',
        status: vatReport?.status === 'SUBMITTED' ? 'ok' : 'pending',
        date: vatReport?.submittedAt?.toISOString().split('T')[0] ||
              new Date(now.getFullYear(), now.getMonth() + 1, 25).toISOString().split('T')[0],
      },
    ];
  }

  private async getRecentActivity(userId: string): Promise<RecentActivityItemDto[]> {
    const activities: RecentActivityItemDto[] = [];

    // Get recent invoices
    const recentInvoices = await this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        partnerName: true,
        grossAmount: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });

    for (const invoice of recentInvoices) {
      const action = invoice.status === 'APPROVED' ? 'aprobată' :
                     invoice.status === 'SUBMITTED' ? 'trimisă' : 'creată';
      activities.push({
        type: 'invoice',
        title: `Factură ${invoice.invoiceNumber} ${action}`,
        description: `${invoice.partnerName || 'Client'} - ${Number(invoice.grossAmount || 0).toLocaleString('ro-RO')} RON`,
        timestamp: invoice.createdAt.toISOString(),
        entityId: invoice.id,
        color: invoice.type === 'ISSUED' ? 'blue' : 'green',
      });
    }

    // Get recent documents
    const recentDocuments = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        filename: true,
        status: true,
        createdAt: true,
      },
    });

    for (const doc of recentDocuments) {
      activities.push({
        type: 'document',
        title: `Document încărcat`,
        description: doc.filename,
        timestamp: doc.createdAt.toISOString(),
        entityId: doc.id,
        color: 'purple',
      });
    }

    // Get recent payments
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        invoice: { userId },
      },
      orderBy: { paymentDate: 'desc' },
      take: 3,
      include: {
        invoice: {
          select: { invoiceNumber: true, partnerName: true },
        },
      },
    });

    for (const payment of recentPayments) {
      activities.push({
        type: 'payment',
        title: `Plată înregistrată`,
        description: `${payment.invoice.partnerName || 'Client'} - ${Number(payment.amount).toLocaleString('ro-RO')} RON`,
        timestamp: payment.paymentDate.toISOString(),
        entityId: payment.id,
        color: 'green',
      });
    }

    // Sort by timestamp and return top 10
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }

  private async getInvoiceStatusBreakdown(userId: string): Promise<InvoiceStatusCountDto[]> {
    const statusCounts = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    const statusColors: Record<string, string> = {
      DRAFT: '#94a3b8',
      PENDING: '#f59e0b',
      APPROVED: '#3b82f6',
      SUBMITTED: '#22c55e',
      CANCELLED: '#6b7280',
    };

    return statusCounts.map(item => ({
      status: item.status,
      count: item._count.status,
      color: statusColors[item.status] || '#6b7280',
    }));
  }

  /**
   * Get quick stats for dashboard cards
   * Returns essential metrics in a single API call
   */
  async getQuickStats(userId: string): Promise<{
    revenue: { current: number; previous: number; change: number };
    expenses: { current: number; previous: number; change: number };
    profit: { current: number; previous: number; change: number };
    invoices: { total: number; pending: number; overdue: number };
    partners: { total: number; active: number };
    vatPayable: number;
    cashBalance: number;
    compliance: {
      saftStatus: 'ok' | 'pending' | 'overdue';
      efacturaStatus: 'ok' | 'pending' | 'error';
      vatStatus: 'ok' | 'pending' | 'overdue';
    };
  }> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get current and previous month invoices in parallel
    const [currentMonthInvoices, previousMonthInvoices, allPendingInvoices, overdueInvoices, partners] = await Promise.all([
      // Current month invoices
      this.prisma.invoice.findMany({
        where: {
          userId,
          invoiceDate: { gte: currentMonthStart },
        },
        select: {
          grossAmount: true,
          vatAmount: true,
          type: true,
          status: true,
        },
      }),
      // Previous month invoices
      this.prisma.invoice.findMany({
        where: {
          userId,
          invoiceDate: {
            gte: previousMonthStart,
            lte: previousMonthEnd,
          },
        },
        select: {
          grossAmount: true,
          vatAmount: true,
          type: true,
        },
      }),
      // Pending invoices count
      this.prisma.invoice.count({
        where: {
          userId,
          status: { in: ['DRAFT', 'PENDING', 'APPROVED'] },
        },
      }),
      // Overdue invoices count
      this.prisma.invoice.count({
        where: {
          userId,
          status: { in: ['DRAFT', 'PENDING', 'APPROVED', 'SUBMITTED'] },
          dueDate: { lt: today },
        },
      }),
      // Partners count
      this.prisma.partner.findMany({
        where: {
          organization: {
            members: {
              some: { userId },
            },
          },
        },
        select: {
          id: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate current month metrics
    const currentRevenue = currentMonthInvoices
      .filter(i => i.type === 'ISSUED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);

    const currentExpenses = currentMonthInvoices
      .filter(i => i.type === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);

    const currentVatCollected = currentMonthInvoices
      .filter(i => i.type === 'ISSUED')
      .reduce((sum, i) => sum + Number(i.vatAmount), 0);

    const currentVatDeductible = currentMonthInvoices
      .filter(i => i.type === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.vatAmount), 0);

    // Calculate previous month metrics
    const previousRevenue = previousMonthInvoices
      .filter(i => i.type === 'ISSUED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);

    const previousExpenses = previousMonthInvoices
      .filter(i => i.type === 'RECEIVED')
      .reduce((sum, i) => sum + Number(i.grossAmount), 0);

    // Calculate change percentages
    const revenueChange = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

    const expensesChange = previousExpenses > 0
      ? Math.round(((currentExpenses - previousExpenses) / previousExpenses) * 100)
      : 0;

    const currentProfit = currentRevenue - currentExpenses;
    const previousProfit = previousRevenue - previousExpenses;
    const profitChange = previousProfit !== 0
      ? Math.round(((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100)
      : 0;

    // Check compliance status
    const complianceStatus = await this.getComplianceStatus(userId);

    // Count active partners (created in last 90 days or with recent invoices)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const activePartners = partners.filter(p => new Date(p.createdAt) > ninetyDaysAgo).length;

    return {
      revenue: {
        current: Math.round(currentRevenue),
        previous: Math.round(previousRevenue),
        change: revenueChange,
      },
      expenses: {
        current: Math.round(currentExpenses),
        previous: Math.round(previousExpenses),
        change: expensesChange,
      },
      profit: {
        current: Math.round(currentProfit),
        previous: Math.round(previousProfit),
        change: profitChange,
      },
      invoices: {
        total: currentMonthInvoices.length,
        pending: allPendingInvoices,
        overdue: overdueInvoices,
      },
      partners: {
        total: partners.length,
        active: activePartners,
      },
      vatPayable: Math.max(0, Math.round(currentVatCollected - currentVatDeductible)),
      cashBalance: Math.round(currentRevenue - currentExpenses),
      compliance: {
        saftStatus: complianceStatus.find(c => c.name.includes('SAF-T'))?.status as 'ok' | 'pending' | 'overdue' || 'pending',
        efacturaStatus: complianceStatus.find(c => c.name.includes('e-Factura'))?.status as 'ok' | 'pending' | 'error' || 'pending',
        vatStatus: complianceStatus.find(c => c.name.includes('TVA'))?.status as 'ok' | 'pending' | 'overdue' || 'pending',
      },
    };
  }
}
