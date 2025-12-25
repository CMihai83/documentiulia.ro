import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { APIAnalyticsService } from './api-analytics.service';

@ApiTags('Developer - Analytics')
@Controller('developer/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class APIAnalyticsController {
  constructor(private readonly analyticsService: APIAnalyticsService) {}

  // =================== USAGE METRICS ===================

  @Get('usage')
  @ApiOperation({ summary: 'Get API usage metrics' })
  @ApiQuery({ name: 'apiKeyId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Usage metrics' })
  async getUsageMetrics(
    @Request() req: any,
    @Query('apiKeyId') apiKeyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getUsageMetrics({
      tenantId: req.user.tenantId,
      apiKeyId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('usage/time-series')
  @ApiOperation({ summary: 'Get usage over time' })
  @ApiQuery({ name: 'period', enum: ['hour', 'day', 'week', 'month'] })
  @ApiQuery({ name: 'metric', enum: ['requests', 'latency', 'errors', 'data_transfer'] })
  @ApiQuery({ name: 'apiKeyId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Time series data' })
  async getUsageOverTime(
    @Request() req: any,
    @Query('period') period: 'hour' | 'day' | 'week' | 'month' = 'day',
    @Query('metric') metric: 'requests' | 'latency' | 'errors' | 'data_transfer' = 'requests',
    @Query('apiKeyId') apiKeyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.analyticsService.getUsageOverTime({
      tenantId: req.user.tenantId,
      apiKeyId,
      period,
      metric,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return { data, total: data.length };
  }

  // =================== ENDPOINT ANALYTICS ===================

  @Get('endpoints')
  @ApiOperation({ summary: 'Get endpoint metrics' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Endpoint metrics' })
  async getEndpointMetrics(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const metrics = await this.analyticsService.getEndpointMetrics({
      tenantId: req.user.tenantId,
      limit: limit ? parseInt(limit) : 20,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return { metrics, total: metrics.length };
  }

  @Get('endpoints/top')
  @ApiOperation({ summary: 'Get top endpoints' })
  @ApiQuery({ name: 'sortBy', enum: ['requests', 'latency', 'errors'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Top endpoints' })
  async getTopEndpoints(
    @Request() req: any,
    @Query('sortBy') sortBy: 'requests' | 'latency' | 'errors' = 'requests',
    @Query('limit') limit?: string,
  ) {
    const endpoints = await this.analyticsService.getTopEndpoints({
      tenantId: req.user.tenantId,
      sortBy,
      limit: limit ? parseInt(limit) : 10,
    });
    return { endpoints, total: endpoints.length };
  }

  // =================== ERROR TRACKING ===================

  @Get('errors')
  @ApiOperation({ summary: 'Get error metrics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Error metrics' })
  async getErrorMetrics(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getErrorMetrics({
      tenantId: req.user.tenantId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  // =================== API KEY USAGE ===================

  @Get('keys/usage')
  @ApiOperation({ summary: 'Get API key usage' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'API key usage' })
  async getAPIKeyUsage(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const usage = await this.analyticsService.getAPIKeyUsage({
      tenantId: req.user.tenantId,
      limit: limit ? parseInt(limit) : 10,
    });
    return { usage, total: usage.length };
  }

  // =================== GEOGRAPHIC ANALYTICS ===================

  @Get('geographic')
  @ApiOperation({ summary: 'Get geographic metrics' })
  @ApiResponse({ status: 200, description: 'Geographic metrics' })
  async getGeographicMetrics(@Request() req: any) {
    const metrics = await this.analyticsService.getGeographicMetrics({
      tenantId: req.user.tenantId,
    });
    return { metrics, total: metrics.length };
  }

  // =================== REAL-TIME ===================

  @Get('realtime')
  @ApiOperation({ summary: 'Get real-time metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics' })
  async getRealTimeMetrics(@Request() req: any) {
    return this.analyticsService.getRealTimeMetrics(req.user.tenantId);
  }

  // =================== EXPORT ===================

  @Get('export')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'] })
  @ApiResponse({ status: 200, description: 'Export data' })
  async exportAnalytics(
    @Request() req: any,
    @Res() res: Response,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    const { data, filename } = await this.analyticsService.exportAnalytics({
      tenantId: req.user.tenantId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      format,
    });

    res.set({
      'Content-Type': format === 'json' ? 'application/json' : 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(data);
  }

  // =================== TRACK REQUEST (Internal) ===================

  @Post('track')
  @ApiOperation({ summary: 'Track API request (internal use)' })
  @ApiResponse({ status: 201, description: 'Request tracked' })
  async trackRequest(
    @Body() body: {
      tenantId: string;
      apiKeyId?: string;
      userId?: string;
      method: string;
      endpoint: string;
      statusCode: number;
      duration: number;
      requestSize: number;
      responseSize: number;
      userAgent?: string;
      ipAddress?: string;
      country?: string;
      error?: string;
    },
  ) {
    await this.analyticsService.trackRequest(body);
    return { success: true };
  }
}
