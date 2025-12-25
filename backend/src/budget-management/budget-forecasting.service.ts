import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BudgetPlanningService } from './budget-planning.service';
import { BudgetTrackingService } from './budget-tracking.service';
import { BudgetVarianceService } from './budget-variance.service';

// =================== TYPES ===================

export type ForecastMethod = 'linear' | 'exponential' | 'moving_average' | 'seasonal' | 'ai_enhanced';
export type ForecastPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type ForecastAccuracy = 'high' | 'medium' | 'low' | 'unknown';

export interface BudgetForecast {
  id: string;
  tenantId: string;
  budgetId: string;
  budgetName: string;
  forecastDate: Date;
  method: ForecastMethod;
  period: ForecastPeriod;
  horizonPeriods: number;
  basedOnHistory: number; // months of history used
  predictions: ForecastPrediction[];
  summary: ForecastSummary;
  accuracy?: ForecastAccuracyMetrics;
  assumptions?: string[];
  risks?: ForecastRisk[];
  createdBy: string;
  createdAt: Date;
}

export interface ForecastPrediction {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  predictedSpending: number;
  predictedRevenue?: number;
  confidenceLevel: number; // 0-100
  lowerBound: number;
  upperBound: number;
  breakdown?: ForecastBreakdown[];
}

export interface ForecastBreakdown {
  categoryId: string;
  categoryName: string;
  predictedAmount: number;
  confidenceLevel: number;
}

export interface ForecastSummary {
  totalPredictedSpending: number;
  totalBudgetRemaining: number;
  projectedEndBalance: number;
  burnRate: number; // spending per period
  runwayPeriods: number; // periods until budget exhausted
  projectedOverUnder: number;
  overUnderPercentage: number;
}

export interface ForecastAccuracyMetrics {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mse: number; // Mean Square Error
  accuracy: ForecastAccuracy;
  historicalAccuracy?: number[];
}

export interface ForecastRisk {
  type: 'overspending' | 'underspending' | 'timing' | 'seasonal' | 'external';
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: number;
  mitigation?: string;
}

export interface WhatIfScenario {
  id: string;
  tenantId: string;
  budgetId: string;
  name: string;
  description?: string;
  baseForecaseId?: string;
  adjustments: ScenarioAdjustment[];
  results: ScenarioResults;
  createdBy: string;
  createdAt: Date;
}

export interface ScenarioAdjustment {
  type: 'percentage' | 'fixed' | 'category';
  categoryId?: string;
  categoryName?: string;
  adjustmentValue: number;
  effectivePeriod?: string;
  reason?: string;
}

export interface ScenarioResults {
  adjustedPredictions: ForecastPrediction[];
  impactSummary: {
    totalImpact: number;
    percentageChange: number;
    periodImpacts: Array<{ period: string; impact: number }>;
  };
  comparison: {
    baseTotal: number;
    adjustedTotal: number;
    difference: number;
    percentageDifference: number;
  };
}

export interface CashFlowForecast {
  id: string;
  tenantId: string;
  forecastDate: Date;
  period: ForecastPeriod;
  horizonPeriods: number;
  predictions: CashFlowPrediction[];
  summary: CashFlowSummary;
  createdAt: Date;
}

export interface CashFlowPrediction {
  period: string;
  expectedInflows: number;
  expectedOutflows: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  minimumBalance: number;
  sources: CashFlowSource[];
}

export interface CashFlowSource {
  category: string;
  type: 'inflow' | 'outflow';
  amount: number;
  percentage: number;
}

export interface CashFlowSummary {
  totalInflows: number;
  totalOutflows: number;
  netPosition: number;
  averageMonthlyInflow: number;
  averageMonthlyOutflow: number;
  lowestBalancePeriod: string;
  lowestBalanceAmount: number;
  cashCrunchRisk: 'low' | 'medium' | 'high';
}

// =================== SERVICE ===================

