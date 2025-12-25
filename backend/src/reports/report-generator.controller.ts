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
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  ReportGeneratorService,
  ReportFormat,
  ReportCategory,
  ReportStatus,
  ScheduleFrequency,
  ReportColumn,
  ReportFilter,
  ReportSort,
  ReportCalculation,
  ReportStyling,
} from './report-generator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Report Generator')
@Controller('report-generator')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportGeneratorController {
  constructor(private readonly reportService: ReportGeneratorService) {}

  // =================== TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create report template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        dataSource: { type: 'string' },
        columns: { type: 'array' },
        createdBy: { type: 'string' },
        filters: { type: 'array' },
        groupBy: { type: 'array' },
        sortBy: { type: 'array' },
        calculations: { type: 'array' },
        styling: { type: 'object' },
      },
      required: ['name', 'description', 'category', 'dataSource', 'columns', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('category') category: ReportCategory,
    @Body('dataSource') dataSource: string,
    @Body('columns') columns: ReportColumn[],
    @Body('createdBy') createdBy: string,
    @Body('filters') filters?: ReportFilter[],
    @Body('groupBy') groupBy?: string[],
    @Body('sortBy') sortBy?: ReportSort[],
    @Body('calculations') calculations?: ReportCalculation[],
    @Body('styling') styling?: ReportStyling,
  ) {
    return this.reportService.createTemplate(name, description, category, dataSource, columns, createdBy, {
      filters,
      groupBy,
      sortBy,
      calculations,
      styling,
    });
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = await this.reportService.getTemplate(templateId);
    if (!template) return { error: 'Template not found' };
    return template;
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'includeSystem', required: false })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getTemplates(
    @Query('category') category?: ReportCategory,
    @Query('includeSystem') includeSystem?: string,
  ) {
    return {
      templates: await this.reportService.getTemplates(category, includeSystem !== 'false'),
    };
  }

  @Put('templates/:templateId')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() updates: Record<string, any>,
  ) {
    const template = await this.reportService.updateTemplate(templateId, updates);
    if (!template) return { error: 'Template not found or is a system template' };
    return template;
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('templateId') templateId: string) {
    const success = await this.reportService.deleteTemplate(templateId);
    return { success };
  }

  // =================== REPORT GENERATION ===================

  @Post('generate')
  @ApiOperation({ summary: 'Generate a report' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        templateId: { type: 'string' },
        format: { type: 'string', enum: ['pdf', 'excel', 'csv', 'json', 'html'] },
        createdBy: { type: 'string' },
        parameters: { type: 'object' },
      },
      required: ['tenantId', 'templateId', 'format', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Report generation started' })
  async generateReport(
    @Body('tenantId') tenantId: string,
    @Body('templateId') templateId: string,
    @Body('format') format: ReportFormat,
    @Body('createdBy') createdBy: string,
    @Body('parameters') parameters?: Record<string, any>,
  ) {
    try {
      const report = await this.reportService.generateReport(tenantId, templateId, format, createdBy, parameters);
      return report;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('reports/:reportId')
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiResponse({ status: 200, description: 'Report details' })
  async getReport(@Param('reportId') reportId: string) {
    const report = await this.reportService.getReport(reportId);
    if (!report) return { error: 'Report not found' };
    return report;
  }

  @Get('reports/tenant/:tenantId')
  @ApiOperation({ summary: 'Get reports for tenant' })
  @ApiQuery({ name: 'templateId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async getReports(
    @Param('tenantId') tenantId: string,
    @Query('templateId') templateId?: string,
    @Query('status') status?: ReportStatus,
    @Query('createdBy') createdBy?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      reports: await this.reportService.getReports(tenantId, {
        templateId,
        status,
        createdBy,
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  @Get('reports/:reportId/download')
  @ApiOperation({ summary: 'Download report' })
  @ApiResponse({ status: 200, description: 'Report file' })
  async downloadReport(
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ) {
    const generated = await this.reportService.downloadReport(reportId);
    if (!generated) {
      return res.status(404).json({ error: 'Report not found or not ready' });
    }

    res.setHeader('Content-Type', generated.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${generated.fileName}"`);
    res.send(generated.content);
  }

  @Delete('reports/:reportId')
  @ApiOperation({ summary: 'Delete report' })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  async deleteReport(@Param('reportId') reportId: string) {
    const success = await this.reportService.deleteReport(reportId);
    return { success };
  }

  // =================== SCHEDULED REPORTS ===================

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a report' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        templateId: { type: 'string' },
        name: { type: 'string' },
        format: { type: 'string' },
        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'once'] },
        recipients: { type: 'array', items: { type: 'string' } },
        createdBy: { type: 'string' },
        parameters: { type: 'object' },
      },
      required: ['tenantId', 'templateId', 'name', 'format', 'frequency', 'recipients', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Report scheduled' })
  async scheduleReport(
    @Body('tenantId') tenantId: string,
    @Body('templateId') templateId: string,
    @Body('name') name: string,
    @Body('format') format: ReportFormat,
    @Body('frequency') frequency: ScheduleFrequency,
    @Body('recipients') recipients: string[],
    @Body('createdBy') createdBy: string,
    @Body('parameters') parameters?: Record<string, any>,
  ) {
    return this.reportService.scheduleReport(
      tenantId,
      templateId,
      name,
      format,
      frequency,
      recipients,
      createdBy,
      parameters,
    );
  }

  @Get('schedules/:scheduleId')
  @ApiOperation({ summary: 'Get scheduled report by ID' })
  @ApiResponse({ status: 200, description: 'Scheduled report details' })
  async getScheduledReport(@Param('scheduleId') scheduleId: string) {
    const scheduled = await this.reportService.getScheduledReport(scheduleId);
    if (!scheduled) return { error: 'Scheduled report not found' };
    return scheduled;
  }

  @Get('schedules/tenant/:tenantId')
  @ApiOperation({ summary: 'Get scheduled reports for tenant' })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiResponse({ status: 200, description: 'List of scheduled reports' })
  async getScheduledReports(
    @Param('tenantId') tenantId: string,
    @Query('isActive') isActive?: string,
  ) {
    return {
      schedules: await this.reportService.getScheduledReports(
        tenantId,
        isActive ? isActive === 'true' : undefined,
      ),
    };
  }

  @Put('schedules/:scheduleId')
  @ApiOperation({ summary: 'Update scheduled report' })
  @ApiResponse({ status: 200, description: 'Scheduled report updated' })
  async updateScheduledReport(
    @Param('scheduleId') scheduleId: string,
    @Body() updates: Record<string, any>,
  ) {
    const scheduled = await this.reportService.updateScheduledReport(scheduleId, updates);
    if (!scheduled) return { error: 'Scheduled report not found' };
    return scheduled;
  }

  @Delete('schedules/:scheduleId')
  @ApiOperation({ summary: 'Delete scheduled report' })
  @ApiResponse({ status: 200, description: 'Scheduled report deleted' })
  async deleteScheduledReport(@Param('scheduleId') scheduleId: string) {
    const success = await this.reportService.deleteScheduledReport(scheduleId);
    return { success };
  }

  @Post('schedules/:scheduleId/run')
  @ApiOperation({ summary: 'Run scheduled report now' })
  @ApiResponse({ status: 200, description: 'Report generation started' })
  async runScheduledReport(@Param('scheduleId') scheduleId: string) {
    const report = await this.reportService.runScheduledReport(scheduleId);
    if (!report) return { error: 'Scheduled report not found' };
    return report;
  }

  // =================== METADATA ===================

  @Get('metadata/categories')
  @ApiOperation({ summary: 'Get report categories' })
  async getCategories() {
    return { categories: this.reportService.getReportCategories() };
  }

  @Get('metadata/formats')
  @ApiOperation({ summary: 'Get report formats' })
  async getFormats() {
    return { formats: this.reportService.getReportFormats() };
  }

  @Get('metadata/frequencies')
  @ApiOperation({ summary: 'Get schedule frequencies' })
  async getFrequencies() {
    return { frequencies: this.reportService.getScheduleFrequencies() };
  }

  @Get('metadata/column-types')
  @ApiOperation({ summary: 'Get column types' })
  async getColumnTypes() {
    return { types: this.reportService.getColumnTypes() };
  }

  @Get('metadata/aggregations')
  @ApiOperation({ summary: 'Get aggregation types' })
  async getAggregations() {
    return { aggregations: this.reportService.getAggregationTypes() };
  }
}
