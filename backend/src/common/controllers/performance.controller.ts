import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PerformanceService, PerformanceConfig } from '../services/performance.service';

@ApiTags('performance')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  // =================== METRICS ===================

  @Get('metrics')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Returns performance metrics' })
  getMetrics() {
    return this.performanceService.getMetrics();
  }

  @Get('query-stats')
  @ApiOperation({ summary: 'Get query statistics' })
  @ApiResponse({ status: 200, description: 'Returns query statistics' })
  getQueryStats() {
    return this.performanceService.getQueryStats();
  }

  @Get('slow-queries')
  @ApiOperation({ summary: 'Get slow queries' })
  @ApiResponse({ status: 200, description: 'Returns slow queries list' })
  getSlowQueries(@Query('limit') limit?: string) {
    return {
      slowQueries: this.performanceService.getSlowQueries(limit ? parseInt(limit) : 20),
      threshold: this.performanceService.getConfig().slowQueryThresholdMs,
    };
  }

  @Delete('slow-queries')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear slow queries log' })
  @ApiResponse({ status: 200, description: 'Slow queries cleared' })
  clearSlowQueries() {
    this.performanceService.clearSlowQueries();
    return { success: true, message: 'Slow queries log cleared' };
  }

  // =================== RECOMMENDATIONS ===================

  @Get('recommendations')
  @ApiOperation({ summary: 'Get optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Returns optimization recommendations' })
  getRecommendations() {
    return {
      recommendations: this.performanceService.getOptimizationRecommendations(),
      generatedAt: new Date(),
    };
  }

  // =================== DASHBOARD ===================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get performance dashboard' })
  @ApiResponse({ status: 200, description: 'Returns complete performance dashboard' })
  getDashboard() {
    const metrics = this.performanceService.getMetrics();
    const queryStats = this.performanceService.getQueryStats();
    const recommendations = this.performanceService.getOptimizationRecommendations();
    const config = this.performanceService.getConfig();

    return {
      metrics,
      queryStats,
      recommendations,
      config,
      uptime: this.performanceService.getUptime(),
      timestamp: new Date(),
    };
  }

  // =================== CONFIGURATION ===================

  @Get('config')
  @ApiOperation({ summary: 'Get performance configuration' })
  @ApiResponse({ status: 200, description: 'Returns performance configuration' })
  getConfig() {
    return this.performanceService.getConfig();
  }

  @Post('config')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update performance configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  updateConfig(@Body() updates: Partial<PerformanceConfig>) {
    this.performanceService.updateConfig(updates);
    return {
      success: true,
      config: this.performanceService.getConfig(),
    };
  }

  // =================== UTILITIES ===================

  @Post('reset')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset all performance metrics' })
  @ApiResponse({ status: 200, description: 'Metrics reset' })
  resetMetrics() {
    this.performanceService.resetMetrics();
    return { success: true, message: 'Performance metrics reset' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get performance health status' })
  @ApiResponse({ status: 200, description: 'Returns performance health' })
  getHealth() {
    const metrics = this.performanceService.getMetrics();
    const recommendations = this.performanceService.getOptimizationRecommendations();

    // Determine health status based on metrics
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (metrics.memoryUsage.percentUsed > 90) {
      status = 'critical';
    } else if (metrics.memoryUsage.percentUsed > 80 || metrics.averageResponseTime > 500) {
      status = 'warning';
    }

    return {
      status,
      metrics: {
        averageResponseTime: metrics.averageResponseTime,
        memoryUsage: metrics.memoryUsage.percentUsed,
        slowQueries: metrics.slowQueries.length,
        requestCount: metrics.requestCount,
      },
      issues: recommendations.filter(r => !r.includes('performing well')),
      uptime: this.performanceService.getUptime(),
    };
  }
}
