import { Controller, Get, Post, Body, Query, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { VatService, VATCalculation } from './vat.service';
import { FinanceService } from './finance.service';
import { PredictiveAnalyticsService, ForecastOptions } from './predictive-analytics.service';
import { CalculateVATDto, CalculateVATReportDto, VATCategoryDto } from './dto/vat.dto';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('finance')
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly vatService: VatService,
    private readonly financeService: FinanceService,
    private readonly predictiveAnalytics: PredictiveAnalyticsService,
  ) {}

  @Get('vat')
  @ApiOperation({ summary: 'Get VAT rates overview per Legea 141/2025' })
  @ApiResponse({ status: HttpStatus.OK, description: 'VAT rates and compliance info' })
  getVATOverview() {
    return {
      law: 'Legea 141/2025',
      effectiveDate: '2025-08-01',
      rates: {
        standard: 21,
        reduced: 11,
        special: 5,
      },
      categories: {
        standard: ['General goods and services'],
        reduced: ['Food', 'Pharmaceuticals', 'Medical equipment', 'Books'],
        special: ['Social housing'],
      },
      compliance: {
        saftD406: 'Monthly XML submission per Order 1783/2021',
        efactura: 'B2B via SPV mandatory since Jan 2024',
        deadline: '25th of following month',
      },
    };
  }

  @Get('currency/rates')
  @ApiOperation({ summary: 'Get currency exchange rates (alias for /currency/rates)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Exchange rates with RON focus' })
  async getCurrencyRates() {
    // Return key rates for Romanian businesses
    return {
      base: 'EUR',
      timestamp: new Date().toISOString(),
      rates: {
        RON: 4.97,
        USD: 1.04,
        GBP: 0.83,
        CHF: 0.93,
        HUF: 410.5,
        PLN: 4.32,
        BGN: 1.96,
      },
      source: 'BNR/ECB',
      note: 'For real-time rates, use /currency/rates endpoint',
    };
  }

  @Post('vat/calculate')
  @ApiOperation({ summary: 'Calculate VAT per Legea 141/2025' })
  calculateVAT(@Body() dto: CalculateVATDto): VATCalculation {
    return this.vatService.calculateVAT(dto.amount, dto.rate, dto.isGross);
  }

  @Get('vat/rate')
  @ApiOperation({ summary: 'Get applicable VAT rate for category' })
  getVATRate(@Query('category') category: string): { rate: number; law: string } {
    return {
      rate: this.vatService.getApplicableRate(category),
      law: 'Legea 141/2025',
    };
  }

  @Get('vat/reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get VAT reports for user' })
  async getVATReports(@Query('userId') userId: string) {
    return this.financeService.getVATReports(userId);
  }

  @Get('vat/summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get VAT summary for current year' })
  async getVATSummary(@Query('userId') userId: string) {
    return this.financeService.getVATSummary(userId);
  }

  @Post('vat/calculate-period')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Calculate VAT for a specific period' })
  async calculateVATPeriod(
    @Query('userId') userId: string,
    @Body() dto: CalculateVATReportDto,
  ) {
    return this.financeService.calculateVATForPeriod(userId, dto.period);
  }

  @Post('vat/submit/:reportId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Submit VAT report to ANAF' })
  async submitVATReport(@Param('reportId') reportId: string) {
    return this.financeService.submitVATToANAF(reportId);
  }

  @Get('vat/download/:reportId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Download VAT report as PDF' })
  async downloadVATReport(@Param('reportId') reportId: string) {
    return this.financeService.downloadVATReport(reportId);
  }

  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get finance dashboard data' })
  async getDashboard(@Query('userId') userId: string) {
    return this.financeService.getDashboardData(userId);
  }

  // =================== PREDICTIVE ANALYTICS ===================

  @Get('analytics/forecast')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate comprehensive financial forecast' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiQuery({ name: 'horizon', required: false, description: 'Forecast horizon in days (default: 90)' })
  @ApiQuery({ name: 'confidence', required: false, description: 'Confidence level (0.80, 0.90, 0.95)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Financial forecast generated' })
  async generateForecast(
    @Query('userId') userId: string,
    @Query('horizon') horizon?: string,
    @Query('confidence') confidence?: string,
  ) {
    return this.predictiveAnalytics.generateForecast(userId, {
      horizon: horizon ? parseInt(horizon, 10) : 90,
      confidenceLevel: confidence ? parseFloat(confidence) : 0.95,
      includeSeasonality: true,
      includeAnomalies: true,
    });
  }

  @Get('analytics/revenue-summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get quick revenue forecast summary' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Revenue forecast summary' })
  async getRevenueSummary(@Query('userId') userId: string) {
    return this.predictiveAnalytics.getRevenueForecastSummary(userId);
  }

  @Get('analytics/monthly')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get monthly financial forecast' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to forecast (default: 12)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Monthly forecast breakdown' })
  async getMonthlyForecast(
    @Query('userId') userId: string,
    @Query('months') months?: string,
  ) {
    return this.predictiveAnalytics.getMonthlyForecast(
      userId,
      months ? parseInt(months, 10) : 12,
    );
  }

  @Get('analytics/trends')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get revenue and expense trend analysis' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Trend analysis' })
  async getTrendAnalysis(@Query('userId') userId: string) {
    const forecast = await this.predictiveAnalytics.generateForecast(userId, { horizon: 30 });
    return {
      revenue: forecast.revenue.trend,
      expenses: forecast.expenses.trend,
      insights: forecast.insights.filter((i) => i.includes('trend') || i.includes('growth')),
    };
  }

  @Get('analytics/seasonality')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get seasonal patterns in financial data' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seasonality patterns' })
  async getSeasonality(@Query('userId') userId: string) {
    const forecast = await this.predictiveAnalytics.generateForecast(userId, {
      horizon: 30,
      includeSeasonality: true,
    });
    return {
      revenue: forecast.revenue.seasonality,
      expenses: forecast.expenses.seasonality,
    };
  }

  @Get('analytics/anomalies')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get detected financial anomalies' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Detected anomalies' })
  async getAnomalies(@Query('userId') userId: string) {
    const forecast = await this.predictiveAnalytics.generateForecast(userId, {
      horizon: 30,
      includeAnomalies: true,
    });
    return {
      anomalies: forecast.anomalies,
      summary: {
        total: forecast.anomalies.length,
        critical: forecast.anomalies.filter((a) => a.severity === 'critical').length,
        high: forecast.anomalies.filter((a) => a.severity === 'high').length,
        medium: forecast.anomalies.filter((a) => a.severity === 'medium').length,
        low: forecast.anomalies.filter((a) => a.severity === 'low').length,
      },
    };
  }

  @Get('analytics/cash-flow')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get cash flow projections' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiQuery({ name: 'months', required: false, description: 'Number of months to project (default: 6)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cash flow projections' })
  async getCashFlowProjections(
    @Query('userId') userId: string,
    @Query('months') months?: string,
  ) {
    const forecast = await this.predictiveAnalytics.generateForecast(userId, {
      horizon: (months ? parseInt(months, 10) : 6) * 30,
    });
    return {
      projections: forecast.cashFlow,
      summary: {
        totalProjectedIncome: forecast.cashFlow.reduce((sum, cf) => sum + cf.projectedIncome, 0),
        totalProjectedExpenses: forecast.cashFlow.reduce((sum, cf) => sum + cf.projectedExpenses, 0),
        netCashFlow: forecast.cashFlow.reduce((sum, cf) => sum + cf.projectedCashFlow, 0),
        averageMonthlyIncome: forecast.cashFlow.length > 0
          ? forecast.cashFlow.reduce((sum, cf) => sum + cf.projectedIncome, 0) / forecast.cashFlow.length
          : 0,
      },
    };
  }

  @Post('analytics/scenarios')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Run what-if scenario analysis' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Scenario analysis results' })
  async runScenarioAnalysis(
    @Query('userId') userId: string,
    @Body() scenarios: Array<{
      name: string;
      revenueGrowth: number;
      expenseGrowth: number;
      additionalAssumptions?: Record<string, number>;
    }>,
  ) {
    // Default scenarios if none provided
    const scenariosToRun = scenarios.length > 0 ? scenarios : [
      { name: 'Optimistic', revenueGrowth: 20, expenseGrowth: 10 },
      { name: 'Baseline', revenueGrowth: 10, expenseGrowth: 10 },
      { name: 'Pessimistic', revenueGrowth: 0, expenseGrowth: 15 },
      { name: 'Cost Reduction', revenueGrowth: 5, expenseGrowth: -10 },
    ];

    return this.predictiveAnalytics.runScenarioAnalysis(userId, scenariosToRun);
  }

  @Get('analytics/accuracy')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get forecast accuracy metrics' })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Accuracy metrics' })
  async getAccuracyMetrics(@Query('userId') userId: string) {
    const forecast = await this.predictiveAnalytics.generateForecast(userId, { horizon: 30 });
    return {
      accuracy: forecast.accuracy,
      interpretation: {
        mape: forecast.accuracy.mape < 10 ? 'Excellent' :
              forecast.accuracy.mape < 20 ? 'Good' :
              forecast.accuracy.mape < 30 ? 'Acceptable' : 'Needs improvement',
        description: `Mean Absolute Percentage Error (MAPE) of ${forecast.accuracy.mape.toFixed(2)}% ` +
                    `indicates ${forecast.accuracy.mape < 20 ? 'reliable' : 'approximate'} forecasts.`,
      },
    };
  }
}
