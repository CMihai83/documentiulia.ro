import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MicroservicesService,
  ServiceInstance,
  ServiceRoute,
  GatewayRequest,
} from './microservices.service';

describe('MicroservicesService', () => {
  let service: MicroservicesService;
  let eventEmitter: EventEmitter2;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  beforeEach(async () => {
    eventEmitter = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicroservicesService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<MicroservicesService>(MicroservicesService);
    await service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('Service Registry', () => {
    const testService: Omit<ServiceInstance, 'registeredAt' | 'lastHeartbeat' | 'metrics'> = {
      id: 'test-service-1',
      name: 'test-service',
      version: '1.0.0',
      host: 'localhost',
      port: 4000,
      protocol: 'http',
      status: 'healthy',
      metadata: {
        region: 'eu-west',
        zone: 'romania',
        environment: 'test',
        weight: 1,
      },
      healthCheck: {
        endpoint: '/health',
        interval: 10000,
        timeout: 5000,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
      },
    };

    it('should register a new service', () => {
      const registered = service.registerService(testService);

      expect(registered).toBeDefined();
      expect(registered.id).toBe(testService.id);
      expect(registered.name).toBe(testService.name);
      expect(registered.registeredAt).toBeDefined();
      expect(registered.lastHeartbeat).toBeDefined();
      expect(registered.metrics).toBeDefined();
    });

    it('should get service by name', () => {
      service.registerService(testService);
      const instances = service.getService(testService.name);

      expect(instances).toBeDefined();
      expect(instances!.length).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent service', () => {
      const instances = service.getService('non-existent');
      expect(instances).toBeUndefined();
    });

    it('should get all services', () => {
      service.registerService(testService);
      const allServices = service.getAllServices();

      expect(allServices).toBeDefined();
      expect(allServices.size).toBeGreaterThan(0);
    });

    it('should get healthy instances only', () => {
      service.registerService(testService);
      service.registerService({ ...testService, id: 'test-service-2', status: 'unhealthy' });

      const healthy = service.getHealthyInstances(testService.name);
      expect(healthy.every(i => i.status === 'healthy')).toBe(true);
    });

    it('should deregister a service', () => {
      service.registerService(testService);
      const result = service.deregisterService(testService.name, testService.id);

      expect(result).toBe(true);
    });

    it('should return false when deregistering non-existent service', () => {
      const result = service.deregisterService('non-existent', 'fake-id');
      expect(result).toBe(false);
    });

    it('should update service status', () => {
      service.registerService(testService);
      const result = service.updateServiceStatus(testService.name, testService.id, 'unhealthy');

      expect(result).toBe(true);
      const instances = service.getService(testService.name);
      const instance = instances?.find(i => i.id === testService.id);
      expect(instance?.status).toBe('unhealthy');
    });

    it('should process heartbeat', () => {
      service.registerService(testService);
      const result = service.heartbeat(testService.name, testService.id);

      expect(result).toBe(true);
    });

    it('should return false for heartbeat on non-existent service', () => {
      const result = service.heartbeat('non-existent', 'fake-id');
      expect(result).toBe(false);
    });

    it('should update existing service on re-registration', () => {
      service.registerService(testService);
      const updated = service.registerService({ ...testService, version: '2.0.0' });

      expect(updated.version).toBe('2.0.0');
      const instances = service.getService(testService.name);
      expect(instances?.filter(i => i.id === testService.id).length).toBe(1);
    });

    it('should emit event on service registration', () => {
      const eventSpy = jest.spyOn(eventEmitter, 'emit');
      service.registerService(testService);

      expect(eventSpy).toHaveBeenCalledWith('service.registered', expect.any(Object));
    });

    it('should emit event on service deregistration', () => {
      service.registerService(testService);
      const eventSpy = jest.spyOn(eventEmitter, 'emit');
      service.deregisterService(testService.name, testService.id);

      expect(eventSpy).toHaveBeenCalledWith('service.deregistered', expect.any(Object));
    });
  });

  describe('API Gateway / Routing', () => {
    const testRoute: ServiceRoute = {
      path: '/api/test/*',
      method: 'ALL',
      serviceName: 'test-service',
      stripPrefix: false,
      authentication: true,
    };

    it('should register a route', () => {
      service.registerRoute(testRoute);
      const routes = service.getAllRoutes();

      expect(routes.some(r => r.path === testRoute.path)).toBe(true);
    });

    it('should get route by method and path', () => {
      service.registerRoute(testRoute);
      const route = service.getRoute('GET', '/api/test/something');

      expect(route).toBeDefined();
      expect(route?.serviceName).toBe(testRoute.serviceName);
    });

    it('should return undefined for non-existent route', () => {
      const route = service.getRoute('GET', '/non-existent');
      expect(route).toBeUndefined();
    });

    it('should remove a route', () => {
      service.registerRoute(testRoute);
      const removed = service.removeRoute(testRoute.method, testRoute.path);

      expect(removed).toBe(true);
    });

    it('should return false when removing non-existent route', () => {
      const removed = service.removeRoute('GET', '/non-existent');
      expect(removed).toBe(false);
    });

    it('should get all routes', () => {
      service.registerRoute(testRoute);
      const routes = service.getAllRoutes();

      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThan(0);
    });

    it('should route request to correct service', async () => {
      service.registerService({
        id: 'test-svc-1',
        name: 'test-service',
        version: '1.0.0',
        host: 'localhost',
        port: 4000,
        protocol: 'http',
        status: 'healthy',
        metadata: {},
        healthCheck: {
          endpoint: '/health',
          interval: 10000,
          timeout: 5000,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
        },
      });
      service.registerRoute(testRoute);

      const request: GatewayRequest = {
        id: 'req-1',
        method: 'GET',
        path: '/api/test/resource',
        headers: {},
        query: {},
        clientIp: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.routeRequest(request);
      expect(response.statusCode).toBe(200);
      expect(response.serviceName).toBe('test-service');
    });

    it('should return 404 for unknown route', async () => {
      const request: GatewayRequest = {
        id: 'req-1',
        method: 'GET',
        path: '/unknown/path',
        headers: {},
        query: {},
        clientIp: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.routeRequest(request);
      expect(response.statusCode).toBe(404);
    });

    it('should return 503 when no healthy instances', async () => {
      service.registerService({
        id: 'unhealthy-1',
        name: 'unhealthy-service',
        version: '1.0.0',
        host: 'localhost',
        port: 4000,
        protocol: 'http',
        status: 'unhealthy',
        metadata: {},
        healthCheck: {
          endpoint: '/health',
          interval: 10000,
          timeout: 5000,
          consecutiveFailures: 5,
          consecutiveSuccesses: 0,
        },
      });
      service.registerRoute({
        path: '/api/unhealthy/*',
        method: 'ALL',
        serviceName: 'unhealthy-service',
      });

      const request: GatewayRequest = {
        id: 'req-1',
        method: 'GET',
        path: '/api/unhealthy/test',
        headers: {},
        query: {},
        clientIp: '127.0.0.1',
        timestamp: new Date(),
      };

      const response = await service.routeRequest(request);
      expect(response.statusCode).toBe(503);
    });
  });

  describe('Load Balancing', () => {
    beforeEach(() => {
      // Register multiple instances
      for (let i = 1; i <= 3; i++) {
        service.registerService({
          id: `lb-service-${i}`,
          name: 'lb-service',
          version: '1.0.0',
          host: 'localhost',
          port: 4000 + i,
          protocol: 'http',
          status: 'healthy',
          metadata: { weight: i },
          healthCheck: {
            endpoint: '/health',
            interval: 10000,
            timeout: 5000,
            consecutiveFailures: 0,
            consecutiveSuccesses: 0,
          },
        });
      }
    });

    it('should select instance using round-robin by default', () => {
      const instances: string[] = [];
      for (let i = 0; i < 6; i++) {
        const instance = service.selectInstance('lb-service');
        instances.push(instance!.id);
      }

      // Round-robin should cycle through instances
      expect(instances[0]).toBe(instances[3]);
      expect(instances[1]).toBe(instances[4]);
      expect(instances[2]).toBe(instances[5]);
    });

    it('should change load balancer strategy', () => {
      service.setLoadBalancerStrategy('random');
      const config = service.getLoadBalancerConfig();

      expect(config.strategy).toBe('random');
    });

    it('should get load balancer config', () => {
      const config = service.getLoadBalancerConfig();

      expect(config).toBeDefined();
      expect(config.strategy).toBeDefined();
      expect(config.healthCheckInterval).toBeDefined();
    });

    it('should return undefined when selecting from non-existent service', () => {
      const instance = service.selectInstance('non-existent');
      expect(instance).toBeUndefined();
    });

    it('should use weighted selection when configured', () => {
      service.setLoadBalancerStrategy('weighted');

      // With weighted selection, higher weight instances should be selected more often
      const counts = new Map<string, number>();
      for (let i = 0; i < 100; i++) {
        const instance = service.selectInstance('lb-service');
        const count = counts.get(instance!.id) || 0;
        counts.set(instance!.id, count + 1);
      }

      // Instance with weight 3 should be selected more than instance with weight 1
      expect(counts.get('lb-service-3')).toBeGreaterThan(counts.get('lb-service-1') || 0);
    });

    it('should use random selection when configured', () => {
      service.setLoadBalancerStrategy('random');

      const instances: string[] = [];
      for (let i = 0; i < 10; i++) {
        const instance = service.selectInstance('lb-service');
        instances.push(instance!.id);
      }

      // Random selection should not always produce the same sequence
      const allSame = instances.every(id => id === instances[0]);
      expect(allSame).toBe(false);
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      service.registerService({
        id: 'cb-service-1',
        name: 'cb-service',
        version: '1.0.0',
        host: 'localhost',
        port: 4000,
        protocol: 'http',
        status: 'healthy',
        metadata: {},
        healthCheck: {
          endpoint: '/health',
          interval: 10000,
          timeout: 5000,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
        },
      });
    });

    it('should initialize circuit breaker for new service', () => {
      const state = service.getCircuitBreakerState('cb-service');

      expect(state).toBeDefined();
      expect(state?.state).toBe('closed');
    });

    it('should get all circuit breaker states', () => {
      const states = service.getAllCircuitBreakerStates();

      expect(Array.isArray(states)).toBe(true);
      expect(states.length).toBeGreaterThan(0);
    });

    it('should reset circuit breaker', () => {
      const result = service.resetCircuitBreaker('cb-service');
      expect(result).toBe(true);

      const state = service.getCircuitBreakerState('cb-service');
      expect(state?.state).toBe('closed');
      expect(state?.failureCount).toBe(0);
    });

    it('should return false when resetting non-existent circuit breaker', () => {
      const result = service.resetCircuitBreaker('non-existent');
      expect(result).toBe(false);
    });

    it('should configure circuit breaker', () => {
      const result = service.configureCircuitBreaker('cb-service', {
        failureThreshold: 10,
        timeout: 60000,
      });

      expect(result).toBe(true);

      const state = service.getCircuitBreakerState('cb-service');
      expect(state?.config.failureThreshold).toBe(10);
      expect(state?.config.timeout).toBe(60000);
    });

    it('should return false when configuring non-existent circuit breaker', () => {
      const result = service.configureCircuitBreaker('non-existent', {});
      expect(result).toBe(false);
    });

    it('should return undefined for non-existent circuit breaker state', () => {
      const state = service.getCircuitBreakerState('non-existent');
      expect(state).toBeUndefined();
    });
  });

  describe('Distributed Tracing', () => {
    it('should start a new trace', () => {
      const trace = service.startTrace('test-operation', 'test-service');

      expect(trace).toBeDefined();
      expect(trace.traceId).toBeDefined();
      expect(trace.spanId).toBeDefined();
      expect(trace.operationName).toBe('test-operation');
      expect(trace.serviceName).toBe('test-service');
      expect(trace.status).toBe('started');
    });

    it('should add span to trace', () => {
      const trace = service.startTrace('parent-operation', 'service-a');
      const span = service.addSpan(trace.traceId, 'child-operation', 'service-b');

      expect(span).toBeDefined();
      expect(span?.traceId).toBe(trace.traceId);
      expect(span?.parentSpanId).toBe(trace.spanId);
    });

    it('should return undefined when adding span to non-existent trace', () => {
      const span = service.addSpan('non-existent', 'operation', 'service');
      expect(span).toBeUndefined();
    });

    it('should end trace', () => {
      const trace = service.startTrace('test-operation', 'test-service');
      const result = service.endTrace(trace.traceId, 'completed');

      expect(result).toBe(true);

      const ended = service.getTrace(trace.traceId);
      expect(ended?.status).toBe('completed');
      expect(ended?.endTime).toBeDefined();
      expect(ended?.duration).toBeDefined();
    });

    it('should return false when ending non-existent trace', () => {
      const result = service.endTrace('non-existent', 'completed');
      expect(result).toBe(false);
    });

    it('should end span', () => {
      const trace = service.startTrace('parent', 'service');
      const span = service.addSpan(trace.traceId, 'child', 'service');
      const result = service.endSpan(span!.spanId, 'completed');

      expect(result).toBe(true);
    });

    it('should return false when ending non-existent span', () => {
      const result = service.endSpan('non-existent', 'completed');
      expect(result).toBe(false);
    });

    it('should add tag to trace', () => {
      const trace = service.startTrace('test-operation', 'test-service');
      const result = service.addTraceTag(trace.traceId, 'user', 'test-user');

      expect(result).toBe(true);

      const updated = service.getTrace(trace.traceId);
      expect(updated?.tags['user']).toBe('test-user');
    });

    it('should return false when adding tag to non-existent trace', () => {
      const result = service.addTraceTag('non-existent', 'key', 'value');
      expect(result).toBe(false);
    });

    it('should add log to trace', () => {
      const trace = service.startTrace('test-operation', 'test-service');
      const result = service.addTraceLog(trace.traceId, 'Test log message', 'info');

      expect(result).toBe(true);

      const updated = service.getTrace(trace.traceId);
      expect(updated?.logs.length).toBeGreaterThan(0);
      expect(updated?.logs[0].message).toBe('Test log message');
    });

    it('should return false when adding log to non-existent trace', () => {
      const result = service.addTraceLog('non-existent', 'message');
      expect(result).toBe(false);
    });

    it('should set baggage', () => {
      const trace = service.startTrace('test-operation', 'test-service');
      const result = service.setBaggage(trace.traceId, 'tenant', 'tenant-1');

      expect(result).toBe(true);

      const updated = service.getTrace(trace.traceId);
      expect(updated?.baggage['tenant']).toBe('tenant-1');
    });

    it('should return false when setting baggage on non-existent trace', () => {
      const result = service.setBaggage('non-existent', 'key', 'value');
      expect(result).toBe(false);
    });

    it('should get trace by id', () => {
      const trace = service.startTrace('test-operation', 'test-service');
      const retrieved = service.getTrace(trace.traceId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.traceId).toBe(trace.traceId);
    });

    it('should return undefined for non-existent trace', () => {
      const trace = service.getTrace('non-existent');
      expect(trace).toBeUndefined();
    });

    it('should get span by id', () => {
      const trace = service.startTrace('test-operation', 'test-service');
      const span = service.getSpan(trace.spanId);

      expect(span).toBeDefined();
      expect(span?.spanId).toBe(trace.spanId);
    });

    it('should get traces by service', () => {
      service.startTrace('op-1', 'service-x');
      service.startTrace('op-2', 'service-x');
      service.startTrace('op-3', 'service-y');

      const traces = service.getTracesByService('service-x');
      expect(traces.length).toBe(2);
      expect(traces.every(t => t.serviceName === 'service-x')).toBe(true);
    });

    it('should get recent traces with limit', () => {
      for (let i = 0; i < 10; i++) {
        service.startTrace(`op-${i}`, 'test-service');
      }

      const recent = service.getRecentTraces(5);
      expect(recent.length).toBe(5);
    });
  });

  describe('Event Bus', () => {
    it('should publish event and return id', async () => {
      const eventId = await service.publishEvent({
        type: 'test.event',
        source: 'test-service',
        data: { message: 'hello' },
        metadata: {
          version: '1.0',
          contentType: 'application/json',
          encoding: 'utf-8',
        },
        routing: {},
      });

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should subscribe to events and receive them', async () => {
      const received: any[] = [];
      const handler = async (event: any) => {
        received.push(event);
      };

      service.subscribe('test.event', handler);

      await service.publishEvent({
        type: 'test.event',
        source: 'test-service',
        data: { value: 123 },
        metadata: {
          version: '1.0',
          contentType: 'application/json',
          encoding: 'utf-8',
        },
        routing: {},
      });

      expect(received.length).toBe(1);
      expect(received[0].data.value).toBe(123);
    });

    it('should unsubscribe from events', async () => {
      const received: any[] = [];
      const handler = async (event: any) => {
        received.push(event);
      };

      const unsubscribe = service.subscribe('test.event', handler);
      unsubscribe();

      await service.publishEvent({
        type: 'test.event',
        source: 'test-service',
        data: {},
        metadata: {
          version: '1.0',
          contentType: 'application/json',
          encoding: 'utf-8',
        },
        routing: {},
      });

      expect(received.length).toBe(0);
    });

    it('should get event history', async () => {
      await service.publishEvent({
        type: 'history.test',
        source: 'test',
        data: {},
        metadata: { version: '1.0', contentType: 'application/json', encoding: 'utf-8' },
        routing: {},
      });

      const history = service.getEventHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter event history by type', async () => {
      await service.publishEvent({
        type: 'type.a',
        source: 'test',
        data: {},
        metadata: { version: '1.0', contentType: 'application/json', encoding: 'utf-8' },
        routing: {},
      });
      await service.publishEvent({
        type: 'type.b',
        source: 'test',
        data: {},
        metadata: { version: '1.0', contentType: 'application/json', encoding: 'utf-8' },
        routing: {},
      });

      const filtered = service.getEventHistory('type.a');
      expect(filtered.every(e => e.type === 'type.a')).toBe(true);
    });

    it('should add failed events to dead letter queue', async () => {
      const failingHandler = async () => {
        throw new Error('Handler failed');
      };

      service.subscribe('fail.event', failingHandler);

      await service.publishEvent({
        type: 'fail.event',
        source: 'test',
        data: {},
        metadata: { version: '1.0', contentType: 'application/json', encoding: 'utf-8' },
        routing: {},
      });

      const dlq = service.getDeadLetterQueue();
      expect(dlq.length).toBeGreaterThan(0);
    });

    it('should retry dead letter event', async () => {
      const failingHandler = async () => {
        throw new Error('Handler failed');
      };

      service.subscribe('retry.event', failingHandler);

      await service.publishEvent({
        type: 'retry.event',
        source: 'test',
        data: {},
        metadata: { version: '1.0', contentType: 'application/json', encoding: 'utf-8' },
        routing: {},
      });

      const dlq = service.getDeadLetterQueue();
      const eventId = dlq[0]?.id;

      if (eventId) {
        const result = service.retryDeadLetterEvent(eventId);
        expect(result).toBe(true);
      }
    });

    it('should return false when retrying non-existent dead letter event', () => {
      const result = service.retryDeadLetterEvent('non-existent');
      expect(result).toBe(false);
    });

    it('should clear dead letter queue', async () => {
      const failingHandler = async () => {
        throw new Error('Handler failed');
      };

      service.subscribe('clear.event', failingHandler);

      await service.publishEvent({
        type: 'clear.event',
        source: 'test',
        data: {},
        metadata: { version: '1.0', contentType: 'application/json', encoding: 'utf-8' },
        routing: {},
      });

      const cleared = service.clearDeadLetterQueue();
      expect(cleared).toBeGreaterThan(0);

      const dlq = service.getDeadLetterQueue();
      expect(dlq.length).toBe(0);
    });

    it('should support wildcard subscription', async () => {
      const received: any[] = [];
      service.subscribe('*', async (event) => {
        received.push(event);
      });

      await service.publishEvent({
        type: 'any.event',
        source: 'test',
        data: {},
        metadata: { version: '1.0', contentType: 'application/json', encoding: 'utf-8' },
        routing: {},
      });

      expect(received.length).toBeGreaterThan(0);
    });
  });

  describe('Health Checks', () => {
    beforeEach(() => {
      service.registerService({
        id: 'health-service-1',
        name: 'health-service',
        version: '1.0.0',
        host: 'localhost',
        port: 4000,
        protocol: 'http',
        status: 'healthy',
        metadata: {},
        healthCheck: {
          endpoint: '/health',
          interval: 10000,
          timeout: 5000,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
        },
      });
    });

    it('should check service health', async () => {
      const report = await service.checkServiceHealth('health-service', 'health-service-1');

      expect(report).toBeDefined();
      expect(report.serviceName).toBe('health-service');
      expect(report.instanceId).toBe('health-service-1');
      expect(report.checks).toBeDefined();
      expect(report.status).toBeDefined();
    });

    it('should return unhealthy for non-existent service', async () => {
      const report = await service.checkServiceHealth('non-existent', 'fake-id');

      expect(report.status).toBe('unhealthy');
      expect(report.checks[0].status).toBe('fail');
    });

    it('should check all services health', async () => {
      const reports = await service.checkAllServicesHealth();

      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBeGreaterThan(0);
    });
  });

  describe('Service Mesh Status', () => {
    it('should get service mesh status', () => {
      const status = service.getServiceMeshStatus();

      expect(status).toBeDefined();
      expect(typeof status.services).toBe('number');
      expect(typeof status.instances).toBe('number');
      expect(typeof status.healthyInstances).toBe('number');
      expect(typeof status.routes).toBe('number');
      expect(status.circuitBreakers).toBeDefined();
      expect(status.loadBalancer).toBeDefined();
    });
  });

  describe('Deployment Configuration', () => {
    beforeEach(() => {
      service.registerService({
        id: 'deploy-service-1',
        name: 'deploy-service',
        version: '2.0.0',
        host: 'localhost',
        port: 5000,
        protocol: 'http',
        status: 'healthy',
        metadata: {},
        healthCheck: {
          endpoint: '/health',
          interval: 15000,
          timeout: 5000,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
        },
      });
    });

    it('should generate Kubernetes manifest', () => {
      const manifest = service.generateKubernetesManifest('deploy-service');

      expect(manifest).toBeDefined();
      const parsed = JSON.parse(manifest);
      expect(parsed.apiVersion).toBe('apps/v1');
      expect(parsed.kind).toBe('Deployment');
      expect(parsed.metadata.name).toBe('deploy-service');
    });

    it('should throw error for non-existent service Kubernetes manifest', () => {
      expect(() => service.generateKubernetesManifest('non-existent')).toThrow();
    });

    it('should generate Docker Compose service', () => {
      const compose = service.generateDockerComposeService('deploy-service');

      expect(compose).toBeDefined();
      const parsed = JSON.parse(compose);
      expect(parsed['deploy-service']).toBeDefined();
      expect(parsed['deploy-service'].image).toContain('deploy-service:2.0.0');
    });

    it('should throw error for non-existent service Docker Compose', () => {
      expect(() => service.generateDockerComposeService('non-existent')).toThrow();
    });
  });

  describe('Default Services Initialization', () => {
    it('should initialize default services on module init', () => {
      const financeService = service.getService('finance');
      const hrService = service.getService('hr');
      const logisticsService = service.getService('logistics');

      expect(financeService).toBeDefined();
      expect(hrService).toBeDefined();
      expect(logisticsService).toBeDefined();
    });

    it('should initialize default routes on module init', () => {
      const routes = service.getAllRoutes();
      const financeRoute = routes.find(r => r.path === '/api/finance/*');

      expect(financeRoute).toBeDefined();
      expect(financeRoute?.serviceName).toBe('finance');
    });
  });
});
