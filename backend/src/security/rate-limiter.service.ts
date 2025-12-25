import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
export type RateLimitStrategy = 'token_bucket' | 'sliding_window' | 'fixed_window';
export type RateLimitScope = 'global' | 'tenant' | 'user' | 'ip' | 'api_key' | 'endpoint';
export type RateLimitTier = 'free' | 'basic' | 'pro' | 'enterprise' | 'unlimited';

// Interfaces
export interface RateLimitConfig {
  id: string;
  name: string;
  scope: RateLimitScope;
  strategy: RateLimitStrategy;
  requests: number;
  windowMs: number;
  burstLimit?: number;
  tier: RateLimitTier;
  endpoints?: string[];
  skipPaths?: string[];
  penaltyMs?: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfter?: number;
  tier: RateLimitTier;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Policy': string;
  'Retry-After'?: string;
}

export interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

export interface SlidingWindowCounter {
  counts: { timestamp: number; count: number }[];
  windowMs: number;
}

export interface FixedWindowCounter {
  count: number;
  windowStart: number;
  windowMs: number;
}

export interface QuotaUsage {
  identifier: string;
  scope: RateLimitScope;
  tier: RateLimitTier;
  used: number;
  limit: number;
  resetAt: Date;
  period: 'minute' | 'hour' | 'day' | 'month';
}

export interface RateLimitStats {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  blockRate: number;
  topBlockedIdentifiers: { identifier: string; count: number }[];
  averageRemaining: number;
}

export interface BlockedRequest {
  identifier: string;
  scope: RateLimitScope;
  endpoint: string;
  blockedAt: Date;
  retryAfter: number;
  reason: string;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  // Storage
  private configs: Map<string, RateLimitConfig> = new Map();
  private tokenBuckets: Map<string, TokenBucket> = new Map();
  private slidingWindows: Map<string, SlidingWindowCounter> = new Map();
  private fixedWindows: Map<string, FixedWindowCounter> = new Map();
  private quotas: Map<string, QuotaUsage> = new Map();
  private blockedRequests: BlockedRequest[] = [];
  private tierLimits: Map<RateLimitTier, { requests: number; windowMs: number }> = new Map();

  // Counters
  private configIdCounter = 0;
  private totalRequests = 0;
  private allowedRequests = 0;
  private blockedRequestsCount = 0;

  constructor(private configService: ConfigService) {
    this.initializeTierLimits();
    this.initializeDefaultConfigs();
  }

  private generateId(prefix: string): string {
    return `${prefix}-${++this.configIdCounter}-${Date.now()}`;
  }

  // =================== INITIALIZATION ===================

  private initializeTierLimits(): void {
    this.tierLimits.set('free', { requests: 100, windowMs: 60000 }); // 100/min
    this.tierLimits.set('basic', { requests: 500, windowMs: 60000 }); // 500/min
    this.tierLimits.set('pro', { requests: 2000, windowMs: 60000 }); // 2000/min
    this.tierLimits.set('enterprise', { requests: 10000, windowMs: 60000 }); // 10000/min
    this.tierLimits.set('unlimited', { requests: Number.MAX_SAFE_INTEGER, windowMs: 60000 });
  }

