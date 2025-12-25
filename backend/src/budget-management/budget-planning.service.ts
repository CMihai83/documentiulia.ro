import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type BudgetType = 'operating' | 'capital' | 'project' | 'departmental' | 'revenue' | 'cash_flow' | 'master';
export type BudgetPeriodType = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'multi_year';
export type BudgetStatus = 'draft' | 'pending_review' | 'pending_approval' | 'approved' | 'active' | 'closed' | 'rejected';
export type BudgetMethodology = 'incremental' | 'zero_based' | 'activity_based' | 'value_proposition' | 'rolling';

export interface Budget {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: BudgetType;
  methodology: BudgetMethodology;
  fiscalYear: string;
  periodType: BudgetPeriodType;
  startDate: Date;
  endDate: Date;
  currency: string;
  totalAmount: number;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  departmentId?: string;
  departmentName?: string;
  projectId?: string;
  projectName?: string;
  costCenterId?: string;
  costCenterName?: string;
  parentBudgetId?: string;
  parentBudgetName?: string;
  version: number;
  previousVersionId?: string;
  status: BudgetStatus;
  tags?: string[];
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetLineItem {
  id: string;
  budgetId: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  accountCode?: string;
  description?: string;
  plannedAmount: number;
  allocatedAmount: number;
  spentAmount: number;
  committedAmount: number;
  remainingAmount: number;
  periodBreakdown: Array<{
    period: string;
    plannedAmount: number;
    allocatedAmount: number;
    spentAmount: number;
  }>;
  notes?: string;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetCategory {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  type: 'expense' | 'revenue' | 'capital';
  glAccountCode?: string;
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
}

export interface BudgetTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: BudgetType;
  methodology: BudgetMethodology;
  periodType: BudgetPeriodType;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    defaultAmount?: number;
    percentOfTotal?: number;
  }>;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface BudgetScenario {
  id: string;
  budgetId: string;
  name: string;
  description?: string;
  type: 'best_case' | 'worst_case' | 'most_likely' | 'custom';
  adjustmentPercentage?: number;
  lineItems: Array<{
    lineItemId: string;
    adjustedAmount: number;
  }>;
  totalAmount: number;
  createdBy: string;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class BudgetPlanningService {
  private budgets: Map<string, Budget> = new Map();
  private lineItems: Map<string, BudgetLineItem> = new Map();
  private categories: Map<string, BudgetCategory> = new Map();
  private templates: Map<string, BudgetTemplate> = new Map();
  private scenarios: Map<string, BudgetScenario> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample categories
    const expenseCategories = [
      { name: 'Salaries & Wages', code: 'SAL', type: 'expense' as const },
      { name: 'Benefits & Insurance', code: 'BEN', type: 'expense' as const },
      { name: 'Office Supplies', code: 'OFF', type: 'expense' as const },
      { name: 'Utilities', code: 'UTL', type: 'expense' as const },
      { name: 'Rent & Lease', code: 'RNT', type: 'expense' as const },
      { name: 'Marketing & Advertising', code: 'MKT', type: 'expense' as const },
      { name: 'Travel & Entertainment', code: 'TRV', type: 'expense' as const },
      { name: 'Professional Services', code: 'PRO', type: 'expense' as const },
      { name: 'Software & Subscriptions', code: 'SFT', type: 'expense' as const },
      { name: 'Maintenance & Repairs', code: 'MNT', type: 'expense' as const },
    ];

    const revenueCategories = [
      { name: 'Product Sales', code: 'PSL', type: 'revenue' as const },
      { name: 'Service Revenue', code: 'SRV', type: 'revenue' as const },
      { name: 'Subscription Revenue', code: 'SUB', type: 'revenue' as const },
      { name: 'Consulting Fees', code: 'CNS', type: 'revenue' as const },
      { name: 'Other Income', code: 'OTH', type: 'revenue' as const },
    ];

    const capitalCategories = [
      { name: 'Equipment Purchase', code: 'EQP', type: 'capital' as const },
      { name: 'Vehicle Purchase', code: 'VEH', type: 'capital' as const },
      { name: 'IT Infrastructure', code: 'ITI', type: 'capital' as const },
      { name: 'Facility Improvements', code: 'FAC', type: 'capital' as const },
    ];

    [...expenseCategories, ...revenueCategories, ...capitalCategories].forEach((cat, index) => {
      const id = `cat-${Date.now()}-${cat.code}`;
      this.categories.set(id, {
        id,
        tenantId: 'system',
        name: cat.name,
        code: cat.code,
        type: cat.type,
        isActive: true,
        sortOrder: index,
        createdAt: new Date(),
      });
    });
  }

  // =================== BUDGET CRUD ===================

  async createBudget(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: BudgetType;
    methodology?: BudgetMethodology;
    fiscalYear: string;
    periodType?: BudgetPeriodType;
    startDate: Date;
    endDate: Date;
    currency?: string;
    totalAmount: number;
    departmentId?: string;
    departmentName?: string;
    projectId?: string;
    projectName?: string;
    costCenterId?: string;
    costCenterName?: string;
    parentBudgetId?: string;
    tags?: string[];
    notes?: string;
    createdBy: string;
    createdByName?: string;
  }): Promise<Budget> {
    const id = `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    let parentBudgetName: string | undefined;
    if (data.parentBudgetId) {
      const parent = this.budgets.get(data.parentBudgetId);
      parentBudgetName = parent?.name;
    }

    const budget: Budget = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      methodology: data.methodology || 'incremental',
      fiscalYear: data.fiscalYear,
      periodType: data.periodType || 'annual',
      startDate: data.startDate,
      endDate: data.endDate,
      currency: data.currency || 'RON',
      totalAmount: data.totalAmount,
      allocatedAmount: 0,
      spentAmount: 0,
      remainingAmount: data.totalAmount,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      projectId: data.projectId,
      projectName: data.projectName,
      costCenterId: data.costCenterId,
      costCenterName: data.costCenterName,
      parentBudgetId: data.parentBudgetId,
      parentBudgetName,
      version: 1,
      status: 'draft',
      tags: data.tags,
      notes: data.notes,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
    };

    this.budgets.set(id, budget);

    this.eventEmitter.emit('budget.created', { budget });

    return budget;
  }

  async getBudget(id: string): Promise<Budget | null> {
    return this.budgets.get(id) || null;
  }

  async getBudgets(
    tenantId: string,
    filters?: {
      type?: BudgetType;
      status?: BudgetStatus;
      fiscalYear?: string;
      departmentId?: string;
      projectId?: string;
      costCenterId?: string;
      parentBudgetId?: string;
      search?: string;
      limit?: number;
    },
  ): Promise<{ budgets: Budget[]; total: number }> {
    let budgets = Array.from(this.budgets.values()).filter(
      (b) => b.tenantId === tenantId,
    );

    if (filters?.type) {
      budgets = budgets.filter((b) => b.type === filters.type);
    }

    if (filters?.status) {
      budgets = budgets.filter((b) => b.status === filters.status);
    }

    if (filters?.fiscalYear) {
      budgets = budgets.filter((b) => b.fiscalYear === filters.fiscalYear);
    }

    if (filters?.departmentId) {
      budgets = budgets.filter((b) => b.departmentId === filters.departmentId);
    }

    if (filters?.projectId) {
      budgets = budgets.filter((b) => b.projectId === filters.projectId);
    }

    if (filters?.costCenterId) {
      budgets = budgets.filter((b) => b.costCenterId === filters.costCenterId);
    }

    if (filters?.parentBudgetId) {
      budgets = budgets.filter((b) => b.parentBudgetId === filters.parentBudgetId);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      budgets = budgets.filter(
        (b) =>
          b.name.toLowerCase().includes(search) ||
          b.description?.toLowerCase().includes(search),
      );
    }

    const total = budgets.length;

    budgets = budgets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      budgets = budgets.slice(0, filters.limit);
    }

    return { budgets, total };
  }

  async updateBudget(
    id: string,
    data: Partial<Budget>,
  ): Promise<Budget | null> {
    const budget = this.budgets.get(id);
    if (!budget) return null;

    // Only allow updates in draft or pending status
    if (!['draft', 'pending_review'].includes(budget.status)) {
      throw new Error('Cannot update budget in current status');
    }

    const updated: Budget = {
      ...budget,
      ...data,
      id: budget.id,
      tenantId: budget.tenantId,
      version: budget.version,
      createdBy: budget.createdBy,
      createdAt: budget.createdAt,
      updatedAt: new Date(),
    };

    // Recalculate remaining
    updated.remainingAmount = updated.totalAmount - updated.allocatedAmount;

    this.budgets.set(id, updated);

    this.eventEmitter.emit('budget.updated', { budget: updated });

    return updated;
  }

  async deleteBudget(id: string): Promise<boolean> {
    const budget = this.budgets.get(id);
    if (!budget || budget.status !== 'draft') {
      return false;
    }

    // Delete associated line items
    for (const [lineId, lineItem] of this.lineItems) {
      if (lineItem.budgetId === id) {
        this.lineItems.delete(lineId);
      }
    }

    this.budgets.delete(id);

    this.eventEmitter.emit('budget.deleted', { budgetId: id });

    return true;
  }

  async submitForApproval(id: string, submittedBy: string): Promise<Budget | null> {
    const budget = this.budgets.get(id);
    if (!budget || !['draft', 'pending_review'].includes(budget.status)) {
      return null;
    }

    budget.status = 'pending_approval';
    budget.updatedAt = new Date();
    this.budgets.set(id, budget);

    this.eventEmitter.emit('budget.submitted_for_approval', { budget, submittedBy });

    return budget;
  }

  async approveBudget(id: string, approvedBy: string, approvedByName: string): Promise<Budget | null> {
    const budget = this.budgets.get(id);
    if (!budget || budget.status !== 'pending_approval') {
      return null;
    }

    budget.status = 'approved';
    budget.updatedAt = new Date();
    this.budgets.set(id, budget);

    this.eventEmitter.emit('budget.approved', { budget, approvedBy, approvedByName });

    return budget;
  }

  async rejectBudget(id: string, rejectedBy: string, rejectedByName: string): Promise<Budget | null> {
    const budget = this.budgets.get(id);
    if (!budget || budget.status !== 'pending_approval') {
      return null;
    }

    budget.status = 'rejected';
    budget.updatedAt = new Date();
    this.budgets.set(id, budget);

    this.eventEmitter.emit('budget.rejected', { budget, rejectedBy, rejectedByName });

    return budget;
  }

  async activateBudget(id: string): Promise<Budget | null> {
    const budget = this.budgets.get(id);
    if (!budget || budget.status !== 'approved') {
      return null;
    }

    budget.status = 'active';
    budget.updatedAt = new Date();
    this.budgets.set(id, budget);

    this.eventEmitter.emit('budget.activated', { budget });

    return budget;
  }

  // =================== BUDGET LINE ITEMS ===================

  async addLineItem(data: {
    budgetId: string;
    categoryId: string;
    categoryName: string;
    subcategoryId?: string;
    subcategoryName?: string;
    accountCode?: string;
    description?: string;
    plannedAmount: number;
    periodBreakdown?: Array<{ period: string; plannedAmount: number }>;
    notes?: string;
  }): Promise<BudgetLineItem> {
    const budget = this.budgets.get(data.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const id = `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    // Generate period breakdown if not provided
    let periodBreakdown = data.periodBreakdown || [];
    if (periodBreakdown.length === 0) {
      periodBreakdown = this.generatePeriodBreakdown(
        budget.startDate,
        budget.endDate,
        budget.periodType,
        data.plannedAmount,
      );
    }

    const lineItem: BudgetLineItem = {
      id,
      budgetId: data.budgetId,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      subcategoryId: data.subcategoryId,
      subcategoryName: data.subcategoryName,
      accountCode: data.accountCode,
      description: data.description,
      plannedAmount: data.plannedAmount,
      allocatedAmount: 0,
      spentAmount: 0,
      committedAmount: 0,
      remainingAmount: data.plannedAmount,
      periodBreakdown: periodBreakdown.map((p) => ({
        ...p,
        allocatedAmount: 0,
        spentAmount: 0,
      })),
      notes: data.notes,
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    };

    this.lineItems.set(id, lineItem);

    // Update budget allocated amount
    budget.allocatedAmount += data.plannedAmount;
    budget.remainingAmount = budget.totalAmount - budget.allocatedAmount;
    budget.updatedAt = now;
    this.budgets.set(budget.id, budget);

    this.eventEmitter.emit('budget.line_item_added', { lineItem, budget });

    return lineItem;
  }

