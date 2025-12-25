import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type MetricType = 'value' | 'percentage' | 'ratio' | 'count' | 'currency' | 'duration';
export type TrendDirection = 'up' | 'down' | 'stable';
export type ComparisonPeriod = 'previous' | 'lastWeek' | 'lastMonth' | 'lastQuarter' | 'lastYear' | 'custom';
export type AggregationMethod = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'latest' | 'first';

export interface KPIDefinition {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  type: MetricType;
  unit?: string;
  currency?: string;
  formula?: KPIFormula;
  dataSource: KPIDataSource;
  targets?: KPITarget[];
  thresholds: KPIThreshold[];
  tracking: TrackingConfig;
  display: DisplayConfig;
  permissions?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KPIFormula {
  type: 'simple' | 'calculated' | 'composite';
  expression?: string;
  variables?: { name: string; kpiId: string }[];
  aggregation?: AggregationMethod;
}

export interface KPIDataSource {
  type: 'database' | 'api' | 'calculated' | 'manual';
  table?: string;
  field?: string;
  query?: string;
  endpoint?: string;
  filters?: DataSourceFilter[];
}

export interface DataSourceFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: any;
}

export interface KPITarget {
  id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  value: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
}

export interface KPIThreshold {
  level: 'critical' | 'warning' | 'good' | 'excellent';
  min?: number;
  max?: number;
  color: string;
  icon?: string;
  notification?: boolean;
}

export interface TrackingConfig {
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  historyRetention: number; // days
  snapshotTime?: string; // HH:mm for daily/weekly/monthly
}

export interface DisplayConfig {
  format: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
    abbreviate?: boolean;
  };
  visualization: 'number' | 'gauge' | 'progress' | 'sparkline' | 'trend';
  showTrend?: boolean;
  showTarget?: boolean;
  showComparison?: boolean;
}

export interface KPIValue {
  id: string;
  kpiId: string;
  tenantId: string;
  value: number;
  timestamp: Date;
  periodStart?: Date;
  periodEnd?: Date;
  metadata?: Record<string, any>;
}

export interface KPISnapshot {
  kpiId: string;
  currentValue: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend: TrendDirection;
  target?: number;
  targetProgress?: number;
  thresholdLevel: KPIThreshold['level'];
  sparklineData?: number[];
  timestamp: Date;
}

export interface KPIDashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  kpis: DashboardKPI[];
  layout: 'grid' | 'list' | 'cards';
  refreshInterval?: number;
  isDefault?: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardKPI {
  kpiId: string;
  position: { row: number; col: number; width: number; height: number };
  displayOverrides?: Partial<DisplayConfig>;
}

export interface KPIAlert {
  id: string;
  kpiId: string;
  tenantId: string;
  type: 'threshold' | 'target' | 'anomaly' | 'trend';
  condition: AlertCondition;
  recipients: string[];
  channels: ('email' | 'sms' | 'push' | 'webhook')[];
  message?: string;
  isActive: boolean;
  lastTriggered?: Date;
  triggeredCount: number;
  createdAt: Date;
}

export interface AlertCondition {
  operator: 'above' | 'below' | 'equals' | 'between' | 'change';
  value?: number;
  secondValue?: number; // for 'between' and 'change'
  duration?: number; // consecutive periods
}

