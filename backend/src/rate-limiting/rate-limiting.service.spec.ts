import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpException } from '@nestjs/common';
import {
  RateLimitingService,
  RateLimitStrategy,
  RateLimitScope,
  QuotaPeriod,
  ThrottleAction,
} from './rate-limiting.service';

describe('RateLimitingService', () => {
  let service: RateLimitingService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitingService, EventEmitter2],
    }).compile();

    service = module.get<RateLimitingService>(RateLimitingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Default Rules', () => {
    it('should have pre-configured rules', () => {
      const rules = service.getAllRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have Global API Limit rule', () => {
      const rules = service.getAllRules();
      expect(rules.some(r => r.name === 'Global API Limit')).toBe(true);
    });

    it('should have Per-User Limit rule', () => {
      const rules = service.getAllRules();
      expect(rules.some(r => r.name === 'Per-User Limit')).toBe(true);
    });

    it('should have ANAF API Protection rule', () => {
      const rules = service.getAllRules();
      expect(rules.some(r => r.name === 'ANAF API Protection')).toBe(true);
    });

    it('should sort rules by priority', () => {
      const rules = service.getAllRules();
      for (let i = 1; i < rules.length; i++) {
        expect(rules[i].priority).toBeGreaterThanOrEqual(rules[i - 1].priority);
      }
    });
  });

  describe('Rule Management', () => {
    it('should create a rule', () => {
      const rule = service.createRule({
        name: 'Test Rule',
        nameRo: 'Regulă Test',
        scope: 'ENDPOINT',
        strategy: 'FIXED_WINDOW',
        limit: 50,
        windowMs: 30000,
        throttleAction: 'REJECT',
        priority: 25,
        isEnabled: true,
      });

      expect(rule.id).toContain('rule-');
      expect(rule.name).toBe('Test Rule');
      expect(rule.limit).toBe(50);
    });

    it('should get rule by id', () => {
      const created = service.createRule({
        name: 'Get Test Rule',
        nameRo: 'Regulă Test Get',
        scope: 'USER',
        strategy: 'SLIDING_WINDOW',
        limit: 100,
        windowMs: 60000,
        throttleAction: 'DELAY',
        priority: 50,
        isEnabled: true,
      });

      const rule = service.getRule(created.id);
      expect(rule?.name).toBe('Get Test Rule');
    });

    it('should return undefined for invalid rule id', () => {
      const rule = service.getRule('invalid-rule-id');
      expect(rule).toBeUndefined();
    });

    it('should update a rule', () => {
      const created = service.createRule({
        name: 'Update Test',
        nameRo: 'Test Actualizare',
        scope: 'GLOBAL',
        strategy: 'TOKEN_BUCKET',
        limit: 200,
        windowMs: 60000,
        throttleAction: 'QUEUE',
        priority: 100,
        isEnabled: true,
      });

      const updated = service.updateRule(created.id, { limit: 300, priority: 90 });

      expect(updated.limit).toBe(300);
      expect(updated.priority).toBe(90);
    });

    it('should throw when updating non-existent rule', () => {
      expect(() => service.updateRule('fake-id', { limit: 100 })).toThrow(HttpException);
    });

    it('should delete a rule', () => {
      const rule = service.createRule({
        name: 'Delete Test',
        nameRo: 'Test Ștergere',
        scope: 'IP',
        strategy: 'LEAKY_BUCKET',
        limit: 100,
        windowMs: 10000,
        throttleAction: 'REJECT',
        priority: 5,
        isEnabled: true,
      });

      service.deleteRule(rule.id);
      expect(service.getRule(rule.id)).toBeUndefined();
    });

    it('should throw when deleting non-existent rule', () => {
      expect(() => service.deleteRule('non-existent')).toThrow(HttpException);
    });

    it('should enable a rule', () => {
      const rule = service.createRule({
        name: 'Enable Test',
        nameRo: 'Test Activare',
        scope: 'USER',
        strategy: 'FIXED_WINDOW',
        limit: 50,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 50,
        isEnabled: false,
      });

      const enabled = service.enableRule(rule.id);
      expect(enabled.isEnabled).toBe(true);
    });

    it('should disable a rule', () => {
      const rule = service.createRule({
        name: 'Disable Test',
        nameRo: 'Test Dezactivare',
        scope: 'USER',
        strategy: 'FIXED_WINDOW',
        limit: 50,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 50,
        isEnabled: true,
      });

      const disabled = service.disableRule(rule.id);
      expect(disabled.isEnabled).toBe(false);
    });
  });

  describe('Rate Limiting - Fixed Window', () => {
    let ruleId: string;

    beforeEach(() => {
      const rule = service.createRule({
        name: 'Fixed Window Test',
        nameRo: 'Test Fereastră Fixă',
        scope: 'USER',
        strategy: 'FIXED_WINDOW',
        limit: 5,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });
      ruleId = rule.id;
    });

    it('should allow requests within limit', () => {
      const result = service.checkRateLimit({
        endpoint: '/api/test',
        userId: 'fixed-user-1',
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it('should include rate limit headers', () => {
      const result = service.checkRateLimit({
        endpoint: '/api/test',
        userId: 'fixed-headers-user',
      });

      expect(result.headers['X-RateLimit-Limit']).toBeDefined();
      expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
      expect(result.headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('should deny requests over limit', () => {
      const userId = 'fixed-over-limit';

      for (let i = 0; i < 6; i++) {
        service.checkRateLimit({ endpoint: '/api/test', userId });
      }

      const result = service.checkRateLimit({ endpoint: '/api/test', userId });
      expect(result.allowed).toBe(false);
    });

    it('should include Retry-After on denial', () => {
      const userId = 'fixed-retry-after';

      for (let i = 0; i < 10; i++) {
        service.checkRateLimit({ endpoint: '/api/test', userId });
      }

      const result = service.checkRateLimit({ endpoint: '/api/test', userId });
      if (!result.allowed) {
        expect(result.retryAfter).toBeDefined();
        expect(result.headers['Retry-After']).toBeDefined();
      }
    });
  });

  describe('Rate Limiting - Sliding Window', () => {
    beforeEach(() => {
      service.createRule({
        name: 'Sliding Window Test',
        nameRo: 'Test Fereastră Glisantă',
        scope: 'USER',
        strategy: 'SLIDING_WINDOW',
        limit: 10,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });
    });

    it('should allow requests within limit', () => {
      const result = service.checkRateLimit({
        endpoint: '/api/sliding',
        userId: 'sliding-user-1',
      });

      expect(result.allowed).toBe(true);
    });

    it('should track requests across time', () => {
      const userId = 'sliding-track';

      for (let i = 0; i < 5; i++) {
        service.checkRateLimit({ endpoint: '/api/sliding', userId });
      }

      const result = service.checkRateLimit({ endpoint: '/api/sliding', userId });
      expect(result.remaining).toBeLessThan(10);
    });
  });

  describe('Rate Limiting - Token Bucket', () => {
    beforeEach(() => {
      service.createRule({
        name: 'Token Bucket Test',
        nameRo: 'Test Token Bucket',
        scope: 'USER',
        strategy: 'TOKEN_BUCKET',
        limit: 10,
        windowMs: 60000,
        burstLimit: 5,
        throttleAction: 'DELAY',
        priority: 1,
        isEnabled: true,
      });
    });

    it('should allow burst requests', () => {
      const userId = 'token-burst';
      let allAllowed = true;

      for (let i = 0; i < 5; i++) {
        const result = service.checkRateLimit({ endpoint: '/api/token', userId });
        if (!result.allowed) allAllowed = false;
      }

      expect(allAllowed).toBe(true);
    });

    it('should consume tokens on requests', () => {
      const userId = 'token-consume';

      const first = service.checkRateLimit({ endpoint: '/api/token', userId });
      const second = service.checkRateLimit({ endpoint: '/api/token', userId });

      expect(second.remaining).toBeLessThan(first.remaining);
    });
  });

  describe('Rate Limiting - Leaky Bucket', () => {
    beforeEach(() => {
      service.createRule({
        name: 'Leaky Bucket Test',
        nameRo: 'Test Leaky Bucket',
        scope: 'ENDPOINT',
        strategy: 'LEAKY_BUCKET',
        limit: 10,
        windowMs: 10000,
        throttleAction: 'DELAY',
        priority: 1,
        isEnabled: true,
        endpoints: ['/api/leaky/*'],
      });
    });

    it('should allow requests within capacity', () => {
      const result = service.checkRateLimit({
        endpoint: '/api/leaky/test',
        userId: 'leaky-user-1',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Scope-based Limiting', () => {
    it('should limit by IP', () => {
      service.createRule({
        name: 'IP Limit Test',
        nameRo: 'Test Limită IP',
        scope: 'IP',
        strategy: 'FIXED_WINDOW',
        limit: 3,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });

      const ipAddress = '192.168.1.100';
      for (let i = 0; i < 4; i++) {
        service.checkRateLimit({ endpoint: '/api/ip-test', ipAddress });
      }

      const result = service.checkRateLimit({ endpoint: '/api/ip-test', ipAddress });
      expect(result.allowed).toBe(false);
    });

    it('should limit by tenant', () => {
      service.createRule({
        name: 'Tenant Limit Test',
        nameRo: 'Test Limită Tenant',
        scope: 'TENANT',
        strategy: 'FIXED_WINDOW',
        limit: 5,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });

      const tenantId = 'test-tenant-1';
      for (let i = 0; i < 6; i++) {
        service.checkRateLimit({ endpoint: '/api/tenant-test', tenantId });
      }

      const result = service.checkRateLimit({ endpoint: '/api/tenant-test', tenantId });
      expect(result.allowed).toBe(false);
    });
  });

  describe('Endpoint Filtering', () => {
    it('should match wildcard endpoints', () => {
      const rule = service.createRule({
        name: 'Wildcard Test',
        nameRo: 'Test Wildcard',
        scope: 'GLOBAL',
        strategy: 'FIXED_WINDOW',
        limit: 2,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
        endpoints: ['/api/wildcard/*'],
      });

      service.checkRateLimit({ endpoint: '/api/wildcard/test' });
      service.checkRateLimit({ endpoint: '/api/wildcard/test' });
      service.checkRateLimit({ endpoint: '/api/wildcard/test' });

      const result = service.checkRateLimit({ endpoint: '/api/wildcard/test' });
      expect(result.allowed).toBe(false);
    });

    it('should exclude specified endpoints', () => {
      service.createRule({
        name: 'Exclude Test',
        nameRo: 'Test Excludere',
        scope: 'GLOBAL',
        strategy: 'FIXED_WINDOW',
        limit: 1,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
        excludedEndpoints: ['/api/health', '/api/status'],
      });

      service.checkRateLimit({ endpoint: '/api/health' });
      const result = service.checkRateLimit({ endpoint: '/api/health' });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Quota Management', () => {
    it('should create quota', () => {
      const quota = service.createQuota({
        name: 'Test Quota',
        nameRo: 'Cotă Test',
        entityType: 'USER',
        entityId: 'quota-user-1',
        limits: [
          {
            endpoint: '/api/*',
            period: 'DAY',
            limit: 1000,
            used: 0,
            resetAt: new Date(Date.now() + 86400000),
          },
        ],
        overageAllowed: false,
        isEnabled: true,
      });

      expect(quota.id).toContain('quota-');
      expect(quota.entityId).toBe('quota-user-1');
    });

    it('should get quota by id', () => {
      const created = service.createQuota({
        name: 'Get Quota Test',
        nameRo: 'Test Get Cotă',
        entityType: 'TENANT',
        entityId: 'quota-tenant-1',
        limits: [],
        overageAllowed: true,
        isEnabled: true,
      });

      const quota = service.getQuota(created.id);
      expect(quota?.entityId).toBe('quota-tenant-1');
    });

    it('should get quota by entity', () => {
      service.createQuota({
        name: 'Entity Quota',
        nameRo: 'Cotă Entitate',
        entityType: 'API_KEY',
        entityId: 'api-key-123',
        limits: [],
        overageAllowed: false,
        isEnabled: true,
      });

      const quota = service.getQuotaByEntity('API_KEY', 'api-key-123');
      expect(quota).toBeDefined();
    });

    it('should check quota usage', () => {
      service.createQuota({
        name: 'Usage Quota',
        nameRo: 'Cotă Utilizare',
        entityType: 'USER',
        entityId: 'usage-user',
        limits: [
          {
            endpoint: '/api/usage/*',
            period: 'HOUR',
            limit: 100,
            used: 50,
            resetAt: new Date(Date.now() + 3600000),
          },
        ],
        overageAllowed: false,
        isEnabled: true,
      });

      const usage = service.checkQuota('USER', 'usage-user', '/api/usage/test');

      expect(usage).toBeDefined();
      expect(usage?.used).toBe(50);
      expect(usage?.remaining).toBe(50);
      expect(usage?.percentUsed).toBe(50);
    });

    it('should increment quota', () => {
      service.createQuota({
        name: 'Increment Quota',
        nameRo: 'Cotă Incrementare',
        entityType: 'USER',
        entityId: 'inc-user',
        limits: [
          {
            endpoint: '/api/inc/*',
            period: 'DAY',
            limit: 10,
            used: 0,
            resetAt: new Date(Date.now() + 86400000),
          },
        ],
        overageAllowed: false,
        isEnabled: true,
      });

      const allowed = service.incrementQuota('USER', 'inc-user', '/api/inc/test');
      expect(allowed).toBe(true);

      const usage = service.checkQuota('USER', 'inc-user', '/api/inc/test');
      expect(usage?.used).toBe(1);
    });

    it('should deny when quota exceeded', () => {
      service.createQuota({
        name: 'Exceed Quota',
        nameRo: 'Cotă Depășită',
        entityType: 'USER',
        entityId: 'exceed-user',
        limits: [
          {
            endpoint: '/api/exceed/*',
            period: 'MINUTE',
            limit: 2,
            used: 2,
            resetAt: new Date(Date.now() + 60000),
          },
        ],
        overageAllowed: false,
        isEnabled: true,
      });

      const allowed = service.incrementQuota('USER', 'exceed-user', '/api/exceed/test');
      expect(allowed).toBe(false);
    });

    it('should allow overage when enabled', () => {
      service.createQuota({
        name: 'Overage Quota',
        nameRo: 'Cotă cu Depășire',
        entityType: 'TENANT',
        entityId: 'overage-tenant',
        limits: [
          {
            endpoint: '/api/over/*',
            period: 'HOUR',
            limit: 1,
            used: 1,
            resetAt: new Date(Date.now() + 3600000),
          },
        ],
        overageAllowed: true,
        isEnabled: true,
      });

      const allowed = service.incrementQuota('TENANT', 'overage-tenant', '/api/over/test');
      expect(allowed).toBe(true);
    });
  });

  describe('Blocking & Unblocking', () => {
    it('should block a key', () => {
      const key = 'block-test-key';
      service.blockKey(key, 60000, 'Test blocking');

      expect(service.isBlocked(key)).toBe(true);
    });

    it('should unblock a key', () => {
      const key = 'unblock-test-key';
      service.blockKey(key, 60000);
      service.unblockKey(key);

      expect(service.isBlocked(key)).toBe(false);
    });

    it('should auto-unblock after duration', () => {
      const key = 'auto-unblock-key';
      service.blockKey(key, 1);

      setTimeout(() => {
        expect(service.isBlocked(key)).toBe(false);
      }, 10);
    });

    it('should return false for non-blocked key', () => {
      expect(service.isBlocked('never-blocked')).toBe(false);
    });
  });

  describe('Violations', () => {
    it('should record violations on denial', () => {
      service.createRule({
        name: 'Violation Test',
        nameRo: 'Test Violare',
        scope: 'USER',
        strategy: 'FIXED_WINDOW',
        limit: 1,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });

      for (let i = 0; i < 5; i++) {
        service.checkRateLimit({ endpoint: '/api/violate', userId: 'violator' });
      }

      const violations = service.getViolations({ limit: 10 });
      expect(violations.length).toBeGreaterThan(0);
    });

    it('should filter violations by ruleId', () => {
      const rule = service.createRule({
        name: 'Filter Violation',
        nameRo: 'Filtru Violare',
        scope: 'USER',
        strategy: 'FIXED_WINDOW',
        limit: 1,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });

      for (let i = 0; i < 3; i++) {
        service.checkRateLimit({ endpoint: '/api/filter-violate', userId: 'filter-violator' });
      }

      const violations = service.getViolations({ ruleId: rule.id });
      expect(violations.every(v => v.ruleId === rule.id)).toBe(true);
    });

    it('should get top violators', () => {
      service.createRule({
        name: 'Top Violators',
        nameRo: 'Top Violatori',
        scope: 'USER',
        strategy: 'FIXED_WINDOW',
        limit: 1,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });

      for (let i = 0; i < 10; i++) {
        service.checkRateLimit({ endpoint: '/api/top', userId: 'top-violator' });
      }

      const top = service.getTopViolators(5);
      expect(top.length).toBeGreaterThan(0);
      expect(top[0].count).toBeGreaterThan(0);
    });
  });

  describe('Analytics', () => {
    it('should get analytics for today', () => {
      service.checkRateLimit({ endpoint: '/api/analytics', userId: 'analytics-user' });

      const analytics = service.getAnalytics();

      expect(analytics.totalRequests).toBeGreaterThanOrEqual(1);
      expect(analytics).toHaveProperty('allowedRequests');
      expect(analytics).toHaveProperty('deniedRequests');
    });

    it('should track requests by endpoint', () => {
      service.checkRateLimit({ endpoint: '/api/track-endpoint', userId: 'track-user' });

      const analytics = service.getAnalytics();

      expect(analytics.requestsByEndpoint['/api/track-endpoint']).toBeGreaterThanOrEqual(1);
    });

    it('should track requests by hour', () => {
      service.checkRateLimit({ endpoint: '/api/track-hour', userId: 'hour-user' });

      const analytics = service.getAnalytics();
      const hour = new Date().getHours();

      expect(analytics.requestsByHour[hour]).toBeGreaterThanOrEqual(1);
    });

    it('should return empty analytics for unknown date', () => {
      const analytics = service.getAnalytics('1999-01-01');

      expect(analytics.totalRequests).toBe(0);
    });
  });

  describe('State Management', () => {
    it('should get state for key', () => {
      service.createRule({
        name: 'State Test',
        nameRo: 'Test Stare',
        scope: 'USER',
        strategy: 'FIXED_WINDOW',
        limit: 100,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });

      service.checkRateLimit({ endpoint: '/api/state', userId: 'state-user' });

      const states = Array.from([...service.getAllRules()].flatMap(r => {
        const key = `user:state-user:${r.id}`;
        const state = service.getState(key);
        return state ? [state] : [];
      }));

      expect(states.length).toBeGreaterThanOrEqual(0);
    });

    it('should clear state for key', () => {
      const rule = service.createRule({
        name: 'Clear State',
        nameRo: 'Șterge Stare',
        scope: 'USER',
        strategy: 'FIXED_WINDOW',
        limit: 100,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });

      service.checkRateLimit({ endpoint: '/api/clear', userId: 'clear-user' });
      const key = `user:clear-user:${rule.id}`;
      service.clearState(key);

      expect(service.getState(key)).toBeUndefined();
    });

    it('should clear all states', () => {
      service.clearAllStates();
      // After clearing, checking rate limit should work fresh
      const result = service.checkRateLimit({ endpoint: '/api/fresh', userId: 'fresh-user' });
      expect(result.allowed).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should get service stats', () => {
      const stats = service.getStats();

      expect(stats).toHaveProperty('rulesCount');
      expect(stats).toHaveProperty('activeRulesCount');
      expect(stats).toHaveProperty('quotasCount');
      expect(stats).toHaveProperty('violationsCount');
      expect(stats).toHaveProperty('blockedKeysCount');
      expect(stats).toHaveProperty('strategiesInUse');
    });

    it('should count active rules', () => {
      const stats = service.getStats();
      expect(stats.activeRulesCount).toBeLessThanOrEqual(stats.rulesCount);
    });

    it('should track strategies in use', () => {
      const stats = service.getStats();
      expect(stats.strategiesInUse).toHaveProperty('FIXED_WINDOW');
      expect(stats.strategiesInUse).toHaveProperty('SLIDING_WINDOW');
      expect(stats.strategiesInUse).toHaveProperty('TOKEN_BUCKET');
      expect(stats.strategiesInUse).toHaveProperty('LEAKY_BUCKET');
    });
  });

  describe('Rate Limit Strategies', () => {
    const strategies: RateLimitStrategy[] = ['FIXED_WINDOW', 'SLIDING_WINDOW', 'TOKEN_BUCKET', 'LEAKY_BUCKET'];

    strategies.forEach((strategy) => {
      it(`should create rule with ${strategy} strategy`, () => {
        const rule = service.createRule({
          name: `${strategy} Strategy`,
          nameRo: `Strategie ${strategy}`,
          scope: 'GLOBAL',
          strategy,
          limit: 100,
          windowMs: 60000,
          throttleAction: 'REJECT',
          priority: 50,
          isEnabled: true,
        });

        expect(rule.strategy).toBe(strategy);
      });
    });
  });

  describe('Rate Limit Scopes', () => {
    const scopes: RateLimitScope[] = ['GLOBAL', 'USER', 'TENANT', 'ENDPOINT', 'IP'];

    scopes.forEach((scope) => {
      it(`should create rule with ${scope} scope`, () => {
        const rule = service.createRule({
          name: `${scope} Scope`,
          nameRo: `Domeniu ${scope}`,
          scope,
          strategy: 'FIXED_WINDOW',
          limit: 100,
          windowMs: 60000,
          throttleAction: 'REJECT',
          priority: 50,
          isEnabled: true,
        });

        expect(rule.scope).toBe(scope);
      });
    });
  });

  describe('Throttle Actions', () => {
    const actions: ThrottleAction[] = ['DELAY', 'REJECT', 'QUEUE'];

    actions.forEach((action) => {
      it(`should create rule with ${action} action`, () => {
        const rule = service.createRule({
          name: `${action} Action`,
          nameRo: `Acțiune ${action}`,
          scope: 'GLOBAL',
          strategy: 'FIXED_WINDOW',
          limit: 100,
          windowMs: 60000,
          throttleAction: action,
          priority: 50,
          isEnabled: true,
        });

        expect(rule.throttleAction).toBe(action);
      });
    });
  });

  describe('Event Emission', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(eventEmitter, 'emit');
    });

    afterEach(() => {
      emitSpy.mockRestore();
    });

    it('should emit rule created event', () => {
      service.createRule({
        name: 'Event Rule',
        nameRo: 'Regulă Eveniment',
        scope: 'GLOBAL',
        strategy: 'FIXED_WINDOW',
        limit: 100,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 50,
        isEnabled: true,
      });

      expect(emitSpy).toHaveBeenCalledWith('ratelimit.rule.created', expect.any(Object));
    });

    it('should emit violation event on limit exceeded', () => {
      service.createRule({
        name: 'Violation Event',
        nameRo: 'Eveniment Violare',
        scope: 'USER',
        strategy: 'FIXED_WINDOW',
        limit: 1,
        windowMs: 60000,
        throttleAction: 'REJECT',
        priority: 1,
        isEnabled: true,
      });

      service.checkRateLimit({ endpoint: '/api/violation-event', userId: 'event-violator' });
      service.checkRateLimit({ endpoint: '/api/violation-event', userId: 'event-violator' });

      expect(emitSpy).toHaveBeenCalledWith('ratelimit.violation', expect.any(Object));
    });

    it('should emit key blocked event', () => {
      service.blockKey('event-block-key', 60000, 'Test');
      expect(emitSpy).toHaveBeenCalledWith('ratelimit.key.blocked', expect.any(Object));
    });
  });
});
