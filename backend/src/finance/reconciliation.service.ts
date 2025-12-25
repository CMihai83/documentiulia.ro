import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Sprint 14 - US-001: Automated Invoice Reconciliation Service
 *
 * Provides comprehensive invoice reconciliation features:
 * - Automatic matching of invoices with payments
 * - Bank statement reconciliation
 * - Discrepancy detection
 * - Partial payment support
 * - Aging analysis
 */

export interface ReconciliationMatch {
  invoiceId: string;
  paymentId: string;
  invoiceNumber: string;
  paymentReference: string;
  invoiceAmount: number;
  paymentAmount: number;
  matchConfidence: number; // 0-100
  matchType: 'exact' | 'partial' | 'reference' | 'amount' | 'manual';
  discrepancy: number;
  status: 'matched' | 'partial' | 'unmatched' | 'overpaid';
}

export interface ReconciliationResult {
  success: boolean;
  period: string;
  summary: {
    totalInvoices: number;
    totalPayments: number;
    matchedCount: number;
    partialCount: number;
    unmatchedInvoices: number;
    unmatchedPayments: number;
    totalInvoiceAmount: number;
    totalPaymentAmount: number;
    totalReconciled: number;
    discrepancyAmount: number;
  };
  matches: ReconciliationMatch[];
  unmatchedInvoices: any[];
  unmatchedPayments: any[];
  alerts: ReconciliationAlert[];
  reconciledAt: Date;
}

export interface ReconciliationAlert {
  type: 'warning' | 'error' | 'info';
  code: string;
  message: string;
  relatedId?: string;
  amount?: number;
}

