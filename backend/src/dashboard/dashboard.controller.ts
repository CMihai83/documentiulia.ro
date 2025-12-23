import { Controller, Get, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard.dto';
import { CacheInterceptor, CacheTTLDecorator, CacheTags, UserScopedCache } from '../cache/cache.interceptor';
import { CacheTTL } from '../cache/redis-cache.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @UserScopedCache()
  @CacheTTLDecorator(CacheTTL.MEDIUM)
  @CacheTags('dashboard', 'root')
  @ApiOperation({ summary: 'Get full dashboard data (alias for /summary)' })
  @ApiResponse({
    status: 200,
    description: 'Full dashboard including cash flow, VAT, compliance, and quick stats',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboard(@Request() req: { user?: { sub?: string } }) {
    const userId = req.user?.sub;
    if (!userId) {
      return {
        cashFlow: { balance: 0, income: 0, expenses: 0 },
        vat: { toPay: 0, toReceive: 0 },
        compliance: { status: 'unknown', deadlines: [] },
        quickStats: { revenue: 0, expenses: 0, profit: 0, invoices: 0, partners: 0 },
      };
    }
    const [summary, quickStats] = await Promise.all([
      this.dashboardService.getSummary(userId),
      this.dashboardService.getQuickStats(userId),
    ]);
    return { ...summary, quickStats };
  }

  @Get('summary')
  @UseInterceptors(CacheInterceptor)
  @UserScopedCache() // Cache per user
  @CacheTTLDecorator(CacheTTL.MEDIUM) // 5 minutes
  @CacheTags('dashboard', 'summary')
  @ApiOperation({ summary: 'Get dashboard summary data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary including cash flow, VAT, and compliance status',
    type: DashboardSummaryDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSummary(@Request() req: { user?: { sub?: string } }): Promise<DashboardSummaryDto> {
    const userId = req.user?.sub;
    if (!userId) {
      return {
        cashFlow: [],
        vatSummary: [],
        complianceStatus: [],
        recentActivity: [],
        invoiceStatusBreakdown: [],
        totalIncome: 0,
        totalExpenses: 0,
        vatCollected: 0,
        vatDeductible: 0,
        vatPayable: 0,
        invoiceCount: 0,
        pendingInvoices: 0,
      };
    }
    return this.dashboardService.getSummary(userId);
  }

  @Get('quick-stats')
  @UseInterceptors(CacheInterceptor)
  @UserScopedCache() // Cache per user
  @CacheTTLDecorator(CacheTTL.SHORT) // 1 minute - quick stats should be fresher
  @CacheTags('dashboard', 'quick-stats')
  @ApiOperation({ summary: 'Get quick stats for dashboard cards' })
  @ApiResponse({
    status: 200,
    description: 'Quick stats including revenue, expenses, profit, invoices, partners, and compliance',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getQuickStats(@Request() req: { user?: { sub?: string } }) {
    const userId = req.user?.sub;
    if (!userId) {
      return {
        revenue: 0,
        expenses: 0,
        profit: 0,
        invoices: 0,
        partners: 0,
        compliance: 0,
      };
    }
    return this.dashboardService.getQuickStats(userId);
  }
}
