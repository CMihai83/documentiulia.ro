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
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  WarehouseAnalyticsService,
  InventoryKPI,
  InventorySnapshot,
  StockAging,
  ABCAnalysis,
  TurnoverAnalysis,
  DemandForecast,
  WarehouseAlert,
  ScheduledReport,
  CreateScheduledReportDto,
  GenerateReportDto,
  ReportType,
  AlertType,
  AlertSeverity,
} from './warehouse-analytics.service';

@ApiTags('Warehouse Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse-analytics')
export class WarehouseAnalyticsController {
  constructor(private readonly analyticsService: WarehouseAnalyticsService) {}

  @Get(':warehouseId/kpis')
  @ApiOperation({ summary: 'Get warehouse KPIs dashboard' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KPI data',
  })
  async getWarehouseKPIs(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
  ): Promise<InventoryKPI> {
    return this.analyticsService.getWarehouseKPIs(req.user.tenantId, warehouseId);
  }

  @Get(':warehouseId/kpis/history')
  @ApiOperation({ summary: 'Get KPI history' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KPI history',
  })
  async getKPIHistory(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<InventoryKPI[]> {
    return this.analyticsService.getKPIHistory(
      req.user.tenantId,
      warehouseId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Post(':warehouseId/snapshot')
  @ApiOperation({ summary: 'Generate inventory snapshot' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Snapshot generated',
  })
  async generateSnapshot(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
  ): Promise<InventorySnapshot> {
    return this.analyticsService.generateInventorySnapshot(
      req.user.tenantId,
      warehouseId,
    );
  }

  @Get('snapshots/:snapshotId')
  @ApiOperation({ summary: 'Get inventory snapshot' })
  @ApiParam({ name: 'snapshotId', description: 'Snapshot ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Snapshot data',
  })
  async getSnapshot(
    @Request() req: any,
    @Param('snapshotId') snapshotId: string,
  ): Promise<InventorySnapshot> {
    return this.analyticsService.getInventorySnapshot(
      req.user.tenantId,
      snapshotId,
    );
  }

  @Get(':warehouseId/stock-aging')
  @ApiOperation({ summary: 'Get stock aging report' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'expiryWarningDays', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stock aging report',
  })
  async getStockAging(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('expiryWarningDays') expiryWarningDays?: number,
  ): Promise<StockAging> {
    return this.analyticsService.generateStockAgingReport(
      req.user.tenantId,
      warehouseId,
      expiryWarningDays,
    );
  }

  @Get(':warehouseId/abc-analysis')
  @ApiOperation({ summary: 'Get ABC analysis' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({
    name: 'criteria',
    enum: ['value', 'velocity', 'revenue'],
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'ABC analysis',
  })
  async getABCAnalysis(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('criteria') criteria?: 'value' | 'velocity' | 'revenue',
  ): Promise<ABCAnalysis> {
    return this.analyticsService.generateABCAnalysis(
      req.user.tenantId,
      warehouseId,
      criteria,
    );
  }

  @Get(':warehouseId/turnover')
  @ApiOperation({ summary: 'Get turnover analysis' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Turnover analysis',
  })
  async getTurnoverAnalysis(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<TurnoverAnalysis> {
    return this.analyticsService.generateTurnoverAnalysis(
      req.user.tenantId,
      warehouseId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Get(':warehouseId/demand-forecast')
  @ApiOperation({ summary: 'Get demand forecast' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiQuery({ name: 'horizonDays', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Demand forecast',
  })
  async getDemandForecast(
    @Request() req: any,
    @Param('warehouseId') warehouseId: string,
    @Query('horizonDays') horizonDays?: number,
  ): Promise<DemandForecast> {
    return this.analyticsService.generateDemandForecast(
      req.user.tenantId,
      warehouseId,
      horizonDays,
    );
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report generated',
  })
  async generateReport(
    @Request() req: any,
    @Body() dto: GenerateReportDto,
  ): Promise<{ reportId: string; data: any; generatedAt: Date }> {
    return this.analyticsService.generateReport(req.user.tenantId, dto);
  }
}

@ApiTags('Warehouse Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse-alerts')
export class WarehouseAlertsController {
  constructor(private readonly analyticsService: WarehouseAnalyticsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a warehouse alert' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Alert created',
  })
  async createAlert(
    @Request() req: any,
    @Body()
    dto: {
      warehouseId: string;
      warehouseName: string;
      type: AlertType;
      severity: AlertSeverity;
      title: string;
      message: string;
      metadata?: Record<string, any>;
    },
  ): Promise<WarehouseAlert> {
    return this.analyticsService.createAlert(
      req.user.tenantId,
      dto.warehouseId,
      dto.warehouseName,
      dto.type,
      dto.severity,
      dto.title,
      dto.message,
      dto.metadata,
    );
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert acknowledged',
  })
  async acknowledgeAlert(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<WarehouseAlert> {
    return this.analyticsService.acknowledgeAlert(
      req.user.tenantId,
      id,
      req.user.userId,
    );
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert resolved',
  })
  async resolveAlert(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<WarehouseAlert> {
    return this.analyticsService.resolveAlert(req.user.tenantId, id);
  }

  @Get()
  @ApiOperation({ summary: 'List alerts' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiQuery({ name: 'type', enum: AlertType, required: false })
  @ApiQuery({ name: 'severity', enum: AlertSeverity, required: false })
  @ApiQuery({ name: 'acknowledged', type: Boolean, required: false })
  @ApiQuery({ name: 'resolved', type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of alerts',
  })
  async listAlerts(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: AlertType,
    @Query('severity') severity?: AlertSeverity,
    @Query('acknowledged') acknowledged?: boolean,
    @Query('resolved') resolved?: boolean,
  ): Promise<WarehouseAlert[]> {
    return this.analyticsService.listAlerts(req.user.tenantId, {
      warehouseId,
      type,
      severity,
      acknowledged,
      resolved,
    });
  }

  @Get('count')
  @ApiOperation({ summary: 'Get active alert count' })
  @ApiQuery({ name: 'warehouseId', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert count',
  })
  async getAlertCount(
    @Request() req: any,
    @Query('warehouseId') warehouseId?: string,
  ): Promise<{ total: number; bySeverity: Record<AlertSeverity, number> }> {
    return this.analyticsService.getActiveAlertCount(
      req.user.tenantId,
      warehouseId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert details' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert details',
  })
  async getAlert(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<WarehouseAlert> {
    return this.analyticsService.getAlert(req.user.tenantId, id);
  }
}

@ApiTags('Scheduled Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scheduled-reports')
export class ScheduledReportsController {
  constructor(private readonly analyticsService: WarehouseAnalyticsService) {}

  @Post()
  @ApiOperation({ summary: 'Create scheduled report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Scheduled report created',
  })
  async createScheduledReport(
    @Request() req: any,
    @Body() dto: CreateScheduledReportDto,
  ): Promise<ScheduledReport> {
    return this.analyticsService.createScheduledReport(req.user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update scheduled report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report updated',
  })
  async updateScheduledReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateScheduledReportDto>,
  ): Promise<ScheduledReport> {
    return this.analyticsService.updateScheduledReport(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle scheduled report active status' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report toggled',
  })
  async toggleScheduledReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<ScheduledReport> {
    return this.analyticsService.toggleScheduledReport(
      req.user.tenantId,
      id,
      isActive,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List scheduled reports' })
  @ApiQuery({ name: 'reportType', enum: ReportType, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of scheduled reports',
  })
  async listScheduledReports(
    @Request() req: any,
    @Query('reportType') reportType?: ReportType,
    @Query('isActive') isActive?: boolean,
  ): Promise<ScheduledReport[]> {
    return this.analyticsService.listScheduledReports(req.user.tenantId, {
      reportType,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scheduled report details' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report details',
  })
  async getScheduledReport(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<ScheduledReport> {
    return this.analyticsService.getScheduledReport(req.user.tenantId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete scheduled report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report deleted',
  })
  async deleteScheduledReport(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    return this.analyticsService.deleteScheduledReport(req.user.tenantId, id);
  }
}
