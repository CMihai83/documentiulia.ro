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
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Webhooks')
@Controller('companies/:companyId/webhooks')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('events')
  @ApiOperation({ summary: 'Get available webhook events' })
  @ApiResponse({ status: 200, description: 'Available events returned' })
  getAvailableEvents() {
    return this.webhooksService.getAvailableEvents();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  async create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhooksService.create(companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhooks' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Webhooks returned' })
  async findAll(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.webhooksService.findAll(companyId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook returned' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.webhooksService.findOne(companyId, id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update webhook' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(companyId, id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  async remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.webhooksService.remove(companyId, id, user.id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get webhook delivery logs' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Logs returned' })
  async getLogs(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.webhooksService.getLogs(companyId, id, user.id, limit);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Send test webhook' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Webhook ID' })
  @ApiResponse({ status: 200, description: 'Test webhook sent' })
  async test(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.webhooksService.test(companyId, id, user.id);
  }

  @Post('logs/:logId/retry')
  @ApiOperation({ summary: 'Retry failed webhook delivery' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'logId', description: 'Log entry ID' })
  @ApiResponse({ status: 200, description: 'Webhook retried' })
  async retry(
    @Param('companyId') companyId: string,
    @Param('logId') logId: string,
    @CurrentUser() user: any,
  ) {
    return this.webhooksService.retry(companyId, logId, user.id);
  }
}
