import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Webhook Tester Service
 * Tools for testing and debugging webhooks
 *
 * Features:
 * - Test webhook endpoints
 * - View webhook history
 * - Retry failed webhooks
 * - Debug payload inspection
 */

// =================== TYPES ===================

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  name: string;
  description?: string;
  events: string[];
  secret: string;
  headers?: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  tenantId: string;
  event: string;
  payload: Record<string, any>;
  url: string;
  requestHeaders: Record<string, string>;
  responseStatus?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;
  duration?: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface WebhookTestResult {
  deliveryId: string;
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  responseTime: number;
  error?: string;
}

export interface WebhookEventType {
  name: string;
  description: string;
  category: string;
  payloadSchema: Record<string, any>;
  example: Record<string, any>;
}

// =================== SERVICE ===================

@Injectable()
export class WebhookTesterService {
  private readonly logger = new Logger(WebhookTesterService.name);

  // Storage
  private endpoints = new Map<string, WebhookEndpoint>();
  private deliveries = new Map<string, WebhookDelivery>();

  // Event types
  private eventTypes: WebhookEventType[] = [];

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeEventTypes();
  }

  private initializeEventTypes(): void {
    this.eventTypes = [
      // Invoice events
      {
        name: 'invoice.created',
        description: 'Fired when a new invoice is created',
        category: 'Invoices',
        payloadSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            number: { type: 'string' },
            series: { type: 'string' },
            partnerName: { type: 'string' },
            grossAmount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string' },
          },
        },
        example: {
          id: 'inv-123',
          number: '0001',
          series: 'DOC',
          partnerName: 'Partner SRL',
          grossAmount: 1190,
          currency: 'RON',
          status: 'draft',
        },
      },
      {
        name: 'invoice.issued',
        description: 'Fired when an invoice is issued',
        category: 'Invoices',
        payloadSchema: { type: 'object' },
        example: { id: 'inv-123', status: 'issued', issuedAt: '2025-01-15T10:00:00Z' },
      },
      {
        name: 'invoice.paid',
        description: 'Fired when an invoice is marked as paid',
        category: 'Invoices',
        payloadSchema: { type: 'object' },
        example: { id: 'inv-123', status: 'paid', paidAt: '2025-01-20T14:30:00Z', paymentMethod: 'bank_transfer' },
      },
      {
        name: 'invoice.cancelled',
        description: 'Fired when an invoice is cancelled',
        category: 'Invoices',
        payloadSchema: { type: 'object' },
        example: { id: 'inv-123', status: 'cancelled', cancelledAt: '2025-01-18T09:00:00Z', reason: 'Customer request' },
      },
      // Partner events
      {
        name: 'partner.created',
        description: 'Fired when a new partner is created',
        category: 'Partners',
        payloadSchema: { type: 'object' },
        example: { id: 'partner-123', name: 'New Partner SRL', cui: 'RO12345678', type: 'customer' },
      },
      {
        name: 'partner.updated',
        description: 'Fired when a partner is updated',
        category: 'Partners',
        payloadSchema: { type: 'object' },
        example: { id: 'partner-123', changes: { email: 'new@partner.ro' } },
      },
      // OCR events
      {
        name: 'ocr.completed',
        description: 'Fired when OCR processing completes',
        category: 'OCR',
        payloadSchema: { type: 'object' },
        example: { documentId: 'doc-123', type: 'invoice', confidence: 0.95, extractedData: {} },
      },
      {
        name: 'ocr.failed',
        description: 'Fired when OCR processing fails',
        category: 'OCR',
        payloadSchema: { type: 'object' },
        example: { documentId: 'doc-123', error: 'Unable to process document' },
      },
      // ANAF events
      {
        name: 'anaf.efactura.submitted',
        description: 'Fired when e-Factura is submitted to ANAF',
        category: 'ANAF',
        payloadSchema: { type: 'object' },
        example: { invoiceId: 'inv-123', indexIncarcare: '12345', submittedAt: '2025-01-15T10:00:00Z' },
      },
      {
        name: 'anaf.efactura.accepted',
        description: 'Fired when ANAF accepts e-Factura',
        category: 'ANAF',
        payloadSchema: { type: 'object' },
        example: { invoiceId: 'inv-123', indexIncarcare: '12345', stare: 'ok' },
      },
      {
        name: 'anaf.efactura.rejected',
        description: 'Fired when ANAF rejects e-Factura',
        category: 'ANAF',
        payloadSchema: { type: 'object' },
        example: { invoiceId: 'inv-123', indexIncarcare: '12345', stare: 'nok', errors: ['Invalid CUI'] },
      },
      // Subscription events
      {
        name: 'subscription.created',
        description: 'Fired when a new subscription is created',
        category: 'Billing',
        payloadSchema: { type: 'object' },
        example: { id: 'sub-123', plan: 'pro', status: 'active' },
      },
      {
        name: 'subscription.upgraded',
        description: 'Fired when subscription is upgraded',
        category: 'Billing',
        payloadSchema: { type: 'object' },
        example: { id: 'sub-123', previousPlan: 'free', newPlan: 'pro' },
      },
      {
        name: 'subscription.cancelled',
        description: 'Fired when subscription is cancelled',
        category: 'Billing',
        payloadSchema: { type: 'object' },
        example: { id: 'sub-123', cancelsAt: '2025-02-15T00:00:00Z' },
      },
    ];

    this.logger.log(`Initialized ${this.eventTypes.length} webhook event types`);
  }

  // =================== ENDPOINT MANAGEMENT ===================

  async createEndpoint(params: {
    tenantId: string;
    url: string;
    name: string;
    description?: string;
    events: string[];
    headers?: Record<string, string>;
  }): Promise<WebhookEndpoint> {
    // Validate URL
    try {
      new URL(params.url);
    } catch {
      throw new BadRequestException('Invalid webhook URL');
    }

    // Validate events
    const validEvents = this.eventTypes.map(e => e.name);
    const invalidEvents = params.events.filter(e => !validEvents.includes(e) && e !== '*');
    if (invalidEvents.length > 0) {
      throw new BadRequestException(`Invalid events: ${invalidEvents.join(', ')}`);
    }

    const endpoint: WebhookEndpoint = {
      id: `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId: params.tenantId,
      url: params.url,
      name: params.name,
      description: params.description,
      events: params.events,
      secret: this.generateSecret(),
      headers: params.headers,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.endpoints.set(endpoint.id, endpoint);
    this.eventEmitter.emit('webhook.endpoint.created', { endpoint });

    this.logger.log(`Webhook endpoint created: ${endpoint.name} (${endpoint.id})`);

    return endpoint;
  }

  async updateEndpoint(
    id: string,
    updates: Partial<Pick<WebhookEndpoint, 'url' | 'name' | 'description' | 'events' | 'headers' | 'isActive'>>,
  ): Promise<WebhookEndpoint> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    if (updates.url) {
      try {
        new URL(updates.url);
      } catch {
        throw new BadRequestException('Invalid webhook URL');
      }
    }

    Object.assign(endpoint, updates, { updatedAt: new Date() });
    this.endpoints.set(id, endpoint);

    return endpoint;
  }

  async deleteEndpoint(id: string): Promise<void> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    this.endpoints.delete(id);
    this.eventEmitter.emit('webhook.endpoint.deleted', { endpointId: id });
  }

  async rotateSecret(id: string): Promise<{ secret: string }> {
    const endpoint = this.endpoints.get(id);
    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    endpoint.secret = this.generateSecret();
    endpoint.updatedAt = new Date();
    this.endpoints.set(id, endpoint);

    return { secret: endpoint.secret };
  }

  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'whsec_';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  // =================== TESTING ===================

  async testEndpoint(params: {
    webhookId: string;
    event: string;
    payload?: Record<string, any>;
  }): Promise<WebhookTestResult> {
    const endpoint = this.endpoints.get(params.webhookId);
    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    // Get event type for default payload
    const eventType = this.eventTypes.find(e => e.name === params.event);
    const payload = params.payload || eventType?.example || { test: true };

    // Create delivery record
    const delivery: WebhookDelivery = {
      id: `del-${Date.now()}`,
      webhookId: params.webhookId,
      tenantId: endpoint.tenantId,
      event: params.event,
      payload,
      url: endpoint.url,
      requestHeaders: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': params.event,
        'X-Webhook-Signature': this.generateSignature(payload, endpoint.secret),
        'X-Webhook-Timestamp': Date.now().toString(),
        ...endpoint.headers,
      },
      status: 'pending',
      attempts: 1,
      maxAttempts: 3,
      createdAt: new Date(),
    };

    this.deliveries.set(delivery.id, delivery);

    // Simulate webhook delivery
    const startTime = Date.now();
    try {
      // In production, this would make an actual HTTP request
      // For testing, we simulate success/failure
      const isSuccess = Math.random() > 0.2; // 80% success rate in simulation

      if (isSuccess) {
        delivery.status = 'success';
        delivery.responseStatus = 200;
        delivery.responseBody = JSON.stringify({ received: true });
        delivery.responseHeaders = { 'content-type': 'application/json' };
      } else {
        throw new Error('Simulated webhook failure');
      }
    } catch (error) {
      delivery.status = 'failed';
      delivery.responseStatus = 500;
      delivery.error = error instanceof Error ? error.message : 'Unknown error';
    }

    delivery.duration = Date.now() - startTime;
    delivery.completedAt = new Date();
    this.deliveries.set(delivery.id, delivery);

    this.eventEmitter.emit('webhook.delivery.completed', { delivery });

    return {
      deliveryId: delivery.id,
      success: delivery.status === 'success',
      statusCode: delivery.responseStatus,
      responseBody: delivery.responseBody,
      responseTime: delivery.duration,
      error: delivery.error,
    };
  }

  async sendTestPayload(params: {
    url: string;
    event: string;
    payload: Record<string, any>;
    headers?: Record<string, string>;
  }): Promise<WebhookTestResult> {
    const startTime = Date.now();
    const deliveryId = `test-${Date.now()}`;

    try {
      // In production, make actual HTTP request
      // Simulating for now
      const responseTime = Date.now() - startTime;

      return {
        deliveryId,
        success: true,
        statusCode: 200,
        responseBody: '{"ok": true}',
        responseTime,
      };
    } catch (error) {
      return {
        deliveryId,
        success: false,
        statusCode: 500,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }

  private generateSignature(payload: Record<string, any>, secret: string): string {
    // In production, use HMAC-SHA256
    const data = JSON.stringify(payload);
    return `sha256=${Buffer.from(data + secret).toString('base64').substring(0, 64)}`;
  }

  // =================== DELIVERY HISTORY ===================

  async getDeliveries(filters?: {
    webhookId?: string;
    tenantId?: string;
    event?: string;
    status?: WebhookDelivery['status'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<WebhookDelivery[]> {
    let deliveries = Array.from(this.deliveries.values());

    if (filters?.webhookId) {
      deliveries = deliveries.filter(d => d.webhookId === filters.webhookId);
    }
    if (filters?.tenantId) {
      deliveries = deliveries.filter(d => d.tenantId === filters.tenantId);
    }
    if (filters?.event) {
      deliveries = deliveries.filter(d => d.event === filters.event);
    }
    if (filters?.status) {
      deliveries = deliveries.filter(d => d.status === filters.status);
    }
    if (filters?.startDate) {
      deliveries = deliveries.filter(d => d.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      deliveries = deliveries.filter(d => d.createdAt <= filters.endDate!);
    }

    deliveries = deliveries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      deliveries = deliveries.slice(0, filters.limit);
    }

    return deliveries;
  }

  async getDelivery(id: string): Promise<WebhookDelivery | null> {
    return this.deliveries.get(id) || null;
  }

  async retryDelivery(id: string): Promise<WebhookTestResult> {
    const delivery = this.deliveries.get(id);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status === 'success') {
      throw new BadRequestException('Cannot retry successful delivery');
    }

    return this.testEndpoint({
      webhookId: delivery.webhookId,
      event: delivery.event,
      payload: delivery.payload,
    });
  }

  // =================== EVENT TYPES ===================

  async getEventTypes(): Promise<WebhookEventType[]> {
    return this.eventTypes;
  }

  async getEventTypesByCategory(): Promise<Record<string, WebhookEventType[]>> {
    const byCategory: Record<string, WebhookEventType[]> = {};
    for (const event of this.eventTypes) {
      if (!byCategory[event.category]) {
        byCategory[event.category] = [];
      }
      byCategory[event.category].push(event);
    }
    return byCategory;
  }

  async getEventPayloadExample(event: string): Promise<Record<string, any> | null> {
    const eventType = this.eventTypes.find(e => e.name === event);
    return eventType?.example || null;
  }

  // =================== QUERIES ===================

  async getEndpoints(tenantId?: string): Promise<WebhookEndpoint[]> {
    let endpoints = Array.from(this.endpoints.values());
    if (tenantId) {
      endpoints = endpoints.filter(e => e.tenantId === tenantId);
    }
    return endpoints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getEndpoint(id: string): Promise<WebhookEndpoint | null> {
    return this.endpoints.get(id) || null;
  }

  // =================== STATS ===================

  async getStats(tenantId?: string): Promise<{
    totalEndpoints: number;
    activeEndpoints: number;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    avgResponseTime: number;
    deliveriesByEvent: Record<string, number>;
    deliveriesByStatus: Record<string, number>;
  }> {
    let endpoints = Array.from(this.endpoints.values());
    let deliveries = Array.from(this.deliveries.values());

    if (tenantId) {
      endpoints = endpoints.filter(e => e.tenantId === tenantId);
      deliveries = deliveries.filter(d => d.tenantId === tenantId);
    }

    const successfulDeliveries = deliveries.filter(d => d.status === 'success');
    const failedDeliveries = deliveries.filter(d => d.status === 'failed');

    const deliveriesWithDuration = deliveries.filter(d => d.duration !== undefined);
    const avgResponseTime = deliveriesWithDuration.length > 0
      ? deliveriesWithDuration.reduce((sum, d) => sum + (d.duration || 0), 0) / deliveriesWithDuration.length
      : 0;

    const deliveriesByEvent: Record<string, number> = {};
    const deliveriesByStatus: Record<string, number> = {};

    for (const delivery of deliveries) {
      deliveriesByEvent[delivery.event] = (deliveriesByEvent[delivery.event] || 0) + 1;
      deliveriesByStatus[delivery.status] = (deliveriesByStatus[delivery.status] || 0) + 1;
    }

    return {
      totalEndpoints: endpoints.length,
      activeEndpoints: endpoints.filter(e => e.isActive).length,
      totalDeliveries: deliveries.length,
      successfulDeliveries: successfulDeliveries.length,
      failedDeliveries: failedDeliveries.length,
      avgResponseTime: Math.round(avgResponseTime),
      deliveriesByEvent,
      deliveriesByStatus,
    };
  }

  // =================== PAYLOAD INSPECTOR ===================

  async inspectPayload(deliveryId: string): Promise<{
    delivery: WebhookDelivery;
    requestDetails: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body: string;
    };
    responseDetails?: {
      status: number;
      headers?: Record<string, string>;
      body?: string;
    };
    timing: {
      createdAt: Date;
      completedAt?: Date;
      duration?: number;
    };
  }> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    return {
      delivery,
      requestDetails: {
        method: 'POST',
        url: delivery.url,
        headers: delivery.requestHeaders,
        body: JSON.stringify(delivery.payload, null, 2),
      },
      responseDetails: delivery.responseStatus ? {
        status: delivery.responseStatus,
        headers: delivery.responseHeaders,
        body: delivery.responseBody,
      } : undefined,
      timing: {
        createdAt: delivery.createdAt,
        completedAt: delivery.completedAt,
        duration: delivery.duration,
      },
    };
  }
}
