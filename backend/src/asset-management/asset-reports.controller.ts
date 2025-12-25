import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetReportsService, ReportType, ReportFormat } from './asset-reports.service';
import { AssetCategory, AssetStatus } from './asset-management.service';

@ApiTags('Asset Management - Reports')
@Controller('assets/reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssetReportsController {
  constructor(private readonly reportsService: AssetReportsService) {}

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
      filters?: Record<string, any>;
      columns?: string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      groupBy?: string;
      isScheduled?: boolean;
      schedule?: {
        frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
        dayOfWeek?: number;
        dayOfMonth?: number;
        time?: string;
        recipients: string[];
      };
    },
  ) {
    return this.reportsService.createReportDefinition({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('definitions')
  @ApiOperation({ summary: 'Get report definitions' })
  @ApiResponse({ status: 200, description: 'Report definitions list' })
  async getReportDefinitions(@Request() req: any) {
    const definitions = await this.reportsService.getReportDefinitions(req.user.tenantId);
    return { definitions, total: definitions.length };
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get report definition' })
  @ApiResponse({ status: 200, description: 'Report definition details' })
  async getReportDefinition(@Param('id') id: string) {
    const definition = await this.reportsService.getReportDefinition(id);
    if (!definition) {
      return { error: 'Report definition not found' };
    }
    return definition;
  }

  // =================== GENERATE REPORTS ===================

  @Post('generate/asset-register')
  @ApiOperation({ summary: 'Generate asset register report' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateAssetRegisterReport(
    @Request() req: any,
    @Body() body: {
      category?: AssetCategory;
      status?: AssetStatus;
      locationId?: string;
      departmentId?: string;
    },
  ) {
    return this.reportsService.generateAssetRegisterReport(
      req.user.tenantId,
      body,
      req.user.id,
    );
  }

  @Post('generate/depreciation')
  @ApiOperation({ summary: 'Generate depreciation report' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateDepreciationReport(
    @Request() req: any,
    @Body() body: {
      year: number;
      month?: number;
    },
  ) {
    return this.reportsService.generateDepreciationReport(
      req.user.tenantId,
      body,
      req.user.id,
    );
  }

  @Post('generate/maintenance')
  @ApiOperation({ summary: 'Generate maintenance report' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateMaintenanceReport(
    @Request() req: any,
    @Body() body: {
      startDate?: string;
      endDate?: string;
    },
  ) {
    const period = body.startDate && body.endDate
      ? { start: new Date(body.startDate), end: new Date(body.endDate) }
      : undefined;

    return this.reportsService.generateMaintenanceReport(
      req.user.tenantId,
      period,
      req.user.id,
    );
  }

  @Post('generate/warranty')
  @ApiOperation({ summary: 'Generate warranty report' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateWarrantyReport(
    @Request() req: any,
    @Body() body: {
      daysAhead?: number;
    },
  ) {
    return this.reportsService.generateWarrantyReport(
      req.user.tenantId,
      body.daysAhead || 90,
      req.user.id,
    );
  }

  @Post('generate/insurance')
  @ApiOperation({ summary: 'Generate insurance report' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  async generateInsuranceReport(
    @Request() req: any,
    @Body() body: {
      daysAhead?: number;
    },
  ) {
    return this.reportsService.generateInsuranceReport(
      req.user.tenantId,
      body.daysAhead || 90,
      req.user.id,
    );
  }

  // =================== KPIs ===================

  @Get('kpis')
  @ApiOperation({ summary: 'Get asset KPIs' })
  @ApiResponse({ status: 200, description: 'Asset KPIs' })
  async getKPIs(@Request() req: any) {
    const kpis = await this.reportsService.getAssetKPIs(req.user.tenantId);
    return { kpis, total: kpis.length };
  }

  // =================== REPORT HISTORY ===================

  @Get('history')
  @ApiOperation({ summary: 'Get generated reports history' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Generated reports list' })
  async getReportHistory(
    @Request() req: any,
    @Query('type') type?: ReportType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const reports = await this.reportsService.getGeneratedReports(req.user.tenantId, {
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { reports, total: reports.length };
  }

  @Get('history/:id')
  @ApiOperation({ summary: 'Get generated report' })
  @ApiResponse({ status: 200, description: 'Generated report details' })
  async getGeneratedReport(@Param('id') id: string) {
    const report = await this.reportsService.getGeneratedReport(id);
    if (!report) {
      return { error: 'Report not found' };
    }
    return report;
  }

  // =================== EXPORT ===================

  @Get('export/:id')
  @ApiOperation({ summary: 'Export report' })
  @ApiQuery({ name: 'format', required: false })
  @ApiResponse({ status: 200, description: 'Exported report' })
  async exportReport(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('format') format?: ReportFormat,
  ) {
    try {
      const result = await this.reportsService.exportReport(id, format || 'json');

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
}
