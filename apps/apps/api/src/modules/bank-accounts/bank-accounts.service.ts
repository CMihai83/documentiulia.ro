import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionFilterDto,
} from './dto/bank-account.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class BankAccountsService {
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

  // Bank Account CRUD
  async create(companyId: string, dto: CreateBankAccountDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    // Check IBAN uniqueness within company
    const existing = await this.prisma.bankAccount.findFirst({
      where: { companyId, iban: dto.iban },
    });
    if (existing) {
      throw new ConflictException('Bank account with this IBAN already exists');
    }

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.bankAccount.create({
      data: {
        companyId,
        name: dto.name,
        bankName: dto.bankName,
        iban: dto.iban,
        swift: dto.swift,
        currency: dto.currency || 'RON',
        balance: dto.balance || 0,
        balanceDate: dto.balance ? new Date() : null,
        isDefault: dto.isDefault || false,
      },
    });
  }

  async findAll(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    return this.prisma.bankAccount.findMany({
      where: { companyId, isActive: true },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const account = await this.prisma.bankAccount.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    return account;
  }

  async update(companyId: string, id: string, dto: UpdateBankAccountDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const account = await this.prisma.bankAccount.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    // Check IBAN uniqueness if updating
    if (dto.iban && dto.iban !== account.iban) {
      const existing = await this.prisma.bankAccount.findFirst({
        where: { companyId, iban: dto.iban, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Bank account with this IBAN already exists');
      }
    }

    // Handle default flag
    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { companyId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: dto,
    });
  }

  async delete(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const account = await this.prisma.bankAccount.findFirst({
      where: { id, companyId },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    if (account._count.transactions > 0) {
      // Soft delete - just deactivate
      return this.prisma.bankAccount.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.bankAccount.delete({ where: { id } });
  }

  async setDefault(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const account = await this.prisma.bankAccount.findFirst({
      where: { id, companyId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    // Unset all others and set this one
    await this.prisma.bankAccount.updateMany({
      where: { companyId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.bankAccount.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  // Transaction CRUD
  async createTransaction(
    companyId: string,
    accountId: string,
    dto: CreateTransactionDto,
    userId: string,
  ) {
    await this.checkCompanyAccess(companyId, userId);

    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, companyId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    // Create transaction and update balance
    const transaction = await this.prisma.bankTransaction.create({
      data: {
        bankAccountId: accountId,
        transactionDate: new Date(dto.transactionDate),
        valueDate: dto.valueDate ? new Date(dto.valueDate) : null,
        description: dto.description,
        reference: dto.reference,
        amount: dto.amount,
        currency: dto.currency || account.currency,
        type: dto.type,
        category: dto.category,
      },
    });

    // Update account balance
    const balanceChange = dto.type === TransactionType.CREDIT ? dto.amount : -dto.amount;
    await this.prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        balance: { increment: balanceChange },
        balanceDate: new Date(),
      },
    });

    return transaction;
  }

  async getTransactions(
    companyId: string,
    accountId: string,
    filters: TransactionFilterDto,
    userId: string,
  ) {
    await this.checkCompanyAccess(companyId, userId);

    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, companyId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    const { type, isReconciled, startDate, endDate, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { bankAccountId: accountId };

    if (type) {
      where.type = type;
    }

    if (isReconciled !== undefined) {
      where.isReconciled = isReconciled;
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransaction(
    companyId: string,
    accountId: string,
    transactionId: string,
    userId: string,
  ) {
    await this.checkCompanyAccess(companyId, userId);

    const transaction = await this.prisma.bankTransaction.findFirst({
      where: {
        id: transactionId,
        bankAccount: { id: accountId, companyId },
      },
      include: { bankAccount: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async updateTransaction(
    companyId: string,
    accountId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
    userId: string,
  ) {
    await this.checkCompanyAccess(companyId, userId);

    const transaction = await this.prisma.bankTransaction.findFirst({
      where: {
        id: transactionId,
        bankAccount: { id: accountId, companyId },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // If amount or type changed, adjust balance
    if (dto.amount !== undefined || dto.type !== undefined) {
      const oldBalanceEffect =
        transaction.type === TransactionType.CREDIT
          ? Number(transaction.amount)
          : -Number(transaction.amount);

      const newAmount = dto.amount ?? Number(transaction.amount);
      const newType = dto.type ?? transaction.type;
      const newBalanceEffect = newType === TransactionType.CREDIT ? newAmount : -newAmount;

      const balanceAdjustment = newBalanceEffect - oldBalanceEffect;

      if (balanceAdjustment !== 0) {
        await this.prisma.bankAccount.update({
          where: { id: accountId },
          data: {
            balance: { increment: balanceAdjustment },
            balanceDate: new Date(),
          },
        });
      }
    }

    const updateData: any = { ...dto };
    if (dto.transactionDate) {
      updateData.transactionDate = new Date(dto.transactionDate);
    }
    if (dto.valueDate) {
      updateData.valueDate = new Date(dto.valueDate);
    }

    return this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: updateData,
    });
  }

  async deleteTransaction(
    companyId: string,
    accountId: string,
    transactionId: string,
    userId: string,
  ) {
    await this.checkCompanyAccess(companyId, userId);

    const transaction = await this.prisma.bankTransaction.findFirst({
      where: {
        id: transactionId,
        bankAccount: { id: accountId, companyId },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Reverse balance effect
    const balanceAdjustment =
      transaction.type === TransactionType.CREDIT
        ? -Number(transaction.amount)
        : Number(transaction.amount);

    await Promise.all([
      this.prisma.bankTransaction.delete({ where: { id: transactionId } }),
      this.prisma.bankAccount.update({
        where: { id: accountId },
        data: {
          balance: { increment: balanceAdjustment },
          balanceDate: new Date(),
        },
      }),
    ]);

    return { message: 'Transaction deleted' };
  }

  async reconcileTransaction(
    companyId: string,
    accountId: string,
    transactionId: string,
    userId: string,
  ) {
    await this.checkCompanyAccess(companyId, userId);

    const transaction = await this.prisma.bankTransaction.findFirst({
      where: {
        id: transactionId,
        bankAccount: { id: accountId, companyId },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: { isReconciled: true },
    });
  }

  async bulkReconcile(
    companyId: string,
    accountId: string,
    transactionIds: string[],
    userId: string,
  ) {
    await this.checkCompanyAccess(companyId, userId);

    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, companyId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    const result = await this.prisma.bankTransaction.updateMany({
      where: {
        id: { in: transactionIds },
        bankAccountId: accountId,
      },
      data: { isReconciled: true },
    });

    return { reconciled: result.count };
  }

  // Statistics
  async getAccountStats(companyId: string, accountId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const account = await this.prisma.bankAccount.findFirst({
      where: { id: accountId, companyId },
    });

    if (!account) {
      throw new NotFoundException('Bank account not found');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyCredits, monthlyDebits, unreconciledCount] = await Promise.all([
      this.prisma.bankTransaction.aggregate({
        where: {
          bankAccountId: accountId,
          type: TransactionType.CREDIT,
          transactionDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.bankTransaction.aggregate({
        where: {
          bankAccountId: accountId,
          type: TransactionType.DEBIT,
          transactionDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.bankTransaction.count({
        where: {
          bankAccountId: accountId,
          isReconciled: false,
        },
      }),
    ]);

    return {
      currentBalance: account.balance,
      balanceDate: account.balanceDate,
      monthlyCredits: {
        amount: monthlyCredits._sum.amount || 0,
        count: monthlyCredits._count,
      },
      monthlyDebits: {
        amount: monthlyDebits._sum.amount || 0,
        count: monthlyDebits._count,
      },
      unreconciledTransactions: unreconciledCount,
    };
  }
}