  private initializeDefaultConfigs(): void {
    // Global rate limit
    const globalConfig: RateLimitConfig = {
      id: 'rl-global',
      name: 'Global Rate Limit',
      scope: 'global',
      strategy: 'sliding_window',
      requests: 10000,
      windowMs: 60000,
      tier: 'enterprise',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Per-IP rate limit
    const ipConfig: RateLimitConfig = {
      id: 'rl-ip',
      name: 'Per-IP Rate Limit',
      scope: 'ip',
      strategy: 'sliding_window',
      requests: 100,
      windowMs: 60000,
      burstLimit: 20,
      tier: 'free',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Per-user rate limit
    const userConfig: RateLimitConfig = {
      id: 'rl-user',
      name: 'Per-User Rate Limit',
      scope: 'user',
      strategy: 'token_bucket',
      requests: 500,
      windowMs: 60000,
      burstLimit: 50,
      tier: 'basic',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Per-tenant rate limit
    const tenantConfig: RateLimitConfig = {
      id: 'rl-tenant',
      name: 'Per-Tenant Rate Limit',
      scope: 'tenant',
      strategy: 'sliding_window',
      requests: 5000,
      windowMs: 60000,
      tier: 'pro',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Auth endpoints (stricter)
    const authConfig: RateLimitConfig = {
      id: 'rl-auth',
      name: 'Auth Endpoints Rate Limit',
      scope: 'ip',
      strategy: 'fixed_window',
      requests: 10,
      windowMs: 60000,
      penaltyMs: 300000, // 5 min penalty for exceeding
      tier: 'free',
      endpoints: ['/auth/login', '/auth/register', '/auth/reset-password'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // API key rate limit
    const apiKeyConfig: RateLimitConfig = {
      id: 'rl-api-key',
      name: 'API Key Rate Limit',
      scope: 'api_key',
      strategy: 'token_bucket',
      requests: 1000,
      windowMs: 60000,
      burstLimit: 100,
      tier: 'pro',
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configs.set(globalConfig.id, globalConfig);
    this.configs.set(ipConfig.id, ipConfig);
    this.configs.set(userConfig.id, userConfig);
    this.configs.set(tenantConfig.id, tenantConfig);
    this.configs.set(authConfig.id, authConfig);
    this.configs.set(apiKeyConfig.id, apiKeyConfig);

    this.logger.log(`Initialized ${this.configs.size} rate limit configurations`);
  }

  // =================== RATE LIMIT CHECK ===================

  async checkRateLimit(
    identifier: string,
    scope: RateLimitScope,
    tier?: RateLimitTier,
    endpoint?: string,
  ): Promise<RateLimitResult> {
    this.totalRequests++;

    // Find applicable config
    const config = this.findApplicableConfig(scope, endpoint);
    if (!config || !config.enabled) {
      this.allowedRequests++;
      return {
        allowed: true,
        remaining: Number.MAX_SAFE_INTEGER,
        limit: Number.MAX_SAFE_INTEGER,
        resetAt: new Date(Date.now() + 60000),
        tier: tier || 'unlimited',
      };
    }

    // Apply tier limits if specified
    const effectiveTier = tier || config.tier;
    const tierConfig = this.tierLimits.get(effectiveTier);
    const effectiveLimit = tierConfig ? Math.min(config.requests, tierConfig.requests) : config.requests;

    // Check rate limit based on strategy
    let result: RateLimitResult;
    const key = `${scope}:${identifier}`;

    switch (config.strategy) {
      case 'token_bucket':
        result = this.checkTokenBucket(key, effectiveLimit, config.windowMs, config.burstLimit, effectiveTier);
        break;
      case 'sliding_window':
        result = this.checkSlidingWindow(key, effectiveLimit, config.windowMs, effectiveTier);
        break;
      case 'fixed_window':
        result = this.checkFixedWindow(key, effectiveLimit, config.windowMs, effectiveTier);
        break;
      default:
        result = this.checkSlidingWindow(key, effectiveLimit, config.windowMs, effectiveTier);
    }

    if (result.allowed) {
      this.allowedRequests++;
    } else {
      this.blockedRequestsCount++;
      this.recordBlockedRequest(identifier, scope, endpoint || '', result.retryAfter || 0, 'Rate limit exceeded');

      // Apply penalty if configured
      if (config.penaltyMs) {
        result.retryAfter = config.penaltyMs / 1000;
        result.resetAt = new Date(Date.now() + config.penaltyMs);
      }
    }

    return result;
  }

  private findApplicableConfig(scope: RateLimitScope, endpoint?: string): RateLimitConfig | null {
    // First check endpoint-specific configs
    if (endpoint) {
      for (const config of this.configs.values()) {
        if (config.endpoints?.some(e => endpoint.startsWith(e))) {
          return config;
        }
      }
    }

    // Then check by scope
    for (const config of this.configs.values()) {
      if (config.scope === scope && (!config.endpoints || config.endpoints.length === 0)) {
        return config;
      }
    }

    return null;
  }

  // =================== TOKEN BUCKET ===================

  private checkTokenBucket(
    key: string,
    capacity: number,
    refillMs: number,
    burstLimit?: number,
    tier?: RateLimitTier,
  ): RateLimitResult {
    const now = Date.now();
    const refillRate = capacity / (refillMs / 1000); // tokens per second

    let bucket = this.tokenBuckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now,
        capacity: burstLimit || capacity,
        refillRate,
      };
    } else {
      // Refill tokens
      const elapsed = (now - bucket.lastRefill) / 1000;
      const tokensToAdd = elapsed * bucket.refillRate;
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.tokenBuckets.set(key, bucket);

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        limit: capacity,
        resetAt: new Date(now + refillMs),
        tier: tier || 'basic',
      };
    }

    this.tokenBuckets.set(key, bucket);
    const timeToRefill = (1 - bucket.tokens) / bucket.refillRate;

    return {
      allowed: false,
      remaining: 0,
      limit: capacity,
      resetAt: new Date(now + timeToRefill * 1000),
      retryAfter: Math.ceil(timeToRefill),
      tier: tier || 'basic',
    };
  }

  // =================== SLIDING WINDOW ===================

  private checkSlidingWindow(
    key: string,
    limit: number,
    windowMs: number,
    tier?: RateLimitTier,
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    let counter = this.slidingWindows.get(key);

    if (!counter) {
      counter = { counts: [], windowMs };
    }

    // Remove expired entries
    counter.counts = counter.counts.filter(c => c.timestamp > windowStart);

    // Count requests in window
    const currentCount = counter.counts.reduce((sum, c) => sum + c.count, 0);

    if (currentCount < limit) {
      counter.counts.push({ timestamp: now, count: 1 });
      this.slidingWindows.set(key, counter);

      return {
        allowed: true,
        remaining: limit - currentCount - 1,
        limit,
        resetAt: new Date(now + windowMs),
        tier: tier || 'basic',
      };
    }

    this.slidingWindows.set(key, counter);
    const oldestTimestamp = counter.counts.length > 0 ? counter.counts[0].timestamp : now;
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: new Date(oldestTimestamp + windowMs),
      retryAfter: Math.max(1, retryAfter),
      tier: tier || 'basic',
    };
  }

  // =================== FIXED WINDOW ===================

  private checkFixedWindow(
    key: string,
    limit: number,
    windowMs: number,
    tier?: RateLimitTier,
  ): RateLimitResult {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;

    let counter = this.fixedWindows.get(key);

    if (!counter || counter.windowStart !== windowStart) {
      counter = { count: 0, windowStart, windowMs };
    }

    if (counter.count < limit) {
      counter.count++;
      this.fixedWindows.set(key, counter);

      return {
        allowed: true,
        remaining: limit - counter.count,
        limit,
        resetAt: new Date(windowStart + windowMs),
        tier: tier || 'basic',
      };
    }

    const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt: new Date(windowStart + windowMs),
      retryAfter: Math.max(1, retryAfter),
      tier: tier || 'basic',
    };
  }

  // =================== RATE LIMIT HEADERS ===================

  generateHeaders(result: RateLimitResult): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
      'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
      'X-RateLimit-Policy': `${result.limit};w=${60}`,
    };

    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = String(result.retryAfter);
    }

