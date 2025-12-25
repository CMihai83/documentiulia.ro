import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

export type ComponentType =
  | 'DATABASE'
  | 'CACHE'
  | 'QUEUE'
  | 'STORAGE'
  | 'EMAIL'
  | 'ANAF_API'
  | 'SAGA_API'
  | 'PAYMENT_GATEWAY'
  | 'AI_SERVICE'
  | 'CDN'
  | 'AUTHENTICATION'
  | 'CUSTOM';

export interface HealthCheckResult {
  name: string;
  nameRo: string;
  type: ComponentType;
  status: HealthStatus;
  responseTime: number;
  message?: string;
  messageRo?: string;
  details?: Record<string, any>;
  lastChecked: Date;
}

export interface SystemHealth {
  status: HealthStatus;
  uptime: number;
  version: string;
  environment: string;
  timestamp: Date;
  components: HealthCheckResult[];
  metrics: SystemMetrics;
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  requests: RequestMetrics;
}

export interface CpuMetrics {
  usage: number;
  cores: number;
  loadAverage: number[];
}

export interface MemoryMetrics {
  used: number;
  total: number;
  free: number;
  usagePercent: number;
  heapUsed: number;
  heapTotal: number;
}

export interface DiskMetrics {
  used: number;
  total: number;
  free: number;
  usagePercent: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  connectionsActive: number;
}

export interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
  averageResponseTime: number;
  requestsPerMinute: number;
}

export interface HealthCheckConfig {
  name: string;
  nameRo: string;
  type: ComponentType;
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
  critical: boolean;
  checkFn: () => Promise<{ healthy: boolean; details?: Record<string, any>; message?: string }>;
}

export interface HealthAlert {
  id: string;
  component: string;
  type: 'WARNING' | 'CRITICAL';
  message: string;
  messageRo: string;
  status: HealthStatus;
  previousStatus: HealthStatus;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface HealthHistoryEntry {
  timestamp: Date;
  status: HealthStatus;
  componentResults: { name: string; status: HealthStatus; responseTime: number }[];
  metrics: SystemMetrics;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();
  private checks: Map<string, HealthCheckConfig> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private alerts: Map<string, HealthAlert> = new Map();
  private history: HealthHistoryEntry[] = [];
  private requestMetrics: { timestamp: number; success: boolean; responseTime: number }[] = [];
  private checkIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultChecks();
  }

  onModuleDestroy(): void {
    this.stopAllChecks();
  }

  private initializeDefaultChecks(): void {
    // Database check
    this.registerCheck({
      name: 'PostgreSQL Database',
      nameRo: 'Baza de Date PostgreSQL',
      type: 'DATABASE',
      enabled: true,
      interval: 30000,
      timeout: 5000,
      retries: 2,
      critical: true,
      checkFn: async () => {
        await this.simulateCheck(20);
        return { healthy: true, details: { connections: 10, maxConnections: 100 } };
      },
    });

    // Redis cache check
    this.registerCheck({
      name: 'Redis Cache',
      nameRo: 'Cache Redis',
      type: 'CACHE',
      enabled: true,
      interval: 15000,
      timeout: 3000,
      retries: 1,
      critical: true,
      checkFn: async () => {
        await this.simulateCheck(5);
        return { healthy: true, details: { memory: '256MB', hitRate: 0.95 } };
      },
    });

    // Queue check
    this.registerCheck({
      name: 'Job Queue',
      nameRo: 'Coadă de Joburi',
      type: 'QUEUE',
      enabled: true,
      interval: 30000,
      timeout: 5000,
      retries: 1,
      critical: false,
      checkFn: async () => {
        await this.simulateCheck(10);
        return { healthy: true, details: { pending: 5, processing: 2 } };
      },
    });

    // Storage check
    this.registerCheck({
      name: 'File Storage',
      nameRo: 'Stocare Fișiere',
      type: 'STORAGE',
      enabled: true,
      interval: 60000,
      timeout: 10000,
      retries: 2,
      critical: false,
      checkFn: async () => {
        await this.simulateCheck(50);
        return { healthy: true, details: { used: '10GB', available: '90GB' } };
      },
    });

    // ANAF API check
    this.registerCheck({
      name: 'ANAF API',
      nameRo: 'API ANAF',
      type: 'ANAF_API',
      enabled: true,
      interval: 60000,
      timeout: 15000,
      retries: 3,
      critical: false,
      checkFn: async () => {
        await this.simulateCheck(100);
        return { healthy: true, details: { endpoint: 'https://api.anaf.ro', latency: 95 } };
      },
    });

    // SAGA API check
    this.registerCheck({
      name: 'SAGA API',
      nameRo: 'API SAGA',
      type: 'SAGA_API',
      enabled: true,
      interval: 60000,
      timeout: 10000,
      retries: 2,
      critical: false,
      checkFn: async () => {
        await this.simulateCheck(80);
        return { healthy: true, details: { version: '3.2', status: 'operational' } };
      },
    });

    // AI Service check
    this.registerCheck({
      name: 'AI/ML Service',
      nameRo: 'Serviciu AI/ML',
      type: 'AI_SERVICE',
      enabled: true,
      interval: 30000,
      timeout: 10000,
      retries: 2,
      critical: false,
      checkFn: async () => {
        await this.simulateCheck(30);
        return { healthy: true, details: { model: 'Grok', gpu: 'available' } };
      },
    });
  }

