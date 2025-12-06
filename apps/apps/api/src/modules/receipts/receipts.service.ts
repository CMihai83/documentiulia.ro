import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReceiptDto, UpdateReceiptOcrDto } from './dto/create-receipt.dto';
import { OcrStatus } from '@prisma/client';

@Injectable()
export class ReceiptsService {
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

  async create(companyId: string, dto: CreateReceiptDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    return this.prisma.receipt.create({
      data: {
        companyId,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        vendorName: dto.vendorName,
        receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : undefined,
        total: dto.total,
        vatAmount: dto.vatAmount,
        currency: dto.currency || 'RON',
        ocrStatus: OcrStatus.PENDING,
      },
    });
  }

  async findAll(companyId: string, userId: string, params?: {
    status?: OcrStatus;
    hasExpense?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    await this.checkCompanyAccess(companyId, userId);

    const { status, hasExpense, startDate, endDate } = params || {};
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (status) {
      where.ocrStatus = status;
    }

    if (hasExpense !== undefined) {
      if (hasExpense) {
        where.expenseId = { not: null };
      } else {
        where.expenseId = null;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [receipts, total] = await Promise.all([
      this.prisma.receipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          expense: true,
        },
      }),
      this.prisma.receipt.count({ where }),
    ]);

    return {
      data: receipts,
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

    const receipt = await this.prisma.receipt.findFirst({
      where: { id, companyId },
      include: {
        expense: true,
      },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return receipt;
  }

  async updateOcrData(companyId: string, id: string, dto: UpdateReceiptOcrDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const receipt = await this.prisma.receipt.findFirst({
      where: { id, companyId },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return this.prisma.receipt.update({
      where: { id },
      data: {
        ocrStatus: dto.ocrStatus,
        ocrConfidence: dto.ocrConfidence,
        ocrRawData: dto.ocrRawData ? JSON.parse(JSON.stringify(dto.ocrRawData)) : undefined,
        ocrItems: dto.ocrItems ? JSON.parse(JSON.stringify(dto.ocrItems)) : undefined,
        vendorName: dto.vendorName,
        total: dto.total,
        vatAmount: dto.vatAmount,
        receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : undefined,
      },
    });
  }

  async linkToExpense(companyId: string, id: string, expenseId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const receipt = await this.prisma.receipt.findFirst({
      where: { id, companyId },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // Verify expense exists and belongs to same company
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, companyId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.receipt.update({
      where: { id },
      data: { expenseId },
      include: { expense: true },
    });
  }

  async unlinkFromExpense(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const receipt = await this.prisma.receipt.findFirst({
      where: { id, companyId },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return this.prisma.receipt.update({
      where: { id },
      data: { expenseId: null },
    });
  }

  async delete(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const receipt = await this.prisma.receipt.findFirst({
      where: { id, companyId },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    // TODO: Also delete file from S3

    return this.prisma.receipt.delete({ where: { id } });
  }

  async getUnprocessedReceipts(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    return this.prisma.receipt.findMany({
      where: {
        companyId,
        ocrStatus: { in: [OcrStatus.PENDING, OcrStatus.FAILED] },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getReceiptsNeedingReview(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    // Use COMPLETED instead of PROCESSED (matching the OcrStatus enum)
    return this.prisma.receipt.findMany({
      where: {
        companyId,
        ocrStatus: OcrStatus.COMPLETED,
        expenseId: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createExpenseFromReceipt(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const receipt = await this.prisma.receipt.findFirst({
      where: { id, companyId },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    if (receipt.ocrStatus !== OcrStatus.COMPLETED) {
      throw new BadRequestException('Receipt must be processed before creating expense');
    }

    if (!receipt.total) {
      throw new BadRequestException('Receipt has no extracted total amount');
    }

    const vatAmountValue = receipt.vatAmount ? Number(receipt.vatAmount) : 0;
    const totalValue = Number(receipt.total);

    // Create expense from OCR data
    const expense = await this.prisma.expense.create({
      data: {
        companyId,
        category: 'OTHER',
        vendorName: receipt.vendorName || 'Unknown',
        description: `From receipt: ${receipt.fileName}`,
        amount: totalValue - vatAmountValue,
        vatAmount: vatAmountValue,
        vatRate: vatAmountValue > 0 ? 19 : 0,
        currency: receipt.currency || 'RON',
        expenseDate: receipt.receiptDate || new Date(),
        isPaid: true,
      },
    });

    // Link receipt to expense
    await this.prisma.receipt.update({
      where: { id },
      data: { expenseId: expense.id },
    });

    return expense;
  }

  // OCR Queue management (for ML service integration)
  async markForOcr(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const receipt = await this.prisma.receipt.findFirst({
      where: { id, companyId },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    return this.prisma.receipt.update({
      where: { id },
      data: { ocrStatus: OcrStatus.PROCESSING },
    });
  }

  async getOcrQueue(limit: number = 10) {
    return this.prisma.receipt.findMany({
      where: { ocrStatus: OcrStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });
  }
}
