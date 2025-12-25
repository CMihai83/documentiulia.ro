import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FleetFinanceIntegrationService, ExpenseCategory } from './fleet-finance-integration.service';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';

describe('FleetFinanceIntegrationService', () => {
  let service: FleetFinanceIntegrationService;
  let prismaService: PrismaService;
  let financeService: FinanceService;

  const mockUserId = 'user-123';
  const mockVehicleId = 'vehicle-123';
  const mockRouteId = 'route-123';

  const mockVehicle = {
    id: mockVehicleId,
    userId: mockUserId,
    licensePlate: 'M-FL 1234',
  };

  const mockRoute = {
    id: mockRouteId,
    userId: mockUserId,
    routeDate: new Date(),
    plannedDistanceKm: 85,
    actualDistanceKm: 90,
    stops: [{ id: 'stop-1' }, { id: 'stop-2' }, { id: 'stop-3' }],
    vehicle: mockVehicle,
  };

  const mockFuelLog = {
    id: 'fuel-1',
    userId: mockUserId,
    vehicleId: mockVehicleId,
    fuelDate: new Date(),
    liters: 50,
    totalCost: 90,
  };

  const mockMaintenanceLog = {
    id: 'maint-1',
    userId: mockUserId,
    vehicleId: mockVehicleId,
    maintenanceDate: new Date(),
    totalCost: 250,
  };

  const mockPrismaService = {
    vehicle: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    deliveryRoute: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    fuelLog: {
      findMany: jest.fn(),
    },
    maintenanceLog: {
      findMany: jest.fn(),
    },
  };

  const mockFinanceService = {
    calculateVAT: jest.fn(),
    calculateGermanVAT: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetFinanceIntegrationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FinanceService,
          useValue: mockFinanceService,
        },
      ],
    }).compile();

    service = module.get<FleetFinanceIntegrationService>(FleetFinanceIntegrationService);
    prismaService = module.get<PrismaService>(PrismaService);
    financeService = module.get<FinanceService>(FinanceService);

    jest.clearAllMocks();
  });

  describe('getFleetCostSummary', () => {
    beforeEach(() => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);
      mockPrismaService.fuelLog.findMany.mockResolvedValue([mockFuelLog]);
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([mockMaintenanceLog]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);
      mockPrismaService.vehicle.count.mockResolvedValue(5);
    });

    it('should return fleet cost summary', async () => {
      const result = await service.getFleetCostSummary(mockUserId);

      expect(result).toBeDefined();
      expect(result.totalCosts).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.fuel).toBe(90);
      expect(result.breakdown.maintenance).toBe(250);
      expect(result.currency).toBe('EUR');
    });

    it('should calculate cost per km', async () => {
      const result = await service.getFleetCostSummary(mockUserId);

      expect(result.perKm).toBeGreaterThan(0);
    });

    it('should calculate cost per route', async () => {
      const result = await service.getFleetCostSummary(mockUserId);

      expect(result.perRoute).toBeGreaterThan(0);
    });

    it('should calculate cost per delivery', async () => {
      const result = await service.getFleetCostSummary(mockUserId);

      expect(result.perDelivery).toBeGreaterThan(0);
    });

    it('should filter by vehicle IDs', async () => {
      await service.getFleetCostSummary(mockUserId, {
        vehicleIds: [mockVehicleId],
      });

      expect(mockPrismaService.fuelLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            vehicleId: { in: [mockVehicleId] },
          }),
        }),
      );
    });
  });

  describe('getVehicleCostReport', () => {
    beforeEach(() => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.fuelLog.findMany.mockResolvedValue([mockFuelLog]);
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([mockMaintenanceLog]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);
    });

    it('should return vehicle cost report', async () => {
      const result = await service.getVehicleCostReport(mockUserId, mockVehicleId);

      expect(result).toBeDefined();
      expect(result.vehicleId).toBe(mockVehicleId);
      expect(result.licensePlate).toBe('M-FL 1234');
      expect(result.costs.fuel).toBe(90);
      expect(result.costs.maintenance).toBe(250);
      expect(result.costs.total).toBeGreaterThan(0);
    });

    it('should throw if vehicle not found', async () => {
      mockPrismaService.vehicle.findFirst.mockResolvedValue(null);

      await expect(
        service.getVehicleCostReport(mockUserId, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate cost per km', async () => {
      const result = await service.getVehicleCostReport(mockUserId, mockVehicleId);

      expect(result.costPerKm).toBeGreaterThan(0);
    });

    it('should calculate profit margin', async () => {
      const result = await service.getVehicleCostReport(mockUserId, mockVehicleId);

      expect(result.profitMargin).toBeDefined();
    });
  });

  describe('getVehiclesCostComparison', () => {
    it('should compare costs across vehicles', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([
        mockVehicle,
        { ...mockVehicle, id: 'vehicle-456', licensePlate: 'M-FL 5678' },
      ]);
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.fuelLog.findMany.mockResolvedValue([mockFuelLog]);
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([mockMaintenanceLog]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);

      const result = await service.getVehiclesCostComparison(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('costPerKm');
    });
  });

  describe('getRouteProfitability', () => {
    it('should calculate route profitability', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);

      const result = await service.getRouteProfitability(mockUserId, mockRouteId);

      expect(result).toBeDefined();
      expect(result.routeId).toBe(mockRouteId);
      expect(result.revenue).toBeGreaterThan(0);
      expect(result.costs.total).toBeGreaterThan(0);
      expect(result.profitMargin).toBeDefined();
    });

    it('should throw if route not found', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(null);

      await expect(
        service.getRouteProfitability(mockUserId, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate profit per km', async () => {
      mockPrismaService.deliveryRoute.findFirst.mockResolvedValue(mockRoute);

      const result = await service.getRouteProfitability(mockUserId, mockRouteId);

      expect(result.profitPerKm).toBeDefined();
      expect(result.distanceKm).toBeGreaterThan(0);
    });
  });

  describe('getCustomerProfitability', () => {
    it('should calculate customer profitability', async () => {
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);

      const result = await service.getCustomerProfitability(mockUserId, 'customer-123');

      expect(result).toBeDefined();
      expect(result.customerId).toBe('customer-123');
      expect(result.totalRoutes).toBeGreaterThanOrEqual(0);
      expect(result.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(result.profitMargin).toBeDefined();
    });
  });

  describe('createExpense', () => {
    it('should create an expense entry', async () => {
      const result = await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'FUEL',
        description: 'Diesel tankfüllung',
        amount: 100,
        vehicleId: mockVehicleId,
      });

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^exp-/);
      expect(result.category).toBe('FUEL');
      expect(result.amount).toBe(100);
      expect(result.status).toBe('PENDING');
    });

    it('should calculate VAT correctly', async () => {
      const result = await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'MAINTENANCE',
        description: 'Ölwechsel',
        amount: 100,
        vatRate: 19,
      });

      expect(result.vatAmount).toBe(19);
      expect(result.grossAmount).toBe(119);
    });

    it('should use default VAT rate if not provided', async () => {
      const result = await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'REPAIRS',
        description: 'Reifenwechsel',
        amount: 200,
      });

      expect(result.vatAmount).toBe(38); // 19% of 200
    });
  });

  describe('getExpenses', () => {
    beforeEach(async () => {
      await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'FUEL',
        description: 'Expense 1',
        amount: 50,
      });
      await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'MAINTENANCE',
        description: 'Expense 2',
        amount: 100,
      });
    });

    it('should return all expenses', async () => {
      const result = await service.getExpenses(mockUserId);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by category', async () => {
      const result = await service.getExpenses(mockUserId, { category: 'FUEL' });

      expect(result.every(e => e.category === 'FUEL')).toBe(true);
    });

    it('should filter by status', async () => {
      const result = await service.getExpenses(mockUserId, { status: 'PENDING' });

      expect(result.every(e => e.status === 'PENDING')).toBe(true);
    });
  });

  describe('approveExpense', () => {
    it('should approve a pending expense', async () => {
      const expense = await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'FUEL',
        description: 'Test expense',
        amount: 50,
      });

      const result = await service.approveExpense(mockUserId, expense.id);

      expect(result).toBeDefined();
      expect(result?.status).toBe('APPROVED');
    });

    it('should return null for non-existent expense', async () => {
      const result = await service.approveExpense(mockUserId, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('postExpenseToAccounting', () => {
    it('should post approved expense to accounting', async () => {
      const expense = await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'FUEL',
        description: 'Test expense',
        amount: 50,
      });

      await service.approveExpense(mockUserId, expense.id);
      const result = await service.postExpenseToAccounting(mockUserId, expense.id);

      expect(result.success).toBe(true);
      expect(result.journalEntryId).toBeDefined();
    });

    it('should fail for non-approved expense', async () => {
      const expense = await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'FUEL',
        description: 'Test expense',
        amount: 50,
      });

      await expect(
        service.postExpenseToAccounting(mockUserId, expense.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createBudget', () => {
    it('should create a budget', async () => {
      const result = await service.createBudget(mockUserId, {
        period: '2025-12',
        budgetedAmount: 10000,
        allocations: {
          FUEL: 4000,
          MAINTENANCE: 2000,
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^budget-/);
      expect(result.budgetedAmount).toBe(10000);
      expect(result.allocations.FUEL).toBe(4000);
    });

    it('should initialize remaining amount', async () => {
      const result = await service.createBudget(mockUserId, {
        period: '2025-12',
        budgetedAmount: 5000,
        allocations: {},
      });

      expect(result.remaining).toBe(5000);
      expect(result.actualSpent).toBe(0);
    });
  });

  describe('getBudgetWithActuals', () => {
    it('should return budget with actual spending', async () => {
      await service.createBudget(mockUserId, {
        period: '2025-12',
        budgetedAmount: 10000,
        allocations: {},
      });

      const result = await service.getBudgetWithActuals(mockUserId, '2025-12');

      expect(result).toBeDefined();
      expect(result?.budgetedAmount).toBe(10000);
      expect(result?.actualSpent).toBeDefined();
      expect(result?.variance).toBeDefined();
    });

    it('should return null for non-existent budget', async () => {
      const result = await service.getBudgetWithActuals(mockUserId, '2020-01');

      expect(result).toBeNull();
    });
  });

  describe('calculateFleetVAT', () => {
    it('should calculate VAT summary', async () => {
      // Create and post some expenses
      const expense = await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'FUEL',
        description: 'Fuel expense',
        amount: 100,
      });
      await service.approveExpense(mockUserId, expense.id);
      await service.postExpenseToAccounting(mockUserId, expense.id);

      const result = await service.calculateFleetVAT(mockUserId);

      expect(result).toBeDefined();
      expect(result.totalNet).toBeGreaterThanOrEqual(0);
      expect(result.totalVAT).toBeGreaterThanOrEqual(0);
      expect(result.totalGross).toBeGreaterThanOrEqual(0);
      expect(result.byCategory).toBeDefined();
    });
  });

  describe('getFinancialDashboard', () => {
    beforeEach(() => {
      mockPrismaService.fuelLog.findMany.mockResolvedValue([mockFuelLog]);
      mockPrismaService.maintenanceLog.findMany.mockResolvedValue([mockMaintenanceLog]);
      mockPrismaService.deliveryRoute.findMany.mockResolvedValue([mockRoute]);
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);
      mockPrismaService.vehicle.findFirst.mockResolvedValue(mockVehicle);
      mockPrismaService.vehicle.count.mockResolvedValue(5);
    });

    it('should return financial dashboard data', async () => {
      const result = await service.getFinancialDashboard(mockUserId);

      expect(result).toBeDefined();
      expect(result.costSummary).toBeDefined();
      expect(result.topCostVehicles).toBeDefined();
      expect(result.pendingExpenses).toBeDefined();
      expect(result.vatSummary).toBeDefined();
      expect(result.kpis).toBeDefined();
    });

    it('should include KPIs', async () => {
      const result = await service.getFinancialDashboard(mockUserId);

      expect(result.kpis.avgCostPerKm).toBeDefined();
      expect(result.kpis.avgCostPerRoute).toBeDefined();
      expect(result.kpis.avgProfitMargin).toBeDefined();
    });
  });

  describe('exportForAccounting', () => {
    beforeEach(async () => {
      const expense = await service.createExpense(mockUserId, {
        date: new Date(),
        category: 'FUEL',
        description: 'Export test',
        amount: 100,
      });
      await service.approveExpense(mockUserId, expense.id);
      await service.postExpenseToAccounting(mockUserId, expense.id);
    });

    it('should export as CSV', async () => {
      const result = await service.exportForAccounting(mockUserId, { format: 'CSV' });

      expect(result.format).toBe('CSV');
      expect(result.data).toContain('Date');
      expect(result.data).toContain('Category');
      expect(result.filename).toMatch(/\.csv$/);
    });

    it('should export as JSON', async () => {
      const result = await service.exportForAccounting(mockUserId, { format: 'JSON' });

      expect(result.format).toBe('JSON');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should export as DATEV format', async () => {
      const result = await service.exportForAccounting(mockUserId, { format: 'DATEV' });

      expect(result.format).toBe('DATEV');
      expect(Array.isArray(result.data)).toBe(true);
      if (result.data.length > 0) {
        expect(result.data[0]).toHaveProperty('Umsatz');
        expect(result.data[0]).toHaveProperty('Konto');
      }
    });

    it('should include record count', async () => {
      const result = await service.exportForAccounting(mockUserId);

      expect(result.recordCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('expense categories', () => {
    it('should support all expense categories', async () => {
      const categories: ExpenseCategory[] = [
        'FUEL',
        'MAINTENANCE',
        'REPAIRS',
        'INSURANCE',
        'TOLLS',
        'PARKING',
        'CLEANING',
        'DEPRECIATION',
        'DRIVER_SALARY',
        'DRIVER_ALLOWANCE',
        'OTHER',
      ];

      for (const category of categories) {
        const expense = await service.createExpense(mockUserId, {
          date: new Date(),
          category,
          description: `${category} expense`,
          amount: 100,
        });

        expect(expense.category).toBe(category);
      }
    });
  });
});
