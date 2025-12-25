import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, StockMovementType, StockAlertType, StockAlertStatus } from '@prisma/client';

export interface CreateProductDto {
  code: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  unit?: string;
  purchasePrice?: number;
  salePrice?: number;
  vatRate?: number;
  currency?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
  barcode?: string;
  location?: string;
  supplier?: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  isActive?: boolean;
}

export interface StockAdjustmentDto {
  productId: string;
  quantity: number;
  type: StockMovementType;
  reference?: string;
  referenceType?: string;
  referenceId?: string;
  unitCost?: number;
  notes?: string;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new product
   */
  async createProduct(userId: string, dto: CreateProductDto) {
    // Check for duplicate code
    const existing = await this.prisma.product.findFirst({
      where: { userId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Product with code ${dto.code} already exists`);
    }

    return this.prisma.product.create({
      data: {
        userId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        brand: dto.brand,
        unit: dto.unit || 'buc',
        purchasePrice: dto.purchasePrice || 0,
        salePrice: dto.salePrice || 0,
        vatRate: dto.vatRate || 19,
        currency: dto.currency || 'RON',
        minStockLevel: dto.minStockLevel || 0,
        maxStockLevel: dto.maxStockLevel,
        barcode: dto.barcode,
        location: dto.location,
        supplier: dto.supplier,
      },
    });
  }

  /**
   * Get all products with optional filters
   */
  async getProducts(userId: string, options?: {
    category?: string;
    search?: string;
    lowStockOnly?: boolean;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { category, search, lowStockOnly, isActive, page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { userId };

    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (lowStockOnly) {
      where.currentStock = { lte: this.prisma.product.fields.minStockLevel };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Calculate available stock and add low stock flag
    const productsWithStatus = products.map(p => ({
      ...p,
      availableStock: Number(p.currentStock) - Number(p.reservedStock),
      isLowStock: Number(p.currentStock) <= Number(p.minStockLevel),
      isOutOfStock: Number(p.currentStock) <= 0,
    }));

    return {
      data: productsWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get product by ID
   */
  async getProduct(userId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, userId },
      include: {
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        stockAlerts: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      ...product,
      availableStock: Number(product.currentStock) - Number(product.reservedStock),
      isLowStock: Number(product.currentStock) <= Number(product.minStockLevel),
      isOutOfStock: Number(product.currentStock) <= 0,
    };
  }

  /**
   * Update product
   */
  async updateProduct(userId: string, id: string, dto: UpdateProductDto) {
    await this.getProduct(userId, id);

    // Check for duplicate code if changing
    if (dto.code) {
      const existing = await this.prisma.product.findFirst({
        where: { userId, code: dto.code, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Product with code ${dto.code} already exists`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: dto as any,
    });
  }

  /**
   * Delete product
   */
  async deleteProduct(userId: string, id: string) {
    await this.getProduct(userId, id);

    // Delete related records
    await this.prisma.stockMovement.deleteMany({ where: { productId: id } });
    await this.prisma.stockAlert.deleteMany({ where: { productId: id } });

    return this.prisma.product.delete({ where: { id } });
  }

  /**
   * Adjust stock levels
   */
  async adjustStock(userId: string, dto: StockAdjustmentDto) {
    const product = await this.getProduct(userId, dto.productId);

    const currentStock = Number(product.currentStock);
    let newStock: number;

    switch (dto.type) {
      case StockMovementType.IN:
      case StockMovementType.RETURN:
        newStock = currentStock + dto.quantity;
        break;
      case StockMovementType.OUT:
        newStock = currentStock - dto.quantity;
        break;
      case StockMovementType.ADJUSTMENT:
        newStock = dto.quantity; // Direct set
        break;
      case StockMovementType.TRANSFER:
        // For transfers, this would typically involve two products
        newStock = currentStock - dto.quantity;
        break;
      default:
        newStock = currentStock;
    }

    // Create movement record
    await this.prisma.stockMovement.create({
      data: {
        productId: dto.productId,
        type: dto.type,
        quantity: dto.quantity,
        previousStock: currentStock,
        newStock,
        reference: dto.reference,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        unitCost: dto.unitCost,
        notes: dto.notes,
        createdBy: userId,
      },
    });

    // Update product stock
    const updated = await this.prisma.product.update({
      where: { id: dto.productId },
      data: { currentStock: newStock },
    });

    // Check for stock alerts
    await this.checkAndCreateAlerts(userId, dto.productId, newStock);

    this.logger.log(`Stock adjusted for ${product.code}: ${currentStock} -> ${newStock}`);

    return updated;
  }

  /**
   * Check and create stock alerts
   */
  private async checkAndCreateAlerts(userId: string, productId: string, currentStock: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return;

    const minStock = Number(product.minStockLevel);
    const maxStock = product.maxStockLevel ? Number(product.maxStockLevel) : null;

    // Resolve any existing alerts that no longer apply
    await this.prisma.stockAlert.updateMany({
      where: {
        productId,
        status: 'ACTIVE',
        OR: [
          { type: 'LOW_STOCK', threshold: { lt: currentStock } },
          { type: 'OUT_OF_STOCK', AND: { threshold: { lt: currentStock } } },
        ],
      },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    // Check for out of stock
    if (currentStock <= 0) {
      const existingAlert = await this.prisma.stockAlert.findFirst({
        where: { productId, type: 'OUT_OF_STOCK', status: 'ACTIVE' },
      });

      if (!existingAlert) {
        await this.prisma.stockAlert.create({
          data: {
            productId,
            userId,
            type: StockAlertType.OUT_OF_STOCK,
            threshold: 0,
            currentLevel: currentStock,
          },
        });
        this.logger.warn(`OUT_OF_STOCK alert created for product ${product.code}`);
      }
    }
    // Check for low stock
    else if (minStock > 0 && currentStock <= minStock) {
      const existingAlert = await this.prisma.stockAlert.findFirst({
        where: { productId, type: 'LOW_STOCK', status: 'ACTIVE' },
      });

      if (!existingAlert) {
        await this.prisma.stockAlert.create({
          data: {
            productId,
            userId,
            type: StockAlertType.LOW_STOCK,
            threshold: minStock,
            currentLevel: currentStock,
          },
        });
        this.logger.warn(`LOW_STOCK alert created for product ${product.code}`);
      }
    }

    // Check for overstock
    if (maxStock && currentStock > maxStock) {
      const existingAlert = await this.prisma.stockAlert.findFirst({
        where: { productId, type: 'OVERSTOCK', status: 'ACTIVE' },
      });

      if (!existingAlert) {
        await this.prisma.stockAlert.create({
          data: {
            productId,
            userId,
            type: StockAlertType.OVERSTOCK,
            threshold: maxStock,
            currentLevel: currentStock,
          },
        });
        this.logger.warn(`OVERSTOCK alert created for product ${product.code}`);
      }
    }
  }

  /**
   * Get all active stock alerts
   */
  async getStockAlerts(userId: string, options?: {
    type?: StockAlertType;
    status?: StockAlertStatus;
  }) {
    const { type, status = 'ACTIVE' } = options || {};

    return this.prisma.stockAlert.findMany({
      where: {
        userId,
        ...(type && { type }),
        status,
      },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            currentStock: true,
            minStockLevel: true,
            maxStockLevel: true,
            unit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Acknowledge a stock alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string) {
    return this.prisma.stockAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    });
  }

  /**
   * Get stock summary for dashboard
   */
  async getStockSummary(userId: string) {
    const [products, alerts] = await Promise.all([
      this.prisma.product.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          currentStock: true,
          reservedStock: true,
          minStockLevel: true,
          purchasePrice: true,
          salePrice: true,
        },
      }),
      this.prisma.stockAlert.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { type: true },
      }),
    ]);

    let totalProducts = products.length;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const current = Number(p.currentStock);
      const min = Number(p.minStockLevel);
      const price = Number(p.purchasePrice);

      totalStockValue += current * price;

      if (current <= 0) outOfStockCount++;
      else if (min > 0 && current <= min) lowStockCount++;
    }

    const alertsByType = {
      lowStock: alerts.filter(a => a.type === 'LOW_STOCK').length,
      outOfStock: alerts.filter(a => a.type === 'OUT_OF_STOCK').length,
      overstock: alerts.filter(a => a.type === 'OVERSTOCK').length,
    };

    return {
      totalProducts,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      lowStockCount,
      outOfStockCount,
      activeAlerts: alerts.length,
      alertsByType,
    };
  }

  /**
   * Get categories
   */
  async getCategories(userId: string) {
    const products = await this.prisma.product.findMany({
      where: { userId },
      select: { category: true },
      distinct: ['category'],
    });

    return products.map(p => p.category).filter(Boolean);
  }

  /**
   * Get stock movements for a product
   */
  async getStockMovements(productId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    type?: StockMovementType;
    limit?: number;
  }) {
    const { startDate, endDate, type, limit = 50 } = options || {};

    return this.prisma.stockMovement.findMany({
      where: {
        productId,
        ...(type && { type }),
        ...(startDate && endDate && {
          createdAt: { gte: startDate, lte: endDate },
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Batch check all products for alerts (can be run on schedule)
   */
  async runStockAlertCheck(userId: string) {
    const products = await this.prisma.product.findMany({
      where: { userId, isActive: true },
    });

    let alertsCreated = 0;
    let alertsResolved = 0;

    for (const product of products) {
      const currentStock = Number(product.currentStock);
      const minStock = Number(product.minStockLevel);

      // Check low stock
      if (minStock > 0 && currentStock <= minStock && currentStock > 0) {
        const existing = await this.prisma.stockAlert.findFirst({
          where: { productId: product.id, type: 'LOW_STOCK', status: 'ACTIVE' },
        });

        if (!existing) {
          await this.prisma.stockAlert.create({
            data: {
              productId: product.id,
              userId,
              type: StockAlertType.LOW_STOCK,
              threshold: minStock,
              currentLevel: currentStock,
            },
          });
          alertsCreated++;
        }
      }

      // Check out of stock
      if (currentStock <= 0) {
        const existing = await this.prisma.stockAlert.findFirst({
          where: { productId: product.id, type: 'OUT_OF_STOCK', status: 'ACTIVE' },
        });

        if (!existing) {
          await this.prisma.stockAlert.create({
            data: {
              productId: product.id,
              userId,
              type: StockAlertType.OUT_OF_STOCK,
              threshold: 0,
              currentLevel: currentStock,
            },
          });
          alertsCreated++;
        }
      }

      // Resolve alerts where stock is back to normal
      if (currentStock > minStock) {
        const resolved = await this.prisma.stockAlert.updateMany({
          where: {
            productId: product.id,
            type: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
            status: 'ACTIVE',
          },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        alertsResolved += resolved.count;
      }
    }

    this.logger.log(`Stock alert check completed: ${alertsCreated} created, ${alertsResolved} resolved`);

    return { alertsCreated, alertsResolved, productsChecked: products.length };
  }
}
