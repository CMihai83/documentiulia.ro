"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankAccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let BankAccountsService = class BankAccountsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkCompanyAccess(companyId, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: { companyId, userId },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No access to this company');
        }
        return membership;
    }
    async create(companyId, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const existing = await this.prisma.bankAccount.findFirst({
            where: { companyId, iban: dto.iban },
        });
        if (existing) {
            throw new common_1.ConflictException('Bank account with this IBAN already exists');
        }
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
    async findAll(companyId, userId) {
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
    async findOne(companyId, id, userId) {
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
            throw new common_1.NotFoundException('Bank account not found');
        }
        return account;
    }
    async update(companyId, id, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const account = await this.prisma.bankAccount.findFirst({
            where: { id, companyId },
        });
        if (!account) {
            throw new common_1.NotFoundException('Bank account not found');
        }
        if (dto.iban && dto.iban !== account.iban) {
            const existing = await this.prisma.bankAccount.findFirst({
                where: { companyId, iban: dto.iban, NOT: { id } },
            });
            if (existing) {
                throw new common_1.ConflictException('Bank account with this IBAN already exists');
            }
        }
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
    async delete(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const account = await this.prisma.bankAccount.findFirst({
            where: { id, companyId },
            include: {
                _count: { select: { transactions: true } },
            },
        });
        if (!account) {
            throw new common_1.NotFoundException('Bank account not found');
        }
        if (account._count.transactions > 0) {
            return this.prisma.bankAccount.update({
                where: { id },
                data: { isActive: false },
            });
        }
        return this.prisma.bankAccount.delete({ where: { id } });
    }
    async setDefault(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const account = await this.prisma.bankAccount.findFirst({
            where: { id, companyId },
        });
        if (!account) {
            throw new common_1.NotFoundException('Bank account not found');
        }
        await this.prisma.bankAccount.updateMany({
            where: { companyId, isDefault: true },
            data: { isDefault: false },
        });
        return this.prisma.bankAccount.update({
            where: { id },
            data: { isDefault: true },
        });
    }
    async createTransaction(companyId, accountId, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const account = await this.prisma.bankAccount.findFirst({
            where: { id: accountId, companyId },
        });
        if (!account) {
            throw new common_1.NotFoundException('Bank account not found');
        }
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
        const balanceChange = dto.type === client_1.TransactionType.CREDIT ? dto.amount : -dto.amount;
        await this.prisma.bankAccount.update({
            where: { id: accountId },
            data: {
                balance: { increment: balanceChange },
                balanceDate: new Date(),
            },
        });
        return transaction;
    }
    async getTransactions(companyId, accountId, filters, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const account = await this.prisma.bankAccount.findFirst({
            where: { id: accountId, companyId },
        });
        if (!account) {
            throw new common_1.NotFoundException('Bank account not found');
        }
        const { type, isReconciled, startDate, endDate, search, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = { bankAccountId: accountId };
        if (type) {
            where.type = type;
        }
        if (isReconciled !== undefined) {
            where.isReconciled = isReconciled;
        }
        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate)
                where.transactionDate.gte = new Date(startDate);
            if (endDate)
                where.transactionDate.lte = new Date(endDate);
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
    async getTransaction(companyId, accountId, transactionId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const transaction = await this.prisma.bankTransaction.findFirst({
            where: {
                id: transactionId,
                bankAccount: { id: accountId, companyId },
            },
            include: { bankAccount: true },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        return transaction;
    }
    async updateTransaction(companyId, accountId, transactionId, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const transaction = await this.prisma.bankTransaction.findFirst({
            where: {
                id: transactionId,
                bankAccount: { id: accountId, companyId },
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        if (dto.amount !== undefined || dto.type !== undefined) {
            const oldBalanceEffect = transaction.type === client_1.TransactionType.CREDIT
                ? Number(transaction.amount)
                : -Number(transaction.amount);
            const newAmount = dto.amount ?? Number(transaction.amount);
            const newType = dto.type ?? transaction.type;
            const newBalanceEffect = newType === client_1.TransactionType.CREDIT ? newAmount : -newAmount;
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
        const updateData = { ...dto };
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
    async deleteTransaction(companyId, accountId, transactionId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const transaction = await this.prisma.bankTransaction.findFirst({
            where: {
                id: transactionId,
                bankAccount: { id: accountId, companyId },
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        const balanceAdjustment = transaction.type === client_1.TransactionType.CREDIT
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
    async reconcileTransaction(companyId, accountId, transactionId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const transaction = await this.prisma.bankTransaction.findFirst({
            where: {
                id: transactionId,
                bankAccount: { id: accountId, companyId },
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException('Transaction not found');
        }
        return this.prisma.bankTransaction.update({
            where: { id: transactionId },
            data: { isReconciled: true },
        });
    }
    async bulkReconcile(companyId, accountId, transactionIds, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const account = await this.prisma.bankAccount.findFirst({
            where: { id: accountId, companyId },
        });
        if (!account) {
            throw new common_1.NotFoundException('Bank account not found');
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
    async getAccountStats(companyId, accountId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const account = await this.prisma.bankAccount.findFirst({
            where: { id: accountId, companyId },
        });
        if (!account) {
            throw new common_1.NotFoundException('Bank account not found');
        }
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [monthlyCredits, monthlyDebits, unreconciledCount] = await Promise.all([
            this.prisma.bankTransaction.aggregate({
                where: {
                    bankAccountId: accountId,
                    type: client_1.TransactionType.CREDIT,
                    transactionDate: { gte: startOfMonth },
                },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.bankTransaction.aggregate({
                where: {
                    bankAccountId: accountId,
                    type: client_1.TransactionType.DEBIT,
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
};
exports.BankAccountsService = BankAccountsService;
exports.BankAccountsService = BankAccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BankAccountsService);
//# sourceMappingURL=bank-accounts.service.js.map