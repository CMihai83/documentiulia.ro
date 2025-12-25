import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

export type RateLimitStrategy = 'FIXED_WINDOW' | 'SLIDING_WINDOW' | 'TOKEN_BUCKET' | 'LEAKY_BUCKET';

export type RateLimitTarget = 'USER' | 'ORGANIZATION' | 'IP_ADDRESS' | 'API_ENDPOINT' | 'INTEGRATION';

export type IntegrationType = 'ANAF' | 'BANK' | 'PAYMENT' | 'EMAIL' | 'SMS' | 'COURIER' | 'GENERAL';

export interface RateLimitRule {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  target: RateLimitTarget;
  strategy: RateLimitStrategy;
  integrationType?: IntegrationType;
  endpoint?: string;
  maxRequests: number;
  windowMs: number;
  burstLimit?: number;
  tokensPerInterval?: number;
  intervalMs?: number;
  retryAfterMs?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitState {
  id: string;
  ruleId: string;
  key: string;
  requestCount: number;
  tokens?: number;
  windowStart: Date;
  lastRequest: Date;
  blocked: boolean;
  blockedUntil?: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfterMs?: number;
  rule: RateLimitRule;
}

export interface RateLimitStatistics {
  ruleId: string;
  ruleName: string;
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  blockRate: number;
  peakRequestsPerSecond: number;
  averageRequestsPerSecond: number;
  uniqueKeys: number;
  lastUpdated: Date;
}

export interface QuotaUsage {
  id: string;
  organizationId: string;
  integrationType: IntegrationType;
  name: string;
  nameRo: string;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  resetDaily: Date;
  resetMonthly: Date;
}

export interface CreateRuleDto {
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  target: RateLimitTarget;
  strategy: RateLimitStrategy;
  integrationType?: IntegrationType;
  endpoint?: string;
  maxRequests: number;
  windowMs: number;
  burstLimit?: number;
  tokensPerInterval?: number;
  intervalMs?: number;
  retryAfterMs?: number;
}

@Injectable()
export class RateLimiterService {
  private rules: Map<string, RateLimitRule> = new Map();
  private states: Map<string, RateLimitState> = new Map();
  private quotas: Map<string, QuotaUsage> = new Map();
  private statistics: Map<string, RateLimitStatistics> = new Map();
  private requestLogs: Map<string, number[]> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultRules();
    this.initializeDefaultQuotas();
  }

