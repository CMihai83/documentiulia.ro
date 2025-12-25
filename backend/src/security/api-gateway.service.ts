import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Types
export type RateLimitStrategy = 'fixed_window' | 'sliding_window' | 'token_bucket' | 'leaky_bucket';
export type ApiKeyStatus = 'active' | 'suspended' | 'revoked' | 'expired';
export type QuotaPeriod = 'minute' | 'hour' | 'day' | 'week' | 'month';
export type IpFilterAction = 'allow' | 'block';

// Interfaces
export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  limit: number;
  windowMs: number;
  burstLimit?: number;
  penaltyMs?: number;
}

export interface RateLimitRule {
  id: string;
  name: string;
  description: string;
  endpoint?: string;
  method?: string;
  config: RateLimitConfig;
  priority: number;
  enabled: boolean;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  tenantId: string;
  createdBy: string;
  status: ApiKeyStatus;
  scopes: string[];
  rateLimitOverride?: RateLimitConfig;
  quotaLimit?: number;
  quotaPeriod?: QuotaPeriod;
  allowedIps?: string[];
  allowedOrigins?: string[];
  metadata: Record<string, any>;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyUsage {
  keyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
}

export interface Quota {
  keyId: string;
  period: QuotaPeriod;
  limit: number;
  used: number;
  resetAt: Date;
}

export interface IpFilter {
  id: string;
  tenantId: string;
  ipAddress: string;
  action: IpFilterAction;
  reason?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
  limit: number;
}

export interface RequestContext {
  apiKey?: string;
  tenantId?: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  headers: Record<string, string>;
}

export interface TransformRule {
  id: string;
  name: string;
  type: 'request' | 'response';
  endpoint: string;
  method?: string;
  transformations: Transformation[];
  priority: number;
  enabled: boolean;
}

export interface Transformation {
  action: 'add_header' | 'remove_header' | 'modify_header' | 'add_body_field' | 'remove_body_field' | 'modify_body_field';
  target: string;
  value?: string;
  condition?: string;
}

export interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsByEndpoint: { endpoint: string; count: number }[];
  requestsByStatusCode: { code: number; count: number }[];
  requestsByApiKey: { keyId: string; keyName: string; count: number }[];
  rateLimitHits: number;
  quotaExceeded: number;
  blockedRequests: number;
  peakRequestsPerMinute: number;
  period: { start: Date; end: Date };
}

export interface GatewayHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeApiKeys: number;
  activeRateLimitRules: number;
  requestsLastMinute: number;
  errorRate: number;
  averageLatency: number;
  uptime: number;
  timestamp: Date;
}

