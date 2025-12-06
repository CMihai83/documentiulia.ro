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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ProductsService = class ProductsService {
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
        if (dto.sku) {
            const existing = await this.prisma.product.findFirst({
                where: { companyId, sku: dto.sku },
            });
            if (existing) {
                throw new common_1.ConflictException('Product with this SKU already exists');
            }
        }
        return this.prisma.product.create({
            data: {
                companyId,
                ...dto,
            },
        });
    }
    async findAll(companyId, userId, params) {
        await this.checkCompanyAccess(companyId, userId);
        const { search, type, active } = params || {};
        const page = Number(params?.page) || 1;
        const limit = Number(params?.limit) || 20;
        const skip = (page - 1) * limit;
        const where = { companyId };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (type) {
            where.type = type;
        }
        if (active !== undefined) {
            where.isActive = active;
        }
        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
            }),
            this.prisma.product.count({ where }),
        ]);
        return {
            data: products,
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
        const product = await this.prisma.product.findFirst({
            where: { id, companyId },
            include: {
                invoiceItems: {
                    orderBy: { invoice: { issueDate: 'desc' } },
                    take: 10,
                    include: {
                        invoice: {
                            select: { id: true, invoiceNumber: true, issueDate: true, status: true },
                        },
                    },
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return product;
    }
    async update(companyId, id, dto, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const product = await this.prisma.product.findFirst({
            where: { id, companyId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (dto.sku && dto.sku !== product.sku) {
            const existing = await this.prisma.product.findFirst({
                where: { companyId, sku: dto.sku, NOT: { id } },
            });
            if (existing) {
                throw new common_1.ConflictException('Product with this SKU already exists');
            }
        }
        return this.prisma.product.update({
            where: { id },
            data: dto,
        });
    }
    async delete(companyId, id, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const product = await this.prisma.product.findFirst({
            where: { id, companyId },
            include: {
                _count: { select: { invoiceItems: true } },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (product._count.invoiceItems > 0) {
            return this.prisma.product.update({
                where: { id },
                data: { isActive: false },
            });
        }
        return this.prisma.product.delete({ where: { id } });
    }
    async updateStock(companyId, id, quantity, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const product = await this.prisma.product.findFirst({
            where: { id, companyId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        return this.prisma.product.update({
            where: { id },
            data: { stockQuantity: quantity },
        });
    }
    async getLowStockProducts(companyId, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const products = await this.prisma.product.findMany({
            where: {
                companyId,
                type: 'PRODUCT',
                isActive: true,
                lowStockAlert: { not: null },
            },
            orderBy: { stockQuantity: 'asc' },
        });
        return products.filter(p => p.lowStockAlert !== null && p.stockQuantity <= p.lowStockAlert);
    }
    async bulkUpdatePrices(companyId, updates, userId) {
        await this.checkCompanyAccess(companyId, userId);
        const results = await Promise.all(updates.map((update) => this.prisma.product.updateMany({
            where: { id: update.id, companyId },
            data: { unitPrice: update.unitPrice },
        })));
        return { updated: results.filter((r) => r.count > 0).length };
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map