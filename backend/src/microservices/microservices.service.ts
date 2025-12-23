import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Service Registration Types
export interface ServiceInstance {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc';
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopping';
  metadata: {
    region?: string;
    zone?: string;
    environment?: string;
    weight?: number;
    tags?: string[];
    capabilities?: string[];
  };
  healthCheck: {
    endpoint: string;
    interval: number;
    timeout: number;
    lastCheck?: Date;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
  };
  registeredAt: Date;
  lastHeartbeat: Date;
  metrics: {
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
    p99ResponseTime: number;
  };
}

export interface ServiceRoute {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  serviceName: string;
  stripPrefix?: boolean;
  timeout?: number;
  retries?: number;
  circuitBreaker?: boolean;
  rateLimit?: {
    requests: number;
    window: number;
  };
  authentication?: boolean;
  authorization?: string[];
  transformRequest?: boolean;
  transformResponse?: boolean;
  cache?: {
    enabled: boolean;
    ttl: number;
    key?: string;
  };
}

export interface CircuitBreakerState {
  serviceName: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  openedAt?: Date;
  halfOpenAt?: Date;
  config: {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    halfOpenRequests: number;
  };
}

export interface DistributedTrace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  tags: Record<string, string>;
  logs: Array<{
    timestamp: Date;
    message: string;
    level: 'debug' | 'info' | 'warn' | 'error';
  }>;
  baggage: Record<string, string>;
}

export interface EventMessage {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
  data: Record<string, any>;
  metadata: {
    version: string;
    contentType: string;
    encoding: string;
  };
  routing: {
    exchange?: string;
    routingKey?: string;
    queue?: string;
  };
}

export interface ServiceHealthReport {
  serviceName: string;
  instanceId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    duration: number;
  }>;
  uptime: number;
  timestamp: Date;
}

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted' | 'random' | 'ip-hash';
  healthCheckInterval: number;
  failoverThreshold: number;
  stickySession?: {
    enabled: boolean;
    cookieName: string;
    ttl: number;
  };
}

export interface GatewayRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  clientIp: string;
  userId?: string;
  tenantId?: string;
  timestamp: Date;
}

export interface GatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  duration: number;
  serviceName: string;
  instanceId: string;
}

