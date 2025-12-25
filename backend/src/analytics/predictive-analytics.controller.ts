import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  PredictiveAnalyticsService,
  TimeSeriesPoint,
} from './predictive-analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Predictive Analytics')
@Controller('analytics/predictive')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PredictiveAnalyticsController {
  constructor(private readonly analyticsService: PredictiveAnalyticsService) {}

  // =================== FORECASTING ===================

  @Post('forecast')
  @ApiOperation({ summary: 'Generate a forecast for a metric' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        metric: { type: 'string' },
        historicalData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date-time' },
              value: { type: 'number' },
            },
          },
        },
        horizon: { type: 'number' },
        period: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
      },
      required: ['metric', 'historicalData', 'horizon'],
    },
  })
  @ApiResponse({ status: 201, description: 'Forecast generated' })
  async generateForecast(
    @Body('metric') metric: string,
    @Body('historicalData') historicalData: TimeSeriesPoint[],
    @Body('horizon') horizon: number,
    @Body('period') period?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  ) {
    // Convert date strings to Date objects
    const data = historicalData.map((d) => ({
      ...d,
      date: new Date(d.date),
    }));
    return this.analyticsService.generateForecast(metric, data, horizon, period);
  }

  @Get('forecast/:forecastId')
  @ApiOperation({ summary: 'Get a specific forecast' })
  @ApiResponse({ status: 200, description: 'Forecast details' })
  async getForecast(@Param('forecastId') forecastId: string) {
    const forecast = await this.analyticsService.getForecast(forecastId);
    if (!forecast) {
      return { error: 'Forecast not found' };
    }
    return forecast;
  }

  // =================== TREND ANALYSIS ===================

  @Post('trend')
  @ApiOperation({ summary: 'Analyze trend for a metric' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        metric: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date-time' },
              value: { type: 'number' },
            },
          },
        },
        period: { type: 'string' },
      },
      required: ['metric', 'data', 'period'],
    },
  })
  @ApiResponse({ status: 200, description: 'Trend analysis result' })
  async analyzeTrend(
    @Body('metric') metric: string,
    @Body('data') data: TimeSeriesPoint[],
    @Body('period') period: string,
  ) {
    const processedData = data.map((d) => ({
      ...d,
      date: new Date(d.date),
    }));
    return this.analyticsService.analyzeTrend(metric, processedData, period);
  }

  // =================== KPI FORECASTING ===================

  @Get('kpis/:tenantId')
  @ApiOperation({ summary: 'Get KPI forecasts for a tenant' })
  @ApiQuery({ name: 'horizon', required: false })
  @ApiResponse({ status: 200, description: 'KPI forecasts' })
  async forecastKPIs(
    @Param('tenantId') tenantId: string,
    @Query('horizon') horizon?: string,
  ) {
    return {
      kpis: await this.analyticsService.forecastKPIs(tenantId, horizon || '30d'),
    };
  }

  // =================== SCENARIO ANALYSIS ===================

  @Post('scenarios')
  @ApiOperation({ summary: 'Generate business scenarios' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        metric: { type: 'string' },
        baseValue: { type: 'number' },
        factors: { type: 'object' },
      },
      required: ['metric', 'baseValue'],
    },
  })
  @ApiResponse({ status: 200, description: 'Business scenarios' })
  async generateScenarios(
    @Body('metric') metric: string,
    @Body('baseValue') baseValue: number,
    @Body('factors') factors?: Record<string, number>,
  ) {
    return {
      scenarios: await this.analyticsService.generateScenarios(
        metric,
        baseValue,
        factors || {},
      ),
    };
  }

  // =================== CASH FLOW ===================

  @Get('cash-flow/:tenantId')
  @ApiOperation({ summary: 'Predict cash flow' })
  @ApiQuery({ name: 'periods', required: false })
  @ApiResponse({ status: 200, description: 'Cash flow predictions' })
  async predictCashFlow(
    @Param('tenantId') tenantId: string,
    @Query('periods') periods?: string,
  ) {
    return {
      predictions: await this.analyticsService.predictCashFlow(
        tenantId,
        periods ? parseInt(periods) : 6,
      ),
    };
  }

  // =================== CHURN PREDICTION ===================

  @Get('churn/:tenantId')
  @ApiOperation({ summary: 'Predict customer churn' })
  @ApiResponse({ status: 200, description: 'Churn predictions' })
  async predictChurn(@Param('tenantId') tenantId: string) {
    return {
      predictions: await this.analyticsService.predictChurn(tenantId),
    };
  }

  // =================== DEMAND FORECASTING ===================

  @Get('demand/:tenantId')
  @ApiOperation({ summary: 'Forecast product demand' })
  @ApiResponse({ status: 200, description: 'Demand forecasts' })
  async forecastDemand(@Param('tenantId') tenantId: string) {
    return {
      forecasts: await this.analyticsService.forecastDemand(tenantId),
    };
  }

  // =================== REVENUE ATTRIBUTION ===================

  @Get('revenue-attribution/:tenantId')
  @ApiOperation({ summary: 'Get revenue attribution analysis' })
  @ApiQuery({ name: 'period', required: false })
  @ApiResponse({ status: 200, description: 'Revenue attribution' })
  async getRevenueAttribution(
    @Param('tenantId') tenantId: string,
    @Query('period') period?: string,
  ) {
    return {
      attribution: await this.analyticsService.getRevenueAttribution(
        tenantId,
        period || '30d',
      ),
    };
  }

  // =================== DASHBOARD ===================

  @Get('dashboard/:tenantId')
  @ApiOperation({ summary: 'Get predictive analytics dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboardMetrics(@Param('tenantId') tenantId: string) {
    return this.analyticsService.getDashboardMetrics(tenantId);
  }

  // =================== MODEL ACCURACY ===================

  @Get('forecast/:forecastId/accuracy')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get model accuracy metrics' })
  @ApiResponse({ status: 200, description: 'Accuracy metrics' })
  async getModelAccuracy(@Param('forecastId') forecastId: string) {
    return {
      accuracy: await this.analyticsService.getModelAccuracy(forecastId),
    };
  }
}