    return headers;
  }

  // =================== QUOTA MANAGEMENT ===================

  async checkQuota(
    identifier: string,
    scope: RateLimitScope,
    tier: RateLimitTier,
    period: 'minute' | 'hour' | 'day' | 'month' = 'day',
  ): Promise<QuotaUsage> {
    const key = `quota:${scope}:${identifier}:${period}`;
    const tierLimits = this.getTierQuotaLimits(tier, period);

    let quota = this.quotas.get(key);
    const now = new Date();

    if (!quota || quota.resetAt < now) {
      quota = {
        identifier,
        scope,
        tier,
        used: 0,
        limit: tierLimits,
        resetAt: this.getNextResetTime(period),
        period,
      };
    }

    return quota;
  }

  async incrementQuota(
    identifier: string,
    scope: RateLimitScope,
    tier: RateLimitTier,
    period: 'minute' | 'hour' | 'day' | 'month' = 'day',
    amount = 1,
  ): Promise<QuotaUsage> {
    const quota = await this.checkQuota(identifier, scope, tier, period);
    quota.used += amount;
    this.quotas.set(`quota:${scope}:${identifier}:${period}`, quota);
    return quota;
  }

  private getTierQuotaLimits(tier: RateLimitTier, period: string): number {
    const baseLimits: Record<RateLimitTier, Record<string, number>> = {
      free: { minute: 60, hour: 1000, day: 5000, month: 50000 },
      basic: { minute: 300, hour: 5000, day: 50000, month: 500000 },
      pro: { minute: 1000, hour: 20000, day: 200000, month: 2000000 },
      enterprise: { minute: 5000, hour: 100000, day: 1000000, month: 10000000 },
      unlimited: { minute: Number.MAX_SAFE_INTEGER, hour: Number.MAX_SAFE_INTEGER, day: Number.MAX_SAFE_INTEGER, month: Number.MAX_SAFE_INTEGER },
    };

    return baseLimits[tier]?.[period] || baseLimits.free[period];
  }

  private getNextResetTime(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'minute':
        return new Date(now.getTime() + 60000);
      case 'hour':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return new Date(now.getTime() + 86400000);
    }
  }

  // =================== CONFIGURATION ===================

  async createConfig(
    name: string,
    scope: RateLimitScope,
    strategy: RateLimitStrategy,
    requests: number,
    windowMs: number,
    options?: {
      burstLimit?: number;
      tier?: RateLimitTier;
      endpoints?: string[];
      skipPaths?: string[];
      penaltyMs?: number;
    },
  ): Promise<RateLimitConfig> {
    const config: RateLimitConfig = {
      id: this.generateId('rl'),
      name,
      scope,
      strategy,
      requests,
      windowMs,
      burstLimit: options?.burstLimit,
      tier: options?.tier || 'basic',
      endpoints: options?.endpoints,
      skipPaths: options?.skipPaths,
      penaltyMs: options?.penaltyMs,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configs.set(config.id, config);
    this.logger.log(`Created rate limit config: ${name} (${config.id})`);
    return config;
  }

  async getConfig(configId: string): Promise<RateLimitConfig | null> {
    return this.configs.get(configId) || null;
  }

  async getConfigs(scope?: RateLimitScope): Promise<RateLimitConfig[]> {
    let configs = Array.from(this.configs.values());

    if (scope) {
      configs = configs.filter(c => c.scope === scope);
    }

    return configs.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateConfig(
    configId: string,
    updates: Partial<Omit<RateLimitConfig, 'id' | 'createdAt'>>,
  ): Promise<RateLimitConfig | null> {
    const config = this.configs.get(configId);
    if (!config) return null;

    const updated: RateLimitConfig = {
      ...config,
      ...updates,
      updatedAt: new Date(),
    };

    this.configs.set(configId, updated);
    return updated;
  }

  async deleteConfig(configId: string): Promise<boolean> {
    return this.configs.delete(configId);
  }

  async enableConfig(configId: string): Promise<RateLimitConfig | null> {
    return this.updateConfig(configId, { enabled: true });
  }

  async disableConfig(configId: string): Promise<RateLimitConfig | null> {
    return this.updateConfig(configId, { enabled: false });
  }

  // =================== BLOCKED REQUESTS ===================

  private recordBlockedRequest(
    identifier: string,
    scope: RateLimitScope,
    endpoint: string,
    retryAfter: number,
    reason: string,
  ): void {
    const blocked: BlockedRequest = {
      identifier,
      scope,
      endpoint,
      blockedAt: new Date(),
      retryAfter,
      reason,
    };

    this.blockedRequests.push(blocked);

    // Keep only last 1000 blocked requests
    if (this.blockedRequests.length > 1000) {
      this.blockedRequests = this.blockedRequests.slice(-1000);
    }
  }

  async getBlockedRequests(
    since?: Date,
    scope?: RateLimitScope,
    limit = 100,
  ): Promise<BlockedRequest[]> {
    let requests = this.blockedRequests;

    if (since) {
      requests = requests.filter(r => r.blockedAt >= since);
    }
    if (scope) {
      requests = requests.filter(r => r.scope === scope);
    }

    return requests.slice(-limit).reverse();
  }

  // =================== STATISTICS ===================

  async getStats(): Promise<RateLimitStats> {
    const blockCounts = new Map<string, number>();

    for (const request of this.blockedRequests) {
      const count = blockCounts.get(request.identifier) || 0;
      blockCounts.set(request.identifier, count + 1);
    }

    const topBlocked = Array.from(blockCounts.entries())
      .map(([identifier, count]) => ({ identifier, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      blockedRequests: this.blockedRequestsCount,
      blockRate: this.totalRequests > 0 ? (this.blockedRequestsCount / this.totalRequests) * 100 : 0,
      topBlockedIdentifiers: topBlocked,
      averageRemaining: 0, // Would require more complex tracking
    };
  }

  async resetStats(): Promise<void> {
    this.totalRequests = 0;
    this.allowedRequests = 0;
    this.blockedRequestsCount = 0;
    this.blockedRequests = [];
    this.logger.log('Rate limit stats reset');
  }

  // =================== CACHE MANAGEMENT ===================

  async clearCache(scope?: RateLimitScope): Promise<void> {
    if (scope) {
      const prefix = `${scope}:`;
      for (const key of this.tokenBuckets.keys()) {
        if (key.startsWith(prefix)) this.tokenBuckets.delete(key);
      }
      for (const key of this.slidingWindows.keys()) {
        if (key.startsWith(prefix)) this.slidingWindows.delete(key);
      }
      for (const key of this.fixedWindows.keys()) {
        if (key.startsWith(prefix)) this.fixedWindows.delete(key);
      }
    } else {
      this.tokenBuckets.clear();
      this.slidingWindows.clear();
      this.fixedWindows.clear();
    }
    this.logger.log(`Rate limit cache cleared${scope ? ` for scope: ${scope}` : ''}`);
  }

  // =================== METADATA ===================

  getStrategies(): RateLimitStrategy[] {
    return ['token_bucket', 'sliding_window', 'fixed_window'];
  }

  getScopes(): RateLimitScope[] {
    return ['global', 'tenant', 'user', 'ip', 'api_key', 'endpoint'];
  }

  getTiers(): RateLimitTier[] {
    return ['free', 'basic', 'pro', 'enterprise', 'unlimited'];
  }

  getTierLimits(): Map<RateLimitTier, { requests: number; windowMs: number }> {
    return new Map(this.tierLimits);
  }
}
