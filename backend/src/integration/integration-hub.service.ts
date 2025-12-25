import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type IntegrationType =
  | 'ANAF_SPV'
  | 'ANAF_EFACTURA'
  | 'SAGA'
  | 'BANK_PSD2'
  | 'PAYMENT_GATEWAY'
  | 'EMAIL'
  | 'SMS'
  | 'STORAGE'
  | 'AI_SERVICE'
  | 'WEBHOOK'
  | 'CUSTOM';

export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'RATE_LIMITED' | 'MAINTENANCE';

export type AuthType = 'NONE' | 'API_KEY' | 'OAUTH2' | 'BASIC' | 'BEARER' | 'CERTIFICATE';

export interface IntegrationConfig {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: IntegrationType;
  baseUrl: string;
  authType: AuthType;
  credentials: Record<string, any>;
  headers?: Record<string, string>;
  timeout: number;
  retryConfig: RetryConfig;
  rateLimitConfig: RateLimitConfig;
  healthCheckUrl?: string;
  healthCheckInterval: number;
  status: IntegrationStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastHealthCheck?: Date;
  tenantId?: string;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: number[];
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface ApiRequest {
  id: string;
  integrationId: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  timestamp: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'RETRYING';
  attempts: number;
  response?: ApiResponse;
  error?: string;
  duration?: number;
  userId?: string;
}

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  timestamp: Date;
}

export interface Webhook {
  id: string;
  name: string;
  nameRo: string;
  url: string;
  secret: string;
  events: string[];
  headers?: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  successCount: number;
  failureCount: number;
  tenantId?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  timestamp: Date;
  status: 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING';
  attempts: number;
  responseCode?: number;
  error?: string;
}

export interface OAuthToken {
  integrationId: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: Date;
  scope?: string;
}

export interface HealthCheckResult {
  integrationId: string;
  status: 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED';
  responseTime: number;
  timestamp: Date;
  error?: string;
}

export interface IntegrationStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  lastHour: { requests: number; errors: number };
}

// Romanian translations for integration types
const INTEGRATION_TYPE_TRANSLATIONS: Record<IntegrationType, string> = {
  ANAF_SPV: 'ANAF Spațiul Privat Virtual',
  ANAF_EFACTURA: 'ANAF e-Factura',
  SAGA: 'Sistem SAGA',
  BANK_PSD2: 'Bancă PSD2',
  PAYMENT_GATEWAY: 'Gateway de Plată',
  EMAIL: 'Serviciu Email',
  SMS: 'Serviciu SMS',
  STORAGE: 'Stocare Fișiere',
  AI_SERVICE: 'Serviciu AI',
  WEBHOOK: 'Webhook',
  CUSTOM: 'Integrare Personalizată',
};

// Romanian translations for status
const STATUS_TRANSLATIONS: Record<IntegrationStatus, string> = {
  ACTIVE: 'Activ',
  INACTIVE: 'Inactiv',
  ERROR: 'Eroare',
  RATE_LIMITED: 'Limită Depășită',
  MAINTENANCE: 'În Mentenanță',
};

// Default integration configurations for Romanian services
const DEFAULT_INTEGRATIONS: Partial<IntegrationConfig>[] = [
  {
    id: 'int-anaf-spv',
    name: 'ANAF SPV',
    nameRo: 'ANAF Spațiul Privat Virtual',
    description: 'Romanian Tax Authority Private Virtual Space',
    descriptionRo: 'Spațiul Privat Virtual al Agenției Naționale de Administrare Fiscală',
    type: 'ANAF_SPV',
    baseUrl: 'https://api.anaf.ro/spv/v1',
    authType: 'CERTIFICATE',
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [408, 429, 500, 502, 503, 504],
    },
    rateLimitConfig: {
      requestsPerSecond: 10,
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      burstLimit: 20,
    },
    healthCheckInterval: 300000,
  },
  {
    id: 'int-anaf-efactura',
    name: 'ANAF e-Factura',
    nameRo: 'ANAF e-Factura',
    description: 'Romanian e-Invoice System',
    descriptionRo: 'Sistemul de Facturare Electronică ANAF',
    type: 'ANAF_EFACTURA',
    baseUrl: 'https://api.anaf.ro/efactura/v1',
    authType: 'OAUTH2',
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [408, 429, 500, 502, 503, 504],
    },
    rateLimitConfig: {
      requestsPerSecond: 10,
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      burstLimit: 20,
    },
    healthCheckInterval: 300000,
  },
  {
    id: 'int-saga',
    name: 'SAGA Integration',
    nameRo: 'Integrare SAGA',
    description: 'SAGA Accounting Software Integration',
    descriptionRo: 'Integrare cu Sistemul de Contabilitate SAGA',
    type: 'SAGA',
    baseUrl: 'https://api.saga.ro/v3.2',
    authType: 'OAUTH2',
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [408, 429, 500, 502, 503, 504],
    },
    rateLimitConfig: {
      requestsPerSecond: 10,
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      burstLimit: 20,
    },
    healthCheckInterval: 300000,
  },
];

