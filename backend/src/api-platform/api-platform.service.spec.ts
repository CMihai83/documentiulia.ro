import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiPlatformService } from './api-platform.service';

describe('ApiPlatformService', () => {
  let service: ApiPlatformService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiPlatformService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                API_VERSION: '1.0.0',
                API_BASE_URL: 'https://api.documentiulia.ro',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ApiPlatformService>(ApiPlatformService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default API versions', () => {
      const versions = service.getAllApiVersions();
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].version).toBe('v1');
    });

    it('should have default rate limit configs', () => {
      const configs = service.getAllRateLimitConfigs();
      expect(configs.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // OPENAPI SPEC TESTS
  // ============================================

  describe('OpenAPI Specification', () => {
    it('should return OpenAPI spec object', () => {
      const spec = service.getOpenAPISpec();
      expect(spec).toBeDefined();
      expect(spec.openapi).toBe('3.0.3');
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('DocumentIulia API');
    });

    it('should include all required OpenAPI components', () => {
      const spec = service.getOpenAPISpec();
      expect(spec.servers).toBeDefined();
      expect(spec.paths).toBeDefined();
      expect(spec.components).toBeDefined();
      expect(spec.tags).toBeDefined();
    });

    it('should return valid JSON string', () => {
      const json = service.getOpenAPISpecAsJson();
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.openapi).toBe('3.0.3');
    });

    it('should return valid YAML string', () => {
      const yaml = service.getOpenAPISpecAsYaml();
      expect(yaml).toContain('openapi:');
      expect(yaml).toContain('info:');
      expect(yaml).toContain('title:');
    });

    it('should include security schemes', () => {
      const spec = service.getOpenAPISpec();
      expect(spec.components.securitySchemes).toBeDefined();
      expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
      expect(spec.components.securitySchemes.ApiKey).toBeDefined();
    });

    it('should include all defined paths', () => {
      const spec = service.getOpenAPISpec();
      expect(spec.paths['/finance/invoices']).toBeDefined();
      expect(spec.paths['/hr/employees']).toBeDefined();
      expect(spec.paths['/hse/incidents']).toBeDefined();
    });

    it('should include schemas for common models', () => {
      const spec = service.getOpenAPISpec();
      expect(spec.components.schemas.Invoice).toBeDefined();
      expect(spec.components.schemas.Employee).toBeDefined();
      expect(spec.components.schemas.Error).toBeDefined();
    });

    it('should have valid server URLs', () => {
      const spec = service.getOpenAPISpec();
      expect(spec.servers.length).toBeGreaterThan(0);
      spec.servers.forEach(server => {
        expect(server.url).toBeDefined();
        expect(server.description).toBeDefined();
      });
    });

    it('should have tags for organization', () => {
      const spec = service.getOpenAPISpec();
      expect(spec.tags.length).toBeGreaterThan(0);
      spec.tags.forEach(tag => {
        expect(tag.name).toBeDefined();
        expect(tag.description).toBeDefined();
      });
    });
  });

  // ============================================
  // API VERSIONING TESTS
  // ============================================

  describe('API Versioning', () => {
    it('should get all API versions', () => {
      const versions = service.getAllApiVersions();
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
    });

    it('should get current version', () => {
      const version = service.getCurrentVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
      expect(version).toBe('v1');
    });

    it('should get specific API version', () => {
      const version = service.getApiVersion('v1');
      expect(version).toBeDefined();
      expect(version?.version).toBe('v1');
      expect(version?.status).toBeDefined();
    });

    it('should return undefined for non-existent version', () => {
      const version = service.getApiVersion('v999');
      expect(version).toBeUndefined();
    });

    it('should create new API version', () => {
      const newVersion = service.createApiVersion({
        version: 'v3',
        status: 'current',
        releaseDate: new Date(),
      });
      expect(newVersion.version).toBe('v3');
      expect(newVersion.status).toBe('current');
      expect(newVersion.changelog).toEqual([]);
    });

    it('should deprecate API version', () => {
      const sunsetDate = new Date('2025-12-31');
      const result = service.deprecateVersion('v1', sunsetDate);
      expect(result).toBe(true);

      const version = service.getApiVersion('v1');
      expect(version?.status).toBe('deprecated');
      expect(version?.sunsetDate).toEqual(sunsetDate);
    });

    it('should return false when deprecating non-existent version', () => {
      const result = service.deprecateVersion('v999', new Date());
      expect(result).toBe(false);
    });

    it('should add changelog entry', () => {
      const entry = {
        type: 'added' as const,
        description: 'Added new endpoint',
        endpoints: ['/api/new'],
      };
      const result = service.addChangelogEntry('v1', entry);
      expect(result).toBe(true);

      const version = service.getApiVersion('v1');
      const lastEntry = version?.changelog[version.changelog.length - 1];
      expect(lastEntry?.description).toBe('Added new endpoint');
    });

    it('should return false when adding changelog to non-existent version', () => {
      const result = service.addChangelogEntry('v999', {
        type: 'fixed',
        description: 'Test',
      });
      expect(result).toBe(false);
    });
  });

  // ============================================
  // RATE LIMITING TESTS
  // ============================================

  describe('Rate Limiting', () => {
    it('should configure rate limit', () => {
      service.configureRateLimit({
        endpoint: '/api/test',
        method: 'GET',
        requests: 100,
        window: 60,
        burst: 20,
        costPerRequest: 1,
      });

      const configs = service.getAllRateLimitConfigs();
      const testConfig = configs.find(c => c.endpoint === '/api/test');
      expect(testConfig).toBeDefined();
      expect(testConfig?.requests).toBe(100);
    });

    it('should check rate limit and return status', () => {
      service.configureRateLimit({
        endpoint: '/api/check',
        method: 'GET',
        requests: 100,
        window: 60,
        burst: 20,
        costPerRequest: 1,
      });

      const result = service.checkRateLimit('client1', 'GET', '/api/check');
      expect(result.remaining).toBeDefined();
      expect(result.reset).toBeDefined();
      expect(result.limit).toBe(100);
    });

    it('should consume rate limit', () => {
      service.configureRateLimit({
        endpoint: '/api/consume',
        method: 'POST',
        requests: 10,
        window: 60,
        burst: 5,
        costPerRequest: 1,
      });

      const allowed = service.consumeRateLimit('client2', 'POST', '/api/consume');
      expect(allowed).toBe(true);

      const status = service.checkRateLimit('client2', 'POST', '/api/consume');
      expect(status.remaining).toBe(9);
    });

    it('should deny when rate limit exceeded', () => {
      service.configureRateLimit({
        endpoint: '/api/limited',
        method: 'GET',
        requests: 2,
        window: 60,
        burst: 2,
        costPerRequest: 1,
      });

      service.consumeRateLimit('client3', 'GET', '/api/limited');
      service.consumeRateLimit('client3', 'GET', '/api/limited');
      const allowed = service.consumeRateLimit('client3', 'GET', '/api/limited');
      expect(allowed).toBe(false);
    });

    it('should reset rate limit for client', () => {
      service.configureRateLimit({
        endpoint: '/api/reset',
        method: 'GET',
        requests: 5,
        window: 60,
        burst: 5,
        costPerRequest: 1,
      });

      service.consumeRateLimit('client4', 'GET', '/api/reset');
      service.consumeRateLimit('client4', 'GET', '/api/reset');
      service.resetRateLimit('client4', '/api/reset');

      const status = service.checkRateLimit('client4', 'GET', '/api/reset');
      expect(status.remaining).toBe(5);
    });

    it('should handle cost per request', () => {
      service.configureRateLimit({
        endpoint: '/api/expensive',
        method: 'POST',
        requests: 10,
        window: 60,
        burst: 10,
        costPerRequest: 5,
      });

      service.consumeRateLimit('client5', 'POST', '/api/expensive', 5);
      const status = service.checkRateLimit('client5', 'POST', '/api/expensive');
      expect(status.remaining).toBe(5);
    });

    it('should use default rate limit for unconfigured endpoints', () => {
      const result = service.checkRateLimit('newclient', 'GET', '/api/unconfigured');
      expect(result.remaining).toBe(Infinity);
    });

    it('should match wildcard endpoints', () => {
      const status = service.checkRateLimit('client6', 'GET', '/finance/invoices');
      expect(status.limit).toBe(100);
    });
  });

  // ============================================
  // SDK GENERATION TESTS
  // ============================================

  describe('SDK Generation', () => {
    it('should return supported SDK languages', () => {
      const languages = service.getSupportedSDKLanguages();
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('javascript');
      expect(languages).toContain('java');
      expect(languages).toContain('csharp');
      expect(languages).toContain('go');
      expect(languages).toContain('php');
      expect(languages).toContain('ruby');
    });

    it('should generate TypeScript SDK', () => {
      const sdk = service.generateSDK({
        language: 'typescript',
        version: 'v1',
        packageName: '@documentiulia/sdk',
        author: 'DocumentIulia',
        repository: 'https://github.com/documentiulia/sdk',
        license: 'MIT',
      });

      expect(sdk.language).toBe('typescript');
      expect(sdk.files).toBeDefined();
      expect(sdk.files.length).toBeGreaterThan(0);
      expect(sdk.readme).toContain('@documentiulia/sdk');
    });

    it('should generate Python SDK', () => {
      const sdk = service.generateSDK({
        language: 'python',
        version: 'v1',
        packageName: 'documentiulia',
        author: 'DocumentIulia',
        repository: 'https://github.com/documentiulia/python-sdk',
        license: 'MIT',
      });

      expect(sdk.language).toBe('python');
      expect(sdk.files).toBeDefined();
      expect(sdk.files.length).toBeGreaterThan(0);
    });

    it('should include type definitions in TypeScript SDK', () => {
      const sdk = service.generateSDK({
        language: 'typescript',
        version: 'v1',
        packageName: '@documentiulia/sdk',
        author: 'DocumentIulia',
        repository: 'https://github.com/documentiulia/sdk',
        license: 'MIT',
      });

      const hasTypes = sdk.files.some(f => f.path.includes('types'));
      expect(hasTypes).toBe(true);
    });

    it('should include README in generated SDK', () => {
      const sdk = service.generateSDK({
        language: 'typescript',
        version: 'v1',
        packageName: '@documentiulia/sdk',
        author: 'DocumentIulia',
        repository: 'https://github.com/documentiulia/sdk',
        license: 'MIT',
      });

      expect(sdk.readme).toBeDefined();
      expect(sdk.readme).toContain('Installation');
      expect(sdk.readme).toContain('Usage');
    });

    it('should include package.json for TypeScript SDK', () => {
      const sdk = service.generateSDK({
        language: 'typescript',
        version: 'v1',
        packageName: '@documentiulia/sdk',
        author: 'DocumentIulia',
        repository: 'https://github.com/documentiulia/sdk',
        license: 'MIT',
      });

      expect(sdk.packageJson).toBeDefined();
      const pkg = JSON.parse(sdk.packageJson!);
      expect(pkg.name).toBe('@documentiulia/sdk');
    });
  });

  // ============================================
  // WEBHOOK TESTS
  // ============================================

  describe('Webhook Management', () => {
    let webhookId: string;

    beforeEach(() => {
      const webhook = service.createWebhook({
        url: 'https://example.com/webhook',
        events: ['invoice.created', 'invoice.paid'],
        enabled: true,
        description: 'Test webhook',
        metadata: { env: 'test' },
      });
      webhookId = webhook.id;
    });

    it('should return available webhook events', () => {
      const events = service.getWebhookEvents();
      expect(events.length).toBeGreaterThan(0);
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('invoice.created');
      expect(eventTypes).toContain('invoice.paid');
      expect(eventTypes).toContain('employee.created');
    });

    it('should create webhook with generated secret', () => {
      const webhook = service.createWebhook({
        url: 'https://example.com/new-webhook',
        events: ['invoice.created'],
        enabled: true,
        description: 'New webhook',
        metadata: {},
      });

      expect(webhook.id).toBeDefined();
      expect(webhook.secret).toBeDefined();
      expect(webhook.secret.startsWith('whsec_')).toBe(true);
      expect(webhook.failureCount).toBe(0);
      expect(webhook.successCount).toBe(0);
    });

    it('should get all webhooks', () => {
      const webhooks = service.getAllWebhooks();
      expect(webhooks.length).toBeGreaterThan(0);
    });

    it('should get webhook by id', () => {
      const webhook = service.getWebhook(webhookId);
      expect(webhook).toBeDefined();
      expect(webhook?.url).toBe('https://example.com/webhook');
    });

    it('should return undefined for non-existent webhook', () => {
      const webhook = service.getWebhook('non-existent-id');
      expect(webhook).toBeUndefined();
    });

    it('should update webhook', () => {
      const result = service.updateWebhook(webhookId, {
        description: 'Updated description',
        enabled: false,
      });
      expect(result).toBe(true);

      const webhook = service.getWebhook(webhookId);
      expect(webhook?.description).toBe('Updated description');
      expect(webhook?.enabled).toBe(false);
    });

    it('should return false when updating non-existent webhook', () => {
      const result = service.updateWebhook('non-existent', { enabled: false });
      expect(result).toBe(false);
    });

    it('should delete webhook', () => {
      service.deleteWebhook(webhookId);
      const webhook = service.getWebhook(webhookId);
      expect(webhook).toBeUndefined();
    });

    it('should regenerate webhook secret', () => {
      const originalWebhook = service.getWebhook(webhookId);
      const originalSecret = originalWebhook?.secret;

      const newSecret = service.regenerateWebhookSecret(webhookId);
      expect(newSecret).toBeDefined();
      expect(newSecret).not.toBe(originalSecret);
      expect(newSecret?.startsWith('whsec_')).toBe(true);
    });

    it('should return undefined when regenerating secret for non-existent webhook', () => {
      const secret = service.regenerateWebhookSecret('non-existent');
      expect(secret).toBeUndefined();
    });

    it('should trigger webhook and return deliveries', async () => {
      const deliveries = await service.triggerWebhook('invoice.created', {
        invoiceId: 'inv_123',
        amount: 100,
      });

      expect(Array.isArray(deliveries)).toBe(true);
      expect(deliveries.length).toBeGreaterThan(0);
      expect(deliveries[0].event).toBe('invoice.created');
      expect(deliveries[0].webhookId).toBe(webhookId);
    });

    it('should not trigger disabled webhooks', async () => {
      service.updateWebhook(webhookId, { enabled: false });

      const deliveries = await service.triggerWebhook('invoice.created', {
        invoiceId: 'inv_456',
      });

      const delivery = deliveries.find(d => d.webhookId === webhookId);
      expect(delivery).toBeUndefined();
    });

    it('should only trigger webhooks subscribed to event', async () => {
      const deliveries = await service.triggerWebhook('shipment.delivered', {
        shipmentId: 'ship_123',
      });

      const delivery = deliveries.find(d => d.webhookId === webhookId);
      expect(delivery).toBeUndefined();
    });

    it('should get webhook deliveries', async () => {
      await service.triggerWebhook('invoice.created', { test: true });

      const deliveries = service.getWebhookDeliveries(webhookId);
      expect(Array.isArray(deliveries)).toBe(true);
    });

    it('should retry webhook delivery', async () => {
      await service.triggerWebhook('invoice.created', { test: true });
      const deliveries = service.getWebhookDeliveries(webhookId);

      if (deliveries.length > 0) {
        const result = service.retryWebhookDelivery(deliveries[0].id);
        expect(typeof result).toBe('boolean');
      }
    });

    it('should return false when retrying non-existent delivery', () => {
      const result = service.retryWebhookDelivery('non-existent-delivery');
      expect(result).toBe(false);
    });

    it('should support wildcard event subscription', async () => {
      const wildcardWebhook = service.createWebhook({
        url: 'https://example.com/all-events',
        events: ['*'],
        enabled: true,
        description: 'Catch all webhook',
        metadata: {},
      });

      const deliveries = await service.triggerWebhook('invoice.created', { test: true });
      const wildcardDelivery = deliveries.find(d => d.webhookId === wildcardWebhook.id);
      expect(wildcardDelivery).toBeDefined();
    });
  });

  // ============================================
  // STATUS TESTS
  // ============================================

  describe('API Platform Status', () => {
    it('should return platform status', () => {
      const status = service.getApiPlatformStatus();
      expect(status).toBeDefined();
      expect(status.version).toBeDefined();
      expect(status.spec.paths).toBeGreaterThan(0);
      expect(status.spec.schemas).toBeGreaterThan(0);
      expect(status.rateLimits).toBeGreaterThanOrEqual(0);
      expect(status.webhooks.total).toBeGreaterThanOrEqual(0);
      expect(status.sdkLanguages).toBeGreaterThan(0);
    });

    it('should track webhook counts', () => {
      service.createWebhook({
        url: 'https://example.com/test1',
        events: ['invoice.created'],
        enabled: true,
        description: 'Test 1',
        metadata: {},
      });

      service.createWebhook({
        url: 'https://example.com/test2',
        events: ['invoice.paid'],
        enabled: false,
        description: 'Test 2',
        metadata: {},
      });

      const status = service.getApiPlatformStatus();
      expect(status.webhooks.total).toBeGreaterThanOrEqual(2);
      expect(status.webhooks.enabled).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty client id in rate limiting', () => {
      const result = service.checkRateLimit('', 'GET', '/api/test');
      expect(result).toBeDefined();
    });

    it('should handle special characters in endpoint', () => {
      service.configureRateLimit({
        endpoint: '/api/users/{id}/profile',
        method: 'GET',
        requests: 60,
        window: 60,
        burst: 10,
        costPerRequest: 1,
      });

      const configs = service.getAllRateLimitConfigs();
      const config = configs.find(c => c.endpoint === '/api/users/{id}/profile');
      expect(config).toBeDefined();
    });

    it('should generate unique webhook secrets', () => {
      const webhook1 = service.createWebhook({
        url: 'https://example.com/1',
        events: ['test'],
        enabled: true,
        description: 'Test 1',
        metadata: {},
      });

      const webhook2 = service.createWebhook({
        url: 'https://example.com/2',
        events: ['test'],
        enabled: true,
        description: 'Test 2',
        metadata: {},
      });

      expect(webhook1.secret).not.toBe(webhook2.secret);
    });

    it('should handle concurrent rate limit checks', () => {
      service.configureRateLimit({
        endpoint: '/api/concurrent',
        method: 'GET',
        requests: 100,
        window: 60,
        burst: 50,
        costPerRequest: 1,
      });

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(service.consumeRateLimit(`client${i}`, 'GET', '/api/concurrent'));
      }

      expect(results.every(r => r === true)).toBe(true);
    });

    it('should handle changelog entry types', () => {
      const types: Array<'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security'> = [
        'added', 'changed', 'deprecated', 'removed', 'fixed', 'security'
      ];

      for (const type of types) {
        const result = service.addChangelogEntry('v1', {
          type,
          description: `Test ${type} entry`,
        });
        expect(result).toBe(true);
      }
    });
  });

  // ============================================
  // RESPONSE FORMAT TESTS
  // ============================================

  describe('Response Formats', () => {
    it('should include proper HTTP method definitions in paths', () => {
      const spec = service.getOpenAPISpec();
      const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

      Object.values(spec.paths).forEach((path: any) => {
        Object.keys(path).forEach(method => {
          expect(validMethods).toContain(method);
        });
      });
    });

    it('should have response definitions for all operations', () => {
      const spec = service.getOpenAPISpec();

      Object.values(spec.paths).forEach((path: any) => {
        Object.values(path).forEach((operation: any) => {
          expect(operation.responses).toBeDefined();
          expect(Object.keys(operation.responses).length).toBeGreaterThan(0);
        });
      });
    });

    it('should include rate limit info in operations', () => {
      const spec = service.getOpenAPISpec();
      const invoicePath = spec.paths['/finance/invoices'];

      expect(invoicePath.get?.['x-rate-limit']).toBeDefined();
      expect(invoicePath.get?.['x-rate-limit']?.requests).toBeDefined();
    });
  });
});
