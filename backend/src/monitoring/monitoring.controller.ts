import { Controller, Get, Post, Body, Param, Query, Delete, Put, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  // =================== DASHBOARD ===================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get monitoring dashboard' })
  @ApiResponse({ status: 200, description: 'Returns complete monitoring dashboard' })
  async getDashboard() {
    return this.monitoringService.getDashboard();
  }

  // =================== SYSTEM METRICS ===================

  @Get('system')
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiResponse({ status: 200, description: 'Returns system metrics (CPU, memory, etc.)' })
  async getSystemMetrics() {
    return this.monitoringService.getSystemMetrics();
  }

  @Get('application')
  @ApiOperation({ summary: 'Get application metrics' })
  @ApiResponse({ status: 200, description: 'Returns application metrics (requests, latency, errors)' })
  async getApplicationMetrics() {
    return this.monitoringService.getApplicationMetrics();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get all recorded metrics' })
  @ApiResponse({ status: 200, description: 'Returns all metrics' })
  async getAllMetrics() {
    return this.monitoringService.getAllMetrics();
  }

  @Get('metrics/:name')
  @ApiOperation({ summary: 'Get specific metric' })
  @ApiResponse({ status: 200, description: 'Returns specific metric' })
  async getMetric(@Param('name') name: string) {
    return this.monitoringService.getMetric(name);
  }

  @Get('metrics/:name/history')
  @ApiOperation({ summary: 'Get metric history' })
  @ApiResponse({ status: 200, description: 'Returns metric history' })
  async getMetricHistory(
    @Param('name') name: string,
    @Query('since') since?: string,
  ) {
    const sinceDate = since ? new Date(since) : undefined;
    return this.monitoringService.getMetricHistory(name, sinceDate);
  }

  // =================== HEALTH CHECKS ===================

  @Get('health')
  @ApiOperation({ summary: 'Get health status' })
  @ApiResponse({ status: 200, description: 'Returns health checks status' })
  async getHealth() {
    return {
      overall: this.monitoringService.getOverallHealth(),
      checks: this.monitoringService.getHealthChecks(),
      timestamp: new Date(),
    };
  }

  @Get('health/checks')
  @ApiOperation({ summary: 'Get all health checks' })
  @ApiResponse({ status: 200, description: 'Returns all health checks' })
  async getHealthChecks() {
    return this.monitoringService.getHealthChecks();
  }

  // =================== ALERTS ===================

  @Get('alerts')
  @ApiOperation({ summary: 'Get active alerts' })
  @ApiResponse({ status: 200, description: 'Returns active alerts' })
  async getActiveAlerts() {
    return this.monitoringService.getActiveAlerts();
  }

  @Get('alerts/history')
  @ApiOperation({ summary: 'Get alert history' })
  @ApiResponse({ status: 200, description: 'Returns alert history' })
  async getAlertHistory(@Query('limit') limit?: string) {
    return this.monitoringService.getAlertHistory(limit ? parseInt(limit) : undefined);
  }

  @Post('alerts/:id/acknowledge')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Param('id') alertId: string,
    @Body('acknowledgedBy') acknowledgedBy: string,
  ) {
    const result = this.monitoringService.acknowledgeAlert(alertId, acknowledgedBy);
    return { success: result };
  }

  @Post('alerts/:id/resolve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(@Param('id') alertId: string) {
    const result = this.monitoringService.resolveAlert(alertId);
    return { success: result };
  }

  // =================== ALERT RULES ===================

  @Get('alert-rules')
  @ApiOperation({ summary: 'Get alert rules' })
  @ApiResponse({ status: 200, description: 'Returns alert rules' })
  async getAlertRules() {
    return this.monitoringService.getAlertRules();
  }

  @Post('alert-rules')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created' })
  async createAlertRule(
    @Body() body: {
      name: string;
      description: string;
      metric: string;
      condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
      threshold: number;
      duration: number;
      severity: 'critical' | 'warning' | 'info';
    },
  ) {
    return this.monitoringService.createAlertRule(
      body.name,
      body.description,
      body.metric,
      body.condition,
      body.threshold,
      body.duration,
      body.severity,
    );
  }

  @Put('alert-rules/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update alert rule' })
  @ApiResponse({ status: 200, description: 'Alert rule updated' })
  async updateAlertRule(
    @Param('id') ruleId: string,
    @Body() updates: Partial<{
      name: string;
      description: string;
      threshold: number;
      duration: number;
      severity: 'critical' | 'warning' | 'info';
      enabled: boolean;
    }>,
  ) {
    return this.monitoringService.updateAlertRule(ruleId, updates);
  }

  @Delete('alert-rules/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete alert rule' })
  @ApiResponse({ status: 200, description: 'Alert rule deleted' })
  async deleteAlertRule(@Param('id') ruleId: string) {
    const result = this.monitoringService.deleteAlertRule(ruleId);
    return { success: result };
  }

  // =================== PROMETHEUS EXPORT ===================

  @Get('prometheus')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Returns Prometheus format metrics' })
  async getPrometheusMetrics() {
    return this.monitoringService.getPrometheusMetrics();
  }

  // =================== ANAF COMPLIANCE METRICS (Sprint 10) ===================

  @Get('anaf-compliance')
  @ApiOperation({ summary: 'Get ANAF compliance metrics summary' })
  @ApiResponse({ status: 200, description: 'Returns ANAF compliance summary' })
  async getAnafComplianceSummary() {
    return {
      ...this.monitoringService.getAnafComplianceSummary(),
      timestamp: new Date(),
      compliance: {
        legea141_2025: {
          status: 'compliant',
          description: 'VAT rates 21%/11% per Legea 141/2025',
          effectiveDate: '2025-08-01',
        },
        ordin1783_2021: {
          status: 'compliant',
          description: 'SAF-T D406 monthly XML submission',
          pilotPeriod: {
            start: '2025-09-01',
            end: '2026-08-31',
            gracePeriod: '6 months',
          },
        },
        efactura: {
          status: 'compliant',
          description: 'e-Factura B2B/B2G via SPV',
          mandatoryDate: '2024-01-01',
        },
      },
    };
  }
}
