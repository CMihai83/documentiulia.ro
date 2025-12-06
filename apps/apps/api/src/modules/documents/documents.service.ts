import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentFilterDto } from './dto/document.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        type: dto.type || 'OTHER',
        invoiceId: dto.invoiceId,
        expenseId: dto.expenseId,
      },
      include: {
        invoice: { select: { id: true, invoiceNumber: true } },
        expense: { select: { id: true, description: true } },
      },
    });
  }

  async findAll(companyId: string, filters: DocumentFilterDto) {
    const { type, invoiceId, expenseId, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = { companyId };

    if (type) {
      where.type = type;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (expenseId) {
      where.expenseId = expenseId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: { select: { id: true, invoiceNumber: true } },
          expense: { select: { id: true, description: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, companyId },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, clientId: true } },
        expense: { select: { id: true, description: true, category: true } },
      },
    });

    if (!document) {
      throw new NotFoundException('Documentul nu a fost găsit');
    }

    return document;
  }

  async update(companyId: string, id: string, dto: UpdateDocumentDto) {
    await this.findOne(companyId, id);

    return this.prisma.document.update({
      where: { id },
      data: dto,
      include: {
        invoice: { select: { id: true, invoiceNumber: true } },
        expense: { select: { id: true, description: true } },
      },
    });
  }

  async delete(companyId: string, id: string) {
    const document = await this.findOne(companyId, id);

    // TODO: Delete actual file from storage
    // await this.storageService.delete(document.fileUrl);

    await this.prisma.document.delete({ where: { id } });
    return { message: 'Documentul a fost șters' };
  }

  async getByInvoice(companyId: string, invoiceId: string) {
    return this.prisma.document.findMany({
      where: { companyId, invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByExpense(companyId: string, expenseId: string) {
    return this.prisma.document.findMany({
      where: { companyId, expenseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(companyId: string) {
    const [
      total,
      byType,
      totalSize,
    ] = await Promise.all([
      this.prisma.document.count({ where: { companyId } }),
      this.prisma.document.groupBy({
        by: ['type'],
        where: { companyId },
        _count: true,
      }),
      this.prisma.document.aggregate({
        where: { companyId },
        _sum: { fileSize: true },
      }),
    ]);

    return {
      total,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      totalSizeBytes: totalSize._sum.fileSize || 0,
      totalSizeMB: Math.round((totalSize._sum.fileSize || 0) / (1024 * 1024) * 100) / 100,
    };
  }

  async linkToInvoice(companyId: string, id: string, invoiceId: string) {
    await this.findOne(companyId, id);

    return this.prisma.document.update({
      where: { id },
      data: { invoiceId },
    });
  }

  async linkToExpense(companyId: string, id: string, expenseId: string) {
    await this.findOne(companyId, id);

    return this.prisma.document.update({
      where: { id },
      data: { expenseId },
    });
  }

  async unlinkFromInvoice(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.document.update({
      where: { id },
      data: { invoiceId: null },
    });
  }

  async unlinkFromExpense(companyId: string, id: string) {
    await this.findOne(companyId, id);

    return this.prisma.document.update({
      where: { id },
      data: { expenseId: null },
    });
  }
}
