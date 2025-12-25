import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type ProcurementCategory =
  | 'raw_materials'
  | 'components'
  | 'equipment'
  | 'services'
  | 'office_supplies'
  | 'it_hardware'
  | 'it_software'
  | 'maintenance'
  | 'logistics'
  | 'marketing'
  | 'consulting'
  | 'other';

export type ItemStatus = 'active' | 'inactive' | 'discontinued' | 'pending_approval';
export type UnitOfMeasure = 'piece' | 'kg' | 'liter' | 'meter' | 'sqm' | 'hour' | 'day' | 'month' | 'unit' | 'box' | 'pallet';
export type PriceType = 'fixed' | 'contract' | 'negotiated' | 'market' | 'bid';
export type CatalogStatus = 'draft' | 'active' | 'expired' | 'archived';

// =================== INTERFACES ===================

export interface ProcurementItem {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category: ProcurementCategory;
  subcategory?: string;
  status: ItemStatus;
  unitOfMeasure: UnitOfMeasure;
  specifications?: ItemSpecification[];
  preferredVendors: PreferredVendor[];
  pricing: ItemPricing;
  inventory: ItemInventory;
  compliance: ItemCompliance;
  attachments: ItemAttachment[];
  tags?: string[];
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemSpecification {
  name: string;
  value: string;
  unit?: string;
  isRequired: boolean;
}

export interface PreferredVendor {
  vendorId: string;
  vendorName: string;
  priority: number;
  contractId?: string;
  leadTimeDays: number;
  minimumOrderQuantity?: number;
  pricePerUnit: number;
  currency: string;
  lastOrderDate?: Date;
  rating?: number;
  notes?: string;
}

export interface ItemPricing {
  standardCost: number;
  lastPurchasePrice?: number;
  averagePrice?: number;
  targetPrice?: number;
  currency: string;
  priceHistory: PriceHistoryEntry[];
}

export interface PriceHistoryEntry {
  date: Date;
  price: number;
  vendorId: string;
  vendorName: string;
  quantity: number;
  poNumber?: string;
}

export interface ItemInventory {
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  warehouseLocation?: string;
  lastStockUpdate?: Date;
}

export interface ItemCompliance {
  requiresCertification: boolean;
  certifications?: string[];
  hazardous: boolean;
  hazardClass?: string;
  shelfLifeDays?: number;
  storageRequirements?: string;
  qualityStandards?: string[];
}

export interface ItemAttachment {
  id: string;
  name: string;
  type: 'specification' | 'certificate' | 'datasheet' | 'image' | 'other';
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface ProcurementCatalog {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: CatalogStatus;
  category?: ProcurementCategory;
  validFrom: Date;
  validTo?: Date;
  items: CatalogItem[];
  vendors: string[];
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  catalogPrice: number;
  currency: string;
  priceType: PriceType;
  discountPercent?: number;
  minimumQuantity?: number;
  maximumQuantity?: number;
  leadTimeDays: number;
  vendorId?: string;
  notes?: string;
}

export interface ProcurementBudget {
  id: string;
  tenantId: string;
  name: string;
  fiscalYear: number;
  category?: ProcurementCategory;
  departmentId?: string;
  departmentName?: string;
  totalBudget: number;
  allocatedAmount: number;
  spentAmount: number;
  committedAmount: number;
  availableAmount: number;
  currency: string;
  monthlyAllocations: MonthlyAllocation[];
  alerts: BudgetAlert[];
  status: 'draft' | 'approved' | 'active' | 'closed';
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyAllocation {
  month: number;
  allocated: number;
  spent: number;
  committed: number;
}

export interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  threshold: number;
  message: string;
  triggeredAt?: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export interface ProcurementContract {
  id: string;
  tenantId: string;
  contractNumber: string;
  vendorId: string;
  vendorName: string;
  name: string;
  description?: string;
  type: 'framework' | 'blanket' | 'spot' | 'service';
  status: 'draft' | 'pending_approval' | 'active' | 'expired' | 'terminated';
  startDate: Date;
  endDate: Date;
  totalValue: number;
  usedValue: number;
  remainingValue: number;
  currency: string;
  terms: ContractTerms;
  items: ContractItem[];
  contacts: ContractContact[];
  documents: ContractDocument[];
  renewalInfo?: RenewalInfo;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractTerms {
  paymentTerms: string;
  deliveryTerms: string;
  warrantyPeriodMonths?: number;
  penaltyClause?: string;
  terminationClause?: string;
  priceAdjustmentClause?: string;
  confidentialityClause: boolean;
  exclusivityClause: boolean;
}

export interface ContractItem {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitPrice: number;
  currency: string;
  minimumQuantity?: number;
  maximumQuantity?: number;
  totalQuantity?: number;
  orderedQuantity: number;
  deliveredQuantity: number;
}

export interface ContractContact {
  name: string;
  role: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
}

export interface ContractDocument {
  id: string;
  name: string;
  type: 'contract' | 'amendment' | 'attachment' | 'certificate';
  fileUrl: string;
  version: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface RenewalInfo {
  autoRenew: boolean;
  renewalPeriodMonths: number;
  noticePeriodDays: number;
  nextRenewalDate?: Date;
  renewalCount: number;
}

export interface SpendAnalysis {
  tenantId: string;
  period: { from: Date; to: Date };
  totalSpend: number;
  byCategory: CategorySpend[];
  byVendor: VendorSpend[];
  byDepartment: DepartmentSpend[];
  byMonth: MonthlySpend[];
  topItems: ItemSpend[];
  savingsOpportunities: SavingsOpportunity[];
  complianceMetrics: ComplianceMetrics;
}

export interface CategorySpend {
  category: ProcurementCategory;
  amount: number;
  percentage: number;
  orderCount: number;
  itemCount: number;
}

export interface VendorSpend {
  vendorId: string;
  vendorName: string;
  amount: number;
  percentage: number;
  orderCount: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
}

export interface DepartmentSpend {
  departmentId: string;
  departmentName: string;
  amount: number;
  percentage: number;
  budgetUtilization: number;
}

export interface MonthlySpend {
  month: string;
  amount: number;
  orderCount: number;
  avgOrderValue: number;
}

export interface ItemSpend {
  itemId: string;
  itemCode: string;
  itemName: string;
  totalSpend: number;
  quantity: number;
  avgPrice: number;
  vendorCount: number;
}

export interface SavingsOpportunity {
  type: 'consolidation' | 'negotiation' | 'alternative' | 'bulk_discount';
  description: string;
  estimatedSavings: number;
  itemIds: string[];
  vendorIds: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ComplianceMetrics {
  contractCoverage: number;
  catalogCompliance: number;
  approvalCompliance: number;
  vendorDiversification: number;
  policyViolations: number;
}

@Injectable()
export class ProcurementManagementService {
  private items: Map<string, ProcurementItem> = new Map();
  private catalogs: Map<string, ProcurementCatalog> = new Map();
  private budgets: Map<string, ProcurementBudget> = new Map();
  private contracts: Map<string, ProcurementContract> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== PROCUREMENT ITEMS ===================

  async createItem(data: {
    tenantId: string;
    code: string;
    name: string;
    description?: string;
    category: ProcurementCategory;
    subcategory?: string;
    unitOfMeasure: UnitOfMeasure;
    specifications?: ItemSpecification[];
    preferredVendors?: Omit<PreferredVendor, 'lastOrderDate'>[];
    pricing: {
      standardCost: number;
      targetPrice?: number;
      currency?: string;
    };
    inventory?: Partial<ItemInventory>;
    compliance?: Partial<ItemCompliance>;
    tags?: string[];
    notes?: string;
    createdBy: string;
  }): Promise<ProcurementItem> {
    // Check for duplicate code
    const existing = Array.from(this.items.values()).find(
      i => i.tenantId === data.tenantId && i.code === data.code
    );
    if (existing) {
      throw new Error('Item with this code already exists');
    }

    const item: ProcurementItem = {
      id: `pitem_${Date.now()}`,
      tenantId: data.tenantId,
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      status: 'active',
      unitOfMeasure: data.unitOfMeasure,
      specifications: data.specifications || [],
      preferredVendors: (data.preferredVendors || []).map(v => ({
        ...v,
        lastOrderDate: undefined,
      })),
      pricing: {
        standardCost: data.pricing.standardCost,
        targetPrice: data.pricing.targetPrice,
        currency: data.pricing.currency || 'RON',
        priceHistory: [],
      },
      inventory: {
        currentStock: data.inventory?.currentStock || 0,
        minimumStock: data.inventory?.minimumStock || 0,
        maximumStock: data.inventory?.maximumStock || 0,
        reorderPoint: data.inventory?.reorderPoint || 0,
        reorderQuantity: data.inventory?.reorderQuantity || 0,
        warehouseLocation: data.inventory?.warehouseLocation,
      },
      compliance: {
        requiresCertification: data.compliance?.requiresCertification || false,
        certifications: data.compliance?.certifications,
        hazardous: data.compliance?.hazardous || false,
        hazardClass: data.compliance?.hazardClass,
        shelfLifeDays: data.compliance?.shelfLifeDays,
        storageRequirements: data.compliance?.storageRequirements,
        qualityStandards: data.compliance?.qualityStandards,
      },
      attachments: [],
      tags: data.tags,
      notes: data.notes,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.items.set(item.id, item);
    this.eventEmitter.emit('procurement.item_created', { item });

    return item;
  }

  async getItem(id: string): Promise<ProcurementItem | null> {
    return this.items.get(id) || null;
  }

  async getItemByCode(tenantId: string, code: string): Promise<ProcurementItem | null> {
    return Array.from(this.items.values()).find(
      i => i.tenantId === tenantId && i.code === code
    ) || null;
  }

  async getItems(
    tenantId: string,
    options?: {
      category?: ProcurementCategory;
      status?: ItemStatus;
      search?: string;
      vendorId?: string;
      belowReorderPoint?: boolean;
      limit?: number;
    }
  ): Promise<ProcurementItem[]> {
    let items = Array.from(this.items.values())
      .filter(i => i.tenantId === tenantId);

    if (options?.category) {
      items = items.filter(i => i.category === options.category);
    }
    if (options?.status) {
      items = items.filter(i => i.status === options.status);
    }
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      items = items.filter(i =>
        i.code.toLowerCase().includes(searchLower) ||
        i.name.toLowerCase().includes(searchLower) ||
        i.description?.toLowerCase().includes(searchLower)
      );
    }
    if (options?.vendorId) {
      items = items.filter(i =>
        i.preferredVendors.some(v => v.vendorId === options.vendorId)
      );
    }
    if (options?.belowReorderPoint) {
      items = items.filter(i => i.inventory.currentStock <= i.inventory.reorderPoint);
    }

    items.sort((a, b) => a.name.localeCompare(b.name));

    if (options?.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  async updateItem(
    id: string,
    updates: Partial<Pick<ProcurementItem, 'name' | 'description' | 'subcategory' | 'specifications' | 'tags' | 'notes'>>
  ): Promise<ProcurementItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    Object.assign(item, updates, { updatedAt: new Date() });
    this.items.set(id, item);

    return item;
  }

  async updateItemStatus(id: string, status: ItemStatus): Promise<ProcurementItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    item.status = status;
    item.updatedAt = new Date();
    this.items.set(id, item);

    this.eventEmitter.emit('procurement.item_status_changed', { item, status });
    return item;
  }

  async addPreferredVendor(
    id: string,
    vendor: Omit<PreferredVendor, 'lastOrderDate'>
  ): Promise<ProcurementItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    const existingIndex = item.preferredVendors.findIndex(v => v.vendorId === vendor.vendorId);
    if (existingIndex >= 0) {
      item.preferredVendors[existingIndex] = { ...vendor, lastOrderDate: item.preferredVendors[existingIndex].lastOrderDate };
    } else {
      item.preferredVendors.push({ ...vendor, lastOrderDate: undefined });
    }

    // Sort by priority
    item.preferredVendors.sort((a, b) => a.priority - b.priority);
    item.updatedAt = new Date();
    this.items.set(id, item);

    return item;
  }

  async removePreferredVendor(id: string, vendorId: string): Promise<ProcurementItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    item.preferredVendors = item.preferredVendors.filter(v => v.vendorId !== vendorId);
    item.updatedAt = new Date();
    this.items.set(id, item);

    return item;
  }

  async updateItemInventory(
    id: string,
    inventory: Partial<ItemInventory>
  ): Promise<ProcurementItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    Object.assign(item.inventory, inventory, { lastStockUpdate: new Date() });
    item.updatedAt = new Date();
    this.items.set(id, item);

    // Check if below reorder point
    if (item.inventory.currentStock <= item.inventory.reorderPoint) {
      this.eventEmitter.emit('procurement.item_below_reorder', { item });
    }

    return item;
  }

  async recordPurchasePrice(
    id: string,
    price: {
      price: number;
      vendorId: string;
      vendorName: string;
      quantity: number;
      poNumber?: string;
    }
  ): Promise<ProcurementItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    item.pricing.priceHistory.push({
      date: new Date(),
      price: price.price,
      vendorId: price.vendorId,
      vendorName: price.vendorName,
      quantity: price.quantity,
      poNumber: price.poNumber,
    });

    item.pricing.lastPurchasePrice = price.price;

    // Calculate average price
    const totalPrices = item.pricing.priceHistory.reduce((sum, h) => sum + h.price * h.quantity, 0);
    const totalQuantity = item.pricing.priceHistory.reduce((sum, h) => sum + h.quantity, 0);
    item.pricing.averagePrice = totalQuantity > 0 ? totalPrices / totalQuantity : 0;

    // Update preferred vendor last order date
    const vendor = item.preferredVendors.find(v => v.vendorId === price.vendorId);
    if (vendor) {
      vendor.lastOrderDate = new Date();
    }

    item.updatedAt = new Date();
    this.items.set(id, item);

    return item;
  }

