import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContractType, ContractStatus, Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

// DTOs
export interface CreateContractDto {
  contractNumber: string;
  title: string;
  description?: string;
  type?: ContractType;
  partnerId?: string;
  partnerName: string;
  partnerCui?: string;
  partnerAddress?: string;
  totalValue: number;
  currency?: string;
  paymentTerms?: string;
  billingFrequency?: string;
  startDate: string;
  endDate?: string;
  autoRenew?: boolean;
  renewalPeriodMonths?: number;
  renewalNoticesDays?: number;
  tags?: string[];
  notes?: string;
}

export interface UpdateContractDto extends Partial<CreateContractDto> {
  status?: ContractStatus;
  signedAt?: string;
  isCompliant?: boolean;
  complianceNotes?: string;
}

export interface ContractFilters {
  type?: ContractType;
  status?: ContractStatus;
  partnerId?: string;
  search?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  minValue?: number;
  maxValue?: number;
  tags?: string[];
  page?: number;
  limit?: number;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =================== CRUD OPERATIONS ===================

  async create(userId: string, dto: CreateContractDto) {
    // Validate contract number uniqueness
    const existing = await this.prisma.contract.findFirst({
      where: { userId, contractNumber: dto.contractNumber },
    });
    if (existing) {
      throw new BadRequestException(`Contract number ${dto.contractNumber} already exists`);
    }

    const contract = await this.prisma.contract.create({
      data: {
        userId,
        contractNumber: dto.contractNumber,
        title: dto.title,
        description: dto.description,
        type: dto.type || ContractType.SERVICE,
        status: ContractStatus.DRAFT,
        partnerId: dto.partnerId,
        partnerName: dto.partnerName,
        partnerCui: dto.partnerCui,
        partnerAddress: dto.partnerAddress,
        totalValue: dto.totalValue,
        currency: dto.currency || 'RON',
        paymentTerms: dto.paymentTerms,
        billingFrequency: dto.billingFrequency,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        autoRenew: dto.autoRenew || false,
        renewalPeriodMonths: dto.renewalPeriodMonths,
        renewalNoticesDays: dto.renewalNoticesDays,
        tags: dto.tags || [],
        notes: dto.notes,
      },
      include: { partner: true },
    });

    this.logger.log(`Contract ${contract.contractNumber} created by user ${userId}`);
    return contract;
  }

  async findAll(userId: string, filters: ContractFilters = {}) {
    const {
      type,
      status,
      partnerId,
      search,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      minValue,
      maxValue,
      tags,
      page = 1,
      limit = 20,
    } = filters;

    const where: Prisma.ContractWhereInput = { userId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (partnerId) where.partnerId = partnerId;

    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { partnerName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) where.startDate.gte = startDateFrom;
      if (startDateTo) where.startDate.lte = startDateTo;
    }

    if (endDateFrom || endDateTo) {
      where.endDate = {};
      if (endDateFrom) where.endDate.gte = endDateFrom;
      if (endDateTo) where.endDate.lte = endDateTo;
    }

    if (minValue !== undefined || maxValue !== undefined) {
      where.totalValue = {};
      if (minValue !== undefined) where.totalValue.gte = minValue;
      if (maxValue !== undefined) where.totalValue.lte = maxValue;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const [contracts, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: { partner: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(userId: string, id: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, userId },
      include: { partner: true, document: true },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    return contract;
  }

  async update(userId: string, id: string, dto: UpdateContractDto) {
    const contract = await this.findById(userId, id);

    // Don't allow modification of terminated contracts
    if (contract.status === ContractStatus.TERMINATED) {
      throw new BadRequestException('Cannot modify a terminated contract');
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        partnerName: dto.partnerName,
        partnerCui: dto.partnerCui,
        partnerAddress: dto.partnerAddress,
        totalValue: dto.totalValue,
        currency: dto.currency,
        paymentTerms: dto.paymentTerms,
        billingFrequency: dto.billingFrequency,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        signedAt: dto.signedAt ? new Date(dto.signedAt) : undefined,
        autoRenew: dto.autoRenew,
        renewalPeriodMonths: dto.renewalPeriodMonths,
        renewalNoticesDays: dto.renewalNoticesDays,
        isCompliant: dto.isCompliant,
        complianceNotes: dto.complianceNotes,
        tags: dto.tags,
        notes: dto.notes,
      },
      include: { partner: true },
    });

    this.logger.log(`Contract ${id} updated`);
    return updated;
  }

  async delete(userId: string, id: string) {
    await this.findById(userId, id);
    await this.prisma.contract.delete({ where: { id } });
    this.logger.log(`Contract ${id} deleted`);
    return { success: true, message: 'Contract deleted' };
  }

  // =================== STATUS MANAGEMENT ===================

  async activate(userId: string, id: string) {
    const contract = await this.findById(userId, id);

    if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Can only activate draft or pending contracts');
    }

    return this.prisma.contract.update({
      where: { id },
      data: { status: ContractStatus.ACTIVE },
      include: { partner: true },
    });
  }

