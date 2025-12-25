import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

export type TenantTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
export type MetricType = 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'SUMMARY';
export type AggregationType = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'PERCENTILE';
export type ComparisonPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'YTD';

export interface Tenant {
  id: string;
  name: string;
  nameRo: string;
  tier: TenantTier;
  cui?: string;
  industry?: string;
  employeeCount?: number;
  createdAt: Date;
  isActive: boolean;
  settings: TenantSettings;
}

export interface TenantSettings {
  analyticsEnabled: boolean;
  dataRetentionDays: number;
  allowBenchmarking: boolean;
  anonymousDataSharing: boolean;
  customMetrics: string[];
}

export interface TenantMetric {
  id: string;
  tenantId: string;
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

export interface TenantSummary {
  tenantId: string;
  tenantName: string;
  tier: TenantTier;
  period: ComparisonPeriod;
  startDate: Date;
  endDate: Date;
  metrics: {
    revenue: number;
    revenueChange: number;
    invoiceCount: number;
    averageInvoiceValue: number;
    activeUsers: number;
    apiCalls: number;
    storageUsedMB: number;
    anafSubmissions: number;
  };
  usage: {
    documentsProcessed: number;
    ocrPages: number;
    workflowsExecuted: number;
    reportsGenerated: number;
  };
  health: {
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
  };
}

export interface IndustryBenchmark {
  industry: string;
  tenantCount: number;
  metrics: {
    name: string;
    nameRo: string;
    average: number;
    median: number;
    p25: number;
    p75: number;
    p90: number;
    unit: string;
  }[];
  updatedAt: Date;
}

export interface TenantComparison {
  tenantId: string;
  tenantName: string;
  metric: string;
  value: number;
  industryAverage: number;
  industryPercentile: number;
  trend: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  recommendation?: string;
  recommendationRo?: string;
}

export interface CrossTenantReport {
  id: string;
  name: string;
  nameRo: string;
  generatedAt: Date;
  period: ComparisonPeriod;
  totalTenants: number;
  activeTenants: number;
  newTenants: number;
  churnedTenants: number;
  totalRevenue: number;
  averageRevenuePerTenant: number;
  tierDistribution: Record<TenantTier, number>;
  industryDistribution: Record<string, number>;
  topPerformers: { tenantId: string; tenantName: string; metric: string; value: number }[];
  insights: string[];
  insightsRo: string[];
}

export interface UsageQuota {
  tenantId: string;
  tier: TenantTier;
  quotas: {
    name: string;
    limit: number;
    used: number;
    remaining: number;
    percentUsed: number;
    resetsAt?: Date;
  }[];
}

export interface TenantAlert {
  id: string;
  tenantId: string;
  tenantName: string;
  type: 'QUOTA_WARNING' | 'QUOTA_EXCEEDED' | 'ANOMALY' | 'PERFORMANCE' | 'SECURITY';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  messageRo: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

@Injectable()
export class MultiTenantAnalyticsService {
  private tenants: Map<string, Tenant> = new Map();
  private metrics: Map<string, TenantMetric[]> = new Map();
  private alerts: Map<string, TenantAlert> = new Map();
  private benchmarks: Map<string, IndustryBenchmark> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Create sample tenants
    const sampleTenants: Tenant[] = [
      {
        id: 'tenant-1',
        name: 'Tech Solutions SRL',
        nameRo: 'Soluții Tech SRL',
        tier: 'ENTERPRISE',
        cui: 'RO12345678',
        industry: 'IT_SERVICES',
        employeeCount: 150,
        createdAt: new Date('2023-01-15'),
        isActive: true,
        settings: {
          analyticsEnabled: true,
          dataRetentionDays: 365,
          allowBenchmarking: true,
          anonymousDataSharing: true,
          customMetrics: ['custom_metric_1'],
        },
      },
      {
        id: 'tenant-2',
        name: 'Retail Plus SA',
        nameRo: 'Retail Plus SA',
        tier: 'PRO',
        cui: 'RO87654321',
        industry: 'RETAIL',
        employeeCount: 45,
        createdAt: new Date('2023-06-20'),
        isActive: true,
        settings: {
          analyticsEnabled: true,
          dataRetentionDays: 180,
          allowBenchmarking: true,
          anonymousDataSharing: true,
          customMetrics: [],
        },
      },
      {
        id: 'tenant-3',
        name: 'Manufacturing Corp',
        nameRo: 'Manufacturing Corp',
        tier: 'PRO',
        cui: 'RO11223344',
        industry: 'MANUFACTURING',
        employeeCount: 200,
        createdAt: new Date('2023-03-10'),
        isActive: true,
        settings: {
          analyticsEnabled: true,
          dataRetentionDays: 365,
          allowBenchmarking: true,
          anonymousDataSharing: false,
          customMetrics: [],
        },
      },
      {
        id: 'tenant-4',
        name: 'Startup Inovator',
        nameRo: 'Startup Inovator',
        tier: 'BASIC',
        cui: 'RO55667788',
        industry: 'IT_SERVICES',
        employeeCount: 10,
        createdAt: new Date('2024-01-05'),
        isActive: true,
        settings: {
          analyticsEnabled: true,
          dataRetentionDays: 90,
          allowBenchmarking: true,
          anonymousDataSharing: true,
          customMetrics: [],
        },
      },
      {
        id: 'tenant-5',
        name: 'Freelancer Ion',
        nameRo: 'Freelancer Ion',
        tier: 'FREE',
        cui: 'RO99887766',
        industry: 'CONSULTING',
        employeeCount: 1,
        createdAt: new Date('2024-06-01'),
        isActive: true,
        settings: {
          analyticsEnabled: true,
          dataRetentionDays: 30,
          allowBenchmarking: false,
          anonymousDataSharing: false,
          customMetrics: [],
        },
      },
    ];

