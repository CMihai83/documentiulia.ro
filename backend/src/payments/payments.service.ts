import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto, PaymentQueryDto, PaymentSummaryDto } from './dto/payments.dto';
import { Prisma, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePaymentDto) {
    // Verify invoice exists and belongs to user
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, userId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: dto.invoiceId,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency || invoice.currency,
        method: dto.method,
        paymentDate: dto.paymentDate || new Date(),
        reference: dto.reference,
        description: dto.description,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        status: dto.status || 'COMPLETED',
      },
      include: {
        invoice: true,
      },
    });

    // Update invoice payment status
    await this.updateInvoicePaymentStatus(dto.invoiceId);

    this.logger.log(`Payment ${payment.id} created for invoice ${dto.invoiceId} - Amount: ${dto.amount}`);

    return payment;
  }

  async findAll(userId: string, query: PaymentQueryDto) {
    const { invoiceId, method, status, startDate, endDate, page = 1, limit = 20 } = query;

    const where: Prisma.PaymentWhereInput = {
      invoice: { userId },
    };

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (method) {
      where.method = method;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = startDate;
      if (endDate) where.paymentDate.lte = endDate;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              partnerName: true,
              grossAmount: true,
              currency: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        invoice: { userId },
      },
      include: {
        invoice: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async update(userId: string, id: string, dto: UpdatePaymentDto) {
    // Verify payment exists and belongs to user
    const existing = await this.findOne(userId, id);

    const payment = await this.prisma.payment.update({
      where: { id },
      data: {
        amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
        method: dto.method,
        paymentDate: dto.paymentDate,
        reference: dto.reference,
        description: dto.description,
        bankName: dto.bankName,
        bankAccount: dto.bankAccount,
        status: dto.status,
      },
      include: {
        invoice: true,
      },
    });

    // Update invoice payment status
    await this.updateInvoicePaymentStatus(existing.invoiceId);

    this.logger.log(`Payment ${id} updated`);

    return payment;
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);

    await this.prisma.payment.delete({ where: { id } });

    // Update invoice payment status
    await this.updateInvoicePaymentStatus(existing.invoiceId);

    this.logger.log(`Payment ${id} deleted`);

    return { message: 'Payment deleted successfully' };
  }

  async getPaymentsForInvoice(userId: string, invoiceId: string) {
    // Verify invoice belongs to user
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const payments = await this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paymentDate: 'desc' },
    });

    const totalPaid = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      payments,
      summary: {
        invoiceAmount: Number(invoice.grossAmount),
        totalPaid,
        remaining: Number(invoice.grossAmount) - totalPaid,
        paymentStatus: invoice.paymentStatus,
      },
    };
  }

  async getSummary(userId: string, startDate?: Date, endDate?: Date): Promise<PaymentSummaryDto> {
    const where: Prisma.PaymentWhereInput = {
      invoice: { userId },
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = startDate;
      if (endDate) where.paymentDate.lte = endDate;
    }

    const payments = await this.prisma.payment.findMany({
      where,
      select: {
        amount: true,
        method: true,
        status: true,
      },
    });

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const byMethod: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    payments.forEach((p) => {
      byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount);
      byStatus[p.status] = (byStatus[p.status] || 0) + Number(p.amount);
    });

    return {
      totalAmount,
      count: payments.length,
      byMethod,
      byStatus,
    };
  }

  async getOverdueInvoices(userId: string) {
    const today = new Date();

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        dueDate: { lt: today },
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      include: {
        payments: {
          where: { status: 'COMPLETED' },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return overdueInvoices.map((invoice) => {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = Number(invoice.grossAmount) - totalPaid;
      const daysOverdue = Math.floor((today.getTime() - invoice.dueDate!.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...invoice,
        totalPaid,
        remaining,
        daysOverdue,
      };
    });
  }

  async getDashboardStats(userId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [
      totalUnpaid,
      totalPartiallyPaid,
      overdueCount,
      paymentsThisMonth,
      receivedInvoices,
      issuedInvoices,
    ] = await Promise.all([
      // Total unpaid
      this.prisma.invoice.aggregate({
        where: { userId, paymentStatus: 'UNPAID' },
        _sum: { grossAmount: true },
        _count: true,
      }),
      // Total partially paid
      this.prisma.invoice.aggregate({
        where: { userId, paymentStatus: 'PARTIAL' },
        _sum: { grossAmount: true },
        _count: true,
      }),
      // Overdue count
      this.prisma.invoice.count({
        where: {
          userId,
          dueDate: { lt: today },
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
      }),
      // Payments this month
      this.prisma.payment.aggregate({
        where: {
          invoice: { userId },
          status: 'COMPLETED',
          paymentDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Received invoices (to pay)
      this.prisma.invoice.aggregate({
        where: {
          userId,
          type: 'RECEIVED',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        _sum: { grossAmount: true },
        _count: true,
      }),
      // Issued invoices (to receive)
      this.prisma.invoice.aggregate({
        where: {
          userId,
          type: 'ISSUED',
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        _sum: { grossAmount: true },
        _count: true,
      }),
    ]);

    return {
      unpaid: {
        total: Number(totalUnpaid._sum.grossAmount || 0),
        count: totalUnpaid._count,
      },
      partiallyPaid: {
        total: Number(totalPartiallyPaid._sum.grossAmount || 0),
        count: totalPartiallyPaid._count,
      },
      overdue: {
        count: overdueCount,
      },
      thisMonth: {
        paid: Number(paymentsThisMonth._sum.amount || 0),
        paymentsCount: paymentsThisMonth._count,
      },
      receivables: {
        total: Number(issuedInvoices._sum.grossAmount || 0),
        count: issuedInvoices._count,
      },
      payables: {
        total: Number(receivedInvoices._sum.grossAmount || 0),
        count: receivedInvoices._count,
      },
    };
  }

  private async updateInvoicePaymentStatus(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    if (!invoice) return;

    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const grossAmount = Number(invoice.grossAmount);

    let paymentStatus: PaymentStatus;
    if (totalPaid >= grossAmount) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    } else if (invoice.dueDate && invoice.dueDate < new Date()) {
      paymentStatus = 'OVERDUE';
    } else {
      paymentStatus = 'UNPAID';
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: new Prisma.Decimal(totalPaid),
        paymentStatus,
      },
    });
  }
}
