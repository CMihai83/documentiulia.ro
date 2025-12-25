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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  BudgetForecastingService,
  ForecastMethod,
  ForecastPeriod,
  ScenarioAdjustment,
} from './budget-forecasting.service';

@ApiTags('Budget Management - Forecasting')
@Controller('budgets/forecasting')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetForecastingController {
  constructor(private readonly forecastingService: BudgetForecastingService) {}

  // =================== BUDGET FORECASTS ===================

  @Post('forecast/:budgetId')
  @ApiOperation({ summary: 'Create budget forecast' })
  @ApiResponse({ status: 201, description: 'Forecast created' })
  async createForecast(
    @Request() req: any,
    @Param('budgetId') budgetId: string,
    @Body() body: {
      method?: ForecastMethod;
      period?: ForecastPeriod;
      horizonPeriods?: number;
    },
  ) {
    try {
      return await this.forecastingService.createForecast({
        tenantId: req.user.tenantId,
        budgetId,
        method: body.method,
        period: body.period,
        horizonPeriods: body.horizonPeriods,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('forecast/:id')
  @ApiOperation({ summary: 'Get forecast by ID' })
  @ApiResponse({ status: 200, description: 'Forecast details' })
  async getForecast(@Param('id') id: string) {
    const forecast = await this.forecastingService.getForecast(id);
    if (!forecast) {
      return { error: 'Forecast not found' };
    }
    return forecast;
  }

  @Get('forecasts')
  @ApiOperation({ summary: 'Get all forecasts' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Forecasts list' })
  async getForecasts(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
    @Query('limit') limit?: string,
  ) {
    const forecasts = await this.forecastingService.getForecasts(
      req.user.tenantId,
      budgetId,
      limit ? parseInt(limit) : undefined,
    );
    return { forecasts, total: forecasts.length };
  }

  // =================== WHAT-IF SCENARIOS ===================

  @Post('scenarios')
  @ApiOperation({ summary: 'Create what-if scenario' })
  @ApiResponse({ status: 201, description: 'Scenario created' })
  async createScenario(
    @Request() req: any,
    @Body() body: {
      budgetId: string;
      name: string;
      description?: string;
      baseForecastId?: string;
      adjustments: ScenarioAdjustment[];
    },
  ) {
    try {
      return await this.forecastingService.createWhatIfScenario({
        tenantId: req.user.tenantId,
        budgetId: body.budgetId,
        name: body.name,
        description: body.description,
        baseForecastId: body.baseForecastId,
        adjustments: body.adjustments,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('scenarios/:id')
  @ApiOperation({ summary: 'Get scenario by ID' })
  @ApiResponse({ status: 200, description: 'Scenario details' })
  async getScenario(@Param('id') id: string) {
    const scenario = await this.forecastingService.getScenario(id);
    if (!scenario) {
      return { error: 'Scenario not found' };
    }
    return scenario;
  }

  @Get('scenarios')
  @ApiOperation({ summary: 'Get all scenarios' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiResponse({ status: 200, description: 'Scenarios list' })
  async getScenarios(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
  ) {
    const scenarios = await this.forecastingService.getScenarios(
      req.user.tenantId,
      budgetId,
    );
    return { scenarios, total: scenarios.length };
  }

  // =================== CASH FLOW FORECASTING ===================

  @Post('cashflow')
  @ApiOperation({ summary: 'Create cash flow forecast' })
  @ApiResponse({ status: 201, description: 'Cash flow forecast created' })
  async createCashFlowForecast(
    @Request() req: any,
    @Body() body: {
      period?: ForecastPeriod;
      horizonPeriods?: number;
      initialBalance?: number;
    },
  ) {
    return this.forecastingService.createCashFlowForecast({
      tenantId: req.user.tenantId,
      period: body.period,
      horizonPeriods: body.horizonPeriods,
      initialBalance: body.initialBalance,
    });
  }

  @Get('cashflow/:id')
  @ApiOperation({ summary: 'Get cash flow forecast by ID' })
  @ApiResponse({ status: 200, description: 'Cash flow forecast details' })
  async getCashFlowForecast(@Param('id') id: string) {
    const forecast = await this.forecastingService.getCashFlowForecast(id);
    if (!forecast) {
      return { error: 'Cash flow forecast not found' };
    }
    return forecast;
  }

  @Get('cashflow')
  @ApiOperation({ summary: 'Get all cash flow forecasts' })
  @ApiResponse({ status: 200, description: 'Cash flow forecasts list' })
  async getCashFlowForecasts(@Request() req: any) {
    const forecasts = await this.forecastingService.getCashFlowForecasts(
      req.user.tenantId,
    );
    return { forecasts, total: forecasts.length };
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get forecasting statistics' })
  @ApiResponse({ status: 200, description: 'Forecasting statistics' })
  async getStatistics(@Request() req: any) {
    return this.forecastingService.getForecastingStatistics(req.user.tenantId);
  }
}
