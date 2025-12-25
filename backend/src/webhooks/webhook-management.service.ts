import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

export type WebhookEvent =
  | 'invoice.created' | 'invoice.updated' | 'invoice.deleted' | 'invoice.paid' | 'invoice.overdue'
  | 'client.created' | 'client.updated' | 'client.deleted'
  | 'payment.received' | 'payment.failed'
  | 'document.created' | 'document.signed' | 'document.expired'
  | 'anaf.submission.success' | 'anaf.submission.failed'
  | 'employee.hired' | 'employee.terminated'
  | 'report.generated';

export type WebhookStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'FAILED';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING';

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  secret: string;
  headers: Record<string, string>;
  retryPolicy: RetryPolicy;
  filters?: WebhookFilter[];
  metadata: Record<string, any>;
  consecutiveFailures: number;
  lastDeliveryAt?: Date;
  lastSuccessAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface WebhookFilter {
  field: string;
  operator: 'EQUALS' | 'CONTAINS' | 'STARTS_WITH' | 'IN';
  value: any;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: WebhookPayload;
  status: DeliveryStatus;
  attempts: DeliveryAttempt[];
  nextRetryAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  durationMs: number;
  success: boolean;
}

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
  metadata: {
    tenantId: string;
    environment: string;
    version: string;
  };
}

export interface WebhookStats {
  totalEndpoints: number;
  activeEndpoints: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliveryRate: number;
  averageDeliveryTimeMs: number;
  byEvent: Record<string, { sent: number; failed: number }>;
}

export interface CreateWebhookDto {
  tenantId: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  retryPolicy?: Partial<RetryPolicy>;
  filters?: WebhookFilter[];
  metadata?: Record<string, any>;
  createdBy: string;
}

