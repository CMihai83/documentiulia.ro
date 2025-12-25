import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

// =================== TYPES ===================

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface AutomationMetric {
  id: string;
  tenantId: string;
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

export interface MetricSeries {
  name: string;
  labels: Record<string, string>;
  dataPoints: Array<{ timestamp: Date; value: number }>;
}

export interface AlertRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  metric: string;
  condition: {
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
    threshold: number;
    duration?: number; // seconds
  };
  severity: AlertSeverity;
  labels?: Record<string, string>;
  notifications: {
    email?: string[];
    slack?: string;
    webhook?: string;
  };
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  id: string;
  tenantId: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value: number;
  threshold: number;
  labels: Record<string, string>;
  firedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  notificationsSent: string[];
}

export interface ExecutionLog {
  id: string;
  tenantId: string;
  automationType: 'workflow' | 'rule' | 'trigger' | 'action';
  automationId: string;
  automationName: string;
  executionId: string;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  duration?: number;
  timestamp: Date;
}

export interface HealthCheck {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastCheck: Date;
  metrics?: Record<string, number>;
}

// =================== SERVICE ===================

@Injectable()
export class AutomationMonitoringService implements OnModuleInit {
  private metrics: Map<string, AutomationMetric[]> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private executionLogs: ExecutionLog[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();

  // Aggregated stats
  private stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgDuration: number;
    byType: Record<string, { total: number; success: number; failed: number }>;
  } = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    avgDuration: 0,
    byType: {},
  };

  constructor(private eventEmitter: EventEmitter2) {}

  onModuleInit() {
    this.initializeHealthChecks();
  }

  private initializeHealthChecks(): void {
    const components = [
      'workflow-engine',
      'rule-engine',
      'trigger-manager',
      'action-executor',
      'template-service',
      'event-bus',
      'scheduler',
    ];

    for (const component of components) {
      this.healthChecks.set(component, {
        component,
        status: 'healthy',
        lastCheck: new Date(),
        metrics: {},
      });
    }
  }

  // =================== METRICS ===================

  recordMetric(data: {
    tenantId: string;
    name: string;
    type: MetricType;
    value: number;
    labels?: Record<string, string>;
  }): void {
    const id = `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metric: AutomationMetric = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      type: data.type,
      value: data.value,
      labels: data.labels || {},
      timestamp: new Date(),
    };

    const key = `${data.tenantId}:${data.name}`;
    const existing = this.metrics.get(key) || [];
    existing.push(metric);

    // Keep only last 1000 data points per metric
    if (existing.length > 1000) {
      existing.shift();
    }

    this.metrics.set(key, existing);

    // Check alert rules
    this.checkAlertRules(data.tenantId, data.name, data.value, data.labels || {});
  }

  incrementCounter(
    tenantId: string,
    name: string,
    labels?: Record<string, string>,
    increment: number = 1,
  ): void {
    this.recordMetric({
      tenantId,
      name,
      type: 'counter',
      value: increment,
      labels,
    });
  }

  setGauge(
    tenantId: string,
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric({
      tenantId,
      name,
      type: 'gauge',
      value,
      labels,
    });
  }

  recordHistogram(
    tenantId: string,
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    this.recordMetric({
      tenantId,
      name,
      type: 'histogram',
      value,
      labels,
    });
  }

  async getMetrics(
    tenantId: string,
    filters?: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
      labels?: Record<string, string>;
    },
  ): Promise<MetricSeries[]> {
    const result: Map<string, MetricSeries> = new Map();

    for (const [key, metrics] of this.metrics.entries()) {
      if (!key.startsWith(`${tenantId}:`)) continue;

      for (const metric of metrics) {
        if (filters?.name && metric.name !== filters.name) continue;
        if (filters?.startDate && metric.timestamp < filters.startDate) continue;
        if (filters?.endDate && metric.timestamp > filters.endDate) continue;
        if (filters?.labels) {
          const match = Object.entries(filters.labels).every(
            ([k, v]) => metric.labels[k] === v,
          );
          if (!match) continue;
        }

        const seriesKey = `${metric.name}:${JSON.stringify(metric.labels)}`;
        const series = result.get(seriesKey) || {
          name: metric.name,
          labels: metric.labels,
          dataPoints: [],
        };

        series.dataPoints.push({
          timestamp: metric.timestamp,
          value: metric.value,
        });

        result.set(seriesKey, series);
      }
    }

    return Array.from(result.values()).map((series) => ({
      ...series,
      dataPoints: series.dataPoints.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      ),
    }));
  }

  async getMetricAggregations(
    tenantId: string,
    name: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
    period?: { start: Date; end: Date },
  ): Promise<number> {
    const key = `${tenantId}:${name}`;
    const metrics = this.metrics.get(key) || [];

    let filtered = metrics;
    if (period) {
      filtered = metrics.filter(
        (m) => m.timestamp >= period.start && m.timestamp <= period.end,
      );
    }

    if (filtered.length === 0) return 0;

    const values = filtered.map((m) => m.value);

    switch (aggregation) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return 0;
    }
  }

  // =================== ALERT RULES ===================

  async createAlertRule(data: {
    tenantId: string;
    createdBy: string;
    name: string;
    description?: string;
    metric: string;
    condition: AlertRule['condition'];
    severity: AlertSeverity;
    labels?: Record<string, string>;
    notifications: AlertRule['notifications'];
  }): Promise<AlertRule> {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const rule: AlertRule = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      metric: data.metric,
      condition: data.condition,
      severity: data.severity,
      labels: data.labels,
      notifications: data.notifications,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.alertRules.set(id, rule);

    return rule;
  }

  async getAlertRules(
    tenantId: string,
    filters?: {
      metric?: string;
      severity?: AlertSeverity;
      isActive?: boolean;
    },
  ): Promise<AlertRule[]> {
    let rules = Array.from(this.alertRules.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    if (filters?.metric) {
      rules = rules.filter((r) => r.metric === filters.metric);
    }

    if (filters?.severity) {
      rules = rules.filter((r) => r.severity === filters.severity);
    }

    if (filters?.isActive !== undefined) {
      rules = rules.filter((r) => r.isActive === filters.isActive);
    }

    return rules;
  }

  async getAlertRule(id: string): Promise<AlertRule | null> {
    return this.alertRules.get(id) || null;
  }

  async updateAlertRule(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      condition: AlertRule['condition'];
      severity: AlertSeverity;
      labels: Record<string, string>;
      notifications: AlertRule['notifications'];
      isActive: boolean;
    }>,
  ): Promise<AlertRule | null> {
    const rule = this.alertRules.get(id);
    if (!rule) return null;

    const updated: AlertRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    this.alertRules.set(id, updated);
    return updated;
  }

  async deleteAlertRule(id: string): Promise<void> {
    this.alertRules.delete(id);
  }

  private checkAlertRules(
    tenantId: string,
    metricName: string,
    value: number,
    labels: Record<string, string>,
  ): void {
    for (const rule of this.alertRules.values()) {
      if (rule.tenantId !== tenantId || rule.metric !== metricName || !rule.isActive) {
        continue;
      }

      // Check label match
      if (rule.labels) {
        const match = Object.entries(rule.labels).every(
          ([k, v]) => labels[k] === v,
        );
        if (!match) continue;
      }

      const triggered = this.evaluateCondition(value, rule.condition);

      if (triggered) {
        this.fireAlert(rule, value, labels);
      }
    }
  }

  private evaluateCondition(
    value: number,
    condition: AlertRule['condition'],
  ): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'ne':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  // =================== ALERTS ===================

  private fireAlert(
    rule: AlertRule,
    value: number,
    labels: Record<string, string>,
  ): void {
    // Check if there's already an active alert for this rule
    const existingAlert = Array.from(this.alerts.values()).find(
      (a) => a.ruleId === rule.id && a.status === 'active',
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: Alert = {
      id,
      tenantId: rule.tenantId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'active',
      message: `${rule.name}: ${rule.metric} is ${value} (threshold: ${rule.condition.threshold})`,
      value,
      threshold: rule.condition.threshold,
      labels,
      firedAt: new Date(),
      notificationsSent: [],
    };

    this.alerts.set(id, alert);

    // Send notifications
    this.sendAlertNotifications(alert, rule);

    this.eventEmitter.emit('automation.alert.fired', { alert, rule });
  }

  private async sendAlertNotifications(
    alert: Alert,
    rule: AlertRule,
  ): Promise<void> {
    const notifications = rule.notifications;

    if (notifications.email && notifications.email.length > 0) {
      // Would integrate with email service
      alert.notificationsSent.push('email');
    }

    if (notifications.slack) {
      // Would integrate with Slack service
      alert.notificationsSent.push('slack');
    }

    if (notifications.webhook) {
      // Would make HTTP request to webhook
      alert.notificationsSent.push('webhook');
    }

    this.alerts.set(alert.id, alert);
  }

  async getAlerts(
    tenantId: string,
    filters?: {
      status?: AlertStatus;
      severity?: AlertSeverity;
      ruleId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<Alert[]> {
    let alerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId,
    );

    if (filters?.status) {
      alerts = alerts.filter((a) => a.status === filters.status);
    }

    if (filters?.severity) {
      alerts = alerts.filter((a) => a.severity === filters.severity);
    }

    if (filters?.ruleId) {
      alerts = alerts.filter((a) => a.ruleId === filters.ruleId);
    }

    if (filters?.startDate) {
      alerts = alerts.filter((a) => a.firedAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      alerts = alerts.filter((a) => a.firedAt <= filters.endDate!);
    }

    return alerts.sort((a, b) => b.firedAt.getTime() - a.firedAt.getTime());
  }

  async getAlert(id: string): Promise<Alert | null> {
    return this.alerts.get(id) || null;
  }

  async acknowledgeAlert(id: string, userId: string): Promise<Alert | null> {
    const alert = this.alerts.get(id);
    if (!alert || alert.status !== 'active') return null;

    const updated: Alert = {
      ...alert,
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      acknowledgedBy: userId,
    };

    this.alerts.set(id, updated);

    this.eventEmitter.emit('automation.alert.acknowledged', { alert: updated });

    return updated;
  }

  async resolveAlert(id: string, userId: string): Promise<Alert | null> {
    const alert = this.alerts.get(id);
    if (!alert || alert.status === 'resolved') return null;

    const updated: Alert = {
      ...alert,
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: userId,
    };

    this.alerts.set(id, updated);

    this.eventEmitter.emit('automation.alert.resolved', { alert: updated });

    return updated;
  }

  // =================== EXECUTION LOGGING ===================

  logExecution(data: {
    tenantId: string;
    automationType: ExecutionLog['automationType'];
    automationId: string;
    automationName: string;
    executionId: string;
    status: ExecutionLog['status'];
    input?: Record<string, any>;
    output?: Record<string, any>;
    error?: string;
    duration?: number;
  }): ExecutionLog {
    const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const log: ExecutionLog = {
      id,
      ...data,
      timestamp: new Date(),
    };

    this.executionLogs.push(log);

    // Keep only last 10000 logs
    if (this.executionLogs.length > 10000) {
      this.executionLogs.shift();
    }

    // Update stats
    this.updateStats(log);

    // Record metrics
    this.incrementCounter(data.tenantId, 'automation.executions.total', {
      type: data.automationType,
      status: data.status,
    });

    if (data.duration) {
      this.recordHistogram(
        data.tenantId,
        'automation.executions.duration',
        data.duration,
        { type: data.automationType },
      );
    }

    return log;
  }

  private updateStats(log: ExecutionLog): void {
    this.stats.totalExecutions++;

    if (log.status === 'completed') {
      this.stats.successfulExecutions++;
    } else if (log.status === 'failed') {
      this.stats.failedExecutions++;
    }

    // Update avg duration
    if (log.duration) {
      const totalDuration =
        this.stats.avgDuration * (this.stats.totalExecutions - 1) + log.duration;
      this.stats.avgDuration = totalDuration / this.stats.totalExecutions;
    }

    // Update by type
    if (!this.stats.byType[log.automationType]) {
      this.stats.byType[log.automationType] = { total: 0, success: 0, failed: 0 };
    }
    this.stats.byType[log.automationType].total++;
    if (log.status === 'completed') {
      this.stats.byType[log.automationType].success++;
    } else if (log.status === 'failed') {
      this.stats.byType[log.automationType].failed++;
    }
  }

  async getExecutionLogs(
    tenantId: string,
    filters?: {
      automationType?: ExecutionLog['automationType'];
      automationId?: string;
      status?: ExecutionLog['status'];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<ExecutionLog[]> {
    let logs = this.executionLogs.filter((l) => l.tenantId === tenantId);

    if (filters?.automationType) {
      logs = logs.filter((l) => l.automationType === filters.automationType);
    }

    if (filters?.automationId) {
      logs = logs.filter((l) => l.automationId === filters.automationId);
    }

    if (filters?.status) {
      logs = logs.filter((l) => l.status === filters.status);
    }

    if (filters?.startDate) {
      logs = logs.filter((l) => l.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      logs = logs.filter((l) => l.timestamp <= filters.endDate!);
    }

    logs = logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  async getExecutionLog(id: string): Promise<ExecutionLog | null> {
    return this.executionLogs.find((l) => l.id === id) || null;
  }

  // =================== HEALTH CHECKS ===================

  async getHealthChecks(): Promise<HealthCheck[]> {
    return Array.from(this.healthChecks.values());
  }

  async getHealthCheck(component: string): Promise<HealthCheck | null> {
    return this.healthChecks.get(component) || null;
  }

  updateHealthCheck(
    component: string,
    status: HealthCheck['status'],
    message?: string,
    metrics?: Record<string, number>,
  ): void {
    const check = this.healthChecks.get(component) || {
      component,
      status: 'healthy',
      lastCheck: new Date(),
    };

    this.healthChecks.set(component, {
      ...check,
      status,
      message,
      metrics,
      lastCheck: new Date(),
    });

    if (status !== 'healthy') {
      this.eventEmitter.emit('automation.health.degraded', {
        component,
        status,
        message,
      });
    }
  }

  async getOverallHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: HealthCheck[];
    summary: string;
  }> {
    const components = await this.getHealthChecks();
    const unhealthy = components.filter((c) => c.status === 'unhealthy');
    const degraded = components.filter((c) => c.status === 'degraded');

    let status: 'healthy' | 'degraded' | 'unhealthy';
    let summary: string;

    if (unhealthy.length > 0) {
      status = 'unhealthy';
      summary = `${unhealthy.length} component(s) unhealthy`;
    } else if (degraded.length > 0) {
      status = 'degraded';
      summary = `${degraded.length} component(s) degraded`;
    } else {
      status = 'healthy';
      summary = 'All components healthy';
    }

    return { status, components, summary };
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    avgDuration: number;
    byType: Record<string, { total: number; success: number; failed: number; successRate: number }>;
    activeAlerts: number;
    alertsByReverity: Record<string, number>;
  }> {
    const tenantLogs = this.executionLogs.filter((l) => l.tenantId === tenantId);
    const tenantAlerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId && a.status === 'active',
    );

    const totalExecutions = tenantLogs.length;
    const successfulExecutions = tenantLogs.filter(
      (l) => l.status === 'completed',
    ).length;
    const failedExecutions = tenantLogs.filter(
      (l) => l.status === 'failed',
    ).length;

    const byType: Record<string, { total: number; success: number; failed: number; successRate: number }> = {};
    for (const log of tenantLogs) {
      if (!byType[log.automationType]) {
        byType[log.automationType] = { total: 0, success: 0, failed: 0, successRate: 0 };
      }
      byType[log.automationType].total++;
      if (log.status === 'completed') {
        byType[log.automationType].success++;
      } else if (log.status === 'failed') {
        byType[log.automationType].failed++;
      }
    }

    for (const type of Object.keys(byType)) {
      byType[type].successRate =
        byType[type].total > 0
          ? Math.round((byType[type].success / byType[type].total) * 100)
          : 0;
    }

    const alertsBySeverity: Record<string, number> = {};
    for (const alert of tenantAlerts) {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    }

    const durations = tenantLogs
      .filter((l) => l.duration !== undefined)
      .map((l) => l.duration!);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate:
        totalExecutions > 0
          ? Math.round((successfulExecutions / totalExecutions) * 100)
          : 0,
      avgDuration,
      byType,
      activeAlerts: tenantAlerts.length,
      alertsByReverity: alertsBySeverity,
    };
  }

  async getDashboardData(tenantId: string): Promise<{
    stats: Awaited<ReturnType<typeof this.getStats>>;
    recentExecutions: ExecutionLog[];
    activeAlerts: Alert[];
    health: Awaited<ReturnType<typeof this.getOverallHealth>>;
    trends: {
      executionsLast24h: number;
      executionsLast7d: number;
      errorRateLast24h: number;
    };
  }> {
    const stats = await this.getStats(tenantId);
    const recentExecutions = await this.getExecutionLogs(tenantId, { limit: 10 });
    const activeAlerts = await this.getAlerts(tenantId, { status: 'active' });
    const health = await this.getOverallHealth();

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const logsLast24h = this.executionLogs.filter(
      (l) => l.tenantId === tenantId && l.timestamp >= last24h,
    );
    const logsLast7d = this.executionLogs.filter(
      (l) => l.tenantId === tenantId && l.timestamp >= last7d,
    );

    const failedLast24h = logsLast24h.filter((l) => l.status === 'failed').length;

    return {
      stats,
      recentExecutions,
      activeAlerts,
      health,
      trends: {
        executionsLast24h: logsLast24h.length,
        executionsLast7d: logsLast7d.length,
        errorRateLast24h:
          logsLast24h.length > 0
            ? Math.round((failedLast24h / logsLast24h.length) * 100)
            : 0,
      },
    };
  }

  // =================== EVENT LISTENERS ===================

  @OnEvent('automation.workflow.executed')
  handleWorkflowExecuted(payload: any): void {
    this.logExecution({
      tenantId: payload.tenantId,
      automationType: 'workflow',
      automationId: payload.workflowId,
      automationName: payload.workflowName,
      executionId: payload.executionId,
      status: payload.status,
      input: payload.input,
      output: payload.output,
      error: payload.error,
      duration: payload.duration,
    });
  }

  @OnEvent('automation.rule.evaluated')
  handleRuleEvaluated(payload: any): void {
    this.logExecution({
      tenantId: payload.tenantId,
      automationType: 'rule',
      automationId: payload.ruleId,
      automationName: payload.ruleName,
      executionId: payload.evaluationId,
      status: payload.matched ? 'completed' : 'completed',
      input: payload.input,
      output: { matched: payload.matched, actions: payload.actions },
      duration: payload.duration,
    });
  }

  @OnEvent('automation.trigger.fired')
  handleTriggerFired(payload: any): void {
    this.logExecution({
      tenantId: payload.tenantId,
      automationType: 'trigger',
      automationId: payload.triggerId,
      automationName: payload.triggerName,
      executionId: payload.executionId,
      status: payload.status,
      input: payload.input,
      output: payload.output,
      error: payload.error,
      duration: payload.duration,
    });
  }

  @OnEvent('automation.action.executed')
  handleActionExecuted(payload: any): void {
    this.logExecution({
      tenantId: payload.tenantId,
      automationType: 'action',
      automationId: payload.actionId,
      automationName: payload.actionName,
      executionId: payload.executionId,
      status: payload.status,
      input: payload.input,
      output: payload.output,
      error: payload.error,
      duration: payload.duration,
    });
  }

  // =================== SCHEDULED TASKS ===================

  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthChecks(): Promise<void> {
    // Check each component
    for (const [component, check] of this.healthChecks.entries()) {
      // Simple health check - in production would check actual component status
      const isHealthy = true; // Would check actual component
      this.updateHealthCheck(
        component,
        isHealthy ? 'healthy' : 'degraded',
        isHealthy ? undefined : 'Component check failed',
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldData(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Cleanup old resolved alerts
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.status === 'resolved' && alert.resolvedAt && alert.resolvedAt < thirtyDaysAgo) {
        this.alerts.delete(id);
      }
    }

    // Cleanup old metrics
    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter((m) => m.timestamp >= thirtyDaysAgo);
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }
  }
}