@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);

  // In-memory storage
  private apiKeys: Map<string, ApiKey> = new Map();
  private rateLimitRules: Map<string, RateLimitRule> = new Map();
  private ipFilters: Map<string, IpFilter> = new Map();
  private transformRules: Map<string, TransformRule> = new Map();
  private quotas: Map<string, Quota> = new Map();
  private usageLog: ApiKeyUsage[] = [];
  private rateLimitCounters: Map<string, { count: number; windowStart: number; tokens?: number }> = new Map();

  // ID counters
  private apiKeyIdCounter = 0;
  private ruleIdCounter = 0;
  private filterIdCounter = 0;
  private transformIdCounter = 0;

  // Service start time for uptime calculation
  private readonly startTime = Date.now();

  constructor(private configService: ConfigService) {
    this.initializeDefaultRules();
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'dk_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  private initializeDefaultRules(): void {
    // Default global rate limit rule
    const defaultRule: RateLimitRule = {
      id: 'rule-default',
      name: 'Global Rate Limit',
      description: 'Default rate limit for all endpoints',
      config: {
        strategy: 'sliding_window',
        limit: 100,
        windowMs: 60000, // 1 minute
        burstLimit: 150,
      },
      priority: 0,
      enabled: true,
      createdAt: new Date(),
    };

    // Strict rate limit for auth endpoints
    const authRule: RateLimitRule = {
      id: 'rule-auth',
      name: 'Auth Rate Limit',
      description: 'Stricter rate limit for authentication endpoints',
      endpoint: '/auth/*',
      config: {
        strategy: 'fixed_window',
        limit: 10,
        windowMs: 60000,
        penaltyMs: 30000,
      },
      priority: 10,
      enabled: true,
      createdAt: new Date(),
    };

    // API endpoints rate limit
    const apiRule: RateLimitRule = {
      id: 'rule-api',
      name: 'API Rate Limit',
      description: 'Rate limit for API endpoints',
      endpoint: '/api/*',
      config: {
        strategy: 'token_bucket',
        limit: 1000,
        windowMs: 60000,
        burstLimit: 100,
      },
      priority: 5,
      enabled: true,
      createdAt: new Date(),
    };

    this.rateLimitRules.set(defaultRule.id, defaultRule);
    this.rateLimitRules.set(authRule.id, authRule);
    this.rateLimitRules.set(apiRule.id, apiRule);

    this.logger.log('Initialized default rate limit rules');
  }

  // =================== API KEY MANAGEMENT ===================

  async createApiKey(
    name: string,
    tenantId: string,
    createdBy: string,
    options?: {
      scopes?: string[];
      rateLimitOverride?: RateLimitConfig;
      quotaLimit?: number;
      quotaPeriod?: QuotaPeriod;
      allowedIps?: string[];
      allowedOrigins?: string[];
      expiresAt?: Date;
      metadata?: Record<string, any>;
    },
  ): Promise<ApiKey> {
    const apiKey: ApiKey = {
      id: this.generateId('key', ++this.apiKeyIdCounter),
      key: this.generateApiKey(),
      name,
      tenantId,
      createdBy,
      status: 'active',
      scopes: options?.scopes || ['*'],
      rateLimitOverride: options?.rateLimitOverride,
      quotaLimit: options?.quotaLimit,
      quotaPeriod: options?.quotaPeriod,
      allowedIps: options?.allowedIps,
      allowedOrigins: options?.allowedOrigins,
      metadata: options?.metadata || {},
      expiresAt: options?.expiresAt,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.apiKeys.set(apiKey.id, apiKey);

    // Initialize quota if set
    if (apiKey.quotaLimit && apiKey.quotaPeriod) {
      this.initializeQuota(apiKey.id, apiKey.quotaLimit, apiKey.quotaPeriod);
    }

    this.logger.log(`Created API key: ${name} for tenant ${tenantId}`);
    return apiKey;
  }

  async getApiKey(keyId: string): Promise<ApiKey | null> {
    return this.apiKeys.get(keyId) || null;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | null> {
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.key === key) {
        return apiKey;
      }
    }
    return null;
  }

  async getApiKeys(tenantId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values())
      .filter(k => k.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateApiKey(
    keyId: string,
    updates: Partial<Omit<ApiKey, 'id' | 'key' | 'tenantId' | 'createdBy' | 'createdAt'>>,
  ): Promise<ApiKey | null> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return null;

    const updated: ApiKey = {
      ...apiKey,
      ...updates,
      updatedAt: new Date(),
    };

    this.apiKeys.set(keyId, updated);
    return updated;
  }

  async revokeApiKey(keyId: string): Promise<boolean> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return false;

    apiKey.status = 'revoked';
    apiKey.updatedAt = new Date();
    this.apiKeys.set(keyId, apiKey);

    this.logger.log(`Revoked API key: ${keyId}`);
    return true;
  }

  async rotateApiKey(keyId: string): Promise<ApiKey | null> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return null;

    // Generate new key
    apiKey.key = this.generateApiKey();
    apiKey.updatedAt = new Date();
    this.apiKeys.set(keyId, apiKey);

    this.logger.log(`Rotated API key: ${keyId}`);
    return apiKey;
  }

  async validateApiKey(key: string): Promise<{ valid: boolean; apiKey?: ApiKey; error?: string }> {
    const apiKey = await this.getApiKeyByKey(key);

    if (!apiKey) {
      return { valid: false, error: 'API key not found' };
    }

    if (apiKey.status !== 'active') {
      return { valid: false, error: `API key is ${apiKey.status}` };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      apiKey.status = 'expired';
      this.apiKeys.set(apiKey.id, apiKey);
      return { valid: false, error: 'API key has expired' };
    }

    return { valid: true, apiKey };
  }

  // =================== RATE LIMITING ===================

  async createRateLimitRule(
    name: string,
    description: string,
    config: RateLimitConfig,
    options?: {
      endpoint?: string;
      method?: string;
      priority?: number;
    },
  ): Promise<RateLimitRule> {
    const rule: RateLimitRule = {
      id: this.generateId('rule', ++this.ruleIdCounter),
      name,
      description,
      endpoint: options?.endpoint,
      method: options?.method,
      config,
      priority: options?.priority || 1,
      enabled: true,
      createdAt: new Date(),
    };

    this.rateLimitRules.set(rule.id, rule);
    this.logger.log(`Created rate limit rule: ${name}`);
    return rule;
  }

  async getRateLimitRule(ruleId: string): Promise<RateLimitRule | null> {
    return this.rateLimitRules.get(ruleId) || null;
  }

  async getRateLimitRules(): Promise<RateLimitRule[]> {
    return Array.from(this.rateLimitRules.values())
      .sort((a, b) => b.priority - a.priority);
  }

  async updateRateLimitRule(
    ruleId: string,
    updates: Partial<Omit<RateLimitRule, 'id' | 'createdAt'>>,
  ): Promise<RateLimitRule | null> {
    const rule = this.rateLimitRules.get(ruleId);
    if (!rule) return null;

    const updated = { ...rule, ...updates };
    this.rateLimitRules.set(ruleId, updated);
    return updated;
  }

  async deleteRateLimitRule(ruleId: string): Promise<boolean> {
    // Don't allow deleting default rule
    if (ruleId === 'rule-default') return false;
    return this.rateLimitRules.delete(ruleId);
  }

  async checkRateLimit(context: RequestContext): Promise<RateLimitResult> {
    // Get API key if present
    let apiKey: ApiKey | undefined;
    if (context.apiKey) {
      const validation = await this.validateApiKey(context.apiKey);
      if (validation.valid) {
        apiKey = validation.apiKey;
      }
    }

    // Use API key's rate limit override if present
    const config = apiKey?.rateLimitOverride || this.getMatchingRuleConfig(context);

    // Generate a rate limit key
    const rateLimitKey = this.generateRateLimitKey(context, apiKey);

    // Apply rate limit based on strategy
    let result: RateLimitResult;
    switch (config.strategy) {
      case 'fixed_window':
        result = this.checkFixedWindow(rateLimitKey, config);
        break;
      case 'sliding_window':
        result = this.checkSlidingWindow(rateLimitKey, config);
        break;
      case 'token_bucket':
        result = this.checkTokenBucket(rateLimitKey, config);
        break;
      case 'leaky_bucket':
        result = this.checkLeakyBucket(rateLimitKey, config);
        break;
      default:
        result = this.checkFixedWindow(rateLimitKey, config);
    }

    return result;
  }

  private getMatchingRuleConfig(context: RequestContext): RateLimitConfig {
    const rules = Array.from(this.rateLimitRules.values())
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of rules) {
      if (this.matchesRule(context, rule)) {
        return rule.config;
      }
    }

    // Return default config
    return {
      strategy: 'sliding_window',
      limit: 100,
      windowMs: 60000,
    };
  }

  private matchesRule(context: RequestContext, rule: RateLimitRule): boolean {
    if (!rule.endpoint) return true;

    const pattern = rule.endpoint.replace('*', '.*');
    const regex = new RegExp(`^${pattern}$`);

    if (!regex.test(context.endpoint)) return false;

    if (rule.method && rule.method !== context.method) return false;

    return true;
  }

  private generateRateLimitKey(context: RequestContext, apiKey?: ApiKey): string {
    if (apiKey) {
      return `ratelimit:${apiKey.id}:${context.endpoint}`;
    }
    return `ratelimit:${context.ipAddress}:${context.endpoint}`;
  }

  private checkFixedWindow(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(key);
    const windowStart = Math.floor(now / config.windowMs) * config.windowMs;

    if (!counter || counter.windowStart !== windowStart) {
      // New window
      this.rateLimitCounters.set(key, { count: 1, windowStart });
      return {
        allowed: true,
        remaining: config.limit - 1,
        resetAt: new Date(windowStart + config.windowMs),
        limit: config.limit,
      };
    }

    if (counter.count >= config.limit) {
      const resetAt = new Date(windowStart + config.windowMs);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now) / 1000),
        limit: config.limit,
      };
    }

    counter.count++;
    this.rateLimitCounters.set(key, counter);

    return {
      allowed: true,
      remaining: config.limit - counter.count,
      resetAt: new Date(windowStart + config.windowMs),
      limit: config.limit,
    };
  }

  private checkSlidingWindow(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(key);

    if (!counter) {
      this.rateLimitCounters.set(key, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: config.limit - 1,
        resetAt: new Date(now + config.windowMs),
        limit: config.limit,
      };
    }

    const elapsed = now - counter.windowStart;
    if (elapsed >= config.windowMs) {
      // Reset window
      this.rateLimitCounters.set(key, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: config.limit - 1,
        resetAt: new Date(now + config.windowMs),
        limit: config.limit,
      };
    }

    // Calculate weighted count based on sliding window
    const weight = 1 - (elapsed / config.windowMs);
    const weightedCount = Math.floor(counter.count * weight);

    if (weightedCount >= config.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(counter.windowStart + config.windowMs),
        retryAfter: Math.ceil((config.windowMs - elapsed) / 1000),
        limit: config.limit,
      };
    }

    counter.count++;
    this.rateLimitCounters.set(key, counter);

    return {
      allowed: true,
      remaining: config.limit - weightedCount - 1,
      resetAt: new Date(counter.windowStart + config.windowMs),
      limit: config.limit,
    };
  }

  private checkTokenBucket(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(key);
    const burstLimit = config.burstLimit || config.limit;

    if (!counter) {
      this.rateLimitCounters.set(key, { count: 0, windowStart: now, tokens: burstLimit - 1 });
      return {
        allowed: true,
        remaining: burstLimit - 1,
        resetAt: new Date(now + config.windowMs),
        limit: burstLimit,
      };
    }

    const elapsed = now - counter.windowStart;
    const refillRate = config.limit / config.windowMs;
    const tokensToAdd = Math.floor(elapsed * refillRate);
    const tokens = Math.min(burstLimit, (counter.tokens || 0) + tokensToAdd);

    if (tokens < 1) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + (1 / refillRate)),
        retryAfter: Math.ceil(1 / refillRate / 1000),
        limit: burstLimit,
      };
    }

    this.rateLimitCounters.set(key, { count: counter.count + 1, windowStart: now, tokens: tokens - 1 });

    return {
      allowed: true,
      remaining: tokens - 1,
      resetAt: new Date(now + config.windowMs),
      limit: burstLimit,
    };
  }

  private checkLeakyBucket(key: string, config: RateLimitConfig): RateLimitResult {
    // Similar to token bucket but requests are processed at a fixed rate
    return this.checkTokenBucket(key, config);
  }

  // =================== QUOTA MANAGEMENT ===================

  private initializeQuota(keyId: string, limit: number, period: QuotaPeriod): void {
    const quota: Quota = {
      keyId,
      period,
      limit,
      used: 0,
      resetAt: this.calculateQuotaReset(period),
    };

    this.quotas.set(keyId, quota);
  }

  private calculateQuotaReset(period: QuotaPeriod): Date {
    const now = new Date();
    switch (period) {
      case 'minute':
        return new Date(now.getTime() + 60000);
      case 'hour':
        return new Date(now.getTime() + 3600000);
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'week':
        return new Date(now.getTime() + 7 * 24 * 3600000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return new Date(now.getTime() + 86400000);
    }
  }

  async checkQuota(keyId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const quota = this.quotas.get(keyId);
    if (!quota) {
      return { allowed: true, remaining: Infinity, resetAt: new Date() };
    }

    // Check if quota needs reset
    if (quota.resetAt <= new Date()) {
      quota.used = 0;
      quota.resetAt = this.calculateQuotaReset(quota.period);
    }

    if (quota.used >= quota.limit) {
      return { allowed: false, remaining: 0, resetAt: quota.resetAt };
    }

    quota.used++;
    this.quotas.set(keyId, quota);

    return { allowed: true, remaining: quota.limit - quota.used, resetAt: quota.resetAt };
  }

  async getQuota(keyId: string): Promise<Quota | null> {
    return this.quotas.get(keyId) || null;
  }

  async resetQuota(keyId: string): Promise<boolean> {
    const quota = this.quotas.get(keyId);
    if (!quota) return false;

    quota.used = 0;
    quota.resetAt = this.calculateQuotaReset(quota.period);
    this.quotas.set(keyId, quota);

    return true;
  }

  // =================== IP FILTERING ===================

  async addIpFilter(
    tenantId: string,
    ipAddress: string,
    action: IpFilterAction,
    options?: {
      reason?: string;
      expiresAt?: Date;
    },
  ): Promise<IpFilter> {
    const filter: IpFilter = {
      id: this.generateId('filter', ++this.filterIdCounter),
      tenantId,
      ipAddress,
      action,
      reason: options?.reason,
      expiresAt: options?.expiresAt,
      createdAt: new Date(),
    };

    this.ipFilters.set(filter.id, filter);
    this.logger.log(`Added IP filter: ${action} ${ipAddress}`);
    return filter;
  }

  async removeIpFilter(filterId: string): Promise<boolean> {
    return this.ipFilters.delete(filterId);
  }

  async getIpFilters(tenantId: string): Promise<IpFilter[]> {
    return Array.from(this.ipFilters.values())
      .filter(f => f.tenantId === tenantId);
  }

  async checkIpFilter(ipAddress: string, tenantId?: string): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();
    const filters = Array.from(this.ipFilters.values())
      .filter(f => {
        if (f.expiresAt && f.expiresAt < now) return false;
        if (tenantId && f.tenantId !== tenantId) return false;
        return true;
      });

    // Check for exact match or CIDR match
    for (const filter of filters) {
      if (this.matchesIpAddress(ipAddress, filter.ipAddress)) {
        if (filter.action === 'block') {
          return { allowed: false, reason: filter.reason || 'IP blocked' };
        }
        return { allowed: true };
      }
    }

    // Default allow if no matching filter
    return { allowed: true };
  }

  private matchesIpAddress(ip: string, pattern: string): boolean {
    if (pattern === ip) return true;

    // Simple CIDR matching for /24 ranges
    if (pattern.includes('/')) {
      const [network, bits] = pattern.split('/');
      const networkParts = network.split('.');
      const ipParts = ip.split('.');
      const mask = parseInt(bits);

      if (mask === 24) {
        return networkParts.slice(0, 3).join('.') === ipParts.slice(0, 3).join('.');
      }
    }

    // Wildcard matching
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return regex.test(ip);
    }

    return false;
  }

  // =================== REQUEST/RESPONSE TRANSFORMATION ===================

  async createTransformRule(
    name: string,
    type: 'request' | 'response',
    endpoint: string,
    transformations: Transformation[],
    options?: {
      method?: string;
      priority?: number;
    },
  ): Promise<TransformRule> {
    const rule: TransformRule = {
      id: this.generateId('transform', ++this.transformIdCounter),
      name,
      type,
      endpoint,
      method: options?.method,
      transformations,
      priority: options?.priority || 1,
      enabled: true,
    };

    this.transformRules.set(rule.id, rule);
    return rule;
  }

  async getTransformRules(type?: 'request' | 'response'): Promise<TransformRule[]> {
    let rules = Array.from(this.transformRules.values());
    if (type) {
      rules = rules.filter(r => r.type === type);
    }
    return rules.sort((a, b) => b.priority - a.priority);
  }

  async deleteTransformRule(ruleId: string): Promise<boolean> {
    return this.transformRules.delete(ruleId);
  }

  async applyRequestTransformations(
    endpoint: string,
    method: string,
    headers: Record<string, string>,
    body: any,
  ): Promise<{ headers: Record<string, string>; body: any }> {
    const rules = (await this.getTransformRules('request'))
      .filter(r => r.enabled && this.matchesEndpoint(endpoint, r.endpoint));

    let transformedHeaders = { ...headers };
    let transformedBody = body ? { ...body } : body;

    for (const rule of rules) {
      for (const transform of rule.transformations) {
        switch (transform.action) {
          case 'add_header':
            transformedHeaders[transform.target] = transform.value || '';
            break;
          case 'remove_header':
            delete transformedHeaders[transform.target];
            break;
          case 'modify_header':
            if (transformedHeaders[transform.target]) {
              transformedHeaders[transform.target] = transform.value || '';
            }
            break;
          case 'add_body_field':
            if (transformedBody) {
              transformedBody[transform.target] = transform.value;
            }
            break;
          case 'remove_body_field':
            if (transformedBody) {
              delete transformedBody[transform.target];
            }
            break;
        }
      }
    }

    return { headers: transformedHeaders, body: transformedBody };
  }

  private matchesEndpoint(endpoint: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(endpoint);
  }

  // =================== USAGE TRACKING ===================

  async logUsage(usage: Omit<ApiKeyUsage, 'timestamp'>): Promise<void> {
    const log: ApiKeyUsage = {
      ...usage,
      timestamp: new Date(),
    };

    this.usageLog.push(log);

    // Update API key usage count
    const apiKey = this.apiKeys.get(usage.keyId);
    if (apiKey) {
      apiKey.usageCount++;
      apiKey.lastUsedAt = new Date();
      this.apiKeys.set(usage.keyId, apiKey);
    }

    // Keep only last 10000 entries
    if (this.usageLog.length > 10000) {
      this.usageLog = this.usageLog.slice(-10000);
    }
  }

  async getUsageLog(keyId: string, limit: number = 100): Promise<ApiKeyUsage[]> {
    return this.usageLog
      .filter(u => u.keyId === keyId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // =================== METRICS & ANALYTICS ===================

  async getApiMetrics(tenantId: string, periodHours: number = 24): Promise<ApiMetrics> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodHours * 3600000);

    const keys = await this.getApiKeys(tenantId);
    const keyIds = keys.map(k => k.id);

    const periodUsage = this.usageLog.filter(
      u => keyIds.includes(u.keyId) && u.timestamp >= periodStart,
    );

    const totalRequests = periodUsage.length;
    const successfulRequests = periodUsage.filter(u => u.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = totalRequests > 0
      ? periodUsage.reduce((sum, u) => sum + u.responseTime, 0) / totalRequests
      : 0;

    // Group by endpoint
    const endpointCounts = new Map<string, number>();
    periodUsage.forEach(u => {
      endpointCounts.set(u.endpoint, (endpointCounts.get(u.endpoint) || 0) + 1);
    });

    // Group by status code
    const statusCounts = new Map<number, number>();
    periodUsage.forEach(u => {
      statusCounts.set(u.statusCode, (statusCounts.get(u.statusCode) || 0) + 1);
    });

    // Group by API key
    const keyCounts = new Map<string, number>();
    periodUsage.forEach(u => {
      keyCounts.set(u.keyId, (keyCounts.get(u.keyId) || 0) + 1);
    });

    // Calculate rate limit hits (429 responses)
    const rateLimitHits = statusCounts.get(429) || 0;

    // Calculate blocked requests (403 responses)
    const blockedRequests = statusCounts.get(403) || 0;

    // Calculate peak requests per minute
    const minuteBuckets = new Map<number, number>();
    periodUsage.forEach(u => {
      const minute = Math.floor(u.timestamp.getTime() / 60000);
      minuteBuckets.set(minute, (minuteBuckets.get(minute) || 0) + 1);
    });
    const peakRequestsPerMinute = Math.max(...Array.from(minuteBuckets.values()), 0);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      requestsByEndpoint: Array.from(endpointCounts.entries())
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      requestsByStatusCode: Array.from(statusCounts.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count),
      requestsByApiKey: Array.from(keyCounts.entries())
        .map(([keyId, count]) => {
          const key = keys.find(k => k.id === keyId);
          return { keyId, keyName: key?.name || 'Unknown', count };
        })
        .sort((a, b) => b.count - a.count),
      rateLimitHits,
      quotaExceeded: 0, // Would need to track separately
      blockedRequests,
      peakRequestsPerMinute,
      period: { start: periodStart, end: now },
    };
  }

  async getGatewayHealth(): Promise<GatewayHealth> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);

    const recentUsage = this.usageLog.filter(u => u.timestamp >= oneMinuteAgo);
    const requestsLastMinute = recentUsage.length;
    const errorCount = recentUsage.filter(u => u.statusCode >= 400).length;
    const errorRate = requestsLastMinute > 0 ? (errorCount / requestsLastMinute) * 100 : 0;
    const averageLatency = requestsLastMinute > 0
      ? recentUsage.reduce((sum, u) => sum + u.responseTime, 0) / requestsLastMinute
      : 0;

    const activeApiKeys = Array.from(this.apiKeys.values())
      .filter(k => k.status === 'active').length;

    const activeRateLimitRules = Array.from(this.rateLimitRules.values())
      .filter(r => r.enabled).length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errorRate > 10) status = 'degraded';
    if (errorRate > 50) status = 'unhealthy';

    return {
      status,
      activeApiKeys,
      activeRateLimitRules,
      requestsLastMinute,
      errorRate,
      averageLatency,
      uptime: Date.now() - this.startTime,
      timestamp: now,
    };
  }

  // =================== FULL REQUEST PROCESSING ===================

  async processRequest(context: RequestContext): Promise<{
    allowed: boolean;
    apiKey?: ApiKey;
    rateLimit: RateLimitResult;
    quota?: { allowed: boolean; remaining: number; resetAt: Date };
    ipCheck: { allowed: boolean; reason?: string };
    errors: string[];
  }> {
    const errors: string[] = [];
    let apiKey: ApiKey | undefined;

    // 1. Validate API key
    if (context.apiKey) {
      const validation = await this.validateApiKey(context.apiKey);
      if (!validation.valid) {
        errors.push(validation.error || 'Invalid API key');
      } else {
        apiKey = validation.apiKey;

        // Check allowed IPs for this key
        if (apiKey?.allowedIps && apiKey.allowedIps.length > 0) {
          const ipAllowed = apiKey.allowedIps.some(ip =>
            this.matchesIpAddress(context.ipAddress, ip),
          );
          if (!ipAllowed) {
            errors.push('IP not allowed for this API key');
          }
        }

        // Check scopes
        if (apiKey?.scopes && !apiKey.scopes.includes('*')) {
          // Simple scope check - in production would be more sophisticated
          const endpointScope = context.endpoint.split('/')[1];
          if (!apiKey.scopes.some(s => s === endpointScope || s.startsWith(endpointScope + ':'))) {
            errors.push('Insufficient scope for this endpoint');
          }
        }
      }
    }

    // 2. Check IP filter
    const ipCheck = await this.checkIpFilter(context.ipAddress, context.tenantId);
    if (!ipCheck.allowed) {
      errors.push(ipCheck.reason || 'IP blocked');
    }

    // 3. Check rate limit
    const rateLimit = await this.checkRateLimit(context);
    if (!rateLimit.allowed) {
      errors.push('Rate limit exceeded');
    }

    // 4. Check quota
    let quota: { allowed: boolean; remaining: number; resetAt: Date } | undefined;
    if (apiKey) {
      quota = await this.checkQuota(apiKey.id);
      if (!quota.allowed) {
        errors.push('Quota exceeded');
      }
    }

    return {
      allowed: errors.length === 0,
      apiKey,
      rateLimit,
      quota,
      ipCheck,
      errors,
    };
  }
}
