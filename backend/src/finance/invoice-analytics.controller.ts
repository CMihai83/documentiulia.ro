import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvoiceAnalyticsService } from './invoice-analytics.service';

/**
 * Sprint 14 - US-004: Invoice Analytics Controller
 *
 * REST API endpoints for invoice analytics:
 * - GET /analytics/insights - Revenue insights
 * - GET /analytics/clients - Top clients
 * - GET /analytics/trend - Monthly trend
 * - GET /analytics/forecast - Revenue forecast
 * - GET /analytics/status - Status distribution
 * - GET /analytics/vat - VAT summary
 */
@Controller('api/finance/analytics')
@UseGuards(JwtAuthGuard)
export class InvoiceAnalyticsController {
  constructor(private readonly analyticsService: InvoiceAnalyticsService) {}

  /**
   * Get comprehensive revenue insights
   */
  @Get('insights')
  async getInsights(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user?.id || req.auth?.userId;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getRevenueInsights(userId, start, end);
  }

  /**
   * Get top clients by revenue
   */
  @Get('clients')
  async getTopClients(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.id || req.auth?.userId;
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : now;

    return this.analyticsService.getTopClients(
      userId,
      start,
      end,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * Get monthly invoice trend
   */
  @Get('trend')
  async getMonthlyTrend(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user?.id || req.auth?.userId;
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : now;

    return this.analyticsService.getMonthlyTrend(userId, start, end);
  }

  /**
   * Get revenue forecast
   */
  @Get('forecast')
  async getForecast(@Req() req: any) {
    const userId = req.user?.id || req.auth?.userId;
    return this.analyticsService.getForecast(userId);
  }

  /**
   * Get invoice status distribution
   */
  @Get('status')
  async getStatusDistribution(@Req() req: any) {
    const userId = req.user?.id || req.auth?.userId;
    return this.analyticsService.getStatusDistribution(userId);
  }

  /**
   * Get VAT summary
   */
  @Get('vat')
  async getVatSummary(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user?.id || req.auth?.userId;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getVatSummary(userId, start, end);
  }
}
