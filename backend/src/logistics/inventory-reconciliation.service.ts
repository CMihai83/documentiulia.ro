import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =================== INTERFACES & TYPES ===================

export interface StockCountSession {
  id: string;
  userId: string;
  warehouseId: string;
  type: CountType;
  status: CountSessionStatus;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  countedBy?: string;
  verifiedBy?: string;
  items: StockCountItem[];
  summary?: CountSummary;
  createdAt: Date;
  updatedAt: Date;
}

export type CountType =
  | 'FULL'           // Complete warehouse inventory count
  | 'CYCLE'          // Regular cycle count (ABC analysis based)
  | 'SPOT'           // Random spot check
  | 'ANNUAL'         // Year-end inventory count
  | 'PERPETUAL';     // Ongoing continuous count

export type CountSessionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED';

export interface StockCountItem {
  id: string;
  sessionId: string;
  itemId: string;
  sku: string;
  name: string;
  locationId?: string;
  locationCode?: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  variancePercent?: number;
  varianceValue?: number;
  unitCost: number;
  status: CountItemStatus;
  countedAt?: Date;
  countedBy?: string;
  notes?: string;
  requiresRecount: boolean;
}

export type CountItemStatus =
  | 'PENDING'
  | 'COUNTED'
  | 'VARIANCE_DETECTED'
  | 'RECOUNT_REQUIRED'
  | 'VERIFIED'
  | 'ADJUSTED';

export interface CountSummary {
  totalItems: number;
  countedItems: number;
  pendingItems: number;
  itemsWithVariance: number;
  totalSystemValue: number;
  totalCountedValue: number;
  totalVarianceValue: number;
  variancePercent: number;
  positiveVarianceItems: number;
  negativeVarianceItems: number;
  completionPercent: number;
}

export interface VarianceReport {
  sessionId: string;
  generatedAt: Date;
  warehouseId: string;
  countType: CountType;
  summary: CountSummary;
  variances: VarianceItem[];
  recommendations: string[];
}

export interface VarianceItem {
  itemId: string;
  sku: string;
  name: string;
  locationCode?: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  variancePercent: number;
  varianceValue: number;
  possibleCauses: string[];
  recommendedAction: AdjustmentAction;
}

export type AdjustmentAction =
  | 'ADJUST_INVENTORY'
  | 'RECOUNT'
  | 'INVESTIGATE'
  | 'NO_ACTION';

export interface InventoryAdjustment {
  id: string;
  userId: string;
  sessionId?: string;
  itemId: string;
  sku: string;
  type: AdjustmentType;
  reason: AdjustmentReason;
  previousQuantity: number;
  adjustedQuantity: number;
  quantityChange: number;
  valueChange: number;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  status: AdjustmentStatus;
  createdAt: Date;
}

export type AdjustmentType = 'INCREASE' | 'DECREASE' | 'CORRECTION';

export type AdjustmentReason =
  | 'PHYSICAL_COUNT'
  | 'DAMAGE'
  | 'THEFT'
  | 'EXPIRATION'
  | 'DATA_ENTRY_ERROR'
  | 'RECEIVING_ERROR'
  | 'SHIPPING_ERROR'
  | 'QUALITY_CONTROL'
  | 'WRITE_OFF'
  | 'FOUND_STOCK'
  | 'OTHER';

export type AdjustmentStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED';

export interface ReconciliationSchedule {
  id: string;
  userId: string;
  warehouseId: string;
  countType: CountType;
  frequency: ReconciliationFrequency;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  nextScheduledDate: Date;
  isActive: boolean;
  itemSelection: ItemSelectionCriteria;
}

export type ReconciliationFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface ItemSelectionCriteria {
  method: 'ALL' | 'ABC_CLASS' | 'CATEGORY' | 'RANDOM_SAMPLE' | 'HIGH_VALUE' | 'HIGH_MOVEMENT';
  abcClasses?: ('A' | 'B' | 'C')[];
  categories?: string[];
  samplePercent?: number;
  valueThreshold?: number;
  movementThreshold?: number;
}

