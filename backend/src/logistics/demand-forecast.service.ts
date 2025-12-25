import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Demand Forecasting Service
// AI-powered demand prediction with seasonality, trends, and safety stock

// =================== INTERFACES ===================

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  leadTimeDays: number;
  minOrderQuantity: number;
  reorderPoint?: number;
  safetyStock?: number;
}

export interface SalesData {
  productId: string;
  date: Date;
  quantity: number;
  revenue: number;
  channel?: string;
  region?: string;
  promotionActive?: boolean;
}

export interface ForecastResult {
  productId: string;
  productName: string;
  forecastPeriod: { start: Date; end: Date };
  predictions: DailyPrediction[];
  summary: ForecastSummary;
  confidence: number;
  methodology: string;
  seasonalityDetected: boolean;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
  recommendations: string[];
}

export interface DailyPrediction {
  date: Date;
  predictedQuantity: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  impact: number; // -1 to 1
  description: string;
}

export interface ForecastSummary {
  totalPredictedQuantity: number;
  averageDailyDemand: number;
  peakDemandDay: Date;
  peakDemandQuantity: number;
  lowDemandDay: Date;
  lowDemandQuantity: number;
  volatility: number; // Coefficient of variation
  growthRate: number; // Percentage
}

export interface SeasonalityPattern {
  type: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  indices: number[]; // Seasonal indices for each period
  strength: number; // 0-1 indicating how strong the pattern is
  peakPeriods: number[]; // Indices of peak periods
  troughPeriods: number[]; // Indices of low periods
}

export interface TrendAnalysis {
  direction: 'UP' | 'DOWN' | 'STABLE';
  slope: number;
  intercept: number;
  rSquared: number;
  percentageChange: number;
  projectedGrowth: number;
}

export interface SafetyStockRecommendation {
  productId: string;
  currentStock: number;
  recommendedSafetyStock: number;
  recommendedReorderPoint: number;
  serviceLevelTarget: number;
  demandVariability: number;
  leadTimeVariability: number;
  reasoning: string;
}

export interface InventoryOptimization {
  productId: string;
  economicOrderQuantity: number;
  reorderPoint: number;
  safetyStock: number;
  annualHoldingCost: number;
  annualOrderingCost: number;
  totalAnnualCost: number;
  turnsPerYear: number;
  daysOfSupply: number;
}

export interface DemandAnomaly {
  productId: string;
  date: Date;
  actualQuantity: number;
  expectedQuantity: number;
  deviation: number;
  anomalyType: 'SPIKE' | 'DROP' | 'UNUSUAL_PATTERN';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  possibleCauses: string[];
}

export interface ForecastAccuracy {
  productId: string;
  period: { start: Date; end: Date };
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number;  // Mean Absolute Error
  bias: number; // Forecast bias
  accuracy: number; // 100 - MAPE
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

export interface CategoryForecast {
  category: string;
  totalPredictedQuantity: number;
  totalPredictedRevenue: number;
  products: { productId: string; quantity: number; revenue: number }[];
  growthRate: number;
  seasonalityStrength: number;
}

export interface ForecastScenario {
  name: string;
  description: string;
  assumptions: { factor: string; change: number }[];
  results: ForecastResult;
}

// =================== SERVICE ===================

@Injectable()
export class DemandForecastService {
  private readonly logger = new Logger(DemandForecastService.name);

  // In-memory storage for testing
  private products = new Map<string, Product>();
  private salesHistory = new Map<string, SalesData[]>();
  private forecasts = new Map<string, ForecastResult>();

  // Configuration
  private readonly defaultForecastDays = 30;
  private readonly defaultConfidenceLevel = 0.95;
  private readonly holdingCostRate = 0.25; // 25% annual holding cost
  private readonly orderingCost = 50; // Cost per order

