import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WebhookManagementService, WebhookEvent, WebhookStatus } from './webhook-management.service';

describe('WebhookManagementService', () => {
  let service: WebhookManagementService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookManagementService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookManagementService>(WebhookManagementService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Webhook Creation', () => {
    it('should create a webhook', () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Test Webhook',
        nameRo: 'Webhook Test',
        description: 'A test webhook',
        descriptionRo: 'Un webhook de test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      expect(webhook.id).toBeDefined();
      expect(webhook.status).toBe('ACTIVE');
      expect(webhook.secret).toMatch(/^whsec_/);
    });

    it('should create webhook with multiple events', () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Multi Event',
        nameRo: 'Eveniment Multiplu',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created', 'invoice.paid', 'client.created'],
        createdBy: 'user-1',
      });

      expect(webhook.events.length).toBe(3);
    });

    it('should create webhook with custom headers', () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Custom Headers',
        nameRo: 'Anteturi Personalizate',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        headers: { 'X-Custom-Header': 'value' },
        createdBy: 'user-1',
      });

      expect(webhook.headers['X-Custom-Header']).toBe('value');
    });

    it('should create webhook with custom retry policy', () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Custom Retry',
        nameRo: 'Reîncercare Personalizată',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        retryPolicy: { maxRetries: 5, initialDelayMs: 2000 },
        createdBy: 'user-1',
      });

      expect(webhook.retryPolicy.maxRetries).toBe(5);
      expect(webhook.retryPolicy.initialDelayMs).toBe(2000);
    });

    it('should create webhook with filters', () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Filtered',
        nameRo: 'Filtrat',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        filters: [{ field: 'amount', operator: 'EQUALS', value: 1000 }],
        createdBy: 'user-1',
      });

      expect(webhook.filters?.length).toBe(1);
    });

    it('should throw for invalid URL', () => {
      expect(() =>
        service.createWebhook({
          tenantId: 'tenant-1',
          name: 'Invalid URL',
          nameRo: 'URL Invalid',
          description: 'Test',
          descriptionRo: 'Test',
          url: 'not-a-valid-url',
          events: ['invoice.created'],
          createdBy: 'user-1',
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw for empty events', () => {
      expect(() =>
        service.createWebhook({
          tenantId: 'tenant-1',
          name: 'No Events',
          nameRo: 'Fără Evenimente',
          description: 'Test',
          descriptionRo: 'Test',
          url: 'https://example.com/webhook',
          events: [],
          createdBy: 'user-1',
        }),
      ).toThrow(BadRequestException);
    });

    it('should emit webhook created event', () => {
      service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Event Test',
        nameRo: 'Test Eveniment',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('webhook.created', expect.any(Object));
    });
  });

  describe('Webhook Retrieval', () => {
    let webhookId: string;

    beforeEach(() => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Retrieve Test',
        nameRo: 'Test Recuperare',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });
      webhookId = webhook.id;
    });

    it('should get webhook by id', () => {
      const webhook = service.getWebhook(webhookId);
      expect(webhook.name).toBe('Retrieve Test');
    });

    it('should throw for invalid webhook id', () => {
      expect(() => service.getWebhook('invalid-id')).toThrow(NotFoundException);
    });

    it('should get all webhooks', () => {
      const webhooks = service.getWebhooks();
      expect(webhooks.length).toBeGreaterThan(0);
    });

    it('should filter by tenant', () => {
      service.createWebhook({
        tenantId: 'tenant-2',
        name: 'Other Tenant',
        nameRo: 'Alt Tenant',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      const webhooks = service.getWebhooks({ tenantId: 'tenant-1' });
      expect(webhooks.every((w) => w.tenantId === 'tenant-1')).toBe(true);
    });

    it('should filter by status', () => {
      service.pauseWebhook(webhookId);

      const active = service.getWebhooks({ status: 'ACTIVE' });
      const paused = service.getWebhooks({ status: 'PAUSED' });

      expect(active.find((w) => w.id === webhookId)).toBeUndefined();
      expect(paused.find((w) => w.id === webhookId)).toBeDefined();
    });

    it('should filter by event', () => {
      service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Payment Webhook',
        nameRo: 'Webhook Plată',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['payment.received'],
        createdBy: 'user-1',
      });

      const invoiceWebhooks = service.getWebhooks({ event: 'invoice.created' });
      expect(invoiceWebhooks.every((w) => w.events.includes('invoice.created'))).toBe(true);
    });
  });

  describe('Webhook Updates', () => {
    let webhookId: string;

    beforeEach(() => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Update Test',
        nameRo: 'Test Actualizare',
        description: 'Original',
        descriptionRo: 'Original',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });
      webhookId = webhook.id;
    });

    it('should update webhook', () => {
      const updated = service.updateWebhook(webhookId, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');
    });

    it('should update webhook URL', () => {
      const updated = service.updateWebhook(webhookId, { url: 'https://new-url.com/webhook' });
      expect(updated.url).toBe('https://new-url.com/webhook');
    });

    it('should throw for invalid URL update', () => {
      expect(() => service.updateWebhook(webhookId, { url: 'invalid' })).toThrow(BadRequestException);
    });

    it('should update events', () => {
      const updated = service.updateWebhook(webhookId, { events: ['invoice.paid', 'invoice.deleted'] });
      expect(updated.events).toContain('invoice.paid');
      expect(updated.events).not.toContain('invoice.created');
    });

    it('should emit webhook updated event', () => {
      service.updateWebhook(webhookId, { name: 'Updated' });
      expect(eventEmitter.emit).toHaveBeenCalledWith('webhook.updated', { webhookId });
    });
  });

  describe('Webhook Deletion', () => {
    it('should delete webhook', () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Delete Test',
        nameRo: 'Test Ștergere',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      service.deleteWebhook(webhook.id);
      expect(() => service.getWebhook(webhook.id)).toThrow(NotFoundException);
    });

    it('should throw when deleting non-existent webhook', () => {
      expect(() => service.deleteWebhook('invalid-id')).toThrow(NotFoundException);
    });

    it('should emit webhook deleted event', () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Delete Event',
        nameRo: 'Eveniment Ștergere',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      service.deleteWebhook(webhook.id);
      expect(eventEmitter.emit).toHaveBeenCalledWith('webhook.deleted', { webhookId: webhook.id });
    });
  });

  describe('Webhook Status Management', () => {
    let webhookId: string;

    beforeEach(() => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Status Test',
        nameRo: 'Test Stare',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });
      webhookId = webhook.id;
    });

    it('should pause webhook', () => {
      const paused = service.pauseWebhook(webhookId);
      expect(paused.status).toBe('PAUSED');
    });

    it('should resume webhook', () => {
      service.pauseWebhook(webhookId);
      const resumed = service.resumeWebhook(webhookId);
      expect(resumed.status).toBe('ACTIVE');
    });

    it('should reset consecutive failures on resume', () => {
      const webhook = service.getWebhook(webhookId);
      (webhook as any).consecutiveFailures = 5;
      service.pauseWebhook(webhookId);

      const resumed = service.resumeWebhook(webhookId);
      expect(resumed.consecutiveFailures).toBe(0);
    });

    it('should disable webhook', () => {
      const disabled = service.disableWebhook(webhookId);
      expect(disabled.status).toBe('DISABLED');
    });

    it('should throw when pausing disabled webhook', () => {
      service.disableWebhook(webhookId);
      expect(() => service.pauseWebhook(webhookId)).toThrow(BadRequestException);
    });

    it('should throw when resuming non-paused webhook', () => {
      expect(() => service.resumeWebhook(webhookId)).toThrow(BadRequestException);
    });
  });

  describe('Secret Management', () => {
    it('should rotate secret', () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Secret Test',
        nameRo: 'Test Secret',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      const originalSecret = webhook.secret;
      const { newSecret } = service.rotateSecret(webhook.id);

      expect(newSecret).not.toBe(originalSecret);
      expect(newSecret).toMatch(/^whsec_/);
    });

    it('should emit secret rotated event', () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Rotate Event',
        nameRo: 'Eveniment Rotație',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      service.rotateSecret(webhook.id);
      expect(eventEmitter.emit).toHaveBeenCalledWith('webhook.secret.rotated', { webhookId: webhook.id });
    });
  });

  describe('Webhook Delivery', () => {
    let webhookId: string;

    beforeEach(() => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Delivery Test',
        nameRo: 'Test Livrare',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });
      webhookId = webhook.id;
    });

    it('should send webhook', async () => {
      const webhook = service.getWebhook(webhookId);
      const delivery = await service.sendWebhook(webhook, 'invoice.created', { invoiceId: '123' });

      expect(delivery.id).toBeDefined();
      expect(delivery.event).toBe('invoice.created');
      expect(delivery.status).toBe('DELIVERED');
    });

    it('should include payload in delivery', async () => {
      const webhook = service.getWebhook(webhookId);
      const delivery = await service.sendWebhook(webhook, 'invoice.paid', { amount: 1000 });

      expect(delivery.payload.data.amount).toBe(1000);
    });

    it('should record delivery attempt', async () => {
      const webhook = service.getWebhook(webhookId);
      const delivery = await service.sendWebhook(webhook, 'invoice.created', {});

      expect(delivery.attempts.length).toBe(1);
      expect(delivery.attempts[0].success).toBe(true);
    });

    it('should handle delivery failure', async () => {
      const webhook = service.getWebhook(webhookId);
      webhook.metadata = { simulateFailure: true };
      webhook.retryPolicy.maxRetries = 0;

      const delivery = await service.sendWebhook(webhook, 'invoice.created', {});

      expect(delivery.status).toBe('FAILED');
    });

    it('should update webhook last delivery time', async () => {
      const webhook = service.getWebhook(webhookId);
      await service.sendWebhook(webhook, 'invoice.created', {});

      const updated = service.getWebhook(webhookId);
      expect(updated.lastDeliveryAt).toBeDefined();
    });

    it('should emit delivery success event', async () => {
      const webhook = service.getWebhook(webhookId);
      await service.sendWebhook(webhook, 'invoice.created', {});

      expect(eventEmitter.emit).toHaveBeenCalledWith('webhook.delivery.success', expect.any(Object));
    });
  });

  describe('Delivery Retrieval', () => {
    let webhookId: string;
    let deliveryId: string;

    beforeEach(async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Delivery Retrieve',
        nameRo: 'Recuperare Livrare',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created', 'invoice.paid'],
        createdBy: 'user-1',
      });
      webhookId = webhook.id;

      const delivery = await service.sendWebhook(webhook, 'invoice.created', {});
      deliveryId = delivery.id;
    });

    it('should get delivery by id', () => {
      const delivery = service.getDelivery(deliveryId);
      expect(delivery.event).toBe('invoice.created');
    });

    it('should throw for invalid delivery id', () => {
      expect(() => service.getDelivery('invalid-id')).toThrow(NotFoundException);
    });

    it('should get all deliveries', () => {
      const deliveries = service.getDeliveries();
      expect(deliveries.length).toBeGreaterThan(0);
    });

    it('should filter by webhook', () => {
      const deliveries = service.getDeliveries({ webhookId });
      expect(deliveries.every((d) => d.webhookId === webhookId)).toBe(true);
    });

    it('should filter by status', () => {
      const deliveries = service.getDeliveries({ status: 'DELIVERED' });
      expect(deliveries.every((d) => d.status === 'DELIVERED')).toBe(true);
    });

    it('should filter by event', () => {
      const deliveries = service.getDeliveries({ event: 'invoice.created' });
      expect(deliveries.every((d) => d.event === 'invoice.created')).toBe(true);
    });

    it('should limit results', async () => {
      const webhook = service.getWebhook(webhookId);
      await service.sendWebhook(webhook, 'invoice.paid', {});
      await service.sendWebhook(webhook, 'invoice.paid', {});

      const deliveries = service.getDeliveries({ limit: 2 });
      expect(deliveries.length).toBe(2);
    });
  });

  describe('Retry Delivery', () => {
    it('should retry failed delivery', async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Retry Test',
        nameRo: 'Test Reîncercare',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      webhook.metadata = { simulateFailure: true };
      webhook.retryPolicy.maxRetries = 0;

      const delivery = await service.sendWebhook(webhook, 'invoice.created', {});
      expect(delivery.status).toBe('FAILED');

      // Remove failure simulation and retry
      webhook.metadata = {};
      const retried = await service.retryDelivery(delivery.id);
      expect(retried.status).toBe('DELIVERED');
    });

    it('should throw when retrying non-failed delivery', async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Retry Non-Failed',
        nameRo: 'Reîncercare Non-Eșuat',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      const delivery = await service.sendWebhook(webhook, 'invoice.created', {});
      await expect(service.retryDelivery(delivery.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Test Webhook', () => {
    it('should send test webhook', async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Test Webhook',
        nameRo: 'Webhook Test',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      const delivery = await service.testWebhook(webhook.id);
      expect(delivery.payload.data.test).toBe(true);
    });

    it('should include bilingual test message', async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Bilingual Test',
        nameRo: 'Test Bilingv',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      const delivery = await service.testWebhook(webhook.id);
      expect(delivery.payload.data.message).toBeDefined();
      expect(delivery.payload.data.messageRo).toBeDefined();
    });
  });

  describe('Signature Verification', () => {
    it('should verify valid signature', () => {
      const payload = '{"test": true}';
      const secret = 'test-secret';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      expect(service.verifySignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = '{"test": true}';
      const secret = 'test-secret';

      expect(service.verifySignature(payload, 'invalid-signature', secret)).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Stats Webhook',
        nameRo: 'Webhook Statistici',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created', 'invoice.paid'],
        createdBy: 'user-1',
      });

      await service.sendWebhook(webhook, 'invoice.created', {});
      await service.sendWebhook(webhook, 'invoice.paid', {});
    });

    it('should get stats', () => {
      const stats = service.getStats();

      expect(stats.totalEndpoints).toBeGreaterThan(0);
      expect(stats.totalDeliveries).toBeGreaterThan(0);
    });

    it('should count successful deliveries', () => {
      const stats = service.getStats();
      expect(stats.successfulDeliveries).toBeGreaterThan(0);
    });

    it('should calculate delivery rate', () => {
      const stats = service.getStats();
      expect(stats.deliveryRate).toBeGreaterThan(0);
    });

    it('should track by event', () => {
      const stats = service.getStats();
      expect(stats.byEvent['invoice.created']).toBeDefined();
    });

    it('should filter stats by tenant', () => {
      service.createWebhook({
        tenantId: 'tenant-2',
        name: 'Other Tenant',
        nameRo: 'Alt Tenant',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['client.created'],
        createdBy: 'user-1',
      });

      const stats = service.getStats('tenant-1');
      expect(stats.totalEndpoints).toBeGreaterThan(0);
    });
  });

  describe('Event Log', () => {
    beforeEach(async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Log Webhook',
        nameRo: 'Webhook Jurnal',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        createdBy: 'user-1',
      });

      await service.sendWebhook(webhook, 'invoice.created', {});
    });

    it('should get event log', () => {
      const log = service.getEventLog();
      expect(log.length).toBeGreaterThan(0);
    });

    it('should filter by webhook', () => {
      const webhooks = service.getWebhooks();
      const log = service.getEventLog(webhooks[0].id);
      expect(log.every((e) => e.webhookId === webhooks[0].id)).toBe(true);
    });

    it('should limit results', () => {
      const log = service.getEventLog(undefined, 5);
      expect(log.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Available Events', () => {
    it('should get available events', () => {
      const events = service.getAvailableEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should have bilingual labels', () => {
      const events = service.getAvailableEvents();
      events.forEach((e) => {
        expect(e.label).toBeDefined();
        expect(e.labelRo).toBeDefined();
      });
    });

    it('should have categories', () => {
      const events = service.getAvailableEvents();
      const categories = new Set(events.map((e) => e.category));
      expect(categories.size).toBeGreaterThan(1);
    });

    it('should include invoice events', () => {
      const events = service.getAvailableEvents();
      const invoiceEvents = events.filter((e) => e.event.startsWith('invoice.'));
      expect(invoiceEvents.length).toBeGreaterThan(0);
    });

    it('should include ANAF events', () => {
      const events = service.getAvailableEvents();
      const anafEvents = events.filter((e) => e.event.startsWith('anaf.'));
      expect(anafEvents.length).toBe(2);
    });
  });

  describe('Filter Matching', () => {
    it('should match EQUALS filter', async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Filter EQUALS',
        nameRo: 'Filtru EQUALS',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        filters: [{ field: 'status', operator: 'EQUALS', value: 'PAID' }],
        createdBy: 'user-1',
      });

      const delivery1 = await service.sendWebhook(webhook, 'invoice.created', { status: 'PAID' });
      expect(delivery1.status).toBe('DELIVERED');
    });

    it('should match CONTAINS filter', async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Filter CONTAINS',
        nameRo: 'Filtru CONTAINS',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        filters: [{ field: 'clientName', operator: 'CONTAINS', value: 'SRL' }],
        createdBy: 'user-1',
      });

      const delivery = await service.sendWebhook(webhook, 'invoice.created', { clientName: 'Test SRL' });
      expect(delivery.status).toBe('DELIVERED');
    });

    it('should match IN filter', async () => {
      const webhook = service.createWebhook({
        tenantId: 'tenant-1',
        name: 'Filter IN',
        nameRo: 'Filtru IN',
        description: 'Test',
        descriptionRo: 'Test',
        url: 'https://example.com/webhook',
        events: ['invoice.created'],
        filters: [{ field: 'currency', operator: 'IN', value: ['RON', 'EUR'] }],
        createdBy: 'user-1',
      });

      const delivery = await service.sendWebhook(webhook, 'invoice.created', { currency: 'RON' });
      expect(delivery.status).toBe('DELIVERED');
    });
  });

  describe('Webhook Events', () => {
    const events: WebhookEvent[] = [
      'invoice.created', 'invoice.updated', 'invoice.deleted', 'invoice.paid', 'invoice.overdue',
      'client.created', 'client.updated', 'client.deleted',
      'payment.received', 'payment.failed',
      'document.created', 'document.signed', 'document.expired',
      'anaf.submission.success', 'anaf.submission.failed',
      'employee.hired', 'employee.terminated',
      'report.generated',
    ];

    events.forEach((event) => {
      it(`should handle ${event} event`, async () => {
        const webhook = service.createWebhook({
          tenantId: 'tenant-1',
          name: `Event ${event}`,
          nameRo: `Eveniment ${event}`,
          description: 'Test',
          descriptionRo: 'Test',
          url: 'https://example.com/webhook',
          events: [event],
          createdBy: 'user-1',
        });

        const delivery = await service.sendWebhook(webhook, event, {});
        expect(delivery.event).toBe(event);
      });
    });
  });
});