    sampleTenants.forEach(t => this.tenants.set(t.id, t));

    // Initialize industry benchmarks
    this.initializeBenchmarks();
  }

  private initializeBenchmarks(): void {
    const industries = ['IT_SERVICES', 'RETAIL', 'MANUFACTURING', 'CONSULTING', 'HEALTHCARE'];

    for (const industry of industries) {
      const benchmark: IndustryBenchmark = {
        industry,
        tenantCount: Math.floor(10 + Math.random() * 50),
        metrics: [
          {
            name: 'Invoice Processing Time',
            nameRo: 'Timp Procesare Factură',
            average: 2.5 + Math.random() * 2,
            median: 2.0 + Math.random() * 1.5,
            p25: 1.5 + Math.random(),
            p75: 3.0 + Math.random() * 2,
            p90: 5.0 + Math.random() * 3,
            unit: 'minutes',
          },
          {
            name: 'Monthly Revenue',
            nameRo: 'Venituri Lunare',
            average: 50000 + Math.random() * 100000,
            median: 40000 + Math.random() * 80000,
            p25: 20000 + Math.random() * 30000,
            p75: 80000 + Math.random() * 100000,
            p90: 150000 + Math.random() * 100000,
            unit: 'RON',
          },
          {
            name: 'Document OCR Accuracy',
            nameRo: 'Precizie OCR Documente',
            average: 92 + Math.random() * 6,
            median: 94 + Math.random() * 4,
            p25: 88 + Math.random() * 5,
            p75: 96 + Math.random() * 3,
            p90: 98 + Math.random() * 2,
            unit: '%',
          },
        ],
        updatedAt: new Date(),
      };

      this.benchmarks.set(industry, benchmark);
    }
  }

