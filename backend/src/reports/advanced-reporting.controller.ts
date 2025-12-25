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
  AdvancedReportingService,
  ReportType,
  ReportFormat,
  ReportField,
  ReportFilter,
  ReportSort,
  ChartConfig,
  ReportSchedule,
  WidgetType,
  WidgetConfig,
} from './advanced-reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Advanced Reporting')
@Controller('reports/advanced')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdvancedReportingController {
  constructor(private readonly reportingService: AdvancedReportingService) {}

  // =================== TEMPLATES ===================

  @Get('templates')
  @ApiOperation({ summary: 'Get report templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getTemplates(@Query('category') category?: string) {
    return { templates: await this.reportingService.getTemplates(category) };
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = await this.reportingService.getTemplate(templateId);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create custom template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        category: { type: 'string' },
        fields: { type: 'array' },
        filters: { type: 'array' },
        sorting: { type: 'array' },
        groupBy: { type: 'array' },
        charts: { type: 'array' },
      },
      required: ['name', 'type', 'category', 'fields'],
    },
  })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('type') type: ReportType,
    @Body('category') category: string,
    @Body('fields') fields: ReportField[],
    @Body('filters') filters?: ReportFilter[],
    @Body('sorting') sorting?: ReportSort[],
    @Body('groupBy') groupBy?: string[],
    @Body('charts') charts?: ChartConfig[],
  ) {
    return this.reportingService.createTemplate(
      name,
      description || '',
      type,
      category,
      fields,
      filters,
      sorting,
      groupBy,
      charts,
    );
  }

  // =================== REPORT DEFINITIONS ===================

  @Post('definitions')
  @ApiOperation({ summary: 'Create report definition' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        tenantId: { type: 'string' },
        createdBy: { type: 'string' },
        templateId: { type: 'string' },
        fields: { type: 'array' },
        filters: { type: 'array' },
        sorting: { type: 'array' },
        groupBy: { type: 'array' },
        charts: { type: 'array' },
        schedule: { type: 'object' },
        sharing: { type: 'object' },
      },
      required: ['name', 'type', 'tenantId', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Report definition created' })
  async createReportDefinition(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('type') type: ReportType,
    @Body('tenantId') tenantId: string,
    @Body('createdBy') createdBy: string,
    @Body('templateId') templateId?: string,
    @Body('fields') fields?: ReportField[],
    @Body('filters') filters?: ReportFilter[],
    @Body('sorting') sorting?: ReportSort[],
    @Body('groupBy') groupBy?: string[],
    @Body('charts') charts?: ChartConfig[],
    @Body('schedule') schedule?: ReportSchedule,
    @Body('sharing') sharing?: any,
  ) {
    return this.reportingService.createReportDefinition(
      name,
      description || '',
      type,
      tenantId,
      createdBy,
      { templateId, fields, filters, sorting, groupBy, charts, schedule, sharing },
    );
  }

  @Get('definitions/:definitionId')
  @ApiOperation({ summary: 'Get report definition' })
  @ApiResponse({ status: 200, description: 'Report definition details' })
  async getReportDefinition(@Param('definitionId') definitionId: string) {
    const definition = await this.reportingService.getReportDefinition(definitionId);
    if (!definition) {
      return { error: 'Report definition not found' };
    }
    return definition;
  }

  @Get('definitions/tenant/:tenantId')
  @ApiOperation({ summary: 'Get report definitions for tenant' })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'List of report definitions' })
  async getReportDefinitions(
    @Param('tenantId') tenantId: string,
    @Query('type') type?: ReportType,
  ) {
    return { definitions: await this.reportingService.getReportDefinitions(tenantId, type) };
  }

  @Put('definitions/:definitionId')
  @ApiOperation({ summary: 'Update report definition' })
  @ApiResponse({ status: 200, description: 'Report definition updated' })
  async updateReportDefinition(
    @Param('definitionId') definitionId: string,
    @Body() updates: Record<string, any>,
  ) {
    const definition = await this.reportingService.updateReportDefinition(definitionId, updates);
    if (!definition) {
      return { error: 'Report definition not found' };
    }
    return definition;
  }

  @Delete('definitions/:definitionId')
  @ApiOperation({ summary: 'Delete report definition' })
  @ApiResponse({ status: 200, description: 'Report definition deleted' })
  async deleteReportDefinition(@Param('definitionId') definitionId: string) {
    const success = await this.reportingService.deleteReportDefinition(definitionId);
    return { success };
  }

  // =================== REPORT GENERATION ===================

  @Post('generate/:definitionId')
  @ApiOperation({ summary: 'Generate report' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        generatedBy: { type: 'string' },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
        },
        format: { type: 'string' },
      },
      required: ['generatedBy', 'period'],
    },
  })
  @ApiResponse({ status: 200, description: 'Report generated' })
  async generateReport(
    @Param('definitionId') definitionId: string,
    @Body('generatedBy') generatedBy: string,
    @Body('period') period: { start: string; end: string },
    @Body('format') format?: ReportFormat,
  ) {
    try {
      return await this.reportingService.generateReport(
        definitionId,
        generatedBy,
        period,
        format || 'json',
      );
    } catch (error) {
      return { error: error.message };
    }
  }

  @Get('generated/:reportId')
  @ApiOperation({ summary: 'Get generated report' })
  @ApiResponse({ status: 200, description: 'Generated report details' })
  async getReport(@Param('reportId') reportId: string) {
    const report = await this.reportingService.getReport(reportId);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  @Get('history/:definitionId')
  @ApiOperation({ summary: 'Get report generation history' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Report history' })
  async getReportHistory(
    @Param('definitionId') definitionId: string,
    @Query('limit') limit?: string,
  ) {
    return {
      history: await this.reportingService.getReportHistory(
        definitionId,
        limit ? parseInt(limit) : 10,
      ),
    };
  }

  // =================== SCHEDULING ===================

  @Get('scheduled/:tenantId')
  @ApiOperation({ summary: 'Get scheduled reports' })
  @ApiResponse({ status: 200, description: 'List of scheduled reports' })
  async getScheduledReports(@Param('tenantId') tenantId: string) {
    return { scheduled: await this.reportingService.getScheduledReports(tenantId) };
  }

  @Post('scheduled/run')
  @ApiOperation({ summary: 'Run scheduled reports' })
  @ApiResponse({ status: 200, description: 'Scheduled reports executed' })
  async runScheduledReports() {
    return await this.reportingService.runScheduledReports();
  }

  // =================== WIDGETS ===================

  @Post('widgets')
  @ApiOperation({ summary: 'Create dashboard widget' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        config: { type: 'object' },
        position: { type: 'object' },
        tenantId: { type: 'string' },
        createdBy: { type: 'string' },
        reportDefinitionId: { type: 'string' },
        refreshInterval: { type: 'number' },
      },
      required: ['name', 'type', 'config', 'position', 'tenantId', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Widget created' })
  async createWidget(
    @Body('name') name: string,
    @Body('type') type: WidgetType,
    @Body('config') config: WidgetConfig,
    @Body('position') position: { x: number; y: number; w: number; h: number },
    @Body('tenantId') tenantId: string,
    @Body('createdBy') createdBy: string,
    @Body('reportDefinitionId') reportDefinitionId?: string,
    @Body('refreshInterval') refreshInterval?: number,
  ) {
    return this.reportingService.createWidget(
      name,
      type,
      config,
      position,
      tenantId,
      createdBy,
      reportDefinitionId,
      refreshInterval,
    );
  }

  @Get('widgets/:widgetId')
  @ApiOperation({ summary: 'Get widget' })
  @ApiResponse({ status: 200, description: 'Widget details' })
  async getWidget(@Param('widgetId') widgetId: string) {
    const widget = await this.reportingService.getWidget(widgetId);
    if (!widget) {
      return { error: 'Widget not found' };
    }
    return widget;
  }

  @Get('widgets/tenant/:tenantId')
  @ApiOperation({ summary: 'Get widgets for tenant' })
  @ApiResponse({ status: 200, description: 'List of widgets' })
  async getWidgets(@Param('tenantId') tenantId: string) {
    return { widgets: await this.reportingService.getWidgets(tenantId) };
  }

  @Put('widgets/:widgetId')
  @ApiOperation({ summary: 'Update widget' })
  @ApiResponse({ status: 200, description: 'Widget updated' })
  async updateWidget(
    @Param('widgetId') widgetId: string,
    @Body() updates: Record<string, any>,
  ) {
    const widget = await this.reportingService.updateWidget(widgetId, updates);
    if (!widget) {
      return { error: 'Widget not found' };
    }
    return widget;
  }

  @Delete('widgets/:widgetId')
  @ApiOperation({ summary: 'Delete widget' })
  @ApiResponse({ status: 200, description: 'Widget deleted' })
  async deleteWidget(@Param('widgetId') widgetId: string) {
    const success = await this.reportingService.deleteWidget(widgetId);
    return { success };
  }

  @Get('widgets/:widgetId/data')
  @ApiOperation({ summary: 'Get widget data' })
  @ApiResponse({ status: 200, description: 'Widget data' })
  async getWidgetData(@Param('widgetId') widgetId: string) {
    const data = await this.reportingService.getWidgetData(widgetId);
    if (!data) {
      return { error: 'Widget not found' };
    }
    return data;
  }

  // =================== STATISTICS & METADATA ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get reporting statistics' })
  @ApiResponse({ status: 200, description: 'Reporting stats' })
  async getReportStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.reportingService.getReportStats(tenantId) };
  }

  @Get('metadata/types')
  @ApiOperation({ summary: 'Get report types' })
  @ApiResponse({ status: 200, description: 'Available report types' })
  async getReportTypes() {
    return { types: this.reportingService.getReportTypes() };
  }

  @Get('metadata/formats')
  @ApiOperation({ summary: 'Get export formats' })
  @ApiResponse({ status: 200, description: 'Available export formats' })
  async getExportFormats() {
    return { formats: this.reportingService.getExportFormats() };
  }

  @Get('metadata/widget-types')
  @ApiOperation({ summary: 'Get widget types' })
  @ApiResponse({ status: 200, description: 'Available widget types' })
  async getWidgetTypes() {
    return { types: this.reportingService.getWidgetTypes() };
  }

  @Get('metadata/frequencies')
  @ApiOperation({ summary: 'Get schedule frequencies' })
  @ApiResponse({ status: 200, description: 'Available schedule frequencies' })
  async getScheduleFrequencies() {
    return { frequencies: this.reportingService.getScheduleFrequencies() };
  }
}
