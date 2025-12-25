import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  unit?: string;
}

export interface MetricSummary {
  name: string;
  current: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAvg: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  heap: {
    total: number;
    used: number;
    external: number;
  };
  uptime: number;
  activeConnections: number;
  requestsPerSecond: number;
}

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  requestCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  successRate: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'high_latency' | 'high_error_rate' | 'high_cpu' | 'high_memory' | 'slow_queries';
  severity: 'warning' | 'critical';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);

  // In-memory metrics storage
  private metrics = new Map<string, MetricPoint[]>();
  private alerts: PerformanceAlert[] = [];
  private readonly maxPointsPerMetric = 10000;
  private readonly retentionHours = 24;

  // Thresholds
  private readonly thresholds = {
    responseTime: { warning: 500, critical: 1000 },
    errorRate: { warning: 5, critical: 10 },
    cpuUsage: { warning: 70, critical: 90 },
    memoryUsage: { warning: 80, critical: 95 },
    queryTime: { warning: 100, critical: 500 },
  };

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleMetrics();
  }

  private initializeSampleMetrics(): void {
    // Generate sample metrics for demo
    const now = Date.now();
    const endpoints = [
      '/api/v1/invoices',
      '/api/v1/clients',
      '/api/v1/auth/login',
      '/api/v1/reports',
      '/api/v1/payments',
    ];

    // Generate response time metrics
    for (let i = 0; i < 1000; i++) {
      const timestamp = new Date(now - i * 60000);
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      const responseTime = Math.random() > 0.95
        ? Math.floor(Math.random() * 2000) + 500 // Slow responses
        : Math.floor(Math.random() * 200) + 10;  // Normal responses

      this.record({
        name: 'http.response_time',
        value: responseTime,
        timestamp,
        tags: { endpoint, method: 'GET' },
        unit: 'ms',
      });

      // Error rate
      if (Math.random() > 0.95) {
        this.record({
          name: 'http.error',
          value: 1,
          timestamp,
          tags: { endpoint, statusCode: '500' },
        });
      }
    }

    // System metrics
    for (let i = 0; i < 60; i++) {
      const timestamp = new Date(now - i * 60000);

      this.record({
        name: 'system.cpu.usage',
        value: 30 + Math.random() * 40,
        timestamp,
        unit: 'percent',
      });

      this.record({
        name: 'system.memory.usage',
        value: 50 + Math.random() * 30,
        timestamp,
        unit: 'percent',
      });

      this.record({
        name: 'system.requests_per_second',
        value: Math.floor(50 + Math.random() * 100),
        timestamp,
        unit: 'rps',
      });
    }
  }

  async record(point: Omit<MetricPoint, 'timestamp'> & { timestamp?: Date }): Promise<void> {
    const metricPoint: MetricPoint = {
      ...point,
      timestamp: point.timestamp || new Date(),
    };

    const points = this.metrics.get(point.name) || [];
    points.push(metricPoint);

    // Keep only recent points
    if (points.length > this.maxPointsPerMetric) {
      points.shift();
    }

    this.metrics.set(point.name, points);

    // Check thresholds
    this.checkThresholds(metricPoint);
  }

  async increment(name: string, tags?: Record<string, string>): Promise<void> {
    await this.record({ name, value: 1, tags });
  }

  async gauge(name: string, value: number, tags?: Record<string, string>, unit?: string): Promise<void> {
    await this.record({ name, value, tags, unit });
  }

  async timing(name: string, durationMs: number, tags?: Record<string, string>): Promise<void> {
    await this.record({ name, value: durationMs, tags, unit: 'ms' });
  }

  private checkThresholds(point: MetricPoint): void {
    let alertType: PerformanceAlert['type'] | null = null;
    let threshold = 0;
    let severity: PerformanceAlert['severity'] = 'warning';

    if (point.name === 'http.response_time' && point.value > this.thresholds.responseTime.critical) {
      alertType = 'high_latency';
      threshold = this.thresholds.responseTime.critical;
      severity = 'critical';
    } else if (point.name === 'http.response_time' && point.value > this.thresholds.responseTime.warning) {
      alertType = 'high_latency';
      threshold = this.thresholds.responseTime.warning;
    } else if (point.name === 'system.cpu.usage' && point.value > this.thresholds.cpuUsage.critical) {
      alertType = 'high_cpu';
      threshold = this.thresholds.cpuUsage.critical;
      severity = 'critical';
    } else if (point.name === 'system.cpu.usage' && point.value > this.thresholds.cpuUsage.warning) {
      alertType = 'high_cpu';
      threshold = this.thresholds.cpuUsage.warning;
    } else if (point.name === 'system.memory.usage' && point.value > this.thresholds.memoryUsage.critical) {
      alertType = 'high_memory';
      threshold = this.thresholds.memoryUsage.critical;
      severity = 'critical';
    } else if (point.name === 'system.memory.usage' && point.value > this.thresholds.memoryUsage.warning) {
      alertType = 'high_memory';
      threshold = this.thresholds.memoryUsage.warning;
    }

    if (alertType) {
      this.createAlert(alertType, severity, point, threshold);
    }
  }

  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    point: MetricPoint,
    threshold: number,
  ): void {
    // Check if similar alert exists and is not resolved
    const existingAlert = this.alerts.find(a =>
      a.type === type &&
      a.metric === point.name &&
      !a.resolved &&
      Date.now() - a.triggeredAt.getTime() < 300000 // Within 5 minutes
    );

    if (existingAlert) return;

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message: `${type}: ${point.name} = ${point.value.toFixed(2)} (threshold: ${threshold})`,
      metric: point.name,
      threshold,
      currentValue: point.value,
      triggeredAt: new Date(),
      resolved: false,
    };

    this.alerts.unshift(alert);

    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    this.eventEmitter.emit('performance.alert', alert);
    this.logger.warn(`Performance alert: ${alert.message}`);
  }

  async getSummary(name: string, period: 'minute' | 'hour' | 'day' = 'hour'): Promise<MetricSummary | null> {
    const points = this.metrics.get(name) || [];
    if (points.length === 0) return null;

    const periodMs = {
      minute: 60000,
      hour: 3600000,
      day: 86400000,
    };

    const cutoff = Date.now() - periodMs[period];
    const recentPoints = points.filter(p => p.timestamp.getTime() > cutoff);

    if (recentPoints.length === 0) return null;

    const values = recentPoints.map(p => p.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    // Calculate trend
    const midpoint = Math.floor(recentPoints.length / 2);
    const firstHalfAvg = values.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint || 0;
    const secondHalfAvg = values.slice(midpoint).reduce((a, b) => a + b, 0) / (values.length - midpoint) || 0;
    const changePercent = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    let trend: MetricSummary['trend'] = 'stable';
    if (changePercent > 10) trend = 'up';
    else if (changePercent < -10) trend = 'down';

    return {
      name,
      current: values[values.length - 1],
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
      count: values.length,
      unit: recentPoints[0].unit,
      trend,
      changePercent: Math.round(changePercent * 10) / 10,
    };
  }

  async getSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();

    // Get latest metrics
    const cpuPoints = this.metrics.get('system.cpu.usage') || [];
    const rpsPoints = this.metrics.get('system.requests_per_second') || [];

    const latestCpu = cpuPoints[cpuPoints.length - 1]?.value || 0;
    const latestRps = rpsPoints[rpsPoints.length - 1]?.value || 0;

    return {
      cpu: {
        usage: Math.round(latestCpu),
        cores: require('os').cpus().length,
        loadAvg: require('os').loadavg(),
      },
      memory: {
        total: require('os').totalmem(),
        used: require('os').totalmem() - require('os').freemem(),
        free: require('os').freemem(),
        usagePercent: Math.round(((require('os').totalmem() - require('os').freemem()) / require('os').totalmem()) * 100),
      },
      heap: {
        total: memUsage.heapTotal,
        used: memUsage.heapUsed,
        external: memUsage.external,
      },
      uptime: process.uptime(),
      activeConnections: 0, // Would be from actual connection tracking
      requestsPerSecond: Math.round(latestRps),
    };
  }

  async getEndpointMetrics(period: 'minute' | 'hour' | 'day' = 'hour'): Promise<EndpointMetrics[]> {
    const responseTimePoints = this.metrics.get('http.response_time') || [];
    const errorPoints = this.metrics.get('http.error') || [];

    const periodMs = {
      minute: 60000,
      hour: 3600000,
      day: 86400000,
    };

    const cutoff = Date.now() - periodMs[period];

    // Group by endpoint
    const endpointStats = new Map<string, {
      times: number[];
      errors: number;
      total: number;
    }>();

    for (const point of responseTimePoints) {
      if (point.timestamp.getTime() < cutoff) continue;

      const endpoint = point.tags?.endpoint || 'unknown';
      const stats = endpointStats.get(endpoint) || { times: [], errors: 0, total: 0 };
      stats.times.push(point.value);
      stats.total++;
      endpointStats.set(endpoint, stats);
    }

    for (const point of errorPoints) {
      if (point.timestamp.getTime() < cutoff) continue;

      const endpoint = point.tags?.endpoint || 'unknown';
      const stats = endpointStats.get(endpoint) || { times: [], errors: 0, total: 0 };
      stats.errors += point.value;
      endpointStats.set(endpoint, stats);
    }

    const metrics: EndpointMetrics[] = [];

    for (const [endpoint, stats] of endpointStats) {
      const sortedTimes = stats.times.sort((a, b) => a - b);
      const avgTime = stats.times.reduce((a, b) => a + b, 0) / stats.times.length || 0;
      const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;

      metrics.push({
        endpoint,
        method: 'GET',
        requestCount: stats.total,
        avgResponseTime: Math.round(avgTime),
        p95ResponseTime: Math.round(p95Time),
        errorRate: stats.total > 0 ? Math.round((stats.errors / stats.total) * 100 * 10) / 10 : 0,
        successRate: stats.total > 0 ? Math.round(((stats.total - stats.errors) / stats.total) * 100 * 10) / 10 : 100,
      });
    }

    return metrics.sort((a, b) => b.requestCount - a.requestCount);
  }

  async getAlerts(unresolved: boolean = false): Promise<PerformanceAlert[]> {
    if (unresolved) {
      return this.alerts.filter(a => !a.resolved);
    }
    return this.alerts;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    return true;
  }

  async getMetricNames(): Promise<string[]> {
    return Array.from(this.metrics.keys());
  }

  async getMetricData(
    name: string,
    period: 'minute' | 'hour' | 'day' = 'hour',
    resolution: number = 60, // Points to return
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const points = this.metrics.get(name) || [];

    const periodMs = {
      minute: 60000,
      hour: 3600000,
      day: 86400000,
    };

    const cutoff = Date.now() - periodMs[period];
    const recentPoints = points.filter(p => p.timestamp.getTime() > cutoff);

    // Downsample if needed
    if (recentPoints.length <= resolution) {
      return recentPoints.map(p => ({ timestamp: p.timestamp, value: p.value }));
    }

    const step = Math.floor(recentPoints.length / resolution);
    const downsampled: Array<{ timestamp: Date; value: number }> = [];

    for (let i = 0; i < recentPoints.length; i += step) {
      const slice = recentPoints.slice(i, i + step);
      const avgValue = slice.reduce((sum, p) => sum + p.value, 0) / slice.length;
      downsampled.push({
        timestamp: slice[Math.floor(slice.length / 2)].timestamp,
        value: avgValue,
      });
    }

    return downsampled;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async collectSystemMetrics(): Promise<void> {
    const os = require('os');

    // CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as Record<string, number>)[type];
      }
      totalIdle += cpu.times.idle;
    }

    const cpuUsage = 100 - (totalIdle / totalTick) * 100;

    await this.gauge('system.cpu.usage', cpuUsage, {}, 'percent');
    await this.gauge(
      'system.memory.usage',
      ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      {},
      'percent'
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldMetrics(): Promise<void> {
    const cutoff = Date.now() - this.retentionHours * 3600000;

    for (const [name, points] of this.metrics) {
      const filtered = points.filter(p => p.timestamp.getTime() > cutoff);
      this.metrics.set(name, filtered);
    }

    this.logger.debug('Cleaned up old metrics');
  }
}
