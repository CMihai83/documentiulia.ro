import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiGatewayService,
  Route,
  GatewayRequest,
  ApiKey,
  HttpMethod,
} from './api-gateway.service';

describe('ApiGatewayService', () => {
  let service: ApiGatewayService;
  let eventEmitter: EventEmitter2;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiGatewayService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ApiGatewayService>(ApiGatewayService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default routes initialized', async () => {
      const routes = await service.getAllRoutes();
      expect(routes.length).toBeGreaterThan(0);
    });

    it('should have health check route', async () => {
      const route = service.findRouteByPath('/health', ['GET']);
      expect(route).toBeDefined();
      expect(route!.name).toBe('Health Check');
    });
  });

  describe('Route Management', () => {
    const testRoute = {
      name: 'Test Route',
      nameRo: 'Rută de Test',
      description: 'A test route',
      descriptionRo: 'O rută de test',
      path: '/api/test',
      methods: ['GET', 'POST'] as HttpMethod[],
      targetService: 'test-service',
      targetPath: '/test',
      status: 'ACTIVE' as const,
      version: 'v1',
      auth: { type: 'NONE' as const, required: false },
      rateLimit: { enabled: true, strategy: 'FIXED_WINDOW' as const, requests: 100, windowMs: 60000 },
      cache: { enabled: false, strategy: 'NONE' as const, ttl: 0 },
      transform: {},
      validation: { enabled: false },
      middleware: [],
      tags: ['test'],
      metadata: {},
    };

    it('should create route', async () => {
      const route = await service.createRoute(testRoute);

      expect(route.id).toBeDefined();
      expect(route.name).toBe('Test Route');
      expect(route.path).toBe('/api/test');
    });

    it('should create route with Romanian name', async () => {
      const route = await service.createRoute(testRoute);

      expect(route.nameRo).toBe('Rută de Test');
    });

    it('should emit route.created event', async () => {
      await service.createRoute(testRoute);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'route.created',
        expect.objectContaining({ path: '/api/test' }),
      );
    });

    it('should throw error for invalid path', async () => {
      await expect(
        service.createRoute({ ...testRoute, path: 'invalid' }),
      ).rejects.toThrow('Route path must start with /');
    });

    it('should throw error for duplicate path', async () => {
      await service.createRoute(testRoute);

      await expect(
        service.createRoute(testRoute),
      ).rejects.toThrow('Route already exists');
    });

    it('should update route', async () => {
      const route = await service.createRoute(testRoute);
      const updated = await service.updateRoute(route.id, { name: 'Updated Route' });

      expect(updated.name).toBe('Updated Route');
    });

    it('should emit route.updated event', async () => {
      const route = await service.createRoute(testRoute);
      await service.updateRoute(route.id, { name: 'Updated' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'route.updated',
        expect.objectContaining({ routeId: route.id }),
      );
    });

    it('should delete route', async () => {
      const route = await service.createRoute(testRoute);
      await service.deleteRoute(route.id);

      const found = await service.getRoute(route.id);
      expect(found).toBeUndefined();
    });

    it('should emit route.deleted event', async () => {
      const route = await service.createRoute(testRoute);
      await service.deleteRoute(route.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'route.deleted',
        expect.objectContaining({ routeId: route.id }),
      );
    });

    it('should throw error when updating non-existent route', async () => {
      await expect(
        service.updateRoute('non-existent', { name: 'New' }),
      ).rejects.toThrow('Route not found');
    });

    it('should throw error when deleting non-existent route', async () => {
      await expect(
        service.deleteRoute('non-existent'),
      ).rejects.toThrow('Route not found');
    });
  });

  describe('Route Status Management', () => {
    let route: Route;

    beforeEach(async () => {
      route = await service.createRoute({
        name: 'Status Route',
        path: '/api/status-test',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/test',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });
    });

    it('should disable route', async () => {
      const disabled = await service.disableRoute(route.id);

      expect(disabled.status).toBe('DISABLED');
    });

    it('should enable route', async () => {
      await service.disableRoute(route.id);
      const enabled = await service.enableRoute(route.id);

      expect(enabled.status).toBe('ACTIVE');
    });

    it('should deprecate route', async () => {
      const deprecated = await service.deprecateRoute(route.id);

      expect(deprecated.status).toBe('DEPRECATED');
    });
  });

  describe('Route Queries', () => {
    beforeEach(async () => {
      await service.createRoute({
        name: 'Route A',
        path: '/api/a',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/a',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: ['api', 'public'],
        metadata: {},
      });

      await service.createRoute({
        name: 'Route B',
        path: '/api/b',
        methods: ['POST'],
        targetService: 'test',
        targetPath: '/b',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: ['api', 'internal'],
        metadata: {},
      });
    });

    it('should get all routes', async () => {
      const routes = await service.getAllRoutes();

      expect(routes.length).toBeGreaterThanOrEqual(2);
    });

    it('should exclude disabled routes by default', async () => {
      const route = service.findRouteByPath('/api/a', ['GET']);
      await service.disableRoute(route!.id);

      const routes = await service.getAllRoutes(false);

      expect(routes.find((r) => r.path === '/api/a')).toBeUndefined();
    });

    it('should include disabled routes when requested', async () => {
      const route = service.findRouteByPath('/api/a', ['GET']);
      await service.disableRoute(route!.id);

      const routes = await service.getAllRoutes(true);

      expect(routes.find((r) => r.path === '/api/a')).toBeDefined();
    });

    it('should get routes by tag', async () => {
      const routes = await service.getRoutesByTag('internal');

      expect(routes.length).toBe(1);
      expect(routes[0].tags).toContain('internal');
    });

    it('should find route by path', () => {
      const route = service.findRouteByPath('/api/a', ['GET']);

      expect(route).toBeDefined();
      expect(route!.name).toBe('Route A');
    });

    it('should not find route for wrong method', () => {
      const route = service.findRouteByPath('/api/a', ['POST']);

      expect(route).toBeUndefined();
    });
  });

  describe('Request Handling', () => {
    let testRoute: Route;

    beforeEach(async () => {
      testRoute = await service.createRoute({
        name: 'Handler Test',
        path: '/api/handler',
        methods: ['GET', 'POST'],
        targetService: 'test',
        targetPath: '/handler',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });
    });

    it('should handle valid request', async () => {
      const request: GatewayRequest = {
        id: 'req-1',
        method: 'GET',
        path: '/api/handler',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(200);
      expect(response.fromService).toBe('test');
    });

    it('should return 404 for unknown route', async () => {
      const request: GatewayRequest = {
        id: 'req-2',
        method: 'GET',
        path: '/api/unknown',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(404);
    });

    it('should return 503 for disabled route', async () => {
      await service.disableRoute(testRoute.id);

      const request: GatewayRequest = {
        id: 'req-3',
        method: 'GET',
        path: '/api/handler',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(503);
    });

    it('should return 503 for route under maintenance', async () => {
      await service.updateRoute(testRoute.id, { status: 'MAINTENANCE' });

      const request: GatewayRequest = {
        id: 'req-4',
        method: 'GET',
        path: '/api/handler',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(503);
    });

    it('should include duration in response', async () => {
      const request: GatewayRequest = {
        id: 'req-5',
        method: 'GET',
        path: '/api/handler',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.duration).toBeDefined();
      expect(response.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Authentication', () => {
    it('should reject request without required API key', async () => {
      await service.createRoute({
        name: 'Auth Route',
        path: '/api/auth-test',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/auth',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'API_KEY', required: true },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });

      const request: GatewayRequest = {
        id: 'req-auth-1',
        method: 'GET',
        path: '/api/auth-test',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(401);
    });

    it('should accept request with valid API key', async () => {
      const apiKey = await service.createApiKey('Test Key', mockOrgId, mockUserId);

      await service.createRoute({
        name: 'API Key Route',
        path: '/api/apikey-test',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/apikey',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'API_KEY', required: true },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });

      const request: GatewayRequest = {
        id: 'req-auth-2',
        method: 'GET',
        path: '/api/apikey-test',
        headers: { 'x-api-key': apiKey.key },
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(200);
    });

    it('should reject request with invalid API key', async () => {
      await service.createRoute({
        name: 'Invalid Key Route',
        path: '/api/invalid-key',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/invalid',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'API_KEY', required: true },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });

      const request: GatewayRequest = {
        id: 'req-auth-3',
        method: 'GET',
        path: '/api/invalid-key',
        headers: { 'x-api-key': 'invalid-key' },
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with revoked API key', async () => {
      const apiKey = await service.createApiKey('Revoked Key', mockOrgId, mockUserId);
      await service.revokeApiKey(apiKey.id);

      await service.createRoute({
        name: 'Revoked Key Route',
        path: '/api/revoked-key',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/revoked',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'API_KEY', required: true },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });

      const request: GatewayRequest = {
        id: 'req-auth-4',
        method: 'GET',
        path: '/api/revoked-key',
        headers: { 'x-api-key': apiKey.key },
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(401);
    });

    it('should require JWT token when auth type is JWT', async () => {
      await service.createRoute({
        name: 'JWT Route',
        path: '/api/jwt-test',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/jwt',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'JWT', required: true },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });

      const request: GatewayRequest = {
        id: 'req-jwt-1',
        method: 'GET',
        path: '/api/jwt-test',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(401);
    });

    it('should accept valid JWT token', async () => {
      await service.createRoute({
        name: 'JWT Valid Route',
        path: '/api/jwt-valid',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/jwt-valid',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'JWT', required: true },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });

      const request: GatewayRequest = {
        id: 'req-jwt-2',
        method: 'GET',
        path: '/api/jwt-valid',
        headers: { authorization: 'Bearer valid.jwt.token.here' },
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await service.createRoute({
        name: 'Rate Limited Route',
        path: '/api/rate-limited',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/rate',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: true, strategy: 'FIXED_WINDOW', requests: 3, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });
    });

    it('should allow requests within rate limit', async () => {
      for (let i = 0; i < 3; i++) {
        const request: GatewayRequest = {
          id: `rate-req-${i}`,
          method: 'GET',
          path: '/api/rate-limited',
          headers: {},
          query: {},
          ip: '127.0.0.1',
          timestamp: new Date(),
        };

        const response = await service.handleRequest(request);
        expect(response.statusCode).toBe(200);
      }
    });

    it('should block requests exceeding rate limit', async () => {
      for (let i = 0; i < 3; i++) {
        const request: GatewayRequest = {
          id: `over-rate-${i}`,
          method: 'GET',
          path: '/api/rate-limited',
          headers: {},
          query: {},
          ip: '192.168.1.1',
          timestamp: new Date(),
        };
        await service.handleRequest(request);
      }

      const request: GatewayRequest = {
        id: 'over-rate-4',
        method: 'GET',
        path: '/api/rate-limited',
        headers: {},
        query: {},
        ip: '192.168.1.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(429);
      expect(response.headers['Retry-After']).toBeDefined();
    });

    it('should apply rate limit per IP', async () => {
      // Use all rate limit for IP1
      for (let i = 0; i < 3; i++) {
        const request: GatewayRequest = {
          id: `ip1-${i}`,
          method: 'GET',
          path: '/api/rate-limited',
          headers: {},
          query: {},
          ip: '10.0.0.1',
          timestamp: new Date(),
        };
        await service.handleRequest(request);
      }

      // IP2 should still work
      const request: GatewayRequest = {
        id: 'ip2-1',
        method: 'GET',
        path: '/api/rate-limited',
        headers: {},
        query: {},
        ip: '10.0.0.2',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      await service.createRoute({
        name: 'Cached Route',
        path: '/api/cached',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/cached',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: true, strategy: 'PUBLIC', ttl: 60000 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });
    });

    it('should return cached response on second request', async () => {
      const request: GatewayRequest = {
        id: 'cache-1',
        method: 'GET',
        path: '/api/cached',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      // First request - not cached
      const response1 = await service.handleRequest(request);
      expect(response1.cached).toBe(false);

      // Second request - should be cached
      const response2 = await service.handleRequest({ ...request, id: 'cache-2' });
      expect(response2.cached).toBe(true);
      expect(response2.headers['X-Cache']).toBe('HIT');
    });

    it('should invalidate cache', async () => {
      const request: GatewayRequest = {
        id: 'cache-inv-1',
        method: 'GET',
        path: '/api/cached',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      await service.handleRequest(request);
      const invalidated = service.invalidateCache('/api/cached');

      expect(invalidated).toBeGreaterThan(0);

      const response = await service.handleRequest({ ...request, id: 'cache-inv-2' });
      expect(response.cached).toBe(false);
    });

    it('should invalidate all cache', async () => {
      const request: GatewayRequest = {
        id: 'cache-all-1',
        method: 'GET',
        path: '/api/cached',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      await service.handleRequest(request);
      const invalidated = service.invalidateCache();

      expect(invalidated).toBeGreaterThan(0);
    });
  });

  describe('Request Validation', () => {
    beforeEach(async () => {
      await service.createRoute({
        name: 'Validated Route',
        path: '/api/validated',
        methods: ['POST'],
        targetService: 'test',
        targetPath: '/validated',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: {
          enabled: true,
          requiredHeaders: ['Content-Type'],
          requiredParams: ['id'],
          maxBodySize: 1000,
        },
        middleware: [],
        tags: [],
        metadata: {},
      });
    });

    it('should reject request missing required header', async () => {
      const request: GatewayRequest = {
        id: 'val-1',
        method: 'POST',
        path: '/api/validated',
        headers: {},
        query: { id: '123' },
        body: { data: 'test' },
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Content-Type');
    });

    it('should reject request missing required param', async () => {
      const request: GatewayRequest = {
        id: 'val-2',
        method: 'POST',
        path: '/api/validated',
        headers: { 'content-type': 'application/json' },
        query: {},
        body: { data: 'test' },
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('id');
    });

    it('should reject request with body too large', async () => {
      const request: GatewayRequest = {
        id: 'val-3',
        method: 'POST',
        path: '/api/validated',
        headers: { 'content-type': 'application/json' },
        query: { id: '123' },
        body: { data: 'x'.repeat(2000) },
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('too large');
    });

    it('should accept valid request', async () => {
      const request: GatewayRequest = {
        id: 'val-4',
        method: 'POST',
        path: '/api/validated',
        headers: { 'content-type': 'application/json' },
        query: { id: '123' },
        body: { data: 'test' },
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.handleRequest(request);

      expect(response.statusCode).toBe(200);
    });
  });

  describe('API Key Management', () => {
    it('should create API key', async () => {
      const apiKey = await service.createApiKey('Test Key', mockOrgId, mockUserId);

      expect(apiKey.id).toBeDefined();
      expect(apiKey.key).toBeDefined();
      expect(apiKey.key).toMatch(/^dk_/);
      expect(apiKey.status).toBe('ACTIVE');
    });

    it('should create API key with Romanian name', async () => {
      const apiKey = await service.createApiKey('Test Key', mockOrgId, mockUserId, {
        nameRo: 'Cheie de Test',
      });

      expect(apiKey.nameRo).toBe('Cheie de Test');
    });

    it('should emit apikey.created event', async () => {
      await service.createApiKey('Event Key', mockOrgId, mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'apikey.created',
        expect.objectContaining({ organizationId: mockOrgId }),
      );
    });

    it('should revoke API key', async () => {
      const apiKey = await service.createApiKey('Revoke Key', mockOrgId, mockUserId);
      const revoked = await service.revokeApiKey(apiKey.id);

      expect(revoked.status).toBe('REVOKED');
    });

    it('should emit apikey.revoked event', async () => {
      const apiKey = await service.createApiKey('Revoke Event', mockOrgId, mockUserId);
      await service.revokeApiKey(apiKey.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'apikey.revoked',
        expect.objectContaining({ apiKeyId: apiKey.id }),
      );
    });

    it('should rotate API key', async () => {
      const apiKey = await service.createApiKey('Rotate Key', mockOrgId, mockUserId);
      const originalKey = apiKey.key;

      const rotated = await service.rotateApiKey(apiKey.id);

      expect(rotated.key).not.toBe(originalKey);
    });

    it('should emit apikey.rotated event', async () => {
      const apiKey = await service.createApiKey('Rotate Event', mockOrgId, mockUserId);
      await service.rotateApiKey(apiKey.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'apikey.rotated',
        expect.objectContaining({ apiKeyId: apiKey.id }),
      );
    });

    it('should get API keys by organization', async () => {
      await service.createApiKey('Org Key 1', mockOrgId, mockUserId);
      await service.createApiKey('Org Key 2', mockOrgId, mockUserId);
      await service.createApiKey('Other Org Key', 'other-org', mockUserId);

      const keys = await service.getApiKeysByOrganization(mockOrgId);

      expect(keys.length).toBe(2);
      expect(keys.every((k) => k.organizationId === mockOrgId)).toBe(true);
    });

    it('should find API key by value', async () => {
      const apiKey = await service.createApiKey('Find Key', mockOrgId, mockUserId);

      const found = service.findApiKeyByValue(apiKey.key);

      expect(found).toBeDefined();
      expect(found!.id).toBe(apiKey.id);
    });

    it('should throw error when revoking non-existent key', async () => {
      await expect(service.revokeApiKey('non-existent')).rejects.toThrow('API key not found');
    });
  });

  describe('Circuit Breaker', () => {
    let route: Route;

    beforeEach(async () => {
      route = await service.createRoute({
        name: 'Circuit Route',
        path: '/api/circuit',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/circuit',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });
    });

    it('should initialize circuit breaker for new route', () => {
      const breaker = service.getCircuitBreaker(route.id);

      expect(breaker).toBeDefined();
      expect(breaker!.status).toBe('CLOSED');
    });

    it('should get all circuit breakers', () => {
      const breakers = service.getAllCircuitBreakers();

      expect(breakers.length).toBeGreaterThan(0);
    });

    it('should reset circuit breaker', async () => {
      const breaker = service.getCircuitBreaker(route.id);
      breaker!.status = 'OPEN';
      breaker!.failureCount = 5;

      const reset = await service.resetCircuitBreaker(route.id);

      expect(reset.status).toBe('CLOSED');
      expect(reset.failureCount).toBe(0);
    });

    it('should emit circuit.reset event', async () => {
      await service.resetCircuitBreaker(route.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'circuit.reset',
        expect.objectContaining({ routeId: route.id }),
      );
    });

    it('should throw error when resetting non-existent breaker', async () => {
      await expect(service.resetCircuitBreaker('non-existent')).rejects.toThrow('Circuit breaker not found');
    });
  });

  describe('Service Registration', () => {
    it('should register service', () => {
      service.registerService('test-service', 'http://localhost:3001');

      const svc = service.getService('test-service');

      expect(svc).toBeDefined();
      expect(svc!.url).toBe('http://localhost:3001');
      expect(svc!.healthy).toBe(true);
    });

    it('should unregister service', () => {
      service.registerService('temp-service', 'http://localhost:3002');
      const result = service.unregisterService('temp-service');

      expect(result).toBe(true);
      expect(service.getService('temp-service')).toBeUndefined();
    });

    it('should get all services', () => {
      service.registerService('svc-1', 'http://localhost:3001');
      service.registerService('svc-2', 'http://localhost:3002');

      const services = service.getAllServices();

      expect(services.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      const route = await service.createRoute({
        name: 'Stats Route',
        path: '/api/stats-test',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/stats',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });

      // Make some requests
      for (let i = 0; i < 5; i++) {
        const request: GatewayRequest = {
          id: `stats-req-${i}`,
          method: 'GET',
          path: '/api/stats-test',
          headers: {},
          query: {},
          ip: '127.0.0.1',
          timestamp: new Date(),
        };
        await service.handleRequest(request);
      }
    });

    it('should get stats', async () => {
      const stats = await service.getStats();

      expect(stats.totalRequests).toBeGreaterThan(0);
    });

    it('should count successful requests', async () => {
      const stats = await service.getStats();

      expect(stats.successfulRequests).toBeGreaterThan(0);
    });

    it('should calculate average latency', async () => {
      const stats = await service.getStats();

      expect(stats.averageLatency).toBeGreaterThanOrEqual(0);
    });

    it('should track requests by method', async () => {
      const stats = await service.getStats();

      expect(stats.requestsByMethod.GET).toBeGreaterThan(0);
    });

    it('should track requests by route', async () => {
      const stats = await service.getStats();

      expect(Object.keys(stats.requestsByRoute).length).toBeGreaterThan(0);
    });

    it('should return top routes', async () => {
      const stats = await service.getStats();

      expect(stats.topRoutes.length).toBeGreaterThan(0);
    });

    it('should count active API keys', async () => {
      await service.createApiKey('Stats Key', mockOrgId, mockUserId);

      const stats = await service.getStats();

      expect(stats.activeApiKeys).toBeGreaterThan(0);
    });
  });

  describe('Request Logs', () => {
    beforeEach(async () => {
      await service.createRoute({
        name: 'Log Route',
        path: '/api/log-test',
        methods: ['GET'],
        targetService: 'test',
        targetPath: '/log',
        status: 'ACTIVE',
        version: 'v1',
        auth: { type: 'NONE', required: false },
        rateLimit: { enabled: false, strategy: 'FIXED_WINDOW', requests: 100, windowMs: 60000 },
        cache: { enabled: false, strategy: 'NONE', ttl: 0 },
        transform: {},
        validation: { enabled: false },
        middleware: [],
        tags: [],
        metadata: {},
      });

      const request: GatewayRequest = {
        id: 'log-req',
        method: 'GET',
        path: '/api/log-test',
        headers: { 'user-agent': 'Test Agent' },
        query: {},
        ip: '127.0.0.1',
        timestamp: new Date(),
      };

      await service.handleRequest(request);
    });

    it('should get request logs', async () => {
      const logs = await service.getRequestLogs();

      expect(logs.length).toBeGreaterThan(0);
    });

    it('should limit request logs', async () => {
      const logs = await service.getRequestLogs(1);

      expect(logs.length).toBe(1);
    });

    it('should emit request.logged event', async () => {
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'request.logged',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });
});
