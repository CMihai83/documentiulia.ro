import { Test, TestingModule } from '@nestjs/testing';
import {
  ExpenseManagementService,
  Expense,
  ExpenseCategory,
  ExpenseReport,
  ExpensePolicy,
  ApprovalWorkflow,
  ApprovalDelegation,
} from './expense-management.service';

describe('ExpenseManagementService', () => {
  let service: ExpenseManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpenseManagementService],
    }).compile();

    service = module.get<ExpenseManagementService>(ExpenseManagementService);
  });

  describe('Initialization', () => {
    it('should initialize with default categories', async () => {
      const categories = await service.getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories.some(c => c.name === 'Transport')).toBe(true);
      expect(categories.some(c => c.name === 'Cazare')).toBe(true);
      expect(categories.some(c => c.name === 'Combustibil')).toBe(true);
    });

    it('should initialize with mock expenses', async () => {
      const { expenses, total } = await service.getExpenses();

      expect(total).toBeGreaterThan(0);
      expect(expenses.length).toBeGreaterThan(0);
    });

    it('should initialize with mock reports', async () => {
      const { reports, total } = await service.getReports();

      expect(total).toBeGreaterThan(0);
      expect(reports.length).toBeGreaterThan(0);
    });

    it('should initialize with policies', async () => {
      const policies = await service.getPolicies();

      expect(policies.length).toBeGreaterThan(0);
    });
  });

  describe('Dashboard', () => {
    it('should return dashboard data', async () => {
      const dashboard = await service.getDashboard();

      expect(dashboard.summary.totalExpenses).toBeGreaterThan(0);
      expect(dashboard.summary.totalAmount).toBeGreaterThan(0);
      expect(dashboard.recentExpenses.length).toBeLessThanOrEqual(10);
      expect(dashboard.topCategories.length).toBeLessThanOrEqual(5);
    });

    it('should return top categories with percentages', async () => {
      const dashboard = await service.getDashboard();

      dashboard.topCategories.forEach(cat => {
        expect(cat.category).toBeDefined();
        expect(cat.amount).toBeGreaterThan(0);
        expect(cat.percentage).toBeGreaterThanOrEqual(0);
        expect(cat.percentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Categories', () => {
    describe('getCategories', () => {
      it('should return all categories', async () => {
        const categories = await service.getCategories();

        expect(categories.length).toBeGreaterThan(0);
      });

      it('should filter active only', async () => {
        const categories = await service.getCategories(true);

        expect(categories.every(c => c.active)).toBe(true);
      });
    });

    describe('getCategoryById', () => {
      it('should return category by ID', async () => {
        const categories = await service.getCategories();
        const category = await service.getCategoryById(categories[0].id);

        expect(category).toBeDefined();
        expect(category?.id).toBe(categories[0].id);
      });

      it('should return undefined for non-existent ID', async () => {
        const category = await service.getCategoryById('non-existent');

        expect(category).toBeUndefined();
      });
    });

    describe('createCategory', () => {
      it('should create category', async () => {
        const category = await service.createCategory({
          name: 'Entertainment',
          code: 'ENT',
          description: 'Entertainment expenses',
          taxDeductible: false,
          defaultVatRate: 19,
          accountCode: '6281',
        });

        expect(category.id).toBeDefined();
        expect(category.name).toBe('Entertainment');
        expect(category.code).toBe('ENT');
        expect(category.active).toBe(true);
      });

      it('should set default values', async () => {
        const category = await service.createCategory({
          name: 'Test',
          code: 'TST',
        });

        expect(category.taxDeductible).toBe(true);
        expect(category.defaultVatRate).toBe(19);
        expect(category.active).toBe(true);
      });
    });

    describe('updateCategory', () => {
      it('should update category', async () => {
        const categories = await service.getCategories();
        const updated = await service.updateCategory(categories[0].id, {
          description: 'Updated description',
        });

        expect(updated?.description).toBe('Updated description');
      });

      it('should return undefined for non-existent ID', async () => {
        const result = await service.updateCategory('non-existent', { name: 'New' });

        expect(result).toBeUndefined();
      });
    });
  });

  describe('Expenses', () => {
    describe('getExpenses', () => {
      it('should return expenses with pagination', async () => {
        const { expenses, total } = await service.getExpenses(undefined, undefined, undefined, undefined, undefined, undefined, 10, 0);

        expect(expenses.length).toBeLessThanOrEqual(10);
        expect(total).toBeGreaterThan(0);
      });

      it('should filter by tenant', async () => {
        const { expenses } = await service.getExpenses('tenant-001');

        expect(expenses.every(e => e.tenantId === 'tenant-001')).toBe(true);
      });

      it('should filter by employee', async () => {
        const { expenses } = await service.getExpenses(undefined, 'emp-001');

        expect(expenses.every(e => e.employeeId === 'emp-001')).toBe(true);
      });

      it('should filter by category', async () => {
        const categories = await service.getCategories();
        const { expenses } = await service.getExpenses(undefined, undefined, categories[0].id);

        expect(expenses.every(e => e.categoryId === categories[0].id)).toBe(true);
      });

      it('should filter by status', async () => {
        const { expenses } = await service.getExpenses(undefined, undefined, undefined, 'approved');

        expect(expenses.every(e => e.status === 'approved')).toBe(true);
      });

      it('should filter by date range', async () => {
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date();
        const { expenses } = await service.getExpenses(undefined, undefined, undefined, undefined, startDate, endDate);

        expenses.forEach(e => {
          expect(e.expenseDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(e.expenseDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });
      });

      it('should sort by date descending', async () => {
        const { expenses } = await service.getExpenses();

        for (let i = 1; i < expenses.length; i++) {
          expect(expenses[i - 1].expenseDate.getTime()).toBeGreaterThanOrEqual(
            expenses[i].expenseDate.getTime(),
          );
        }
      });
    });

    describe('getExpenseById', () => {
      it('should return expense by ID', async () => {
        const { expenses } = await service.getExpenses();
        const expense = await service.getExpenseById(expenses[0].id);

        expect(expense).toBeDefined();
        expect(expense?.id).toBe(expenses[0].id);
      });

      it('should return undefined for non-existent ID', async () => {
        const expense = await service.getExpenseById('non-existent');

        expect(expense).toBeUndefined();
      });
    });

    describe('createExpense', () => {
      it('should create expense', async () => {
        const categories = await service.getCategories();
        const expense = await service.createExpense({
          tenantId: 'tenant-1',
          employeeId: 'emp-1',
          employeeName: 'Test Employee',
          categoryId: categories[0].id,
          description: 'Test expense',
          amount: 100,
          paymentMethod: 'card',
        });

        expect(expense.id).toBeDefined();
        expect(expense.status).toBe('draft');
        expect(expense.totalAmount).toBeGreaterThan(expense.amount);
      });

      it('should calculate VAT correctly', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
          vatRate: 19,
        });

        expect(expense.vatAmount).toBe(19);
        expect(expense.totalAmount).toBe(119);
      });

      it('should use category default VAT rate', async () => {
        const categories = await service.getCategories();
        const expense = await service.createExpense({
          categoryId: categories[0].id,
          amount: 100,
        });

        expect(expense.vatRate).toBe(categories[0].defaultVatRate);
      });

      it('should set category name from category', async () => {
        const categories = await service.getCategories();
        const expense = await service.createExpense({
          categoryId: categories[0].id,
          amount: 50,
        });

        expect(expense.categoryName).toBe(categories[0].name);
      });
    });

    describe('updateExpense', () => {
      it('should update expense', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
          description: 'Original',
        });

        const updated = await service.updateExpense(expense.id, {
          description: 'Updated description',
        });

        expect(updated?.description).toBe('Updated description');
      });

      it('should recalculate totals on amount change', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
          vatRate: 19,
        });

        const updated = await service.updateExpense(expense.id, {
          amount: 200,
        });

        expect(updated?.vatAmount).toBe(38);
        expect(updated?.totalAmount).toBe(238);
      });

      it('should return undefined for non-existent ID', async () => {
        const result = await service.updateExpense('non-existent', { amount: 50 });

        expect(result).toBeUndefined();
      });
    });

    describe('submitExpense', () => {
      it('should submit draft expense', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
        });

        const submitted = await service.submitExpense(expense.id);

        expect(submitted?.status).toBe('submitted');
      });

      it('should not submit non-draft expense', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
        });

        await service.submitExpense(expense.id);
        const result = await service.submitExpense(expense.id);

        expect(result).toBeUndefined();
      });
    });

    describe('approveExpense', () => {
      it('should approve submitted expense', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
        });

        await service.submitExpense(expense.id);
        const approved = await service.approveExpense(expense.id, 'manager-1');

        expect(approved?.status).toBe('approved');
        expect(approved?.approvedBy).toBe('manager-1');
        expect(approved?.approvedAt).toBeDefined();
      });

      it('should not approve non-submitted expense', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
        });

        const result = await service.approveExpense(expense.id, 'manager-1');

        expect(result).toBeUndefined();
      });
    });

    describe('rejectExpense', () => {
      it('should reject submitted expense', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
        });

        await service.submitExpense(expense.id);
        const rejected = await service.rejectExpense(expense.id, 'Invalid receipt');

        expect(rejected?.status).toBe('rejected');
        expect(rejected?.rejectionReason).toBe('Invalid receipt');
      });

      it('should not reject non-submitted expense', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
        });

        const result = await service.rejectExpense(expense.id, 'Reason');

        expect(result).toBeUndefined();
      });
    });

    describe('deleteExpense', () => {
      it('should delete expense', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
        });

        const result = await service.deleteExpense(expense.id);
        const found = await service.getExpenseById(expense.id);

        expect(result).toBe(true);
        expect(found).toBeUndefined();
      });

      it('should return false for non-existent ID', async () => {
        const result = await service.deleteExpense('non-existent');

        expect(result).toBe(false);
      });
    });
  });

  describe('Expense Reports', () => {
    describe('getReports', () => {
      it('should return reports with pagination', async () => {
        const { reports, total } = await service.getReports(undefined, undefined, undefined, 5, 0);

        expect(reports.length).toBeLessThanOrEqual(5);
        expect(total).toBeGreaterThan(0);
      });

      it('should filter by tenant', async () => {
        const { reports } = await service.getReports('tenant-001');

        expect(reports.every(r => r.tenantId === 'tenant-001')).toBe(true);
      });

      it('should filter by employee', async () => {
        const { reports } = await service.getReports(undefined, 'emp-001');

        expect(reports.every(r => r.employeeId === 'emp-001')).toBe(true);
      });

      it('should filter by status', async () => {
        const { reports } = await service.getReports(undefined, undefined, 'submitted');

        expect(reports.every(r => r.status === 'submitted')).toBe(true);
      });
    });

    describe('getReportById', () => {
      it('should return report by ID', async () => {
        const { reports } = await service.getReports();
        const report = await service.getReportById(reports[0].id);

        expect(report).toBeDefined();
        expect(report?.id).toBe(reports[0].id);
      });

      it('should return undefined for non-existent ID', async () => {
        const report = await service.getReportById('non-existent');

        expect(report).toBeUndefined();
      });
    });

    describe('createReport', () => {
      it('should create report', async () => {
        const { expenses } = await service.getExpenses();
        const expenseIds = expenses.slice(0, 3).map(e => e.id);

        const report = await service.createReport({
          tenantId: 'tenant-1',
          employeeId: 'emp-1',
          employeeName: 'Test Employee',
          title: 'Monthly Report',
          expenses: expenseIds,
        });

        expect(report.id).toBeDefined();
        expect(report.status).toBe('draft');
        expect(report.expenses.length).toBe(3);
        expect(report.totalAmount).toBeGreaterThan(0);
      });

      it('should calculate total from expenses', async () => {
        const { expenses } = await service.getExpenses(undefined, undefined, undefined, undefined, undefined, undefined, 2, 0);
        const expectedTotal = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

        const report = await service.createReport({
          employeeId: 'emp-1',
          employeeName: 'Test',
          title: 'Test Report',
          expenses: expenses.map(e => e.id),
        });

        expect(report.totalAmount).toBe(expectedTotal);
      });
    });

    describe('submitReport', () => {
      it('should submit draft report', async () => {
        const report = await service.createReport({
          employeeId: 'emp-1',
          employeeName: 'Test',
          title: 'Test Report',
          expenses: [],
        });

        const submitted = await service.submitReport(report.id);

        expect(submitted?.status).toBe('submitted');
        expect(submitted?.submittedAt).toBeDefined();
      });

      it('should not submit non-draft report', async () => {
        const report = await service.createReport({
          employeeId: 'emp-1',
          employeeName: 'Test',
          title: 'Test Report',
          expenses: [],
        });

        await service.submitReport(report.id);
        const result = await service.submitReport(report.id);

        expect(result).toBeUndefined();
      });
    });

    describe('approveReport', () => {
      it('should approve submitted report', async () => {
        const report = await service.createReport({
          employeeId: 'emp-1',
          employeeName: 'Test',
          title: 'Test Report',
          expenses: [],
        });

        await service.submitReport(report.id);
        const approved = await service.approveReport(report.id, 'manager-1');

        expect(approved?.status).toBe('approved');
        expect(approved?.approvedBy).toBe('manager-1');
        expect(approved?.approvedAt).toBeDefined();
      });

      it('should approve expenses in report', async () => {
        const expense = await service.createExpense({
          categoryId: 'cat-001',
          amount: 100,
        });
        await service.submitExpense(expense.id);

        const report = await service.createReport({
          employeeId: 'emp-1',
          employeeName: 'Test',
          title: 'Test Report',
          expenses: [expense.id],
        });

        await service.submitReport(report.id);
        await service.approveReport(report.id, 'manager-1');

        const updatedExpense = await service.getExpenseById(expense.id);
        expect(updatedExpense?.status).toBe('approved');
      });
    });
  });

  describe('Policies', () => {
    describe('getPolicies', () => {
      it('should return all policies', async () => {
        const policies = await service.getPolicies();

        expect(policies.length).toBeGreaterThan(0);
      });

      it('should filter by tenant', async () => {
        const policies = await service.getPolicies('tenant-001');

        expect(policies.every(p => p.tenantId === 'tenant-001')).toBe(true);
      });
    });

    describe('createPolicy', () => {
      it('should create policy', async () => {
        const policy = await service.createPolicy({
          tenantId: 'tenant-1',
          name: 'Travel Policy',
          description: 'Policy for travel expenses',
          maxAmount: 5000,
          requiresReceipt: true,
          requiresApproval: true,
          approvalThreshold: 1000,
        });

        expect(policy.id).toBeDefined();
        expect(policy.name).toBe('Travel Policy');
        expect(policy.maxAmount).toBe(5000);
        expect(policy.active).toBe(true);
      });

      it('should set default values', async () => {
        const policy = await service.createPolicy({
          name: 'Basic Policy',
        });

        expect(policy.requiresReceipt).toBe(true);
        expect(policy.requiresApproval).toBe(true);
        expect(policy.approvalThreshold).toBe(500);
        expect(policy.allowedPaymentMethods).toContain('card');
      });
    });
  });

  describe('Analytics', () => {
    it('should return analytics data', async () => {
      const analytics = await service.getAnalytics();

      expect(analytics.totalExpenses).toBeGreaterThan(0);
      expect(analytics.totalAmount).toBeGreaterThan(0);
      expect(analytics.byCategory.length).toBeGreaterThan(0);
      expect(analytics.byEmployee.length).toBeGreaterThan(0);
      expect(analytics.byMonth.length).toBeGreaterThan(0);
      expect(analytics.averageExpense).toBeGreaterThan(0);
    });

    it('should filter by tenant', async () => {
      const analytics = await service.getAnalytics('tenant-001');

      expect(analytics.totalExpenses).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const analytics = await service.getAnalytics(undefined, startDate, endDate);

      expect(analytics.totalExpenses).toBeGreaterThanOrEqual(0);
    });

    it('should return top vendors', async () => {
      const analytics = await service.getAnalytics();

      expect(analytics.topVendors.length).toBeGreaterThan(0);
      expect(analytics.topVendors.length).toBeLessThanOrEqual(10);

      analytics.topVendors.forEach(v => {
        expect(v.vendor).toBeDefined();
        expect(v.count).toBeGreaterThan(0);
        expect(v.amount).toBeGreaterThan(0);
      });
    });
  });

  describe('Approval Workflows', () => {
    describe('createApprovalWorkflow', () => {
      it('should create workflow', async () => {
        const workflow = await service.createApprovalWorkflow({
          tenantId: 'tenant-1',
          name: 'Standard Approval',
          description: 'Standard expense approval workflow',
          levels: [
            { level: 1, name: 'Manager', approverType: 'manager' },
            { level: 2, name: 'Finance', approverType: 'finance' },
          ],
        });

        expect(workflow.id).toBeDefined();
        expect(workflow.name).toBe('Standard Approval');
        expect(workflow.levels.length).toBe(2);
        expect(workflow.active).toBe(true);
      });

      it('should set auto-approve rules', async () => {
        const workflow = await service.createApprovalWorkflow({
          tenantId: 'tenant-1',
          name: 'With Auto-Approve',
          levels: [{ level: 1, name: 'Manager', approverType: 'manager' }],
          autoApproveRules: [
            { id: 'rule-1', type: 'amount_below', threshold: 100, description: 'Auto approve under 100' },
          ],
        });

        expect(workflow.autoApproveRules.length).toBe(1);
        expect(workflow.autoApproveRules[0].threshold).toBe(100);
      });
    });

    describe('getApprovalWorkflows', () => {
      it('should return workflows for tenant', async () => {
        await service.createApprovalWorkflow({
          tenantId: 'tenant-1',
          name: 'Test Workflow',
          levels: [{ level: 1, name: 'Manager', approverType: 'manager' }],
        });

        const workflows = await service.getApprovalWorkflows('tenant-1');

        expect(workflows.length).toBeGreaterThan(0);
        expect(workflows.every(w => w.active)).toBe(true);
      });
    });

    describe('routeForApproval', () => {
      let expense: Expense;

      beforeEach(async () => {
        expense = await service.createExpense({
          tenantId: 'tenant-1',
          categoryId: 'cat-001',
          amount: 500,
        });
      });

      it('should route expense for approval', async () => {
        await service.createApprovalWorkflow({
          tenantId: 'tenant-1',
          name: 'Standard Workflow',
          levels: [{ level: 1, name: 'Manager', approverType: 'manager' }],
        });

        const result = await service.routeForApproval(expense.id, 'submitter-1');

        expect(result.expense.status).toBe('submitted');
        expect(result.nextApprover).toBeDefined();
        expect(result.workflowInfo.currentLevel).toBe(1);
      });

      it('should auto-approve when rules match', async () => {
        await service.createApprovalWorkflow({
          tenantId: 'tenant-1',
          name: 'Auto-Approve Workflow',
          levels: [{ level: 1, name: 'Manager', approverType: 'manager' }],
          autoApproveRules: [
            { id: 'rule-1', type: 'amount_below', threshold: 1000, description: 'Auto approve' },
          ],
        });

        const result = await service.routeForApproval(expense.id, 'submitter-1');

        expect(result.expense.status).toBe('approved');
        expect(result.workflowInfo.autoApproved).toBe(true);
        expect(result.workflowInfo.autoApproveReason).toBeDefined();
      });

      it('should throw for non-existent expense', async () => {
        await expect(
          service.routeForApproval('non-existent', 'submitter-1'),
        ).rejects.toThrow('Cheltuiala nu a fost găsită');
      });
    });

    describe('processApprovalDecision', () => {
      let expense: Expense;

      beforeEach(async () => {
        expense = await service.createExpense({
          tenantId: 'tenant-1',
          categoryId: 'cat-001',
          amount: 500,
        });
        await service.submitExpense(expense.id);
      });

      it('should approve expense', async () => {
        const result = await service.processApprovalDecision(
          expense.id,
          'approver-1',
          'approve',
          'Looks good',
        );

        expect(result.expense.status).toBe('approved');
        expect(result.decision).toBe('approved');
        expect(result.workflowComplete).toBe(true);
      });

      it('should reject expense', async () => {
        const result = await service.processApprovalDecision(
          expense.id,
          'approver-1',
          'reject',
          'Missing receipt',
        );

        expect(result.expense.status).toBe('rejected');
        expect(result.decision).toBe('rejected');
        expect(result.expense.rejectionReason).toBe('Missing receipt');
      });

      it('should request changes', async () => {
        const result = await service.processApprovalDecision(
          expense.id,
          'approver-1',
          'request_changes',
          'Please add category',
        );

        expect(result.expense.status).toBe('draft');
        expect(result.decision).toBe('changes_requested');
        expect(result.workflowComplete).toBe(false);
      });

      it('should throw for non-submitted expense', async () => {
        // Small delay to ensure unique ID
        await new Promise(r => setTimeout(r, 5));
        const draftExpense = await service.createExpense({
          tenantId: 'tenant-no-workflow',
          categoryId: 'cat-001',
          amount: 100,
        });

        await expect(
          service.processApprovalDecision(draftExpense.id, 'approver-1', 'approve'),
        ).rejects.toThrow('Cheltuiala nu este în așteptarea aprobării');
      });
    });

    describe('getPendingApprovalsForUser', () => {
      it('should return pending approvals', async () => {
        const result = await service.getPendingApprovalsForUser('manager-001', 'tenant-001');

        expect(result.summary).toBeDefined();
        expect(result.summary.totalCount).toBeGreaterThanOrEqual(0);
      });
    });

    describe('bulkApprove', () => {
      it('should approve multiple expenses', async () => {
        const expense1 = await service.createExpense({ categoryId: 'cat-001', amount: 100, tenantId: 'tenant-bulk' });
        // Small delay to ensure unique IDs
        await new Promise(r => setTimeout(r, 5));
        const expense2 = await service.createExpense({ categoryId: 'cat-001', amount: 200, tenantId: 'tenant-bulk' });

        await service.submitExpense(expense1.id);
        await new Promise(r => setTimeout(r, 5));
        await service.submitExpense(expense2.id);

        const result = await service.bulkApprove([expense1.id, expense2.id], 'approver-1', 'Bulk approved');

        expect(result.approved.length).toBe(2);
        expect(result.summary.totalApproved).toBe(2);
        expect(result.summary.totalAmount).toBeGreaterThan(0);
      });

      it('should handle partial failures', async () => {
        const expense = await service.createExpense({ categoryId: 'cat-001', amount: 100, tenantId: 'tenant-1' });
        await service.submitExpense(expense.id);

        const result = await service.bulkApprove([expense.id, 'non-existent'], 'approver-1');

        expect(result.approved.length).toBe(1);
        expect(result.failed.length).toBe(1);
        expect(result.failed[0].id).toBe('non-existent');
      });
    });
  });

  describe('Delegation', () => {
    describe('createDelegation', () => {
      it('should create delegation', async () => {
        const delegation = await service.createDelegation({
          delegatorId: 'manager-1',
          delegateeId: 'deputy-1',
          delegateeName: 'Deputy Manager',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          reason: 'Vacation',
          tenantId: 'tenant-1',
        });

        expect(delegation.id).toBeDefined();
        expect(delegation.active).toBe(true);
        expect(delegation.delegateeName).toBe('Deputy Manager');
      });
    });

    describe('getActiveDelegation', () => {
      it('should return active delegation', async () => {
        await service.createDelegation({
          delegatorId: 'user-1',
          delegateeId: 'delegate-1',
          delegateeName: 'Delegate',
          startDate: new Date(Date.now() - 1000),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          tenantId: 'tenant-1',
        });

        const delegation = await service.getActiveDelegation('user-1', 'tenant-1');

        expect(delegation).not.toBeNull();
        expect(delegation?.delegateeId).toBe('delegate-1');
      });

      it('should return null for expired delegation', async () => {
        await service.createDelegation({
          delegatorId: 'user-2',
          delegateeId: 'delegate-2',
          delegateeName: 'Delegate',
          startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          tenantId: 'tenant-1',
        });

        const delegation = await service.getActiveDelegation('user-2', 'tenant-1');

        expect(delegation).toBeNull();
      });

      it('should return null when no delegation exists', async () => {
        const delegation = await service.getActiveDelegation('non-existent', 'tenant-1');

        expect(delegation).toBeNull();
      });
    });
  });

  describe('Approval History', () => {
    it('should track approval history', async () => {
      const expense = await service.createExpense({
        tenantId: 'tenant-1',
        categoryId: 'cat-001',
        amount: 100,
      });

      await service.createApprovalWorkflow({
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        levels: [{ level: 1, name: 'Manager', approverType: 'manager' }],
      });

      await service.routeForApproval(expense.id, 'submitter-1');
      await service.processApprovalDecision(expense.id, 'approver-1', 'approve', 'OK');

      const history = await service.getApprovalHistory(expense.id);

      expect(history.length).toBeGreaterThan(0);
      expect(history.some(h => h.action === 'submitted')).toBe(true);
    });
  });

  describe('OCR Receipt Processing', () => {
    it('should process receipt and return expense data', async () => {
      const result = await service.processReceipt('base64-receipt-data');

      expect(result.vendorName).toBeDefined();
      expect(result.amount).toBeGreaterThan(0);
      expect(result.vatRate).toBeDefined();
      expect(result.expenseDate).toBeDefined();
    });
  });

  describe('Export', () => {
    it('should export expenses to XLSX', async () => {
      const result = await service.exportExpenses('xlsx');

      expect(result.downloadUrl).toContain('.xlsx');
      expect(result.filename).toContain('.xlsx');
    });

    it('should export expenses to CSV', async () => {
      const result = await service.exportExpenses('csv');

      expect(result.downloadUrl).toContain('.csv');
      expect(result.filename).toContain('.csv');
    });

    it('should export expenses to PDF', async () => {
      const result = await service.exportExpenses('pdf');

      expect(result.downloadUrl).toContain('.pdf');
      expect(result.filename).toContain('.pdf');
    });
  });

  describe('Payment Methods', () => {
    it('should support cash payment', async () => {
      const expense = await service.createExpense({
        categoryId: 'cat-001',
        amount: 50,
        paymentMethod: 'cash',
      });

      expect(expense.paymentMethod).toBe('cash');
    });

    it('should support card payment', async () => {
      const expense = await service.createExpense({
        categoryId: 'cat-001',
        amount: 50,
        paymentMethod: 'card',
      });

      expect(expense.paymentMethod).toBe('card');
    });

    it('should support bank transfer', async () => {
      const expense = await service.createExpense({
        categoryId: 'cat-001',
        amount: 50,
        paymentMethod: 'bank_transfer',
      });

      expect(expense.paymentMethod).toBe('bank_transfer');
    });
  });

  describe('Vendor Information', () => {
    it('should store vendor details', async () => {
      const expense = await service.createExpense({
        categoryId: 'cat-001',
        amount: 100,
        vendorName: 'Test Vendor SRL',
        vendorCui: 'RO12345678',
      });

      expect(expense.vendorName).toBe('Test Vendor SRL');
      expect(expense.vendorCui).toBe('RO12345678');
    });
  });

  describe('Receipt Information', () => {
    it('should store receipt details', async () => {
      const expense = await service.createExpense({
        categoryId: 'cat-001',
        amount: 100,
        receiptUrl: '/receipts/test.pdf',
        receiptNumber: 'RCP-001',
      });

      expect(expense.receiptUrl).toBe('/receipts/test.pdf');
      expect(expense.receiptNumber).toBe('RCP-001');
    });
  });

  describe('Tags', () => {
    it('should support expense tags', async () => {
      const expense = await service.createExpense({
        categoryId: 'cat-001',
        amount: 100,
        tags: ['urgent', 'project-x'],
      });

      expect(expense.tags).toContain('urgent');
      expect(expense.tags).toContain('project-x');
    });
  });
});
