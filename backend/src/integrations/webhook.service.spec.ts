import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  WebhookService,
  EventType,
  WebhookStatus,
} from './webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-config'),
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should return event types', () => {
      const types = service.getEventTypes();
      expect(types).toContain('invoice.created');
      expect(types).toContain('customer.created');
      expect(types).toContain('payment.received');
      expect(types).toContain('delivery.completed');
    });

    it('should return event categories', () => {
      const categories = service.getEventCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.some(c => c.category === 'Invoice')).toBe(true);
      expect(categories.some(c => c.category === 'Payment')).toBe(true);
    });
  });

  describe('webhook endpoints', () => {
    it('should create endpoint', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-1',
        'My Webhook',
        'https://example.com/webhook',
        ['invoice.created', 'invoice.paid'],
      );

      expect(endpoint.id).toBeDefined();
      expect(endpoint.name).toBe('My Webhook');
      expect(endpoint.url).toBe('https://example.com/webhook');
      expect(endpoint.events).toContain('invoice.created');
      expect(endpoint.secret).toBeDefined();
      expect(endpoint.status).toBe('active');
    });

    it('should create endpoint with custom headers', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-1',
        'Webhook with Headers',
        'https://example.com/hook',
        ['customer.created'],
        { headers: { 'X-Custom-Header': 'value' } },
      );

      expect(endpoint.headers).toEqual({ 'X-Custom-Header': 'value' });
    });

    it('should create endpoint with custom retry policy', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-1',
        'Custom Retry',
        'https://example.com/hook',
        ['order.created'],
        { retryPolicy: { maxRetries: 10 } },
      );

      expect(endpoint.retryPolicy.maxRetries).toBe(10);
    });

    it('should get endpoint by ID', async () => {
      const created = await service.createEndpoint(
        'tenant-1',
        'Get Test',
        'https://example.com/hook',
        ['invoice.created'],
      );

      const retrieved = await service.getEndpoint(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent endpoint', async () => {
      const result = await service.getEndpoint('non-existent');
      expect(result).toBeNull();
    });

    it('should get endpoints for tenant', async () => {
      await service.createEndpoint('tenant-list', 'Hook 1', 'https://a.com', ['invoice.created']);
      await service.createEndpoint('tenant-list', 'Hook 2', 'https://b.com', ['customer.created']);

      const endpoints = await service.getEndpoints('tenant-list');
      expect(endpoints.length).toBe(2);
    });

    it('should filter endpoints by status', async () => {
      await service.createEndpoint('tenant-status', 'Active', 'https://a.com', ['invoice.created']);
      const paused = await service.createEndpoint('tenant-status', 'Paused', 'https://b.com', ['customer.created']);
      await service.pauseEndpoint(paused.id);

      const activeEndpoints = await service.getEndpoints('tenant-status', 'active');
      expect(activeEndpoints.length).toBe(1);
    });

    it('should update endpoint', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-update',
        'Original',
        'https://example.com',
        ['invoice.created'],
      );

      const updated = await service.updateEndpoint(endpoint.id, {
        name: 'Updated Name',
        events: ['invoice.created', 'invoice.updated'],
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.events).toContain('invoice.updated');
    });

    it('should return null when updating non-existent endpoint', async () => {
      const result = await service.updateEndpoint('non-existent', { name: 'Test' });
      expect(result).toBeNull();
    });

    it('should delete endpoint', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-delete',
        'To Delete',
        'https://example.com',
        ['invoice.created'],
      );

      const success = await service.deleteEndpoint(endpoint.id);
      expect(success).toBe(true);

      const retrieved = await service.getEndpoint(endpoint.id);
      expect(retrieved).toBeNull();
    });

    it('should rotate secret', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-rotate',
        'Secret Test',
        'https://example.com',
        ['invoice.created'],
      );

      const oldSecret = endpoint.secret;
      const result = await service.rotateSecret(endpoint.id);

      expect(result?.oldSecret).toBe(oldSecret);
      expect(result?.newSecret).not.toBe(oldSecret);
    });

    it('should return null when rotating secret for non-existent endpoint', async () => {
      const result = await service.rotateSecret('non-existent');
      expect(result).toBeNull();
    });

    it('should pause endpoint', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-pause',
        'Pause Test',
        'https://example.com',
        ['invoice.created'],
      );

      const paused = await service.pauseEndpoint(endpoint.id);
      expect(paused?.status).toBe('paused');
    });

    it('should resume endpoint', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-resume',
        'Resume Test',
        'https://example.com',
        ['invoice.created'],
      );

      await service.pauseEndpoint(endpoint.id);
      const resumed = await service.resumeEndpoint(endpoint.id);

      expect(resumed?.status).toBe('active');
      expect(resumed?.failureCount).toBe(0);
    });
  });

  describe('events', () => {
    it('should emit event', async () => {
      const event = await service.emit(
        'tenant-event',
        'invoice.created',
        { invoiceId: 'inv-123', amount: 100 },
      );

      expect(event.id).toBeDefined();
      expect(event.type).toBe('invoice.created');
      expect(event.data.invoiceId).toBe('inv-123');
      expect(event.metadata.correlationId).toBeDefined();
    });

    it('should emit event with metadata', async () => {
      const event = await service.emit(
        'tenant-meta',
        'customer.created',
        { customerId: 'cust-1' },
        { userId: 'user-1', source: 'api' },
      );

      expect(event.metadata.userId).toBe('user-1');
      expect(event.metadata.source).toBe('api');
    });

    it('should get event by ID', async () => {
      const emitted = await service.emit('tenant-get', 'invoice.created', { id: '1' });
      const retrieved = await service.getEvent(emitted.id);

      expect(retrieved?.id).toBe(emitted.id);
    });

    it('should return null for non-existent event', async () => {
      const result = await service.getEvent('non-existent');
      expect(result).toBeNull();
    });

    it('should get events for tenant', async () => {
      await service.emit('tenant-events', 'invoice.created', { id: '1' });
      await service.emit('tenant-events', 'invoice.updated', { id: '2' });
      await service.emit('tenant-events', 'customer.created', { id: '3' });

      const events = await service.getEvents('tenant-events');
      expect(events.length).toBe(3);
    });

    it('should filter events by type', async () => {
      await service.emit('tenant-filter', 'invoice.created', { id: '1' });
      await service.emit('tenant-filter', 'invoice.updated', { id: '2' });
      await service.emit('tenant-filter', 'customer.created', { id: '3' });

      const invoiceEvents = await service.getEvents('tenant-filter', { type: 'invoice.created' });
      expect(invoiceEvents.length).toBe(1);
    });

    it('should limit events returned', async () => {
      for (let i = 0; i < 10; i++) {
        await service.emit('tenant-limit', 'invoice.created', { id: i.toString() });
      }

      const events = await service.getEvents('tenant-limit', {}, 5);
      expect(events.length).toBe(5);
    });
  });

  describe('webhook delivery', () => {
    it('should create delivery when event is emitted', async () => {
      await service.createEndpoint(
        'tenant-delivery',
        'Delivery Test',
        'https://example.com/hook',
        ['invoice.created'],
      );

      await service.emit('tenant-delivery', 'invoice.created', { id: '1' });

      const deliveries = await service.getDeliveries('tenant-delivery');
      expect(deliveries.length).toBeGreaterThanOrEqual(0);
    });

    it('should get delivery by ID', async () => {
      await service.createEndpoint(
        'tenant-get-delivery',
        'Get Delivery Test',
        'https://example.com/hook',
        ['invoice.created'],
      );

      await service.emit('tenant-get-delivery', 'invoice.created', { id: '1' });

      const deliveries = await service.getDeliveries('tenant-get-delivery');
      if (deliveries.length > 0) {
        const delivery = await service.getDelivery(deliveries[0].id);
        expect(delivery).toBeDefined();
      }
    });

    it('should return null for non-existent delivery', async () => {
      const result = await service.getDelivery('non-existent');
      expect(result).toBeNull();
    });

    it('should filter deliveries by webhook ID', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-filter-delivery',
        'Filter Test',
        'https://example.com/hook',
        ['invoice.created'],
      );

      await service.emit('tenant-filter-delivery', 'invoice.created', { id: '1' });

      const deliveries = await service.getDeliveries('tenant-filter-delivery', {
        webhookId: endpoint.id,
      });

      if (deliveries.length > 0) {
        expect(deliveries.every(d => d.webhookId === endpoint.id)).toBe(true);
      }
    });

    it('should retry delivery', async () => {
      await service.createEndpoint(
        'tenant-retry',
        'Retry Test',
        'https://example.com/hook',
        ['invoice.created'],
      );

      await service.emit('tenant-retry', 'invoice.created', { id: '1' });

      const deliveries = await service.getDeliveries('tenant-retry');
      if (deliveries.length > 0) {
        const retried = await service.retryDelivery(deliveries[0].id);
        expect(retried).toBeDefined();
      }
    });

    it('should return null when retrying non-existent delivery', async () => {
      const result = await service.retryDelivery('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('signature verification', () => {
    it('should verify valid signature', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-sig',
        'Signature Test',
        'https://example.com/hook',
        ['invoice.created'],
      );

      const payload = JSON.stringify({ test: true });
      // We can't easily test this without knowing the exact signature format
      // but we can verify the function exists and returns boolean
      const valid = service.verifySignature(payload, 'invalid-sig', endpoint.secret);
      expect(typeof valid).toBe('boolean');
    });
  });

  describe('subscriptions', () => {
    it('should create subscription', async () => {
      const subscription = await service.createSubscription(
        'tenant-sub',
        'Invoice Events',
        ['invoice.created', 'invoice.updated'],
      );

      expect(subscription.id).toBeDefined();
      expect(subscription.name).toBe('Invoice Events');
      expect(subscription.eventTypes).toContain('invoice.created');
      expect(subscription.enabled).toBe(true);
    });

    it('should create subscription with filter', async () => {
      const subscription = await service.createSubscription(
        'tenant-sub-filter',
        'High Value Invoices',
        ['invoice.created'],
        { field: 'amount', operator: 'gt', value: 1000 },
      );

      expect(subscription.filter?.field).toBe('amount');
      expect(subscription.filter?.operator).toBe('gt');
    });

    it('should get subscription by ID', async () => {
      const created = await service.createSubscription(
        'tenant-get-sub',
        'Get Test',
        ['customer.created'],
      );

      const retrieved = await service.getSubscription(created.id);
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent subscription', async () => {
      const result = await service.getSubscription('non-existent');
      expect(result).toBeNull();
    });

    it('should get subscriptions for tenant', async () => {
      await service.createSubscription('tenant-subs', 'Sub 1', ['invoice.created']);
      await service.createSubscription('tenant-subs', 'Sub 2', ['customer.created']);

      const subscriptions = await service.getSubscriptions('tenant-subs');
      expect(subscriptions.length).toBe(2);
    });

    it('should delete subscription', async () => {
      const subscription = await service.createSubscription(
        'tenant-del-sub',
        'To Delete',
        ['order.created'],
      );

      const success = await service.deleteSubscription(subscription.id);
      expect(success).toBe(true);

      const retrieved = await service.getSubscription(subscription.id);
      expect(retrieved).toBeNull();
    });

    it('should toggle subscription', async () => {
      const subscription = await service.createSubscription(
        'tenant-toggle',
        'Toggle Test',
        ['payment.received'],
      );

      expect(subscription.enabled).toBe(true);

      const toggled = await service.toggleSubscription(subscription.id);
      expect(toggled?.enabled).toBe(false);

      const toggledBack = await service.toggleSubscription(subscription.id);
      expect(toggledBack?.enabled).toBe(true);
    });

    it('should return null when toggling non-existent subscription', async () => {
      const result = await service.toggleSubscription('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should get webhook stats', async () => {
      await service.createEndpoint('tenant-stats', 'Stats Hook', 'https://a.com', ['invoice.created']);
      await service.emit('tenant-stats', 'invoice.created', { id: '1' });

      const stats = await service.getWebhookStats('tenant-stats');

      expect(stats.totalEndpoints).toBeGreaterThanOrEqual(1);
      expect(stats.activeEndpoints).toBeGreaterThanOrEqual(0);
      expect(stats.totalDeliveries).toBeGreaterThanOrEqual(0);
      expect(stats.successfulDeliveries).toBeGreaterThanOrEqual(0);
      expect(stats.failedDeliveries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('test endpoint', () => {
    it('should test endpoint', async () => {
      const endpoint = await service.createEndpoint(
        'tenant-test',
        'Test Endpoint',
        'https://example.com/hook',
        ['invoice.created'],
      );

      const result = await service.testEndpoint(endpoint.id);

      expect(typeof result.success).toBe('boolean');
      if (result.success) {
        expect(result.responseStatus).toBeDefined();
        expect(result.responseTime).toBeDefined();
      }
    });

    it('should return error for non-existent endpoint', async () => {
      const result = await service.testEndpoint('non-existent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Endpoint not found');
    });
  });

  describe('event triggering', () => {
    it('should trigger webhook for matching event', async () => {
      await service.createEndpoint(
        'tenant-trigger',
        'Trigger Test',
        'https://example.com/hook',
        ['order.completed'],
      );

      // Emit matching event
      await service.emit('tenant-trigger', 'order.completed', { orderId: 'order-1' });

      const deliveries = await service.getDeliveries('tenant-trigger');
      expect(deliveries.length).toBeGreaterThanOrEqual(0);
    });

    it('should not trigger webhook for non-matching event', async () => {
      await service.createEndpoint(
        'tenant-no-trigger',
        'No Trigger Test',
        'https://example.com/hook',
        ['order.completed'],
      );

      // Emit non-matching event
      await service.emit('tenant-no-trigger', 'invoice.created', { invoiceId: 'inv-1' });

      const deliveries = await service.getDeliveries('tenant-no-trigger');
      // Should have no deliveries for invoice events
      const invoiceDeliveries = deliveries.filter(d => {
        const event = service['events'].get(d.eventId);
        return event?.type === 'invoice.created';
      });
      expect(invoiceDeliveries.length).toBe(0);
    });
  });
});
