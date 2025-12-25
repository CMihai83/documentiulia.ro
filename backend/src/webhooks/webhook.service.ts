import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// Types
export type WebhookEventType =
  | 'invoice.created' | 'invoice.updated' | 'invoice.paid' | 'invoice.cancelled'
  | 'customer.created' | 'customer.updated' | 'customer.deleted'
  | 'order.created' | 'order.shipped' | 'order.delivered' | 'order.cancelled'
  | 'payment.received' | 'payment.failed' | 'payment.refunded'
  | 'employee.hired' | 'employee.terminated'
  | 'delivery.started' | 'delivery.completed' | 'delivery.failed'
  | 'backup.completed' | 'backup.failed'
  | 'report.generated' | 'import.completed' | 'export.completed';

export type WebhookStatus = 'active' | 'inactive' | 'suspended';
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

// Interfaces
export interface Webhook {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  status: WebhookStatus;
  headers?: Record<string, string>;
  retryPolicy: RetryPolicy;
  rateLimitPerMinute: number;
  consecutiveFailures: number;
  lastDeliveryAt?: Date;
  lastSuccessAt?: Date;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  tenantId: string;
  eventType: WebhookEventType;
  payload: Record<string, any>;
  status: DeliveryStatus;
  attempts: DeliveryAttempt[];
  createdAt: Date;
  deliveredAt?: Date;
  nextRetryAt?: Date;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  durationMs: number;
}

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  tenantId: string;
  data: Record<string, any>;
  timestamp: Date;
  source: string;
}

