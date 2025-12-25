import { Injectable, Logger } from '@nestjs/common';

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  description?: string;
  taxDeductible: boolean;
  defaultVatRate: number;
  accountCode?: string;
  active: boolean;
}

export interface Expense {
  id: string;
  tenantId: string;
  employeeId?: string;
  employeeName?: string;
  categoryId: string;
  categoryName: string;
  description: string;
  amount: number;
  currency: string;
  vatAmount: number;
  vatRate: number;
  totalAmount: number;
  expenseDate: Date;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
  receiptUrl?: string;
  receiptNumber?: string;
  vendorName?: string;
  vendorCui?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'reimbursed';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseReport {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description?: string;
  expenses: string[];
  totalAmount: number;
  currency: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpensePolicy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  categoryId?: string;
  maxAmount?: number;
  requiresReceipt: boolean;
  requiresApproval: boolean;
  approvalThreshold: number;
  autoApproveBelow?: number;
  allowedPaymentMethods: string[];
  active: boolean;
}

export interface ExpenseAnalytics {
  totalExpenses: number;
  totalAmount: number;
  pendingApproval: number;
  pendingAmount: number;
  byCategory: Array<{ category: string; count: number; amount: number }>;
  byEmployee: Array<{ employee: string; count: number; amount: number }>;
  byMonth: Array<{ month: string; count: number; amount: number }>;
  averageExpense: number;
  topVendors: Array<{ vendor: string; count: number; amount: number }>;
}

// Approval Workflow Types
export interface ApprovalWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  levels: ApprovalLevel[];
  autoApproveRules: AutoApproveRule[];
  escalationRules: EscalationRule[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalLevel {
  level: number;
  name: string;
  approverType: 'manager' | 'department_head' | 'finance' | 'ceo' | 'specific' | 'any';
  approverId?: string;
  approverName?: string;
  amountThreshold?: number;
  categoryIds?: string[];
  timeoutHours?: number;
}

export interface AutoApproveRule {
  id: string;
  type: 'amount_below' | 'category' | 'vendor' | 'employee_level';
  threshold?: number;
  categoryIds?: string[];
  vendorCuis?: string[];
  employeeLevels?: string[];
  description: string;
}

export interface EscalationRule {
  id: string;
  triggerAfterHours: number;
  escalateTo: string;
  notifySubmitter: boolean;
  notifyCurrentApprover: boolean;
}

export interface ApprovalDelegation {
  id: string;
  delegatorId: string;
  delegateeId: string;
  delegateeName: string;
  startDate: Date;
  endDate: Date;
  reason?: string;
  tenantId: string;
  active: boolean;
  createdAt: Date;
}

export interface ApprovalHistoryEntry {
  id: string;
  expenseId: string;
  action: 'submitted' | 'approved' | 'rejected' | 'changes_requested' | 'auto_approved' | 'escalated';
  approverId: string;
  level: number;
  comment?: string;
  timestamp: Date;
}

export interface ApproverInfo {
  id: string;
  name: string;
  type: string;
  level: number;
}

@Injectable()
export class ExpenseManagementService {
  private readonly logger = new Logger(ExpenseManagementService.name);
  private categories: ExpenseCategory[] = [];
  private expenses: Expense[] = [];
  private reports: ExpenseReport[] = [];
  private policies: ExpensePolicy[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Default expense categories
    this.categories = [
      { id: 'cat-001', name: 'Transport', code: 'TRN', description: 'Travel and transportation expenses', taxDeductible: true, defaultVatRate: 19, accountCode: '6241', active: true },
      { id: 'cat-002', name: 'Cazare', code: 'CAZ', description: 'Accommodation expenses', taxDeductible: true, defaultVatRate: 9, accountCode: '6242', active: true },
      { id: 'cat-003', name: 'Masă', code: 'MAS', description: 'Food and meals', taxDeductible: true, defaultVatRate: 9, accountCode: '6243', active: true },
      { id: 'cat-004', name: 'Materiale birou', code: 'MAT', description: 'Office supplies', taxDeductible: true, defaultVatRate: 19, accountCode: '6031', active: true },
      { id: 'cat-005', name: 'Software/Licențe', code: 'SFT', description: 'Software and licenses', taxDeductible: true, defaultVatRate: 19, accountCode: '6063', active: true },
      { id: 'cat-006', name: 'Telefonie/Internet', code: 'TEL', description: 'Phone and internet', taxDeductible: true, defaultVatRate: 19, accountCode: '6261', active: true },
      { id: 'cat-007', name: 'Combustibil', code: 'CMB', description: 'Fuel expenses', taxDeductible: true, defaultVatRate: 19, accountCode: '6022', active: true },
      { id: 'cat-008', name: 'Training', code: 'TRG', description: 'Training and education', taxDeductible: true, defaultVatRate: 19, accountCode: '6265', active: true },
      { id: 'cat-009', name: 'Marketing', code: 'MKT', description: 'Marketing and advertising', taxDeductible: true, defaultVatRate: 19, accountCode: '6231', active: true },
      { id: 'cat-010', name: 'Altele', code: 'ALT', description: 'Other expenses', taxDeductible: false, defaultVatRate: 19, accountCode: '6588', active: true },
    ];

    // Generate mock expenses
    this.generateMockExpenses();

    // Generate mock reports
    this.generateMockReports();

    // Default expense policies
    this.policies = [
      {
        id: 'pol-001',
        tenantId: 'tenant-001',
        name: 'Politică standard cheltuieli',
        description: 'Politica implicită pentru cheltuieli',
        requiresReceipt: true,
        requiresApproval: true,
        approvalThreshold: 500,
        autoApproveBelow: 100,
        allowedPaymentMethods: ['cash', 'card', 'bank_transfer'],
        active: true,
      },
      {
        id: 'pol-002',
        tenantId: 'tenant-001',
        name: 'Deplasări',
        description: 'Politica pentru cheltuieli de deplasare',
        categoryId: 'cat-001',
        maxAmount: 5000,
        requiresReceipt: true,
        requiresApproval: true,
        approvalThreshold: 1000,
        autoApproveBelow: 200,
        allowedPaymentMethods: ['card', 'bank_transfer'],
        active: true,
      },
    ];
  }

  private generateMockExpenses() {
    const employees = [
      { id: 'emp-001', name: 'Ion Popescu' },
      { id: 'emp-002', name: 'Maria Ionescu' },
      { id: 'emp-003', name: 'Andrei Popa' },
    ];
    const vendors = ['OMV', 'Petrom', 'Hotel Marriott', 'Restaurant Central', 'Amazon', 'Orange', 'Emag', 'Altex'];
    const statuses: Array<Expense['status']> = ['draft', 'submitted', 'approved', 'paid'];
    const paymentMethods: Array<Expense['paymentMethod']> = ['cash', 'card', 'bank_transfer'];

    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 90);
      const category = this.categories[Math.floor(Math.random() * this.categories.length)];
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const amount = Math.round((Math.random() * 2000 + 50) * 100) / 100;
      const vatRate = category.defaultVatRate;
      const vatAmount = Math.round(amount * vatRate / 100 * 100) / 100;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      this.expenses.push({
        id: `exp-${String(i).padStart(4, '0')}`,
        tenantId: 'tenant-001',
        employeeId: employee.id,
        employeeName: employee.name,
        categoryId: category.id,
        categoryName: category.name,
        description: `Cheltuială ${category.name.toLowerCase()} - ${vendors[Math.floor(Math.random() * vendors.length)]}`,
        amount,
        currency: 'RON',
        vatAmount,
        vatRate,
        totalAmount: amount + vatAmount,
        expenseDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        receiptUrl: Math.random() > 0.2 ? `/receipts/receipt-${i}.pdf` : undefined,
        receiptNumber: Math.random() > 0.3 ? `RCP-${Date.now()}-${i}` : undefined,
        vendorName: vendors[Math.floor(Math.random() * vendors.length)],
        vendorCui: Math.random() > 0.5 ? `RO${Math.floor(Math.random() * 90000000) + 10000000}` : undefined,
        status,
        approvedBy: status === 'approved' || status === 'paid' ? 'manager-001' : undefined,
        approvedAt: status === 'approved' || status === 'paid' ? new Date(Date.now() - (daysAgo - 2) * 24 * 60 * 60 * 1000) : undefined,
        tags: [],
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000),
      });
    }
  }

  private generateMockReports() {
    const employees = [
      { id: 'emp-001', name: 'Ion Popescu' },
      { id: 'emp-002', name: 'Maria Ionescu' },
    ];
    const statuses: Array<ExpenseReport['status']> = ['draft', 'submitted', 'approved', 'paid'];

    for (let i = 0; i < 10; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const employeeExpenses = this.expenses.filter(e => e.employeeId === employee.id).slice(0, Math.floor(Math.random() * 5) + 1);
      const totalAmount = employeeExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

      this.reports.push({
        id: `rep-${String(i).padStart(4, '0')}`,
        tenantId: 'tenant-001',
        employeeId: employee.id,
        employeeName: employee.name,
        title: `Raport cheltuieli ${new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}`,
        description: 'Raport lunar de cheltuieli profesionale',
        expenses: employeeExpenses.map(e => e.id),
        totalAmount,
        currency: 'RON',
        status,
        submittedAt: status !== 'draft' ? new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000) : undefined,
        approvedBy: status === 'approved' || status === 'paid' ? 'manager-001' : undefined,
        approvedAt: status === 'approved' || status === 'paid' ? new Date(Date.now() - (daysAgo - 3) * 24 * 60 * 60 * 1000) : undefined,
        paidAt: status === 'paid' ? new Date(Date.now() - (daysAgo - 5) * 24 * 60 * 60 * 1000) : undefined,
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000),
      });
    }
  }

  // Dashboard
  async getDashboard(): Promise<{
    summary: {
      totalExpenses: number;
      totalAmount: number;
      pendingApproval: number;
      pendingAmount: number;
      thisMonth: number;
      thisMonthAmount: number;
    };
    recentExpenses: Expense[];
    pendingReports: ExpenseReport[];
    topCategories: Array<{ category: string; amount: number; percentage: number }>;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonthExpenses = this.expenses.filter(e => e.expenseDate >= startOfMonth);
    const pendingExpenses = this.expenses.filter(e => e.status === 'submitted');
    const totalAmount = this.expenses.reduce((sum, e) => sum + e.totalAmount, 0);

    const categoryTotals = this.expenses.reduce((acc, e) => {
      acc[e.categoryName] = (acc[e.categoryName] || 0) + e.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / totalAmount) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      summary: {
        totalExpenses: this.expenses.length,
        totalAmount,
        pendingApproval: pendingExpenses.length,
        pendingAmount: pendingExpenses.reduce((sum, e) => sum + e.totalAmount, 0),
        thisMonth: thisMonthExpenses.length,
        thisMonthAmount: thisMonthExpenses.reduce((sum, e) => sum + e.totalAmount, 0),
      },
      recentExpenses: this.expenses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 10),
      pendingReports: this.reports.filter(r => r.status === 'submitted'),
      topCategories,
    };
  }

  // Categories
  async getCategories(activeOnly = false): Promise<ExpenseCategory[]> {
    if (activeOnly) {
      return this.categories.filter(c => c.active);
    }
    return this.categories;
  }

  async getCategoryById(id: string): Promise<ExpenseCategory | undefined> {
    return this.categories.find(c => c.id === id);
  }

  async createCategory(data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const category: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      name: data.name || '',
      code: data.code || '',
      parentId: data.parentId,
      description: data.description,
      taxDeductible: data.taxDeductible ?? true,
      defaultVatRate: data.defaultVatRate ?? 19,
      accountCode: data.accountCode,
      active: data.active ?? true,
    };
    this.categories.push(category);
    return category;
  }

  async updateCategory(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory | undefined> {
    const category = this.categories.find(c => c.id === id);
    if (!category) return undefined;
    Object.assign(category, data);
    return category;
  }

  // Expenses
  async getExpenses(
    tenantId?: string,
    employeeId?: string,
    categoryId?: string,
    status?: string,
    startDate?: Date,
    endDate?: Date,
    limit = 50,
    offset = 0,
  ): Promise<{ expenses: Expense[]; total: number }> {
    let filtered = [...this.expenses];

    if (tenantId) filtered = filtered.filter(e => e.tenantId === tenantId);
    if (employeeId) filtered = filtered.filter(e => e.employeeId === employeeId);
    if (categoryId) filtered = filtered.filter(e => e.categoryId === categoryId);
    if (status) filtered = filtered.filter(e => e.status === status);
    if (startDate) filtered = filtered.filter(e => e.expenseDate >= startDate);
    if (endDate) filtered = filtered.filter(e => e.expenseDate <= endDate);

    filtered.sort((a, b) => b.expenseDate.getTime() - a.expenseDate.getTime());

    return {
      expenses: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  async getExpenseById(id: string): Promise<Expense | undefined> {
    return this.expenses.find(e => e.id === id);
  }

  async createExpense(data: Partial<Expense>): Promise<Expense> {
    const category = this.categories.find(c => c.id === data.categoryId);
    const amount = data.amount || 0;
    const vatRate = data.vatRate ?? category?.defaultVatRate ?? 19;
    const vatAmount = Math.round(amount * vatRate / 100 * 100) / 100;

    const expense: Expense = {
      id: `exp-${Date.now()}`,
      tenantId: data.tenantId || 'tenant-001',
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      categoryId: data.categoryId || '',
      categoryName: category?.name || '',
      description: data.description || '',
      amount,
      currency: data.currency || 'RON',
      vatAmount,
      vatRate,
      totalAmount: amount + vatAmount,
      expenseDate: data.expenseDate || new Date(),
      paymentMethod: data.paymentMethod || 'card',
      receiptUrl: data.receiptUrl,
      receiptNumber: data.receiptNumber,
      vendorName: data.vendorName,
      vendorCui: data.vendorCui,
      status: 'draft',
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.expenses.push(expense);
    this.logger.log(`Created expense ${expense.id} for ${expense.totalAmount} ${expense.currency}`);
    return expense;
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense | undefined> {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense) return undefined;

    if (data.amount !== undefined) {
      const vatRate = data.vatRate ?? expense.vatRate;
      data.vatAmount = Math.round(data.amount * vatRate / 100 * 100) / 100;
      data.totalAmount = data.amount + data.vatAmount;
    }

    Object.assign(expense, data, { updatedAt: new Date() });
    return expense;
  }

  async submitExpense(id: string): Promise<Expense | undefined> {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense || expense.status !== 'draft') return undefined;

    expense.status = 'submitted';
    expense.updatedAt = new Date();
    return expense;
  }

  async approveExpense(id: string, approverId: string): Promise<Expense | undefined> {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense || expense.status !== 'submitted') return undefined;

    expense.status = 'approved';
    expense.approvedBy = approverId;
    expense.approvedAt = new Date();
    expense.updatedAt = new Date();
    return expense;
  }

  async rejectExpense(id: string, reason: string): Promise<Expense | undefined> {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense || expense.status !== 'submitted') return undefined;

    expense.status = 'rejected';
    expense.rejectionReason = reason;
    expense.updatedAt = new Date();
    return expense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const index = this.expenses.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.expenses.splice(index, 1);
    return true;
  }

  // Expense Reports
  async getReports(
    tenantId?: string,
    employeeId?: string,
    status?: string,
    limit = 20,
    offset = 0,
  ): Promise<{ reports: ExpenseReport[]; total: number }> {
    let filtered = [...this.reports];

    if (tenantId) filtered = filtered.filter(r => r.tenantId === tenantId);
    if (employeeId) filtered = filtered.filter(r => r.employeeId === employeeId);
    if (status) filtered = filtered.filter(r => r.status === status);

    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      reports: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  async getReportById(id: string): Promise<ExpenseReport | undefined> {
    return this.reports.find(r => r.id === id);
  }

  async createReport(data: Partial<ExpenseReport>): Promise<ExpenseReport> {
    const reportExpenses = this.expenses.filter(e => data.expenses?.includes(e.id));
    const totalAmount = reportExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

    const report: ExpenseReport = {
      id: `rep-${Date.now()}`,
      tenantId: data.tenantId || 'tenant-001',
      employeeId: data.employeeId || '',
      employeeName: data.employeeName || '',
      title: data.title || '',
      description: data.description,
      expenses: data.expenses || [],
      totalAmount,
      currency: 'RON',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reports.push(report);
    return report;
  }

  async submitReport(id: string): Promise<ExpenseReport | undefined> {
    const report = this.reports.find(r => r.id === id);
    if (!report || report.status !== 'draft') return undefined;

    report.status = 'submitted';
    report.submittedAt = new Date();
    report.updatedAt = new Date();
    return report;
  }

  async approveReport(id: string, approverId: string): Promise<ExpenseReport | undefined> {
    const report = this.reports.find(r => r.id === id);
    if (!report || report.status !== 'submitted') return undefined;

    report.status = 'approved';
    report.approvedBy = approverId;
    report.approvedAt = new Date();
    report.updatedAt = new Date();

    // Update all expenses in the report
    report.expenses.forEach(expenseId => {
      const expense = this.expenses.find(e => e.id === expenseId);
      if (expense && expense.status === 'submitted') {
        expense.status = 'approved';
        expense.approvedBy = approverId;
        expense.approvedAt = new Date();
      }
    });

    return report;
  }

  // Policies
  async getPolicies(tenantId?: string): Promise<ExpensePolicy[]> {
    if (tenantId) {
      return this.policies.filter(p => p.tenantId === tenantId);
    }
    return this.policies;
  }

  async createPolicy(data: Partial<ExpensePolicy>): Promise<ExpensePolicy> {
    const policy: ExpensePolicy = {
      id: `pol-${Date.now()}`,
      tenantId: data.tenantId || 'tenant-001',
      name: data.name || '',
      description: data.description || '',
      categoryId: data.categoryId,
      maxAmount: data.maxAmount,
      requiresReceipt: data.requiresReceipt ?? true,
      requiresApproval: data.requiresApproval ?? true,
      approvalThreshold: data.approvalThreshold ?? 500,
      autoApproveBelow: data.autoApproveBelow,
      allowedPaymentMethods: data.allowedPaymentMethods || ['cash', 'card', 'bank_transfer'],
      active: data.active ?? true,
    };
    this.policies.push(policy);
    return policy;
  }

  // Analytics
  async getAnalytics(
    tenantId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ExpenseAnalytics> {
    let filtered = [...this.expenses];

    if (tenantId) filtered = filtered.filter(e => e.tenantId === tenantId);
    if (startDate) filtered = filtered.filter(e => e.expenseDate >= startDate);
    if (endDate) filtered = filtered.filter(e => e.expenseDate <= endDate);

    const pendingExpenses = filtered.filter(e => e.status === 'submitted');
    const totalAmount = filtered.reduce((sum, e) => sum + e.totalAmount, 0);

    // By category
    const byCategory = Object.entries(
      filtered.reduce((acc, e) => {
        if (!acc[e.categoryName]) acc[e.categoryName] = { count: 0, amount: 0 };
        acc[e.categoryName].count++;
        acc[e.categoryName].amount += e.totalAmount;
        return acc;
      }, {} as Record<string, { count: number; amount: number }>)
    ).map(([category, data]) => ({ category, ...data }));

    // By employee
    const byEmployee = Object.entries(
      filtered.reduce((acc, e) => {
        const name = e.employeeName || 'Unknown';
        if (!acc[name]) acc[name] = { count: 0, amount: 0 };
        acc[name].count++;
        acc[name].amount += e.totalAmount;
        return acc;
      }, {} as Record<string, { count: number; amount: number }>)
    ).map(([employee, data]) => ({ employee, ...data }));

    // By month
    const byMonth = Object.entries(
      filtered.reduce((acc, e) => {
        const month = e.expenseDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
        if (!acc[month]) acc[month] = { count: 0, amount: 0 };
        acc[month].count++;
        acc[month].amount += e.totalAmount;
        return acc;
      }, {} as Record<string, { count: number; amount: number }>)
    ).map(([month, data]) => ({ month, ...data }));

    // Top vendors
    const topVendors = Object.entries(
      filtered.reduce((acc, e) => {
        const vendor = e.vendorName || 'Unknown';
        if (!acc[vendor]) acc[vendor] = { count: 0, amount: 0 };
        acc[vendor].count++;
        acc[vendor].amount += e.totalAmount;
        return acc;
      }, {} as Record<string, { count: number; amount: number }>)
    )
      .map(([vendor, data]) => ({ vendor, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      totalExpenses: filtered.length,
      totalAmount,
      pendingApproval: pendingExpenses.length,
      pendingAmount: pendingExpenses.reduce((sum, e) => sum + e.totalAmount, 0),
      byCategory,
      byEmployee,
      byMonth,
      averageExpense: filtered.length > 0 ? Math.round(totalAmount / filtered.length * 100) / 100 : 0,
      topVendors,
    };
  }

  // =================== APPROVAL WORKFLOW ===================

  // Approval workflow configuration
  private approvalWorkflows: ApprovalWorkflow[] = [];
  private approvalDelegations: ApprovalDelegation[] = [];
  private approvalHistory: ApprovalHistoryEntry[] = [];

  /**
   * Create an approval workflow configuration
   */
  async createApprovalWorkflow(data: {
    tenantId: string;
    name: string;
    description?: string;
    levels: ApprovalLevel[];
    autoApproveRules?: AutoApproveRule[];
    escalationRules?: EscalationRule[];
  }): Promise<ApprovalWorkflow> {
    const workflow: ApprovalWorkflow = {
      id: `wf-${Date.now()}`,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      levels: data.levels,
      autoApproveRules: data.autoApproveRules || [],
      escalationRules: data.escalationRules || [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.approvalWorkflows.push(workflow);
    this.logger.log(`Created approval workflow: ${workflow.name}`);
    return workflow;
  }

  /**
   * Get approval workflows for a tenant
   */
  async getApprovalWorkflows(tenantId: string): Promise<ApprovalWorkflow[]> {
    return this.approvalWorkflows.filter(w => w.tenantId === tenantId && w.active);
  }

  /**
   * Route expense to appropriate approver based on workflow
   */
  async routeForApproval(expenseId: string, submitterId: string): Promise<{
    expense: Expense;
    nextApprover: ApproverInfo | null;
    workflowInfo: {
      workflowId: string;
      workflowName: string;
      currentLevel: number;
      totalLevels: number;
      autoApproved: boolean;
      autoApproveReason?: string;
    };
  }> {
    const expense = this.expenses.find(e => e.id === expenseId);
    if (!expense) throw new Error('Cheltuiala nu a fost găsită');

    // Find applicable workflow
    const workflows = await this.getApprovalWorkflows(expense.tenantId);
    const workflow = this.findApplicableWorkflow(expense, workflows);

    if (!workflow) {
      // No workflow - submit directly
      expense.status = 'submitted';
      expense.updatedAt = new Date();
      return {
        expense,
        nextApprover: null,
        workflowInfo: {
          workflowId: '',
          workflowName: 'Fără workflow',
          currentLevel: 0,
          totalLevels: 0,
          autoApproved: false,
        },
      };
    }

    // Check auto-approve rules
    const autoApproveCheck = this.checkAutoApproveRules(expense, workflow.autoApproveRules);
    if (autoApproveCheck.approved) {
      expense.status = 'approved';
      expense.approvedBy = 'SYSTEM_AUTO_APPROVE';
      expense.approvedAt = new Date();
      expense.updatedAt = new Date();

      this.addApprovalHistoryEntry(expense.id, {
        action: 'auto_approved',
        approverId: 'SYSTEM',
        level: 0,
        comment: autoApproveCheck.reason,
      });

      return {
        expense,
        nextApprover: null,
        workflowInfo: {
          workflowId: workflow.id,
          workflowName: workflow.name,
          currentLevel: 0,
          totalLevels: workflow.levels.length,
          autoApproved: true,
          autoApproveReason: autoApproveCheck.reason,
        },
      };
    }

    // Find first approver in workflow
    const firstLevel = workflow.levels[0];
    const nextApprover = await this.resolveApprover(firstLevel, expense, submitterId);

    expense.status = 'submitted';
    expense.updatedAt = new Date();

    this.addApprovalHistoryEntry(expense.id, {
      action: 'submitted',
      approverId: submitterId,
      level: 0,
      comment: 'Cheltuiala trimisă pentru aprobare',
    });

    return {
      expense,
      nextApprover,
      workflowInfo: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        currentLevel: 1,
        totalLevels: workflow.levels.length,
        autoApproved: false,
      },
    };
  }

  /**
   * Process approval/rejection at a workflow level
   */
  async processApprovalDecision(
    expenseId: string,
    approverId: string,
    decision: 'approve' | 'reject' | 'request_changes',
    comment?: string,
  ): Promise<{
    expense: Expense;
    decision: string;
    nextApprover: ApproverInfo | null;
    workflowComplete: boolean;
    message: string;
  }> {
    const expense = this.expenses.find(e => e.id === expenseId);
    if (!expense) throw new Error('Cheltuiala nu a fost găsită');
    if (expense.status !== 'submitted') throw new Error('Cheltuiala nu este în așteptarea aprobării');

    const workflows = await this.getApprovalWorkflows(expense.tenantId);
    const workflow = this.findApplicableWorkflow(expense, workflows);

    const history = this.approvalHistory.filter(h => h.expenseId === expenseId);
    const currentLevel = history.filter(h => h.action === 'approved').length + 1;

    this.addApprovalHistoryEntry(expenseId, {
      action: decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'changes_requested',
      approverId,
      level: currentLevel,
      comment,
    });

    if (decision === 'reject') {
      expense.status = 'rejected';
      expense.rejectionReason = comment;
      expense.updatedAt = new Date();

      return {
        expense,
        decision: 'rejected',
        nextApprover: null,
        workflowComplete: true,
        message: 'Cheltuiala a fost respinsă',
      };
    }

    if (decision === 'request_changes') {
      expense.status = 'draft';
      expense.updatedAt = new Date();

      return {
        expense,
        decision: 'changes_requested',
        nextApprover: null,
        workflowComplete: false,
        message: 'Modificări solicitate - cheltuiala returnată pentru corectare',
      };
    }

    // Approval
    if (!workflow || currentLevel >= workflow.levels.length) {
      // Final approval
      expense.status = 'approved';
      expense.approvedBy = approverId;
      expense.approvedAt = new Date();
      expense.updatedAt = new Date();

      return {
        expense,
        decision: 'approved',
        nextApprover: null,
        workflowComplete: true,
        message: 'Cheltuiala aprobată definitiv',
      };
    }

    // Route to next level
    const nextLevel = workflow.levels[currentLevel];
    const nextApprover = await this.resolveApprover(nextLevel, expense, approverId);

    return {
      expense,
      decision: 'approved_level',
      nextApprover,
      workflowComplete: false,
      message: `Nivel ${currentLevel} aprobat. Trimis la ${nextApprover?.name || 'următorul aprobator'}`,
    };
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovalsForUser(userId: string, tenantId: string): Promise<{
    pendingExpenses: Array<Expense & { requiredLevel: number; dueDate?: Date }>;
    pendingReports: ExpenseReport[];
    summary: { totalCount: number; totalAmount: number; urgentCount: number };
  }> {
    const pendingExpenses = this.expenses.filter(e =>
      e.tenantId === tenantId &&
      e.status === 'submitted'
    );

    const pendingReports = this.reports.filter(r =>
      r.tenantId === tenantId &&
      r.status === 'submitted'
    );

    // Check which expenses this user can approve based on workflows
    const userCanApprove: Array<Expense & { requiredLevel: number; dueDate?: Date }> = [];

    for (const expense of pendingExpenses) {
      const canApprove = await this.canUserApprove(userId, expense);
      if (canApprove.canApprove) {
        userCanApprove.push({
          ...expense,
          requiredLevel: canApprove.level,
          dueDate: canApprove.dueDate,
        });
      }
    }

    const urgentExpenses = userCanApprove.filter(e =>
      e.dueDate && e.dueDate < new Date(Date.now() + 24 * 60 * 60 * 1000)
    );

    return {
      pendingExpenses: userCanApprove,
      pendingReports,
      summary: {
        totalCount: userCanApprove.length + pendingReports.length,
        totalAmount: userCanApprove.reduce((sum, e) => sum + e.totalAmount, 0),
        urgentCount: urgentExpenses.length,
      },
    };
  }

  /**
   * Set up delegation for approvals
   */
  async createDelegation(data: {
    delegatorId: string;
    delegateeId: string;
    delegateeName: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
    tenantId: string;
  }): Promise<ApprovalDelegation> {
    const delegation: ApprovalDelegation = {
      id: `del-${Date.now()}`,
      delegatorId: data.delegatorId,
      delegateeId: data.delegateeId,
      delegateeName: data.delegateeName,
      startDate: data.startDate,
      endDate: data.endDate,
      reason: data.reason,
      tenantId: data.tenantId,
      active: true,
      createdAt: new Date(),
    };

    this.approvalDelegations.push(delegation);
    this.logger.log(`Created delegation from ${data.delegatorId} to ${data.delegateeId}`);
    return delegation;
  }

  /**
   * Get delegation for a user
   */
  async getActiveDelegation(userId: string, tenantId: string): Promise<ApprovalDelegation | null> {
    const now = new Date();
    return this.approvalDelegations.find(d =>
      d.delegatorId === userId &&
      d.tenantId === tenantId &&
      d.active &&
      d.startDate <= now &&
      d.endDate >= now
    ) || null;
  }

  /**
   * Get approval history for an expense
   */
  async getApprovalHistory(expenseId: string): Promise<ApprovalHistoryEntry[]> {
    return this.approvalHistory
      .filter(h => h.expenseId === expenseId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Bulk approve expenses
   */
  async bulkApprove(
    expenseIds: string[],
    approverId: string,
    comment?: string,
  ): Promise<{
    approved: string[];
    failed: Array<{ id: string; reason: string }>;
    summary: { totalApproved: number; totalFailed: number; totalAmount: number };
  }> {
    const approved: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];
    let totalAmount = 0;

    for (const id of expenseIds) {
      try {
        const result = await this.processApprovalDecision(id, approverId, 'approve', comment);
        if (result.decision === 'approved' || result.decision === 'approved_level') {
          approved.push(id);
          totalAmount += result.expense.totalAmount;
        }
      } catch (error) {
        failed.push({ id, reason: (error as Error).message });
      }
    }

    return {
      approved,
      failed,
      summary: {
        totalApproved: approved.length,
        totalFailed: failed.length,
        totalAmount,
      },
    };
  }

  // Helper methods for approval workflow

  private findApplicableWorkflow(expense: Expense, workflows: ApprovalWorkflow[]): ApprovalWorkflow | null {
    // Find workflow by category or default
    const categoryWorkflow = workflows.find(w =>
      w.levels.some(l => l.categoryIds?.includes(expense.categoryId))
    );

    if (categoryWorkflow) return categoryWorkflow;

    // Find default workflow
    return workflows.find(w => w.name.toLowerCase().includes('standard') || w.name.toLowerCase().includes('implicit')) || workflows[0] || null;
  }

  private checkAutoApproveRules(expense: Expense, rules: AutoApproveRule[]): { approved: boolean; reason?: string } {
    for (const rule of rules) {
      if (rule.type === 'amount_below' && expense.totalAmount < (rule.threshold || 0)) {
        return { approved: true, reason: `Sumă sub ${rule.threshold} RON - aprobare automată` };
      }
      if (rule.type === 'category' && rule.categoryIds?.includes(expense.categoryId)) {
        return { approved: true, reason: `Categorie cu aprobare automată: ${expense.categoryName}` };
      }
      if (rule.type === 'vendor' && rule.vendorCuis?.includes(expense.vendorCui || '')) {
        return { approved: true, reason: `Furnizor de încredere: ${expense.vendorName}` };
      }
    }
    return { approved: false };
  }

  private async resolveApprover(level: ApprovalLevel, expense: Expense, _submitterId: string): Promise<ApproverInfo> {
    // Check for delegation
    if (level.approverId) {
      const delegation = await this.getActiveDelegation(level.approverId, expense.tenantId);
      if (delegation) {
        return {
          id: delegation.delegateeId,
          name: delegation.delegateeName,
          type: 'delegated',
          level: level.level,
        };
      }
      return {
        id: level.approverId,
        name: level.approverName || 'Aprobator',
        type: level.approverType,
        level: level.level,
      };
    }

    // Resolve by type
    if (level.approverType === 'manager') {
      return { id: 'manager-001', name: 'Manager Direct', type: 'manager', level: level.level };
    }
    if (level.approverType === 'department_head') {
      return { id: 'dept-head-001', name: 'Șef Departament', type: 'department_head', level: level.level };
    }
    if (level.approverType === 'finance') {
      return { id: 'finance-001', name: 'Director Financiar', type: 'finance', level: level.level };
    }

    return { id: 'default-approver', name: 'Aprobator', type: 'default', level: level.level };
  }

  private async canUserApprove(userId: string, expense: Expense): Promise<{ canApprove: boolean; level: number; dueDate?: Date }> {
    // Simplified check - in production, check workflow levels
    const workflows = await this.getApprovalWorkflows(expense.tenantId);
    const workflow = this.findApplicableWorkflow(expense, workflows);

    if (!workflow) {
      // No workflow - anyone with approve permission can approve
      return { canApprove: true, level: 1 };
    }

    // Check if user is in any approval level
    for (const level of workflow.levels) {
      if (level.approverId === userId || level.approverType === 'any') {
        // Check delegation
        const delegation = await this.getActiveDelegation(level.approverId || '', expense.tenantId);
        if (delegation && delegation.delegateeId === userId) {
          return { canApprove: true, level: level.level };
        }
        if (level.approverId === userId) {
          return { canApprove: true, level: level.level };
        }
      }
    }

    return { canApprove: false, level: 0 };
  }

  private addApprovalHistoryEntry(expenseId: string, data: {
    action: string;
    approverId: string;
    level: number;
    comment?: string;
  }) {
    this.approvalHistory.push({
      id: `hist-${Date.now()}`,
      expenseId,
      action: data.action as ApprovalHistoryEntry['action'],
      approverId: data.approverId,
      level: data.level,
      comment: data.comment,
      timestamp: new Date(),
    });
  }

  // OCR Receipt Processing
  async processReceipt(receiptData: string): Promise<Partial<Expense>> {
    // Simulate OCR processing
    this.logger.log('Processing receipt with OCR...');
    return {
      vendorName: 'Auto-detected Vendor',
      amount: Math.round(Math.random() * 500 * 100) / 100,
      vatRate: 19,
      expenseDate: new Date(),
      description: 'Auto-extracted from receipt',
    };
  }

  // Export
  async exportExpenses(
    format: 'xlsx' | 'csv' | 'pdf',
    tenantId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ downloadUrl: string; filename: string }> {
    const timestamp = Date.now();
    return {
      downloadUrl: `/exports/expenses_${timestamp}.${format}`,
      filename: `expenses_${timestamp}.${format}`,
    };
  }
}
