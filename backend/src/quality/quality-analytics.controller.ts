import {
  Controller,
  Get,
  Post,
  Put,
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
  QualityAnalyticsService,
  QualityKPI,
  QualityDashboard,
  QualityReport,
  ScheduledReport,
  QualityAlert,
  TrendAnalysis,
  ReportType,
  ReportFrequency,
  AlertSeverity,
  KPIType,
  CreateDashboardDto,
  GenerateReportDto,
  ScheduleReportDto,
  CreateAlertDto,
} from './quality-analytics.service';

@ApiTags('Quality KPIs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality-kpis')
export class QualityKPIsController {
  constructor(private readonly analyticsService: QualityAnalyticsService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate KPIs for a period' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KPIs calculated',
  })
  async calculateKPIs(
    @Request() req: any,
    @Body('period') period: string,
  ): Promise<QualityKPI[]> {
    return this.analyticsService.calculateKPIs(req.user.tenantId, period);
  }

  @Get()
  @ApiOperation({ summary: 'Get KPIs' })
  @ApiQuery({ name: 'period', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of KPIs',
  })
  async getKPIs(
    @Request() req: any,
    @Query('period') period?: string,
  ): Promise<QualityKPI[]> {
    return this.analyticsService.getKPIs(req.user.tenantId, period);
  }
}

@ApiTags('Quality Dashboards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality-dashboards')
export class QualityDashboardsController {
  constructor(private readonly analyticsService: QualityAnalyticsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a dashboard' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Dashboard created',
  })
  async createDashboard(
    @Request() req: any,
    @Body() dto: CreateDashboardDto,
  ): Promise<QualityDashboard> {
    return this.analyticsService.createDashboard(req.user.tenantId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard updated',
  })
  async updateDashboard(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateDashboardDto>,
  ): Promise<QualityDashboard> {
    return this.analyticsService.updateDashboard(req.user.tenantId, id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List dashboards' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of dashboards',
  })
  async listDashboards(
    @Request() req: any,
    @Query('userId') userId?: string,
  ): Promise<QualityDashboard[]> {
    return this.analyticsService.listDashboards(req.user.tenantId, userId);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default dashboard' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default dashboard',
  })
  async getDefaultDashboard(@Request() req: any): Promise<QualityDashboard | null> {
    return this.analyticsService.getDefaultDashboard(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dashboard details' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard details',
  })
  async getDashboard(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityDashboard> {
    return this.analyticsService.getDashboard(req.user.tenantId, id);
  }
}

@ApiTags('Quality Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality-reports')
export class QualityReportsController {
  constructor(private readonly analyticsService: QualityAnalyticsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report generated',
  })
  async generateReport(
    @Request() req: any,
    @Body() dto: GenerateReportDto,
  ): Promise<QualityReport> {
    return this.analyticsService.generateReport(req.user.tenantId, dto);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report scheduled',
  })
  async scheduleReport(
    @Request() req: any,
    @Body() dto: ScheduleReportDto,
  ): Promise<ScheduledReport> {
    return this.analyticsService.scheduleReport(req.user.tenantId, dto);
  }

  @Put('scheduled/:id/toggle')
  @ApiOperation({ summary: 'Toggle scheduled report' })
  @ApiParam({ name: 'id', description: 'Scheduled Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled report toggled',
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
  @ApiOperation({ summary: 'List reports' })
  @ApiQuery({ name: 'type', enum: ReportType, required: false })
  @ApiQuery({ name: 'dateFrom', type: Date, required: false })
  @ApiQuery({ name: 'dateTo', type: Date, required: false })
  @ApiQuery({ name: 'generatedBy', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of reports',
  })
  async listReports(
    @Request() req: any,
    @Query('type') type?: ReportType,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('generatedBy') generatedBy?: string,
  ): Promise<QualityReport[]> {
    return this.analyticsService.listReports(req.user.tenantId, {
      type,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      generatedBy,
    });
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'List scheduled reports' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of scheduled reports',
  })
  async listScheduledReports(@Request() req: any): Promise<ScheduledReport[]> {
    return this.analyticsService.listScheduledReports(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report details' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report details',
  })
  async getReport(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityReport> {
    return this.analyticsService.getReport(req.user.tenantId, id);
  }
}

@ApiTags('Quality Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality-alerts')
export class QualityAlertsController {
  constructor(private readonly analyticsService: QualityAnalyticsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an alert' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Alert created',
  })
  async createAlert(
    @Request() req: any,
    @Body() dto: CreateAlertDto,
  ): Promise<QualityAlert> {
    return this.analyticsService.createAlert(req.user.tenantId, dto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark alert as read' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert marked as read',
  })
  async markAlertRead(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityAlert> {
    return this.analyticsService.markAlertRead(req.user.tenantId, id, req.user.userId);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert acknowledged',
  })
  async acknowledgeAlert(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<QualityAlert> {
    return this.analyticsService.acknowledgeAlert(
      req.user.tenantId,
      id,
      req.user.userId,
      req.user.userName || 'User',
    );
  }

  @Get()
  @ApiOperation({ summary: 'List alerts' })
  @ApiQuery({ name: 'severity', enum: AlertSeverity, required: false })
  @ApiQuery({ name: 'isRead', type: Boolean, required: false })
  @ApiQuery({ name: 'isAcknowledged', type: Boolean, required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of alerts',
  })
  async listAlerts(
    @Request() req: any,
    @Query('severity') severity?: AlertSeverity,
    @Query('isRead') isRead?: boolean,
    @Query('isAcknowledged') isAcknowledged?: boolean,
    @Query('type') type?: string,
  ): Promise<QualityAlert[]> {
    return this.analyticsService.listAlerts(req.user.tenantId, {
      severity,
      isRead,
      isAcknowledged,
      type,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread alert count' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Unread alert count',
  })
  async getUnreadAlertCount(@Request() req: any): Promise<{ count: number }> {
    const count = await this.analyticsService.getUnreadAlertCount(req.user.tenantId);
    return { count };
  }
}

@ApiTags('Quality Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quality-analytics')
export class QualityAnalyticsController {
  constructor(private readonly analyticsService: QualityAnalyticsService) {}

  @Get('trend/:metric')
  @ApiOperation({ summary: 'Analyze trend for a metric' })
  @ApiParam({ name: 'metric', enum: KPIType })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trend analysis',
  })
  async analyzeTrend(
    @Request() req: any,
    @Param('metric') metric: KPIType,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<TrendAnalysis> {
    return this.analyticsService.analyzeTrend(
      req.user.tenantId,
      metric,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  @Get('cost-of-quality')
  @ApiOperation({ summary: 'Calculate cost of quality' })
  @ApiQuery({ name: 'dateFrom', type: Date, required: true })
  @ApiQuery({ name: 'dateTo', type: Date, required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cost of quality analysis',
  })
  async calculateCostOfQuality(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<any> {
    return this.analyticsService.calculateCostOfQuality(
      req.user.tenantId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}
