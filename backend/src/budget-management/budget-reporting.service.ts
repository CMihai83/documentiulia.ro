import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BudgetPlanningService } from './budget-planning.service';
import { BudgetTrackingService } from './budget-tracking.service';
import { BudgetVarianceService } from './budget-variance.service';
import { BudgetForecastingService } from './budget-forecasting.service';

// =================== TYPES ===================

export type ReportType =
  | 'budget_summary'
  | 'budget_vs_actual'
  | 'variance_analysis'
  | 'spending_by_category'
  | 'spending_by_department'
  | 'trend_analysis'
  | 'forecast_accuracy'
  | 'commitment_report'
  | 'transfer_history'
  | 'custom';

export type ReportFormat = 'json' | 'csv' | 'excel' | 'pdf';
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'on_demand';

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ReportType;
  filters: ReportFilters;
  columns?: string[];
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  charts?: ChartConfig[];
  schedule?: ReportSchedule;
  recipients?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportFilters {
  budgetIds?: string[];
  departmentIds?: string[];
  categoryIds?: string[];
  fiscalYear?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'stacked_bar';
  title: string;
  xAxis?: string;
  yAxis?: string;
  series?: string[];
  colors?: string[];
}

export interface ReportSchedule {
  frequency: ReportFrequency;
  dayOfWeek?: number; // 0-6, for weekly
  dayOfMonth?: number; // 1-31, for monthly
  time?: string; // HH:MM
  timezone?: string;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export interface GeneratedReport {
  id: string;
  tenantId: string;
  definitionId: string;
  reportName: string;
  reportType: ReportType;
  filters: ReportFilters;
  data: any;
  metadata: ReportMetadata;
  generatedAt: Date;
  generatedBy: string;
  format: ReportFormat;
  fileUrl?: string;
  expiresAt?: Date;
}

export interface ReportMetadata {
  rowCount: number;
  generationTime: number; // ms
  dataAsOf: Date;
  budgetCount: number;
  totalAmount?: number;
}

export interface DashboardWidget {
  id: string;
  tenantId: string;
  name: string;
  type: 'kpi' | 'chart' | 'table' | 'gauge' | 'list';
  config: WidgetConfig;
  position: { x: number; y: number; width: number; height: number };
  refreshInterval?: number; // seconds
  isActive: boolean;
}

export interface WidgetConfig {
  dataSource: 'budget' | 'spending' | 'variance' | 'forecast' | 'approval';
  metric?: string;
  filters?: ReportFilters;
  chart?: ChartConfig;
  thresholds?: Array<{ value: number; color: string; label?: string }>;
  format?: string; // number format
  prefix?: string;
  suffix?: string;
}

export interface Dashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  isDefault: boolean;
  isShared: boolean;
  sharedWith?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KPIMetric {
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  unit?: string;
}

// =================== SERVICE ===================

@Injectable()
export class BudgetReportingService {
  private reportDefinitions: Map<string, ReportDefinition> = new Map();
  private generatedReports: Map<string, GeneratedReport> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
    private budgetService: BudgetPlanningService,
    private trackingService: BudgetTrackingService,
    private varianceService: BudgetVarianceService,
    private forecastingService: BudgetForecastingService,
  ) {}

  // =================== REPORT DEFINITIONS ===================

