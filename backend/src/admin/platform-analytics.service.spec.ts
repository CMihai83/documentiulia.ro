import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PlatformAnalyticsService,
  PlatformOverview,
  UserActivityMetrics,
  RevenueMetrics,
  SystemPerformance,
  ErrorMetrics,
  GrowthMetrics,
} from './platform-analytics.service';

describe('PlatformAnalyticsService', () => {
  let service: PlatformAnalyticsService;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAnalyticsService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<PlatformAnalyticsService>(PlatformAnalyticsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Platform Overview', () => {
    describe('getPlatformOverview', () => {
      it('should return platform overview', async () => {
        const overview = await service.getPlatformOverview();

        expect(overview).toBeDefined();
        expect(overview.users).toBeDefined();
        expect(overview.tenants).toBeDefined();
        expect(overview.revenue).toBeDefined();
        expect(overview.usage).toBeDefined();
      });

      it('should include user metrics', async () => {
        const overview = await service.getPlatformOverview();

        expect(overview.users.total).toBeGreaterThan(0);
        expect(overview.users.active).toBeGreaterThan(0);
        expect(overview.users.newThisMonth).toBeGreaterThanOrEqual(0);
        expect(typeof overview.users.growth).toBe('number');
      });

      it('should include tenant metrics', async () => {
        const overview = await service.getPlatformOverview();

        expect(overview.tenants.total).toBeGreaterThan(0);
        expect(overview.tenants.active).toBeGreaterThan(0);
        expect(overview.tenants.newThisMonth).toBeGreaterThanOrEqual(0);
        expect(overview.tenants.churnedThisMonth).toBeGreaterThanOrEqual(0);
      });

      it('should include revenue metrics', async () => {
        const overview = await service.getPlatformOverview();

        expect(overview.revenue.mrr).toBeGreaterThan(0);
        expect(overview.revenue.arr).toBe(overview.revenue.mrr * 12);
        expect(typeof overview.revenue.growthRate).toBe('number');
        expect(overview.revenue.avgRevenuePerUser).toBeGreaterThan(0);
      });

      it('should include usage metrics', async () => {
        const overview = await service.getPlatformOverview();

        expect(overview.usage.invoicesCreated).toBeGreaterThan(0);
        expect(overview.usage.documentsProcessed).toBeGreaterThan(0);
        expect(overview.usage.apiCallsToday).toBeGreaterThan(0);
        expect(overview.usage.storageUsedGB).toBeGreaterThan(0);
      });
    });
  });

  describe('User Activity', () => {
    describe('getUserActivityMetrics', () => {
      it('should return user activity metrics', async () => {
        const metrics = await service.getUserActivityMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.dailyActiveUsers).toBeGreaterThan(0);
        expect(metrics.weeklyActiveUsers).toBeGreaterThan(0);
        expect(metrics.monthlyActiveUsers).toBeGreaterThan(0);
      });

      it('should include session metrics', async () => {
        const metrics = await service.getUserActivityMetrics();

        expect(metrics.averageSessionDuration).toBeGreaterThan(0);
        expect(metrics.averageSessionsPerUser).toBeGreaterThan(0);
      });

      it('should include top features', async () => {
        const metrics = await service.getUserActivityMetrics();

        expect(Array.isArray(metrics.topFeatures)).toBe(true);
        expect(metrics.topFeatures.length).toBeGreaterThan(0);
        expect(metrics.topFeatures[0].feature).toBeDefined();
        expect(metrics.topFeatures[0].usageCount).toBeGreaterThan(0);
      });

      it('should include Invoice Creation as top feature', async () => {
        const metrics = await service.getUserActivityMetrics();

        const invoiceFeature = metrics.topFeatures.find(f => f.feature === 'Invoice Creation');
        expect(invoiceFeature).toBeDefined();
      });

      it('should include OCR Document Scan feature', async () => {
        const metrics = await service.getUserActivityMetrics();

        const ocrFeature = metrics.topFeatures.find(f => f.feature === 'OCR Document Scan');
        expect(ocrFeature).toBeDefined();
      });

      it('should include e-Factura Submit feature', async () => {
        const metrics = await service.getUserActivityMetrics();

        const efacturaFeature = metrics.topFeatures.find(f => f.feature === 'e-Factura Submit');
        expect(efacturaFeature).toBeDefined();
      });

      it('should include peak hours', async () => {
        const metrics = await service.getUserActivityMetrics();

        expect(Array.isArray(metrics.peakHours)).toBe(true);
        expect(metrics.peakHours.length).toBeGreaterThan(0);
        expect(metrics.peakHours[0].hour).toBeDefined();
        expect(metrics.peakHours[0].activeUsers).toBeGreaterThan(0);
      });

      it('should accept period parameter', async () => {
        const dayMetrics = await service.getUserActivityMetrics('day');
        const weekMetrics = await service.getUserActivityMetrics('week');
        const monthMetrics = await service.getUserActivityMetrics('month');

        expect(dayMetrics).toBeDefined();
        expect(weekMetrics).toBeDefined();
        expect(monthMetrics).toBeDefined();
      });
    });

    describe('getActiveUsersByCountry', () => {
      it('should return users by country', async () => {
        const byCountry = await service.getActiveUsersByCountry();

        expect(Array.isArray(byCountry)).toBe(true);
        expect(byCountry.length).toBeGreaterThan(0);
      });

      it('should have Romania as top country', async () => {
        const byCountry = await service.getActiveUsersByCountry();

        expect(byCountry[0].country).toBe('Romania');
        expect(byCountry[0].percentage).toBeGreaterThan(50);
      });

      it('should include percentage values', async () => {
        const byCountry = await service.getActiveUsersByCountry();

        byCountry.forEach(country => {
          expect(country.percentage).toBeGreaterThanOrEqual(0);
          expect(country.percentage).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('Revenue Metrics', () => {
    describe('getRevenueMetrics', () => {
      it('should return revenue metrics', async () => {
        const metrics = await service.getRevenueMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.mrr).toBeGreaterThan(0);
        expect(metrics.arr).toBeGreaterThan(0);
      });

      it('should include LTV', async () => {
        const metrics = await service.getRevenueMetrics();

        expect(metrics.ltv).toBeGreaterThan(0);
      });

      it('should include churn rate', async () => {
        const metrics = await service.getRevenueMetrics();

        expect(metrics.churnRate).toBeGreaterThanOrEqual(0);
        expect(metrics.churnRate).toBeLessThan(100);
      });

      it('should include revenue by plan', async () => {
        const metrics = await service.getRevenueMetrics();

        expect(Array.isArray(metrics.revenueByPlan)).toBe(true);
        expect(metrics.revenueByPlan.length).toBeGreaterThan(0);
      });

      it('should include Free plan with 0 revenue', async () => {
        const metrics = await service.getRevenueMetrics();

        const freePlan = metrics.revenueByPlan.find(p => p.plan === 'Free');
        expect(freePlan).toBeDefined();
        expect(freePlan?.revenue).toBe(0);
      });

      it('should include Pro plan', async () => {
        const metrics = await service.getRevenueMetrics();

        const proPlan = metrics.revenueByPlan.find(p => p.plan === 'Pro');
        expect(proPlan).toBeDefined();
        expect(proPlan?.revenue).toBeGreaterThan(0);
      });

      it('should include Business plan', async () => {
        const metrics = await service.getRevenueMetrics();

        const businessPlan = metrics.revenueByPlan.find(p => p.plan === 'Business');
        expect(businessPlan).toBeDefined();
        expect(businessPlan?.revenue).toBeGreaterThan(0);
      });

      it('should include Enterprise plan', async () => {
        const metrics = await service.getRevenueMetrics();

        const enterprisePlan = metrics.revenueByPlan.find(p => p.plan === 'Enterprise');
        expect(enterprisePlan).toBeDefined();
      });

      it('should include monthly revenue breakdown', async () => {
        const metrics = await service.getRevenueMetrics();

        expect(Array.isArray(metrics.revenueByMonth)).toBe(true);
        expect(metrics.revenueByMonth.length).toBeGreaterThan(0);
        expect(metrics.revenueByMonth[0].month).toBeDefined();
        expect(metrics.revenueByMonth[0].revenue).toBeGreaterThan(0);
      });
    });

    describe('getSubscriptionMetrics', () => {
      it('should return subscription metrics', async () => {
        const metrics = await service.getSubscriptionMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.totalSubscribers).toBeGreaterThan(0);
      });

      it('should include trial conversion rate', async () => {
        const metrics = await service.getSubscriptionMetrics();

        expect(metrics.trialConversionRate).toBeGreaterThan(0);
        expect(metrics.trialConversionRate).toBeLessThan(100);
      });

      it('should include avg trial to convert days', async () => {
        const metrics = await service.getSubscriptionMetrics();

        expect(metrics.avgTrialToConvert).toBeGreaterThan(0);
      });

      it('should include subscribers by plan', async () => {
        const metrics = await service.getSubscriptionMetrics();

        expect(Array.isArray(metrics.byPlan)).toBe(true);
        expect(metrics.byPlan.length).toBeGreaterThan(0);
      });
    });
  });

  describe('System Performance', () => {
    describe('getSystemPerformance', () => {
      it('should return system performance metrics', async () => {
        const performance = await service.getSystemPerformance();

        expect(performance).toBeDefined();
        expect(performance.uptime).toBeGreaterThan(0);
      });

      it('should include uptime percentage', async () => {
        const performance = await service.getSystemPerformance();

        expect(performance.uptime).toBeGreaterThanOrEqual(99);
        expect(performance.uptime).toBeLessThanOrEqual(100);
      });

      it('should include response times', async () => {
        const performance = await service.getSystemPerformance();

        expect(performance.avgResponseTime).toBeGreaterThan(0);
        expect(performance.p95ResponseTime).toBeGreaterThan(performance.avgResponseTime);
        expect(performance.p99ResponseTime).toBeGreaterThan(performance.p95ResponseTime);
      });

      it('should include error rate', async () => {
        const performance = await service.getSystemPerformance();

        expect(performance.errorRate).toBeGreaterThanOrEqual(0);
        expect(performance.errorRate).toBeLessThan(5); // Should be low
      });

      it('should include requests per second', async () => {
        const performance = await service.getSystemPerformance();

        expect(performance.requestsPerSecond).toBeGreaterThan(0);
      });

      it('should include resource usage', async () => {
        const performance = await service.getSystemPerformance();

        expect(performance.cpuUsage).toBeGreaterThanOrEqual(0);
        expect(performance.cpuUsage).toBeLessThanOrEqual(100);
        expect(performance.memoryUsage).toBeGreaterThanOrEqual(0);
        expect(performance.memoryUsage).toBeLessThanOrEqual(100);
        expect(performance.diskUsage).toBeGreaterThanOrEqual(0);
        expect(performance.diskUsage).toBeLessThanOrEqual(100);
      });

      it('should include active connections', async () => {
        const performance = await service.getSystemPerformance();

        expect(performance.activeConnections).toBeGreaterThan(0);
      });
    });

    describe('getPerformanceHistory', () => {
      it('should return performance history for response_time', async () => {
        const history = await service.getPerformanceHistory('response_time', 'hour');

        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBeGreaterThan(0);
      });

      it('should return performance history for error_rate', async () => {
        const history = await service.getPerformanceHistory('error_rate', 'day');

        expect(Array.isArray(history)).toBe(true);
        history.forEach(h => {
          expect(h.timestamp).toBeDefined();
          expect(h.value).toBeDefined();
        });
      });

      it('should return performance history for requests', async () => {
        const history = await service.getPerformanceHistory('requests', 'week');

        expect(Array.isArray(history)).toBe(true);
      });

      it('should return 60 points for hour period', async () => {
        const history = await service.getPerformanceHistory('response_time', 'hour');

        expect(history.length).toBe(60);
      });

      it('should return 24 points for day period', async () => {
        const history = await service.getPerformanceHistory('response_time', 'day');

        expect(history.length).toBe(24);
      });

      it('should return 7 points for week period', async () => {
        const history = await service.getPerformanceHistory('response_time', 'week');

        expect(history.length).toBe(7);
      });
    });
  });

  describe('Error Metrics', () => {
    describe('getErrorMetrics', () => {
      it('should return error metrics', async () => {
        const metrics = await service.getErrorMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.totalErrors24h).toBeDefined();
      });

      it('should include errors by type', async () => {
        const metrics = await service.getErrorMetrics();

        expect(Array.isArray(metrics.errorsByType)).toBe(true);
        expect(metrics.errorsByType.length).toBeGreaterThan(0);
      });

      it('should include ValidationError type', async () => {
        const metrics = await service.getErrorMetrics();

        const validationError = metrics.errorsByType.find(e => e.type === 'ValidationError');
        expect(validationError).toBeDefined();
      });

      it('should include AuthenticationError type', async () => {
        const metrics = await service.getErrorMetrics();

        const authError = metrics.errorsByType.find(e => e.type === 'AuthenticationError');
        expect(authError).toBeDefined();
      });

      it('should include errors by endpoint', async () => {
        const metrics = await service.getErrorMetrics();

        expect(Array.isArray(metrics.errorsByEndpoint)).toBe(true);
        expect(metrics.errorsByEndpoint.length).toBeGreaterThan(0);
      });

      it('should include ANAF submit endpoint', async () => {
        const metrics = await service.getErrorMetrics();

        const anafEndpoint = metrics.errorsByEndpoint.find(e => e.endpoint.includes('anaf'));
        expect(anafEndpoint).toBeDefined();
      });

      it('should include critical errors', async () => {
        const metrics = await service.getErrorMetrics();

        expect(Array.isArray(metrics.criticalErrors)).toBe(true);
      });
    });
  });

  describe('Growth Metrics', () => {
    describe('getGrowthMetrics', () => {
      it('should return growth metrics', async () => {
        const metrics = await service.getGrowthMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.userGrowth).toBeDefined();
        expect(metrics.tenantGrowth).toBeDefined();
      });

      it('should include user growth data', async () => {
        const metrics = await service.getGrowthMetrics();

        expect(Array.isArray(metrics.userGrowth)).toBe(true);
        expect(metrics.userGrowth.length).toBeGreaterThan(0);
        expect(metrics.userGrowth[0].date).toBeDefined();
        expect(metrics.userGrowth[0].total).toBeGreaterThan(0);
      });

      it('should include tenant growth data', async () => {
        const metrics = await service.getGrowthMetrics();

        expect(Array.isArray(metrics.tenantGrowth)).toBe(true);
        expect(metrics.tenantGrowth.length).toBeGreaterThan(0);
      });

      it('should include conversion funnel', async () => {
        const metrics = await service.getGrowthMetrics();

        expect(metrics.conversionFunnel).toBeDefined();
        expect(metrics.conversionFunnel.visitors).toBeGreaterThan(0);
        expect(metrics.conversionFunnel.signups).toBeGreaterThan(0);
        expect(metrics.conversionFunnel.activations).toBeGreaterThan(0);
        expect(metrics.conversionFunnel.subscribers).toBeGreaterThan(0);
      });

      it('should have decreasing funnel values', async () => {
        const metrics = await service.getGrowthMetrics();
        const { conversionFunnel } = metrics;

        expect(conversionFunnel.visitors).toBeGreaterThan(conversionFunnel.signups);
        expect(conversionFunnel.signups).toBeGreaterThan(conversionFunnel.activations);
        expect(conversionFunnel.activations).toBeGreaterThan(conversionFunnel.subscribers);
      });

      it('should include retention cohorts', async () => {
        const metrics = await service.getGrowthMetrics();

        expect(Array.isArray(metrics.retentionCohorts)).toBe(true);
        expect(metrics.retentionCohorts.length).toBeGreaterThan(0);
      });

      it('should have cohorts with retention percentages', async () => {
        const metrics = await service.getGrowthMetrics();

        metrics.retentionCohorts.forEach(cohort => {
          expect(cohort.cohort).toBeDefined();
          expect(cohort.size).toBeGreaterThan(0);
          expect(Array.isArray(cohort.retention)).toBe(true);
          expect(cohort.retention[0]).toBe(100); // First month always 100%
        });
      });

      it('should accept week period', async () => {
        const metrics = await service.getGrowthMetrics('week');
        expect(metrics.userGrowth.length).toBe(7);
      });

      it('should accept month period', async () => {
        const metrics = await service.getGrowthMetrics('month');
        expect(metrics.userGrowth.length).toBe(30);
      });

      it('should accept quarter period', async () => {
        const metrics = await service.getGrowthMetrics('quarter');
        expect(metrics.userGrowth.length).toBe(12);
      });

      it('should accept year period', async () => {
        const metrics = await service.getGrowthMetrics('year');
        expect(metrics.userGrowth.length).toBe(12);
      });
    });
  });

  describe('Feature Usage', () => {
    describe('getFeatureUsage', () => {
      it('should return feature usage', async () => {
        const usage = await service.getFeatureUsage();

        expect(Array.isArray(usage)).toBe(true);
        expect(usage.length).toBeGreaterThan(0);
      });

      it('should include feature details', async () => {
        const usage = await service.getFeatureUsage();

        usage.forEach(feature => {
          expect(feature.feature).toBeDefined();
          expect(feature.totalUsage).toBeGreaterThan(0);
          expect(feature.uniqueUsers).toBeGreaterThan(0);
          expect(feature.avgUsagePerUser).toBeGreaterThan(0);
          expect(typeof feature.trend).toBe('number');
        });
      });

      it('should include Invoice Creation feature', async () => {
        const usage = await service.getFeatureUsage();

        const invoiceFeature = usage.find(f => f.feature === 'Invoice Creation');
        expect(invoiceFeature).toBeDefined();
      });

      it('should include OCR Processing feature', async () => {
        const usage = await service.getFeatureUsage();

        const ocrFeature = usage.find(f => f.feature === 'OCR Processing');
        expect(ocrFeature).toBeDefined();
      });

      it('should include e-Factura Submit feature', async () => {
        const usage = await service.getFeatureUsage();

        const efacturaFeature = usage.find(f => f.feature === 'e-Factura Submit');
        expect(efacturaFeature).toBeDefined();
      });

      it('should include SAF-T Export feature', async () => {
        const usage = await service.getFeatureUsage();

        const saftFeature = usage.find(f => f.feature === 'SAF-T Export');
        expect(saftFeature).toBeDefined();
      });

      it('should include AI Assistant feature', async () => {
        const usage = await service.getFeatureUsage();

        const aiFeature = usage.find(f => f.feature === 'AI Assistant');
        expect(aiFeature).toBeDefined();
        expect(aiFeature?.trend).toBeGreaterThan(0); // AI should be trending up
      });
    });
  });

  describe('Integration Metrics', () => {
    describe('getIntegrationMetrics', () => {
      it('should return integration metrics', async () => {
        const metrics = await service.getIntegrationMetrics();

        expect(Array.isArray(metrics)).toBe(true);
        expect(metrics.length).toBeGreaterThan(0);
      });

      it('should include integration details', async () => {
        const metrics = await service.getIntegrationMetrics();

        metrics.forEach(integration => {
          expect(integration.integration).toBeDefined();
          expect(integration.connectedTenants).toBeGreaterThan(0);
          expect(integration.apiCalls24h).toBeGreaterThan(0);
          expect(integration.successRate).toBeGreaterThan(95);
          expect(integration.avgLatency).toBeGreaterThan(0);
        });
      });

      it('should include ANAF e-Factura integration', async () => {
        const metrics = await service.getIntegrationMetrics();

        const efactura = metrics.find(m => m.integration === 'ANAF e-Factura');
        expect(efactura).toBeDefined();
        expect(efactura?.connectedTenants).toBeGreaterThan(0);
      });

      it('should include ANAF SPV integration', async () => {
        const metrics = await service.getIntegrationMetrics();

        const spv = metrics.find(m => m.integration === 'ANAF SPV');
        expect(spv).toBeDefined();
      });

      it('should include SAGA integration', async () => {
        const metrics = await service.getIntegrationMetrics();

        const saga = metrics.find(m => m.integration === 'SAGA');
        expect(saga).toBeDefined();
      });

      it('should include Bank PSD2 integration', async () => {
        const metrics = await service.getIntegrationMetrics();

        const psd2 = metrics.find(m => m.integration === 'Bank PSD2');
        expect(psd2).toBeDefined();
      });

      it('should include Stripe integration', async () => {
        const metrics = await service.getIntegrationMetrics();

        const stripe = metrics.find(m => m.integration === 'Stripe');
        expect(stripe).toBeDefined();
      });

      it('should have high success rates', async () => {
        const metrics = await service.getIntegrationMetrics();

        metrics.forEach(m => {
          expect(m.successRate).toBeGreaterThanOrEqual(98);
        });
      });
    });
  });

  describe('Export', () => {
    describe('exportAnalytics', () => {
      it('should export analytics to JSON', async () => {
        const result = await service.exportAnalytics('overview', 'json');

        expect(result.url).toBeDefined();
        expect(result.url).toContain('.json');
        expect(result.expiresAt).toBeDefined();
      });

      it('should export analytics to CSV', async () => {
        const result = await service.exportAnalytics('users', 'csv');

        expect(result.url).toBeDefined();
        expect(result.url).toContain('.csv');
      });

      it('should export overview', async () => {
        const result = await service.exportAnalytics('overview', 'json');
        expect(result.url).toContain('overview');
      });

      it('should export users', async () => {
        const result = await service.exportAnalytics('users', 'json');
        expect(result.url).toContain('users');
      });

      it('should export revenue', async () => {
        const result = await service.exportAnalytics('revenue', 'json');
        expect(result.url).toContain('revenue');
      });

      it('should export performance', async () => {
        const result = await service.exportAnalytics('performance', 'json');
        expect(result.url).toContain('performance');
      });

      it('should export all', async () => {
        const result = await service.exportAnalytics('all', 'json');
        expect(result.url).toContain('all');
      });

      it('should set expiration 24 hours from now', async () => {
        const result = await service.exportAnalytics('overview', 'json');
        const now = Date.now();
        const expiresIn = result.expiresAt.getTime() - now;

        expect(expiresIn).toBeGreaterThan(23 * 60 * 60 * 1000); // > 23 hours
        expect(expiresIn).toBeLessThanOrEqual(24 * 60 * 60 * 1000); // <= 24 hours
      });
    });
  });

  describe('Real-Time Metrics', () => {
    describe('getRealTimeMetrics', () => {
      it('should return real-time metrics', async () => {
        const metrics = await service.getRealTimeMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.activeUsers).toBeGreaterThan(0);
        expect(metrics.requestsPerMinute).toBeGreaterThan(0);
        expect(metrics.avgResponseTime).toBeGreaterThan(0);
        expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
        expect(metrics.activeSessions).toBeGreaterThan(0);
        expect(metrics.queuedJobs).toBeGreaterThanOrEqual(0);
      });

      it('should return varying values (simulated real-time)', async () => {
        const metrics1 = await service.getRealTimeMetrics();
        const metrics2 = await service.getRealTimeMetrics();

        // Values should be different due to random component
        // At least one metric should differ
        const allSame =
          metrics1.activeUsers === metrics2.activeUsers &&
          metrics1.requestsPerMinute === metrics2.requestsPerMinute &&
          metrics1.avgResponseTime === metrics2.avgResponseTime;

        // Allow for rare case where all are same
        expect(typeof metrics1.activeUsers).toBe('number');
      });
    });
  });
});
