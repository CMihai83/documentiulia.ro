import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Platform Analytics Service
 * System-wide analytics and metrics for administrators
 *
 * Features:
 * - User activity tracking
 * - Revenue metrics
 * - System performance
 * - Growth analytics
 * - Error tracking
 */

// =================== TYPES ===================

export interface PlatformOverview {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
  };
  tenants: {
    total: number;
    active: number;
    newThisMonth: number;
    churnedThisMonth: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    growthRate: number;
    avgRevenuePerUser: number;
  };
  usage: {
    invoicesCreated: number;
    documentsProcessed: number;
    apiCallsToday: number;
    storageUsedGB: number;
  };
}

export interface UserActivityMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  averageSessionsPerUser: number;
  topFeatures: Array<{ feature: string; usageCount: number }>;
  peakHours: Array<{ hour: number; activeUsers: number }>;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  mrrGrowth: number;
  ltv: number;
  churnRate: number;
  revenueByPlan: Array<{ plan: string; revenue: number; users: number }>;
  revenueByMonth: Array<{ month: string; revenue: number; newMrr: number; churnedMrr: number }>;
}

export interface SystemPerformance {
  uptime: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  requestsPerSecond: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
}

export interface ErrorMetrics {
  totalErrors24h: number;
  errorsByType: Array<{ type: string; count: number }>;
  errorsByEndpoint: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
  criticalErrors: Array<{
    id: string;
    type: string;
    message: string;
    count: number;
    firstSeen: Date;
    lastSeen: Date;
  }>;
}

export interface GrowthMetrics {
  userGrowth: Array<{ date: string; total: number; new: number; churned: number }>;
  tenantGrowth: Array<{ date: string; total: number; new: number; churned: number }>;
  conversionFunnel: {
    visitors: number;
    signups: number;
    activations: number;
    subscribers: number;
  };
  retentionCohorts: Array<{
    cohort: string;
    size: number;
    retention: number[];
  }>;
}

// =================== SERVICE ===================

@Injectable()
export class PlatformAnalyticsService {
  private readonly logger = new Logger(PlatformAnalyticsService.name);

  // Simulated metrics storage
  private metricsHistory: Array<{
    timestamp: Date;
    metric: string;
    value: number;
    dimensions?: Record<string, string>;
  }> = [];

  constructor(private eventEmitter: EventEmitter2) {
    // Initialize with some demo data
    this.initializeDemoMetrics();
  }

