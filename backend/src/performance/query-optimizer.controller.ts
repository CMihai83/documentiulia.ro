import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { QueryOptimizerService } from './query-optimizer.service';

@Controller('performance/queries')
export class QueryOptimizerController {
  constructor(private readonly queryOptimizer: QueryOptimizerService) {}

  @Post('analyze')
  async analyzeQuery(@Body() body: { query: string }) {
    if (!body.query) {
      throw new BadRequestException('Query is required');
    }

    const analysis = await this.queryOptimizer.analyzeQuery(body.query);

    return {
      success: true,
      data: analysis,
    };
  }

  @Get('slow-report')
  async getSlowQueryReport(
    @Request() req: any,
    @Query('period') period?: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const validPeriods = ['hour', 'day', 'week'];
    const reportPeriod = validPeriods.includes(period || '')
      ? (period as 'hour' | 'day' | 'week')
      : 'day';

    const report = await this.queryOptimizer.getSlowQueryReport(tenantId, reportPeriod);

    return {
      success: true,
      data: report,
    };
  }

  @Get('index-recommendations')
  async getIndexRecommendations(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const recommendations = await this.queryOptimizer.getIndexRecommendations(tenantId);

    return {
      success: true,
      data: { recommendations },
    };
  }

  @Get('stats')
  async getQueryStats(@Request() req: any) {
    const tenantId = req.user?.tenantId || 'tenant_demo';
    const stats = await this.queryOptimizer.getQueryStats(tenantId);

    return {
      success: true,
      data: stats,
    };
  }
}
