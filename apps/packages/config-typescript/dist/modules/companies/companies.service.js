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
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const client_1 = require("@prisma/client");
let CompaniesService = class CompaniesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, userId) {
        const existing = await this.prisma.company.findUnique({
            where: { cui: dto.cui },
        });
        if (existing) {
            throw new common_1.ConflictException('Company with this CUI already exists');
        }
        return this.prisma.company.create({
            data: {
                ...dto,
                users: {
                    create: {
                        userId,
                        role: client_1.CompanyRole.OWNER,
                    },
                },
            },
            include: {
                users: {
                    include: { user: true },
                },
            },
        });
    }
    async findAll(userId) {
        return this.prisma.company.findMany({
            where: {
                users: {
                    some: { userId },
                },
            },
            include: {
                users: {
                    include: { user: true },
                },
                _count: {
                    select: {
                        clients: true,
                        invoices: true,
                        products: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id, userId) {
        const company = await this.prisma.company.findFirst({
            where: {
                id,
                users: {
                    some: { userId },
                },
            },
            include: {
                users: {
                    include: { user: true },
                },
                efacturaConfig: true,
                _count: {
                    select: {
                        clients: true,
                        invoices: true,
                        products: true,
                        expenses: true,
                        bankAccounts: true,
                    },
                },
            },
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return company;
    }
    async update(id, dto, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: {
                companyId: id,
                userId,
                role: { in: [client_1.CompanyRole.OWNER, client_1.CompanyRole.ADMIN] },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No permission to update this company');
        }
        if (dto.cui) {
            const existing = await this.prisma.company.findFirst({
                where: {
                    cui: dto.cui,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new common_1.ConflictException('Another company with this CUI already exists');
            }
        }
        return this.prisma.company.update({
            where: { id },
            data: dto,
            include: {
                users: {
                    include: { user: true },
                },
                efacturaConfig: true,
            },
        });
    }
    async delete(id, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: {
                companyId: id,
                userId,
                role: client_1.CompanyRole.OWNER,
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('Only the owner can delete the company');
        }
        return this.prisma.company.delete({
            where: { id },
        });
    }
    async addMember(companyId, dto, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: {
                companyId,
                userId,
                role: { in: [client_1.CompanyRole.OWNER, client_1.CompanyRole.ADMIN] },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No permission to add members');
        }
        const targetUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('User with this email not found');
        }
        const existingMembership = await this.prisma.companyUser.findUnique({
            where: {
                userId_companyId: {
                    userId: targetUser.id,
                    companyId,
                },
            },
        });
        if (existingMembership) {
            throw new common_1.ConflictException('User is already a member of this company');
        }
        return this.prisma.companyUser.create({
            data: {
                userId: targetUser.id,
                companyId,
                role: dto.role,
            },
            include: {
                user: true,
                company: true,
            },
        });
    }
    async updateMemberRole(companyId, memberId, dto, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: {
                companyId,
                userId,
                role: { in: [client_1.CompanyRole.OWNER, client_1.CompanyRole.ADMIN] },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No permission to update member roles');
        }
        const targetMembership = await this.prisma.companyUser.findFirst({
            where: { companyId, userId: memberId },
        });
        if (!targetMembership) {
            throw new common_1.NotFoundException('Member not found');
        }
        if (targetMembership.role === client_1.CompanyRole.OWNER && membership.role !== client_1.CompanyRole.OWNER) {
            throw new common_1.ForbiddenException('Cannot change owner role');
        }
        return this.prisma.companyUser.update({
            where: {
                userId_companyId: {
                    userId: memberId,
                    companyId,
                },
            },
            data: { role: dto.role },
            include: {
                user: true,
            },
        });
    }
    async removeMember(companyId, memberId, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: {
                companyId,
                userId,
                role: { in: [client_1.CompanyRole.OWNER, client_1.CompanyRole.ADMIN] },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No permission to remove members');
        }
        const targetMembership = await this.prisma.companyUser.findFirst({
            where: { companyId, userId: memberId },
        });
        if (!targetMembership) {
            throw new common_1.NotFoundException('Member not found');
        }
        if (targetMembership.role === client_1.CompanyRole.OWNER) {
            throw new common_1.ForbiddenException('Cannot remove the company owner');
        }
        return this.prisma.companyUser.delete({
            where: {
                userId_companyId: {
                    userId: memberId,
                    companyId,
                },
            },
        });
    }
    async getMembers(companyId, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: { companyId, userId },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No access to this company');
        }
        return this.prisma.companyUser.findMany({
            where: { companyId },
            include: {
                user: true,
            },
            orderBy: [
                { role: 'asc' },
                { user: { firstName: 'asc' } },
            ],
        });
    }
    async getStats(companyId, userId) {
        const membership = await this.prisma.companyUser.findFirst({
            where: { companyId, userId },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('No access to this company');
        }
        const [clientCount, productCount, invoiceStats, expenseStats] = await Promise.all([
            this.prisma.client.count({ where: { companyId } }),
            this.prisma.product.count({ where: { companyId, isActive: true } }),
            this.prisma.invoice.aggregate({
                where: { companyId },
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.expense.aggregate({
                where: { companyId },
                _sum: { amount: true },
                _count: true,
            }),
        ]);
        return {
            clients: clientCount,
            products: productCount,
            invoices: {
                count: invoiceStats._count,
                total: invoiceStats._sum?.total || 0,
            },
            expenses: {
                count: expenseStats._count,
                total: expenseStats._sum?.amount || 0,
            },
        };
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompaniesService);
//# sourceMappingURL=companies.service.js.map