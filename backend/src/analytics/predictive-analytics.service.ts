import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Predictive Analytics Service for DocumentIulia.ro
// Provides forecasting, trend analysis, and business intelligence

// =================== INTERFACES ===================

export interface TimeSeriesPoint {
  date: Date;
  value: number;
  label?: string;
}

export interface Forecast {
  id: string;
  metric: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  horizon: number;
  historicalData: TimeSeriesPoint[];
  predictions: PredictionPoint[];
  confidence: number;
  model: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface PredictionPoint {
  date: Date;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface TrendAnalysis {
  metric: string;
  period: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  changePercent: number;
  seasonality: SeasonalPattern | null;
  anomalies: AnomalyPoint[];
  insights: string[];
}

export interface SeasonalPattern {
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  pattern: number[];
  strength: number;
}

export interface AnomalyPoint {
  date: Date;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

export interface KPIForecast {
  kpi: string;
  currentValue: number;
  predictedValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  horizon: string;
}

export interface BusinessScenario {
  id: string;
  name: string;
  description: string;
  assumptions: Record<string, number>;
  projections: ScenarioProjection[];
  probability: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ScenarioProjection {
  metric: string;
  baseline: number;
  projected: number;
  variance: number;
  timeline: string;
}

export interface CashFlowPrediction {
  period: string;
  inflows: {
    invoices: number;
    other: number;
    total: number;
  };
  outflows: {
    expenses: number;
    salaries: number;
    taxes: number;
    other: number;
    total: number;
  };
  netCashFlow: number;
  runningBalance: number;
  alerts: string[];
}

export interface ChurnPrediction {
  customerId: string;
  customerName: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: ChurnFactor[];
  recommendedActions: string[];
  lastActivity: Date;
  lifetimeValue: number;
}

export interface ChurnFactor {
  factor: string;
  weight: number;
  value: string;
}

export interface DemandForecast {
  productId: string;
  productName: string;
  currentStock: number;
  predictedDemand: number;
  reorderPoint: number;
  optimalOrderQuantity: number;
  stockoutRisk: number;
  leadTimeDays: number;
  recommendations: string[];
}

export interface RevenueAttribution {
  source: string;
  revenue: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  growth: number;
  forecast: number;
}

// =================== SERVICE ===================

@Injectable()
export class PredictiveAnalyticsService {
  private readonly logger = new Logger(PredictiveAnalyticsService.name);

  // In-memory storage for forecasts
  private forecasts: Map<string, Forecast> = new Map();
  private forecastIdCounter = 0;

  constructor(private configService: ConfigService) {}

  // =================== FORECASTING ===================

  async generateForecast(
    metric: string,
    historicalData: TimeSeriesPoint[],
    horizon: number,
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  ): Promise<Forecast> {
    const id = `forecast-${++this.forecastIdCounter}-${Date.now()}`;

    // Calculate simple moving average for baseline
    const values = historicalData.map((d) => d.value);
    const predictions = this.calculatePredictions(values, horizon, period);

    const forecast: Forecast = {
      id,
      metric,
      period,
      horizon,
      historicalData,
      predictions,
      confidence: this.calculateOverallConfidence(predictions),
      model: 'exponential-smoothing',
      createdAt: new Date(),
    };

    this.forecasts.set(id, forecast);
    this.logger.log(`Generated forecast ${id} for ${metric}`);

    return forecast;
  }

  private calculatePredictions(
    values: number[],
    horizon: number,
    period: string,
  ): PredictionPoint[] {
    const predictions: PredictionPoint[] = [];
    const n = values.length;

    if (n === 0) return predictions;

    // Exponential smoothing parameters
    const alpha = 0.3; // Level smoothing
    const beta = 0.1; // Trend smoothing

    // Initialize level and trend
    let level = values[0];
    let trend = n > 1 ? (values[n - 1] - values[0]) / (n - 1) : 0;

    // Apply exponential smoothing to historical data
    for (let i = 1; i < n; i++) {
      const newLevel = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (newLevel - level) + (1 - beta) * trend;
      level = newLevel;
    }

    // Calculate standard deviation for confidence intervals
    const residuals = values.slice(1).map((v, i) => Math.abs(v - values[i]));
    const stdDev = this.calculateStdDev(residuals) || values[values.length - 1] * 0.1;

    // Generate predictions
    const now = new Date();
    const periodMs = this.getPeriodMs(period);

    for (let h = 1; h <= horizon; h++) {
      const predicted = level + trend * h;
      const confidence = Math.max(0.5, 0.95 - h * 0.05);
      const margin = stdDev * (1 + h * 0.1) * 1.96;

      predictions.push({
        date: new Date(now.getTime() + h * periodMs),
        predicted: Math.max(0, predicted),
        lowerBound: Math.max(0, predicted - margin),
        upperBound: predicted + margin,
        confidence,
      });
    }

    return predictions;
  }

  private getPeriodMs(period: string): number {
    const day = 24 * 60 * 60 * 1000;
    switch (period) {
      case 'daily':
        return day;
      case 'weekly':
        return 7 * day;
      case 'monthly':
        return 30 * day;
      case 'quarterly':
        return 90 * day;
      case 'yearly':
        return 365 * day;
      default:
        return 30 * day;
    }
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private calculateOverallConfidence(predictions: PredictionPoint[]): number {
    if (predictions.length === 0) return 0;
    return predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
  }

  async getForecast(forecastId: string): Promise<Forecast | null> {
    return this.forecasts.get(forecastId) || null;
  }

  // =================== TREND ANALYSIS ===================

  async analyzeTrend(
    metric: string,
    data: TimeSeriesPoint[],
    period: string,
  ): Promise<TrendAnalysis> {
    const values = data.map((d) => d.value);
    const n = values.length;

    // Calculate trend direction
    let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    let changePercent = 0;

    if (n >= 2) {
      const firstHalf = values.slice(0, Math.floor(n / 2));
      const secondHalf = values.slice(Math.floor(n / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      changePercent = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

      // Check volatility
      const stdDev = this.calculateStdDev(values);
      const mean = values.reduce((a, b) => a + b, 0) / n;
      const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

      if (cv > 30) {
        trend = 'volatile';
      } else if (changePercent > 5) {
        trend = 'increasing';
      } else if (changePercent < -5) {
        trend = 'decreasing';
      } else {
        trend = 'stable';
      }
    } else {
      trend = 'stable';
    }

    // Detect seasonality
    const seasonality = this.detectSeasonality(values, period);

    // Detect anomalies
    const anomalies = this.detectAnomalies(data);

    // Generate insights
    const insights = this.generateTrendInsights(trend, changePercent, seasonality, anomalies);

    return {
      metric,
      period,
      trend,
      changePercent: Math.round(changePercent * 100) / 100,
      seasonality,
      anomalies,
      insights,
    };
  }

  private detectSeasonality(values: number[], period: string): SeasonalPattern | null {
    if (values.length < 12) return null;

    // Simple seasonal detection based on autocorrelation
    let seasonLength: number;
    let type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';

    switch (period) {
      case 'daily':
        seasonLength = 7;
        type = 'weekly';
        break;
      case 'monthly':
        seasonLength = 12;
        type = 'yearly';
        break;
      default:
        return null;
    }

    if (values.length < seasonLength * 2) return null;

    // Calculate seasonal pattern
    const pattern: number[] = [];
    for (let i = 0; i < seasonLength; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i; j < values.length; j += seasonLength) {
        sum += values[j];
        count++;
      }
      pattern.push(sum / count);
    }

    // Calculate strength (variance explained by seasonality)
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const totalVariance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
    const seasonalMean = pattern.reduce((a, b) => a + b, 0) / pattern.length;
    const seasonalVariance = pattern.reduce((sum, v) => sum + Math.pow(v - seasonalMean, 2), 0);

    const strength = totalVariance > 0 ? seasonalVariance / totalVariance : 0;

    if (strength < 0.2) return null;

    return {
      type,
      pattern,
      strength: Math.round(strength * 100) / 100,
    };
  }

  private detectAnomalies(data: TimeSeriesPoint[]): AnomalyPoint[] {
    const anomalies: AnomalyPoint[] = [];
    const values = data.map((d) => d.value);

    if (values.length < 5) return anomalies;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = this.calculateStdDev(values);

    if (stdDev === 0) return anomalies;

    for (let i = 0; i < data.length; i++) {
      const deviation = (data[i].value - mean) / stdDev;
      const absDeviation = Math.abs(deviation);

      if (absDeviation > 2) {
        anomalies.push({
          date: data[i].date,
          value: data[i].value,
          expected: mean,
          deviation: Math.round(deviation * 100) / 100,
          severity: absDeviation > 3 ? 'high' : absDeviation > 2.5 ? 'medium' : 'low',
        });
      }
    }

    return anomalies;
  }

  private generateTrendInsights(
    trend: string,
    changePercent: number,
    seasonality: SeasonalPattern | null,
    anomalies: AnomalyPoint[],
  ): string[] {
    const insights: string[] = [];

    // Trend insight
    switch (trend) {
      case 'increasing':
        insights.push(`Trend crescător cu ${Math.abs(changePercent).toFixed(1)}% în perioada analizată`);
        break;
      case 'decreasing':
        insights.push(`Trend descrescător cu ${Math.abs(changePercent).toFixed(1)}% în perioada analizată`);
        break;
      case 'volatile':
        insights.push('Variabilitate ridicată detectată - monitorizare atentă recomandată');
        break;
      case 'stable':
        insights.push('Evoluție stabilă în perioada analizată');
        break;
    }

    // Seasonality insight
    if (seasonality) {
      insights.push(`Sezonalitate ${seasonality.type} detectată cu intensitate ${(seasonality.strength * 100).toFixed(0)}%`);
    }

    // Anomaly insights
    if (anomalies.length > 0) {
      const highSeverity = anomalies.filter((a) => a.severity === 'high').length;
      if (highSeverity > 0) {
        insights.push(`${highSeverity} anomalii majore detectate - investigare recomandată`);
      } else {
        insights.push(`${anomalies.length} anomalii minore detectate`);
      }
    }

    return insights;
  }

  // =================== KPI FORECASTING ===================

  async forecastKPIs(
    tenantId: string,
    horizon: string = '30d',
  ): Promise<KPIForecast[]> {
    // Generate sample KPI forecasts
    const kpis: KPIForecast[] = [
      {
        kpi: 'Venituri',
        currentValue: 125000,
        predictedValue: 138500,
        changePercent: 10.8,
        trend: 'up',
        confidence: 0.85,
        horizon,
      },
      {
        kpi: 'Profit Net',
        currentValue: 18750,
        predictedValue: 21200,
        changePercent: 13.1,
        trend: 'up',
        confidence: 0.78,
        horizon,
      },
      {
        kpi: 'Clienți Activi',
        currentValue: 245,
        predictedValue: 258,
        changePercent: 5.3,
        trend: 'up',
        confidence: 0.82,
        horizon,
      },
      {
        kpi: 'Valoare Medie Comandă',
        currentValue: 450,
        predictedValue: 465,
        changePercent: 3.3,
        trend: 'up',
        confidence: 0.75,
        horizon,
      },
      {
        kpi: 'Cheltuieli Operaționale',
        currentValue: 45000,
        predictedValue: 47500,
        changePercent: 5.6,
        trend: 'up',
        confidence: 0.88,
        horizon,
      },
      {
        kpi: 'Cash Flow',
        currentValue: 32000,
        predictedValue: 35000,
        changePercent: 9.4,
        trend: 'up',
        confidence: 0.72,
        horizon,
      },
    ];

    return kpis;
  }

  // =================== SCENARIO ANALYSIS ===================

  async generateScenarios(
    metric: string,
    baseValue: number,
    factors: Record<string, number>,
  ): Promise<BusinessScenario[]> {
    const scenarios: BusinessScenario[] = [
      {
        id: 'optimistic',
        name: 'Scenariu Optimist',
        description: 'Creștere peste așteptări cu condiții favorabile de piață',
        assumptions: { growth: 0.15, marketShare: 0.05, costReduction: 0.1 },
        projections: [
          {
            metric: 'Venituri',
            baseline: baseValue,
            projected: baseValue * 1.25,
            variance: 25,
            timeline: '12 luni',
          },
          {
            metric: 'Profit',
            baseline: baseValue * 0.15,
            projected: baseValue * 0.22,
            variance: 46.7,
            timeline: '12 luni',
          },
        ],
        probability: 0.25,
        impact: 'positive',
      },
      {
        id: 'realistic',
        name: 'Scenariu Realist',
        description: 'Evoluție conformă cu tendințele istorice',
        assumptions: { growth: 0.08, marketShare: 0.02, costReduction: 0.03 },
        projections: [
          {
            metric: 'Venituri',
            baseline: baseValue,
            projected: baseValue * 1.1,
            variance: 10,
            timeline: '12 luni',
          },
          {
            metric: 'Profit',
            baseline: baseValue * 0.15,
            projected: baseValue * 0.17,
            variance: 13.3,
            timeline: '12 luni',
          },
        ],
        probability: 0.55,
        impact: 'positive',
      },
      {
        id: 'pessimistic',
        name: 'Scenariu Pesimist',
        description: 'Condiții economice nefavorabile și concurență intensă',
        assumptions: { growth: -0.05, marketShare: -0.03, costIncrease: 0.08 },
        projections: [
          {
            metric: 'Venituri',
            baseline: baseValue,
            projected: baseValue * 0.92,
            variance: -8,
            timeline: '12 luni',
          },
          {
            metric: 'Profit',
            baseline: baseValue * 0.15,
            projected: baseValue * 0.08,
            variance: -46.7,
            timeline: '12 luni',
          },
        ],
        probability: 0.2,
        impact: 'negative',
      },
    ];

    return scenarios;
  }

  // =================== CASH FLOW PREDICTION ===================

  async predictCashFlow(
    tenantId: string,
    periods: number = 6,
  ): Promise<CashFlowPrediction[]> {
    const predictions: CashFlowPrediction[] = [];
    const now = new Date();
    let runningBalance = 50000; // Starting balance

    for (let i = 1; i <= periods; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = month.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

      // Simulate inflows and outflows with some randomness
      const seasonalFactor = 1 + Math.sin((month.getMonth() / 12) * Math.PI * 2) * 0.15;
      const invoices = Math.round(80000 * seasonalFactor + (Math.random() - 0.5) * 10000);
      const other = Math.round(5000 + (Math.random() - 0.5) * 2000);
      const totalInflows = invoices + other;

      const expenses = Math.round(35000 + (Math.random() - 0.5) * 5000);
      const salaries = 25000;
      const taxes = Math.round(12000 * seasonalFactor);
      const otherOutflows = Math.round(3000 + (Math.random() - 0.5) * 1000);
      const totalOutflows = expenses + salaries + taxes + otherOutflows;

      const netCashFlow = totalInflows - totalOutflows;
      runningBalance += netCashFlow;

      const alerts: string[] = [];
      if (runningBalance < 20000) {
        alerts.push('Risc lichiditate scăzută - considerați linie de credit');
      }
      if (netCashFlow < 0) {
        alerts.push('Cash flow negativ prevăzut - optimizați încasările');
      }
      if (month.getMonth() === 2 || month.getMonth() === 5 || month.getMonth() === 8 || month.getMonth() === 11) {
        alerts.push('Termen TVA trimestrial - asigurați rezerve');
      }

      predictions.push({
        period,
        inflows: {
          invoices,
          other,
          total: totalInflows,
        },
        outflows: {
          expenses,
          salaries,
          taxes,
          other: otherOutflows,
          total: totalOutflows,
        },
        netCashFlow,
        runningBalance: Math.round(runningBalance),
        alerts,
      });
    }

    return predictions;
  }

  // =================== CHURN PREDICTION ===================

  async predictChurn(tenantId: string): Promise<ChurnPrediction[]> {
    // Sample churn predictions
    const predictions: ChurnPrediction[] = [
      {
        customerId: 'cust-001',
        customerName: 'ABC Industries SRL',
        churnProbability: 0.72,
        riskLevel: 'high',
        factors: [
          { factor: 'Activitate scăzută', weight: 0.35, value: '90+ zile fără comandă' },
          { factor: 'Scădere volum', weight: 0.25, value: '-45% vs. perioada anterioară' },
          { factor: 'Reclamații', weight: 0.2, value: '3 incidente nerezolvate' },
        ],
        recommendedActions: [
          'Contact telefonic imediat',
          'Ofertă de retenție -15%',
          'Rezolvare reclamații prioritară',
        ],
        lastActivity: new Date(Date.now() - 92 * 24 * 60 * 60 * 1000),
        lifetimeValue: 45000,
      },
      {
        customerId: 'cust-002',
        customerName: 'XYZ Trading SA',
        churnProbability: 0.58,
        riskLevel: 'medium',
        factors: [
          { factor: 'Frecvență redusă', weight: 0.3, value: '60 zile între comenzi' },
          { factor: 'Email nerespectat', weight: 0.2, value: 'Ultimele 5 emailuri ignorate' },
        ],
        recommendedActions: [
          'Campanie re-engagement',
          'Sondaj satisfacție',
          'Propunere întâlnire',
        ],
        lastActivity: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        lifetimeValue: 28000,
      },
      {
        customerId: 'cust-003',
        customerName: 'Tech Solutions SRL',
        churnProbability: 0.22,
        riskLevel: 'low',
        factors: [
          { factor: 'Întârziere plată', weight: 0.15, value: '1 factură neachitată' },
        ],
        recommendedActions: [
          'Reminder plată',
          'Monitorizare standard',
        ],
        lastActivity: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        lifetimeValue: 62000,
      },
    ];

    return predictions.sort((a, b) => b.churnProbability - a.churnProbability);
  }

  // =================== DEMAND FORECASTING ===================

  async forecastDemand(tenantId: string): Promise<DemandForecast[]> {
    const forecasts: DemandForecast[] = [
      {
        productId: 'prod-001',
        productName: 'Produc A - Premium',
        currentStock: 150,
        predictedDemand: 280,
        reorderPoint: 100,
        optimalOrderQuantity: 200,
        stockoutRisk: 0.65,
        leadTimeDays: 14,
        recommendations: [
          'Comandă urgentă recomandată - risc rupere stoc 65%',
          'Cantitate optimă: 200 unități',
          'Alternativă: reducere preț pentru gestionare stoc existent',
        ],
      },
      {
        productId: 'prod-002',
        productName: 'Produs B - Standard',
        currentStock: 500,
        predictedDemand: 320,
        reorderPoint: 150,
        optimalOrderQuantity: 300,
        stockoutRisk: 0.12,
        leadTimeDays: 7,
        recommendations: [
          'Stoc suficient pentru perioada următoare',
          'Monitorizare standard',
        ],
      },
      {
        productId: 'prod-003',
        productName: 'Produs C - Economy',
        currentStock: 80,
        predictedDemand: 180,
        reorderPoint: 90,
        optimalOrderQuantity: 150,
        stockoutRisk: 0.78,
        leadTimeDays: 21,
        recommendations: [
          'URGENT: Comandă imediată necesară',
          'Stoc sub punct de recomandă',
          'Lead time lung - risc mare de rupere',
        ],
      },
    ];

    return forecasts.sort((a, b) => b.stockoutRisk - a.stockoutRisk);
  }

  // =================== REVENUE ATTRIBUTION ===================

  async getRevenueAttribution(
    tenantId: string,
    period: string = '30d',
  ): Promise<RevenueAttribution[]> {
    const totalRevenue = 125000;

    const attribution: RevenueAttribution[] = [
      {
        source: 'Clienți Existenți',
        revenue: 87500,
        percentage: 70,
        trend: 'stable',
        growth: 3.2,
        forecast: 91000,
      },
      {
        source: 'Clienți Noi',
        revenue: 18750,
        percentage: 15,
        trend: 'up',
        growth: 12.5,
        forecast: 22000,
      },
      {
        source: 'Upsell/Cross-sell',
        revenue: 12500,
        percentage: 10,
        trend: 'up',
        growth: 8.3,
        forecast: 14000,
      },
      {
        source: 'Referințe',
        revenue: 6250,
        percentage: 5,
        trend: 'up',
        growth: 15.0,
        forecast: 7500,
      },
    ];

    return attribution.sort((a, b) => b.revenue - a.revenue);
  }

  // =================== ANALYTICS DASHBOARD DATA ===================

  async getDashboardMetrics(tenantId: string): Promise<{
    summary: Record<string, any>;
    forecasts: KPIForecast[];
    trends: TrendAnalysis[];
    alerts: string[];
  }> {
    const forecasts = await this.forecastKPIs(tenantId);

    // Generate sample trends
    const sampleData: TimeSeriesPoint[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      sampleData.push({
        date: new Date(now.getFullYear(), now.getMonth() - i, 1),
        value: 100000 + i * 2000 + Math.random() * 10000,
      });
    }

    const revenueTrend = await this.analyzeTrend('Venituri', sampleData, 'monthly');

    const alerts: string[] = [];

    // Generate alerts based on forecasts
    for (const forecast of forecasts) {
      if (forecast.confidence < 0.7) {
        alerts.push(`Încredere scăzută pentru prognoza ${forecast.kpi} - date insuficiente`);
      }
      if (forecast.changePercent < -10) {
        alerts.push(`Avertisment: ${forecast.kpi} prognozat să scadă cu ${Math.abs(forecast.changePercent).toFixed(1)}%`);
      }
    }

    return {
      summary: {
        totalRevenue: 125000,
        projectedRevenue: 138500,
        profitMargin: 15.2,
        customerCount: 245,
        avgOrderValue: 450,
        cashPosition: 50000,
      },
      forecasts,
      trends: [revenueTrend],
      alerts,
    };
  }

  // =================== MODEL ACCURACY ===================

  async getModelAccuracy(forecastId: string): Promise<{
    mape: number;
    rmse: number;
    mae: number;
    r2: number;
  }> {
    // Return sample accuracy metrics
    return {
      mape: 8.5, // Mean Absolute Percentage Error
      rmse: 1250, // Root Mean Square Error
      mae: 980, // Mean Absolute Error
      r2: 0.87, // R-squared
    };
  }
}