  private initializeDefaultRules(): void {
    const defaultRules: CreateRuleDto[] = [
      {
        name: 'ANAF API Limit',
        nameRo: 'Limită API ANAF',
        description: 'Rate limit for ANAF API calls (e-Factura, SAF-T)',
        descriptionRo: 'Limită de rată pentru apeluri API ANAF (e-Factura, SAF-T)',
        target: 'INTEGRATION',
        strategy: 'TOKEN_BUCKET',
        integrationType: 'ANAF',
        maxRequests: 10,
        windowMs: 1000,
        tokensPerInterval: 10,
        intervalMs: 1000,
        retryAfterMs: 5000,
      },
      {
        name: 'API General Limit',
        nameRo: 'Limită Generală API',
        description: 'General rate limit for API endpoints',
        descriptionRo: 'Limită generală de rată pentru endpoint-uri API',
        target: 'API_ENDPOINT',
        strategy: 'SLIDING_WINDOW',
        maxRequests: 100,
        windowMs: 60000,
        burstLimit: 20,
        retryAfterMs: 60000,
      },
      {
        name: 'User Rate Limit',
        nameRo: 'Limită per Utilizator',
        description: 'Rate limit per user account',
        descriptionRo: 'Limită de rată per cont de utilizator',
        target: 'USER',
        strategy: 'FIXED_WINDOW',
        maxRequests: 1000,
        windowMs: 3600000,
        retryAfterMs: 300000,
      },
      {
        name: 'Organization Rate Limit',
        nameRo: 'Limită per Organizație',
        description: 'Rate limit per organization',
        descriptionRo: 'Limită de rată per organizație',
        target: 'ORGANIZATION',
        strategy: 'SLIDING_WINDOW',
        maxRequests: 10000,
        windowMs: 3600000,
        retryAfterMs: 300000,
      },
      {
        name: 'IP Address Limit',
        nameRo: 'Limită per Adresă IP',
        description: 'Rate limit per IP address for DDoS protection',
        descriptionRo: 'Limită de rată per adresă IP pentru protecție DDoS',
        target: 'IP_ADDRESS',
        strategy: 'LEAKY_BUCKET',
        maxRequests: 500,
        windowMs: 60000,
        burstLimit: 50,
        retryAfterMs: 60000,
      },
      {
        name: 'Login Attempt Limit',
        nameRo: 'Limită Încercări Autentificare',
        description: 'Rate limit for login attempts',
        descriptionRo: 'Limită de rată pentru încercări de autentificare',
        target: 'API_ENDPOINT',
        strategy: 'FIXED_WINDOW',
        endpoint: '/auth/login',
        maxRequests: 5,
        windowMs: 900000,
        retryAfterMs: 900000,
      },
      {
        name: 'Password Reset Limit',
        nameRo: 'Limită Resetare Parolă',
        description: 'Rate limit for password reset requests',
        descriptionRo: 'Limită de rată pentru cereri de resetare parolă',
        target: 'API_ENDPOINT',
        strategy: 'FIXED_WINDOW',
        endpoint: '/auth/reset-password',
        maxRequests: 3,
        windowMs: 3600000,
        retryAfterMs: 3600000,
      },
      {
        name: 'Payment API Limit',
        nameRo: 'Limită API Plăți',
        description: 'Rate limit for payment gateway calls',
        descriptionRo: 'Limită de rată pentru apeluri gateway plăți',
        target: 'INTEGRATION',
        strategy: 'TOKEN_BUCKET',
        integrationType: 'PAYMENT',
        maxRequests: 50,
        windowMs: 60000,
        tokensPerInterval: 50,
        intervalMs: 60000,
        retryAfterMs: 30000,
      },
      {
        name: 'Email Sending Limit',
        nameRo: 'Limită Trimitere Email',
        description: 'Rate limit for email sending',
        descriptionRo: 'Limită de rată pentru trimitere email',
        target: 'INTEGRATION',
        strategy: 'SLIDING_WINDOW',
        integrationType: 'EMAIL',
        maxRequests: 100,
        windowMs: 3600000,
        retryAfterMs: 300000,
      },
      {
        name: 'SMS Sending Limit',
        nameRo: 'Limită Trimitere SMS',
        description: 'Rate limit for SMS sending',
        descriptionRo: 'Limită de rată pentru trimitere SMS',
        target: 'INTEGRATION',
        strategy: 'FIXED_WINDOW',
        integrationType: 'SMS',
        maxRequests: 50,
        windowMs: 3600000,
        retryAfterMs: 600000,
      },
    ];

    for (const dto of defaultRules) {
      const rule = this.createRuleInternal(dto);
      this.rules.set(rule.id, rule);
    }
  }

  private initializeDefaultQuotas(): void {
    // Default quotas - will be assigned per organization
  }

