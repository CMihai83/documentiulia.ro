import {
  Controller,
  Get,
  Post,
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
  ProcurementAnalyticsService,
  ProcurementKPIs,
  SpendAnalysis,
  SupplierPerformance,
  SavingsAnalysis,
  ComplianceMetrics,
  DashboardData,
  ProcurementReport,
  ReportType,
  DateRange,
} from './procurement-analytics.service';

@ApiTags('Procurement Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement/analytics')
export class ProcurementAnalyticsController {
  constructor(
    private readonly analyticsService: ProcurementAnalyticsService,
  ) {}

  // Dashboard
  @Get('dashboard')
  @ApiOperation({ summary: 'Get procurement dashboard data' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data',
  })
  async getDashboardData(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<DashboardData> {
    const dateRange: DateRange = {
      from: new Date(dateFrom),
      to: new Date(dateTo),
    };
    return this.analyticsService.getDashboardData(req.user.tenantId, dateRange);
  }

  // KPIs
  @Get('kpis')
  @ApiOperation({ summary: 'Get procurement KPIs' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Procurement KPIs',
  })
  async getKPIs(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<ProcurementKPIs> {
    const dateRange: DateRange = {
      from: new Date(dateFrom),
      to: new Date(dateTo),
    };
    return this.analyticsService.getKPIs(req.user.tenantId, dateRange);
  }

  // Spend Analysis
  @Get('spend')
  @ApiOperation({ summary: 'Get spend analysis' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Spend analysis data',
  })
  async getSpendAnalysis(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('category') category?: string,
    @Query('supplierId') supplierId?: string,
    @Query('department') department?: string,
  ): Promise<SpendAnalysis> {
    const dateRange: DateRange = {
      from: new Date(dateFrom),
      to: new Date(dateTo),
    };
    const filters = { category, supplierId, department };
    return this.analyticsService.getSpendAnalysis(
      req.user.tenantId,
      dateRange,
      filters,
    );
  }

  // Supplier Performance
  @Get('suppliers/performance')
  @ApiOperation({ summary: 'Get supplier performance metrics' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supplier performance data',
  })
  async getSupplierPerformance(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('supplierId') supplierId?: string,
  ): Promise<SupplierPerformance[]> {
    const dateRange: DateRange = {
      from: new Date(dateFrom),
      to: new Date(dateTo),
    };
    return this.analyticsService.getSupplierPerformance(
      req.user.tenantId,
      dateRange,
      supplierId,
    );
  }

  // Savings Analysis
  @Get('savings')
  @ApiOperation({ summary: 'Get cost savings analysis' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Savings analysis data',
  })
  async getSavingsAnalysis(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<SavingsAnalysis> {
    const dateRange: DateRange = {
      from: new Date(dateFrom),
      to: new Date(dateTo),
    };
    return this.analyticsService.getSavingsAnalysis(req.user.tenantId, dateRange);
  }

  // Compliance Metrics
  @Get('compliance')
  @ApiOperation({ summary: 'Get compliance metrics' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Compliance metrics',
  })
  async getComplianceMetrics(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<ComplianceMetrics> {
    const dateRange: DateRange = {
      from: new Date(dateFrom),
      to: new Date(dateTo),
    };
    return this.analyticsService.getComplianceMetrics(
      req.user.tenantId,
      dateRange,
    );
  }

  // Reports
  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate a procurement report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report generated successfully',
  })
  async generateReport(
    @Request() req: any,
    @Body()
    body: {
      reportType: ReportType;
      dateFrom: string;
      dateTo: string;
      filters?: Record<string, any>;
    },
  ): Promise<ProcurementReport> {
    const dateRange: DateRange = {
      from: new Date(body.dateFrom),
      to: new Date(body.dateTo),
    };
    return this.analyticsService.generateReport(
      req.user.tenantId,
      body.reportType,
      dateRange,
      req.user.id,
      body.filters,
    );
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get a generated report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report data',
  })
  async getReport(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<ProcurementReport> {
    return this.analyticsService.getReport(req.user.tenantId, id);
  }
}
