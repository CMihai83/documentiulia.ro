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
  ReportDesignerService,
  ReportType,
  OutputFormat,
  ReportDataSource,
  ReportParameter,
  ReportColumn,
  ReportGroup,
  ReportSort,
  ReportFilter,
  ReportLayout,
  ReportSection,
  ReportElement,
} from './report-designer.service';

@ApiTags('Business Intelligence - Reports')
@Controller('bi/reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportDesignerController {
  constructor(private readonly reportService: ReportDesignerService) {}

  // =================== REPORT DEFINITIONS ===================

  @Post()
  @ApiOperation({ summary: 'Create report' })
  @ApiResponse({ status: 201, description: 'Report created' })
  async createReport(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: ReportType;
      category?: string;
      tags?: string[];
      dataSource: ReportDataSource;
      columns: ReportColumn[];
      layout?: Partial<ReportLayout>;
    },
  ) {
    return this.reportService.createReport({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get reports' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'published', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Reports list' })
  async getReports(
    @Request() req: any,
    @Query('type') type?: ReportType,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('published') published?: string,
    @Query('search') search?: string,
  ) {
    const reports = await this.reportService.getReports(req.user.tenantId, {
      type,
      category,
      tag,
      published: published ? published === 'true' : undefined,
      search,
    });
    return { reports, total: reports.length };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get report stats' })
  @ApiResponse({ status: 200, description: 'Report statistics' })
  async getStats(@Request() req: any) {
    return this.reportService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report details' })
  @ApiResponse({ status: 200, description: 'Report details' })
  async getReport(@Param('id') id: string) {
    const report = await this.reportService.getReport(id);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update report' })
  @ApiResponse({ status: 200, description: 'Report updated' })
  async updateReport(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      type: ReportType;
      category: string;
      tags: string[];
      dataSource: ReportDataSource;
      parameters: ReportParameter[];
      columns: ReportColumn[];
      groups: ReportGroup[];
      sorts: ReportSort[];
      filters: ReportFilter[];
      layout: ReportLayout;
      sections: ReportSection[];
    }>,
  ) {
    const report = await this.reportService.updateReport(id, body);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete report' })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  async deleteReport(@Param('id') id: string) {
    await this.reportService.deleteReport(id);
    return { success: true };
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate report' })
  @ApiResponse({ status: 201, description: 'Report duplicated' })
  async duplicateReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    const report = await this.reportService.duplicateReport(id, body.name, req.user.id);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish report' })
  @ApiResponse({ status: 200, description: 'Report published' })
  async publishReport(@Param('id') id: string) {
    const report = await this.reportService.publishReport(id);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish report' })
  @ApiResponse({ status: 200, description: 'Report unpublished' })
  async unpublishReport(@Param('id') id: string) {
    const report = await this.reportService.unpublishReport(id);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  // =================== COLUMNS ===================

  @Post(':id/columns')
  @ApiOperation({ summary: 'Add column to report' })
  @ApiResponse({ status: 201, description: 'Column added' })
  async addColumn(
    @Param('id') id: string,
    @Body() column: ReportColumn,
  ) {
    const report = await this.reportService.addColumn(id, column);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  @Put(':id/columns/:columnId')
  @ApiOperation({ summary: 'Update column' })
  @ApiResponse({ status: 200, description: 'Column updated' })
  async updateColumn(
    @Param('id') id: string,
    @Param('columnId') columnId: string,
    @Body() updates: Partial<ReportColumn>,
  ) {
    const report = await this.reportService.updateColumn(id, columnId, updates);
    if (!report) {
      return { error: 'Report or column not found' };
    }
    return report;
  }

  @Delete(':id/columns/:columnId')
  @ApiOperation({ summary: 'Remove column' })
  @ApiResponse({ status: 200, description: 'Column removed' })
  async removeColumn(
    @Param('id') id: string,
    @Param('columnId') columnId: string,
  ) {
    const report = await this.reportService.removeColumn(id, columnId);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  @Put(':id/columns/reorder')
  @ApiOperation({ summary: 'Reorder columns' })
  @ApiResponse({ status: 200, description: 'Columns reordered' })
  async reorderColumns(
    @Param('id') id: string,
    @Body() body: { columnIds: string[] },
  ) {
    const report = await this.reportService.reorderColumns(id, body.columnIds);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  // =================== SECTIONS & ELEMENTS ===================

  @Put(':id/sections/:sectionId')
  @ApiOperation({ summary: 'Update section' })
  @ApiResponse({ status: 200, description: 'Section updated' })
  async updateSection(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() updates: Partial<ReportSection>,
  ) {
    const report = await this.reportService.updateSection(id, sectionId, updates);
    if (!report) {
      return { error: 'Report or section not found' };
    }
    return report;
  }

  @Post(':id/sections/:sectionId/elements')
  @ApiOperation({ summary: 'Add element to section' })
  @ApiResponse({ status: 201, description: 'Element added' })
  async addElement(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Body() element: ReportElement,
  ) {
    const report = await this.reportService.addElement(id, sectionId, element);
    if (!report) {
      return { error: 'Report or section not found' };
    }
    return report;
  }

  @Put(':id/sections/:sectionId/elements/:elementId')
  @ApiOperation({ summary: 'Update element' })
  @ApiResponse({ status: 200, description: 'Element updated' })
  async updateElement(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('elementId') elementId: string,
    @Body() updates: Partial<ReportElement>,
  ) {
    const report = await this.reportService.updateElement(id, sectionId, elementId, updates);
    if (!report) {
      return { error: 'Report, section, or element not found' };
    }
    return report;
  }

  @Delete(':id/sections/:sectionId/elements/:elementId')
  @ApiOperation({ summary: 'Remove element' })
  @ApiResponse({ status: 200, description: 'Element removed' })
  async removeElement(
    @Param('id') id: string,
    @Param('sectionId') sectionId: string,
    @Param('elementId') elementId: string,
  ) {
    const report = await this.reportService.removeElement(id, sectionId, elementId);
    if (!report) {
      return { error: 'Report or section not found' };
    }
    return report;
  }

  // =================== EXECUTION ===================

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute report' })
  @ApiResponse({ status: 201, description: 'Execution started' })
  async executeReport(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      parameters: Record<string, any>;
      format: OutputFormat;
    },
  ) {
    return this.reportService.executeReport({
      reportId: id,
      tenantId: req.user.tenantId,
      parameters: body.parameters,
      format: body.format,
      executedBy: req.user.id,
    });
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get report executions' })
  @ApiResponse({ status: 200, description: 'Executions list' })
  async getReportExecutions(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const executions = await this.reportService.getExecutions(req.user.tenantId, id);
    return { executions, total: executions.length };
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiResponse({ status: 200, description: 'Execution details' })
  async getExecution(@Param('executionId') executionId: string) {
    const execution = await this.reportService.getExecution(executionId);
    if (!execution) {
      return { error: 'Execution not found' };
    }
    return execution;
  }

  @Post('executions/:executionId/cancel')
  @ApiOperation({ summary: 'Cancel execution' })
  @ApiResponse({ status: 200, description: 'Execution cancelled' })
  async cancelExecution(@Param('executionId') executionId: string) {
    const execution = await this.reportService.cancelExecution(executionId);
    if (!execution) {
      return { error: 'Execution not found or not running' };
    }
    return execution;
  }

  // =================== SNAPSHOTS ===================

  @Post(':id/snapshots')
  @ApiOperation({ summary: 'Create report snapshot' })
  @ApiResponse({ status: 201, description: 'Snapshot created' })
  async createSnapshot(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      name: string;
      parameters: Record<string, any>;
      expiresAt?: string;
    },
  ) {
    return this.reportService.createSnapshot({
      reportId: id,
      tenantId: req.user.tenantId,
      name: body.name,
      parameters: body.parameters,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      createdBy: req.user.id,
    });
  }

  @Get(':id/snapshots')
  @ApiOperation({ summary: 'Get report snapshots' })
  @ApiResponse({ status: 200, description: 'Snapshots list' })
  async getReportSnapshots(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const snapshots = await this.reportService.getSnapshots(req.user.tenantId, id);
    return { snapshots, total: snapshots.length };
  }

  @Get('snapshots/:snapshotId')
  @ApiOperation({ summary: 'Get snapshot details' })
  @ApiResponse({ status: 200, description: 'Snapshot details' })
  async getSnapshot(@Param('snapshotId') snapshotId: string) {
    const snapshot = await this.reportService.getSnapshot(snapshotId);
    if (!snapshot) {
      return { error: 'Snapshot not found or expired' };
    }
    return snapshot;
  }

  @Delete('snapshots/:snapshotId')
  @ApiOperation({ summary: 'Delete snapshot' })
  @ApiResponse({ status: 200, description: 'Snapshot deleted' })
  async deleteSnapshot(@Param('snapshotId') snapshotId: string) {
    await this.reportService.deleteSnapshot(snapshotId);
    return { success: true };
  }

  // =================== PREVIEW ===================

  @Post(':id/preview')
  @ApiOperation({ summary: 'Preview report' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Report preview' })
  async previewReport(
    @Param('id') id: string,
    @Body() body: { parameters: Record<string, any> },
    @Query('limit') limit?: string,
  ) {
    return this.reportService.previewReport(
      id,
      body.parameters,
      limit ? parseInt(limit) : 10
    );
  }
}
