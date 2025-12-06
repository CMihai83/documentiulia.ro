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
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ClientsService = class ClientsService {
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
        return this.prisma.client.create({
            data: {
                companyId,
                ...dto,
            },
        });
    }
    async findAll(companyId, userId, params) {
        await this.checkCompanyAccess(companyId, userId);
        const { search, type } = params || {};
        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 20;
        const skip = (page - 1) * limit;
        const where = { companyId };
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
    async findOne(companyId, id, userId) {
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
            throw new common_1.NotFoundException('Client not found');
        }
        return client;
    }
    async update(companyId, id, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const client = await this.prisma.client.findFirst({
            where: { id, companyId },
        });
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        return this.prisma.client.update({
            where: { id },
            data: dto,
        });
    }
    async delete(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const client = await this.prisma.client.findFirst({
            where: { id, companyId },
            include: {
                _count: { select: { invoices: true } },
            },
        });
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
        }
        if (client._count.invoices > 0) {
            throw new common_1.ForbiddenException('Cannot delete client with existing invoices');
        }
        return this.prisma.client.delete({ where: { id } });
    }
    async getStats(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const client = await this.prisma.client.findFirst({
            where: { id, companyId },
        });
        if (!client) {
            throw new common_1.NotFoundException('Client not found');
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
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map