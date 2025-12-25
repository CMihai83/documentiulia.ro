import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiKeyService, CreateApiKeyDto, ApiKeyScope } from './api-key.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const createDto: CreateApiKeyDto = {
    organizationId: 'org-1',
    name: 'Test API Key',
    nameRo: 'Cheie API Test',
    description: 'A test API key',
    descriptionRo: 'O cheie API de test',
    scopes: ['READ', 'WRITE'],
    createdBy: 'user-1',
    createdByName: 'Ion Popescu',
  };

  beforeEach(async () => {
    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ApiKeyService>(ApiKeyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('API Key Creation', () => {
    it('should create an API key', async () => {
      const result = await service.create(createDto);

      expect(result.apiKey.id).toBeDefined();
      expect(result.apiKey.name).toBe('Test API Key');
      expect(result.apiKey.nameRo).toBe('Cheie API Test');
      expect(result.apiKey.status).toBe('ACTIVE');
      expect(result.apiKey.scopes).toContain('READ');
      expect(result.apiKey.scopes).toContain('WRITE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('apikey.created', expect.any(Object));
    });

    it('should return plain text key on creation', async () => {
      const result = await service.create(createDto);

      expect(result.plainTextKey).toBeDefined();
      expect(result.plainTextKey.startsWith('dk_')).toBe(true);
      expect(result.plainTextKey.length).toBeGreaterThan(10);
    });

    it('should hash the API key', async () => {
      const result = await service.create(createDto);

      expect(result.apiKey.keyHash).toBeDefined();
      expect(result.apiKey.keyHash).not.toBe(result.plainTextKey);
    });

    it('should store key prefix', async () => {
      const result = await service.create(createDto);

      expect(result.apiKey.keyPrefix).toBeDefined();
      expect(result.plainTextKey.startsWith(result.apiKey.keyPrefix)).toBe(true);
    });

    it('should set default rate limit', async () => {
      const result = await service.create(createDto);

      expect(result.apiKey.rateLimit).toBe(1000);
      expect(result.apiKey.rateLimitWindow).toBe(3600000);
    });

    it('should accept custom rate limit', async () => {
      const result = await service.create({
        ...createDto,
        rateLimit: 500,
        rateLimitWindow: 60000,
      });

      expect(result.apiKey.rateLimit).toBe(500);
      expect(result.apiKey.rateLimitWindow).toBe(60000);
    });

    it('should accept IP whitelist', async () => {
      const result = await service.create({
        ...createDto,
        ipWhitelist: ['192.168.1.1', '10.0.0.*'],
      });

      expect(result.apiKey.ipWhitelist).toHaveLength(2);
      expect(result.apiKey.ipWhitelist).toContain('192.168.1.1');
    });

    it('should accept expiration date', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const result = await service.create({
        ...createDto,
        expiresAt,
      });

      expect(result.apiKey.expiresAt).toEqual(expiresAt);
    });
  });

  describe('API Key Validation', () => {
    it('should validate a valid API key', async () => {
      const { plainTextKey } = await service.create(createDto);

      const result = await service.validate(plainTextKey);

      expect(result.valid).toBe(true);
      expect(result.apiKey).toBeDefined();
    });

    it('should reject invalid API key', async () => {
      const result = await service.validate('invalid_key');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid API key');
      expect(result.reasonRo).toBe('Cheie API invalidă');
    });

    it('should reject inactive API key', async () => {
      const { apiKey, plainTextKey } = await service.create(createDto);
      await service.deactivate(apiKey.id);

      const result = await service.validate(plainTextKey);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('inactive');
    });

    it('should reject expired API key', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1); // Yesterday

      const { plainTextKey } = await service.create({
        ...createDto,
        expiresAt,
      });

      const result = await service.validate(plainTextKey);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should reject revoked API key', async () => {
      const { apiKey, plainTextKey } = await service.create(createDto);
      await service.revoke(apiKey.id);

      const result = await service.validate(plainTextKey);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('revoked');
    });

    it('should validate required scopes', async () => {
      const { plainTextKey } = await service.create({
        ...createDto,
        scopes: ['READ'],
      });

      const result = await service.validate(plainTextKey, ['WRITE']);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Insufficient permissions');
    });

    it('should allow ADMIN scope for all operations', async () => {
      const { plainTextKey } = await service.create({
        ...createDto,
        scopes: ['ADMIN'],
      });

      const result = await service.validate(plainTextKey, ['READ', 'WRITE', 'DELETE']);

      expect(result.valid).toBe(true);
    });

    it('should validate IP whitelist', async () => {
      const { plainTextKey } = await service.create({
        ...createDto,
        ipWhitelist: ['192.168.1.1'],
      });

      const result = await service.validate(plainTextKey, [], '192.168.1.100');

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('IP');
    });

    it('should allow whitelisted IP', async () => {
      const { plainTextKey } = await service.create({
        ...createDto,
        ipWhitelist: ['192.168.1.1'],
      });

      const result = await service.validate(plainTextKey, [], '192.168.1.1');

      expect(result.valid).toBe(true);
    });

    it('should support wildcard IP patterns', async () => {
      const { plainTextKey } = await service.create({
        ...createDto,
        ipWhitelist: ['192.168.1.*'],
      });

      const result = await service.validate(plainTextKey, [], '192.168.1.100');

      expect(result.valid).toBe(true);
    });

    it('should increment usage count on validation', async () => {
      const { apiKey, plainTextKey } = await service.create(createDto);

      await service.validate(plainTextKey);
      await service.validate(plainTextKey);

      const updated = await service.getById(apiKey.id);
      expect(updated!.usageCount).toBe(2);
    });

    it('should track last used timestamp', async () => {
      const { apiKey, plainTextKey } = await service.create(createDto);

      await service.validate(plainTextKey);

      const updated = await service.getById(apiKey.id);
      expect(updated!.lastUsedAt).toBeDefined();
    });

    it('should track last used IP', async () => {
      const { apiKey, plainTextKey } = await service.create(createDto);

      await service.validate(plainTextKey, [], '192.168.1.1');

      const updated = await service.getById(apiKey.id);
      expect(updated!.lastUsedIp).toBe('192.168.1.1');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit', async () => {
      const { plainTextKey } = await service.create({
        ...createDto,
        rateLimit: 3,
        rateLimitWindow: 60000,
      });

      // Should succeed
      for (let i = 0; i < 3; i++) {
        const result = await service.validate(plainTextKey);
        expect(result.valid).toBe(true);
      }

      // Should fail on 4th
      const result = await service.validate(plainTextKey);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Rate limit');
    });
  });

  describe('API Key Management', () => {
    it('should get API key by ID', async () => {
      const { apiKey } = await service.create(createDto);

      const found = await service.getById(apiKey.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(apiKey.id);
    });

    it('should return null for non-existent key', async () => {
      const found = await service.getById('non-existent');
      expect(found).toBeNull();
    });

    it('should get keys by organization', async () => {
      await service.create(createDto);
      await service.create({ ...createDto, name: 'Second Key', nameRo: 'A Doua Cheie' });
      await service.create({ ...createDto, organizationId: 'org-2' });

      const keys = await service.getByOrganization('org-1');

      expect(keys.length).toBe(2);
    });

    it('should update API key', async () => {
      const { apiKey } = await service.create(createDto);

      const updated = await service.update(apiKey.id, {
        name: 'Updated Name',
        scopes: ['READ', 'WRITE', 'DELETE'],
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.scopes).toContain('DELETE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('apikey.updated', expect.any(Object));
    });

    it('should throw when updating non-existent key', async () => {
      await expect(service.update('non-existent', { name: 'Test' }))
        .rejects.toThrow('API key not found');
    });

    it('should activate API key', async () => {
      const { apiKey } = await service.create(createDto);
      await service.deactivate(apiKey.id);

      const activated = await service.activate(apiKey.id);

      expect(activated.status).toBe('ACTIVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('apikey.activated', expect.any(Object));
    });

    it('should not activate revoked key', async () => {
      const { apiKey } = await service.create(createDto);
      await service.revoke(apiKey.id);

      await expect(service.activate(apiKey.id))
        .rejects.toThrow('Cannot activate revoked API key');
    });

    it('should deactivate API key', async () => {
      const { apiKey } = await service.create(createDto);

      const deactivated = await service.deactivate(apiKey.id);

      expect(deactivated.status).toBe('INACTIVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('apikey.deactivated', expect.any(Object));
    });

    it('should revoke API key', async () => {
      const { apiKey } = await service.create(createDto);

      const revoked = await service.revoke(apiKey.id);

      expect(revoked.status).toBe('REVOKED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('apikey.revoked', expect.any(Object));
    });

    it('should delete API key', async () => {
      const { apiKey } = await service.create(createDto);

      await service.delete(apiKey.id);

      const found = await service.getById(apiKey.id);
      expect(found).toBeNull();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('apikey.deleted', expect.any(Object));
    });

    it('should throw when deleting non-existent key', async () => {
      await expect(service.delete('non-existent'))
        .rejects.toThrow('API key not found');
    });
  });

  describe('Key Regeneration', () => {
    it('should regenerate API key', async () => {
      const { apiKey, plainTextKey } = await service.create(createDto);
      const oldKeyHash = apiKey.keyHash;
      const oldKeyPrefix = apiKey.keyPrefix;

      const { apiKey: updated, plainTextKey: newKey } = await service.regenerate(apiKey.id);

      expect(newKey).not.toBe(plainTextKey);
      expect(updated.keyHash).not.toBe(oldKeyHash);
      expect(updated.keyPrefix).not.toBe(oldKeyPrefix);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('apikey.regenerated', expect.any(Object));
    });

    it('should reset usage on regeneration', async () => {
      const { apiKey, plainTextKey } = await service.create(createDto);
      await service.validate(plainTextKey);

      const { apiKey: updated } = await service.regenerate(apiKey.id);

      expect(updated.usageCount).toBe(0);
      expect(updated.lastUsedAt).toBeUndefined();
    });

    it('should activate key on regeneration', async () => {
      const { apiKey } = await service.create(createDto);
      await service.deactivate(apiKey.id);

      const { apiKey: updated } = await service.regenerate(apiKey.id);

      expect(updated.status).toBe('ACTIVE');
    });
  });

  describe('Usage Logging', () => {
    it('should log API key usage', async () => {
      const { apiKey } = await service.create(createDto);

      const usage = await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 150,
      });

      expect(usage.id).toBeDefined();
      expect(usage.endpoint).toBe('/api/invoices');
      expect(usage.statusCode).toBe(200);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('apikey.usage', expect.any(Object));
    });

    it('should get usage for API key', async () => {
      const { apiKey } = await service.create(createDto);
      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 150,
      });

      const usage = await service.getUsage(apiKey.id);

      expect(usage.length).toBe(1);
    });

    it('should filter usage by date range', async () => {
      const { apiKey } = await service.create(createDto);
      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 150,
      });

      const future = new Date();
      future.setDate(future.getDate() + 1);

      const usage = await service.getUsage(apiKey.id, { from: future });

      expect(usage.length).toBe(0);
    });

    it('should get organization-wide usage', async () => {
      const { apiKey: key1 } = await service.create(createDto);
      const { apiKey: key2 } = await service.create({ ...createDto, name: 'Second' });

      await service.logUsage(key1.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 150,
      });

      await service.logUsage(key2.id, {
        endpoint: '/api/customers',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 100,
      });

      const usage = await service.getOrganizationUsage('org-1');

      expect(usage.length).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics', async () => {
      const { apiKey } = await service.create(createDto);
      await service.create({ ...createDto, name: 'Second' });

      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 150,
      });

      const stats = await service.getStatistics('org-1');

      expect(stats.totalKeys).toBe(2);
      expect(stats.activeKeys).toBe(2);
      expect(stats.totalUsage).toBe(1);
    });

    it('should track top endpoints', async () => {
      const { apiKey } = await service.create(createDto);

      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 150,
      });

      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 150,
      });

      const stats = await service.getStatistics('org-1');

      expect(stats.topEndpoints[0].endpoint).toBe('/api/invoices');
      expect(stats.topEndpoints[0].count).toBe(2);
    });

    it('should calculate average response time', async () => {
      const { apiKey } = await service.create(createDto);

      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 100,
      });

      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 200,
      });

      const stats = await service.getStatistics('org-1');

      expect(stats.avgResponseTime).toBe(150);
    });

    it('should calculate error rate', async () => {
      const { apiKey } = await service.create(createDto);

      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 100,
      });

      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 500,
        responseTimeMs: 100,
      });

      const stats = await service.getStatistics('org-1');

      expect(stats.errorRate).toBe(50);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired keys', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1);

      const { apiKey } = await service.create({
        ...createDto,
        expiresAt,
      });

      const count = await service.cleanupExpired();

      expect(count).toBe(1);

      const updated = await service.getById(apiKey.id);
      expect(updated!.status).toBe('EXPIRED');
    });
  });

  describe('Metadata', () => {
    it('should get all scopes', async () => {
      const scopes = await service.getScopes();

      expect(scopes.length).toBe(11);
      expect(scopes.map(s => s.scope)).toContain('READ');
      expect(scopes.map(s => s.scope)).toContain('ANAF');
    });

    it('should have Romanian names for scopes', async () => {
      const scopes = await service.getScopes();

      expect(scopes.every(s => s.nameRo && s.nameRo.length > 0)).toBe(true);
      expect(scopes.find(s => s.scope === 'INVOICES')?.nameRo).toBe('Facturi');
    });

    it('should have Romanian descriptions for scopes', async () => {
      const scopes = await service.getScopes();

      expect(scopes.every(s => s.descriptionRo && s.descriptionRo.length > 0)).toBe(true);
    });

    it('should get all statuses', async () => {
      const statuses = await service.getStatuses();

      expect(statuses.length).toBe(4);
      expect(statuses.map(s => s.status)).toContain('ACTIVE');
      expect(statuses.map(s => s.status)).toContain('REVOKED');
    });

    it('should have Romanian names for statuses', async () => {
      const statuses = await service.getStatuses();

      expect(statuses.every(s => s.nameRo && s.nameRo.length > 0)).toBe(true);
      expect(statuses.find(s => s.status === 'EXPIRED')?.nameRo).toBe('Expirată');
    });
  });

  describe('Romanian Localization', () => {
    it('should use Romanian diacritics correctly', async () => {
      const scopes = await service.getScopes();
      const statuses = await service.getStatuses();

      // Check for diacritics (ă, ș, ț, î, â)
      expect(scopes.some(s => s.nameRo.includes('ă') || s.descriptionRo.includes('ă'))).toBe(true);
      expect(statuses.some(s => s.nameRo.includes('ă'))).toBe(true);
    });

    it('should have Romanian error messages', async () => {
      const result = await service.validate('invalid_key');

      expect(result.reasonRo).toBeDefined();
      expect(result.reasonRo!.length).toBeGreaterThan(0);
    });
  });

  describe('Audit Log', () => {
    it('should get audit log', async () => {
      const { apiKey } = await service.create(createDto);

      await service.logUsage(apiKey.id, {
        endpoint: '/api/invoices',
        method: 'GET',
        ipAddress: '192.168.1.1',
        statusCode: 200,
        responseTimeMs: 150,
      });

      const auditLog = await service.getAuditLog('org-1');

      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].action).toBe('API_CALL');
    });
  });
});