@Injectable()
export class WebhookManagementService {
  private endpoints = new Map<string, WebhookEndpoint>();
  private deliveries = new Map<string, WebhookDelivery>();
  private eventLog: { event: WebhookEvent; webhookId: string; success: boolean; timestamp: Date }[] = [];
  private readonly defaultRetryPolicy: RetryPolicy = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  };

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
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
      this.eventEmitter.on(event, (data: Record<string, any>) => {
        this.dispatchEvent(event, data);
      });
    });
  }

  // Webhook Management
  createWebhook(dto: CreateWebhookDto): WebhookEndpoint {
    if (!this.isValidUrl(dto.url)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    if (dto.events.length === 0) {
      throw new BadRequestException('At least one event must be subscribed');
    }

    const secret = this.generateSecret();

    const webhook: WebhookEndpoint = {
      id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId: dto.tenantId,
      name: dto.name,
      nameRo: dto.nameRo,
      description: dto.description,
      descriptionRo: dto.descriptionRo,
      url: dto.url,
      events: dto.events,
      status: 'ACTIVE',
      secret,
      headers: dto.headers || {},
      retryPolicy: { ...this.defaultRetryPolicy, ...dto.retryPolicy },
      filters: dto.filters,
      metadata: dto.metadata || {},
      consecutiveFailures: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: dto.createdBy,
    };

    this.endpoints.set(webhook.id, webhook);
    this.eventEmitter.emit('webhook.created', { webhookId: webhook.id });
    return webhook;
  }

  getWebhook(webhookId: string): WebhookEndpoint {
    const webhook = this.endpoints.get(webhookId);
    if (!webhook) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }
    return webhook;
  }

  getWebhooks(filters?: { tenantId?: string; status?: WebhookStatus; event?: WebhookEvent }): WebhookEndpoint[] {
    let webhooks = Array.from(this.endpoints.values());

    if (filters?.tenantId) {
      webhooks = webhooks.filter((w) => w.tenantId === filters.tenantId);
    }
    if (filters?.status) {
      webhooks = webhooks.filter((w) => w.status === filters.status);
    }
    if (filters?.event) {
      webhooks = webhooks.filter((w) => w.events.includes(filters.event!));
    }

    return webhooks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateWebhook(webhookId: string, updates: Partial<CreateWebhookDto>): WebhookEndpoint {
    const webhook = this.getWebhook(webhookId);

    if (updates.url && !this.isValidUrl(updates.url)) {
      throw new BadRequestException('Invalid webhook URL');
    }

    const updated: WebhookEndpoint = {
      ...webhook,
      name: updates.name ?? webhook.name,
      nameRo: updates.nameRo ?? webhook.nameRo,
      description: updates.description ?? webhook.description,
      descriptionRo: updates.descriptionRo ?? webhook.descriptionRo,
      url: updates.url ?? webhook.url,
      events: updates.events ?? webhook.events,
      headers: updates.headers ?? webhook.headers,
      retryPolicy: updates.retryPolicy ? { ...webhook.retryPolicy, ...updates.retryPolicy } : webhook.retryPolicy,
      filters: updates.filters ?? webhook.filters,
      metadata: updates.metadata ?? webhook.metadata,
      updatedAt: new Date(),
    };

    this.endpoints.set(webhookId, updated);
    this.eventEmitter.emit('webhook.updated', { webhookId });
    return updated;
  }

  deleteWebhook(webhookId: string): void {
    if (!this.endpoints.has(webhookId)) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }
    this.endpoints.delete(webhookId);
    this.eventEmitter.emit('webhook.deleted', { webhookId });
  }

  pauseWebhook(webhookId: string): WebhookEndpoint {
    const webhook = this.getWebhook(webhookId);

    if (webhook.status === 'DISABLED') {
      throw new BadRequestException('Cannot pause disabled webhook');
    }

    webhook.status = 'PAUSED';
    webhook.updatedAt = new Date();
    this.endpoints.set(webhookId, webhook);
    return webhook;
  }

  resumeWebhook(webhookId: string): WebhookEndpoint {
    const webhook = this.getWebhook(webhookId);

    if (webhook.status !== 'PAUSED') {
      throw new BadRequestException('Webhook is not paused');
    }

    webhook.status = 'ACTIVE';
    webhook.consecutiveFailures = 0;
    webhook.updatedAt = new Date();
    this.endpoints.set(webhookId, webhook);
    return webhook;
  }

  disableWebhook(webhookId: string): WebhookEndpoint {
    const webhook = this.getWebhook(webhookId);
    webhook.status = 'DISABLED';
    webhook.updatedAt = new Date();
    this.endpoints.set(webhookId, webhook);
    return webhook;
  }

  rotateSecret(webhookId: string): { webhook: WebhookEndpoint; newSecret: string } {
    const webhook = this.getWebhook(webhookId);
    const newSecret = this.generateSecret();

    webhook.secret = newSecret;
    webhook.updatedAt = new Date();
    this.endpoints.set(webhookId, webhook);

    this.eventEmitter.emit('webhook.secret.rotated', { webhookId });
    return { webhook, newSecret };
  }

  // Event Dispatching
  async dispatchEvent(event: WebhookEvent, data: Record<string, any>): Promise<void> {
    const tenantId = data.tenantId || 'default';
    const webhooks = this.getWebhooks({ tenantId, status: 'ACTIVE', event });

    for (const webhook of webhooks) {
      if (this.matchesFilters(webhook.filters, data)) {
        await this.sendWebhook(webhook, event, data);
      }
    }
  }

  private matchesFilters(filters: WebhookFilter[] | undefined, data: Record<string, any>): boolean {
    if (!filters || filters.length === 0) return true;

    return filters.every((filter) => {
      const value = data[filter.field];
      switch (filter.operator) {
        case 'EQUALS':
          return value === filter.value;
        case 'CONTAINS':
          return String(value).includes(String(filter.value));
        case 'STARTS_WITH':
          return String(value).startsWith(String(filter.value));
        case 'IN':
          return Array.isArray(filter.value) && filter.value.includes(value);
        default:
          return true;
      }
    });
  }

  async sendWebhook(webhook: WebhookEndpoint, event: WebhookEvent, data: Record<string, any>): Promise<WebhookDelivery> {
    const payload = this.createPayload(event, data, webhook.tenantId);
    const signature = this.signPayload(payload, webhook.secret);

    const delivery: WebhookDelivery = {
      id: `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      webhookId: webhook.id,
      event,
      payload,
      status: 'PENDING',
      attempts: [],
      createdAt: new Date(),
    };

    this.deliveries.set(delivery.id, delivery);

    await this.attemptDelivery(webhook, delivery, signature);

    return delivery;
  }

  private async attemptDelivery(webhook: WebhookEndpoint, delivery: WebhookDelivery, signature: string): Promise<void> {
    const attemptNumber = delivery.attempts.length + 1;
    const startTime = Date.now();

    try {
      // Simulate HTTP request
      const result = await this.simulateHttpRequest(webhook, delivery.payload, signature);

      const attempt: DeliveryAttempt = {
        attemptNumber,
        timestamp: new Date(),
        statusCode: result.statusCode,
        responseBody: result.body,
        durationMs: Date.now() - startTime,
        success: result.success,
      };

      delivery.attempts.push(attempt);

      if (result.success) {
        delivery.status = 'DELIVERED';
        delivery.completedAt = new Date();
        webhook.consecutiveFailures = 0;
        webhook.lastDeliveryAt = new Date();
        webhook.lastSuccessAt = new Date();
        this.eventLog.push({ event: delivery.event, webhookId: webhook.id, success: true, timestamp: new Date() });
        this.eventEmitter.emit('webhook.delivery.success', { deliveryId: delivery.id, webhookId: webhook.id });
      } else {
        await this.handleDeliveryFailure(webhook, delivery, attempt);
      }
    } catch (error) {
      const attempt: DeliveryAttempt = {
        attemptNumber,
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
        success: false,
      };

      delivery.attempts.push(attempt);
      await this.handleDeliveryFailure(webhook, delivery, attempt);
    }

    this.deliveries.set(delivery.id, delivery);
    this.endpoints.set(webhook.id, webhook);
  }

  private async handleDeliveryFailure(webhook: WebhookEndpoint, delivery: WebhookDelivery, attempt: DeliveryAttempt): Promise<void> {
    webhook.consecutiveFailures++;
    webhook.lastDeliveryAt = new Date();

    if (delivery.attempts.length < webhook.retryPolicy.maxRetries) {
      delivery.status = 'RETRYING';
      const delay = Math.min(
        webhook.retryPolicy.initialDelayMs * Math.pow(webhook.retryPolicy.backoffMultiplier, delivery.attempts.length - 1),
        webhook.retryPolicy.maxDelayMs,
      );
      delivery.nextRetryAt = new Date(Date.now() + delay);
    } else {
      delivery.status = 'FAILED';
      delivery.completedAt = new Date();
      this.eventLog.push({ event: delivery.event, webhookId: webhook.id, success: false, timestamp: new Date() });
      this.eventEmitter.emit('webhook.delivery.failed', { deliveryId: delivery.id, webhookId: webhook.id });

      // Disable webhook after too many consecutive failures
      if (webhook.consecutiveFailures >= 10) {
        webhook.status = 'FAILED';
        this.eventEmitter.emit('webhook.disabled.failures', { webhookId: webhook.id });
      }
    }
  }

  private async simulateHttpRequest(webhook: WebhookEndpoint, payload: WebhookPayload, signature: string): Promise<{ success: boolean; statusCode: number; body: string }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate occasional failures for testing
    if (webhook.metadata?.simulateFailure) {
      return { success: false, statusCode: 500, body: 'Internal Server Error' };
    }

    return { success: true, statusCode: 200, body: '{"received": true}' };
  }

  // Delivery Management
  getDelivery(deliveryId: string): WebhookDelivery {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }
    return delivery;
  }

  getDeliveries(filters?: { webhookId?: string; status?: DeliveryStatus; event?: WebhookEvent; limit?: number }): WebhookDelivery[] {
    let deliveries = Array.from(this.deliveries.values());

    if (filters?.webhookId) {
      deliveries = deliveries.filter((d) => d.webhookId === filters.webhookId);
    }
    if (filters?.status) {
      deliveries = deliveries.filter((d) => d.status === filters.status);
    }
    if (filters?.event) {
      deliveries = deliveries.filter((d) => d.event === filters.event);
    }

    deliveries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (filters?.limit) {
      deliveries = deliveries.slice(0, filters.limit);
    }

    return deliveries;
  }

  async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = this.getDelivery(deliveryId);

    if (delivery.status !== 'FAILED') {
      throw new BadRequestException('Can only retry failed deliveries');
    }

    const webhook = this.getWebhook(delivery.webhookId);
    const signature = this.signPayload(delivery.payload, webhook.secret);

    delivery.status = 'RETRYING';
    delivery.nextRetryAt = undefined;

    await this.attemptDelivery(webhook, delivery, signature);
    return delivery;
  }

  // Payload & Signature
  private createPayload(event: WebhookEvent, data: Record<string, any>, tenantId: string): WebhookPayload {
    return {
      id: `payload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        tenantId,
        environment: process.env.NODE_ENV || 'development',
        version: '1.0',
      },
    };
  }

  private signPayload(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  private generateSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`;
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  // Testing
  async testWebhook(webhookId: string): Promise<WebhookDelivery> {
    const webhook = this.getWebhook(webhookId);

    const testData = {
      test: true,
      message: 'This is a test webhook delivery',
      messageRo: 'Aceasta este o livrare webhook de test',
      timestamp: new Date().toISOString(),
    };

    const event = webhook.events[0] || 'invoice.created';
    return this.sendWebhook(webhook, event, testData);
  }

  // Statistics
  getStats(tenantId?: string): WebhookStats {
    let webhooks = Array.from(this.endpoints.values());
    let deliveries = Array.from(this.deliveries.values());

    if (tenantId) {
      webhooks = webhooks.filter((w) => w.tenantId === tenantId);
      const webhookIds = new Set(webhooks.map((w) => w.id));
      deliveries = deliveries.filter((d) => webhookIds.has(d.webhookId));
    }

    const successfulDeliveries = deliveries.filter((d) => d.status === 'DELIVERED').length;
    const failedDeliveries = deliveries.filter((d) => d.status === 'FAILED').length;

    const byEvent: Record<string, { sent: number; failed: number }> = {};
    deliveries.forEach((d) => {
      if (!byEvent[d.event]) {
        byEvent[d.event] = { sent: 0, failed: 0 };
      }
      if (d.status === 'DELIVERED') {
        byEvent[d.event].sent++;
      } else if (d.status === 'FAILED') {
        byEvent[d.event].failed++;
      }
    });

    const completedDeliveries = deliveries.filter((d) => d.status === 'DELIVERED' && d.attempts.length > 0);
    const totalDeliveryTime = completedDeliveries.reduce((sum, d) => {
      const successAttempt = d.attempts.find((a) => a.success);
      return sum + (successAttempt?.durationMs || 0);
    }, 0);

    return {
      totalEndpoints: webhooks.length,
      activeEndpoints: webhooks.filter((w) => w.status === 'ACTIVE').length,
      totalDeliveries: deliveries.length,
      successfulDeliveries,
      failedDeliveries,
      deliveryRate: deliveries.length > 0 ? (successfulDeliveries / (successfulDeliveries + failedDeliveries)) * 100 : 100,
      averageDeliveryTimeMs: completedDeliveries.length > 0 ? totalDeliveryTime / completedDeliveries.length : 0,
      byEvent,
    };
  }

  // Event Log
  getEventLog(webhookId?: string, limit: number = 100): { event: WebhookEvent; webhookId: string; success: boolean; timestamp: Date }[] {
    let log = [...this.eventLog];

    if (webhookId) {
      log = log.filter((e) => e.webhookId === webhookId);
    }

    return log.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  // Get available events
  getAvailableEvents(): { event: WebhookEvent; label: string; labelRo: string; category: string }[] {
    return [
      { event: 'invoice.created', label: 'Invoice Created', labelRo: 'Factură Creată', category: 'Invoices' },
      { event: 'invoice.updated', label: 'Invoice Updated', labelRo: 'Factură Actualizată', category: 'Invoices' },
      { event: 'invoice.deleted', label: 'Invoice Deleted', labelRo: 'Factură Ștearsă', category: 'Invoices' },
      { event: 'invoice.paid', label: 'Invoice Paid', labelRo: 'Factură Plătită', category: 'Invoices' },
      { event: 'invoice.overdue', label: 'Invoice Overdue', labelRo: 'Factură Restantă', category: 'Invoices' },
      { event: 'client.created', label: 'Client Created', labelRo: 'Client Creat', category: 'Clients' },
      { event: 'client.updated', label: 'Client Updated', labelRo: 'Client Actualizat', category: 'Clients' },
      { event: 'client.deleted', label: 'Client Deleted', labelRo: 'Client Șters', category: 'Clients' },
      { event: 'payment.received', label: 'Payment Received', labelRo: 'Plată Primită', category: 'Payments' },
      { event: 'payment.failed', label: 'Payment Failed', labelRo: 'Plată Eșuată', category: 'Payments' },
      { event: 'document.created', label: 'Document Created', labelRo: 'Document Creat', category: 'Documents' },
      { event: 'document.signed', label: 'Document Signed', labelRo: 'Document Semnat', category: 'Documents' },
      { event: 'document.expired', label: 'Document Expired', labelRo: 'Document Expirat', category: 'Documents' },
      { event: 'anaf.submission.success', label: 'ANAF Submission Success', labelRo: 'Depunere ANAF Reușită', category: 'ANAF' },
      { event: 'anaf.submission.failed', label: 'ANAF Submission Failed', labelRo: 'Depunere ANAF Eșuată', category: 'ANAF' },
      { event: 'employee.hired', label: 'Employee Hired', labelRo: 'Angajat Nou', category: 'Employees' },
      { event: 'employee.terminated', label: 'Employee Terminated', labelRo: 'Angajat Concediat', category: 'Employees' },
      { event: 'report.generated', label: 'Report Generated', labelRo: 'Raport Generat', category: 'Reports' },
    ];
  }
}
