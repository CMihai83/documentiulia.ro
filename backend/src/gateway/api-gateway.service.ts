import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type AuthType = 'NONE' | 'API_KEY' | 'JWT' | 'OAUTH2' | 'BASIC' | 'HMAC';

export type RateLimitStrategy = 'FIXED_WINDOW' | 'SLIDING_WINDOW' | 'TOKEN_BUCKET' | 'LEAKY_BUCKET';

export type CacheStrategy = 'NONE' | 'PUBLIC' | 'PRIVATE' | 'STALE_WHILE_REVALIDATE';

export type RouteStatus = 'ACTIVE' | 'DEPRECATED' | 'DISABLED' | 'MAINTENANCE';

export interface Route {
  id: string;
  name: string;
  nameRo?: string;
  description?: string;
  descriptionRo?: string;
  path: string;
  methods: HttpMethod[];
  targetService: string;
  targetPath: string;
  status: RouteStatus;
  version: string;
  auth: AuthConfig;
  rateLimit: RateLimitConfig;
  cache: CacheConfig;
  transform: TransformConfig;
  validation: ValidationConfig;
  middleware: string[];
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthConfig {
  type: AuthType;
  required: boolean;
  roles?: string[];
  permissions?: string[];
  scopes?: string[];
  apiKeyHeader?: string;
  jwtIssuer?: string;
  oauthProvider?: string;
}

export interface RateLimitConfig {
  enabled: boolean;
  strategy: RateLimitStrategy;
  requests: number;
  windowMs: number;
  keyGenerator?: 'IP' | 'USER' | 'API_KEY' | 'CUSTOM';
  skipOn?: string[];
  burstLimit?: number;
}

export interface CacheConfig {
  enabled: boolean;
  strategy: CacheStrategy;
  ttl: number;
  varyBy?: string[];
  invalidateOn?: string[];
}

export interface TransformConfig {
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: TransformRule[];
  responseBody?: TransformRule[];
  stripHeaders?: string[];
}

export interface TransformRule {
  type: 'RENAME' | 'REMOVE' | 'ADD' | 'MAP';
  source?: string;
  target?: string;
  value?: any;
}

export interface ValidationConfig {
  enabled: boolean;
  schema?: Record<string, any>;
  requiredHeaders?: string[];
  requiredParams?: string[];
  maxBodySize?: number;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  nameRo?: string;
  organizationId: string;
  userId: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  permissions: string[];
  rateLimit?: RateLimitConfig;
  allowedRoutes?: string[];
  allowedIps?: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GatewayRequest {
  id: string;
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  ip: string;
  userId?: string;
  apiKeyId?: string;
  timestamp: Date;
}

export interface GatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: any;
  duration: number;
  cached: boolean;
  fromService?: string;
}

export interface RequestLog {
  id: string;
  requestId: string;
  routeId: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  duration: number;
  ip: string;
  userId?: string;
  apiKeyId?: string;
  userAgent?: string;
  referer?: string;
  error?: string;
  cached: boolean;
  rateLimited: boolean;
  timestamp: Date;
}

export interface GatewayStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  rateLimitedRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  requestsByRoute: Record<string, number>;
  requestsByMethod: Record<HttpMethod, number>;
  requestsByStatus: Record<number, number>;
  requestsByHour: number[];
  activeApiKeys: number;
  topRoutes: { route: string; count: number }[];
  topErrors: { error: string; count: number }[];
}

