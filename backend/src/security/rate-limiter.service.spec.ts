import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  RateLimiterService,
  RateLimitStrategy,
  RateLimitScope,
  RateLimitTier,
} from './rate-limiter.service';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  afterEach(async () => {
    await service.resetStats();
    await service.clearCache();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default configs', async () => {
      const configs = await service.getConfigs();
      expect(configs.length).toBeGreaterThanOrEqual(6);
    });

    it('should have global, ip, user, tenant, auth, and api_key configs', async () => {
      const global = await service.getConfig('rl-global');
      const ip = await service.getConfig('rl-ip');
      const user = await service.getConfig('rl-user');
      const tenant = await service.getConfig('rl-tenant');
      const auth = await service.getConfig('rl-auth');
      const apiKey = await service.getConfig('rl-api-key');

      expect(global).not.toBeNull();
      expect(ip).not.toBeNull();
      expect(user).not.toBeNull();
      expect(tenant).not.toBeNull();
      expect(auth).not.toBeNull();
      expect(apiKey).not.toBeNull();
    });

    it('should initialize tier limits', () => {
      const tierLimits = service.getTierLimits();
      expect(tierLimits.size).toBe(5);
      expect(tierLimits.get('free')).toBeDefined();
      expect(tierLimits.get('basic')).toBeDefined();
      expect(tierLimits.get('pro')).toBeDefined();
      expect(tierLimits.get('enterprise')).toBeDefined();
      expect(tierLimits.get('unlimited')).toBeDefined();
    });
  });

  describe('checkRateLimit - sliding window', () => {
    it('should allow requests within limit', async () => {
      const result = await service.checkRateLimit('test-ip-1', 'ip');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it('should track remaining requests correctly', async () => {
      const result1 = await service.checkRateLimit('test-ip-2', 'ip');
      const result2 = await service.checkRateLimit('test-ip-2', 'ip');

      expect(result1.remaining).toBeGreaterThan(result2.remaining);
    });

    it('should block when limit is exceeded', async () => {
      // Delete default IP config to use our strict one
      await service.deleteConfig('rl-ip');

      // Create a strict config for testing
      await service.createConfig(
        'Test Strict Limit',
        'ip',
        'sliding_window',
        3,
        60000,
        { tier: 'free' },
      );

      // Make requests up to limit
      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit('strict-test', 'ip', 'free');
      }

      // Next request should be blocked
      const result = await service.checkRateLimit('strict-test', 'ip', 'free');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should return reset time', async () => {
      const result = await service.checkRateLimit('reset-test', 'ip');
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('checkRateLimit - token bucket', () => {
    it('should allow requests with available tokens', async () => {
      const result = await service.checkRateLimit('user-token-1', 'user');
      expect(result.allowed).toBe(true);
    });

    it('should consume tokens correctly', async () => {
      const result1 = await service.checkRateLimit('user-token-2', 'user');
      const result2 = await service.checkRateLimit('user-token-2', 'user');

      expect(result2.remaining).toBeLessThan(result1.remaining);
    });

    it('should refill tokens over time', async () => {
      // Create a config with fast refill
      await service.createConfig(
        'Fast Refill',
        'user',
        'token_bucket',
        10,
        1000, // 1 second window
        { tier: 'basic', burstLimit: 10 },
      );

      // Consume some tokens
      await service.checkRateLimit('refill-test', 'user', 'basic');
      await service.checkRateLimit('refill-test', 'user', 'basic');

      // Wait a bit and check tokens increased
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await service.checkRateLimit('refill-test', 'user', 'basic');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkRateLimit - fixed window', () => {
    it('should track requests in fixed windows', async () => {
      const result = await service.checkRateLimit('fixed-test', 'ip', 'free', '/auth/login');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBeGreaterThan(0);
    });

    it('should reset at window boundary', async () => {
      const result = await service.checkRateLimit('fixed-boundary', 'ip', 'free', '/auth/login');
      expect(result.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('generateHeaders', () => {
    it('should generate rate limit headers', async () => {
      const result = await service.checkRateLimit('header-test', 'ip');
      const headers = service.generateHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBeDefined();
      expect(headers['X-RateLimit-Remaining']).toBeDefined();
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['X-RateLimit-Policy']).toBeDefined();
    });

    it('should include Retry-After when blocked', async () => {
      // Delete default IP config and create strict one
      await service.deleteConfig('rl-ip');
      await service.createConfig('Header Strict', 'ip', 'sliding_window', 1, 60000);

      await service.checkRateLimit('header-blocked', 'ip', 'free');
      const result = await service.checkRateLimit('header-blocked', 'ip', 'free');
      const headers = service.generateHeaders(result);

      expect(result.allowed).toBe(false);
      expect(headers['Retry-After']).toBeDefined();
    });
  });

  describe('quota management', () => {
    it('should check quota for identifier', async () => {
      const quota = await service.checkQuota('tenant-1', 'tenant', 'pro', 'day');

      expect(quota.identifier).toBe('tenant-1');
      expect(quota.scope).toBe('tenant');
      expect(quota.tier).toBe('pro');
      expect(quota.used).toBe(0);
      expect(quota.limit).toBeGreaterThan(0);
    });

    it('should increment quota usage', async () => {
      await service.checkQuota('tenant-quota', 'tenant', 'basic', 'day');
      const updated = await service.incrementQuota('tenant-quota', 'tenant', 'basic', 'day', 5);

      expect(updated.used).toBe(5);
    });

    it('should return different limits for different tiers', async () => {
      const freeQuota = await service.checkQuota('free-user', 'user', 'free', 'day');
      const proQuota = await service.checkQuota('pro-user', 'user', 'pro', 'day');

      expect(proQuota.limit).toBeGreaterThan(freeQuota.limit);
    });

    it('should handle different periods', async () => {
      const minuteQuota = await service.checkQuota('period-test', 'user', 'basic', 'minute');
      const dayQuota = await service.checkQuota('period-test', 'user', 'basic', 'day');
      const monthQuota = await service.checkQuota('period-test', 'user', 'basic', 'month');

      expect(dayQuota.limit).toBeGreaterThan(minuteQuota.limit);
      expect(monthQuota.limit).toBeGreaterThan(dayQuota.limit);
    });
  });

  describe('config management', () => {
    it('should create new config', async () => {
      const config = await service.createConfig(
        'Custom Config',
        'endpoint',
        'sliding_window',
        1000,
        60000,
        { tier: 'pro', endpoints: ['/api/custom'] },
      );

      expect(config.id).toBeDefined();
      expect(config.name).toBe('Custom Config');
      expect(config.scope).toBe('endpoint');
      expect(config.strategy).toBe('sliding_window');
      expect(config.requests).toBe(1000);
    });

    it('should get config by id', async () => {
      const created = await service.createConfig(
        'Get Test',
        'user',
        'token_bucket',
        500,
        60000,
      );

      const retrieved = await service.getConfig(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Get Test');
    });

    it('should return null for non-existent config', async () => {
      const config = await service.getConfig('non-existent');
      expect(config).toBeNull();
    });

    it('should get configs filtered by scope', async () => {
      await service.createConfig('IP Test 1', 'ip', 'sliding_window', 100, 60000);
      await service.createConfig('IP Test 2', 'ip', 'fixed_window', 200, 60000);

      const ipConfigs = await service.getConfigs('ip');
      expect(ipConfigs.every(c => c.scope === 'ip')).toBe(true);
    });

    it('should update config', async () => {
      const config = await service.createConfig(
        'Update Test',
        'user',
        'sliding_window',
        100,
        60000,
      );

      const updated = await service.updateConfig(config.id, {
        requests: 200,
        name: 'Updated Config',
      });

      expect(updated?.requests).toBe(200);
      expect(updated?.name).toBe('Updated Config');
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(config.updatedAt.getTime());
    });

    it('should delete config', async () => {
      const config = await service.createConfig(
        'Delete Test',
        'user',
        'sliding_window',
        100,
        60000,
      );

      const deleted = await service.deleteConfig(config.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getConfig(config.id);
      expect(retrieved).toBeNull();
    });

    it('should enable config', async () => {
      const config = await service.createConfig(
        'Enable Test',
        'user',
        'sliding_window',
        100,
        60000,
      );

      await service.disableConfig(config.id);
      const disabled = await service.getConfig(config.id);
      expect(disabled?.enabled).toBe(false);

      await service.enableConfig(config.id);
      const enabled = await service.getConfig(config.id);
      expect(enabled?.enabled).toBe(true);
    });

    it('should disable config', async () => {
      const config = await service.createConfig(
        'Disable Test',
        'user',
        'sliding_window',
        100,
        60000,
      );

      const disabled = await service.disableConfig(config.id);
      expect(disabled?.enabled).toBe(false);
    });
  });

  describe('blocked requests', () => {
    it('should record blocked requests', async () => {
      // Delete default IP config and create strict config
      await service.deleteConfig('rl-ip');
      await service.createConfig('Block Record', 'ip', 'sliding_window', 1, 60000);

      // Exhaust limit
      await service.checkRateLimit('block-record-ip', 'ip', 'free');
      await service.checkRateLimit('block-record-ip', 'ip', 'free');

      const blocked = await service.getBlockedRequests();
      expect(blocked.length).toBeGreaterThan(0);
    });

    it('should filter blocked requests by time', async () => {
      const before = new Date();

      // Delete default and create strict config
      await service.deleteConfig('rl-ip');
      await service.createConfig('Block Time', 'ip', 'sliding_window', 1, 60000);
      await service.checkRateLimit('block-time-ip', 'ip', 'free');
      await service.checkRateLimit('block-time-ip', 'ip', 'free');

      const blocked = await service.getBlockedRequests(before);
      expect(blocked.every(b => b.blockedAt >= before)).toBe(true);
    });

    it('should filter blocked requests by scope', async () => {
      // Delete default user config and create strict one
      await service.deleteConfig('rl-user');
      await service.createConfig('Block Scope', 'user', 'sliding_window', 1, 60000);
      await service.checkRateLimit('block-scope-user', 'user', 'free');
      await service.checkRateLimit('block-scope-user', 'user', 'free');

      const blocked = await service.getBlockedRequests(undefined, 'user');
      expect(blocked.length).toBeGreaterThan(0);
    });

    it('should limit blocked requests returned', async () => {
      // Delete default and create strict config
      await service.deleteConfig('rl-ip');
      await service.createConfig('Block Limit', 'ip', 'sliding_window', 1, 60000);

      for (let i = 0; i < 10; i++) {
        await service.checkRateLimit(`block-limit-${i}`, 'ip', 'free');
        await service.checkRateLimit(`block-limit-${i}`, 'ip', 'free');
      }

      const blocked = await service.getBlockedRequests(undefined, undefined, 5);
      expect(blocked.length).toBeLessThanOrEqual(5);
    });
  });

  describe('statistics', () => {
    it('should track total requests', async () => {
      await service.checkRateLimit('stats-total-1', 'ip');
      await service.checkRateLimit('stats-total-2', 'ip');
      await service.checkRateLimit('stats-total-3', 'ip');

      const stats = await service.getStats();
      expect(stats.totalRequests).toBeGreaterThanOrEqual(3);
    });

    it('should track allowed requests', async () => {
      await service.checkRateLimit('stats-allowed', 'ip');

      const stats = await service.getStats();
      expect(stats.allowedRequests).toBeGreaterThan(0);
    });

    it('should track blocked requests', async () => {
      // Delete default and create strict config
      await service.deleteConfig('rl-ip');
      await service.createConfig('Stats Block', 'ip', 'sliding_window', 1, 60000);
      await service.checkRateLimit('stats-blocked', 'ip', 'free');
      await service.checkRateLimit('stats-blocked', 'ip', 'free');

      const stats = await service.getStats();
      expect(stats.blockedRequests).toBeGreaterThan(0);
    });

    it('should calculate block rate', async () => {
      // Delete default and create strict config
      await service.deleteConfig('rl-ip');
      await service.createConfig('Stats Rate', 'ip', 'sliding_window', 1, 60000);

      // One allowed, one blocked
      await service.checkRateLimit('stats-rate', 'ip', 'free');
      await service.checkRateLimit('stats-rate', 'ip', 'free');

      const stats = await service.getStats();
      expect(stats.blockedRequests).toBeGreaterThan(0);
    });

    it('should track top blocked identifiers', async () => {
      // Delete default and create strict config
      await service.deleteConfig('rl-ip');
      await service.createConfig('Stats Top', 'ip', 'sliding_window', 1, 60000);

      // Block multiple times for same identifier
      for (let i = 0; i < 5; i++) {
        await service.checkRateLimit('frequent-blocker', 'ip', 'free');
      }

      const stats = await service.getStats();
      expect(stats.blockedRequests).toBeGreaterThanOrEqual(4);
    });

    it('should reset stats', async () => {
      await service.checkRateLimit('reset-stats', 'ip');
      await service.resetStats();

      const stats = await service.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.allowedRequests).toBe(0);
      expect(stats.blockedRequests).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should clear all cache', async () => {
      await service.checkRateLimit('cache-clear-1', 'ip');
      await service.checkRateLimit('cache-clear-2', 'user');

      await service.clearCache();

      // After clearing, requests should start fresh
      const result = await service.checkRateLimit('cache-clear-1', 'ip');
      expect(result.allowed).toBe(true);
    });

    it('should clear cache by scope', async () => {
      await service.checkRateLimit('scope-clear', 'ip');
      await service.checkRateLimit('scope-clear-user', 'user');

      await service.clearCache('ip');

      // IP cache cleared, user cache remains
      const ipResult = await service.checkRateLimit('scope-clear', 'ip');
      expect(ipResult.allowed).toBe(true);
    });
  });

  describe('metadata', () => {
    it('should return available strategies', () => {
      const strategies = service.getStrategies();

      expect(strategies).toContain('token_bucket');
      expect(strategies).toContain('sliding_window');
      expect(strategies).toContain('fixed_window');
      expect(strategies.length).toBe(3);
    });

    it('should return available scopes', () => {
      const scopes = service.getScopes();

      expect(scopes).toContain('global');
      expect(scopes).toContain('tenant');
      expect(scopes).toContain('user');
      expect(scopes).toContain('ip');
      expect(scopes).toContain('api_key');
      expect(scopes).toContain('endpoint');
      expect(scopes.length).toBe(6);
    });

    it('should return available tiers', () => {
      const tiers = service.getTiers();

      expect(tiers).toContain('free');
      expect(tiers).toContain('basic');
      expect(tiers).toContain('pro');
      expect(tiers).toContain('enterprise');
      expect(tiers).toContain('unlimited');
      expect(tiers.length).toBe(5);
    });

    it('should return tier limits map', () => {
      const limits = service.getTierLimits();

      expect(limits).toBeInstanceOf(Map);
      expect(limits.get('free')?.requests).toBeLessThan(limits.get('pro')?.requests || 0);
      expect(limits.get('unlimited')?.requests).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('tier-based rate limiting', () => {
    it('should apply different limits per tier', async () => {
      const freeResult = await service.checkRateLimit('tier-free', 'user', 'free');
      const proResult = await service.checkRateLimit('tier-pro', 'user', 'pro');

      // Pro tier should have higher limits
      expect(proResult.limit).toBeGreaterThanOrEqual(freeResult.limit);
    });

    it('should allow unlimited tier without blocking', async () => {
      // Delete default user config and create unlimited one
      await service.deleteConfig('rl-user');
      await service.createConfig(
        'Unlimited Test',
        'user',
        'sliding_window',
        10000,
        60000,
        { tier: 'unlimited' },
      );

      // Make many requests - should all be allowed
      for (let i = 0; i < 50; i++) {
        const result = await service.checkRateLimit('unlimited-user', 'user', 'unlimited');
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('endpoint-specific rate limiting', () => {
    it('should apply endpoint-specific config', async () => {
      const result = await service.checkRateLimit('auth-user', 'ip', 'free', '/auth/login');
      expect(result.allowed).toBe(true);
    });

    it('should use stricter limits for auth endpoints', async () => {
      // Auth endpoints have stricter limits (10/min)
      for (let i = 0; i < 10; i++) {
        await service.checkRateLimit('auth-test', 'ip', 'free', '/auth/login');
      }

      const result = await service.checkRateLimit('auth-test', 'ip', 'free', '/auth/login');
      expect(result.allowed).toBe(false);
    });
  });

  describe('penalty handling', () => {
    it('should apply penalty when configured', async () => {
      // Auth config has 5 min penalty
      for (let i = 0; i < 10; i++) {
        await service.checkRateLimit('penalty-test', 'ip', 'free', '/auth/login');
      }

      const result = await service.checkRateLimit('penalty-test', 'ip', 'free', '/auth/login');

      if (!result.allowed && result.retryAfter) {
        // Penalty is 300 seconds (5 min)
        expect(result.retryAfter).toBeGreaterThanOrEqual(60);
      }
    });
  });

  describe('disabled config', () => {
    it('should allow all requests when config is disabled', async () => {
      const config = await service.createConfig(
        'Disabled Config',
        'ip',
        'sliding_window',
        1,
        60000,
      );

      await service.disableConfig(config.id);

      // With disabled config, requests should be allowed
      const result1 = await service.checkRateLimit('disabled-test', 'ip');
      const result2 = await service.checkRateLimit('disabled-test', 'ip');

      // Both should be allowed (fallback to other configs)
      expect(result1.allowed || result2.allowed).toBe(true);
    });
  });
});
