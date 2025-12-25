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
  ActionExecutorService,
  ActionCategory,
  ActionStatus,
  ExecutionContext,
} from './action-executor.service';

@ApiTags('Automation - Actions')
@Controller('automation/actions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActionExecutorController {
  constructor(private readonly actionService: ActionExecutorService) {}

  // =================== ACTION DEFINITIONS ===================

  @Get('definitions')
  @ApiOperation({ summary: 'Get action definitions' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Action definitions list' })
  async getDefinitions(@Query('category') category?: ActionCategory) {
    const definitions = await this.actionService.getDefinitions(category);
    return { definitions, total: definitions.length };
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get action definition details' })
  @ApiResponse({ status: 200, description: 'Action definition details' })
  async getDefinition(@Param('id') id: string) {
    const definition = await this.actionService.getDefinition(id);
    if (!definition) {
      return { error: 'Action definition not found' };
    }
    return definition;
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get action categories' })
  @ApiResponse({ status: 200, description: 'Action categories' })
  async getCategories() {
    const categories: ActionCategory[] = [
      'communication',
      'data',
      'integration',
      'workflow',
      'system',
      'custom',
    ];
    return { categories };
  }

  // =================== ACTION INSTANCES ===================

  @Post('instances')
  @ApiOperation({ summary: 'Create action instance' })
  @ApiResponse({ status: 201, description: 'Action instance created' })
  async createInstance(
    @Request() req: any,
    @Body() body: {
      definitionId: string;
      name: string;
      config: Record<string, any>;
      credentials?: string;
    },
  ) {
    try {
      return await this.actionService.createInstance({
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
        ...body,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('instances')
  @ApiOperation({ summary: 'Get action instances' })
  @ApiQuery({ name: 'definitionId', required: false })
  @ApiResponse({ status: 200, description: 'Action instances list' })
  async getInstances(
    @Request() req: any,
    @Query('definitionId') definitionId?: string,
  ) {
    const instances = await this.actionService.getInstances(
      req.user.tenantId,
      definitionId,
    );
    return { instances, total: instances.length };
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get action instance details' })
  @ApiResponse({ status: 200, description: 'Action instance details' })
  async getInstance(@Param('id') id: string) {
    const instance = await this.actionService.getInstance(id);
    if (!instance) {
      return { error: 'Action instance not found' };
    }
    return instance;
  }

  @Put('instances/:id')
  @ApiOperation({ summary: 'Update action instance' })
  @ApiResponse({ status: 200, description: 'Action instance updated' })
  async updateInstance(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      config: Record<string, any>;
      credentials: string;
      isActive: boolean;
    }>,
  ) {
    const instance = await this.actionService.updateInstance(id, body);
    if (!instance) {
      return { error: 'Action instance not found' };
    }
    return instance;
  }

  @Delete('instances/:id')
  @ApiOperation({ summary: 'Delete action instance' })
  @ApiResponse({ status: 200, description: 'Action instance deleted' })
  async deleteInstance(@Param('id') id: string) {
    await this.actionService.deleteInstance(id);
    return { success: true };
  }

  // =================== EXECUTION ===================

  @Post('execute')
  @ApiOperation({ summary: 'Execute action' })
  @ApiResponse({ status: 200, description: 'Execution result' })
  async execute(
    @Request() req: any,
    @Body() body: {
      definitionId: string;
      instanceId?: string;
      input: Record<string, any>;
      context?: Partial<ExecutionContext>;
    },
  ) {
    try {
      const result = await this.actionService.execute({
        definitionId: body.definitionId,
        instanceId: body.instanceId,
        tenantId: req.user.tenantId,
        input: body.input,
        context: {
          ...body.context,
          userId: req.user.id,
        },
      });
      return result;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('executions/:id/retry')
  @ApiOperation({ summary: 'Retry failed execution' })
  @ApiResponse({ status: 200, description: 'Retry result' })
  async retryExecution(@Param('id') id: string) {
    try {
      const result = await this.actionService.retryExecution(id);
      if (!result) {
        return { error: 'Execution not found' };
      }
      return result;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('executions')
  @ApiOperation({ summary: 'Get action executions' })
  @ApiQuery({ name: 'definitionId', required: false })
  @ApiQuery({ name: 'instanceId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Executions list' })
  async getExecutions(
    @Request() req: any,
    @Query('definitionId') definitionId?: string,
    @Query('instanceId') instanceId?: string,
    @Query('status') status?: ActionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const executions = await this.actionService.getExecutions(req.user.tenantId, {
      definitionId,
      instanceId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { executions, total: executions.length };
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiResponse({ status: 200, description: 'Execution details' })
  async getExecution(@Param('id') id: string) {
    const execution = await this.actionService.getExecution(id);
    if (!execution) {
      return { error: 'Execution not found' };
    }
    return execution;
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get action stats' })
  @ApiResponse({ status: 200, description: 'Action statistics' })
  async getStats(@Request() req: any) {
    return this.actionService.getStats(req.user.tenantId);
  }
}