export interface CircuitBreaker {
  routeId: string;
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailure?: Date;
  openedAt?: Date;
  nextRetry?: Date;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);
  private routes: Map<string, Route> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private requestLogs: RequestLog[] = [];
  private rateLimitCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private services: Map<string, { url: string; healthy: boolean; lastCheck: Date }> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultRoutes();
  }

  private initializeDefaultRoutes(): void {
    const defaultRoutes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Health Check',
        nameRo: 'Verificare Sănătate',
        description: 'API health check endpoint',
        descriptionRo: 'Endpoint pentru verificarea sănătății API',
        path: '/health',
        methods: ['GET'],
        targetService: 'core',
        targetPath: '/health',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: true, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: true, strategy: 'PUBLIC', ttl: 30000 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: ['system', 'health'],
        metadata: {},
      },
      {
        name: 'API Info',
        nameRo: 'Informații API',
        description: 'API version and information',
        descriptionRo: 'Versiune și informații despre API',
        path: '/info',
        methods: ['GET'],
        targetService: 'core',
        targetPath: '/info',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: true, strategy: 'FIXED_WINDOW', requests: 50, windowMs: 60000 },
        cache: { enabled: true, strategy: 'PUBLIC', ttl: 300000 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: ['system', 'info'],
        metadata: {},
      },
    ];

    defaultRoutes.forEach((route) => {
      const id = this.generateId('route');
      const now = new Date();
      this.routes.set(id, {
        ...route,
        id,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  async createRoute(route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route> {
    // Validate route path
    if (!route.path.startsWith('/')) {
      throw new Error('Route path must start with /');
    }

    // Check for duplicate path
    const existing = this.findRouteByPath(route.path, route.methods);
    if (existing) {
      throw new Error(`Route already exists for path: ${route.path}`);
    }

    const id = this.generateId('route');
    const now = new Date();

    const newRoute: Route = {
      ...route,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.routes.set(id, newRoute);

    // Initialize circuit breaker
    this.circuitBreakers.set(id, {
      routeId: id,
      status: 'CLOSED',
      failureCount: 0,
      successCount: 0,
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000,
    });

    this.eventEmitter.emit('route.created', { routeId: id, path: route.path });

    this.logger.log(`Route created: ${id} (${route.path})`);

    return newRoute;
  }

  async updateRoute(
    routeId: string,
    updates: Partial<Omit<Route, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Route> {
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    const updated: Route = {
      ...route,
      ...updates,
      id: route.id,
      createdAt: route.createdAt,
      updatedAt: new Date(),
    };

    this.routes.set(routeId, updated);

    this.eventEmitter.emit('route.updated', { routeId, updates });

    return updated;
  }

  async deleteRoute(routeId: string): Promise<void> {
    const route = this.routes.get(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    this.routes.delete(routeId);
    this.circuitBreakers.delete(routeId);

    this.eventEmitter.emit('route.deleted', { routeId });

    this.logger.log(`Route deleted: ${routeId}`);
  }

  async getRoute(routeId: string): Promise<Route | undefined> {
    return this.routes.get(routeId);
  }

  async getAllRoutes(includeDisabled: boolean = false): Promise<Route[]> {
    let routes = Array.from(this.routes.values());
    if (!includeDisabled) {
      routes = routes.filter((r) => r.status !== 'DISABLED');
    }
    return routes;
  }

  async getRoutesByTag(tag: string): Promise<Route[]> {
    return Array.from(this.routes.values()).filter((r) => r.tags.includes(tag));
  }

  async enableRoute(routeId: string): Promise<Route> {
    return this.updateRoute(routeId, { status: 'ACTIVE' });
  }

  async disableRoute(routeId: string): Promise<Route> {
    return this.updateRoute(routeId, { status: 'DISABLED' });
  }

  async deprecateRoute(routeId: string): Promise<Route> {
    return this.updateRoute(routeId, { status: 'DEPRECATED' });
  }

  findRouteByPath(path: string, methods: HttpMethod[]): Route | undefined {
    for (const route of this.routes.values()) {
      if (this.matchPath(route.path, path) && methods.some((m) => route.methods.includes(m))) {
        return route;
      }
    }
    return undefined;
  }

  private matchPath(pattern: string, path: string): boolean {
    // Simple path matching with parameter support
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) continue;
      if (patternParts[i] !== pathParts[i]) return false;
    }

    return true;
  }

  async handleRequest(request: GatewayRequest): Promise<GatewayResponse> {
    const startTime = Date.now();
    const route = this.findRouteByPath(request.path, [request.method]);

    if (!route) {
      return this.createErrorResponse(404, 'Route not found', startTime);
    }

    if (route.status === 'DISABLED') {
      return this.createErrorResponse(503, 'Route is disabled', startTime);
    }

    if (route.status === 'MAINTENANCE') {
      return this.createErrorResponse(503, 'Route is under maintenance', startTime);
    }

    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(route.id);
    if (circuitBreaker && circuitBreaker.status === 'OPEN') {
      if (circuitBreaker.nextRetry && new Date() > circuitBreaker.nextRetry) {
        circuitBreaker.status = 'HALF_OPEN';
      } else {
        return this.createErrorResponse(503, 'Service unavailable (circuit open)', startTime);
      }
    }

    // Check authentication
    if (route.auth.required) {
      const authResult = await this.authenticateRequest(request, route.auth);
      if (!authResult.authenticated) {
        this.logRequest(request, route, 401, Date.now() - startTime, false, false, authResult.error);
        return this.createErrorResponse(401, authResult.error || 'Unauthorized', startTime);
      }
    }

    // Check rate limit
    if (route.rateLimit.enabled) {
      const rateLimitResult = this.checkRateLimit(request, route);
      if (rateLimitResult.limited) {
        this.logRequest(request, route, 429, Date.now() - startTime, false, true);
        return this.createErrorResponse(429, 'Rate limit exceeded', startTime, {
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': route.rateLimit.requests.toString(),
          'X-RateLimit-Remaining': '0',
        });
      }
    }

    // Check cache
    if (route.cache.enabled && request.method === 'GET') {
      const cached = this.getFromCache(request, route);
      if (cached) {
        this.logRequest(request, route, 200, Date.now() - startTime, true, false);
        return {
          statusCode: 200,
          headers: { 'X-Cache': 'HIT' },
          body: cached,
          duration: Date.now() - startTime,
          cached: true,
        };
      }
    }

    // Validate request
    if (route.validation.enabled) {
      const validationResult = this.validateRequest(request, route.validation);
      if (!validationResult.valid) {
        this.logRequest(request, route, 400, Date.now() - startTime, false, false, validationResult.error);
        return this.createErrorResponse(400, validationResult.error || 'Validation failed', startTime);
      }
    }

    // Transform request
    const transformedRequest = this.transformRequest(request, route.transform);

    // Forward to service (simulated)
    try {
      const response = await this.forwardRequest(transformedRequest, route);

      // Update circuit breaker on success
      if (circuitBreaker) {
        this.recordSuccess(circuitBreaker);
      }

      // Cache response
      if (route.cache.enabled && request.method === 'GET' && response.statusCode === 200) {
        this.setCache(request, route, response.body);
      }

      // Transform response
      const transformedResponse = this.transformResponse(response, route.transform);

      this.logRequest(request, route, response.statusCode, Date.now() - startTime, false, false);

      return {
        ...transformedResponse,
        duration: Date.now() - startTime,
        cached: false,
        fromService: route.targetService,
      };
    } catch (error) {
      // Update circuit breaker on failure
      if (circuitBreaker) {
        this.recordFailure(circuitBreaker);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logRequest(request, route, 500, Date.now() - startTime, false, false, errorMessage);
      return this.createErrorResponse(500, errorMessage, startTime);
    }
  }

  private async authenticateRequest(
    request: GatewayRequest,
    authConfig: AuthConfig,
  ): Promise<{ authenticated: boolean; error?: string }> {
    switch (authConfig.type) {
      case 'NONE':
        return { authenticated: true };

      case 'API_KEY': {
        const apiKeyHeader = authConfig.apiKeyHeader || 'X-API-Key';
        const keyValue = request.headers[apiKeyHeader.toLowerCase()];
        if (!keyValue) {
          return { authenticated: false, error: 'API key required' };
        }

        const apiKey = this.findApiKeyByValue(keyValue);
        if (!apiKey) {
          return { authenticated: false, error: 'Invalid API key' };
        }

        if (apiKey.status !== 'ACTIVE') {
          return { authenticated: false, error: 'API key is not active' };
        }

        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
          return { authenticated: false, error: 'API key has expired' };
        }

        // Check allowed IPs
        if (apiKey.allowedIps && apiKey.allowedIps.length > 0) {
          if (!apiKey.allowedIps.includes(request.ip)) {
            return { authenticated: false, error: 'IP not allowed' };
          }
        }

        // Update usage
        apiKey.lastUsedAt = new Date();
        apiKey.usageCount++;
        this.apiKeys.set(apiKey.id, apiKey);

        return { authenticated: true };
      }

      case 'JWT': {
        const authHeader = request.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return { authenticated: false, error: 'JWT token required' };
        }

        // Simplified JWT validation
        const token = authHeader.substring(7);
        if (!token || token.length < 10) {
          return { authenticated: false, error: 'Invalid JWT token' };
        }

        return { authenticated: true };
      }

      case 'BASIC': {
        const authHeader = request.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return { authenticated: false, error: 'Basic auth required' };
        }

        return { authenticated: true };
      }

      default:
        return { authenticated: false, error: 'Unsupported auth type' };
    }
  }

  private checkRateLimit(
    request: GatewayRequest,
    route: Route,
  ): { limited: boolean; retryAfter?: number } {
    const key = this.getRateLimitKey(request, route.rateLimit);
    const now = Date.now();

    const counter = this.rateLimitCounters.get(key);
    if (!counter || counter.resetAt < now) {
      this.rateLimitCounters.set(key, {
        count: 1,
        resetAt: now + route.rateLimit.windowMs,
      });
      return { limited: false };
    }

    if (counter.count >= route.rateLimit.requests) {
      return {
        limited: true,
        retryAfter: Math.ceil((counter.resetAt - now) / 1000),
      };
    }

    counter.count++;
    this.rateLimitCounters.set(key, counter);
    return { limited: false };
  }

  private getRateLimitKey(request: GatewayRequest, config: RateLimitConfig): string {
    switch (config.keyGenerator) {
      case 'USER':
        return `rate:${request.userId || request.ip}`;
      case 'API_KEY':
        return `rate:${request.apiKeyId || request.ip}`;
      case 'IP':
      default:
        return `rate:${request.ip}`;
    }
  }

  private getFromCache(request: GatewayRequest, route: Route): any | null {
    const key = this.getCacheKey(request, route);
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  private setCache(request: GatewayRequest, route: Route, data: any): void {
    const key = this.getCacheKey(request, route);
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + route.cache.ttl,
    });
  }

  private getCacheKey(request: GatewayRequest, route: Route): string {
    let key = `cache:${request.method}:${request.path}`;
    if (route.cache.varyBy) {
      for (const vary of route.cache.varyBy) {
        key += `:${request.headers[vary.toLowerCase()] || ''}`;
      }
    }
    return key;
  }

  invalidateCache(pattern?: string): number {
    if (!pattern) {
      const count = this.cache.size;
      this.cache.clear();
      return count;
    }

    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  private validateRequest(
    request: GatewayRequest,
    config: ValidationConfig,
  ): { valid: boolean; error?: string } {
    // Check required headers
    if (config.requiredHeaders) {
      for (const header of config.requiredHeaders) {
        if (!request.headers[header.toLowerCase()]) {
          return { valid: false, error: `Missing required header: ${header}` };
        }
      }
    }

    // Check required params
    if (config.requiredParams) {
      for (const param of config.requiredParams) {
        if (!request.query[param]) {
          return { valid: false, error: `Missing required parameter: ${param}` };
        }
      }
    }

    // Check body size
    if (config.maxBodySize && request.body) {
      const bodySize = JSON.stringify(request.body).length;
      if (bodySize > config.maxBodySize) {
        return { valid: false, error: 'Request body too large' };
      }
    }

    return { valid: true };
  }

  private transformRequest(request: GatewayRequest, config: TransformConfig): GatewayRequest {
    const transformed = { ...request };

    // Add headers
    if (config.requestHeaders) {
      transformed.headers = { ...transformed.headers, ...config.requestHeaders };
    }

    // Strip headers
    if (config.stripHeaders) {
      for (const header of config.stripHeaders) {
        delete transformed.headers[header.toLowerCase()];
      }
    }

    return transformed;
  }

  private transformResponse(response: GatewayResponse, config: TransformConfig): GatewayResponse {
    const transformed = { ...response };

    // Add headers
    if (config.responseHeaders) {
      transformed.headers = { ...transformed.headers, ...config.responseHeaders };
    }

    return transformed;
  }

  private async forwardRequest(request: GatewayRequest, route: Route): Promise<GatewayResponse> {
    // Simulated service response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { success: true, service: route.targetService, path: route.targetPath },
      duration: Math.floor(Math.random() * 100),
      cached: false,
    };
  }

  private recordSuccess(breaker: CircuitBreaker): void {
    breaker.successCount++;
    breaker.failureCount = 0;

    if (breaker.status === 'HALF_OPEN' && breaker.successCount >= breaker.successThreshold) {
      breaker.status = 'CLOSED';
      this.eventEmitter.emit('circuit.closed', { routeId: breaker.routeId });
    }

    this.circuitBreakers.set(breaker.routeId, breaker);
  }

  private recordFailure(breaker: CircuitBreaker): void {
    breaker.failureCount++;
    breaker.successCount = 0;
    breaker.lastFailure = new Date();

    if (breaker.failureCount >= breaker.failureThreshold) {
      breaker.status = 'OPEN';
      breaker.openedAt = new Date();
      breaker.nextRetry = new Date(Date.now() + breaker.timeout);
      this.eventEmitter.emit('circuit.opened', { routeId: breaker.routeId });
    }

    this.circuitBreakers.set(breaker.routeId, breaker);
  }

  private createErrorResponse(
    statusCode: number,
    message: string,
    startTime: number,
    additionalHeaders?: Record<string, string>,
  ): GatewayResponse {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...additionalHeaders,
      },
      body: { error: message, statusCode },
      duration: Date.now() - startTime,
      cached: false,
    };
  }

  private logRequest(
    request: GatewayRequest,
    route: Route,
    statusCode: number,
    duration: number,
    cached: boolean,
    rateLimited: boolean,
    error?: string,
  ): void {
    const log: RequestLog = {
      id: this.generateId('log'),
      requestId: request.id,
      routeId: route.id,
      method: request.method,
      path: request.path,
      statusCode,
      duration,
      ip: request.ip,
      userId: request.userId,
      apiKeyId: request.apiKeyId,
      userAgent: request.headers['user-agent'],
      referer: request.headers['referer'],
      error,
      cached,
      rateLimited,
      timestamp: new Date(),
    };

    this.requestLogs.push(log);

    // Limit stored logs
    while (this.requestLogs.length > 10000) {
      this.requestLogs.shift();
    }

    this.eventEmitter.emit('request.logged', log);
  }

  async createApiKey(
    name: string,
    organizationId: string,
    userId: string,
    options: {
      nameRo?: string;
      permissions?: string[];
      allowedRoutes?: string[];
      allowedIps?: string[];
      expiresAt?: Date;
      rateLimit?: RateLimitConfig;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<ApiKey> {
    const id = this.generateId('key');
    const key = this.generateApiKey();
    const now = new Date();

    const apiKey: ApiKey = {
      id,
      key,
      name,
      nameRo: options.nameRo,
      organizationId,
      userId,
      status: 'ACTIVE',
      permissions: options.permissions || [],
      allowedRoutes: options.allowedRoutes,
      allowedIps: options.allowedIps,
      expiresAt: options.expiresAt,
      rateLimit: options.rateLimit,
      usageCount: 0,
      metadata: options.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.apiKeys.set(id, apiKey);

    this.eventEmitter.emit('apikey.created', { apiKeyId: id, organizationId });

    this.logger.log(`API key created: ${id}`);

    return apiKey;
  }

  async revokeApiKey(apiKeyId: string): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(apiKeyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    apiKey.status = 'REVOKED';
    apiKey.updatedAt = new Date();

    this.apiKeys.set(apiKeyId, apiKey);

    this.eventEmitter.emit('apikey.revoked', { apiKeyId });

    return apiKey;
  }

  async rotateApiKey(apiKeyId: string): Promise<ApiKey> {
    const apiKey = this.apiKeys.get(apiKeyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    apiKey.key = this.generateApiKey();
    apiKey.updatedAt = new Date();

    this.apiKeys.set(apiKeyId, apiKey);

    this.eventEmitter.emit('apikey.rotated', { apiKeyId });

    return apiKey;
  }

  async getApiKey(apiKeyId: string): Promise<ApiKey | undefined> {
    return this.apiKeys.get(apiKeyId);
  }

  async getApiKeysByOrganization(organizationId: string): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter((k) => k.organizationId === organizationId);
  }

  findApiKeyByValue(keyValue: string): ApiKey | undefined {
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.key === keyValue) {
        return apiKey;
      }
    }
    return undefined;
  }

  async getStats(since?: Date): Promise<GatewayStats> {
    let logs = this.requestLogs;
    if (since) {
      logs = logs.filter((l) => l.timestamp >= since);
    }

    const durations = logs.map((l) => l.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    const requestsByRoute: Record<string, number> = {};
    const requestsByMethod: Record<HttpMethod, number> = {} as any;
    const requestsByStatus: Record<number, number> = {};
    const errorCounts: Record<string, number> = {};

    for (const log of logs) {
      requestsByRoute[log.path] = (requestsByRoute[log.path] || 0) + 1;
      requestsByMethod[log.method] = (requestsByMethod[log.method] || 0) + 1;
      requestsByStatus[log.statusCode] = (requestsByStatus[log.statusCode] || 0) + 1;

      if (log.error) {
        errorCounts[log.error] = (errorCounts[log.error] || 0) + 1;
      }
    }

    const requestsByHour = new Array(24).fill(0);
    for (const log of logs) {
      const hour = log.timestamp.getHours();
      requestsByHour[hour]++;
    }

    const topRoutes = Object.entries(requestsByRoute)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const activeApiKeys = Array.from(this.apiKeys.values()).filter((k) => k.status === 'ACTIVE').length;

    return {
      totalRequests: logs.length,
      successfulRequests: logs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length,
      failedRequests: logs.filter((l) => l.statusCode >= 400).length,
      cachedRequests: logs.filter((l) => l.cached).length,
      rateLimitedRequests: logs.filter((l) => l.rateLimited).length,
      averageLatency: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      p95Latency: durations[p95Index] || 0,
      p99Latency: durations[p99Index] || 0,
      requestsByRoute,
      requestsByMethod,
      requestsByStatus,
      requestsByHour,
      activeApiKeys,
      topRoutes,
      topErrors,
    };
  }

  async getRequestLogs(limit: number = 100, offset: number = 0): Promise<RequestLog[]> {
    return this.requestLogs.slice(-limit - offset, -offset || undefined).reverse();
  }

  getCircuitBreaker(routeId: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(routeId);
  }

  getAllCircuitBreakers(): CircuitBreaker[] {
    return Array.from(this.circuitBreakers.values());
  }

  async resetCircuitBreaker(routeId: string): Promise<CircuitBreaker> {
    const breaker = this.circuitBreakers.get(routeId);
    if (!breaker) {
      throw new Error('Circuit breaker not found');
    }

    breaker.status = 'CLOSED';
    breaker.failureCount = 0;
    breaker.successCount = 0;
    breaker.openedAt = undefined;
    breaker.nextRetry = undefined;

    this.circuitBreakers.set(routeId, breaker);

    this.eventEmitter.emit('circuit.reset', { routeId });

    return breaker;
  }

  registerService(name: string, url: string): void {
    this.services.set(name, { url, healthy: true, lastCheck: new Date() });
    this.logger.log(`Service registered: ${name} -> ${url}`);
  }

  unregisterService(name: string): boolean {
    const deleted = this.services.delete(name);
    if (deleted) {
      this.logger.log(`Service unregistered: ${name}`);
    }
    return deleted;
  }

  getService(name: string): { url: string; healthy: boolean; lastCheck: Date } | undefined {
    return this.services.get(name);
  }

  getAllServices(): Map<string, { url: string; healthy: boolean; lastCheck: Date }> {
    return this.services;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateApiKey(): string {
    const bytes = crypto.randomBytes(32);
    return `dk_${bytes.toString('base64url')}`;
  }
}
