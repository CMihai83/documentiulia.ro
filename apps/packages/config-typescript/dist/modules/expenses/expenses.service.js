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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ExpensesService = class ExpensesService {
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
    async findAll(companyId, userId, params) {
        await this.checkCompanyAccess(companyId, userId);
        const { search, category, isPaid, startDate, endDate, page = 1, limit = 20 } = params || {};
        const skip = (page - 1) * limit;
        const where = { companyId };
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
            if (startDate)
                where.expenseDate.gte = new Date(startDate);
            if (endDate)
                where.expenseDate.lte = new Date(endDate);
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
    async findOne(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const expense = await this.prisma.expense.findFirst({
            where: { id, companyId },
            include: {
                receipts: true,
            },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        return expense;
    }
    async update(companyId, id, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const expense = await this.prisma.expense.findFirst({
            where: { id, companyId },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        const updateData = { ...dto };
        if (dto.expenseDate) {
            updateData.expenseDate = new Date(dto.expenseDate);
        }
        return this.prisma.expense.update({
            where: { id },
            data: updateData,
        });
    }
    async delete(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const expense = await this.prisma.expense.findFirst({
            where: { id, companyId },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        return this.prisma.expense.delete({ where: { id } });
    }
    async markAsPaid(companyId, id, userId, paidDate) {
        await this.checkCompanyAccess(companyId, userId);
        const expense = await this.prisma.expense.findFirst({
            where: { id, companyId },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        return this.prisma.expense.update({
            where: { id },
            data: {
                isPaid: true,
            },
        });
    }
    async getByCategory(companyId, userId, year, month) {
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
    async getMonthlyTotals(companyId, userId, year) {
        await this.checkCompanyAccess(companyId, userId);
        const currentYear = year || new Date().getFullYear();
        const results = [];
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
    async getUnpaidExpenses(companyId, userId) {
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
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map