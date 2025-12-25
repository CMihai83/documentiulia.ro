import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiPlatformService,
  RateLimitConfig,
  SDKConfig,
  WebhookEndpoint,
  APIVersion,
  ChangelogEntry,
} from './api-platform.service';

@Controller('api-platform')
export class ApiPlatformController {
  private readonly logger = new Logger(ApiPlatformController.name);

  constructor(private readonly apiPlatformService: ApiPlatformService) {}

  // ============================================
  // OPENAPI SPEC ENDPOINTS
  // ============================================

  @Get('openapi')
  getOpenAPISpec() {
    return this.apiPlatformService.getOpenAPISpec();
  }

  @Get('openapi.json')
  getOpenAPISpecJson(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/json');
    res.send(this.apiPlatformService.getOpenAPISpecAsJson());
  }

  @Get('openapi.yaml')
  getOpenAPISpecYaml(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(this.apiPlatformService.getOpenAPISpecAsYaml());
  }

  // ============================================
  // API VERSIONING ENDPOINTS
  // ============================================

  @Get('versions')
  getAllApiVersions() {
    return this.apiPlatformService.getAllApiVersions();
  }

  @Get('versions/current')
  getCurrentVersion() {
    return { version: this.apiPlatformService.getCurrentVersion() };
  }

  @Get('versions/:version')
  getApiVersion(@Param('version') version: string) {
    return this.apiPlatformService.getApiVersion(version);
  }

  @Post('versions')
  createApiVersion(@Body() version: Omit<APIVersion, 'changelog'>) {
    return this.apiPlatformService.createApiVersion(version);
  }

  @Put('versions/:version/deprecate')
  deprecateVersion(
    @Param('version') version: string,
    @Body('sunsetDate') sunsetDate: string,
  ) {
    return { success: this.apiPlatformService.deprecateVersion(version, new Date(sunsetDate)) };
  }

  @Post('versions/:version/changelog')
  addChangelogEntry(
    @Param('version') version: string,
    @Body() entry: Omit<ChangelogEntry, 'date'>,
  ) {
    return { success: this.apiPlatformService.addChangelogEntry(version, entry) };
  }

  // ============================================
  // RATE LIMITING ENDPOINTS
  // ============================================

  @Get('rate-limits')
  getAllRateLimitConfigs() {
    return this.apiPlatformService.getAllRateLimitConfigs();
  }

  @Get('rate-limits/check')
  checkRateLimit(
    @Headers('x-client-id') clientId: string,
    @Query('method') method: string,
    @Query('endpoint') endpoint: string,
  ) {
    return this.apiPlatformService.checkRateLimit(clientId || 'anonymous', method, endpoint);
  }

  @Post('rate-limits')
  configureRateLimit(@Body() config: RateLimitConfig) {
    this.apiPlatformService.configureRateLimit(config);
    return { success: true };
  }

  @Post('rate-limits/consume')
  consumeRateLimit(
    @Headers('x-client-id') clientId: string,
    @Body('method') method: string,
    @Body('endpoint') endpoint: string,
    @Body('cost') cost?: number,
  ) {
    const allowed = this.apiPlatformService.consumeRateLimit(clientId || 'anonymous', method, endpoint, cost);
    return { allowed };
  }

  @Post('rate-limits/reset')
  resetRateLimit(
    @Headers('x-client-id') clientId: string,
    @Body('endpoint') endpoint?: string,
  ) {
    this.apiPlatformService.resetRateLimit(clientId || 'anonymous', endpoint);
    return { success: true };
  }

  // ============================================
  // SDK GENERATION ENDPOINTS
  // ============================================

  @Get('sdk/languages')
  getSupportedSDKLanguages() {
    return this.apiPlatformService.getSupportedSDKLanguages();
  }

  @Post('sdk/generate')
  generateSDK(@Body() config: SDKConfig) {
    return this.apiPlatformService.generateSDK(config);
  }

  // ============================================
  // WEBHOOK ENDPOINTS
  // ============================================

  @Get('webhooks/events')
  getWebhookEvents() {
    return this.apiPlatformService.getWebhookEvents();
  }

  @Get('webhooks')
  getAllWebhooks() {
    return this.apiPlatformService.getAllWebhooks();
  }

  @Get('webhooks/:id')
  getWebhook(@Param('id') id: string) {
    return this.apiPlatformService.getWebhook(id);
  }

  @Post('webhooks')
  createWebhook(
    @Body() data: Omit<WebhookEndpoint, 'id' | 'secret' | 'createdAt' | 'updatedAt' | 'failureCount' | 'successCount'>,
  ) {
    return this.apiPlatformService.createWebhook(data);
  }

  @Put('webhooks/:id')
  updateWebhook(
    @Param('id') id: string,
    @Body() updates: Partial<WebhookEndpoint>,
  ) {
    return { success: this.apiPlatformService.updateWebhook(id, updates) };
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteWebhook(@Param('id') id: string) {
    this.apiPlatformService.deleteWebhook(id);
  }

  @Post('webhooks/:id/regenerate-secret')
  regenerateWebhookSecret(@Param('id') id: string) {
    const secret = this.apiPlatformService.regenerateWebhookSecret(id);
    return { success: !!secret, secret };
  }

  @Post('webhooks/trigger')
  async triggerWebhook(
    @Body('event') event: string,
    @Body('payload') payload: Record<string, any>,
  ) {
    const deliveries = await this.apiPlatformService.triggerWebhook(event, payload);
    return { deliveries };
  }

  @Get('webhooks/:id/deliveries')
  getWebhookDeliveries(@Param('id') id: string) {
    return this.apiPlatformService.getWebhookDeliveries(id);
  }

  @Post('webhooks/deliveries/:deliveryId/retry')
  retryWebhookDelivery(@Param('deliveryId') deliveryId: string) {
    return { success: this.apiPlatformService.retryWebhookDelivery(deliveryId) };
  }

  // ============================================
  // STATUS ENDPOINT
  // ============================================

  @Get('status')
  getApiPlatformStatus() {
    return this.apiPlatformService.getApiPlatformStatus();
  }
}
