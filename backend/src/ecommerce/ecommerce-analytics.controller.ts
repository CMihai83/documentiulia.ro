import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  EcommerceAnalyticsService,
  TimeGranularity,
  ComparisonPeriod,
  SalesOverview,
  ProductPerformance,
  CategoryPerformance,
  CustomerAnalytics,
  InventoryAnalytics,
  ConversionFunnel,
  MarketingAnalytics,
  RealtimeMetrics,
  DashboardWidget,
  ReportConfig,
} from './ecommerce-analytics.service';

@Controller('ecommerce-analytics')
export class EcommerceAnalyticsController {
  constructor(private readonly analyticsService: EcommerceAnalyticsService) {}

  // ==================== Sales Analytics ====================

  @Get('sales/:tenantId')
  getSalesOverview(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('granularity') granularity?: TimeGranularity,
    @Query('comparison') comparison?: ComparisonPeriod,
  ): SalesOverview {
    return this.analyticsService.getSalesOverview(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      granularity,
      comparison,
    );
  }

  // ==================== Product Analytics ====================

  @Get('products/:tenantId/top')
  getTopProducts(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ): ProductPerformance[] {
    return this.analyticsService.getTopProducts(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('products/:tenantId/:productId')
  getProductPerformance(
    @Param('tenantId') tenantId: string,
    @Param('productId') productId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): ProductPerformance | undefined {
    return this.analyticsService.getProductPerformance(
      tenantId,
      productId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('categories/:tenantId/top')
  getTopCategories(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
  ): CategoryPerformance[] {
    return this.analyticsService.getTopCategories(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // ==================== Customer Analytics ====================

  @Get('customers/:tenantId')
  getCustomerAnalytics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): CustomerAnalytics {
    return this.analyticsService.getCustomerAnalytics(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ==================== Inventory Analytics ====================

  @Get('inventory/:tenantId')
  getInventoryAnalytics(@Param('tenantId') tenantId: string): InventoryAnalytics {
    return this.analyticsService.getInventoryAnalytics(tenantId);
  }

  // ==================== Conversion Funnel ====================

  @Get('funnel/:tenantId')
  getConversionFunnel(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): ConversionFunnel {
    return this.analyticsService.getConversionFunnel(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ==================== Marketing Analytics ====================

  @Get('marketing/:tenantId')
  getMarketingAnalytics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): MarketingAnalytics {
    return this.analyticsService.getMarketingAnalytics(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ==================== Real-time Metrics ====================

  @Get('realtime/:tenantId')
  getRealtimeMetrics(@Param('tenantId') tenantId: string): RealtimeMetrics {
    return this.analyticsService.getRealtimeMetrics(tenantId);
  }

  // ==================== Dashboard ====================

  @Get('dashboard/:tenantId')
  getDashboardWidgets(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): DashboardWidget[] {
    return this.analyticsService.getDashboardWidgets(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  // ==================== Reports ====================

  @Post('reports')
  createReport(
    @Body() body: {
      tenantId: string;
      name: string;
      type: ReportConfig['type'];
      schedule?: ReportConfig['schedule'];
      filters?: Record<string, any>;
      columns?: string[];
    },
  ): ReportConfig {
    return this.analyticsService.createReport(body);
  }

  @Get('reports/:reportId')
  getReport(@Param('reportId') reportId: string): ReportConfig | undefined {
    return this.analyticsService.getReport(reportId);
  }

  @Get('reports/tenant/:tenantId')
  getReportsByTenant(@Param('tenantId') tenantId: string): ReportConfig[] {
    return this.analyticsService.getReportsByTenant(tenantId);
  }

  @Delete('reports/:reportId')
  deleteReport(@Param('reportId') reportId: string): { deleted: boolean } {
    return { deleted: this.analyticsService.deleteReport(reportId) };
  }

  // ==================== Export ====================

  @Get('export/:tenantId/:dataType')
  exportData(
    @Param('tenantId') tenantId: string,
    @Param('dataType') dataType: 'sales' | 'products' | 'customers' | 'orders',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ): { data: any; filename: string } {
    return this.analyticsService.exportData(
      tenantId,
      dataType,
      new Date(startDate),
      new Date(endDate),
      format,
    );
  }
}