  async getLineItems(budgetId: string): Promise<BudgetLineItem[]> {
    return Array.from(this.lineItems.values())
      .filter((l) => l.budgetId === budgetId)
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }

  async updateLineItem(
    id: string,
    data: Partial<BudgetLineItem>,
  ): Promise<BudgetLineItem | null> {
    const lineItem = this.lineItems.get(id);
    if (!lineItem) return null;

    if (lineItem.isLocked) {
      throw new Error('Line item is locked and cannot be modified');
    }

    const previousAmount = lineItem.plannedAmount;
    const updated: BudgetLineItem = {
      ...lineItem,
      ...data,
      id: lineItem.id,
      budgetId: lineItem.budgetId,
      createdAt: lineItem.createdAt,
      updatedAt: new Date(),
    };

    // Recalculate remaining
    updated.remainingAmount = updated.plannedAmount - updated.spentAmount - updated.committedAmount;

    this.lineItems.set(id, updated);

    // Update budget if planned amount changed
    if (data.plannedAmount !== undefined && data.plannedAmount !== previousAmount) {
      const budget = this.budgets.get(lineItem.budgetId);
      if (budget) {
        budget.allocatedAmount += (data.plannedAmount - previousAmount);
        budget.remainingAmount = budget.totalAmount - budget.allocatedAmount;
        budget.updatedAt = new Date();
        this.budgets.set(budget.id, budget);
      }
    }

    return updated;
  }

