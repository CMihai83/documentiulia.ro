import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  AlertingService,
  AlertType,
  AlertSeverity,
  Alert,
  AlertThresholds,
  HealthCheckResult,
} from './alerting.service';

@ApiTags('monitoring')
@Controller('monitoring')
export class AlertingController {
  constructor(private readonly alertingService: AlertingService) {}

  // =================== ALERTS ===================

  @Get('alerts')
  @ApiOperation({ summary: 'Get all active alerts' })
  @ApiResponse({ status: 200, description: 'Returns active alerts' })
  getActiveAlerts() {
    return {
      alerts: this.alertingService.getActiveAlerts(),
      stats: this.alertingService.getAlertStats(),
    };
  }

  @Get('alerts/all')
  @ApiOperation({ summary: 'Get all alerts including resolved' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max alerts to return' })
  @ApiResponse({ status: 200, description: 'Returns all alerts' })
  getAllAlerts(@Query('limit') limit?: string) {
    return this.alertingService.getAllAlerts(limit ? parseInt(limit, 10) : 100);
  }

  @Get('alerts/type/:type')
  @ApiOperation({ summary: 'Get alerts by type' })
  @ApiParam({ name: 'type', enum: AlertType })
  @ApiResponse({ status: 200, description: 'Returns alerts of specified type' })
  getAlertsByType(@Param('type') type: AlertType) {
    return this.alertingService.getAlertsByType(type);
  }

  @Get('alerts/stats')
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiResponse({ status: 200, description: 'Returns alert statistics' })
  getAlertStats() {
    return this.alertingService.getAlertStats();
  }

  @Post('alerts/:alertId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID to resolve' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  resolveAlert(@Param('alertId') alertId: string) {
    const resolved = this.alertingService.resolveAlert(alertId);
    return { success: resolved, alertId };
  }

  @Post('alerts/test')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a test alert' })
  @ApiResponse({ status: 201, description: 'Test alert created' })
  async createTestAlert(
    @Body() body: { severity?: AlertSeverity; title?: string; message?: string },
  ) {
    const alert = await this.alertingService.createAlert({
      type: AlertType.SYSTEM_HEALTH,
      severity: body.severity || AlertSeverity.INFO,
      title: body.title || 'Test Alert',
      message: body.message || 'This is a test alert created manually',
      metadata: { isTest: true, createdAt: new Date().toISOString() },
    });
    return alert;
  }

  // =================== HEALTH CHECKS ===================

  @Get('health-check')
  @ApiOperation({ summary: 'Run manual health check' })
  @ApiResponse({ status: 200, description: 'Health check results' })
  async runHealthCheck() {
    const results = await this.alertingService.triggerHealthCheck();
    const allHealthy = results.memory.healthy && results.database.healthy;

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: results,
    };
  }

  // =================== THRESHOLDS ===================

  @Get('thresholds')
  @ApiOperation({ summary: 'Get alert thresholds' })
  @ApiResponse({ status: 200, description: 'Returns current thresholds' })
  getThresholds() {
    return this.alertingService.getThresholds();
  }

  @Put('thresholds')
  @ApiOperation({ summary: 'Update alert thresholds' })
  @ApiResponse({ status: 200, description: 'Thresholds updated' })
  updateThresholds(
    @Body() updates: {
      memoryUsagePercent?: number;
      errorRatePercent?: number;
      dbLatencyMs?: number;
      apiLatencyMs?: number;
    },
  ) {
    this.alertingService.updateThresholds(updates);
    return {
      success: true,
      thresholds: this.alertingService.getThresholds(),
    };
  }

  // =================== DASHBOARD ===================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get monitoring dashboard data' })
  @ApiResponse({ status: 200, description: 'Returns monitoring dashboard data' })
  async getDashboard() {
    const [healthCheck, alertStats, thresholds] = await Promise.all([
      this.alertingService.triggerHealthCheck(),
      this.alertingService.getAlertStats(),
      this.alertingService.getThresholds(),
    ]);

    const memoryUsage = process.memoryUsage();
    const activeAlerts = this.alertingService.getActiveAlerts();

    return {
      status: {
        overall: healthCheck.database.healthy && healthCheck.memory.healthy ? 'healthy' : 'degraded',
        database: healthCheck.database.healthy ? 'healthy' : 'unhealthy',
        memory: healthCheck.memory.healthy ? 'healthy' : 'warning',
        anaf: healthCheck.anaf.healthy ? 'connected' : 'disconnected',
      },
      metrics: {
        uptime: process.uptime(),
        memoryUsage: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
          usagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        },
        latency: {
          databaseMs: healthCheck.database.latencyMs,
          anafMs: healthCheck.anaf.latencyMs,
        },
      },
      alerts: {
        stats: alertStats,
        recent: activeAlerts.slice(0, 5),
        criticalCount: alertStats.bySeverity.critical,
        warningCount: alertStats.bySeverity.warning,
      },
      thresholds,
      timestamp: new Date().toISOString(),
    };
  }
}
