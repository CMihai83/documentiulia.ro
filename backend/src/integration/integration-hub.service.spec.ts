import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IntegrationHubService,
  IntegrationType,
  AuthType,
} from './integration-hub.service';

describe('IntegrationHubService', () => {
  let service: IntegrationHubService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationHubService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<IntegrationHubService>(IntegrationHubService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('Integration Management', () => {
    it('should have default integrations loaded', async () => {
      const integrations = await service.listIntegrations();

      expect(integrations.length).toBeGreaterThanOrEqual(3);
    });

    it('should get ANAF SPV integration', async () => {
      const integration = await service.getIntegration('int-anaf-spv');

      expect(integration).toBeDefined();
      expect(integration!.type).toBe('ANAF_SPV');
      expect(integration!.nameRo).toContain('ANAF');
    });

    it('should get SAGA integration', async () => {
      const integration = await service.getIntegration('int-saga');

      expect(integration).toBeDefined();
      expect(integration!.type).toBe('SAGA');
    });

    it('should filter integrations by type', async () => {
      const integrations = await service.listIntegrations('ANAF_SPV');

      expect(integrations.every((i) => i.type === 'ANAF_SPV')).toBe(true);
    });

    it('should create custom integration', async () => {
      const integration = await service.createIntegration(
        'Custom API',
        'API Personalizat',
        'CUSTOM',
        'https://api.example.com',
        'API_KEY',
        {
          description: 'A custom API',
          descriptionRo: 'Un API personalizat',
        },
      );

      expect(integration.id).toBeDefined();
      expect(integration.name).toBe('Custom API');
      expect(integration.nameRo).toBe('API Personalizat');
      expect(integration.status).toBe('INACTIVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.created',
        expect.objectContaining({ integrationId: integration.id }),
      );
    });

    it('should create integration with custom config', async () => {
      const integration = await service.createIntegration(
        'Bank API',
        'API Bancă',
        'BANK_PSD2',
        'https://api.bank.ro',
        'OAUTH2',
        {
          timeout: 60000,
          retryConfig: { maxRetries: 5 },
          rateLimitConfig: { requestsPerSecond: 5 },
        },
      );

      expect(integration.timeout).toBe(60000);
      expect(integration.retryConfig.maxRetries).toBe(5);
      expect(integration.rateLimitConfig.requestsPerSecond).toBe(5);
    });

    it('should update integration', async () => {
      const integration = await service.getIntegration('int-anaf-spv');
      const updated = await service.updateIntegration('int-anaf-spv', {
        description: 'Updated description',
      });

      expect(updated.description).toBe('Updated description');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.updated',
        expect.objectContaining({ integrationId: 'int-anaf-spv' }),
      );
    });

    it('should throw error when updating non-existent integration', async () => {
      await expect(service.updateIntegration('invalid-id', {})).rejects.toThrow(
        'Integration not found',
      );
    });

    it('should activate integration', async () => {
      const integration = await service.activateIntegration('int-anaf-spv');

      expect(integration.isActive).toBe(true);
      expect(integration.status).toBe('ACTIVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.activated',
        expect.objectContaining({ integrationId: 'int-anaf-spv' }),
      );
    });

    it('should deactivate integration', async () => {
      await service.activateIntegration('int-anaf-spv');
      const integration = await service.deactivateIntegration('int-anaf-spv');

      expect(integration.isActive).toBe(false);
      expect(integration.status).toBe('INACTIVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.deactivated',
        expect.any(Object),
      );
    });

    it('should delete integration', async () => {
      const integration = await service.createIntegration(
        'To Delete',
        'De Șters',
        'CUSTOM',
        'https://example.com',
        'NONE',
      );

      const result = await service.deleteIntegration(integration.id);

      expect(result).toBe(true);
      const deleted = await service.getIntegration(integration.id);
      expect(deleted).toBeUndefined();
    });

    it('should return false when deleting non-existent integration', async () => {
      const result = await service.deleteIntegration('invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('API Requests', () => {
    beforeEach(async () => {
      await service.activateIntegration('int-anaf-spv');
    });

    it('should make GET request', async () => {
      const request = await service.makeRequest('int-anaf-spv', 'GET', '/status');

      expect(request.id).toBeDefined();
      expect(request.method).toBe('GET');
      expect(request.endpoint).toBe('/status');
      expect(request.status).toBe('SUCCESS');
    });

    it('should make POST request with body', async () => {
      const request = await service.makeRequest('int-anaf-spv', 'POST', '/submit', {
        body: { data: 'test' },
      });

      expect(request.method).toBe('POST');
      expect(request.body).toEqual({ data: 'test' });
      expect(request.status).toBe('SUCCESS');
    });

    it('should include response on success', async () => {
      const request = await service.makeRequest('int-anaf-spv', 'GET', '/data');

      expect(request.response).toBeDefined();
      expect(request.response!.statusCode).toBe(200);
      expect(request.duration).toBeDefined();
    });

    it('should emit request event', async () => {
      await service.makeRequest('int-anaf-spv', 'GET', '/test');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.request',
        expect.objectContaining({
          integrationId: 'int-anaf-spv',
          method: 'GET',
        }),
      );
    });

    it('should throw error for inactive integration', async () => {
      await service.deactivateIntegration('int-anaf-spv');

      await expect(service.makeRequest('int-anaf-spv', 'GET', '/test')).rejects.toThrow(
        'Integration is not active',
      );
    });

    it('should throw error for non-existent integration', async () => {
      await expect(service.makeRequest('invalid-id', 'GET', '/test')).rejects.toThrow(
        'Integration not found',
      );
    });

    it('should get request by id', async () => {
      const created = await service.makeRequest('int-anaf-spv', 'GET', '/test');
      const request = await service.getRequest(created.id);

      expect(request).toBeDefined();
      expect(request!.id).toBe(created.id);
    });

    it('should list requests', async () => {
      await service.makeRequest('int-anaf-spv', 'GET', '/test1');
      await service.makeRequest('int-anaf-spv', 'POST', '/test2');

      const requests = await service.listRequests();

      expect(requests.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter requests by integration', async () => {
      await service.makeRequest('int-anaf-spv', 'GET', '/test');

      const requests = await service.listRequests({ integrationId: 'int-anaf-spv' });

      expect(requests.every((r) => r.integrationId === 'int-anaf-spv')).toBe(true);
    });

    it('should filter requests by status', async () => {
      await service.makeRequest('int-anaf-spv', 'GET', '/test');

      const requests = await service.listRequests({ status: 'SUCCESS' });

      expect(requests.every((r) => r.status === 'SUCCESS')).toBe(true);
    });

    it('should limit requests', async () => {
      await service.makeRequest('int-anaf-spv', 'GET', '/test1');
      await service.makeRequest('int-anaf-spv', 'GET', '/test2');
      await service.makeRequest('int-anaf-spv', 'GET', '/test3');

      const requests = await service.listRequests({ limit: 2 });

      expect(requests.length).toBeLessThanOrEqual(2);
    });
  });

  describe('OAuth Token Management', () => {
    it('should set OAuth token', async () => {
      const token = await service.setOAuthToken('int-saga', 'access-token-123', {
        refreshToken: 'refresh-token-456',
        expiresIn: 3600,
        scope: 'read write',
      });

      expect(token.accessToken).toBe('access-token-123');
      expect(token.refreshToken).toBe('refresh-token-456');
      expect(token.scope).toBe('read write');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.token.set',
        expect.objectContaining({ integrationId: 'int-saga' }),
      );
    });

    it('should get OAuth token', async () => {
      await service.setOAuthToken('int-saga', 'my-token');

      const token = await service.getOAuthToken('int-saga');

      expect(token).toBeDefined();
      expect(token!.accessToken).toBe('my-token');
    });

    it('should check token validity', async () => {
      await service.setOAuthToken('int-saga', 'valid-token', {
        expiresIn: 3600,
      });

      const isValid = await service.isTokenValid('int-saga');

      expect(isValid).toBe(true);
    });

    it('should return false for missing token', async () => {
      const isValid = await service.isTokenValid('int-anaf-spv');

      expect(isValid).toBe(false);
    });

    it('should refresh OAuth token', async () => {
      await service.setOAuthToken('int-saga', 'old-token', {
        refreshToken: 'refresh-token',
      });

      const newToken = await service.refreshOAuthToken('int-saga');

      expect(newToken.accessToken).toContain('refreshed-token');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.token.refreshed',
        expect.any(Object),
      );
    });

    it('should throw error when refreshing without refresh token', async () => {
      await service.setOAuthToken('int-saga', 'access-only');

      await expect(service.refreshOAuthToken('int-saga')).rejects.toThrow(
        'No refresh token available',
      );
    });
  });

  describe('Webhook Management', () => {
    it('should create webhook', async () => {
      const webhook = await service.createWebhook(
        'Invoice Created',
        'Factură Creată',
        'https://example.com/webhook',
        ['invoice.created', 'invoice.updated'],
      );

      expect(webhook.id).toBeDefined();
      expect(webhook.name).toBe('Invoice Created');
      expect(webhook.nameRo).toBe('Factură Creată');
      expect(webhook.events).toHaveLength(2);
      expect(webhook.secret).toBeDefined();
      expect(webhook.isActive).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'webhook.created',
        expect.objectContaining({ webhookId: webhook.id }),
      );
    });

    it('should create webhook with custom secret', async () => {
      const webhook = await service.createWebhook(
        'Test Webhook',
        'Webhook Test',
        'https://example.com',
        ['test.event'],
        { secret: 'my-custom-secret' },
      );

      expect(webhook.secret).toBe('my-custom-secret');
    });

    it('should get webhook by id', async () => {
      const created = await service.createWebhook(
        'Test',
        'Test',
        'https://example.com',
        ['test'],
      );

      const webhook = await service.getWebhook(created.id);

      expect(webhook).toBeDefined();
      expect(webhook!.id).toBe(created.id);
    });

    it('should list webhooks', async () => {
      await service.createWebhook('Webhook 1', 'Webhook 1', 'https://ex1.com', ['event1']);
      await service.createWebhook('Webhook 2', 'Webhook 2', 'https://ex2.com', ['event2']);

      const webhooks = await service.listWebhooks();

      expect(webhooks.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter webhooks by event', async () => {
      await service.createWebhook('Webhook 1', 'Webhook 1', 'https://ex1.com', ['invoice.created']);
      await service.createWebhook('Webhook 2', 'Webhook 2', 'https://ex2.com', ['customer.created']);

      const webhooks = await service.listWebhooks('invoice.created');

      expect(webhooks.every((w) => w.events.includes('invoice.created'))).toBe(true);
    });

    it('should update webhook', async () => {
      const webhook = await service.createWebhook('Test', 'Test', 'https://old.com', ['test']);

      const updated = await service.updateWebhook(webhook.id, {
        url: 'https://new.com',
      });

      expect(updated.url).toBe('https://new.com');
    });

    it('should throw error when updating non-existent webhook', async () => {
      await expect(service.updateWebhook('invalid-id', {})).rejects.toThrow('Webhook not found');
    });

    it('should delete webhook', async () => {
      const webhook = await service.createWebhook('Delete Me', 'Delete Me', 'https://ex.com', ['test']);

      const result = await service.deleteWebhook(webhook.id);

      expect(result).toBe(true);
      const deleted = await service.getWebhook(webhook.id);
      expect(deleted).toBeUndefined();
    });

    it('should trigger webhook', async () => {
      await service.createWebhook('Test', 'Test', 'https://example.com', ['invoice.created']);

      const deliveries = await service.triggerWebhook('invoice.created', {
        invoiceId: 'inv-123',
      });

      expect(deliveries.length).toBeGreaterThan(0);
      expect(deliveries[0].status).toBe('DELIVERED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'webhook.delivered',
        expect.objectContaining({ event: 'invoice.created' }),
      );
    });

    it('should update webhook success count', async () => {
      const webhook = await service.createWebhook('Test', 'Test', 'https://example.com', ['test.event']);

      await service.triggerWebhook('test.event', { data: 'test' });

      const updated = await service.getWebhook(webhook.id);
      expect(updated!.successCount).toBe(1);
      expect(updated!.lastTriggered).toBeDefined();
    });

    it('should get delivery by id', async () => {
      await service.createWebhook('Test', 'Test', 'https://example.com', ['test.event']);
      const deliveries = await service.triggerWebhook('test.event', {});

      const delivery = await service.getDelivery(deliveries[0].id);

      expect(delivery).toBeDefined();
      expect(delivery!.id).toBe(deliveries[0].id);
    });

    it('should list deliveries for webhook', async () => {
      const webhook = await service.createWebhook('Test', 'Test', 'https://example.com', ['test']);
      await service.triggerWebhook('test', { data: 1 });
      await service.triggerWebhook('test', { data: 2 });

      const deliveries = await service.listDeliveries(webhook.id);

      expect(deliveries.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Health Checks', () => {
    it('should check integration health', async () => {
      await service.activateIntegration('int-anaf-spv');

      const result = await service.checkHealth('int-anaf-spv');

      expect(result.integrationId).toBe('int-anaf-spv');
      expect(result.status).toBe('HEALTHY');
      expect(result.responseTime).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.health.checked',
        expect.objectContaining({ integrationId: 'int-anaf-spv' }),
      );
    });

    it('should throw error for non-existent integration', async () => {
      await expect(service.checkHealth('invalid-id')).rejects.toThrow('Integration not found');
    });

    it('should get health status', async () => {
      await service.activateIntegration('int-anaf-spv');
      await service.checkHealth('int-anaf-spv');

      const status = await service.getHealthStatus('int-anaf-spv');

      expect(status).toBeDefined();
      expect(status!.status).toBe('HEALTHY');
    });

    it('should check all active integrations', async () => {
      await service.activateIntegration('int-anaf-spv');
      await service.activateIntegration('int-saga');

      const results = await service.checkAllHealth();

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((r) => r.status === 'HEALTHY')).toBe(true);
    });

    it('should update lastHealthCheck on integration', async () => {
      await service.activateIntegration('int-anaf-spv');
      await service.checkHealth('int-anaf-spv');

      const integration = await service.getIntegration('int-anaf-spv');

      expect(integration!.lastHealthCheck).toBeDefined();
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.activateIntegration('int-anaf-spv');
      await service.makeRequest('int-anaf-spv', 'GET', '/test1');
      await service.makeRequest('int-anaf-spv', 'POST', '/test2');
      await service.makeRequest('int-anaf-spv', 'GET', '/test3');
    });

    it('should return total requests', async () => {
      const stats = await service.getIntegrationStats('int-anaf-spv');

      expect(stats.totalRequests).toBeGreaterThanOrEqual(3);
    });

    it('should count successful requests', async () => {
      const stats = await service.getIntegrationStats('int-anaf-spv');

      expect(stats.successfulRequests).toBeGreaterThanOrEqual(3);
    });

    it('should calculate average response time', async () => {
      const stats = await service.getIntegrationStats('int-anaf-spv');

      expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should track last hour activity', async () => {
      const stats = await service.getIntegrationStats('int-anaf-spv');

      expect(stats.lastHour.requests).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Romanian Localization', () => {
    it('should translate integration types', () => {
      expect(service.getIntegrationTypeName('ANAF_SPV')).toBe('ANAF Spațiul Privat Virtual');
      expect(service.getIntegrationTypeName('SAGA')).toBe('Sistem SAGA');
      expect(service.getIntegrationTypeName('BANK_PSD2')).toBe('Bancă PSD2');
    });

    it('should translate statuses', () => {
      expect(service.getStatusName('ACTIVE')).toBe('Activ');
      expect(service.getStatusName('ERROR')).toBe('Eroare');
      expect(service.getStatusName('RATE_LIMITED')).toBe('Limită Depășită');
    });

    it('should get all integration types with translations', () => {
      const types = service.getAllIntegrationTypes();

      expect(types.length).toBeGreaterThan(0);
      expect(types.every((t) => t.nameRo)).toBe(true);
    });

    it('should have Romanian diacritics in translations', () => {
      const spv = service.getIntegrationTypeName('ANAF_SPV');
      expect(spv).toContain('ț'); // Spațiul

      const rateLimited = service.getStatusName('RATE_LIMITED');
      expect(rateLimited).toContain('ă'); // Depășită
    });

    it('should have Romanian names in default integrations', async () => {
      const integration = await service.getIntegration('int-anaf-efactura');

      expect(integration!.nameRo).toBeDefined();
      expect(integration!.descriptionRo).toBeDefined();
    });
  });

  describe('Events', () => {
    it('should emit integration.created event', async () => {
      await service.createIntegration('Test', 'Test', 'CUSTOM', 'https://ex.com', 'NONE');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.created',
        expect.any(Object),
      );
    });

    it('should emit integration.updated event', async () => {
      await service.updateIntegration('int-saga', { description: 'Updated' });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.updated',
        expect.any(Object),
      );
    });

    it('should emit integration.activated event', async () => {
      await service.activateIntegration('int-anaf-spv');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.activated',
        expect.any(Object),
      );
    });

    it('should emit integration.deactivated event', async () => {
      await service.activateIntegration('int-anaf-spv');
      await service.deactivateIntegration('int-anaf-spv');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.deactivated',
        expect.any(Object),
      );
    });

    it('should emit integration.request event', async () => {
      await service.activateIntegration('int-anaf-spv');
      await service.makeRequest('int-anaf-spv', 'GET', '/test');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'integration.request',
        expect.any(Object),
      );
    });

    it('should emit webhook.created event', async () => {
      await service.createWebhook('Test', 'Test', 'https://ex.com', ['test']);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'webhook.created',
        expect.any(Object),
      );
    });

    it('should emit webhook.delivered event', async () => {
      await service.createWebhook('Test', 'Test', 'https://ex.com', ['test']);
      await service.triggerWebhook('test', {});

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'webhook.delivered',
        expect.any(Object),
      );
    });
  });
});
