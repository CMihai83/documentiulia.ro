import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PerformanceMetricsService } from './performance-metrics.service';

@Controller('performance/metrics')
export class PerformanceMetricsController {
  constructor(private readonly metricsService: PerformanceMetricsService) {}

  @Post('record')
  async recordMetric(
    @Body() body: {
      name: string;
      value: number;
      tags?: Record<string, string>;
      unit?: string;
    },
  ) {
    if (!body.name || body.value === undefined) {
      throw new BadRequestException('Name and value are required');
    }

    await this.metricsService.record(body);

    return {
      success: true,
      data: { recorded: true },
    };
  }

  @Get('summary/:name')
  async getMetricSummary(
    @Param('name') name: string,
    @Query('period') period?: string,
  ) {
    const validPeriods = ['minute', 'hour', 'day'];
    const summaryPeriod = validPeriods.includes(period || '')
      ? (period as 'minute' | 'hour' | 'day')
      : 'hour';

    const summary = await this.metricsService.getSummary(name, summaryPeriod);

    if (!summary) {
      throw new BadRequestException('Metric not found or no data available');
    }

    return {
      success: true,
      data: summary,
    };
  }

  @Get('system')
  async getSystemMetrics() {
    const metrics = await this.metricsService.getSystemMetrics();

    return {
      success: true,
      data: metrics,
    };
  }

  @Get('endpoints')
  async getEndpointMetrics(@Query('period') period?: string) {
    const validPeriods = ['minute', 'hour', 'day'];
    const metricsPeriod = validPeriods.includes(period || '')
      ? (period as 'minute' | 'hour' | 'day')
      : 'hour';

    const metrics = await this.metricsService.getEndpointMetrics(metricsPeriod);

    return {
      success: true,
      data: { endpoints: metrics },
    };
  }

  @Get('alerts')
  async getAlerts(@Query('unresolved') unresolved?: string) {
    const alerts = await this.metricsService.getAlerts(unresolved === 'true');

    return {
      success: true,
      data: { alerts },
    };
  }

  @Post('alerts/:id/resolve')
  async resolveAlert(@Param('id') id: string) {
    const resolved = await this.metricsService.resolveAlert(id);

    if (!resolved) {
      throw new BadRequestException('Alert not found');
    }

    return {
      success: true,
      data: { resolved },
    };
  }

  @Get('names')
  async getMetricNames() {
    const names = await this.metricsService.getMetricNames();

    return {
      success: true,
      data: { names },
    };
  }

  @Get('data/:name')
  async getMetricData(
    @Param('name') name: string,
    @Query('period') period?: string,
    @Query('resolution') resolution?: string,
  ) {
    const validPeriods = ['minute', 'hour', 'day'];
    const dataPeriod = validPeriods.includes(period || '')
      ? (period as 'minute' | 'hour' | 'day')
      : 'hour';

    const data = await this.metricsService.getMetricData(
      name,
      dataPeriod,
      resolution ? parseInt(resolution) : 60,
    );

    return {
      success: true,
      data: { name, points: data },
    };
  }

  @Get('dashboard')
  async getDashboard() {
    const [systemMetrics, endpoints, alerts] = await Promise.all([
      this.metricsService.getSystemMetrics(),
      this.metricsService.getEndpointMetrics('hour'),
      this.metricsService.getAlerts(true),
    ]);

    const responseTimeSummary = await this.metricsService.getSummary('http.response_time', 'hour');

    return {
      success: true,
      data: {
        system: systemMetrics,
        responseTime: responseTimeSummary,
        topEndpoints: endpoints.slice(0, 5),
        alertCount: alerts.length,
        recentAlerts: alerts.slice(0, 5),
      },
    };
  }
}
