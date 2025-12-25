import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { PredictiveAnalyticsService } from './predictive-analytics.service';

@ApiTags('Predictive Analytics')
@Controller('analytics/predictive')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PredictiveAnalyticsController {
  constructor(private readonly analyticsService: PredictiveAnalyticsService) {}

  // =================== FORECASTING ===================

  @Get('forecast')
  @ApiOperation({ summary: 'Generate full financial forecast for current user' })
  @ApiQuery({ name: 'horizon', required: false, type: Number, description: 'Forecast horizon in days (default: 90)' })
  @ApiQuery({ name: 'confidence', required: false, type: Number, description: 'Confidence level 0-1 (default: 0.95)' })
  @ApiResponse({ status: 200, description: 'Complete financial forecast with trends, seasonality, and anomalies' })
  async generateForecast(
    @Request() req: any,
    @Query('horizon') horizon?: string,
    @Query('confidence') confidence?: string,
  ) {
    return this.analyticsService.generateForecast(req.user.sub, {
      horizon: horizon ? parseInt(horizon) : 90,
      confidenceLevel: confidence ? parseFloat(confidence) : 0.95,
    });
  }

  @Get('forecast/summary')
  @ApiOperation({ summary: 'Get revenue forecast summary' })
  @ApiResponse({ status: 200, description: 'Forecast summary with next month prediction and trend' })
  async getRevenueForecastSummary(@Request() req: any) {
    return this.analyticsService.getRevenueForecastSummary(req.user.sub);
  }

  @Get('forecast/monthly')
  @ApiOperation({ summary: 'Get monthly forecast details' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Monthly forecast breakdown' })
  async getMonthlyForecast(
    @Request() req: any,
    @Query('months') months?: string,
  ) {
    return this.analyticsService.getMonthlyForecast(
      req.user.sub,
      months ? parseInt(months) : 6,
    );
  }

  // =================== HISTORICAL DATA ===================

  @Get('revenue/historical')
  @ApiOperation({ summary: 'Get historical revenue data' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Months of history (default: 24)' })
  @ApiResponse({ status: 200, description: 'Historical revenue time series' })
  async getHistoricalRevenue(
    @Request() req: any,
    @Query('months') months?: string,
  ) {
    return this.analyticsService.getHistoricalRevenue(
      req.user.sub,
      months ? parseInt(months) : 24,
    );
  }

  @Get('expenses/historical')
  @ApiOperation({ summary: 'Get historical expenses data' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Months of history (default: 24)' })
  @ApiResponse({ status: 200, description: 'Historical expenses time series' })
  async getHistoricalExpenses(
    @Request() req: any,
    @Query('months') months?: string,
  ) {
    return this.analyticsService.getHistoricalExpenses(
      req.user.sub,
      months ? parseInt(months) : 24,
    );
  }

  // =================== SCENARIO ANALYSIS ===================

  @Post('scenarios')
  @ApiOperation({ summary: 'Run what-if scenario analysis' })
  @ApiResponse({ status: 200, description: 'Scenario analysis results with projections' })
  async runScenarioAnalysis(
    @Request() req: any,
    @Body() body: {
      scenarios: Array<{
        name: string;
        revenueGrowth: number;
        expenseGrowth: number;
        additionalAssumptions?: Record<string, number>;
      }>;
    },
  ) {
    return this.analyticsService.runScenarioAnalysis(req.user.sub, body.scenarios);
  }

  // =================== ADMIN ENDPOINTS ===================

  @Get('forecast/:userId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate forecast for specific user (admin/accountant)' })
  @ApiQuery({ name: 'horizon', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User financial forecast' })
  async generateUserForecast(
    @Param('userId') userId: string,
    @Query('horizon') horizon?: string,
  ) {
    return this.analyticsService.generateForecast(userId, {
      horizon: horizon ? parseInt(horizon) : 90,
    });
  }

  @Get('revenue/historical/:userId')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get historical revenue for specific user (admin/accountant)' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User historical revenue' })
  async getUserHistoricalRevenue(
    @Param('userId') userId: string,
    @Query('months') months?: string,
  ) {
    return this.analyticsService.getHistoricalRevenue(
      userId,
      months ? parseInt(months) : 24,
    );
  }
}
