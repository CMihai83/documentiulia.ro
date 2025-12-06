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
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let DocumentsService = class DocumentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
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
    async findAll(companyId, filters) {
        const { type, invoiceId, expenseId, search, page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;
        const where = { companyId };
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
    async findOne(companyId, id) {
        const document = await this.prisma.document.findFirst({
            where: { id, companyId },
            include: {
                invoice: { select: { id: true, invoiceNumber: true, clientId: true } },
                expense: { select: { id: true, description: true, category: true } },
            },
        });
        if (!document) {
            throw new common_1.NotFoundException('Documentul nu a fost găsit');
        }
        return document;
    }
    async update(companyId, id, dto) {
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
    async delete(companyId, id) {
        const document = await this.findOne(companyId, id);
        await this.prisma.document.delete({ where: { id } });
        return { message: 'Documentul a fost șters' };
    }
    async getByInvoice(companyId, invoiceId) {
        return this.prisma.document.findMany({
            where: { companyId, invoiceId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getByExpense(companyId, expenseId) {
        return this.prisma.document.findMany({
            where: { companyId, expenseId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getStats(companyId) {
        const [total, byType, totalSize,] = await Promise.all([
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
            }, {}),
            totalSizeBytes: totalSize._sum.fileSize || 0,
            totalSizeMB: Math.round((totalSize._sum.fileSize || 0) / (1024 * 1024) * 100) / 100,
        };
    }
    async linkToInvoice(companyId, id, invoiceId) {
        await this.findOne(companyId, id);
        return this.prisma.document.update({
            where: { id },
            data: { invoiceId },
        });
    }
    async linkToExpense(companyId, id, expenseId) {
        await this.findOne(companyId, id);
        return this.prisma.document.update({
            where: { id },
            data: { expenseId },
        });
    }
    async unlinkFromInvoice(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.document.update({
            where: { id },
            data: { invoiceId: null },
        });
    }
    async unlinkFromExpense(companyId, id) {
        await this.findOne(companyId, id);
        return this.prisma.document.update({
            where: { id },
            data: { expenseId: null },
        });
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map