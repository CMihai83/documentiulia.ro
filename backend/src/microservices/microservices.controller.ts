import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  MicroservicesService,
  ServiceInstance,
  ServiceRoute,
  CircuitBreakerState,
  LoadBalancerConfig,
  GatewayRequest,
  EventMessage,
} from './microservices.service';

@Controller('microservices')
export class MicroservicesController {
  private readonly logger = new Logger(MicroservicesController.name);

  constructor(private readonly microservicesService: MicroservicesService) {}

  // ============================================
  // SERVICE REGISTRY ENDPOINTS
  // ============================================

  @Post('registry/services')
  registerService(
    @Body() service: Omit<ServiceInstance, 'registeredAt' | 'lastHeartbeat' | 'metrics'>,
  ): ServiceInstance {
    this.logger.log(`Registering service: ${service.name}`);
    return this.microservicesService.registerService(service);
  }

  @Delete('registry/services/:serviceName/:instanceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deregisterService(
    @Param('serviceName') serviceName: string,
    @Param('instanceId') instanceId: string,
  ): void {
    this.microservicesService.deregisterService(serviceName, instanceId);
  }

  @Get('registry/services')
  getAllServices(): Record<string, ServiceInstance[]> {
    const services = this.microservicesService.getAllServices();
    return Object.fromEntries(services);
  }

  @Get('registry/services/:serviceName')
  getService(@Param('serviceName') serviceName: string): ServiceInstance[] {
    return this.microservicesService.getService(serviceName) || [];
  }

  @Get('registry/services/:serviceName/healthy')
  getHealthyInstances(@Param('serviceName') serviceName: string): ServiceInstance[] {
    return this.microservicesService.getHealthyInstances(serviceName);
  }

  @Put('registry/services/:serviceName/:instanceId/status')
  updateServiceStatus(
    @Param('serviceName') serviceName: string,
    @Param('instanceId') instanceId: string,
    @Body('status') status: ServiceInstance['status'],
  ): { success: boolean } {
    const success = this.microservicesService.updateServiceStatus(serviceName, instanceId, status);
    return { success };
  }

  @Post('registry/services/:serviceName/:instanceId/heartbeat')
  heartbeat(
    @Param('serviceName') serviceName: string,
    @Param('instanceId') instanceId: string,
  ): { success: boolean; timestamp: string } {
    const success = this.microservicesService.heartbeat(serviceName, instanceId);
    return { success, timestamp: new Date().toISOString() };
  }

  // ============================================
  // GATEWAY / ROUTING ENDPOINTS
  // ============================================

  @Post('gateway/routes')
  registerRoute(@Body() route: ServiceRoute): { success: boolean } {
    this.microservicesService.registerRoute(route);
    return { success: true };
  }

  @Delete('gateway/routes/:method/:path')
  removeRoute(
    @Param('method') method: string,
    @Param('path') path: string,
  ): { success: boolean } {
    const success = this.microservicesService.removeRoute(method, decodeURIComponent(path));
    return { success };
  }

  @Get('gateway/routes')
  getAllRoutes(): ServiceRoute[] {
    return this.microservicesService.getAllRoutes();
  }

  @Get('gateway/routes/:method/:path')
  getRoute(
    @Param('method') method: string,
    @Param('path') path: string,
  ): ServiceRoute | null {
    return this.microservicesService.getRoute(method, decodeURIComponent(path)) || null;
  }

  @Post('gateway/proxy')
  async routeRequest(@Body() request: GatewayRequest) {
    return this.microservicesService.routeRequest(request);
  }

  // ============================================
  // LOAD BALANCER ENDPOINTS
  // ============================================

  @Get('loadbalancer/config')
  getLoadBalancerConfig(): LoadBalancerConfig {
    return this.microservicesService.getLoadBalancerConfig();
  }

  @Put('loadbalancer/strategy')
  setLoadBalancerStrategy(
    @Body('strategy') strategy: LoadBalancerConfig['strategy'],
  ): { success: boolean; strategy: string } {
    this.microservicesService.setLoadBalancerStrategy(strategy);
    return { success: true, strategy };
  }

  @Get('loadbalancer/select/:serviceName')
  selectInstance(@Param('serviceName') serviceName: string): ServiceInstance | null {
    return this.microservicesService.selectInstance(serviceName) || null;
  }

  // ============================================
  // CIRCUIT BREAKER ENDPOINTS
  // ============================================

  @Get('circuit-breaker')
  getAllCircuitBreakerStates(): CircuitBreakerState[] {
    return this.microservicesService.getAllCircuitBreakerStates();
  }

  @Get('circuit-breaker/:serviceName')
  getCircuitBreakerState(@Param('serviceName') serviceName: string): CircuitBreakerState | null {
    return this.microservicesService.getCircuitBreakerState(serviceName) || null;
  }

  @Post('circuit-breaker/:serviceName/reset')
  resetCircuitBreaker(@Param('serviceName') serviceName: string): { success: boolean } {
    const success = this.microservicesService.resetCircuitBreaker(serviceName);
    return { success };
  }

  @Put('circuit-breaker/:serviceName/config')
  configureCircuitBreaker(
    @Param('serviceName') serviceName: string,
    @Body() config: Partial<CircuitBreakerState['config']>,
  ): { success: boolean } {
    const success = this.microservicesService.configureCircuitBreaker(serviceName, config);
    return { success };
  }

