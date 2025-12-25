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
  EventType,
  WebhookStatus,
  DeliveryStatus,
  EventFilter,
} from './webhook.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  // =================== ENDPOINTS ===================

  @Post('endpoints')
  @ApiOperation({ summary: 'Create webhook endpoint' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        url: { type: 'string' },
        events: { type: 'array', items: { type: 'string' } },
        headers: { type: 'object' },
        retryPolicy: {
          type: 'object',
          properties: {
            maxRetries: { type: 'number' },
            initialDelayMs: { type: 'number' },
            maxDelayMs: { type: 'number' },
            backoffMultiplier: { type: 'number' },
          },
        },
      },
      required: ['tenantId', 'name', 'url', 'events'],
    },
  })
  @ApiResponse({ status: 201, description: 'Endpoint created' })
  async createEndpoint(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('url') url: string,
    @Body('events') events: EventType[],
    @Body('headers') headers?: Record<string, string>,
    @Body('retryPolicy') retryPolicy?: Record<string, number>,
  ) {
    return this.webhookService.createEndpoint(tenantId, name, url, events, {
      headers,
      retryPolicy,
    });
  }

  @Get('endpoints/:endpointId')
  @ApiOperation({ summary: 'Get webhook endpoint by ID' })
  @ApiResponse({ status: 200, description: 'Endpoint details' })
  async getEndpoint(@Param('endpointId') endpointId: string) {
    const endpoint = await this.webhookService.getEndpoint(endpointId);
    if (!endpoint) {
      return { error: 'Endpoint not found' };
    }
    return endpoint;
  }

  @Get('endpoints/tenant/:tenantId')
  @ApiOperation({ summary: 'Get webhook endpoints for tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'List of endpoints' })
  async getEndpoints(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: WebhookStatus,
  ) {
    return { endpoints: await this.webhookService.getEndpoints(tenantId, status) };
  }

  @Put('endpoints/:endpointId')
  @ApiOperation({ summary: 'Update webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint updated' })
  async updateEndpoint(
    @Param('endpointId') endpointId: string,
    @Body() updates: Record<string, any>,
  ) {
    const endpoint = await this.webhookService.updateEndpoint(endpointId, updates);
    if (!endpoint) {
      return { error: 'Endpoint not found' };
    }
    return endpoint;
  }

  @Delete('endpoints/:endpointId')
  @ApiOperation({ summary: 'Delete webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint deleted' })
  async deleteEndpoint(@Param('endpointId') endpointId: string) {
    const success = await this.webhookService.deleteEndpoint(endpointId);
    return { success };
  }

  @Post('endpoints/:endpointId/rotate-secret')
  @ApiOperation({ summary: 'Rotate webhook secret' })
  @ApiResponse({ status: 200, description: 'Secret rotated' })
  async rotateSecret(@Param('endpointId') endpointId: string) {
    const result = await this.webhookService.rotateSecret(endpointId);
    if (!result) {
      return { error: 'Endpoint not found' };
    }
    return result;
  }

  @Post('endpoints/:endpointId/pause')
  @ApiOperation({ summary: 'Pause webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint paused' })
  async pauseEndpoint(@Param('endpointId') endpointId: string) {
    const endpoint = await this.webhookService.pauseEndpoint(endpointId);
    if (!endpoint) {
      return { error: 'Endpoint not found' };
    }
    return endpoint;
  }

  @Post('endpoints/:endpointId/resume')
  @ApiOperation({ summary: 'Resume webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint resumed' })
  async resumeEndpoint(@Param('endpointId') endpointId: string) {
    const endpoint = await this.webhookService.resumeEndpoint(endpointId);
    if (!endpoint) {
      return { error: 'Endpoint not found' };
    }
    return endpoint;
  }

  @Post('endpoints/:endpointId/test')
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testEndpoint(@Param('endpointId') endpointId: string) {
    return this.webhookService.testEndpoint(endpointId);
  }

  // =================== EVENTS ===================

  @Post('events')
  @ApiOperation({ summary: 'Emit event' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        type: { type: 'string' },
        data: { type: 'object' },
        metadata: { type: 'object' },
      },
      required: ['tenantId', 'type', 'data'],
    },
  })
  @ApiResponse({ status: 201, description: 'Event emitted' })
  async emitEvent(
    @Body('tenantId') tenantId: string,
    @Body('type') type: EventType,
    @Body('data') data: Record<string, any>,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    return this.webhookService.emit(tenantId, type, data, metadata);
  }

  @Get('events/:eventId')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  async getEvent(@Param('eventId') eventId: string) {
    const event = await this.webhookService.getEvent(eventId);
    if (!event) {
      return { error: 'Event not found' };
    }
    return event;
  }

  @Get('events/tenant/:tenantId')
  @ApiOperation({ summary: 'Get events for tenant' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of events' })
  async getEvents(
    @Param('tenantId') tenantId: string,
    @Query('type') type?: EventType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      events: await this.webhookService.getEvents(
        tenantId,
        {
          type,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
        limit ? parseInt(limit) : 100,
      ),
    };
  }

  // =================== DELIVERIES ===================

  @Get('deliveries/:deliveryId')
  @ApiOperation({ summary: 'Get delivery by ID' })
  @ApiResponse({ status: 200, description: 'Delivery details' })
  async getDelivery(@Param('deliveryId') deliveryId: string) {
    const delivery = await this.webhookService.getDelivery(deliveryId);
    if (!delivery) {
      return { error: 'Delivery not found' };
    }
    return delivery;
  }

  @Get('deliveries/tenant/:tenantId')
  @ApiOperation({ summary: 'Get deliveries for tenant' })
  @ApiQuery({ name: 'webhookId', required: false })
  @ApiQuery({ name: 'eventId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of deliveries' })
  async getDeliveries(
    @Param('tenantId') tenantId: string,
    @Query('webhookId') webhookId?: string,
    @Query('eventId') eventId?: string,
    @Query('status') status?: DeliveryStatus,
    @Query('limit') limit?: string,
  ) {
    return {
      deliveries: await this.webhookService.getDeliveries(
        tenantId,
        { webhookId, eventId, status },
        limit ? parseInt(limit) : 100,
      ),
    };
  }

  @Post('deliveries/:deliveryId/retry')
  @ApiOperation({ summary: 'Retry delivery' })
  @ApiResponse({ status: 200, description: 'Delivery retried' })
  async retryDelivery(@Param('deliveryId') deliveryId: string) {
    const delivery = await this.webhookService.retryDelivery(deliveryId);
    if (!delivery) {
      return { error: 'Delivery not found' };
    }
    return delivery;
  }

  // =================== SUBSCRIPTIONS ===================

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create event subscription' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        eventTypes: { type: 'array', items: { type: 'string' } },
        filter: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            operator: { type: 'string' },
            value: {},
          },
        },
      },
      required: ['tenantId', 'name', 'eventTypes'],
    },
  })
  @ApiResponse({ status: 201, description: 'Subscription created' })
  async createSubscription(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('eventTypes') eventTypes: EventType[],
    @Body('filter') filter?: EventFilter,
  ) {
    return this.webhookService.createSubscription(tenantId, name, eventTypes, filter);
  }

  @Get('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  async getSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = await this.webhookService.getSubscription(subscriptionId);
    if (!subscription) {
      return { error: 'Subscription not found' };
    }
    return subscription;
  }

  @Get('subscriptions/tenant/:tenantId')
  @ApiOperation({ summary: 'Get subscriptions for tenant' })
  @ApiResponse({ status: 200, description: 'List of subscriptions' })
  async getSubscriptions(@Param('tenantId') tenantId: string) {
    return { subscriptions: await this.webhookService.getSubscriptions(tenantId) };
  }

  @Delete('subscriptions/:subscriptionId')
  @ApiOperation({ summary: 'Delete subscription' })
  @ApiResponse({ status: 200, description: 'Subscription deleted' })
  async deleteSubscription(@Param('subscriptionId') subscriptionId: string) {
    const success = await this.webhookService.deleteSubscription(subscriptionId);
    return { success };
  }

  @Post('subscriptions/:subscriptionId/toggle')
  @ApiOperation({ summary: 'Toggle subscription' })
  @ApiResponse({ status: 200, description: 'Subscription toggled' })
  async toggleSubscription(@Param('subscriptionId') subscriptionId: string) {
    const subscription = await this.webhookService.toggleSubscription(subscriptionId);
    if (!subscription) {
      return { error: 'Subscription not found' };
    }
    return subscription;
  }

  // =================== SIGNATURE VERIFICATION ===================

  @Post('verify-signature')
  @ApiOperation({ summary: 'Verify webhook signature' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        payload: { type: 'string' },
        signature: { type: 'string' },
        secret: { type: 'string' },
      },
      required: ['payload', 'signature', 'secret'],
    },
  })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifySignature(
    @Body('payload') payload: string,
    @Body('signature') signature: string,
    @Body('secret') secret: string,
  ) {
    const valid = this.webhookService.verifySignature(payload, signature, secret);
    return { valid };
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiResponse({ status: 200, description: 'Webhook stats' })
  async getWebhookStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.webhookService.getWebhookStats(tenantId) };
  }

  // =================== METADATA ===================

  @Get('metadata/event-types')
  @ApiOperation({ summary: 'Get event types' })
  @ApiResponse({ status: 200, description: 'Available event types' })
  async getEventTypes() {
    return { types: this.webhookService.getEventTypes() };
  }

  @Get('metadata/event-categories')
  @ApiOperation({ summary: 'Get event categories' })
  @ApiResponse({ status: 200, description: 'Event categories' })
  async getEventCategories() {
    return { categories: this.webhookService.getEventCategories() };
  }
}
