import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Sprint 22: Refactoring - Inventory Operations Helper
// Extracted operations from inventory.service.ts for better maintainability

// ===== TYPES =====

export type StockMovementType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE' | 'EXPIRY';
export type ReorderStrategy = 'FIXED_QUANTITY' | 'EOQ' | 'MIN_MAX' | 'DEMAND_BASED' | 'JUST_IN_TIME';
export type BatchStatus = 'ACTIVE' | 'QUARANTINE' | 'EXPIRED' | 'DEPLETED' | 'RESERVED';

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  unitCost?: number;
  totalCost?: number;

  // Source/destination
  sourceLocationId?: string;
  destinationLocationId?: string;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;

  // References
  referenceType?: 'PURCHASE_ORDER' | 'SALES_ORDER' | 'TRANSFER' | 'MANUAL' | 'SYSTEM';
  referenceId?: string;

  // Batch tracking
  batchNumber?: string;
  serialNumbers?: string[];
  expiryDate?: Date;

  // Audit
  reason?: string;
  notes?: string;
  performedBy: string;
  performedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface StockLevel {
  productId: string;
  warehouseId: string;
  locationId?: string;

  // Quantities
  onHand: number;
  available: number;
  reserved: number;
  inTransit: number;
  onOrder: number;

  // Reorder info
  reorderPoint: number;
  reorderQuantity: number;
  maxStock: number;
  minStock: number;

  // Value
  unitCost: number;
  totalValue: number;

  // Status
  lastUpdated: Date;
  lastCountDate?: Date;
  needsReorder: boolean;
}

export interface BatchInfo {
  id: string;
  batchNumber: string;
  productId: string;
  warehouseId: string;

  // Tracking
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  status: BatchStatus;

  // Dates
  manufacturingDate?: Date;
  expiryDate?: Date;
  receivedDate: Date;

  // Supplier
  supplierId?: string;
  purchaseOrderId?: string;
  unitCost: number;

  // Quality
  qualityChecked: boolean;
  qualityCheckDate?: Date;
  qualityNotes?: string;
}

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  warehouseId: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQuantity: number;
  strategy: ReorderStrategy;

  // Analysis
  avgDailyDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  daysOfStock: number;

  // Cost
  estimatedCost: number;
  preferredSupplierId?: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface InventoryValuation {
  warehouseId?: string;
  valuationMethod: 'FIFO' | 'LIFO' | 'AVERAGE' | 'SPECIFIC';
  asOfDate: Date;

  // Totals
  totalItems: number;
  totalUnits: number;
  totalValue: number;

  // Breakdown
  byCategory: { category: string; units: number; value: number }[];
  byWarehouse?: { warehouseId: string; units: number; value: number }[];

  // Changes
  valueChange30Days: number;
  valueChangePercent: number;
}

export interface CycleCountPlan {
  id: string;
  name: string;
  warehouseId: string;

  // Schedule
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  nextCountDate: Date;
  lastCountDate?: Date;

  // Scope
  countMethod: 'FULL' | 'ABC' | 'RANDOM' | 'ZONE';
  targetAccuracy: number;
  itemsToCount: number;

  // Status
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  assignedTo: string[];
}

export interface CountResult {
  id: string;
  planId: string;
  productId: string;
  locationId: string;

  // Counts
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  variancePercent: number;

  // Resolution
  resolved: boolean;
  resolution?: 'ADJUSTMENT' | 'RECOUNT' | 'INVESTIGATION';
  adjustmentId?: string;

  // Audit
  countedBy: string;
  countedAt: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
}

// ===== CONSTANTS =====

const CRITICAL_STOCK_THRESHOLD = 0.1; // 10% of reorder point
const ABC_THRESHOLDS = { A: 0.8, B: 0.95, C: 1.0 }; // Cumulative value percentages

@Injectable()
export class InventoryOperationsService {
  private readonly logger = new Logger(InventoryOperationsService.name);

  // Storage
  private readonly stockMovements: Map<string, StockMovement[]> = new Map();
  private readonly stockLevels: Map<string, StockLevel> = new Map();
  private readonly batches: Map<string, BatchInfo[]> = new Map();
  private readonly cycleCounts: Map<string, CycleCountPlan> = new Map();
  private readonly countResults: Map<string, CountResult[]> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // ===== STOCK MOVEMENTS =====

