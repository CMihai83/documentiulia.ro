import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
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

  async create(companyId: string, dto: CreateProductDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    // Check SKU uniqueness within company
    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, sku: dto.sku },
      });
      if (existing) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    return this.prisma.product.create({
      data: {
        companyId,
        ...dto,
      },
    });
  }

  async findAll(companyId: string, userId: string, params?: {
    search?: string;
    type?: string;
    active?: boolean;
    page?: number | string;
    limit?: number | string;
  }) {
    await this.checkCompanyAccess(companyId, userId);

    const { search, type, active } = params || {};
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

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

  async findOne(companyId: string, id: string, userId: string) {
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
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(companyId: string, id: string, dto: UpdateProductDto, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check SKU uniqueness if updating
    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { companyId, sku: dto.sku, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Product with this SKU already exists');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
    });
  }

  async delete(companyId: string, id: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: {
        _count: { select: { invoiceItems: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product._count.invoiceItems > 0) {
      // Soft delete - just deactivate
      return this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.product.delete({ where: { id } });
  }

  async updateStock(companyId: string, id: string, quantity: number, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const product = await this.prisma.product.findFirst({
      where: { id, companyId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: { stockQuantity: quantity },
    });
  }

  async getLowStockProducts(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    // Get all products with low stock alert set, then filter in application
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        type: 'PRODUCT',
        isActive: true,
        lowStockAlert: { not: null },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    // Filter products where stockQuantity <= lowStockAlert
    return products.filter(p => p.lowStockAlert !== null && p.stockQuantity <= p.lowStockAlert);
  }

  async bulkUpdatePrices(companyId: string, updates: { id: string; unitPrice: number }[], userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const results = await Promise.all(
      updates.map((update) =>
        this.prisma.product.updateMany({
          where: { id: update.id, companyId },
          data: { unitPrice: update.unitPrice },
        }),
      ),
    );

    return { updated: results.filter((r) => r.count > 0).length };
  }
}
