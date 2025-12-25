import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CashFlowForecastService } from './cash-flow-forecast.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Cash Flow Forecast')
@Controller('reports/cash-flow-forecast')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CashFlowForecastController {
  constructor(
    private readonly forecastService: CashFlowForecastService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate cash flow forecast
   */
  @Get()
  @ApiOperation({ summary: 'Generate cash flow forecast' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months to forecast (default 3, max 12)' })
  @ApiQuery({ name: 'startingBalance', required: false, type: Number, description: 'Current cash balance' })
  @ApiResponse({ status: 200, description: 'Returns cash flow forecast' })
  async getForecast(
    @Request() req: any,
    @Query('months') months?: string,
    @Query('startingBalance') startingBalance?: string,
  ) {
    // JWT strategy returns full user object with id
    const userId = req.user?.id;

    if (!userId) {
      return {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        periods: [],
        summary: { totalInflows: 0, totalOutflows: 0, netCashFlow: 0 },
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, activeOrganizationId: true },
    });

    const orgId = user?.activeOrganizationId || '';
    const monthsNum = months ? Math.min(parseInt(months), 12) : 3;
    const balance = startingBalance ? parseFloat(startingBalance) : 0;

    const forecast = await this.forecastService.generateForecast(
      orgId,
      userId,
      monthsNum,
      balance,
    );

    return forecast;
  }

  /**
   * Get dashboard widget data
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get cash flow forecast for dashboard widget' })
  @ApiResponse({ status: 200, description: 'Returns simplified forecast for dashboard' })
  async getDashboardForecast(@Request() req: any) {
    // JWT strategy returns full user object with id
    const userId = req.user?.id;

    if (!userId) {
      return {
        currentBalance: 0,
        forecastedBalance: 0,
        trend: 'stable',
        alerts: [],
        chartData: [],
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, activeOrganizationId: true },
    });

    const orgId = user?.activeOrganizationId || '';

    return this.forecastService.getDashboardForecast(orgId, userId);
  }

  /**
   * Get detailed monthly breakdown
   */
  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly cash flow breakdown' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default 6)' })
  @ApiResponse({ status: 200, description: 'Returns monthly breakdown with charts data' })
  async getMonthlyBreakdown(
    @Request() req: any,
    @Query('months') months?: string,
  ) {
    // JWT strategy returns full user object with id
    const userId = req.user?.id;

    if (!userId) {
      return {
        summary: { totalIncome: 0, totalExpenses: 0, netForecast: 0, riskLevel: 'low' },
        chartData: { labels: [], income: [], expenses: [], netCashFlow: [], cumulativeBalance: [], confidence: [] },
        recommendations: [],
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, activeOrganizationId: true },
    });

    const orgId = user?.activeOrganizationId || '';
    const monthsNum = months ? Math.min(parseInt(months), 12) : 6;

    const forecast = await this.forecastService.generateForecast(orgId, userId, monthsNum);

    // Format for charts
    const chartData = {
      labels: forecast.forecasts.map(f => f.period),
      income: forecast.forecasts.map(f => f.expectedIncome),
      expenses: forecast.forecasts.map(f => f.expectedExpenses),
      netCashFlow: forecast.forecasts.map(f => f.netCashFlow),
      cumulativeBalance: forecast.forecasts.map(f => f.cumulativeBalance),
      confidence: forecast.forecasts.map(f => f.confidence),
    };

    return {
      summary: {
        totalIncome: forecast.totalExpectedIncome,
        totalExpenses: forecast.totalExpectedExpenses,
        netForecast: forecast.netForecast,
        riskLevel: forecast.riskLevel,
        lowestBalance: forecast.lowestBalance,
        lowestBalanceMonth: forecast.lowestBalanceDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' }),
      },
      chartData,
      forecasts: forecast.forecasts,
      insights: forecast.insights,
    };
  }

  /**
   * Get receivables vs payables aging
   */
  @Get('aging')
  @ApiOperation({ summary: 'Get receivables and payables aging analysis' })
  @ApiResponse({ status: 200, description: 'Returns aging buckets for receivables and payables' })
  async getAgingAnalysis(@Request() req: any) {
    // JWT strategy returns full user object with id
    const userId = req.user?.id;
    const user = userId ? await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, activeOrganizationId: true },
    }) : null;

    if (!user?.activeOrganizationId) {
      return { receivables: [], payables: [] };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get unpaid issued invoices (receivables)
    const receivables = await this.prisma.invoice.findMany({
      where: {
        organizationId: user.activeOrganizationId,
        type: 'ISSUED',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        partnerName: true,
        dueDate: true,
        grossAmount: true,
        paidAmount: true,
        currency: true,
      },
    });

    // Get unpaid received invoices (payables)
    const payables = await this.prisma.invoice.findMany({
      where: {
        organizationId: user.activeOrganizationId,
        type: 'RECEIVED',
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        partnerName: true,
        dueDate: true,
        grossAmount: true,
        paidAmount: true,
        currency: true,
      },
    });

    // Categorize into aging buckets
    const agingBuckets = ['current', '1-30', '31-60', '61-90', '90+'];

    const categorize = (invoice: any) => {
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : today;
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = Number(invoice.grossAmount) - Number(invoice.paidAmount || 0);

      let bucket: string;
      if (daysOverdue <= 0) bucket = 'current';
      else if (daysOverdue <= 30) bucket = '1-30';
      else if (daysOverdue <= 60) bucket = '31-60';
      else if (daysOverdue <= 90) bucket = '61-90';
      else bucket = '90+';

      return {
        ...invoice,
        daysOverdue: Math.max(0, daysOverdue),
        remaining,
        bucket,
      };
    };

    const categorizedReceivables = receivables.map(categorize);
    const categorizedPayables = payables.map(categorize);

    // Aggregate by bucket
    const aggregateByBucket = (items: any[]) => {
      return agingBuckets.map(bucket => ({
        bucket,
        count: items.filter(i => i.bucket === bucket).length,
        total: items.filter(i => i.bucket === bucket).reduce((sum, i) => sum + i.remaining, 0),
        items: items.filter(i => i.bucket === bucket),
      }));
    };

    return {
      receivables: {
        total: categorizedReceivables.reduce((sum, i) => sum + i.remaining, 0),
        count: categorizedReceivables.length,
        buckets: aggregateByBucket(categorizedReceivables),
      },
      payables: {
        total: categorizedPayables.reduce((sum, i) => sum + i.remaining, 0),
        count: categorizedPayables.length,
        buckets: aggregateByBucket(categorizedPayables),
      },
      netPosition: categorizedReceivables.reduce((sum, i) => sum + i.remaining, 0)
        - categorizedPayables.reduce((sum, i) => sum + i.remaining, 0),
    };
  }

  /**
   * Get cash flow scenarios (best/worst/expected)
   */
  @Get('scenarios')
  @ApiOperation({ summary: 'Get cash flow scenarios' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Months to forecast (default 3)' })
  @ApiQuery({ name: 'startingBalance', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns optimistic, realistic, and pessimistic scenarios' })
  async getScenarios(
    @Request() req: any,
    @Query('months') months?: string,
    @Query('startingBalance') startingBalance?: string,
  ) {
    // JWT strategy returns full user object with id
    const userId = req.user?.id || '';
    const user = userId ? await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, activeOrganizationId: true },
    }) : null;

    const orgId = user?.activeOrganizationId || '';
    const monthsNum = months ? Math.min(parseInt(months), 12) : 3;
    const balance = startingBalance ? parseFloat(startingBalance) : 0;

    // Get base forecast
    const baseForecast = await this.forecastService.generateForecast(
      orgId,
      userId,
      monthsNum,
      balance,
    );

    // Generate scenarios by adjusting forecasts
    const optimisticForecasts = baseForecast.forecasts.map(f => ({
      ...f,
      expectedIncome: f.expectedIncome * 1.2, // 20% higher income
      expectedExpenses: f.expectedExpenses * 0.9, // 10% lower expenses
      netCashFlow: (f.expectedIncome * 1.2) - (f.expectedExpenses * 0.9),
    }));

    const pessimisticForecasts = baseForecast.forecasts.map(f => ({
      ...f,
      expectedIncome: f.expectedIncome * 0.7, // 30% lower income
      expectedExpenses: f.expectedExpenses * 1.1, // 10% higher expenses
      netCashFlow: (f.expectedIncome * 0.7) - (f.expectedExpenses * 1.1),
    }));

    // Calculate cumulative balances
    let optimisticBalance = balance;
    let pessimisticBalance = balance;

    optimisticForecasts.forEach(f => {
      optimisticBalance += f.netCashFlow;
      f.cumulativeBalance = Math.round(optimisticBalance * 100) / 100;
    });

    pessimisticForecasts.forEach(f => {
      pessimisticBalance += f.netCashFlow;
      f.cumulativeBalance = Math.round(pessimisticBalance * 100) / 100;
    });

    return {
      scenarios: {
        optimistic: {
          name: 'Optimist',
          description: 'Venituri +20%, cheltuieli -10%',
          forecasts: optimisticForecasts,
          finalBalance: optimisticBalance,
          totalIncome: optimisticForecasts.reduce((sum, f) => sum + f.expectedIncome, 0),
          totalExpenses: optimisticForecasts.reduce((sum, f) => sum + f.expectedExpenses, 0),
        },
        realistic: {
          name: 'Realist',
          description: 'Bazat pe date istorice',
          forecasts: baseForecast.forecasts,
          finalBalance: baseForecast.forecasts[baseForecast.forecasts.length - 1]?.cumulativeBalance || balance,
          totalIncome: baseForecast.totalExpectedIncome,
          totalExpenses: baseForecast.totalExpectedExpenses,
        },
        pessimistic: {
          name: 'Pesimist',
          description: 'Venituri -30%, cheltuieli +10%',
          forecasts: pessimisticForecasts,
          finalBalance: pessimisticBalance,
          totalIncome: pessimisticForecasts.reduce((sum, f) => sum + f.expectedIncome, 0),
          totalExpenses: pessimisticForecasts.reduce((sum, f) => sum + f.expectedExpenses, 0),
        },
      },
      chartData: {
        labels: baseForecast.forecasts.map(f => f.period),
        optimistic: optimisticForecasts.map(f => f.cumulativeBalance),
        realistic: baseForecast.forecasts.map(f => f.cumulativeBalance),
        pessimistic: pessimisticForecasts.map(f => f.cumulativeBalance),
      },
      insights: baseForecast.insights,
    };
  }
}