@Injectable()
export class KPIMetricsService {
  private kpis: Map<string, KPIDefinition> = new Map();
  private values: Map<string, KPIValue[]> = new Map();
  private dashboards: Map<string, KPIDashboard> = new Map();
  private alerts: Map<string, KPIAlert> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultKPIs();
  }

  private initializeDefaultKPIs() {
    // Pre-defined KPI templates will be created per tenant
  }

  // =================== KPI DEFINITIONS ===================

  async createKPI(data: {
    tenantId: string;
    name: string;
    description?: string;
    category: string;
    type: MetricType;
    unit?: string;
    currency?: string;
    formula?: KPIFormula;
    dataSource: KPIDataSource;
    targets?: Omit<KPITarget, 'id'>[];
    thresholds: KPIThreshold[];
    tracking: TrackingConfig;
    display: DisplayConfig;
    createdBy: string;
  }): Promise<KPIDefinition> {
    const id = `kpi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const kpi: KPIDefinition = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      category: data.category,
      type: data.type,
      unit: data.unit,
      currency: data.currency,
      formula: data.formula,
      dataSource: data.dataSource,
      targets: data.targets?.map((t, i) => ({
        ...t,
        id: `target_${Date.now()}_${i}`,
      })),
      thresholds: data.thresholds,
      tracking: data.tracking,
      display: data.display,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.kpis.set(id, kpi);
    this.values.set(id, []);

    this.eventEmitter.emit('kpi.created', { kpi });
    return kpi;
  }

  async getKPI(id: string): Promise<KPIDefinition | undefined> {
    return this.kpis.get(id);
  }

  async getKPIs(tenantId: string, options?: {
    category?: string;
    type?: MetricType;
    isActive?: boolean;
    search?: string;
  }): Promise<KPIDefinition[]> {
    let kpis = Array.from(this.kpis.values()).filter(k => k.tenantId === tenantId);

    if (options?.category) {
      kpis = kpis.filter(k => k.category === options.category);
    }
    if (options?.type) {
      kpis = kpis.filter(k => k.type === options.type);
    }
    if (options?.isActive !== undefined) {
      kpis = kpis.filter(k => k.isActive === options.isActive);
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      kpis = kpis.filter(k =>
        k.name.toLowerCase().includes(search) ||
        k.description?.toLowerCase().includes(search)
      );
    }

    return kpis.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateKPI(id: string, updates: Partial<{
    name: string;
    description: string;
    category: string;
    type: MetricType;
    unit: string;
    currency: string;
    formula: KPIFormula;
    dataSource: KPIDataSource;
    thresholds: KPIThreshold[];
    tracking: TrackingConfig;
    display: DisplayConfig;
    isActive: boolean;
  }>): Promise<KPIDefinition | undefined> {
    const kpi = this.kpis.get(id);
    if (!kpi) return undefined;

    Object.assign(kpi, updates, { updatedAt: new Date() });

    this.eventEmitter.emit('kpi.updated', { kpi });
    return kpi;
  }

  async deleteKPI(id: string): Promise<void> {
    this.kpis.delete(id);
    this.values.delete(id);
    this.eventEmitter.emit('kpi.deleted', { kpiId: id });
  }

  // =================== TARGETS ===================

  async addTarget(kpiId: string, target: Omit<KPITarget, 'id'>): Promise<KPIDefinition | undefined> {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return undefined;

    const newTarget: KPITarget = {
      ...target,
      id: `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!kpi.targets) kpi.targets = [];
    kpi.targets.push(newTarget);
    kpi.updatedAt = new Date();

    return kpi;
  }

  async updateTarget(kpiId: string, targetId: string, updates: Partial<KPITarget>): Promise<KPIDefinition | undefined> {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return undefined;

    const target = kpi.targets?.find(t => t.id === targetId);
    if (!target) return undefined;

    Object.assign(target, updates);
    kpi.updatedAt = new Date();

    return kpi;
  }

  async removeTarget(kpiId: string, targetId: string): Promise<KPIDefinition | undefined> {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return undefined;

    kpi.targets = kpi.targets?.filter(t => t.id !== targetId);
    kpi.updatedAt = new Date();

    return kpi;
  }

  // =================== VALUES ===================

  async recordValue(data: {
    kpiId: string;
    tenantId: string;
    value: number;
    timestamp?: Date;
    periodStart?: Date;
    periodEnd?: Date;
    metadata?: Record<string, any>;
  }): Promise<KPIValue> {
    const kpi = this.kpis.get(data.kpiId);
    if (!kpi) {
      throw new Error('KPI not found');
    }

    const id = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const value: KPIValue = {
      id,
      kpiId: data.kpiId,
      tenantId: data.tenantId,
      value: data.value,
      timestamp: data.timestamp || new Date(),
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      metadata: data.metadata,
    };

    const kpiValues = this.values.get(data.kpiId) || [];
    kpiValues.push(value);
    this.values.set(data.kpiId, kpiValues);

    // Check alerts
    await this.checkAlerts(kpi, value);

    this.eventEmitter.emit('kpi.value.recorded', { kpi, value });
    return value;
  }

  async getValues(kpiId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<KPIValue[]> {
    let values = this.values.get(kpiId) || [];

    if (options?.startDate) {
      values = values.filter(v => v.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      values = values.filter(v => v.timestamp <= options.endDate!);
    }

    values = values.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      values = values.slice(0, options.limit);
    }

    return values;
  }

  async getLatestValue(kpiId: string): Promise<KPIValue | undefined> {
    const values = await this.getValues(kpiId, { limit: 1 });
    return values[0];
  }

  // =================== SNAPSHOTS ===================

  async getSnapshot(kpiId: string, comparisonPeriod?: ComparisonPeriod): Promise<KPISnapshot | undefined> {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return undefined;

    const values = await this.getValues(kpiId, { limit: 30 });
    if (values.length === 0) {
      return {
        kpiId,
        currentValue: 0,
        trend: 'stable',
        thresholdLevel: 'good',
        timestamp: new Date(),
      };
    }

    const currentValue = values[0].value;
    const previousValue = values.length > 1 ? this.getPreviousValue(values, comparisonPeriod) : undefined;

    const change = previousValue !== undefined ? currentValue - previousValue : undefined;
    const changePercent = previousValue !== undefined && previousValue !== 0
      ? ((currentValue - previousValue) / Math.abs(previousValue)) * 100
      : undefined;

    const trend = this.calculateTrend(change);
    const thresholdLevel = this.determineThresholdLevel(kpi.thresholds, currentValue);

    const activeTarget = kpi.targets?.find(t => t.isActive);
    const targetProgress = activeTarget
      ? (currentValue / activeTarget.value) * 100
      : undefined;

    return {
      kpiId,
      currentValue,
      previousValue,
      change,
      changePercent,
      trend,
      target: activeTarget?.value,
      targetProgress,
      thresholdLevel,
      sparklineData: values.slice(0, 14).map(v => v.value).reverse(),
      timestamp: new Date(),
    };
  }

  async getBulkSnapshots(kpiIds: string[]): Promise<Map<string, KPISnapshot>> {
    const snapshots = new Map<string, KPISnapshot>();

    for (const kpiId of kpiIds) {
      const snapshot = await this.getSnapshot(kpiId);
      if (snapshot) {
        snapshots.set(kpiId, snapshot);
      }
    }

    return snapshots;
  }

  private getPreviousValue(values: KPIValue[], period?: ComparisonPeriod): number | undefined {
    if (values.length < 2) return undefined;

    const now = new Date();
    let targetDate: Date;

    switch (period) {
      case 'lastWeek':
        targetDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'lastMonth':
        targetDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'lastQuarter':
        targetDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'lastYear':
        targetDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        return values[1].value;
    }

    const closestValue = values.reduce((closest, current) => {
      const closestDiff = Math.abs(closest.timestamp.getTime() - targetDate.getTime());
      const currentDiff = Math.abs(current.timestamp.getTime() - targetDate.getTime());
      return currentDiff < closestDiff ? current : closest;
    });

    return closestValue.value;
  }

  private calculateTrend(change?: number): TrendDirection {
    if (change === undefined) return 'stable';
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'stable';
  }

  private determineThresholdLevel(thresholds: KPIThreshold[], value: number): KPIThreshold['level'] {
    for (const threshold of thresholds) {
      const inMin = threshold.min === undefined || value >= threshold.min;
      const inMax = threshold.max === undefined || value <= threshold.max;
      if (inMin && inMax) {
        return threshold.level;
      }
    }
    return 'good';
  }

  // =================== DASHBOARDS ===================

  async createDashboard(data: {
    tenantId: string;
    name: string;
    description?: string;
    kpis: DashboardKPI[];
    layout?: 'grid' | 'list' | 'cards';
    refreshInterval?: number;
    isDefault?: boolean;
    createdBy: string;
  }): Promise<KPIDashboard> {
    const id = `kpi_dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dashboard: KPIDashboard = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      kpis: data.kpis,
      layout: data.layout || 'grid',
      refreshInterval: data.refreshInterval,
      isDefault: data.isDefault,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(id, dashboard);

    if (data.isDefault) {
      this.dashboards.forEach((d, key) => {
        if (key !== id && d.tenantId === data.tenantId && d.isDefault) {
          d.isDefault = false;
        }
      });
    }

    return dashboard;
  }

  async getDashboard(id: string): Promise<KPIDashboard | undefined> {
    return this.dashboards.get(id);
  }

  async getDashboards(tenantId: string): Promise<KPIDashboard[]> {
    return Array.from(this.dashboards.values())
      .filter(d => d.tenantId === tenantId)
      .sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
  }

  async updateDashboard(id: string, updates: Partial<{
    name: string;
    description: string;
    kpis: DashboardKPI[];
    layout: 'grid' | 'list' | 'cards';
    refreshInterval: number;
    isDefault: boolean;
  }>): Promise<KPIDashboard | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;

    Object.assign(dashboard, updates, { updatedAt: new Date() });

    if (updates.isDefault) {
      this.dashboards.forEach((d, key) => {
        if (key !== id && d.tenantId === dashboard.tenantId && d.isDefault) {
          d.isDefault = false;
        }
      });
    }

    return dashboard;
  }

  async deleteDashboard(id: string): Promise<void> {
    this.dashboards.delete(id);
  }

  async getDashboardWithSnapshots(id: string): Promise<{
    dashboard: KPIDashboard;
    snapshots: Map<string, KPISnapshot>;
  } | undefined> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) return undefined;

    const kpiIds = dashboard.kpis.map(k => k.kpiId);
    const snapshots = await this.getBulkSnapshots(kpiIds);

    return { dashboard, snapshots };
  }

  // =================== ALERTS ===================

  async createAlert(data: {
    kpiId: string;
    tenantId: string;
    type: KPIAlert['type'];
    condition: AlertCondition;
    recipients: string[];
    channels: KPIAlert['channels'];
    message?: string;
  }): Promise<KPIAlert> {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: KPIAlert = {
      id,
      kpiId: data.kpiId,
      tenantId: data.tenantId,
      type: data.type,
      condition: data.condition,
      recipients: data.recipients,
      channels: data.channels,
      message: data.message,
      isActive: true,
      triggeredCount: 0,
      createdAt: new Date(),
    };

    this.alerts.set(id, alert);
    return alert;
  }

  async getAlerts(tenantId: string, kpiId?: string): Promise<KPIAlert[]> {
    let alerts = Array.from(this.alerts.values()).filter(a => a.tenantId === tenantId);

    if (kpiId) {
      alerts = alerts.filter(a => a.kpiId === kpiId);
    }

    return alerts;
  }

  async updateAlert(id: string, updates: Partial<{
    condition: AlertCondition;
    recipients: string[];
    channels: KPIAlert['channels'];
    message: string;
    isActive: boolean;
  }>): Promise<KPIAlert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    Object.assign(alert, updates);
    return alert;
  }

  async deleteAlert(id: string): Promise<void> {
    this.alerts.delete(id);
  }

  private async checkAlerts(kpi: KPIDefinition, value: KPIValue): Promise<void> {
    const alerts = Array.from(this.alerts.values()).filter(
      a => a.kpiId === kpi.id && a.isActive
    );

    for (const alert of alerts) {
      const triggered = this.evaluateAlertCondition(alert.condition, value.value);

      if (triggered) {
        alert.lastTriggered = new Date();
        alert.triggeredCount++;

        this.eventEmitter.emit('kpi.alert.triggered', {
          alert,
          kpi,
          value,
        });
      }
    }
  }

  private evaluateAlertCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'above':
        return value > (condition.value ?? 0);
      case 'below':
        return value < (condition.value ?? 0);
      case 'equals':
        return value === condition.value;
      case 'between':
        return value >= (condition.value ?? 0) && value <= (condition.secondValue ?? 0);
      default:
        return false;
    }
  }

  // =================== ANALYTICS ===================

  async getKPIAnalytics(kpiId: string, options?: {
    period: 'day' | 'week' | 'month' | 'quarter' | 'year';
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    values: KPIValue[];
    stats: {
      min: number;
      max: number;
      avg: number;
      sum: number;
      count: number;
      stdDev: number;
    };
    trend: {
      direction: TrendDirection;
      slope: number;
      correlation: number;
    };
    distribution: { bucket: string; count: number }[];
  }> {
    const values = await this.getValues(kpiId, {
      startDate: options?.startDate,
      endDate: options?.endDate,
    });

    if (values.length === 0) {
      return {
        values: [],
        stats: { min: 0, max: 0, avg: 0, sum: 0, count: 0, stdDev: 0 },
        trend: { direction: 'stable', slope: 0, correlation: 0 },
        distribution: [],
      };
    }

    const nums = values.map(v => v.value);
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    const min = Math.min(...nums);
    const max = Math.max(...nums);

    // Standard deviation
    const squareDiffs = nums.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / nums.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    // Simple linear regression for trend
    const n = nums.length;
    const xMean = (n - 1) / 2;
    const yMean = avg;
    let numerator = 0;
    let denominator = 0;

    nums.forEach((y, x) => {
      numerator += (x - xMean) * (y - yMean);
      denominator += Math.pow(x - xMean, 2);
    });

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const trendDirection: TrendDirection = slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable';

    // Distribution buckets
    const bucketCount = 5;
    const bucketSize = (max - min) / bucketCount || 1;
    const distribution = Array.from({ length: bucketCount }, (_, i) => {
      const bucketMin = min + i * bucketSize;
      const bucketMax = bucketMin + bucketSize;
      const count = nums.filter(v => v >= bucketMin && (i === bucketCount - 1 ? v <= bucketMax : v < bucketMax)).length;
      return {
        bucket: `${bucketMin.toFixed(1)}-${bucketMax.toFixed(1)}`,
        count,
      };
    });

    return {
      values,
      stats: { min, max, avg, sum, count: nums.length, stdDev },
      trend: { direction: trendDirection, slope, correlation: 0.8 }, // Simplified
      distribution,
    };
  }

  async compareKPIs(kpiIds: string[], period?: ComparisonPeriod): Promise<{
    kpis: { kpi: KPIDefinition; snapshot: KPISnapshot }[];
    comparison: {
      bestPerformer: string;
      worstPerformer: string;
      averageChange: number;
    };
  }> {
    const results: { kpi: KPIDefinition; snapshot: KPISnapshot }[] = [];

    for (const kpiId of kpiIds) {
      const kpi = await this.getKPI(kpiId);
      const snapshot = await this.getSnapshot(kpiId, period);
      if (kpi && snapshot) {
        results.push({ kpi, snapshot });
      }
    }

    const changes = results
      .filter(r => r.snapshot.changePercent !== undefined)
      .map(r => ({ kpiId: r.kpi.id, change: r.snapshot.changePercent! }));

    const bestPerformer = changes.length > 0
      ? changes.reduce((best, curr) => curr.change > best.change ? curr : best).kpiId
      : '';

    const worstPerformer = changes.length > 0
      ? changes.reduce((worst, curr) => curr.change < worst.change ? curr : worst).kpiId
      : '';

    const averageChange = changes.length > 0
      ? changes.reduce((sum, c) => sum + c.change, 0) / changes.length
      : 0;

    return {
      kpis: results,
      comparison: { bestPerformer, worstPerformer, averageChange },
    };
  }

  // =================== CATEGORIES ===================

  async getCategories(tenantId: string): Promise<{ category: string; count: number }[]> {
    const kpis = Array.from(this.kpis.values()).filter(k => k.tenantId === tenantId);
    const categoryMap = new Map<string, number>();

    kpis.forEach(k => {
      const count = categoryMap.get(k.category) || 0;
      categoryMap.set(k.category, count + 1);
    });

    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalKPIs: number;
    activeKPIs: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    alertsConfigured: number;
    alertsTriggered24h: number;
  }> {
    const kpis = Array.from(this.kpis.values()).filter(k => k.tenantId === tenantId);
    const alerts = Array.from(this.alerts.values()).filter(a => a.tenantId === tenantId);

    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};

    kpis.forEach(k => {
      byCategory[k.category] = (byCategory[k.category] || 0) + 1;
      byType[k.type] = (byType[k.type] || 0) + 1;
    });

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alertsTriggered24h = alerts.filter(
      a => a.lastTriggered && a.lastTriggered > yesterday
    ).length;

    return {
      totalKPIs: kpis.length,
      activeKPIs: kpis.filter(k => k.isActive).length,
      byCategory,
      byType,
      alertsConfigured: alerts.length,
      alertsTriggered24h,
    };
  }
}
