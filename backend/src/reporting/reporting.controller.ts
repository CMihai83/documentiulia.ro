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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  ReportingService,
  ReportType,
  ReportFormat,
  ReportStatus,
  ReportFrequency,
  ReportColumn,
  ReportFilter,
} from './reporting.service';

@ApiTags('Reporting')
@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  // =================== TEMPLATES ===================

  @Get('templates')
  @ApiOperation({ summary: 'List report templates' })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async listTemplates(@Query('type') type?: ReportType) {
    return this.reportingService.listTemplates(type);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    return this.reportingService.getTemplate(id);
  }

  @Post('templates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create report template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      nameRo: string;
      type: ReportType;
      columns: ReportColumn[];
      description?: string;
      descriptionRo?: string;
      filters?: ReportFilter[];
      groupBy?: string[];
      sortBy?: { field: string; order: 'asc' | 'desc' }[];
      defaultFormat?: ReportFormat;
    },
  ) {
    return this.reportingService.createTemplate(
      body.name,
      body.nameRo,
      body.type,
      body.columns,
      req.user.sub,
      {
        description: body.description,
        descriptionRo: body.descriptionRo,
        filters: body.filters,
        groupBy: body.groupBy,
        sortBy: body.sortBy,
        defaultFormat: body.defaultFormat,
      },
    );
  }

  @Put('templates/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update report template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      nameRo?: string;
      description?: string;
      descriptionRo?: string;
      columns?: ReportColumn[];
      filters?: ReportFilter[];
      defaultFormat?: ReportFormat;
      isActive?: boolean;
    },
  ) {
    return this.reportingService.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete report template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('id') id: string) {
    const result = await this.reportingService.deleteTemplate(id);
    return { success: result };
  }

  // =================== REPORTS ===================

  @Get('reports')
  @ApiOperation({ summary: 'List generated reports' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async listReports(
    @Request() req: any,
    @Query('type') type?: ReportType,
    @Query('status') status?: ReportStatus,
    @Query('limit') limit?: string,
  ) {
    return this.reportingService.listReports({
      type,
      status,
      userId: req.user.sub,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get report details' })
  @ApiResponse({ status: 200, description: 'Report details' })
  async getReport(@Param('id') id: string) {
    return this.reportingService.getReport(id);
  }

  @Get('reports/:id/data')
  @ApiOperation({ summary: 'Get report data' })
  @ApiResponse({ status: 200, description: 'Report data' })
  async getReportData(@Param('id') id: string) {
    return this.reportingService.getReportData(id);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Generate a new report' })
  @ApiResponse({ status: 201, description: 'Report generation started' })
  async generateReport(
    @Request() req: any,
    @Body() body: {
      type: ReportType;
      format: ReportFormat;
      periodStart: string;
      periodEnd: string;
      name?: string;
      nameRo?: string;
      templateId?: string;
      filters?: ReportFilter[];
      parameters?: Record<string, any>;
    },
  ) {
    return this.reportingService.generateReport(
      body.type,
      body.format,
      {
        start: new Date(body.periodStart),
        end: new Date(body.periodEnd),
      },
      req.user.sub,
      {
        name: body.name,
        nameRo: body.nameRo,
        templateId: body.templateId,
        filters: body.filters,
        parameters: body.parameters,
      },
    );
  }

  @Post('reports/:id/cancel')
  @ApiOperation({ summary: 'Cancel report generation' })
  @ApiResponse({ status: 200, description: 'Report cancelled' })
  async cancelReport(@Param('id') id: string) {
    const result = await this.reportingService.cancelReport(id);
    return { success: result };
  }

  @Delete('reports/:id')
  @ApiOperation({ summary: 'Delete a report' })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  async deleteReport(@Param('id') id: string) {
    const result = await this.reportingService.deleteReport(id);
    return { success: result };
  }

  // =================== SCHEDULES ===================

  @Get('schedules')
  @ApiOperation({ summary: 'List report schedules' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of schedules' })
  async listSchedules(@Query('active') active?: string) {
    const isActive = active === undefined ? undefined : active === 'true';
    return this.reportingService.listSchedules(isActive);
  }

  @Get('schedules/:id')
  @ApiOperation({ summary: 'Get schedule details' })
  @ApiResponse({ status: 200, description: 'Schedule details' })
  async getSchedule(@Param('id') id: string) {
    return this.reportingService.getSchedule(id);
  }

  @Post('schedules')
  @ApiOperation({ summary: 'Create report schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createSchedule(
    @Request() req: any,
    @Body() body: {
      templateId: string;
      name: string;
      nameRo: string;
      frequency: ReportFrequency;
      format?: ReportFormat;
      recipients?: string[];
      filters?: ReportFilter[];
    },
  ) {
    return this.reportingService.createSchedule(
      body.templateId,
      body.name,
      body.nameRo,
      body.frequency,
      req.user.sub,
      {
        format: body.format,
        recipients: body.recipients,
        filters: body.filters,
      },
    );
  }

  @Put('schedules/:id')
  @ApiOperation({ summary: 'Update report schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updateSchedule(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      nameRo?: string;
      frequency?: ReportFrequency;
      format?: ReportFormat;
      recipients?: string[];
      filters?: ReportFilter[];
      isActive?: boolean;
    },
  ) {
    return this.reportingService.updateSchedule(id, body);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete report schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deleted' })
  async deleteSchedule(@Param('id') id: string) {
    const result = await this.reportingService.deleteSchedule(id);
    return { success: result };
  }

  @Post('schedules/:id/run')
  @ApiOperation({ summary: 'Run scheduled report immediately' })
  @ApiResponse({ status: 200, description: 'Report generated' })
  async runScheduledReport(@Param('id') id: string) {
    return this.reportingService.runScheduledReport(id);
  }

  // =================== SPECIAL REPORTS ===================

  @Post('vat')
  @ApiOperation({ summary: 'Generate VAT report' })
  @ApiResponse({ status: 201, description: 'VAT report started' })
  async generateVatReport(
    @Request() req: any,
    @Body() body: {
      periodStart: string;
      periodEnd: string;
      format?: ReportFormat;
    },
  ) {
    return this.reportingService.generateVatReport(
      {
        start: new Date(body.periodStart),
        end: new Date(body.periodEnd),
      },
      req.user.sub,
      { format: body.format },
    );
  }

  @Post('saft')
  @ApiOperation({ summary: 'Generate SAF-T D406 report' })
  @ApiResponse({ status: 201, description: 'SAF-T report started' })
  async generateSafTReport(
    @Request() req: any,
    @Body() body: {
      periodStart: string;
      periodEnd: string;
    },
  ) {
    return this.reportingService.generateSafTReport(
      {
        start: new Date(body.periodStart),
        end: new Date(body.periodEnd),
      },
      req.user.sub,
    );
  }

  @Post('payroll')
  @ApiOperation({ summary: 'Generate payroll report' })
  @ApiResponse({ status: 201, description: 'Payroll report started' })
  async generatePayrollReport(
    @Request() req: any,
    @Body() body: {
      periodStart: string;
      periodEnd: string;
      format?: ReportFormat;
    },
  ) {
    return this.reportingService.generatePayrollReport(
      {
        start: new Date(body.periodStart),
        end: new Date(body.periodEnd),
      },
      req.user.sub,
      { format: body.format },
    );
  }

  // =================== METADATA ===================

  @Get('types')
  @ApiOperation({ summary: 'Get all report types' })
  @ApiResponse({ status: 200, description: 'List of report types' })
  async getReportTypes() {
    return this.reportingService.getAllReportTypes();
  }

  @Get('formats')
  @ApiOperation({ summary: 'Get all report formats' })
  @ApiResponse({ status: 200, description: 'List of formats' })
  async getFormats() {
    return this.reportingService.getAllFormats();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get reporting statistics' })
  @ApiResponse({ status: 200, description: 'Report statistics' })
  async getStats() {
    return this.reportingService.getReportStats();
  }
}