@Injectable()
export class BudgetForecastingService {
  private forecasts: Map<string, BudgetForecast> = new Map();
  private scenarios: Map<string, WhatIfScenario> = new Map();
  private cashFlowForecasts: Map<string, CashFlowForecast> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private budgetService: BudgetPlanningService,
    private trackingService: BudgetTrackingService,
    private varianceService: BudgetVarianceService,
  ) {}

  // =================== BUDGET FORECASTING ===================

  async createForecast(data: {
    tenantId: string;
    budgetId: string;
    method?: ForecastMethod;
    period?: ForecastPeriod;
    horizonPeriods?: number;
    createdBy: string;
  }): Promise<BudgetForecast> {
    const budget = await this.budgetService.getBudget(data.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const id = `forecast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const forecastDate = new Date();
    const method = data.method || 'moving_average';
    const period = data.period || 'monthly';
    const horizonPeriods = data.horizonPeriods || 6;

    // Get historical data
    const transactions = await this.trackingService.getTransactions(data.tenantId, {
      budgetId: data.budgetId,
    });

    const historicalData = this.aggregateHistoricalData(transactions, period);
    const basedOnHistory = Object.keys(historicalData).length;

    // Generate predictions
    const predictions = this.generatePredictions(
      historicalData,
      method,
      period,
      horizonPeriods,
      budget,
    );

    // Calculate summary
    const summary = this.calculateForecastSummary(predictions, budget);

    // Calculate accuracy metrics if we have enough history
    const accuracy = basedOnHistory >= 3
      ? this.calculateAccuracyMetrics(historicalData)
      : undefined;

    // Identify risks
    const risks = this.identifyForecastRisks(predictions, budget, summary);

    // Generate assumptions
    const assumptions = this.generateAssumptions(method, basedOnHistory, period);

    const forecast: BudgetForecast = {
      id,
      tenantId: data.tenantId,
      budgetId: data.budgetId,
      budgetName: budget.name,
      forecastDate,
      method,
      period,
      horizonPeriods,
      basedOnHistory,
      predictions,
      summary,
      accuracy,
      assumptions,
      risks,
      createdBy: data.createdBy,
      createdAt: forecastDate,
    };

    this.forecasts.set(id, forecast);

    this.eventEmitter.emit('budget.forecast_created', { forecast });

    return forecast;
  }

  private aggregateHistoricalData(
    transactions: any[],
    period: ForecastPeriod,
  ): Record<string, number> {
    const data: Record<string, number> = {};

    for (const tx of transactions) {
      if (tx.status !== 'posted') continue;

      const date = new Date(tx.transactionDate);
      let periodKey: string;

      switch (period) {
        case 'weekly':
          const weekNum = Math.ceil(date.getDate() / 7);
          periodKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarterly':
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          periodKey = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'annual':
          periodKey = `${date.getFullYear()}`;
          break;
        default:
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      data[periodKey] = (data[periodKey] || 0) + tx.amount;
    }

    return data;
  }

  private generatePredictions(
    historicalData: Record<string, number>,
    method: ForecastMethod,
    period: ForecastPeriod,
    horizonPeriods: number,
    budget: any,
  ): ForecastPrediction[] {
    const predictions: ForecastPrediction[] = [];
    const values = Object.values(historicalData);

    // Calculate base prediction parameters
    let baseValue: number;
    let trend: number;
    let variance: number;

    if (values.length === 0) {
      // No history - use budget allocation
      baseValue = budget.allocatedAmount / 12;
      trend = 0;
      variance = baseValue * 0.2;
    } else {
      baseValue = values.reduce((a, b) => a + b, 0) / values.length;
      trend = this.calculateTrend(values);
      variance = this.calculateVariance(values);
    }

    const now = new Date();

    for (let i = 0; i < horizonPeriods; i++) {
      const periodDate = this.addPeriods(now, period, i + 1);
      const periodKey = this.formatPeriodKey(periodDate, period);
      const periodStart = this.getPeriodStart(periodDate, period);
      const periodEnd = this.getPeriodEnd(periodDate, period);

      let predicted: number;

      switch (method) {
        case 'linear':
          predicted = baseValue + (trend * (values.length + i));
          break;
        case 'exponential':
          predicted = baseValue * Math.pow(1 + (trend / baseValue), i + 1);
          break;
        case 'moving_average':
          const maWindow = Math.min(3, values.length);
          const maValues = values.slice(-maWindow);
          predicted = maValues.length > 0
            ? maValues.reduce((a, b) => a + b, 0) / maValues.length
            : baseValue;
          break;
        case 'seasonal':
          // Simplified seasonal - assume monthly pattern
          const seasonalIndex = (now.getMonth() + i) % 12;
          const seasonalFactor = 1 + (Math.sin((seasonalIndex / 12) * 2 * Math.PI) * 0.1);
          predicted = baseValue * seasonalFactor;
          break;
        case 'ai_enhanced':
          // Combine methods for AI-enhanced prediction
          const linear = baseValue + (trend * (values.length + i));
          const ma = values.length > 0
            ? values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length)
            : baseValue;
          predicted = (linear * 0.4 + ma * 0.6);
          break;
        default:
          predicted = baseValue;
      }

      // Ensure positive prediction
      predicted = Math.max(0, predicted);

      // Calculate confidence and bounds
      const confidenceDecay = Math.pow(0.95, i);
      const confidenceLevel = Math.round(85 * confidenceDecay);
      const marginOfError = variance * (1 + i * 0.1);

      predictions.push({
        period: periodKey,
        periodStart,
        periodEnd,
        predictedSpending: Math.round(predicted * 100) / 100,
        confidenceLevel,
        lowerBound: Math.round((predicted - marginOfError) * 100) / 100,
        upperBound: Math.round((predicted + marginOfError) * 100) / 100,
      });
    }

    return predictions;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = values.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;

    return (n * sumXY - sumX * sumY) / denominator;
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private addPeriods(date: Date, period: ForecastPeriod, count: number): Date {
    const result = new Date(date);

    switch (period) {
      case 'weekly':
        result.setDate(result.getDate() + (count * 7));
        break;
      case 'monthly':
        result.setMonth(result.getMonth() + count);
        break;
      case 'quarterly':
        result.setMonth(result.getMonth() + (count * 3));
        break;
      case 'annual':
        result.setFullYear(result.getFullYear() + count);
        break;
    }

    return result;
  }

  private formatPeriodKey(date: Date, period: ForecastPeriod): string {
    switch (period) {
      case 'weekly':
        const weekNum = Math.ceil(date.getDate() / 7);
        return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'quarterly':
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `${date.getFullYear()}-Q${quarter}`;
      case 'annual':
        return `${date.getFullYear()}`;
      default:
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  private getPeriodStart(date: Date, period: ForecastPeriod): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);

    switch (period) {
      case 'weekly':
        const day = result.getDay();
        result.setDate(result.getDate() - day);
        break;
      case 'monthly':
        result.setDate(1);
        break;
      case 'quarterly':
        const quarterMonth = Math.floor(result.getMonth() / 3) * 3;
        result.setMonth(quarterMonth, 1);
        break;
      case 'annual':
        result.setMonth(0, 1);
        break;
    }

    return result;
  }

  private getPeriodEnd(date: Date, period: ForecastPeriod): Date {
    const start = this.getPeriodStart(date, period);
    const result = new Date(start);

    switch (period) {
      case 'weekly':
        result.setDate(result.getDate() + 6);
        break;
      case 'monthly':
        result.setMonth(result.getMonth() + 1);
        result.setDate(0);
        break;
      case 'quarterly':
        result.setMonth(result.getMonth() + 3);
        result.setDate(0);
        break;
      case 'annual':
        result.setMonth(11, 31);
        break;
    }

    result.setHours(23, 59, 59, 999);
    return result;
  }

  private calculateForecastSummary(
    predictions: ForecastPrediction[],
    budget: any,
  ): ForecastSummary {
    const totalPredictedSpending = predictions.reduce(
      (sum, p) => sum + p.predictedSpending,
      0,
    );

    const burnRate = predictions.length > 0
      ? totalPredictedSpending / predictions.length
      : 0;

    const totalBudgetRemaining = budget.allocatedAmount - budget.spentAmount;
    const projectedEndBalance = totalBudgetRemaining - totalPredictedSpending;

    const runwayPeriods = burnRate > 0
      ? Math.floor(totalBudgetRemaining / burnRate)
      : Infinity;

    const projectedOverUnder = projectedEndBalance;
    const overUnderPercentage = budget.allocatedAmount > 0
      ? Math.round((projectedOverUnder / budget.allocatedAmount) * 100 * 100) / 100
      : 0;

    return {
      totalPredictedSpending: Math.round(totalPredictedSpending * 100) / 100,
      totalBudgetRemaining: Math.round(totalBudgetRemaining * 100) / 100,
      projectedEndBalance: Math.round(projectedEndBalance * 100) / 100,
      burnRate: Math.round(burnRate * 100) / 100,
      runwayPeriods,
      projectedOverUnder: Math.round(projectedOverUnder * 100) / 100,
      overUnderPercentage,
    };
  }

  private calculateAccuracyMetrics(
    historicalData: Record<string, number>,
  ): ForecastAccuracyMetrics {
    const values = Object.values(historicalData);
    if (values.length < 3) {
      return {
        mape: 0,
        rmse: 0,
        mse: 0,
        accuracy: 'unknown',
      };
    }

    // Simple backtesting: use last value to predict and compare
    const errors: number[] = [];
    const percentErrors: number[] = [];

    for (let i = 1; i < values.length; i++) {
      const predicted = values[i - 1];
      const actual = values[i];
      const error = predicted - actual;
      errors.push(error);

      if (actual !== 0) {
        percentErrors.push(Math.abs(error / actual) * 100);
      }
    }

    const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
    const rmse = Math.sqrt(mse);
    const mape = percentErrors.length > 0
      ? percentErrors.reduce((sum, e) => sum + e, 0) / percentErrors.length
      : 0;

    let accuracy: ForecastAccuracy = 'unknown';
    if (mape < 10) accuracy = 'high';
    else if (mape < 25) accuracy = 'medium';
    else accuracy = 'low';

    return {
      mape: Math.round(mape * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      mse: Math.round(mse * 100) / 100,
      accuracy,
    };
  }

  private identifyForecastRisks(
    predictions: ForecastPrediction[],
    budget: any,
    summary: ForecastSummary,
  ): ForecastRisk[] {
    const risks: ForecastRisk[] = [];

    // Overspending risk
    if (summary.projectedEndBalance < 0) {
      risks.push({
        type: 'overspending',
        description: `Projected to exceed budget by ${Math.abs(summary.projectedEndBalance).toLocaleString()}`,
        probability: summary.overUnderPercentage < -10 ? 'high' : 'medium',
        impact: Math.abs(summary.projectedEndBalance),
        mitigation: 'Review discretionary spending and identify areas for cost reduction',
      });
    }

    // Underspending risk (might indicate operational issues)
    if (summary.overUnderPercentage > 20) {
      risks.push({
        type: 'underspending',
        description: `Projected ${summary.overUnderPercentage}% underutilization may indicate delayed projects`,
        probability: 'medium',
        impact: summary.projectedEndBalance,
        mitigation: 'Review project timelines and ensure planned activities are on track',
      });
    }

    // Timing risk based on confidence decay
    const lowConfidencePredictions = predictions.filter(p => p.confidenceLevel < 60);
    if (lowConfidencePredictions.length > predictions.length / 2) {
      risks.push({
        type: 'timing',
        description: 'Low confidence in predictions due to limited historical data',
        probability: 'medium',
        impact: predictions.reduce((sum, p) => sum + (p.upperBound - p.lowerBound), 0) / 2,
        mitigation: 'Continue tracking actuals to improve forecast accuracy',
      });
    }

    // Burn rate risk
    if (summary.runwayPeriods < predictions.length) {
      risks.push({
        type: 'overspending',
        description: `At current burn rate, budget will be exhausted in ${summary.runwayPeriods} periods`,
        probability: 'high',
        impact: summary.totalPredictedSpending - summary.totalBudgetRemaining,
        mitigation: 'Immediate spending controls required or budget reallocation needed',
      });
    }

    return risks;
  }

  private generateAssumptions(
    method: ForecastMethod,
    historyMonths: number,
    period: ForecastPeriod,
  ): string[] {
    const assumptions: string[] = [];

    assumptions.push(`Forecast based on ${historyMonths} periods of historical data`);

    switch (method) {
      case 'linear':
        assumptions.push('Assumes spending follows a linear trend');
        break;
      case 'exponential':
        assumptions.push('Assumes exponential growth/decay pattern');
        break;
      case 'moving_average':
        assumptions.push('Assumes recent spending patterns will continue');
        break;
      case 'seasonal':
        assumptions.push('Assumes seasonal variations in spending');
        break;
      case 'ai_enhanced':
        assumptions.push('Combines multiple forecasting methods for improved accuracy');
        break;
    }

    assumptions.push('No significant changes in business operations expected');
    assumptions.push('Inflation and price changes not explicitly modeled');

    return assumptions;
  }

  async getForecast(id: string): Promise<BudgetForecast | null> {
    return this.forecasts.get(id) || null;
  }

  async getForecasts(
    tenantId: string,
    budgetId?: string,
    limit?: number,
  ): Promise<BudgetForecast[]> {
    let forecasts = Array.from(this.forecasts.values()).filter(
      (f) => f.tenantId === tenantId,
    );

    if (budgetId) {
      forecasts = forecasts.filter((f) => f.budgetId === budgetId);
    }

    forecasts = forecasts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (limit) {
      forecasts = forecasts.slice(0, limit);
    }

    return forecasts;
  }

  // =================== WHAT-IF SCENARIOS ===================

  async createWhatIfScenario(data: {
    tenantId: string;
    budgetId: string;
    name: string;
    description?: string;
    baseForecastId?: string;
    adjustments: ScenarioAdjustment[];
    createdBy: string;
  }): Promise<WhatIfScenario> {
    const id = `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get base forecast or create one
    let baseForecast: BudgetForecast | null = null;
    if (data.baseForecastId) {
      baseForecast = await this.getForecast(data.baseForecastId);
    }

    if (!baseForecast) {
      baseForecast = await this.createForecast({
        tenantId: data.tenantId,
        budgetId: data.budgetId,
        createdBy: data.createdBy,
      });
    }

    // Apply adjustments
    const adjustedPredictions = this.applyScenarioAdjustments(
      baseForecast.predictions,
      data.adjustments,
    );

    // Calculate impact
    const baseTotal = baseForecast.predictions.reduce(
      (sum, p) => sum + p.predictedSpending,
      0,
    );
    const adjustedTotal = adjustedPredictions.reduce(
      (sum, p) => sum + p.predictedSpending,
      0,
    );

    const periodImpacts = baseForecast.predictions.map((base, i) => ({
      period: base.period,
      impact: adjustedPredictions[i].predictedSpending - base.predictedSpending,
    }));

    const results: ScenarioResults = {
      adjustedPredictions,
      impactSummary: {
        totalImpact: adjustedTotal - baseTotal,
        percentageChange: baseTotal > 0
          ? Math.round(((adjustedTotal - baseTotal) / baseTotal) * 100 * 100) / 100
          : 0,
        periodImpacts,
      },
      comparison: {
        baseTotal: Math.round(baseTotal * 100) / 100,
        adjustedTotal: Math.round(adjustedTotal * 100) / 100,
        difference: Math.round((adjustedTotal - baseTotal) * 100) / 100,
        percentageDifference: baseTotal > 0
          ? Math.round(((adjustedTotal - baseTotal) / baseTotal) * 100 * 100) / 100
          : 0,
      },
    };

    const scenario: WhatIfScenario = {
      id,
      tenantId: data.tenantId,
      budgetId: data.budgetId,
      name: data.name,
      description: data.description,
      baseForecaseId: baseForecast.id,
      adjustments: data.adjustments,
      results,
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    this.scenarios.set(id, scenario);

    this.eventEmitter.emit('budget.scenario_created', { scenario });

    return scenario;
  }

  private applyScenarioAdjustments(
    predictions: ForecastPrediction[],
    adjustments: ScenarioAdjustment[],
  ): ForecastPrediction[] {
    return predictions.map((prediction) => {
      let adjustedSpending = prediction.predictedSpending;

      for (const adjustment of adjustments) {
        // Check if adjustment applies to this period
        if (adjustment.effectivePeriod && adjustment.effectivePeriod !== prediction.period) {
          continue;
        }

        switch (adjustment.type) {
          case 'percentage':
            adjustedSpending *= (1 + adjustment.adjustmentValue / 100);
            break;
          case 'fixed':
            adjustedSpending += adjustment.adjustmentValue;
            break;
          case 'category':
            // In a full implementation, would apply to category breakdown
            adjustedSpending += adjustment.adjustmentValue;
            break;
        }
      }

      return {
        ...prediction,
        predictedSpending: Math.round(Math.max(0, adjustedSpending) * 100) / 100,
        lowerBound: Math.round(Math.max(0, prediction.lowerBound * (adjustedSpending / prediction.predictedSpending)) * 100) / 100,
        upperBound: Math.round(prediction.upperBound * (adjustedSpending / prediction.predictedSpending) * 100) / 100,
      };
    });
  }

  async getScenario(id: string): Promise<WhatIfScenario | null> {
    return this.scenarios.get(id) || null;
  }

  async getScenarios(
    tenantId: string,
    budgetId?: string,
  ): Promise<WhatIfScenario[]> {
    let scenarios = Array.from(this.scenarios.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    if (budgetId) {
      scenarios = scenarios.filter((s) => s.budgetId === budgetId);
    }

    return scenarios.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // =================== CASH FLOW FORECASTING ===================

  async createCashFlowForecast(data: {
    tenantId: string;
    period?: ForecastPeriod;
    horizonPeriods?: number;
    initialBalance?: number;
  }): Promise<CashFlowForecast> {
    const id = `cashflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const period = data.period || 'monthly';
    const horizonPeriods = data.horizonPeriods || 6;
    const initialBalance = data.initialBalance || 0;

    // Get all active budgets for the tenant
    const budgets = await this.budgetService.getBudgets(data.tenantId, {
      status: 'active' as any,
    });

    // Aggregate expected inflows and outflows
    const predictions: CashFlowPrediction[] = [];
    let currentBalance = initialBalance;

    const now = new Date();

    for (let i = 0; i < horizonPeriods; i++) {
      const periodDate = this.addPeriods(now, period, i + 1);
      const periodKey = this.formatPeriodKey(periodDate, period);

      // Simplified: estimate based on budget allocations
      let expectedInflows = 0;
      let expectedOutflows = 0;
      const sources: CashFlowSource[] = [];

      for (const budget of budgets.budgets) {
        const monthlyAmount = budget.allocatedAmount / 12;

        if (budget.type === 'revenue') {
          expectedInflows += monthlyAmount;
          sources.push({
            category: budget.name,
            type: 'inflow',
            amount: monthlyAmount,
            percentage: 0,
          });
        } else {
          expectedOutflows += monthlyAmount;
          sources.push({
            category: budget.name,
            type: 'outflow',
            amount: monthlyAmount,
            percentage: 0,
          });
        }
      }

      // Calculate percentages
      for (const source of sources) {
        const total = source.type === 'inflow' ? expectedInflows : expectedOutflows;
        source.percentage = total > 0 ? Math.round((source.amount / total) * 100) : 0;
      }

      const netCashFlow = expectedInflows - expectedOutflows;
      const openingBalance = currentBalance;
      const closingBalance = openingBalance + netCashFlow;
      currentBalance = closingBalance;

      predictions.push({
        period: periodKey,
        expectedInflows: Math.round(expectedInflows * 100) / 100,
        expectedOutflows: Math.round(expectedOutflows * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        openingBalance: Math.round(openingBalance * 100) / 100,
        closingBalance: Math.round(closingBalance * 100) / 100,
        minimumBalance: Math.round(Math.min(openingBalance, closingBalance) * 100) / 100,
        sources,
      });
    }

    // Calculate summary
    const totalInflows = predictions.reduce((sum, p) => sum + p.expectedInflows, 0);
    const totalOutflows = predictions.reduce((sum, p) => sum + p.expectedOutflows, 0);
    const lowestBalance = predictions.reduce(
      (min, p) => p.closingBalance < min.amount ? { period: p.period, amount: p.closingBalance } : min,
      { period: predictions[0]?.period || '', amount: Infinity },
    );

    let cashCrunchRisk: 'low' | 'medium' | 'high' = 'low';
    if (lowestBalance.amount < 0) cashCrunchRisk = 'high';
    else if (lowestBalance.amount < initialBalance * 0.1) cashCrunchRisk = 'medium';

    const summary: CashFlowSummary = {
      totalInflows: Math.round(totalInflows * 100) / 100,
      totalOutflows: Math.round(totalOutflows * 100) / 100,
      netPosition: Math.round((totalInflows - totalOutflows) * 100) / 100,
      averageMonthlyInflow: Math.round((totalInflows / horizonPeriods) * 100) / 100,
      averageMonthlyOutflow: Math.round((totalOutflows / horizonPeriods) * 100) / 100,
      lowestBalancePeriod: lowestBalance.period,
      lowestBalanceAmount: Math.round(lowestBalance.amount * 100) / 100,
      cashCrunchRisk,
    };

    const forecast: CashFlowForecast = {
      id,
      tenantId: data.tenantId,
      forecastDate: new Date(),
      period,
      horizonPeriods,
      predictions,
      summary,
      createdAt: new Date(),
    };

    this.cashFlowForecasts.set(id, forecast);

    this.eventEmitter.emit('budget.cashflow_forecast_created', { forecast });

    return forecast;
  }

  async getCashFlowForecast(id: string): Promise<CashFlowForecast | null> {
    return this.cashFlowForecasts.get(id) || null;
  }

  async getCashFlowForecasts(tenantId: string): Promise<CashFlowForecast[]> {
    return Array.from(this.cashFlowForecasts.values())
      .filter((f) => f.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // =================== STATISTICS ===================

  async getForecastingStatistics(tenantId: string): Promise<{
    totalForecasts: number;
    totalScenarios: number;
    totalCashFlowForecasts: number;
    averageAccuracy: number;
    methodDistribution: Record<string, number>;
    recentForecasts: number;
  }> {
    const forecasts = Array.from(this.forecasts.values()).filter(
      (f) => f.tenantId === tenantId,
    );

    const scenarios = Array.from(this.scenarios.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    const cashFlowForecasts = Array.from(this.cashFlowForecasts.values()).filter(
      (f) => f.tenantId === tenantId,
    );

    const accuracyValues = forecasts
      .filter((f) => f.accuracy && f.accuracy.mape > 0)
      .map((f) => 100 - f.accuracy!.mape);

    const averageAccuracy = accuracyValues.length > 0
      ? Math.round(accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length * 100) / 100
      : 0;

    const methodDistribution: Record<string, number> = {};
    for (const forecast of forecasts) {
      methodDistribution[forecast.method] = (methodDistribution[forecast.method] || 0) + 1;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentForecasts = forecasts.filter(
      (f) => f.createdAt >= thirtyDaysAgo,
    ).length;

    return {
      totalForecasts: forecasts.length,
      totalScenarios: scenarios.length,
      totalCashFlowForecasts: cashFlowForecasts.length,
      averageAccuracy,
      methodDistribution,
      recentForecasts,
    };
  }
}
