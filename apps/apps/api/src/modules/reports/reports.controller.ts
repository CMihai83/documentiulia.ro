import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportQueryDto, CashFlowQueryDto } from './dto/report-query.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Dashboard summary returned' })
  async getDashboard(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.getDashboardSummary(companyId, user.id);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Revenue report returned' })
  async getRevenue(
    @Param('companyId') companyId: string,
    @Query() query: ReportQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.getRevenueReport(companyId, user.id, query);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Get expense report' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Expense report returned' })
  async getExpenses(
    @Param('companyId') companyId: string,
    @Query() query: ReportQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.getExpenseReport(companyId, user.id, query);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Get profit & loss report' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'P&L report returned' })
  async getProfitLoss(
    @Param('companyId') companyId: string,
    @Query() query: ReportQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.getProfitLossReport(companyId, user.id, query);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Get cash flow report' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Cash flow report returned' })
  async getCashFlow(
    @Param('companyId') companyId: string,
    @Query() query: CashFlowQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.getCashFlowReport(companyId, user.id, query);
  }

  @Get('vat')
  @ApiOperation({ summary: 'Get VAT report' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'VAT report returned' })
  async getVat(
    @Param('companyId') companyId: string,
    @Query() query: ReportQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.getVatReport(companyId, user.id, query);
  }

  @Get('aging')
  @ApiOperation({ summary: 'Get client aging report' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Aging report returned' })
  async getAging(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportsService.getClientAgingReport(companyId, user.id);
  }
}
