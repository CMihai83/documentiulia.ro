import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  WebhookService,
  WebhookEventType,
  WebhookStatus,
  DeliveryStatus,
  RetryPolicy,
} from './webhook.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  // =================== WEBHOOK MANAGEMENT ===================

  @Post()
  @ApiOperation({ summary: 'Create webhook' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        url: { type: 'string' },
        events: { type: 'array', items: { type: 'string' } },
        createdBy: { type: 'string' },
        secret: { type: 'string' },
        headers: { type: 'object' },
        retryPolicy: { type: 'object' },
        rateLimitPerMinute: { type: 'number' },
        metadata: { type: 'object' },
      },
      required: ['tenantId', 'name', 'url', 'events', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  async createWebhook(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('url') url: string,
    @Body('events') events: WebhookEventType[],
    @Body('createdBy') createdBy: string,
    @Body('secret') secret?: string,
    @Body('headers') headers?: Record<string, string>,
    @Body('retryPolicy') retryPolicy?: Partial<RetryPolicy>,
    @Body('rateLimitPerMinute') rateLimitPerMinute?: number,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    return this.webhookService.createWebhook(
      tenantId,
      name,
      url,
      events,
      createdBy,
      { secret, headers, retryPolicy, rateLimitPerMinute, metadata },
    );
  }

  @Get(':webhookId')
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  async getWebhook(@Param('webhookId') webhookId: string) {
    const webhook = await this.webhookService.getWebhook(webhookId);
    if (!webhook) return { error: 'Webhook not found' };
    return webhook;
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get webhooks for tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async getWebhooks(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: WebhookStatus,
    @Query('eventType') eventType?: WebhookEventType,
  ) {
    return {
      webhooks: await this.webhookService.getWebhooks(tenantId, { status, eventType }),
    };
  }

  @Put(':webhookId')
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async updateWebhook(
    @Param('webhookId') webhookId: string,
    @Body() updates: Record<string, any>,
  ) {
    const webhook = await this.webhookService.updateWebhook(webhookId, updates);
    if (!webhook) return { error: 'Webhook not found' };
    return webhook;
  }

  @Delete(':webhookId')
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  async deleteWebhook(@Param('webhookId') webhookId: string) {
    const success = await this.webhookService.deleteWebhook(webhookId);
    return { success };
  }

  @Put(':webhookId/activate')
  @ApiOperation({ summary: 'Activate webhook' })
  @ApiResponse({ status: 200, description: 'Webhook activated' })
  async activateWebhook(@Param('webhookId') webhookId: string) {
    const webhook = await this.webhookService.activateWebhook(webhookId);
    if (!webhook) return { error: 'Webhook not found' };
    return webhook;
  }

  @Put(':webhookId/deactivate')
  @ApiOperation({ summary: 'Deactivate webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deactivated' })
  async deactivateWebhook(@Param('webhookId') webhookId: string) {
    const webhook = await this.webhookService.deactivateWebhook(webhookId);
    if (!webhook) return { error: 'Webhook not found' };
    return webhook;
  }

  @Post(':webhookId/rotate-secret')
  @ApiOperation({ summary: 'Rotate webhook secret' })
  @ApiResponse({ status: 200, description: 'Secret rotated' })
  async rotateSecret(@Param('webhookId') webhookId: string) {
    const result = await this.webhookService.rotateSecret(webhookId);
    if (!result) return { error: 'Webhook not found' };
    return result;
  }

  // =================== EVENT DISPATCHING ===================

  @Post('dispatch')
  @ApiOperation({ summary: 'Dispatch webhook event' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        eventType: { type: 'string' },
        data: { type: 'object' },
        source: { type: 'string' },
      },
      required: ['tenantId', 'eventType', 'data', 'source'],
    },
  })
  @ApiResponse({ status: 201, description: 'Event dispatched' })
  async dispatchEvent(
    @Body('tenantId') tenantId: string,
    @Body('eventType') eventType: WebhookEventType,
    @Body('data') data: Record<string, any>,
    @Body('source') source: string,
  ) {
    const deliveries = await this.webhookService.dispatchEvent(tenantId, eventType, data, source);
    return { deliveries };
  }

  // =================== DELIVERIES ===================

  @Get('deliveries/:deliveryId')
  @ApiOperation({ summary: 'Get delivery by ID' })
  @ApiResponse({ status: 200, description: 'Delivery details' })
  async getDelivery(@Param('deliveryId') deliveryId: string) {
    const delivery = await this.webhookService.getDelivery(deliveryId);
    if (!delivery) return { error: 'Delivery not found' };
    return delivery;
  }

  @Get('deliveries/tenant/:tenantId')
  @ApiOperation({ summary: 'Get deliveries for tenant' })
  @ApiQuery({ name: 'webhookId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of deliveries' })
  async getDeliveries(
    @Param('tenantId') tenantId: string,
    @Query('webhookId') webhookId?: string,
    @Query('status') status?: DeliveryStatus,
    @Query('eventType') eventType?: WebhookEventType,
    @Query('limit') limit?: string,
  ) {
    return {
      deliveries: await this.webhookService.getDeliveries(tenantId, {
        webhookId,
        status,
        eventType,
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  @Post('deliveries/:deliveryId/retry')
  @ApiOperation({ summary: 'Retry delivery' })
  @ApiResponse({ status: 200, description: 'Retry initiated' })
  async retryDelivery(@Param('deliveryId') deliveryId: string) {
    const delivery = await this.webhookService.retryDelivery(deliveryId);
    if (!delivery) return { error: 'Delivery not found or already delivered' };
    return delivery;
  }

  // =================== TESTING ===================

  @Post(':webhookId/test')
  @ApiOperation({ summary: 'Test webhook' })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testWebhook(@Param('webhookId') webhookId: string) {
    return this.webhookService.testWebhook(webhookId);
  }

  // =================== SIGNATURE ===================

  @Post('verify-signature')
  @ApiOperation({ summary: 'Verify webhook signature' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        payload: { type: 'object' },
        signature: { type: 'string' },
        secret: { type: 'string' },
      },
      required: ['payload', 'signature', 'secret'],
    },
  })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifySignature(
    @Body('payload') payload: Record<string, any>,
    @Body('signature') signature: string,
    @Body('secret') secret: string,
  ) {
    const valid = this.webhookService.verifySignature(payload, signature, secret);
    return { valid };
  }

  @Post('generate-signature')
  @ApiOperation({ summary: 'Generate webhook signature' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        payload: { type: 'object' },
        secret: { type: 'string' },
      },
      required: ['payload', 'secret'],
    },
  })
  @ApiResponse({ status: 200, description: 'Generated signature' })
  async generateSignature(
    @Body('payload') payload: Record<string, any>,
    @Body('secret') secret: string,
  ) {
    const signature = this.webhookService.generateSignature(payload, secret);
    return { signature };
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiQuery({ name: 'webhookId', required: false })
  @ApiResponse({ status: 200, description: 'Webhook stats' })
  async getStats(
    @Param('tenantId') tenantId: string,
    @Query('webhookId') webhookId?: string,
  ) {
    return { stats: await this.webhookService.getWebhookStats(tenantId, webhookId) };
  }

  // =================== METADATA ===================

  @Get('metadata/event-types')
  @ApiOperation({ summary: 'Get event types' })
  async getEventTypes() {
    return { eventTypes: this.webhookService.getEventTypes() };
  }

  @Get('metadata/event-categories')
  @ApiOperation({ summary: 'Get event categories' })
  async getEventCategories() {
    return { categories: this.webhookService.getEventCategories() };
  }

  @Get('metadata/statuses')
  @ApiOperation({ summary: 'Get webhook statuses' })
  async getWebhookStatuses() {
    return { statuses: this.webhookService.getWebhookStatuses() };
  }

  @Get('metadata/delivery-statuses')
  @ApiOperation({ summary: 'Get delivery statuses' })
  async getDeliveryStatuses() {
    return { statuses: this.webhookService.getDeliveryStatuses() };
  }
}