  async sign(userId: string, id: string) {
    const contract = await this.findById(userId, id);

    if (contract.signedAt) {
      throw new BadRequestException('Contract is already signed');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        signedAt: new Date(),
        status: ContractStatus.ACTIVE,
      },
      include: { partner: true },
    });
  }

  async suspend(userId: string, id: string, reason?: string) {
    const contract = await this.findById(userId, id);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Can only suspend active contracts');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.SUSPENDED,
        notes: reason ? `${contract.notes || ''}\n[SUSPENDED] ${reason}`.trim() : contract.notes,
      },
      include: { partner: true },
    });
  }

  async terminate(userId: string, id: string, reason?: string) {
    const contract = await this.findById(userId, id);

    if (contract.status === ContractStatus.TERMINATED) {
      throw new BadRequestException('Contract is already terminated');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.TERMINATED,
        terminatedAt: new Date(),
        notes: reason ? `${contract.notes || ''}\n[TERMINATED] ${reason}`.trim() : contract.notes,
      },
      include: { partner: true },
    });
  }

  async renew(userId: string, id: string, newEndDate?: string) {
    const contract = await this.findById(userId, id);

    if (!contract.autoRenew && !newEndDate) {
      throw new BadRequestException('Contract is not set for auto-renewal and no new end date provided');
    }

    let calculatedEndDate: Date;
    if (newEndDate) {
      calculatedEndDate = new Date(newEndDate);
    } else if (contract.renewalPeriodMonths && contract.endDate) {
      calculatedEndDate = new Date(contract.endDate);
      calculatedEndDate.setMonth(calculatedEndDate.getMonth() + contract.renewalPeriodMonths);
    } else {
      // Default: extend by 1 year
      calculatedEndDate = contract.endDate ? new Date(contract.endDate) : new Date();
      calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.RENEWED,
        endDate: calculatedEndDate,
        notes: `${contract.notes || ''}\n[RENEWED] Extended until ${calculatedEndDate.toISOString().split('T')[0]}`.trim(),
      },
      include: { partner: true },
    });
  }

  // =================== ANALYTICS & REPORTING ===================

  async getStats(userId: string) {
    const [contracts, byStatus, byType, totalValue] = await Promise.all([
      this.prisma.contract.count({ where: { userId } }),
      this.prisma.contract.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
        _sum: { totalValue: true },
      }),
      this.prisma.contract.groupBy({
        by: ['type'],
        where: { userId },
        _count: true,
        _sum: { totalValue: true },
      }),
      this.prisma.contract.aggregate({
        where: { userId, status: ContractStatus.ACTIVE },
        _sum: { totalValue: true },
      }),
    ]);

    return {
      total: contracts,
      activeValue: Number(totalValue._sum.totalValue) || 0,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
        value: Number(s._sum.totalValue) || 0,
      })),
      byType: byType.map((t) => ({
        type: t.type,
        count: t._count,
        value: Number(t._sum.totalValue) || 0,
      })),
    };
  }

  async getExpiringContracts(userId: string, daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.contract.findMany({
      where: {
        userId,
        status: ContractStatus.ACTIVE,
        endDate: {
          gte: new Date(),
          lte: futureDate,
        },
      },
      orderBy: { endDate: 'asc' },
      include: { partner: true },
    });
  }

  async getContractsForRenewal(userId: string) {
    const now = new Date();

    return this.prisma.contract.findMany({
      where: {
        userId,
        status: ContractStatus.ACTIVE,
        autoRenew: true,
        endDate: { not: null },
      },
      include: { partner: true },
    });
  }

  async linkInvoice(userId: string, contractId: string, invoiceId: string) {
    const contract = await this.findById(userId, contractId);

    const linkedInvoices = [...(contract.linkedInvoiceIds || [])];
    if (!linkedInvoices.includes(invoiceId)) {
      linkedInvoices.push(invoiceId);
    }

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { linkedInvoiceIds: linkedInvoices },
      include: { partner: true },
    });
  }

  async unlinkInvoice(userId: string, contractId: string, invoiceId: string) {
    const contract = await this.findById(userId, contractId);

    const linkedInvoices = (contract.linkedInvoiceIds || []).filter((id) => id !== invoiceId);

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { linkedInvoiceIds: linkedInvoices },
      include: { partner: true },
    });
  }

  async getLinkedInvoices(userId: string, contractId: string) {
    const contract = await this.findById(userId, contractId);

    if (!contract.linkedInvoiceIds || contract.linkedInvoiceIds.length === 0) {
      return { invoices: [], totalInvoiced: 0 };
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        id: { in: contract.linkedInvoiceIds },
        userId,
      },
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.grossAmount), 0);

    return {
      invoices,
      totalInvoiced,
      contractValue: Number(contract.totalValue),
      invoicedPercentage: Number(contract.totalValue) > 0
        ? Math.round((totalInvoiced / Number(contract.totalValue)) * 10000) / 100
        : 0,
    };
  }

  // =================== SCHEDULED TASKS ===================

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringContracts() {
    this.logger.log('Checking for expiring contracts...');

    // Find contracts expiring in next 30 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const expiringContracts = await this.prisma.contract.findMany({
      where: {
        status: ContractStatus.ACTIVE,
        endDate: {
          gte: new Date(),
          lte: futureDate,
        },
      },
      include: { user: true },
    });

    for (const contract of expiringContracts) {
      const daysUntilExpiry = Math.ceil(
        (contract.endDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Log notification (in production, would send email/push notification)
      this.logger.log(
        `Contract ${contract.contractNumber} expiring in ${daysUntilExpiry} days for user ${contract.userId}`
      );
    }

    // Auto-expire contracts past end date
    const expiredContracts = await this.prisma.contract.updateMany({
      where: {
        status: ContractStatus.ACTIVE,
        autoRenew: false,
        endDate: { lt: new Date() },
      },
      data: { status: ContractStatus.EXPIRED },
    });

    if (expiredContracts.count > 0) {
      this.logger.log(`Auto-expired ${expiredContracts.count} contracts`);
    }

    // Auto-renew eligible contracts
    const toRenew = await this.prisma.contract.findMany({
      where: {
        status: ContractStatus.ACTIVE,
        autoRenew: true,
        endDate: { lt: new Date() },
      },
    });

    for (const contract of toRenew) {
      if (contract.renewalPeriodMonths) {
        const newEndDate = new Date(contract.endDate!);
        newEndDate.setMonth(newEndDate.getMonth() + contract.renewalPeriodMonths);

        await this.prisma.contract.update({
          where: { id: contract.id },
          data: {
            status: ContractStatus.RENEWED,
            endDate: newEndDate,
          },
        });

        this.logger.log(`Auto-renewed contract ${contract.contractNumber} until ${newEndDate.toISOString()}`);
      }
    }
  }
}
