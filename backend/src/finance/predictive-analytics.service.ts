import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Predictive Analytics Service
 * AI-driven financial forecasting using statistical methods
 *
 * Features:
 * - Revenue/expense forecasting with confidence intervals
 * - Trend analysis (moving averages, growth rates)
 * - Seasonal pattern detection
 * - Anomaly detection using statistical methods
 * - Cash flow projections
 * - What-if scenario analysis
 */

// =================== TYPES & INTERFACES ===================

export interface TimeSeriesPoint {
  date: Date;
  value: number;
  label?: string;
}

export interface ForecastResult {
  date: Date;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  growthRate: number;
  averageValue: number;
  movingAverages: {
    ma7: number;
    ma30: number;
    ma90: number;
  };
  volatility: number;
}

export interface SeasonalPattern {
  hasSeasonality: boolean;
  peakMonths: number[];
  lowMonths: number[];
  seasonalIndices: Record<number, number>;
  strength: number;
}

export interface AnomalyResult {
  date: Date;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'trend_break';
}

export interface CashFlowProjection {
  period: string;
  projectedIncome: number;
  projectedExpenses: number;
  projectedCashFlow: number;
  cumulativeCashFlow: number;
  confidence: number;
}

export interface ScenarioResult {
  scenario: string;
  assumptions: Record<string, number>;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
  breakEvenDate?: Date;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FinancialForecast {
  userId: string;
  generatedAt: Date;
  forecastHorizon: number;
  revenue: {
    historical: TimeSeriesPoint[];
    forecast: ForecastResult[];
    trend: TrendAnalysis;
    seasonality: SeasonalPattern;
  };
  expenses: {
    historical: TimeSeriesPoint[];
    forecast: ForecastResult[];
    trend: TrendAnalysis;
    seasonality: SeasonalPattern;
  };
  cashFlow: CashFlowProjection[];
  anomalies: AnomalyResult[];
  insights: string[];
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  };
}

