import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertType {
  SYSTEM_HEALTH = 'system_health',
  DATABASE_SLOW = 'database_slow',
  HIGH_ERROR_RATE = 'high_error_rate',
  HIGH_MEMORY_USAGE = 'high_memory_usage',
  ANAF_CONNECTIVITY = 'anaf_connectivity',
  COMPLIANCE_DEADLINE = 'compliance_deadline',
  SECURITY_EVENT = 'security_event',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface AlertThresholds {
  memoryUsagePercent: number;
  errorRatePercent: number;
  dbLatencyMs: number;
  apiLatencyMs: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

@Injectable()
export class AlertingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertingService.name);

  // Alert storage
  private alerts: Map<string, Alert> = new Map();
  private alertIdCounter = 0;

  // Metrics tracking
  private requestMetrics = {
    totalRequests: 0,
    failedRequests: 0,
    totalLatency: 0,
  };

  // Thresholds (heap memory, not system RAM)
  // Note: V8 heap usage is often 90-97% as GC runs lazily - this is normal
  private thresholds: AlertThresholds = {
    memoryUsagePercent: 98, // High threshold - V8 heap stays near max to avoid frequent GC
    errorRatePercent: 5,
    dbLatencyMs: 1000,
    apiLatencyMs: 500,
  };

  // Alert cooldowns (prevent spam)
  private alertCooldowns: Map<string, Date> = new Map();
  private readonly COOLDOWN_MINUTES = 15;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.logger.log('Alerting service initialized');
  }

  onModuleDestroy() {
    this.logger.log('Alerting service shutting down');
  }

  // =================== HEALTH MONITORING ===================

  @Cron(CronExpression.EVERY_MINUTE)
  async runHealthChecks() {
    await Promise.all([
      this.checkMemoryUsage(),
      this.checkDatabaseHealth(),
      this.checkErrorRate(),
    ]);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkExternalServices() {
    await Promise.all([
      this.checkAnafConnectivity(),
    ]);
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkComplianceDeadlines() {
    await this.checkUpcomingDeadlines();
  }

  private async checkMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const usedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    if (usedPercent > this.thresholds.memoryUsagePercent) {
      await this.createAlert({
        type: AlertType.HIGH_MEMORY_USAGE,
        severity: usedPercent > 95 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: 'High Memory Usage Detected',
        message: `Memory usage at ${usedPercent.toFixed(1)}% (threshold: ${this.thresholds.memoryUsagePercent}%)`,
        metadata: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: memoryUsage.rss,
        },
      });
    } else {
      this.resolveAlertsByType(AlertType.HIGH_MEMORY_USAGE);
    }
  }

  private async checkDatabaseHealth() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;

      if (latencyMs > this.thresholds.dbLatencyMs) {
        await this.createAlert({
          type: AlertType.DATABASE_SLOW,
          severity: latencyMs > 3000 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          title: 'Database Latency High',
          message: `Database query latency: ${latencyMs}ms (threshold: ${this.thresholds.dbLatencyMs}ms)`,
          metadata: { latencyMs },
        });
      } else {
        this.resolveAlertsByType(AlertType.DATABASE_SLOW);
      }
    } catch (error) {
      await this.createAlert({
        type: AlertType.SYSTEM_HEALTH,
        severity: AlertSeverity.CRITICAL,
        title: 'Database Connection Failed',
        message: `Database health check failed: ${error.message}`,
        metadata: { error: error.message },
      });
    }
  }

  private async checkErrorRate() {
    if (this.requestMetrics.totalRequests === 0) return;

    const errorRate = (this.requestMetrics.failedRequests / this.requestMetrics.totalRequests) * 100;

    if (errorRate > this.thresholds.errorRatePercent) {
      await this.createAlert({
        type: AlertType.HIGH_ERROR_RATE,
        severity: errorRate > 20 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: 'High Error Rate Detected',
        message: `Error rate at ${errorRate.toFixed(1)}% (threshold: ${this.thresholds.errorRatePercent}%)`,
        metadata: {
          totalRequests: this.requestMetrics.totalRequests,
          failedRequests: this.requestMetrics.failedRequests,
        },
      });
    } else {
      this.resolveAlertsByType(AlertType.HIGH_ERROR_RATE);
    }

    // Reset metrics every hour
    const now = new Date();
    if (now.getMinutes() === 0) {
      this.requestMetrics = { totalRequests: 0, failedRequests: 0, totalLatency: 0 };
    }
  }

  private async checkAnafConnectivity() {
    try {
      const response = await axios.get('https://api.anaf.ro/test/echo/ping', {
        timeout: 10000,
        validateStatus: () => true,
      });

      if (response.status >= 500) {
        await this.createAlert({
          type: AlertType.ANAF_CONNECTIVITY,
          severity: AlertSeverity.WARNING,
          title: 'ANAF API Unavailable',
          message: `ANAF e-Factura API returned status ${response.status}`,
          metadata: { status: response.status },
        });
      } else {
        this.resolveAlertsByType(AlertType.ANAF_CONNECTIVITY);
      }
    } catch (error) {
      await this.createAlert({
        type: AlertType.ANAF_CONNECTIVITY,
        severity: AlertSeverity.WARNING,
        title: 'ANAF API Connection Failed',
        message: `Cannot reach ANAF API: ${error.message}`,
        metadata: { error: error.message },
      });
    }
  }

  private async checkUpcomingDeadlines() {
    const now = new Date();
    const upcomingDays = 7;
    const futureDate = new Date(now.getTime() + upcomingDays * 24 * 60 * 60 * 1000);

    // Check for Romanian compliance deadlines
    const complianceDeadlines = [
      { day: 25, name: 'VAT D300 Declaration', description: 'Monthly VAT declaration due' },
      { day: 25, name: 'SAF-T D406', description: 'SAF-T D406 monthly XML submission' },
      { day: 15, name: 'Employee Tax Declarations', description: 'D112 employee tax declarations' },
    ];

    for (const deadline of complianceDeadlines) {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const deadlineDate = new Date(currentYear, currentMonth, deadline.day);

      // If deadline passed this month, check next month
      if (deadlineDate < now) {
        deadlineDate.setMonth(deadlineDate.getMonth() + 1);
      }

      // Alert if deadline is within the next 7 days
      if (deadlineDate <= futureDate) {
        const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        await this.createAlert({
          type: AlertType.COMPLIANCE_DEADLINE,
          severity: daysUntil <= 2 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
          title: `${deadline.name} Due Soon`,
          message: `${deadline.description} - ${daysUntil} day(s) remaining`,
          metadata: {
            deadline: deadline.name,
            dueDate: deadlineDate.toISOString(),
            daysRemaining: daysUntil,
          },
        });
      }
    }
  }

  // =================== ALERT MANAGEMENT ===================

  async createAlert(params: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<Alert | null> {
    // Check cooldown
    const cooldownKey = `${params.type}-${params.title}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    if (lastAlert) {
      const cooldownEnd = new Date(lastAlert.getTime() + this.COOLDOWN_MINUTES * 60 * 1000);
      if (new Date() < cooldownEnd) {
        return null; // Still in cooldown
      }
    }

    const alert: Alert = {
      id: `alert-${++this.alertIdCounter}-${Date.now()}`,
      ...params,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.set(alert.id, alert);
    this.alertCooldowns.set(cooldownKey, new Date());

    // Log the alert
    const logMethod = params.severity === AlertSeverity.CRITICAL ? 'error' : 'warn';
    this.logger[logMethod](`[${params.severity.toUpperCase()}] ${params.title}: ${params.message}`);

    // Send notifications based on severity
    await this.sendNotifications(alert);

    return alert;
  }

  private async sendNotifications(alert: Alert) {
    // Log alert details (audit log requires userId, so we just use logger for system alerts)
    this.logger.log(`Alert recorded: ${JSON.stringify({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      timestamp: alert.timestamp.toISOString(),
    })}`);

    // Webhook notifications for critical alerts
    if (alert.severity === AlertSeverity.CRITICAL) {
      const webhookUrl = this.configService.get<string>('ALERT_WEBHOOK_URL');
      if (webhookUrl) {
        try {
          await axios.post(webhookUrl, {
            text: `🚨 *CRITICAL ALERT* - ${alert.title}\n${alert.message}`,
            alert,
          }, { timeout: 5000 });
        } catch (error) {
          this.logger.error(`Failed to send webhook notification: ${error.message}`);
        }
      }
    }
  }

  resolveAlertsByType(type: AlertType) {
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.type === type && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        this.logger.log(`Alert resolved: ${alert.title}`);
      }
    }
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  // =================== API METHODS ===================

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.resolved)
      .sort((a, b) => {
        // Sort by severity first (critical > warning > info)
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        // Then by timestamp (newest first)
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }

  getAllAlerts(limit = 100): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getAlertsByType(type: AlertType): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => a.type === type)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getAlertStats() {
    const alerts = Array.from(this.alerts.values());
    const active = alerts.filter(a => !a.resolved);

    return {
      total: alerts.length,
      active: active.length,
      resolved: alerts.length - active.length,
      bySeverity: {
        critical: active.filter(a => a.severity === AlertSeverity.CRITICAL).length,
        warning: active.filter(a => a.severity === AlertSeverity.WARNING).length,
        info: active.filter(a => a.severity === AlertSeverity.INFO).length,
      },
      byType: {
        system_health: active.filter(a => a.type === AlertType.SYSTEM_HEALTH).length,
        database_slow: active.filter(a => a.type === AlertType.DATABASE_SLOW).length,
        high_error_rate: active.filter(a => a.type === AlertType.HIGH_ERROR_RATE).length,
        high_memory_usage: active.filter(a => a.type === AlertType.HIGH_MEMORY_USAGE).length,
        anaf_connectivity: active.filter(a => a.type === AlertType.ANAF_CONNECTIVITY).length,
        compliance_deadline: active.filter(a => a.type === AlertType.COMPLIANCE_DEADLINE).length,
        security_event: active.filter(a => a.type === AlertType.SECURITY_EVENT).length,
      },
    };
  }

  // Record request metrics (called by interceptor)
  recordRequest(success: boolean, latencyMs: number) {
    this.requestMetrics.totalRequests++;
    if (!success) this.requestMetrics.failedRequests++;
    this.requestMetrics.totalLatency += latencyMs;
  }

  // Create security alert
  async createSecurityAlert(title: string, message: string, metadata?: Record<string, any>) {
    return this.createAlert({
      type: AlertType.SECURITY_EVENT,
      severity: AlertSeverity.CRITICAL,
      title,
      message,
      metadata,
    });
  }

  // Get/set thresholds
  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  updateThresholds(updates: Partial<AlertThresholds>) {
    this.thresholds = { ...this.thresholds, ...updates };
    this.logger.log(`Alert thresholds updated: ${JSON.stringify(this.thresholds)}`);
  }

  // Manual health check trigger
  async triggerHealthCheck(): Promise<{
    memory: HealthCheckResult;
    database: HealthCheckResult;
    anaf: HealthCheckResult;
  }> {
    const results: {
      memory: HealthCheckResult;
      database: HealthCheckResult;
      anaf: HealthCheckResult;
    } = {
      memory: { healthy: true, latencyMs: 0 },
      database: { healthy: true, latencyMs: 0 },
      anaf: { healthy: true, latencyMs: 0 },
    };

    // Memory check
    const memoryUsage = process.memoryUsage();
    const usedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    results.memory.healthy = usedPercent < this.thresholds.memoryUsagePercent;
    results.memory.latencyMs = 0;

    // Database check
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      results.database.latencyMs = Date.now() - dbStart;
      results.database.healthy = results.database.latencyMs < this.thresholds.dbLatencyMs;
    } catch (error) {
      results.database.healthy = false;
      results.database.latencyMs = Date.now() - dbStart;
      results.database.error = error.message;
    }

    // ANAF check
    const anafStart = Date.now();
    try {
      const response = await axios.get('https://api.anaf.ro/test/echo/ping', {
        timeout: 10000,
        validateStatus: () => true,
      });
      results.anaf.latencyMs = Date.now() - anafStart;
      results.anaf.healthy = response.status < 500;
    } catch (error) {
      results.anaf.healthy = false;
      results.anaf.latencyMs = Date.now() - anafStart;
      results.anaf.error = error.message;
    }

    return results;
  }
}
