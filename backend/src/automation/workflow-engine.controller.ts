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
  WorkflowEngineService,
  WorkflowStatus,
  WorkflowNode,
  WorkflowEdge,
  WorkflowVariable,
  WorkflowSettings,
  ExecutionStatus,
} from './workflow-engine.service';

@ApiTags('Automation - Workflows')
@Controller('automation/workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowEngineController {
  constructor(private readonly workflowService: WorkflowEngineService) {}

  // =================== WORKFLOWS ===================

  @Post()
  @ApiOperation({ summary: 'Create workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async createWorkflow(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      category?: string;
      tags?: string[];
      nodes?: WorkflowNode[];
      edges?: WorkflowEdge[];
      variables?: WorkflowVariable[];
      settings?: Partial<WorkflowSettings>;
    },
  ) {
    return this.workflowService.createWorkflow({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get workflows' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Workflows list' })
  async getWorkflows(
    @Request() req: any,
    @Query('status') status?: WorkflowStatus,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    const workflows = await this.workflowService.getWorkflows(req.user.tenantId, {
      status,
      category,
      tag,
      search,
    });
    return { workflows, total: workflows.length };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get workflow stats' })
  @ApiResponse({ status: 200, description: 'Workflow statistics' })
  async getStats(@Request() req: any) {
    return this.workflowService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  async getWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflow(id);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated' })
  async updateWorkflow(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      category: string;
      tags: string[];
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      variables: WorkflowVariable[];
      settings: WorkflowSettings;
    }>,
  ) {
    const workflow = await this.workflowService.updateWorkflow(id, body);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted' })
  async deleteWorkflow(@Param('id') id: string) {
    await this.workflowService.deleteWorkflow(id);
    return { success: true };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate workflow' })
  @ApiResponse({ status: 200, description: 'Workflow activated' })
  async activateWorkflow(@Param('id') id: string) {
    try {
      const workflow = await this.workflowService.activateWorkflow(id);
      if (!workflow) {
        return { error: 'Workflow not found' };
      }
      return workflow;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause workflow' })
  @ApiResponse({ status: 200, description: 'Workflow paused' })
  async pauseWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.pauseWorkflow(id);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive workflow' })
  @ApiResponse({ status: 200, description: 'Workflow archived' })
  async archiveWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.archiveWorkflow(id);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate workflow' })
  @ApiResponse({ status: 201, description: 'Workflow duplicated' })
  async duplicateWorkflow(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    const workflow = await this.workflowService.duplicateWorkflow(id, body.name, req.user.id);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  // =================== NODES ===================

  @Post(':id/nodes')
  @ApiOperation({ summary: 'Add node to workflow' })
  @ApiResponse({ status: 201, description: 'Node added' })
  async addNode(
    @Param('id') id: string,
    @Body() node: Omit<WorkflowNode, 'id'>,
  ) {
    const workflow = await this.workflowService.addNode(id, node);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Put(':id/nodes/:nodeId')
  @ApiOperation({ summary: 'Update node' })
  @ApiResponse({ status: 200, description: 'Node updated' })
  async updateNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() updates: Partial<WorkflowNode>,
  ) {
    const workflow = await this.workflowService.updateNode(id, nodeId, updates);
    if (!workflow) {
      return { error: 'Workflow or node not found' };
    }
    return workflow;
  }

  @Delete(':id/nodes/:nodeId')
  @ApiOperation({ summary: 'Remove node' })
  @ApiResponse({ status: 200, description: 'Node removed' })
  async removeNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
  ) {
    const workflow = await this.workflowService.removeNode(id, nodeId);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  // =================== EDGES ===================

  @Post(':id/edges')
  @ApiOperation({ summary: 'Add edge to workflow' })
  @ApiResponse({ status: 201, description: 'Edge added' })
  async addEdge(
    @Param('id') id: string,
    @Body() edge: Omit<WorkflowEdge, 'id'>,
  ) {
    const workflow = await this.workflowService.addEdge(id, edge);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Delete(':id/edges/:edgeId')
  @ApiOperation({ summary: 'Remove edge' })
  @ApiResponse({ status: 200, description: 'Edge removed' })
  async removeEdge(
    @Param('id') id: string,
    @Param('edgeId') edgeId: string,
  ) {
    const workflow = await this.workflowService.removeEdge(id, edgeId);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  // =================== EXECUTIONS ===================

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiResponse({ status: 201, description: 'Execution started' })
  async executeWorkflow(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      trigger: { type: string; data: Record<string, any> };
      input?: Record<string, any>;
    },
  ) {
    try {
      return await this.workflowService.executeWorkflow({
        workflowId: id,
        tenantId: req.user.tenantId,
        trigger: body.trigger,
        input: body.input,
        initiatedBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Executions list' })
  async getExecutions(
    @Param('id') id: string,
    @Query('status') status?: ExecutionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const executions = await this.workflowService.getExecutions(id, {
      status,
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
    const execution = await this.workflowService.getExecution(executionId);
    if (!execution) {
      return { error: 'Execution not found' };
    }
    return execution;
  }

  @Post('executions/:executionId/cancel')
  @ApiOperation({ summary: 'Cancel execution' })
  @ApiResponse({ status: 200, description: 'Execution cancelled' })
  async cancelExecution(@Param('executionId') executionId: string) {
    const execution = await this.workflowService.cancelExecution(executionId);
    if (!execution) {
      return { error: 'Execution not found or not running' };
    }
    return execution;
  }
}
