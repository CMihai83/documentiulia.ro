import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Types
export type EventType =
  | 'invoice.created' | 'invoice.updated' | 'invoice.deleted' | 'invoice.paid'
  | 'customer.created' | 'customer.updated' | 'customer.deleted'
  | 'order.created' | 'order.updated' | 'order.completed' | 'order.cancelled'
  | 'payment.received' | 'payment.failed' | 'payment.refunded'
  | 'employee.created' | 'employee.updated' | 'employee.terminated'
  | 'declaration.submitted' | 'declaration.accepted' | 'declaration.rejected'
  | 'document.uploaded' | 'document.signed' | 'document.archived'
  | 'delivery.assigned' | 'delivery.started' | 'delivery.completed' | 'delivery.failed';

export type WebhookStatus = 'active' | 'paused' | 'disabled';
export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying';

// Interfaces
export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  secret: string;
  events: EventType[];
  status: WebhookStatus;
  headers?: Record<string, string>;
  retryPolicy: RetryPolicy;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface WebhookEvent {
  id: string;
  tenantId: string;
  type: EventType;
  data: Record<string, any>;
  metadata: EventMetadata;
  createdAt: Date;
}

export interface EventMetadata {
  source: string;
  userId?: string;
  correlationId?: string;
  ipAddress?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  tenantId: string;
  url: string;
  status: DeliveryStatus;
  requestBody: string;
  requestHeaders: Record<string, string>;
  responseStatus?: number;
  responseBody?: string;
  responseTime?: number;
  attempts: number;
  nextRetryAt?: Date;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface EventSubscription {
  id: string;
  tenantId: string;
  name: string;
  eventTypes: EventType[];
  filter?: EventFilter;
  enabled: boolean;
  createdAt: Date;
}

export interface EventFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: any;
}

export interface WebhookStats {
  totalEndpoints: number;
  activeEndpoints: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  averageResponseTime: number;
  deliveriesByEvent: { event: EventType; count: number }[];
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  // In-memory storage
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private events: Map<string, WebhookEvent> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private subscriptions: Map<string, EventSubscription> = new Map();

  // Event queue for processing
  private eventQueue: WebhookEvent[] = [];

  // ID counters
  private endpointIdCounter = 0;
  private eventIdCounter = 0;
  private deliveryIdCounter = 0;
  private subscriptionIdCounter = 0;

  // Default retry policy
  private defaultRetryPolicy: RetryPolicy = {
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 300000,
    backoffMultiplier: 2,
  };

  constructor(private configService: ConfigService) {}

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // =================== WEBHOOK ENDPOINTS ===================

  async createEndpoint(
    tenantId: string,
    name: string,
    url: string,
    events: EventType[],
    options?: {
      headers?: Record<string, string>;
      retryPolicy?: Partial<RetryPolicy>;
    },
  ): Promise<WebhookEndpoint> {
    const endpoint: WebhookEndpoint = {
      id: this.generateId('webhook', ++this.endpointIdCounter),
      tenantId,
      name,
      url,
      secret: this.generateSecret(),
      events,
      status: 'active',
      headers: options?.headers,
      retryPolicy: { ...this.defaultRetryPolicy, ...options?.retryPolicy },
      createdAt: new Date(),
      updatedAt: new Date(),
      failureCount: 0,
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.logger.log(`Created webhook endpoint: ${name} for ${tenantId}`);
    return endpoint;
  }

  async getEndpoint(endpointId: string): Promise<WebhookEndpoint | null> {
    return this.endpoints.get(endpointId) || null;
  }

  async getEndpoints(tenantId: string, status?: WebhookStatus): Promise<WebhookEndpoint[]> {
    let endpoints = Array.from(this.endpoints.values())
      .filter(e => e.tenantId === tenantId);

    if (status) {
      endpoints = endpoints.filter(e => e.status === status);
    }

    return endpoints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateEndpoint(
    endpointId: string,
    updates: Partial<Omit<WebhookEndpoint, 'id' | 'tenantId' | 'secret' | 'createdAt'>>,
  ): Promise<WebhookEndpoint | null> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;

    const updated = {
      ...endpoint,
      ...updates,
      updatedAt: new Date(),
    };

    this.endpoints.set(endpointId, updated);
    return updated;
  }

  async deleteEndpoint(endpointId: string): Promise<boolean> {
    return this.endpoints.delete(endpointId);
  }

  async rotateSecret(endpointId: string): Promise<{ oldSecret: string; newSecret: string } | null> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;

    const oldSecret = endpoint.secret;
    const newSecret = this.generateSecret();

    endpoint.secret = newSecret;
    endpoint.updatedAt = new Date();
    this.endpoints.set(endpointId, endpoint);

    return { oldSecret, newSecret };
  }