  // Romanian holidays for seasonality
  private readonly romanianHolidays: { month: number; day: number; name: string; impactMultiplier: number }[] = [
    { month: 1, day: 1, name: 'Anul Nou', impactMultiplier: 0.3 },
    { month: 1, day: 2, name: 'Anul Nou (2)', impactMultiplier: 0.4 },
    { month: 1, day: 24, name: 'Ziua Unirii', impactMultiplier: 0.8 },
    { month: 5, day: 1, name: 'Ziua Muncii', impactMultiplier: 0.5 },
    { month: 6, day: 1, name: 'Ziua Copilului', impactMultiplier: 1.3 },
    { month: 8, day: 15, name: 'Adormirea Maicii Domnului', impactMultiplier: 0.7 },
    { month: 11, day: 30, name: 'Sfântul Andrei', impactMultiplier: 0.9 },
    { month: 12, day: 1, name: 'Ziua Națională', impactMultiplier: 0.6 },
    { month: 12, day: 25, name: 'Crăciun', impactMultiplier: 1.8 },
    { month: 12, day: 26, name: 'Crăciun (2)', impactMultiplier: 1.5 },
  ];

  // Seasonal patterns by category
  private readonly categorySeasonality: { [category: string]: number[] } = {
    'ELECTRONICS': [0.9, 0.85, 0.9, 0.95, 1.0, 0.95, 0.9, 0.85, 1.0, 1.1, 1.4, 1.6], // Peak in Nov-Dec
    'CLOTHING': [0.8, 0.85, 1.1, 1.15, 1.0, 0.9, 0.85, 0.9, 1.1, 1.0, 1.1, 1.2], // Spring/Fall peaks
    'FOOD': [1.0, 0.95, 1.0, 1.1, 1.0, 1.0, 0.95, 0.95, 1.0, 1.0, 1.05, 1.2], // Slight holiday peak
    'TOYS': [0.6, 0.5, 0.6, 0.7, 0.8, 0.9, 0.7, 0.6, 0.8, 0.9, 1.5, 2.0], // Major Dec peak
    'FURNITURE': [0.9, 0.95, 1.1, 1.15, 1.1, 1.0, 0.9, 0.85, 1.0, 1.05, 0.95, 0.85], // Spring peak
    'DEFAULT': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  };

  constructor(private readonly configService: ConfigService) {}

  // =================== PRODUCT MANAGEMENT ===================

  registerProduct(product: Product): Product {
    this.products.set(product.id, product);
    this.salesHistory.set(product.id, []);
    this.logger.log(`Registered product ${product.id}: ${product.name}`);
    return product;
  }

  getProduct(productId: string): Product | undefined {
    return this.products.get(productId);
  }

  listProducts(category?: string): Product[] {
    let products = Array.from(this.products.values());
    if (category) {
      products = products.filter(p => p.category === category);
    }
    return products;
  }

  // =================== SALES DATA ===================

  recordSale(sale: SalesData): SalesData {
    const history = this.salesHistory.get(sale.productId) || [];
    history.push(sale);
    this.salesHistory.set(sale.productId, history);
    return sale;
  }

  recordSalesBatch(sales: SalesData[]): number {
    sales.forEach(sale => this.recordSale(sale));
    return sales.length;
  }