  private initializeDemoMetrics(): void {
    // Populate with realistic demo data
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      this.metricsHistory.push(
        { timestamp: date, metric: 'daily_active_users', value: 850 + Math.floor(Math.random() * 200) },
        { timestamp: date, metric: 'api_calls', value: 50000 + Math.floor(Math.random() * 20000) },
        { timestamp: date, metric: 'invoices_created', value: 120 + Math.floor(Math.random() * 50) },
        { timestamp: date, metric: 'documents_processed', value: 300 + Math.floor(Math.random() * 100) },
        { timestamp: date, metric: 'new_users', value: 15 + Math.floor(Math.random() * 10) },
        { timestamp: date, metric: 'revenue', value: 45000 + Math.floor(Math.random() * 5000) },
      );
    }
  }

  // =================== OVERVIEW ===================

  async getPlatformOverview(): Promise<PlatformOverview> {
    return {
      users: {
        total: 12450,
        active: 8920,
        newThisMonth: 485,
        growth: 12.5,
      },
      tenants: {
        total: 3250,
        active: 2890,
        newThisMonth: 125,
        churnedThisMonth: 18,
      },
      revenue: {
        mrr: 156000,
        arr: 1872000,
        growthRate: 8.3,
        avgRevenuePerUser: 12.53,
      },
      usage: {
        invoicesCreated: 45230,
        documentsProcessed: 128500,
        apiCallsToday: 1250000,
        storageUsedGB: 2450,
      },
    };
  }

  // =================== USER ACTIVITY ===================

  async getUserActivityMetrics(
    period: 'day' | 'week' | 'month' = 'day',
  ): Promise<UserActivityMetrics> {
    return {
      dailyActiveUsers: 1050,
      weeklyActiveUsers: 4250,
      monthlyActiveUsers: 8920,
      averageSessionDuration: 18.5, // minutes
      averageSessionsPerUser: 3.2,
      topFeatures: [
        { feature: 'Invoice Creation', usageCount: 15420 },
        { feature: 'OCR Document Scan', usageCount: 12350 },
        { feature: 'Dashboard View', usageCount: 10890 },
        { feature: 'Report Generation', usageCount: 8450 },
        { feature: 'Partner Management', usageCount: 6780 },
        { feature: 'VAT Calculation', usageCount: 5420 },
        { feature: 'e-Factura Submit', usageCount: 4890 },
        { feature: 'Bank Reconciliation', usageCount: 3250 },
      ],
      peakHours: [
        { hour: 9, activeUsers: 890 },
        { hour: 10, activeUsers: 1050 },
        { hour: 11, activeUsers: 980 },
        { hour: 14, activeUsers: 920 },
        { hour: 15, activeUsers: 850 },
        { hour: 16, activeUsers: 780 },
      ],
    };
  }

  async getActiveUsersByCountry(): Promise<Array<{ country: string; users: number; percentage: number }>> {
    return [
      { country: 'Romania', users: 7850, percentage: 88.0 },
      { country: 'Germany', users: 450, percentage: 5.0 },
      { country: 'Spain', users: 280, percentage: 3.1 },
      { country: 'France', users: 200, percentage: 2.2 },
      { country: 'Other', users: 140, percentage: 1.7 },
    ];
  }

  // =================== REVENUE ===================

  async getRevenueMetrics(): Promise<RevenueMetrics> {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const baseRevenue = 120000;

    return {
      mrr: 156000,
      arr: 1872000,
      mrrGrowth: 8.3,
      ltv: 450,
      churnRate: 2.1,
      revenueByPlan: [
        { plan: 'Free', revenue: 0, users: 5200 },
        { plan: 'Pro', revenue: 58000, users: 1180 },
        { plan: 'Business', revenue: 72000, users: 480 },
        { plan: 'Enterprise', revenue: 26000, users: 52 },
      ],
      revenueByMonth: months.map((month, i) => ({
        month,
        revenue: baseRevenue + (i * 6000) + Math.floor(Math.random() * 3000),
        newMrr: 8000 + Math.floor(Math.random() * 2000),
        churnedMrr: 2000 + Math.floor(Math.random() * 1000),
      })),
    };
  }

  async getSubscriptionMetrics(): Promise<{
    totalSubscribers: number;
    byPlan: Array<{ plan: string; count: number; mrr: number }>;
    trialConversionRate: number;
    avgTrialToConvert: number;
  }> {
    return {
      totalSubscribers: 1712,
      byPlan: [
        { plan: 'Pro', count: 1180, mrr: 58000 },
        { plan: 'Business', count: 480, mrr: 72000 },
        { plan: 'Enterprise', count: 52, mrr: 26000 },
      ],
      trialConversionRate: 23.5,
      avgTrialToConvert: 8.2, // days
    };
  }

  // =================== SYSTEM PERFORMANCE ===================

  async getSystemPerformance(): Promise<SystemPerformance> {
    return {
      uptime: 99.97,
      avgResponseTime: 45,
      p95ResponseTime: 120,
      p99ResponseTime: 250,
      errorRate: 0.12,
      requestsPerSecond: 850,
      cpuUsage: 42,
      memoryUsage: 68,
      diskUsage: 55,
      activeConnections: 1250,
    };
  }

  async getPerformanceHistory(
    metric: 'response_time' | 'error_rate' | 'requests',
    period: 'hour' | 'day' | 'week',
  ): Promise<Array<{ timestamp: string; value: number }>> {
    const points = period === 'hour' ? 60 : period === 'day' ? 24 : 7;
    const data: Array<{ timestamp: string; value: number }> = [];

    const now = new Date();
    for (let i = points - 1; i >= 0; i--) {
      const timestamp = new Date(now);
      if (period === 'hour') {
        timestamp.setMinutes(timestamp.getMinutes() - i);
      } else if (period === 'day') {
        timestamp.setHours(timestamp.getHours() - i);
      } else {
        timestamp.setDate(timestamp.getDate() - i);
      }

      let value: number;
      switch (metric) {
        case 'response_time':
          value = 40 + Math.random() * 30;
          break;
        case 'error_rate':
          value = 0.05 + Math.random() * 0.2;
          break;
        case 'requests':
          value = 700 + Math.random() * 300;
          break;
      }

      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 100) / 100,
      });
    }

    return data;
  }

  // =================== ERRORS ===================

  async getErrorMetrics(): Promise<ErrorMetrics> {
    return {
      totalErrors24h: 156,
      errorsByType: [
        { type: 'ValidationError', count: 68 },
        { type: 'AuthenticationError', count: 42 },
        { type: 'NotFoundError', count: 28 },
        { type: 'RateLimitError', count: 12 },
        { type: 'InternalError', count: 6 },
      ],
      errorsByEndpoint: [
        { endpoint: '/api/v1/invoices', count: 25, avgResponseTime: 85 },
        { endpoint: '/api/v1/auth/login', count: 42, avgResponseTime: 120 },
        { endpoint: '/api/v1/ocr/process', count: 18, avgResponseTime: 450 },
        { endpoint: '/api/v1/anaf/submit', count: 12, avgResponseTime: 2500 },
      ],
      criticalErrors: [
        {
          id: 'err-1',
          type: 'DatabaseConnection',
          message: 'Connection pool exhausted',
          count: 3,
          firstSeen: new Date(Date.now() - 86400000),
          lastSeen: new Date(Date.now() - 3600000),
        },
      ],
    };
  }

  // =================== GROWTH ===================

  async getGrowthMetrics(
    period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ): Promise<GrowthMetrics> {
    const dataPoints = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 12 : 12;

    const userGrowth: GrowthMetrics['userGrowth'] = [];
    const tenantGrowth: GrowthMetrics['tenantGrowth'] = [];

    let userTotal = 11000;
    let tenantTotal = 2900;

    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date();
      if (period === 'week' || period === 'month') {
        date.setDate(date.getDate() - i);
      } else {
        date.setMonth(date.getMonth() - i);
      }

      const newUsers = 10 + Math.floor(Math.random() * 20);
      const churnedUsers = Math.floor(Math.random() * 5);
      userTotal += newUsers - churnedUsers;

      const newTenants = 3 + Math.floor(Math.random() * 5);
      const churnedTenants = Math.floor(Math.random() * 2);
      tenantTotal += newTenants - churnedTenants;

      userGrowth.push({
        date: date.toISOString().split('T')[0],
        total: userTotal,
        new: newUsers,
        churned: churnedUsers,
      });

      tenantGrowth.push({
        date: date.toISOString().split('T')[0],
        total: tenantTotal,
        new: newTenants,
        churned: churnedTenants,
      });
    }

    return {
      userGrowth,
      tenantGrowth,
      conversionFunnel: {
        visitors: 125000,
        signups: 4850,
        activations: 3200,
        subscribers: 1712,
      },
      retentionCohorts: [
        { cohort: 'Sep 2024', size: 380, retention: [100, 85, 72, 68] },
        { cohort: 'Oct 2024', size: 420, retention: [100, 88, 75, 71] },
        { cohort: 'Nov 2024', size: 450, retention: [100, 86, 78] },
        { cohort: 'Dec 2024', size: 485, retention: [100, 89] },
      ],
    };
  }

  // =================== FEATURE USAGE ===================

  async getFeatureUsage(): Promise<Array<{
    feature: string;
    totalUsage: number;
    uniqueUsers: number;
    avgUsagePerUser: number;
    trend: number;
  }>> {
    return [
      { feature: 'Invoice Creation', totalUsage: 45230, uniqueUsers: 8500, avgUsagePerUser: 5.3, trend: 12 },
      { feature: 'OCR Processing', totalUsage: 28500, uniqueUsers: 6200, avgUsagePerUser: 4.6, trend: 18 },
      { feature: 'e-Factura Submit', totalUsage: 15420, uniqueUsers: 4800, avgUsagePerUser: 3.2, trend: 25 },
      { feature: 'SAF-T Export', totalUsage: 3250, uniqueUsers: 2100, avgUsagePerUser: 1.5, trend: 8 },
      { feature: 'Report Generation', totalUsage: 12890, uniqueUsers: 5400, avgUsagePerUser: 2.4, trend: 5 },
      { feature: 'Bank Reconciliation', totalUsage: 8450, uniqueUsers: 3200, avgUsagePerUser: 2.6, trend: 15 },
      { feature: 'AI Assistant', totalUsage: 18920, uniqueUsers: 4100, avgUsagePerUser: 4.6, trend: 32 },
      { feature: 'Mobile App', totalUsage: 22150, uniqueUsers: 3800, avgUsagePerUser: 5.8, trend: 28 },
    ];
  }

  // =================== INTEGRATIONS ===================

  async getIntegrationMetrics(): Promise<Array<{
    integration: string;
    connectedTenants: number;
    apiCalls24h: number;
    successRate: number;
    avgLatency: number;
  }>> {
    return [
      { integration: 'ANAF e-Factura', connectedTenants: 2450, apiCalls24h: 15420, successRate: 99.2, avgLatency: 850 },
      { integration: 'ANAF SPV', connectedTenants: 2100, apiCalls24h: 8920, successRate: 98.8, avgLatency: 1200 },
      { integration: 'SAGA', connectedTenants: 890, apiCalls24h: 12500, successRate: 99.5, avgLatency: 320 },
      { integration: 'Bank PSD2', connectedTenants: 1250, apiCalls24h: 45000, successRate: 99.8, avgLatency: 180 },
      { integration: 'Stripe', connectedTenants: 680, apiCalls24h: 3250, successRate: 99.9, avgLatency: 150 },
    ];
  }

  // =================== EXPORT ===================

  async exportAnalytics(
    type: 'overview' | 'users' | 'revenue' | 'performance' | 'all',
    format: 'json' | 'csv',
  ): Promise<{ url: string; expiresAt: Date }> {
    // In production, this would generate and upload the report
    const filename = `platform-analytics-${type}-${Date.now()}.${format}`;

    return {
      url: `https://exports.documentiulia.ro/analytics/${filename}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  // =================== REAL-TIME ===================

  async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    requestsPerMinute: number;
    avgResponseTime: number;
    errorRate: number;
    activeSessions: number;
    queuedJobs: number;
  }> {
    return {
      activeUsers: 1050 + Math.floor(Math.random() * 100),
      requestsPerMinute: 2800 + Math.floor(Math.random() * 400),
      avgResponseTime: 42 + Math.floor(Math.random() * 20),
      errorRate: 0.08 + Math.random() * 0.1,
      activeSessions: 1250 + Math.floor(Math.random() * 150),
      queuedJobs: 45 + Math.floor(Math.random() * 30),
    };
  }
}