  async createReportDefinition(data: {
    tenantId: string;
    name: string;
    description?: string;
    type: ReportType;
    filters: ReportFilters;
    columns?: string[];
    groupBy?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    charts?: ChartConfig[];
    schedule?: ReportSchedule;
    recipients?: string[];
    createdBy: string;
  }): Promise<ReportDefinition> {
    const id = `report-def-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const definition: ReportDefinition = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      type: data.type,
      filters: data.filters,
      columns: data.columns,
      groupBy: data.groupBy,
      sortBy: data.sortBy,
      sortOrder: data.sortOrder || 'desc',
      charts: data.charts,
      schedule: data.schedule,
      recipients: data.recipients,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reportDefinitions.set(id, definition);

    this.eventEmitter.emit('budget.report_definition_created', { definition });

    return definition;
  }

  async getReportDefinition(id: string): Promise<ReportDefinition | null> {
    return this.reportDefinitions.get(id) || null;
  }

  async getReportDefinitions(
    tenantId: string,
    type?: ReportType,
  ): Promise<ReportDefinition[]> {
    let definitions = Array.from(this.reportDefinitions.values()).filter(
      (d) => d.tenantId === tenantId && d.isActive,
    );

    if (type) {
      definitions = definitions.filter((d) => d.type === type);
    }

    return definitions.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateReportDefinition(
    id: string,
    updates: Partial<Omit<ReportDefinition, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>>,
  ): Promise<ReportDefinition | null> {
    const definition = this.reportDefinitions.get(id);
    if (!definition) return null;

    Object.assign(definition, updates, { updatedAt: new Date() });

    return definition;
  }

  async deleteReportDefinition(id: string): Promise<boolean> {
    const definition = this.reportDefinitions.get(id);
    if (!definition) return false;

    definition.isActive = false;
    definition.updatedAt = new Date();

    return true;
  }

  // =================== REPORT GENERATION ===================

  async generateReport(data: {
    tenantId: string;
    definitionId?: string;
    type?: ReportType;
    filters?: ReportFilters;
    format?: ReportFormat;
    generatedBy: string;
  }): Promise<GeneratedReport> {
    const startTime = Date.now();

    let definition: ReportDefinition | null = null;
    if (data.definitionId) {
      definition = await this.getReportDefinition(data.definitionId);
    }

    const type = definition?.type || data.type || 'budget_summary';
    const filters = definition?.filters || data.filters || {};

    // Generate report data based on type
    const reportData = await this.generateReportData(data.tenantId, type, filters);

    const id = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const report: GeneratedReport = {
      id,
      tenantId: data.tenantId,
      definitionId: data.definitionId || '',
      reportName: definition?.name || this.getDefaultReportName(type),
      reportType: type,
      filters,
      data: reportData,
      metadata: {
        rowCount: Array.isArray(reportData.items) ? reportData.items.length : 0,
        generationTime: Date.now() - startTime,
        dataAsOf: new Date(),
        budgetCount: reportData.budgetCount || 0,
        totalAmount: reportData.totalAmount,
      },
      generatedAt: new Date(),
      generatedBy: data.generatedBy,
      format: data.format || 'json',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.generatedReports.set(id, report);

    this.eventEmitter.emit('budget.report_generated', { report });

    return report;
  }

  private getDefaultReportName(type: ReportType): string {
    const names: Record<ReportType, string> = {
      budget_summary: 'Budget Summary Report',
      budget_vs_actual: 'Budget vs Actual Report',
      variance_analysis: 'Variance Analysis Report',
      spending_by_category: 'Spending by Category Report',
      spending_by_department: 'Spending by Department Report',
      trend_analysis: 'Trend Analysis Report',
      forecast_accuracy: 'Forecast Accuracy Report',
      commitment_report: 'Commitment Report',
      transfer_history: 'Transfer History Report',
      custom: 'Custom Report',
    };
    return names[type] || 'Report';
  }

  private async generateReportData(
    tenantId: string,
    type: ReportType,
    filters: ReportFilters,
  ): Promise<any> {
    switch (type) {
      case 'budget_summary':
        return this.generateBudgetSummary(tenantId, filters);
      case 'budget_vs_actual':
        return this.generateBudgetVsActual(tenantId, filters);
      case 'variance_analysis':
        return this.generateVarianceReport(tenantId, filters);
      case 'spending_by_category':
        return this.generateSpendingByCategory(tenantId, filters);
      case 'spending_by_department':
        return this.generateSpendingByDepartment(tenantId, filters);
      case 'trend_analysis':
        return this.generateTrendAnalysis(tenantId, filters);
      case 'commitment_report':
        return this.generateCommitmentReport(tenantId, filters);
      case 'transfer_history':
        return this.generateTransferReport(tenantId, filters);
      default:
        return this.generateBudgetSummary(tenantId, filters);
    }
  }

  private async generateBudgetSummary(
    tenantId: string,
    filters: ReportFilters,
  ): Promise<any> {
    const budgetsResult = await this.budgetService.getBudgets(tenantId, {
      fiscalYear: filters.fiscalYear,
    });

    let budgets = budgetsResult.budgets;

    if (filters.budgetIds && filters.budgetIds.length > 0) {
      budgets = budgets.filter((b) => filters.budgetIds!.includes(b.id));
    }

    const totalAllocated = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
    const totalRemaining = budgets.reduce((sum, b) => sum + b.remainingAmount, 0);

    const items = budgets.map((budget) => ({
      budgetId: budget.id,
      budgetName: budget.name,
      type: budget.type,
      status: budget.status,
      totalAmount: budget.totalAmount,
      allocatedAmount: budget.allocatedAmount,
      spentAmount: budget.spentAmount,
      remainingAmount: budget.remainingAmount,
      utilizationRate: budget.allocatedAmount > 0
        ? Math.round((budget.spentAmount / budget.allocatedAmount) * 100)
        : 0,
      department: budget.departmentName,
      fiscalYear: budget.fiscalYear,
    }));

    return {
      summary: {
        totalBudgets: budgets.length,
        totalAllocated,
        totalSpent,
        totalRemaining,
        overallUtilization: totalAllocated > 0
          ? Math.round((totalSpent / totalAllocated) * 100)
          : 0,
      },
      items,
      budgetCount: budgets.length,
      totalAmount: totalAllocated,
    };
  }

  private async generateBudgetVsActual(
    tenantId: string,
    filters: ReportFilters,
  ): Promise<any> {
    const budgetsResult = await this.budgetService.getBudgets(tenantId, {
      fiscalYear: filters.fiscalYear,
    });

    let budgets = budgetsResult.budgets;

    if (filters.budgetIds && filters.budgetIds.length > 0) {
      budgets = budgets.filter((b) => filters.budgetIds!.includes(b.id));
    }

    const items: any[] = [];

    for (const budget of budgets) {
      const lineItems = await this.budgetService.getLineItems(budget.id);
      const transactions = await this.trackingService.getTransactions(tenantId, {
        budgetId: budget.id,
      });

      for (const lineItem of lineItems) {
        const actual = transactions
          .filter((t) => t.lineItemId === lineItem.id && t.status === 'posted')
          .reduce((sum, t) => sum + t.amount, 0);

        const variance = lineItem.plannedAmount - actual;
        const variancePercentage = lineItem.plannedAmount > 0
          ? Math.round((variance / lineItem.plannedAmount) * 100 * 100) / 100
          : 0;

        items.push({
          budgetName: budget.name,
          category: lineItem.categoryName,
          subcategory: lineItem.subcategoryName,
          planned: lineItem.plannedAmount,
          actual,
          variance,
          variancePercentage,
          varianceType: variance >= 0 ? 'favorable' : 'unfavorable',
        });
      }
    }

    return {
      summary: {
        totalPlanned: items.reduce((sum, i) => sum + i.planned, 0),
        totalActual: items.reduce((sum, i) => sum + i.actual, 0),
        totalVariance: items.reduce((sum, i) => sum + i.variance, 0),
        favorableCount: items.filter((i) => i.varianceType === 'favorable').length,
        unfavorableCount: items.filter((i) => i.varianceType === 'unfavorable').length,
      },
      items,
      budgetCount: budgets.length,
    };
  }

  private async generateVarianceReport(
    tenantId: string,
    filters: ReportFilters,
  ): Promise<any> {
    const analyses = await this.varianceService.getVarianceHistory(
      tenantId,
      filters.budgetIds?.[0],
      10,
    );

    const items = analyses.map((analysis) => ({
      budgetName: analysis.budgetName,
      period: analysis.period,
      analysisDate: analysis.analysisDate,
      totalPlanned: analysis.summary.totalPlanned,
      totalActual: analysis.summary.totalActual,
      totalVariance: analysis.summary.totalVariance,
      variancePercentage: analysis.summary.variancePercentage,
      varianceType: analysis.summary.varianceType,
      topVariances: analysis.lineItemVariances
        .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
        .slice(0, 5),
      recommendations: analysis.recommendations,
    }));

    return {
      summary: {
        totalAnalyses: analyses.length,
        averageVariance: analyses.length > 0
          ? Math.round(
            analyses.reduce((sum, a) => sum + a.summary.variancePercentage, 0) /
            analyses.length * 100,
          ) / 100
          : 0,
        favorableCount: analyses.filter((a) => a.summary.varianceType === 'favorable').length,
        unfavorableCount: analyses.filter((a) => a.summary.varianceType === 'unfavorable').length,
      },
      items,
      budgetCount: new Set(analyses.map((a) => a.budgetId)).size,
    };
  }

  private async generateSpendingByCategory(
    tenantId: string,
    filters: ReportFilters,
  ): Promise<any> {
    const transactions = await this.trackingService.getTransactions(tenantId, {
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    const categoryTotals: Record<string, { amount: number; count: number }> = {};

    for (const tx of transactions) {
      if (tx.status !== 'posted') continue;

      const category = tx.costCenterName || 'Uncategorized';
      if (!categoryTotals[category]) {
        categoryTotals[category] = { amount: 0, count: 0 };
      }
      categoryTotals[category].amount += tx.amount;
      categoryTotals[category].count++;
    }

    const totalAmount = Object.values(categoryTotals).reduce((sum, c) => sum + c.amount, 0);

    const items = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        transactionCount: data.count,
        percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      summary: {
        totalCategories: items.length,
        totalSpending: totalAmount,
        topCategory: items[0]?.category || 'N/A',
        topCategoryAmount: items[0]?.amount || 0,
      },
      items,
      totalAmount,
    };
  }

  private async generateSpendingByDepartment(
    tenantId: string,
    filters: ReportFilters,
  ): Promise<any> {
    const budgetsResult = await this.budgetService.getBudgets(tenantId, {
      fiscalYear: filters.fiscalYear,
    });

    const departmentTotals: Record<string, {
      allocated: number;
      spent: number;
      budgetCount: number;
    }> = {};

    for (const budget of budgetsResult.budgets) {
      const department = budget.departmentName || 'Unassigned';
      if (!departmentTotals[department]) {
        departmentTotals[department] = { allocated: 0, spent: 0, budgetCount: 0 };
      }
      departmentTotals[department].allocated += budget.allocatedAmount;
      departmentTotals[department].spent += budget.spentAmount;
      departmentTotals[department].budgetCount++;
    }

    const items = Object.entries(departmentTotals)
      .map(([department, data]) => ({
        department,
        allocated: data.allocated,
        spent: data.spent,
        remaining: data.allocated - data.spent,
        utilization: data.allocated > 0
          ? Math.round((data.spent / data.allocated) * 100)
          : 0,
        budgetCount: data.budgetCount,
      }))
      .sort((a, b) => b.spent - a.spent);

    return {
      summary: {
        totalDepartments: items.length,
        totalAllocated: items.reduce((sum, i) => sum + i.allocated, 0),
        totalSpent: items.reduce((sum, i) => sum + i.spent, 0),
        topSpender: items[0]?.department || 'N/A',
      },
      items,
      budgetCount: budgetsResult.budgets.length,
    };
  }

  private async generateTrendAnalysis(
    tenantId: string,
    filters: ReportFilters,
  ): Promise<any> {
    const trends = await this.varianceService.getVarianceTrends(
      tenantId,
      filters.budgetIds?.[0],
      12,
    );

    const items = trends.map((trend) => ({
      period: trend.period,
      budgetName: trend.budgetName,
      variance: trend.variance,
      variancePercentage: trend.variancePercentage,
      varianceType: trend.varianceType,
      trend: trend.trend,
    }));

    const improvingCount = trends.filter((t) => t.trend === 'improving').length;
    const worseningCount = trends.filter((t) => t.trend === 'worsening').length;

    return {
      summary: {
        totalPeriods: trends.length,
        improvingPeriods: improvingCount,
        worseningPeriods: worseningCount,
        stablePeriods: trends.length - improvingCount - worseningCount,
        overallTrend: improvingCount > worseningCount ? 'improving' :
          worseningCount > improvingCount ? 'worsening' : 'stable',
      },
      items,
    };
  }

  private async generateCommitmentReport(
    tenantId: string,
    filters: ReportFilters,
  ): Promise<any> {
    const commitments = await this.trackingService.getCommitments(tenantId, {
      budgetId: filters.budgetIds?.[0],
    });

    const items = commitments.map((c) => ({
      reference: c.reference,
      type: c.type,
      description: c.description,
      vendor: c.vendorName,
      amount: c.amount,
      status: c.status,
      expectedDate: c.expectedDate,
      fulfilledAmount: c.actualAmount,
      createdAt: c.createdAt,
    }));

    const totalCommitted = commitments
      .filter((c) => c.status === 'open')
      .reduce((sum, c) => sum + c.amount, 0);

    return {
      summary: {
        totalCommitments: commitments.length,
        openCommitments: commitments.filter((c) => c.status === 'open').length,
        fulfilledCommitments: commitments.filter((c) => c.status === 'fulfilled').length,
        totalCommittedAmount: totalCommitted,
      },
      items,
    };
  }

  private async generateTransferReport(
    tenantId: string,
    filters: ReportFilters,
  ): Promise<any> {
    const transfers = await this.trackingService.getTransfers(tenantId, {
      budgetId: filters.budgetIds?.[0],
    });

    const items = transfers.map((t) => ({
      fromBudget: t.fromBudgetId,
      fromLineItem: t.fromLineItemId,
      toBudget: t.toBudgetId,
      toLineItem: t.toLineItemId,
      amount: t.amount,
      reason: t.reason,
      status: t.status,
      requestedAt: t.createdAt,
      completedAt: t.approvedAt,
    }));

    return {
      summary: {
        totalTransfers: transfers.length,
        completedTransfers: transfers.filter((t) => t.status === 'completed').length,
        pendingTransfers: transfers.filter((t) => t.status === 'pending').length,
        totalTransferAmount: transfers
          .filter((t) => t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0),
      },
      items,
    };
  }

  async getGeneratedReport(id: string): Promise<GeneratedReport | null> {
    return this.generatedReports.get(id) || null;
  }

  async getGeneratedReports(
    tenantId: string,
    limit?: number,
  ): Promise<GeneratedReport[]> {
    let reports = Array.from(this.generatedReports.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    reports = reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    if (limit) {
      reports = reports.slice(0, limit);
    }

    return reports;
  }

  // =================== DASHBOARDS ===================

  async createDashboard(data: {
    tenantId: string;
    name: string;
    description?: string;
    widgets: Omit<DashboardWidget, 'id' | 'tenantId'>[];
    isDefault?: boolean;
    isShared?: boolean;
    sharedWith?: string[];
    createdBy: string;
  }): Promise<Dashboard> {
    const id = `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate IDs for widgets
    const widgets = data.widgets.map((widget, index) => ({
      ...widget,
      id: `widget-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`,
      tenantId: data.tenantId,
    }));

    // If this is default, unset other defaults
    if (data.isDefault) {
      for (const dashboard of this.dashboards.values()) {
        if (dashboard.tenantId === data.tenantId && dashboard.isDefault) {
          dashboard.isDefault = false;
        }
      }
    }

    const dashboard: Dashboard = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      widgets,
      isDefault: data.isDefault || false,
      isShared: data.isShared || false,
      sharedWith: data.sharedWith,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(id, dashboard);

    this.eventEmitter.emit('budget.dashboard_created', { dashboard });

    return dashboard;
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    return this.dashboards.get(id) || null;
  }

