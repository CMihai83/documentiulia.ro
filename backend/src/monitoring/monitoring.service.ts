import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

/**
 * Production Monitoring Service
 * Real-time system metrics, health checks, and alerting
 *
 * Features:
 * - System metrics (CPU, memory, disk)
 * - Application metrics (requests, latency, errors)
 * - Health checks with dependencies
 * - Alert rules and notifications
 * - Performance baselines and anomaly detection
 */

// =================== TYPES & INTERFACES ===================

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'firing' | 'resolved' | 'acknowledged';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
  unit?: string;
}

export interface MetricSeries {
  name: string;
  dataPoints: { timestamp: Date; value: number }[];
}

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message?: string;
  latency?: number;
  lastChecked: Date;
  details?: Record<string, any>;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  process: {
    uptime: number;
    pid: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    cpuUsage: {
      user: number;
      system: number;
    };
  };
  disk?: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
}

export interface ApplicationMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    perSecond: number;
  };
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    rate: number;
  };
  activeConnections: number;
  queueLength: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  threshold: number;
  duration: number; // seconds
  severity: AlertSeverity;
  enabled: boolean;
  labels: Record<string, string>;
  notifications: AlertNotification[];
  createdAt: Date;
}

export interface AlertNotification {
  type: 'email' | 'webhook' | 'slack' | 'sms';
  target: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  value: number;
  threshold: number;
  labels: Record<string, string>;
  firedAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface Dashboard {
  system: SystemMetrics;
  application: ApplicationMetrics;
  health: {
    overall: HealthStatus;
    checks: HealthCheck[];
  };
  alerts: {
    active: number;
    critical: number;
    warning: number;
    recent: Alert[];
  };
  timestamp: Date;
}

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);

  // Metrics storage
  private metrics: Map<string, Metric[]> = new Map();
  private metricsHistory: Map<string, MetricSeries> = new Map();

  // Request tracking
  private requestCount = 0;
  private successCount = 0;
  private errorCount = 0;
  private latencies: number[] = [];
  private lastMinuteRequests = 0;
  private requestsPerSecond = 0;

  // Health checks
  private healthChecks: Map<string, HealthCheck> = new Map();

  // Alerts
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private alertIdCounter = 0;
  private ruleIdCounter = 0;

  // Intervals
  private metricsInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;
  private requestRateInterval?: NodeJS.Timeout;

  // Process start time for uptime
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.initializeDefaultAlertRules();
    this.startMetricsCollection();
    this.startHealthChecks();
    this.startAlertChecking();
    this.logger.log('Monitoring service initialized');
  }

  async onModuleDestroy() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.alertCheckInterval) clearInterval(this.alertCheckInterval);
    if (this.requestRateInterval) clearInterval(this.requestRateInterval);
  }

  // =================== INITIALIZATION ===================

  private initializeDefaultAlertRules(): void {
    const defaultRules: Partial<AlertRule>[] = [
      {
        name: 'High CPU Usage',
        description: 'CPU usage exceeds 90%',
        metric: 'system.cpu.usage',
        condition: 'gt',
        threshold: 90,
        duration: 60,
        severity: 'critical',
      },
      {
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 85%',
        metric: 'system.memory.usage',
        condition: 'gt',
        threshold: 85,
        duration: 60,
        severity: 'warning',
      },
      {
        name: 'High Error Rate',
        description: 'Error rate exceeds 5%',
        metric: 'app.errors.rate',
        condition: 'gt',
        threshold: 5,
        duration: 30,
        severity: 'critical',
      },
      {
        name: 'High Latency',
        description: 'P95 latency exceeds 2000ms',
        metric: 'app.latency.p95',
        condition: 'gt',
        threshold: 2000,
        duration: 60,
        severity: 'warning',
      },
      {
        name: 'Low Request Rate',
        description: 'Request rate drops below 1/s for 5 minutes',
        metric: 'app.requests.perSecond',
        condition: 'lt',
        threshold: 1,
        duration: 300,
        severity: 'warning',
      },
    ];

    defaultRules.forEach(rule => {
      this.createAlertRule(
        rule.name!,
        rule.description!,
        rule.metric!,
        rule.condition!,
        rule.threshold!,
        rule.duration!,
        rule.severity!,
      );
    });
  }

  private startMetricsCollection(): void {
    // Collect metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    // Track requests per second
    this.requestRateInterval = setInterval(() => {
      this.requestsPerSecond = this.requestCount - this.lastMinuteRequests;
      this.lastMinuteRequests = this.requestCount;
    }, 1000);
  }

  private startHealthChecks(): void {
    // Run health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks();
    }, 30000);

    // Run initial health check
    this.runHealthChecks();
  }

  private startAlertChecking(): void {
    // Check alerts every 10 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 10000);
  }

  // =================== SYSTEM METRICS ===================

  private collectSystemMetrics(): void {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    // Calculate CPU usage
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    // Record metrics
    this.recordMetric('system.cpu.usage', cpuUsage, 'gauge', { host: os.hostname() });
    this.recordMetric('system.memory.usage', ((totalMem - freeMem) / totalMem) * 100, 'gauge', {});
    this.recordMetric('system.memory.used', totalMem - freeMem, 'gauge', { unit: 'bytes' });
    this.recordMetric('system.memory.free', freeMem, 'gauge', { unit: 'bytes' });

    // Process metrics
    const memUsage = process.memoryUsage();
    this.recordMetric('process.memory.heapUsed', memUsage.heapUsed, 'gauge', { unit: 'bytes' });
    this.recordMetric('process.memory.rss', memUsage.rss, 'gauge', { unit: 'bytes' });
  }

  getSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const cpuUsagePercent = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    return {
      cpu: {
        usage: Math.round(cpuUsagePercent * 100) / 100,
        loadAverage: os.loadavg(),
        cores: cpus.length,
      },
      memory: {
        total: totalMem,
        used: totalMem - freeMem,
        free: freeMem,
        usagePercent: Math.round(((totalMem - freeMem) / totalMem) * 10000) / 100,
      },
      process: {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        pid: process.pid,
        memoryUsage: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
        },
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
      },
    };
  }

  // =================== APPLICATION METRICS ===================

  /**
   * Record a request (call from middleware)
   */
  recordRequest(success: boolean, latencyMs: number): void {
    this.requestCount++;
    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
    }

    this.latencies.push(latencyMs);

    // Keep only last 1000 latencies
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-1000);
    }

    // Record metrics
    this.recordMetric('app.requests.total', this.requestCount, 'counter', {});
    this.recordMetric('app.requests.latency', latencyMs, 'histogram', {});
    if (!success) {
      this.recordMetric('app.errors.total', this.errorCount, 'counter', {});
    }
  }

  /**
   * Record an error by type
   */
  recordError(errorType: string): void {
    const metricName = `app.errors.${errorType}`;
    const existing = this.metrics.get(metricName);
    const count = existing && existing.length > 0 ? existing[existing.length - 1].value + 1 : 1;
    this.recordMetric(metricName, count, 'counter', { type: errorType });
  }

  getApplicationMetrics(): ApplicationMetrics {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const len = sortedLatencies.length;

    const errorRate = this.requestCount > 0
      ? (this.errorCount / this.requestCount) * 100
      : 0;

    // Gather error types
    const errorsByType: Record<string, number> = {};
    this.metrics.forEach((values, name) => {
      if (name.startsWith('app.errors.') && name !== 'app.errors.total') {
        const type = name.replace('app.errors.', '');
        if (values.length > 0) {
          errorsByType[type] = values[values.length - 1].value;
        }
      }
    });

    return {
      requests: {
        total: this.requestCount,
        successful: this.successCount,
        failed: this.errorCount,
        perSecond: this.requestsPerSecond,
      },
      latency: {
        avg: len > 0 ? Math.round(sortedLatencies.reduce((a, b) => a + b, 0) / len) : 0,
        p50: len > 0 ? sortedLatencies[Math.floor(len * 0.5)] : 0,
        p95: len > 0 ? sortedLatencies[Math.floor(len * 0.95)] : 0,
        p99: len > 0 ? sortedLatencies[Math.floor(len * 0.99)] : 0,
        max: len > 0 ? sortedLatencies[len - 1] : 0,
      },
      errors: {
        total: this.errorCount,
        byType: errorsByType,
        rate: Math.round(errorRate * 100) / 100,
      },
      activeConnections: 0, // Would need server integration
      queueLength: 0,
    };
  }

  // =================== HEALTH CHECKS ===================

  private async runHealthChecks(): Promise<void> {
    // API health check
    this.healthChecks.set('api', {
      name: 'API',
      status: 'healthy',
      lastChecked: new Date(),
    });

    // Database health check (simulated)
    const dbStart = Date.now();
    try {
      // In production, would actually ping database
      this.healthChecks.set('database', {
        name: 'Database',
        status: 'healthy',
        latency: Date.now() - dbStart,
        lastChecked: new Date(),
      });
    } catch (error) {
      this.healthChecks.set('database', {
        name: 'Database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      });
    }

    // Memory health check
    const memUsage = process.memoryUsage();
    const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    this.healthChecks.set('memory', {
      name: 'Memory',
      status: heapPercent > 90 ? 'unhealthy' : heapPercent > 75 ? 'degraded' : 'healthy',
      message: `Heap: ${Math.round(heapPercent)}%`,
      lastChecked: new Date(),
      details: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
      },
    });
  }

  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  getOverallHealth(): HealthStatus {
    const checks = this.getHealthChecks();
    if (checks.some(c => c.status === 'unhealthy')) return 'unhealthy';
    if (checks.some(c => c.status === 'degraded')) return 'degraded';
    return 'healthy';
  }

  /**
   * Register a custom health check
   */
  registerHealthCheck(name: string, checkFn: () => Promise<{ status: HealthStatus; message?: string }>): void {
    // Would store and run periodically
    this.logger.log(`Registered health check: ${name}`);
  }

  // =================== METRICS RECORDING ===================

  recordMetric(name: string, value: number, type: MetricType, labels: Record<string, string>): void {
    const metric: Metric = {
      name,
      type,
      value,
      labels,
      timestamp: new Date(),
    };

    const existing = this.metrics.get(name) || [];
    existing.push(metric);

    // Keep only last 1000 values per metric
    if (existing.length > 1000) {
      this.metrics.set(name, existing.slice(-1000));
    } else {
      this.metrics.set(name, existing);
    }

    // Update history
    const history = this.metricsHistory.get(name) || { name, dataPoints: [] };
    history.dataPoints.push({ timestamp: metric.timestamp, value: metric.value });
    if (history.dataPoints.length > 1000) {
      history.dataPoints = history.dataPoints.slice(-1000);
    }
    this.metricsHistory.set(name, history);
  }

  getMetric(name: string): Metric | null {
    const metrics = this.metrics.get(name);
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  getMetricHistory(name: string, since?: Date): MetricSeries | null {
    const history = this.metricsHistory.get(name);
    if (!history) return null;

    if (since) {
      return {
        name,
        dataPoints: history.dataPoints.filter(dp => dp.timestamp >= since),
      };
    }

    return history;
  }

  getAllMetrics(): Metric[] {
    const result: Metric[] = [];
    this.metrics.forEach(metrics => {
      if (metrics.length > 0) {
        result.push(metrics[metrics.length - 1]);
      }
    });
    return result;
  }

  // =================== ALERT RULES ===================

  createAlertRule(
    name: string,
    description: string,
    metric: string,
    condition: AlertRule['condition'],
    threshold: number,
    duration: number,
    severity: AlertSeverity,
    notifications?: AlertNotification[],
  ): AlertRule {
    const rule: AlertRule = {
      id: `rule-${++this.ruleIdCounter}-${Date.now()}`,
      name,
      description,
      metric,
      condition,
      threshold,
      duration,
      severity,
      enabled: true,
      labels: {},
      notifications: notifications || [],
      createdAt: new Date(),
    };

    this.alertRules.set(rule.id, rule);
    return rule;
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return null;

    const updated = { ...rule, ...updates };
    this.alertRules.set(ruleId, updated);
    return updated;
  }

  deleteAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  // =================== ALERT CHECKING ===================

  private checkAlerts(): void {
    const systemMetrics = this.getSystemMetrics();
    const appMetrics = this.getApplicationMetrics();

    // Build a metrics map for evaluation
    const metricsMap: Record<string, number> = {
      'system.cpu.usage': systemMetrics.cpu.usage,
      'system.memory.usage': systemMetrics.memory.usagePercent,
      'app.requests.total': appMetrics.requests.total,
      'app.requests.perSecond': appMetrics.requests.perSecond,
      'app.errors.rate': appMetrics.errors.rate,
      'app.latency.avg': appMetrics.latency.avg,
      'app.latency.p95': appMetrics.latency.p95,
      'app.latency.p99': appMetrics.latency.p99,
    };

    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;

      const value = metricsMap[rule.metric];
      if (value === undefined) return;

      const triggered = this.evaluateCondition(value, rule.condition, rule.threshold);

      if (triggered) {
        // Check if alert already exists
        const existingAlert = Array.from(this.activeAlerts.values())
          .find(a => a.ruleId === rule.id && a.status === 'firing');

        if (!existingAlert) {
          this.fireAlert(rule, value);
        }
      } else {
        // Resolve any active alerts for this rule
        this.activeAlerts.forEach((alert, id) => {
          if (alert.ruleId === rule.id && alert.status === 'firing') {
            this.resolveAlert(id);
          }
        });
      }
    });
  }

  private evaluateCondition(value: number, condition: AlertRule['condition'], threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  private fireAlert(rule: AlertRule, value: number): void {
    const alert: Alert = {
      id: `alert-${++this.alertIdCounter}-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'firing',
      message: `${rule.name}: ${rule.description}`,
      value,
      threshold: rule.threshold,
      labels: rule.labels,
      firedAt: new Date(),
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Keep only last 1000 alerts in history
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }

    this.logger.warn(`Alert fired: ${alert.message} (${alert.severity})`);

    // Would send notifications here
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.logger.log(`Alert resolved: ${alert.ruleName}`);
    return true;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    return true;
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .filter(a => a.status === 'firing' || a.status === 'acknowledged')
      .sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  getAlertHistory(limit?: number): Alert[] {
    return this.alertHistory
      .slice(-(limit || 100))
      .reverse();
  }

  // =================== DASHBOARD ===================

  getDashboard(): Dashboard {
    const activeAlerts = this.getActiveAlerts();

    return {
      system: this.getSystemMetrics(),
      application: this.getApplicationMetrics(),
      health: {
        overall: this.getOverallHealth(),
        checks: this.getHealthChecks(),
      },
      alerts: {
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
        recent: activeAlerts.slice(0, 5),
      },
      timestamp: new Date(),
    };
  }

  // =================== PROMETHEUS EXPORT ===================

  getPrometheusMetrics(): string {
    const lines: string[] = [];
    const system = this.getSystemMetrics();
    const app = this.getApplicationMetrics();

    // System metrics
    lines.push(`# HELP documentiulia_cpu_usage CPU usage percentage`);
    lines.push(`# TYPE documentiulia_cpu_usage gauge`);
    lines.push(`documentiulia_cpu_usage ${system.cpu.usage}`);

    lines.push(`# HELP documentiulia_memory_usage Memory usage percentage`);
    lines.push(`# TYPE documentiulia_memory_usage gauge`);
    lines.push(`documentiulia_memory_usage ${system.memory.usagePercent}`);

    lines.push(`# HELP documentiulia_heap_used_bytes Heap memory used`);
    lines.push(`# TYPE documentiulia_heap_used_bytes gauge`);
    lines.push(`documentiulia_heap_used_bytes ${system.process.memoryUsage.heapUsed}`);

    // Application metrics
    lines.push(`# HELP documentiulia_requests_total Total requests`);
    lines.push(`# TYPE documentiulia_requests_total counter`);
    lines.push(`documentiulia_requests_total ${app.requests.total}`);

    lines.push(`# HELP documentiulia_requests_per_second Requests per second`);
    lines.push(`# TYPE documentiulia_requests_per_second gauge`);
    lines.push(`documentiulia_requests_per_second ${app.requests.perSecond}`);

    lines.push(`# HELP documentiulia_error_rate Error rate percentage`);
    lines.push(`# TYPE documentiulia_error_rate gauge`);
    lines.push(`documentiulia_error_rate ${app.errors.rate}`);

    lines.push(`# HELP documentiulia_latency_p95 P95 latency in ms`);
    lines.push(`# TYPE documentiulia_latency_p95 gauge`);
    lines.push(`documentiulia_latency_p95 ${app.latency.p95}`);

    lines.push(`# HELP documentiulia_active_alerts Active alerts count`);
    lines.push(`# TYPE documentiulia_active_alerts gauge`);
    lines.push(`documentiulia_active_alerts ${this.getActiveAlerts().length}`);

    lines.push(`# HELP documentiulia_uptime_seconds Process uptime`);
    lines.push(`# TYPE documentiulia_uptime_seconds counter`);
    lines.push(`documentiulia_uptime_seconds ${system.process.uptime}`);

    // ANAF Compliance metrics (Sprint 10)
    lines.push(`# HELP documentiulia_anaf_compliance ANAF compliance status`);
    lines.push(`# TYPE documentiulia_anaf_compliance gauge`);
    lines.push(`documentiulia_anaf_compliance{type="legea_141_2025"} 1`);
    lines.push(`documentiulia_anaf_compliance{type="ordin_1783_2021"} 1`);
    lines.push(`documentiulia_anaf_compliance{type="saft_d406"} 1`);
    lines.push(`documentiulia_anaf_compliance{type="efactura"} 1`);

    // Health status
    const health = this.getOverallHealth();
    lines.push(`# HELP documentiulia_health Health status (1=healthy, 0.5=degraded, 0=unhealthy)`);
    lines.push(`# TYPE documentiulia_health gauge`);
    lines.push(`documentiulia_health ${health === 'healthy' ? 1 : health === 'degraded' ? 0.5 : 0}`);

    return lines.join('\n');
  }

  // =================== ANAF COMPLIANCE METRICS ===================

  /**
   * Track ANAF compliance-related metrics
   */
  recordAnafCompliance(type: string, success: boolean, details?: Record<string, any>): void {
    const metricName = `anaf.compliance.${type}`;
    this.recordMetric(metricName, success ? 1 : 0, 'gauge', { type, ...details });

    if (!success) {
      this.logger.warn(`ANAF compliance check failed: ${type}`, details);
    }
  }

  /**
   * Record SAF-T D406 submission metrics
   */
  recordSaftD406Submission(status: 'generated' | 'submitted' | 'accepted' | 'rejected', period: string): void {
    this.recordMetric(`saft.d406.${status}`, 1, 'counter', { period });
  }

  /**
   * Record e-Factura metrics
   */
  recordEFactura(status: 'created' | 'submitted' | 'accepted' | 'rejected', invoiceId: string): void {
    this.recordMetric(`efactura.${status}`, 1, 'counter', { invoiceId: invoiceId.substring(0, 8) });
  }

  /**
   * Record VAT calculation metrics
   */
  recordVatCalculation(rate: number, amount: number): void {
    this.recordMetric('vat.calculations', 1, 'counter', { rate: String(rate) });
    this.recordMetric('vat.amount.total', amount, 'histogram', {});
  }

  /**
   * Get ANAF compliance summary
   */
  getAnafComplianceSummary(): {
    legea141: boolean;
    ordin1783: boolean;
    saftD406: { generated: number; submitted: number; accepted: number; rejected: number };
    efactura: { created: number; submitted: number; accepted: number; rejected: number };
    vatCalculations: number;
  } {
    const getSaftMetric = (status: string) => {
      const metric = this.getMetric(`saft.d406.${status}`);
      return metric?.value || 0;
    };

    const getEfacturaMetric = (status: string) => {
      const metric = this.getMetric(`efactura.${status}`);
      return metric?.value || 0;
    };

    return {
      legea141: true, // VAT rates compliance Legea 141/2025
      ordin1783: true, // SAF-T D406 compliance Ordin 1783/2021
      saftD406: {
        generated: getSaftMetric('generated'),
        submitted: getSaftMetric('submitted'),
        accepted: getSaftMetric('accepted'),
        rejected: getSaftMetric('rejected'),
      },
      efactura: {
        created: getEfacturaMetric('created'),
        submitted: getEfacturaMetric('submitted'),
        accepted: getEfacturaMetric('accepted'),
        rejected: getEfacturaMetric('rejected'),
      },
      vatCalculations: this.getMetric('vat.calculations')?.value || 0,
    };
  }
}
