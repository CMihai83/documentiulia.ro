import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Warehouse Management Service
 * Multi-location stock tracking with full inventory management
 *
 * Features:
 * - Multiple warehouse/location support
 * - Product inventory tracking with lot/batch numbers
 * - Stock movements (receipts, shipments, transfers, adjustments)
 * - Bin/location management within warehouses
 * - Stock reservations for orders
 * - Inventory valuation (FIFO, LIFO, weighted average)
 * - Low stock alerts and reorder points
 * - Stock counts and cycle counting
 * - Integration with e-Transport for goods movements
 */

// =================== TYPES & ENUMS ===================

export enum WarehouseType {
  MAIN = 'MAIN',
  DISTRIBUTION = 'DISTRIBUTION',
  RETAIL = 'RETAIL',
  COLD_STORAGE = 'COLD_STORAGE',
  BONDED = 'BONDED',
  TRANSIT = 'TRANSIT',
}

export enum LocationType {
  RECEIVING = 'RECEIVING',
  STORAGE = 'STORAGE',
  PICKING = 'PICKING',
  PACKING = 'PACKING',
  SHIPPING = 'SHIPPING',
  QUARANTINE = 'QUARANTINE',
  DAMAGED = 'DAMAGED',
}

export enum MovementType {
  RECEIPT = 'RECEIPT',
  SHIPMENT = 'SHIPMENT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  SCRAP = 'SCRAP',
  PRODUCTION = 'PRODUCTION',
  CONSUMPTION = 'CONSUMPTION',
}

export enum ValuationMethod {
  FIFO = 'FIFO',
  LIFO = 'LIFO',
  WEIGHTED_AVERAGE = 'WEIGHTED_AVERAGE',
  SPECIFIC_IDENTIFICATION = 'SPECIFIC_IDENTIFICATION',
}

export enum StockStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  QUARANTINE = 'QUARANTINE',
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
  IN_TRANSIT = 'IN_TRANSIT',
}

export enum UnitOfMeasure {
  PIECE = 'BUC',
  KILOGRAM = 'KG',
  LITER = 'L',
  METER = 'M',
  SQUARE_METER = 'MP',
  CUBIC_METER = 'MC',
  PALLET = 'PAL',
  BOX = 'CUT',
  PACK = 'PAC',
}

// =================== INTERFACES ===================

