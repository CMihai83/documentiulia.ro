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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebhookTesterService } from './webhook-tester.service';

@ApiTags('Developer - Webhooks')
@Controller('developer/webhooks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookTesterController {
  constructor(private readonly webhookService: WebhookTesterService) {}

  // =================== ENDPOINTS ===================

  @Post('endpoints')
  @ApiOperation({ summary: 'Create webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Endpoint created' })
  async createEndpoint(
    @Request() req: any,
    @Body() body: {
      url: string;
      name: string;
      description?: string;
      events: string[];
      headers?: Record<string, string>;
    },
  ) {
    return this.webhookService.createEndpoint({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('endpoints')
  @ApiOperation({ summary: 'List webhook endpoints' })
  @ApiResponse({ status: 200, description: 'Webhook endpoints' })
  async getEndpoints(@Request() req: any) {
    const endpoints = await this.webhookService.getEndpoints(req.user.tenantId);
    return { endpoints, total: endpoints.length };
  }

  @Get('endpoints/:id')
  @ApiOperation({ summary: 'Get webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint details' })
  async getEndpoint(@Param('id') id: string) {
    const endpoint = await this.webhookService.getEndpoint(id);
    if (!endpoint) {
      return { error: 'Endpoint not found' };
    }
    return endpoint;
  }

  @Put('endpoints/:id')
  @ApiOperation({ summary: 'Update webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint updated' })
  async updateEndpoint(
    @Param('id') id: string,
    @Body() body: {
      url?: string;
      name?: string;
      description?: string;
      events?: string[];
      headers?: Record<string, string>;
      isActive?: boolean;
    },
  ) {
    return this.webhookService.updateEndpoint(id, body);
  }

  @Delete('endpoints/:id')
  @ApiOperation({ summary: 'Delete webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint deleted' })
  async deleteEndpoint(@Param('id') id: string) {
    await this.webhookService.deleteEndpoint(id);
    return { success: true };
  }

  @Post('endpoints/:id/rotate-secret')
  @ApiOperation({ summary: 'Rotate webhook secret' })
  @ApiResponse({ status: 200, description: 'Secret rotated' })
  async rotateSecret(@Param('id') id: string) {
    return this.webhookService.rotateSecret(id);
  }

  // =================== TESTING ===================

  @Post('test')
  @ApiOperation({ summary: 'Test webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testEndpoint(
    @Body() body: {
      webhookId: string;
      event: string;
      payload?: Record<string, any>;
    },
  ) {
    return this.webhookService.testEndpoint(body);
  }

  @Post('test/url')
  @ApiOperation({ summary: 'Test arbitrary webhook URL' })
  @ApiResponse({ status: 200, description: 'Test result' })
  async testUrl(
    @Body() body: {
      url: string;
      event: string;
      payload: Record<string, any>;
      headers?: Record<string, string>;
    },
  ) {
    return this.webhookService.sendTestPayload(body);
  }

  // =================== DELIVERIES ===================

  @Get('deliveries')
  @ApiOperation({ summary: 'Get webhook deliveries' })
  @ApiQuery({ name: 'webhookId', required: false })
  @ApiQuery({ name: 'event', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Webhook deliveries' })
  async getDeliveries(
    @Request() req: any,
    @Query('webhookId') webhookId?: string,
    @Query('event') event?: string,
    @Query('status') status?: 'pending' | 'success' | 'failed' | 'retrying',
    @Query('limit') limit?: string,
  ) {
    const deliveries = await this.webhookService.getDeliveries({
      tenantId: req.user.tenantId,
      webhookId,
      event,
      status,
      limit: limit ? parseInt(limit) : 50,
    });
    return { deliveries, total: deliveries.length };
  }

  @Get('deliveries/:id')
  @ApiOperation({ summary: 'Get delivery details' })
  @ApiResponse({ status: 200, description: 'Delivery details' })
  async getDelivery(@Param('id') id: string) {
    const delivery = await this.webhookService.getDelivery(id);
    if (!delivery) {
      return { error: 'Delivery not found' };
    }
    return delivery;
  }

  @Get('deliveries/:id/inspect')
  @ApiOperation({ summary: 'Inspect delivery payload' })
  @ApiResponse({ status: 200, description: 'Payload inspection' })
  async inspectDelivery(@Param('id') id: string) {
    return this.webhookService.inspectPayload(id);
  }

  @Post('deliveries/:id/retry')
  @ApiOperation({ summary: 'Retry failed delivery' })
  @ApiResponse({ status: 200, description: 'Retry result' })
  async retryDelivery(@Param('id') id: string) {
    return this.webhookService.retryDelivery(id);
  }

  // =================== EVENT TYPES ===================

  @Get('events')
  @ApiOperation({ summary: 'Get all webhook event types' })
  @ApiResponse({ status: 200, description: 'Event types' })
  async getEventTypes() {
    const events = await this.webhookService.getEventTypes();
    return { events, total: events.length };
  }

  @Get('events/categories')
  @ApiOperation({ summary: 'Get events by category' })
  @ApiResponse({ status: 200, description: 'Events by category' })
  async getEventsByCategory() {
    return this.webhookService.getEventTypesByCategory();
  }

  @Get('events/:event/example')
  @ApiOperation({ summary: 'Get event payload example' })
  @ApiResponse({ status: 200, description: 'Payload example' })
  async getEventExample(@Param('event') event: string) {
    const decodedEvent = decodeURIComponent(event);
    const example = await this.webhookService.getEventPayloadExample(decodedEvent);
    if (!example) {
      return { error: 'Event not found' };
    }
    return { event: decodedEvent, example };
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get webhook statistics' })
  @ApiResponse({ status: 200, description: 'Webhook stats' })
  async getStats(@Request() req: any) {
    return this.webhookService.getStats(req.user.tenantId);
  }
}
