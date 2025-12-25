import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Logger,
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
  DashboardAnalyticsService,
  DashboardMetrics,
  RevenueDataPoint,
  ActivityItem,
  GoalProgress,
  DateRangeType,
} from './dashboard-analytics.service';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    activeOrganizationId?: string;
  };
}

@ApiTags('Dashboard Analytics')
@Controller('analytics/dashboard')
export class DashboardAnalyticsController {
  private readonly logger = new Logger(DashboardAnalyticsController.name);

  constructor(
    private readonly dashboardAnalyticsService: DashboardAnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get the user's active organization ID
   */
  private async getOrganizationId(req: AuthenticatedRequest): Promise<string | null> {
    // First check if user has activeOrganizationId in JWT
    if (req.user.activeOrganizationId) {
      return req.user.activeOrganizationId;
    }

    // Fallback: fetch from database
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { activeOrganizationId: true },
    });

    return user?.activeOrganizationId || null;
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard metrics overview' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '1y'],
    description: 'Date range for metrics',
  })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMetrics(
    @Request() req: AuthenticatedRequest,
    @Query('range') range?: DateRangeType,
  ): Promise<DashboardMetrics> {
    const organizationId = await this.getOrganizationId(req);

    if (!organizationId) {
      // Return default metrics for users without organization
      return {
        revenue: { total: 0, change: 0, currency: 'EUR' },
        invoices: { total: 0, change: 0, paid: 0, pending: 0, overdue: 0, cancelled: 0 },
        clients: { total: 0, change: 0, active: 0, new: 0 },
        documents: { processed: 0, avgAccuracy: 99.0, avgProcessingTime: 2.4 },
      };
    }

    this.logger.log(`Getting dashboard metrics for user ${req.user.id}, org ${organizationId}`);
    return this.dashboardAnalyticsService.getDashboardMetrics(organizationId, range || '30d');
  }

  @Get('revenue-trend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get revenue trend for charts' })
  @ApiQuery({
    name: 'months',
    required: false,
    type: Number,
    description: 'Number of months to include',
  })
  @ApiResponse({ status: 200, description: 'Revenue trend data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRevenueTrend(
    @Request() req: AuthenticatedRequest,
    @Query('months') months?: number,
  ): Promise<RevenueDataPoint[]> {
    const organizationId = await this.getOrganizationId(req);

    if (!organizationId) {
      return [];
    }

    this.logger.log(`Getting revenue trend for user ${req.user.id}, org ${organizationId}`);
    return this.dashboardAnalyticsService.getRevenueTrend(organizationId, months || 6);
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of activities to return',
  })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecentActivity(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ): Promise<ActivityItem[]> {
    const organizationId = await this.getOrganizationId(req);

    if (!organizationId) {
      return [];
    }

    this.logger.log(`Getting recent activity for user ${req.user.id}, org ${organizationId}`);
    return this.dashboardAnalyticsService.getRecentActivity(organizationId, limit || 10);
  }

  @Get('goals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get monthly goals progress' })
  @ApiResponse({ status: 200, description: 'Goals progress retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGoalsProgress(
    @Request() req: AuthenticatedRequest,
  ): Promise<GoalProgress[]> {
    const organizationId = await this.getOrganizationId(req);

    if (!organizationId) {
      return [
        { name: 'Venituri', current: 0, target: 50000, unit: '€', percentComplete: 0 },
        { name: 'Facturi noi', current: 0, target: 150, unit: '', percentComplete: 0 },
        { name: 'Clienți noi', current: 0, target: 10, unit: '', percentComplete: 0 },
      ];
    }

    this.logger.log(`Getting goals progress for user ${req.user.id}, org ${organizationId}`);
    return this.dashboardAnalyticsService.getGoalsProgress(organizationId);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete dashboard summary' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', '1y'],
    description: 'Date range for metrics',
  })
  @ApiResponse({ status: 200, description: 'Dashboard summary retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboardSummary(
    @Request() req: AuthenticatedRequest,
    @Query('range') range?: DateRangeType,
  ): Promise<{
    metrics: DashboardMetrics;
    revenueTrend: RevenueDataPoint[];
    recentActivity: ActivityItem[];
    goals: GoalProgress[];
    lastUpdated: string;
  }> {
    const organizationId = await this.getOrganizationId(req);

    this.logger.log(`Getting complete dashboard summary for user ${req.user.id}`);

    if (!organizationId) {
      return {
        metrics: {
          revenue: { total: 0, change: 0, currency: 'EUR' },
          invoices: { total: 0, change: 0, paid: 0, pending: 0, overdue: 0, cancelled: 0 },
          clients: { total: 0, change: 0, active: 0, new: 0 },
          documents: { processed: 0, avgAccuracy: 99.0, avgProcessingTime: 2.4 },
        },
        revenueTrend: [],
        recentActivity: [],
        goals: [
          { name: 'Venituri', current: 0, target: 50000, unit: '€', percentComplete: 0 },
          { name: 'Facturi noi', current: 0, target: 150, unit: '', percentComplete: 0 },
          { name: 'Clienți noi', current: 0, target: 10, unit: '', percentComplete: 0 },
        ],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Fetch all data in parallel
    const [metrics, revenueTrend, recentActivity, goals] = await Promise.all([
      this.dashboardAnalyticsService.getDashboardMetrics(organizationId, range || '30d'),
      this.dashboardAnalyticsService.getRevenueTrend(organizationId, 6),
      this.dashboardAnalyticsService.getRecentActivity(organizationId, 10),
      this.dashboardAnalyticsService.getGoalsProgress(organizationId),
    ]);

    return {
      metrics,
      revenueTrend,
      recentActivity,
      goals,
      lastUpdated: new Date().toISOString(),
    };
  }
}
