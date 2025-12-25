import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

export type RateLimitStrategy = 'FIXED_WINDOW' | 'SLIDING_WINDOW' | 'TOKEN_BUCKET' | 'LEAKY_BUCKET';
export type RateLimitScope = 'GLOBAL' | 'USER' | 'TENANT' | 'ENDPOINT' | 'IP';
export type QuotaPeriod = 'MINUTE' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
export type ThrottleAction = 'DELAY' | 'REJECT' | 'QUEUE';

export interface RateLimitRule {
  id: string;
  name: string;
  nameRo: string;
  description?: string;
  descriptionRo?: string;
  scope: RateLimitScope;
  strategy: RateLimitStrategy;
  limit: number;
  windowMs: number;
  burstLimit?: number;
  throttleAction: ThrottleAction;
  endpoints?: string[];
  excludedEndpoints?: string[];
  priority: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitState {
  ruleId: string;
  key: string;
  requestCount: number;
  tokens?: number;
  windowStart: Date;
  lastRequest: Date;
  isBlocked: boolean;
  blockedUntil?: Date;
  violations: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfter?: number;
  rule: string;
  headers: RateLimitHeaders;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': number;
  'X-RateLimit-Remaining': number;
  'X-RateLimit-Reset': number;
  'Retry-After'?: number;
}

export interface QuotaConfig {
  id: string;
  name: string;
  nameRo: string;
  entityType: 'USER' | 'TENANT' | 'API_KEY';
  entityId: string;
  limits: QuotaLimit[];
  overageAllowed: boolean;
  overageRate?: number;
  isEnabled: boolean;
  createdAt: Date;
}

export interface QuotaLimit {
  endpoint: string;
  period: QuotaPeriod;
  limit: number;
  used: number;
  resetAt: Date;
}

export interface QuotaUsage {
  entityId: string;
  endpoint: string;
  period: QuotaPeriod;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetAt: Date;
  overageUsed?: number;
}

export interface RateLimitViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  key: string;
  entityType: RateLimitScope;
  entityId?: string;
  endpoint: string;
  requestCount: number;
  limit: number;
  action: ThrottleAction;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface RateLimitAnalytics {
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  throttledRequests: number;
  violationsCount: number;
  topViolators: { key: string; count: number }[];
  requestsByEndpoint: Record<string, number>;
  requestsByHour: Record<number, number>;
}

export interface TokenBucketState {
  tokens: number;
  lastRefill: Date;
  maxTokens: number;
  refillRate: number;
}

@Injectable()
export class RateLimitingService {
  private rules: Map<string, RateLimitRule> = new Map();
  private states: Map<string, RateLimitState> = new Map();
  private quotas: Map<string, QuotaConfig> = new Map();
  private violations: RateLimitViolation[] = [];
  private tokenBuckets: Map<string, TokenBucketState> = new Map();
  private analytics: Map<string, RateLimitAnalytics> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultRules();
    this.initializeAnalytics();
  }