export interface AgingReport {
  period: string;
  summary: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days90Plus: number;
    total: number;
  };
  invoices: {
    id: string;
    invoiceNumber: string;
    partnerName: string;
    dueDate: Date;
    amount: number;
    paidAmount: number;
    outstanding: number;
    daysOverdue: number;
    bucket: 'current' | '1-30' | '31-60' | '61-90' | '90+';
  }[];
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Run automatic reconciliation for a user's invoices and payments
   */
  async runReconciliation(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ReconciliationResult> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const period = `${start.toISOString().split('T')[0]} - ${end.toISOString().split('T')[0]}`;

    this.logger.log(`Running reconciliation for user ${userId}, period: ${period}`);

    // Fetch invoices and payments
    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          userId,
          invoiceDate: { gte: start, lte: end },
          type: 'ISSUED',
        },
        orderBy: { invoiceDate: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: {
          invoice: { userId },
          paymentDate: { gte: start, lte: end },
        },
        include: { invoice: true },
      }),
    ]);

    const matches: ReconciliationMatch[] = [];
    const alerts: ReconciliationAlert[] = [];
    const matchedInvoiceIds = new Set<string>();
    const matchedPaymentIds = new Set<string>();

    // Phase 1: Exact matches by invoice ID (payments already linked)
    for (const payment of payments) {
      if (payment.invoiceId && !matchedPaymentIds.has(payment.id)) {
        const invoice = invoices.find((i) => i.id === payment.invoiceId);
        if (invoice) {
          const invoiceAmount = Number(invoice.grossAmount);
          const paymentAmount = Number(payment.amount);
          const discrepancy = invoiceAmount - paymentAmount;

          matches.push({
            invoiceId: invoice.id,
            paymentId: payment.id,
            invoiceNumber: invoice.invoiceNumber,
            paymentReference: payment.reference || payment.id,
            invoiceAmount,
            paymentAmount,
            matchConfidence: 100,
            matchType: 'exact',
            discrepancy,
            status:
              discrepancy === 0
                ? 'matched'
                : discrepancy > 0
                ? 'partial'
                : 'overpaid',
          });

          matchedInvoiceIds.add(invoice.id);
          matchedPaymentIds.add(payment.id);
        }
      }
    }

    // Phase 2: Match by reference (invoice number in payment reference)
    const unmatchedPayments = payments.filter((p) => !matchedPaymentIds.has(p.id));
    for (const payment of unmatchedPayments) {
      if (payment.reference) {
        const matchingInvoice = invoices.find(
          (i) =>
            !matchedInvoiceIds.has(i.id) &&
            (payment.reference?.includes(i.invoiceNumber) ||
              i.invoiceNumber.includes(payment.reference || '')),
        );

        if (matchingInvoice) {
          const invoiceAmount = Number(matchingInvoice.grossAmount);
          const paymentAmount = Number(payment.amount);
          const discrepancy = invoiceAmount - paymentAmount;

          matches.push({
            invoiceId: matchingInvoice.id,
            paymentId: payment.id,
            invoiceNumber: matchingInvoice.invoiceNumber,
            paymentReference: payment.reference,
            invoiceAmount,
            paymentAmount,
            matchConfidence: 85,
            matchType: 'reference',
            discrepancy,
            status:
              discrepancy === 0
                ? 'matched'
                : discrepancy > 0
                ? 'partial'
                : 'overpaid',
          });

          matchedInvoiceIds.add(matchingInvoice.id);
          matchedPaymentIds.add(payment.id);
        }
      }
    }

    // Phase 3: Match by amount (exact amount match)
    const stillUnmatchedPayments = payments.filter(
      (p) => !matchedPaymentIds.has(p.id),
    );
    for (const payment of stillUnmatchedPayments) {
      const matchingInvoice = invoices.find(
        (i) =>
          !matchedInvoiceIds.has(i.id) &&
          Math.abs(Number(i.grossAmount) - Number(payment.amount)) < 0.01,
      );

      if (matchingInvoice) {
        matches.push({
          invoiceId: matchingInvoice.id,
          paymentId: payment.id,
          invoiceNumber: matchingInvoice.invoiceNumber,
          paymentReference: payment.reference || payment.id,
          invoiceAmount: Number(matchingInvoice.grossAmount),
          paymentAmount: Number(payment.amount),
          matchConfidence: 70,
          matchType: 'amount',
          discrepancy: 0,
          status: 'matched',
        });

        matchedInvoiceIds.add(matchingInvoice.id);
        matchedPaymentIds.add(payment.id);

        alerts.push({
          type: 'info',
          code: 'AMOUNT_MATCH',
          message: `Factura ${matchingInvoice.invoiceNumber} potrivita cu plata dupa suma`,
          relatedId: matchingInvoice.id,
        });
      }
    }

    // Calculate unmatched items
    const unmatchedInvoicesList = invoices.filter(
      (i) => !matchedInvoiceIds.has(i.id),
    );
    const unmatchedPaymentsList = payments.filter(
      (p) => !matchedPaymentIds.has(p.id),
    );

    // Generate alerts for old unmatched invoices
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const invoice of unmatchedInvoicesList) {
      if (invoice.invoiceDate < thirtyDaysAgo) {
        alerts.push({
          type: 'warning',
          code: 'OLD_UNMATCHED',
          message: `Factura ${invoice.invoiceNumber} este neincasata de peste 30 zile`,
          relatedId: invoice.id,
          amount: Number(invoice.grossAmount),
        });
      }
    }

    // Calculate summary
    const totalInvoiceAmount = invoices.reduce(
      (sum, i) => sum + Number(i.grossAmount),
      0,
    );
    const totalPaymentAmount = payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const totalReconciled = matches.reduce((sum, m) => sum + m.paymentAmount, 0);
    const discrepancyAmount = totalInvoiceAmount - totalReconciled;

    return {
      success: true,
      period,
      summary: {
        totalInvoices: invoices.length,
        totalPayments: payments.length,
        matchedCount: matches.filter((m) => m.status === 'matched').length,
        partialCount: matches.filter((m) => m.status === 'partial').length,
        unmatchedInvoices: unmatchedInvoicesList.length,
        unmatchedPayments: unmatchedPaymentsList.length,
        totalInvoiceAmount,
        totalPaymentAmount,
        totalReconciled,
        discrepancyAmount,
      },
      matches,
      unmatchedInvoices: unmatchedInvoicesList.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        invoiceDate: i.invoiceDate,
        partnerName: i.partnerName,
        amount: Number(i.grossAmount),
        dueDate: i.dueDate,
      })),
      unmatchedPayments: unmatchedPaymentsList.map((p) => ({
        id: p.id,
        reference: p.reference,
        paymentDate: p.paymentDate,
        amount: Number(p.amount),
        method: p.method,
      })),
      alerts,
      reconciledAt: new Date(),
    };
  }

  /**
   * Manually match an invoice with a payment
   */
  async manualMatch(
    userId: string,
    invoiceId: string,
    paymentId: string,
  ): Promise<{ success: boolean; message: string }> {
    const [invoice, payment] = await Promise.all([
      this.prisma.invoice.findFirst({
        where: { id: invoiceId, userId },
      }),
      this.prisma.payment.findFirst({
        where: { id: paymentId, invoice: { userId } },
      }),
    ]);

    if (!invoice) {
      return { success: false, message: 'Factura nu a fost gasita' };
    }

    if (!payment) {
      return { success: false, message: 'Plata nu a fost gasita' };
    }

    // Update the payment to link to the invoice
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { invoiceId },
    });

    // Update invoice payment status
    const totalPaid = await this.calculateTotalPaid(invoiceId);
    const invoiceAmount = Number(invoice.grossAmount);

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: totalPaid,
        paymentStatus:
          totalPaid >= invoiceAmount
            ? 'PAID'
            : totalPaid > 0
            ? 'PARTIAL'
            : 'UNPAID',
        paidAt: totalPaid >= invoiceAmount ? new Date() : null,
      },
    });

    this.logger.log(`Manual match: Invoice ${invoiceId} -> Payment ${paymentId}`);

    return {
      success: true,
      message: `Factura ${invoice.invoiceNumber} a fost potrivita cu plata`,
    };
  }

  /**
   * Calculate total paid amount for an invoice
   */
  private async calculateTotalPaid(invoiceId: string): Promise<number> {
    const payments = await this.prisma.payment.findMany({
      where: { invoiceId },
    });
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  }

  /**
   * Generate aging report for outstanding invoices
   */
  async getAgingReport(userId: string): Promise<AgingReport> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unpaid or partially paid invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'ISSUED',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      orderBy: { dueDate: 'asc' },
    });

    const agingInvoices: AgingReport['invoices'] = [];
    const buckets = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      days90Plus: 0,
    };

    for (const invoice of invoices) {
      const dueDate = invoice.dueDate || invoice.invoiceDate;
      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const outstanding = Number(invoice.grossAmount) - Number(invoice.paidAmount);

      let bucket: 'current' | '1-30' | '31-60' | '61-90' | '90+';
      if (daysOverdue <= 0) {
        bucket = 'current';
        buckets.current += outstanding;
      } else if (daysOverdue <= 30) {
        bucket = '1-30';
        buckets.days30 += outstanding;
      } else if (daysOverdue <= 60) {
        bucket = '31-60';
        buckets.days60 += outstanding;
      } else if (daysOverdue <= 90) {
        bucket = '61-90';
        buckets.days90 += outstanding;
      } else {
        bucket = '90+';
        buckets.days90Plus += outstanding;
      }

      agingInvoices.push({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        partnerName: invoice.partnerName,
        dueDate,
        amount: Number(invoice.grossAmount),
        paidAmount: Number(invoice.paidAmount),
        outstanding,
        daysOverdue: Math.max(0, daysOverdue),
        bucket,
      });
    }

    return {
      period: today.toISOString().split('T')[0],
      summary: {
        ...buckets,
        total:
          buckets.current +
          buckets.days30 +
          buckets.days60 +
          buckets.days90 +
          buckets.days90Plus,
      },
      invoices: agingInvoices,
    };
  }

  /**
   * Get reconciliation history for a user
   */
  async getReconciliationHistory(
    userId: string,
    limit = 10,
  ): Promise<any[]> {
    // In a real implementation, this would fetch from a ReconciliationRun table
    // For now, return empty array as we haven't created that table
    return [];
  }

  /**
   * Calculate Days Sales Outstanding (DSO)
   */
  async calculateDSO(userId: string, days = 90): Promise<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalReceivables, totalSales] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          userId,
          type: 'ISSUED',
          invoiceDate: { gte: startDate, lte: endDate },
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        _sum: { grossAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          userId,
          type: 'ISSUED',
          invoiceDate: { gte: startDate, lte: endDate },
        },
        _sum: { grossAmount: true },
      }),
    ]);

    const receivables = Number(totalReceivables._sum?.grossAmount || 0);
    const sales = Number(totalSales._sum?.grossAmount || 0);

    if (sales === 0) return 0;

    // DSO = (Accounts Receivable / Total Credit Sales) * Number of Days
    return Math.round((receivables / sales) * days);
  }

  /**
   * Get collection rate
   */
  async getCollectionRate(userId: string, days = 90): Promise<number> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalInvoiced, totalCollected] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          userId,
          type: 'ISSUED',
          invoiceDate: { gte: startDate, lte: endDate },
        },
        _sum: { grossAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          userId,
          type: 'ISSUED',
          invoiceDate: { gte: startDate, lte: endDate },
        },
        _sum: { paidAmount: true },
      }),
    ]);

    const invoiced = Number(totalInvoiced._sum?.grossAmount || 0);
    const collected = Number(totalCollected._sum?.paidAmount || 0);

    if (invoiced === 0) return 100;

    return Math.round((collected / invoiced) * 100);
  }

  /**
   * Get payment performance metrics
   */
  async getPaymentMetrics(userId: string): Promise<{
    dso: number;
    collectionRate: number;
    avgPaymentDelay: number;
    onTimePaymentRate: number;
  }> {
    const dso = await this.calculateDSO(userId);
    const collectionRate = await this.getCollectionRate(userId);

    // Calculate average payment delay
    const paidInvoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'ISSUED',
        paymentStatus: 'PAID',
        paidAt: { not: null },
        dueDate: { not: null },
      },
      select: {
        dueDate: true,
        paidAt: true,
      },
    });

    let totalDelay = 0;
    let onTimeCount = 0;

    for (const inv of paidInvoices) {
      if (inv.dueDate && inv.paidAt) {
        const delay = Math.floor(
          (inv.paidAt.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        totalDelay += Math.max(0, delay);
        if (delay <= 0) onTimeCount++;
      }
    }

    const avgPaymentDelay =
      paidInvoices.length > 0 ? Math.round(totalDelay / paidInvoices.length) : 0;
    const onTimePaymentRate =
      paidInvoices.length > 0
        ? Math.round((onTimeCount / paidInvoices.length) * 100)
        : 100;

    return {
      dso,
      collectionRate,
      avgPaymentDelay,
      onTimePaymentRate,
    };
  }
}
