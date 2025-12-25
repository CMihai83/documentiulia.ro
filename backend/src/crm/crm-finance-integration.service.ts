/**
 * CRM-Finance Integration Service
 * Connects CRM contacts/partners with financial data (invoices, payments)
 * Sprint 26 - Grok Backlog
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CustomerFinancialSummary {
  partnerId: string;
  partnerName: string;
  cui: string | null;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdueAmount: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  pendingInvoiceCount: number;
  overdueInvoiceCount: number;
  averagePaymentDays: number;
  lastInvoiceDate: Date | null;
  lastPaymentDate: Date | null;
  creditScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface PaymentHistory {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  paymentDate: Date | null;
  daysToPayment: number | null;
  status: string;
}

export interface PartnerInsights {
  summary: CustomerFinancialSummary;
  paymentHistory: PaymentHistory[];
  monthlyTrend: {
    month: string;
    invoiced: number;
    paid: number;
  }[];
  recommendations: string[];
}

export interface TopCustomer {
  partnerId: string;
  partnerName: string;
  totalRevenue: number;
  invoiceCount: number;
  averageOrderValue: number;
  lastActivityDate: Date | null;
}

@Injectable()
export class CrmFinanceIntegrationService {
  private readonly logger = new Logger(CrmFinanceIntegrationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get financial summary for a specific partner/customer
   */
  async getCustomerFinancialSummary(
    partnerId: string,
    organizationId?: string,
  ): Promise<CustomerFinancialSummary | null> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        invoices: {
          where: organizationId ? { organizationId } : undefined,
          select: {
            id: true,
            grossAmount: true,
            paidAmount: true,
            status: true,
            invoiceDate: true,
            dueDate: true,
            paidAt: true,
          },
        },
      },
    });

    if (!partner) return null;

    const invoices = partner.invoices || [];
    const now = new Date();

    // Calculate metrics
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.grossAmount) || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
    const outstanding = totalInvoiced - totalPaid;

    const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');
    const pendingInvoices = invoices.filter((inv) => ['DRAFT', 'SENT', 'PENDING'].includes(inv.status));
    const overdueInvoices = invoices.filter(
      (inv) => inv.dueDate && new Date(inv.dueDate) < now && inv.status !== 'PAID',
    );
    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + ((Number(inv.grossAmount) || 0) - (Number(inv.paidAmount) || 0)),
      0,
    );

    // Calculate average payment days
    const paymentDays = paidInvoices
      .filter((inv) => inv.paidAt && inv.invoiceDate)
      .map((inv) => {
        const issueDate = new Date(inv.invoiceDate);
        const paidDate = new Date(inv.paidAt!);
        return Math.ceil((paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24));
      });
    const averagePaymentDays =
      paymentDays.length > 0 ? Math.round(paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length) : 0;

    // Calculate credit score (0-100)
    const creditScore = this.calculateCreditScore(
      invoices.length,
      paidInvoices.length,
      overdueInvoices.length,
      averagePaymentDays,
    );

    // Determine risk level
    const riskLevel = creditScore >= 80 ? 'low' : creditScore >= 50 ? 'medium' : 'high';

    // Get last dates
    const sortedByIssue = [...invoices].sort(
      (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    );
    const sortedByPayment = [...paidInvoices]
      .filter((i) => i.paidAt)
      .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime());

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      cui: partner.cui,
      totalInvoiced,
      totalPaid,
      outstanding,
      overdueAmount,
      invoiceCount: invoices.length,
      paidInvoiceCount: paidInvoices.length,
      pendingInvoiceCount: pendingInvoices.length,
      overdueInvoiceCount: overdueInvoices.length,
      averagePaymentDays,
      lastInvoiceDate: sortedByIssue[0]?.invoiceDate || null,
      lastPaymentDate: sortedByPayment[0]?.paidAt || null,
      creditScore,
      riskLevel,
    };
  }

  /**
   * Get full partner insights including payment history
   */
  async getPartnerInsights(partnerId: string, organizationId?: string): Promise<PartnerInsights | null> {
    const summary = await this.getCustomerFinancialSummary(partnerId, organizationId);
    if (!summary) return null;

    // Get payment history
    const invoices = await this.prisma.invoice.findMany({
      where: {
        partnerId,
        ...(organizationId ? { organizationId } : {}),
      },
      orderBy: { invoiceDate: 'desc' },
      take: 50,
    });

    const paymentHistory: PaymentHistory[] = invoices.map((inv) => {
      const daysToPayment =
        inv.paidAt && inv.invoiceDate
          ? Math.ceil((new Date(inv.paidAt).getTime() - new Date(inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24))
          : null;

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber || inv.id,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate || inv.invoiceDate,
        amount: Number(inv.grossAmount) || 0,
        paidAmount: Number(inv.paidAmount) || 0,
        paymentDate: inv.paidAt,
        daysToPayment,
        status: inv.status,
      };
    });

    // Calculate monthly trend (last 12 months)
    const monthlyTrend = this.calculateMonthlyTrend(invoices);

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, paymentHistory);

    return {
      summary,
      paymentHistory,
      monthlyTrend,
      recommendations,
    };
  }

  /**
   * Get top customers by revenue
   */
  async getTopCustomers(
    organizationId: string,
    limit: number = 10,
    period?: { start: Date; end: Date },
  ): Promise<TopCustomer[]> {
    const whereClause: any = {
      organizationId,
      partner: { type: 'CUSTOMER' },
    };

    if (period) {
      whereClause.invoiceDate = {
        gte: period.start,
        lte: period.end,
      };
    }

    const result = await this.prisma.invoice.groupBy({
      by: ['partnerId'],
      where: whereClause,
      _sum: { grossAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { grossAmount: 'desc' } },
      take: limit,
    });

    // Fetch partner details
    const partnerIds = result.map((r) => r.partnerId).filter(Boolean) as string[];
    const partners = await this.prisma.partner.findMany({
      where: { id: { in: partnerIds } },
      include: {
        invoices: {
          where: { organizationId },
          orderBy: { invoiceDate: 'desc' },
          take: 1,
          select: { invoiceDate: true },
        },
      },
    });

    const partnerMap = new Map(partners.map((p) => [p.id, p]));

    return result
      .filter((r) => r.partnerId)
      .map((r) => {
        const partner = partnerMap.get(r.partnerId!);
        const totalRevenue = Number(r._sum.grossAmount) || 0;
        const invoiceCount = r._count._all;

        return {
          partnerId: r.partnerId!,
          partnerName: partner?.name || 'Unknown',
          totalRevenue,
          invoiceCount,
          averageOrderValue: invoiceCount > 0 ? totalRevenue / invoiceCount : 0,
          lastActivityDate: partner?.invoices[0]?.invoiceDate || null,
        };
      });
  }

  /**
   * Get customers at risk (high overdue or declining payments)
   */
  async getCustomersAtRisk(organizationId: string): Promise<CustomerFinancialSummary[]> {
    const partners = await this.prisma.partner.findMany({
      where: {
        organizationId,
        type: 'CUSTOMER',
        isActive: true,
      },
      select: { id: true },
    });

    const atRiskCustomers: CustomerFinancialSummary[] = [];

    for (const partner of partners) {
      const summary = await this.getCustomerFinancialSummary(partner.id, organizationId);
      if (summary && (summary.riskLevel === 'high' || summary.overdueAmount > 0)) {
        atRiskCustomers.push(summary);
      }
    }

    // Sort by risk (high risk first, then by overdue amount)
    return atRiskCustomers.sort((a, b) => {
      if (a.riskLevel !== b.riskLevel) {
        const riskOrder = { high: 0, medium: 1, low: 2 };
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return b.overdueAmount - a.overdueAmount;
    });
  }

  
  // Private helper methods

  private calculateCreditScore(
    totalInvoices: number,
    paidInvoices: number,
    overdueInvoices: number,
    averagePaymentDays: number,
  ): number {
    if (totalInvoices === 0) return 50; // New customer, neutral score

    let score = 100;

    // Payment rate impact (0-40 points)
    const paymentRate = paidInvoices / totalInvoices;
    score -= (1 - paymentRate) * 40;

    // Overdue rate impact (0-30 points)
    const overdueRate = overdueInvoices / totalInvoices;
    score -= overdueRate * 30;

    // Payment speed impact (0-20 points)
    if (averagePaymentDays > 60) {
      score -= 20;
    } else if (averagePaymentDays > 45) {
      score -= 15;
    } else if (averagePaymentDays > 30) {
      score -= 10;
    } else if (averagePaymentDays > 15) {
      score -= 5;
    }

    // Volume bonus (0-10 points)
    if (totalInvoices >= 20) {
      score += 10;
    } else if (totalInvoices >= 10) {
      score += 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateMonthlyTrend(
    invoices: { invoiceDate: Date; grossAmount: unknown; paidAmount: unknown }[],
  ): { month: string; invoiced: number; paid: number }[] {
    const monthlyData = new Map<string, { invoiced: number; paid: number }>();

    // Get last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, { invoiced: 0, paid: 0 });
    }

    // Aggregate data
    for (const inv of invoices) {
      const date = new Date(inv.invoiceDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData.has(key)) {
        const data = monthlyData.get(key)!;
        data.invoiced += Number(inv.grossAmount) || 0;
        data.paid += Number(inv.paidAmount) || 0;
      }
    }

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));
  }

  private generateRecommendations(summary: CustomerFinancialSummary, history: PaymentHistory[]): string[] {
    const recommendations: string[] = [];

    // Risk-based recommendations
    if (summary.riskLevel === 'high') {
      recommendations.push('Prioritizați colectarea plăților restante înainte de a emite noi facturi');
      recommendations.push('Luați în considerare termene de plată mai scurte sau plată în avans');
    }

    // Overdue recommendations
    if (summary.overdueAmount > 0) {
      recommendations.push(
        `Există ${summary.overdueInvoiceCount} facturi restante totalizând ${summary.overdueAmount.toLocaleString('ro-RO')} RON`,
      );
      if (summary.overdueAmount > summary.outstanding * 0.5) {
        recommendations.push('Trimiteți notificări de plată imediate pentru facturile restante');
      }
    }

    // Payment behavior recommendations
    if (summary.averagePaymentDays > 45) {
      recommendations.push('Clientul plătește în medie după 45+ zile - ajustați fluxul de numerar');
    } else if (summary.averagePaymentDays <= 15) {
      recommendations.push('Client excelent - plătește rapid. Oferiți discount pentru loialitate?');
    }

    // Volume recommendations
    if (summary.invoiceCount >= 10 && summary.riskLevel === 'low') {
      recommendations.push('Client fidel cu istoric bun - eligibil pentru termene extinse sau credit');
    }

    // Revenue recommendations
    if (summary.totalInvoiced > 100000 && summary.riskLevel === 'low') {
      recommendations.push('Client strategic - programați o întâlnire de review și upselling');
    }

    return recommendations;
  }
}