  private createRuleInternal(dto: CreateRuleDto): RateLimitRule {
    const now = new Date();
    return {
      id: randomUUID(),
      ...dto,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async createRule(dto: CreateRuleDto): Promise<RateLimitRule> {
    const rule = this.createRuleInternal(dto);
    this.rules.set(rule.id, rule);
    this.eventEmitter.emit('ratelimit.rule.created', { rule });
    return rule;
  }

  async updateRule(ruleId: string, updates: Partial<CreateRuleDto>): Promise<RateLimitRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }

    const updated = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };
    this.rules.set(ruleId, updated);
    this.eventEmitter.emit('ratelimit.rule.updated', { rule: updated });
    return updated;
  }

  async deleteRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }
    this.rules.delete(ruleId);
    this.eventEmitter.emit('ratelimit.rule.deleted', { ruleId });
  }

  async getRule(ruleId: string): Promise<RateLimitRule | null> {
    return this.rules.get(ruleId) || null;
  }

  async getRules(): Promise<RateLimitRule[]> {
    return Array.from(this.rules.values());
  }

  async getRulesByTarget(target: RateLimitTarget): Promise<RateLimitRule[]> {
    return Array.from(this.rules.values()).filter(r => r.target === target && r.isActive);
  }

  async getRuleByIntegration(integrationType: IntegrationType): Promise<RateLimitRule | null> {
    return Array.from(this.rules.values()).find(
      r => r.integrationType === integrationType && r.isActive
    ) || null;
  }

  async getRuleByEndpoint(endpoint: string): Promise<RateLimitRule | null> {
    return Array.from(this.rules.values()).find(
      r => r.endpoint === endpoint && r.isActive
    ) || null;
  }

  async checkRateLimit(
    ruleId: string,
    key: string
  ): Promise<RateLimitResult> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }

    if (!rule.isActive) {
      return {
        allowed: true,
        remaining: rule.maxRequests,
        limit: rule.maxRequests,
        resetAt: new Date(Date.now() + rule.windowMs),
        rule,
      };
    }

    const stateKey = `${ruleId}:${key}`;
    let state = this.states.get(stateKey);
    const now = new Date();

    if (!state) {
      state = this.createState(ruleId, key, rule);
      this.states.set(stateKey, state);
    }

    // Check if blocked
    if (state.blocked && state.blockedUntil && now < state.blockedUntil) {
      const retryAfterMs = state.blockedUntil.getTime() - now.getTime();
      this.recordRequest(ruleId, false);
      return {
        allowed: false,
        remaining: 0,
        limit: rule.maxRequests,
        resetAt: state.blockedUntil,
        retryAfterMs,
        rule,
      };
    }

    // Reset block if expired
    if (state.blocked && state.blockedUntil && now >= state.blockedUntil) {
      state.blocked = false;
      state.blockedUntil = undefined;
      state.requestCount = 0;
      state.windowStart = now;
    }

    let result: RateLimitResult;

    switch (rule.strategy) {
      case 'FIXED_WINDOW':
        result = this.checkFixedWindow(rule, state, now);
        break;
      case 'SLIDING_WINDOW':
        result = this.checkSlidingWindow(rule, state, now);
        break;
      case 'TOKEN_BUCKET':
        result = this.checkTokenBucket(rule, state, now);
        break;
      case 'LEAKY_BUCKET':
        result = this.checkLeakyBucket(rule, state, now);
        break;
      default:
        result = this.checkFixedWindow(rule, state, now);
    }

    state.lastRequest = now;
    this.states.set(stateKey, state);
    this.recordRequest(ruleId, result.allowed);

    if (!result.allowed) {
      this.eventEmitter.emit('ratelimit.blocked', { rule, key, state });
    }

    return result;
  }

  private createState(ruleId: string, key: string, rule: RateLimitRule): RateLimitState {
    return {
      id: randomUUID(),
      ruleId,
      key,
      requestCount: 0,
      tokens: rule.strategy === 'TOKEN_BUCKET' ? rule.maxRequests : undefined,
      windowStart: new Date(),
      lastRequest: new Date(),
      blocked: false,
    };
  }

  private checkFixedWindow(
    rule: RateLimitRule,
    state: RateLimitState,
    now: Date
  ): RateLimitResult {
    const windowEnd = new Date(state.windowStart.getTime() + rule.windowMs);

    // Reset window if expired
    if (now >= windowEnd) {
      state.windowStart = now;
      state.requestCount = 0;
    }

    state.requestCount++;
    const remaining = Math.max(0, rule.maxRequests - state.requestCount);
    const allowed = state.requestCount <= rule.maxRequests;

    if (!allowed && rule.retryAfterMs) {
      state.blocked = true;
      state.blockedUntil = new Date(now.getTime() + rule.retryAfterMs);
    }

    return {
      allowed,
      remaining,
      limit: rule.maxRequests,
      resetAt: new Date(state.windowStart.getTime() + rule.windowMs),
      retryAfterMs: allowed ? undefined : rule.retryAfterMs,
      rule,
    };
  }

  private checkSlidingWindow(
    rule: RateLimitRule,
    state: RateLimitState,
    now: Date
  ): RateLimitResult {
    const windowStart = new Date(now.getTime() - rule.windowMs);

    // Get request log for sliding window
    const logKey = `${state.ruleId}:${state.key}`;
    let log = this.requestLogs.get(logKey) || [];

    // Remove old entries
    log = log.filter(timestamp => timestamp > windowStart.getTime());

    // Check burst limit
    if (rule.burstLimit) {
      const recentCount = log.filter(t => t > now.getTime() - 1000).length;
      if (recentCount >= rule.burstLimit) {
        const retryAfterMs = rule.retryAfterMs || 1000;
        return {
          allowed: false,
          remaining: 0,
          limit: rule.maxRequests,
          resetAt: new Date(now.getTime() + retryAfterMs),
          retryAfterMs,
          rule,
        };
      }
    }

    const currentCount = log.length;
    const allowed = currentCount < rule.maxRequests;

    if (allowed) {
      log.push(now.getTime());
      this.requestLogs.set(logKey, log);
    }

    const remaining = Math.max(0, rule.maxRequests - log.length);

    if (!allowed && rule.retryAfterMs) {
      state.blocked = true;
      state.blockedUntil = new Date(now.getTime() + rule.retryAfterMs);
    }

    return {
      allowed,
      remaining,
      limit: rule.maxRequests,
      resetAt: new Date(now.getTime() + rule.windowMs),
      retryAfterMs: allowed ? undefined : rule.retryAfterMs,
      rule,
    };
  }

  private checkTokenBucket(
    rule: RateLimitRule,
    state: RateLimitState,
    now: Date
  ): RateLimitResult {
    const tokens = state.tokens ?? rule.maxRequests;
    const timeSinceLastRequest = now.getTime() - state.lastRequest.getTime();

    // Refill tokens based on time passed
    const tokensPerInterval = rule.tokensPerInterval || rule.maxRequests;
    const intervalMs = rule.intervalMs || rule.windowMs;
    const tokensToAdd = Math.floor(timeSinceLastRequest / intervalMs) * tokensPerInterval;
    const newTokens = Math.min(rule.maxRequests, tokens + tokensToAdd);

    const allowed = newTokens >= 1;
    state.tokens = allowed ? newTokens - 1 : newTokens;

    if (!allowed && rule.retryAfterMs) {
      state.blocked = true;
      state.blockedUntil = new Date(now.getTime() + rule.retryAfterMs);
    }

    return {
      allowed,
      remaining: Math.max(0, Math.floor(state.tokens)),
      limit: rule.maxRequests,
      resetAt: new Date(now.getTime() + intervalMs),
      retryAfterMs: allowed ? undefined : rule.retryAfterMs,
      rule,
    };
  }

  private checkLeakyBucket(
    rule: RateLimitRule,
    state: RateLimitState,
    now: Date
  ): RateLimitResult {
    const timeSinceLastRequest = now.getTime() - state.lastRequest.getTime();
    const leakRate = rule.maxRequests / rule.windowMs;

    // Leak requests based on time passed
    const leaked = Math.floor(timeSinceLastRequest * leakRate);
    state.requestCount = Math.max(0, state.requestCount - leaked);

    // Check burst limit
    const burstLimit = rule.burstLimit || rule.maxRequests;
    const allowed = state.requestCount < burstLimit;

    if (allowed) {
      state.requestCount++;
    }

    if (!allowed && rule.retryAfterMs) {
      state.blocked = true;
      state.blockedUntil = new Date(now.getTime() + rule.retryAfterMs);
    }

    return {
      allowed,
      remaining: Math.max(0, burstLimit - state.requestCount),
      limit: burstLimit,
      resetAt: new Date(now.getTime() + rule.windowMs),
      retryAfterMs: allowed ? undefined : rule.retryAfterMs,
      rule,
    };
  }

  private recordRequest(ruleId: string, allowed: boolean): void {
    let stats = this.statistics.get(ruleId);
    if (!stats) {
      const rule = this.rules.get(ruleId);
      stats = {
        ruleId,
        ruleName: rule?.name || 'Unknown',
        totalRequests: 0,
        blockedRequests: 0,
        allowedRequests: 0,
        blockRate: 0,
        peakRequestsPerSecond: 0,
        averageRequestsPerSecond: 0,
        uniqueKeys: 0,
        lastUpdated: new Date(),
      };
    }

    stats.totalRequests++;
    if (allowed) {
      stats.allowedRequests++;
    } else {
      stats.blockedRequests++;
    }
    stats.blockRate = (stats.blockedRequests / stats.totalRequests) * 100;
    stats.lastUpdated = new Date();

    this.statistics.set(ruleId, stats);
  }

  async consumeRateLimit(
    target: RateLimitTarget,
    key: string,
    options?: {
      endpoint?: string;
      integrationType?: IntegrationType;
    }
  ): Promise<RateLimitResult> {
    let rule: RateLimitRule | undefined;

    if (options?.endpoint) {
      rule = await this.getRuleByEndpoint(options.endpoint) || undefined;
    }

    if (!rule && options?.integrationType) {
      rule = await this.getRuleByIntegration(options.integrationType) || undefined;
    }

    if (!rule) {
      const rules = await this.getRulesByTarget(target);
      rule = rules[0];
    }

    if (!rule) {
      return {
        allowed: true,
        remaining: 100,
        limit: 100,
        resetAt: new Date(Date.now() + 60000),
        rule: {
          id: 'default',
          name: 'Default',
          nameRo: 'Implicit',
          description: 'Default rate limit',
          descriptionRo: 'Limită implicită',
          target,
          strategy: 'FIXED_WINDOW',
          maxRequests: 100,
          windowMs: 60000,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }

    return this.checkRateLimit(rule.id, key);
  }

  // Convenience methods for common rate limiting scenarios
  async checkUserLimit(userId: string): Promise<RateLimitResult> {
    return this.consumeRateLimit('USER', userId);
  }

  async checkOrganizationLimit(organizationId: string): Promise<RateLimitResult> {
    return this.consumeRateLimit('ORGANIZATION', organizationId);
  }

  async checkIpLimit(ipAddress: string): Promise<RateLimitResult> {
    return this.consumeRateLimit('IP_ADDRESS', ipAddress);
  }

  async checkEndpointLimit(endpoint: string, key: string): Promise<RateLimitResult> {
    return this.consumeRateLimit('API_ENDPOINT', key, { endpoint });
  }

  async checkANAFLimit(organizationId: string): Promise<RateLimitResult> {
    return this.consumeRateLimit('INTEGRATION', organizationId, { integrationType: 'ANAF' });
  }

  async checkPaymentLimit(organizationId: string): Promise<RateLimitResult> {
    return this.consumeRateLimit('INTEGRATION', organizationId, { integrationType: 'PAYMENT' });
  }

  async checkEmailLimit(organizationId: string): Promise<RateLimitResult> {
    return this.consumeRateLimit('INTEGRATION', organizationId, { integrationType: 'EMAIL' });
  }

  async checkLoginLimit(ipAddress: string): Promise<RateLimitResult> {
    return this.consumeRateLimit('API_ENDPOINT', ipAddress, { endpoint: '/auth/login' });
  }

  // Quota Management
  async createQuota(
    organizationId: string,
    integrationType: IntegrationType,
    dailyLimit: number,
    monthlyLimit: number
  ): Promise<QuotaUsage> {
    const now = new Date();
    const resetDaily = new Date(now);
    resetDaily.setHours(0, 0, 0, 0);
    resetDaily.setDate(resetDaily.getDate() + 1);

    const resetMonthly = new Date(now);
    resetMonthly.setHours(0, 0, 0, 0);
    resetMonthly.setDate(1);
    resetMonthly.setMonth(resetMonthly.getMonth() + 1);

    const names: Record<IntegrationType, { name: string; nameRo: string }> = {
      ANAF: { name: 'ANAF API Quota', nameRo: 'Cotă API ANAF' },
      BANK: { name: 'Bank API Quota', nameRo: 'Cotă API Bancă' },
      PAYMENT: { name: 'Payment API Quota', nameRo: 'Cotă API Plăți' },
      EMAIL: { name: 'Email Quota', nameRo: 'Cotă Email' },
      SMS: { name: 'SMS Quota', nameRo: 'Cotă SMS' },
      COURIER: { name: 'Courier API Quota', nameRo: 'Cotă API Curierat' },
      GENERAL: { name: 'General API Quota', nameRo: 'Cotă API General' },
    };

    const quota: QuotaUsage = {
      id: randomUUID(),
      organizationId,
      integrationType,
      name: names[integrationType].name,
      nameRo: names[integrationType].nameRo,
      dailyLimit,
      monthlyLimit,
      dailyUsed: 0,
      monthlyUsed: 0,
      dailyRemaining: dailyLimit,
      monthlyRemaining: monthlyLimit,
      resetDaily,
      resetMonthly,
    };

    const key = `${organizationId}:${integrationType}`;
    this.quotas.set(key, quota);
    this.eventEmitter.emit('ratelimit.quota.created', { quota });
    return quota;
  }

  async getQuota(organizationId: string, integrationType: IntegrationType): Promise<QuotaUsage | null> {
    const key = `${organizationId}:${integrationType}`;
    return this.quotas.get(key) || null;
  }

  async getOrganizationQuotas(organizationId: string): Promise<QuotaUsage[]> {
    return Array.from(this.quotas.values())
      .filter(q => q.organizationId === organizationId);
  }

  async consumeQuota(
    organizationId: string,
    integrationType: IntegrationType,
    amount: number = 1
  ): Promise<{ allowed: boolean; quota: QuotaUsage }> {
    const key = `${organizationId}:${integrationType}`;
    let quota = this.quotas.get(key);

    if (!quota) {
      // Create default quota
      quota = await this.createQuota(organizationId, integrationType, 1000, 30000);
    }

    const now = new Date();

    // Reset daily if needed
    if (now >= quota.resetDaily) {
      quota.dailyUsed = 0;
      quota.resetDaily = new Date(quota.resetDaily);
      quota.resetDaily.setDate(quota.resetDaily.getDate() + 1);
    }

    // Reset monthly if needed
    if (now >= quota.resetMonthly) {
      quota.monthlyUsed = 0;
      quota.resetMonthly = new Date(quota.resetMonthly);
      quota.resetMonthly.setMonth(quota.resetMonthly.getMonth() + 1);
    }

    const dailyAllowed = quota.dailyUsed + amount <= quota.dailyLimit;
    const monthlyAllowed = quota.monthlyUsed + amount <= quota.monthlyLimit;
    const allowed = dailyAllowed && monthlyAllowed;

    if (allowed) {
      quota.dailyUsed += amount;
      quota.monthlyUsed += amount;
      quota.dailyRemaining = quota.dailyLimit - quota.dailyUsed;
      quota.monthlyRemaining = quota.monthlyLimit - quota.monthlyUsed;
      this.quotas.set(key, quota);
    } else {
      this.eventEmitter.emit('ratelimit.quota.exceeded', { quota, amount });
    }

    return { allowed, quota };
  }

  async updateQuotaLimits(
    organizationId: string,
    integrationType: IntegrationType,
    dailyLimit: number,
    monthlyLimit: number
  ): Promise<QuotaUsage> {
    const key = `${organizationId}:${integrationType}`;
    let quota = this.quotas.get(key);

    if (!quota) {
      return this.createQuota(organizationId, integrationType, dailyLimit, monthlyLimit);
    }

    quota.dailyLimit = dailyLimit;
    quota.monthlyLimit = monthlyLimit;
    quota.dailyRemaining = Math.max(0, dailyLimit - quota.dailyUsed);
    quota.monthlyRemaining = Math.max(0, monthlyLimit - quota.monthlyUsed);

    this.quotas.set(key, quota);
    this.eventEmitter.emit('ratelimit.quota.updated', { quota });
    return quota;
  }

  // Statistics
  async getStatistics(ruleId: string): Promise<RateLimitStatistics | null> {
    return this.statistics.get(ruleId) || null;
  }

  async getAllStatistics(): Promise<RateLimitStatistics[]> {
    return Array.from(this.statistics.values());
  }

  async getStatisticsSummary(): Promise<{
    totalRequests: number;
    blockedRequests: number;
    allowedRequests: number;
    overallBlockRate: number;
    activeRules: number;
    topBlockedRules: { ruleId: string; ruleName: string; blockedCount: number }[];
  }> {
    const stats = Array.from(this.statistics.values());
    const activeRules = Array.from(this.rules.values()).filter(r => r.isActive).length;

    const totalRequests = stats.reduce((sum, s) => sum + s.totalRequests, 0);
    const blockedRequests = stats.reduce((sum, s) => sum + s.blockedRequests, 0);
    const allowedRequests = stats.reduce((sum, s) => sum + s.allowedRequests, 0);

    const topBlockedRules = stats
      .sort((a, b) => b.blockedRequests - a.blockedRequests)
      .slice(0, 5)
      .map(s => ({
        ruleId: s.ruleId,
        ruleName: s.ruleName,
        blockedCount: s.blockedRequests,
      }));

    return {
      totalRequests,
      blockedRequests,
      allowedRequests,
      overallBlockRate: totalRequests > 0 ? (blockedRequests / totalRequests) * 100 : 0,
      activeRules,
      topBlockedRules,
    };
  }

  // State Management
  async getState(ruleId: string, key: string): Promise<RateLimitState | null> {
    const stateKey = `${ruleId}:${key}`;
    return this.states.get(stateKey) || null;
  }

  async resetState(ruleId: string, key: string): Promise<void> {
    const stateKey = `${ruleId}:${key}`;
    this.states.delete(stateKey);
    this.requestLogs.delete(stateKey);
    this.eventEmitter.emit('ratelimit.state.reset', { ruleId, key });
  }

  async resetAllStates(): Promise<number> {
    const count = this.states.size;
    this.states.clear();
    this.requestLogs.clear();
    this.eventEmitter.emit('ratelimit.states.reset', { count });
    return count;
  }

  // Enable/Disable rules
  async enableRule(ruleId: string): Promise<RateLimitRule> {
    return this.updateRule(ruleId, {} as any).then(async () => {
      const rule = this.rules.get(ruleId);
      if (rule) {
        rule.isActive = true;
        this.rules.set(ruleId, rule);
        this.eventEmitter.emit('ratelimit.rule.enabled', { rule });
      }
      return rule!;
    });
  }

  async disableRule(ruleId: string): Promise<RateLimitRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }
    rule.isActive = false;
    rule.updatedAt = new Date();
    this.rules.set(ruleId, rule);
    this.eventEmitter.emit('ratelimit.rule.disabled', { rule });
    return rule;
  }

  // Metadata
  async getStrategies(): Promise<{ strategy: RateLimitStrategy; name: string; nameRo: string; description: string; descriptionRo: string }[]> {
    return [
      {
        strategy: 'FIXED_WINDOW',
        name: 'Fixed Window',
        nameRo: 'Fereastră Fixă',
        description: 'Count requests in fixed time windows',
        descriptionRo: 'Numără cererile în ferestre de timp fixe',
      },
      {
        strategy: 'SLIDING_WINDOW',
        name: 'Sliding Window',
        nameRo: 'Fereastră Glisantă',
        description: 'Count requests in sliding time windows for smoother limiting',
        descriptionRo: 'Numără cererile în ferestre de timp glisante pentru limitare mai uniformă',
      },
      {
        strategy: 'TOKEN_BUCKET',
        name: 'Token Bucket',
        nameRo: 'Găleată cu Jetoane',
        description: 'Allow bursts while maintaining average rate',
        descriptionRo: 'Permite rafale menținând rata medie',
      },
      {
        strategy: 'LEAKY_BUCKET',
        name: 'Leaky Bucket',
        nameRo: 'Găleată cu Scurgere',
        description: 'Smooth traffic to constant output rate',
        descriptionRo: 'Netezește traficul la o rată de ieșire constantă',
      },
    ];
  }

  async getTargets(): Promise<{ target: RateLimitTarget; name: string; nameRo: string }[]> {
    return [
      { target: 'USER', name: 'User', nameRo: 'Utilizator' },
      { target: 'ORGANIZATION', name: 'Organization', nameRo: 'Organizație' },
      { target: 'IP_ADDRESS', name: 'IP Address', nameRo: 'Adresă IP' },
      { target: 'API_ENDPOINT', name: 'API Endpoint', nameRo: 'Endpoint API' },
      { target: 'INTEGRATION', name: 'Integration', nameRo: 'Integrare' },
    ];
  }

  async getIntegrationTypes(): Promise<{ type: IntegrationType; name: string; nameRo: string }[]> {
    return [
      { type: 'ANAF', name: 'ANAF', nameRo: 'ANAF' },
      { type: 'BANK', name: 'Bank', nameRo: 'Bancă' },
      { type: 'PAYMENT', name: 'Payment', nameRo: 'Plăți' },
      { type: 'EMAIL', name: 'Email', nameRo: 'Email' },
      { type: 'SMS', name: 'SMS', nameRo: 'SMS' },
      { type: 'COURIER', name: 'Courier', nameRo: 'Curierat' },
      { type: 'GENERAL', name: 'General', nameRo: 'General' },
    ];
  }

  // Exponential Backoff Helper
  calculateBackoff(attempt: number, baseMs: number = 1000, maxMs: number = 60000): number {
    const backoff = Math.min(maxMs, baseMs * Math.pow(2, attempt));
    // Add jitter (±10%)
    const jitter = backoff * 0.1 * (Math.random() * 2 - 1);
    return Math.floor(backoff + jitter);
  }

  // Retry helper with exponential backoff
  async withRateLimit<T>(
    organizationId: string,
    integrationType: IntegrationType,
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.consumeRateLimit('INTEGRATION', organizationId, { integrationType });

      if (result.allowed) {
        try {
          return await operation();
        } catch (error) {
          if (attempt === maxRetries) throw error;
          const backoffMs = this.calculateBackoff(attempt);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      } else {
        if (attempt === maxRetries) {
          throw new Error(`Rate limit exceeded for ${integrationType}`);
        }
        const waitMs = result.retryAfterMs || this.calculateBackoff(attempt);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }

    throw new Error(`Max retries exceeded for ${integrationType}`);
  }
}