  async addItemAttachment(
    id: string,
    attachment: Omit<ItemAttachment, 'id' | 'uploadedAt'>
  ): Promise<ProcurementItem | null> {
    const item = this.items.get(id);
    if (!item) return null;

    item.attachments.push({
      ...attachment,
      id: `patt_${Date.now()}`,
      uploadedAt: new Date(),
    });
    item.updatedAt = new Date();
    this.items.set(id, item);

    return item;
  }

  // =================== CATALOGS ===================

  async createCatalog(data: {
    tenantId: string;
    name: string;
    description?: string;
    category?: ProcurementCategory;
    validFrom: Date;
    validTo?: Date;
    items?: Omit<CatalogItem, 'itemCode' | 'itemName'>[];
    vendors?: string[];
    createdBy: string;
  }): Promise<ProcurementCatalog> {
    const catalogItems: CatalogItem[] = [];

    for (const item of data.items || []) {
      const procItem = this.items.get(item.itemId);
      if (procItem) {
        catalogItems.push({
          ...item,
          itemCode: procItem.code,
          itemName: procItem.name,
        });
      }
    }

    const catalog: ProcurementCatalog = {
      id: `pcat_${Date.now()}`,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      status: 'draft',
      category: data.category,
      validFrom: data.validFrom,
      validTo: data.validTo,
      items: catalogItems,
      vendors: data.vendors || [],
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.catalogs.set(catalog.id, catalog);
    return catalog;
  }

  async getCatalog(id: string): Promise<ProcurementCatalog | null> {
    return this.catalogs.get(id) || null;
  }

  async getCatalogs(
    tenantId: string,
    options?: {
      status?: CatalogStatus;
      category?: ProcurementCategory;
      vendorId?: string;
      activeOnly?: boolean;
    }
  ): Promise<ProcurementCatalog[]> {
    let catalogs = Array.from(this.catalogs.values())
      .filter(c => c.tenantId === tenantId);

    if (options?.status) {
      catalogs = catalogs.filter(c => c.status === options.status);
    }
    if (options?.category) {
      catalogs = catalogs.filter(c => c.category === options.category);
    }
    if (options?.vendorId) {
      catalogs = catalogs.filter(c => c.vendors.includes(options.vendorId!));
    }
    if (options?.activeOnly) {
      const now = new Date();
      catalogs = catalogs.filter(c =>
        c.status === 'active' &&
        c.validFrom <= now &&
        (!c.validTo || c.validTo >= now)
      );
    }

    return catalogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async activateCatalog(
    id: string,
    approvedBy: string
  ): Promise<ProcurementCatalog | null> {
    const catalog = this.catalogs.get(id);
    if (!catalog || catalog.status !== 'draft') return null;

    catalog.status = 'active';
    catalog.approvedBy = approvedBy;
    catalog.approvedAt = new Date();
    catalog.updatedAt = new Date();
    this.catalogs.set(id, catalog);

    this.eventEmitter.emit('procurement.catalog_activated', { catalog });
    return catalog;
  }

  async addCatalogItem(
    id: string,
    item: Omit<CatalogItem, 'itemCode' | 'itemName'>
  ): Promise<ProcurementCatalog | null> {
    const catalog = this.catalogs.get(id);
    if (!catalog) return null;

    const procItem = this.items.get(item.itemId);
    if (!procItem) return null;

    catalog.items.push({
      ...item,
      itemCode: procItem.code,
      itemName: procItem.name,
    });
    catalog.updatedAt = new Date();
    this.catalogs.set(id, catalog);

    return catalog;
  }

  async getCatalogPrice(
    tenantId: string,
    itemId: string,
    vendorId?: string
  ): Promise<CatalogItem | null> {
    const activeCatalogs = await this.getCatalogs(tenantId, { activeOnly: true });

    for (const catalog of activeCatalogs) {
      if (vendorId && !catalog.vendors.includes(vendorId)) continue;

      const item = catalog.items.find(i => i.itemId === itemId);
      if (item) {
        if (!vendorId || item.vendorId === vendorId) {
          return item;
        }
      }
    }

    return null;
  }

  // =================== BUDGETS ===================

  async createBudget(data: {
    tenantId: string;
    name: string;
    fiscalYear: number;
    category?: ProcurementCategory;
    departmentId?: string;
    departmentName?: string;
    totalBudget: number;
    currency?: string;
    monthlyAllocations?: { month: number; allocated: number }[];
    createdBy: string;
  }): Promise<ProcurementBudget> {
    const monthlyAllocations: MonthlyAllocation[] = data.monthlyAllocations
      ? data.monthlyAllocations.map(m => ({ ...m, spent: 0, committed: 0 }))
      : Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          allocated: data.totalBudget / 12,
          spent: 0,
          committed: 0,
        }));

