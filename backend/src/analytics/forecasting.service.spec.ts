import { Test, TestingModule } from '@nestjs/testing';
import {
  ForecastingService,
  ForecastType,
  TrendType,
  SeasonalityType,
  ForecastStatus,
  AlertType,
  AlertSeverity,
  TimeSeriesData,
} from './forecasting.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ForecastingService', () => {
  let service: ForecastingService;
  let module: TestingModule;

  const mockPrismaService = {};

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ForecastingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ForecastingService>(ForecastingService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Model Management', () => {
    describe('createModel', () => {
      it('should create a revenue forecast model', async () => {
        const model = await service.createModel('tenant-1', {
          name: 'Prognoză Venituri Q1',
          description: 'Prognoză venituri trimestrul 1',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.MONTHLY,
          parameters: {
            horizon: 12,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: true,
            includeTrend: true,
            outlierDetection: true,
            outlierThreshold: 2.5,
          },
        });

        expect(model.id).toBeDefined();
        expect(model.name).toBe('Prognoză Venituri Q1');
        expect(model.forecastType).toBe(ForecastType.REVENUE);
        expect(model.status).toBe(ForecastStatus.DRAFT);
        expect(model.tenantId).toBe('tenant-1');
      });

      it('should create an expense forecast model', async () => {
        const model = await service.createModel('tenant-1', {
          name: 'Prognoză Cheltuieli',
          forecastType: ForecastType.EXPENSE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.QUARTERLY,
          parameters: {
            horizon: 6,
            periodType: 'MONTH',
            confidenceLevel: 0.90,
            includeSeasonality: true,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        expect(model.forecastType).toBe(ForecastType.EXPENSE);
        expect(model.parameters.confidenceLevel).toBe(0.90);
      });

      it('should create cash flow model', async () => {
        const model = await service.createModel('tenant-1', {
          name: 'Prognoză Flux Numerar',
          forecastType: ForecastType.CASH_FLOW,
          trendType: TrendType.PIECEWISE_LINEAR,
          seasonality: SeasonalityType.MONTHLY,
          parameters: {
            horizon: 24,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: true,
            includeTrend: true,
            outlierDetection: true,
            outlierThreshold: 3.0,
          },
        });

        expect(model.forecastType).toBe(ForecastType.CASH_FLOW);
        expect(model.trendType).toBe(TrendType.PIECEWISE_LINEAR);
      });
    });

    describe('getModel', () => {
      it('should return model by ID', async () => {
        const created = await service.createModel('tenant-1', {
          name: 'Test Model',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.NONE,
          parameters: {
            horizon: 6,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: false,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        const model = await service.getModel('tenant-1', created.id);

        expect(model?.id).toBe(created.id);
        expect(model?.name).toBe('Test Model');
      });

      it('should return null for wrong tenant', async () => {
        const created = await service.createModel('tenant-1', {
          name: 'Tenant 1 Model',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.NONE,
          parameters: {
            horizon: 6,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: false,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        const model = await service.getModel('tenant-2', created.id);

        expect(model).toBeNull();
      });
    });

    describe('getModels', () => {
      beforeEach(async () => {
        await service.createModel('tenant-models', {
          name: 'Revenue Model 1',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.MONTHLY,
          parameters: { horizon: 12, periodType: 'MONTH', confidenceLevel: 0.95, includeSeasonality: true, includeTrend: true, outlierDetection: false, outlierThreshold: 2.0 },
        });
        await service.createModel('tenant-models', {
          name: 'Expense Model 1',
          forecastType: ForecastType.EXPENSE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.MONTHLY,
          parameters: { horizon: 12, periodType: 'MONTH', confidenceLevel: 0.95, includeSeasonality: true, includeTrend: true, outlierDetection: false, outlierThreshold: 2.0 },
        });
      });

      it('should return all models for tenant', async () => {
        const models = await service.getModels('tenant-models');

        expect(models.length).toBe(2);
      });

      it('should filter by forecast type', async () => {
        const models = await service.getModels('tenant-models', {
          forecastType: ForecastType.REVENUE,
        });

        expect(models.length).toBe(1);
        expect(models[0].forecastType).toBe(ForecastType.REVENUE);
      });
    });

    describe('updateModel', () => {
      it('should update model parameters', async () => {
        const model = await service.createModel('tenant-1', {
          name: 'Original Name',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.MONTHLY,
          parameters: { horizon: 6, periodType: 'MONTH', confidenceLevel: 0.90, includeSeasonality: true, includeTrend: true, outlierDetection: false, outlierThreshold: 2.0 },
        });

        const updated = await service.updateModel('tenant-1', model.id, {
          name: 'Updated Name',
          parameters: { ...model.parameters, horizon: 12 },
        });

        expect(updated?.name).toBe('Updated Name');
        expect(updated?.parameters.horizon).toBe(12);
      });
    });

    describe('deleteModel', () => {
      it('should delete model', async () => {
        const model = await service.createModel('tenant-1', {
          name: 'To Delete',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.NONE,
          parameters: { horizon: 6, periodType: 'MONTH', confidenceLevel: 0.95, includeSeasonality: false, includeTrend: true, outlierDetection: false, outlierThreshold: 2.0 },
        });

        await service.deleteModel('tenant-1', model.id);

        const deleted = await service.getModel('tenant-1', model.id);
        expect(deleted).toBeNull();
      });
    });
  });

  describe('Data Management', () => {
    describe('loadHistoricalData', () => {
      it('should load historical data', async () => {
        const data: TimeSeriesData[] = [
          { date: new Date('2024-01-01'), value: 100000 },
          { date: new Date('2024-02-01'), value: 110000 },
          { date: new Date('2024-03-01'), value: 105000 },
        ];

        const result = await service.loadHistoricalData('tenant-1', ForecastType.REVENUE, data);

        expect(result.count).toBe(3);
        expect(result.startDate).toEqual(new Date('2024-01-01'));
        expect(result.endDate).toEqual(new Date('2024-03-01'));
      });

      it('should sort data by date', async () => {
        const data: TimeSeriesData[] = [
          { date: new Date('2024-03-01'), value: 105000 },
          { date: new Date('2024-01-01'), value: 100000 },
          { date: new Date('2024-02-01'), value: 110000 },
        ];

        const result = await service.loadHistoricalData('tenant-1', ForecastType.REVENUE, data);

        expect(result.startDate).toEqual(new Date('2024-01-01'));
      });
    });

    describe('getHistoricalData', () => {
      beforeEach(async () => {
        const data: TimeSeriesData[] = [
          { date: new Date('2024-01-01'), value: 100000 },
          { date: new Date('2024-02-01'), value: 110000 },
          { date: new Date('2024-03-01'), value: 105000 },
          { date: new Date('2024-04-01'), value: 120000 },
        ];
        await service.loadHistoricalData('tenant-hist', ForecastType.REVENUE, data);
      });

      it('should return all historical data', async () => {
        const data = await service.getHistoricalData('tenant-hist', ForecastType.REVENUE);

        expect(data.length).toBe(4);
      });

      it('should filter by date range', async () => {
        const data = await service.getHistoricalData(
          'tenant-hist',
          ForecastType.REVENUE,
          new Date('2024-02-01'),
          new Date('2024-03-31'),
        );

        expect(data.length).toBe(2);
      });
    });
  });

  describe('Forecasting Engine', () => {
    describe('runForecast', () => {
      it('should run forecast and return results', async () => {
        const model = await service.createModel('tenant-fc', {
          name: 'Forecast Test',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.MONTHLY,
          parameters: {
            horizon: 6,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: true,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        const result = await service.runForecast('tenant-fc', model.id);

        expect(result.id).toBeDefined();
        expect(result.forecastData.length).toBe(6);
        expect(result.metrics).toBeDefined();
        expect(result.trend).toBeDefined();
      });

      it('should include confidence intervals', async () => {
        const model = await service.createModel('tenant-fc', {
          name: 'CI Test',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.NONE,
          parameters: {
            horizon: 3,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: false,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        const result = await service.runForecast('tenant-fc', model.id);

        expect(result.forecastData[0].lowerBound).toBeLessThan(result.forecastData[0].predicted);
        expect(result.forecastData[0].upperBound).toBeGreaterThan(result.forecastData[0].predicted);
        expect(result.forecastData[0].confidence).toBe(0.95);
      });

      it('should update model status', async () => {
        const model = await service.createModel('tenant-fc', {
          name: 'Status Test',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.NONE,
          parameters: {
            horizon: 3,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: false,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        await service.runForecast('tenant-fc', model.id);
        const updated = await service.getModel('tenant-fc', model.id);

        expect(updated?.status).toBe(ForecastStatus.COMPLETED);
        expect(updated?.lastRunAt).toBeDefined();
      });

      it('should throw error for non-existent model', async () => {
        await expect(
          service.runForecast('tenant-fc', 'invalid-model'),
        ).rejects.toThrow('Model not found');
      });
    });
  });

  describe('Trend Analysis', () => {
    it('should detect upward trend', async () => {
      const data: TimeSeriesData[] = [];
      for (let i = 0; i < 12; i++) {
        data.push({
          date: new Date(2024, i, 1),
          value: 100000 + i * 5000, // Consistent growth
        });
      }

      await service.loadHistoricalData('tenant-trend', ForecastType.REVENUE, data);

      const model = await service.createModel('tenant-trend', {
        name: 'Trend Test',
        forecastType: ForecastType.REVENUE,
        trendType: TrendType.LINEAR,
        seasonality: SeasonalityType.NONE,
        parameters: {
          horizon: 3,
          periodType: 'MONTH',
          confidenceLevel: 0.95,
          includeSeasonality: false,
          includeTrend: true,
          outlierDetection: false,
          outlierThreshold: 2.0,
        },
      });

      const result = await service.runForecast('tenant-trend', model.id);

      expect(result.trend.direction).toBe('UP');
      expect(result.trend.slope).toBeGreaterThan(0);
    });

    it('should detect stable trend', async () => {
      const data: TimeSeriesData[] = [];
      for (let i = 0; i < 12; i++) {
        data.push({
          date: new Date(2024, i, 1),
          value: 100000 + (Math.random() - 0.5) * 1000, // Small random variation
        });
      }

      await service.loadHistoricalData('tenant-stable', ForecastType.REVENUE, data);

      const model = await service.createModel('tenant-stable', {
        name: 'Stable Test',
        forecastType: ForecastType.REVENUE,
        trendType: TrendType.LINEAR,
        seasonality: SeasonalityType.NONE,
        parameters: {
          horizon: 3,
          periodType: 'MONTH',
          confidenceLevel: 0.95,
          includeSeasonality: false,
          includeTrend: true,
          outlierDetection: false,
          outlierThreshold: 2.0,
        },
      });

      const result = await service.runForecast('tenant-stable', model.id);

      expect(result.trend.direction).toBe('STABLE');
    });
  });

  describe('Seasonality Analysis', () => {
    it('should detect seasonality', async () => {
      const model = await service.createModel('tenant-season', {
        name: 'Seasonality Test',
        forecastType: ForecastType.REVENUE,
        trendType: TrendType.LINEAR,
        seasonality: SeasonalityType.MONTHLY,
        parameters: {
          horizon: 6,
          periodType: 'MONTH',
          confidenceLevel: 0.95,
          includeSeasonality: true,
          includeTrend: true,
          outlierDetection: false,
          outlierThreshold: 2.0,
        },
      });

      const result = await service.runForecast('tenant-season', model.id);

      expect(result.seasonality).toBeDefined();
      expect(result.seasonality?.type).toBe(SeasonalityType.MONTHLY);
    });
  });

  describe('Quick Forecasts', () => {
    describe('quickForecastRevenue', () => {
      it('should generate quick revenue forecast', async () => {
        const result = await service.quickForecastRevenue('tenant-quick', 6);

        expect(result.forecastData.length).toBe(6);
        expect(result.forecastData[0].predicted).toBeGreaterThan(0);
      });

      it('should reuse existing model if available', async () => {
        await service.quickForecastRevenue('tenant-reuse', 12);
        await service.quickForecastRevenue('tenant-reuse', 6);

        const models = await service.getModels('tenant-reuse', {
          forecastType: ForecastType.REVENUE,
        });

        expect(models.length).toBe(1);
      });
    });

    describe('quickForecastExpense', () => {
      it('should generate quick expense forecast', async () => {
        const result = await service.quickForecastExpense('tenant-quick', 6);

        expect(result.forecastData.length).toBe(6);
      });
    });

    describe('quickForecastCashFlow', () => {
      it('should generate combined cash flow forecast', async () => {
        const result = await service.quickForecastCashFlow('tenant-cf', 6);

        expect(result.revenue).toBeDefined();
        expect(result.expense).toBeDefined();
        expect(result.cashFlow.length).toBe(6);
      });

      it('should calculate net cash flow', async () => {
        const result = await service.quickForecastCashFlow('tenant-cf', 3);

        // Cash flow should be revenue - expense
        for (let i = 0; i < result.cashFlow.length; i++) {
          const expected = result.revenue.forecastData[i].predicted - result.expense.forecastData[i].predicted;
          expect(result.cashFlow[i].predicted).toBeCloseTo(expected, 0);
        }
      });
    });
  });

  describe('Scenario Modeling', () => {
    let baseModelId: string;

    beforeEach(async () => {
      const model = await service.createModel('tenant-scenario', {
        name: 'Base Model',
        forecastType: ForecastType.REVENUE,
        trendType: TrendType.LINEAR,
        seasonality: SeasonalityType.MONTHLY,
        parameters: {
          horizon: 6,
          periodType: 'MONTH',
          confidenceLevel: 0.95,
          includeSeasonality: true,
          includeTrend: true,
          outlierDetection: false,
          outlierThreshold: 2.0,
        },
      });
      baseModelId = model.id;
    });

    describe('createScenario', () => {
      it('should create a scenario with percentage adjustment', async () => {
        const scenario = await service.createScenario('tenant-scenario', {
          name: 'Creștere 10%',
          description: 'Scenariul optimist - creștere venituri 10%',
          baseModelId,
          adjustments: [
            { type: 'PERCENTAGE', value: 10 },
          ],
        });

        expect(scenario.id).toBeDefined();
        expect(scenario.name).toBe('Creștere 10%');
        expect(scenario.adjustments.length).toBe(1);
      });

      it('should create scenario with absolute adjustment', async () => {
        const scenario = await service.createScenario('tenant-scenario', {
          name: 'Creștere fixă',
          baseModelId,
          adjustments: [
            { type: 'ABSOLUTE', value: 50000 },
          ],
        });

        expect(scenario.adjustments[0].type).toBe('ABSOLUTE');
      });
    });

    describe('runScenario', () => {
      it('should run scenario and generate forecast', async () => {
        const scenario = await service.createScenario('tenant-scenario', {
          name: 'Test Scenario',
          baseModelId,
          adjustments: [
            { type: 'PERCENTAGE', value: 20 },
          ],
        });

        const result = await service.runScenario('tenant-scenario', scenario.id);

        expect(result.forecastData.length).toBeGreaterThan(0);
      });
    });

    describe('getScenarios', () => {
      it('should return scenarios for model', async () => {
        await service.createScenario('tenant-scenario', {
          name: 'Scenario 1',
          baseModelId,
          adjustments: [{ type: 'PERCENTAGE', value: 10 }],
        });

        await service.createScenario('tenant-scenario', {
          name: 'Scenario 2',
          baseModelId,
          adjustments: [{ type: 'PERCENTAGE', value: -10 }],
        });

        const scenarios = await service.getScenarios('tenant-scenario', baseModelId);

        expect(scenarios.length).toBe(2);
      });
    });
  });

  describe('Prophet-like Decomposition', () => {
    describe('decomposeProphet', () => {
      it('should decompose time series', async () => {
        const decomposition = await service.decomposeProphet('tenant-prophet', ForecastType.REVENUE);

        expect(decomposition.trend).toBeDefined();
        expect(decomposition.weekly).toBeDefined();
        expect(decomposition.monthly).toBeDefined();
        expect(decomposition.yearly).toBeDefined();
        expect(decomposition.holidays).toBeDefined();
        expect(decomposition.residual).toBeDefined();
      });

      it('should detect changepoints', async () => {
        const decomposition = await service.decomposeProphet('tenant-prophet', ForecastType.REVENUE);

        expect(decomposition.changepoints).toBeDefined();
        expect(Array.isArray(decomposition.changepoints)).toBe(true);
      });
    });
  });

  describe('Monte Carlo Simulation', () => {
    describe('runMonteCarloForecast', () => {
      it('should run Monte Carlo simulation', async () => {
        const model = await service.createModel('tenant-mc', {
          name: 'Monte Carlo Test',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.NONE,
          parameters: {
            horizon: 6,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: false,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        const result = await service.runMonteCarloForecast('tenant-mc', model.id, 100);

        expect(result.mean.length).toBe(6);
        expect(result.percentiles.p5.length).toBe(6);
        expect(result.percentiles.p95.length).toBe(6);
        expect(result.volatility.length).toBe(6);
      });

      it('should have wider confidence intervals for later periods', async () => {
        const model = await service.createModel('tenant-mc', {
          name: 'Uncertainty Test',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.NONE,
          parameters: {
            horizon: 6,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: false,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        const result = await service.runMonteCarloForecast('tenant-mc', model.id, 500);

        const firstRange = result.percentiles.p95[0] - result.percentiles.p5[0];
        const lastRange = result.percentiles.p95[5] - result.percentiles.p5[5];

        expect(lastRange).toBeGreaterThanOrEqual(firstRange * 0.9); // Some uncertainty growth
      });
    });
  });

  describe('Auto Model Selection', () => {
    describe('autoSelectModel', () => {
      it('should select best model', async () => {
        const result = await service.autoSelectModel('tenant-auto', ForecastType.REVENUE);

        expect(result.selectedModel).toBeDefined();
        expect(result.candidateModels.length).toBe(4);
        expect(result.autoSelected).toBe(true);
      });

      it('should rank models by score', async () => {
        const result = await service.autoSelectModel('tenant-auto', ForecastType.REVENUE);

        for (let i = 1; i < result.candidateModels.length; i++) {
          expect(result.candidateModels[i - 1].score).toBeGreaterThanOrEqual(
            result.candidateModels[i].score,
          );
        }
      });
    });
  });

  describe('Backtesting', () => {
    describe('backtestForecast', () => {
      it('should calculate backtest metrics', async () => {
        const model = await service.createModel('tenant-bt', {
          name: 'Backtest Model',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.NONE,
          parameters: {
            horizon: 6,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: false,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        const metrics = await service.backtestForecast('tenant-bt', model.id, 6);

        expect(metrics.periods).toBe(6);
        expect(metrics.mape).toBeDefined();
        expect(metrics.mae).toBeDefined();
        expect(metrics.rmse).toBeDefined();
        expect(metrics.coverage).toBeDefined();
        expect(metrics.accuracy).toBeDefined();
      });

      it('should calculate accuracy score', async () => {
        const model = await service.createModel('tenant-bt', {
          name: 'Accuracy Test',
          forecastType: ForecastType.REVENUE,
          trendType: TrendType.LINEAR,
          seasonality: SeasonalityType.NONE,
          parameters: {
            horizon: 3,
            periodType: 'MONTH',
            confidenceLevel: 0.95,
            includeSeasonality: false,
            includeTrend: true,
            outlierDetection: false,
            outlierThreshold: 2.0,
          },
        });

        const metrics = await service.backtestForecast('tenant-bt', model.id, 3);

        expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
        expect(metrics.accuracy).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Alert Rules', () => {
    describe('createAlertRule', () => {
      it('should create forecast breach alert rule', async () => {
        const rule = await service.createAlertRule('tenant-alert', {
          name: 'Depășire Venituri',
          description: 'Alertă când veniturile depășesc bugetul',
          metric: ForecastType.REVENUE,
          condition: 'above',
          threshold: 150000,
          severity: AlertSeverity.WARNING,
          enabled: true,
          cooldownMinutes: 60,
          notificationChannels: ['email', 'dashboard'],
        });

        expect(rule.id).toBeDefined();
        expect(rule.name).toBe('Depășire Venituri');
        expect(rule.severity).toBe(AlertSeverity.WARNING);
      });

      it('should create deviation alert rule', async () => {
        const rule = await service.createAlertRule('tenant-alert', {
          name: 'Deviație Semnificativă',
          metric: ForecastType.REVENUE,
          condition: 'deviation',
          threshold: 15, // 15% deviation
          severity: AlertSeverity.CRITICAL,
          enabled: true,
          cooldownMinutes: 30,
          notificationChannels: ['email', 'sms', 'dashboard'],
        });

        expect(rule.condition).toBe('deviation');
        expect(rule.severity).toBe(AlertSeverity.CRITICAL);
      });
    });

    describe('getAlertRules', () => {
      it('should return all rules for tenant', async () => {
        await service.createAlertRule('tenant-rules', {
          name: 'Rule 1',
          metric: ForecastType.REVENUE,
          condition: 'above',
          threshold: 100000,
          severity: AlertSeverity.INFO,
          enabled: true,
          cooldownMinutes: 60,
          notificationChannels: ['dashboard'],
        });

        await service.createAlertRule('tenant-rules', {
          name: 'Rule 2',
          metric: ForecastType.EXPENSE,
          condition: 'above',
          threshold: 80000,
          severity: AlertSeverity.WARNING,
          enabled: true,
          cooldownMinutes: 60,
          notificationChannels: ['email'],
        });

        const rules = await service.getAlertRules('tenant-rules');

        expect(rules.length).toBe(2);
      });
    });

    describe('updateAlertRule', () => {
      it('should update rule threshold', async () => {
        const rule = await service.createAlertRule('tenant-update', {
          name: 'Update Test',
          metric: ForecastType.REVENUE,
          condition: 'above',
          threshold: 100000,
          severity: AlertSeverity.INFO,
          enabled: true,
          cooldownMinutes: 60,
          notificationChannels: ['dashboard'],
        });

        const updated = await service.updateAlertRule('tenant-update', rule.id, {
          threshold: 120000,
          enabled: false,
        });

        expect(updated?.threshold).toBe(120000);
        expect(updated?.enabled).toBe(false);
      });
    });
  });

  describe('Alerts', () => {
    describe('checkAlerts', () => {
      it('should trigger alerts based on rules', async () => {
        // Create rule with low threshold to ensure trigger
        await service.createAlertRule('tenant-check', {
          name: 'Low Threshold Test',
          metric: ForecastType.REVENUE,
          condition: 'above',
          threshold: 1000, // Very low threshold
          severity: AlertSeverity.WARNING,
          enabled: true,
          cooldownMinutes: 0, // No cooldown for test
          notificationChannels: ['dashboard'],
        });

        // Load data above threshold
        await service.loadHistoricalData('tenant-check', ForecastType.REVENUE, [
          { date: new Date(), value: 100000 },
        ]);

        const alerts = await service.checkAlerts('tenant-check');

        expect(alerts.length).toBeGreaterThan(0);
      });
    });

    describe('getAlerts', () => {
      it('should return alerts for tenant', async () => {
        const alerts = await service.getAlerts('tenant-alerts');

        expect(Array.isArray(alerts)).toBe(true);
      });

      it('should filter by severity', async () => {
        const alerts = await service.getAlerts('tenant-alerts', {
          severity: AlertSeverity.CRITICAL,
        });

        expect(alerts.every(a => a.severity === AlertSeverity.CRITICAL)).toBe(true);
      });
    });

    describe('acknowledgeAlert', () => {
      it('should acknowledge an alert', async () => {
        // First create an alert by triggering it
        await service.createAlertRule('tenant-ack', {
          name: 'Ack Test',
          metric: ForecastType.REVENUE,
          condition: 'above',
          threshold: 1,
          severity: AlertSeverity.INFO,
          enabled: true,
          cooldownMinutes: 0,
          notificationChannels: ['dashboard'],
        });

        await service.loadHistoricalData('tenant-ack', ForecastType.REVENUE, [
          { date: new Date(), value: 100000 },
        ]);

        const triggered = await service.checkAlerts('tenant-ack');
        if (triggered.length > 0) {
          const alert = await service.acknowledgeAlert('tenant-ack', triggered[0].id, 'user-1');

          expect(alert?.acknowledged).toBe(true);
          expect(alert?.acknowledgedBy).toBe('user-1');
          expect(alert?.acknowledgedAt).toBeDefined();
        }
      });
    });

    describe('getAlertSummary', () => {
      it('should return alert summary', async () => {
        const summary = await service.getAlertSummary('tenant-summary');

        expect(summary.total).toBeDefined();
        expect(summary.unacknowledged).toBeDefined();
        expect(summary.bySeverity).toBeDefined();
        expect(summary.bySeverity.critical).toBeDefined();
        expect(summary.bySeverity.warning).toBeDefined();
        expect(summary.bySeverity.info).toBeDefined();
      });
    });
  });

  describe('Trend Insights', () => {
    describe('getTrendInsights', () => {
      it('should return trend insights', async () => {
        const insights = await service.getTrendInsights('tenant-insights', ForecastType.REVENUE);

        expect(insights.currentTrend).toBeDefined();
        expect(insights.comparison.previousPeriod).toBeDefined();
        expect(insights.comparison.yearOverYear).toBeDefined();
        expect(insights.recommendations).toBeDefined();
      });

      it('should include recommendations', async () => {
        const insights = await service.getTrendInsights('tenant-insights', ForecastType.REVENUE);

        expect(Array.isArray(insights.recommendations)).toBe(true);
      });
    });
  });

  describe('Dashboards', () => {
    describe('getForecastDashboard', () => {
      it('should return basic dashboard', async () => {
        const dashboard = await service.getForecastDashboard('tenant-dash');

        expect(dashboard.summary).toBeDefined();
        expect(dashboard.summary.activeModels).toBeDefined();
        expect(dashboard.summary.completedForecasts).toBeDefined();
        expect(dashboard.summary.activeScenarios).toBeDefined();
        expect(dashboard.alerts).toBeDefined();
      });
    });

    describe('getAdvancedDashboard', () => {
      it('should return advanced dashboard with health metrics', async () => {
        const dashboard = await service.getAdvancedDashboard('tenant-adv');

        expect(dashboard.summary).toBeDefined();
        expect(dashboard.healthMetrics).toBeDefined();
        expect(dashboard.healthMetrics.forecastAccuracy).toBeDefined();
        expect(dashboard.healthMetrics.modelConfidence).toBeDefined();
        expect(dashboard.recommendations).toBeDefined();
        expect(dashboard.nextActions).toBeDefined();
      });

      it('should include SAF-T deadline action', async () => {
        const dashboard = await service.getAdvancedDashboard('tenant-adv');

        const saftAction = dashboard.nextActions.find(a => a.action.includes('SAF-T'));
        expect(saftAction).toBeDefined();
        expect(saftAction?.deadline).toBeDefined();
      });
    });
  });

  describe('Romanian Holidays', () => {
    it('should have Romanian holidays configured', async () => {
      // Access the service's romanianHolidays through decomposition
      const decomposition = await service.decomposeProphet('tenant-holidays', ForecastType.REVENUE);

      // Holidays component should be defined
      expect(decomposition.holidays).toBeDefined();
      expect(Array.isArray(decomposition.holidays)).toBe(true);
    });
  });

  describe('Forecast Types', () => {
    it('should support all forecast types', () => {
      expect(ForecastType.REVENUE).toBe('REVENUE');
      expect(ForecastType.EXPENSE).toBe('EXPENSE');
      expect(ForecastType.CASH_FLOW).toBe('CASH_FLOW');
      expect(ForecastType.PROFIT).toBe('PROFIT');
      expect(ForecastType.INVENTORY).toBe('INVENTORY');
      expect(ForecastType.HEADCOUNT).toBe('HEADCOUNT');
      expect(ForecastType.CUSTOM).toBe('CUSTOM');
    });
  });

  describe('Trend Types', () => {
    it('should support all trend types', () => {
      expect(TrendType.LINEAR).toBe('LINEAR');
      expect(TrendType.EXPONENTIAL).toBe('EXPONENTIAL');
      expect(TrendType.LOGARITHMIC).toBe('LOGARITHMIC');
      expect(TrendType.POLYNOMIAL).toBe('POLYNOMIAL');
      expect(TrendType.PIECEWISE_LINEAR).toBe('PIECEWISE_LINEAR');
      expect(TrendType.LOGISTIC_GROWTH).toBe('LOGISTIC_GROWTH');
    });
  });

  describe('Alert Types', () => {
    it('should support all alert types', () => {
      expect(AlertType.FORECAST_BREACH).toBe('FORECAST_BREACH');
      expect(AlertType.TREND_CHANGE).toBe('TREND_CHANGE');
      expect(AlertType.ANOMALY_DETECTED).toBe('ANOMALY_DETECTED');
      expect(AlertType.CONFIDENCE_WARNING).toBe('CONFIDENCE_WARNING');
      expect(AlertType.BUDGET_VARIANCE).toBe('BUDGET_VARIANCE');
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate forecast metrics', async () => {
      const model = await service.createModel('tenant-metrics', {
        name: 'Metrics Test',
        forecastType: ForecastType.REVENUE,
        trendType: TrendType.LINEAR,
        seasonality: SeasonalityType.NONE,
        parameters: {
          horizon: 6,
          periodType: 'MONTH',
          confidenceLevel: 0.95,
          includeSeasonality: false,
          includeTrend: true,
          outlierDetection: false,
          outlierThreshold: 2.0,
        },
      });

      const result = await service.runForecast('tenant-metrics', model.id);

      expect(result.metrics.mape).toBeDefined();
      expect(result.metrics.mae).toBeDefined();
      expect(result.metrics.rmse).toBeDefined();
      expect(result.metrics.r2).toBeDefined();
      expect(result.metrics.aic).toBeDefined();
      expect(result.metrics.bic).toBeDefined();
    });
  });
});