export interface Warehouse {
  id: string;
  userId: string;
  organizationId?: string;
  code: string;
  name: string;
  type: WarehouseType;
  address: {
    street: string;
    city: string;
    county: string;
    postalCode: string;
    country: string;
  };
  contact?: {
    name: string;
    phone: string;
    email: string;
  };
  capacity?: {
    totalArea: number;
    usableArea: number;
    palletPositions: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarehouseLocation {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  type: LocationType;
  zone?: string;
  aisle?: string;
  rack?: string;
  level?: string;
  bin?: string;
  capacity?: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  userId: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure: UnitOfMeasure;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  valuationMethod: ValuationMethod;
  standardCost?: number;
  lastPurchasePrice?: number;
  sellingPrice?: number;
  vatRate: number;
  ncCode?: string; // Nomenclatura Combinata for customs
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  locationId?: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: Date;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  status: StockStatus;
  unitCost: number;
  totalValue: number;
  receivedAt: Date;
  lastMovementAt: Date;
}

export interface StockMovement {
  id: string;
  userId: string;
  movementNumber: string;
  type: MovementType;
  date: Date;
  sourceWarehouseId?: string;
  sourceLocationId?: string;
  destinationWarehouseId?: string;
  destinationLocationId?: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  reference?: string;
  reason?: string;
  documentNumber?: string;
  eTransportUIT?: string;
  performedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
}

export interface StockReservation {
  id: string;
  stockLevelId: string;
  orderId: string;
  orderType: 'SALES_ORDER' | 'TRANSFER_ORDER' | 'PRODUCTION_ORDER';
  quantity: number;
  reservedAt: Date;
  expiresAt: Date;
  status: 'ACTIVE' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
}

export interface StockCount {
  id: string;
  userId: string;
  warehouseId: string;
  countNumber: string;
  type: 'FULL' | 'CYCLE' | 'SPOT';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: Date;
  completedAt?: Date;
  performedBy?: string;
  approvedBy?: string;
  items: StockCountItem[];
  createdAt: Date;
}

export interface StockCountItem {
  productId: string;
  locationId?: string;
  lotNumber?: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  varianceValue?: number;
  notes?: string;
}

export interface InventoryValuation {
  warehouseId?: string;
  valuationDate: Date;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  byCategory: {
    category: string;
    items: number;
    quantity: number;
    value: number;
  }[];
  byWarehouse: {
    warehouseId: string;
    warehouseName: string;
    items: number;
    quantity: number;
    value: number;
  }[];
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  daysOfStock: number;
  suggestedOrderQty: number;
}

// =================== SERVICE ===================

@Injectable()
export class WarehouseService {
  private readonly logger = new Logger(WarehouseService.name);

  // In-memory storage
  private warehouses: Map<string, Warehouse> = new Map();
  private locations: Map<string, WarehouseLocation> = new Map();
  private products: Map<string, Product> = new Map();
  private stockLevels: Map<string, StockLevel> = new Map();
  private movements: Map<string, StockMovement> = new Map();
  private reservations: Map<string, StockReservation> = new Map();
  private stockCounts: Map<string, StockCount> = new Map();

  private counters = {
    warehouse: 0,
    location: 0,
    product: 0,
    stock: 0,
    movement: 0,
    reservation: 0,
    count: 0,
  };

  constructor(private readonly prisma: PrismaService) {}

  // =================== WAREHOUSE MANAGEMENT ===================

  async createWarehouse(
    userId: string,
    data: Omit<Warehouse, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Warehouse> {
    const id = `wh_${++this.counters.warehouse}_${Date.now()}`;

    // Check for duplicate code
    const existing = Array.from(this.warehouses.values())
      .find(w => w.userId === userId && w.code === data.code);
    if (existing) {
      throw new BadRequestException(`Warehouse with code ${data.code} already exists`);
    }

    const warehouse: Warehouse = {
      id,
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.warehouses.set(id, warehouse);
    this.logger.log(`Created warehouse ${id}: ${data.name}`);

    return warehouse;
  }

  getWarehouse(tenantId: string, warehouseId?: string): Warehouse {
    // Handle single-arg call for internal use
    const actualWarehouseId = warehouseId || tenantId;
    const warehouse = this.warehouses.get(actualWarehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${actualWarehouseId} not found`);
    }
    // If tenantId provided separately, verify ownership
    if (warehouseId && warehouse.userId !== tenantId) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }
    return warehouse;
  }

  getUserWarehouses(userId: string, type?: WarehouseType): Warehouse[] {
    let warehouses = Array.from(this.warehouses.values())
      .filter(w => w.userId === userId && w.isActive);

    if (type) {
      warehouses = warehouses.filter(w => w.type === type);
    }

    return warehouses.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateWarehouse(
    tenantIdOrWarehouseId: string,
    warehouseIdOrData?: string | Partial<Omit<Warehouse, 'id' | 'userId' | 'createdAt'>>,
    data?: Partial<Omit<Warehouse, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<Warehouse> {
    // Support both (warehouseId, data) and (tenantId, warehouseId, data) signatures
    let warehouseId: string;
    let updateData: Partial<Omit<Warehouse, 'id' | 'userId' | 'createdAt'>>;

    if (data) {
      warehouseId = warehouseIdOrData as string;
      updateData = data;
    } else {
      warehouseId = tenantIdOrWarehouseId;
      updateData = warehouseIdOrData as Partial<Omit<Warehouse, 'id' | 'userId' | 'createdAt'>>;
    }

    const warehouse = this.warehouses.get(warehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }

    Object.assign(warehouse, updateData, { updatedAt: new Date() });
    this.warehouses.set(warehouseId, warehouse);

    return warehouse;
  }

  // =================== LOCATION MANAGEMENT ===================

  async createLocation(
    tenantIdOrWarehouseId: string,
    warehouseIdOrData: string | any,
    data?: any,
  ): Promise<WarehouseLocation> {
    // Support both (warehouseId, data) and (tenantId, warehouseId, data) signatures
    let warehouseId: string;
    let locationData: any;

    if (data) {
      warehouseId = warehouseIdOrData as string;
      locationData = data;
    } else {
      warehouseId = tenantIdOrWarehouseId;
      locationData = warehouseIdOrData;
    }

    const warehouse = this.warehouses.get(warehouseId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${warehouseId} not found`);
    }
    const id = `loc_${++this.counters.location}_${Date.now()}`;

    const location: WarehouseLocation = {
      id,
      warehouseId,
      code: locationData.code,
      name: locationData.name,
      type: locationData.type as LocationType || LocationType.STORAGE,
      zone: locationData.zone,
      aisle: locationData.aisle,
      rack: locationData.rack,
      level: locationData.shelf,
      bin: locationData.bin,
      capacity: locationData.capacity,
      isActive: true,
    };

    this.locations.set(id, location);
    this.logger.log(`Created location ${id}: ${locationData.code} in warehouse ${warehouseId}`);

    return location;
  }

  getWarehouseLocations(warehouseId: string, type?: LocationType): WarehouseLocation[] {
    let locations = Array.from(this.locations.values())
      .filter(l => l.warehouseId === warehouseId && l.isActive);

    if (type) {
      locations = locations.filter(l => l.type === type);
    }

    return locations.sort((a, b) => a.code.localeCompare(b.code));
  }

  // =================== PRODUCT MANAGEMENT ===================

  async createProduct(
    userId: string,
    data: Omit<Product, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Product> {
    const id = `prod_${++this.counters.product}_${Date.now()}`;

    // Check for duplicate SKU
    const existing = Array.from(this.products.values())
      .find(p => p.userId === userId && p.sku === data.sku);
    if (existing) {
      throw new BadRequestException(`Product with SKU ${data.sku} already exists`);
    }

    const product: Product = {
      id,
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(id, product);
    this.logger.log(`Created product ${id}: ${data.name}`);

    return product;
  }

  getProduct(tenantId: string, productId?: string): Product {
    // Handle both single-arg and two-arg calls
    const actualProductId = productId || tenantId;
    const product = this.products.get(actualProductId);
    if (!product) {
      throw new NotFoundException(`Product ${actualProductId} not found`);
    }
    if (productId && product.userId !== tenantId) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    return product;
  }

  getUserProducts(userId: string, options?: {
    category?: string;
    search?: string;
    lowStock?: boolean;
  }): Product[] {
    let products = Array.from(this.products.values())
      .filter(p => p.userId === userId && p.isActive);

    if (options?.category) {
      products = products.filter(p => p.category === options.category);
    }
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower) ||
        p.barcode?.toLowerCase().includes(searchLower)
      );
    }

    return products.sort((a, b) => a.name.localeCompare(b.name));
  }

  // =================== STOCK LEVEL MANAGEMENT ===================

  async addStock(
    userId: string,
    data: {
      productId: string;
      warehouseId: string;
      locationId?: string;
      quantity: number;
      unitCost: number;
      lotNumber?: string;
      batchNumber?: string;
      serialNumber?: string;
      expiryDate?: Date;
      reference?: string;
      documentNumber?: string;
    },
  ): Promise<{ stockLevel: StockLevel; movement: StockMovement }> {
    const product = this.getProduct(data.productId);
    const warehouse = this.getWarehouse(data.warehouseId);

    const stockId = `stk_${++this.counters.stock}_${Date.now()}`;
    const now = new Date();

    // Create or update stock level
    const existingStock = this.findStockLevel(
      data.productId,
      data.warehouseId,
      data.locationId,
      data.lotNumber,
    );

    let stockLevel: StockLevel;

    if (existingStock) {
      // Update existing stock (weighted average cost)
      const totalQty = existingStock.quantity + data.quantity;
      const totalValue = existingStock.totalValue + (data.quantity * data.unitCost);
      const newUnitCost = totalValue / totalQty;

      existingStock.quantity = totalQty;
      existingStock.availableQuantity = totalQty - existingStock.reservedQuantity;
      existingStock.unitCost = newUnitCost;
      existingStock.totalValue = totalValue;
      existingStock.lastMovementAt = now;

      stockLevel = existingStock;
    } else {
      stockLevel = {
        id: stockId,
        productId: data.productId,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        lotNumber: data.lotNumber,
        batchNumber: data.batchNumber,
        serialNumber: data.serialNumber,
        expiryDate: data.expiryDate,
        quantity: data.quantity,
        reservedQuantity: 0,
        availableQuantity: data.quantity,
        status: StockStatus.AVAILABLE,
        unitCost: data.unitCost,
        totalValue: data.quantity * data.unitCost,
        receivedAt: now,
        lastMovementAt: now,
      };
      this.stockLevels.set(stockId, stockLevel);
    }

    // Create movement record
    const movement = await this.createMovement(userId, {
      type: MovementType.RECEIPT,
      destinationWarehouseId: data.warehouseId,
      destinationLocationId: data.locationId,
      productId: data.productId,
      quantity: data.quantity,
      unitCost: data.unitCost,
      lotNumber: data.lotNumber,
      batchNumber: data.batchNumber,
      serialNumber: data.serialNumber,
      reference: data.reference,
      documentNumber: data.documentNumber,
    });

    this.logger.log(`Added stock: ${data.quantity} ${product.unitOfMeasure} of ${product.sku} to ${warehouse.code}`);

    return { stockLevel, movement };
  }

  async removeStock(
    userId: string,
    data: {
      productId: string;
      warehouseId: string;
      locationId?: string;
      quantity: number;
      lotNumber?: string;
      reason?: string;
      reference?: string;
      documentNumber?: string;
      eTransportUIT?: string;
    },
  ): Promise<{ stockLevel: StockLevel; movement: StockMovement }> {
    const product = this.getProduct(data.productId);
    const warehouse = this.getWarehouse(data.warehouseId);

    const stockLevel = this.findStockLevel(
      data.productId,
      data.warehouseId,
      data.locationId,
      data.lotNumber,
    );

    if (!stockLevel) {
      throw new NotFoundException('Stock not found');
    }

    if (stockLevel.availableQuantity < data.quantity) {
      throw new BadRequestException(
        `Insufficient stock: available ${stockLevel.availableQuantity}, requested ${data.quantity}`,
      );
    }

    // Update stock level
    stockLevel.quantity -= data.quantity;
    stockLevel.availableQuantity -= data.quantity;
    stockLevel.totalValue = stockLevel.quantity * stockLevel.unitCost;
    stockLevel.lastMovementAt = new Date();

    // Create movement record
    const movement = await this.createMovement(userId, {
      type: MovementType.SHIPMENT,
      sourceWarehouseId: data.warehouseId,
      sourceLocationId: data.locationId,
      productId: data.productId,
      quantity: data.quantity,
      unitCost: stockLevel.unitCost,
      lotNumber: data.lotNumber,
      reason: data.reason,
      reference: data.reference,
      documentNumber: data.documentNumber,
      eTransportUIT: data.eTransportUIT,
    });

    this.logger.log(`Removed stock: ${data.quantity} ${product.unitOfMeasure} of ${product.sku} from ${warehouse.code}`);

    return { stockLevel, movement };
  }

  async transferStock(
    userId: string,
    data: {
      productId: string;
      sourceWarehouseId: string;
      sourceLocationId?: string;
      destinationWarehouseId: string;
      destinationLocationId?: string;
      quantity: number;
      lotNumber?: string;
      reference?: string;
      eTransportUIT?: string;
    },
  ): Promise<{ sourceStock: StockLevel; destinationStock: StockLevel; movement: StockMovement }> {
    const product = this.getProduct(data.productId);

    // Remove from source
    const sourceStock = this.findStockLevel(
      data.productId,
      data.sourceWarehouseId,
      data.sourceLocationId,
      data.lotNumber,
    );

    if (!sourceStock) {
      throw new NotFoundException('Source stock not found');
    }

    if (sourceStock.availableQuantity < data.quantity) {
      throw new BadRequestException('Insufficient stock for transfer');
    }

    const unitCost = sourceStock.unitCost;

    // Update source stock
    sourceStock.quantity -= data.quantity;
    sourceStock.availableQuantity -= data.quantity;
    sourceStock.totalValue = sourceStock.quantity * sourceStock.unitCost;
    sourceStock.lastMovementAt = new Date();

    // Add to destination
    const existingDestStock = this.findStockLevel(
      data.productId,
      data.destinationWarehouseId,
      data.destinationLocationId,
      data.lotNumber,
    );

    let destinationStock: StockLevel;

    if (existingDestStock) {
      const totalQty = existingDestStock.quantity + data.quantity;
      const totalValue = existingDestStock.totalValue + (data.quantity * unitCost);

      existingDestStock.quantity = totalQty;
      existingDestStock.availableQuantity = totalQty - existingDestStock.reservedQuantity;
      existingDestStock.unitCost = totalValue / totalQty;
      existingDestStock.totalValue = totalValue;
      existingDestStock.lastMovementAt = new Date();

      destinationStock = existingDestStock;
    } else {
      const stockId = `stk_${++this.counters.stock}_${Date.now()}`;
      destinationStock = {
        id: stockId,
        productId: data.productId,
        warehouseId: data.destinationWarehouseId,
        locationId: data.destinationLocationId,
        lotNumber: data.lotNumber,
        quantity: data.quantity,
        reservedQuantity: 0,
        availableQuantity: data.quantity,
        status: StockStatus.AVAILABLE,
        unitCost,
        totalValue: data.quantity * unitCost,
        receivedAt: new Date(),
        lastMovementAt: new Date(),
      };
      this.stockLevels.set(stockId, destinationStock);
    }

    // Create movement record
    const movement = await this.createMovement(userId, {
      type: MovementType.TRANSFER,
      sourceWarehouseId: data.sourceWarehouseId,
      sourceLocationId: data.sourceLocationId,
      destinationWarehouseId: data.destinationWarehouseId,
      destinationLocationId: data.destinationLocationId,
      productId: data.productId,
      quantity: data.quantity,
      unitCost,
      lotNumber: data.lotNumber,
      reference: data.reference,
      eTransportUIT: data.eTransportUIT,
    });

    this.logger.log(`Transferred stock: ${data.quantity} ${product.unitOfMeasure} of ${product.sku}`);

    return { sourceStock, destinationStock, movement };
  }

  async adjustStock(
    userId: string,
    data: {
      productId: string;
      warehouseId: string;
      locationId?: string;
      lotNumber?: string;
      newQuantity: number;
      reason: string;
      reference?: string;
    },
  ): Promise<{ stockLevel: StockLevel; movement: StockMovement }> {
    const product = this.getProduct(data.productId);

    let stockLevel = this.findStockLevel(
      data.productId,
      data.warehouseId,
      data.locationId,
      data.lotNumber,
    );

    if (!stockLevel) {
      // Create new stock level if doesn't exist
      const stockId = `stk_${++this.counters.stock}_${Date.now()}`;
      stockLevel = {
        id: stockId,
        productId: data.productId,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        lotNumber: data.lotNumber,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        status: StockStatus.AVAILABLE,
        unitCost: product.standardCost || 0,
        totalValue: 0,
        receivedAt: new Date(),
        lastMovementAt: new Date(),
      };
      this.stockLevels.set(stockId, stockLevel);
    }

    const adjustment = data.newQuantity - stockLevel.quantity;
    const oldQuantity = stockLevel.quantity;

    // Update stock level
    stockLevel.quantity = data.newQuantity;
    stockLevel.availableQuantity = data.newQuantity - stockLevel.reservedQuantity;
    stockLevel.totalValue = data.newQuantity * stockLevel.unitCost;
    stockLevel.lastMovementAt = new Date();

    // Create movement record
    const movement = await this.createMovement(userId, {
      type: MovementType.ADJUSTMENT,
      sourceWarehouseId: adjustment < 0 ? data.warehouseId : undefined,
      destinationWarehouseId: adjustment > 0 ? data.warehouseId : undefined,
      productId: data.productId,
      quantity: Math.abs(adjustment),
      unitCost: stockLevel.unitCost,
      lotNumber: data.lotNumber,
      reason: `${data.reason} (${oldQuantity} -> ${data.newQuantity})`,
      reference: data.reference,
    });

    this.logger.log(`Adjusted stock: ${product.sku} from ${oldQuantity} to ${data.newQuantity}`);

    return { stockLevel, movement };
  }

  // =================== STOCK QUERIES ===================

  getStockLevel(
    productId: string,
    warehouseId: string,
    locationId?: string,
    lotNumber?: string,
  ): StockLevel | undefined {
    return this.findStockLevel(productId, warehouseId, locationId, lotNumber);
  }

  getProductStock(productId: string): StockLevel[] {
    return Array.from(this.stockLevels.values())
      .filter(s => s.productId === productId && s.quantity > 0);
  }

  getWarehouseStock(warehouseId: string, options?: {
    locationId?: string;
    productId?: string;
    status?: StockStatus;
    lowStock?: boolean;
  }): StockLevel[] {
    let stock = Array.from(this.stockLevels.values())
      .filter(s => s.warehouseId === warehouseId && s.quantity > 0);

    if (options?.locationId) {
      stock = stock.filter(s => s.locationId === options.locationId);
    }
    if (options?.productId) {
      stock = stock.filter(s => s.productId === options.productId);
    }
    if (options?.status) {
      stock = stock.filter(s => s.status === options.status);
    }

    return stock;
  }

  getTotalStock(productId: string): {
    totalQuantity: number;
    availableQuantity: number;
    reservedQuantity: number;
    totalValue: number;
    byWarehouse: { warehouseId: string; quantity: number; value: number }[];
  } {
    const stocks = this.getProductStock(productId);

    const byWarehouse: Map<string, { quantity: number; value: number }> = new Map();

    let totalQuantity = 0;
    let availableQuantity = 0;
    let reservedQuantity = 0;
    let totalValue = 0;

    for (const stock of stocks) {
      totalQuantity += stock.quantity;
      availableQuantity += stock.availableQuantity;
      reservedQuantity += stock.reservedQuantity;
      totalValue += stock.totalValue;

      const existing = byWarehouse.get(stock.warehouseId) || { quantity: 0, value: 0 };
      existing.quantity += stock.quantity;
      existing.value += stock.totalValue;
      byWarehouse.set(stock.warehouseId, existing);
    }

    return {
      totalQuantity,
      availableQuantity,
      reservedQuantity,
      totalValue,
      byWarehouse: Array.from(byWarehouse.entries()).map(([warehouseId, data]) => ({
        warehouseId,
        ...data,
      })),
    };
  }

  // =================== STOCK RESERVATIONS ===================

  async reserveStock(
    stockLevelId: string,
    orderId: string,
    orderType: StockReservation['orderType'],
    quantity: number,
    expiresInMinutes: number = 60,
  ): Promise<StockReservation> {
    const stockLevel = this.stockLevels.get(stockLevelId);
    if (!stockLevel) {
      throw new NotFoundException('Stock not found');
    }

    if (stockLevel.availableQuantity < quantity) {
      throw new BadRequestException('Insufficient available stock');
    }

    const id = `res_${++this.counters.reservation}_${Date.now()}`;
    const now = new Date();

    const reservation: StockReservation = {
      id,
      stockLevelId,
      orderId,
      orderType,
      quantity,
      reservedAt: now,
      expiresAt: new Date(now.getTime() + expiresInMinutes * 60 * 1000),
      status: 'ACTIVE',
    };

    // Update stock level
    stockLevel.reservedQuantity += quantity;
    stockLevel.availableQuantity -= quantity;

    this.reservations.set(id, reservation);
    this.logger.log(`Reserved ${quantity} units of stock ${stockLevelId} for order ${orderId}`);

    return reservation;
  }

  async releaseReservation(reservationId: string): Promise<void> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== 'ACTIVE') {
      return;
    }

    const stockLevel = this.stockLevels.get(reservation.stockLevelId);
    if (stockLevel) {
      stockLevel.reservedQuantity -= reservation.quantity;
      stockLevel.availableQuantity += reservation.quantity;
    }

    reservation.status = 'CANCELLED';
    this.logger.log(`Released reservation ${reservationId}`);
  }