  async pauseEndpoint(endpointId: string): Promise<WebhookEndpoint | null> {
    return this.updateEndpoint(endpointId, { status: 'paused' });
  }

  async resumeEndpoint(endpointId: string): Promise<WebhookEndpoint | null> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;

    endpoint.status = 'active';
    endpoint.failureCount = 0;
    endpoint.updatedAt = new Date();
    this.endpoints.set(endpointId, endpoint);
    return endpoint;
  }

  // =================== EVENTS ===================

  async emit(
    tenantId: string,
    type: EventType,
    data: Record<string, any>,
    metadata?: Partial<EventMetadata>,
  ): Promise<WebhookEvent> {
    const event: WebhookEvent = {
      id: this.generateId('event', ++this.eventIdCounter),
      tenantId,
      type,
      data,
      metadata: {
        source: 'api',
        correlationId: this.generateId('corr', Date.now()),
        ...metadata,
      },
      createdAt: new Date(),
    };

    this.events.set(event.id, event);
    this.eventQueue.push(event);

    // Process webhooks for this event
    await this.processEvent(event);

    this.logger.debug(`Event emitted: ${type} for ${tenantId}`);
    return event;
  }

  async getEvent(eventId: string): Promise<WebhookEvent | null> {
    return this.events.get(eventId) || null;
  }

  async getEvents(
    tenantId: string,
    filters?: {
      type?: EventType;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
  ): Promise<WebhookEvent[]> {
    let events = Array.from(this.events.values())
      .filter(e => e.tenantId === tenantId);

    if (filters?.type) {
      events = events.filter(e => e.type === filters.type);
    }
    if (filters?.startDate) {
      events = events.filter(e => e.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      events = events.filter(e => e.createdAt <= filters.endDate!);
    }

    return events
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  private async processEvent(event: WebhookEvent): Promise<void> {
    const endpoints = await this.getEndpoints(event.tenantId, 'active');

    for (const endpoint of endpoints) {
      if (endpoint.events.includes(event.type)) {
        await this.deliverWebhook(endpoint, event);
      }
    }
  }

  // =================== DELIVERY ===================

  private async deliverWebhook(endpoint: WebhookEndpoint, event: WebhookEvent): Promise<WebhookDelivery> {
    const payload = {
      id: event.id,
      type: event.type,
      data: event.data,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    };

    const signature = this.signPayload(JSON.stringify(payload), endpoint.secret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event.type,
      'X-Webhook-Delivery-Id': this.generateId('delivery', ++this.deliveryIdCounter),
      ...endpoint.headers,
    };

    const delivery: WebhookDelivery = {
      id: headers['X-Webhook-Delivery-Id'],
      webhookId: endpoint.id,
      eventId: event.id,
      tenantId: event.tenantId,
      url: endpoint.url,
      status: 'pending',
      requestBody: JSON.stringify(payload),
      requestHeaders: headers,
      attempts: 0,
      createdAt: new Date(),
    };

    this.deliveries.set(delivery.id, delivery);

    // Simulate delivery (in production, would make actual HTTP request)
    await this.attemptDelivery(delivery, endpoint);

    return delivery;
  }

  private async attemptDelivery(delivery: WebhookDelivery, endpoint: WebhookEndpoint): Promise<void> {
    delivery.attempts++;
    const startTime = Date.now();

    try {
      // Simulate HTTP request (in production, use fetch/axios)
      const success = Math.random() > 0.1; // 90% success rate for simulation

      if (success) {
        delivery.status = 'success';
        delivery.responseStatus = 200;
        delivery.responseBody = JSON.stringify({ received: true });
        delivery.responseTime = Date.now() - startTime;
        delivery.completedAt = new Date();

        // Update endpoint stats
        endpoint.lastTriggeredAt = new Date();
        endpoint.failureCount = 0;
        this.endpoints.set(endpoint.id, endpoint);
      } else {
        throw new Error('Simulated delivery failure');
      }
    } catch (error: any) {
      delivery.responseTime = Date.now() - startTime;
      delivery.error = error.message;

      if (delivery.attempts < endpoint.retryPolicy.maxRetries) {
        delivery.status = 'retrying';
        const delay = Math.min(
          endpoint.retryPolicy.initialDelayMs * Math.pow(endpoint.retryPolicy.backoffMultiplier, delivery.attempts - 1),
          endpoint.retryPolicy.maxDelayMs,
        );
        delivery.nextRetryAt = new Date(Date.now() + delay);
      } else {
        delivery.status = 'failed';
        delivery.completedAt = new Date();

        // Update endpoint failure count
        endpoint.failureCount++;
        if (endpoint.failureCount >= 10) {
          endpoint.status = 'disabled';
          this.logger.warn(`Webhook endpoint ${endpoint.id} disabled due to failures`);
        }
        this.endpoints.set(endpoint.id, endpoint);
      }
    }

    this.deliveries.set(delivery.id, delivery);
  }

  async retryDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    const endpoint = this.endpoints.get(delivery.webhookId);
    if (!endpoint) return null;

    delivery.status = 'pending';
    await this.attemptDelivery(delivery, endpoint);
    return delivery;
  }

  async getDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    return this.deliveries.get(deliveryId) || null;
  }

  async getDeliveries(
    tenantId: string,
    filters?: {
      webhookId?: string;
      eventId?: string;
      status?: DeliveryStatus;
    },
    limit: number = 100,
  ): Promise<WebhookDelivery[]> {
    let deliveries = Array.from(this.deliveries.values())
      .filter(d => d.tenantId === tenantId);

    if (filters?.webhookId) {
      deliveries = deliveries.filter(d => d.webhookId === filters.webhookId);
    }
    if (filters?.eventId) {
      deliveries = deliveries.filter(d => d.eventId === filters.eventId);
    }
    if (filters?.status) {
      deliveries = deliveries.filter(d => d.status === filters.status);
    }

    return deliveries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // =================== SIGNATURES ===================

  private signPayload(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.signPayload(payload, secret);
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    // Buffers must have same length for timingSafeEqual
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  // =================== SUBSCRIPTIONS ===================

  async createSubscription(
    tenantId: string,
    name: string,
    eventTypes: EventType[],
    filter?: EventFilter,
  ): Promise<EventSubscription> {
    const subscription: EventSubscription = {
      id: this.generateId('sub', ++this.subscriptionIdCounter),
      tenantId,
      name,
      eventTypes,
      filter,
      enabled: true,
      createdAt: new Date(),
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<EventSubscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async getSubscriptions(tenantId: string): Promise<EventSubscription[]> {
    return Array.from(this.subscriptions.values())
      .filter(s => s.tenantId === tenantId);
  }

  async deleteSubscription(subscriptionId: string): Promise<boolean> {
    return this.subscriptions.delete(subscriptionId);
  }

  async toggleSubscription(subscriptionId: string): Promise<EventSubscription | null> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return null;

    subscription.enabled = !subscription.enabled;
    this.subscriptions.set(subscriptionId, subscription);
    return subscription;
  }

  // =================== STATISTICS ===================

  async getWebhookStats(tenantId: string): Promise<WebhookStats> {
    const endpoints = Array.from(this.endpoints.values())
      .filter(e => e.tenantId === tenantId);

    const deliveries = Array.from(this.deliveries.values())
      .filter(d => d.tenantId === tenantId);

    const successfulDeliveries = deliveries.filter(d => d.status === 'success');
    const failedDeliveries = deliveries.filter(d => d.status === 'failed');

    const responseTimes = successfulDeliveries
      .filter(d => d.responseTime)
      .map(d => d.responseTime!);

    const eventCounts = new Map<EventType, number>();
    for (const delivery of deliveries) {
      const event = this.events.get(delivery.eventId);
      if (event) {
        eventCounts.set(event.type, (eventCounts.get(event.type) || 0) + 1);
      }
    }

    return {
      totalEndpoints: endpoints.length,
      activeEndpoints: endpoints.filter(e => e.status === 'active').length,
      totalDeliveries: deliveries.length,
      successfulDeliveries: successfulDeliveries.length,
      failedDeliveries: failedDeliveries.length,
      averageResponseTime: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
      deliveriesByEvent: Array.from(eventCounts.entries())
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  // =================== TEST WEBHOOK ===================

  async testEndpoint(endpointId: string): Promise<{
    success: boolean;
    responseStatus?: number;
    responseTime?: number;
    error?: string;
  }> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { success: false, error: 'Endpoint not found' };
    }

    const testEvent: WebhookEvent = {
      id: this.generateId('test-event', Date.now()),
      tenantId: endpoint.tenantId,
      type: 'invoice.created',
      data: { test: true, message: 'This is a test webhook' },
      metadata: { source: 'test' },
      createdAt: new Date(),
    };

    const delivery = await this.deliverWebhook(endpoint, testEvent);

    return {
      success: delivery.status === 'success',
      responseStatus: delivery.responseStatus,
      responseTime: delivery.responseTime,
      error: delivery.error,
    };
  }

  // =================== METADATA ===================

  getEventTypes(): EventType[] {
    return [
      'invoice.created', 'invoice.updated', 'invoice.deleted', 'invoice.paid',
      'customer.created', 'customer.updated', 'customer.deleted',
      'order.created', 'order.updated', 'order.completed', 'order.cancelled',
      'payment.received', 'payment.failed', 'payment.refunded',
      'employee.created', 'employee.updated', 'employee.terminated',
      'declaration.submitted', 'declaration.accepted', 'declaration.rejected',
      'document.uploaded', 'document.signed', 'document.archived',
      'delivery.assigned', 'delivery.started', 'delivery.completed', 'delivery.failed',
    ];
  }

  getEventCategories(): { category: string; events: EventType[] }[] {
    return [
      { category: 'Invoice', events: ['invoice.created', 'invoice.updated', 'invoice.deleted', 'invoice.paid'] },
      { category: 'Customer', events: ['customer.created', 'customer.updated', 'customer.deleted'] },
      { category: 'Order', events: ['order.created', 'order.updated', 'order.completed', 'order.cancelled'] },
      { category: 'Payment', events: ['payment.received', 'payment.failed', 'payment.refunded'] },
      { category: 'Employee', events: ['employee.created', 'employee.updated', 'employee.terminated'] },
      { category: 'Declaration', events: ['declaration.submitted', 'declaration.accepted', 'declaration.rejected'] },
      { category: 'Document', events: ['document.uploaded', 'document.signed', 'document.archived'] },
      { category: 'Delivery', events: ['delivery.assigned', 'delivery.started', 'delivery.completed', 'delivery.failed'] },
    ];
  }
}
