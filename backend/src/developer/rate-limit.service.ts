import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Rate Limit Dashboard Service
 * Monitor and manage API rate limiting
 *
 * Features:
 * - Rate limit monitoring
 * - Usage quotas
 * - Threshold alerts
 * - Custom limits per API key
 */

// =================== TYPES ===================

export interface RateLimitConfig {
  id: string;
  name: string;
  type: 'global' | 'tenant' | 'api_key' | 'endpoint';
  targetId?: string; // tenantId, apiKeyId, or endpoint
  limits: {
    requestsPerSecond?: number;
    requestsPerMinute: number;
    requestsPerHour?: number;
    requestsPerDay: number;
  };
  burstLimit?: number;
  isActive: boolean;
  priority: number; // Higher priority overrides lower
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitUsage {
  configId: string;
  configName: string;
  targetId?: string;
  currentUsage: {
    second: number;
    minute: number;
    hour: number;
    day: number;
  };
  limits: {
    second?: number;
    minute: number;
    hour?: number;
    day: number;
  };
  percentageUsed: {
    minute: number;
    hour?: number;
    day: number;
  };
  isLimited: boolean;
  resetTimes: {
    minute: Date;
    hour: Date;
    day: Date;
  };
}

export interface RateLimitEvent {
  id: string;
  type: 'limit_reached' | 'warning_threshold' | 'quota_reset' | 'config_changed';
  configId: string;
  targetId?: string;
  targetType: 'global' | 'tenant' | 'api_key' | 'endpoint';
  details: {
    limit?: number;
    current?: number;
    threshold?: number;
    message: string;
  };
  timestamp: Date;
}

export interface QuotaStatus {
  tenantId: string;
  plan: string;
  quotas: {
    requests: { used: number; limit: number; percentage: number };
    bandwidth: { used: number; limit: number; percentage: number };
    storage: { used: number; limit: number; percentage: number };
  };
  billingPeriod: {
    start: Date;
    end: Date;
    daysRemaining: number;
  };
  overageCharges?: number;
}

// =================== SERVICE ===================

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  // Storage
  private configs = new Map<string, RateLimitConfig>();
  private usageCounters = new Map<string, Map<string, number>>(); // key -> (window -> count)
  private events: RateLimitEvent[] = [];