  async deleteLineItem(id: string): Promise<boolean> {
    const lineItem = this.lineItems.get(id);
    if (!lineItem) return false;

    if (lineItem.isLocked || lineItem.spentAmount > 0) {
      throw new Error('Cannot delete line item with spending or locked status');
    }

    // Update budget
    const budget = this.budgets.get(lineItem.budgetId);
    if (budget) {
      budget.allocatedAmount -= lineItem.plannedAmount;
      budget.remainingAmount = budget.totalAmount - budget.allocatedAmount;
      budget.updatedAt = new Date();
      this.budgets.set(budget.id, budget);
    }

    this.lineItems.delete(id);

    return true;
  }

  private generatePeriodBreakdown(
    startDate: Date,
    endDate: Date,
    periodType: BudgetPeriodType,
    totalAmount: number,
  ): Array<{ period: string; plannedAmount: number }> {
    const periods: Array<{ period: string; plannedAmount: number }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let periodCount = 0;
    const current = new Date(start);

    while (current <= end) {
      let periodLabel: string;

      switch (periodType) {
        case 'monthly':
          periodLabel = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          current.setMonth(current.getMonth() + 1);
          break;
        case 'quarterly':
          const quarter = Math.floor(current.getMonth() / 3) + 1;
          periodLabel = `${current.getFullYear()}-Q${quarter}`;
          current.setMonth(current.getMonth() + 3);
          break;
        case 'semi_annual':
          const half = current.getMonth() < 6 ? 'H1' : 'H2';
          periodLabel = `${current.getFullYear()}-${half}`;
          current.setMonth(current.getMonth() + 6);
          break;
        case 'annual':
        default:
          periodLabel = String(current.getFullYear());
          current.setFullYear(current.getFullYear() + 1);
          break;
      }

      periods.push({ period: periodLabel, plannedAmount: 0 });
      periodCount++;
    }

    // Distribute amount evenly
    const amountPerPeriod = Math.floor(totalAmount / periodCount);
    const remainder = totalAmount - (amountPerPeriod * periodCount);

    periods.forEach((p, index) => {
      p.plannedAmount = amountPerPeriod + (index === 0 ? remainder : 0);
    });

    return periods;
  }

