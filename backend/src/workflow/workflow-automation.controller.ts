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
  WorkflowAutomationService,
  WorkflowCategory,
} from './workflow-automation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Workflow Automation')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowAutomationController {
  constructor(private readonly workflowService: WorkflowAutomationService) {}

  // =================== WORKFLOW CRUD ===================

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async createWorkflow(@Body() dto: any) {
    return this.workflowService.createWorkflow(dto);
  }

  @Get(':workflowId')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  async getWorkflow(@Param('workflowId') workflowId: string) {
    const workflow = await this.workflowService.getWorkflow(workflowId);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get all workflows for a tenant' })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  async getWorkflows(@Param('tenantId') tenantId: string) {
    return { workflows: await this.workflowService.listWorkflows(tenantId) };
  }

  @Put(':workflowId')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated' })
  async updateWorkflow(
    @Param('workflowId') workflowId: string,
    @Body() updates: Record<string, any>,
  ) {
    const workflow = await this.workflowService.updateWorkflow(workflowId, updates);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Delete(':workflowId')
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted' })
  async deleteWorkflow(@Param('workflowId') workflowId: string) {
    await this.workflowService.deleteWorkflow(workflowId);
    return { success: true };
  }

  // =================== WORKFLOW STATUS ===================

  @Post(':workflowId/activate')
  @ApiOperation({ summary: 'Activate a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow activated' })
  async activateWorkflow(@Param('workflowId') workflowId: string) {
    const workflow = await this.workflowService.activateWorkflow(workflowId);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Post(':workflowId/deactivate')
  @ApiOperation({ summary: 'Deactivate a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deactivated' })
  async deactivateWorkflow(@Param('workflowId') workflowId: string) {
    const workflow = await this.workflowService.deactivateWorkflow(workflowId);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  // =================== EXECUTION ===================

  @Post(':workflowId/start')
  @ApiOperation({ summary: 'Start a workflow instance' })
  @ApiResponse({ status: 200, description: 'Workflow instance started' })
  async startWorkflow(
    @Param('workflowId') workflowId: string,
    @Body() dto: any,
  ) {
    try {
      return await this.workflowService.startWorkflow({
        workflowId,
        startedBy: dto.startedBy || dto.initiatedBy,
        variables: dto.variables || dto.triggerData || {},
        priority: dto.priority,
        dueDate: dto.dueDate,
      });
    } catch (error) {
      return { error: error.message };
    }
  }

  @Get('instances/:instanceId')
  @ApiOperation({ summary: 'Get instance details' })
  @ApiResponse({ status: 200, description: 'Instance details' })
  async getInstance(@Param('instanceId') instanceId: string) {
    const instance = await this.workflowService.getInstance(instanceId);
    if (!instance) {
      return { error: 'Instance not found' };
    }
    return instance;
  }

  @Get('tenant/:tenantId/instances')
  @ApiOperation({ summary: 'List workflow instances' })
  @ApiResponse({ status: 200, description: 'List of instances' })
  async listInstances(@Param('tenantId') tenantId: string) {
    return { instances: await this.workflowService.listInstances(tenantId) };
  }

  @Post('instances/:instanceId/pause')
  @ApiOperation({ summary: 'Pause a workflow instance' })
  @ApiResponse({ status: 200, description: 'Instance paused' })
  async pauseInstance(@Param('instanceId') instanceId: string) {
    const instance = await this.workflowService.pauseInstance(instanceId);
    return instance;
  }

  @Post('instances/:instanceId/resume')
  @ApiOperation({ summary: 'Resume a workflow instance' })
  @ApiResponse({ status: 200, description: 'Instance resumed' })
  async resumeInstance(@Param('instanceId') instanceId: string) {
    const instance = await this.workflowService.resumeInstance(instanceId);
    return instance;
  }

  @Post('instances/:instanceId/cancel')
  @ApiOperation({ summary: 'Cancel a workflow instance' })
  @ApiResponse({ status: 200, description: 'Instance cancelled' })
  async cancelInstance(
    @Param('instanceId') instanceId: string,
    @Body('reason') reason: string,
  ) {
    const instance = await this.workflowService.cancelInstance(instanceId, reason || 'Cancelled by user');
    return instance;
  }

  // =================== TEMPLATES ===================

  @Get('templates/list')
  @ApiOperation({ summary: 'Get workflow templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getTemplates(@Query('category') category?: WorkflowCategory) {
    return { templates: await this.workflowService.getTemplates(category) };
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = await this.workflowService.getTemplate(templateId);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Post('templates/:templateId/create')
  @ApiOperation({ summary: 'Create workflow from template' })
  @ApiResponse({ status: 201, description: 'Workflow created from template' })
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: any,
  ) {
    const workflow = await this.workflowService.createWorkflowFromTemplate(
      templateId,
      dto.organizationId,
      dto.createdBy,
      dto.customizations,
    );
    if (!workflow) {
      return { error: 'Template not found' };
    }
    return workflow;
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get workflow statistics' })
  @ApiResponse({ status: 200, description: 'Workflow stats' })
  async getWorkflowStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.workflowService.getWorkflowStats(tenantId) };
  }

  // =================== APPROVALS ===================

  @Get('approvals/pending/:userId')
  @ApiOperation({ summary: 'Get pending approvals for user' })
  @ApiResponse({ status: 200, description: 'List of pending approvals' })
  async getPendingApprovals(
    @Param('userId') userId: string,
    @Query('organizationId') organizationId: string,
  ) {
    return { approvals: await this.workflowService.getPendingApprovals(userId, organizationId) };
  }

  @Post('approvals/:approvalId/approve')
  @ApiOperation({ summary: 'Approve a step' })
  @ApiResponse({ status: 200, description: 'Step approved' })
  async approveStep(
    @Param('approvalId') approvalId: string,
    @Body('approvedBy') approvedBy: string,
    @Body('comments') comments?: string,
  ) {
    return await this.workflowService.approveStep(approvalId, approvedBy, comments);
  }

  @Post('approvals/:approvalId/reject')
  @ApiOperation({ summary: 'Reject a step' })
  @ApiResponse({ status: 200, description: 'Step rejected' })
  async rejectStep(
    @Param('approvalId') approvalId: string,
    @Body('rejectedBy') rejectedBy: string,
    @Body('reason') reason: string,
  ) {
    return await this.workflowService.rejectStep(approvalId, rejectedBy, reason);
  }
}
