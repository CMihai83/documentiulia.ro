import {
  Controller,
  Get,
  Post,
  Put,
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
  DocumentWorkflowService,
  WorkflowStatus,
  StepType,
  StepResult,
  WorkflowTemplate,
} from './document-workflow.service';

@ApiTags('Document Generation - Workflow')
@Controller('documents/workflow')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentWorkflowController {
  constructor(private readonly workflowService: DocumentWorkflowService) {}

  // =================== WORKFLOW TEMPLATES ===================

  @Post('templates')
  @ApiOperation({ summary: 'Create workflow template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      category?: string;
      steps: WorkflowTemplate['steps'];
      defaultDueInDays?: number;
      escalation?: WorkflowTemplate['escalation'];
    },
  ) {
    return this.workflowService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get workflow templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const templates = await this.workflowService.getTemplates(req.user.tenantId, {
      category,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.workflowService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  // =================== WORKFLOWS ===================

  @Post('workflows')
  @ApiOperation({ summary: 'Create document workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async createWorkflow(
    @Request() req: any,
    @Body() body: {
      documentId: string;
      documentName: string;
      templateId?: string;
      name: string;
      description?: string;
      steps?: Array<{
        name: string;
        type: StepType;
        order: number;
        config: Record<string, any>;
        assignees?: string[];
        assigneeRoles?: string[];
        dueInHours?: number;
        required: boolean;
        nextSteps?: string[];
      }>;
      variables?: Record<string, any>;
      dueInDays?: number;
    },
  ) {
    return this.workflowService.createWorkflow({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Get workflows' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'documentId', required: false })
  @ApiQuery({ name: 'createdBy', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Workflows list' })
  async getWorkflows(
    @Request() req: any,
    @Query('status') status?: WorkflowStatus,
    @Query('documentId') documentId?: string,
    @Query('createdBy') createdBy?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const workflows = await this.workflowService.getWorkflows(req.user.tenantId, {
      status,
      documentId,
      createdBy,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { workflows, total: workflows.length };
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Get workflow details' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  async getWorkflow(@Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflow(id);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Post('workflows/:id/start')
  @ApiOperation({ summary: 'Start workflow' })
  @ApiResponse({ status: 200, description: 'Workflow started' })
  async startWorkflow(@Request() req: any, @Param('id') id: string) {
    try {
      return await this.workflowService.startWorkflow(id, req.user.id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('workflows/:id/pause')
  @ApiOperation({ summary: 'Pause workflow' })
  @ApiResponse({ status: 200, description: 'Workflow paused' })
  async pauseWorkflow(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    try {
      return await this.workflowService.pauseWorkflow(id, req.user.id, body.reason);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('workflows/:id/resume')
  @ApiOperation({ summary: 'Resume workflow' })
  @ApiResponse({ status: 200, description: 'Workflow resumed' })
  async resumeWorkflow(@Request() req: any, @Param('id') id: string) {
    try {
      return await this.workflowService.resumeWorkflow(id, req.user.id);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('workflows/:id/cancel')
  @ApiOperation({ summary: 'Cancel workflow' })
  @ApiResponse({ status: 200, description: 'Workflow cancelled' })
  async cancelWorkflow(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    try {
      return await this.workflowService.cancelWorkflow(id, req.user.id, body.reason);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== STEPS ===================

  @Post('workflows/:workflowId/steps/:stepId/complete')
  @ApiOperation({ summary: 'Complete workflow step' })
  @ApiResponse({ status: 200, description: 'Step completed' })
  async completeStep(
    @Request() req: any,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @Body() body: {
      decision: 'approved' | 'rejected' | 'needs_revision';
      comment?: string;
      attachments?: string[];
      metadata?: Record<string, any>;
    },
  ) {
    try {
      const result: StepResult = {
        decision: body.decision,
        comment: body.comment,
        attachments: body.attachments,
        metadata: body.metadata,
      };
      return await this.workflowService.completeStep(workflowId, stepId, req.user.id, result);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== TASKS ===================

  @Get('tasks/my')
  @ApiOperation({ summary: 'Get my tasks' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'My tasks list' })
  async getMyTasks(
    @Request() req: any,
    @Query('status') status?: 'pending' | 'in_progress' | 'completed' | 'overdue',
    @Query('type') type?: StepType,
    @Query('limit') limit?: string,
  ) {
    const tasks = await this.workflowService.getMyTasks(req.user.id, {
      status,
      type,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { tasks, total: tasks.length };
  }

  // =================== HISTORY ===================

  @Get('workflows/:id/history')
  @ApiOperation({ summary: 'Get workflow history' })
  @ApiResponse({ status: 200, description: 'Workflow history' })
  async getWorkflowHistory(@Param('id') id: string) {
    const history = await this.workflowService.getWorkflowHistory(id);
    return { history, total: history.length };
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get workflow stats' })
  @ApiResponse({ status: 200, description: 'Workflow statistics' })
  async getStats(@Request() req: any) {
    return this.workflowService.getStats(req.user.tenantId);
  }
}
