import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseCategory } from '@prisma/client';

@Injectable()
export class ExpensesService {
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

  async create(companyId: string, dto: CreateExpenseDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    return this.prisma.expense.create({
      data: {
        companyId,
        description: dto.description,
        category: dto.category,
        vendorName: dto.vendorName,
        vendorCui: dto.vendorCui,
        amount: dto.amount,
        vatAmount: dto.vatAmount ?? 0,
        vatRate: dto.vatRate ?? 19,
        currency: dto.currency ?? 'RON',
        isDeductible: dto.isDeductible ?? true,
        deductiblePercent: dto.deductiblePercent ?? 100,
        expenseDate: new Date(dto.expenseDate),
        paymentMethod: dto.paymentMethod,
        isPaid: dto.isPaid ?? true,
        invoiceNumber: dto.invoiceNumber,
        notes: dto.notes,
        tags: dto.tags ?? [],
      },
    });
  }

  async findAll(companyId: string, userId: string, params?: {
    search?: string;
    category?: ExpenseCategory;
    isPaid?: boolean;
    startDate?: string;
    endDate?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    await this.checkCompanyAccess(companyId, userId);

    const { search, category, isPaid, startDate, endDate } = params || {};
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (search) {
      where.OR = [
        { vendorName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isPaid !== undefined) {
      where.isPaid = isPaid;
    }

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          receipts: true,
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses,
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

    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId },
      include: {
        receipts: true,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(companyId: string, id: string, dto: UpdateExpenseDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const updateData: any = { ...dto };
    if (dto.expenseDate) {
      updateData.expenseDate = new Date(dto.expenseDate);
    }

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expense.delete({ where: { id } });
  }

  async markAsPaid(companyId: string, id: string, userId: string, paidDate?: Date) {
    await this.checkCompanyAccess(companyId, userId);

    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        isPaid: true,
        // Note: paidDate parameter received but Expense model doesn't have a paidAt field
        // The parameter is kept for API compatibility but not persisted
      },
    });
  }

  async getByCategory(companyId: string, userId: string, year?: number, month?: number) {
    await this.checkCompanyAccess(companyId, userId);

    const currentYear = year || new Date().getFullYear();
    const startDate = month
      ? new Date(currentYear, month - 1, 1)
      : new Date(currentYear, 0, 1);
    const endDate = month
      ? new Date(currentYear, month, 0)
      : new Date(currentYear, 11, 31);

    const expenses = await this.prisma.expense.groupBy({
      by: ['category'],
      where: {
        companyId,
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return expenses.map((e) => ({
      category: e.category,
      total: e._sum.amount || 0,
      count: e._count,
    }));
  }

  async getMonthlyTotals(companyId: string, userId: string, year?: number) {
    await this.checkCompanyAccess(companyId, userId);

    const currentYear = year || new Date().getFullYear();

    const results: Array<{ month: number; year: number; total: number | any; count: number }> = [];
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(currentYear, month - 1, 1);
      const endDate = new Date(currentYear, month, 0);

      const total = await this.prisma.expense.aggregate({
        where: {
          companyId,
          expenseDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amount: true },
        _count: true,
      });

      results.push({
        month,
        year: currentYear,
        total: total._sum.amount || 0,
        count: total._count,
      });
    }

    return results;
  }

  async getUnpaidExpenses(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: { companyId, isPaid: false },
        orderBy: { expenseDate: 'asc' },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, isPaid: false },
        _sum: { amount: true },
      }),
    ]);

    return {
      expenses,
      totalUnpaid: total._sum.amount || 0,
    };
  }
}