// =================== SERVICE ===================

@Injectable()
export class InventoryReconciliationService {
  private readonly logger = new Logger(InventoryReconciliationService.name);

  // In-memory storage (production would use Prisma)
  private countSessions: Map<string, StockCountSession> = new Map();
  private adjustments: Map<string, InventoryAdjustment> = new Map();
  private schedules: Map<string, ReconciliationSchedule> = new Map();

  constructor(private prisma: PrismaService) {}

  // =================== COUNT SESSION MANAGEMENT ===================

  /**
   * Create a new stock count session
   */
  async createCountSession(
    userId: string,
    warehouseId: string,
    type: CountType,
    scheduledDate: Date,
    options?: {
      notes?: string;
      itemSelection?: ItemSelectionCriteria;
    }
  ): Promise<StockCountSession> {
    const id = `COUNT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get items to count based on selection criteria
    const itemsToCount = await this.getItemsForCount(userId, warehouseId, options?.itemSelection);

    const session: StockCountSession = {
      id,
      userId,
      warehouseId,
      type,
      status: 'SCHEDULED',
      scheduledDate,
      notes: options?.notes,
      items: itemsToCount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.countSessions.set(id, session);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COUNT_SESSION_CREATED',
        entity: 'INVENTORY_COUNT',
        entityId: id,
        details: JSON.parse(JSON.stringify({
          type,
          warehouseId,
          scheduledDate,
          itemCount: itemsToCount.length,
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`Stock count session ${id} created with ${itemsToCount.length} items`);
    return session;
  }

  /**
   * Get items for counting based on selection criteria
   */
  private async getItemsForCount(
    userId: string,
    warehouseId: string,
    criteria?: ItemSelectionCriteria
  ): Promise<StockCountItem[]> {
    // Get all inventory items for the warehouse
    // In production, this would query actual inventory
    const mockItems = [
      { id: 'ITEM-001', sku: 'SKU-001', name: 'Produs A', systemQuantity: 100, unitCost: 50 },
      { id: 'ITEM-002', sku: 'SKU-002', name: 'Produs B', systemQuantity: 250, unitCost: 25 },
      { id: 'ITEM-003', sku: 'SKU-003', name: 'Produs C', systemQuantity: 75, unitCost: 100 },
      { id: 'ITEM-004', sku: 'SKU-004', name: 'Produs D', systemQuantity: 500, unitCost: 10 },
      { id: 'ITEM-005', sku: 'SKU-005', name: 'Produs E', systemQuantity: 30, unitCost: 200 },
    ];

    let items = mockItems;

    // Apply selection criteria
    if (criteria) {
      switch (criteria.method) {
        case 'HIGH_VALUE':
          items = mockItems.filter(i => i.unitCost >= (criteria.valueThreshold || 100));
          break;
        case 'RANDOM_SAMPLE':
          const sampleSize = Math.ceil(mockItems.length * (criteria.samplePercent || 20) / 100);
          items = this.shuffleArray([...mockItems]).slice(0, sampleSize);
          break;
        // Other criteria would be implemented similarly
      }
    }

    return items.map((item, index) => ({
      id: `COUNT-ITEM-${index + 1}`,
      sessionId: '',
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      systemQuantity: item.systemQuantity,
      unitCost: item.unitCost,
      status: 'PENDING' as CountItemStatus,
      requiresRecount: false,
    }));
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Start a count session
   */
  async startCountSession(sessionId: string, countedBy: string): Promise<StockCountSession> {
    const session = this.countSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Sesiunea de inventariere ${sessionId} nu a fost gasita`);
    }

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(`Sesiunea nu poate fi pornita din starea ${session.status}`);
    }

    session.status = 'IN_PROGRESS';
    session.startedAt = new Date();
    session.countedBy = countedBy;
    session.updatedAt = new Date();

    this.countSessions.set(sessionId, session);
    this.logger.log(`Stock count session ${sessionId} started by ${countedBy}`);

    return session;
  }

  /**
   * Record a physical count for an item
   */
  async recordCount(
    sessionId: string,
    itemId: string,
    countedQuantity: number,
    countedBy: string,
    notes?: string
  ): Promise<StockCountItem> {
    const session = this.countSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Sesiunea ${sessionId} nu a fost gasita`);
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Sesiunea nu este in desfasurare');
    }

    const item = session.items.find(i => i.id === itemId);
    if (!item) {
      throw new NotFoundException(`Articolul ${itemId} nu a fost gasit in sesiune`);
    }

    // Calculate variance
    const variance = countedQuantity - item.systemQuantity;
    const variancePercent = item.systemQuantity > 0
      ? (variance / item.systemQuantity) * 100
      : countedQuantity > 0 ? 100 : 0;
    const varianceValue = variance * item.unitCost;

    // Update item
    item.countedQuantity = countedQuantity;
    item.variance = variance;
    item.variancePercent = Math.round(variancePercent * 100) / 100;
    item.varianceValue = Math.round(varianceValue * 100) / 100;
    item.countedAt = new Date();
    item.countedBy = countedBy;
    item.notes = notes;
    item.status = variance !== 0 ? 'VARIANCE_DETECTED' : 'COUNTED';

    // Flag for recount if variance is significant (>5%)
    if (Math.abs(variancePercent) > 5) {
      item.requiresRecount = true;
      item.status = 'RECOUNT_REQUIRED';
    }

    // Update session summary
    session.summary = this.calculateCountSummary(session.items);
    session.updatedAt = new Date();
    this.countSessions.set(sessionId, session);

    return item;
  }

  /**
   * Calculate count session summary
   */
  private calculateCountSummary(items: StockCountItem[]): CountSummary {
    const countedItems = items.filter(i => i.countedQuantity !== undefined);
    const pendingItems = items.filter(i => i.countedQuantity === undefined);
    const itemsWithVariance = countedItems.filter(i => i.variance !== 0);
    const positiveVarianceItems = countedItems.filter(i => (i.variance || 0) > 0);
    const negativeVarianceItems = countedItems.filter(i => (i.variance || 0) < 0);

    const totalSystemValue = items.reduce((sum, i) => sum + (i.systemQuantity * i.unitCost), 0);
    const totalCountedValue = countedItems.reduce(
      (sum, i) => sum + ((i.countedQuantity || 0) * i.unitCost),
      0
    );
    const totalVarianceValue = countedItems.reduce((sum, i) => sum + (i.varianceValue || 0), 0);

    return {
      totalItems: items.length,
      countedItems: countedItems.length,
      pendingItems: pendingItems.length,
      itemsWithVariance: itemsWithVariance.length,
      totalSystemValue: Math.round(totalSystemValue * 100) / 100,
      totalCountedValue: Math.round(totalCountedValue * 100) / 100,
      totalVarianceValue: Math.round(totalVarianceValue * 100) / 100,
      variancePercent: totalSystemValue > 0
        ? Math.round((totalVarianceValue / totalSystemValue) * 10000) / 100
        : 0,
      positiveVarianceItems: positiveVarianceItems.length,
      negativeVarianceItems: negativeVarianceItems.length,
      completionPercent: Math.round((countedItems.length / items.length) * 100),
    };
  }

  /**
   * Complete a count session
   */
  async completeCountSession(sessionId: string, verifiedBy: string): Promise<StockCountSession> {
    const session = this.countSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Sesiunea ${sessionId} nu a fost gasita`);
    }

    // Check all items are counted
    const pendingItems = session.items.filter(i => i.countedQuantity === undefined);
    if (pendingItems.length > 0) {
      throw new BadRequestException(`${pendingItems.length} articole nu au fost numarate`);
    }

    // Check items requiring recount
    const recountItems = session.items.filter(i => i.requiresRecount && i.status === 'RECOUNT_REQUIRED');
    if (recountItems.length > 0) {
      throw new BadRequestException(
        `${recountItems.length} articole necesita renumarare din cauza variantei mari`
      );
    }

    session.status = 'COMPLETED';
    session.completedAt = new Date();
    session.verifiedBy = verifiedBy;
    session.summary = this.calculateCountSummary(session.items);
    session.updatedAt = new Date();

    // Mark all items as verified
    session.items.forEach(item => {
      if (item.status !== 'ADJUSTED') {
        item.status = 'VERIFIED';
      }
    });

    this.countSessions.set(sessionId, session);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'COUNT_SESSION_COMPLETED',
        entity: 'INVENTORY_COUNT',
        entityId: sessionId,
        details: JSON.parse(JSON.stringify({
          summary: session.summary,
          verifiedBy,
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`Stock count session ${sessionId} completed`);
    return session;
  }

  /**
   * Get count session by ID
   */
  async getCountSession(sessionId: string): Promise<StockCountSession> {
    const session = this.countSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Sesiunea ${sessionId} nu a fost gasita`);
    }
    return session;
  }

  /**
   * Get all count sessions for a user
   */
  async getCountSessions(userId: string, filters?: {
    warehouseId?: string;
    status?: CountSessionStatus;
    type?: CountType;
  }): Promise<StockCountSession[]> {
    let sessions = Array.from(this.countSessions.values())
      .filter(s => s.userId === userId);

    if (filters?.warehouseId) {
      sessions = sessions.filter(s => s.warehouseId === filters.warehouseId);
    }
    if (filters?.status) {
      sessions = sessions.filter(s => s.status === filters.status);
    }
    if (filters?.type) {
      sessions = sessions.filter(s => s.type === filters.type);
    }

    return sessions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // =================== VARIANCE ANALYSIS ===================

  /**
   * Generate variance report for a count session
   */
  async generateVarianceReport(sessionId: string): Promise<VarianceReport> {
    const session = this.countSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Sesiunea ${sessionId} nu a fost gasita`);
    }

    const variances: VarianceItem[] = session.items
      .filter(i => i.variance !== 0 && i.countedQuantity !== undefined)
      .map(item => ({
        itemId: item.itemId,
        sku: item.sku,
        name: item.name,
        locationCode: item.locationCode,
        systemQuantity: item.systemQuantity,
        countedQuantity: item.countedQuantity!,
        variance: item.variance!,
        variancePercent: item.variancePercent!,
        varianceValue: item.varianceValue!,
        possibleCauses: this.getPossibleCauses(item),
        recommendedAction: this.getRecommendedAction(item),
      }));

    const recommendations = this.generateRecommendations(session, variances);

    return {
      sessionId,
      generatedAt: new Date(),
      warehouseId: session.warehouseId,
      countType: session.type,
      summary: session.summary || this.calculateCountSummary(session.items),
      variances,
      recommendations,
    };
  }

  private getPossibleCauses(item: StockCountItem): string[] {
    const causes: string[] = [];
    const variance = item.variance || 0;
    const variancePercent = item.variancePercent || 0;

    if (variance < 0) {
      // Stock shortage
      causes.push('Livrari neinregistrate');
      causes.push('Eroare la receptie');
      if (Math.abs(variancePercent) > 10) {
        causes.push('Posibila sustragere');
        causes.push('Pierderi prin deteriorare');
      }
      causes.push('Eroare de inregistrare in sistem');
    } else {
      // Stock surplus
      causes.push('Receptii neinregistrate');
      causes.push('Retururi neinregistrate');
      causes.push('Eroare de inregistrare in sistem');
      causes.push('Duplicare la receptie');
    }

    return causes;
  }

  private getRecommendedAction(item: StockCountItem): AdjustmentAction {
    const variancePercent = Math.abs(item.variancePercent || 0);

    if (variancePercent === 0) return 'NO_ACTION';
    if (variancePercent > 20) return 'INVESTIGATE';
    if (variancePercent > 5) return 'RECOUNT';
    return 'ADJUST_INVENTORY';
  }

  private generateRecommendations(session: StockCountSession, variances: VarianceItem[]): string[] {
    const recommendations: string[] = [];
    const summary = session.summary || this.calculateCountSummary(session.items);

    if (summary.variancePercent > 5) {
      recommendations.push('Varianta totala depaseste 5%. Se recomanda revizuirea proceselor de depozitare.');
    }

    if (summary.negativeVarianceItems > summary.positiveVarianceItems * 2) {
      recommendations.push('Majoritatea variantelor sunt negative. Verificati procesul de livrare si securitatea.');
    }

    const highVarianceItems = variances.filter(v => Math.abs(v.variancePercent) > 20);
    if (highVarianceItems.length > 0) {
      recommendations.push(`${highVarianceItems.length} articole au variante >20%. Se recomanda investigatie detaliata.`);
    }

    const investigateItems = variances.filter(v => v.recommendedAction === 'INVESTIGATE');
    if (investigateItems.length > 0) {
      recommendations.push(`Investigati prioritar articolele: ${investigateItems.map(i => i.sku).join(', ')}`);
    }

    if (summary.totalVarianceValue < -1000) {
      recommendations.push('Pierdere totala semnificativa. Considerati raportarea catre management.');
    }

    return recommendations;
  }

  // =================== INVENTORY ADJUSTMENTS ===================

  /**
   * Create inventory adjustment
   */
  async createAdjustment(
    userId: string,
    itemId: string,
    sku: string,
    reason: AdjustmentReason,
    previousQuantity: number,
    newQuantity: number,
    unitCost: number,
    options?: {
      sessionId?: string;
      notes?: string;
    }
  ): Promise<InventoryAdjustment> {
    const quantityChange = newQuantity - previousQuantity;
    const valueChange = quantityChange * unitCost;

    const adjustment: InventoryAdjustment = {
      id: `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      sessionId: options?.sessionId,
      itemId,
      sku,
      type: quantityChange > 0 ? 'INCREASE' : quantityChange < 0 ? 'DECREASE' : 'CORRECTION',
      reason,
      previousQuantity,
      adjustedQuantity: newQuantity,
      quantityChange,
      valueChange: Math.round(valueChange * 100) / 100,
      notes: options?.notes,
      status: 'PENDING_APPROVAL',
      createdAt: new Date(),
    };

    this.adjustments.set(adjustment.id, adjustment);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'ADJUSTMENT_CREATED',
        entity: 'INVENTORY_ADJUSTMENT',
        entityId: adjustment.id,
        details: JSON.parse(JSON.stringify({
          itemId,
          sku,
          reason,
          previousQuantity,
          newQuantity,
          quantityChange,
          valueChange: adjustment.valueChange,
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`Inventory adjustment ${adjustment.id} created for ${sku}`);
    return adjustment;
  }

  /**
   * Approve an adjustment
   */
  async approveAdjustment(adjustmentId: string, approvedBy: string): Promise<InventoryAdjustment> {
    const adjustment = this.adjustments.get(adjustmentId);
    if (!adjustment) {
      throw new NotFoundException(`Ajustarea ${adjustmentId} nu a fost gasita`);
    }

    if (adjustment.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Ajustarea nu poate fi aprobata din starea ${adjustment.status}`);
    }

    adjustment.status = 'APPROVED';
    adjustment.approvedBy = approvedBy;
    adjustment.approvedAt = new Date();

    this.adjustments.set(adjustmentId, adjustment);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adjustment.userId,
        action: 'ADJUSTMENT_APPROVED',
        entity: 'INVENTORY_ADJUSTMENT',
        entityId: adjustmentId,
        details: JSON.parse(JSON.stringify({ approvedBy })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`Adjustment ${adjustmentId} approved by ${approvedBy}`);
    return adjustment;
  }

  /**
   * Apply approved adjustment to inventory
   */
  async applyAdjustment(adjustmentId: string): Promise<InventoryAdjustment> {
    const adjustment = this.adjustments.get(adjustmentId);
    if (!adjustment) {
      throw new NotFoundException(`Ajustarea ${adjustmentId} nu a fost gasita`);
    }

    if (adjustment.status !== 'APPROVED') {
      throw new BadRequestException('Ajustarea trebuie aprobata inainte de aplicare');
    }

    // In production, this would update actual inventory quantities
    // await this.inventoryService.updateQuantity(adjustment.itemId, adjustment.adjustedQuantity);

    adjustment.status = 'APPLIED';
    this.adjustments.set(adjustmentId, adjustment);

    // Update count session item if linked
    if (adjustment.sessionId) {
      const session = this.countSessions.get(adjustment.sessionId);
      if (session) {
        const item = session.items.find(i => i.itemId === adjustment.itemId);
        if (item) {
          item.status = 'ADJUSTED';
          this.countSessions.set(adjustment.sessionId, session);
        }
      }
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: adjustment.userId,
        action: 'ADJUSTMENT_APPLIED',
        entity: 'INVENTORY_ADJUSTMENT',
        entityId: adjustmentId,
        details: JSON.parse(JSON.stringify({
          itemId: adjustment.itemId,
          quantityChange: adjustment.quantityChange,
          valueChange: adjustment.valueChange,
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`Adjustment ${adjustmentId} applied`);
    return adjustment;
  }

  /**
   * Get adjustments for a user
   */
  async getAdjustments(userId: string, filters?: {
    status?: AdjustmentStatus;
    reason?: AdjustmentReason;
    sessionId?: string;
  }): Promise<InventoryAdjustment[]> {
    let adjustments = Array.from(this.adjustments.values())
      .filter(a => a.userId === userId);

    if (filters?.status) {
      adjustments = adjustments.filter(a => a.status === filters.status);
    }
    if (filters?.reason) {
      adjustments = adjustments.filter(a => a.reason === filters.reason);
    }
    if (filters?.sessionId) {
      adjustments = adjustments.filter(a => a.sessionId === filters.sessionId);
    }

    return adjustments.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // =================== SCHEDULING ===================

  /**
   * Create reconciliation schedule
   */
  async createSchedule(
    userId: string,
    warehouseId: string,
    countType: CountType,
    frequency: ReconciliationFrequency,
    itemSelection: ItemSelectionCriteria,
    options?: {
      dayOfWeek?: number;
      dayOfMonth?: number;
    }
  ): Promise<ReconciliationSchedule> {
    const schedule: ReconciliationSchedule = {
      id: `SCHED-${Date.now()}`,
      userId,
      warehouseId,
      countType,
      frequency,
      dayOfWeek: options?.dayOfWeek,
      dayOfMonth: options?.dayOfMonth,
      nextScheduledDate: this.calculateNextScheduledDate(frequency, options),
      isActive: true,
      itemSelection,
    };

    this.schedules.set(schedule.id, schedule);
    this.logger.log(`Reconciliation schedule ${schedule.id} created`);
    return schedule;
  }

  private calculateNextScheduledDate(
    frequency: ReconciliationFrequency,
    options?: { dayOfWeek?: number; dayOfMonth?: number }
  ): Date {
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        const daysUntilNext = (options?.dayOfWeek || 1) - now.getDay();
        next.setDate(next.getDate() + (daysUntilNext <= 0 ? daysUntilNext + 7 : daysUntilNext));
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        next.setDate(options?.dayOfMonth || 1);
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        next.setDate(1);
        break;
      case 'ANNUAL':
        next.setFullYear(next.getFullYear() + 1);
        next.setMonth(0);
        next.setDate(1);
        break;
    }

    return next;
  }

  /**
   * Get all schedules for a user
   */
  async getSchedules(userId: string): Promise<ReconciliationSchedule[]> {
    return Array.from(this.schedules.values())
      .filter(s => s.userId === userId && s.isActive);
  }

  // =================== DASHBOARD ===================

  /**
   * Get reconciliation dashboard data
   */
  async getDashboard(userId: string): Promise<{
    activeSessions: StockCountSession[];
    recentCompletedSessions: StockCountSession[];
    pendingAdjustments: InventoryAdjustment[];
    upcomingSchedules: ReconciliationSchedule[];
    stats: {
      totalSessionsThisMonth: number;
      averageVariancePercent: number;
      totalAdjustmentsValue: number;
      itemsRequiringAttention: number;
    };
    alerts: { type: 'info' | 'warning' | 'error'; message: string }[];
  }> {
    const sessions = await this.getCountSessions(userId);
    const adjustments = await this.getAdjustments(userId);
    const schedules = await this.getSchedules(userId);

    const activeSessions = sessions.filter(s =>
      s.status === 'IN_PROGRESS' || s.status === 'SCHEDULED'
    );
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const pendingAdjustments = adjustments.filter(a => a.status === 'PENDING_APPROVAL');

    // Calculate stats
    const now = new Date();
    const thisMonth = sessions.filter(s =>
      new Date(s.createdAt).getMonth() === now.getMonth() &&
      new Date(s.createdAt).getFullYear() === now.getFullYear()
    );

    const completedWithVariance = completedSessions.filter(s => s.summary);
    const avgVariance = completedWithVariance.length > 0
      ? completedWithVariance.reduce((sum, s) => sum + (s.summary?.variancePercent || 0), 0) / completedWithVariance.length
      : 0;

    const totalAdjustmentsValue = adjustments
      .filter(a => a.status === 'APPLIED')
      .reduce((sum, a) => sum + Math.abs(a.valueChange), 0);

    // Count items requiring attention across active sessions
    const itemsRequiringAttention = activeSessions.reduce((count, session) => {
      return count + session.items.filter(i =>
        i.status === 'RECOUNT_REQUIRED' || i.status === 'VARIANCE_DETECTED'
      ).length;
    }, 0);

    // Generate alerts
    const alerts: { type: 'info' | 'warning' | 'error'; message: string }[] = [];

    if (activeSessions.filter(s => s.status === 'IN_PROGRESS').length > 0) {
      alerts.push({
        type: 'info',
        message: `${activeSessions.filter(s => s.status === 'IN_PROGRESS').length} sesiuni de inventariere in desfasurare`,
      });
    }

    if (pendingAdjustments.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${pendingAdjustments.length} ajustari asteapta aprobare`,
      });
    }

    if (itemsRequiringAttention > 0) {
      alerts.push({
        type: 'error',
        message: `${itemsRequiringAttention} articole necesita atentie (variante mari)`,
      });
    }

    const overdueSchedules = schedules.filter(s => new Date(s.nextScheduledDate) < now);
    if (overdueSchedules.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${overdueSchedules.length} inventarieri programate au depasit termenul`,
      });
    }

    return {
      activeSessions,
      recentCompletedSessions: completedSessions.slice(0, 5),
      pendingAdjustments,
      upcomingSchedules: schedules.filter(s => new Date(s.nextScheduledDate) >= now).slice(0, 5),
      stats: {
        totalSessionsThisMonth: thisMonth.length,
        averageVariancePercent: Math.round(avgVariance * 100) / 100,
        totalAdjustmentsValue: Math.round(totalAdjustmentsValue * 100) / 100,
        itemsRequiringAttention,
      },
      alerts,
    };
  }
}
