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
exports.ReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let ReceiptsService = class ReceiptsService {
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
                ocrStatus: client_1.OcrStatus.PENDING,
            },
        });
    }
    async findAll(companyId, userId, params) {
        await this.checkCompanyAccess(companyId, userId);
        const { status, hasExpense, startDate, endDate } = params || {};
        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 20;
        const skip = (page - 1) * limit;
        const where = { companyId };
        if (status) {
            where.ocrStatus = status;
        }
        if (hasExpense !== undefined) {
            if (hasExpense) {
                where.expenseId = { not: null };
            }
            else {
                where.expenseId = null;
            }
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
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
    async findOne(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const receipt = await this.prisma.receipt.findFirst({
            where: { id, companyId },
            include: {
                expense: true,
            },
        });
        if (!receipt) {
            throw new common_1.NotFoundException('Receipt not found');
        }
        return receipt;
    }
    async updateOcrData(companyId, id, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const receipt = await this.prisma.receipt.findFirst({
            where: { id, companyId },
        });
        if (!receipt) {
            throw new common_1.NotFoundException('Receipt not found');
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
    async linkToExpense(companyId, id, expenseId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const receipt = await this.prisma.receipt.findFirst({
            where: { id, companyId },
        });
        if (!receipt) {
            throw new common_1.NotFoundException('Receipt not found');
        }
        const expense = await this.prisma.expense.findFirst({
            where: { id: expenseId, companyId },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        return this.prisma.receipt.update({
            where: { id },
            data: { expenseId },
            include: { expense: true },
        });
    }
    async unlinkFromExpense(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const receipt = await this.prisma.receipt.findFirst({
            where: { id, companyId },
        });
        if (!receipt) {
            throw new common_1.NotFoundException('Receipt not found');
        }
        return this.prisma.receipt.update({
            where: { id },
            data: { expenseId: null },
        });
    }
    async delete(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const receipt = await this.prisma.receipt.findFirst({
            where: { id, companyId },
        });
        if (!receipt) {
            throw new common_1.NotFoundException('Receipt not found');
        }
        return this.prisma.receipt.delete({ where: { id } });
    }
    async getUnprocessedReceipts(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        return this.prisma.receipt.findMany({
            where: {
                companyId,
                ocrStatus: { in: [client_1.OcrStatus.PENDING, client_1.OcrStatus.FAILED] },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async getReceiptsNeedingReview(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        return this.prisma.receipt.findMany({
            where: {
                companyId,
                ocrStatus: client_1.OcrStatus.COMPLETED,
                expenseId: null,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createExpenseFromReceipt(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const receipt = await this.prisma.receipt.findFirst({
            where: { id, companyId },
        });
        if (!receipt) {
            throw new common_1.NotFoundException('Receipt not found');
        }
        if (receipt.ocrStatus !== client_1.OcrStatus.COMPLETED) {
            throw new common_1.BadRequestException('Receipt must be processed before creating expense');
        }
        if (!receipt.total) {
            throw new common_1.BadRequestException('Receipt has no extracted total amount');
        }
        const vatAmountValue = receipt.vatAmount ? Number(receipt.vatAmount) : 0;
        const totalValue = Number(receipt.total);
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
        await this.prisma.receipt.update({
            where: { id },
            data: { expenseId: expense.id },
        });
        return expense;
    }
    async markForOcr(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const receipt = await this.prisma.receipt.findFirst({
            where: { id, companyId },
        });
        if (!receipt) {
            throw new common_1.NotFoundException('Receipt not found');
        }
        return this.prisma.receipt.update({
            where: { id },
            data: { ocrStatus: client_1.OcrStatus.PROCESSING },
        });
    }
    async getOcrQueue(limit = 10) {
        return this.prisma.receipt.findMany({
            where: { ocrStatus: client_1.OcrStatus.PENDING },
            orderBy: { createdAt: 'asc' },
            take: limit,
            include: {
                company: {
                    select: { id: true, name: true },
                },
            },
        });
    }
};
exports.ReceiptsService = ReceiptsService;
exports.ReceiptsService = ReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReceiptsService);
//# sourceMappingURL=receipts.service.js.map