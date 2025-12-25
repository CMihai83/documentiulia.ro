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
  BudgetApprovalService,
  ApprovalAction,
  ApprovalPriority,
  ApprovalStatus,
  ApprovalStep,
  AmountThreshold,
  EscalationRule,
  ReminderSettings,
  AutoApprovalRule,
} from './budget-approval.service';

@ApiTags('Budget Management - Approval')
@Controller('budgets/approval')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetApprovalController {
  constructor(private readonly approvalService: BudgetApprovalService) {}

  // =================== WORKFLOWS ===================

  @Post('workflows')
  @ApiOperation({ summary: 'Create approval workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async createWorkflow(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      budgetTypes?: string[];
      amountThresholds?: AmountThreshold[];
      steps: Omit<ApprovalStep, 'id'>[];
      escalationRules?: EscalationRule[];
      reminderSettings?: ReminderSettings;
      autoApprovalRules?: AutoApprovalRule[];
      isDefault?: boolean;
    },
  ) {
    return this.approvalService.createWorkflow({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Get approval workflows' })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'budgetType', required: false })
  @ApiResponse({ status: 200, description: 'Workflows list' })
  async getWorkflows(
    @Request() req: any,
    @Query('isActive') isActive?: string,
    @Query('budgetType') budgetType?: string,
  ) {
    const workflows = await this.approvalService.getWorkflows(req.user.tenantId, {
      isActive: isActive ? isActive === 'true' : undefined,
      budgetType,
    });
    return { workflows, total: workflows.length };
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow details' })
  async getWorkflow(@Param('id') id: string) {
    const workflow = await this.approvalService.getWorkflow(id);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  @Put('workflows/:id')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated' })
  async updateWorkflow(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      steps?: ApprovalStep[];
      isActive?: boolean;
      isDefault?: boolean;
    },
  ) {
    const workflow = await this.approvalService.updateWorkflow(id, body);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  // =================== APPROVAL REQUESTS ===================

  @Post('requests')
  @ApiOperation({ summary: 'Submit budget for approval' })
  @ApiResponse({ status: 201, description: 'Approval request submitted' })
  async submitForApproval(
    @Request() req: any,
    @Body() body: {
      budgetId: string;
      requestType: 'new_budget' | 'amendment' | 'transfer' | 'increase' | 'reallocation';
      requestedAmount: number;
      justification: string;
      attachments?: string[];
      priority?: ApprovalPriority;
      workflowId?: string;
    },
  ) {
    try {
      return await this.approvalService.submitForApproval({
        tenantId: req.user.tenantId,
        submittedBy: req.user.id,
        submittedByName: req.user.name || req.user.email,
        ...body,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get approval requests' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'submittedBy', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Approval requests list' })
  async getRequests(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
    @Query('status') status?: ApprovalStatus,
    @Query('submittedBy') submittedBy?: string,
    @Query('limit') limit?: string,
  ) {
    const requests = await this.approvalService.getApprovalRequests(req.user.tenantId, {
      budgetId,
      status,
      submittedBy,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { requests, total: requests.length };
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get approval request by ID' })
  @ApiResponse({ status: 200, description: 'Approval request details' })
  async getRequest(@Param('id') id: string) {
    const request = await this.approvalService.getApprovalRequest(id);
    if (!request) {
      return { error: 'Request not found' };
    }

    const tasks = await this.approvalService.getApprovalTasksForRequest(id);
    return { ...request, tasks };
  }

  @Post('requests/:id/action')
  @ApiOperation({ summary: 'Process approval action' })
  @ApiResponse({ status: 200, description: 'Action processed' })
  async processAction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      action: ApprovalAction;
      comments?: string;
      delegateTo?: string;
      delegateToName?: string;
    },
  ) {
    const request = await this.approvalService.processApprovalAction({
      requestId: id,
      action: body.action,
      actionBy: req.user.id,
      actionByName: req.user.name || req.user.email,
      comments: body.comments,
      delegateTo: body.delegateTo,
      delegateToName: body.delegateToName,
    });

    if (!request) {
      return { error: 'Request not found or action not allowed' };
    }

    return request;
  }

  // =================== MY TASKS ===================

  @Get('tasks/my')
  @ApiOperation({ summary: 'Get my approval tasks' })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({ status: 200, description: 'My approval tasks' })
  async getMyTasks(
    @Request() req: any,
    @Query('status') status?: 'pending' | 'completed',
  ) {
    const tasks = await this.approvalService.getMyApprovalTasks(
      req.user.id,
      req.user.tenantId,
      status,
    );
    return { tasks, total: tasks.length };
  }

  // =================== DELEGATIONS ===================

  @Post('delegations')
  @ApiOperation({ summary: 'Create delegation' })
  @ApiResponse({ status: 201, description: 'Delegation created' })
  async createDelegation(
    @Request() req: any,
    @Body() body: {
      delegateId: string;
      delegateName: string;
      startDate: string;
      endDate?: string;
      budgetTypes?: string[];
      maxAmount?: number;
      reason?: string;
    },
  ) {
    return this.approvalService.createDelegation({
      tenantId: req.user.tenantId,
      delegatorId: req.user.id,
      delegatorName: req.user.name || req.user.email,
      delegateId: body.delegateId,
      delegateName: body.delegateName,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      budgetTypes: body.budgetTypes,
      maxAmount: body.maxAmount,
      reason: body.reason,
    });
  }

  @Get('delegations')
  @ApiOperation({ summary: 'Get delegations' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200, description: 'Delegations list' })
  async getDelegations(
    @Request() req: any,
    @Query('userId') userId?: string,
  ) {
    const delegations = await this.approvalService.getDelegations(
      req.user.tenantId,
      userId || req.user.id,
    );
    return { delegations, total: delegations.length };
  }

  @Delete('delegations/:id')
  @ApiOperation({ summary: 'Revoke delegation' })
  @ApiResponse({ status: 200, description: 'Delegation revoked' })
  async revokeDelegation(@Param('id') id: string) {
    const success = await this.approvalService.revokeDelegation(id);
    if (!success) {
      return { error: 'Delegation not found' };
    }
    return { success };
  }

  // =================== COMMENTS ===================

  @Post('requests/:id/comments')
  @ApiOperation({ summary: 'Add comment to request' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { comment: string; isPrivate?: boolean },
  ) {
    const comment = await this.approvalService.addComment({
      requestId: id,
      userId: req.user.id,
      userName: req.user.name || req.user.email,
      comment: body.comment,
      isPrivate: body.isPrivate,
    });

    if (!comment) {
      return { error: 'Request not found' };
    }

    return comment;
  }

  @Get('requests/:id/comments')
  @ApiOperation({ summary: 'Get request comments' })
  @ApiQuery({ name: 'includePrivate', required: false })
  @ApiResponse({ status: 200, description: 'Comments list' })
  async getComments(
    @Param('id') id: string,
    @Query('includePrivate') includePrivate?: string,
  ) {
    const comments = await this.approvalService.getComments(
      id,
      includePrivate === 'true',
    );
    return { comments, total: comments.length };
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get approval statistics' })
  @ApiResponse({ status: 200, description: 'Approval statistics' })
  async getStatistics(@Request() req: any) {
    return this.approvalService.getApprovalStatistics(req.user.tenantId);
  }
}