    const budget: ProcurementBudget = {
      id: `pbudget_${Date.now()}`,
      tenantId: data.tenantId,
      name: data.name,
      fiscalYear: data.fiscalYear,
      category: data.category,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      totalBudget: data.totalBudget,
      allocatedAmount: monthlyAllocations.reduce((sum, m) => sum + m.allocated, 0),
      spentAmount: 0,
      committedAmount: 0,
      availableAmount: data.totalBudget,
      currency: data.currency || 'RON',
      monthlyAllocations,
      alerts: [
        { id: 'alert_75', type: 'warning', threshold: 75, message: 'Budget 75% utilized', acknowledged: false },
        { id: 'alert_90', type: 'critical', threshold: 90, message: 'Budget 90% utilized', acknowledged: false },
      ],
      status: 'draft',
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.budgets.set(budget.id, budget);
    return budget;
  }

  async getBudget(id: string): Promise<ProcurementBudget | null> {
    return this.budgets.get(id) || null;
  }

  async getBudgets(
    tenantId: string,
    options?: {
      fiscalYear?: number;
      category?: ProcurementCategory;
      departmentId?: string;
      status?: ProcurementBudget['status'];
    }
  ): Promise<ProcurementBudget[]> {
    let budgets = Array.from(this.budgets.values())
      .filter(b => b.tenantId === tenantId);

    if (options?.fiscalYear) {
      budgets = budgets.filter(b => b.fiscalYear === options.fiscalYear);
    }
    if (options?.category) {
      budgets = budgets.filter(b => b.category === options.category);
    }
    if (options?.departmentId) {
      budgets = budgets.filter(b => b.departmentId === options.departmentId);
    }
    if (options?.status) {
      budgets = budgets.filter(b => b.status === options.status);
    }

    return budgets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async approveBudget(id: string, approvedBy: string): Promise<ProcurementBudget | null> {
    const budget = this.budgets.get(id);
    if (!budget || budget.status !== 'draft') return null;

    budget.status = 'approved';
    budget.approvedBy = approvedBy;
    budget.approvedAt = new Date();
    budget.updatedAt = new Date();
    this.budgets.set(id, budget);

    return budget;
  }

  async activateBudget(id: string): Promise<ProcurementBudget | null> {
    const budget = this.budgets.get(id);
    if (!budget || budget.status !== 'approved') return null;

    budget.status = 'active';
    budget.updatedAt = new Date();
    this.budgets.set(id, budget);

    this.eventEmitter.emit('procurement.budget_activated', { budget });
    return budget;
  }

  async recordBudgetSpend(
    id: string,
    amount: number,
    month: number
  ): Promise<ProcurementBudget | null> {
    const budget = this.budgets.get(id);
    if (!budget || budget.status !== 'active') return null;

    budget.spentAmount += amount;
    budget.availableAmount = budget.totalBudget - budget.spentAmount - budget.committedAmount;

    const monthAlloc = budget.monthlyAllocations.find(m => m.month === month);
    if (monthAlloc) {
      monthAlloc.spent += amount;
    }

    // Check alerts
    const utilizationRate = (budget.spentAmount / budget.totalBudget) * 100;
    for (const alert of budget.alerts) {
      if (!alert.triggeredAt && utilizationRate >= alert.threshold) {
        alert.triggeredAt = new Date();
        this.eventEmitter.emit('procurement.budget_alert', { budget, alert });
      }
    }

    budget.updatedAt = new Date();
    this.budgets.set(id, budget);

    return budget;
  }

  async recordBudgetCommitment(
    id: string,
    amount: number,
    month: number
  ): Promise<ProcurementBudget | null> {
    const budget = this.budgets.get(id);
    if (!budget || budget.status !== 'active') return null;

    budget.committedAmount += amount;
    budget.availableAmount = budget.totalBudget - budget.spentAmount - budget.committedAmount;

    const monthAlloc = budget.monthlyAllocations.find(m => m.month === month);
    if (monthAlloc) {
      monthAlloc.committed += amount;
    }

    budget.updatedAt = new Date();
    this.budgets.set(id, budget);

    return budget;
  }

  async checkBudgetAvailability(
    tenantId: string,
    amount: number,
    options?: {
      category?: ProcurementCategory;
      departmentId?: string;
    }
  ): Promise<{ available: boolean; budgetId?: string; availableAmount?: number }> {
    const budgets = await this.getBudgets(tenantId, {
      fiscalYear: new Date().getFullYear(),
      category: options?.category,
      departmentId: options?.departmentId,
      status: 'active',
    });

    for (const budget of budgets) {
      if (budget.availableAmount >= amount) {
        return { available: true, budgetId: budget.id, availableAmount: budget.availableAmount };
      }
    }

    return { available: false };
  }

  // =================== CONTRACTS ===================

  async createContract(data: {
    tenantId: string;
    vendorId: string;
    vendorName: string;
    name: string;
    description?: string;
    type: ProcurementContract['type'];
    startDate: Date;
    endDate: Date;
    totalValue: number;
    currency?: string;
    terms: ContractTerms;
    items?: Omit<ContractItem, 'id' | 'orderedQuantity' | 'deliveredQuantity'>[];
    contacts?: ContractContact[];
    renewalInfo?: Omit<RenewalInfo, 'renewalCount'>;
    createdBy: string;
  }): Promise<ProcurementContract> {
    const contract: ProcurementContract = {
      id: `pcon_${Date.now()}`,
      tenantId: data.tenantId,
      contractNumber: `PC-${Date.now().toString().slice(-8)}`,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      name: data.name,
      description: data.description,
      type: data.type,
      status: 'draft',
      startDate: data.startDate,
      endDate: data.endDate,
      totalValue: data.totalValue,
      usedValue: 0,
      remainingValue: data.totalValue,
      currency: data.currency || 'RON',
      terms: data.terms,
      items: (data.items || []).map((item, i) => ({
        ...item,
        id: `pcitem_${Date.now()}_${i}`,
        orderedQuantity: 0,
        deliveredQuantity: 0,
      })),
      contacts: data.contacts || [],
      documents: [],
      renewalInfo: data.renewalInfo ? { ...data.renewalInfo, renewalCount: 0 } : undefined,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.contracts.set(contract.id, contract);
    return contract;
  }

  async getContract(id: string): Promise<ProcurementContract | null> {
    return this.contracts.get(id) || null;
  }

  async getContracts(
    tenantId: string,
    options?: {
      vendorId?: string;
      type?: ProcurementContract['type'];
      status?: ProcurementContract['status'];
      expiringWithinDays?: number;
    }
  ): Promise<ProcurementContract[]> {
    let contracts = Array.from(this.contracts.values())
      .filter(c => c.tenantId === tenantId);

    if (options?.vendorId) {
      contracts = contracts.filter(c => c.vendorId === options.vendorId);
    }
    if (options?.type) {
      contracts = contracts.filter(c => c.type === options.type);
    }
    if (options?.status) {
      contracts = contracts.filter(c => c.status === options.status);
    }
    if (options?.expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + options.expiringWithinDays);
      contracts = contracts.filter(c =>
        c.status === 'active' && c.endDate <= futureDate
      );
    }

    return contracts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async activateContract(id: string): Promise<ProcurementContract | null> {
    const contract = this.contracts.get(id);
    if (!contract || !['draft', 'pending_approval'].includes(contract.status)) return null;

    contract.status = 'active';
    contract.updatedAt = new Date();
    this.contracts.set(id, contract);

    this.eventEmitter.emit('procurement.contract_activated', { contract });
    return contract;
  }

  async recordContractUsage(
    id: string,
    itemId: string,
    quantity: number,
    value: number
  ): Promise<ProcurementContract | null> {
    const contract = this.contracts.get(id);
    if (!contract || contract.status !== 'active') return null;

    const item = contract.items.find(i => i.id === itemId);
    if (item) {
      item.orderedQuantity += quantity;
    }

    contract.usedValue += value;
    contract.remainingValue = contract.totalValue - contract.usedValue;
    contract.updatedAt = new Date();
    this.contracts.set(id, contract);

    // Check if contract is near limit
    if (contract.remainingValue < contract.totalValue * 0.1) {
      this.eventEmitter.emit('procurement.contract_near_limit', { contract });
    }

    return contract;
  }

  async addContractDocument(
    id: string,
    document: Omit<ContractDocument, 'id' | 'uploadedAt'>
  ): Promise<ProcurementContract | null> {
    const contract = this.contracts.get(id);
    if (!contract) return null;

    contract.documents.push({
      ...document,
      id: `pcdoc_${Date.now()}`,
      uploadedAt: new Date(),
    });
    contract.updatedAt = new Date();
    this.contracts.set(id, contract);

    return contract;
  }

  // =================== SPEND ANALYSIS ===================

  async getSpendAnalysis(
    tenantId: string,
    from: Date,
    to: Date
  ): Promise<SpendAnalysis> {
    const items = await this.getItems(tenantId);

    // Aggregate spend from price history
    let totalSpend = 0;
    const categorySpends = new Map<ProcurementCategory, { amount: number; orders: number; items: Set<string> }>();
    const vendorSpends = new Map<string, { name: string; amount: number; orders: number }>();
    const monthlySpends = new Map<string, { amount: number; orders: number }>();
    const itemSpends = new Map<string, { code: string; name: string; spend: number; quantity: number; vendors: Set<string> }>();

    for (const item of items) {
      for (const history of item.pricing.priceHistory) {
        if (history.date >= from && history.date <= to) {
          const amount = history.price * history.quantity;
          totalSpend += amount;

          // By category
          const catStats = categorySpends.get(item.category) || { amount: 0, orders: 0, items: new Set() };
          catStats.amount += amount;
          catStats.orders++;
          catStats.items.add(item.id);
          categorySpends.set(item.category, catStats);

          // By vendor
          const vendorStats = vendorSpends.get(history.vendorId) || { name: history.vendorName, amount: 0, orders: 0 };
          vendorStats.amount += amount;
          vendorStats.orders++;
          vendorSpends.set(history.vendorId, vendorStats);

          // By month
          const monthKey = `${history.date.getFullYear()}-${String(history.date.getMonth() + 1).padStart(2, '0')}`;
          const monthStats = monthlySpends.get(monthKey) || { amount: 0, orders: 0 };
          monthStats.amount += amount;
          monthStats.orders++;
          monthlySpends.set(monthKey, monthStats);

          // By item
          const itemStats = itemSpends.get(item.id) || { code: item.code, name: item.name, spend: 0, quantity: 0, vendors: new Set() };
          itemStats.spend += amount;
          itemStats.quantity += history.quantity;
          itemStats.vendors.add(history.vendorId);
          itemSpends.set(item.id, itemStats);
        }
      }
    }

    const byCategory: CategorySpend[] = Array.from(categorySpends.entries()).map(([category, stats]) => ({
      category,
      amount: stats.amount,
      percentage: totalSpend > 0 ? (stats.amount / totalSpend) * 100 : 0,
      orderCount: stats.orders,
      itemCount: stats.items.size,
    })).sort((a, b) => b.amount - a.amount);

    const byVendor: VendorSpend[] = Array.from(vendorSpends.entries()).map(([vendorId, stats]) => ({
      vendorId,
      vendorName: stats.name,
      amount: stats.amount,
      percentage: totalSpend > 0 ? (stats.amount / totalSpend) * 100 : 0,
      orderCount: stats.orders,
      onTimeDeliveryRate: 95, // Would be calculated from delivery data
      qualityScore: 4.5, // Would be calculated from quality data
    })).sort((a, b) => b.amount - a.amount);

    const byMonth: MonthlySpend[] = Array.from(monthlySpends.entries()).map(([month, stats]) => ({
      month,
      amount: stats.amount,
      orderCount: stats.orders,
      avgOrderValue: stats.orders > 0 ? stats.amount / stats.orders : 0,
    })).sort((a, b) => a.month.localeCompare(b.month));

    const topItems: ItemSpend[] = Array.from(itemSpends.entries())
      .map(([itemId, stats]) => ({
        itemId,
        itemCode: stats.code,
        itemName: stats.name,
        totalSpend: stats.spend,
        quantity: stats.quantity,
        avgPrice: stats.quantity > 0 ? stats.spend / stats.quantity : 0,
        vendorCount: stats.vendors.size,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 10);

    return {
      tenantId,
      period: { from, to },
      totalSpend,
      byCategory,
      byVendor,
      byDepartment: [], // Would be populated from department data
      byMonth,
      topItems,
      savingsOpportunities: this.identifySavingsOpportunities(items, byVendor),
      complianceMetrics: await this.getComplianceMetrics(tenantId),
    };
  }

  private identifySavingsOpportunities(
    items: ProcurementItem[],
    vendorSpends: VendorSpend[]
  ): SavingsOpportunity[] {
    const opportunities: SavingsOpportunity[] = [];

    // Find consolidation opportunities (items with multiple vendors)
    const multiVendorItems = items.filter(i => i.preferredVendors.length > 2);
    if (multiVendorItems.length > 0) {
      opportunities.push({
        type: 'consolidation',
        description: `${multiVendorItems.length} items purchased from multiple vendors - consider consolidation`,
        estimatedSavings: multiVendorItems.length * 500, // Estimated
        itemIds: multiVendorItems.map(i => i.id),
        vendorIds: [],
        priority: 'medium',
      });
    }

    // Find negotiation opportunities (high spend vendors)
    const highSpendVendors = vendorSpends.filter(v => v.percentage > 10);
    for (const vendor of highSpendVendors) {
      opportunities.push({
        type: 'negotiation',
        description: `${vendor.vendorName} represents ${vendor.percentage.toFixed(1)}% of spend - volume discount opportunity`,
        estimatedSavings: vendor.amount * 0.05, // 5% potential savings
        itemIds: [],
        vendorIds: [vendor.vendorId],
        priority: 'high',
      });
    }

    return opportunities;
  }

  private async getComplianceMetrics(tenantId: string): Promise<ComplianceMetrics> {
    const contracts = await this.getContracts(tenantId, { status: 'active' });
    const catalogs = await this.getCatalogs(tenantId, { activeOnly: true });

    return {
      contractCoverage: contracts.length > 0 ? 75 : 0, // Would be calculated
      catalogCompliance: catalogs.length > 0 ? 85 : 0, // Would be calculated
      approvalCompliance: 95, // Would be calculated
      vendorDiversification: 3.5, // Would be calculated
      policyViolations: 0, // Would be calculated
    };
  }

  // =================== STATISTICS ===================

  async getStatistics(tenantId: string): Promise<{
    totalItems: number;
    activeItems: number;
    itemsBelowReorder: number;
    activeCatalogs: number;
    activeBudgets: number;
    budgetUtilization: number;
    activeContracts: number;
    expiringContracts: number;
    totalContractValue: number;
    categoryBreakdown: { category: string; count: number }[];
  }> {
    const items = await this.getItems(tenantId);
    const catalogs = await this.getCatalogs(tenantId, { activeOnly: true });
    const budgets = await this.getBudgets(tenantId, { status: 'active' });
    const contracts = await this.getContracts(tenantId, { status: 'active' });
    const expiringContracts = await this.getContracts(tenantId, { expiringWithinDays: 30 });

    const totalBudget = budgets.reduce((sum, b) => sum + b.totalBudget, 0);
    const spentBudget = budgets.reduce((sum, b) => sum + b.spentAmount, 0);

    const categoryBreakdown = Array.from(
      items.reduce((map, item) => {
        map.set(item.category, (map.get(item.category) || 0) + 1);
        return map;
      }, new Map<string, number>())
    ).map(([category, count]) => ({ category, count }));

    return {
      totalItems: items.length,
      activeItems: items.filter(i => i.status === 'active').length,
      itemsBelowReorder: items.filter(i => i.inventory.currentStock <= i.inventory.reorderPoint).length,
      activeCatalogs: catalogs.length,
      activeBudgets: budgets.length,
      budgetUtilization: totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0,
      activeContracts: contracts.length,
      expiringContracts: expiringContracts.length,
      totalContractValue: contracts.reduce((sum, c) => sum + c.totalValue, 0),
      categoryBreakdown,
    };
  }
}