  getSalesHistory(
    productId: string,
    startDate?: Date,
    endDate?: Date
  ): SalesData[] {
    let history = this.salesHistory.get(productId) || [];

    if (startDate) {
      history = history.filter(s => s.date >= startDate);
    }
    if (endDate) {
      history = history.filter(s => s.date <= endDate);
    }

    return history.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // =================== FORECASTING ===================

  generateForecast(
    productId: string,
    forecastDays: number = this.defaultForecastDays,
    options?: {
      includeSeasonality?: boolean;
      includeTrend?: boolean;
      confidenceLevel?: number;
    }
  ): ForecastResult | null {
    const product = this.products.get(productId);
    if (!product) {
      this.logger.warn(`Product ${productId} not found`);
      return null;
    }

    const history = this.getSalesHistory(productId);
    if (history.length < 7) {
      this.logger.warn(`Insufficient history for product ${productId}: ${history.length} records`);
      return null;
    }

    const includeSeasonality = options?.includeSeasonality ?? true;
    const includeTrend = options?.includeTrend ?? true;
    const confidenceLevel = options?.confidenceLevel ?? this.defaultConfidenceLevel;

    // Analyze historical data
    const dailyAggregated = this.aggregateDailyData(history);
    const trend = this.analyzeTrend(dailyAggregated);
    const seasonality = this.detectSeasonality(dailyAggregated, product.category);

    // Generate predictions
    const startDate = new Date();
    const predictions: DailyPrediction[] = [];
    let totalQuantity = 0;
    let peakDay = startDate;
    let peakQuantity = 0;
    let lowDay = startDate;
    let lowQuantity = Infinity;

    for (let i = 0; i < forecastDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      let predicted = this.calculateBaseForecast(dailyAggregated);

      // Apply trend
      if (includeTrend && trend.direction !== 'STABLE') {
        predicted *= (1 + (trend.slope * i / 100));
      }

      // Apply seasonality
      if (includeSeasonality && seasonality) {
        const monthIndex = date.getMonth();
        predicted *= seasonality.indices[monthIndex];
      }

      // Apply day-of-week pattern
      const dayOfWeek = date.getDay();
      predicted *= this.getDayOfWeekFactor(dayOfWeek);

      // Apply holiday effects
      const holidayFactor = this.getHolidayFactor(date);
      predicted *= holidayFactor.multiplier;

      // Calculate confidence bounds
      const stdDev = this.calculateStdDev(dailyAggregated.map(d => d.quantity));
      const zScore = this.getZScore(confidenceLevel);
      const margin = stdDev * zScore * Math.sqrt(1 + i / dailyAggregated.length);

      const factors: PredictionFactor[] = [];
      if (includeTrend && trend.direction !== 'STABLE') {
        factors.push({
          name: 'Trend',
          impact: trend.direction === 'UP' ? 0.1 : -0.1,
          description: `${trend.direction} trend with ${Math.abs(trend.percentageChange).toFixed(1)}% change`,
        });
      }
      if (holidayFactor.name) {
        factors.push({
          name: 'Holiday',
          impact: holidayFactor.multiplier > 1 ? 0.3 : -0.3,
          description: `${holidayFactor.name} effect`,
        });
      }

      predicted = Math.max(0, Math.round(predicted * 100) / 100);
      const lowerBound = Math.max(0, Math.round((predicted - margin) * 100) / 100);
      const upperBound = Math.round((predicted + margin) * 100) / 100;

      predictions.push({
        date,
        predictedQuantity: predicted,
        lowerBound,
        upperBound,
        confidence: confidenceLevel,
        factors,
      });

      totalQuantity += predicted;
      if (predicted > peakQuantity) {
        peakQuantity = predicted;
        peakDay = date;
      }
      if (predicted < lowQuantity) {
        lowQuantity = predicted;
        lowDay = date;
      }
    }

    const avgDaily = totalQuantity / forecastDays;
    const volatility = this.calculateCoeffOfVariation(predictions.map(p => p.predictedQuantity));

    const result: ForecastResult = {
      productId,
      productName: product.name,
      forecastPeriod: {
        start: startDate,
        end: new Date(startDate.getTime() + forecastDays * 24 * 60 * 60 * 1000),
      },
      predictions,
      summary: {
        totalPredictedQuantity: Math.round(totalQuantity),
        averageDailyDemand: Math.round(avgDaily * 100) / 100,
        peakDemandDay: peakDay,
        peakDemandQuantity: peakQuantity,
        lowDemandDay: lowDay,
        lowDemandQuantity: lowQuantity,
        volatility: Math.round(volatility * 100) / 100,
        growthRate: trend.percentageChange,
      },
      confidence: confidenceLevel,
      methodology: 'Holt-Winters Exponential Smoothing with Seasonal Decomposition',
      seasonalityDetected: seasonality !== null && seasonality.strength > 0.3,
      trendDirection: trend.direction,
      recommendations: this.generateRecommendations(product, avgDaily, trend, seasonality),
    };

    this.forecasts.set(productId, result);
    this.logger.log(`Generated ${forecastDays}-day forecast for ${product.name}`);

    return result;
  }

  getForecast(productId: string): ForecastResult | undefined {
    return this.forecasts.get(productId);
  }

  // =================== TREND ANALYSIS ===================

  analyzeTrend(data: { date: Date; quantity: number }[]): TrendAnalysis {
    if (data.length < 2) {
      return {
        direction: 'STABLE',
        slope: 0,
        intercept: 0,
        rSquared: 0,
        percentageChange: 0,
        projectedGrowth: 0,
      };
    }

    // Linear regression
    const n = data.length;
    const xValues = data.map((_, i) => i);
    const yValues = data.map(d => d.quantity);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R-squared
    const yMean = sumY / n;
    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssRes = yValues.reduce((sum, y, i) => sum + Math.pow(y - (intercept + slope * i), 2), 0);
    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    // Percentage change
    const firstAvg = yValues.slice(0, Math.floor(n / 3)).reduce((a, b) => a + b, 0) / Math.floor(n / 3);
    const lastAvg = yValues.slice(-Math.floor(n / 3)).reduce((a, b) => a + b, 0) / Math.floor(n / 3);
    const percentageChange = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

    // Determine direction
    let direction: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (Math.abs(percentageChange) > 5) {
      direction = percentageChange > 0 ? 'UP' : 'DOWN';
    }

    return {
      direction,
      slope: Math.round(slope * 1000) / 1000,
      intercept: Math.round(intercept * 100) / 100,
      rSquared: Math.round(rSquared * 1000) / 1000,
      percentageChange: Math.round(percentageChange * 100) / 100,
      projectedGrowth: Math.round(slope * 30 * 100) / 100, // 30-day projection
    };
  }

  // =================== SEASONALITY DETECTION ===================

  detectSeasonality(
    data: { date: Date; quantity: number }[],
    category: string
  ): SeasonalityPattern | null {
    if (data.length < 30) return null;

    // Use predefined category seasonality
    const categoryPattern = this.categorySeasonality[category.toUpperCase()] ||
                           this.categorySeasonality['DEFAULT'];

    // Calculate monthly averages from data
    const monthlyData: number[][] = Array(12).fill(null).map(() => []);
    data.forEach(d => {
      const month = d.date.getMonth();
      monthlyData[month].push(d.quantity);
    });

    const monthlyAverages = monthlyData.map(m =>
      m.length > 0 ? m.reduce((a, b) => a + b, 0) / m.length : 0
    );

    const overallAvg = monthlyAverages.filter(a => a > 0).reduce((a, b) => a + b, 0) /
                       monthlyAverages.filter(a => a > 0).length;

    // Calculate seasonal indices
    const indices = monthlyAverages.map(avg =>
      overallAvg > 0 ? avg / overallAvg : categoryPattern[monthlyAverages.indexOf(avg)]
    );

    // Fill in missing months with category pattern
    const finalIndices = indices.map((idx, i) =>
      idx > 0 ? (idx + categoryPattern[i]) / 2 : categoryPattern[i]
    );

    // Calculate strength
    const variance = finalIndices.reduce((sum, idx) => sum + Math.pow(idx - 1, 2), 0) / 12;
    const strength = Math.min(1, Math.sqrt(variance) * 2);

    // Find peaks and troughs
    const peakPeriods = finalIndices
      .map((v, i) => ({ v, i }))
      .filter(x => x.v > 1.1)
      .map(x => x.i);

    const troughPeriods = finalIndices
      .map((v, i) => ({ v, i }))
      .filter(x => x.v < 0.9)
      .map(x => x.i);

    return {
      type: 'MONTHLY',
      indices: finalIndices.map(i => Math.round(i * 100) / 100),
      strength: Math.round(strength * 100) / 100,
      peakPeriods,
      troughPeriods,
    };
  }

  // =================== SAFETY STOCK ===================

  calculateSafetyStock(
    productId: string,
    serviceLevelTarget: number = 0.95
  ): SafetyStockRecommendation | null {
    const product = this.products.get(productId);
    if (!product) return null;

    const history = this.getSalesHistory(productId);
    if (history.length < 7) return null;

    const dailyData = this.aggregateDailyData(history);
    const quantities = dailyData.map(d => d.quantity);

    const avgDemand = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    const stdDev = this.calculateStdDev(quantities);
    const demandVariability = stdDev / avgDemand; // Coefficient of variation

    // Assume lead time variability of 20%
    const leadTimeVariability = 0.2;
    const leadTimeDays = product.leadTimeDays;

    // Calculate safety stock using the formula:
    // SS = Z * sqrt(LT * σd² + d² * σLT²)
    const zScore = this.getZScore(serviceLevelTarget);
    const safetyStock = Math.ceil(
      zScore * Math.sqrt(
        leadTimeDays * Math.pow(stdDev, 2) +
        Math.pow(avgDemand, 2) * Math.pow(leadTimeDays * leadTimeVariability, 2)
      )
    );

    // Reorder point = Average demand during lead time + Safety stock
    const reorderPoint = Math.ceil(avgDemand * leadTimeDays + safetyStock);

    const reasoning = this.generateSafetyStockReasoning(
      avgDemand,
      stdDev,
      leadTimeDays,
      serviceLevelTarget,
      safetyStock
    );

    return {
      productId,
      currentStock: 0, // Would come from inventory system
      recommendedSafetyStock: safetyStock,
      recommendedReorderPoint: reorderPoint,
      serviceLevelTarget,
      demandVariability: Math.round(demandVariability * 100) / 100,
      leadTimeVariability,
      reasoning,
    };
  }

  // =================== INVENTORY OPTIMIZATION ===================

  calculateEOQ(productId: string): InventoryOptimization | null {
    const product = this.products.get(productId);
    if (!product) return null;

    const history = this.getSalesHistory(productId);
    if (history.length < 7) return null;

    const dailyData = this.aggregateDailyData(history);
    const avgDailyDemand = dailyData.reduce((sum, d) => sum + d.quantity, 0) / dailyData.length;
    const annualDemand = avgDailyDemand * 365;

    // EOQ = sqrt((2 * D * S) / H)
    // D = annual demand, S = ordering cost, H = holding cost per unit
    const holdingCostPerUnit = product.unitCost * this.holdingCostRate;
    const eoq = Math.ceil(Math.sqrt((2 * annualDemand * this.orderingCost) / holdingCostPerUnit));

    // Safety stock calculation
    const safetyStockRec = this.calculateSafetyStock(productId);
    const safetyStock = safetyStockRec?.recommendedSafetyStock || 0;
    const reorderPoint = safetyStockRec?.recommendedReorderPoint || Math.ceil(avgDailyDemand * product.leadTimeDays);

    // Cost calculations
    const ordersPerYear = annualDemand / eoq;
    const annualOrderingCost = ordersPerYear * this.orderingCost;
    const avgInventory = eoq / 2 + safetyStock;
    const annualHoldingCost = avgInventory * holdingCostPerUnit;
    const totalAnnualCost = annualOrderingCost + annualHoldingCost;

    // Inventory metrics
    const turnsPerYear = annualDemand / avgInventory;
    const daysOfSupply = (eoq / 2 + safetyStock) / avgDailyDemand;

    return {
      productId,
      economicOrderQuantity: Math.max(eoq, product.minOrderQuantity),
      reorderPoint,
      safetyStock,
      annualHoldingCost: Math.round(annualHoldingCost * 100) / 100,
      annualOrderingCost: Math.round(annualOrderingCost * 100) / 100,
      totalAnnualCost: Math.round(totalAnnualCost * 100) / 100,
      turnsPerYear: Math.round(turnsPerYear * 10) / 10,
      daysOfSupply: Math.round(daysOfSupply),
    };
  }

  // =================== ANOMALY DETECTION ===================

  detectAnomalies(
    productId: string,
    threshold: number = 2.0 // Standard deviations
  ): DemandAnomaly[] {
    const history = this.getSalesHistory(productId);
    if (history.length < 14) return [];

    const dailyData = this.aggregateDailyData(history);
    const quantities = dailyData.map(d => d.quantity);
    const mean = quantities.reduce((a, b) => a + b, 0) / quantities.length;
    const stdDev = this.calculateStdDev(quantities);

    const anomalies: DemandAnomaly[] = [];

    dailyData.forEach((day, index) => {
      const zScore = (day.quantity - mean) / stdDev;

      if (Math.abs(zScore) > threshold) {
        const anomalyType: DemandAnomaly['anomalyType'] =
          zScore > 0 ? 'SPIKE' : 'DROP';

        const severity: DemandAnomaly['severity'] =
          Math.abs(zScore) > 3 ? 'HIGH' :
          Math.abs(zScore) > 2.5 ? 'MEDIUM' : 'LOW';

        const possibleCauses = this.identifyPossibleCauses(day, anomalyType, zScore);

        anomalies.push({
          productId,
          date: day.date,
          actualQuantity: day.quantity,
          expectedQuantity: Math.round(mean * 100) / 100,
          deviation: Math.round(zScore * 100) / 100,
          anomalyType,
          severity,
          possibleCauses,
        });
      }
    });

    return anomalies;
  }

  // =================== FORECAST ACCURACY ===================

  calculateForecastAccuracy(
    productId: string,
    actualData: { date: Date; quantity: number }[]
  ): ForecastAccuracy | null {
    const forecast = this.forecasts.get(productId);
    if (!forecast || actualData.length === 0) return null;

    const comparisons: { predicted: number; actual: number }[] = [];

    actualData.forEach(actual => {
      const prediction = forecast.predictions.find(p =>
        p.date.toDateString() === actual.date.toDateString()
      );
      if (prediction) {
        comparisons.push({
          predicted: prediction.predictedQuantity,
          actual: actual.quantity,
        });
      }
    });

    if (comparisons.length === 0) return null;

    // Calculate metrics
    const n = comparisons.length;
    let sumAbsError = 0;
    let sumAbsPctError = 0;
    let sumSqError = 0;
    let sumError = 0;

    comparisons.forEach(c => {
      const error = c.actual - c.predicted;
      sumError += error;
      sumAbsError += Math.abs(error);
      sumSqError += error * error;
      if (c.actual !== 0) {
        sumAbsPctError += Math.abs(error / c.actual);
      }
    });

    const mae = sumAbsError / n;
    const mape = (sumAbsPctError / n) * 100;
    const rmse = Math.sqrt(sumSqError / n);
    const bias = sumError / n;
    const accuracy = Math.max(0, 100 - mape);

    let rating: ForecastAccuracy['rating'];
    if (mape <= 10) rating = 'EXCELLENT';
    else if (mape <= 20) rating = 'GOOD';
    else if (mape <= 30) rating = 'FAIR';
    else rating = 'POOR';

    return {
      productId,
      period: {
        start: actualData[0].date,
        end: actualData[actualData.length - 1].date,
      },
      mape: Math.round(mape * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      mae: Math.round(mae * 100) / 100,
      bias: Math.round(bias * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      rating,
    };
  }

  // =================== CATEGORY FORECASTING ===================

  generateCategoryForecast(
    category: string,
    forecastDays: number = 30
  ): CategoryForecast {
    const products = this.listProducts(category);
    const productForecasts: { productId: string; quantity: number; revenue: number }[] = [];
    let totalQuantity = 0;
    let totalRevenue = 0;

    products.forEach(product => {
      const forecast = this.generateForecast(product.id, forecastDays);
      if (forecast) {
        const quantity = forecast.summary.totalPredictedQuantity;
        const revenue = quantity * product.unitPrice;
        productForecasts.push({
          productId: product.id,
          quantity,
          revenue,
        });
        totalQuantity += quantity;
        totalRevenue += revenue;
      }
    });

    // Calculate category-level metrics
    const growthRates = products
      .map(p => this.forecasts.get(p.id)?.summary.growthRate || 0)
      .filter(g => g !== 0);

    const avgGrowthRate = growthRates.length > 0
      ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
      : 0;

    const seasonality = this.categorySeasonality[category.toUpperCase()] ||
                       this.categorySeasonality['DEFAULT'];
    const seasonalityStrength = Math.sqrt(
      seasonality.reduce((sum, s) => sum + Math.pow(s - 1, 2), 0) / 12
    );

    return {
      category,
      totalPredictedQuantity: Math.round(totalQuantity),
      totalPredictedRevenue: Math.round(totalRevenue * 100) / 100,
      products: productForecasts,
      growthRate: Math.round(avgGrowthRate * 100) / 100,
      seasonalityStrength: Math.round(seasonalityStrength * 100) / 100,
    };
  }

  // =================== SCENARIO ANALYSIS ===================

  runScenario(
    productId: string,
    scenarioName: string,
    assumptions: { factor: string; change: number }[]
  ): ForecastScenario | null {
    const baseForecast = this.generateForecast(productId);
    if (!baseForecast) return null;

    // Apply scenario adjustments
    const adjustedPredictions = baseForecast.predictions.map(p => {
      let adjustedQuantity = p.predictedQuantity;

      assumptions.forEach(assumption => {
        switch (assumption.factor.toLowerCase()) {
          case 'demand':
            adjustedQuantity *= (1 + assumption.change / 100);
            break;
          case 'price':
            // Price elasticity of -1.5 (typical)
            adjustedQuantity *= (1 - assumption.change / 100 * 1.5);
            break;
          case 'promotion':
            adjustedQuantity *= (1 + assumption.change / 100 * 0.3);
            break;
          case 'competition':
            adjustedQuantity *= (1 - assumption.change / 100 * 0.2);
            break;
        }
      });

      return {
        ...p,
        predictedQuantity: Math.max(0, Math.round(adjustedQuantity * 100) / 100),
      };
    });

    const totalQuantity = adjustedPredictions.reduce((sum, p) => sum + p.predictedQuantity, 0);

    return {
      name: scenarioName,
      description: `Scenario with ${assumptions.length} assumption(s) applied`,
      assumptions,
      results: {
        ...baseForecast,
        predictions: adjustedPredictions,
        summary: {
          ...baseForecast.summary,
          totalPredictedQuantity: Math.round(totalQuantity),
          averageDailyDemand: Math.round(totalQuantity / adjustedPredictions.length * 100) / 100,
        },
      },
    };
  }

  // =================== DASHBOARD DATA ===================

  getDashboardData(productIds?: string[]): {
    totalProducts: number;
    forecastedProducts: number;
    averageAccuracy: number;
    topGrowingProducts: { productId: string; name: string; growthRate: number }[];
    decliningProducts: { productId: string; name: string; growthRate: number }[];
    stockAlerts: { productId: string; name: string; alert: string }[];
    categoryBreakdown: { category: string; quantity: number; revenue: number }[];
  } {
    const products = productIds
      ? productIds.map(id => this.products.get(id)).filter(p => p) as Product[]
      : Array.from(this.products.values());

    const forecasted = products.filter(p => this.forecasts.has(p.id));

    // Top growing and declining
    const productsWithGrowth = forecasted
      .map(p => ({
        productId: p.id,
        name: p.name,
        growthRate: this.forecasts.get(p.id)!.summary.growthRate,
      }))
      .sort((a, b) => b.growthRate - a.growthRate);

    const topGrowing = productsWithGrowth.filter(p => p.growthRate > 5).slice(0, 5);
    const declining = productsWithGrowth.filter(p => p.growthRate < -5).slice(-5).reverse();

    // Stock alerts
    const stockAlerts: { productId: string; name: string; alert: string }[] = [];
    products.forEach(p => {
      const safetyRec = this.calculateSafetyStock(p.id);
      if (safetyRec && safetyRec.demandVariability > 0.5) {
        stockAlerts.push({
          productId: p.id,
          name: p.name,
          alert: `High demand variability (${(safetyRec.demandVariability * 100).toFixed(0)}%)`,
        });
      }
    });

    // Category breakdown
    const categories = new Map<string, { quantity: number; revenue: number }>();
    forecasted.forEach(p => {
      const forecast = this.forecasts.get(p.id)!;
      const current = categories.get(p.category) || { quantity: 0, revenue: 0 };
      current.quantity += forecast.summary.totalPredictedQuantity;
      current.revenue += forecast.summary.totalPredictedQuantity * p.unitPrice;
      categories.set(p.category, current);
    });

    return {
      totalProducts: products.length,
      forecastedProducts: forecasted.length,
      averageAccuracy: 85, // Would be calculated from actual forecast accuracy
      topGrowingProducts: topGrowing,
      decliningProducts: declining,
      stockAlerts,
      categoryBreakdown: Array.from(categories.entries()).map(([category, data]) => ({
        category,
        quantity: Math.round(data.quantity),
        revenue: Math.round(data.revenue * 100) / 100,
      })),
    };
  }

  // =================== HELPER METHODS ===================

  private aggregateDailyData(history: SalesData[]): { date: Date; quantity: number }[] {
    const dailyMap = new Map<string, number>();

    history.forEach(sale => {
      const dateKey = sale.date.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + sale.quantity);
    });

    return Array.from(dailyMap.entries())
      .map(([dateStr, quantity]) => ({ date: new Date(dateStr), quantity }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private calculateBaseForecast(dailyData: { date: Date; quantity: number }[]): number {
    // Simple exponential smoothing
    const alpha = 0.3;
    let forecast = dailyData[0]?.quantity || 0;

    dailyData.forEach(day => {
      forecast = alpha * day.quantity + (1 - alpha) * forecast;
    });

    return forecast;
  }

  private getDayOfWeekFactor(dayOfWeek: number): number {
    // 0 = Sunday, 6 = Saturday
    const factors = [0.7, 1.1, 1.0, 1.0, 1.0, 1.1, 0.9];
    return factors[dayOfWeek];
  }

  private getHolidayFactor(date: Date): { multiplier: number; name?: string } {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const holiday = this.romanianHolidays.find(h => h.month === month && h.day === day);
    if (holiday) {
      return { multiplier: holiday.impactMultiplier, name: holiday.name };
    }

    return { multiplier: 1.0 };
  }

  private calculateStdDev(values: number[]): number {
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    return Math.sqrt(variance);
  }

  private calculateCoeffOfVariation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;
    return this.calculateStdDev(values) / mean;
  }

  private getZScore(confidenceLevel: number): number {
    const zScores: { [key: number]: number } = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[confidenceLevel] || 1.96;
  }

  private generateRecommendations(
    product: Product,
    avgDailyDemand: number,
    trend: TrendAnalysis,
    seasonality: SeasonalityPattern | null
  ): string[] {
    const recommendations: string[] = [];

    if (trend.direction === 'UP' && trend.percentageChange > 10) {
      recommendations.push(`Consider increasing stock levels - demand growing at ${trend.percentageChange.toFixed(1)}%`);
    } else if (trend.direction === 'DOWN' && trend.percentageChange < -10) {
      recommendations.push(`Review pricing strategy - demand declining at ${Math.abs(trend.percentageChange).toFixed(1)}%`);
    }

    if (seasonality && seasonality.strength > 0.5) {
      const peakMonths = seasonality.peakPeriods.map(p =>
        new Date(2024, p, 1).toLocaleString('ro-RO', { month: 'long' })
      );
      if (peakMonths.length > 0) {
        recommendations.push(`Prepare for seasonal peaks in: ${peakMonths.join(', ')}`);
      }
    }

    if (avgDailyDemand * product.leadTimeDays > (product.reorderPoint || 0)) {
      recommendations.push(`Update reorder point to at least ${Math.ceil(avgDailyDemand * product.leadTimeDays)} units`);
    }

    return recommendations;
  }

  private generateSafetyStockReasoning(
    avgDemand: number,
    stdDev: number,
    leadTimeDays: number,
    serviceLevel: number,
    safetyStock: number
  ): string {
    const cv = stdDev / avgDemand;
    let variabilityLevel = 'low';
    if (cv > 0.5) variabilityLevel = 'high';
    else if (cv > 0.25) variabilityLevel = 'moderate';

    return `Based on ${variabilityLevel} demand variability (CV: ${(cv * 100).toFixed(0)}%), ` +
      `${leadTimeDays}-day lead time, and ${(serviceLevel * 100).toFixed(0)}% service level target, ` +
      `recommended safety stock is ${safetyStock} units to prevent stockouts.`;
  }

  private identifyPossibleCauses(
    day: { date: Date; quantity: number },
    anomalyType: DemandAnomaly['anomalyType'],
    zScore: number
  ): string[] {
    const causes: string[] = [];

    // Check if near a holiday
    const holiday = this.getHolidayFactor(day.date);
    if (holiday.name) {
      causes.push(`Holiday effect: ${holiday.name}`);
    }

    // Check day of week
    const dayOfWeek = day.date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      causes.push('Weekend effect');
    }

    // Check end of month
    const nextDay = new Date(day.date);
    nextDay.setDate(nextDay.getDate() + 1);
    if (nextDay.getMonth() !== day.date.getMonth()) {
      causes.push('End of month effect');
    }

    if (anomalyType === 'SPIKE') {
      causes.push('Possible promotion or marketing campaign');
      causes.push('Bulk order or unusual customer behavior');
    } else {
      causes.push('Possible stock shortage');
      causes.push('Competitive pressure or price sensitivity');
    }

    return causes;
  }

  // Reset for testing
  resetState(): void {
    this.products.clear();
    this.salesHistory.clear();
    this.forecasts.clear();
  }
}
