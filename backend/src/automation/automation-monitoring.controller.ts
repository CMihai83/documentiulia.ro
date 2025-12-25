import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
  AutomationMonitoringService,
  AlertSeverity,
  AlertStatus,
  AlertRule,
} from './automation-monitoring.service';

@ApiTags('Automation - Monitoring')
@Controller('automation/monitoring')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationMonitoringController {
  constructor(private readonly monitoringService: AutomationMonitoringService) {}

  // =================== DASHBOARD ===================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get monitoring dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@Request() req: any) {
    return this.monitoringService.getDashboardData(req.user.tenantId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get monitoring stats' })
  @ApiResponse({ status: 200, description: 'Statistics' })
  async getStats(@Request() req: any) {
    return this.monitoringService.getStats(req.user.tenantId);
  }

  // =================== METRICS ===================

  @Get('metrics')
  @ApiOperation({ summary: 'Get metrics' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Metrics list' })
  async getMetrics(
    @Request() req: any,
    @Query('name') name?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const metrics = await this.monitoringService.getMetrics(req.user.tenantId, {
      name,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return { metrics, total: metrics.length };
  }

  @Get('metrics/:name/aggregation')
  @ApiOperation({ summary: 'Get metric aggregation' })
  @ApiQuery({ name: 'aggregation', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Aggregated value' })
  async getMetricAggregation(
    @Request() req: any,
    @Param('name') name: string,
    @Query('aggregation') aggregation: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const period =
      startDate && endDate
        ? { start: new Date(startDate), end: new Date(endDate) }
        : undefined;

    const value = await this.monitoringService.getMetricAggregations(
      req.user.tenantId,
      name,
      aggregation as any,
      period,
    );

    return { metric: name, aggregation, value };
  }

  // =================== ALERT RULES ===================

  @Post('alert-rules')
  @ApiOperation({ summary: 'Create alert rule' })
  @ApiResponse({ status: 201, description: 'Alert rule created' })
  async createAlertRule(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      metric: string;
      condition: AlertRule['condition'];
      severity: AlertSeverity;
      labels?: Record<string, string>;
      notifications: AlertRule['notifications'];
    },
  ) {
    return this.monitoringService.createAlertRule({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('alert-rules')
  @ApiOperation({ summary: 'Get alert rules' })
  @ApiQuery({ name: 'metric', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Alert rules list' })
  async getAlertRules(
    @Request() req: any,
    @Query('metric') metric?: string,
    @Query('severity') severity?: AlertSeverity,
    @Query('isActive') isActive?: string,
  ) {
    const rules = await this.monitoringService.getAlertRules(req.user.tenantId, {
      metric,
      severity,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return { rules, total: rules.length };
  }

  @Get('alert-rules/:id')
  @ApiOperation({ summary: 'Get alert rule details' })
  @ApiResponse({ status: 200, description: 'Alert rule details' })
  async getAlertRule(@Param('id') id: string) {
    const rule = await this.monitoringService.getAlertRule(id);
    if (!rule) {
      return { error: 'Alert rule not found' };
    }
    return rule;
  }

  @Put('alert-rules/:id')
  @ApiOperation({ summary: 'Update alert rule' })
  @ApiResponse({ status: 200, description: 'Alert rule updated' })
  async updateAlertRule(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      condition: AlertRule['condition'];
      severity: AlertSeverity;
      labels: Record<string, string>;
      notifications: AlertRule['notifications'];
      isActive: boolean;
    }>,
  ) {
    const rule = await this.monitoringService.updateAlertRule(id, body);
    if (!rule) {
      return { error: 'Alert rule not found' };
    }
    return rule;
  }

  @Delete('alert-rules/:id')
  @ApiOperation({ summary: 'Delete alert rule' })
  @ApiResponse({ status: 200, description: 'Alert rule deleted' })
  async deleteAlertRule(@Param('id') id: string) {
    await this.monitoringService.deleteAlertRule(id);
    return { success: true };
  }

  // =================== ALERTS ===================

  @Get('alerts')
  @ApiOperation({ summary: 'Get alerts' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'ruleId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Alerts list' })
  async getAlerts(
    @Request() req: any,
    @Query('status') status?: AlertStatus,
    @Query('severity') severity?: AlertSeverity,
    @Query('ruleId') ruleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const alerts = await this.monitoringService.getAlerts(req.user.tenantId, {
      status,
      severity,
      ruleId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
    return { alerts, total: alerts.length };
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get alert details' })
  @ApiResponse({ status: 200, description: 'Alert details' })
  async getAlert(@Param('id') id: string) {
    const alert = await this.monitoringService.getAlert(id);
    if (!alert) {
      return { error: 'Alert not found' };
    }
    return alert;
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(@Request() req: any, @Param('id') id: string) {
    const alert = await this.monitoringService.acknowledgeAlert(id, req.user.id);
    if (!alert) {
      return { error: 'Alert not found or already processed' };
    }
    return alert;
  }

  @Post('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(@Request() req: any, @Param('id') id: string) {
    const alert = await this.monitoringService.resolveAlert(id, req.user.id);
    if (!alert) {
      return { error: 'Alert not found or already resolved' };
    }
    return alert;
  }

  // =================== EXECUTION LOGS ===================

  @Get('logs')
  @ApiOperation({ summary: 'Get execution logs' })
  @ApiQuery({ name: 'automationType', required: false })
  @ApiQuery({ name: 'automationId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Execution logs list' })
  async getExecutionLogs(
    @Request() req: any,
    @Query('automationType') automationType?: string,
    @Query('automationId') automationId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const logs = await this.monitoringService.getExecutionLogs(req.user.tenantId, {
      automationType: automationType as any,
      automationId,
      status: status as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { logs, total: logs.length };
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get execution log details' })
  @ApiResponse({ status: 200, description: 'Execution log details' })
  async getExecutionLog(@Param('id') id: string) {
    const log = await this.monitoringService.getExecutionLog(id);
    if (!log) {
      return { error: 'Execution log not found' };
    }
    return log;
  }

  // =================== HEALTH CHECKS ===================

  @Get('health')
  @ApiOperation({ summary: 'Get overall health status' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async getHealth() {
    return this.monitoringService.getOverallHealth();
  }

  @Get('health/components')
  @ApiOperation({ summary: 'Get component health checks' })
  @ApiResponse({ status: 200, description: 'Health checks list' })
  async getHealthChecks() {
    const checks = await this.monitoringService.getHealthChecks();
    return { checks };
  }

  @Get('health/components/:component')
  @ApiOperation({ summary: 'Get component health' })
  @ApiResponse({ status: 200, description: 'Component health' })
  async getComponentHealth(@Param('component') component: string) {
    const check = await this.monitoringService.getHealthCheck(component);
    if (!check) {
      return { error: 'Component not found' };
    }
    return check;
  }
}