  private initializeDefaultRules(): void {
    const defaultRules: Omit<RateLimitRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Global API Limit',
        nameRo: 'Limită Globală API',
        description: 'Default rate limit for all API requests',
        descriptionRo: 'Limită implicită pentru toate cererile API',
        scope: 'GLOBAL',
        strategy: 'SLIDING_WINDOW',
        limit: 1000,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 100,
        isEnabled: true,
      },
      {
        name: 'Per-User Limit',
        nameRo: 'Limită per Utilizator',
        description: 'Rate limit per authenticated user',
        descriptionRo: 'Limită per utilizator autentificat',
        scope: 'USER',
        strategy: 'TOKEN_BUCKET',
        limit: 100,
        windowMs: 60000,
        burstLimit: 20,
        throttleAction: 'DELAY',
        priority: 50,
        isEnabled: true,
      },
      {
        name: 'Per-Tenant Limit',
        nameRo: 'Limită per Tenant',
        description: 'Rate limit per tenant organization',
        descriptionRo: 'Limită per organizație tenant',
        scope: 'TENANT',
        strategy: 'FIXED_WINDOW',
        limit: 5000,
        windowMs: 60000,
        throttleAction: 'QUEUE',
        priority: 75,
        isEnabled: true,
      },
      {
        name: 'ANAF API Protection',
        nameRo: 'Protecție API ANAF',
        description: 'Strict limit for ANAF-related endpoints',
        descriptionRo: 'Limită strictă pentru endpoint-uri ANAF',
        scope: 'ENDPOINT',
        strategy: 'LEAKY_BUCKET',
        limit: 10,
        windowMs: 1000,
        endpoints: ['/api/anaf/*', '/api/efactura/*', '/api/saft/*'],
        throttleAction: 'DELAY',
        priority: 10,
        isEnabled: true,
      },
      {
        name: 'IP-based Protection',
        nameRo: 'Protecție bazată pe IP',
        description: 'Rate limit by IP address for DDoS protection',
        descriptionRo: 'Limită pe adresa IP pentru protecție DDoS',
        scope: 'IP',
        strategy: 'SLIDING_WINDOW',
        limit: 500,
        windowMs: 60000,
        burstLimit: 50,
        throttleAction: 'REJECT',
        priority: 5,
        isEnabled: true,
      },
    ];

    defaultRules.forEach((rule) => {
      const fullRule: RateLimitRule = {
        ...rule,
        id: `rule-${randomUUID()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.rules.set(fullRule.id, fullRule);
    });
  }

  private initializeAnalytics(): void {
    const today = new Date().toISOString().split('T')[0];
    this.analytics.set(today, {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      throttledRequests: 0,
      violationsCount: 0,
      topViolators: [],
      requestsByEndpoint: {},
      requestsByHour: {},
    });
  }

  // Rule Management
  createRule(data: Omit<RateLimitRule, 'id' | 'createdAt' | 'updatedAt'>): RateLimitRule {
    const rule: RateLimitRule = {
      ...data,
      id: `rule-${randomUUID()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(rule.id, rule);

    this.eventEmitter.emit('ratelimit.rule.created', { ruleId: rule.id });

    return rule;
  }

  getRule(ruleId: string): RateLimitRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): RateLimitRule[] {
    return Array.from(this.rules.values()).sort((a, b) => a.priority - b.priority);
  }

  updateRule(ruleId: string, updates: Partial<RateLimitRule>): RateLimitRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new HttpException(`Rule ${ruleId} not found`, HttpStatus.NOT_FOUND);
    }

    const updatedRule = {
      ...rule,
      ...updates,
      id: ruleId,
      updatedAt: new Date(),
    };

    this.rules.set(ruleId, updatedRule);

    this.eventEmitter.emit('ratelimit.rule.updated', { ruleId });

    return updatedRule;
  }

  deleteRule(ruleId: string): void {
    if (!this.rules.has(ruleId)) {
      throw new HttpException(`Rule ${ruleId} not found`, HttpStatus.NOT_FOUND);
    }

    this.rules.delete(ruleId);

    this.eventEmitter.emit('ratelimit.rule.deleted', { ruleId });
  }

  enableRule(ruleId: string): RateLimitRule {
    return this.updateRule(ruleId, { isEnabled: true });
  }

  disableRule(ruleId: string): RateLimitRule {
    return this.updateRule(ruleId, { isEnabled: false });
  }

  // Rate Limiting Core
  checkRateLimit(request: {
    endpoint: string;
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    apiKey?: string;
  }): RateLimitResult {
    const applicableRules = this.getApplicableRules(request.endpoint);
    let mostRestrictiveResult: RateLimitResult | null = null;

    for (const rule of applicableRules) {
      const key = this.generateKey(rule, request);
      const result = this.evaluateRule(rule, key);

      this.trackRequest(request.endpoint, result.allowed);

      if (!result.allowed) {
        this.recordViolation(rule, key, request);
        return result;
      }

      if (!mostRestrictiveResult || result.remaining < mostRestrictiveResult.remaining) {
        mostRestrictiveResult = result;
      }
    }

    return mostRestrictiveResult || this.createAllowedResult();
  }

  private getApplicableRules(endpoint: string): RateLimitRule[] {
    return Array.from(this.rules.values())
      .filter((rule) => {
        if (!rule.isEnabled) return false;

        if (rule.excludedEndpoints?.some((p) => this.matchEndpoint(endpoint, p))) {
          return false;
        }

        if (rule.endpoints && rule.endpoints.length > 0) {
          return rule.endpoints.some((p) => this.matchEndpoint(endpoint, p));
        }

        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }

  private matchEndpoint(endpoint: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(endpoint);
  }

  private generateKey(rule: RateLimitRule, request: {
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    apiKey?: string;
    endpoint: string;
  }): string {
    switch (rule.scope) {
      case 'GLOBAL':
        return `global:${rule.id}`;
      case 'USER':
        return `user:${request.userId || 'anonymous'}:${rule.id}`;
      case 'TENANT':
        return `tenant:${request.tenantId || 'default'}:${rule.id}`;
      case 'ENDPOINT':
        return `endpoint:${request.endpoint}:${rule.id}`;
      case 'IP':
        return `ip:${request.ipAddress || 'unknown'}:${rule.id}`;
      default:
        return `default:${rule.id}`;
    }
  }

  private evaluateRule(rule: RateLimitRule, key: string): RateLimitResult {
    switch (rule.strategy) {
      case 'FIXED_WINDOW':
        return this.evaluateFixedWindow(rule, key);
      case 'SLIDING_WINDOW':
        return this.evaluateSlidingWindow(rule, key);
      case 'TOKEN_BUCKET':
        return this.evaluateTokenBucket(rule, key);
      case 'LEAKY_BUCKET':
        return this.evaluateLeakyBucket(rule, key);
      default:
        return this.createAllowedResult();
    }
  }

  private evaluateFixedWindow(rule: RateLimitRule, key: string): RateLimitResult {
    const now = new Date();
    let state = this.states.get(key);

    if (!state || now.getTime() - state.windowStart.getTime() >= rule.windowMs) {
      state = {
        ruleId: rule.id,
        key,
        requestCount: 0,
        windowStart: now,
        lastRequest: now,
        isBlocked: false,
        violations: 0,
      };
    }

    state.requestCount++;
    state.lastRequest = now;
    this.states.set(key, state);

    const remaining = Math.max(0, rule.limit - state.requestCount);
    const resetAt = new Date(state.windowStart.getTime() + rule.windowMs);

    if (state.requestCount > rule.limit) {
      return this.createDeniedResult(rule, remaining, resetAt);
    }

    return this.createAllowedResultWithDetails(rule, remaining, resetAt);
  }

  private evaluateSlidingWindow(rule: RateLimitRule, key: string): RateLimitResult {
    const now = new Date();
    let state = this.states.get(key);

    if (!state) {
      state = {
        ruleId: rule.id,
        key,
        requestCount: 1,
        windowStart: now,
        lastRequest: now,
        isBlocked: false,
        violations: 0,
      };
      this.states.set(key, state);
      return this.createAllowedResultWithDetails(rule, rule.limit - 1, new Date(now.getTime() + rule.windowMs));
    }

    const elapsed = now.getTime() - state.windowStart.getTime();
    const windowRatio = Math.min(1, elapsed / rule.windowMs);

    state.requestCount = Math.max(0, Math.floor(state.requestCount * (1 - windowRatio))) + 1;
    state.windowStart = now;
    state.lastRequest = now;
    this.states.set(key, state);

    const remaining = Math.max(0, rule.limit - state.requestCount);
    const resetAt = new Date(now.getTime() + rule.windowMs);

    if (state.requestCount > rule.limit) {
      return this.createDeniedResult(rule, remaining, resetAt);
    }

    return this.createAllowedResultWithDetails(rule, remaining, resetAt);
  }

  private evaluateTokenBucket(rule: RateLimitRule, key: string): RateLimitResult {
    const now = new Date();
    let bucket = this.tokenBuckets.get(key);

    const maxTokens = rule.burstLimit || rule.limit;
    const refillRate = rule.limit / (rule.windowMs / 1000);

    if (!bucket) {
      bucket = {
        tokens: maxTokens - 1,
        lastRefill: now,
        maxTokens,
        refillRate,
      };
      this.tokenBuckets.set(key, bucket);
      return this.createAllowedResultWithDetails(rule, bucket.tokens, new Date(now.getTime() + 1000));
    }

    const elapsed = (now.getTime() - bucket.lastRefill.getTime()) / 1000;
    const tokensToAdd = elapsed * refillRate;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const waitTime = (1 - bucket.tokens) / refillRate * 1000;
      return this.createDeniedResult(rule, 0, new Date(now.getTime() + waitTime));
    }

    bucket.tokens--;
    this.tokenBuckets.set(key, bucket);

    return this.createAllowedResultWithDetails(
      rule,
      Math.floor(bucket.tokens),
      new Date(now.getTime() + (1 / refillRate) * 1000),
    );
  }

  private evaluateLeakyBucket(rule: RateLimitRule, key: string): RateLimitResult {
    const now = new Date();
    let state = this.states.get(key);

    const leakRate = rule.limit / (rule.windowMs / 1000);

    if (!state) {
      state = {
        ruleId: rule.id,
        key,
        requestCount: 1,
        windowStart: now,
        lastRequest: now,
        isBlocked: false,
        violations: 0,
      };
      this.states.set(key, state);
      return this.createAllowedResultWithDetails(rule, rule.limit - 1, new Date(now.getTime() + rule.windowMs));
    }

    const elapsed = (now.getTime() - state.lastRequest.getTime()) / 1000;
    const leaked = elapsed * leakRate;
    state.requestCount = Math.max(0, state.requestCount - leaked) + 1;
    state.lastRequest = now;
    this.states.set(key, state);

    const remaining = Math.max(0, rule.limit - Math.ceil(state.requestCount));
    const resetAt = new Date(now.getTime() + (state.requestCount / leakRate) * 1000);

    if (state.requestCount > rule.limit) {
      return this.createDeniedResult(rule, remaining, resetAt);
    }

    return this.createAllowedResultWithDetails(rule, remaining, resetAt);
  }

  private createAllowedResult(): RateLimitResult {
    const resetAt = new Date(Date.now() + 60000);
    return {
      allowed: true,
      remaining: 999,
      limit: 1000,
      resetAt,
      rule: 'default',
      headers: {
        'X-RateLimit-Limit': 1000,
        'X-RateLimit-Remaining': 999,
        'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000),
      },
    };
  }

  private createAllowedResultWithDetails(rule: RateLimitRule, remaining: number, resetAt: Date): RateLimitResult {
    return {
      allowed: true,
      remaining,
      limit: rule.limit,
      resetAt,
      rule: rule.name,
      headers: {
        'X-RateLimit-Limit': rule.limit,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000),
      },
    };
  }

  private createDeniedResult(rule: RateLimitRule, remaining: number, resetAt: Date): RateLimitResult {
    const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
    return {
      allowed: false,
      remaining,
      limit: rule.limit,
      resetAt,
      retryAfter,
      rule: rule.name,
      headers: {
        'X-RateLimit-Limit': rule.limit,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000),
        'Retry-After': retryAfter,
      },
    };
  }

  private recordViolation(rule: RateLimitRule, key: string, request: {
    endpoint: string;
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
  }): void {
    const state = this.states.get(key);
    if (state) {
      state.violations++;
      this.states.set(key, state);
    }

    const violation: RateLimitViolation = {
      id: `violation-${randomUUID()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      key,
      entityType: rule.scope,
      entityId: request.userId || request.tenantId,
      endpoint: request.endpoint,
      requestCount: state?.requestCount || 0,
      limit: rule.limit,
      action: rule.throttleAction,
      timestamp: new Date(),
      ipAddress: request.ipAddress,
    };

    this.violations.push(violation);

    if (this.violations.length > 10000) {
      this.violations = this.violations.slice(-5000);
    }

    this.eventEmitter.emit('ratelimit.violation', violation);
  }

  private trackRequest(endpoint: string, allowed: boolean): void {
    const today = new Date().toISOString().split('T')[0];
    let analytics = this.analytics.get(today);

    if (!analytics) {
      analytics = {
        totalRequests: 0,
        allowedRequests: 0,
        deniedRequests: 0,
        throttledRequests: 0,
        violationsCount: 0,
        topViolators: [],
        requestsByEndpoint: {},
        requestsByHour: {},
      };
      this.analytics.set(today, analytics);
    }

    analytics.totalRequests++;
    if (allowed) {
      analytics.allowedRequests++;
    } else {
      analytics.deniedRequests++;
    }

    analytics.requestsByEndpoint[endpoint] = (analytics.requestsByEndpoint[endpoint] || 0) + 1;

    const hour = new Date().getHours();
    analytics.requestsByHour[hour] = (analytics.requestsByHour[hour] || 0) + 1;
  }

  // Quota Management
  createQuota(data: Omit<QuotaConfig, 'id' | 'createdAt'>): QuotaConfig {
    const quota: QuotaConfig = {
      ...data,
      id: `quota-${randomUUID()}`,
      createdAt: new Date(),
    };

    this.quotas.set(quota.id, quota);

    this.eventEmitter.emit('ratelimit.quota.created', { quotaId: quota.id });

    return quota;
  }

  getQuota(quotaId: string): QuotaConfig | undefined {
    return this.quotas.get(quotaId);
  }

  getQuotaByEntity(entityType: 'USER' | 'TENANT' | 'API_KEY', entityId: string): QuotaConfig | undefined {
    return Array.from(this.quotas.values()).find(
      (q) => q.entityType === entityType && q.entityId === entityId,
    );
  }

  checkQuota(entityType: 'USER' | 'TENANT' | 'API_KEY', entityId: string, endpoint: string): QuotaUsage | null {
    const quota = this.getQuotaByEntity(entityType, entityId);
    if (!quota || !quota.isEnabled) return null;

    const limit = quota.limits.find((l) => this.matchEndpoint(endpoint, l.endpoint));
    if (!limit) return null;

    const now = new Date();
    if (now >= limit.resetAt) {
      this.resetQuotaLimit(quota.id, limit.endpoint);
    }

    return {
      entityId,
      endpoint: limit.endpoint,
      period: limit.period,
      used: limit.used,
      limit: limit.limit,
      remaining: Math.max(0, limit.limit - limit.used),
      percentUsed: (limit.used / limit.limit) * 100,
      resetAt: limit.resetAt,
    };
  }

  incrementQuota(entityType: 'USER' | 'TENANT' | 'API_KEY', entityId: string, endpoint: string): boolean {
    const quota = this.getQuotaByEntity(entityType, entityId);
    if (!quota) return true;

    const limit = quota.limits.find((l) => this.matchEndpoint(endpoint, l.endpoint));
    if (!limit) return true;

    if (limit.used >= limit.limit) {
      if (quota.overageAllowed) {
        limit.used++;
        return true;
      }
      return false;
    }

    limit.used++;
    return true;
  }

  private resetQuotaLimit(quotaId: string, endpoint: string): void {
    const quota = this.quotas.get(quotaId);
    if (!quota) return;

    const limit = quota.limits.find((l) => l.endpoint === endpoint);
    if (!limit) return;

    limit.used = 0;
    limit.resetAt = this.calculateNextReset(limit.period);
  }

  private calculateNextReset(period: QuotaPeriod): Date {
    const now = new Date();
    switch (period) {
      case 'MINUTE':
        return new Date(now.getTime() + 60000);
      case 'HOUR':
        return new Date(now.getTime() + 3600000);
      case 'DAY':
        return new Date(now.setHours(24, 0, 0, 0));
      case 'WEEK':
        return new Date(now.getTime() + 7 * 86400000);
      case 'MONTH':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  // Blocking & Unblocking
  blockKey(key: string, durationMs: number, reason?: string): void {
    let state = this.states.get(key);

    if (!state) {
      state = {
        ruleId: '',
        key,
        requestCount: 0,
        windowStart: new Date(),
        lastRequest: new Date(),
        isBlocked: true,
        blockedUntil: new Date(Date.now() + durationMs),
        violations: 0,
      };
    } else {
      state.isBlocked = true;
      state.blockedUntil = new Date(Date.now() + durationMs);
    }

    this.states.set(key, state);

    this.eventEmitter.emit('ratelimit.key.blocked', { key, durationMs, reason });
  }

  unblockKey(key: string): void {
    const state = this.states.get(key);
    if (state) {
      state.isBlocked = false;
      state.blockedUntil = undefined;
      this.states.set(key, state);
    }

    this.eventEmitter.emit('ratelimit.key.unblocked', { key });
  }

  isBlocked(key: string): boolean {
    const state = this.states.get(key);
    if (!state?.isBlocked) return false;
    if (state.blockedUntil && state.blockedUntil <= new Date()) {
      state.isBlocked = false;
      state.blockedUntil = undefined;
      return false;
    }
    return true;
  }

  // Analytics & Monitoring
  getAnalytics(date?: string): RateLimitAnalytics {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.analytics.get(targetDate) || {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      throttledRequests: 0,
      violationsCount: 0,
      topViolators: [],
      requestsByEndpoint: {},
      requestsByHour: {},
    };
  }

  getViolations(filters?: {
    ruleId?: string;
    entityType?: RateLimitScope;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): RateLimitViolation[] {
    let violations = [...this.violations];

    if (filters?.ruleId) {
      violations = violations.filter((v) => v.ruleId === filters.ruleId);
    }
    if (filters?.entityType) {
      violations = violations.filter((v) => v.entityType === filters.entityType);
    }
    if (filters?.fromDate) {
      violations = violations.filter((v) => v.timestamp >= filters.fromDate!);
    }
    if (filters?.toDate) {
      violations = violations.filter((v) => v.timestamp <= filters.toDate!);
    }

    violations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      violations = violations.slice(0, filters.limit);
    }

    return violations;
  }

  getTopViolators(limit = 10): { key: string; count: number }[] {
    const counts = new Map<string, number>();

    this.violations.forEach((v) => {
      counts.set(v.key, (counts.get(v.key) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getState(key: string): RateLimitState | undefined {
    return this.states.get(key);
  }

  clearState(key: string): void {
    this.states.delete(key);
    this.tokenBuckets.delete(key);
  }

  clearAllStates(): void {
    this.states.clear();
    this.tokenBuckets.clear();
  }

  // Statistics
  getStats(): {
    rulesCount: number;
    activeRulesCount: number;
    quotasCount: number;
    violationsCount: number;
    blockedKeysCount: number;
    strategiesInUse: Record<RateLimitStrategy, number>;
  } {
    const rules = Array.from(this.rules.values());
    const states = Array.from(this.states.values());

    const strategiesInUse: Record<RateLimitStrategy, number> = {
      FIXED_WINDOW: 0,
      SLIDING_WINDOW: 0,
      TOKEN_BUCKET: 0,
      LEAKY_BUCKET: 0,
    };

    rules.forEach((r) => strategiesInUse[r.strategy]++);

    return {
      rulesCount: rules.length,
      activeRulesCount: rules.filter((r) => r.isEnabled).length,
      quotasCount: this.quotas.size,
      violationsCount: this.violations.length,
      blockedKeysCount: states.filter((s) => s.isBlocked).length,
      strategiesInUse,
    };
  }
}
