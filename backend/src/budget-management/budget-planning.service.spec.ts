import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BudgetPlanningService,
  Budget,
  BudgetLineItem,
  BudgetCategory,
  BudgetTemplate,
  BudgetScenario,
  BudgetType,
  BudgetStatus,
  BudgetMethodology,
} from './budget-planning.service';

describe('BudgetPlanningService', () => {
  let service: BudgetPlanningService;
  let eventEmitter: EventEmitter2;
  const tenantId = 'test-tenant';
  const userId = 'user-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetPlanningService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BudgetPlanningService>(BudgetPlanningService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Budget CRUD Operations', () => {
    describe('createBudget', () => {
      it('should create a new budget', async () => {
        const budget = await service.createBudget({
          tenantId,
          name: 'Annual Operating Budget 2025',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 1000000,
          createdBy: userId,
        });

        expect(budget).toBeDefined();
        expect(budget.id).toBeDefined();
        expect(budget.name).toBe('Annual Operating Budget 2025');
        expect(budget.type).toBe('operating');
        expect(budget.status).toBe('draft');
        expect(budget.totalAmount).toBe(1000000);
        expect(budget.remainingAmount).toBe(1000000);
      });

      it('should set default values', async () => {
        const budget = await service.createBudget({
          tenantId,
          name: 'Test Budget',
          type: 'capital',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 500000,
          createdBy: userId,
        });

        expect(budget.methodology).toBe('incremental');
        expect(budget.periodType).toBe('annual');
        expect(budget.currency).toBe('RON');
        expect(budget.version).toBe(1);
        expect(budget.allocatedAmount).toBe(0);
        expect(budget.spentAmount).toBe(0);
      });

      it('should emit budget.created event', async () => {
        await service.createBudget({
          tenantId,
          name: 'Event Test Budget',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'budget.created',
          expect.objectContaining({ budget: expect.any(Object) }),
        );
      });

      it('should set parent budget reference', async () => {
        const parent = await service.createBudget({
          tenantId,
          name: 'Master Budget',
          type: 'master',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 5000000,
          createdBy: userId,
        });

        const child = await service.createBudget({
          tenantId,
          name: 'Department Budget',
          type: 'departmental',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 500000,
          parentBudgetId: parent.id,
          createdBy: userId,
        });

        expect(child.parentBudgetId).toBe(parent.id);
        expect(child.parentBudgetName).toBe('Master Budget');
      });

      it('should support all budget types', async () => {
        const types: BudgetType[] = ['operating', 'capital', 'project', 'departmental', 'revenue', 'cash_flow', 'master'];

        for (const type of types) {
          const budget = await service.createBudget({
            tenantId,
            name: `${type} Budget`,
            type,
            fiscalYear: '2025',
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-12-31'),
            totalAmount: 100000,
            createdBy: userId,
          });

          expect(budget.type).toBe(type);
        }
      });
    });

    describe('getBudget', () => {
      it('should return budget by ID', async () => {
        const created = await service.createBudget({
          tenantId,
          name: 'Fetch Test Budget',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        const found = await service.getBudget(created.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.name).toBe('Fetch Test Budget');
      });

      it('should return null for non-existent ID', async () => {
        const found = await service.getBudget('non-existent-id');

        expect(found).toBeNull();
      });
    });

    describe('getBudgets', () => {
      beforeEach(async () => {
        // Create test budgets
        await service.createBudget({
          tenantId,
          name: 'Operating Budget',
          type: 'operating',
          status: 'draft',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        } as any);

        await service.createBudget({
          tenantId,
          name: 'Capital Budget',
          type: 'capital',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 200000,
          departmentId: 'dept-1',
          createdBy: userId,
        });
      });

      it('should return budgets for tenant', async () => {
        const result = await service.getBudgets(tenantId);

        expect(result.budgets.length).toBeGreaterThan(0);
        result.budgets.forEach(b => {
          expect(b.tenantId).toBe(tenantId);
        });
      });

      it('should filter by type', async () => {
        const result = await service.getBudgets(tenantId, { type: 'operating' });

        result.budgets.forEach(b => {
          expect(b.type).toBe('operating');
        });
      });

      it('should filter by fiscal year', async () => {
        const result = await service.getBudgets(tenantId, { fiscalYear: '2025' });

        result.budgets.forEach(b => {
          expect(b.fiscalYear).toBe('2025');
        });
      });

      it('should filter by department', async () => {
        const result = await service.getBudgets(tenantId, { departmentId: 'dept-1' });

        result.budgets.forEach(b => {
          expect(b.departmentId).toBe('dept-1');
        });
      });

      it('should search by name', async () => {
        const result = await service.getBudgets(tenantId, { search: 'Operating' });

        expect(result.budgets.some(b => b.name.includes('Operating'))).toBe(true);
      });

      it('should respect limit', async () => {
        const result = await service.getBudgets(tenantId, { limit: 1 });

        expect(result.budgets.length).toBeLessThanOrEqual(1);
      });

      it('should return total count', async () => {
        const result = await service.getBudgets(tenantId);

        expect(typeof result.total).toBe('number');
        expect(result.total).toBeGreaterThanOrEqual(result.budgets.length);
      });
    });

    describe('updateBudget', () => {
      it('should update budget in draft status', async () => {
        const budget = await service.createBudget({
          tenantId,
          name: 'To Update',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        const updated = await service.updateBudget(budget.id, {
          name: 'Updated Budget',
          totalAmount: 150000,
        });

        expect(updated).toBeDefined();
        expect(updated?.name).toBe('Updated Budget');
        expect(updated?.totalAmount).toBe(150000);
      });

      it('should recalculate remaining amount', async () => {
        const budget = await service.createBudget({
          tenantId,
          name: 'Recalculate Test',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        // Add allocation
        await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-1',
          categoryName: 'Salaries',
          plannedAmount: 30000,
        });

        const updated = await service.updateBudget(budget.id, {
          totalAmount: 80000,
        });

        expect(updated?.remainingAmount).toBe(50000); // 80000 - 30000
      });

      it('should throw error for non-draft budget', async () => {
        const budget = await service.createBudget({
          tenantId,
          name: 'Approved Budget',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        await service.submitForApproval(budget.id, userId);
        await service.approveBudget(budget.id, 'admin', 'Admin User');

        await expect(
          service.updateBudget(budget.id, { name: 'Changed' }),
        ).rejects.toThrow('Cannot update budget in current status');
      });

      it('should return null for non-existent budget', async () => {
        const result = await service.updateBudget('non-existent', { name: 'Test' });

        expect(result).toBeNull();
      });
    });

    describe('deleteBudget', () => {
      it('should delete draft budget', async () => {
        const budget = await service.createBudget({
          tenantId,
          name: 'To Delete',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        const deleted = await service.deleteBudget(budget.id);

        expect(deleted).toBe(true);

        const found = await service.getBudget(budget.id);
        expect(found).toBeNull();
      });

      it('should delete associated line items', async () => {
        const budget = await service.createBudget({
          tenantId,
          name: 'Budget with Lines',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-1',
          categoryName: 'Salaries',
          plannedAmount: 50000,
        });

        await service.deleteBudget(budget.id);

        const lineItems = await service.getLineItems(budget.id);
        expect(lineItems.length).toBe(0);
      });

      it('should not delete non-draft budget', async () => {
        const budget = await service.createBudget({
          tenantId,
          name: 'Active Budget',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        await service.submitForApproval(budget.id, userId);

        const deleted = await service.deleteBudget(budget.id);

        expect(deleted).toBe(false);
      });
    });
  });

  describe('Budget Workflow', () => {
    let budget: Budget;

    beforeEach(async () => {
      budget = await service.createBudget({
        tenantId,
        name: 'Workflow Test Budget',
        type: 'operating',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 100000,
        createdBy: userId,
      });
    });

    describe('submitForApproval', () => {
      it('should submit draft budget for approval', async () => {
        const submitted = await service.submitForApproval(budget.id, userId);

        expect(submitted).toBeDefined();
        expect(submitted?.status).toBe('pending_approval');
      });

      it('should emit event', async () => {
        await service.submitForApproval(budget.id, userId);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'budget.submitted_for_approval',
          expect.any(Object),
        );
      });

      it('should return null for non-existent budget', async () => {
        const result = await service.submitForApproval('non-existent', userId);

        expect(result).toBeNull();
      });
    });

    describe('approveBudget', () => {
      beforeEach(async () => {
        await service.submitForApproval(budget.id, userId);
      });

      it('should approve pending budget', async () => {
        const approved = await service.approveBudget(budget.id, 'admin', 'Admin User');

        expect(approved).toBeDefined();
        expect(approved?.status).toBe('approved');
      });

      it('should emit event', async () => {
        await service.approveBudget(budget.id, 'admin', 'Admin User');

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'budget.approved',
          expect.any(Object),
        );
      });

      it('should return null for non-pending budget', async () => {
        // Budget is still in draft
        const draftBudget = await service.createBudget({
          tenantId,
          name: 'Draft',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 50000,
          createdBy: userId,
        });

        const result = await service.approveBudget(draftBudget.id, 'admin', 'Admin');

        expect(result).toBeNull();
      });
    });

    describe('rejectBudget', () => {
      beforeEach(async () => {
        await service.submitForApproval(budget.id, userId);
      });

      it('should reject pending budget', async () => {
        const rejected = await service.rejectBudget(budget.id, 'admin', 'Admin User');

        expect(rejected).toBeDefined();
        expect(rejected?.status).toBe('rejected');
      });

      it('should emit event', async () => {
        await service.rejectBudget(budget.id, 'admin', 'Admin User');

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'budget.rejected',
          expect.any(Object),
        );
      });
    });

    describe('activateBudget', () => {
      beforeEach(async () => {
        await service.submitForApproval(budget.id, userId);
        await service.approveBudget(budget.id, 'admin', 'Admin User');
      });

      it('should activate approved budget', async () => {
        const activated = await service.activateBudget(budget.id);

        expect(activated).toBeDefined();
        expect(activated?.status).toBe('active');
      });

      it('should emit event', async () => {
        await service.activateBudget(budget.id);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'budget.activated',
          expect.any(Object),
        );
      });

      it('should return null for non-approved budget', async () => {
        const draftBudget = await service.createBudget({
          tenantId,
          name: 'Draft',
          type: 'operating',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 50000,
          createdBy: userId,
        });

        const result = await service.activateBudget(draftBudget.id);

        expect(result).toBeNull();
      });
    });
  });

  describe('Budget Line Items', () => {
    let budget: Budget;

    beforeEach(async () => {
      budget = await service.createBudget({
        tenantId,
        name: 'Line Items Test Budget',
        type: 'operating',
        fiscalYear: '2025',
        periodType: 'monthly',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 100000,
        createdBy: userId,
      });
    });

    describe('addLineItem', () => {
      it('should add line item to budget', async () => {
        const lineItem = await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-sal',
          categoryName: 'Salaries & Wages',
          plannedAmount: 50000,
        });

        expect(lineItem).toBeDefined();
        expect(lineItem.id).toBeDefined();
        expect(lineItem.budgetId).toBe(budget.id);
        expect(lineItem.plannedAmount).toBe(50000);
        expect(lineItem.remainingAmount).toBe(50000);
      });

      it('should update budget allocated amount', async () => {
        await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-sal',
          categoryName: 'Salaries',
          plannedAmount: 30000,
        });

        const updatedBudget = await service.getBudget(budget.id);

        expect(updatedBudget?.allocatedAmount).toBe(30000);
        expect(updatedBudget?.remainingAmount).toBe(70000);
      });

      it('should generate period breakdown', async () => {
        const lineItem = await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-sal',
          categoryName: 'Salaries',
          plannedAmount: 12000,
        });

        expect(lineItem.periodBreakdown.length).toBeGreaterThan(0);
        const totalPlanned = lineItem.periodBreakdown.reduce((s, p) => s + p.plannedAmount, 0);
        expect(totalPlanned).toBe(12000);
      });

      it('should use provided period breakdown', async () => {
        const breakdown = [
          { period: '2025-01', plannedAmount: 5000 },
          { period: '2025-02', plannedAmount: 7000 },
        ];

        const lineItem = await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-sal',
          categoryName: 'Salaries',
          plannedAmount: 12000,
          periodBreakdown: breakdown,
        });

        expect(lineItem.periodBreakdown.length).toBe(2);
      });

      it('should throw error for non-existent budget', async () => {
        await expect(
          service.addLineItem({
            budgetId: 'non-existent',
            categoryId: 'cat-1',
            categoryName: 'Test',
            plannedAmount: 1000,
          }),
        ).rejects.toThrow('Budget not found');
      });
    });

    describe('getLineItems', () => {
      beforeEach(async () => {
        await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-sal',
          categoryName: 'Salaries',
          plannedAmount: 50000,
        });

        await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-ben',
          categoryName: 'Benefits',
          plannedAmount: 20000,
        });
      });

      it('should return line items for budget', async () => {
        const lineItems = await service.getLineItems(budget.id);

        expect(lineItems.length).toBe(2);
        lineItems.forEach(li => {
          expect(li.budgetId).toBe(budget.id);
        });
      });

      it('should sort by category name', async () => {
        const lineItems = await service.getLineItems(budget.id);

        expect(lineItems[0].categoryName).toBe('Benefits');
        expect(lineItems[1].categoryName).toBe('Salaries');
      });
    });

    describe('updateLineItem', () => {
      let lineItem: BudgetLineItem;

      beforeEach(async () => {
        lineItem = await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-sal',
          categoryName: 'Salaries',
          plannedAmount: 50000,
        });
      });

      it('should update line item', async () => {
        const updated = await service.updateLineItem(lineItem.id, {
          plannedAmount: 60000,
          notes: 'Updated for inflation',
        });

        expect(updated).toBeDefined();
        expect(updated?.plannedAmount).toBe(60000);
        expect(updated?.notes).toBe('Updated for inflation');
      });

      it('should update budget allocation when amount changes', async () => {
        await service.updateLineItem(lineItem.id, {
          plannedAmount: 70000,
        });

        const updatedBudget = await service.getBudget(budget.id);
        expect(updatedBudget?.allocatedAmount).toBe(70000);
      });

      it('should throw error for locked line item', async () => {
        await service.updateLineItem(lineItem.id, { isLocked: true });

        await expect(
          service.updateLineItem(lineItem.id, { plannedAmount: 80000 }),
        ).rejects.toThrow('Line item is locked');
      });

      it('should return null for non-existent line item', async () => {
        const result = await service.updateLineItem('non-existent', { plannedAmount: 1000 });

        expect(result).toBeNull();
      });
    });

    describe('deleteLineItem', () => {
      let lineItem: BudgetLineItem;

      beforeEach(async () => {
        lineItem = await service.addLineItem({
          budgetId: budget.id,
          categoryId: 'cat-sal',
          categoryName: 'Salaries',
          plannedAmount: 50000,
        });
      });

      it('should delete line item', async () => {
        const deleted = await service.deleteLineItem(lineItem.id);

        expect(deleted).toBe(true);

        const lineItems = await service.getLineItems(budget.id);
        expect(lineItems.find(li => li.id === lineItem.id)).toBeUndefined();
      });

      it('should update budget allocation', async () => {
        await service.deleteLineItem(lineItem.id);

        const updatedBudget = await service.getBudget(budget.id);
        expect(updatedBudget?.allocatedAmount).toBe(0);
      });

      it('should throw error for locked line item', async () => {
        await service.updateLineItem(lineItem.id, { isLocked: true });

        await expect(service.deleteLineItem(lineItem.id)).rejects.toThrow();
      });

      it('should throw error for line item with spending', async () => {
        await service.updateLineItem(lineItem.id, { spentAmount: 1000 });

        await expect(service.deleteLineItem(lineItem.id)).rejects.toThrow();
      });
    });
  });

  describe('Categories', () => {
    describe('createCategory', () => {
      it('should create budget category', async () => {
        const category = await service.createCategory({
          tenantId,
          name: 'New Category',
          code: 'NEW',
          type: 'expense',
        });

        expect(category).toBeDefined();
        expect(category.id).toBeDefined();
        expect(category.name).toBe('New Category');
        expect(category.code).toBe('NEW');
        expect(category.type).toBe('expense');
        expect(category.isActive).toBe(true);
      });

      it('should support parent category', async () => {
        const parent = await service.createCategory({
          tenantId,
          name: 'Parent Category',
          code: 'PAR',
          type: 'expense',
        });

        const child = await service.createCategory({
          tenantId,
          name: 'Child Category',
          code: 'CHD',
          type: 'expense',
          parentId: parent.id,
        });

        expect(child.parentId).toBe(parent.id);
        expect(child.parentName).toBe('Parent Category');
      });
    });

    describe('getCategories', () => {
      it('should return system and tenant categories', async () => {
        const categories = await service.getCategories(tenantId);

        expect(categories.length).toBeGreaterThan(0);
      });

      it('should filter by type', async () => {
        const expenseCategories = await service.getCategories(tenantId, { type: 'expense' });

        expenseCategories.forEach(c => {
          expect(c.type).toBe('expense');
        });
      });

      it('should filter by active status', async () => {
        const activeCategories = await service.getCategories(tenantId, { isActive: true });

        activeCategories.forEach(c => {
          expect(c.isActive).toBe(true);
        });
      });

      it('should sort by sortOrder', async () => {
        const categories = await service.getCategories(tenantId);

        for (let i = 1; i < categories.length; i++) {
          const prev = categories[i - 1].sortOrder || 0;
          const curr = categories[i].sortOrder || 0;
          expect(prev).toBeLessThanOrEqual(curr);
        }
      });
    });
  });

  describe('Templates', () => {
    describe('createTemplate', () => {
      it('should create budget template', async () => {
        const template = await service.createTemplate({
          tenantId,
          name: 'Operating Budget Template',
          type: 'operating',
          categories: [
            { categoryId: 'cat-sal', categoryName: 'Salaries', percentOfTotal: 60 },
            { categoryId: 'cat-mkt', categoryName: 'Marketing', percentOfTotal: 20 },
          ],
          createdBy: userId,
        });

        expect(template).toBeDefined();
        expect(template.id).toBeDefined();
        expect(template.name).toBe('Operating Budget Template');
        expect(template.categories.length).toBe(2);
        expect(template.isActive).toBe(true);
      });

      it('should set default values', async () => {
        const template = await service.createTemplate({
          tenantId,
          name: 'Simple Template',
          type: 'capital',
          categories: [],
          createdBy: userId,
        });

        expect(template.methodology).toBe('incremental');
        expect(template.periodType).toBe('annual');
      });
    });

    describe('getTemplates', () => {
      it('should return active templates for tenant', async () => {
        await service.createTemplate({
          tenantId,
          name: 'Test Template',
          type: 'operating',
          categories: [],
          createdBy: userId,
        });

        const templates = await service.getTemplates(tenantId);

        expect(templates.length).toBeGreaterThan(0);
        templates.forEach(t => {
          expect(t.tenantId).toBe(tenantId);
          expect(t.isActive).toBe(true);
        });
      });
    });

    describe('createBudgetFromTemplate', () => {
      let template: BudgetTemplate;

      beforeEach(async () => {
        template = await service.createTemplate({
          tenantId,
          name: 'Template for Budget',
          type: 'operating',
          methodology: 'zero_based',
          periodType: 'quarterly',
          categories: [
            { categoryId: 'cat-sal', categoryName: 'Salaries', percentOfTotal: 50 },
            { categoryId: 'cat-mkt', categoryName: 'Marketing', percentOfTotal: 30 },
          ],
          createdBy: userId,
        });
      });

      it('should create budget from template', async () => {
        const budget = await service.createBudgetFromTemplate(template.id, {
          tenantId,
          name: 'Budget from Template',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        expect(budget).toBeDefined();
        expect(budget.type).toBe('operating');
        expect(budget.methodology).toBe('zero_based');
        expect(budget.periodType).toBe('quarterly');
      });

      it('should create line items from template categories', async () => {
        const budget = await service.createBudgetFromTemplate(template.id, {
          tenantId,
          name: 'Budget with Lines',
          fiscalYear: '2025',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          totalAmount: 100000,
          createdBy: userId,
        });

        const lineItems = await service.getLineItems(budget.id);

        expect(lineItems.length).toBe(2);

        const salaryLine = lineItems.find(li => li.categoryId === 'cat-sal');
        expect(salaryLine?.plannedAmount).toBe(50000); // 50% of 100000

        const marketingLine = lineItems.find(li => li.categoryId === 'cat-mkt');
        expect(marketingLine?.plannedAmount).toBe(30000); // 30% of 100000
      });

      it('should throw error for non-existent template', async () => {
        await expect(
          service.createBudgetFromTemplate('non-existent', {
            tenantId,
            name: 'Test',
            fiscalYear: '2025',
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-12-31'),
            totalAmount: 50000,
            createdBy: userId,
          }),
        ).rejects.toThrow('Template not found');
      });
    });
  });

  describe('Scenarios', () => {
    let budget: Budget;

    beforeEach(async () => {
      budget = await service.createBudget({
        tenantId,
        name: 'Scenario Test Budget',
        type: 'operating',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 100000,
        createdBy: userId,
      });

      await service.addLineItem({
        budgetId: budget.id,
        categoryId: 'cat-sal',
        categoryName: 'Salaries',
        plannedAmount: 60000,
      });

      await service.addLineItem({
        budgetId: budget.id,
        categoryId: 'cat-mkt',
        categoryName: 'Marketing',
        plannedAmount: 20000,
      });
    });

    describe('createScenario', () => {
      it('should create best case scenario', async () => {
        const scenario = await service.createScenario({
          budgetId: budget.id,
          name: 'Best Case 2025',
          type: 'best_case',
          createdBy: userId,
        });

        expect(scenario).toBeDefined();
        expect(scenario.type).toBe('best_case');
        expect(scenario.adjustmentPercentage).toBe(-10); // Default for best case
        expect(scenario.totalAmount).toBeLessThan(80000); // Less than baseline
      });

      it('should create worst case scenario', async () => {
        const scenario = await service.createScenario({
          budgetId: budget.id,
          name: 'Worst Case 2025',
          type: 'worst_case',
          createdBy: userId,
        });

        expect(scenario.adjustmentPercentage).toBe(20);
        expect(scenario.totalAmount).toBeGreaterThan(80000);
      });

      it('should create custom scenario with adjustment', async () => {
        const scenario = await service.createScenario({
          budgetId: budget.id,
          name: 'Custom Scenario',
          type: 'custom',
          adjustmentPercentage: 15,
          createdBy: userId,
        });

        expect(scenario.adjustmentPercentage).toBe(15);
      });

      it('should include adjusted line items', async () => {
        const scenario = await service.createScenario({
          budgetId: budget.id,
          name: 'Line Items Scenario',
          type: 'most_likely',
          createdBy: userId,
        });

        expect(scenario.lineItems.length).toBe(2);
        scenario.lineItems.forEach(li => {
          expect(li.adjustedAmount).toBeDefined();
        });
      });

      it('should throw error for non-existent budget', async () => {
        await expect(
          service.createScenario({
            budgetId: 'non-existent',
            name: 'Test',
            type: 'best_case',
            createdBy: userId,
          }),
        ).rejects.toThrow('Budget not found');
      });
    });

    describe('getScenarios', () => {
      it('should return scenarios for budget', async () => {
        await service.createScenario({
          budgetId: budget.id,
          name: 'Scenario 1',
          type: 'best_case',
          createdBy: userId,
        });

        await service.createScenario({
          budgetId: budget.id,
          name: 'Scenario 2',
          type: 'worst_case',
          createdBy: userId,
        });

        const scenarios = await service.getScenarios(budget.id);

        expect(scenarios.length).toBe(2);
        scenarios.forEach(s => {
          expect(s.budgetId).toBe(budget.id);
        });
      });
    });

    describe('compareScenarios', () => {
      beforeEach(async () => {
        await service.createScenario({
          budgetId: budget.id,
          name: 'Best Case',
          type: 'best_case',
          createdBy: userId,
        });

        await service.createScenario({
          budgetId: budget.id,
          name: 'Worst Case',
          type: 'worst_case',
          createdBy: userId,
        });
      });

      it('should compare scenarios to baseline', async () => {
        const comparison = await service.compareScenarios(budget.id);

        expect(comparison.baseline).toBeDefined();
        expect(comparison.baseline.totalAmount).toBe(80000);
        expect(comparison.scenarios.length).toBe(2);
      });

      it('should calculate differences', async () => {
        const comparison = await service.compareScenarios(budget.id);

        comparison.scenarios.forEach(s => {
          expect(s.difference).toBeDefined();
          expect(s.percentDifference).toBeDefined();
        });
      });

      it('should throw error for non-existent budget', async () => {
        await expect(service.compareScenarios('non-existent')).rejects.toThrow();
      });
    });
  });

  describe('Version Control', () => {
    let budget: Budget;

    beforeEach(async () => {
      budget = await service.createBudget({
        tenantId,
        name: 'Versioned Budget',
        type: 'operating',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 100000,
        createdBy: userId,
      });

      await service.addLineItem({
        budgetId: budget.id,
        categoryId: 'cat-sal',
        categoryName: 'Salaries',
        plannedAmount: 50000,
      });
    });

    describe('createNewVersion', () => {
      it('should create new version of budget', async () => {
        const newVersion = await service.createNewVersion(budget.id, userId);

        expect(newVersion).toBeDefined();
        expect(newVersion.id).not.toBe(budget.id);
        expect(newVersion.version).toBe(2);
        expect(newVersion.previousVersionId).toBe(budget.id);
        expect(newVersion.status).toBe('draft');
      });

      it('should copy line items', async () => {
        const newVersion = await service.createNewVersion(budget.id, userId);

        const lineItems = await service.getLineItems(newVersion.id);

        expect(lineItems.length).toBe(1);
        expect(lineItems[0].categoryName).toBe('Salaries');
        expect(lineItems[0].plannedAmount).toBe(50000);
      });

      it('should emit event', async () => {
        await service.createNewVersion(budget.id, userId);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          'budget.version_created',
          expect.any(Object),
        );
      });

      it('should throw error for non-existent budget', async () => {
        await expect(
          service.createNewVersion('non-existent', userId),
        ).rejects.toThrow('Budget not found');
      });
    });

    describe('getVersionHistory', () => {
      it('should return version history', async () => {
        const v2 = await service.createNewVersion(budget.id, userId);
        const v3 = await service.createNewVersion(v2.id, userId);

        const history = await service.getVersionHistory(v3.id);

        expect(history.length).toBe(3);
        expect(history[0].version).toBe(3);
        expect(history[1].version).toBe(2);
        expect(history[2].version).toBe(1);
      });

      it('should return single item for budget without previous versions', async () => {
        const history = await service.getVersionHistory(budget.id);

        expect(history.length).toBe(1);
        expect(history[0].id).toBe(budget.id);
      });
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      const b1 = await service.createBudget({
        tenantId,
        name: 'Active Budget',
        type: 'operating',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 100000,
        createdBy: userId,
      });

      await service.addLineItem({
        budgetId: b1.id,
        categoryId: 'cat-1',
        categoryName: 'Expense',
        plannedAmount: 50000,
      });

      await service.createBudget({
        tenantId,
        name: 'Capital Budget',
        type: 'capital',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 200000,
        createdBy: userId,
      });
    });

    describe('getBudgetStatistics', () => {
      it('should return budget statistics', async () => {
        const stats = await service.getBudgetStatistics(tenantId);

        expect(stats).toBeDefined();
        expect(stats.totalBudgets).toBeGreaterThanOrEqual(2);
        expect(stats.totalPlanned).toBeGreaterThanOrEqual(300000);
      });

      it('should count by status', async () => {
        const stats = await service.getBudgetStatistics(tenantId);

        expect(stats.byStatus).toBeDefined();
        expect(stats.byStatus.draft).toBeGreaterThanOrEqual(2);
      });

      it('should count by type', async () => {
        const stats = await service.getBudgetStatistics(tenantId);

        expect(stats.byType).toBeDefined();
        expect(stats.byType.operating).toBeGreaterThanOrEqual(1);
        expect(stats.byType.capital).toBeGreaterThanOrEqual(1);
      });

      it('should calculate utilization rate', async () => {
        const stats = await service.getBudgetStatistics(tenantId);

        expect(typeof stats.utilizationRate).toBe('number');
        expect(stats.utilizationRate).toBeGreaterThanOrEqual(0);
        expect(stats.utilizationRate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Romanian Compliance', () => {
    it('should default to RON currency', async () => {
      const budget = await service.createBudget({
        tenantId,
        name: 'RON Budget',
        type: 'operating',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 100000,
        createdBy: userId,
      });

      expect(budget.currency).toBe('RON');
    });

    it('should support Romanian fiscal year format', async () => {
      const budget = await service.createBudget({
        tenantId,
        name: 'Fiscal Year Budget',
        type: 'operating',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 100000,
        createdBy: userId,
      });

      expect(budget.fiscalYear).toBe('2025');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero budget amount', async () => {
      const budget = await service.createBudget({
        tenantId,
        name: 'Zero Budget',
        type: 'operating',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 0,
        createdBy: userId,
      });

      expect(budget.totalAmount).toBe(0);
      expect(budget.remainingAmount).toBe(0);
    });

    it('should handle very large amounts', async () => {
      const largeAmount = 1000000000; // 1 billion RON

      const budget = await service.createBudget({
        tenantId,
        name: 'Large Budget',
        type: 'master',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: largeAmount,
        createdBy: userId,
      });

      expect(budget.totalAmount).toBe(largeAmount);
    });

    it('should handle special characters in names', async () => {
      const budget = await service.createBudget({
        tenantId,
        name: 'Buget 2025 - Departament IT & Dezvoltare',
        description: 'Buget pentru echipamente și servicii',
        type: 'departmental',
        fiscalYear: '2025',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        totalAmount: 100000,
        createdBy: userId,
      });

      expect(budget.name).toContain('&');
      expect(budget.description).toContain('ș');
    });

    it('should handle same start and end date', async () => {
      const date = new Date('2025-06-15');

      const budget = await service.createBudget({
        tenantId,
        name: 'Single Day Budget',
        type: 'project',
        fiscalYear: '2025',
        startDate: date,
        endDate: date,
        totalAmount: 10000,
        createdBy: userId,
      });

      expect(budget.startDate.getTime()).toBe(budget.endDate.getTime());
    });
  });
});
