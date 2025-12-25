import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AiInsightsService } from './ai-insights.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * AI Insights Dashboard Controller (COMP-001)
 * Provides actionable AI-powered financial insights
 */
@Controller('ai/insights')
@UseGuards(JwtAuthGuard)
export class AiInsightsController {
  constructor(private readonly insightsService: AiInsightsService) {}

  /**
   * Get complete dashboard insights
   * @returns Full dashboard with health score, insights, predictions, and alerts
   */
  @Get('dashboard')
  async getDashboardInsights(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.insightsService.getDashboardInsights(userId);
  }

  /**
   * Get financial health score
   * @returns Health score with component breakdowns
   */
  @Get('health-score')
  async getHealthScore(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.insightsService.calculateFinancialHealthScore(userId);
  }

  /**
   * Get spending insights and anomalies
   * @returns List of spending insights sorted by severity
   */
  @Get('spending')
  async getSpendingInsights(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.insightsService.generateSpendingInsights(userId);
  }

  /**
   * Get cash flow predictions
   * @param months Number of months to predict (default: 3)
   * @returns Predicted cash flow for upcoming months
   */
  @Get('cash-flow-predictions')
  async getCashFlowPredictions(
    @Request() req: any,
    @Query('months') months?: string,
  ) {
    const userId = req.user?.sub || req.user?.id;
    const numMonths = months ? parseInt(months, 10) : 3;
    return this.insightsService.predictCashFlow(userId, Math.min(numMonths, 12));
  }

  /**
   * Get category spending analysis
   * @param period Period in YYYY-MM format (default: current month)
   * @returns Category-wise spending analysis with trends
   */
  @Get('category-analysis')
  async getCategoryAnalysis(
    @Request() req: any,
    @Query('period') period?: string,
  ) {
    const userId = req.user?.sub || req.user?.id;
    const analysisePeriod = period || new Date().toISOString().slice(0, 7);
    return this.insightsService.analyzeCategorySpending(userId, analysisePeriod);
  }

  /**
   * Get vendor insights
   * @returns Top vendors with spending analysis
   */
  @Get('vendors')
  async getVendorInsights(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.insightsService.analyzeVendors(userId);
  }

  /**
   * Get tax optimization suggestions
   * @returns List of tax optimization opportunities
   */
  @Get('tax-optimizations')
  async getTaxOptimizations(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.insightsService.generateTaxOptimizations(userId);
  }

  /**
   * Get compliance alerts
   * @returns List of compliance deadlines and alerts
   */
  @Get('compliance-alerts')
  async getComplianceAlerts(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.insightsService.getComplianceAlerts(userId);
  }
}
