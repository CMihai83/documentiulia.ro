import {
  Controller,
  Get,
  Post,
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
import { BudgetVarianceService, VarianceThreshold } from './budget-variance.service';

@ApiTags('Budget Management - Variance Analysis')
@Controller('budgets/variance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetVarianceController {
  constructor(private readonly varianceService: BudgetVarianceService) {}

  // =================== VARIANCE ANALYSIS ===================

  @Post('analyze/:budgetId')
  @ApiOperation({ summary: 'Analyze budget variance' })
  @ApiResponse({ status: 201, description: 'Variance analysis completed' })
  async analyzeVariance(
    @Request() req: any,
    @Param('budgetId') budgetId: string,
    @Body() body: { period?: string },
  ) {
    try {
      return await this.varianceService.analyzeVariance(
        budgetId,
        body.period,
        req.user.id,
      );
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('analysis/:id')
  @ApiOperation({ summary: 'Get variance analysis by ID' })
  @ApiResponse({ status: 200, description: 'Variance analysis details' })
  async getVarianceAnalysis(@Param('id') id: string) {
    const analysis = await this.varianceService.getVarianceAnalysis(id);
    if (!analysis) {
      return { error: 'Analysis not found' };
    }
    return analysis;
  }

  @Get('history')
  @ApiOperation({ summary: 'Get variance analysis history' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Variance analysis history' })
  async getVarianceHistory(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
    @Query('limit') limit?: string,
  ) {
    const analyses = await this.varianceService.getVarianceHistory(
      req.user.tenantId,
      budgetId,
      limit ? parseInt(limit) : undefined,
    );
    return { analyses, total: analyses.length };
  }

  // =================== VARIANCE TRENDS ===================

  @Get('trends')
  @ApiOperation({ summary: 'Get variance trends' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiQuery({ name: 'periods', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Variance trends' })
  async getVarianceTrends(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
    @Query('periods') periods?: string,
  ) {
    const trends = await this.varianceService.getVarianceTrends(
      req.user.tenantId,
      budgetId,
      periods ? parseInt(periods) : undefined,
    );
    return { trends, total: trends.length };
  }

  // =================== THRESHOLDS ===================

  @Post('thresholds')
  @ApiOperation({ summary: 'Set variance threshold' })
  @ApiResponse({ status: 201, description: 'Threshold set' })
  async setVarianceThreshold(
    @Request() req: any,
    @Body() body: {
      budgetId?: string;
      categoryId?: string;
      thresholdType: VarianceThreshold['thresholdType'];
      warningThreshold: number;
      criticalThreshold: number;
      notifyOnWarning?: boolean;
      notifyOnCritical?: boolean;
      notificationRecipients?: string[];
    },
  ) {
    return this.varianceService.setVarianceThreshold({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('thresholds')
  @ApiOperation({ summary: 'Get variance thresholds' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiResponse({ status: 200, description: 'Variance thresholds' })
  async getVarianceThresholds(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
  ) {
    const thresholds = await this.varianceService.getVarianceThresholds(
      req.user.tenantId,
      budgetId,
    );
    return { thresholds, total: thresholds.length };
  }

  // =================== COMPARISON ===================

  @Post('compare')
  @ApiOperation({ summary: 'Compare multiple budgets' })
  @ApiResponse({ status: 200, description: 'Budget comparison' })
  async compareBudgets(@Body() body: { budgetIds: string[] }) {
    if (!body.budgetIds || body.budgetIds.length < 2) {
      return { error: 'At least 2 budget IDs required for comparison' };
    }
    return this.varianceService.compareBudgets(body.budgetIds);
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get variance statistics' })
  @ApiResponse({ status: 200, description: 'Variance statistics' })
  async getStatistics(@Request() req: any) {
    return this.varianceService.getVarianceStatistics(req.user.tenantId);
  }
}