  async fulfillReservation(reservationId: string): Promise<void> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException('Reservation is not active');
    }

    const stockLevel = this.stockLevels.get(reservation.stockLevelId);
    if (stockLevel) {
      stockLevel.quantity -= reservation.quantity;
      stockLevel.reservedQuantity -= reservation.quantity;
      stockLevel.totalValue = stockLevel.quantity * stockLevel.unitCost;
      stockLevel.lastMovementAt = new Date();
    }

    reservation.status = 'FULFILLED';
    this.logger.log(`Fulfilled reservation ${reservationId}`);
  }

  // =================== INVENTORY VALUATION ===================

  getInventoryValuation(userId: string, warehouseId?: string): InventoryValuation {
    let stocks = Array.from(this.stockLevels.values())
      .filter(s => s.quantity > 0);

    if (warehouseId) {
      stocks = stocks.filter(s => s.warehouseId === warehouseId);
    }

    // Filter by user's products
    const userProductIds = new Set(
      Array.from(this.products.values())
        .filter(p => p.userId === userId)
        .map(p => p.id)
    );
    stocks = stocks.filter(s => userProductIds.has(s.productId));

    // Calculate totals
    let totalItems = 0;
    let totalQuantity = 0;
    let totalValue = 0;

    const byCategory: Map<string, { items: number; quantity: number; value: number }> = new Map();
    const byWarehouse: Map<string, { items: number; quantity: number; value: number }> = new Map();

    for (const stock of stocks) {
      const product = this.products.get(stock.productId);
      if (!product) continue;

      totalItems++;
      totalQuantity += stock.quantity;
      totalValue += stock.totalValue;

      // By category
      const category = product.category || 'Uncategorized';
      const catData = byCategory.get(category) || { items: 0, quantity: 0, value: 0 };
      catData.items++;
      catData.quantity += stock.quantity;
      catData.value += stock.totalValue;
      byCategory.set(category, catData);

      // By warehouse
      const whData = byWarehouse.get(stock.warehouseId) || { items: 0, quantity: 0, value: 0 };
      whData.items++;
      whData.quantity += stock.quantity;
      whData.value += stock.totalValue;
      byWarehouse.set(stock.warehouseId, whData);
    }

    return {
      warehouseId,
      valuationDate: new Date(),
      totalItems,
      totalQuantity,
      totalValue,
      byCategory: Array.from(byCategory.entries()).map(([category, data]) => ({
        category,
        ...data,
      })),
      byWarehouse: Array.from(byWarehouse.entries()).map(([id, data]) => ({
        warehouseId: id,
        warehouseName: this.warehouses.get(id)?.name || 'Unknown',
        ...data,
      })),
    };
  }

  // =================== LOW STOCK ALERTS ===================

  getLowStockAlerts(userId: string): LowStockAlert[] {
    const alerts: LowStockAlert[] = [];
    const products = Array.from(this.products.values())
      .filter(p => p.userId === userId && p.isActive && p.reorderPoint);

    for (const product of products) {
      const stockByWarehouse = new Map<string, number>();

      const stocks = Array.from(this.stockLevels.values())
        .filter(s => s.productId === product.id && s.quantity > 0);

      for (const stock of stocks) {
        const current = stockByWarehouse.get(stock.warehouseId) || 0;
        stockByWarehouse.set(stock.warehouseId, current + stock.availableQuantity);
      }

      // Check each warehouse
      for (const [warehouseId, currentStock] of stockByWarehouse) {
        if (currentStock < (product.reorderPoint || 0)) {
          const warehouse = this.warehouses.get(warehouseId);
          alerts.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            warehouseId,
            warehouseName: warehouse?.name || 'Unknown',
            currentStock,
            reorderPoint: product.reorderPoint || 0,
            reorderQuantity: product.reorderQuantity || 0,
            daysOfStock: 0, // Would calculate based on average consumption
            suggestedOrderQty: Math.max(
              (product.reorderQuantity || 0),
              (product.maxStock || 0) - currentStock,
            ),
          });
        }
      }
    }

    return alerts.sort((a, b) => a.currentStock / a.reorderPoint - b.currentStock / b.reorderPoint);
  }

  // =================== STOCK COUNTS ===================

  async createStockCount(
    userId: string,
    warehouseId: string,
    type: StockCount['type'],
  ): Promise<StockCount> {
    const warehouse = this.getWarehouse(warehouseId);
    const id = `cnt_${++this.counters.count}_${Date.now()}`;

    // Get current stock for items
    const stocks = this.getWarehouseStock(warehouseId);
    const items: StockCountItem[] = stocks.map(s => ({
      productId: s.productId,
      locationId: s.locationId,
      lotNumber: s.lotNumber,
      systemQuantity: s.quantity,
    }));

    const count: StockCount = {
      id,
      userId,
      warehouseId,
      countNumber: `CNT-${Date.now()}`,
      type,
      status: 'DRAFT',
      items,
      createdAt: new Date(),
    };

    this.stockCounts.set(id, count);
    this.logger.log(`Created stock count ${id} for warehouse ${warehouse.name}`);

    return count;
  }

  async updateStockCountItem(
    countId: string,
    productId: string,
    countedQuantity: number,
    notes?: string,
  ): Promise<StockCount> {
    const count = this.stockCounts.get(countId);
    if (!count) {
      throw new NotFoundException('Stock count not found');
    }

    if (count.status === 'COMPLETED' || count.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update completed or cancelled count');
    }

    const item = count.items.find(i => i.productId === productId);
    if (!item) {
      throw new NotFoundException('Item not found in count');
    }

    item.countedQuantity = countedQuantity;
    item.variance = countedQuantity - item.systemQuantity;
    item.notes = notes;

    // Calculate variance value
    const product = this.products.get(productId);
    const stock = Array.from(this.stockLevels.values())
      .find(s => s.productId === productId && s.warehouseId === count.warehouseId);
    if (stock) {
      item.varianceValue = item.variance * stock.unitCost;
    }

    count.status = 'IN_PROGRESS';
    if (!count.startedAt) {
      count.startedAt = new Date();
    }

    return count;
  }

  async completeStockCount(
    countId: string,
    applyAdjustments: boolean,
    approvedBy: string,
  ): Promise<StockCount> {
    const count = this.stockCounts.get(countId);
    if (!count) {
      throw new NotFoundException('Stock count not found');
    }

    // Apply adjustments if requested
    if (applyAdjustments) {
      for (const item of count.items) {
        if (item.countedQuantity !== undefined && item.variance !== 0) {
          await this.adjustStock(count.userId, {
            productId: item.productId,
            warehouseId: count.warehouseId,
            locationId: item.locationId,
            lotNumber: item.lotNumber,
            newQuantity: item.countedQuantity,
            reason: `Stock count ${count.countNumber}`,
            reference: countId,
          });
        }
      }
    }

    count.status = 'COMPLETED';
    count.completedAt = new Date();
    count.approvedBy = approvedBy;

    this.logger.log(`Completed stock count ${countId}`);

    return count;
  }

  // =================== MOVEMENT HISTORY ===================

  getMovementHistory(
    userId: string,
    options?: {
      productId?: string;
      warehouseId?: string;
      type?: MovementType;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
    },
  ): StockMovement[] {
    let movements = Array.from(this.movements.values())
      .filter(m => m.userId === userId);

    if (options?.productId) {
      movements = movements.filter(m => m.productId === options.productId);
    }
    if (options?.warehouseId) {
      movements = movements.filter(m =>
        m.sourceWarehouseId === options.warehouseId ||
        m.destinationWarehouseId === options.warehouseId
      );
    }
    if (options?.type) {
      movements = movements.filter(m => m.type === options.type);
    }
    if (options?.dateFrom) {
      movements = movements.filter(m => m.date >= options.dateFrom!);
    }
    if (options?.dateTo) {
      movements = movements.filter(m => m.date <= options.dateTo!);
    }

    movements = movements.sort((a, b) => b.date.getTime() - a.date.getTime());

    if (options?.limit) {
      movements = movements.slice(0, options.limit);
    }

    return movements;
  }

  // =================== HELPERS ===================

  private findStockLevel(
    productId: string,
    warehouseId: string,
    locationId?: string,
    lotNumber?: string,
  ): StockLevel | undefined {
    return Array.from(this.stockLevels.values()).find(s =>
      s.productId === productId &&
      s.warehouseId === warehouseId &&
      (locationId ? s.locationId === locationId : true) &&
      (lotNumber ? s.lotNumber === lotNumber : !s.lotNumber)
    );
  }

  private async createMovement(
    userId: string,
    data: Omit<StockMovement, 'id' | 'userId' | 'movementNumber' | 'date' | 'totalValue' | 'performedBy' | 'createdAt'>,
  ): Promise<StockMovement> {
    const id = `mov_${++this.counters.movement}_${Date.now()}`;

    const movement: StockMovement = {
      id,
      userId,
      movementNumber: `MOV-${Date.now()}`,
      date: new Date(),
      ...data,
      totalValue: data.quantity * data.unitCost,
      performedBy: userId, // Would be actual user ID
      createdAt: new Date(),
    };

    this.movements.set(id, movement);

    return movement;
  }

  // =================== CONTROLLER API METHODS ===================

  async getWarehouses(
    tenantId: string,
    filters?: { type?: string; isActive?: boolean },
  ): Promise<Warehouse[]> {
    let warehouses = Array.from(this.warehouses.values())
      .filter(w => w.userId === tenantId);

    if (filters?.type) {
      warehouses = warehouses.filter(w => w.type === filters.type);
    }
    if (filters?.isActive !== undefined) {
      warehouses = warehouses.filter(w => w.isActive === filters.isActive);
    }

    return warehouses.sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteWarehouse(tenantId: string, warehouseId: string): Promise<void> {
    const warehouse = this.warehouses.get(warehouseId);
    if (!warehouse || warehouse.userId !== tenantId) {
      throw new NotFoundException('Warehouse not found');
    }

    // Check for stock in warehouse
    const hasStock = Array.from(this.stockLevels.values())
      .some(s => s.warehouseId === warehouseId && s.quantity > 0);

    if (hasStock) {
      throw new BadRequestException('Cannot delete warehouse with existing stock');
    }

    this.warehouses.delete(warehouseId);
    this.logger.log(`Deleted warehouse ${warehouseId}`);
  }

  async getLocations(
    tenantId: string,
    warehouseId: string,
    filters?: { type?: string; zone?: string },
  ): Promise<WarehouseLocation[]> {
    const warehouse = this.warehouses.get(warehouseId);
    if (!warehouse || warehouse.userId !== tenantId) {
      throw new NotFoundException('Warehouse not found');
    }

    let locations = Array.from(this.locations.values())
      .filter(l => l.warehouseId === warehouseId && l.isActive);

    if (filters?.type) {
      locations = locations.filter(l => l.type === filters.type);
    }
    if (filters?.zone) {
      locations = locations.filter(l => l.zone === filters.zone);
    }

    return locations.sort((a, b) => a.code.localeCompare(b.code));
  }

  async updateLocation(
    tenantId: string,
    locationId: string,
    data: Partial<Omit<WarehouseLocation, 'id' | 'warehouseId'>>,
  ): Promise<WarehouseLocation> {
    const location = this.locations.get(locationId);
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const warehouse = this.warehouses.get(location.warehouseId);
    if (!warehouse || warehouse.userId !== tenantId) {
      throw new NotFoundException('Location not found');
    }

    Object.assign(location, data);
    return location;
  }

  async getProducts(
    tenantId: string,
    filters?: { category?: string; search?: string; isActive?: boolean },
  ): Promise<Product[]> {
    return this.getUserProducts(tenantId, {
      category: filters?.category,
      search: filters?.search,
    });
  }

  async updateProduct(
    tenantId: string,
    productId: string,
    data: Partial<Omit<Product, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<Product> {
    const product = this.products.get(productId);
    if (!product || product.userId !== tenantId) {
      throw new NotFoundException('Product not found');
    }

    Object.assign(product, data, { updatedAt: new Date() });
    return product;
  }

  async getStockLevels(
    tenantId: string,
    filters?: { warehouseId?: string; productId?: string; status?: string },
  ): Promise<StockLevel[]> {
    const userProductIds = new Set(
      Array.from(this.products.values())
        .filter(p => p.userId === tenantId)
        .map(p => p.id)
    );

    let stocks = Array.from(this.stockLevels.values())
      .filter(s => userProductIds.has(s.productId) && s.quantity > 0);

    if (filters?.warehouseId) {
      stocks = stocks.filter(s => s.warehouseId === filters.warehouseId);
    }
    if (filters?.productId) {
      stocks = stocks.filter(s => s.productId === filters.productId);
    }
    if (filters?.status) {
      stocks = stocks.filter(s => s.status === filters.status);
    }

    return stocks;
  }

  async getProductStockLevels(tenantId: string, productId: string): Promise<StockLevel[]> {
    const product = this.products.get(productId);
    if (!product || product.userId !== tenantId) {
      throw new NotFoundException('Product not found');
    }

    return Array.from(this.stockLevels.values())
      .filter(s => s.productId === productId && s.quantity > 0);
  }

  async getWarehouseStockLevels(tenantId: string, warehouseId: string): Promise<StockLevel[]> {
    const warehouse = this.warehouses.get(warehouseId);
    if (!warehouse || warehouse.userId !== tenantId) {
      throw new NotFoundException('Warehouse not found');
    }

    return this.getWarehouseStock(warehouseId);
  }

  async getLowStockProducts(tenantId: string): Promise<LowStockAlert[]> {
    return this.getLowStockAlerts(tenantId);
  }

  async receiveStock(
    tenantId: string,
    userId: string,
    data: {
      warehouseId: string;
      locationId?: string;
      productId: string;
      quantity: number;
      unitCost: number;
      reference?: string;
      sourceDocument?: string;
      batchNumber?: string;
      expiryDate?: string;
      notes?: string;
    },
  ): Promise<{ stockLevel: StockLevel; movement: StockMovement }> {
    return this.addStock(userId, {
      productId: data.productId,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      quantity: data.quantity,
      unitCost: data.unitCost,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      reference: data.reference,
      documentNumber: data.sourceDocument,
    });
  }

  async issueStock(
    tenantId: string,
    userId: string,
    data: {
      warehouseId: string;
      locationId?: string;
      productId: string;
      quantity: number;
      reference?: string;
      destinationDocument?: string;
      notes?: string;
    },
  ): Promise<{ stockLevel: StockLevel; movement: StockMovement }> {
    return this.removeStock(userId, {
      productId: data.productId,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      quantity: data.quantity,
      reference: data.reference,
      documentNumber: data.destinationDocument,
      reason: data.notes,
    });
  }

  async getMovements(
    tenantId: string,
    filters?: {
      warehouseId?: string;
      productId?: string;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<StockMovement[]> {
    return this.getMovementHistory(tenantId, {
      warehouseId: filters?.warehouseId,
      productId: filters?.productId,
      type: filters?.type as MovementType,
      dateFrom: filters?.startDate,
      dateTo: filters?.endDate,
    });
  }

  async createReservation(
    tenantId: string,
    userId: string,
    data: {
      warehouseId: string;
      productId: string;
      quantity: number;
      reference: string;
      expiresAt?: Date;
      notes?: string;
    },
  ): Promise<StockReservation> {
    // Find available stock level
    const stockLevel = Array.from(this.stockLevels.values())
      .find(s =>
        s.productId === data.productId &&
        s.warehouseId === data.warehouseId &&
        s.availableQuantity >= data.quantity
      );

    if (!stockLevel) {
      throw new BadRequestException('Insufficient stock available');
    }

    const expiresInMinutes = data.expiresAt
      ? Math.floor((data.expiresAt.getTime() - Date.now()) / 60000)
      : 60;

    return this.reserveStock(
      stockLevel.id,
      data.reference,
      'SALES_ORDER',
      data.quantity,
      expiresInMinutes,
    );
  }

  async getReservations(
    tenantId: string,
    filters?: { warehouseId?: string; productId?: string; status?: string },
  ): Promise<StockReservation[]> {
    let reservations = Array.from(this.reservations.values());

    if (filters?.status) {
      reservations = reservations.filter(r => r.status === filters.status);
    }

    // Filter by product or warehouse through stock levels
    if (filters?.productId || filters?.warehouseId) {
      const stockLevelIds = new Set(
        Array.from(this.stockLevels.values())
          .filter(s =>
            (!filters.productId || s.productId === filters.productId) &&
            (!filters.warehouseId || s.warehouseId === filters.warehouseId)
          )
          .map(s => s.id)
      );
      reservations = reservations.filter(r => stockLevelIds.has(r.stockLevelId));
    }

    return reservations.sort((a, b) => b.reservedAt.getTime() - a.reservedAt.getTime());
  }

  async cancelReservation(tenantId: string, reservationId: string): Promise<void> {
    return this.releaseReservation(reservationId);
  }

  async getStockCounts(
    tenantId: string,
    filters?: { warehouseId?: string; status?: string },
  ): Promise<StockCount[]> {
    let counts = Array.from(this.stockCounts.values())
      .filter(c => c.userId === tenantId);

    if (filters?.warehouseId) {
      counts = counts.filter(c => c.warehouseId === filters.warehouseId);
    }
    if (filters?.status) {
      counts = counts.filter(c => c.status === filters.status);
    }

    return counts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getStockCount(tenantId: string, countId: string): Promise<StockCount> {
    const count = this.stockCounts.get(countId);
    if (!count || count.userId !== tenantId) {
      throw new NotFoundException('Stock count not found');
    }
    return count;
  }

  async startStockCount(tenantId: string, userId: string, countId: string): Promise<StockCount> {
    const count = await this.getStockCount(tenantId, countId);

    if (count.status !== 'DRAFT') {
      throw new BadRequestException('Stock count already started');
    }

    count.status = 'IN_PROGRESS';
    count.startedAt = new Date();
    count.performedBy = userId;

    return count;
  }

  async recordStockCount(
    tenantId: string,
    userId: string,
    countId: string,
    items: Array<{
      productId: string;
      locationId?: string;
      countedQuantity: number;
      notes?: string;
    }>,
  ): Promise<StockCount> {
    const count = await this.getStockCount(tenantId, countId);

    for (const item of items) {
      await this.updateStockCountItem(countId, item.productId, item.countedQuantity, item.notes);
    }

    return count;
  }

  async getProductValuation(tenantId: string, productId: string): Promise<{
    product: Product;
    totalQuantity: number;
    totalValue: number;
    averageCost: number;
    byWarehouse: Array<{ warehouseId: string; warehouseName: string; quantity: number; value: number }>;
  }> {
    const product = this.products.get(productId);
    if (!product || product.userId !== tenantId) {
      throw new NotFoundException('Product not found');
    }

    const stocks = Array.from(this.stockLevels.values())
      .filter(s => s.productId === productId && s.quantity > 0);

    let totalQuantity = 0;
    let totalValue = 0;
    const byWarehouse: Map<string, { quantity: number; value: number }> = new Map();

    for (const stock of stocks) {
      totalQuantity += stock.quantity;
      totalValue += stock.totalValue;

      const existing = byWarehouse.get(stock.warehouseId) || { quantity: 0, value: 0 };
      existing.quantity += stock.quantity;
      existing.value += stock.totalValue;
      byWarehouse.set(stock.warehouseId, existing);
    }

    return {
      product,
      totalQuantity,
      totalValue,
      averageCost: totalQuantity > 0 ? totalValue / totalQuantity : 0,
      byWarehouse: Array.from(byWarehouse.entries()).map(([warehouseId, data]) => ({
        warehouseId,
        warehouseName: this.warehouses.get(warehouseId)?.name || 'Unknown',
        ...data,
      })),
    };
  }

  async getInventoryTurnover(tenantId: string, periodDays: number): Promise<{
    period: { start: Date; end: Date };
    totalCOGS: number;
    averageInventory: number;
    turnoverRatio: number;
    daysInInventory: number;
    byProduct: Array<{
      productId: string;
      productName: string;
      sku: string;
      soldQuantity: number;
      averageStock: number;
      turnoverRatio: number;
    }>;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const movements = this.getMovementHistory(tenantId, {
      type: MovementType.SHIPMENT,
      dateFrom: startDate,
      dateTo: endDate,
    });

    const productStats: Map<string, { sold: number; value: number }> = new Map();
    let totalCOGS = 0;

    for (const movement of movements) {
      const existing = productStats.get(movement.productId) || { sold: 0, value: 0 };
      existing.sold += movement.quantity;
      existing.value += movement.totalValue;
      productStats.set(movement.productId, existing);
      totalCOGS += movement.totalValue;
    }

    const currentValuation = this.getInventoryValuation(tenantId);
    const averageInventory = currentValuation.totalValue;
    const turnoverRatio = averageInventory > 0 ? totalCOGS / averageInventory : 0;

    const byProduct = Array.from(productStats.entries()).map(([productId, stats]) => {
      const product = this.products.get(productId);
      const currentStock = this.getTotalStock(productId);

      return {
        productId,
        productName: product?.name || 'Unknown',
        sku: product?.sku || 'Unknown',
        soldQuantity: stats.sold,
        averageStock: currentStock.totalQuantity,
        turnoverRatio: currentStock.totalValue > 0 ? stats.value / currentStock.totalValue : 0,
      };
    });

    return {
      period: { start: startDate, end: endDate },
      totalCOGS,
      averageInventory,
      turnoverRatio,
      daysInInventory: turnoverRatio > 0 ? periodDays / turnoverRatio : 0,
      byProduct: byProduct.sort((a, b) => b.turnoverRatio - a.turnoverRatio),
    };
  }

  async getABCAnalysis(tenantId: string): Promise<{
    total: { products: number; value: number };
    classA: { products: Product[]; valuePercentage: number; productPercentage: number };
    classB: { products: Product[]; valuePercentage: number; productPercentage: number };
    classC: { products: Product[]; valuePercentage: number; productPercentage: number };
  }> {
    const userProducts = Array.from(this.products.values())
      .filter(p => p.userId === tenantId && p.isActive);

    // Calculate total value per product
    const productValues: Array<{ product: Product; value: number }> = [];

    for (const product of userProducts) {
      const totalStock = this.getTotalStock(product.id);
      productValues.push({ product, value: totalStock.totalValue });
    }

    // Sort by value descending
    productValues.sort((a, b) => b.value - a.value);

    const totalValue = productValues.reduce((sum, pv) => sum + pv.value, 0);
    const totalProducts = productValues.length;

    // ABC classification (80-15-5 rule)
    let cumulativeValue = 0;
    const classA: Product[] = [];
    const classB: Product[] = [];
    const classC: Product[] = [];

    for (const pv of productValues) {
      cumulativeValue += pv.value;
      const percentage = totalValue > 0 ? (cumulativeValue / totalValue) * 100 : 0;

      if (percentage <= 80) {
        classA.push(pv.product);
      } else if (percentage <= 95) {
        classB.push(pv.product);
      } else {
        classC.push(pv.product);
      }
    }

    const aValue = productValues
      .slice(0, classA.length)
      .reduce((sum, pv) => sum + pv.value, 0);
    const bValue = productValues
      .slice(classA.length, classA.length + classB.length)
      .reduce((sum, pv) => sum + pv.value, 0);
    const cValue = productValues
      .slice(classA.length + classB.length)
      .reduce((sum, pv) => sum + pv.value, 0);

    return {
      total: { products: totalProducts, value: totalValue },
      classA: {
        products: classA,
        valuePercentage: totalValue > 0 ? (aValue / totalValue) * 100 : 0,
        productPercentage: totalProducts > 0 ? (classA.length / totalProducts) * 100 : 0,
      },
      classB: {
        products: classB,
        valuePercentage: totalValue > 0 ? (bValue / totalValue) * 100 : 0,
        productPercentage: totalProducts > 0 ? (classB.length / totalProducts) * 100 : 0,
      },
      classC: {
        products: classC,
        valuePercentage: totalValue > 0 ? (cValue / totalValue) * 100 : 0,
        productPercentage: totalProducts > 0 ? (classC.length / totalProducts) * 100 : 0,
      },
    };
  }

  async getInventoryAging(tenantId: string): Promise<{
    summary: {
      current: { count: number; value: number };
      days30: { count: number; value: number };
      days60: { count: number; value: number };
      days90: { count: number; value: number };
      overdue: { count: number; value: number };
    };
    items: Array<{
      productId: string;
      productName: string;
      warehouseId: string;
      warehouseName: string;
      quantity: number;
      value: number;
      ageDays: number;
      expiryDate?: Date;
    }>;
  }> {
    const now = new Date();
    const userProductIds = new Set(
      Array.from(this.products.values())
        .filter(p => p.userId === tenantId)
        .map(p => p.id)
    );

    const stocks = Array.from(this.stockLevels.values())
      .filter(s => userProductIds.has(s.productId) && s.quantity > 0);

    const summary = {
      current: { count: 0, value: 0 },
      days30: { count: 0, value: 0 },
      days60: { count: 0, value: 0 },
      days90: { count: 0, value: 0 },
      overdue: { count: 0, value: 0 },
    };

    const items: Array<{
      productId: string;
      productName: string;
      warehouseId: string;
      warehouseName: string;
      quantity: number;
      value: number;
      ageDays: number;
      expiryDate?: Date;
    }> = [];

    for (const stock of stocks) {
      const product = this.products.get(stock.productId);
      const warehouse = this.warehouses.get(stock.warehouseId);
      const ageDays = Math.floor((now.getTime() - stock.receivedAt.getTime()) / (24 * 60 * 60 * 1000));

      items.push({
        productId: stock.productId,
        productName: product?.name || 'Unknown',
        warehouseId: stock.warehouseId,
        warehouseName: warehouse?.name || 'Unknown',
        quantity: stock.quantity,
        value: stock.totalValue,
        ageDays,
        expiryDate: stock.expiryDate,
      });

      if (ageDays <= 30) {
        summary.current.count++;
        summary.current.value += stock.totalValue;
      } else if (ageDays <= 60) {
        summary.days30.count++;
        summary.days30.value += stock.totalValue;
      } else if (ageDays <= 90) {
        summary.days60.count++;
        summary.days60.value += stock.totalValue;
      } else if (ageDays <= 180) {
        summary.days90.count++;
        summary.days90.value += stock.totalValue;
      } else {
        summary.overdue.count++;
        summary.overdue.value += stock.totalValue;
      }
    }

    return {
      summary,
      items: items.sort((a, b) => b.ageDays - a.ageDays),
    };
  }

  async getStockStatusReport(tenantId: string, warehouseId?: string): Promise<{
    totalProducts: number;
    totalValue: number;
    byStatus: Array<{ status: string; count: number; value: number }>;
    byCategory: Array<{ category: string; count: number; value: number }>;
    lowStockCount: number;
    overstockCount: number;
  }> {
    const userProductIds = new Set(
      Array.from(this.products.values())
        .filter(p => p.userId === tenantId)
        .map(p => p.id)
    );

    let stocks = Array.from(this.stockLevels.values())
      .filter(s => userProductIds.has(s.productId) && s.quantity > 0);

    if (warehouseId) {
      stocks = stocks.filter(s => s.warehouseId === warehouseId);
    }

    const byStatus: Map<string, { count: number; value: number }> = new Map();
    const byCategory: Map<string, { count: number; value: number }> = new Map();
    let totalValue = 0;
    let lowStockCount = 0;
    let overstockCount = 0;

    for (const stock of stocks) {
      const product = this.products.get(stock.productId);

      totalValue += stock.totalValue;

      // By status
      const statusData = byStatus.get(stock.status) || { count: 0, value: 0 };
      statusData.count++;
      statusData.value += stock.totalValue;
      byStatus.set(stock.status, statusData);

      // By category
      const category = product?.category || 'Uncategorized';
      const catData = byCategory.get(category) || { count: 0, value: 0 };
      catData.count++;
      catData.value += stock.totalValue;
      byCategory.set(category, catData);

      // Low stock check
      if (product?.reorderPoint && stock.availableQuantity < product.reorderPoint) {
        lowStockCount++;
      }

      // Overstock check
      if (product?.maxStock && stock.quantity > product.maxStock) {
        overstockCount++;
      }
    }

    return {
      totalProducts: stocks.length,
      totalValue,
      byStatus: Array.from(byStatus.entries()).map(([status, data]) => ({ status, ...data })),
      byCategory: Array.from(byCategory.entries()).map(([category, data]) => ({ category, ...data })),
      lowStockCount,
      overstockCount,
    };
  }

  async getMovementSummary(
    tenantId: string,
    options: { startDate: Date; endDate: Date; warehouseId?: string },
  ): Promise<{
    period: { start: Date; end: Date };
    totals: {
      receipts: { count: number; quantity: number; value: number };
      shipments: { count: number; quantity: number; value: number };
      transfers: { count: number; quantity: number; value: number };
      adjustments: { count: number; quantity: number; value: number };
    };
    byDay: Array<{ date: string; receipts: number; shipments: number; transfers: number }>;
  }> {
    const movements = this.getMovementHistory(tenantId, {
      warehouseId: options.warehouseId,
      dateFrom: options.startDate,
      dateTo: options.endDate,
    });

    const totals = {
      receipts: { count: 0, quantity: 0, value: 0 },
      shipments: { count: 0, quantity: 0, value: 0 },
      transfers: { count: 0, quantity: 0, value: 0 },
      adjustments: { count: 0, quantity: 0, value: 0 },
    };

    const byDay: Map<string, { receipts: number; shipments: number; transfers: number }> = new Map();

    for (const movement of movements) {
      const dateKey = movement.date.toISOString().split('T')[0];
      const dayData = byDay.get(dateKey) || { receipts: 0, shipments: 0, transfers: 0 };

      switch (movement.type) {
        case MovementType.RECEIPT:
          totals.receipts.count++;
          totals.receipts.quantity += movement.quantity;
          totals.receipts.value += movement.totalValue;
          dayData.receipts += movement.quantity;
          break;
        case MovementType.SHIPMENT:
          totals.shipments.count++;
          totals.shipments.quantity += movement.quantity;
          totals.shipments.value += movement.totalValue;
          dayData.shipments += movement.quantity;
          break;
        case MovementType.TRANSFER:
          totals.transfers.count++;
          totals.transfers.quantity += movement.quantity;
          totals.transfers.value += movement.totalValue;
          dayData.transfers += movement.quantity;
          break;
        case MovementType.ADJUSTMENT:
          totals.adjustments.count++;
          totals.adjustments.quantity += movement.quantity;
          totals.adjustments.value += movement.totalValue;
          break;
      }

      byDay.set(dateKey, dayData);
    }

    return {
      period: { start: options.startDate, end: options.endDate },
      totals,
      byDay: Array.from(byDay.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async syncWithSaga(tenantId: string): Promise<{
    success: boolean;
    syncedProducts: number;
    syncedStock: number;
    errors: string[];
  }> {
    // Mock SAGA sync - would integrate with actual SAGA API
    this.logger.log(`Starting SAGA sync for tenant ${tenantId}`);

    const products = Array.from(this.products.values())
      .filter(p => p.userId === tenantId && p.isActive);

    const stocks = Array.from(this.stockLevels.values())
      .filter(s => products.some(p => p.id === s.productId) && s.quantity > 0);

    // Simulate sync delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      syncedProducts: products.length,
      syncedStock: stocks.length,
      errors: [],
    };
  }

  async getSagaSyncStatus(tenantId: string): Promise<{
    lastSync: Date | null;
    status: 'SYNCED' | 'PENDING' | 'ERROR';
    pendingChanges: number;
  }> {
    // Mock SAGA sync status
    return {
      lastSync: new Date(Date.now() - 3600000), // 1 hour ago
      status: 'SYNCED',
      pendingChanges: 0,
    };
  }
}