  // Default limits
  private readonly defaultLimits = {
    free: { minute: 60, day: 1000 },
    pro: { minute: 300, day: 10000 },
    business: { minute: 1000, day: 100000 },
    enterprise: { minute: 5000, day: 1000000 },
  };

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultConfigs();
    // Cleanup old windows periodically
    setInterval(() => this.cleanupOldWindows(), 60 * 1000);
  }

  private initializeDefaultConfigs(): void {
    // Global default limit
    this.configs.set('global-default', {
      id: 'global-default',
      name: 'Global Default Limit',
      type: 'global',
      limits: {
        requestsPerMinute: 100,
        requestsPerDay: 10000,
      },
      burstLimit: 20,
      isActive: true,
      priority: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Plan-based limits
    Object.entries(this.defaultLimits).forEach(([plan, limits]) => {
      this.configs.set(`plan-${plan}`, {
        id: `plan-${plan}`,
        name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Limit`,
        type: 'global',
        limits: {
          requestsPerMinute: limits.minute,
          requestsPerDay: limits.day,
        },
        isActive: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    this.logger.log(`Initialized ${this.configs.size} rate limit configurations`);
  }

  // =================== RATE LIMITING ===================

  async checkRateLimit(params: {
    tenantId: string;
    apiKeyId?: string;
    endpoint?: string;
    plan?: string;
  }): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    limit: number;
    retryAfter?: number;
  }> {
    // Get applicable config
    const config = this.getApplicableConfig(params);
    if (!config) {
      return { allowed: true, remaining: 100, resetAt: new Date(), limit: 100 };
    }

    const key = this.buildKey(params, config);
    const windowKey = this.getWindowKey('minute');
    const usage = this.getUsage(key, windowKey);

    const limit = config.limits.requestsPerMinute;
    const remaining = Math.max(0, limit - usage);
    const resetAt = this.getResetTime('minute');

    if (usage >= limit) {
      // Record rate limit event
      this.recordEvent({
        type: 'limit_reached',
        configId: config.id,
        targetId: params.tenantId,
        targetType: config.type,
        details: {
          limit,
          current: usage,
          message: `Rate limit exceeded: ${usage}/${limit} requests per minute`,
        },
      });

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit,
        retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
      };
    }

    // Check warning threshold (80%)
    if (usage >= limit * 0.8 && usage < limit) {
      this.recordEvent({
        type: 'warning_threshold',
        configId: config.id,
        targetId: params.tenantId,
        targetType: config.type,
        details: {
          limit,
          current: usage,
          threshold: 80,
          message: `Approaching rate limit: ${usage}/${limit} (80% threshold)`,
        },
      });
    }

    return { allowed: true, remaining, resetAt, limit };
  }

  async incrementUsage(params: {
    tenantId: string;
    apiKeyId?: string;
    endpoint?: string;
    plan?: string;
  }): Promise<void> {
    const config = this.getApplicableConfig(params);
    if (!config) return;

    const key = this.buildKey(params, config);

    // Increment for all windows
    ['minute', 'hour', 'day'].forEach(window => {
      const windowKey = this.getWindowKey(window as 'minute' | 'hour' | 'day');
      const counters = this.usageCounters.get(key) || new Map();
      counters.set(windowKey, (counters.get(windowKey) || 0) + 1);
      this.usageCounters.set(key, counters);
    });
  }

  private getApplicableConfig(params: {
    tenantId: string;
    apiKeyId?: string;
    endpoint?: string;
    plan?: string;
  }): RateLimitConfig | null {
    let config: RateLimitConfig | null = null;
    let highestPriority = -1;

    for (const c of this.configs.values()) {
      if (!c.isActive) continue;

      let matches = false;

      switch (c.type) {
        case 'global':
          matches = true;
          break;
        case 'tenant':
          matches = c.targetId === params.tenantId;
          break;
        case 'api_key':
          matches = c.targetId === params.apiKeyId;
          break;
        case 'endpoint':
          matches = c.targetId === params.endpoint;
          break;
      }

      if (matches && c.priority > highestPriority) {
        config = c;
        highestPriority = c.priority;
      }
    }

    // Check plan-based config
    if (params.plan) {
      const planConfig = this.configs.get(`plan-${params.plan}`);
      if (planConfig && planConfig.priority > highestPriority) {
        config = planConfig;
      }
    }

    return config;
  }

  private buildKey(params: { tenantId: string; apiKeyId?: string; endpoint?: string }, config: RateLimitConfig): string {
    switch (config.type) {
      case 'global':
        return 'global';
      case 'tenant':
        return `tenant:${params.tenantId}`;
      case 'api_key':
        return `key:${params.apiKeyId}`;
      case 'endpoint':
        return `endpoint:${params.tenantId}:${params.endpoint}`;
      default:
        return `tenant:${params.tenantId}`;
    }
  }

  private getWindowKey(window: 'second' | 'minute' | 'hour' | 'day'): string {
    const now = new Date();
    switch (window) {
      case 'second':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
      case 'minute':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
      case 'hour':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      case 'day':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    }
  }

  private getUsage(key: string, windowKey: string): number {
    const counters = this.usageCounters.get(key);
    if (!counters) return 0;
    return counters.get(windowKey) || 0;
  }

  private getResetTime(window: 'minute' | 'hour' | 'day'): Date {
    const now = new Date();
    switch (window) {
      case 'minute':
        return new Date(now.getTime() + (60 - now.getSeconds()) * 1000);
      case 'hour':
        return new Date(now.getTime() + (60 - now.getMinutes()) * 60 * 1000);
      case 'day':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }
  }

  // =================== USAGE DASHBOARD ===================

  async getCurrentUsage(params: {
    tenantId: string;
    apiKeyId?: string;
  }): Promise<RateLimitUsage[]> {
    const usage: RateLimitUsage[] = [];

    for (const config of this.configs.values()) {
      if (!config.isActive) continue;

      // Check if config applies to this tenant/key
      if (config.type === 'tenant' && config.targetId !== params.tenantId) continue;
      if (config.type === 'api_key' && config.targetId !== params.apiKeyId) continue;

      const key = config.type === 'global' ? 'global'
        : config.type === 'api_key' ? `key:${params.apiKeyId}`
        : `tenant:${params.tenantId}`;

      const minuteUsage = this.getUsage(key, this.getWindowKey('minute'));
      const hourUsage = this.getUsage(key, this.getWindowKey('hour'));
      const dayUsage = this.getUsage(key, this.getWindowKey('day'));

      usage.push({
        configId: config.id,
        configName: config.name,
        targetId: config.targetId,
        currentUsage: {
          second: 0,
          minute: minuteUsage,
          hour: hourUsage,
          day: dayUsage,
        },
        limits: {
          minute: config.limits.requestsPerMinute,
          hour: config.limits.requestsPerHour,
          day: config.limits.requestsPerDay,
        },
        percentageUsed: {
          minute: Math.round((minuteUsage / config.limits.requestsPerMinute) * 100),
          hour: config.limits.requestsPerHour
            ? Math.round((hourUsage / config.limits.requestsPerHour) * 100)
            : undefined,
          day: Math.round((dayUsage / config.limits.requestsPerDay) * 100),
        },
        isLimited: minuteUsage >= config.limits.requestsPerMinute,
        resetTimes: {
          minute: this.getResetTime('minute'),
          hour: this.getResetTime('hour'),
          day: this.getResetTime('day'),
        },
      });
    }

    return usage;
  }

  async getQuotaStatus(tenantId: string, plan: string = 'free'): Promise<QuotaStatus> {
    const planLimits = this.defaultLimits[plan as keyof typeof this.defaultLimits] || this.defaultLimits.free;

    const key = `tenant:${tenantId}`;
    const dayUsage = this.getUsage(key, this.getWindowKey('day'));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((endOfMonth.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    return {
      tenantId,
      plan,
      quotas: {
        requests: {
          used: dayUsage,
          limit: planLimits.day,
          percentage: Math.round((dayUsage / planLimits.day) * 100),
        },
        bandwidth: {
          used: 0, // Would be calculated from actual data
          limit: plan === 'free' ? 1024 * 1024 * 100 : 1024 * 1024 * 1024, // 100MB free, 1GB paid
          percentage: 0,
        },
        storage: {
          used: 0, // Would be calculated from actual data
          limit: plan === 'free' ? 1024 * 1024 * 500 : 1024 * 1024 * 1024 * 10, // 500MB free, 10GB paid
          percentage: 0,
        },
      },
      billingPeriod: {
        start: startOfMonth,
        end: endOfMonth,
        daysRemaining,
      },
    };
  }

  // =================== CONFIGURATION ===================

  async createConfig(config: Omit<RateLimitConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<RateLimitConfig> {
    const id = `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullConfig: RateLimitConfig = {
      ...config,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configs.set(id, fullConfig);
    this.recordEvent({
      type: 'config_changed',
      configId: id,
      targetType: config.type,
      targetId: config.targetId,
      details: { message: `Rate limit config created: ${config.name}` },
    });

    return fullConfig;
  }

  async updateConfig(id: string, updates: Partial<RateLimitConfig>): Promise<RateLimitConfig | null> {
    const config = this.configs.get(id);
    if (!config) return null;

    Object.assign(config, updates, { updatedAt: new Date() });
    this.configs.set(id, config);

    this.recordEvent({
      type: 'config_changed',
      configId: id,
      targetType: config.type,
      targetId: config.targetId,
      details: { message: `Rate limit config updated: ${config.name}` },
    });

    return config;
  }

  async deleteConfig(id: string): Promise<void> {
    this.configs.delete(id);
  }

  async getConfigs(type?: RateLimitConfig['type']): Promise<RateLimitConfig[]> {
    let configs = Array.from(this.configs.values());
    if (type) {
      configs = configs.filter(c => c.type === type);
    }
    return configs.sort((a, b) => b.priority - a.priority);
  }

  // =================== EVENTS ===================

  private recordEvent(params: Omit<RateLimitEvent, 'id' | 'timestamp'>): void {
    const event: RateLimitEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date(),
      ...params,
    };

    this.events.push(event);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    this.eventEmitter.emit('ratelimit.event', { event });
  }

  async getEvents(filters?: {
    type?: RateLimitEvent['type'];
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<RateLimitEvent[]> {
    let events = [...this.events];

    if (filters?.type) {
      events = events.filter(e => e.type === filters.type);
    }
    if (filters?.targetId) {
      events = events.filter(e => e.targetId === filters.targetId);
    }
    if (filters?.startDate) {
      events = events.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      events = events.filter(e => e.timestamp <= filters.endDate!);
    }

    events = events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  // =================== STATS ===================

  async getStats(): Promise<{
    totalConfigs: number;
    activeConfigs: number;
    totalLimitEvents: number;
    limitEventsToday: number;
    topLimitedEndpoints: Array<{ endpoint: string; count: number }>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const limitEvents = this.events.filter(e => e.type === 'limit_reached');
    const limitEventsToday = limitEvents.filter(e => e.timestamp >= today);

    // Count by endpoint
    const endpointCounts = new Map<string, number>();
    for (const event of limitEvents) {
      if (event.targetType === 'endpoint' && event.targetId) {
        endpointCounts.set(event.targetId, (endpointCounts.get(event.targetId) || 0) + 1);
      }
    }

    const topLimitedEndpoints = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalConfigs: this.configs.size,
      activeConfigs: Array.from(this.configs.values()).filter(c => c.isActive).length,
      totalLimitEvents: limitEvents.length,
      limitEventsToday: limitEventsToday.length,
      topLimitedEndpoints,
    };
  }

  // =================== CLEANUP ===================

  private cleanupOldWindows(): void {
    const cutoffMinute = new Date(Date.now() - 5 * 60 * 1000);
    const cutoffHour = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const cutoffDay = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    for (const [key, counters] of this.usageCounters) {
      for (const [windowKey] of counters) {
        // Parse window key and check if expired
        // Simple cleanup - just remove old entries based on key pattern
        if (windowKey.includes('-')) {
          const parts = windowKey.split('-');
          if (parts.length > 5) { // minute/second granularity
            counters.delete(windowKey);
          }
        }
      }
    }
  }
}