export interface WebhookStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  averageResponseTime: number;
  successRate: number;
  byEventType: Record<string, number>;
  byStatus: Record<DeliveryStatus, number>;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  errorMessage?: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  // Storage
  private webhooks: Map<string, Webhook> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private eventQueue: WebhookEvent[] = [];

  // Counters
  private webhookIdCounter = 0;
  private deliveryIdCounter = 0;
  private eventIdCounter = 0;

  constructor(private configService: ConfigService) {
    this.logger.log('Webhook Service initialized');
  }

  private generateId(prefix: string, counter: number): string {
    return `${prefix}-${counter}-${Date.now()}`;
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // =================== WEBHOOK MANAGEMENT ===================

  async createWebhook(
    tenantId: string,
    name: string,
    url: string,
    events: WebhookEventType[],
    createdBy: string,
    options?: {
      secret?: string;
      headers?: Record<string, string>;
      retryPolicy?: Partial<RetryPolicy>;
      rateLimitPerMinute?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<Webhook> {
    const webhook: Webhook = {
      id: this.generateId('wh', ++this.webhookIdCounter),
      tenantId,
      name,
      url,
      secret: options?.secret || this.generateSecret(),
      events,
      status: 'active',
      headers: options?.headers,
      retryPolicy: {
        maxRetries: options?.retryPolicy?.maxRetries ?? 5,
        initialDelayMs: options?.retryPolicy?.initialDelayMs ?? 1000,
        maxDelayMs: options?.retryPolicy?.maxDelayMs ?? 300000,
        backoffMultiplier: options?.retryPolicy?.backoffMultiplier ?? 2,
      },
      rateLimitPerMinute: options?.rateLimitPerMinute ?? 60,
      consecutiveFailures: 0,
      metadata: options?.metadata,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.webhooks.set(webhook.id, webhook);
    this.logger.log(`Created webhook: ${name} (${webhook.id}) for ${events.length} events`);
    return webhook;
  }

  async getWebhook(webhookId: string): Promise<Webhook | null> {
    return this.webhooks.get(webhookId) || null;
  }

  async getWebhooks(
    tenantId: string,
    options?: {
      status?: WebhookStatus;
      eventType?: WebhookEventType;
    },
  ): Promise<Webhook[]> {
    let webhooks = Array.from(this.webhooks.values())
      .filter(w => w.tenantId === tenantId);

    if (options?.status) {
      webhooks = webhooks.filter(w => w.status === options.status);
    }
    if (options?.eventType) {
      webhooks = webhooks.filter(w => w.events.includes(options.eventType!));
    }

    return webhooks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateWebhook(
    webhookId: string,
    updates: Partial<Omit<Webhook, 'id' | 'tenantId' | 'secret' | 'createdBy' | 'createdAt'>>,
  ): Promise<Webhook | null> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return null;

    const updated: Webhook = {
      ...webhook,
      ...updates,
      updatedAt: new Date(),
    };

    this.webhooks.set(webhookId, updated);
    return updated;
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    return this.webhooks.delete(webhookId);
  }

  async activateWebhook(webhookId: string): Promise<Webhook | null> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return null;

    webhook.status = 'active';
    webhook.consecutiveFailures = 0;
    webhook.updatedAt = new Date();
    this.webhooks.set(webhookId, webhook);
    return webhook;
  }

  async deactivateWebhook(webhookId: string): Promise<Webhook | null> {
    return this.updateWebhook(webhookId, { status: 'inactive' });
  }

  async rotateSecret(webhookId: string): Promise<{ webhook: Webhook; newSecret: string } | null> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return null;

    const newSecret = this.generateSecret();
    webhook.secret = newSecret;
    webhook.updatedAt = new Date();
    this.webhooks.set(webhookId, webhook);

    return { webhook, newSecret };
  }

  // =================== EVENT DISPATCHING ===================

  async dispatchEvent(
    tenantId: string,
    eventType: WebhookEventType,
    data: Record<string, any>,
    source: string,
  ): Promise<WebhookDelivery[]> {
    const event: WebhookEvent = {
      id: this.generateId('evt', ++this.eventIdCounter),
      type: eventType,
      tenantId,
      data,
      timestamp: new Date(),
      source,
    };

    this.eventQueue.push(event);

    // Find matching webhooks
    const matchingWebhooks = Array.from(this.webhooks.values())
      .filter(w => w.tenantId === tenantId && w.status === 'active' && w.events.includes(eventType));

    const deliveries: WebhookDelivery[] = [];

    for (const webhook of matchingWebhooks) {
      const delivery = await this.createDelivery(webhook, event);
      deliveries.push(delivery);
      this.executeDelivery(delivery.id, webhook);
    }

    this.logger.log(`Dispatched event ${eventType} to ${matchingWebhooks.length} webhooks`);
    return deliveries;
  }

  private async createDelivery(webhook: Webhook, event: WebhookEvent): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: this.generateId('del', ++this.deliveryIdCounter),
      webhookId: webhook.id,
      tenantId: webhook.tenantId,
      eventType: event.type,
      payload: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp.toISOString(),
        data: event.data,
      },
      status: 'pending',
      attempts: [],
      createdAt: new Date(),
    };

    this.deliveries.set(delivery.id, delivery);
    return delivery;
  }

  private async executeDelivery(deliveryId: string, webhook: Webhook): Promise<void> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return;

    const startTime = Date.now();
    const attemptNumber = delivery.attempts.length + 1;

    try {
      // Simulate HTTP request
      const success = Math.random() > 0.1; // 90% success rate simulation
      const statusCode = success ? 200 : (Math.random() > 0.5 ? 500 : 503);
      const durationMs = Math.floor(Math.random() * 500) + 50;

      const attempt: DeliveryAttempt = {
        attemptNumber,
        timestamp: new Date(),
        statusCode,
        responseBody: success ? '{"received": true}' : '{"error": "Server error"}',
        durationMs,
      };

      delivery.attempts.push(attempt);

      if (success) {
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        webhook.lastDeliveryAt = new Date();
        webhook.lastSuccessAt = new Date();
        webhook.consecutiveFailures = 0;
      } else {
        this.handleDeliveryFailure(delivery, webhook, attempt);
      }

    } catch (error: any) {
      const attempt: DeliveryAttempt = {
        attemptNumber,
        timestamp: new Date(),
        errorMessage: error.message,
        durationMs: Date.now() - startTime,
      };

      delivery.attempts.push(attempt);
      this.handleDeliveryFailure(delivery, webhook, attempt);
    }

    this.deliveries.set(deliveryId, delivery);
    this.webhooks.set(webhook.id, webhook);
  }

  private handleDeliveryFailure(
    delivery: WebhookDelivery,
    webhook: Webhook,
    attempt: DeliveryAttempt,
  ): void {
    webhook.consecutiveFailures++;
    webhook.lastDeliveryAt = new Date();

    if (delivery.attempts.length >= webhook.retryPolicy.maxRetries) {
      delivery.status = 'failed';

      // Suspend webhook after too many failures
      if (webhook.consecutiveFailures >= 10) {
        webhook.status = 'suspended';
        this.logger.warn(`Webhook ${webhook.id} suspended after ${webhook.consecutiveFailures} failures`);
      }
    } else {
      delivery.status = 'retrying';
      const delay = this.calculateRetryDelay(delivery.attempts.length, webhook.retryPolicy);
      delivery.nextRetryAt = new Date(Date.now() + delay);
    }
  }

  private calculateRetryDelay(attemptCount: number, policy: RetryPolicy): number {
    const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attemptCount - 1);
    return Math.min(delay, policy.maxDelayMs);
  }

  // =================== SIGNATURE VERIFICATION ===================

  generateSignature(payload: Record<string, any>, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  verifySignature(payload: Record<string, any>, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  // =================== DELIVERY MANAGEMENT ===================

  async getDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    return this.deliveries.get(deliveryId) || null;
  }

  async getDeliveries(
    tenantId: string,
    options?: {
      webhookId?: string;
      status?: DeliveryStatus;
      eventType?: WebhookEventType;
      limit?: number;
    },
  ): Promise<WebhookDelivery[]> {
    let deliveries = Array.from(this.deliveries.values())
      .filter(d => d.tenantId === tenantId);

    if (options?.webhookId) {
      deliveries = deliveries.filter(d => d.webhookId === options.webhookId);
    }
    if (options?.status) {
      deliveries = deliveries.filter(d => d.status === options.status);
    }
    if (options?.eventType) {
      deliveries = deliveries.filter(d => d.eventType === options.eventType);
    }

    deliveries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      deliveries = deliveries.slice(0, options.limit);
    }

    return deliveries;
  }

  async retryDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery || delivery.status === 'delivered') return null;

    const webhook = this.webhooks.get(delivery.webhookId);
    if (!webhook) return null;

    delivery.status = 'retrying';
    this.deliveries.set(deliveryId, delivery);

    this.executeDelivery(deliveryId, webhook);

    return this.deliveries.get(deliveryId) || null;
  }

  // =================== WEBHOOK TESTING ===================

  async testWebhook(webhookId: string): Promise<WebhookTestResult> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      return {
        success: false,
        responseTime: 0,
        errorMessage: 'Webhook not found',
      };
    }

    const startTime = Date.now();

    try {
      // Simulate test request
      const success = Math.random() > 0.2;
      const statusCode = success ? 200 : 500;
      const responseTime = Math.floor(Math.random() * 300) + 50;

      return {
        success,
        statusCode,
        responseTime,
        errorMessage: success ? undefined : 'Test delivery failed',
      };
    } catch (error: any) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        errorMessage: error.message,
      };
    }
  }

  // =================== STATISTICS ===================

  async getWebhookStats(tenantId: string, webhookId?: string): Promise<WebhookStats> {
    let deliveries = Array.from(this.deliveries.values())
      .filter(d => d.tenantId === tenantId);

    if (webhookId) {
      deliveries = deliveries.filter(d => d.webhookId === webhookId);
    }

    const stats: WebhookStats = {
      totalDeliveries: deliveries.length,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      pendingDeliveries: 0,
      averageResponseTime: 0,
      successRate: 0,
      byEventType: {},
      byStatus: {
        pending: 0,
        delivered: 0,
        failed: 0,
        retrying: 0,
      },
    };

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const delivery of deliveries) {
      stats.byStatus[delivery.status]++;
      stats.byEventType[delivery.eventType] = (stats.byEventType[delivery.eventType] || 0) + 1;

      if (delivery.status === 'delivered') {
        stats.successfulDeliveries++;
      } else if (delivery.status === 'failed') {
        stats.failedDeliveries++;
      } else if (delivery.status === 'pending' || delivery.status === 'retrying') {
        stats.pendingDeliveries++;
      }

      for (const attempt of delivery.attempts) {
        if (attempt.durationMs) {
          totalResponseTime += attempt.durationMs;
          responseCount++;
        }
      }
    }

    stats.averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    stats.successRate = stats.totalDeliveries > 0
      ? (stats.successfulDeliveries / stats.totalDeliveries) * 100
      : 0;

    return stats;
  }

  // =================== EVENT TYPES ===================

  getEventTypes(): WebhookEventType[] {
    return [
      'invoice.created', 'invoice.updated', 'invoice.paid', 'invoice.cancelled',
      'customer.created', 'customer.updated', 'customer.deleted',
      'order.created', 'order.shipped', 'order.delivered', 'order.cancelled',
      'payment.received', 'payment.failed', 'payment.refunded',
      'employee.hired', 'employee.terminated',
      'delivery.started', 'delivery.completed', 'delivery.failed',
      'backup.completed', 'backup.failed',
      'report.generated', 'import.completed', 'export.completed',
    ];
  }

  getEventCategories(): Record<string, WebhookEventType[]> {
    return {
      invoice: ['invoice.created', 'invoice.updated', 'invoice.paid', 'invoice.cancelled'],
      customer: ['customer.created', 'customer.updated', 'customer.deleted'],
      order: ['order.created', 'order.shipped', 'order.delivered', 'order.cancelled'],
      payment: ['payment.received', 'payment.failed', 'payment.refunded'],
      employee: ['employee.hired', 'employee.terminated'],
      delivery: ['delivery.started', 'delivery.completed', 'delivery.failed'],
      system: ['backup.completed', 'backup.failed', 'report.generated', 'import.completed', 'export.completed'],
    };
  }

  // =================== METADATA ===================

  getWebhookStatuses(): WebhookStatus[] {
    return ['active', 'inactive', 'suspended'];
  }

  getDeliveryStatuses(): DeliveryStatus[] {
    return ['pending', 'delivered', 'failed', 'retrying'];
  }
}