  // ============================================
  // DISTRIBUTED TRACING ENDPOINTS
  // ============================================

  @Post('tracing/traces')
  startTrace(
    @Body('operationName') operationName: string,
    @Body('serviceName') serviceName: string,
    @Body('parentSpanId') parentSpanId?: string,
  ) {
    return this.microservicesService.startTrace(operationName, serviceName, parentSpanId);
  }

  @Post('tracing/traces/:traceId/spans')
  addSpan(
    @Param('traceId') traceId: string,
    @Body('operationName') operationName: string,
    @Body('serviceName') serviceName: string,
    @Body('parentSpanId') parentSpanId?: string,
  ) {
    return this.microservicesService.addSpan(traceId, operationName, serviceName, parentSpanId);
  }

  @Put('tracing/traces/:traceId/end')
  endTrace(
    @Param('traceId') traceId: string,
    @Body('status') status: 'completed' | 'failed',
  ): { success: boolean } {
    const success = this.microservicesService.endTrace(traceId, status);
    return { success };
  }

  @Put('tracing/spans/:spanId/end')
  endSpan(
    @Param('spanId') spanId: string,
    @Body('status') status: 'completed' | 'failed',
  ): { success: boolean } {
    const success = this.microservicesService.endSpan(spanId, status);
    return { success };
  }

  @Put('tracing/traces/:traceId/tags')
  addTraceTag(
    @Param('traceId') traceId: string,
    @Body('key') key: string,
    @Body('value') value: string,
  ): { success: boolean } {
    const success = this.microservicesService.addTraceTag(traceId, key, value);
    return { success };
  }

  @Post('tracing/traces/:traceId/logs')
  addTraceLog(
    @Param('traceId') traceId: string,
    @Body('message') message: string,
    @Body('level') level?: 'debug' | 'info' | 'warn' | 'error',
  ): { success: boolean } {
    const success = this.microservicesService.addTraceLog(traceId, message, level);
    return { success };
  }

  @Put('tracing/traces/:traceId/baggage')
  setBaggage(
    @Param('traceId') traceId: string,
    @Body('key') key: string,
    @Body('value') value: string,
  ): { success: boolean } {
    const success = this.microservicesService.setBaggage(traceId, key, value);
    return { success };
  }

  @Get('tracing/traces/:traceId')
  getTrace(@Param('traceId') traceId: string) {
    return this.microservicesService.getTrace(traceId);
  }

  @Get('tracing/spans/:spanId')
  getSpan(@Param('spanId') spanId: string) {
    return this.microservicesService.getSpan(spanId);
  }

  @Get('tracing/traces')
  getRecentTraces(@Query('limit') limit?: string) {
    return this.microservicesService.getRecentTraces(limit ? parseInt(limit, 10) : 100);
  }

  @Get('tracing/services/:serviceName/traces')
  getTracesByService(@Param('serviceName') serviceName: string) {
    return this.microservicesService.getTracesByService(serviceName);
  }

  // ============================================
  // EVENT BUS ENDPOINTS
  // ============================================

  @Post('events')
  async publishEvent(
    @Body() event: Omit<EventMessage, 'id' | 'timestamp'>,
  ): Promise<{ eventId: string }> {
    const eventId = await this.microservicesService.publishEvent(event);
    return { eventId };
  }

  @Get('events/history')
  getEventHistory(
    @Query('type') eventType?: string,
    @Query('limit') limit?: string,
  ): EventMessage[] {
    return this.microservicesService.getEventHistory(eventType, limit ? parseInt(limit, 10) : 100);
  }

  @Get('events/dead-letter')
  getDeadLetterQueue(): EventMessage[] {
    return this.microservicesService.getDeadLetterQueue();
  }

  @Post('events/dead-letter/:eventId/retry')
  retryDeadLetterEvent(@Param('eventId') eventId: string): { success: boolean } {
    const success = this.microservicesService.retryDeadLetterEvent(eventId);
    return { success };
  }

  @Delete('events/dead-letter')
  clearDeadLetterQueue(): { cleared: number } {
    const cleared = this.microservicesService.clearDeadLetterQueue();
    return { cleared };
  }

  // ============================================
  // HEALTH CHECK ENDPOINTS
  // ============================================

  @Get('health')
  async checkAllServicesHealth() {
    return this.microservicesService.checkAllServicesHealth();
  }

  @Get('health/:serviceName/:instanceId')
  async checkServiceHealth(
    @Param('serviceName') serviceName: string,
    @Param('instanceId') instanceId: string,
  ) {
    return this.microservicesService.checkServiceHealth(serviceName, instanceId);
  }

  // ============================================
  // SERVICE MESH STATUS ENDPOINTS
  // ============================================

  @Get('mesh/status')
  getServiceMeshStatus() {
    return this.microservicesService.getServiceMeshStatus();
  }

  // ============================================
  // DEPLOYMENT CONFIG ENDPOINTS
  // ============================================

  @Get('deployment/kubernetes/:serviceName')
  generateKubernetesManifest(@Param('serviceName') serviceName: string): { manifest: string } {
    const manifest = this.microservicesService.generateKubernetesManifest(serviceName);
    return { manifest };
  }

  @Get('deployment/docker-compose/:serviceName')
  generateDockerComposeService(@Param('serviceName') serviceName: string): { service: string } {
    const service = this.microservicesService.generateDockerComposeService(serviceName);
    return { service };
  }
}