  // Tenant Management
  getTenant(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  getAllTenants(filters?: { tier?: TenantTier; industry?: string; isActive?: boolean }): Tenant[] {
    let tenants = Array.from(this.tenants.values());

    if (filters?.tier) {
      tenants = tenants.filter(t => t.tier === filters.tier);
    }
    if (filters?.industry) {
      tenants = tenants.filter(t => t.industry === filters.industry);
    }
    if (filters?.isActive !== undefined) {
      tenants = tenants.filter(t => t.isActive === filters.isActive);
    }

    return tenants;
  }

  createTenant(data: Omit<Tenant, 'id' | 'createdAt'>): Tenant {
    const tenant: Tenant = {
      ...data,
      id: `tenant-${randomUUID()}`,
      createdAt: new Date(),
    };

    this.tenants.set(tenant.id, tenant);
    this.metrics.set(tenant.id, []);

    this.eventEmitter.emit('tenant.created', { tenantId: tenant.id, name: tenant.name });

    return tenant;
  }

  updateTenant(tenantId: string, updates: Partial<Tenant>): Tenant {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const updatedTenant = { ...tenant, ...updates, id: tenantId };
    this.tenants.set(tenantId, updatedTenant);

    this.eventEmitter.emit('tenant.updated', { tenantId });

    return updatedTenant;
  }

  deactivateTenant(tenantId: string): Tenant {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    tenant.isActive = false;

    this.eventEmitter.emit('tenant.deactivated', { tenantId });

    return tenant;
  }

  // Metrics Collection
  recordMetric(data: Omit<TenantMetric, 'id' | 'timestamp'>): TenantMetric {
    const tenant = this.tenants.get(data.tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${data.tenantId} not found`);
    }

    if (!tenant.settings.analyticsEnabled) {
      throw new ForbiddenException('Analytics disabled for this tenant');
    }

    const metric: TenantMetric = {
      ...data,
      id: `metric-${randomUUID()}`,
      timestamp: new Date(),
    };

    const tenantMetrics = this.metrics.get(data.tenantId) || [];
    tenantMetrics.push(metric);
    this.metrics.set(data.tenantId, tenantMetrics);

    // Check for quota warnings
    this.checkQuotaAlerts(data.tenantId);

    return metric;
  }

  getMetrics(tenantId: string, filters?: {
    name?: string;
    startDate?: Date;
    endDate?: Date;
    type?: MetricType;
  }): TenantMetric[] {
    let metrics = this.metrics.get(tenantId) || [];

    if (filters?.name) {
      metrics = metrics.filter(m => m.name === filters.name);
    }
    if (filters?.type) {
      metrics = metrics.filter(m => m.type === filters.type);
    }
    if (filters?.startDate) {
      metrics = metrics.filter(m => m.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      metrics = metrics.filter(m => m.timestamp <= filters.endDate!);
    }

    return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  aggregateMetrics(tenantId: string, metricName: string, aggregation: AggregationType, period: ComparisonPeriod): number {
    const now = new Date();
    const startDate = this.getStartDate(now, period);

    const metrics = this.getMetrics(tenantId, {
      name: metricName,
      startDate,
      endDate: now,
    });

    const values = metrics.map(m => m.value);

    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'SUM':
        return values.reduce((a, b) => a + b, 0);
      case 'AVG':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'MIN':
        return Math.min(...values);
      case 'MAX':
        return Math.max(...values);
      case 'COUNT':
        return values.length;
      case 'PERCENTILE':
        values.sort((a, b) => a - b);
        const p95Index = Math.floor(values.length * 0.95);
        return values[p95Index] || 0;
      default:
        return 0;
    }
  }

  private getStartDate(now: Date, period: ComparisonPeriod): Date {
    const startDate = new Date(now);

    switch (period) {
      case 'DAY':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'WEEK':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'MONTH':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'QUARTER':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'YEAR':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'YTD':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    return startDate;
  }

  // Tenant Summary
  getTenantSummary(tenantId: string, period: ComparisonPeriod = 'MONTH'): TenantSummary {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const now = new Date();
    const startDate = this.getStartDate(now, period);

    // Generate sample summary data
    return {
      tenantId,
      tenantName: tenant.name,
      tier: tenant.tier,
      period,
      startDate,
      endDate: now,
      metrics: {
        revenue: 50000 + Math.random() * 100000,
        revenueChange: (Math.random() - 0.3) * 30,
        invoiceCount: Math.floor(50 + Math.random() * 200),
        averageInvoiceValue: 500 + Math.random() * 1000,
        activeUsers: Math.floor(5 + Math.random() * 30),
        apiCalls: Math.floor(1000 + Math.random() * 10000),
        storageUsedMB: Math.floor(100 + Math.random() * 5000),
        anafSubmissions: Math.floor(10 + Math.random() * 50),
      },
      usage: {
        documentsProcessed: Math.floor(100 + Math.random() * 500),
        ocrPages: Math.floor(500 + Math.random() * 2000),
        workflowsExecuted: Math.floor(50 + Math.random() * 200),
        reportsGenerated: Math.floor(20 + Math.random() * 100),
      },
      health: {
        errorRate: Math.random() * 5,
        averageResponseTime: 50 + Math.random() * 150,
        uptime: 99 + Math.random(),
      },
    };
  }

  // Benchmarking
  getIndustryBenchmark(industry: string): IndustryBenchmark {
    const benchmark = this.benchmarks.get(industry);
    if (!benchmark) {
      throw new NotFoundException(`Benchmark for industry ${industry} not found`);
    }
    return benchmark;
  }

  getAllBenchmarks(): IndustryBenchmark[] {
    return Array.from(this.benchmarks.values());
  }

  compareTenantToIndustry(tenantId: string, metricName: string): TenantComparison {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    if (!tenant.settings.allowBenchmarking) {
      throw new ForbiddenException('Benchmarking disabled for this tenant');
    }

    const benchmark = this.benchmarks.get(tenant.industry || 'IT_SERVICES');
    if (!benchmark) {
      throw new NotFoundException('Industry benchmark not found');
    }

    const metricBenchmark = benchmark.metrics.find(m => m.name === metricName);
    const industryAverage = metricBenchmark?.average || 50;
    const value = industryAverage * (0.8 + Math.random() * 0.4); // Simulate tenant value

    let percentile: number;
    let trend: TenantComparison['trend'];

    if (value >= industryAverage * 1.1) {
      percentile = 75 + Math.random() * 20;
      trend = 'ABOVE_AVERAGE';
    } else if (value >= industryAverage * 0.9) {
      percentile = 40 + Math.random() * 20;
      trend = 'AVERAGE';
    } else {
      percentile = Math.random() * 35;
      trend = 'BELOW_AVERAGE';
    }

    return {
      tenantId,
      tenantName: tenant.name,
      metric: metricName,
      value,
      industryAverage,
      industryPercentile: percentile,
      trend,
      recommendation: trend === 'BELOW_AVERAGE' ? 'Consider optimizing this metric' : undefined,
      recommendationRo: trend === 'BELOW_AVERAGE' ? 'Considerați optimizarea acestei metrici' : undefined,
    };
  }

  // Cross-Tenant Reporting
  generateCrossTenantReport(period: ComparisonPeriod = 'MONTH'): CrossTenantReport {
    const now = new Date();
    const startDate = this.getStartDate(now, period);

    const allTenants = Array.from(this.tenants.values());
    const activeTenants = allTenants.filter(t => t.isActive);
    const newTenants = allTenants.filter(t => t.createdAt >= startDate);
    const churnedTenants = allTenants.filter(t => !t.isActive && t.createdAt < startDate);

    // Calculate tier distribution
    const tierDistribution: Record<TenantTier, number> = {
      FREE: 0,
      BASIC: 0,
      PRO: 0,
      ENTERPRISE: 0,
    };
    activeTenants.forEach(t => tierDistribution[t.tier]++);

    // Calculate industry distribution
    const industryDistribution: Record<string, number> = {};
    activeTenants.forEach(t => {
      const industry = t.industry || 'OTHER';
      industryDistribution[industry] = (industryDistribution[industry] || 0) + 1;
    });

    // Identify top performers
    const topPerformers = activeTenants.slice(0, 5).map(t => ({
      tenantId: t.id,
      tenantName: t.name,
      metric: 'Revenue',
      value: 50000 + Math.random() * 150000,
    })).sort((a, b) => b.value - a.value);

    // Generate insights
    const insights: string[] = [];
    const insightsRo: string[] = [];

    if (newTenants.length > 0) {
      insights.push(`${newTenants.length} new tenants onboarded this period`);
      insightsRo.push(`${newTenants.length} chiriași noi înregistrați în această perioadă`);
    }

    const enterpriseCount = tierDistribution.ENTERPRISE;
    if (enterpriseCount > 0) {
      insights.push(`${enterpriseCount} Enterprise tier tenants driving ${Math.floor(enterpriseCount * 30 + 20)}% of revenue`);
      insightsRo.push(`${enterpriseCount} chiriași Enterprise generează ${Math.floor(enterpriseCount * 30 + 20)}% din venituri`);
    }

    const totalRevenue = topPerformers.reduce((sum, t) => sum + t.value, 0);

    const report: CrossTenantReport = {
      id: `report-${randomUUID()}`,
      name: `Cross-Tenant Analytics Report - ${period}`,
      nameRo: `Raport Analitică Multi-Chiriaș - ${period}`,
      generatedAt: now,
      period,
      totalTenants: allTenants.length,
      activeTenants: activeTenants.length,
      newTenants: newTenants.length,
      churnedTenants: churnedTenants.length,
      totalRevenue,
      averageRevenuePerTenant: activeTenants.length > 0 ? totalRevenue / activeTenants.length : 0,
      tierDistribution,
      industryDistribution,
      topPerformers,
      insights,
      insightsRo,
    };

    this.eventEmitter.emit('analytics.report.generated', { reportId: report.id, period });

    return report;
  }

  // Usage Quotas
  getUsageQuota(tenantId: string): UsageQuota {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const quotaLimits: Record<TenantTier, Record<string, number>> = {
      FREE: { invoices: 50, storage: 100, apiCalls: 1000, users: 1, ocrPages: 100 },
      BASIC: { invoices: 500, storage: 1000, apiCalls: 10000, users: 5, ocrPages: 500 },
      PRO: { invoices: 5000, storage: 10000, apiCalls: 100000, users: 20, ocrPages: 5000 },
      ENTERPRISE: { invoices: -1, storage: -1, apiCalls: -1, users: -1, ocrPages: -1 }, // Unlimited
    };

    const limits = quotaLimits[tenant.tier];
    const quotas = Object.entries(limits).map(([name, limit]) => {
      const used = limit === -1 ? Math.floor(Math.random() * 10000) : Math.floor(Math.random() * limit);
      const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
      const percentUsed = limit === -1 ? 0 : (used / limit) * 100;

      return {
        name,
        limit: limit === -1 ? Infinity : limit,
        used,
        remaining: remaining === -1 ? Infinity : remaining,
        percentUsed,
        resetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Resets in 30 days
      };
    });

    return {
      tenantId,
      tier: tenant.tier,
      quotas,
    };
  }

  // Alerts
  private checkQuotaAlerts(tenantId: string): void {
    const quota = this.getUsageQuota(tenantId);
    const tenant = this.tenants.get(tenantId);

    if (!tenant) return;

    for (const q of quota.quotas) {
      if (q.percentUsed >= 90 && q.percentUsed < 100) {
        this.createAlert({
          tenantId,
          tenantName: tenant.name,
          type: 'QUOTA_WARNING',
          severity: 'WARNING',
          message: `${q.name} quota is at ${q.percentUsed.toFixed(1)}%`,
          messageRo: `Cota ${q.name} este la ${q.percentUsed.toFixed(1)}%`,
        });
      } else if (q.percentUsed >= 100) {
        this.createAlert({
          tenantId,
          tenantName: tenant.name,
          type: 'QUOTA_EXCEEDED',
          severity: 'CRITICAL',
          message: `${q.name} quota exceeded`,
          messageRo: `Cota ${q.name} a fost depășită`,
        });
      }
    }
  }

  createAlert(data: Omit<TenantAlert, 'id' | 'triggeredAt'>): TenantAlert {
    const alert: TenantAlert = {
      ...data,
      id: `alert-${randomUUID()}`,
      triggeredAt: new Date(),
    };

    this.alerts.set(alert.id, alert);

    this.eventEmitter.emit('tenant.alert.triggered', {
      alertId: alert.id,
      tenantId: data.tenantId,
      severity: data.severity,
    });

    return alert;
  }

  getAlerts(tenantId?: string, unresolved?: boolean): TenantAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (tenantId) {
      alerts = alerts.filter(a => a.tenantId === tenantId);
    }

    if (unresolved === true) {
      alerts = alerts.filter(a => !a.resolvedAt);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.triggeredAt.getTime() - a.triggeredAt.getTime();
    });
  }

  acknowledgeAlert(alertId: string): TenantAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.acknowledgedAt = new Date();

    this.eventEmitter.emit('tenant.alert.acknowledged', { alertId });

    return alert;
  }

  resolveAlert(alertId: string): TenantAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.resolvedAt = new Date();

    this.eventEmitter.emit('tenant.alert.resolved', { alertId });

    return alert;
  }

  // Statistics
  getTenantStatistics(): {
    totalTenants: number;
    activeTenants: number;
    tierBreakdown: Record<TenantTier, number>;
    industryBreakdown: Record<string, number>;
    averageEmployeeCount: number;
    tenantsByMonth: { month: string; count: number }[];
  } {
    const allTenants = Array.from(this.tenants.values());
    const activeTenants = allTenants.filter(t => t.isActive);

    const tierBreakdown: Record<TenantTier, number> = {
      FREE: 0,
      BASIC: 0,
      PRO: 0,
      ENTERPRISE: 0,
    };

    const industryBreakdown: Record<string, number> = {};
    let totalEmployees = 0;

    allTenants.forEach(t => {
      tierBreakdown[t.tier]++;
      const industry = t.industry || 'OTHER';
      industryBreakdown[industry] = (industryBreakdown[industry] || 0) + 1;
      totalEmployees += t.employeeCount || 0;
    });

    // Tenants by month (last 12 months)
    const tenantsByMonth: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthKey = monthStart.toISOString().slice(0, 7);
      const count = allTenants.filter(
        t => t.createdAt >= monthStart && t.createdAt <= monthEnd
      ).length;
      tenantsByMonth.push({ month: monthKey, count });
    }

    return {
      totalTenants: allTenants.length,
      activeTenants: activeTenants.length,
      tierBreakdown,
      industryBreakdown,
      averageEmployeeCount: allTenants.length > 0 ? totalEmployees / allTenants.length : 0,
      tenantsByMonth,
    };
  }
}