@Injectable()
export class IntegrationHubService implements OnModuleInit {
  private integrations: Map<string, IntegrationConfig> = new Map();
  private requests: Map<string, ApiRequest> = new Map();
  private webhooks: Map<string, Webhook> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private tokens: Map<string, OAuthToken> = new Map();
  private healthResults: Map<string, HealthCheckResult> = new Map();
  private requestCounts: Map<string, { second: number; minute: number; hour: number; timestamps: number[] }> =
    new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    // Initialize default integrations
    for (const config of DEFAULT_INTEGRATIONS) {
      const fullConfig: IntegrationConfig = {
        id: config.id!,
        name: config.name!,
        nameRo: config.nameRo!,
        description: config.description!,
        descriptionRo: config.descriptionRo!,
        type: config.type!,
        baseUrl: config.baseUrl!,
        authType: config.authType!,
        credentials: {},
        timeout: config.timeout!,
        retryConfig: config.retryConfig!,
        rateLimitConfig: config.rateLimitConfig!,
        healthCheckInterval: config.healthCheckInterval!,
        status: 'INACTIVE',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.integrations.set(fullConfig.id, fullConfig);
    }
  }

  // Integration Management
  async createIntegration(
    name: string,
    nameRo: string,
    type: IntegrationType,
    baseUrl: string,
    authType: AuthType,
    options: {
      description?: string;
      descriptionRo?: string;
      credentials?: Record<string, any>;
      headers?: Record<string, string>;
      timeout?: number;
      retryConfig?: Partial<RetryConfig>;
      rateLimitConfig?: Partial<RateLimitConfig>;
      healthCheckUrl?: string;
      healthCheckInterval?: number;
      tenantId?: string;
    } = {},
  ): Promise<IntegrationConfig> {
    const config: IntegrationConfig = {
      id: this.generateId('int'),
      name,
      nameRo,
      description: options.description || '',
      descriptionRo: options.descriptionRo || '',
      type,
      baseUrl,
      authType,
      credentials: options.credentials || {},
      headers: options.headers,
      timeout: options.timeout || 30000,
      retryConfig: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: [408, 429, 500, 502, 503, 504],
        ...options.retryConfig,
      },
      rateLimitConfig: {
        requestsPerSecond: 10,
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        burstLimit: 20,
        ...options.rateLimitConfig,
      },
      healthCheckUrl: options.healthCheckUrl,
      healthCheckInterval: options.healthCheckInterval || 300000,
      status: 'INACTIVE',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: options.tenantId,
    };

    this.integrations.set(config.id, config);

    this.eventEmitter.emit('integration.created', {
      integrationId: config.id,
      name: config.name,
      type: config.type,
    });

