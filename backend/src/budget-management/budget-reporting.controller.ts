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
  BudgetReportingService,
  ReportType,
  ReportFormat,
  ReportFilters,
  ChartConfig,
  ReportSchedule,
  DashboardWidget,
} from './budget-reporting.service';

@ApiTags('Budget Management - Reporting')
@Controller('budgets/reporting')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetReportingController {
  constructor(private readonly reportingService: BudgetReportingService) {}

  // =================== REPORT DEFINITIONS ===================

  @Post('definitions')
  @ApiOperation({ summary: 'Create report definition' })
  @ApiResponse({ status: 201, description: 'Report definition created' })
  async createReportDefinition(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: ReportType;
      filters: ReportFilters;
      columns?: string[];
      groupBy?: string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      charts?: ChartConfig[];
      schedule?: ReportSchedule;
      recipients?: string[];
    },
  ) {
    return this.reportingService.createReportDefinition({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('definitions')
  @ApiOperation({ summary: 'Get report definitions' })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'Report definitions list' })
  async getReportDefinitions(
    @Request() req: any,
    @Query('type') type?: ReportType,
  ) {
    const definitions = await this.reportingService.getReportDefinitions(
      req.user.tenantId,
      type,
    );
    return { definitions, total: definitions.length };
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get report definition by ID' })
  @ApiResponse({ status: 200, description: 'Report definition details' })
  async getReportDefinition(@Param('id') id: string) {
    const definition = await this.reportingService.getReportDefinition(id);
    if (!definition) {
      return { error: 'Report definition not found' };
    }
    return definition;
  }

  @Put('definitions/:id')
  @ApiOperation({ summary: 'Update report definition' })
  @ApiResponse({ status: 200, description: 'Report definition updated' })
  async updateReportDefinition(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      filters?: ReportFilters;
      columns?: string[];
      charts?: ChartConfig[];
      schedule?: ReportSchedule;
      recipients?: string[];
      isActive?: boolean;
    },
  ) {
    const definition = await this.reportingService.updateReportDefinition(id, body);
    if (!definition) {
      return { error: 'Report definition not found' };
    }
    return definition;
  }

  @Delete('definitions/:id')
  @ApiOperation({ summary: 'Delete report definition' })
  @ApiResponse({ status: 200, description: 'Report definition deleted' })
  async deleteReportDefinition(@Param('id') id: string) {
    const success = await this.reportingService.deleteReportDefinition(id);
    if (!success) {
      return { error: 'Report definition not found' };
    }
    return { success };
  }

  // =================== REPORT GENERATION ===================

  @Post('generate')
  @ApiOperation({ summary: 'Generate report' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateReport(
    @Request() req: any,
    @Body() body: {
      definitionId?: string;
      type?: ReportType;
      filters?: ReportFilters;
      format?: ReportFormat;
    },
  ) {
    return this.reportingService.generateReport({
      tenantId: req.user.tenantId,
      definitionId: body.definitionId,
      type: body.type,
      filters: body.filters,
      format: body.format,
      generatedBy: req.user.id,
    });
  }

  @Post('generate/:definitionId')
  @ApiOperation({ summary: 'Generate report from definition' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateReportFromDefinition(
    @Request() req: any,
    @Param('definitionId') definitionId: string,
    @Body() body: { format?: ReportFormat },
  ) {
    return this.reportingService.generateReport({
      tenantId: req.user.tenantId,
      definitionId,
      format: body.format,
      generatedBy: req.user.id,
    });
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get generated reports' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Generated reports list' })
  async getGeneratedReports(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const reports = await this.reportingService.getGeneratedReports(
      req.user.tenantId,
      limit ? parseInt(limit) : undefined,
    );
    return { reports, total: reports.length };
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get generated report by ID' })
  @ApiResponse({ status: 200, description: 'Generated report details' })
  async getGeneratedReport(@Param('id') id: string) {
    const report = await this.reportingService.getGeneratedReport(id);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  // =================== QUICK REPORTS ===================

  @Get('quick/budget-summary')
  @ApiOperation({ summary: 'Quick budget summary report' })
  @ApiQuery({ name: 'fiscalYear', required: false })
  @ApiResponse({ status: 200, description: 'Budget summary' })
  async quickBudgetSummary(
    @Request() req: any,
    @Query('fiscalYear') fiscalYear?: string,
  ) {
    return this.reportingService.generateReport({
      tenantId: req.user.tenantId,
      type: 'budget_summary',
      filters: { fiscalYear },
      generatedBy: req.user.id,
    });
  }

  @Get('quick/budget-vs-actual')
  @ApiOperation({ summary: 'Quick budget vs actual report' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiResponse({ status: 200, description: 'Budget vs actual' })
  async quickBudgetVsActual(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
  ) {
    return this.reportingService.generateReport({
      tenantId: req.user.tenantId,
      type: 'budget_vs_actual',
      filters: { budgetIds: budgetId ? [budgetId] : undefined },
      generatedBy: req.user.id,
    });
  }

  @Get('quick/spending-by-category')
  @ApiOperation({ summary: 'Quick spending by category report' })
  @ApiResponse({ status: 200, description: 'Spending by category' })
  async quickSpendingByCategory(@Request() req: any) {
    return this.reportingService.generateReport({
      tenantId: req.user.tenantId,
      type: 'spending_by_category',
      generatedBy: req.user.id,
    });
  }

  @Get('quick/spending-by-department')
  @ApiOperation({ summary: 'Quick spending by department report' })
  @ApiResponse({ status: 200, description: 'Spending by department' })
  async quickSpendingByDepartment(@Request() req: any) {
    return this.reportingService.generateReport({
      tenantId: req.user.tenantId,
      type: 'spending_by_department',
      generatedBy: req.user.id,
    });
  }

  // =================== DASHBOARDS ===================

  @Post('dashboards')
  @ApiOperation({ summary: 'Create dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created' })
  async createDashboard(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      widgets: Omit<DashboardWidget, 'id' | 'tenantId'>[];
      isDefault?: boolean;
      isShared?: boolean;
      sharedWith?: string[];
    },
  ) {
    return this.reportingService.createDashboard({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('dashboards')
  @ApiOperation({ summary: 'Get dashboards' })
  @ApiResponse({ status: 200, description: 'Dashboards list' })
  async getDashboards(@Request() req: any) {
    const dashboards = await this.reportingService.getDashboards(
      req.user.tenantId,
      req.user.id,
    );
    return { dashboards, total: dashboards.length };
  }

  @Get('dashboards/default')
  @ApiOperation({ summary: 'Get default dashboard' })
  @ApiResponse({ status: 200, description: 'Default dashboard' })
  async getDefaultDashboard(@Request() req: any) {
    const dashboard = await this.reportingService.getDefaultDashboard(req.user.tenantId);
    if (!dashboard) {
      return { error: 'No default dashboard found' };
    }
    return dashboard;
  }

  @Get('dashboards/:id')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  @ApiResponse({ status: 200, description: 'Dashboard details' })
  async getDashboard(@Param('id') id: string) {
    const dashboard = await this.reportingService.getDashboard(id);
    if (!dashboard) {
      return { error: 'Dashboard not found' };
    }
    return dashboard;
  }

  @Put('dashboards/:id')
  @ApiOperation({ summary: 'Update dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard updated' })
  async updateDashboard(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      widgets?: DashboardWidget[];
      isDefault?: boolean;
      isShared?: boolean;
      sharedWith?: string[];
    },
  ) {
    const dashboard = await this.reportingService.updateDashboard(id, body);
    if (!dashboard) {
      return { error: 'Dashboard not found' };
    }
    return dashboard;
  }

  @Delete('dashboards/:id')
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted' })
  async deleteDashboard(@Param('id') id: string) {
    const success = await this.reportingService.deleteDashboard(id);
    if (!success) {
      return { error: 'Dashboard not found' };
    }
    return { success };
  }

  // =================== KPIs ===================

  @Get('kpis')
  @ApiOperation({ summary: 'Get budget KPIs' })
  @ApiResponse({ status: 200, description: 'Budget KPIs' })
  async getKPIs(@Request() req: any) {
    const kpis = await this.reportingService.getBudgetKPIs(req.user.tenantId);
    return { kpis, total: kpis.length };
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get reporting statistics' })
  @ApiResponse({ status: 200, description: 'Reporting statistics' })
  async getStatistics(@Request() req: any) {
    return this.reportingService.getReportingStatistics(req.user.tenantId);
  }
}
