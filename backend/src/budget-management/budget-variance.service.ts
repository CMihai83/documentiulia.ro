import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BudgetPlanningService, Budget, BudgetLineItem } from './budget-planning.service';
import { BudgetTrackingService } from './budget-tracking.service';

// =================== TYPES ===================

export type VarianceType = 'favorable' | 'unfavorable' | 'neutral';
export type VarianceCategory = 'volume' | 'price' | 'efficiency' | 'mix' | 'timing' | 'other';

export interface VarianceAnalysis {
  id: string;
  tenantId: string;
  budgetId: string;
  budgetName: string;
  period: string;
  analysisDate: Date;
  summary: {
    totalPlanned: number;
    totalActual: number;
    totalVariance: number;
    variancePercentage: number;
    varianceType: VarianceType;
  };
  lineItemVariances: LineItemVariance[];
  categoryVariances: CategoryVariance[];
  periodComparison?: PeriodComparison[];
  rootCauses?: RootCauseAnalysis[];
  recommendations?: string[];
  createdBy: string;
  createdAt: Date;
}

export interface LineItemVariance {
  lineItemId: string;
  categoryName: string;
  subcategoryName?: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  varianceType: VarianceType;
  varianceCategory?: VarianceCategory;
  explanation?: string;
}

export interface CategoryVariance {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  varianceType: VarianceType;
  contribution: number; // contribution to total variance
}

export interface PeriodComparison {
  period: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  cumulativePlanned: number;
  cumulativeActual: number;
  cumulativeVariance: number;
}

export interface RootCauseAnalysis {
  lineItemId: string;
  categoryName: string;
  variance: number;
  possibleCauses: string[];
  impactLevel: 'low' | 'medium' | 'high';
  actionRequired: boolean;
}

export interface VarianceTrend {
  period: string;
  budgetId: string;
  budgetName: string;
  variance: number;
  variancePercentage: number;
  varianceType: VarianceType;
  trend: 'improving' | 'worsening' | 'stable';
}

export interface VarianceThreshold {
  id: string;
  tenantId: string;
  budgetId?: string;
  categoryId?: string;
  thresholdType: 'amount' | 'percentage';
  warningThreshold: number;
  criticalThreshold: number;
  notifyOnWarning: boolean;
  notifyOnCritical: boolean;
  notificationRecipients?: string[];
  isActive: boolean;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class BudgetVarianceService {
  private analyses: Map<string, VarianceAnalysis> = new Map();
  private thresholds: Map<string, VarianceThreshold> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private budgetService: BudgetPlanningService,
    private trackingService: BudgetTrackingService,
  ) {}

  // =================== VARIANCE ANALYSIS ===================

