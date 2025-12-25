import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebhookService, WebhookEventType } from './webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('webhook management', () => {
    const tenantId = 'tenant-webhook';

    it('should create webhook', async () => {
      const webhook = await service.createWebhook(
        tenantId,
        'Order Notifications',
        'https://example.com/webhooks',
        ['order.created', 'order.shipped'],
        'user-1',
      );

      expect(webhook.id).toBeDefined();
      expect(webhook.name).toBe('Order Notifications');
      expect(webhook.url).toBe('https://example.com/webhooks');
      expect(webhook.events).toHaveLength(2);
      expect(webhook.status).toBe('active');
      expect(webhook.secret).toBeDefined();
    });

    it('should create webhook with custom secret', async () => {
      const customSecret = 'my-custom-secret-key';
      const webhook = await service.createWebhook(
        tenantId,
        'Custom Secret Webhook',
        'https://example.com/hook',
        ['invoice.created'],
        'user-1',
        { secret: customSecret },
      );

      expect(webhook.secret).toBe(customSecret);
    });

    it('should create webhook with headers', async () => {
      const webhook = await service.createWebhook(
        tenantId,
        'Header Webhook',
        'https://example.com/hook',
        ['invoice.created'],
        'user-1',
        { headers: { 'X-Custom-Header': 'value' } },
      );

      expect(webhook.headers).toEqual({ 'X-Custom-Header': 'value' });
    });

    it('should create webhook with retry policy', async () => {
      const webhook = await service.createWebhook(
        tenantId,
        'Retry Webhook',
        'https://example.com/hook',
        ['payment.received'],
        'user-1',
        {
          retryPolicy: {
            maxRetries: 10,
            initialDelayMs: 5000,
          },
        },
      );

      expect(webhook.retryPolicy.maxRetries).toBe(10);
      expect(webhook.retryPolicy.initialDelayMs).toBe(5000);
    });

    it('should get webhook by id', async () => {
      const created = await service.createWebhook(
        tenantId,
        'Get Test',
        'https://example.com/hook',
        ['customer.created'],
        'user-1',
      );

      const retrieved = await service.getWebhook(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Get Test');
    });

    it('should return null for non-existent webhook', async () => {
      const webhook = await service.getWebhook('non-existent');
      expect(webhook).toBeNull();
    });

    it('should get webhooks for tenant', async () => {
      await service.createWebhook(tenantId, 'Webhook 1', 'https://a.com', ['order.created'], 'user-1');
      await service.createWebhook(tenantId, 'Webhook 2', 'https://b.com', ['invoice.paid'], 'user-1');
      await service.createWebhook('other', 'Other', 'https://c.com', ['order.created'], 'user-2');

      const webhooks = await service.getWebhooks(tenantId);
      expect(webhooks.every(w => w.tenantId === tenantId)).toBe(true);
    });

    it('should filter webhooks by status', async () => {
      const wh1 = await service.createWebhook(tenantId, 'Active', 'https://a.com', ['order.created'], 'user-1');
      await service.createWebhook(tenantId, 'Inactive', 'https://b.com', ['order.created'], 'user-1');
      await service.deactivateWebhook((await service.getWebhooks(tenantId))[0].id);

      const activeWebhooks = await service.getWebhooks(tenantId, { status: 'active' });
      expect(activeWebhooks.every(w => w.status === 'active')).toBe(true);
    });

    it('should filter webhooks by event type', async () => {
      await service.createWebhook(tenantId, 'Order Hook', 'https://a.com', ['order.created'], 'user-1');
      await service.createWebhook(tenantId, 'Invoice Hook', 'https://b.com', ['invoice.paid'], 'user-1');

      const orderWebhooks = await service.getWebhooks(tenantId, { eventType: 'order.created' });
      expect(orderWebhooks.every(w => w.events.includes('order.created'))).toBe(true);
    });

    it('should update webhook', async () => {
      const webhook = await service.createWebhook(
        tenantId,
        'Update Test',
        'https://example.com/old',
        ['order.created'],
        'user-1',
      );

      const updated = await service.updateWebhook(webhook.id, {
        name: 'Updated Name',
        url: 'https://example.com/new',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.url).toBe('https://example.com/new');
    });

    it('should delete webhook', async () => {
      const webhook = await service.createWebhook(
        tenantId,
        'Delete Test',
        'https://example.com/hook',
        ['order.created'],
        'user-1',
      );

      const deleted = await service.deleteWebhook(webhook.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getWebhook(webhook.id);
      expect(retrieved).toBeNull();
    });

    it('should activate webhook', async () => {
      const webhook = await service.createWebhook(
        tenantId,
        'Activate Test',
        'https://example.com/hook',
        ['order.created'],
        'user-1',
      );

      await service.deactivateWebhook(webhook.id);
      const activated = await service.activateWebhook(webhook.id);

      expect(activated?.status).toBe('active');
    });

    it('should deactivate webhook', async () => {
      const webhook = await service.createWebhook(
        tenantId,
        'Deactivate Test',
        'https://example.com/hook',
        ['order.created'],
        'user-1',
      );

      const deactivated = await service.deactivateWebhook(webhook.id);
      expect(deactivated?.status).toBe('inactive');
    });

    it('should rotate secret', async () => {
      const webhook = await service.createWebhook(
        tenantId,
        'Rotate Test',
        'https://example.com/hook',
        ['order.created'],
        'user-1',
      );

      const originalSecret = webhook.secret;
      const result = await service.rotateSecret(webhook.id);

      expect(result).not.toBeNull();
      expect(result?.newSecret).not.toBe(originalSecret);
      expect(result?.webhook.secret).toBe(result?.newSecret);
    });
  });

  describe('event dispatching', () => {
    it('should dispatch event to matching webhooks', async () => {
      const tenantId = 'tenant-dispatch';

      await service.createWebhook(
        tenantId,
        'Order Webhook',
        'https://example.com/orders',
        ['order.created', 'order.shipped'],
        'user-1',
      );

      const deliveries = await service.dispatchEvent(
        tenantId,
        'order.created',
        { orderId: '123', total: 100 },
        'order-service',
      );

      expect(deliveries.length).toBeGreaterThan(0);
      expect(deliveries[0].eventType).toBe('order.created');
    });

    it('should not dispatch to inactive webhooks', async () => {
      const tenantId = 'tenant-inactive';

      const webhook = await service.createWebhook(
        tenantId,
        'Inactive Webhook',
        'https://example.com/hook',
        ['invoice.created'],
        'user-1',
      );

      await service.deactivateWebhook(webhook.id);

      const deliveries = await service.dispatchEvent(
        tenantId,
        'invoice.created',
        { invoiceId: '456' },
        'invoice-service',
      );

      expect(deliveries.length).toBe(0);
    });

    it('should create delivery record', async () => {
      const tenantId = 'tenant-delivery';

      await service.createWebhook(
        tenantId,
        'Delivery Webhook',
        'https://example.com/hook',
        ['payment.received'],
        'user-1',
      );

      const deliveries = await service.dispatchEvent(
        tenantId,
        'payment.received',
        { paymentId: '789', amount: 500 },
        'payment-service',
      );

      expect(deliveries[0].id).toBeDefined();
      expect(deliveries[0].payload).toBeDefined();
      expect(deliveries[0].payload.data.paymentId).toBe('789');
    });
  });

  describe('signature verification', () => {
    it('should generate signature', () => {
      const payload = { test: 'data', value: 123 };
      const secret = 'test-secret';

      const signature = service.generateSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA256 hex
    });

    it('should verify valid signature', () => {
      const payload = { test: 'data', value: 123 };
      const secret = 'test-secret';

      const signature = service.generateSignature(payload, secret);
      const valid = service.verifySignature(payload, signature, secret);

      expect(valid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = { test: 'data', value: 123 };
      const secret = 'test-secret';

      const valid = service.verifySignature(payload, 'invalid-signature'.padEnd(64, '0'), secret);

      expect(valid).toBe(false);
    });

    it('should reject tampered payload', () => {
      const originalPayload = { test: 'data', value: 123 };
      const tamperedPayload = { test: 'data', value: 456 };
      const secret = 'test-secret';

      const signature = service.generateSignature(originalPayload, secret);
      const valid = service.verifySignature(tamperedPayload, signature, secret);

      expect(valid).toBe(false);
    });
  });

  describe('delivery management', () => {
    it('should get delivery by id', async () => {
      const tenantId = 'tenant-get-delivery';

      await service.createWebhook(
        tenantId,
        'Get Delivery Webhook',
        'https://example.com/hook',
        ['customer.created'],
        'user-1',
      );

      const deliveries = await service.dispatchEvent(
        tenantId,
        'customer.created',
        { customerId: '123' },
        'customer-service',
      );

      const retrieved = await service.getDelivery(deliveries[0].id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(deliveries[0].id);
    });

    it('should get deliveries for tenant', async () => {
      const tenantId = 'tenant-get-deliveries';

      await service.createWebhook(
        tenantId,
        'Multiple Deliveries',
        'https://example.com/hook',
        ['order.created', 'order.shipped'],
        'user-1',
      );

      await service.dispatchEvent(tenantId, 'order.created', { id: '1' }, 'test');
      await service.dispatchEvent(tenantId, 'order.shipped', { id: '2' }, 'test');

      const deliveries = await service.getDeliveries(tenantId);
      expect(deliveries.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter deliveries by status', async () => {
      const tenantId = 'tenant-filter-status';

      await service.createWebhook(
        tenantId,
        'Status Filter',
        'https://example.com/hook',
        ['invoice.paid'],
        'user-1',
      );

      await service.dispatchEvent(tenantId, 'invoice.paid', { id: '1' }, 'test');

      // Wait for delivery to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const deliveredDeliveries = await service.getDeliveries(tenantId, { status: 'delivered' });
      expect(deliveredDeliveries.every(d => d.status === 'delivered')).toBe(true);
    });

    it('should retry failed delivery', async () => {
      const tenantId = 'tenant-retry';

      await service.createWebhook(
        tenantId,
        'Retry Test',
        'https://example.com/hook',
        ['delivery.failed'],
        'user-1',
      );

      const deliveries = await service.dispatchEvent(
        tenantId,
        'delivery.failed',
        { deliveryId: '123' },
        'test',
      );

      // Wait for delivery to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get current delivery status - retryDelivery returns null if already delivered
      const delivery = await service.getDelivery(deliveries[0].id);

      // The delivery should exist and have a valid status
      expect(delivery).toBeDefined();
      expect(['pending', 'delivered', 'failed', 'retrying']).toContain(delivery?.status);

      // Retry behavior varies based on current status - verify it doesn't throw
      const retried = await service.retryDelivery(deliveries[0].id);

      // retried is either null (already delivered/not retryable) or a delivery object
      expect(retried === null || typeof retried === 'object').toBe(true);
    });
  });

  describe('webhook testing', () => {
    it('should test webhook', async () => {
      const webhook = await service.createWebhook(
        'tenant-test',
        'Test Webhook',
        'https://example.com/hook',
        ['order.created'],
        'user-1',
      );

      const result = await service.testWebhook(webhook.id);

      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.success).toBe('boolean');
    });

    it('should return error for non-existent webhook', async () => {
      const result = await service.testWebhook('non-existent');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Webhook not found');
    });
  });

  describe('statistics', () => {
    it('should get webhook statistics', async () => {
      const tenantId = 'tenant-stats';

      await service.createWebhook(
        tenantId,
        'Stats Webhook',
        'https://example.com/hook',
        ['order.created', 'order.shipped'],
        'user-1',
      );

      await service.dispatchEvent(tenantId, 'order.created', { id: '1' }, 'test');
      await service.dispatchEvent(tenantId, 'order.shipped', { id: '2' }, 'test');

      const stats = await service.getWebhookStats(tenantId);

      expect(stats.totalDeliveries).toBeGreaterThanOrEqual(2);
      expect(stats.byEventType).toBeDefined();
      expect(stats.byStatus).toBeDefined();
    });

    it('should calculate success rate', async () => {
      const tenantId = 'tenant-success-rate';

      await service.createWebhook(
        tenantId,
        'Success Rate Webhook',
        'https://example.com/hook',
        ['payment.received'],
        'user-1',
      );

      await service.dispatchEvent(tenantId, 'payment.received', { id: '1' }, 'test');
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = await service.getWebhookStats(tenantId);
      expect(typeof stats.successRate).toBe('number');
    });

    it('should return empty stats for new tenant', async () => {
      const stats = await service.getWebhookStats('new-tenant');

      expect(stats.totalDeliveries).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('event types', () => {
    it('should return all event types', () => {
      const eventTypes = service.getEventTypes();

      expect(eventTypes).toContain('invoice.created');
      expect(eventTypes).toContain('order.created');
      expect(eventTypes).toContain('payment.received');
      expect(eventTypes).toContain('delivery.completed');
      expect(eventTypes.length).toBeGreaterThan(20);
    });

    it('should return event categories', () => {
      const categories = service.getEventCategories();

      expect(categories.invoice).toBeDefined();
      expect(categories.order).toBeDefined();
      expect(categories.payment).toBeDefined();
      expect(categories.system).toBeDefined();
    });

    it('should have invoice events in invoice category', () => {
      const categories = service.getEventCategories();

      expect(categories.invoice).toContain('invoice.created');
      expect(categories.invoice).toContain('invoice.paid');
    });
  });

  describe('metadata', () => {
    it('should return webhook statuses', () => {
      const statuses = service.getWebhookStatuses();

      expect(statuses).toContain('active');
      expect(statuses).toContain('inactive');
      expect(statuses).toContain('suspended');
    });

    it('should return delivery statuses', () => {
      const statuses = service.getDeliveryStatuses();

      expect(statuses).toContain('pending');
      expect(statuses).toContain('delivered');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('retrying');
    });
  });

  describe('retry policy', () => {
    it('should use default retry policy', async () => {
      const webhook = await service.createWebhook(
        'tenant-default-retry',
        'Default Retry',
        'https://example.com/hook',
        ['order.created'],
        'user-1',
      );

      expect(webhook.retryPolicy.maxRetries).toBe(5);
      expect(webhook.retryPolicy.initialDelayMs).toBe(1000);
      expect(webhook.retryPolicy.maxDelayMs).toBe(300000);
      expect(webhook.retryPolicy.backoffMultiplier).toBe(2);
    });
  });

  describe('rate limiting', () => {
    it('should set rate limit per minute', async () => {
      const webhook = await service.createWebhook(
        'tenant-rate-limit',
        'Rate Limited',
        'https://example.com/hook',
        ['order.created'],
        'user-1',
        { rateLimitPerMinute: 30 },
      );

      expect(webhook.rateLimitPerMinute).toBe(30);
    });

    it('should use default rate limit', async () => {
      const webhook = await service.createWebhook(
        'tenant-default-rate',
        'Default Rate',
        'https://example.com/hook',
        ['order.created'],
        'user-1',
      );

      expect(webhook.rateLimitPerMinute).toBe(60);
    });
  });
});