  async recordStockMovement(data: Omit<StockMovement, 'id' | 'performedAt'>): Promise<StockMovement> {
    // Validate quantity - adjustments can be negative
    if (data.type !== 'ADJUSTMENT' && data.quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }
    if (data.type === 'ADJUSTMENT' && data.quantity === 0) {
      throw new BadRequestException('Adjustment quantity cannot be zero');
    }

    // For OUT movements, validate stock availability
    if (data.type === 'OUT' || data.type === 'TRANSFER') {
      const stockKey = `${data.productId}-${data.warehouseId}`;
      const stock = this.stockLevels.get(stockKey);
      if (!stock || stock.available < data.quantity) {
        throw new BadRequestException('Insufficient stock available');
      }
    }

    const movement: StockMovement = {
      ...data,
      id: this.generateId('mov'),
      performedAt: new Date(),
    };

    // Store movement
    const key = data.productId;
    const movements = this.stockMovements.get(key) || [];
    movements.push(movement);
    this.stockMovements.set(key, movements);

    // Update stock levels
    await this.updateStockLevel(movement);

    // Emit event
    this.eventEmitter.emit('inventory.movement.recorded', {
      movementId: movement.id,
      productId: movement.productId,
      type: movement.type,
      quantity: movement.quantity,
    });

    this.logger.log(`Stock movement recorded: ${movement.type} ${movement.quantity} units of ${movement.productId}`);
    return movement;
  }

  private async updateStockLevel(movement: StockMovement): Promise<void> {
    const stockKey = `${movement.productId}-${movement.warehouseId}`;
    let stock = this.stockLevels.get(stockKey);

    if (!stock) {
      stock = this.createDefaultStockLevel(movement.productId, movement.warehouseId);
    }

    switch (movement.type) {
      case 'IN':
      case 'RETURN':
        stock.onHand += movement.quantity;
        stock.available += movement.quantity;
        break;
      case 'OUT':
      case 'DAMAGE':
      case 'EXPIRY':
        stock.onHand -= movement.quantity;
        stock.available -= movement.quantity;
        break;
      case 'TRANSFER':
        stock.onHand -= movement.quantity;
        stock.available -= movement.quantity;
        stock.inTransit += movement.quantity;
        break;
      case 'ADJUSTMENT':
        // Adjustments can be positive or negative based on context
        stock.onHand += movement.quantity;
        stock.available += movement.quantity;
        break;
    }

    // Update costs
    if (movement.unitCost) {
      stock.unitCost = movement.unitCost;
    }
    stock.totalValue = stock.onHand * stock.unitCost;

    // Check reorder status
    stock.needsReorder = stock.available <= stock.reorderPoint;
    stock.lastUpdated = new Date();

    this.stockLevels.set(stockKey, stock);

    // Check for critical stock
    if (stock.available <= stock.reorderPoint * CRITICAL_STOCK_THRESHOLD) {
      this.eventEmitter.emit('inventory.stock.critical', {
        productId: movement.productId,
        warehouseId: movement.warehouseId,
        available: stock.available,
      });
    }
  }

  private createDefaultStockLevel(productId: string, warehouseId: string): StockLevel {
    return {
      productId,
      warehouseId,
      onHand: 0,
      available: 0,
      reserved: 0,
      inTransit: 0,
      onOrder: 0,
      reorderPoint: 10,
      reorderQuantity: 50,
      maxStock: 200,
      minStock: 5,
      unitCost: 0,
      totalValue: 0,
      lastUpdated: new Date(),
      needsReorder: false,
    };
  }

