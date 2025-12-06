import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
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

  async create(companyId: string, dto: CreateClientDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    return this.prisma.client.create({
      data: {
        companyId,
        ...dto,
      },
    });
  }

  async findAll(companyId: string, userId: string, params?: {
    search?: string;
    type?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    await this.checkCompanyAccess(companyId, userId);

    const { search, type } = params || {};
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cui: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { invoices: true },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
      include: {
        invoices: {
          orderBy: { issueDate: 'desc' },
          take: 10,
        },
        projects: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { invoices: true, projects: true },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async update(companyId: string, id: string, dto: UpdateClientDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return this.prisma.client.update({
      where: { id },
      data: dto,
    });
  }

  async delete(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
      include: {
        _count: { select: { invoices: true } },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (client._count.invoices > 0) {
      throw new ForbiddenException('Cannot delete client with existing invoices');
    }

    return this.prisma.client.delete({ where: { id } });
  }

  async getStats(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const client = await this.prisma.client.findFirst({
      where: { id, companyId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const [invoiceStats, paidStats, overdueCount] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { clientId: id },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { clientId: id, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.invoice.count({
        where: { clientId: id, status: 'OVERDUE' },
      }),
    ]);

    return {
      totalInvoices: invoiceStats._count,
      totalBilled: invoiceStats._sum.total || 0,
      totalPaid: paidStats._sum.total || 0,
      totalOutstanding: Number(invoiceStats._sum.total || 0) - Number(paidStats._sum.total || 0),
      overdueInvoices: overdueCount,
    };
  }
}