  // =================== CATEGORIES ===================

  async createCategory(data: {
    tenantId: string;
    name: string;
    code: string;
    description?: string;
    parentId?: string;
    type: 'expense' | 'revenue' | 'capital';
    glAccountCode?: string;
    sortOrder?: number;
  }): Promise<BudgetCategory> {
    const id = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let parentName: string | undefined;
    if (data.parentId) {
      const parent = this.categories.get(data.parentId);
      parentName = parent?.name;
    }

    const category: BudgetCategory = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      code: data.code,
      description: data.description,
      parentId: data.parentId,
      parentName,
      type: data.type,
      glAccountCode: data.glAccountCode,
      isActive: true,
      sortOrder: data.sortOrder,
      createdAt: new Date(),
    };

    this.categories.set(id, category);

    return category;
  }

  async getCategories(
    tenantId: string,
    filters?: {
      type?: 'expense' | 'revenue' | 'capital';
      parentId?: string;
      isActive?: boolean;
    },
  ): Promise<BudgetCategory[]> {
    let categories = Array.from(this.categories.values()).filter(
      (c) => c.tenantId === tenantId || c.tenantId === 'system',
    );

    if (filters?.type) {
      categories = categories.filter((c) => c.type === filters.type);
    }

    if (filters?.parentId !== undefined) {
      categories = categories.filter((c) => c.parentId === filters.parentId);
    }

    if (filters?.isActive !== undefined) {
      categories = categories.filter((c) => c.isActive === filters.isActive);
    }

    return categories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  // =================== TEMPLATES ===================

  async createTemplate(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: BudgetType;
    methodology?: BudgetMethodology;
    periodType?: BudgetPeriodType;
    categories: Array<{
      categoryId: string;
      categoryName: string;
      defaultAmount?: number;
      percentOfTotal?: number;
    }>;
    createdBy: string;
  }): Promise<BudgetTemplate> {
    const id = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const template: BudgetTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      methodology: data.methodology || 'incremental',
      periodType: data.periodType || 'annual',
      categories: data.categories,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.templates.set(id, template);

    return template;
  }

  async getTemplates(tenantId: string): Promise<BudgetTemplate[]> {
    return Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId && t.isActive,
    );
  }

  async createBudgetFromTemplate(
    templateId: string,
    data: {
      tenantId: string;
      name: string;
      fiscalYear: string;
      startDate: Date;
      endDate: Date;
      totalAmount: number;
      createdBy: string;
      createdByName?: string;
    },
  ): Promise<Budget> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create budget
    const budget = await this.createBudget({
      tenantId: data.tenantId,
      name: data.name,
      type: template.type,
      methodology: template.methodology,
      fiscalYear: data.fiscalYear,
      periodType: template.periodType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalAmount: data.totalAmount,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
    });

    // Add line items based on template categories
    for (const cat of template.categories) {
      let amount = cat.defaultAmount || 0;
      if (cat.percentOfTotal) {
        amount = Math.round((data.totalAmount * cat.percentOfTotal) / 100);
      }

      if (amount > 0) {
        await this.addLineItem({
          budgetId: budget.id,
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          plannedAmount: amount,
        });
      }
    }

    return budget;
  }

  // =================== SCENARIOS ===================

  async createScenario(data: {
    budgetId: string;
    name: string;
    description?: string;
    type: BudgetScenario['type'];
    adjustmentPercentage?: number;
    createdBy: string;
  }): Promise<BudgetScenario> {
    const budget = this.budgets.get(data.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const id = `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const lineItems = await this.getLineItems(data.budgetId);

    // Apply adjustment
    const adjustment = data.adjustmentPercentage || this.getDefaultAdjustment(data.type);
    const adjustedLineItems = lineItems.map((li) => ({
      lineItemId: li.id,
      adjustedAmount: Math.round(li.plannedAmount * (1 + adjustment / 100)),
    }));

    const scenario: BudgetScenario = {
      id,
      budgetId: data.budgetId,
      name: data.name,
      description: data.description,
      type: data.type,
      adjustmentPercentage: adjustment,
      lineItems: adjustedLineItems,
      totalAmount: adjustedLineItems.reduce((sum, li) => sum + li.adjustedAmount, 0),
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.scenarios.set(id, scenario);

    return scenario;
  }

  private getDefaultAdjustment(type: BudgetScenario['type']): number {
    switch (type) {
      case 'best_case':
        return -10;
      case 'worst_case':
        return 20;
      case 'most_likely':
        return 5;
      default:
        return 0;
    }
  }

  async getScenarios(budgetId: string): Promise<BudgetScenario[]> {
    return Array.from(this.scenarios.values())
      .filter((s) => s.budgetId === budgetId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async compareScenarios(
    budgetId: string,
  ): Promise<{
    baseline: { totalAmount: number; lineItems: BudgetLineItem[] };
    scenarios: Array<{
      scenario: BudgetScenario;
      difference: number;
      percentDifference: number;
    }>;
  }> {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const lineItems = await this.getLineItems(budgetId);
    const scenarios = await this.getScenarios(budgetId);

    const baseline = {
      totalAmount: budget.allocatedAmount,
      lineItems,
    };

    const comparedScenarios = scenarios.map((scenario) => ({
      scenario,
      difference: scenario.totalAmount - baseline.totalAmount,
      percentDifference: baseline.totalAmount > 0
        ? Math.round(((scenario.totalAmount - baseline.totalAmount) / baseline.totalAmount) * 100 * 100) / 100
        : 0,
    }));

    return { baseline, scenarios: comparedScenarios };
  }

  // =================== VERSION CONTROL ===================

  async createNewVersion(budgetId: string, createdBy: string): Promise<Budget> {
    const original = this.budgets.get(budgetId);
    if (!original) {
      throw new Error('Budget not found');
    }

    const id = `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newVersion: Budget = {
      ...original,
      id,
      version: original.version + 1,
      previousVersionId: original.id,
      status: 'draft',
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.budgets.set(id, newVersion);

    // Copy line items
    const lineItems = await this.getLineItems(budgetId);
    for (const lineItem of lineItems) {
      await this.addLineItem({
        budgetId: id,
        categoryId: lineItem.categoryId,
        categoryName: lineItem.categoryName,
        subcategoryId: lineItem.subcategoryId,
        subcategoryName: lineItem.subcategoryName,
        accountCode: lineItem.accountCode,
        description: lineItem.description,
        plannedAmount: lineItem.plannedAmount,
        periodBreakdown: lineItem.periodBreakdown.map((p) => ({
          period: p.period,
          plannedAmount: p.plannedAmount,
        })),
        notes: lineItem.notes,
      });
    }

    this.eventEmitter.emit('budget.version_created', { budget: newVersion, originalId: budgetId });

    return newVersion;
  }

  async getVersionHistory(budgetId: string): Promise<Budget[]> {
    const versions: Budget[] = [];
    let currentId: string | undefined = budgetId;

    while (currentId) {
      const budget = this.budgets.get(currentId);
      if (budget) {
        versions.push(budget);
        currentId = budget.previousVersionId;
      } else {
        break;
      }
    }

    return versions;
  }

  // =================== STATISTICS ===================

  async getBudgetStatistics(tenantId: string): Promise<{
    totalBudgets: number;
    byStatus: Record<BudgetStatus, number>;
    byType: Record<BudgetType, number>;
    totalPlanned: number;
    totalAllocated: number;
    totalSpent: number;
    utilizationRate: number;
    activeBudgets: number;
  }> {
    const budgets = Array.from(this.budgets.values()).filter(
      (b) => b.tenantId === tenantId,
    );

    const byStatus: Record<BudgetStatus, number> = {
      draft: 0,
      pending_review: 0,
      pending_approval: 0,
      approved: 0,
      active: 0,
      closed: 0,
      rejected: 0,
    };

    const byType: Record<BudgetType, number> = {
      operating: 0,
      capital: 0,
      project: 0,
      departmental: 0,
      revenue: 0,
      cash_flow: 0,
      master: 0,
    };

    let totalPlanned = 0;
    let totalAllocated = 0;
    let totalSpent = 0;

    for (const budget of budgets) {
      byStatus[budget.status]++;
      byType[budget.type]++;
      totalPlanned += budget.totalAmount;
      totalAllocated += budget.allocatedAmount;
      totalSpent += budget.spentAmount;
    }

    return {
      totalBudgets: budgets.length,
      byStatus,
      byType,
      totalPlanned,
      totalAllocated,
      totalSpent,
      utilizationRate: totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0,
      activeBudgets: byStatus.active + byStatus.approved,
    };
  }
}
