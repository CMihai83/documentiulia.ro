import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ValueMetricsService } from '../common/services/value-metrics.service';

@ApiTags('value-metrics')
@Controller('value-metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ValueMetricsController {
  constructor(private readonly valueMetricsService: ValueMetricsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user value metrics and ROI',
    description:
      'Returns comprehensive value metrics showing time saved, deductions found, fines avoided, and ROI',
  })
  @ApiQuery({
    name: 'period',
    enum: ['month', 'quarter', 'year', 'all-time'],
    required: false,
  })
  async getValueMetrics(
    @Request() req: any,
    @Query('period') period: 'month' | 'quarter' | 'year' | 'all-time' = 'month',
  ) {
    const userId = req.user?.sub || req.user?.id;
    return this.valueMetricsService.calculateUserValue(userId, period);
  }

  @Get('insights')
  @ApiOperation({
    summary: 'Get personalized value insights',
    description:
      'Returns actionable insights about value delivered (for dashboard display)',
  })
  async getValueInsights(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return {
      insights: await this.valueMetricsService.getValueInsights(userId),
    };
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Compare user value to platform average',
    description: 'Shows how user ROI compares to other users (motivation)',
  })
  async compareToAverage(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.valueMetricsService.compareToAverage(userId);
  }
}
