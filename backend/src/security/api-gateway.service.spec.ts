import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ApiGatewayService,
  RateLimitConfig,
  RequestContext,
} from './api-gateway.service';

describe('ApiGatewayService', () => {
  let service: ApiGatewayService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiGatewayService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ApiGatewayService>(ApiGatewayService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Sample data
  const sampleRateLimitConfig: RateLimitConfig = {
    strategy: 'fixed_window',
    limit: 10,
    windowMs: 60000,
  };

  const sampleRequestContext: RequestContext = {
    endpoint: '/api/invoices',
    method: 'GET',
    ipAddress: '192.168.1.100',
    headers: {},
  };

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default rate limit rules', async () => {
      const rules = await service.getRateLimitRules();
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('API key management', () => {
    it('should create API key', async () => {
      const key = await service.createApiKey(
        'Test Key',
        'tenant-123',
        'user-456',
      );

      expect(key.id).toBeDefined();
      expect(key.key).toMatch(/^dk_/);
      expect(key.status).toBe('active');
    });

    it('should create API key with options', async () => {
      const key = await service.createApiKey(
        'Limited Key',
        'tenant-1',
        'user-1',
        {
          scopes: ['invoices:read', 'invoices:write'],
          quotaLimit: 1000,
          quotaPeriod: 'day',
          allowedIps: ['192.168.1.0/24'],
        },
      );

      expect(key.scopes).toContain('invoices:read');
      expect(key.quotaLimit).toBe(1000);
      expect(key.allowedIps).toContain('192.168.1.0/24');
    });

    it('should get API key by ID', async () => {
      const created = await service.createApiKey('Get Test', 'tenant-1', 'user-1');
      const retrieved = await service.getApiKey(created.id);

      expect(retrieved?.id).toBe(created.id);
    });

    it('should get API key by key value', async () => {
      const created = await service.createApiKey('Key Value Test', 'tenant-1', 'user-1');
      const retrieved = await service.getApiKeyByKey(created.key);

      expect(retrieved?.id).toBe(created.id);
    });

    it('should get API keys by tenant', async () => {
      await service.createApiKey('Key1', 'tenant-list', 'user-1');
      await service.createApiKey('Key2', 'tenant-list', 'user-1');
      await service.createApiKey('Key3', 'other-tenant', 'user-1');

      const keys = await service.getApiKeys('tenant-list');
      expect(keys.length).toBe(2);
    });

    it('should update API key', async () => {
      const key = await service.createApiKey('Original', 'tenant-1', 'user-1');
      const updated = await service.updateApiKey(key.id, {
        name: 'Updated Name',
        scopes: ['new:scope'],
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.scopes).toContain('new:scope');
    });

    it('should revoke API key', async () => {
      const key = await service.createApiKey('To Revoke', 'tenant-1', 'user-1');
      const success = await service.revokeApiKey(key.id);

      expect(success).toBe(true);

      const retrieved = await service.getApiKey(key.id);
      expect(retrieved?.status).toBe('revoked');
    });

    it('should rotate API key', async () => {
      const key = await service.createApiKey('To Rotate', 'tenant-1', 'user-1');
      const originalKey = key.key;

      const rotated = await service.rotateApiKey(key.id);

      expect(rotated?.key).not.toBe(originalKey);
      expect(rotated?.key).toMatch(/^dk_/);
    });

    it('should validate active API key', async () => {
      const key = await service.createApiKey('Active Key', 'tenant-1', 'user-1');
      const result = await service.validateApiKey(key.key);

      expect(result.valid).toBe(true);
      expect(result.apiKey?.id).toBe(key.id);
    });

    it('should reject revoked API key', async () => {
      const key = await service.createApiKey('Revoked Key', 'tenant-1', 'user-1');
      await service.revokeApiKey(key.id);

      const result = await service.validateApiKey(key.key);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('revoked');
    });

    it('should reject expired API key', async () => {
      const key = await service.createApiKey('Expired Key', 'tenant-1', 'user-1', {
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await service.validateApiKey(key.key);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('rate limiting', () => {
    it('should create rate limit rule', async () => {
      const rule = await service.createRateLimitRule(
        'Custom Rule',
        'A custom rate limit',
        sampleRateLimitConfig,
        { endpoint: '/custom/*' },
      );

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Custom Rule');
    });

    it('should get rate limit rules', async () => {
      const rules = await service.getRateLimitRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should update rate limit rule', async () => {
      const rule = await service.createRateLimitRule(
        'Update Test',
        'Test',
        sampleRateLimitConfig,
      );

      const updated = await service.updateRateLimitRule(rule.id, {
        config: { ...sampleRateLimitConfig, limit: 50 },
      });

      expect(updated?.config.limit).toBe(50);
    });

    it('should delete rate limit rule', async () => {
      const rule = await service.createRateLimitRule(
        'Delete Test',
        'Test',
        sampleRateLimitConfig,
      );

      const success = await service.deleteRateLimitRule(rule.id);
      expect(success).toBe(true);
    });

    it('should not delete default rule', async () => {
      const success = await service.deleteRateLimitRule('rule-default');
      expect(success).toBe(false);
    });

    it('should allow requests within rate limit', async () => {
      const result = await service.checkRateLimit(sampleRequestContext);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should track rate limit counters', async () => {
      const context = {
        ...sampleRequestContext,
        ipAddress: '10.0.0.1',
        endpoint: '/api/test-counter',
      };

      const result1 = await service.checkRateLimit(context);
      const result2 = await service.checkRateLimit(context);

      expect(result2.remaining).toBeLessThan(result1.remaining);
    });

    it('should use API key rate limit override', async () => {
      const apiKey = await service.createApiKey('Rate Limited', 'tenant-1', 'user-1', {
        rateLimitOverride: { strategy: 'fixed_window', limit: 5, windowMs: 60000 },
      });

      const context: RequestContext = {
        ...sampleRequestContext,
        apiKey: apiKey.key,
        ipAddress: '10.0.0.2',
      };

      const result = await service.checkRateLimit(context);
      expect(result.limit).toBe(5);
    });
  });

  describe('IP filtering', () => {
    it('should add IP filter', async () => {
      const filter = await service.addIpFilter(
        'tenant-1',
        '192.168.1.50',
        'block',
        { reason: 'Suspicious activity' },
      );

      expect(filter.id).toBeDefined();
      expect(filter.action).toBe('block');
    });

    it('should get IP filters by tenant', async () => {
      await service.addIpFilter('tenant-filter', '192.168.1.1', 'block');
      await service.addIpFilter('tenant-filter', '192.168.1.2', 'allow');

      const filters = await service.getIpFilters('tenant-filter');
      expect(filters.length).toBe(2);
    });

    it('should remove IP filter', async () => {
      const filter = await service.addIpFilter('tenant-1', '10.0.0.1', 'block');
      const success = await service.removeIpFilter(filter.id);

      expect(success).toBe(true);
    });

    it('should block IP in filter list', async () => {
      await service.addIpFilter('tenant-block', '192.168.1.100', 'block', {
        reason: 'Blocked',
      });

      const result = await service.checkIpFilter('192.168.1.100', 'tenant-block');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Blocked');
    });

    it('should allow IP not in block list', async () => {
      const result = await service.checkIpFilter('8.8.8.8', 'tenant-1');
      expect(result.allowed).toBe(true);
    });

    it('should match IP with wildcard', async () => {
      await service.addIpFilter('tenant-wild', '192.168.1.*', 'block');

      const result1 = await service.checkIpFilter('192.168.1.50', 'tenant-wild');
      const result2 = await service.checkIpFilter('192.168.2.50', 'tenant-wild');

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });

    it('should match IP with CIDR notation', async () => {
      await service.addIpFilter('tenant-cidr', '10.0.0.0/24', 'block');

      const result1 = await service.checkIpFilter('10.0.0.100', 'tenant-cidr');
      const result2 = await service.checkIpFilter('10.0.1.100', 'tenant-cidr');

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('quota management', () => {
    it('should initialize quota with API key', async () => {
      const key = await service.createApiKey('Quota Key', 'tenant-1', 'user-1', {
        quotaLimit: 100,
        quotaPeriod: 'day',
      });

      const quota = await service.getQuota(key.id);
      expect(quota).toBeDefined();
      expect(quota?.limit).toBe(100);
    });

    it('should check quota', async () => {
      const key = await service.createApiKey('Check Quota', 'tenant-1', 'user-1', {
        quotaLimit: 10,
        quotaPeriod: 'day',
      });

      const result = await service.checkQuota(key.id);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should decrement quota on check', async () => {
      const key = await service.createApiKey('Decrement Quota', 'tenant-1', 'user-1', {
        quotaLimit: 5,
        quotaPeriod: 'day',
      });

      await service.checkQuota(key.id);
      await service.checkQuota(key.id);
      const result = await service.checkQuota(key.id);

      expect(result.remaining).toBe(2);
    });

    it('should reset quota', async () => {
      const key = await service.createApiKey('Reset Quota', 'tenant-1', 'user-1', {
        quotaLimit: 5,
        quotaPeriod: 'day',
      });

      await service.checkQuota(key.id);
      await service.checkQuota(key.id);

      const success = await service.resetQuota(key.id);
      expect(success).toBe(true);

      const quota = await service.getQuota(key.id);
      expect(quota?.used).toBe(0);
    });

    it('should allow without quota configured', async () => {
      const result = await service.checkQuota('non-existent-key');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(Infinity);
    });
  });

  describe('request transformations', () => {
    it('should create transform rule', async () => {
      const rule = await service.createTransformRule(
        'Add Header',
        'request',
        '/api/*',
        [{ action: 'add_header', target: 'X-Custom', value: 'test' }],
      );

      expect(rule.id).toBeDefined();
      expect(rule.type).toBe('request');
    });

    it('should get transform rules', async () => {
      await service.createTransformRule('Rule1', 'request', '/api/*', []);
      await service.createTransformRule('Rule2', 'response', '/api/*', []);

      const requestRules = await service.getTransformRules('request');
      expect(requestRules.every(r => r.type === 'request')).toBe(true);
    });

    it('should apply request transformations', async () => {
      await service.createTransformRule(
        'Test Transform',
        'request',
        '/api/test',
        [
          { action: 'add_header', target: 'X-Added', value: 'added' },
          { action: 'remove_header', target: 'X-Remove' },
        ],
      );

      const result = await service.applyRequestTransformations(
        '/api/test',
        'GET',
        { 'X-Remove': 'should be removed' },
        {},
      );

      expect(result.headers['X-Added']).toBe('added');
      expect(result.headers['X-Remove']).toBeUndefined();
    });

    it('should delete transform rule', async () => {
      const rule = await service.createTransformRule('Delete Test', 'request', '/api/*', []);
      const success = await service.deleteTransformRule(rule.id);

      expect(success).toBe(true);
    });
  });

  describe('usage tracking', () => {
    it('should log API usage', async () => {
      const key = await service.createApiKey('Usage Key', 'tenant-1', 'user-1');

      await service.logUsage({
        keyId: key.id,
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 50,
        ipAddress: '192.168.1.1',
      });

      const usage = await service.getUsageLog(key.id);
      expect(usage.length).toBe(1);
      expect(usage[0].statusCode).toBe(200);
    });

    it('should update API key usage count', async () => {
      const key = await service.createApiKey('Count Key', 'tenant-1', 'user-1');

      await service.logUsage({
        keyId: key.id,
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 50,
        ipAddress: '192.168.1.1',
      });

      const updated = await service.getApiKey(key.id);
      expect(updated?.usageCount).toBe(1);
      expect(updated?.lastUsedAt).toBeDefined();
    });
  });

  describe('metrics and analytics', () => {
    it('should get API metrics', async () => {
      const key = await service.createApiKey('Metrics Key', 'tenant-metrics', 'user-1');

      await service.logUsage({
        keyId: key.id,
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 50,
        ipAddress: '192.168.1.1',
      });

      const metrics = await service.getApiMetrics('tenant-metrics');

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(1);
      expect(metrics.successfulRequests).toBeGreaterThanOrEqual(1);
    });

    it('should get gateway health', async () => {
      const health = await service.getGatewayHealth();

      expect(health.status).toBeDefined();
      expect(health.activeApiKeys).toBeGreaterThanOrEqual(0);
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('full request processing', () => {
    it('should process valid request', async () => {
      const key = await service.createApiKey('Process Key', 'tenant-1', 'user-1');

      const result = await service.processRequest({
        apiKey: key.key,
        tenantId: 'tenant-1',
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.100',
        headers: {},
      });

      expect(result.allowed).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject request with invalid API key', async () => {
      const result = await service.processRequest({
        apiKey: 'invalid_key',
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.100',
        headers: {},
      });

      expect(result.allowed).toBe(false);
      expect(result.errors).toContain('API key not found');
    });

    it('should reject request from blocked IP', async () => {
      await service.addIpFilter('tenant-process', '10.0.0.50', 'block');

      const result = await service.processRequest({
        tenantId: 'tenant-process',
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '10.0.0.50',
        headers: {},
      });

      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.includes('IP'))).toBe(true);
    });

    it('should check IP whitelist for API key', async () => {
      const key = await service.createApiKey('Whitelist Key', 'tenant-1', 'user-1', {
        allowedIps: ['192.168.1.0/24'],
      });

      const result = await service.processRequest({
        apiKey: key.key,
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '10.0.0.1',
        headers: {},
      });

      expect(result.allowed).toBe(false);
      expect(result.errors.some(e => e.includes('IP not allowed'))).toBe(true);
    });
  });
});
