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
import {
  TriggerManagerService,
  TriggerType,
  TriggerStatus,
  TriggerConfig,
  TriggerFilter,
  DataTransformation,
  TriggerTarget,
} from './trigger-manager.service';

@ApiTags('Automation - Triggers')
@Controller('automation/triggers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TriggerManagerController {
  constructor(private readonly triggerService: TriggerManagerService) {}

  @Post()
  @ApiOperation({ summary: 'Create trigger' })
  @ApiResponse({ status: 201, description: 'Trigger created' })
  async createTrigger(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: TriggerType;
      config: TriggerConfig;
      filters?: TriggerFilter[];
      transformations?: DataTransformation[];
      targets: Omit<TriggerTarget, 'id'>[];
    },
  ) {
    return this.triggerService.createTrigger({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get triggers' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Triggers list' })
  async getTriggers(
    @Request() req: any,
    @Query('type') type?: TriggerType,
    @Query('status') status?: TriggerStatus,
    @Query('search') search?: string,
  ) {
    const triggers = await this.triggerService.getTriggers(req.user.tenantId, {
      type,
      status,
      search,
    });
    return { triggers, total: triggers.length };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get trigger stats' })
  @ApiResponse({ status: 200, description: 'Trigger statistics' })
  async getStats(@Request() req: any) {
    return this.triggerService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trigger details' })
  @ApiResponse({ status: 200, description: 'Trigger details' })
  async getTrigger(@Param('id') id: string) {
    const trigger = await this.triggerService.getTrigger(id);
    if (!trigger) {
      return { error: 'Trigger not found' };
    }
    return trigger;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update trigger' })
  @ApiResponse({ status: 200, description: 'Trigger updated' })
  async updateTrigger(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      config: TriggerConfig;
      filters: TriggerFilter[];
      transformations: DataTransformation[];
      targets: TriggerTarget[];
    }>,
  ) {
    const trigger = await this.triggerService.updateTrigger(id, body);
    if (!trigger) {
      return { error: 'Trigger not found' };
    }
    return trigger;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete trigger' })
  @ApiResponse({ status: 200, description: 'Trigger deleted' })
  async deleteTrigger(@Param('id') id: string) {
    await this.triggerService.deleteTrigger(id);
    return { success: true };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate trigger' })
  @ApiResponse({ status: 200, description: 'Trigger activated' })
  async activateTrigger(@Param('id') id: string) {
    const trigger = await this.triggerService.activateTrigger(id);
    if (!trigger) {
      return { error: 'Trigger not found' };
    }
    return trigger;
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate trigger' })
  @ApiResponse({ status: 200, description: 'Trigger deactivated' })
  async deactivateTrigger(@Param('id') id: string) {
    const trigger = await this.triggerService.deactivateTrigger(id);
    if (!trigger) {
      return { error: 'Trigger not found' };
    }
    return trigger;
  }

  @Post(':id/fire')
  @ApiOperation({ summary: 'Manually fire trigger' })
  @ApiResponse({ status: 200, description: 'Trigger fired' })
  async fireTrigger(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { input: Record<string, any> },
  ) {
    try {
      return await this.triggerService.manualTrigger(id, body.input, req.user.id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':id/webhook-url')
  @ApiOperation({ summary: 'Get webhook URL' })
  @ApiResponse({ status: 200, description: 'Webhook URL' })
  async getWebhookUrl(@Param('id') id: string) {
    const url = await this.triggerService.getWebhookUrl(id);
    if (!url) {
      return { error: 'Webhook not registered' };
    }
    return { url };
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get trigger executions' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Executions list' })
  async getExecutions(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const executions = await this.triggerService.getExecutions(id, {
      status: status as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { executions, total: executions.length };
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiResponse({ status: 200, description: 'Execution details' })
  async getExecution(@Param('executionId') executionId: string) {
    const execution = await this.triggerService.getExecution(executionId);
    if (!execution) {
      return { error: 'Execution not found' };
    }
    return execution;
  }
}
