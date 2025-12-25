import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ForecastingService,
  ForecastType,
  TrendType,
  SeasonalityType,
  ForecastStatus,
  TimeSeriesData,
  ForecastParameters,
  ScenarioAdjustment,
  AlertSeverity,
  AlertRule,
} from './forecasting.service';

// =================== DTOs ===================

class CreateModelDto {
  name: string;
  description?: string;
  forecastType: ForecastType;
  trendType: TrendType;
  seasonality: SeasonalityType;
  parameters: ForecastParameters;
}

class UpdateModelDto {
  name?: string;
  description?: string;
  trendType?: TrendType;
  seasonality?: SeasonalityType;
  parameters?: ForecastParameters;
}

class LoadDataDto {
  forecastType: ForecastType;
  data: Array<{
    date: string;
    value: number;
    category?: string;
  }>;
}

class CreateScenarioDto {
  name: string;
  description?: string;
  baseModelId: string;
  adjustments: ScenarioAdjustment[];
}

class QuickForecastDto {
  months?: number;
}

class CreateAlertRuleDto {
  name: string;
  description?: string;
  metric: ForecastType;
  condition: 'above' | 'below' | 'deviation' | 'trend_change';
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMinutes: number;
  notificationChannels: ('email' | 'sms' | 'webhook' | 'dashboard')[];
}

class MonteCarloDto {
  simulations?: number;
}

class BacktestDto {
  periods?: number;
}

@Controller('forecasting')
@UseGuards(JwtAuthGuard)
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingService) {}

  // =================== MODEL MANAGEMENT ===================

  @Post('models')
  async createModel(@Request() req: any, @Body() dto: CreateModelDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.createModel(tenantId, dto);
  }

  @Get('models')
  async getModels(
    @Request() req: any,
    @Query('forecastType') forecastType?: ForecastType,
    @Query('status') status?: ForecastStatus,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getModels(tenantId, { forecastType, status });
  }

  @Get('models/:id')
  async getModel(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getModel(tenantId, id);
  }

  @Put('models/:id')
  async updateModel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateModelDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.updateModel(tenantId, id, dto);
  }

  @Delete('models/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteModel(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    await this.forecastingService.deleteModel(tenantId, id);
  }

  // =================== DATA MANAGEMENT ===================

  @Post('data')
  async loadData(@Request() req: any, @Body() dto: LoadDataDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const data: TimeSeriesData[] = dto.data.map(d => ({
      date: new Date(d.date),
      value: d.value,
      category: d.category,
    }));
    return this.forecastingService.loadHistoricalData(
      tenantId,
      dto.forecastType,
      data,
    );
  }

  @Get('data')
  async getData(
    @Request() req: any,
    @Query('forecastType') forecastType: ForecastType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getHistoricalData(
      tenantId,
      forecastType,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // =================== FORECASTING ===================

  @Post('run/:modelId')
  async runForecast(@Request() req: any, @Param('modelId') modelId: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.runForecast(tenantId, modelId);
  }

  @Get('results')
  async getResults(
    @Request() req: any,
    @Query('modelId') modelId?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getResults(tenantId, modelId);
  }

  @Get('results/:id')
  async getResult(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getResult(tenantId, id);
  }

  // =================== QUICK FORECASTS ===================

  @Post('quick/revenue')
  async quickForecastRevenue(
    @Request() req: any,
    @Body() dto?: QuickForecastDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.quickForecastRevenue(
      tenantId,
      dto?.months || 12,
    );
  }

  @Post('quick/expense')
  async quickForecastExpense(
    @Request() req: any,
    @Body() dto?: QuickForecastDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.quickForecastExpense(
      tenantId,
      dto?.months || 12,
    );
  }

  @Post('quick/cash-flow')
  async quickForecastCashFlow(
    @Request() req: any,
    @Body() dto?: QuickForecastDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.quickForecastCashFlow(
      tenantId,
      dto?.months || 12,
    );
  }

  // =================== SCENARIOS ===================

  @Post('scenarios')
  async createScenario(@Request() req: any, @Body() dto: CreateScenarioDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.createScenario(tenantId, dto);
  }

  @Get('scenarios')
  async getScenarios(
    @Request() req: any,
    @Query('modelId') modelId?: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getScenarios(tenantId, modelId);
  }

  @Post('scenarios/:id/run')
  async runScenario(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.runScenario(tenantId, id);
  }

  // =================== ANALYTICS & INSIGHTS ===================

  @Get('insights/trend')
  async getTrendInsights(
    @Request() req: any,
    @Query('forecastType') forecastType: ForecastType,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getTrendInsights(tenantId, forecastType);
  }

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getForecastDashboard(tenantId);
  }

  // =================== ADVANCED ANALYTICS V2 ENDPOINTS ===================

  @Get('dashboard/advanced')
  async getAdvancedDashboard(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getAdvancedDashboard(tenantId);
  }

  @Get('decompose/:forecastType')
  async decomposeProphet(
    @Request() req: any,
    @Param('forecastType') forecastType: ForecastType,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.decomposeProphet(tenantId, forecastType);
  }

  @Post('monte-carlo/:modelId')
  async runMonteCarloForecast(
    @Request() req: any,
    @Param('modelId') modelId: string,
    @Body() dto?: MonteCarloDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.runMonteCarloForecast(
      tenantId,
      modelId,
      dto?.simulations || 1000,
    );
  }

  @Get('auto-select/:forecastType')
  async autoSelectModel(
    @Request() req: any,
    @Param('forecastType') forecastType: ForecastType,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.autoSelectModel(tenantId, forecastType);
  }

  @Post('backtest/:modelId')
  async backtestForecast(
    @Request() req: any,
    @Param('modelId') modelId: string,
    @Body() dto?: BacktestDto,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.backtestForecast(
      tenantId,
      modelId,
      dto?.periods || 6,
    );
  }

  // =================== ALERT MANAGEMENT ===================

  @Post('alerts/rules')
  async createAlertRule(@Request() req: any, @Body() dto: CreateAlertRuleDto) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.createAlertRule(tenantId, dto);
  }

  @Get('alerts/rules')
  async getAlertRules(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getAlertRules(tenantId);
  }

  @Put('alerts/rules/:id')
  async updateAlertRule(
    @Request() req: any,
    @Param('id') ruleId: string,
    @Body() dto: Partial<CreateAlertRuleDto>,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.updateAlertRule(tenantId, ruleId, dto);
  }

  @Post('alerts/check')
  async checkAlerts(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.checkAlerts(tenantId);
  }

  @Get('alerts')
  async getAlerts(
    @Request() req: any,
    @Query('acknowledged') acknowledged?: string,
    @Query('severity') severity?: AlertSeverity,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getAlerts(tenantId, {
      acknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined,
      severity,
    });
  }

  @Get('alerts/summary')
  async getAlertSummary(@Request() req: any) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    return this.forecastingService.getAlertSummary(tenantId);
  }

  @Post('alerts/:id/acknowledge')
  async acknowledgeAlert(
    @Request() req: any,
    @Param('id') alertId: string,
  ) {
    const tenantId = req.user?.sub || req.user?.id || 'default';
    const userId = req.user?.sub || req.user?.id || 'unknown';
    return this.forecastingService.acknowledgeAlert(tenantId, alertId, userId);
  }
}