  async getDashboards(
    tenantId: string,
    userId?: string,
  ): Promise<Dashboard[]> {
    let dashboards = Array.from(this.dashboards.values()).filter(
      (d) => d.tenantId === tenantId,
    );

    if (userId) {
      dashboards = dashboards.filter(
        (d) => d.createdBy === userId || d.isShared || d.sharedWith?.includes(userId),
      );
    }

    return dashboards.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  async updateDashboard(
    id: string,
    updates: Partial<Omit<Dashboard, 'id' | 'tenantId' | 'createdBy' | 'createdAt'>>,
  ): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return null;

    Object.assign(dashboard, updates, { updatedAt: new Date() });

    return dashboard;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    return this.dashboards.delete(id);
  }

  async getDefaultDashboard(tenantId: string): Promise<Dashboard | null> {
    return Array.from(this.dashboards.values()).find(
      (d) => d.tenantId === tenantId && d.isDefault,
    ) || null;
  }

  // =================== KPI METRICS ===================

  async getBudgetKPIs(tenantId: string): Promise<KPIMetric[]> {
    const stats = await this.budgetService.getBudgetStatistics(tenantId);
    const trackingStats = await this.trackingService.getTrackingStatistics(tenantId);

    const kpis: KPIMetric[] = [
      {
        name: 'Total Budgets',
        value: stats.totalBudgets,
        trend: 'stable',
        status: 'good',
      },
      {
        name: 'Total Allocated',
        value: stats.totalAllocated,
        unit: 'RON',
        trend: 'up',
        status: 'good',
      },
      {
        name: 'Total Spent',
        value: stats.totalSpent,
        unit: 'RON',
        trend: 'up',
        status: stats.totalSpent <= stats.totalAllocated ? 'good' : 'warning',
      },
      {
        name: 'Overall Utilization',
        value: stats.totalAllocated > 0
          ? Math.round((stats.totalSpent / stats.totalAllocated) * 100)
          : 0,
        unit: '%',
        trend: 'stable',
        status: stats.totalSpent <= stats.totalAllocated * 0.9 ? 'good' :
          stats.totalSpent <= stats.totalAllocated ? 'warning' : 'critical',
      },
      {
        name: 'Active Budgets',
        value: stats.byStatus.active || 0,
        trend: 'stable',
        status: 'good',
      },
      {
        name: 'Pending Approval',
        value: trackingStats.pendingApproval,
        trend: trackingStats.pendingApproval > 10 ? 'up' : 'stable',
        status: trackingStats.pendingApproval > 20 ? 'warning' : 'good',
      },
      {
        name: 'Active Alerts',
        value: trackingStats.activeAlerts,
        trend: trackingStats.activeAlerts > 0 ? 'up' : 'stable',
        status: trackingStats.activeAlerts > 5 ? 'critical' :
          trackingStats.activeAlerts > 0 ? 'warning' : 'good',
      },
    ];

    return kpis;
  }

  // =================== STATISTICS ===================

  async getReportingStatistics(tenantId: string): Promise<{
    totalReportDefinitions: number;
    totalGeneratedReports: number;
    totalDashboards: number;
    reportsThisMonth: number;
    popularReportTypes: Array<{ type: string; count: number }>;
  }> {
    const definitions = Array.from(this.reportDefinitions.values()).filter(
      (d) => d.tenantId === tenantId && d.isActive,
    );

    const reports = Array.from(this.generatedReports.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    const dashboards = Array.from(this.dashboards.values()).filter(
      (d) => d.tenantId === tenantId,
    );

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const reportsThisMonth = reports.filter(
      (r) => r.generatedAt >= thisMonth,
    ).length;

    const typeCounts: Record<string, number> = {};
    for (const report of reports) {
      typeCounts[report.reportType] = (typeCounts[report.reportType] || 0) + 1;
    }

    const popularReportTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalReportDefinitions: definitions.length,
      totalGeneratedReports: reports.length,
      totalDashboards: dashboards.length,
      reportsThisMonth,
      popularReportTypes,
    };
  }
}