@Injectable()
export class MicroservicesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MicroservicesService.name);

  // Service Registry
  private readonly services = new Map<string, ServiceInstance[]>();
  private readonly routes = new Map<string, ServiceRoute>();
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  // Distributed Tracing
  private readonly traces = new Map<string, DistributedTrace>();
  private readonly spans = new Map<string, DistributedTrace>();

  // Event Bus
  private readonly eventSubscribers = new Map<string, Array<(event: EventMessage) => Promise<void>>>();
  private readonly eventHistory: EventMessage[] = [];
  private readonly deadLetterQueue: EventMessage[] = [];

  // Load Balancing
  private readonly roundRobinCounters = new Map<string, number>();
  private readonly connectionCounts = new Map<string, number>();

  // Health Check Intervals
  private healthCheckIntervals: NodeJS.Timeout[] = [];
  private metricsInterval?: NodeJS.Timeout;

  // Configuration
  private readonly defaultCircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,
    halfOpenRequests: 3,
  };

  private readonly loadBalancerConfig: LoadBalancerConfig = {
    strategy: 'round-robin',
    healthCheckInterval: 10000,
    failoverThreshold: 3,
    stickySession: {
      enabled: false,
      cookieName: 'SERVERID',
      ttl: 3600000,
    },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Microservices Infrastructure');
    await this.initializeDefaultServices();
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  onModuleDestroy(): void {
    this.healthCheckIntervals.forEach(interval => clearInterval(interval));
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  // ============================================
  // SERVICE REGISTRY
  // ============================================

  registerService(service: Omit<ServiceInstance, 'registeredAt' | 'lastHeartbeat' | 'metrics'>): ServiceInstance {
    const instance: ServiceInstance = {
      ...service,
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
      metrics: {
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        p99ResponseTime: 0,
      },
    };

    const instances = this.services.get(service.name) || [];
    const existingIndex = instances.findIndex(i => i.id === service.id);

    if (existingIndex >= 0) {
      instances[existingIndex] = instance;
    } else {
      instances.push(instance);
    }

    this.services.set(service.name, instances);

    // Initialize circuit breaker for new service
    if (!this.circuitBreakers.has(service.name)) {
      this.initializeCircuitBreaker(service.name);
    }

    this.logger.log(`Service registered: ${service.name}@${service.version} (${service.id})`);

    this.eventEmitter.emit('service.registered', {
      serviceName: service.name,
      instanceId: service.id,
      timestamp: new Date(),
    });

    return instance;
  }

  deregisterService(serviceName: string, instanceId: string): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) return false;

    const index = instances.findIndex(i => i.id === instanceId);
    if (index < 0) return false;

    instances.splice(index, 1);

    if (instances.length === 0) {
      this.services.delete(serviceName);
      this.circuitBreakers.delete(serviceName);
    } else {
      this.services.set(serviceName, instances);
    }

    this.logger.log(`Service deregistered: ${serviceName} (${instanceId})`);

    this.eventEmitter.emit('service.deregistered', {
      serviceName,
      instanceId,
      timestamp: new Date(),
    });

    return true;
  }

  getService(serviceName: string): ServiceInstance[] | undefined {
    return this.services.get(serviceName);
  }

  getHealthyInstances(serviceName: string): ServiceInstance[] {
    const instances = this.services.get(serviceName) || [];
    return instances.filter(i => i.status === 'healthy');
  }

  getAllServices(): Map<string, ServiceInstance[]> {
    return new Map(this.services);
  }

  updateServiceStatus(serviceName: string, instanceId: string, status: ServiceInstance['status']): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) return false;

    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return false;

    instance.status = status;
    instance.lastHeartbeat = new Date();

    return true;
  }

  heartbeat(serviceName: string, instanceId: string): boolean {
    const instances = this.services.get(serviceName);
    if (!instances) return false;

    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return false;

    instance.lastHeartbeat = new Date();
    instance.healthCheck.consecutiveFailures = 0;
    instance.healthCheck.consecutiveSuccesses++;

    if (instance.status === 'unhealthy' && instance.healthCheck.consecutiveSuccesses >= 3) {
      instance.status = 'healthy';
    }

    return true;
  }

  // ============================================
  // API GATEWAY / ROUTING
  // ============================================

  registerRoute(route: ServiceRoute): void {
    const key = `${route.method}:${route.path}`;
    this.routes.set(key, route);
    this.logger.log(`Route registered: ${route.method} ${route.path} -> ${route.serviceName}`);
  }

  removeRoute(method: string, path: string): boolean {
    const key = `${method}:${path}`;
    return this.routes.delete(key);
  }

  getRoute(method: string, path: string): ServiceRoute | undefined {
    // First try exact match
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey);
    }

    // Try ALL method
    const allKey = `ALL:${path}`;
    if (this.routes.has(allKey)) {
      return this.routes.get(allKey);
    }

    // Try pattern matching
    for (const [key, route] of this.routes) {
      const [routeMethod, routePath] = key.split(':');
      if (routeMethod !== method && routeMethod !== 'ALL') continue;

      const pattern = this.pathToRegex(routePath);
      if (pattern.test(path)) {
        return route;
      }
    }

    return undefined;
  }

  getAllRoutes(): ServiceRoute[] {
    return Array.from(this.routes.values());
  }

  async routeRequest(request: GatewayRequest): Promise<GatewayResponse> {
    const startTime = Date.now();
    const route = this.getRoute(request.method, request.path);

    if (!route) {
      return {
        statusCode: 404,
        headers: {},
        body: { error: 'Route not found', path: request.path },
        duration: Date.now() - startTime,
        serviceName: 'gateway',
        instanceId: 'gateway-1',
      };
    }

    // Check circuit breaker
    const cbState = this.circuitBreakers.get(route.serviceName);
    if (cbState && cbState.state === 'open') {
      return {
        statusCode: 503,
        headers: {},
        body: { error: 'Service unavailable', service: route.serviceName },
        duration: Date.now() - startTime,
        serviceName: route.serviceName,
        instanceId: 'unknown',
      };
    }

    // Get healthy instance
    const instance = this.selectInstance(route.serviceName);
    if (!instance) {
      return {
        statusCode: 503,
        headers: {},
        body: { error: 'No healthy instances available', service: route.serviceName },
        duration: Date.now() - startTime,
        serviceName: route.serviceName,
        instanceId: 'unknown',
      };
    }

    // Create trace
    const trace = this.startTrace(`${request.method} ${request.path}`, 'gateway');

    try {
      // Simulate service call
      const response = await this.callService(instance, route, request);

      // Update metrics
      this.recordSuccess(route.serviceName, instance.id, Date.now() - startTime);
      this.endTrace(trace.traceId, 'completed');

      return {
        ...response,
        duration: Date.now() - startTime,
        serviceName: route.serviceName,
        instanceId: instance.id,
      };
    } catch (error) {
      this.recordFailure(route.serviceName, instance.id);
      this.endTrace(trace.traceId, 'failed');

      return {
        statusCode: 500,
        headers: {},
        body: { error: 'Internal service error', message: error instanceof Error ? error.message : 'Unknown error' },
        duration: Date.now() - startTime,
        serviceName: route.serviceName,
        instanceId: instance.id,
      };
    }
  }

  private async callService(
    instance: ServiceInstance,
    route: ServiceRoute,
    request: GatewayRequest
  ): Promise<Pick<GatewayResponse, 'statusCode' | 'headers' | 'body'>> {
    // This simulates making an actual HTTP call to the service
    // In production, this would use HttpService or a similar client

    const targetPath = route.stripPrefix
      ? request.path.replace(new RegExp(`^${route.path.replace(/\*/g, '.*')}`), '')
      : request.path;

    // Simulate response based on service
    return {
      statusCode: 200,
      headers: {
        'x-service-name': instance.name,
        'x-instance-id': instance.id,
        'x-response-time': '50',
      },
      body: {
        success: true,
        service: instance.name,
        instance: instance.id,
        path: targetPath,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ============================================
  // LOAD BALANCING
  // ============================================

  selectInstance(serviceName: string): ServiceInstance | undefined {
    const instances = this.getHealthyInstances(serviceName);
    if (instances.length === 0) return undefined;

    switch (this.loadBalancerConfig.strategy) {
      case 'round-robin':
        return this.roundRobinSelect(serviceName, instances);
      case 'least-connections':
        return this.leastConnectionsSelect(instances);
      case 'weighted':
        return this.weightedSelect(instances);
      case 'random':
        return this.randomSelect(instances);
      default:
        return instances[0];
    }
  }

  private roundRobinSelect(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const counter = this.roundRobinCounters.get(serviceName) || 0;
    const instance = instances[counter % instances.length];
    this.roundRobinCounters.set(serviceName, counter + 1);
    return instance;
  }

  private leastConnectionsSelect(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((min, instance) => {
      const minConnections = this.connectionCounts.get(min.id) || 0;
      const instanceConnections = this.connectionCounts.get(instance.id) || 0;
      return instanceConnections < minConnections ? instance : min;
    });
  }

  private weightedSelect(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, i) => sum + (i.metadata.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const instance of instances) {
      random -= instance.metadata.weight || 1;
      if (random <= 0) return instance;
    }

    return instances[0];
  }

  private randomSelect(instances: ServiceInstance[]): ServiceInstance {
    return instances[Math.floor(Math.random() * instances.length)];
  }

  setLoadBalancerStrategy(strategy: LoadBalancerConfig['strategy']): void {
    this.loadBalancerConfig.strategy = strategy;
    this.logger.log(`Load balancer strategy changed to: ${strategy}`);
  }

  getLoadBalancerConfig(): LoadBalancerConfig {
    return { ...this.loadBalancerConfig };
  }

  // ============================================
  // CIRCUIT BREAKER
  // ============================================

  private initializeCircuitBreaker(serviceName: string): void {
    this.circuitBreakers.set(serviceName, {
      serviceName,
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      config: { ...this.defaultCircuitBreakerConfig },
    });
  }

  getCircuitBreakerState(serviceName: string): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(serviceName);
  }

  getAllCircuitBreakerStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }

  private recordSuccess(serviceName: string, instanceId: string, responseTime: number): void {
    const cb = this.circuitBreakers.get(serviceName);
    if (!cb) return;

    cb.successCount++;
    cb.lastSuccess = new Date();

    // Update instance metrics
    const instances = this.services.get(serviceName);
    const instance = instances?.find(i => i.id === instanceId);
    if (instance) {
      instance.metrics.requestCount++;
      const totalResponseTime = instance.metrics.avgResponseTime * (instance.metrics.requestCount - 1) + responseTime;
      instance.metrics.avgResponseTime = totalResponseTime / instance.metrics.requestCount;
      instance.metrics.p99ResponseTime = Math.max(instance.metrics.p99ResponseTime, responseTime);
    }

    if (cb.state === 'half-open') {
      if (cb.successCount >= cb.config.successThreshold) {
        cb.state = 'closed';
        cb.failureCount = 0;
        this.logger.log(`Circuit breaker CLOSED for ${serviceName}`);
        this.eventEmitter.emit('circuit.closed', { serviceName });
      }
    }
  }

  private recordFailure(serviceName: string, instanceId: string): void {
    const cb = this.circuitBreakers.get(serviceName);
    if (!cb) return;

    cb.failureCount++;
    cb.lastFailure = new Date();

    // Update instance metrics
    const instances = this.services.get(serviceName);
    const instance = instances?.find(i => i.id === instanceId);
    if (instance) {
      instance.metrics.requestCount++;
      instance.metrics.errorCount++;
    }

    if (cb.state === 'closed' && cb.failureCount >= cb.config.failureThreshold) {
      cb.state = 'open';
      cb.openedAt = new Date();
      this.logger.warn(`Circuit breaker OPENED for ${serviceName}`);
      this.eventEmitter.emit('circuit.opened', { serviceName });

      // Schedule half-open transition
      setTimeout(() => {
        if (cb.state === 'open') {
          cb.state = 'half-open';
          cb.halfOpenAt = new Date();
          cb.successCount = 0;
          this.logger.log(`Circuit breaker HALF-OPEN for ${serviceName}`);
          this.eventEmitter.emit('circuit.half-open', { serviceName });
        }
      }, cb.config.timeout);
    } else if (cb.state === 'half-open') {
      cb.state = 'open';
      cb.openedAt = new Date();
      this.logger.warn(`Circuit breaker re-OPENED for ${serviceName}`);
    }
  }

  resetCircuitBreaker(serviceName: string): boolean {
    const cb = this.circuitBreakers.get(serviceName);
    if (!cb) return false;

    cb.state = 'closed';
    cb.failureCount = 0;
    cb.successCount = 0;
    cb.openedAt = undefined;
    cb.halfOpenAt = undefined;

    this.logger.log(`Circuit breaker manually reset for ${serviceName}`);
    return true;
  }

  configureCircuitBreaker(serviceName: string, config: Partial<CircuitBreakerState['config']>): boolean {
    const cb = this.circuitBreakers.get(serviceName);
    if (!cb) return false;

    cb.config = { ...cb.config, ...config };
    return true;
  }

  // ============================================
  // DISTRIBUTED TRACING
  // ============================================

  startTrace(operationName: string, serviceName: string, parentSpanId?: string): DistributedTrace {
    const traceId = parentSpanId
      ? this.spans.get(parentSpanId)?.traceId || this.generateId()
      : this.generateId();

    const spanId = this.generateId();

    const trace: DistributedTrace = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      serviceName,
      startTime: new Date(),
      status: 'started',
      tags: {},
      logs: [],
      baggage: {},
    };

    this.traces.set(traceId, trace);
    this.spans.set(spanId, trace);

    return trace;
  }

  addSpan(traceId: string, operationName: string, serviceName: string, parentSpanId?: string): DistributedTrace | undefined {
    const parentTrace = this.traces.get(traceId);
    if (!parentTrace) return undefined;

    const spanId = this.generateId();
    const span: DistributedTrace = {
      traceId,
      spanId,
      parentSpanId: parentSpanId || parentTrace.spanId,
      operationName,
      serviceName,
      startTime: new Date(),
      status: 'started',
      tags: { ...parentTrace.baggage },
      logs: [],
      baggage: { ...parentTrace.baggage },
    };

    this.spans.set(spanId, span);
    return span;
  }

  endTrace(traceId: string, status: 'completed' | 'failed'): boolean {
    const trace = this.traces.get(traceId);
    if (!trace) return false;

    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
    trace.status = status;

    return true;
  }

  endSpan(spanId: string, status: 'completed' | 'failed'): boolean {
    const span = this.spans.get(spanId);
    if (!span) return false;

    span.endTime = new Date();
    span.duration = span.endTime.getTime() - span.startTime.getTime();
    span.status = status;

    return true;
  }

  addTraceTag(traceId: string, key: string, value: string): boolean {
    const trace = this.traces.get(traceId);
    if (!trace) return false;

    trace.tags[key] = value;
    return true;
  }

  addTraceLog(traceId: string, message: string, level: 'debug' | 'info' | 'warn' | 'error' = 'info'): boolean {
    const trace = this.traces.get(traceId);
    if (!trace) return false;

    trace.logs.push({
      timestamp: new Date(),
      message,
      level,
    });

    return true;
  }

  setBaggage(traceId: string, key: string, value: string): boolean {
    const trace = this.traces.get(traceId);
    if (!trace) return false;

    trace.baggage[key] = value;
    return true;
  }

  getTrace(traceId: string): DistributedTrace | undefined {
    return this.traces.get(traceId);
  }

  getSpan(spanId: string): DistributedTrace | undefined {
    return this.spans.get(spanId);
  }

  getTracesByService(serviceName: string): DistributedTrace[] {
    return Array.from(this.traces.values()).filter(t => t.serviceName === serviceName);
  }

  getRecentTraces(limit: number = 100): DistributedTrace[] {
    return Array.from(this.traces.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  // ============================================
  // EVENT BUS
  // ============================================

  async publishEvent(event: Omit<EventMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullEvent: EventMessage = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.eventHistory.push(fullEvent);

    // Keep only last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory.shift();
    }

    const subscribers = this.eventSubscribers.get(event.type) || [];
    const wildcardSubscribers = this.eventSubscribers.get('*') || [];
    const allSubscribers = [...subscribers, ...wildcardSubscribers];

    this.logger.debug(`Publishing event: ${event.type} to ${allSubscribers.length} subscribers`);

    const deliveryPromises = allSubscribers.map(async (handler) => {
      try {
        await handler(fullEvent);
      } catch (error) {
        this.logger.error(`Event handler failed for ${event.type}: ${error}`);
        this.deadLetterQueue.push(fullEvent);
      }
    });

    await Promise.allSettled(deliveryPromises);

    return fullEvent.id;
  }

  subscribe(eventType: string, handler: (event: EventMessage) => Promise<void>): () => void {
    const subscribers = this.eventSubscribers.get(eventType) || [];
    subscribers.push(handler);
    this.eventSubscribers.set(eventType, subscribers);

    this.logger.log(`Subscribed to event: ${eventType}`);

    // Return unsubscribe function
    return () => {
      const subs = this.eventSubscribers.get(eventType) || [];
      const index = subs.indexOf(handler);
      if (index >= 0) {
        subs.splice(index, 1);
      }
    };
  }

  getEventHistory(eventType?: string, limit: number = 100): EventMessage[] {
    let events = this.eventHistory;

    if (eventType) {
      events = events.filter(e => e.type === eventType);
    }

    return events.slice(-limit);
  }

  getDeadLetterQueue(): EventMessage[] {
    return [...this.deadLetterQueue];
  }

  retryDeadLetterEvent(eventId: string): boolean {
    const index = this.deadLetterQueue.findIndex(e => e.id === eventId);
    if (index < 0) return false;

    const event = this.deadLetterQueue.splice(index, 1)[0];
    this.publishEvent(event);
    return true;
  }

  clearDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue.length = 0;
    return count;
  }

  // ============================================
  // HEALTH CHECKS
  // ============================================

  async checkServiceHealth(serviceName: string, instanceId: string): Promise<ServiceHealthReport> {
    const instances = this.services.get(serviceName);
    const instance = instances?.find(i => i.id === instanceId);

    if (!instance) {
      return {
        serviceName,
        instanceId,
        status: 'unhealthy',
        checks: [{
          name: 'existence',
          status: 'fail',
          message: 'Service instance not found',
          duration: 0,
        }],
        uptime: 0,
        timestamp: new Date(),
      };
    }

    const checks: ServiceHealthReport['checks'] = [];
    const startTime = Date.now();

    // Check heartbeat
    const heartbeatAge = Date.now() - instance.lastHeartbeat.getTime();
    checks.push({
      name: 'heartbeat',
      status: heartbeatAge < 30000 ? 'pass' : heartbeatAge < 60000 ? 'warn' : 'fail',
      message: `Last heartbeat ${Math.round(heartbeatAge / 1000)}s ago`,
      duration: Date.now() - startTime,
    });

    // Check error rate
    const errorRate = instance.metrics.requestCount > 0
      ? instance.metrics.errorCount / instance.metrics.requestCount
      : 0;
    checks.push({
      name: 'error-rate',
      status: errorRate < 0.01 ? 'pass' : errorRate < 0.05 ? 'warn' : 'fail',
      message: `Error rate: ${(errorRate * 100).toFixed(2)}%`,
      duration: Date.now() - startTime,
    });

    // Check response time
    checks.push({
      name: 'response-time',
      status: instance.metrics.avgResponseTime < 100 ? 'pass' : instance.metrics.avgResponseTime < 500 ? 'warn' : 'fail',
      message: `Avg response time: ${instance.metrics.avgResponseTime.toFixed(2)}ms`,
      duration: Date.now() - startTime,
    });

    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warnChecks = checks.filter(c => c.status === 'warn').length;

    const status: ServiceHealthReport['status'] =
      failedChecks > 0 ? 'unhealthy' :
      warnChecks > 0 ? 'degraded' :
      'healthy';

    const uptime = Date.now() - instance.registeredAt.getTime();

    return {
      serviceName,
      instanceId,
      status,
      checks,
      uptime,
      timestamp: new Date(),
    };
  }

  async checkAllServicesHealth(): Promise<ServiceHealthReport[]> {
    const reports: ServiceHealthReport[] = [];

    for (const [serviceName, instances] of this.services) {
      for (const instance of instances) {
        const report = await this.checkServiceHealth(serviceName, instance.id);
        reports.push(report);
      }
    }

    return reports;
  }

  private startHealthChecks(): void {
    const interval = setInterval(async () => {
      for (const [serviceName, instances] of this.services) {
        for (const instance of instances) {
          const heartbeatAge = Date.now() - instance.lastHeartbeat.getTime();

          if (heartbeatAge > instance.healthCheck.interval * 3) {
            instance.healthCheck.consecutiveFailures++;
            instance.healthCheck.consecutiveSuccesses = 0;
            instance.healthCheck.lastCheck = new Date();

            if (instance.healthCheck.consecutiveFailures >= 3 && instance.status === 'healthy') {
              instance.status = 'unhealthy';
              this.logger.warn(`Service ${serviceName} instance ${instance.id} marked unhealthy`);
              this.eventEmitter.emit('service.unhealthy', { serviceName, instanceId: instance.id });
            }
          }
        }
      }
    }, this.loadBalancerConfig.healthCheckInterval);

    this.healthCheckIntervals.push(interval);
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = {
        totalServices: this.services.size,
        totalInstances: Array.from(this.services.values()).flat().length,
        healthyInstances: Array.from(this.services.values()).flat().filter(i => i.status === 'healthy').length,
        openCircuitBreakers: Array.from(this.circuitBreakers.values()).filter(cb => cb.state === 'open').length,
        activeTraces: this.traces.size,
        eventQueueSize: this.eventHistory.length,
        deadLetterSize: this.deadLetterQueue.length,
      };

      this.eventEmitter.emit('metrics.collected', metrics);
    }, 60000);
  }

  // ============================================
  // SERVICE MESH CONFIGURATION
  // ============================================

  getServiceMeshStatus(): {
    services: number;
    instances: number;
    healthyInstances: number;
    routes: number;
    circuitBreakers: { total: number; open: number; halfOpen: number };
    loadBalancer: LoadBalancerConfig;
  } {
    const instances = Array.from(this.services.values()).flat();
    const circuitBreakerStates = Array.from(this.circuitBreakers.values());

    return {
      services: this.services.size,
      instances: instances.length,
      healthyInstances: instances.filter(i => i.status === 'healthy').length,
      routes: this.routes.size,
      circuitBreakers: {
        total: circuitBreakerStates.length,
        open: circuitBreakerStates.filter(cb => cb.state === 'open').length,
        halfOpen: circuitBreakerStates.filter(cb => cb.state === 'half-open').length,
      },
      loadBalancer: { ...this.loadBalancerConfig },
    };
  }

  // ============================================
  // KUBERNETES/DOCKER DEPLOYMENT HELPERS
  // ============================================

  generateKubernetesManifest(serviceName: string): string {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const instance = instances[0];
    const manifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: serviceName,
        labels: { app: serviceName },
      },
      spec: {
        replicas: instances.length,
        selector: { matchLabels: { app: serviceName } },
        template: {
          metadata: { labels: { app: serviceName } },
          spec: {
            containers: [{
              name: serviceName,
              image: `documentiulia/${serviceName}:${instance.version}`,
              ports: [{ containerPort: instance.port }],
              env: [
                { name: 'SERVICE_NAME', value: serviceName },
                { name: 'SERVICE_VERSION', value: instance.version },
              ],
              livenessProbe: {
                httpGet: { path: instance.healthCheck.endpoint, port: instance.port },
                initialDelaySeconds: 30,
                periodSeconds: instance.healthCheck.interval / 1000,
              },
              readinessProbe: {
                httpGet: { path: instance.healthCheck.endpoint, port: instance.port },
                initialDelaySeconds: 5,
                periodSeconds: 5,
              },
              resources: {
                requests: { memory: '128Mi', cpu: '100m' },
                limits: { memory: '512Mi', cpu: '500m' },
              },
            }],
          },
        },
      },
    };

    return JSON.stringify(manifest, null, 2);
  }

  generateDockerComposeService(serviceName: string): string {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const instance = instances[0];
    const service = {
      image: `documentiulia/${serviceName}:${instance.version}`,
      ports: [`${instance.port}:${instance.port}`],
      environment: [
        `SERVICE_NAME=${serviceName}`,
        `SERVICE_VERSION=${instance.version}`,
        `PORT=${instance.port}`,
      ],
      healthcheck: {
        test: ['CMD', 'curl', '-f', `http://localhost:${instance.port}${instance.healthCheck.endpoint}`],
        interval: `${instance.healthCheck.interval / 1000}s`,
        timeout: `${instance.healthCheck.timeout / 1000}s`,
        retries: 3,
      },
      deploy: {
        replicas: instances.length,
        resources: {
          limits: { memory: '512M' },
          reservations: { memory: '128M' },
        },
      },
      networks: ['documentiulia-network'],
    };

    return JSON.stringify({ [serviceName]: service }, null, 2);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private pathToRegex(path: string): RegExp {
    const pattern = path
      .replace(/\*/g, '.*')
      .replace(/\/:([^/]+)/g, '/([^/]+)');
    return new RegExp(`^${pattern}$`);
  }

  private async initializeDefaultServices(): Promise<void> {
    // Skip mock service registration in monolithic mode (default)
    // Set MICROSERVICES_ENABLED=true to enable distributed architecture
    const microservicesEnabled = this.configService.get<string>('MICROSERVICES_ENABLED') === 'true';
    if (!microservicesEnabled) {
      this.logger.log('Running in monolithic mode - skipping mock service registration');
      return;
    }

    // Register core platform services (only in distributed mode)
    const defaultServices = [
      { name: 'finance', version: '1.0.0', port: 3001 },
      { name: 'hr', version: '1.0.0', port: 3002 },
      { name: 'logistics', version: '1.0.0', port: 3003 },
      { name: 'compliance', version: '1.0.0', port: 3004 },
      { name: 'ai', version: '1.0.0', port: 3005 },
      { name: 'notifications', version: '1.0.0', port: 3006 },
    ];

    for (const svc of defaultServices) {
      this.registerService({
        id: `${svc.name}-instance-1`,
        name: svc.name,
        version: svc.version,
        host: 'localhost',
        port: svc.port,
        protocol: 'http',
        status: 'healthy',
        metadata: {
          region: 'eu-west',
          zone: 'romania',
          environment: 'development',
          weight: 1,
          tags: ['core'],
        },
        healthCheck: {
          endpoint: '/health',
          interval: 10000,
          timeout: 5000,
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
        },
      });
    }

    // Register default routes
    const defaultRoutes: ServiceRoute[] = [
      { path: '/api/finance/*', method: 'ALL', serviceName: 'finance', stripPrefix: false, authentication: true },
      { path: '/api/hr/*', method: 'ALL', serviceName: 'hr', stripPrefix: false, authentication: true },
      { path: '/api/logistics/*', method: 'ALL', serviceName: 'logistics', stripPrefix: false, authentication: true },
      { path: '/api/compliance/*', method: 'ALL', serviceName: 'compliance', stripPrefix: false, authentication: true },
      { path: '/api/ai/*', method: 'ALL', serviceName: 'ai', stripPrefix: false, authentication: true },
      { path: '/api/notifications/*', method: 'ALL', serviceName: 'notifications', stripPrefix: false, authentication: true },
    ];

    for (const route of defaultRoutes) {
      this.registerRoute(route);
    }
  }
}
