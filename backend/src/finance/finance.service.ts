import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(userId: string) {
    const [invoices, vatReports, recentInvoices] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { userId },
        _sum: {
          netAmount: true,
          vatAmount: true,
          grossAmount: true,
        },
        _count: true,
      }),
      this.prisma.vATReport.findMany({
        where: { userId },
        orderBy: { period: 'desc' },
        take: 6,
      }),
      this.prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      summary: {
        totalInvoices: invoices._count,
        totalNet: invoices._sum.netAmount || 0,
        totalVAT: invoices._sum.vatAmount || 0,
        totalGross: invoices._sum.grossAmount || 0,
      },
      vatHistory: vatReports,
      recentInvoices,
    };
  }

  async createInvoice(userId: string, data: any) {
    return this.prisma.invoice.create({
      data: {
        userId,
        ...data,
      },
    });
  }

  async getInvoices(userId: string, filters?: { type?: string; status?: string }) {
    return this.prisma.invoice.findMany({
      where: {
        userId,
        ...(filters?.type && { type: filters.type as any }),
        ...(filters?.status && { status: filters.status as any }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
