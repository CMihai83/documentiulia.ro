import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RateLimiterService,
  RateLimitStrategy,
  RateLimitTarget,
  IntegrationType,
  CreateRuleDto,
} from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const createDto: CreateRuleDto = {
    name: 'Test Rule',
    nameRo: 'Regulă Test',
    description: 'Test rate limit rule',
    descriptionRo: 'Regulă de limită pentru test',
    target: 'USER',
    strategy: 'FIXED_WINDOW',
    maxRequests: 10,
    windowMs: 60000,
    retryAfterMs: 5000,
  };

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Rule Management', () => {
    it('should initialize with default rules', async () => {
      const rules = await service.getRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.name === 'ANAF API Limit')).toBe(true);
    });

    it('should create a new rule', async () => {
      const rule = await service.createRule(createDto);

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Test Rule');
      expect(rule.nameRo).toBe('Regulă Test');
      expect(rule.target).toBe('USER');
      expect(rule.strategy).toBe('FIXED_WINDOW');
      expect(rule.maxRequests).toBe(10);
      expect(rule.isActive).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.rule.created', expect.any(Object));
    });

    it('should update a rule', async () => {
      const rule = await service.createRule(createDto);
      const updated = await service.updateRule(rule.id, { maxRequests: 20 });

      expect(updated.maxRequests).toBe(20);
      expect(updated.name).toBe('Test Rule');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.rule.updated', expect.any(Object));
    });

    it('should delete a rule', async () => {
      const rule = await service.createRule(createDto);
      await service.deleteRule(rule.id);

      const found = await service.getRule(rule.id);
      expect(found).toBeNull();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.rule.deleted', expect.any(Object));
    });

    it('should throw when updating non-existent rule', async () => {
      await expect(service.updateRule('non-existent', { maxRequests: 20 }))
        .rejects.toThrow('Rule not found');
    });

    it('should throw when deleting non-existent rule', async () => {
      await expect(service.deleteRule('non-existent'))
        .rejects.toThrow('Rule not found');
    });

    it('should get rule by ID', async () => {
      const rule = await service.createRule(createDto);
      const found = await service.getRule(rule.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(rule.id);
    });

    it('should return null for non-existent rule', async () => {
      const found = await service.getRule('non-existent');
      expect(found).toBeNull();
    });

    it('should get rules by target', async () => {
      const rules = await service.getRulesByTarget('USER');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.every(r => r.target === 'USER')).toBe(true);
    });

    it('should get rule by integration type', async () => {
      const rule = await service.getRuleByIntegration('ANAF');

      expect(rule).not.toBeNull();
      expect(rule!.integrationType).toBe('ANAF');
    });

    it('should get rule by endpoint', async () => {
      const rule = await service.getRuleByEndpoint('/auth/login');

      expect(rule).not.toBeNull();
      expect(rule!.endpoint).toBe('/auth/login');
    });
  });

  describe('Fixed Window Strategy', () => {
    it('should allow requests within limit', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'FIXED_WINDOW',
        maxRequests: 5,
        windowMs: 60000,
      });

      for (let i = 0; i < 5; i++) {
        const result = await service.checkRateLimit(rule.id, 'user-1');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests exceeding limit', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'FIXED_WINDOW',
        maxRequests: 3,
        windowMs: 60000,
      });

      // Consume all requests
      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit(rule.id, 'user-1');
      }

      const result = await service.checkRateLimit(rule.id, 'user-1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeDefined();
    });

    it('should emit event when blocked', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'FIXED_WINDOW',
        maxRequests: 1,
        windowMs: 60000,
      });

      await service.checkRateLimit(rule.id, 'user-1');
      await service.checkRateLimit(rule.id, 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.blocked', expect.any(Object));
    });

    it('should track different keys separately', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'FIXED_WINDOW',
        maxRequests: 2,
        windowMs: 60000,
      });

      // Exhaust limit for user-1
      await service.checkRateLimit(rule.id, 'user-1');
      await service.checkRateLimit(rule.id, 'user-1');
      const blockedResult = await service.checkRateLimit(rule.id, 'user-1');

      // user-2 should still have full limit
      const user2Result = await service.checkRateLimit(rule.id, 'user-2');

      expect(blockedResult.allowed).toBe(false);
      expect(user2Result.allowed).toBe(true);
      expect(user2Result.remaining).toBe(1);
    });
  });

  describe('Sliding Window Strategy', () => {
    it('should allow requests within limit', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'SLIDING_WINDOW',
        maxRequests: 5,
        windowMs: 60000,
      });

      for (let i = 0; i < 5; i++) {
        const result = await service.checkRateLimit(rule.id, 'user-1');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block requests exceeding limit', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'SLIDING_WINDOW',
        maxRequests: 3,
        windowMs: 60000,
      });

      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit(rule.id, 'user-1');
      }

      const result = await service.checkRateLimit(rule.id, 'user-1');
      expect(result.allowed).toBe(false);
    });

    it('should enforce burst limit', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'SLIDING_WINDOW',
        maxRequests: 100,
        windowMs: 60000,
        burstLimit: 3,
      });

      // Make rapid requests to hit burst limit
      const results: boolean[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await service.checkRateLimit(rule.id, 'user-1');
        results.push(result.allowed);
      }

      // Should hit burst limit
      expect(results.filter(r => !r).length).toBeGreaterThan(0);
    });
  });

  describe('Token Bucket Strategy', () => {
    it('should allow requests when tokens available', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'TOKEN_BUCKET',
        maxRequests: 10,
        windowMs: 1000,
        tokensPerInterval: 10,
        intervalMs: 1000,
      });

      const result = await service.checkRateLimit(rule.id, 'user-1');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(10);
    });

    it('should block when no tokens', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'TOKEN_BUCKET',
        maxRequests: 3,
        windowMs: 60000,
        tokensPerInterval: 1,
        intervalMs: 60000,
      });

      // Consume all tokens
      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit(rule.id, 'user-1');
      }

      const result = await service.checkRateLimit(rule.id, 'user-1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Leaky Bucket Strategy', () => {
    it('should allow requests within burst limit', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'LEAKY_BUCKET',
        maxRequests: 100,
        windowMs: 60000,
        burstLimit: 10,
      });

      for (let i = 0; i < 5; i++) {
        const result = await service.checkRateLimit(rule.id, 'user-1');
        expect(result.allowed).toBe(true);
      }
    });

    it('should block when burst limit exceeded', async () => {
      const rule = await service.createRule({
        ...createDto,
        strategy: 'LEAKY_BUCKET',
        maxRequests: 100,
        windowMs: 60000,
        burstLimit: 3,
      });

      // Fill bucket
      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit(rule.id, 'user-1');
      }

      const result = await service.checkRateLimit(rule.id, 'user-1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Convenience Methods', () => {
    it('should check user limit', async () => {
      const result = await service.checkUserLimit('user-1');
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('limit');
    });

    it('should check organization limit', async () => {
      const result = await service.checkOrganizationLimit('org-1');
      expect(result).toHaveProperty('allowed');
    });

    it('should check IP limit', async () => {
      const result = await service.checkIpLimit('192.168.1.1');
      expect(result).toHaveProperty('allowed');
    });

    it('should check endpoint limit', async () => {
      const result = await service.checkEndpointLimit('/auth/login', 'user-1');
      expect(result).toHaveProperty('allowed');
    });

    it('should check ANAF limit', async () => {
      const result = await service.checkANAFLimit('org-1');
      expect(result).toHaveProperty('allowed');
      expect(result.rule.integrationType).toBe('ANAF');
    });

    it('should check payment limit', async () => {
      const result = await service.checkPaymentLimit('org-1');
      expect(result).toHaveProperty('allowed');
    });

    it('should check email limit', async () => {
      const result = await service.checkEmailLimit('org-1');
      expect(result).toHaveProperty('allowed');
    });

    it('should check login limit', async () => {
      const result = await service.checkLoginLimit('192.168.1.1');
      expect(result).toHaveProperty('allowed');
    });
  });

  describe('Quota Management', () => {
    it('should create quota', async () => {
      const quota = await service.createQuota('org-1', 'ANAF', 100, 3000);

      expect(quota.id).toBeDefined();
      expect(quota.organizationId).toBe('org-1');
      expect(quota.integrationType).toBe('ANAF');
      expect(quota.dailyLimit).toBe(100);
      expect(quota.monthlyLimit).toBe(3000);
      expect(quota.dailyUsed).toBe(0);
      expect(quota.monthlyUsed).toBe(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.quota.created', expect.any(Object));
    });

    it('should have Romanian name for quota', async () => {
      const quota = await service.createQuota('org-1', 'ANAF', 100, 3000);

      expect(quota.nameRo).toBe('Cotă API ANAF');
    });

    it('should consume quota', async () => {
      await service.createQuota('org-1', 'EMAIL', 100, 3000);

      const result = await service.consumeQuota('org-1', 'EMAIL', 5);

      expect(result.allowed).toBe(true);
      expect(result.quota.dailyUsed).toBe(5);
      expect(result.quota.monthlyUsed).toBe(5);
      expect(result.quota.dailyRemaining).toBe(95);
    });

    it('should block when daily quota exceeded', async () => {
      await service.createQuota('org-1', 'SMS', 10, 1000);

      // Consume all daily quota
      await service.consumeQuota('org-1', 'SMS', 10);

      const result = await service.consumeQuota('org-1', 'SMS', 1);

      expect(result.allowed).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.quota.exceeded', expect.any(Object));
    });

    it('should block when monthly quota exceeded', async () => {
      await service.createQuota('org-1', 'COURIER', 1000, 10);

      // Consume all monthly quota
      await service.consumeQuota('org-1', 'COURIER', 10);

      const result = await service.consumeQuota('org-1', 'COURIER', 1);

      expect(result.allowed).toBe(false);
    });

    it('should get quota', async () => {
      await service.createQuota('org-1', 'BANK', 50, 1500);

      const quota = await service.getQuota('org-1', 'BANK');

      expect(quota).not.toBeNull();
      expect(quota!.integrationType).toBe('BANK');
    });

    it('should get organization quotas', async () => {
      await service.createQuota('org-1', 'ANAF', 100, 3000);
      await service.createQuota('org-1', 'EMAIL', 200, 6000);

      const quotas = await service.getOrganizationQuotas('org-1');

      expect(quotas.length).toBe(2);
    });

    it('should update quota limits', async () => {
      await service.createQuota('org-1', 'PAYMENT', 100, 3000);

      const updated = await service.updateQuotaLimits('org-1', 'PAYMENT', 200, 6000);

      expect(updated.dailyLimit).toBe(200);
      expect(updated.monthlyLimit).toBe(6000);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.quota.updated', expect.any(Object));
    });

    it('should create quota if not exists when updating', async () => {
      const quota = await service.updateQuotaLimits('org-2', 'GENERAL', 500, 15000);

      expect(quota.organizationId).toBe('org-2');
      expect(quota.dailyLimit).toBe(500);
    });
  });

  describe('Statistics', () => {
    it('should track request statistics', async () => {
      const rule = await service.createRule({
        ...createDto,
        maxRequests: 5,
      });

      // Make some requests
      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit(rule.id, 'user-1');
      }

      const stats = await service.getStatistics(rule.id);

      expect(stats).not.toBeNull();
      expect(stats!.totalRequests).toBe(3);
      expect(stats!.allowedRequests).toBe(3);
    });

    it('should track blocked requests', async () => {
      const rule = await service.createRule({
        ...createDto,
        maxRequests: 2,
      });

      // Exhaust and block
      for (let i = 0; i < 4; i++) {
        await service.checkRateLimit(rule.id, 'user-1');
      }

      const stats = await service.getStatistics(rule.id);

      expect(stats!.blockedRequests).toBe(2);
      expect(stats!.blockRate).toBe(50);
    });

    it('should get all statistics', async () => {
      const rule1 = await service.createRule({ ...createDto, name: 'Rule 1', nameRo: 'Regulă 1' });
      const rule2 = await service.createRule({ ...createDto, name: 'Rule 2', nameRo: 'Regulă 2' });

      await service.checkRateLimit(rule1.id, 'user-1');
      await service.checkRateLimit(rule2.id, 'user-1');

      const allStats = await service.getAllStatistics();

      expect(allStats.length).toBeGreaterThanOrEqual(2);
    });

    it('should get statistics summary', async () => {
      const rule = await service.createRule({
        ...createDto,
        maxRequests: 5,
      });

      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit(rule.id, 'user-1');
      }

      const summary = await service.getStatisticsSummary();

      expect(summary.totalRequests).toBeGreaterThanOrEqual(3);
      expect(summary.activeRules).toBeGreaterThan(0);
      expect(summary).toHaveProperty('topBlockedRules');
    });
  });

  describe('State Management', () => {
    it('should get state', async () => {
      const rule = await service.createRule(createDto);
      await service.checkRateLimit(rule.id, 'user-1');

      const state = await service.getState(rule.id, 'user-1');

      expect(state).not.toBeNull();
      expect(state!.key).toBe('user-1');
    });

    it('should reset state', async () => {
      const rule = await service.createRule(createDto);
      await service.checkRateLimit(rule.id, 'user-1');
      await service.resetState(rule.id, 'user-1');

      const state = await service.getState(rule.id, 'user-1');

      expect(state).toBeNull();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.state.reset', expect.any(Object));
    });

    it('should reset all states', async () => {
      const rule = await service.createRule(createDto);
      await service.checkRateLimit(rule.id, 'user-1');
      await service.checkRateLimit(rule.id, 'user-2');

      const count = await service.resetAllStates();

      expect(count).toBeGreaterThanOrEqual(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.states.reset', expect.any(Object));
    });
  });

  describe('Enable/Disable Rules', () => {
    it('should disable rule', async () => {
      const rule = await service.createRule(createDto);
      const disabled = await service.disableRule(rule.id);

      expect(disabled.isActive).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ratelimit.rule.disabled', expect.any(Object));
    });

    it('should allow all requests when rule disabled', async () => {
      const rule = await service.createRule({
        ...createDto,
        maxRequests: 1,
      });

      await service.disableRule(rule.id);

      // Should allow even though limit is 1
      const result1 = await service.checkRateLimit(rule.id, 'user-1');
      const result2 = await service.checkRateLimit(rule.id, 'user-1');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should throw when disabling non-existent rule', async () => {
      await expect(service.disableRule('non-existent'))
        .rejects.toThrow('Rule not found');
    });
  });

  describe('Metadata', () => {
    it('should get all strategies', async () => {
      const strategies = await service.getStrategies();

      expect(strategies.length).toBe(4);
      expect(strategies.map(s => s.strategy)).toContain('FIXED_WINDOW');
      expect(strategies.map(s => s.strategy)).toContain('SLIDING_WINDOW');
      expect(strategies.map(s => s.strategy)).toContain('TOKEN_BUCKET');
      expect(strategies.map(s => s.strategy)).toContain('LEAKY_BUCKET');
    });

    it('should have Romanian names for strategies', async () => {
      const strategies = await service.getStrategies();

      expect(strategies.every(s => s.nameRo && s.nameRo.length > 0)).toBe(true);
      expect(strategies.find(s => s.strategy === 'TOKEN_BUCKET')?.nameRo).toBe('Găleată cu Jetoane');
    });

    it('should get all targets', async () => {
      const targets = await service.getTargets();

      expect(targets.length).toBe(5);
      expect(targets.map(t => t.target)).toContain('USER');
      expect(targets.map(t => t.target)).toContain('ORGANIZATION');
    });

    it('should have Romanian names for targets', async () => {
      const targets = await service.getTargets();

      expect(targets.every(t => t.nameRo && t.nameRo.length > 0)).toBe(true);
      expect(targets.find(t => t.target === 'ORGANIZATION')?.nameRo).toBe('Organizație');
    });

    it('should get all integration types', async () => {
      const types = await service.getIntegrationTypes();

      expect(types.length).toBe(7);
      expect(types.map(t => t.type)).toContain('ANAF');
      expect(types.map(t => t.type)).toContain('PAYMENT');
    });

    it('should have Romanian names for integration types', async () => {
      const types = await service.getIntegrationTypes();

      expect(types.every(t => t.nameRo && t.nameRo.length > 0)).toBe(true);
      expect(types.find(t => t.type === 'COURIER')?.nameRo).toBe('Curierat');
    });
  });

  describe('Romanian Localization', () => {
    it('should use Romanian diacritics correctly', async () => {
      const strategies = await service.getStrategies();
      const targets = await service.getTargets();
      const integrations = await service.getIntegrationTypes();

      // Check for diacritics in strategies (ă in Glisantă, Găleată)
      expect(strategies.some(s => s.nameRo.includes('ă'))).toBe(true);
      // Check for diacritics in targets (ț in Organizație)
      expect(targets.some(t => t.nameRo.includes('ț'))).toBe(true);
      // Check for diacritics in integrations (ă in Bancă, Plăți)
      expect(integrations.some(i => i.nameRo.includes('ă'))).toBe(true);
    });

    it('should have Romanian descriptions for default rules', async () => {
      const rules = await service.getRules();
      const anafRule = rules.find(r => r.name === 'ANAF API Limit');

      expect(anafRule).toBeDefined();
      expect(anafRule!.descriptionRo).toContain('ANAF');
      expect(anafRule!.nameRo).toBe('Limită API ANAF');
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate backoff with exponential growth', () => {
      const backoff0 = service.calculateBackoff(0, 1000, 60000);
      const backoff1 = service.calculateBackoff(1, 1000, 60000);
      const backoff2 = service.calculateBackoff(2, 1000, 60000);

      // Approximate checks due to jitter
      expect(backoff0).toBeGreaterThanOrEqual(900);
      expect(backoff0).toBeLessThanOrEqual(1100);
      expect(backoff1).toBeGreaterThanOrEqual(1800);
      expect(backoff1).toBeLessThanOrEqual(2200);
      expect(backoff2).toBeGreaterThanOrEqual(3600);
      expect(backoff2).toBeLessThanOrEqual(4400);
    });

    it('should respect max backoff', () => {
      const backoff = service.calculateBackoff(10, 1000, 5000);

      expect(backoff).toBeLessThanOrEqual(5500); // max + jitter
    });
  });

  describe('ANAF Compliance', () => {
    it('should have ANAF rate limit of 10 requests/second', async () => {
      const rule = await service.getRuleByIntegration('ANAF');

      expect(rule).not.toBeNull();
      expect(rule!.maxRequests).toBe(10);
      expect(rule!.windowMs).toBe(1000);
    });

    it('should enforce ANAF rate limit', async () => {
      const rule = await service.getRuleByIntegration('ANAF');
      const uniqueKey = `org-anaf-test-${Date.now()}-${Math.random()}`;

      // Make 10 requests (should all pass)
      for (let i = 0; i < 10; i++) {
        const result = await service.checkRateLimit(rule!.id, uniqueKey);
        expect(result.allowed).toBe(true);
      }

      // 11th request should be blocked
      const blocked = await service.checkRateLimit(rule!.id, uniqueKey);
      expect(blocked.allowed).toBe(false);
    });

    it('should have retry-after for ANAF limit', async () => {
      const rule = await service.getRuleByIntegration('ANAF');

      expect(rule!.retryAfterMs).toBeDefined();
      expect(rule!.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe('Security Features', () => {
    it('should limit login attempts', async () => {
      const rule = await service.getRuleByEndpoint('/auth/login');

      expect(rule).not.toBeNull();
      expect(rule!.maxRequests).toBeLessThanOrEqual(10);
    });

    it('should limit password reset attempts', async () => {
      const rule = await service.getRuleByEndpoint('/auth/reset-password');

      expect(rule).not.toBeNull();
      expect(rule!.maxRequests).toBeLessThanOrEqual(5);
    });

    it('should have IP-based rate limiting for DDoS protection', async () => {
      const rules = await service.getRulesByTarget('IP_ADDRESS');

      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].strategy).toBe('LEAKY_BUCKET');
    });
  });

  describe('Blocking Behavior', () => {
    it('should remain blocked until retry-after expires', async () => {
      const rule = await service.createRule({
        ...createDto,
        maxRequests: 1,
        retryAfterMs: 5000,
      });

      // Exhaust limit and get blocked
      await service.checkRateLimit(rule.id, 'user-1');
      const blocked = await service.checkRateLimit(rule.id, 'user-1');

      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterMs).toBe(5000);

      // Immediate retry should also be blocked
      const stillBlocked = await service.checkRateLimit(rule.id, 'user-1');
      expect(stillBlocked.allowed).toBe(false);
    });

    it('should include resetAt in response', async () => {
      const rule = await service.createRule(createDto);
      const result = await service.checkRateLimit(rule.id, 'user-1');

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Default Rule Behavior', () => {
    it('should return default result when no matching rule', async () => {
      const result = await service.consumeRateLimit('USER', 'unknown-user-type');

      expect(result.allowed).toBe(true);
    });
  });
});
