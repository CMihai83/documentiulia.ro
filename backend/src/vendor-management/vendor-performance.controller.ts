import {
  Controller,
  Get,
  Post,
  Put,
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
  VendorPerformanceService,
  PerformanceMetric,
  MetricScore,
  ActionItem,
  PerformanceAlert,
} from './vendor-performance.service';

@ApiTags('Vendor Management - Performance')
@Controller('vendors/performance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorPerformanceController {
  constructor(private readonly performanceService: VendorPerformanceService) {}

  // =================== METRICS ===================

  @Post('metrics')
  @ApiOperation({ summary: 'Create performance metric' })
  @ApiResponse({ status: 201, description: 'Metric created' })
  async createMetric(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      category: PerformanceMetric['category'];
      weight: number;
      targetValue?: number;
      targetUnit?: string;
      scoringMethod: PerformanceMetric['scoringMethod'];
    },
  ) {
    return this.performanceService.createMetric({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Metrics list' })
  async getMetrics(@Request() req: any) {
    const metrics = await this.performanceService.getMetrics(req.user.tenantId);
    return { metrics, total: metrics.length };
  }

  @Put('metrics/:id')
  @ApiOperation({ summary: 'Update performance metric' })
  @ApiResponse({ status: 200, description: 'Metric updated' })
  async updateMetric(
    @Param('id') id: string,
    @Body() body: Partial<PerformanceMetric>,
  ) {
    const metric = await this.performanceService.updateMetric(id, body);
    if (!metric) {
      return { error: 'Metric not found' };
    }
    return metric;
  }

  // =================== SCORECARDS ===================

  @Post('scorecards')
  @ApiOperation({ summary: 'Create vendor scorecard' })
  @ApiResponse({ status: 201, description: 'Scorecard created' })
  async createScorecard(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      evaluationPeriod: string;
      scores: Omit<MetricScore, 'weightedScore'>[];
      strengths?: string[];
      improvements?: string[];
      actionItems?: Omit<ActionItem, 'id'>[];
      comments?: string;
    },
  ) {
    try {
      return await this.performanceService.createScorecard({
        tenantId: req.user.tenantId,
        vendorId: body.vendorId,
        evaluationPeriod: body.evaluationPeriod,
        scores: body.scores,
        strengths: body.strengths,
        improvements: body.improvements,
        actionItems: body.actionItems,
        comments: body.comments,
        evaluatedBy: req.user.id,
        evaluatedByName: req.user.name || req.user.email,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('scorecards')
  @ApiOperation({ summary: 'Get scorecards' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'minScore', required: false, type: Number })
  @ApiQuery({ name: 'maxScore', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Scorecards list' })
  async getScorecards(
    @Request() req: any,
    @Query('vendorId') vendorId?: string,
    @Query('period') period?: string,
    @Query('status') status?: 'draft' | 'submitted' | 'approved' | 'rejected',
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('limit') limit?: string,
  ) {
    const scorecards = await this.performanceService.getScorecards(req.user.tenantId, {
      vendorId,
      period,
      status,
      minScore: minScore ? parseFloat(minScore) : undefined,
      maxScore: maxScore ? parseFloat(maxScore) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { scorecards, total: scorecards.length };
  }

  @Get('scorecards/:id')
  @ApiOperation({ summary: 'Get scorecard by ID' })
  @ApiResponse({ status: 200, description: 'Scorecard details' })
  async getScorecard(@Param('id') id: string) {
    const scorecard = await this.performanceService.getScorecard(id);
    if (!scorecard) {
      return { error: 'Scorecard not found' };
    }
    return scorecard;
  }

  @Get('vendor/:vendorId/scorecards')
  @ApiOperation({ summary: 'Get vendor scorecards' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vendor scorecards' })
  async getVendorScorecards(
    @Param('vendorId') vendorId: string,
    @Query('limit') limit?: string,
  ) {
    const scorecards = await this.performanceService.getVendorScorecards(
      vendorId,
      limit ? parseInt(limit) : undefined,
    );
    return { scorecards, total: scorecards.length };
  }

  @Post('scorecards/:id/submit')
  @ApiOperation({ summary: 'Submit scorecard' })
  @ApiResponse({ status: 200, description: 'Scorecard submitted' })
  async submitScorecard(@Param('id') id: string) {
    const scorecard = await this.performanceService.submitScorecard(id);
    if (!scorecard) {
      return { error: 'Scorecard not found or not in draft status' };
    }
    return scorecard;
  }

  @Post('scorecards/:id/approve')
  @ApiOperation({ summary: 'Approve scorecard' })
  @ApiResponse({ status: 200, description: 'Scorecard approved' })
  async approveScorecard(@Request() req: any, @Param('id') id: string) {
    const scorecard = await this.performanceService.approveScorecard(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!scorecard) {
      return { error: 'Scorecard not found or not submitted' };
    }
    return scorecard;
  }

  // =================== TRENDS ===================

  @Get('vendor/:vendorId/trends')
  @ApiOperation({ summary: 'Get vendor performance trends' })
  @ApiQuery({ name: 'periods', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Performance trends' })
  async getPerformanceTrends(
    @Param('vendorId') vendorId: string,
    @Query('periods') periods?: string,
  ) {
    const trends = await this.performanceService.getPerformanceTrends(
      vendorId,
      periods ? parseInt(periods) : undefined,
    );
    return { trends, total: trends.length };
  }

  // =================== RANKINGS ===================

  @Get('rankings')
  @ApiOperation({ summary: 'Get vendor rankings' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tier', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Vendor rankings' })
  async getVendorRankings(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('tier') tier?: string,
    @Query('limit') limit?: string,
  ) {
    const rankings = await this.performanceService.getVendorRankings(req.user.tenantId, {
      category,
      tier,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { rankings, total: rankings.length };
  }

  // =================== ALERTS ===================

  @Get('alerts')
  @ApiOperation({ summary: 'Get performance alerts' })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'acknowledged', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Performance alerts' })
  async getAlerts(
    @Request() req: any,
    @Query('vendorId') vendorId?: string,
    @Query('severity') severity?: PerformanceAlert['severity'],
    @Query('acknowledged') acknowledged?: string,
    @Query('limit') limit?: string,
  ) {
    const alerts = await this.performanceService.getAlerts(req.user.tenantId, {
      vendorId,
      severity,
      acknowledged: acknowledged ? acknowledged === 'true' : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { alerts, total: alerts.length };
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(@Request() req: any, @Param('id') id: string) {
    const alert = await this.performanceService.acknowledgeAlert(id, req.user.id);
    if (!alert) {
      return { error: 'Alert not found' };
    }
    return alert;
  }

  // =================== GOALS ===================

  @Post('goals')
  @ApiOperation({ summary: 'Create performance goal' })
  @ApiResponse({ status: 201, description: 'Goal created' })
  async createGoal(
    @Request() req: any,
    @Body() body: {
      vendorId: string;
      metricId: string;
      targetValue: number;
      startDate: string;
      endDate: string;
      notes?: string;
    },
  ) {
    try {
      return await this.performanceService.createGoal({
        tenantId: req.user.tenantId,
        vendorId: body.vendorId,
        metricId: body.metricId,
        targetValue: body.targetValue,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        notes: body.notes,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('vendor/:vendorId/goals')
  @ApiOperation({ summary: 'Get vendor goals' })
  @ApiResponse({ status: 200, description: 'Vendor goals' })
  async getVendorGoals(@Param('vendorId') vendorId: string) {
    const goals = await this.performanceService.getVendorGoals(vendorId);
    return { goals, total: goals.length };
  }

  @Put('goals/:id/progress')
  @ApiOperation({ summary: 'Update goal progress' })
  @ApiResponse({ status: 200, description: 'Goal progress updated' })
  async updateGoalProgress(
    @Param('id') id: string,
    @Body() body: { currentValue: number },
  ) {
    const goal = await this.performanceService.updateGoalProgress(id, body.currentValue);
    if (!goal) {
      return { error: 'Goal not found or not active' };
    }
    return goal;
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get performance statistics' })
  @ApiResponse({ status: 200, description: 'Performance statistics' })
  async getStatistics(@Request() req: any) {
    return this.performanceService.getPerformanceStatistics(req.user.tenantId);
  }
}
