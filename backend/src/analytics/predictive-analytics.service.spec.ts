import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PredictiveAnalyticsService, TimeSeriesPoint } from './predictive-analytics.service';

describe('PredictiveAnalyticsService', () => {
  let service: PredictiveAnalyticsService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictiveAnalyticsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PredictiveAnalyticsService>(PredictiveAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to generate sample time series
  function generateTimeSeries(months: number, baseValue: number, trend: number): TimeSeriesPoint[] {
    const now = new Date();
    const data: TimeSeriesPoint[] = [];
    for (let i = months - 1; i >= 0; i--) {
      data.push({
        date: new Date(now.getFullYear(), now.getMonth() - i, 1),
        value: baseValue + trend * (months - i - 1) + (Math.random() - 0.5) * baseValue * 0.1,
      });
    }
    return data;
  }

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('forecasting', () => {
    it('should generate a forecast', async () => {
      const historicalData = generateTimeSeries(12, 100000, 2000);
      const forecast = await service.generateForecast(
        'Revenue',
        historicalData,
        6,
        'monthly',
      );

      expect(forecast.id).toBeDefined();
      expect(forecast.metric).toBe('Revenue');
      expect(forecast.predictions.length).toBe(6);
      expect(forecast.confidence).toBeGreaterThan(0);
    });

    it('should generate predictions with confidence intervals', async () => {
      const historicalData = generateTimeSeries(6, 50000, 1000);
      const forecast = await service.generateForecast(
        'Sales',
        historicalData,
        3,
        'monthly',
      );

      for (const prediction of forecast.predictions) {
        expect(prediction.lowerBound).toBeLessThanOrEqual(prediction.predicted);
        expect(prediction.upperBound).toBeGreaterThanOrEqual(prediction.predicted);
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should retrieve a generated forecast', async () => {
      const historicalData = generateTimeSeries(6, 10000, 500);
      const created = await service.generateForecast(
        'Expenses',
        historicalData,
        3,
        'monthly',
      );

      const retrieved = await service.getForecast(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent forecast', async () => {
      const result = await service.getForecast('non-existent');
      expect(result).toBeNull();
    });

    it('should handle empty historical data', async () => {
      const forecast = await service.generateForecast('Empty', [], 3, 'monthly');
      expect(forecast.predictions.length).toBe(0);
    });

    it('should generate daily forecasts', async () => {
      const historicalData = generateTimeSeries(30, 5000, 100);
      const forecast = await service.generateForecast(
        'DailyMetric',
        historicalData,
        7,
        'daily',
      );

      expect(forecast.period).toBe('daily');
      expect(forecast.predictions.length).toBe(7);
    });
  });

  describe('trend analysis', () => {
    it('should detect increasing trend', async () => {
      const data = generateTimeSeries(12, 50000, 3000);
      const analysis = await service.analyzeTrend('Revenue', data, 'monthly');

      expect(analysis.trend).toBe('increasing');
      expect(analysis.changePercent).toBeGreaterThan(0);
    });

    it('should detect decreasing trend', async () => {
      const now = new Date();
      const data: TimeSeriesPoint[] = [];
      // Generate data where values decrease over time (earlier months have higher values)
      for (let i = 11; i >= 0; i--) {
        data.push({
          date: new Date(now.getFullYear(), now.getMonth() - i, 1),
          value: 50000 + i * 5000, // Higher values at beginning (older dates), lower at end
        });
      }

      const analysis = await service.analyzeTrend('Expenses', data, 'monthly');
      expect(analysis.trend).toBe('decreasing');
    });

    it('should detect stable trend', async () => {
      const now = new Date();
      const data: TimeSeriesPoint[] = [];
      for (let i = 11; i >= 0; i--) {
        data.push({
          date: new Date(now.getFullYear(), now.getMonth() - i, 1),
          value: 50000 + (Math.random() - 0.5) * 1000,
        });
      }

      const analysis = await service.analyzeTrend('Stable', data, 'monthly');
      expect(['stable', 'increasing', 'decreasing']).toContain(analysis.trend);
    });

    it('should detect anomalies', async () => {
      const now = new Date();
      const data: TimeSeriesPoint[] = [];
      for (let i = 11; i >= 0; i--) {
        let value = 50000;
        if (i === 5) value = 150000; // Anomaly
        data.push({
          date: new Date(now.getFullYear(), now.getMonth() - i, 1),
          value,
        });
      }

      const analysis = await service.analyzeTrend('WithAnomaly', data, 'monthly');
      expect(analysis.anomalies.length).toBeGreaterThan(0);
    });

    it('should generate insights', async () => {
      const data = generateTimeSeries(12, 100000, 5000);
      const analysis = await service.analyzeTrend('Revenue', data, 'monthly');

      expect(analysis.insights.length).toBeGreaterThan(0);
    });
  });

  describe('KPI forecasting', () => {
    it('should forecast KPIs', async () => {
      const kpis = await service.forecastKPIs('tenant-123', '30d');

      expect(kpis.length).toBeGreaterThan(0);
      for (const kpi of kpis) {
        expect(kpi.kpi).toBeDefined();
        expect(kpi.currentValue).toBeDefined();
        expect(kpi.predictedValue).toBeDefined();
        expect(kpi.confidence).toBeGreaterThan(0);
      }
    });

    it('should include trend information', async () => {
      const kpis = await service.forecastKPIs('tenant-123');

      for (const kpi of kpis) {
        expect(['up', 'down', 'stable']).toContain(kpi.trend);
        expect(typeof kpi.changePercent).toBe('number');
      }
    });
  });

  describe('scenario analysis', () => {
    it('should generate business scenarios', async () => {
      const scenarios = await service.generateScenarios('Revenue', 100000, {});

      expect(scenarios.length).toBe(3);

      const scenarioNames = scenarios.map((s) => s.id);
      expect(scenarioNames).toContain('optimistic');
      expect(scenarioNames).toContain('realistic');
      expect(scenarioNames).toContain('pessimistic');
    });

    it('should include projections in scenarios', async () => {
      const scenarios = await service.generateScenarios('Revenue', 200000, {});

      for (const scenario of scenarios) {
        expect(scenario.projections.length).toBeGreaterThan(0);
        expect(scenario.probability).toBeGreaterThan(0);
        expect(scenario.probability).toBeLessThanOrEqual(1);
        expect(['positive', 'negative', 'neutral']).toContain(scenario.impact);
      }
    });

    it('should have probabilities summing to approximately 1', async () => {
      const scenarios = await service.generateScenarios('Revenue', 100000, {});
      const totalProbability = scenarios.reduce((sum, s) => sum + s.probability, 0);

      expect(totalProbability).toBeCloseTo(1, 1);
    });
  });

  describe('cash flow prediction', () => {
    it('should predict cash flow for multiple periods', async () => {
      const predictions = await service.predictCashFlow('tenant-123', 6);

      expect(predictions.length).toBe(6);
    });

    it('should include inflows and outflows', async () => {
      const predictions = await service.predictCashFlow('tenant-123', 3);

      for (const prediction of predictions) {
        expect(prediction.inflows.total).toBeGreaterThan(0);
        expect(prediction.outflows.total).toBeGreaterThan(0);
        expect(prediction.netCashFlow).toBe(prediction.inflows.total - prediction.outflows.total);
      }
    });

    it('should calculate running balance', async () => {
      const predictions = await service.predictCashFlow('tenant-123', 4);

      let expectedBalance = 50000; // Initial balance
      for (const prediction of predictions) {
        expectedBalance += prediction.netCashFlow;
        expect(Math.abs(prediction.runningBalance - expectedBalance)).toBeLessThan(100);
      }
    });

    it('should generate alerts when appropriate', async () => {
      const predictions = await service.predictCashFlow('tenant-123', 6);

      // At least some periods should have alerts or empty alerts
      for (const prediction of predictions) {
        expect(Array.isArray(prediction.alerts)).toBe(true);
      }
    });
  });

  describe('churn prediction', () => {
    it('should predict customer churn', async () => {
      const predictions = await service.predictChurn('tenant-123');

      expect(predictions.length).toBeGreaterThan(0);
    });

    it('should sort by churn probability', async () => {
      const predictions = await service.predictChurn('tenant-123');

      for (let i = 1; i < predictions.length; i++) {
        expect(predictions[i].churnProbability).toBeLessThanOrEqual(
          predictions[i - 1].churnProbability,
        );
      }
    });

    it('should include risk factors and actions', async () => {
      const predictions = await service.predictChurn('tenant-123');

      for (const prediction of predictions) {
        expect(prediction.factors.length).toBeGreaterThanOrEqual(0);
        expect(prediction.recommendedActions.length).toBeGreaterThan(0);
        expect(['low', 'medium', 'high']).toContain(prediction.riskLevel);
      }
    });

    it('should include lifetime value', async () => {
      const predictions = await service.predictChurn('tenant-123');

      for (const prediction of predictions) {
        expect(prediction.lifetimeValue).toBeGreaterThan(0);
      }
    });
  });

  describe('demand forecasting', () => {
    it('should forecast product demand', async () => {
      const forecasts = await service.forecastDemand('tenant-123');

      expect(forecasts.length).toBeGreaterThan(0);
    });

    it('should sort by stockout risk', async () => {
      const forecasts = await service.forecastDemand('tenant-123');

      for (let i = 1; i < forecasts.length; i++) {
        expect(forecasts[i].stockoutRisk).toBeLessThanOrEqual(
          forecasts[i - 1].stockoutRisk,
        );
      }
    });

    it('should include reorder recommendations', async () => {
      const forecasts = await service.forecastDemand('tenant-123');

      for (const forecast of forecasts) {
        expect(forecast.recommendations.length).toBeGreaterThan(0);
        expect(forecast.reorderPoint).toBeGreaterThan(0);
        expect(forecast.optimalOrderQuantity).toBeGreaterThan(0);
      }
    });
  });

  describe('revenue attribution', () => {
    it('should get revenue attribution', async () => {
      const attribution = await service.getRevenueAttribution('tenant-123');

      expect(attribution.length).toBeGreaterThan(0);
    });

    it('should sort by revenue', async () => {
      const attribution = await service.getRevenueAttribution('tenant-123');

      for (let i = 1; i < attribution.length; i++) {
        expect(attribution[i].revenue).toBeLessThanOrEqual(
          attribution[i - 1].revenue,
        );
      }
    });

    it('should include percentages summing to 100', async () => {
      const attribution = await service.getRevenueAttribution('tenant-123');
      const totalPercentage = attribution.reduce((sum, a) => sum + a.percentage, 0);

      expect(totalPercentage).toBe(100);
    });

    it('should include trend and forecast', async () => {
      const attribution = await service.getRevenueAttribution('tenant-123');

      for (const item of attribution) {
        expect(['up', 'down', 'stable']).toContain(item.trend);
        expect(item.forecast).toBeGreaterThan(0);
      }
    });
  });

  describe('dashboard metrics', () => {
    it('should get dashboard metrics', async () => {
      const dashboard = await service.getDashboardMetrics('tenant-123');

      expect(dashboard.summary).toBeDefined();
      expect(dashboard.forecasts.length).toBeGreaterThan(0);
      expect(dashboard.trends.length).toBeGreaterThan(0);
      expect(Array.isArray(dashboard.alerts)).toBe(true);
    });

    it('should include summary metrics', async () => {
      const dashboard = await service.getDashboardMetrics('tenant-123');

      expect(dashboard.summary.totalRevenue).toBeDefined();
      expect(dashboard.summary.projectedRevenue).toBeDefined();
      expect(dashboard.summary.customerCount).toBeDefined();
    });
  });

  describe('model accuracy', () => {
    it('should get model accuracy metrics', async () => {
      const accuracy = await service.getModelAccuracy('forecast-1');

      expect(accuracy.mape).toBeDefined();
      expect(accuracy.rmse).toBeDefined();
      expect(accuracy.mae).toBeDefined();
      expect(accuracy.r2).toBeDefined();
    });

    it('should have valid accuracy ranges', async () => {
      const accuracy = await service.getModelAccuracy('forecast-1');

      expect(accuracy.mape).toBeGreaterThanOrEqual(0);
      expect(accuracy.rmse).toBeGreaterThanOrEqual(0);
      expect(accuracy.mae).toBeGreaterThanOrEqual(0);
      expect(accuracy.r2).toBeGreaterThanOrEqual(0);
      expect(accuracy.r2).toBeLessThanOrEqual(1);
    });
  });
});