export interface ForecastOptions {
  horizon: number; // Days to forecast
  confidenceLevel: number; // 0.80, 0.90, 0.95
  includeSeasonality: boolean;
  includeAnomalies: boolean;
}

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =================== MAIN FORECAST GENERATION ===================

  /**
   * Generate comprehensive financial forecast
   */
  async generateForecast(
    userId: string,
    options: Partial<ForecastOptions> = {},
  ): Promise<FinancialForecast> {
    const {
      horizon = 90,
      confidenceLevel = 0.95,
      includeSeasonality = true,
      includeAnomalies = true,
    } = options;

    this.logger.log(`Generating financial forecast for user ${userId}`);

    // Fetch historical data
    const [revenueData, expenseData] = await Promise.all([
      this.getHistoricalRevenue(userId),
      this.getHistoricalExpenses(userId),
    ]);

    // Analyze trends
    const revenueTrend = this.analyzeTrend(revenueData);
    const expenseTrend = this.analyzeTrend(expenseData);

    // Detect seasonality
    const revenueSeasonality = includeSeasonality
      ? this.detectSeasonality(revenueData)
      : { hasSeasonality: false, peakMonths: [], lowMonths: [], seasonalIndices: {}, strength: 0 };
    const expenseSeasonality = includeSeasonality
      ? this.detectSeasonality(expenseData)
      : { hasSeasonality: false, peakMonths: [], lowMonths: [], seasonalIndices: {}, strength: 0 };

    // Generate forecasts
    const revenueForecast = this.generateTimeSeriesForecast(
      revenueData,
      horizon,
      confidenceLevel,
      revenueSeasonality,
    );
    const expenseForecast = this.generateTimeSeriesForecast(
      expenseData,
      horizon,
      confidenceLevel,
      expenseSeasonality,
    );

    // Generate cash flow projections
    const cashFlow = this.generateCashFlowProjections(
      revenueForecast,
      expenseForecast,
      horizon,
    );

    // Detect anomalies
    const anomalies = includeAnomalies
      ? [
          ...this.detectAnomalies(revenueData, 'revenue'),
          ...this.detectAnomalies(expenseData, 'expense'),
        ]
      : [];

    // Generate insights
    const insights = this.generateInsights(
      revenueTrend,
      expenseTrend,
      revenueSeasonality,
      expenseSeasonality,
      anomalies,
      cashFlow,
    );

    // Calculate accuracy metrics (using cross-validation on historical data)
    const accuracy = this.calculateAccuracyMetrics(revenueData, expenseData);

    return {
      userId,
      generatedAt: new Date(),
      forecastHorizon: horizon,
      revenue: {
        historical: revenueData,
        forecast: revenueForecast,
        trend: revenueTrend,
        seasonality: revenueSeasonality,
      },
      expenses: {
        historical: expenseData,
        forecast: expenseForecast,
        trend: expenseTrend,
        seasonality: expenseSeasonality,
      },
      cashFlow,
      anomalies: anomalies.sort((a, b) => b.date.getTime() - a.date.getTime()),
      insights,
      accuracy,
    };
  }

  // =================== DATA RETRIEVAL ===================

  /**
   * Get historical revenue data from invoices
   */
  async getHistoricalRevenue(userId: string, months: number = 24): Promise<TimeSeriesPoint[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'ISSUED',
        invoiceDate: { gte: startDate },
        status: { in: ['SUBMITTED', 'PAID'] },
      },
      orderBy: { invoiceDate: 'asc' },
      select: {
        invoiceDate: true,
        grossAmount: true,
      },
    });

    // Aggregate by day
    const dailyRevenue = this.aggregateByDay(
      invoices.map((inv) => ({
        date: inv.invoiceDate,
        value: inv.grossAmount?.toNumber() || 0,
      })),
    );

    return dailyRevenue;
  }

  /**
   * Get historical expense data from received invoices
   */
  async getHistoricalExpenses(userId: string, months: number = 24): Promise<TimeSeriesPoint[]> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        type: 'RECEIVED',
        invoiceDate: { gte: startDate },
        status: { in: ['SUBMITTED', 'PAID'] },
      },
      orderBy: { invoiceDate: 'asc' },
      select: {
        invoiceDate: true,
        grossAmount: true,
      },
    });

    // Aggregate by day
    const dailyExpenses = this.aggregateByDay(
      invoices.map((inv) => ({
        date: inv.invoiceDate,
        value: inv.grossAmount?.toNumber() || 0,
      })),
    );

    return dailyExpenses;
  }

  /**
   * Aggregate time series data by day
   */
  private aggregateByDay(data: TimeSeriesPoint[]): TimeSeriesPoint[] {
    const dailyMap = new Map<string, number>();

    for (const point of data) {
      const dateKey = point.date.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + point.value);
    }

    return Array.from(dailyMap.entries())
      .map(([dateStr, value]) => ({
        date: new Date(dateStr),
        value,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // =================== TREND ANALYSIS ===================

  /**
   * Analyze trends in time series data
   */
  analyzeTrend(data: TimeSeriesPoint[]): TrendAnalysis {
    if (data.length < 7) {
      return {
        direction: 'stable',
        growthRate: 0,
        averageValue: this.mean(data.map((d) => d.value)),
        movingAverages: { ma7: 0, ma30: 0, ma90: 0 },
        volatility: 0,
      };
    }

    const values = data.map((d) => d.value);
    const average = this.mean(values);

    // Calculate moving averages
    const ma7 = this.movingAverage(values, 7);
    const ma30 = this.movingAverage(values, 30);
    const ma90 = this.movingAverage(values, 90);

    // Calculate growth rate using linear regression
    const growthRate = this.calculateGrowthRate(data);

    // Calculate volatility (coefficient of variation)
    const volatility = this.standardDeviation(values) / (average || 1);

    // Determine direction (threshold 0.5% per period is considered a trend)
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (growthRate > 0.005) direction = 'up';
    else if (growthRate < -0.005) direction = 'down';

    return {
      direction,
      growthRate: Math.round(growthRate * 10000) / 100, // As percentage
      averageValue: Math.round(average * 100) / 100,
      movingAverages: {
        ma7: Math.round(ma7 * 100) / 100,
        ma30: Math.round(ma30 * 100) / 100,
        ma90: Math.round(ma90 * 100) / 100,
      },
      volatility: Math.round(volatility * 10000) / 100, // As percentage
    };
  }

  /**
   * Calculate growth rate using linear regression
   */
  private calculateGrowthRate(data: TimeSeriesPoint[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map((d) => d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    // Return growth rate as percentage of average
    return avgY !== 0 ? slope / avgY : 0;
  }

  // =================== SEASONALITY DETECTION ===================

  /**
   * Detect seasonal patterns in data
   */
  detectSeasonality(data: TimeSeriesPoint[]): SeasonalPattern {
    if (data.length < 365) {
      return {
        hasSeasonality: false,
        peakMonths: [],
        lowMonths: [],
        seasonalIndices: {},
        strength: 0,
      };
    }

    // Group by month
    const monthlyAverages: Record<number, number[]> = {};
    for (const point of data) {
      const month = point.date.getMonth();
      if (!monthlyAverages[month]) monthlyAverages[month] = [];
      monthlyAverages[month].push(point.value);
    }

    // Calculate monthly indices
    const overallAverage = this.mean(data.map((d) => d.value));
    const seasonalIndices: Record<number, number> = {};

    for (let month = 0; month < 12; month++) {
      if (monthlyAverages[month] && monthlyAverages[month].length > 0) {
        const monthAvg = this.mean(monthlyAverages[month]);
        seasonalIndices[month] = overallAverage !== 0 ? monthAvg / overallAverage : 1;
      } else {
        seasonalIndices[month] = 1;
      }
    }

    // Find peak and low months
    const sortedMonths = Object.entries(seasonalIndices)
      .sort(([, a], [, b]) => b - a);

    const peakMonths = sortedMonths
      .slice(0, 3)
      .filter(([, idx]) => idx > 1.1)
      .map(([m]) => parseInt(m));

    const lowMonths = sortedMonths
      .slice(-3)
      .filter(([, idx]) => idx < 0.9)
      .map(([m]) => parseInt(m));

    // Calculate seasonality strength
    const indexValues = Object.values(seasonalIndices);
    const strength = this.standardDeviation(indexValues) / this.mean(indexValues);

    return {
      hasSeasonality: strength > 0.1,
      peakMonths,
      lowMonths,
      seasonalIndices,
      strength: Math.round(strength * 100) / 100,
    };
  }

  // =================== FORECASTING ===================

  /**
   * Generate time series forecast using exponential smoothing with seasonality
   */
  generateTimeSeriesForecast(
    data: TimeSeriesPoint[],
    horizon: number,
    confidenceLevel: number,
    seasonality: SeasonalPattern,
  ): ForecastResult[] {
    if (data.length === 0) {
      return this.generateEmptyForecast(horizon, confidenceLevel);
    }

    const values = data.map((d) => d.value);
    const lastDate = data[data.length - 1]?.date || new Date();

    // Apply Holt-Winters exponential smoothing
    const { level, trend } = this.holtWinters(values);

    // Calculate forecast error for confidence intervals
    const residuals = this.calculateResiduals(values, level, trend);
    const residualStd = this.standardDeviation(residuals);

    // Z-score for confidence level
    const zScore = this.getZScore(confidenceLevel);

    const forecasts: ForecastResult[] = [];

    for (let i = 1; i <= horizon; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      // Base forecast
      let predicted = level + trend * i;

      // Apply seasonal adjustment if available
      if (seasonality.hasSeasonality) {
        const month = forecastDate.getMonth();
        predicted *= seasonality.seasonalIndices[month] || 1;
      }

      // Ensure non-negative
      predicted = Math.max(0, predicted);

      // Calculate confidence interval (widens with horizon)
      const intervalWidth = residualStd * zScore * Math.sqrt(i);
      const lowerBound = Math.max(0, predicted - intervalWidth);
      const upperBound = predicted + intervalWidth;

      forecasts.push({
        date: forecastDate,
        predicted: Math.round(predicted * 100) / 100,
        lowerBound: Math.round(lowerBound * 100) / 100,
        upperBound: Math.round(upperBound * 100) / 100,
        confidence: confidenceLevel,
      });
    }

    return forecasts;
  }

  /**
   * Holt-Winters exponential smoothing
   */
  private holtWinters(
    values: number[],
    alpha: number = 0.3,
    beta: number = 0.1,
  ): { level: number; trend: number } {
    if (values.length === 0) {
      return { level: 0, trend: 0 };
    }

    let level = values[0];
    let trend = values.length > 1 ? values[1] - values[0] : 0;

    for (let i = 1; i < values.length; i++) {
      const prevLevel = level;
      level = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    return { level, trend };
  }

  /**
   * Calculate residuals for error estimation
   */
  private calculateResiduals(
    values: number[],
    level: number,
    trend: number,
  ): number[] {
    const residuals: number[] = [];
    let currentLevel = values[0] || 0;
    let currentTrend = values.length > 1 ? values[1] - values[0] : 0;

    for (let i = 0; i < values.length; i++) {
      const predicted = currentLevel + currentTrend;
      residuals.push(values[i] - predicted);

      // Update level and trend
      const alpha = 0.3;
      const beta = 0.1;
      const prevLevel = currentLevel;
      currentLevel = alpha * values[i] + (1 - alpha) * (currentLevel + currentTrend);
      currentTrend = beta * (currentLevel - prevLevel) + (1 - beta) * currentTrend;
    }

    return residuals;
  }

  /**
   * Generate empty forecast for users with no data
   */
  private generateEmptyForecast(horizon: number, confidence: number): ForecastResult[] {
    const forecasts: ForecastResult[] = [];
    const today = new Date();

    for (let i = 1; i <= horizon; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(forecastDate.getDate() + i);

      forecasts.push({
        date: forecastDate,
        predicted: 0,
        lowerBound: 0,
        upperBound: 0,
        confidence,
      });
    }

    return forecasts;
  }

  // =================== CASH FLOW PROJECTIONS ===================

  /**
   * Generate cash flow projections combining revenue and expense forecasts
   */
  generateCashFlowProjections(
    revenueForecast: ForecastResult[],
    expenseForecast: ForecastResult[],
    horizon: number,
  ): CashFlowProjection[] {
    const projections: CashFlowProjection[] = [];
    let cumulativeCashFlow = 0;

    // Group by month
    const monthlyData = new Map<string, {
      revenue: number[];
      expenses: number[];
      confidence: number[];
    }>();

    // Aggregate daily forecasts to monthly
    for (let i = 0; i < Math.min(revenueForecast.length, expenseForecast.length); i++) {
      const date = revenueForecast[i].date;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { revenue: [], expenses: [], confidence: [] });
      }

      const data = monthlyData.get(monthKey)!;
      data.revenue.push(revenueForecast[i].predicted);
      data.expenses.push(expenseForecast[i].predicted);
      data.confidence.push(revenueForecast[i].confidence);
    }

    // Calculate monthly projections
    for (const [period, data] of monthlyData) {
      const projectedIncome = data.revenue.reduce((a, b) => a + b, 0);
      const projectedExpenses = data.expenses.reduce((a, b) => a + b, 0);
      const projectedCashFlow = projectedIncome - projectedExpenses;
      cumulativeCashFlow += projectedCashFlow;

      const avgConfidence = this.mean(data.confidence);

      projections.push({
        period,
        projectedIncome: Math.round(projectedIncome * 100) / 100,
        projectedExpenses: Math.round(projectedExpenses * 100) / 100,
        projectedCashFlow: Math.round(projectedCashFlow * 100) / 100,
        cumulativeCashFlow: Math.round(cumulativeCashFlow * 100) / 100,
        confidence: avgConfidence,
      });
    }

    return projections;
  }

  // =================== ANOMALY DETECTION ===================

  /**
   * Detect anomalies in time series data using z-score method
   */
  detectAnomalies(data: TimeSeriesPoint[], type: string): AnomalyResult[] {
    if (data.length < 30) return [];

    const anomalies: AnomalyResult[] = [];
    const values = data.map((d) => d.value);

    // Calculate rolling statistics
    const windowSize = 30;

    for (let i = windowSize; i < data.length; i++) {
      const window = values.slice(i - windowSize, i);
      const windowMean = this.mean(window);
      const windowStd = this.standardDeviation(window);

      let absZScore: number;
      let zScore: number;

      if (windowStd === 0) {
        // When std is 0 (all values same), check percentage deviation from mean
        const percentDeviation = windowMean !== 0
          ? Math.abs(values[i] - windowMean) / windowMean
          : (values[i] !== 0 ? Infinity : 0);

        // Convert percentage deviation to pseudo z-score (50% deviation = 2 sigma)
        absZScore = percentDeviation * 4;
        zScore = values[i] >= windowMean ? absZScore : -absZScore;
      } else {
        zScore = (values[i] - windowMean) / windowStd;
        absZScore = Math.abs(zScore);
      }

      if (absZScore > 2) {
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (absZScore > 4) severity = 'critical';
        else if (absZScore > 3.5) severity = 'high';
        else if (absZScore > 2.5) severity = 'medium';

        const anomalyType = zScore > 0 ? 'spike' : 'drop';

        anomalies.push({
          date: data[i].date,
          value: values[i],
          expectedValue: Math.round(windowMean * 100) / 100,
          deviation: Math.round(absZScore * 100) / 100,
          severity,
          type: anomalyType,
        });
      }
    }

    return anomalies;
  }

  // =================== SCENARIO ANALYSIS ===================

  /**
   * Run what-if scenario analysis
   */
  async runScenarioAnalysis(
    userId: string,
    scenarios: Array<{
      name: string;
      revenueGrowth: number;
      expenseGrowth: number;
      additionalAssumptions?: Record<string, number>;
    }>,
  ): Promise<ScenarioResult[]> {
    const forecast = await this.generateForecast(userId, { horizon: 365 });
    const results: ScenarioResult[] = [];

    const baseRevenue = forecast.revenue.forecast.reduce((sum, f) => sum + f.predicted, 0);
    const baseExpenses = forecast.expenses.forecast.reduce((sum, f) => sum + f.predicted, 0);

    for (const scenario of scenarios) {
      const projectedRevenue = baseRevenue * (1 + scenario.revenueGrowth / 100);
      const projectedExpenses = baseExpenses * (1 + scenario.expenseGrowth / 100);
      const projectedProfit = projectedRevenue - projectedExpenses;

      // Calculate break-even if currently unprofitable
      let breakEvenDate: Date | undefined;
      if (projectedProfit < 0 && scenario.revenueGrowth > scenario.expenseGrowth) {
        const monthsToBreakEven = Math.ceil(
          -projectedProfit / ((scenario.revenueGrowth - scenario.expenseGrowth) / 100 * baseRevenue / 12),
        );
        breakEvenDate = new Date();
        breakEvenDate.setMonth(breakEvenDate.getMonth() + monthsToBreakEven);
      }

      // Assess risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      const profitMargin = projectedRevenue > 0 ? projectedProfit / projectedRevenue : 0;
      if (profitMargin < 0) riskLevel = 'high';
      else if (profitMargin < 0.1) riskLevel = 'medium';

      results.push({
        scenario: scenario.name,
        assumptions: {
          revenueGrowth: scenario.revenueGrowth,
          expenseGrowth: scenario.expenseGrowth,
          ...scenario.additionalAssumptions,
        },
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        projectedExpenses: Math.round(projectedExpenses * 100) / 100,
        projectedProfit: Math.round(projectedProfit * 100) / 100,
        breakEvenDate,
        riskLevel,
      });
    }

    return results;
  }

  // =================== INSIGHTS GENERATION ===================

  /**
   * Generate actionable insights from analysis
   */
  private generateInsights(
    revenueTrend: TrendAnalysis,
    expenseTrend: TrendAnalysis,
    revenueSeasonality: SeasonalPattern,
    expenseSeasonality: SeasonalPattern,
    anomalies: AnomalyResult[],
    cashFlow: CashFlowProjection[],
  ): string[] {
    const insights: string[] = [];

    // Revenue trend insights
    if (revenueTrend.direction === 'up') {
      insights.push(
        `Revenue is trending upward with ${revenueTrend.growthRate.toFixed(1)}% growth rate. ` +
        `Current 30-day average: ${revenueTrend.movingAverages.ma30.toFixed(2)}`,
      );
    } else if (revenueTrend.direction === 'down') {
      insights.push(
        `Warning: Revenue is declining at ${Math.abs(revenueTrend.growthRate).toFixed(1)}% rate. ` +
        `Consider reviewing sales strategy.`,
      );
    }

    // Expense trend insights
    if (expenseTrend.growthRate > revenueTrend.growthRate) {
      insights.push(
        `Expenses are growing faster than revenue (${expenseTrend.growthRate.toFixed(1)}% vs ` +
        `${revenueTrend.growthRate.toFixed(1)}%). Review cost structure.`,
      );
    }

    // Volatility insights
    if (revenueTrend.volatility > 30) {
      insights.push(
        `High revenue volatility detected (${revenueTrend.volatility.toFixed(1)}%). ` +
        `Consider diversifying income streams.`,
      );
    }

    // Seasonality insights
    if (revenueSeasonality.hasSeasonality) {
      const peakMonthNames = revenueSeasonality.peakMonths.map((m) =>
        new Date(2024, m).toLocaleString('en', { month: 'long' }),
      );
      if (peakMonthNames.length > 0) {
        insights.push(
          `Peak revenue months detected: ${peakMonthNames.join(', ')}. ` +
          `Plan inventory and staffing accordingly.`,
        );
      }
    }

    // Cash flow insights
    const negativeCashFlowMonths = cashFlow.filter((cf) => cf.projectedCashFlow < 0);
    if (negativeCashFlowMonths.length > 0) {
      insights.push(
        `Warning: Negative cash flow projected for ${negativeCashFlowMonths.length} month(s). ` +
        `Consider securing additional financing.`,
      );
    }

    // Check cumulative cash flow trend
    if (cashFlow.length > 0) {
      const lastCumulative = cashFlow[cashFlow.length - 1].cumulativeCashFlow;
      if (lastCumulative > 0) {
        insights.push(
          `Projected cumulative cash flow of ${lastCumulative.toFixed(2)} over forecast period.`,
        );
      }
    }

    // Anomaly insights
    const criticalAnomalies = anomalies.filter((a) => a.severity === 'critical' || a.severity === 'high');
    if (criticalAnomalies.length > 0) {
      insights.push(
        `${criticalAnomalies.length} significant anomaly(ies) detected in financial data. ` +
        `Review transactions for accuracy.`,
      );
    }

    return insights;
  }

  // =================== ACCURACY METRICS ===================

  /**
   * Calculate forecast accuracy metrics using cross-validation
   */
  private calculateAccuracyMetrics(
    revenueData: TimeSeriesPoint[],
    expenseData: TimeSeriesPoint[],
  ): { mape: number; rmse: number } {
    if (revenueData.length < 90) {
      return { mape: 0, rmse: 0 };
    }

    // Use last 30 days as test set
    const testSize = 30;
    const trainData = revenueData.slice(0, -testSize);
    const testData = revenueData.slice(-testSize);

    // Generate forecast for test period
    const forecast = this.generateTimeSeriesForecast(
      trainData,
      testSize,
      0.95,
      { hasSeasonality: false, peakMonths: [], lowMonths: [], seasonalIndices: {}, strength: 0 },
    );

    // Calculate MAPE and RMSE
    let sumAPE = 0;
    let sumSE = 0;
    let validCount = 0;

    for (let i = 0; i < Math.min(testData.length, forecast.length); i++) {
      const actual = testData[i].value;
      const predicted = forecast[i].predicted;

      if (actual !== 0) {
        sumAPE += Math.abs((actual - predicted) / actual);
        validCount++;
      }
      sumSE += Math.pow(actual - predicted, 2);
    }

    const mape = validCount > 0 ? (sumAPE / validCount) * 100 : 0;
    const rmse = Math.sqrt(sumSE / Math.max(testData.length, 1));

    return {
      mape: Math.round(mape * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
    };
  }

  // =================== HELPER FUNCTIONS ===================

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  private movingAverage(values: number[], window: number): number {
    if (values.length < window) return this.mean(values);
    const lastN = values.slice(-window);
    return this.mean(lastN);
  }

  private getZScore(confidence: number): number {
    // Approximate z-scores for common confidence levels
    const zScores: Record<number, number> = {
      0.80: 1.28,
      0.85: 1.44,
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[confidence] || 1.96;
  }

  // =================== QUICK METRICS ===================

  /**
   * Get quick revenue forecast summary
   */
  async getRevenueForecastSummary(userId: string): Promise<{
    next30Days: number;
    next90Days: number;
    next365Days: number;
    trend: 'up' | 'down' | 'stable';
    confidence: number;
  }> {
    const forecast = await this.generateForecast(userId, { horizon: 365, confidenceLevel: 0.95 });

    const next30 = forecast.revenue.forecast.slice(0, 30).reduce((sum, f) => sum + f.predicted, 0);
    const next90 = forecast.revenue.forecast.slice(0, 90).reduce((sum, f) => sum + f.predicted, 0);
    const next365 = forecast.revenue.forecast.reduce((sum, f) => sum + f.predicted, 0);

    return {
      next30Days: Math.round(next30 * 100) / 100,
      next90Days: Math.round(next90 * 100) / 100,
      next365Days: Math.round(next365 * 100) / 100,
      trend: forecast.revenue.trend.direction,
      confidence: 0.95,
    };
  }

  /**
   * Get monthly breakdown forecast
   */
  async getMonthlyForecast(
    userId: string,
    months: number = 12,
  ): Promise<Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  }>> {
    const forecast = await this.generateForecast(userId, { horizon: months * 30 });

    return forecast.cashFlow.slice(0, months).map((cf) => ({
      month: cf.period,
      revenue: cf.projectedIncome,
      expenses: cf.projectedExpenses,
      profit: cf.projectedCashFlow,
      profitMargin: cf.projectedIncome > 0
        ? Math.round((cf.projectedCashFlow / cf.projectedIncome) * 10000) / 100
        : 0,
    }));
  }
}
