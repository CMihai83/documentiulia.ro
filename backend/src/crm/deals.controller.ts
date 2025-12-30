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
  DealsService,
  Deal,
  PipelineStage,
  DealTask,
} from './deals.service';

@ApiTags('CRM - Deals')
@Controller('crm/deals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  // =================== PIPELINES ===================

  @Post('pipelines')
  @ApiOperation({ summary: 'Create pipeline' })
  @ApiResponse({ status: 201, description: 'Pipeline created' })
  async createPipeline(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      stages: Omit<PipelineStage, 'id'>[];
      currency?: string;
      isDefault?: boolean;
    },
  ) {
    return this.dealsService.createPipeline({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('pipelines')
  @ApiOperation({ summary: 'Get pipelines' })
  @ApiResponse({ status: 200, description: 'Pipelines list' })
  async getPipelines(@Request() req: any) {
    const pipelines = await this.dealsService.getPipelines(req.user.tenantId);
    return { pipelines, total: pipelines.length };
  }

  @Get('pipelines/default')
  @ApiOperation({ summary: 'Get default pipeline' })
  @ApiResponse({ status: 200, description: 'Default pipeline' })
  async getDefaultPipeline(@Request() req: any) {
    const pipeline = await this.dealsService.getDefaultPipeline(req.user.tenantId);
    if (!pipeline) {
      return { error: 'No default pipeline found' };
    }
    return pipeline;
  }

  @Get('pipelines/:id')
  @ApiOperation({ summary: 'Get pipeline details' })
  @ApiResponse({ status: 200, description: 'Pipeline details' })
  async getPipeline(@Param('id') id: string) {
    const pipeline = await this.dealsService.getPipeline(id);
    if (!pipeline) {
      return { error: 'Pipeline not found' };
    }
    return pipeline;
  }

  @Put('pipelines/:id')
  @ApiOperation({ summary: 'Update pipeline' })
  @ApiResponse({ status: 200, description: 'Pipeline updated' })
  async updatePipeline(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      isDefault: boolean;
      stages: PipelineStage[];
    }>,
  ) {
    const pipeline = await this.dealsService.updatePipeline(id, body);
    if (!pipeline) {
      return { error: 'Pipeline not found' };
    }
    return pipeline;
  }

  @Delete('pipelines/:id')
  @ApiOperation({ summary: 'Delete pipeline' })
  @ApiResponse({ status: 200, description: 'Pipeline deleted' })
  async deletePipeline(@Param('id') id: string) {
    await this.dealsService.deletePipeline(id);
    return { success: true };
  }

  @Post('pipelines/:id/stages')
  @ApiOperation({ summary: 'Add stage to pipeline' })
  @ApiResponse({ status: 201, description: 'Stage added' })
  async addStage(
    @Param('id') id: string,
    @Body() body: Omit<PipelineStage, 'id' | 'order'>,
  ) {
    const pipeline = await this.dealsService.addStage(id, body);
    if (!pipeline) {
      return { error: 'Pipeline not found' };
    }
    return pipeline;
  }

  @Put('pipelines/:id/stages/:stageId')
  @ApiOperation({ summary: 'Update stage' })
  @ApiResponse({ status: 200, description: 'Stage updated' })
  async updateStage(
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() body: Partial<PipelineStage>,
  ) {
    const pipeline = await this.dealsService.updateStage(id, stageId, body);
    if (!pipeline) {
      return { error: 'Pipeline or stage not found' };
    }
    return pipeline;
  }

  @Post('pipelines/:id/stages/reorder')
  @ApiOperation({ summary: 'Reorder stages' })
  @ApiResponse({ status: 200, description: 'Stages reordered' })
  async reorderStages(
    @Param('id') id: string,
    @Body() body: { stageIds: string[] },
  ) {
    const pipeline = await this.dealsService.reorderStages(id, body.stageIds);
    if (!pipeline) {
      return { error: 'Pipeline not found' };
    }
    return pipeline;
  }

  @Delete('pipelines/:id/stages/:stageId')
  @ApiOperation({ summary: 'Delete stage' })
  @ApiResponse({ status: 200, description: 'Stage deleted' })
  async deleteStage(
    @Param('id') id: string,
    @Param('stageId') stageId: string,
  ) {
    const pipeline = await this.dealsService.deleteStage(id, stageId);
    if (!pipeline) {
      return { error: 'Pipeline or stage not found' };
    }
    return pipeline;
  }

  // =================== DEALS ===================

  @Post()
  @ApiOperation({ summary: 'Create deal' })
  @ApiResponse({ status: 201, description: 'Deal created' })
  async createDeal(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      pipelineId?: string;
      stageId?: string;
      amount: number;
      currency?: string;
      probability?: number;
      expectedCloseDate?: string;
      contactId?: string;
      companyId?: string;
      collaborators?: string[];
      tags?: string[];
      customFields?: Record<string, any>;
      priority?: Deal['priority'];
      source?: string;
      campaign?: string;
    },
  ) {
    return this.dealsService.createDeal({
      tenantId: req.user.tenantId,
      ownerId: req.user.id,
      name: body.name,
      description: body.description,
      pipelineId: body.pipelineId || 'default-pipeline',
      stageId: body.stageId,
      amount: body.amount,
      currency: body.currency,
      probability: body.probability,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
      contactId: body.contactId,
      companyId: body.companyId,
      collaborators: body.collaborators,
      tags: body.tags,
      customFields: body.customFields,
      priority: body.priority,
      source: body.source,
      campaign: body.campaign,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get deals' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'pipelineId', required: false })
  @ApiQuery({ name: 'stageId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Deals list' })
  async getDeals(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('stageId') stageId?: string,
    @Query('status') status?: Deal['status'],
    @Query('ownerId') ownerId?: string,
    @Query('priority') priority?: Deal['priority'],
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.dealsService.getDeals(req.user.tenantId, {
      search,
      pipelineId,
      stageId,
      status,
      ownerId,
      priority,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal details' })
  @ApiResponse({ status: 200, description: 'Deal details' })
  async getDeal(@Param('id') id: string) {
    const deal = await this.dealsService.getDeal(id);
    if (!deal) {
      return { error: 'Deal not found' };
    }
    return deal;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update deal' })
  @ApiResponse({ status: 200, description: 'Deal updated' })
  async updateDeal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<Pick<Deal,
      'name' | 'description' | 'amount' | 'probability' |
      'contactId' | 'companyId' | 'ownerId' | 'collaborators' |
      'tags' | 'customFields' | 'priority'
    > & { expectedCloseDate?: string }>,
  ) {
    const updates = {
      ...body,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
    };
    const deal = await this.dealsService.updateDeal(id, updates, req.user.id);
    if (!deal) {
      return { error: 'Deal not found' };
    }
    return deal;
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move deal to stage' })
  @ApiResponse({ status: 200, description: 'Deal moved' })
  async moveDeal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { stageId: string },
  ) {
    const deal = await this.dealsService.moveDealToStage(id, body.stageId, req.user.id);
    if (!deal) {
      return { error: 'Deal not found' };
    }
    return deal;
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close deal' })
  @ApiResponse({ status: 200, description: 'Deal closed' })
  async closeDeal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { outcome: 'won' | 'lost'; lostReason?: string },
  ) {
    const deal = await this.dealsService.closeDeal(
      id,
      body.outcome,
      req.user.id,
      body.lostReason,
    );
    if (!deal) {
      return { error: 'Deal not found' };
    }
    return deal;
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen deal' })
  @ApiResponse({ status: 200, description: 'Deal reopened' })
  async reopenDeal(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const deal = await this.dealsService.reopenDeal(id, req.user.id);
    if (!deal) {
      return { error: 'Deal not found' };
    }
    return deal;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete deal' })
  @ApiResponse({ status: 200, description: 'Deal deleted' })
  async deleteDeal(@Param('id') id: string) {
    await this.dealsService.deleteDeal(id);
    return { success: true };
  }

  // =================== ACTIVITIES ===================

  @Post(':id/activities')
  @ApiOperation({ summary: 'Log activity' })
  @ApiResponse({ status: 201, description: 'Activity logged' })
  async logActivity(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      type: 'note' | 'call' | 'email' | 'meeting';
      description: string;
    },
  ) {
    return this.dealsService.recordActivity({
      dealId: id,
      type: body.type,
      description: body.description,
      createdBy: req.user.id,
    });
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get deal activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Deal activities' })
  async getActivities(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const activities = await this.dealsService.getActivities(
      id,
      limit ? parseInt(limit) : 50,
    );
    return { activities, total: activities.length };
  }

  // =================== TASKS ===================

  @Post(':id/tasks')
  @ApiOperation({ summary: 'Create task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  async createTask(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      title: string;
      description?: string;
      type: DealTask['type'];
      dueDate: string;
      priority?: DealTask['priority'];
      assigneeId?: string;
    },
  ) {
    return this.dealsService.createTask({
      dealId: id,
      title: body.title,
      description: body.description,
      type: body.type,
      dueDate: new Date(body.dueDate),
      priority: body.priority,
      assigneeId: body.assigneeId,
      createdBy: req.user.id,
    });
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get deal tasks' })
  @ApiResponse({ status: 200, description: 'Deal tasks' })
  async getTasks(@Param('id') id: string) {
    const tasks = await this.dealsService.getTasks(id);
    return { tasks, total: tasks.length };
  }

  @Post('tasks/:taskId/complete')
  @ApiOperation({ summary: 'Complete task' })
  @ApiResponse({ status: 200, description: 'Task completed' })
  async completeTask(
    @Request() req: any,
    @Param('taskId') taskId: string,
  ) {
    const task = await this.dealsService.completeTask(taskId, req.user.id);
    if (!task) {
      return { error: 'Task not found' };
    }
    return task;
  }

  @Delete('tasks/:taskId')
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async deleteTask(@Param('taskId') taskId: string) {
    await this.dealsService.deleteTask(taskId);
    return { success: true };
  }

  // =================== FORECAST & STATS ===================

  @Get('forecast/overview')
  @ApiOperation({ summary: 'Get sales forecast' })
  @ApiQuery({ name: 'pipelineId', required: false })
  @ApiResponse({ status: 200, description: 'Sales forecast' })
  async getForecast(
    @Request() req: any,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.dealsService.getForecast(req.user.tenantId, pipelineId);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get deals stats' })
  @ApiResponse({ status: 200, description: 'Deals stats' })
  async getStats(@Request() req: any) {
    return this.dealsService.getStats(req.user.tenantId);
  }
}
