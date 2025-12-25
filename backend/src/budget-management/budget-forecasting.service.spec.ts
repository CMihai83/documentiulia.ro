import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BudgetForecastingService,
  ForecastMethod,
  ForecastPeriod,
  ScenarioAdjustment,
} from './budget-forecasting.service';
import { BudgetPlanningService } from './budget-planning.service';
import { BudgetTrackingService } from './budget-tracking.service';
import { BudgetVarianceService } from './budget-variance.service';

describe('BudgetForecastingService', () => {
  let service: BudgetForecastingService;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;
  let mockBudgetService: jest.Mocked<BudgetPlanningService>;
  let mockTrackingService: jest.Mocked<BudgetTrackingService>;
  let mockVarianceService: jest.Mocked<BudgetVarianceService>;

  const tenantId = 'tenant-123';
  const budgetId = 'budget-456';
  const userId = 'user-789';

  const mockBudget: any = {
    id: budgetId,
    tenantId,
    name: 'Marketing Budget 2025',
    type: 'expense',
    allocatedAmount: 120000,
    spentAmount: 30000,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
    status: 'active',
  };

  const mockTransactions: any[] = [
    { id: 'tx-1', budgetId, amount: 10000, transactionDate: new Date('2025-09-15'), status: 'posted' },
    { id: 'tx-2', budgetId, amount: 10500, transactionDate: new Date('2025-10-15'), status: 'posted' },
    { id: 'tx-3', budgetId, amount: 9500, transactionDate: new Date('2025-11-15'), status: 'posted' },
  ];

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    mockBudgetService = {
      getBudget: jest.fn().mockResolvedValue(mockBudget),
      getBudgets: jest.fn().mockResolvedValue({
        budgets: [
          { ...mockBudget, type: 'revenue', name: 'Sales Revenue', allocatedAmount: 240000 },
          { ...mockBudget, type: 'expense', name: 'Operating Costs', allocatedAmount: 120000 },
        ],
        total: 2,
      }),
    } as any;

    mockTrackingService = {
      getTransactions: jest.fn().mockResolvedValue(mockTransactions),
    } as any;

    mockVarianceService = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetForecastingService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: BudgetPlanningService, useValue: mockBudgetService },
        { provide: BudgetTrackingService, useValue: mockTrackingService },
        { provide: BudgetVarianceService, useValue: mockVarianceService },
      ],
    }).compile();

    service = module.get<BudgetForecastingService>(BudgetForecastingService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // =================== BUDGET FORECASTING ===================

  describe('createForecast', () => {
    it('should create a budget forecast with default parameters', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast).toBeDefined();
      expect(forecast.id).toContain('forecast-');
      expect(forecast.tenantId).toBe(tenantId);
      expect(forecast.budgetId).toBe(budgetId);
      expect(forecast.method).toBe('moving_average'); // default
      expect(forecast.period).toBe('monthly'); // default
      expect(forecast.horizonPeriods).toBe(6); // default
      expect(forecast.createdBy).toBe(userId);
    });

    it('should throw error if budget not found', async () => {
      mockBudgetService.getBudget.mockResolvedValue(null);

      await expect(
        service.createForecast({ tenantId, budgetId, createdBy: userId }),
      ).rejects.toThrow('Budget not found');
    });

    it('should create forecast with linear method', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        method: 'linear',
        createdBy: userId,
      });

      expect(forecast.method).toBe('linear');
      expect(forecast.predictions.length).toBeGreaterThan(0);
    });

    it('should create forecast with exponential method', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        method: 'exponential',
        createdBy: userId,
      });

      expect(forecast.method).toBe('exponential');
    });

    it('should create forecast with seasonal method', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        method: 'seasonal',
        createdBy: userId,
      });

      expect(forecast.method).toBe('seasonal');
    });

    it('should create forecast with ai_enhanced method', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        method: 'ai_enhanced',
        createdBy: userId,
      });

      expect(forecast.method).toBe('ai_enhanced');
    });

    it('should support weekly period', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        period: 'weekly',
        horizonPeriods: 4,
        createdBy: userId,
      });

      expect(forecast.period).toBe('weekly');
      expect(forecast.predictions[0].period).toContain('-W');
    });

    it('should support quarterly period', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        period: 'quarterly',
        horizonPeriods: 4,
        createdBy: userId,
      });

      expect(forecast.period).toBe('quarterly');
      expect(forecast.predictions[0].period).toContain('-Q');
    });

    it('should support annual period', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        period: 'annual',
        horizonPeriods: 3,
        createdBy: userId,
      });

      expect(forecast.period).toBe('annual');
    });

    it('should generate correct number of predictions', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        horizonPeriods: 12,
        createdBy: userId,
      });

      expect(forecast.predictions.length).toBe(12);
    });

    it('should emit forecast_created event', async () => {
      await service.createForecast({ tenantId, budgetId, createdBy: userId });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'budget.forecast_created',
        expect.objectContaining({ forecast: expect.any(Object) }),
      );
    });

    it('should include budget name in forecast', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast.budgetName).toBe(mockBudget.name);
    });
  });

  describe('Forecast Predictions', () => {
    it('should include period start and end dates', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      const prediction = forecast.predictions[0];
      expect(prediction.periodStart).toBeInstanceOf(Date);
      expect(prediction.periodEnd).toBeInstanceOf(Date);
      expect(prediction.periodEnd.getTime()).toBeGreaterThan(prediction.periodStart.getTime());
    });

    it('should include confidence bounds', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      const prediction = forecast.predictions[0];
      expect(prediction.lowerBound).toBeDefined();
      expect(prediction.upperBound).toBeDefined();
      expect(prediction.upperBound).toBeGreaterThanOrEqual(prediction.lowerBound);
    });

    it('should have decreasing confidence over time', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        horizonPeriods: 6,
        createdBy: userId,
      });

      expect(forecast.predictions[0].confidenceLevel).toBeGreaterThan(
        forecast.predictions[5].confidenceLevel,
      );
    });

    it('should produce non-negative predictions', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      forecast.predictions.forEach(p => {
        expect(p.predictedSpending).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Forecast Summary', () => {
    it('should calculate total predicted spending', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      const expectedTotal = forecast.predictions.reduce(
        (sum, p) => sum + p.predictedSpending,
        0,
      );
      expect(Math.abs(forecast.summary.totalPredictedSpending - expectedTotal)).toBeLessThan(1);
    });

    it('should calculate burn rate', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast.summary.burnRate).toBeGreaterThan(0);
      const expectedBurnRate = forecast.summary.totalPredictedSpending / forecast.predictions.length;
      expect(Math.abs(forecast.summary.burnRate - expectedBurnRate)).toBeLessThan(1);
    });

    it('should calculate remaining budget', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      const expectedRemaining = mockBudget.allocatedAmount - mockBudget.spentAmount;
      expect(forecast.summary.totalBudgetRemaining).toBe(expectedRemaining);
    });

    it('should calculate runway periods', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast.summary.runwayPeriods).toBeGreaterThan(0);
    });
  });

  describe('Forecast with No History', () => {
    beforeEach(() => {
      mockTrackingService.getTransactions.mockResolvedValue([]);
    });

    it('should handle no historical data', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast.predictions.length).toBeGreaterThan(0);
      expect(forecast.basedOnHistory).toBe(0);
    });

    it('should use budget allocation as base when no history', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      // Should base on allocatedAmount / 12
      const monthlyAllocation = mockBudget.allocatedAmount / 12;
      expect(forecast.predictions[0].predictedSpending).toBe(monthlyAllocation);
    });
  });

  describe('Accuracy Metrics', () => {
    it('should calculate accuracy when history >= 3 periods', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast.accuracy).toBeDefined();
      expect(forecast.accuracy?.mape).toBeDefined();
      expect(forecast.accuracy?.rmse).toBeDefined();
      expect(forecast.accuracy?.mse).toBeDefined();
      expect(forecast.accuracy?.accuracy).toBeDefined();
    });

    it('should not calculate accuracy when history < 3 periods', async () => {
      mockTrackingService.getTransactions.mockResolvedValue([
        { id: 'tx-1', budgetId, amount: 10000, transactionDate: new Date('2025-11-15'), status: 'posted' } as any,
      ]);

      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast.accuracy).toBeUndefined();
    });

    it('should classify accuracy as high when MAPE < 10', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      if (forecast.accuracy && forecast.accuracy.mape < 10) {
        expect(forecast.accuracy.accuracy).toBe('high');
      }
    });
  });

  describe('Forecast Risks', () => {
    it('should identify overspending risk when projected balance negative', async () => {
      mockBudgetService.getBudget.mockResolvedValue({
        ...mockBudget,
        allocatedAmount: 50000, // Lower allocation to trigger overspending
        spentAmount: 45000,
      } as any);

      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        horizonPeriods: 12,
        createdBy: userId,
      });

      const overspendingRisk = forecast.risks?.find(r => r.type === 'overspending');
      expect(overspendingRisk).toBeDefined();
    });

    it('should include mitigation suggestions', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      forecast.risks?.forEach(risk => {
        expect(risk.mitigation).toBeDefined();
      });
    });

    it('should include risk probability and impact', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      forecast.risks?.forEach(risk => {
        expect(['low', 'medium', 'high']).toContain(risk.probability);
        expect(typeof risk.impact).toBe('number');
      });
    });
  });

  describe('Assumptions', () => {
    it('should generate assumptions based on method', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        method: 'linear',
        createdBy: userId,
      });

      expect(forecast.assumptions).toBeDefined();
      expect(forecast.assumptions?.some(a => a.includes('linear'))).toBe(true);
    });

    it('should include history periods in assumptions', async () => {
      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast.assumptions?.some(a => a.includes('historical data'))).toBe(true);
    });
  });

  describe('getForecast', () => {
    it('should retrieve forecast by id', async () => {
      const created = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      const retrieved = await service.getForecast(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent id', async () => {
      const result = await service.getForecast('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getForecasts', () => {
    it('should return forecasts for tenant', async () => {
      await service.createForecast({ tenantId, budgetId, createdBy: userId });
      await service.createForecast({ tenantId, budgetId, createdBy: userId });

      const forecasts = await service.getForecasts(tenantId);

      expect(forecasts.length).toBe(2);
    });

    it('should filter by budgetId', async () => {
      await service.createForecast({ tenantId, budgetId, createdBy: userId });
      await service.createForecast({ tenantId, budgetId: 'other-budget', createdBy: userId });

      const forecasts = await service.getForecasts(tenantId, budgetId);

      expect(forecasts.length).toBe(1);
      expect(forecasts[0].budgetId).toBe(budgetId);
    });

    it('should respect limit parameter', async () => {
      await service.createForecast({ tenantId, budgetId, createdBy: userId });
      await service.createForecast({ tenantId, budgetId, createdBy: userId });
      await service.createForecast({ tenantId, budgetId, createdBy: userId });

      const forecasts = await service.getForecasts(tenantId, undefined, 2);

      expect(forecasts.length).toBe(2);
    });

    it('should sort by creation date descending', async () => {
      await service.createForecast({ tenantId, budgetId, createdBy: userId });
      await service.createForecast({ tenantId, budgetId, createdBy: userId });

      const forecasts = await service.getForecasts(tenantId);

      expect(forecasts[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        forecasts[1].createdAt.getTime(),
      );
    });
  });

  // =================== WHAT-IF SCENARIOS ===================

  describe('createWhatIfScenario', () => {
    it('should create scenario with percentage adjustment', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: '10% Cost Increase',
        adjustments: [{ type: 'percentage', adjustmentValue: 10 }],
        createdBy: userId,
      });

      expect(scenario).toBeDefined();
      expect(scenario.id).toContain('scenario-');
      expect(scenario.name).toBe('10% Cost Increase');
      expect(scenario.results.comparison.percentageDifference).toBeCloseTo(10, 0);
    });

    it('should create scenario with fixed adjustment', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Extra 5000/month',
        adjustments: [{ type: 'fixed', adjustmentValue: 5000 }],
        createdBy: userId,
      });

      expect(scenario.results.impactSummary.totalImpact).toBeGreaterThan(0);
    });

    it('should create scenario with category adjustment', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Category Adjustment',
        adjustments: [
          { type: 'category', categoryId: 'cat-1', adjustmentValue: 1000 },
        ],
        createdBy: userId,
      });

      expect(scenario.adjustments[0].type).toBe('category');
    });

    it('should apply multiple adjustments', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Multiple Adjustments',
        adjustments: [
          { type: 'percentage', adjustmentValue: 5 },
          { type: 'fixed', adjustmentValue: 1000 },
        ],
        createdBy: userId,
      });

      expect(scenario.adjustments.length).toBe(2);
    });

    it('should include comparison with base forecast', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Test Scenario',
        adjustments: [{ type: 'percentage', adjustmentValue: 15 }],
        createdBy: userId,
      });

      expect(scenario.results.comparison).toBeDefined();
      expect(scenario.results.comparison.baseTotal).toBeGreaterThan(0);
      expect(scenario.results.comparison.adjustedTotal).toBeGreaterThan(0);
      expect(scenario.results.comparison.difference).toBeDefined();
    });

    it('should calculate period impacts', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Period Impact Test',
        adjustments: [{ type: 'fixed', adjustmentValue: 500 }],
        createdBy: userId,
      });

      expect(scenario.results.impactSummary.periodImpacts.length).toBeGreaterThan(0);
      scenario.results.impactSummary.periodImpacts.forEach(pi => {
        expect(pi.period).toBeDefined();
        expect(typeof pi.impact).toBe('number');
      });
    });

    it('should use existing forecast as base when provided', async () => {
      const baseForecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Based on Existing',
        baseForecastId: baseForecast.id,
        adjustments: [{ type: 'percentage', adjustmentValue: 10 }],
        createdBy: userId,
      });

      expect(scenario.baseForecaseId).toBe(baseForecast.id);
    });

    it('should emit scenario_created event', async () => {
      await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Event Test',
        adjustments: [{ type: 'fixed', adjustmentValue: 100 }],
        createdBy: userId,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'budget.scenario_created',
        expect.objectContaining({ scenario: expect.any(Object) }),
      );
    });

    it('should include description when provided', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Described Scenario',
        description: 'Testing cost increase for Q2',
        adjustments: [{ type: 'percentage', adjustmentValue: 5 }],
        createdBy: userId,
      });

      expect(scenario.description).toBe('Testing cost increase for Q2');
    });

    it('should apply period-specific adjustments', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Period Specific',
        adjustments: [
          { type: 'fixed', adjustmentValue: 10000, effectivePeriod: '2026-01' },
        ],
        createdBy: userId,
      });

      // Only one period should be affected
      const nonZeroImpacts = scenario.results.impactSummary.periodImpacts.filter(
        pi => pi.impact !== 0,
      );
      expect(nonZeroImpacts.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getScenario', () => {
    it('should retrieve scenario by id', async () => {
      const created = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Find Me',
        adjustments: [{ type: 'percentage', adjustmentValue: 5 }],
        createdBy: userId,
      });

      const retrieved = await service.getScenario(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Find Me');
    });

    it('should return null for non-existent id', async () => {
      const result = await service.getScenario('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getScenarios', () => {
    it('should return scenarios for tenant', async () => {
      await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Scenario 1',
        adjustments: [{ type: 'fixed', adjustmentValue: 100 }],
        createdBy: userId,
      });
      await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Scenario 2',
        adjustments: [{ type: 'fixed', adjustmentValue: 200 }],
        createdBy: userId,
      });

      const scenarios = await service.getScenarios(tenantId);

      expect(scenarios.length).toBe(2);
    });

    it('should filter by budgetId', async () => {
      await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Budget A',
        adjustments: [{ type: 'fixed', adjustmentValue: 100 }],
        createdBy: userId,
      });
      await service.createWhatIfScenario({
        tenantId,
        budgetId: 'other-budget',
        name: 'Budget B',
        adjustments: [{ type: 'fixed', adjustmentValue: 100 }],
        createdBy: userId,
      });

      const scenarios = await service.getScenarios(tenantId, budgetId);

      expect(scenarios.length).toBe(1);
      expect(scenarios[0].budgetId).toBe(budgetId);
    });
  });

  // =================== CASH FLOW FORECASTING ===================

  describe('createCashFlowForecast', () => {
    it('should create cash flow forecast with defaults', async () => {
      const forecast = await service.createCashFlowForecast({ tenantId });

      expect(forecast).toBeDefined();
      expect(forecast.id).toContain('cashflow-');
      expect(forecast.period).toBe('monthly');
      expect(forecast.horizonPeriods).toBe(6);
    });

    it('should include inflows and outflows', async () => {
      const forecast = await service.createCashFlowForecast({ tenantId });

      forecast.predictions.forEach(p => {
        expect(p.expectedInflows).toBeDefined();
        expect(p.expectedOutflows).toBeDefined();
        expect(p.netCashFlow).toBe(p.expectedInflows - p.expectedOutflows);
      });
    });

    it('should track running balance', async () => {
      const initialBalance = 100000;
      const forecast = await service.createCashFlowForecast({
        tenantId,
        initialBalance,
      });

      expect(forecast.predictions[0].openingBalance).toBe(initialBalance);

      // Each period's closing becomes next period's opening
      for (let i = 1; i < forecast.predictions.length; i++) {
        expect(forecast.predictions[i].openingBalance).toBe(
          forecast.predictions[i - 1].closingBalance,
        );
      }
    });

    it('should calculate cash flow summary', async () => {
      const forecast = await service.createCashFlowForecast({ tenantId });

      expect(forecast.summary.totalInflows).toBeGreaterThanOrEqual(0);
      expect(forecast.summary.totalOutflows).toBeGreaterThanOrEqual(0);
      expect(forecast.summary.netPosition).toBe(
        forecast.summary.totalInflows - forecast.summary.totalOutflows,
      );
    });

    it('should identify lowest balance period', async () => {
      const forecast = await service.createCashFlowForecast({
        tenantId,
        initialBalance: 50000,
      });

      expect(forecast.summary.lowestBalancePeriod).toBeDefined();
      expect(forecast.summary.lowestBalanceAmount).toBeDefined();
    });

    it('should assess cash crunch risk', async () => {
      const forecast = await service.createCashFlowForecast({ tenantId });

      expect(['low', 'medium', 'high']).toContain(forecast.summary.cashCrunchRisk);
    });

    it('should set high risk when balance goes negative', async () => {
      // Set up budgets to cause negative cash flow
      mockBudgetService.getBudgets.mockResolvedValue({
        budgets: [
          { ...mockBudget, type: 'revenue', allocatedAmount: 10000 } as any,
          { ...mockBudget, type: 'expense', allocatedAmount: 200000 } as any,
        ],
        total: 2,
      });

      const forecast = await service.createCashFlowForecast({
        tenantId,
        initialBalance: 0,
      });

      expect(forecast.summary.cashCrunchRisk).toBe('high');
    });

    it('should include cash flow sources', async () => {
      const forecast = await service.createCashFlowForecast({ tenantId });

      forecast.predictions.forEach(p => {
        expect(p.sources).toBeDefined();
        expect(Array.isArray(p.sources)).toBe(true);
      });
    });

    it('should calculate source percentages', async () => {
      const forecast = await service.createCashFlowForecast({ tenantId });

      forecast.predictions.forEach(p => {
        const inflowSources = p.sources.filter(s => s.type === 'inflow');
        const outflowSources = p.sources.filter(s => s.type === 'outflow');

        if (inflowSources.length > 0) {
          const inflowPctTotal = inflowSources.reduce((sum, s) => sum + s.percentage, 0);
          expect(Math.abs(inflowPctTotal - 100)).toBeLessThan(5); // Allow rounding
        }
      });
    });

    it('should emit cashflow_forecast_created event', async () => {
      await service.createCashFlowForecast({ tenantId });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'budget.cashflow_forecast_created',
        expect.objectContaining({ forecast: expect.any(Object) }),
      );
    });

    it('should support different periods', async () => {
      const weekly = await service.createCashFlowForecast({
        tenantId,
        period: 'weekly',
      });
      const quarterly = await service.createCashFlowForecast({
        tenantId,
        period: 'quarterly',
      });

      expect(weekly.period).toBe('weekly');
      expect(quarterly.period).toBe('quarterly');
    });
  });

  describe('getCashFlowForecast', () => {
    it('should retrieve cash flow forecast by id', async () => {
      const created = await service.createCashFlowForecast({ tenantId });

      const retrieved = await service.getCashFlowForecast(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent id', async () => {
      const result = await service.getCashFlowForecast('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getCashFlowForecasts', () => {
    it('should return cash flow forecasts for tenant', async () => {
      await service.createCashFlowForecast({ tenantId });
      await service.createCashFlowForecast({ tenantId });

      const forecasts = await service.getCashFlowForecasts(tenantId);

      expect(forecasts.length).toBe(2);
    });

    it('should sort by creation date descending', async () => {
      await service.createCashFlowForecast({ tenantId });
      await service.createCashFlowForecast({ tenantId });

      const forecasts = await service.getCashFlowForecasts(tenantId);

      expect(forecasts[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        forecasts[1].createdAt.getTime(),
      );
    });
  });

  // =================== STATISTICS ===================

  describe('getForecastingStatistics', () => {
    it('should return comprehensive statistics', async () => {
      await service.createForecast({ tenantId, budgetId, createdBy: userId });
      await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Test',
        adjustments: [{ type: 'fixed', adjustmentValue: 100 }],
        createdBy: userId,
      });
      await service.createCashFlowForecast({ tenantId });

      const stats = await service.getForecastingStatistics(tenantId);

      expect(stats.totalForecasts).toBeGreaterThanOrEqual(1);
      expect(stats.totalScenarios).toBe(1);
      expect(stats.totalCashFlowForecasts).toBe(1);
    });

    it('should calculate method distribution', async () => {
      await service.createForecast({ tenantId, budgetId, method: 'linear', createdBy: userId });
      await service.createForecast({ tenantId, budgetId, method: 'linear', createdBy: userId });
      await service.createForecast({ tenantId, budgetId, method: 'seasonal', createdBy: userId });

      const stats = await service.getForecastingStatistics(tenantId);

      expect(stats.methodDistribution['linear']).toBe(2);
      expect(stats.methodDistribution['seasonal']).toBe(1);
    });

    it('should count recent forecasts', async () => {
      await service.createForecast({ tenantId, budgetId, createdBy: userId });
      await service.createForecast({ tenantId, budgetId, createdBy: userId });

      const stats = await service.getForecastingStatistics(tenantId);

      expect(stats.recentForecasts).toBe(2); // Created just now
    });

    it('should calculate average accuracy', async () => {
      await service.createForecast({ tenantId, budgetId, createdBy: userId });

      const stats = await service.getForecastingStatistics(tenantId);

      expect(typeof stats.averageAccuracy).toBe('number');
    });

    it('should return zeros for tenant with no data', async () => {
      const stats = await service.getForecastingStatistics('empty-tenant');

      expect(stats.totalForecasts).toBe(0);
      expect(stats.totalScenarios).toBe(0);
      expect(stats.totalCashFlowForecasts).toBe(0);
    });
  });

  // =================== EDGE CASES ===================

  describe('Edge Cases', () => {
    it('should handle single transaction history', async () => {
      mockTrackingService.getTransactions.mockResolvedValue([
        { id: 'tx-1', budgetId, amount: 5000, transactionDate: new Date(), status: 'posted' } as any,
      ]);

      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast.basedOnHistory).toBe(1);
      expect(forecast.predictions.length).toBeGreaterThan(0);
    });

    it('should ignore non-posted transactions', async () => {
      mockTrackingService.getTransactions.mockResolvedValue([
        { id: 'tx-1', budgetId, amount: 10000, transactionDate: new Date('2025-10-15'), status: 'posted' } as any,
        { id: 'tx-2', budgetId, amount: 99999, transactionDate: new Date('2025-11-15'), status: 'pending' } as any,
      ]);

      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      // Pending transaction should not affect forecast significantly
      expect(forecast.basedOnHistory).toBeLessThanOrEqual(1);
    });

    it('should handle zero budget allocation', async () => {
      mockBudgetService.getBudget.mockResolvedValue({
        ...mockBudget,
        allocatedAmount: 0,
      } as any);

      const forecast = await service.createForecast({
        tenantId,
        budgetId,
        createdBy: userId,
      });

      expect(forecast.summary.overUnderPercentage).toBe(0);
    });

    it('should handle scenario with negative percentage', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Cost Reduction',
        adjustments: [{ type: 'percentage', adjustmentValue: -20 }],
        createdBy: userId,
      });

      expect(scenario.results.comparison.adjustedTotal).toBeLessThan(
        scenario.results.comparison.baseTotal,
      );
    });

    it('should ensure predictions remain non-negative with large negative adjustment', async () => {
      const scenario = await service.createWhatIfScenario({
        tenantId,
        budgetId,
        name: 'Massive Cut',
        adjustments: [{ type: 'percentage', adjustmentValue: -200 }],
        createdBy: userId,
      });

      scenario.results.adjustedPredictions.forEach(p => {
        expect(p.predictedSpending).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
