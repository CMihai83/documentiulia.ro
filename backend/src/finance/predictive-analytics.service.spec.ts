import { Test, TestingModule } from '@nestjs/testing';
import { PredictiveAnalyticsService } from './predictive-analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PredictiveAnalyticsService', () => {
  let service: PredictiveAnalyticsService;
  let prisma: PrismaService;

  const mockUserId = 'user-123';

  // Generate mock invoice data for testing
  const generateMockInvoices = (count: number, type: 'ISSUED' | 'RECEIVED', baseAmount: number = 1000) => {
    const invoices = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);

    for (let i = 0; i < count; i++) {
      const invoiceDate = new Date(startDate);
      invoiceDate.setDate(invoiceDate.getDate() + i);

      // Add some seasonality and trend
      const seasonalFactor = 1 + 0.2 * Math.sin((invoiceDate.getMonth() / 12) * 2 * Math.PI);
      const trendFactor = 1 + (i / count) * 0.1;
      const randomFactor = 0.9 + Math.random() * 0.2;
      const amount = baseAmount * seasonalFactor * trendFactor * randomFactor;

      invoices.push({
        invoiceDate,
        grossAmount: { toNumber: () => amount },
      });
    }

    return invoices;
  };

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictiveAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PredictiveAnalyticsService>(PredictiveAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generateForecast', () => {
    it('should generate comprehensive financial forecast', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const result = await service.generateForecast(mockUserId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.forecastHorizon).toBe(90);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should include revenue forecast with confidence intervals', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const result = await service.generateForecast(mockUserId, { horizon: 30 });

      expect(result.revenue.forecast).toHaveLength(30);
      expect(result.revenue.forecast[0]).toHaveProperty('predicted');
      expect(result.revenue.forecast[0]).toHaveProperty('lowerBound');
      expect(result.revenue.forecast[0]).toHaveProperty('upperBound');
      expect(result.revenue.forecast[0]).toHaveProperty('confidence');
    });

    it('should include expense forecast', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const result = await service.generateForecast(mockUserId, { horizon: 30 });

      expect(result.expenses.forecast).toHaveLength(30);
      expect(result.expenses.trend).toBeDefined();
    });

    it('should handle custom confidence level', async () => {
      const revenueInvoices = generateMockInvoices(100, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(100, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const result = await service.generateForecast(mockUserId, {
        horizon: 30,
        confidenceLevel: 0.80,
      });

      expect(result.revenue.forecast[0].confidence).toBe(0.80);
    });

    it('should generate insights', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const result = await service.generateForecast(mockUserId);

      expect(result.insights).toBeInstanceOf(Array);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateForecast(mockUserId);

      expect(result).toBeDefined();
      expect(result.revenue.forecast).toHaveLength(90);
      expect(result.revenue.forecast[0].predicted).toBe(0);
    });
  });

  describe('analyzeTrend', () => {
    it('should detect upward trend', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 1000 + i * 50, // Increasing values
      }));

      const trend = service.analyzeTrend(data);

      expect(trend.direction).toBe('up');
      expect(trend.growthRate).toBeGreaterThan(0);
    });

    it('should detect downward trend', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 5000 - i * 30, // Decreasing values
      }));

      const trend = service.analyzeTrend(data);

      expect(trend.direction).toBe('down');
      expect(trend.growthRate).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 1000 + Math.random() * 10, // Small variation
      }));

      const trend = service.analyzeTrend(data);

      expect(trend.direction).toBe('stable');
      expect(Math.abs(trend.growthRate)).toBeLessThan(5);
    });

    it('should calculate moving averages', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 1000 + i * 10,
      }));

      const trend = service.analyzeTrend(data);

      expect(trend.movingAverages.ma7).toBeGreaterThan(0);
      expect(trend.movingAverages.ma30).toBeGreaterThan(0);
      expect(trend.movingAverages.ma90).toBeGreaterThan(0);
    });

    it('should calculate volatility', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 1000 + Math.random() * 500, // High volatility
      }));

      const trend = service.analyzeTrend(data);

      expect(trend.volatility).toBeGreaterThan(0);
    });

    it('should handle minimal data', () => {
      const data = [
        { date: new Date(), value: 1000 },
        { date: new Date(), value: 1100 },
      ];

      const trend = service.analyzeTrend(data);

      expect(trend).toBeDefined();
      expect(trend.averageValue).toBeGreaterThan(0);
    });
  });

  describe('detectSeasonality', () => {
    it('should detect seasonal patterns in sufficient data', () => {
      // Create data with clear seasonality
      const data = Array.from({ length: 400 }, (_, i) => {
        const date = new Date(Date.now() - (400 - i) * 24 * 60 * 60 * 1000);
        const month = date.getMonth();
        // Higher values in December (month 11) and lower in January (month 0)
        const seasonalMultiplier = 1 + 0.5 * Math.sin(((month - 3) / 12) * 2 * Math.PI);
        return {
          date,
          value: 1000 * seasonalMultiplier,
        };
      });

      const seasonality = service.detectSeasonality(data);

      expect(seasonality.hasSeasonality).toBe(true);
      expect(seasonality.strength).toBeGreaterThan(0);
      expect(Object.keys(seasonality.seasonalIndices).length).toBe(12);
    });

    it('should return no seasonality for insufficient data', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 1000,
      }));

      const seasonality = service.detectSeasonality(data);

      expect(seasonality.hasSeasonality).toBe(false);
    });

    it('should identify peak and low months', () => {
      const data = Array.from({ length: 400 }, (_, i) => {
        const date = new Date(Date.now() - (400 - i) * 24 * 60 * 60 * 1000);
        const month = date.getMonth();
        // December high, January low
        const value = month === 11 ? 2000 : month === 0 ? 500 : 1000;
        return { date, value };
      });

      const seasonality = service.detectSeasonality(data);

      if (seasonality.hasSeasonality) {
        expect(seasonality.peakMonths).toBeDefined();
        expect(seasonality.lowMonths).toBeDefined();
      }
    });
  });

  describe('generateTimeSeriesForecast', () => {
    it('should generate forecast for given horizon', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 1000 + i * 10,
      }));

      const seasonality = { hasSeasonality: false, peakMonths: [], lowMonths: [], seasonalIndices: {}, strength: 0 };
      const forecast = service.generateTimeSeriesForecast(data, 30, 0.95, seasonality);

      expect(forecast).toHaveLength(30);
      expect(forecast[0].date).toBeInstanceOf(Date);
      expect(forecast[0].predicted).toBeGreaterThan(0);
    });

    it('should have widening confidence intervals over time', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 1000 + Math.random() * 200,
      }));

      const seasonality = { hasSeasonality: false, peakMonths: [], lowMonths: [], seasonalIndices: {}, strength: 0 };
      const forecast = service.generateTimeSeriesForecast(data, 30, 0.95, seasonality);

      const firstInterval = forecast[0].upperBound - forecast[0].lowerBound;
      const lastInterval = forecast[29].upperBound - forecast[29].lowerBound;

      expect(lastInterval).toBeGreaterThan(firstInterval);
    });

    it('should apply seasonal adjustment when available', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: 1000,
      }));

      const seasonalIndices: Record<number, number> = {};
      for (let i = 0; i < 12; i++) {
        seasonalIndices[i] = i === 11 ? 1.5 : 1.0;
      }

      const seasonality = {
        hasSeasonality: true,
        peakMonths: [11],
        lowMonths: [0],
        seasonalIndices,
        strength: 0.5,
      };

      const forecast = service.generateTimeSeriesForecast(data, 365, 0.95, seasonality);

      // Check that December forecasts are higher
      const decemberForecasts = forecast.filter((f) => f.date.getMonth() === 11);
      const januaryForecasts = forecast.filter((f) => f.date.getMonth() === 0);

      if (decemberForecasts.length > 0 && januaryForecasts.length > 0) {
        const avgDecember = decemberForecasts.reduce((sum, f) => sum + f.predicted, 0) / decemberForecasts.length;
        const avgJanuary = januaryForecasts.reduce((sum, f) => sum + f.predicted, 0) / januaryForecasts.length;

        expect(avgDecember).toBeGreaterThan(avgJanuary);
      }
    });
  });

  describe('detectAnomalies', () => {
    it('should detect spike anomalies', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: i === 80 ? 5000 : 1000, // Large spike at day 80
      }));

      const anomalies = service.detectAnomalies(data, 'revenue');

      expect(anomalies.length).toBeGreaterThan(0);
      const spikeAnomaly = anomalies.find((a) => a.type === 'spike');
      expect(spikeAnomaly).toBeDefined();
    });

    it('should detect drop anomalies', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: i === 80 ? 100 : 1000, // Large drop at day 80
      }));

      const anomalies = service.detectAnomalies(data, 'revenue');

      expect(anomalies.length).toBeGreaterThan(0);
      const dropAnomaly = anomalies.find((a) => a.type === 'drop');
      expect(dropAnomaly).toBeDefined();
    });

    it('should classify severity correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        date: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000),
        value: i === 80 ? 10000 : 1000, // Very large spike
      }));

      const anomalies = service.detectAnomalies(data, 'revenue');

      const criticalAnomaly = anomalies.find(
        (a) => a.severity === 'critical' || a.severity === 'high',
      );
      expect(criticalAnomaly).toBeDefined();
    });

    it('should return empty array for insufficient data', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000),
        value: 1000,
      }));

      const anomalies = service.detectAnomalies(data, 'revenue');

      expect(anomalies).toHaveLength(0);
    });
  });

  describe('generateCashFlowProjections', () => {
    it('should generate monthly cash flow projections', () => {
      const revenueForecast = Array.from({ length: 90 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predicted: 1000,
        lowerBound: 800,
        upperBound: 1200,
        confidence: 0.95,
      }));

      const expenseForecast = Array.from({ length: 90 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predicted: 700,
        lowerBound: 600,
        upperBound: 800,
        confidence: 0.95,
      }));

      const projections = service.generateCashFlowProjections(
        revenueForecast,
        expenseForecast,
        90,
      );

      expect(projections.length).toBeGreaterThan(0);
      expect(projections[0]).toHaveProperty('period');
      expect(projections[0]).toHaveProperty('projectedIncome');
      expect(projections[0]).toHaveProperty('projectedExpenses');
      expect(projections[0]).toHaveProperty('projectedCashFlow');
      expect(projections[0]).toHaveProperty('cumulativeCashFlow');
    });

    it('should calculate positive cash flow when revenue exceeds expenses', () => {
      const revenueForecast = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predicted: 1000,
        lowerBound: 800,
        upperBound: 1200,
        confidence: 0.95,
      }));

      const expenseForecast = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predicted: 500,
        lowerBound: 400,
        upperBound: 600,
        confidence: 0.95,
      }));

      const projections = service.generateCashFlowProjections(
        revenueForecast,
        expenseForecast,
        30,
      );

      expect(projections.every((p) => p.projectedCashFlow > 0)).toBe(true);
    });

    it('should calculate cumulative cash flow correctly', () => {
      const revenueForecast = Array.from({ length: 60 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predicted: 1000,
        lowerBound: 800,
        upperBound: 1200,
        confidence: 0.95,
      }));

      const expenseForecast = Array.from({ length: 60 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        predicted: 700,
        lowerBound: 600,
        upperBound: 800,
        confidence: 0.95,
      }));

      const projections = service.generateCashFlowProjections(
        revenueForecast,
        expenseForecast,
        60,
      );

      // Check that cumulative cash flow is correctly accumulated
      if (projections.length > 1) {
        expect(projections[1].cumulativeCashFlow).toBeGreaterThan(
          projections[0].projectedCashFlow,
        );
      }
    });
  });

  describe('runScenarioAnalysis', () => {
    it('should run scenario analysis with provided scenarios', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const scenarios = [
        { name: 'Growth', revenueGrowth: 20, expenseGrowth: 10 },
        { name: 'Recession', revenueGrowth: -10, expenseGrowth: 5 },
      ];

      const results = await service.runScenarioAnalysis(mockUserId, scenarios);

      expect(results).toHaveLength(2);
      expect(results[0].scenario).toBe('Growth');
      expect(results[1].scenario).toBe('Recession');
    });

    it('should calculate projected revenue correctly', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const scenarios = [
        { name: 'Growth', revenueGrowth: 100, expenseGrowth: 0 }, // Double revenue
      ];

      const results = await service.runScenarioAnalysis(mockUserId, scenarios);

      expect(results[0].projectedRevenue).toBeGreaterThan(0);
    });

    it('should assess risk level correctly', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const scenarios = [
        { name: 'High Risk', revenueGrowth: -50, expenseGrowth: 50 },
      ];

      const results = await service.runScenarioAnalysis(mockUserId, scenarios);

      expect(results[0].riskLevel).toBe('high');
    });
  });

  describe('getRevenueForecastSummary', () => {
    it('should return revenue forecast summary', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const summary = await service.getRevenueForecastSummary(mockUserId);

      expect(summary).toHaveProperty('next30Days');
      expect(summary).toHaveProperty('next90Days');
      expect(summary).toHaveProperty('next365Days');
      expect(summary).toHaveProperty('trend');
      expect(summary).toHaveProperty('confidence');
    });

    it('should have increasing forecast sums for longer periods', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const summary = await service.getRevenueForecastSummary(mockUserId);

      expect(summary.next90Days).toBeGreaterThan(summary.next30Days);
      expect(summary.next365Days).toBeGreaterThan(summary.next90Days);
    });
  });

  describe('getMonthlyForecast', () => {
    it('should return monthly breakdown', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const monthly = await service.getMonthlyForecast(mockUserId, 6);

      expect(monthly.length).toBeLessThanOrEqual(6);
      if (monthly.length > 0) {
        expect(monthly[0]).toHaveProperty('month');
        expect(monthly[0]).toHaveProperty('revenue');
        expect(monthly[0]).toHaveProperty('expenses');
        expect(monthly[0]).toHaveProperty('profit');
        expect(monthly[0]).toHaveProperty('profitMargin');
      }
    });

    it('should calculate profit margin correctly', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 500);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const monthly = await service.getMonthlyForecast(mockUserId, 3);

      if (monthly.length > 0 && monthly[0].revenue > 0) {
        const expectedMargin = ((monthly[0].revenue - monthly[0].expenses) / monthly[0].revenue) * 100;
        expect(Math.abs(monthly[0].profitMargin - expectedMargin)).toBeLessThan(1);
      }
    });
  });

  describe('getHistoricalRevenue', () => {
    it('should fetch and aggregate revenue data', async () => {
      const invoices = [
        { invoiceDate: new Date('2024-01-15'), grossAmount: { toNumber: () => 1000 } },
        { invoiceDate: new Date('2024-01-15'), grossAmount: { toNumber: () => 500 } },
        { invoiceDate: new Date('2024-01-16'), grossAmount: { toNumber: () => 800 } },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.getHistoricalRevenue(mockUserId);

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            type: 'ISSUED',
          }),
        }),
      );
      expect(result.length).toBeLessThanOrEqual(invoices.length);
    });
  });

  describe('getHistoricalExpenses', () => {
    it('should fetch and aggregate expense data', async () => {
      const invoices = [
        { invoiceDate: new Date('2024-01-15'), grossAmount: { toNumber: () => 500 } },
        { invoiceDate: new Date('2024-01-16'), grossAmount: { toNumber: () => 300 } },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.getHistoricalExpenses(mockUserId);

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            type: 'RECEIVED',
          }),
        }),
      );
    });
  });

  describe('accuracy metrics', () => {
    it('should calculate MAPE and RMSE', async () => {
      const revenueInvoices = generateMockInvoices(365, 'ISSUED', 1000);
      const expenseInvoices = generateMockInvoices(365, 'RECEIVED', 700);

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(revenueInvoices)
        .mockResolvedValueOnce(expenseInvoices);

      const result = await service.generateForecast(mockUserId);

      expect(result.accuracy).toHaveProperty('mape');
      expect(result.accuracy).toHaveProperty('rmse');
      expect(result.accuracy.mape).toBeGreaterThanOrEqual(0);
      expect(result.accuracy.rmse).toBeGreaterThanOrEqual(0);
    });
  });
});
