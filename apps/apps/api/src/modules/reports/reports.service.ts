import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReportQueryDto, CashFlowQueryDto } from './dto/report-query.dto';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async checkCompanyAccess(companyId: string, userId: string) {
    const membership = await this.prisma.companyUser.findFirst({
      where: { companyId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('No access to this company');
    }
    return membership;
  }

  private getDateRange(query: ReportQueryDto) {
    const now = new Date();
    const year = query.year || now.getFullYear();
    const month = query.month;

    let startDate: Date;
    let endDate: Date;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else if (month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }

    return { startDate, endDate };
  }

  // Dashboard Summary
  async getDashboardSummary(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalRevenue,
      totalExpenses,
      outstandingInvoices,
      overdueInvoices,
      recentInvoices,
      recentExpenses,
    ] = await Promise.all([
      // Total revenue this month (paid invoices)
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          paymentStatus: PaymentStatus.PAID,
          issueDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { total: true },
      }),
      // Total expenses this month
      this.prisma.expense.aggregate({
        where: {
          companyId,
          expenseDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      // Outstanding invoices (unpaid)
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          paymentStatus: PaymentStatus.UNPAID,
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Overdue invoices
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          status: InvoiceStatus.OVERDUE,
        },
        _sum: { total: true },
        _count: true,
      }),
      // Recent invoices
      this.prisma.invoice.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { client: { select: { name: true } } },
      }),
      // Recent expenses
      this.prisma.expense.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const revenueAmount = Number(totalRevenue._sum?.total || 0);
    const expenseAmount = Number(totalExpenses._sum?.amount || 0);

    return {
      revenue: {
        thisMonth: revenueAmount,
      },
      expenses: {
        thisMonth: expenseAmount,
      },
      profit: {
        thisMonth: revenueAmount - expenseAmount,
      },
      outstanding: {
        total: Number(outstandingInvoices._sum?.total || 0),
        count: outstandingInvoices._count,
      },
      overdue: {
        total: Number(overdueInvoices._sum?.total || 0),
        count: overdueInvoices._count,
      },
      recentInvoices,
      recentExpenses,
    };
  }

  // Revenue Report
  async getRevenueReport(companyId: string, userId: string, query: ReportQueryDto) {
    await this.checkCompanyAccess(companyId, userId);

    const { startDate, endDate } = this.getDateRange(query);

    // Get invoices in date range
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        issueDate: { gte: startDate, lte: endDate },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { issueDate: 'asc' },
    });

    // Group by month
    const monthlyData = new Map<string, { invoiced: number; paid: number; count: number }>();

    invoices.forEach(invoice => {
      const monthKey = `${invoice.issueDate.getFullYear()}-${String(invoice.issueDate.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyData.get(monthKey) || { invoiced: 0, paid: 0, count: 0 };
      current.invoiced += Number(invoice.total);
      if (invoice.paymentStatus === PaymentStatus.PAID) {
        current.paid += Number(invoice.total);
      }
      current.count += 1;
      monthlyData.set(monthKey, current);
    });

    // Revenue by client
    const clientRevenue = new Map<string, { name: string; total: number; count: number }>();
    invoices.forEach(invoice => {
      const current = clientRevenue.get(invoice.clientId) || { name: invoice.client.name, total: 0, count: 0 };
      current.total += Number(invoice.total);
      current.count += 1;
      clientRevenue.set(invoice.clientId, current);
    });

    // Totals
    const totals = await this.prisma.invoice.aggregate({
      where: {
        companyId,
        issueDate: { gte: startDate, lte: endDate },
      },
      _sum: { total: true, subtotal: true, vatAmount: true },
      _count: true,
    });

    return {
      period: { startDate, endDate },
      totals: {
        invoiced: Number(totals._sum?.total || 0),
        subtotal: Number(totals._sum?.subtotal || 0),
        vat: Number(totals._sum?.vatAmount || 0),
        count: totals._count,
      },
      monthly: Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        ...data,
      })),
      byClient: Array.from(clientRevenue.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
    };
  }

  // Expense Report
  async getExpenseReport(companyId: string, userId: string, query: ReportQueryDto) {
    await this.checkCompanyAccess(companyId, userId);

    const { startDate, endDate } = this.getDateRange(query);

    // Get expenses by category
    const byCategory = await this.prisma.expense.groupBy({
      by: ['category'],
      where: {
        companyId,
        expenseDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true, vatAmount: true },
      _count: true,
    });

    // Get expenses by month
    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        expenseDate: { gte: startDate, lte: endDate },
      },
      orderBy: { expenseDate: 'asc' },
    });

    const monthlyData = new Map<string, { total: number; count: number }>();
    expenses.forEach(expense => {
      const monthKey = `${expense.expenseDate.getFullYear()}-${String(expense.expenseDate.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyData.get(monthKey) || { total: 0, count: 0 };
      current.total += Number(expense.amount);
      current.count += 1;
      monthlyData.set(monthKey, current);
    });

    // Totals
    const totals = await this.prisma.expense.aggregate({
      where: {
        companyId,
        expenseDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true, vatAmount: true },
      _count: true,
    });

    const totalAmount = Number(totals._sum?.amount || 0);

    return {
      period: { startDate, endDate },
      totals: {
        total: totalAmount + Number(totals._sum?.vatAmount || 0),
        net: totalAmount,
        vat: Number(totals._sum?.vatAmount || 0),
        count: totals._count,
      },
      byCategory: byCategory.map(c => {
        const catAmount = Number(c._sum?.amount || 0);
        return {
          category: c.category,
          total: catAmount + Number(c._sum?.vatAmount || 0),
          net: catAmount,
          vat: Number(c._sum?.vatAmount || 0),
          count: c._count,
          percentage: totalAmount > 0 ? (catAmount / totalAmount) * 100 : 0,
        };
      }),
      monthly: Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        ...data,
      })),
    };
  }

  // Profit & Loss Report
  async getProfitLossReport(companyId: string, userId: string, query: ReportQueryDto) {
    await this.checkCompanyAccess(companyId, userId);

    const { startDate, endDate } = this.getDateRange(query);

    const [revenue, expenses] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          paymentStatus: PaymentStatus.PAID,
          issueDate: { gte: startDate, lte: endDate },
        },
        _sum: { total: true, subtotal: true, vatAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          expenseDate: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true, vatAmount: true },
      }),
    ]);

    const grossRevenue = Number(revenue._sum?.subtotal || 0);
    const totalExpenses = Number(expenses._sum?.amount || 0);
    const netProfit = grossRevenue - totalExpenses;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    // Monthly breakdown
    const months: { month: string; revenue: number; expenses: number; profit: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const [monthRevenue, monthExpenses] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            companyId,
            paymentStatus: PaymentStatus.PAID,
            issueDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: { subtotal: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            companyId,
            expenseDate: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),
      ]);

      const monthRev = Number(monthRevenue._sum?.subtotal || 0);
      const monthExp = Number(monthExpenses._sum?.amount || 0);

      months.push({
        month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
        revenue: monthRev,
        expenses: monthExp,
        profit: monthRev - monthExp,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
      period: { startDate, endDate },
      summary: {
        grossRevenue,
        totalExpenses,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        vatCollected: Number(revenue._sum?.vatAmount || 0),
        vatPaid: Number(expenses._sum?.vatAmount || 0),
        vatBalance: Number(revenue._sum?.vatAmount || 0) - Number(expenses._sum?.vatAmount || 0),
      },
      monthly: months,
    };
  }

  // Cash Flow Report
  async getCashFlowReport(companyId: string, userId: string, query: CashFlowQueryDto) {
    await this.checkCompanyAccess(companyId, userId);

    const { startDate, endDate } = this.getDateRange(query);

    // Get invoices with payments
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        payments: { some: { paymentDate: { gte: startDate, lte: endDate } } },
      },
      include: { payments: true },
    });

    // Calculate total payments received
    let totalInflow = 0;
    invoices.forEach(invoice => {
      invoice.payments.forEach(payment => {
        if (payment.paymentDate >= startDate && payment.paymentDate <= endDate) {
          totalInflow += Number(payment.amount);
        }
      });
    });

    // Get expenses paid
    const expensesPaid = await this.prisma.expense.aggregate({
      where: {
        companyId,
        isPaid: true,
        expenseDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true, vatAmount: true },
      _count: true,
    });

    const totalOutflow = Number(expensesPaid._sum?.amount || 0) + Number(expensesPaid._sum?.vatAmount || 0);

    // Monthly cash flow
    const months: { month: string; inflow: number; outflow: number; net: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Calculate month inflow from payments
      let monthInflow = 0;
      invoices.forEach(invoice => {
        invoice.payments.forEach(payment => {
          if (payment.paymentDate >= monthStart && payment.paymentDate <= monthEnd) {
            monthInflow += Number(payment.amount);
          }
        });
      });

      const monthOutflow = await this.prisma.expense.aggregate({
        where: {
          companyId,
          isPaid: true,
          expenseDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true, vatAmount: true },
      });

      const outflowAmount = Number(monthOutflow._sum?.amount || 0) + Number(monthOutflow._sum?.vatAmount || 0);

      months.push({
        month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
        inflow: monthInflow,
        outflow: outflowAmount,
        net: monthInflow - outflowAmount,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Bank account balances
    const bankAccounts = await this.prisma.bankAccount.findMany({
      where: { companyId },
      select: { id: true, name: true, bankName: true, currency: true, balance: true },
    });

    const totalCash = bankAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    return {
      period: { startDate, endDate },
      summary: {
        totalInflow,
        totalOutflow,
        netCashFlow: totalInflow - totalOutflow,
        currentCash: totalCash,
      },
      bankAccounts,
      monthly: months,
    };
  }

  // VAT Report
  async getVatReport(companyId: string, userId: string, query: ReportQueryDto) {
    await this.checkCompanyAccess(companyId, userId);

    const { startDate, endDate } = this.getDateRange(query);

    const [vatCollected, vatPaid] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          issueDate: { gte: startDate, lte: endDate },
        },
        _sum: { vatAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          expenseDate: { gte: startDate, lte: endDate },
        },
        _sum: { vatAmount: true },
      }),
    ]);

    const collected = Number(vatCollected._sum?.vatAmount || 0);
    const paid = Number(vatPaid._sum?.vatAmount || 0);
    const balance = collected - paid;

    return {
      period: { startDate, endDate },
      vatCollected: collected,
      vatDeductible: paid,
      vatBalance: balance,
      vatDue: balance > 0 ? balance : 0,
      vatRefund: balance < 0 ? Math.abs(balance) : 0,
    };
  }

  // Client Aging Report
  async getClientAgingReport(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const now = new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        paymentStatus: PaymentStatus.UNPAID,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    // Calculate aging buckets
    const aging = {
      current: 0,      // 0-30 days
      days30: 0,       // 31-60 days
      days60: 0,       // 61-90 days
      days90: 0,       // 90+ days
      total: 0,
    };

    const byClient = new Map<string, {
      name: string;
      current: number;
      days30: number;
      days60: number;
      days90: number;
      total: number;
    }>();

    invoices.forEach(invoice => {
      const dueDate = invoice.dueDate;
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(invoice.total);

      let bucket: 'current' | 'days30' | 'days60' | 'days90';
      if (daysOverdue <= 0) bucket = 'current';
      else if (daysOverdue <= 30) bucket = 'current';
      else if (daysOverdue <= 60) bucket = 'days30';
      else if (daysOverdue <= 90) bucket = 'days60';
      else bucket = 'days90';

      aging[bucket] += amount;
      aging.total += amount;

      const clientData = byClient.get(invoice.clientId) || {
        name: invoice.client.name,
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        total: 0,
      };
      clientData[bucket] += amount;
      clientData.total += amount;
      byClient.set(invoice.clientId, clientData);
    });

    return {
      summary: aging,
      byClient: Array.from(byClient.values()).sort((a, b) => b.total - a.total),
    };
  }
}