  // Check Registration

  registerCheck(config: HealthCheckConfig): void {
    this.checks.set(config.name, config);

    if (config.enabled) {
      this.startCheck(config.name);
    }

    this.logger.log(`Health check registered: ${config.name}`);
  }

  unregisterCheck(name: string): void {
    this.stopCheck(name);
    this.checks.delete(name);
    this.lastResults.delete(name);

    this.logger.log(`Health check unregistered: ${name}`);
  }

  private startCheck(name: string): void {
    const config = this.checks.get(name);
    if (!config || !config.enabled) return;

    // Run immediately
    this.runCheck(name);

    // Schedule periodic checks
    const interval = setInterval(() => {
      this.runCheck(name);
    }, config.interval);

    this.checkIntervals.set(name, interval);
  }

  private stopCheck(name: string): void {
    const interval = this.checkIntervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(name);
    }
  }

  stopAllChecks(): void {
    for (const [name] of this.checkIntervals) {
      this.stopCheck(name);
    }
  }

  // Running Health Checks

  async runCheck(name: string): Promise<HealthCheckResult> {
    const config = this.checks.get(name);
    if (!config) {
      throw new Error(`Health check not found: ${name}`);
    }

    const startTime = Date.now();
    let status: HealthStatus = 'UNKNOWN';
    let message: string | undefined;
    let details: Record<string, any> | undefined;
    let attempts = 0;

    while (attempts < config.retries) {
      attempts++;
      try {
        const result = await Promise.race([
          config.checkFn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), config.timeout),
          ),
        ]);

        status = result.healthy ? 'HEALTHY' : 'UNHEALTHY';
        message = result.message;
        details = result.details;
        break;
      } catch (err) {
        message = err instanceof Error ? err.message : 'Unknown error';
        status = 'UNHEALTHY';

        if (attempts < config.retries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    const responseTime = Date.now() - startTime;
    const result: HealthCheckResult = {
      name: config.name,
      nameRo: config.nameRo,
      type: config.type,
      status,
      responseTime,
      message,
      details,
      lastChecked: new Date(),
    };

    // Check for status change
    const previousResult = this.lastResults.get(name);
    if (previousResult && previousResult.status !== status) {
      this.handleStatusChange(config, previousResult.status, status, message);
    }

    this.lastResults.set(name, result);

    this.eventEmitter.emit('health.checked', {
      name,
      status,
      responseTime,
    });

    return result;
  }

  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const [name, config] of this.checks) {
      if (config.enabled) {
        const result = await this.runCheck(name);
        results.push(result);
      }
    }

    return results;
  }

  private handleStatusChange(
    config: HealthCheckConfig,
    previousStatus: HealthStatus,
    newStatus: HealthStatus,
    message?: string,
  ): void {
    if (newStatus === 'UNHEALTHY') {
      const alert: HealthAlert = {
        id: this.generateId('alert'),
        component: config.name,
        type: config.critical ? 'CRITICAL' : 'WARNING',
        message: message || `${config.name} is unhealthy`,
        messageRo: `${config.nameRo} nu funcționează`,
        status: newStatus,
        previousStatus,
        createdAt: new Date(),
      };

      this.alerts.set(alert.id, alert);

      this.eventEmitter.emit('health.alert', alert);

      this.logger.warn(`Health alert: ${config.name} changed from ${previousStatus} to ${newStatus}`);
    } else if (newStatus === 'HEALTHY' && previousStatus === 'UNHEALTHY') {
      // Resolve existing alerts
      for (const [id, alert] of this.alerts) {
        if (alert.component === config.name && !alert.resolvedAt) {
          alert.resolvedAt = new Date();
          this.alerts.set(id, alert);

          this.eventEmitter.emit('health.resolved', { alertId: id, component: config.name });
        }
      }

      this.logger.log(`Health restored: ${config.name}`);
    }
  }

  // Health Status

  async getHealth(): Promise<SystemHealth> {
    const components = await this.runAllChecks();
    const metrics = this.getMetrics();

    // Determine overall status
    let overallStatus: HealthStatus = 'HEALTHY';
    const criticalChecks = Array.from(this.checks.values()).filter((c) => c.critical);

    for (const component of components) {
      if (component.status === 'UNHEALTHY') {
        const config = this.checks.get(component.name);
        if (config?.critical) {
          overallStatus = 'UNHEALTHY';
          break;
        } else if (overallStatus === 'HEALTHY') {
          overallStatus = 'DEGRADED';
        }
      }
    }

    const health: SystemHealth = {
      status: overallStatus,
      uptime: Date.now() - this.startTime,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date(),
      components,
      metrics,
    };

    // Record history
    this.recordHistory(health);

    return health;
  }

  async getLiveness(): Promise<{ alive: boolean }> {
    return { alive: true };
  }

  async getReadiness(): Promise<{ ready: boolean; reason?: string }> {
    const criticalChecks = Array.from(this.checks.values()).filter((c) => c.critical && c.enabled);

    for (const check of criticalChecks) {
      const result = this.lastResults.get(check.name);
      if (!result || result.status !== 'HEALTHY') {
        return {
          ready: false,
          reason: `Critical component ${check.name} is not healthy`,
        };
      }
    }

    return { ready: true };
  }

  getComponentHealth(name: string): HealthCheckResult | undefined {
    return this.lastResults.get(name);
  }

  getComponentsByType(type: ComponentType): HealthCheckResult[] {
    return Array.from(this.lastResults.values()).filter((r) => r.type === type);
  }

  // Metrics

  getMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();

    // Simulate metrics (in production, these would come from actual monitoring)
    return {
      cpu: {
        usage: Math.random() * 30 + 10, // 10-40%
        cores: 4,
        loadAverage: [1.2, 1.5, 1.8],
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal * 2,
        free: memoryUsage.heapTotal * 2 - memoryUsage.heapUsed,
        usagePercent: (memoryUsage.heapUsed / (memoryUsage.heapTotal * 2)) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      },
      disk: {
        used: 10 * 1024 * 1024 * 1024, // 10GB
        total: 100 * 1024 * 1024 * 1024, // 100GB
        free: 90 * 1024 * 1024 * 1024, // 90GB
        usagePercent: 10,
      },
      network: {
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 500000),
        connectionsActive: Math.floor(Math.random() * 50 + 10),
      },
      requests: this.getRequestMetrics(),
    };
  }

  recordRequest(success: boolean, responseTime: number): void {
    this.requestMetrics.push({
      timestamp: Date.now(),
      success,
      responseTime,
    });

    // Keep only last 10000 requests
    if (this.requestMetrics.length > 10000) {
      this.requestMetrics = this.requestMetrics.slice(-5000);
    }
  }

  private getRequestMetrics(): RequestMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentRequests = this.requestMetrics.filter((r) => r.timestamp > oneMinuteAgo);
    const successful = recentRequests.filter((r) => r.success);
    const avgResponseTime =
      recentRequests.length > 0
        ? recentRequests.reduce((sum, r) => sum + r.responseTime, 0) / recentRequests.length
        : 0;

    return {
      total: this.requestMetrics.length,
      successful: this.requestMetrics.filter((r) => r.success).length,
      failed: this.requestMetrics.filter((r) => !r.success).length,
      averageResponseTime: Math.floor(avgResponseTime),
      requestsPerMinute: recentRequests.length,
    };
  }

  // Alerts

  getAlerts(includeResolved: boolean = false): HealthAlert[] {
    let alerts = Array.from(this.alerts.values());
    if (!includeResolved) {
      alerts = alerts.filter((a) => !a.resolvedAt);
    }
    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  acknowledgeAlert(alertId: string): HealthAlert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.acknowledgedAt = new Date();
    this.alerts.set(alertId, alert);

    this.eventEmitter.emit('health.alert.acknowledged', { alertId });

    return alert;
  }

  clearResolvedAlerts(): number {
    let clearedCount = 0;
    for (const [id, alert] of this.alerts) {
      if (alert.resolvedAt) {
        this.alerts.delete(id);
        clearedCount++;
      }
    }
    return clearedCount;
  }

  // History

  private recordHistory(health: SystemHealth): void {
    const entry: HealthHistoryEntry = {
      timestamp: health.timestamp,
      status: health.status,
      componentResults: health.components.map((c) => ({
        name: c.name,
        status: c.status,
        responseTime: c.responseTime,
      })),
      metrics: health.metrics,
    };

    this.history.push(entry);

    // Keep only last 1000 entries
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }
  }

  getHistory(since?: Date, limit: number = 100): HealthHistoryEntry[] {
    let entries = this.history;
    if (since) {
      entries = entries.filter((e) => e.timestamp >= since);
    }
    return entries.slice(-limit).reverse();
  }

  getUptimeStats(since?: Date): { totalChecks: number; healthyChecks: number; uptimePercent: number } {
    let entries = this.history;
    if (since) {
      entries = entries.filter((e) => e.timestamp >= since);
    }

    const totalChecks = entries.length;
    const healthyChecks = entries.filter((e) => e.status === 'HEALTHY').length;
    const uptimePercent = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 100;

    return { totalChecks, healthyChecks, uptimePercent };
  }

  // Configuration

  enableCheck(name: string): void {
    const config = this.checks.get(name);
    if (!config) {
      throw new Error('Check not found');
    }

    if (!config.enabled) {
      config.enabled = true;
      this.checks.set(name, config);
      this.startCheck(name);

      this.eventEmitter.emit('health.check.enabled', { name });
    }
  }

  disableCheck(name: string): void {
    const config = this.checks.get(name);
    if (!config) {
      throw new Error('Check not found');
    }

    if (config.enabled) {
      config.enabled = false;
      this.checks.set(name, config);
      this.stopCheck(name);

      this.eventEmitter.emit('health.check.disabled', { name });
    }
  }

  updateCheckInterval(name: string, interval: number): void {
    const config = this.checks.get(name);
    if (!config) {
      throw new Error('Check not found');
    }

    config.interval = interval;
    this.checks.set(name, config);

    if (config.enabled) {
      this.stopCheck(name);
      this.startCheck(name);
    }

    this.eventEmitter.emit('health.check.updated', { name, interval });
  }

  getAllChecks(): HealthCheckConfig[] {
    return Array.from(this.checks.values());
  }

  // Helper Methods

  private async simulateCheck(delayMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