    return config;
  }

  async getIntegration(integrationId: string): Promise<IntegrationConfig | undefined> {
    return this.integrations.get(integrationId);
  }

  async listIntegrations(type?: IntegrationType): Promise<IntegrationConfig[]> {
    let integrations = Array.from(this.integrations.values());
    if (type) {
      integrations = integrations.filter((i) => i.type === type);
    }
    return integrations;
  }

  async updateIntegration(
    integrationId: string,
    updates: Partial<Omit<IntegrationConfig, 'id' | 'createdAt'>>,
  ): Promise<IntegrationConfig> {
    const config = this.integrations.get(integrationId);
    if (!config) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const updated: IntegrationConfig = {
      ...config,
      ...updates,
      updatedAt: new Date(),
    };
    this.integrations.set(integrationId, updated);

    this.eventEmitter.emit('integration.updated', {
      integrationId: updated.id,
      changes: Object.keys(updates),
    });

    return updated;
  }

  async activateIntegration(integrationId: string): Promise<IntegrationConfig> {
    const config = this.integrations.get(integrationId);
    if (!config) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    config.isActive = true;
    config.status = 'ACTIVE';
    config.updatedAt = new Date();
    this.integrations.set(integrationId, config);

    this.eventEmitter.emit('integration.activated', {
      integrationId: config.id,
    });

    return config;
  }

  async deactivateIntegration(integrationId: string): Promise<IntegrationConfig> {
    const config = this.integrations.get(integrationId);
    if (!config) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    config.isActive = false;
    config.status = 'INACTIVE';
    config.updatedAt = new Date();
    this.integrations.set(integrationId, config);

    this.eventEmitter.emit('integration.deactivated', {
      integrationId: config.id,
    });

    return config;
  }

  async deleteIntegration(integrationId: string): Promise<boolean> {
    const deleted = this.integrations.delete(integrationId);
    if (deleted) {
      this.tokens.delete(integrationId);
      this.healthResults.delete(integrationId);
      this.requestCounts.delete(integrationId);
    }
    return deleted;
  }

  // API Request Management
  async makeRequest(
    integrationId: string,
    method: ApiRequest['method'],
    endpoint: string,
    options: {
      headers?: Record<string, string>;
      body?: any;
      queryParams?: Record<string, string>;
      userId?: string;
    } = {},
  ): Promise<ApiRequest> {
    const config = this.integrations.get(integrationId);
    if (!config) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    if (!config.isActive) {
      throw new Error(`Integration is not active: ${integrationId}`);
    }

    // Check rate limits
    if (this.isRateLimited(integrationId)) {
      config.status = 'RATE_LIMITED';
      this.integrations.set(integrationId, config);
      throw new Error(`Rate limit exceeded for integration: ${integrationId}`);
    }

    const request: ApiRequest = {
      id: this.generateId('req'),
      integrationId,
      method,
      endpoint,
      headers: options.headers,
      body: options.body,
      queryParams: options.queryParams,
      timestamp: new Date(),
      status: 'PENDING',
      attempts: 0,
      userId: options.userId,
    };

    this.requests.set(request.id, request);

    // Execute request with retry logic
    await this.executeRequest(request);

    this.eventEmitter.emit('integration.request', {
      requestId: request.id,
      integrationId,
      method,
      endpoint,
      status: request.status,
    });

    return request;
  }

  private async executeRequest(request: ApiRequest): Promise<void> {
    const config = this.integrations.get(request.integrationId)!;
    const startTime = Date.now();

    request.status = 'IN_PROGRESS';
    request.attempts++;
    this.requests.set(request.id, request);

    try {
      // Track rate limit
      this.trackRequest(request.integrationId);

      // Simulate API call
      const response = await this.simulateApiCall(config, request);

      request.status = 'SUCCESS';
      request.response = response;
      request.duration = Date.now() - startTime;
      this.requests.set(request.id, request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const statusCode = this.extractStatusCode(error);

      // Check if should retry
      if (
        request.attempts < config.retryConfig.maxRetries &&
        config.retryConfig.retryableErrors.includes(statusCode)
      ) {
        request.status = 'RETRYING';
        this.requests.set(request.id, request);

        // Calculate backoff delay
        const delay = Math.min(
          config.retryConfig.initialDelay * Math.pow(config.retryConfig.backoffMultiplier, request.attempts - 1),
          config.retryConfig.maxDelay,
        );

        await this.delay(delay);
        await this.executeRequest(request);
      } else {
        request.status = 'FAILED';
        request.error = errorMessage;
        request.duration = Date.now() - startTime;
        this.requests.set(request.id, request);
      }
    }
  }

  private async simulateApiCall(config: IntegrationConfig, request: ApiRequest): Promise<ApiResponse> {
    // Simulate successful API response
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: { success: true, data: {} },
      timestamp: new Date(),
    };
  }

  private extractStatusCode(error: any): number {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return error.statusCode;
    }
    return 500;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getRequest(requestId: string): Promise<ApiRequest | undefined> {
    return this.requests.get(requestId);
  }

  async listRequests(options: {
    integrationId?: string;
    status?: ApiRequest['status'];
    limit?: number;
  } = {}): Promise<ApiRequest[]> {
    let requests = Array.from(this.requests.values());

    if (options.integrationId) {
      requests = requests.filter((r) => r.integrationId === options.integrationId);
    }
    if (options.status) {
      requests = requests.filter((r) => r.status === options.status);
    }

    requests.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      requests = requests.slice(0, options.limit);
    }

    return requests;
  }

  // Rate Limiting
  private isRateLimited(integrationId: string): boolean {
    const config = this.integrations.get(integrationId);
    if (!config) return true;

    const counts = this.requestCounts.get(integrationId);
    if (!counts) return false;

    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // Clean old timestamps
    counts.timestamps = counts.timestamps.filter((t) => t > oneHourAgo);

    const lastSecond = counts.timestamps.filter((t) => t > oneSecondAgo).length;
    const lastMinute = counts.timestamps.filter((t) => t > oneMinuteAgo).length;
    const lastHour = counts.timestamps.length;

    return (
      lastSecond >= config.rateLimitConfig.requestsPerSecond ||
      lastMinute >= config.rateLimitConfig.requestsPerMinute ||
      lastHour >= config.rateLimitConfig.requestsPerHour
    );
  }

  private trackRequest(integrationId: string): void {
    let counts = this.requestCounts.get(integrationId);
    if (!counts) {
      counts = { second: 0, minute: 0, hour: 0, timestamps: [] };
      this.requestCounts.set(integrationId, counts);
    }
    counts.timestamps.push(Date.now());
  }

  // OAuth Token Management
  async setOAuthToken(
    integrationId: string,
    accessToken: string,
    options: {
      refreshToken?: string;
      tokenType?: string;
      expiresIn?: number;
      scope?: string;
    } = {},
  ): Promise<OAuthToken> {
    const token: OAuthToken = {
      integrationId,
      accessToken,
      refreshToken: options.refreshToken,
      tokenType: options.tokenType || 'Bearer',
      expiresAt: new Date(Date.now() + (options.expiresIn || 3600) * 1000),
      scope: options.scope,
    };

    this.tokens.set(integrationId, token);

    this.eventEmitter.emit('integration.token.set', {
      integrationId,
      expiresAt: token.expiresAt,
    });

    return token;
  }

  async getOAuthToken(integrationId: string): Promise<OAuthToken | undefined> {
    return this.tokens.get(integrationId);
  }

  async isTokenValid(integrationId: string): Promise<boolean> {
    const token = this.tokens.get(integrationId);
    if (!token) return false;
    return token.expiresAt.getTime() > Date.now();
  }

  async refreshOAuthToken(integrationId: string): Promise<OAuthToken> {
    const token = this.tokens.get(integrationId);
    if (!token || !token.refreshToken) {
      throw new Error(`No refresh token available for: ${integrationId}`);
    }

    // Simulate token refresh
    const newToken: OAuthToken = {
      ...token,
      accessToken: `refreshed-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };

    this.tokens.set(integrationId, newToken);

    this.eventEmitter.emit('integration.token.refreshed', {
      integrationId,
      expiresAt: newToken.expiresAt,
    });

    return newToken;
  }

  // Webhook Management
  async createWebhook(
    name: string,
    nameRo: string,
    url: string,
    events: string[],
    options: {
      secret?: string;
      headers?: Record<string, string>;
      tenantId?: string;
    } = {},
  ): Promise<Webhook> {
    const webhook: Webhook = {
      id: this.generateId('whk'),
      name,
      nameRo,
      url,
      secret: options.secret || this.generateSecret(),
      events,
      headers: options.headers,
      isActive: true,
      createdAt: new Date(),
      successCount: 0,
      failureCount: 0,
      tenantId: options.tenantId,
    };

    this.webhooks.set(webhook.id, webhook);

    this.eventEmitter.emit('webhook.created', {
      webhookId: webhook.id,
      name: webhook.name,
      events: webhook.events,
    });

    return webhook;
  }

  async getWebhook(webhookId: string): Promise<Webhook | undefined> {
    return this.webhooks.get(webhookId);
  }

  async listWebhooks(event?: string): Promise<Webhook[]> {
    let webhooks = Array.from(this.webhooks.values());
    if (event) {
      webhooks = webhooks.filter((w) => w.events.includes(event));
    }
    return webhooks.filter((w) => w.isActive);
  }

  async updateWebhook(
    webhookId: string,
    updates: Partial<Omit<Webhook, 'id' | 'createdAt' | 'secret'>>,
  ): Promise<Webhook> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    const updated: Webhook = {
      ...webhook,
      ...updates,
    };
    this.webhooks.set(webhookId, updated);

    return updated;
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    return this.webhooks.delete(webhookId);
  }

  async triggerWebhook(event: string, payload: any): Promise<WebhookDelivery[]> {
    const webhooks = await this.listWebhooks(event);
    const deliveries: WebhookDelivery[] = [];

    for (const webhook of webhooks) {
      const delivery = await this.deliverWebhook(webhook, event, payload);
      deliveries.push(delivery);
    }

    return deliveries;
  }

  private async deliverWebhook(webhook: Webhook, event: string, payload: any): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: this.generateId('dlv'),
      webhookId: webhook.id,
      event,
      payload,
      timestamp: new Date(),
      status: 'PENDING',
      attempts: 0,
    };

    this.deliveries.set(delivery.id, delivery);

    // Simulate webhook delivery
    delivery.status = 'DELIVERED';
    delivery.attempts = 1;
    delivery.responseCode = 200;
    this.deliveries.set(delivery.id, delivery);

    webhook.lastTriggered = new Date();
    webhook.successCount++;
    this.webhooks.set(webhook.id, webhook);

    this.eventEmitter.emit('webhook.delivered', {
      deliveryId: delivery.id,
      webhookId: webhook.id,
      event,
    });

    return delivery;
  }

  async getDelivery(deliveryId: string): Promise<WebhookDelivery | undefined> {
    return this.deliveries.get(deliveryId);
  }

  async listDeliveries(webhookId: string, limit?: number): Promise<WebhookDelivery[]> {
    let deliveries = Array.from(this.deliveries.values()).filter((d) => d.webhookId === webhookId);
    deliveries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    if (limit) {
      deliveries = deliveries.slice(0, limit);
    }
    return deliveries;
  }

  // Health Checks
  async checkHealth(integrationId: string): Promise<HealthCheckResult> {
    const config = this.integrations.get(integrationId);
    if (!config) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const startTime = Date.now();

    // Simulate health check
    const result: HealthCheckResult = {
      integrationId,
      status: 'HEALTHY',
      responseTime: Date.now() - startTime + Math.random() * 100,
      timestamp: new Date(),
    };

    this.healthResults.set(integrationId, result);
    config.lastHealthCheck = new Date();
    this.integrations.set(integrationId, config);

    this.eventEmitter.emit('integration.health.checked', {
      integrationId,
      status: result.status,
      responseTime: result.responseTime,
    });

    return result;
  }

  async getHealthStatus(integrationId: string): Promise<HealthCheckResult | undefined> {
    return this.healthResults.get(integrationId);
  }

  async checkAllHealth(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    for (const config of this.integrations.values()) {
      if (config.isActive) {
        const result = await this.checkHealth(config.id);
        results.push(result);
      }
    }
    return results;
  }

  // Statistics
  async getIntegrationStats(integrationId: string): Promise<IntegrationStats> {
    const requests = Array.from(this.requests.values()).filter((r) => r.integrationId === integrationId);

    const successful = requests.filter((r) => r.status === 'SUCCESS');
    const failed = requests.filter((r) => r.status === 'FAILED');
    const oneHourAgo = Date.now() - 3600000;
    const lastHourRequests = requests.filter((r) => r.timestamp.getTime() > oneHourAgo);

    const totalDuration = successful.reduce((sum, r) => sum + (r.duration || 0), 0);

    const counts = this.requestCounts.get(integrationId);
    const rateLimitHits = counts ? counts.timestamps.filter((t) => t > oneHourAgo).length : 0;

    return {
      totalRequests: requests.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageResponseTime: successful.length > 0 ? totalDuration / successful.length : 0,
      rateLimitHits,
      lastHour: {
        requests: lastHourRequests.length,
        errors: lastHourRequests.filter((r) => r.status === 'FAILED').length,
      },
    };
  }

  // Romanian Localization
  getIntegrationTypeName(type: IntegrationType): string {
    return INTEGRATION_TYPE_TRANSLATIONS[type];
  }

  getStatusName(status: IntegrationStatus): string {
    return STATUS_TRANSLATIONS[status];
  }

  getAllIntegrationTypes(): Array<{ type: IntegrationType; name: string; nameRo: string }> {
    return (Object.keys(INTEGRATION_TYPE_TRANSLATIONS) as IntegrationType[]).map((type) => ({
      type,
      name: type.replace(/_/g, ' '),
      nameRo: INTEGRATION_TYPE_TRANSLATIONS[type],
    }));
  }

  // Helper Methods
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }
}