  getStockMovements(productId: string, filters?: {
    warehouseId?: string;
    type?: StockMovementType;
    startDate?: Date;
    endDate?: Date;
  }): StockMovement[] {
    let movements = this.stockMovements.get(productId) || [];

    if (filters?.warehouseId) {
      movements = movements.filter(m => m.warehouseId === filters.warehouseId);
    }
    if (filters?.type) {
      movements = movements.filter(m => m.type === filters.type);
    }
    if (filters?.startDate) {
      movements = movements.filter(m => m.performedAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      movements = movements.filter(m => m.performedAt <= filters.endDate!);
    }

    return movements.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  // ===== STOCK LEVELS =====

  getStockLevel(productId: string, warehouseId: string): StockLevel | undefined {
    return this.stockLevels.get(`${productId}-${warehouseId}`);
  }

  getAllStockLevels(warehouseId?: string): StockLevel[] {
    const levels = Array.from(this.stockLevels.values());
    return warehouseId ? levels.filter(l => l.warehouseId === warehouseId) : levels;
  }

  async updateReorderSettings(
    productId: string,
    warehouseId: string,
    settings: Partial<Pick<StockLevel, 'reorderPoint' | 'reorderQuantity' | 'maxStock' | 'minStock'>>,
  ): Promise<StockLevel> {
    const stockKey = `${productId}-${warehouseId}`;
    let stock = this.stockLevels.get(stockKey);

    if (!stock) {
      stock = this.createDefaultStockLevel(productId, warehouseId);
    }

    Object.assign(stock, settings, { lastUpdated: new Date() });
    stock.needsReorder = stock.available <= stock.reorderPoint;

    this.stockLevels.set(stockKey, stock);
    return stock;
  }

  async reserveStock(productId: string, warehouseId: string, quantity: number): Promise<boolean> {
    const stockKey = `${productId}-${warehouseId}`;
    const stock = this.stockLevels.get(stockKey);

    if (!stock || stock.available < quantity) {
      return false;
    }

    stock.available -= quantity;
    stock.reserved += quantity;
    stock.lastUpdated = new Date();

    this.eventEmitter.emit('inventory.stock.reserved', {
      productId,
      warehouseId,
      quantity,
    });

    return true;
  }

  async releaseReservation(productId: string, warehouseId: string, quantity: number): Promise<boolean> {
    const stockKey = `${productId}-${warehouseId}`;
    const stock = this.stockLevels.get(stockKey);

    if (!stock || stock.reserved < quantity) {
      return false;
    }

    stock.reserved -= quantity;
    stock.available += quantity;
    stock.lastUpdated = new Date();

    return true;
  }

  // ===== BATCH TRACKING =====

  async createBatch(data: Omit<BatchInfo, 'id' | 'availableQuantity' | 'reservedQuantity' | 'status'>): Promise<BatchInfo> {
    const batch: BatchInfo = {
      ...data,
      id: this.generateId('batch'),
      availableQuantity: data.quantity,
      reservedQuantity: 0,
      status: 'ACTIVE',
    };

    const key = `${data.productId}-${data.warehouseId}`;
    const batches = this.batches.get(key) || [];
    batches.push(batch);
    this.batches.set(key, batches);

    this.eventEmitter.emit('inventory.batch.created', {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
    });

    return batch;
  }

  getBatches(productId: string, warehouseId: string, includeInactive = false): BatchInfo[] {
    const key = `${productId}-${warehouseId}`;
    let batches = this.batches.get(key) || [];

    if (!includeInactive) {
      batches = batches.filter(b => b.status === 'ACTIVE');
    }

    return batches.sort((a, b) => a.expiryDate?.getTime() || 0 - (b.expiryDate?.getTime() || 0));
  }

  async updateBatchStatus(batchId: string, status: BatchStatus): Promise<BatchInfo | null> {
    for (const [key, batches] of this.batches) {
      const batch = batches.find(b => b.id === batchId);
      if (batch) {
        batch.status = status;

        this.eventEmitter.emit('inventory.batch.status_changed', {
          batchId,
          newStatus: status,
        });

        return batch;
      }
    }
    return null;
  }

  getExpiringBatches(daysThreshold: number): BatchInfo[] {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiring: BatchInfo[] = [];
    for (const batches of this.batches.values()) {
      for (const batch of batches) {
        if (batch.status === 'ACTIVE' && batch.expiryDate && batch.expiryDate <= thresholdDate) {
          expiring.push(batch);
        }
      }
    }

    return expiring.sort((a, b) => (a.expiryDate?.getTime() || 0) - (b.expiryDate?.getTime() || 0));
  }

  // ===== REORDER SUGGESTIONS =====

  generateReorderSuggestions(warehouseId?: string): ReorderSuggestion[] {
    const suggestions: ReorderSuggestion[] = [];
    const levels = this.getAllStockLevels(warehouseId);

    for (const stock of levels) {
      if (stock.needsReorder) {
        const avgDailyDemand = this.calculateAverageDailyDemand(stock.productId, stock.warehouseId);
        const leadTimeDays = 7; // Default lead time
        const safetyStock = Math.ceil(avgDailyDemand * 3); // 3 days safety
        const daysOfStock = avgDailyDemand > 0 ? stock.available / avgDailyDemand : 999;

        let urgency: ReorderSuggestion['urgency'] = 'LOW';
        if (daysOfStock <= 3) urgency = 'CRITICAL';
        else if (daysOfStock <= 7) urgency = 'HIGH';
        else if (daysOfStock <= 14) urgency = 'MEDIUM';

        const suggestedQuantity = this.calculateEOQ(avgDailyDemand, stock.unitCost, 50); // $50 ordering cost

        suggestions.push({
          productId: stock.productId,
          productName: `Product ${stock.productId}`,
          warehouseId: stock.warehouseId,
          currentStock: stock.available,
          reorderPoint: stock.reorderPoint,
          suggestedQuantity,
          strategy: 'EOQ',
          avgDailyDemand,
          leadTimeDays,
          safetyStock,
          daysOfStock: Math.round(daysOfStock),
          estimatedCost: suggestedQuantity * stock.unitCost,
          urgency,
        });
      }
    }

    return suggestions.sort((a, b) => {
      const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  private calculateAverageDailyDemand(productId: string, warehouseId: string): number {
    const movements = this.getStockMovements(productId, {
      warehouseId,
      type: 'OUT',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    });

    const totalOut = movements.reduce((sum, m) => sum + m.quantity, 0);
    return totalOut / 30 || 1; // Default to 1 if no history
  }

  private calculateEOQ(annualDemand: number, unitCost: number, orderingCost: number): number {
    const holdingCostRate = 0.25; // 25% of unit cost
    const holdingCost = unitCost * holdingCostRate;

    // EOQ formula: sqrt((2 * D * S) / H)
    const eoq = Math.sqrt((2 * annualDemand * 365 * orderingCost) / holdingCost);
    return Math.ceil(eoq);
  }

  // ===== INVENTORY VALUATION =====

  calculateInventoryValuation(warehouseId?: string, method: 'FIFO' | 'LIFO' | 'AVERAGE' = 'AVERAGE'): InventoryValuation {
    const levels = this.getAllStockLevels(warehouseId);

    let totalUnits = 0;
    let totalValue = 0;
    const byCategory: Map<string, { units: number; value: number }> = new Map();
    const byWarehouse: Map<string, { units: number; value: number }> = new Map();

    for (const stock of levels) {
      const value = stock.onHand * stock.unitCost;
      totalUnits += stock.onHand;
      totalValue += value;

      // Category breakdown (simplified)
      const category = 'General'; // Would come from product data
      const catData = byCategory.get(category) || { units: 0, value: 0 };
      catData.units += stock.onHand;
      catData.value += value;
      byCategory.set(category, catData);

      // Warehouse breakdown
      const whData = byWarehouse.get(stock.warehouseId) || { units: 0, value: 0 };
      whData.units += stock.onHand;
      whData.value += value;
      byWarehouse.set(stock.warehouseId, whData);
    }

    return {
      warehouseId,
      valuationMethod: method,
      asOfDate: new Date(),
      totalItems: levels.length,
      totalUnits,
      totalValue,
      byCategory: Array.from(byCategory.entries()).map(([category, data]) => ({
        category,
        ...data,
      })),
      byWarehouse: Array.from(byWarehouse.entries()).map(([warehouseId, data]) => ({
        warehouseId,
        ...data,
      })),
      valueChange30Days: totalValue * 0.05, // Placeholder
      valueChangePercent: 5,
    };
  }

  // ===== CYCLE COUNTING =====

  async createCycleCountPlan(data: Omit<CycleCountPlan, 'id' | 'status'>): Promise<CycleCountPlan> {
    const plan: CycleCountPlan = {
      ...data,
      id: this.generateId('count'),
      status: 'SCHEDULED',
    };

    this.cycleCounts.set(plan.id, plan);

    this.eventEmitter.emit('inventory.cycle_count.scheduled', {
      planId: plan.id,
      warehouseId: plan.warehouseId,
      nextCountDate: plan.nextCountDate,
    });

    return plan;
  }

  getCycleCountPlans(warehouseId?: string): CycleCountPlan[] {
    const plans = Array.from(this.cycleCounts.values());
    return warehouseId ? plans.filter(p => p.warehouseId === warehouseId) : plans;
  }

  async recordCountResult(data: Omit<CountResult, 'id' | 'variance' | 'variancePercent' | 'countedAt'>): Promise<CountResult> {
    const variance = data.countedQuantity - data.systemQuantity;
    const variancePercent = data.systemQuantity > 0
      ? (variance / data.systemQuantity) * 100
      : data.countedQuantity > 0 ? 100 : 0;

    const result: CountResult = {
      ...data,
      id: this.generateId('result'),
      variance,
      variancePercent: Math.round(variancePercent * 100) / 100,
      countedAt: new Date(),
    };

    const results = this.countResults.get(data.planId) || [];
    results.push(result);
    this.countResults.set(data.planId, results);

    // Update plan status
    const plan = this.cycleCounts.get(data.planId);
    if (plan) {
      plan.status = 'IN_PROGRESS';
    }

    // Emit event if significant variance
    if (Math.abs(variancePercent) > 5) {
      this.eventEmitter.emit('inventory.count.variance_detected', {
        resultId: result.id,
        productId: result.productId,
        variance,
        variancePercent,
      });
    }

    return result;
  }

  getCountResults(planId: string): CountResult[] {
    return this.countResults.get(planId) || [];
  }

  async resolveVariance(resultId: string, resolution: CountResult['resolution']): Promise<CountResult | null> {
    for (const [planId, results] of this.countResults) {
      const result = results.find(r => r.id === resultId);
      if (result) {
        result.resolved = true;
        result.resolution = resolution;

        // If adjustment, create stock adjustment movement
        if (resolution === 'ADJUSTMENT' && result.variance !== 0) {
          await this.recordStockMovement({
            productId: result.productId,
            warehouseId: 'default', // Would come from location
            type: 'ADJUSTMENT',
            quantity: result.variance,
            reason: `Cycle count adjustment - Plan ${planId}`,
            performedBy: 'system',
          });
          result.adjustmentId = `adj-${Date.now()}`;
        }

        return result;
      }
    }
    return null;
  }

  // ===== ABC ANALYSIS =====

  performABCAnalysis(warehouseId?: string): {
    classification: { productId: string; category: 'A' | 'B' | 'C'; value: number; percentage: number }[];
    summary: { A: { count: number; value: number }; B: { count: number; value: number }; C: { count: number; value: number } };
  } {
    const levels = this.getAllStockLevels(warehouseId);

    // Calculate values and sort descending
    const items = levels.map(l => ({
      productId: l.productId,
      value: l.totalValue,
    })).sort((a, b) => b.value - a.value);

    const totalValue = items.reduce((sum, i) => sum + i.value, 0);
    let cumulativeValue = 0;

    const classification = items.map(item => {
      cumulativeValue += item.value;
      const cumulativePercent = totalValue > 0 ? cumulativeValue / totalValue : 0;

      let category: 'A' | 'B' | 'C';
      if (cumulativePercent <= ABC_THRESHOLDS.A) category = 'A';
      else if (cumulativePercent <= ABC_THRESHOLDS.B) category = 'B';
      else category = 'C';

      return {
        productId: item.productId,
        category,
        value: item.value,
        percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
      };
    });

    const summary = {
      A: { count: 0, value: 0 },
      B: { count: 0, value: 0 },
      C: { count: 0, value: 0 },
    };

    for (const item of classification) {
      summary[item.category].count++;
      summary[item.category].value += item.value;
    }

    return { classification, summary };
  }

  // ===== HELPERS =====

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
