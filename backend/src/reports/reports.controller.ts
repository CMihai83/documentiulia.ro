import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/reports.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('profit-loss')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get Profit & Loss report (Cont de Profit si Pierderi)' })
  @ApiResponse({ status: 200, description: 'P&L report generated successfully' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'currency', required: false, description: 'Currency filter (RON, EUR, ALL)' })
  async getProfitLoss(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getProfitLossReport(req.user.userId, query);
  }

  @Get('balance-sheet')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get Balance Sheet (Bilant Contabil)' })
  @ApiResponse({ status: 200, description: 'Balance sheet generated successfully' })
  @ApiQuery({ name: 'endDate', required: false, description: 'As of date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'currency', required: false, description: 'Currency filter (RON, EUR, ALL)' })
  async getBalanceSheet(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getBalanceSheet(req.user.userId, query);
  }

  @Get('cash-flow')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get Cash Flow report (Flux de Numerar)' })
  @ApiResponse({ status: 200, description: 'Cash flow report generated successfully' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'currency', required: false, description: 'Currency filter (RON, EUR, ALL)' })
  async getCashFlow(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getCashFlowReport(req.user.userId, query);
  }

  @Get('summary')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get financial summary with trends' })
  @ApiResponse({ status: 200, description: 'Financial summary generated successfully' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  async getSummary(@Request() req: any, @Query() query: ReportQueryDto) {
    return this.reportsService.getFinancialSummary(req.user.userId, query);
  }

  @Get('monthly')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get monthly comparison for a year' })
  @ApiResponse({ status: 200, description: 'Monthly comparison generated successfully' })
  @ApiQuery({ name: 'year', required: false, description: 'Year (default: current year)' })
  async getMonthlyComparison(@Request() req: any, @Query('year') year?: string) {
    const reportYear = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.reportsService.getMonthlyComparison(req.user.userId, reportYear);
  }

  @Get('aging')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get invoice aging report (Raport vechime facturi)' })
  @ApiResponse({ status: 200, description: 'Aging report generated successfully' })
  @ApiQuery({ name: 'type', required: false, enum: ['ISSUED', 'RECEIVED'], description: 'Invoice type (default: ISSUED)' })
  async getAgingReport(
    @Request() req: any,
    @Query('type') type?: 'ISSUED' | 'RECEIVED',
  ) {
    return this.reportsService.getAgingReport(req.user.userId, type || 'ISSUED');
  }
}
