import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  KPIMetricsService,
  MetricType,
  KPIFormula,
  KPIDataSource,
  KPITarget,
  KPIThreshold,
  TrackingConfig,
  DisplayConfig,
  DashboardKPI,
  AlertCondition,
  ComparisonPeriod,
} from './kpi-metrics.service';

@ApiTags('Business Intelligence - KPI Metrics')
@Controller('bi/kpis')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KPIMetricsController {
  constructor(private readonly kpiService: KPIMetricsService) {}

  // =================== KPI DEFINITIONS ===================

  @Post()
  @ApiOperation({ summary: 'Create KPI' })
  @ApiResponse({ status: 201, description: 'KPI created' })
  async createKPI(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      category: string;
      type: MetricType;
      unit?: string;
      currency?: string;
      formula?: KPIFormula;
      dataSource: KPIDataSource;
      targets?: Omit<KPITarget, 'id'>[];
      thresholds: KPIThreshold[];
      tracking: TrackingConfig;
      display: DisplayConfig;
    },
  ) {
    return this.kpiService.createKPI({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get KPIs' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'KPIs list' })
  async getKPIs(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('type') type?: MetricType,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const kpis = await this.kpiService.getKPIs(req.user.tenantId, {
      category,
      type,
      isActive: isActive ? isActive === 'true' : undefined,
      search,
    });
    return { kpis, total: kpis.length };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get KPI categories' })
  @ApiResponse({ status: 200, description: 'Categories list' })
  async getCategories(@Request() req: any) {
    const categories = await this.kpiService.getCategories(req.user.tenantId);
    return { categories };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get KPI stats' })
  @ApiResponse({ status: 200, description: 'KPI statistics' })
  async getStats(@Request() req: any) {
    return this.kpiService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get KPI details' })
  @ApiResponse({ status: 200, description: 'KPI details' })
  async getKPI(@Param('id') id: string) {
    const kpi = await this.kpiService.getKPI(id);
    if (!kpi) {
      return { error: 'KPI not found' };
    }
    return kpi;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update KPI' })
  @ApiResponse({ status: 200, description: 'KPI updated' })
  async updateKPI(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      category: string;
      type: MetricType;
      unit: string;
      currency: string;
      formula: KPIFormula;
      dataSource: KPIDataSource;
      thresholds: KPIThreshold[];
      tracking: TrackingConfig;
      display: DisplayConfig;
      isActive: boolean;
    }>,
  ) {
    const kpi = await this.kpiService.updateKPI(id, body);
    if (!kpi) {
      return { error: 'KPI not found' };
    }
    return kpi;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete KPI' })
  @ApiResponse({ status: 200, description: 'KPI deleted' })
  async deleteKPI(@Param('id') id: string) {
    await this.kpiService.deleteKPI(id);
    return { success: true };
  }

  // =================== TARGETS ===================

  @Post(':id/targets')
  @ApiOperation({ summary: 'Add target to KPI' })
  @ApiResponse({ status: 201, description: 'Target added' })
  async addTarget(
    @Param('id') id: string,
    @Body() target: Omit<KPITarget, 'id'>,
  ) {
    const kpi = await this.kpiService.addTarget(id, target);
    if (!kpi) {
      return { error: 'KPI not found' };
    }
    return kpi;
  }

  @Put(':id/targets/:targetId')
  @ApiOperation({ summary: 'Update target' })
  @ApiResponse({ status: 200, description: 'Target updated' })
  async updateTarget(
    @Param('id') id: string,
    @Param('targetId') targetId: string,
    @Body() updates: Partial<KPITarget>,
  ) {
    const kpi = await this.kpiService.updateTarget(id, targetId, updates);
    if (!kpi) {
      return { error: 'KPI or target not found' };
    }
    return kpi;
  }

  @Delete(':id/targets/:targetId')
  @ApiOperation({ summary: 'Remove target' })
  @ApiResponse({ status: 200, description: 'Target removed' })
  async removeTarget(
    @Param('id') id: string,
    @Param('targetId') targetId: string,
  ) {
    const kpi = await this.kpiService.removeTarget(id, targetId);
    if (!kpi) {
      return { error: 'KPI not found' };
    }
    return kpi;
  }

  // =================== VALUES ===================

  @Post(':id/values')
  @ApiOperation({ summary: 'Record KPI value' })
  @ApiResponse({ status: 201, description: 'Value recorded' })
  async recordValue(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      value: number;
      timestamp?: string;
      periodStart?: string;
      periodEnd?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.kpiService.recordValue({
      kpiId: id,
      tenantId: req.user.tenantId,
      value: body.value,
      timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
      periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      metadata: body.metadata,
    });
  }

  @Get(':id/values')
  @ApiOperation({ summary: 'Get KPI values' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'KPI values' })
  async getValues(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const values = await this.kpiService.getValues(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { values, total: values.length };
  }

  @Get(':id/latest')
  @ApiOperation({ summary: 'Get latest KPI value' })
  @ApiResponse({ status: 200, description: 'Latest value' })
  async getLatestValue(@Param('id') id: string) {
    const value = await this.kpiService.getLatestValue(id);
    if (!value) {
      return { value: null };
    }
    return { value };
  }

  // =================== SNAPSHOTS ===================

  @Get(':id/snapshot')
  @ApiOperation({ summary: 'Get KPI snapshot' })
  @ApiQuery({ name: 'comparisonPeriod', required: false })
  @ApiResponse({ status: 200, description: 'KPI snapshot' })
  async getSnapshot(
    @Param('id') id: string,
    @Query('comparisonPeriod') comparisonPeriod?: ComparisonPeriod,
  ) {
    const snapshot = await this.kpiService.getSnapshot(id, comparisonPeriod);
    if (!snapshot) {
      return { error: 'KPI not found' };
    }
    return snapshot;
  }

  @Post('snapshots/bulk')
  @ApiOperation({ summary: 'Get bulk KPI snapshots' })
  @ApiResponse({ status: 200, description: 'KPI snapshots' })
  async getBulkSnapshots(@Body() body: { kpiIds: string[] }) {
    const snapshots = await this.kpiService.getBulkSnapshots(body.kpiIds);
    return { snapshots: Object.fromEntries(snapshots) };
  }

  // =================== ANALYTICS ===================

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get KPI analytics' })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'KPI analytics' })
  async getAnalytics(
    @Param('id') id: string,
    @Query('period') period?: 'day' | 'week' | 'month' | 'quarter' | 'year',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.kpiService.getKPIAnalytics(id, {
      period: period || 'month',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare KPIs' })
  @ApiQuery({ name: 'period', required: false })
  @ApiResponse({ status: 200, description: 'KPI comparison' })
  async compareKPIs(
    @Body() body: { kpiIds: string[] },
    @Query('period') period?: ComparisonPeriod,
  ) {
    return this.kpiService.compareKPIs(body.kpiIds, period);
  }

  // =================== DASHBOARDS ===================

  @Post('dashboards')
  @ApiOperation({ summary: 'Create KPI dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created' })
  async createDashboard(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      kpis: DashboardKPI[];
      layout?: 'grid' | 'list' | 'cards';
      refreshInterval?: number;
      isDefault?: boolean;
    },
  ) {
    return this.kpiService.createDashboard({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('dashboards')
  @ApiOperation({ summary: 'Get KPI dashboards' })
  @ApiResponse({ status: 200, description: 'Dashboards list' })
  async getDashboards(@Request() req: any) {
    const dashboards = await this.kpiService.getDashboards(req.user.tenantId);
    return { dashboards, total: dashboards.length };
  }

  @Get('dashboards/:id')
  @ApiOperation({ summary: 'Get KPI dashboard details' })
  @ApiResponse({ status: 200, description: 'Dashboard details' })
  async getDashboard(@Param('id') id: string) {
    const dashboard = await this.kpiService.getDashboard(id);
    if (!dashboard) {
      return { error: 'Dashboard not found' };
    }
    return dashboard;
  }

  @Get('dashboards/:id/full')
  @ApiOperation({ summary: 'Get dashboard with snapshots' })
  @ApiResponse({ status: 200, description: 'Dashboard with KPI snapshots' })
  async getDashboardWithSnapshots(@Param('id') id: string) {
    const result = await this.kpiService.getDashboardWithSnapshots(id);
    if (!result) {
      return { error: 'Dashboard not found' };
    }
    return {
      dashboard: result.dashboard,
      snapshots: Object.fromEntries(result.snapshots),
    };
  }

  @Put('dashboards/:id')
  @ApiOperation({ summary: 'Update KPI dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard updated' })
  async updateDashboard(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      kpis: DashboardKPI[];
      layout: 'grid' | 'list' | 'cards';
      refreshInterval: number;
      isDefault: boolean;
    }>,
  ) {
    const dashboard = await this.kpiService.updateDashboard(id, body);
    if (!dashboard) {
      return { error: 'Dashboard not found' };
    }
    return dashboard;
  }

  @Delete('dashboards/:id')
  @ApiOperation({ summary: 'Delete KPI dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted' })
  async deleteDashboard(@Param('id') id: string) {
    await this.kpiService.deleteDashboard(id);
    return { success: true };
  }

  // =================== ALERTS ===================

  @Post(':id/alerts')
  @ApiOperation({ summary: 'Create KPI alert' })
  @ApiResponse({ status: 201, description: 'Alert created' })
  async createAlert(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      type: 'threshold' | 'target' | 'anomaly' | 'trend';
      condition: AlertCondition;
      recipients: string[];
      channels: ('email' | 'sms' | 'push' | 'webhook')[];
      message?: string;
    },
  ) {
    return this.kpiService.createAlert({
      kpiId: id,
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get(':id/alerts')
  @ApiOperation({ summary: 'Get KPI alerts' })
  @ApiResponse({ status: 200, description: 'Alerts list' })
  async getAlerts(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const alerts = await this.kpiService.getAlerts(req.user.tenantId, id);
    return { alerts, total: alerts.length };
  }

  @Put('alerts/:alertId')
  @ApiOperation({ summary: 'Update alert' })
  @ApiResponse({ status: 200, description: 'Alert updated' })
  async updateAlert(
    @Param('alertId') alertId: string,
    @Body() body: Partial<{
      condition: AlertCondition;
      recipients: string[];
      channels: ('email' | 'sms' | 'push' | 'webhook')[];
      message: string;
      isActive: boolean;
    }>,
  ) {
    const alert = await this.kpiService.updateAlert(alertId, body);
    if (!alert) {
      return { error: 'Alert not found' };
    }
    return alert;
  }

  @Delete('alerts/:alertId')
  @ApiOperation({ summary: 'Delete alert' })
  @ApiResponse({ status: 200, description: 'Alert deleted' })
  async deleteAlert(@Param('alertId') alertId: string) {
    await this.kpiService.deleteAlert(alertId);
    return { success: true };
  }
}