  async analyzeVariance(
    budgetId: string,
    period?: string,
    createdBy?: string,
  ): Promise<VarianceAnalysis> {
    const budget = await this.budgetService.getBudget(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    const lineItems = await this.budgetService.getLineItems(budgetId);
    const transactions = await this.trackingService.getTransactions(budget.tenantId, {
      budgetId,
    });

    const id = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const analysisDate = new Date();
    const analysisPeriod = period || `${analysisDate.getFullYear()}-${String(analysisDate.getMonth() + 1).padStart(2, '0')}`;

    // Calculate line item variances
    const lineItemVariances: LineItemVariance[] = [];
    const categoryTotals: Record<string, { planned: number; actual: number }> = {};

    for (const lineItem of lineItems) {
      const actualSpent = transactions
        .filter((t) => t.lineItemId === lineItem.id && t.status === 'posted')
        .reduce((sum, t) => sum + t.amount, 0);

      const variance = lineItem.plannedAmount - actualSpent;
      const variancePercentage = lineItem.plannedAmount > 0
        ? Math.round((variance / lineItem.plannedAmount) * 100 * 100) / 100
        : 0;

      const varianceType = this.determineVarianceType(variance, lineItem.categoryName);

      lineItemVariances.push({
        lineItemId: lineItem.id,
        categoryName: lineItem.categoryName,
        subcategoryName: lineItem.subcategoryName,
        planned: lineItem.plannedAmount,
        actual: actualSpent,
        variance,
        variancePercentage,
        varianceType,
        varianceCategory: this.categorizeVariance(variance, lineItem),
      });

      // Aggregate by category
      if (!categoryTotals[lineItem.categoryName]) {
        categoryTotals[lineItem.categoryName] = { planned: 0, actual: 0 };
      }
      categoryTotals[lineItem.categoryName].planned += lineItem.plannedAmount;
      categoryTotals[lineItem.categoryName].actual += actualSpent;
    }

    // Calculate category variances
    const totalVariance = budget.allocatedAmount - budget.spentAmount;
    const categoryVariances: CategoryVariance[] = Object.entries(categoryTotals).map(
      ([category, totals]) => {
        const variance = totals.planned - totals.actual;
        const contribution = totalVariance !== 0
          ? Math.round((variance / totalVariance) * 100 * 100) / 100
          : 0;

        return {
          category,
          planned: totals.planned,
          actual: totals.actual,
          variance,
          variancePercentage: totals.planned > 0
            ? Math.round((variance / totals.planned) * 100 * 100) / 100
            : 0,
          varianceType: this.determineVarianceType(variance, category),
          contribution,
        };
      },
    );

    // Generate root cause analysis for significant variances
    const rootCauses = this.generateRootCauseAnalysis(lineItemVariances);

    // Generate recommendations
    const recommendations = this.generateRecommendations(lineItemVariances, categoryVariances);

    // Calculate period comparison
    const periodComparison = await this.calculatePeriodComparison(budget, lineItems, transactions);

    const analysis: VarianceAnalysis = {
      id,
      tenantId: budget.tenantId,
      budgetId,
      budgetName: budget.name,
      period: analysisPeriod,
      analysisDate,
      summary: {
        totalPlanned: budget.allocatedAmount,
        totalActual: budget.spentAmount,
        totalVariance,
        variancePercentage: budget.allocatedAmount > 0
          ? Math.round((totalVariance / budget.allocatedAmount) * 100 * 100) / 100
          : 0,
        varianceType: totalVariance >= 0 ? 'favorable' : 'unfavorable',
      },
      lineItemVariances,
      categoryVariances,
      periodComparison,
      rootCauses,
      recommendations,
      createdBy: createdBy || 'system',
      createdAt: analysisDate,
    };

    this.analyses.set(id, analysis);

    // Check thresholds and emit alerts
    await this.checkVarianceThresholds(analysis);

    this.eventEmitter.emit('budget.variance_analyzed', { analysis });

    return analysis;
  }

  private determineVarianceType(variance: number, category: string): VarianceType {
    if (Math.abs(variance) < 0.01) return 'neutral';

    // For expense categories, positive variance (under budget) is favorable
    // For revenue categories, negative variance (over budget) is favorable
    const isRevenueCategory = ['revenue', 'sales', 'income'].some(
      (term) => category.toLowerCase().includes(term),
    );

    if (isRevenueCategory) {
      return variance < 0 ? 'favorable' : 'unfavorable';
    }
    return variance > 0 ? 'favorable' : 'unfavorable';
  }

  private categorizeVariance(variance: number, lineItem: BudgetLineItem): VarianceCategory {
    // Simplified categorization - in real implementation would analyze transaction details
    if (Math.abs(variance) < lineItem.plannedAmount * 0.05) return 'timing';
    if (Math.abs(variance) > lineItem.plannedAmount * 0.20) return 'volume';
    return 'price';
  }

  private generateRootCauseAnalysis(variances: LineItemVariance[]): RootCauseAnalysis[] {
    const significantVariances = variances.filter(
      (v) => Math.abs(v.variancePercentage) >= 10 || Math.abs(v.variance) >= 10000,
    );

    return significantVariances.map((v) => {
      const possibleCauses: string[] = [];
      const impactLevel: 'low' | 'medium' | 'high' =
        Math.abs(v.variancePercentage) >= 25 ? 'high' :
          Math.abs(v.variancePercentage) >= 15 ? 'medium' : 'low';

      if (v.varianceType === 'unfavorable') {
        if (v.varianceCategory === 'volume') {
          possibleCauses.push('Higher than expected demand/usage');
          possibleCauses.push('Scope expansion or unplanned activities');
        } else if (v.varianceCategory === 'price') {
          possibleCauses.push('Price increases from vendors');
          possibleCauses.push('Inflation impact not accounted for');
        } else if (v.varianceCategory === 'timing') {
          possibleCauses.push('Accelerated spending timeline');
          possibleCauses.push('Earlier than planned purchases');
        }
      } else if (v.varianceType === 'favorable') {
        possibleCauses.push('Cost savings initiatives');
        possibleCauses.push('Lower than expected activity levels');
        possibleCauses.push('Deferred spending to future periods');
      }

      return {
        lineItemId: v.lineItemId,
        categoryName: v.categoryName,
        variance: v.variance,
        possibleCauses,
        impactLevel,
        actionRequired: impactLevel === 'high',
      };
    });
  }

  private generateRecommendations(
    lineItemVariances: LineItemVariance[],
    categoryVariances: CategoryVariance[],
  ): string[] {
    const recommendations: string[] = [];

    // Check for significant unfavorable variances
    const unfavorableCategories = categoryVariances.filter(
      (c) => c.varianceType === 'unfavorable' && Math.abs(c.variancePercentage) >= 15,
    );

    if (unfavorableCategories.length > 0) {
      recommendations.push(
        `Review spending in ${unfavorableCategories.map((c) => c.category).join(', ')} - significant overspending detected`,
      );
    }

    // Check for significant favorable variances (potential underspending)
    const favorableCategories = categoryVariances.filter(
      (c) => c.varianceType === 'favorable' && c.variancePercentage >= 25,
    );

    if (favorableCategories.length > 0) {
      recommendations.push(
        `Investigate underspending in ${favorableCategories.map((c) => c.category).join(', ')} - may indicate delayed projects or unrealistic budgets`,
      );
    }

    // Check for pattern of timing variances
    const timingVariances = lineItemVariances.filter((v) => v.varianceCategory === 'timing');
    if (timingVariances.length > lineItemVariances.length * 0.3) {
      recommendations.push('Consider revising budget phasing to better match actual spending patterns');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Budget performance is within acceptable thresholds');
      recommendations.push('Continue monitoring trends and maintain current controls');
    }

    return recommendations;
  }

  private async calculatePeriodComparison(
    budget: Budget,
    lineItems: BudgetLineItem[],
    transactions: any[],
  ): Promise<PeriodComparison[]> {
    const comparisons: PeriodComparison[] = [];
    const periods: Record<string, { planned: number; actual: number }> = {};

    // Aggregate by period
    for (const lineItem of lineItems) {
      for (const period of lineItem.periodBreakdown) {
        if (!periods[period.period]) {
          periods[period.period] = { planned: 0, actual: 0 };
        }
        periods[period.period].planned += period.plannedAmount;
      }
    }

    for (const transaction of transactions) {
      if (transaction.status === 'posted') {
        if (!periods[transaction.period]) {
          periods[transaction.period] = { planned: 0, actual: 0 };
        }
        periods[transaction.period].actual += transaction.amount;
      }
    }

    // Calculate cumulative values
    let cumulativePlanned = 0;
    let cumulativeActual = 0;

    const sortedPeriods = Object.keys(periods).sort();
    for (const period of sortedPeriods) {
      const data = periods[period];
      cumulativePlanned += data.planned;
      cumulativeActual += data.actual;

      const variance = data.planned - data.actual;
      comparisons.push({
        period,
        planned: data.planned,
        actual: data.actual,
        variance,
        variancePercentage: data.planned > 0 ? Math.round((variance / data.planned) * 100 * 100) / 100 : 0,
        cumulativePlanned,
        cumulativeActual,
        cumulativeVariance: cumulativePlanned - cumulativeActual,
      });
    }

    return comparisons;
  }

  async getVarianceAnalysis(id: string): Promise<VarianceAnalysis | null> {
    return this.analyses.get(id) || null;
  }

  async getVarianceHistory(
    tenantId: string,
    budgetId?: string,
    limit?: number,
  ): Promise<VarianceAnalysis[]> {
    let analyses = Array.from(this.analyses.values()).filter(
      (a) => a.tenantId === tenantId,
    );

    if (budgetId) {
      analyses = analyses.filter((a) => a.budgetId === budgetId);
    }

    analyses = analyses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (limit) {
      analyses = analyses.slice(0, limit);
    }

    return analyses;
  }

  // =================== VARIANCE TRENDS ===================

  async getVarianceTrends(
    tenantId: string,
    budgetId?: string,
    periods?: number,
  ): Promise<VarianceTrend[]> {
    const analyses = await this.getVarianceHistory(tenantId, budgetId, periods || 12);

    const trends: VarianceTrend[] = [];
    for (let i = 0; i < analyses.length; i++) {
      const current = analyses[i];
      const previous = analyses[i + 1];

      let trend: 'improving' | 'worsening' | 'stable' = 'stable';
      if (previous) {
        const currentVariancePct = Math.abs(current.summary.variancePercentage);
        const previousVariancePct = Math.abs(previous.summary.variancePercentage);

        if (currentVariancePct < previousVariancePct - 2) {
          trend = 'improving';
        } else if (currentVariancePct > previousVariancePct + 2) {
          trend = 'worsening';
        }
      }

      trends.push({
        period: current.period,
        budgetId: current.budgetId,
        budgetName: current.budgetName,
        variance: current.summary.totalVariance,
        variancePercentage: current.summary.variancePercentage,
        varianceType: current.summary.varianceType,
        trend,
      });
    }

    return trends;
  }

  // =================== THRESHOLDS ===================

  async setVarianceThreshold(data: {
    tenantId: string;
    budgetId?: string;
    categoryId?: string;
    thresholdType: 'amount' | 'percentage';
    warningThreshold: number;
    criticalThreshold: number;
    notifyOnWarning?: boolean;
    notifyOnCritical?: boolean;
    notificationRecipients?: string[];
  }): Promise<VarianceThreshold> {
    const id = `threshold-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const threshold: VarianceThreshold = {
      id,
      tenantId: data.tenantId,
      budgetId: data.budgetId,
      categoryId: data.categoryId,
      thresholdType: data.thresholdType,
      warningThreshold: data.warningThreshold,
      criticalThreshold: data.criticalThreshold,
      notifyOnWarning: data.notifyOnWarning ?? true,
      notifyOnCritical: data.notifyOnCritical ?? true,
      notificationRecipients: data.notificationRecipients,
      isActive: true,
      createdAt: new Date(),
    };

    this.thresholds.set(id, threshold);

    return threshold;
  }

  async getVarianceThresholds(
    tenantId: string,
    budgetId?: string,
  ): Promise<VarianceThreshold[]> {
    let thresholds = Array.from(this.thresholds.values()).filter(
      (t) => t.tenantId === tenantId && t.isActive,
    );

    if (budgetId) {
      thresholds = thresholds.filter((t) => !t.budgetId || t.budgetId === budgetId);
    }

    return thresholds;
  }

  private async checkVarianceThresholds(analysis: VarianceAnalysis): Promise<void> {
    const thresholds = await this.getVarianceThresholds(analysis.tenantId, analysis.budgetId);

    for (const threshold of thresholds) {
      const varianceValue = threshold.thresholdType === 'percentage'
        ? Math.abs(analysis.summary.variancePercentage)
        : Math.abs(analysis.summary.totalVariance);

      if (varianceValue >= threshold.criticalThreshold && threshold.notifyOnCritical) {
        this.eventEmitter.emit('budget.variance_threshold_exceeded', {
          analysis,
          threshold,
          severity: 'critical',
          varianceValue,
        });
      } else if (varianceValue >= threshold.warningThreshold && threshold.notifyOnWarning) {
        this.eventEmitter.emit('budget.variance_threshold_exceeded', {
          analysis,
          threshold,
          severity: 'warning',
          varianceValue,
        });
      }
    }
  }

  // =================== COMPARISON ===================

  async compareBudgets(
    budgetIds: string[],
  ): Promise<{
    budgets: Array<{
      budgetId: string;
      budgetName: string;
      planned: number;
      actual: number;
      variance: number;
      variancePercentage: number;
      utilizationRate: number;
    }>;
    bestPerformer: string;
    worstPerformer: string;
    averageVariance: number;
  }> {
    const results: Array<{
      budgetId: string;
      budgetName: string;
      planned: number;
      actual: number;
      variance: number;
      variancePercentage: number;
      utilizationRate: number;
    }> = [];

    for (const budgetId of budgetIds) {
      const budget = await this.budgetService.getBudget(budgetId);
      if (!budget) continue;

      const variance = budget.allocatedAmount - budget.spentAmount;
      const variancePercentage = budget.allocatedAmount > 0
        ? Math.round((variance / budget.allocatedAmount) * 100 * 100) / 100
        : 0;
      const utilizationRate = budget.allocatedAmount > 0
        ? Math.round((budget.spentAmount / budget.allocatedAmount) * 100 * 100) / 100
        : 0;

      results.push({
        budgetId,
        budgetName: budget.name,
        planned: budget.allocatedAmount,
        actual: budget.spentAmount,
        variance,
        variancePercentage,
        utilizationRate,
      });
    }

    // Find best and worst performers (closest to 100% utilization is best)
    const sorted = [...results].sort(
      (a, b) => Math.abs(100 - a.utilizationRate) - Math.abs(100 - b.utilizationRate),
    );

    const averageVariance = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.variancePercentage, 0) / results.length * 100) / 100
      : 0;

    return {
      budgets: results,
      bestPerformer: sorted[0]?.budgetId || '',
      worstPerformer: sorted[sorted.length - 1]?.budgetId || '',
      averageVariance,
    };
  }

  // =================== STATISTICS ===================

  async getVarianceStatistics(tenantId: string): Promise<{
    totalAnalyses: number;
    averageVariance: number;
    favorableCount: number;
    unfavorableCount: number;
    activeThresholds: number;
    breachedThresholds: number;
    topVarianceCategories: Array<{ category: string; variance: number }>;
  }> {
    const analyses = Array.from(this.analyses.values()).filter(
      (a) => a.tenantId === tenantId,
    );

    const thresholds = Array.from(this.thresholds.values()).filter(
      (t) => t.tenantId === tenantId && t.isActive,
    );

    const favorableCount = analyses.filter((a) => a.summary.varianceType === 'favorable').length;
    const unfavorableCount = analyses.filter((a) => a.summary.varianceType === 'unfavorable').length;

    const averageVariance = analyses.length > 0
      ? Math.round(
        analyses.reduce((sum, a) => sum + a.summary.variancePercentage, 0) / analyses.length * 100,
      ) / 100
      : 0;

    // Aggregate category variances across all analyses
    const categoryVariances: Record<string, number> = {};
    for (const analysis of analyses) {
      for (const cv of analysis.categoryVariances) {
        categoryVariances[cv.category] = (categoryVariances[cv.category] || 0) + cv.variance;
      }
    }

    const topVarianceCategories = Object.entries(categoryVariances)
      .map(([category, variance]) => ({ category, variance }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 5);

    return {
      totalAnalyses: analyses.length,
      averageVariance,
      favorableCount,
      unfavorableCount,
      activeThresholds: thresholds.length,
      breachedThresholds: 0, // Would track this in real implementation
      topVarianceCategories,
    };
  }
}
