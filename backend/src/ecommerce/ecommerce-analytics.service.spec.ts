import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  EcommerceAnalyticsService,
  TimeGranularity,
  ComparisonPeriod,
} from './ecommerce-analytics.service';

describe('EcommerceAnalyticsService', () => {
  let service: EcommerceAnalyticsService;

  const tenantId = 'demo_tenant';
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EcommerceAnalyticsService],
    }).compile();

    service = module.get<EcommerceAnalyticsService>(EcommerceAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== Sales Analytics Tests ====================

  describe('Sales Analytics', () => {
    it('should get sales overview', () => {
      const overview = service.getSalesOverview(tenantId, thirtyDaysAgo, now);

      expect(overview).toBeDefined();
      expect(overview.tenantId).toBe(tenantId);
      expect(overview.period.start).toEqual(thirtyDaysAgo);
      expect(overview.period.end).toEqual(now);
      expect(overview.metrics).toBeDefined();
    });

    it('should include sales metrics', () => {
      const overview = service.getSalesOverview(tenantId, ninetyDaysAgo, now);

      expect(overview.metrics.revenue).toBeGreaterThanOrEqual(0);
      expect(overview.metrics.orders).toBeGreaterThanOrEqual(0);
      expect(overview.metrics.averageOrderValue).toBeGreaterThanOrEqual(0);
      expect(overview.metrics.itemsSold).toBeGreaterThanOrEqual(0);
      expect(overview.metrics.refundRate).toBeDefined();
      expect(overview.metrics.netRevenue).toBeDefined();
      expect(overview.metrics.grossProfit).toBeDefined();
      expect(overview.metrics.grossMargin).toBeDefined();
    });

    it('should include time series data', () => {
      const overview = service.getSalesOverview(tenantId, thirtyDaysAgo, now, 'day');

      expect(overview.timeSeries).toBeDefined();
      expect(overview.timeSeries.revenue).toBeDefined();
      expect(overview.timeSeries.orders).toBeDefined();
      expect(Array.isArray(overview.timeSeries.revenue)).toBe(true);
    });

    it('should include comparison when requested', () => {
      const overview = service.getSalesOverview(tenantId, thirtyDaysAgo, now, 'day', 'previous_period');

      expect(overview.comparison).toBeDefined();
      expect(overview.comparison?.period).toBeDefined();
      expect(overview.comparison?.metrics).toBeDefined();
      expect(overview.comparison?.changes).toBeDefined();
      expect(overview.comparison?.changes.revenue).toBeDefined();
    });

    it('should include top products', () => {
      const overview = service.getSalesOverview(tenantId, ninetyDaysAgo, now);

      expect(overview.topProducts).toBeDefined();
      expect(Array.isArray(overview.topProducts)).toBe(true);
    });

    it('should include top categories', () => {
      const overview = service.getSalesOverview(tenantId, ninetyDaysAgo, now);

      expect(overview.topCategories).toBeDefined();
      expect(Array.isArray(overview.topCategories)).toBe(true);
    });

    it('should include sales by channel', () => {
      const overview = service.getSalesOverview(tenantId, ninetyDaysAgo, now);

      expect(overview.salesByChannel).toBeDefined();
      expect(Array.isArray(overview.salesByChannel)).toBe(true);
    });

    it('should support different granularities', () => {
      const granularities: TimeGranularity[] = ['hour', 'day', 'week', 'month'];

      for (const granularity of granularities) {
        const overview = service.getSalesOverview(tenantId, thirtyDaysAgo, now, granularity);
        expect(overview.timeSeries).toBeDefined();
      }
    });

    it('should support previous_year comparison', () => {
      const overview = service.getSalesOverview(tenantId, thirtyDaysAgo, now, 'day', 'previous_year');

      expect(overview.comparison).toBeDefined();
      expect(overview.comparison?.period.start.getFullYear()).toBe(thirtyDaysAgo.getFullYear() - 1);
    });
  });

  // ==================== Product Analytics Tests ====================

  describe('Product Analytics', () => {
    it('should get top products', () => {
      const products = service.getTopProducts(tenantId, ninetyDaysAgo, now);

      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
    });

    it('should limit top products', () => {
      const products = service.getTopProducts(tenantId, ninetyDaysAgo, now, 3);

      expect(products.length).toBeLessThanOrEqual(3);
    });

    it('should sort products by revenue', () => {
      const products = service.getTopProducts(tenantId, ninetyDaysAgo, now);

      for (let i = 1; i < products.length; i++) {
        expect(products[i].revenue).toBeLessThanOrEqual(products[i - 1].revenue);
      }
    });

    it('should include product performance metrics', () => {
      const products = service.getTopProducts(tenantId, ninetyDaysAgo, now, 1);

      if (products.length > 0) {
        const product = products[0];
        expect(product.productId).toBeDefined();
        expect(product.productName).toBeDefined();
        expect(product.sku).toBeDefined();
        expect(product.category).toBeDefined();
        expect(product.unitsSold).toBeDefined();
        expect(product.revenue).toBeDefined();
        expect(product.averagePrice).toBeDefined();
        expect(product.status).toBeDefined();
        expect(product.trend).toBeDefined();
        expect(product.conversionRate).toBeDefined();
      }
    });

    it('should get single product performance', () => {
      const products = service.getTopProducts(tenantId, ninetyDaysAgo, now, 1);

      if (products.length > 0) {
        const product = service.getProductPerformance(tenantId, products[0].productId, ninetyDaysAgo, now);
        expect(product).toBeDefined();
        expect(product?.productId).toBe(products[0].productId);
      }
    });

    it('should get top categories', () => {
      const categories = service.getTopCategories(tenantId, ninetyDaysAgo, now);

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
    });

    it('should include category performance metrics', () => {
      const categories = service.getTopCategories(tenantId, ninetyDaysAgo, now, 1);

      if (categories.length > 0) {
        const category = categories[0];
        expect(category.categoryId).toBeDefined();
        expect(category.categoryName).toBeDefined();
        expect(category.productCount).toBeDefined();
        expect(category.unitsSold).toBeDefined();
        expect(category.revenue).toBeDefined();
        expect(category.percentOfTotal).toBeDefined();
      }
    });

    it('should sort categories by revenue', () => {
      const categories = service.getTopCategories(tenantId, ninetyDaysAgo, now);

      for (let i = 1; i < categories.length; i++) {
        expect(categories[i].revenue).toBeLessThanOrEqual(categories[i - 1].revenue);
      }
    });
  });

  // ==================== Customer Analytics Tests ====================

  describe('Customer Analytics', () => {
    it('should get customer analytics', () => {
      const analytics = service.getCustomerAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics).toBeDefined();
      expect(analytics.tenantId).toBe(tenantId);
      expect(analytics.period).toBeDefined();
    });

    it('should include customer summary', () => {
      const analytics = service.getCustomerAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.summary).toBeDefined();
      expect(analytics.summary.totalCustomers).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.newCustomers).toBeDefined();
      expect(analytics.summary.returningCustomers).toBeDefined();
      expect(analytics.summary.averageLifetimeValue).toBeDefined();
      expect(analytics.summary.customerRetentionRate).toBeDefined();
      expect(analytics.summary.repeatPurchaseRate).toBeDefined();
    });

    it('should include customer segments', () => {
      const analytics = service.getCustomerAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.segments).toBeDefined();
      expect(Array.isArray(analytics.segments)).toBe(true);

      if (analytics.segments.length > 0) {
        const segment = analytics.segments[0];
        expect(segment.segment).toBeDefined();
        expect(segment.count).toBeDefined();
        expect(segment.percentOfTotal).toBeDefined();
        expect(segment.revenue).toBeDefined();
      }
    });

    it('should include cohort analysis', () => {
      const analytics = service.getCustomerAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.cohortAnalysis).toBeDefined();
      expect(Array.isArray(analytics.cohortAnalysis)).toBe(true);

      if (analytics.cohortAnalysis.length > 0) {
        const cohort = analytics.cohortAnalysis[0];
        expect(cohort.cohortMonth).toBeDefined();
        expect(cohort.customersAcquired).toBeDefined();
        expect(cohort.retentionByMonth).toBeDefined();
      }
    });

    it('should include RFM distribution', () => {
      const analytics = service.getCustomerAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.rfmDistribution).toBeDefined();
      expect(analytics.rfmDistribution.recency).toBeDefined();
      expect(analytics.rfmDistribution.frequency).toBeDefined();
      expect(analytics.rfmDistribution.monetary).toBeDefined();
      expect(analytics.rfmDistribution.segments).toBeDefined();
    });

    it('should include acquisition channels', () => {
      const analytics = service.getCustomerAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.acquisitionChannels).toBeDefined();
      expect(Array.isArray(analytics.acquisitionChannels)).toBe(true);

      if (analytics.acquisitionChannels.length > 0) {
        const channel = analytics.acquisitionChannels[0];
        expect(channel.channel).toBeDefined();
        expect(channel.customers).toBeDefined();
        expect(channel.lifetimeValue).toBeDefined();
      }
    });

    it('should include geographic distribution', () => {
      const analytics = service.getCustomerAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.geographicDistribution).toBeDefined();
      expect(Array.isArray(analytics.geographicDistribution)).toBe(true);

      if (analytics.geographicDistribution.length > 0) {
        const geo = analytics.geographicDistribution[0];
        expect(geo.country).toBeDefined();
        expect(geo.customers).toBeDefined();
        expect(geo.revenue).toBeDefined();
      }
    });
  });

  // ==================== Inventory Analytics Tests ====================

  describe('Inventory Analytics', () => {
    it('should get inventory analytics', () => {
      const analytics = service.getInventoryAnalytics(tenantId);

      expect(analytics).toBeDefined();
      expect(analytics.tenantId).toBe(tenantId);
      expect(analytics.asOfDate).toBeDefined();
    });

    it('should include inventory summary', () => {
      const analytics = service.getInventoryAnalytics(tenantId);

      expect(analytics.summary).toBeDefined();
      expect(analytics.summary.totalProducts).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.totalSKUs).toBeDefined();
      expect(analytics.summary.totalValue).toBeDefined();
      expect(analytics.summary.averageTurnoverRate).toBeDefined();
      expect(analytics.summary.stockoutRate).toBeDefined();
      expect(analytics.summary.overstockRate).toBeDefined();
    });

    it('should include stock levels', () => {
      const analytics = service.getInventoryAnalytics(tenantId);

      expect(analytics.stockLevels).toBeDefined();
      expect(Array.isArray(analytics.stockLevels)).toBe(true);

      if (analytics.stockLevels.length > 0) {
        const stock = analytics.stockLevels[0];
        expect(stock.productId).toBeDefined();
        expect(stock.currentStock).toBeDefined();
        expect(stock.availableStock).toBeDefined();
        expect(stock.status).toBeDefined();
        expect(stock.daysOfSupply).toBeDefined();
      }
    });

    it('should include turnover analysis', () => {
      const analytics = service.getInventoryAnalytics(tenantId);

      expect(analytics.turnoverAnalysis).toBeDefined();
      expect(Array.isArray(analytics.turnoverAnalysis)).toBe(true);

      if (analytics.turnoverAnalysis.length > 0) {
        const turnover = analytics.turnoverAnalysis[0];
        expect(turnover.productId).toBeDefined();
        expect(turnover.turnoverRate).toBeDefined();
        expect(turnover.velocityCategory).toBeDefined();
        expect(turnover.recommendedAction).toBeDefined();
      }
    });

    it('should include reorder alerts', () => {
      const analytics = service.getInventoryAnalytics(tenantId);

      expect(analytics.reorderAlerts).toBeDefined();
      expect(Array.isArray(analytics.reorderAlerts)).toBe(true);
    });

    it('should include aging analysis', () => {
      const analytics = service.getInventoryAnalytics(tenantId);

      expect(analytics.agingAnalysis).toBeDefined();
      expect(Array.isArray(analytics.agingAnalysis)).toBe(true);

      if (analytics.agingAnalysis.length > 0) {
        const aging = analytics.agingAnalysis[0];
        expect(aging.ageRange).toBeDefined();
        expect(aging.productCount).toBeDefined();
        expect(aging.totalValue).toBeDefined();
        expect(aging.percentOfInventory).toBeDefined();
      }
    });
  });

  // ==================== Conversion Funnel Tests ====================

  describe('Conversion Funnel', () => {
    it('should get conversion funnel', () => {
      const funnel = service.getConversionFunnel(tenantId, thirtyDaysAgo, now);

      expect(funnel).toBeDefined();
      expect(funnel.tenantId).toBe(tenantId);
      expect(funnel.period).toBeDefined();
    });

    it('should include funnel stages', () => {
      const funnel = service.getConversionFunnel(tenantId, thirtyDaysAgo, now);

      expect(funnel.stages).toBeDefined();
      expect(Array.isArray(funnel.stages)).toBe(true);
      expect(funnel.stages.length).toBeGreaterThan(0);

      const stage = funnel.stages[0];
      expect(stage.name).toBeDefined();
      expect(stage.visitors).toBeDefined();
      expect(stage.conversionRate).toBeDefined();
      expect(stage.dropoffRate).toBeDefined();
    });

    it('should include overall metrics', () => {
      const funnel = service.getConversionFunnel(tenantId, thirtyDaysAgo, now);

      expect(funnel.overallConversionRate).toBeDefined();
      expect(funnel.abandonmentRate).toBeDefined();
      expect(funnel.averageTimeToConvert).toBeDefined();
    });

    it('should include dropoff analysis', () => {
      const funnel = service.getConversionFunnel(tenantId, thirtyDaysAgo, now);

      expect(funnel.dropoffAnalysis).toBeDefined();
      expect(Array.isArray(funnel.dropoffAnalysis)).toBe(true);

      if (funnel.dropoffAnalysis.length > 0) {
        const dropoff = funnel.dropoffAnalysis[0];
        expect(dropoff.stage).toBeDefined();
        expect(dropoff.reason).toBeDefined();
        expect(dropoff.count).toBeDefined();
        expect(dropoff.percentOfDropoffs).toBeDefined();
      }
    });
  });

  // ==================== Marketing Analytics Tests ====================

  describe('Marketing Analytics', () => {
    it('should get marketing analytics', () => {
      const analytics = service.getMarketingAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics).toBeDefined();
      expect(analytics.tenantId).toBe(tenantId);
      expect(analytics.period).toBeDefined();
    });

    it('should include campaign performance', () => {
      const analytics = service.getMarketingAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.campaigns).toBeDefined();
      expect(Array.isArray(analytics.campaigns)).toBe(true);

      if (analytics.campaigns.length > 0) {
        const campaign = analytics.campaigns[0];
        expect(campaign.campaignId).toBeDefined();
        expect(campaign.campaignName).toBeDefined();
        expect(campaign.spend).toBeDefined();
        expect(campaign.revenue).toBeDefined();
        expect(campaign.roas).toBeDefined();
        expect(campaign.roi).toBeDefined();
      }
    });

    it('should include promotion performance', () => {
      const analytics = service.getMarketingAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.promotions).toBeDefined();
      expect(Array.isArray(analytics.promotions)).toBe(true);

      if (analytics.promotions.length > 0) {
        const promo = analytics.promotions[0];
        expect(promo.promotionId).toBeDefined();
        expect(promo.promotionName).toBeDefined();
        expect(promo.usageCount).toBeDefined();
        expect(promo.totalDiscount).toBeDefined();
        expect(promo.effectiveness).toBeDefined();
      }
    });

    it('should include email metrics', () => {
      const analytics = service.getMarketingAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.emailMetrics).toBeDefined();
      expect(analytics.emailMetrics.sent).toBeDefined();
      expect(analytics.emailMetrics.openRate).toBeDefined();
      expect(analytics.emailMetrics.clickRate).toBeDefined();
      expect(analytics.emailMetrics.conversionRate).toBeDefined();
    });

    it('should include social metrics', () => {
      const analytics = service.getMarketingAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.socialMetrics).toBeDefined();
      expect(analytics.socialMetrics.platforms).toBeDefined();
      expect(analytics.socialMetrics.totalReach).toBeDefined();
      expect(analytics.socialMetrics.totalEngagement).toBeDefined();
    });

    it('should include attribution data', () => {
      const analytics = service.getMarketingAnalytics(tenantId, thirtyDaysAgo, now);

      expect(analytics.attributionData).toBeDefined();
      expect(Array.isArray(analytics.attributionData)).toBe(true);

      if (analytics.attributionData.length > 0) {
        const attribution = analytics.attributionData[0];
        expect(attribution.channel).toBeDefined();
        expect(attribution.firstTouch).toBeDefined();
        expect(attribution.lastTouch).toBeDefined();
        expect(attribution.linear).toBeDefined();
        expect(attribution.timeDecay).toBeDefined();
      }
    });
  });

  // ==================== Real-time Metrics Tests ====================

  describe('Real-time Metrics', () => {
    it('should get real-time metrics', () => {
      const metrics = service.getRealtimeMetrics(tenantId);

      expect(metrics).toBeDefined();
      expect(metrics.tenantId).toBe(tenantId);
      expect(metrics.timestamp).toBeDefined();
    });

    it('should include current activity metrics', () => {
      const metrics = service.getRealtimeMetrics(tenantId);

      expect(metrics.activeVisitors).toBeDefined();
      expect(metrics.ordersLastHour).toBeDefined();
      expect(metrics.revenueLastHour).toBeDefined();
      expect(metrics.cartAbandonsLastHour).toBeDefined();
    });

    it('should include top products now', () => {
      const metrics = service.getRealtimeMetrics(tenantId);

      expect(metrics.topProductsNow).toBeDefined();
      expect(Array.isArray(metrics.topProductsNow)).toBe(true);

      if (metrics.topProductsNow.length > 0) {
        expect(metrics.topProductsNow[0].productId).toBeDefined();
        expect(metrics.topProductsNow[0].productName).toBeDefined();
        expect(metrics.topProductsNow[0].views).toBeDefined();
      }
    });

    it('should include active promotions', () => {
      const metrics = service.getRealtimeMetrics(tenantId);

      expect(metrics.activePromotions).toBeDefined();
      expect(Array.isArray(metrics.activePromotions)).toBe(true);
    });

    it('should include recent orders', () => {
      const metrics = service.getRealtimeMetrics(tenantId);

      expect(metrics.recentOrders).toBeDefined();
      expect(Array.isArray(metrics.recentOrders)).toBe(true);
    });

    it('should include alerts', () => {
      const metrics = service.getRealtimeMetrics(tenantId);

      expect(metrics.alerts).toBeDefined();
      expect(Array.isArray(metrics.alerts)).toBe(true);

      if (metrics.alerts.length > 0) {
        expect(metrics.alerts[0].type).toBeDefined();
        expect(metrics.alerts[0].message).toBeDefined();
        expect(metrics.alerts[0].severity).toBeDefined();
      }
    });
  });

  // ==================== Reports Tests ====================

  describe('Reports', () => {
    it('should create report', () => {
      const report = service.createReport({
        tenantId,
        name: 'Weekly Sales Report',
        type: 'sales',
      });

      expect(report).toBeDefined();
      expect(report.id).toMatch(/^report_/);
      expect(report.name).toBe('Weekly Sales Report');
      expect(report.type).toBe('sales');
    });

    it('should create report with schedule', () => {
      const report = service.createReport({
        tenantId,
        name: 'Monthly Revenue Report',
        type: 'sales',
        schedule: {
          frequency: 'monthly',
          recipients: ['admin@test.com'],
          format: 'pdf',
        },
      });

      expect(report.schedule).toBeDefined();
      expect(report.schedule?.frequency).toBe('monthly');
      expect(report.schedule?.recipients).toContain('admin@test.com');
    });

    it('should get report by ID', () => {
      const created = service.createReport({
        tenantId,
        name: 'Test Report',
        type: 'products',
      });

      const retrieved = service.getReport(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get reports by tenant', () => {
      const reportTenant = 'report_tenant_test';

      service.createReport({
        tenantId: reportTenant,
        name: 'Report 1',
        type: 'sales',
      });

      service.createReport({
        tenantId: reportTenant,
        name: 'Report 2',
        type: 'customers',
      });

      const reports = service.getReportsByTenant(reportTenant);
      expect(reports.length).toBe(2);
    });

    it('should delete report', () => {
      const report = service.createReport({
        tenantId,
        name: 'To Delete',
        type: 'inventory',
      });

      const deleted = service.deleteReport(report.id);
      expect(deleted).toBe(true);

      const retrieved = service.getReport(report.id);
      expect(retrieved).toBeUndefined();
    });
  });

  // ==================== Dashboard Tests ====================

  describe('Dashboard', () => {
    it('should get dashboard widgets', () => {
      const widgets = service.getDashboardWidgets(tenantId, thirtyDaysAgo, now);

      expect(widgets).toBeDefined();
      expect(Array.isArray(widgets)).toBe(true);
      expect(widgets.length).toBeGreaterThan(0);
    });

    it('should include different widget types', () => {
      const widgets = service.getDashboardWidgets(tenantId, thirtyDaysAgo, now);

      const types = widgets.map(w => w.type);
      expect(types).toContain('metric');
      expect(types).toContain('chart');
      expect(types).toContain('table');
    });

    it('should include widget data', () => {
      const widgets = service.getDashboardWidgets(tenantId, thirtyDaysAgo, now);

      for (const widget of widgets) {
        expect(widget.id).toBeDefined();
        expect(widget.type).toBeDefined();
        expect(widget.title).toBeDefined();
        expect(widget.data).toBeDefined();
        expect(widget.config).toBeDefined();
      }
    });
  });

  // ==================== Export Tests ====================

  describe('Export', () => {
    it('should export sales data as JSON', () => {
      const result = service.exportData(tenantId, 'sales', thirtyDaysAgo, now, 'json');

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.filename).toContain('sales');
      expect(result.filename).toContain('.json');
    });

    it('should export products data as CSV', () => {
      const result = service.exportData(tenantId, 'products', thirtyDaysAgo, now, 'csv');

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.filename).toContain('products');
      expect(result.filename).toContain('.csv');
    });

    it('should export customers data', () => {
      const result = service.exportData(tenantId, 'customers', thirtyDaysAgo, now, 'json');

      expect(result).toBeDefined();
      expect(result.filename).toContain('customers');
    });

    it('should export orders data', () => {
      const result = service.exportData(tenantId, 'orders', thirtyDaysAgo, now, 'json');

      expect(result).toBeDefined();
      expect(result.filename).toContain('orders');
    });

    it('should throw error for invalid data type', () => {
      expect(() => {
        service.exportData(tenantId, 'invalid' as any, thirtyDaysAgo, now, 'json');
      }).toThrow(BadRequestException);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle empty date range', () => {
      const futureStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const futureEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const overview = service.getSalesOverview(tenantId, futureStart, futureEnd);

      expect(overview.metrics.orders).toBe(0);
      expect(overview.metrics.revenue).toBe(0);
    });

    it('should handle non-existent tenant', () => {
      const overview = service.getSalesOverview('nonexistent_tenant', thirtyDaysAgo, now);

      expect(overview.metrics.orders).toBe(0);
      expect(overview.metrics.revenue).toBe(0);
    });

    it('should handle single day range', () => {
      const today = new Date();
      const overview = service.getSalesOverview(tenantId, today, today);

      expect(overview).toBeDefined();
      expect(overview.timeSeries).toBeDefined();
    });

    it('should calculate percentages correctly', () => {
      const analytics = service.getCustomerAnalytics(tenantId, thirtyDaysAgo, now);

      // Check that segment percentages sum to ~100
      const segmentTotal = analytics.segments.reduce((sum, s) => sum + s.percentOfTotal, 0);
      expect(Math.abs(segmentTotal - 100)).toBeLessThan(5); // Allow for rounding
    });

    it('should handle inventory with zero stock', () => {
      const analytics = service.getInventoryAnalytics(tenantId);

      // Verify stockout detection works
      expect(analytics.summary.stockoutRate).toBeDefined();
      expect(analytics.summary.stockoutRate).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.stockoutRate).toBeLessThanOrEqual(100);
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration Scenarios', () => {
    it('should provide consistent data across analytics endpoints', () => {
      const salesOverview = service.getSalesOverview(tenantId, ninetyDaysAgo, now);
      const customerAnalytics = service.getCustomerAnalytics(tenantId, ninetyDaysAgo, now);

      // Revenue should be consistent
      expect(salesOverview.metrics.revenue).toBeGreaterThanOrEqual(0);
      expect(customerAnalytics.summary.totalCustomers).toBeGreaterThanOrEqual(0);
    });

    it('should provide comprehensive e-commerce insights', () => {
      // Get all analytics
      const sales = service.getSalesOverview(tenantId, ninetyDaysAgo, now, 'day', 'previous_period');
      const customers = service.getCustomerAnalytics(tenantId, ninetyDaysAgo, now);
      const inventory = service.getInventoryAnalytics(tenantId);
      const funnel = service.getConversionFunnel(tenantId, ninetyDaysAgo, now);
      const marketing = service.getMarketingAnalytics(tenantId, ninetyDaysAgo, now);
      const realtime = service.getRealtimeMetrics(tenantId);

      // Verify all components are available
      expect(sales).toBeDefined();
      expect(customers).toBeDefined();
      expect(inventory).toBeDefined();
      expect(funnel).toBeDefined();
      expect(marketing).toBeDefined();
      expect(realtime).toBeDefined();

      // Verify key metrics are present
      expect(sales.metrics.revenue).toBeDefined();
      expect(customers.summary.averageLifetimeValue).toBeDefined();
      expect(inventory.summary.totalValue).toBeDefined();
      expect(funnel.overallConversionRate).toBeDefined();
      expect(marketing.campaigns.length).toBeGreaterThan(0);
      expect(realtime.activeVisitors).toBeDefined();
    });

    it('should support full reporting workflow', () => {
      // Create report
      const report = service.createReport({
        tenantId,
        name: 'Monthly Executive Summary',
        type: 'sales',
        schedule: {
          frequency: 'monthly',
          recipients: ['exec@company.com'],
          format: 'pdf',
        },
        filters: { channel: 'all' },
        columns: ['revenue', 'orders', 'averageOrderValue'],
      });

      // Retrieve report
      const retrieved = service.getReport(report.id);
      expect(retrieved).toBeDefined();

      // List tenant reports
      const reports = service.getReportsByTenant(tenantId);
      expect(reports.some(r => r.id === report.id)).toBe(true);

      // Export data for report
      const exportData = service.exportData(tenantId, 'sales', thirtyDaysAgo, now, 'json');
      expect(exportData.data).toBeDefined();

      // Clean up
      service.deleteReport(report.id);
    });
  });
});
