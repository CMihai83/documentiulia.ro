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
import { AssetDisposalService, DisposalMethod, DisposalStatus, ApprovalLevel } from './asset-disposal.service';
import { AssetManagementService } from './asset-management.service';

@ApiTags('Asset Management - Disposal')
@Controller('assets/disposal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssetDisposalController {
  constructor(
    private readonly disposalService: AssetDisposalService,
    private readonly assetService: AssetManagementService,
  ) {}

  // =================== DISPOSAL REQUESTS ===================

  @Post('requests')
  @ApiOperation({ summary: 'Create disposal request' })
  @ApiResponse({ status: 201, description: 'Disposal request created' })
  async createDisposalRequest(
    @Request() req: any,
    @Body() body: {
      assetId: string;
      method: DisposalMethod;
      reason: string;
      reasonDetails?: string;
      estimatedProceeds?: number;
      disposalDate?: string;
      buyerId?: string;
      buyerName?: string;
      buyerContact?: string;
      environmentalConsiderations?: string;
      notes?: string;
    },
  ) {
    const asset = await this.assetService.getAsset(body.assetId);
    if (!asset) {
      return { error: 'Asset not found' };
    }

    return this.disposalService.createDisposalRequest({
      tenantId: req.user.tenantId,
      asset,
      method: body.method,
      reason: body.reason,
      reasonDetails: body.reasonDetails,
      estimatedProceeds: body.estimatedProceeds,
      disposalDate: body.disposalDate ? new Date(body.disposalDate) : undefined,
      buyerId: body.buyerId,
      buyerName: body.buyerName,
      buyerContact: body.buyerContact,
      environmentalConsiderations: body.environmentalConsiderations,
      notes: body.notes,
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.email,
    });
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get disposal requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'assetId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Disposal requests list' })
  async getDisposalRequests(
    @Request() req: any,
    @Query('status') status?: DisposalStatus,
    @Query('method') method?: DisposalMethod,
    @Query('assetId') assetId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const requests = await this.disposalService.getDisposalRequests(req.user.tenantId, {
      status,
      method,
      assetId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { requests, total: requests.length };
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get disposal request details' })
  @ApiResponse({ status: 200, description: 'Disposal request details' })
  async getDisposalRequest(@Param('id') id: string) {
    const request = await this.disposalService.getDisposalRequest(id);
    if (!request) {
      return { error: 'Disposal request not found' };
    }

    const approvals = await this.disposalService.getDisposalApprovals(id);
    const certificates = await this.disposalService.getDisposalCertificates(id);

    return { ...request, approvals, certificates };
  }

  @Put('requests/:id')
  @ApiOperation({ summary: 'Update disposal request' })
  @ApiResponse({ status: 200, description: 'Disposal request updated' })
  async updateDisposalRequest(
    @Param('id') id: string,
    @Body() body: {
      method?: DisposalMethod;
      reason?: string;
      reasonDetails?: string;
      estimatedProceeds?: number;
      disposalDate?: string;
      buyerId?: string;
      buyerName?: string;
      buyerContact?: string;
      environmentalConsiderations?: string;
      notes?: string;
    },
  ) {
    try {
      const updateData: any = { ...body };
      if (body.disposalDate) {
        updateData.disposalDate = new Date(body.disposalDate);
      }

      const request = await this.disposalService.updateDisposalRequest(id, updateData);
      if (!request) {
        return { error: 'Disposal request not found' };
      }
      return request;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post('requests/:id/submit')
  @ApiOperation({ summary: 'Submit disposal request for approval' })
  @ApiResponse({ status: 200, description: 'Request submitted for approval' })
  async submitForApproval(@Param('id') id: string) {
    const request = await this.disposalService.submitForApproval(id);
    if (!request) {
      return { error: 'Disposal request not found or not in draft status' };
    }
    return request;
  }

  @Post('requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel disposal request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  async cancelDisposalRequest(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const request = await this.disposalService.cancelDisposal(id, body.reason);
    if (!request) {
      return { error: 'Disposal request not found or already completed' };
    }
    return request;
  }

  // =================== APPROVALS ===================

  @Get('approvals/pending')
  @ApiOperation({ summary: 'Get pending approvals' })
  @ApiResponse({ status: 200, description: 'Pending approvals list' })
  async getPendingApprovals(@Request() req: any) {
    const pending = await this.disposalService.getPendingApprovals(
      req.user.tenantId,
      req.user.id,
    );
    return { pending, total: pending.length };
  }

  @Post('requests/:id/approve')
  @ApiOperation({ summary: 'Approve disposal request' })
  @ApiResponse({ status: 200, description: 'Request approved' })
  async approveDisposal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { comments?: string },
  ) {
    const approval = await this.disposalService.approveDisposal(id, {
      approverId: req.user.id,
      approverName: req.user.name || req.user.email,
      comments: body.comments,
    });
    if (!approval) {
      return { error: 'No pending approval found for this request' };
    }
    return approval;
  }

  @Post('requests/:id/reject')
  @ApiOperation({ summary: 'Reject disposal request' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  async rejectDisposal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { comments: string },
  ) {
    if (!body.comments) {
      return { error: 'Rejection comments are required' };
    }

    const approval = await this.disposalService.rejectDisposal(id, {
      approverId: req.user.id,
      approverName: req.user.name || req.user.email,
      comments: body.comments,
    });
    if (!approval) {
      return { error: 'No pending approval found for this request' };
    }
    return approval;
  }

  // =================== DISPOSAL EXECUTION ===================

  @Post('requests/:id/start')
  @ApiOperation({ summary: 'Start disposal process' })
  @ApiResponse({ status: 200, description: 'Disposal process started' })
  async startDisposal(@Param('id') id: string) {
    const request = await this.disposalService.startDisposal(id);
    if (!request) {
      return { error: 'Disposal request not found or not approved' };
    }
    return request;
  }

  @Post('requests/:id/data-wipe')
  @ApiOperation({ summary: 'Record data wipe completion' })
  @ApiResponse({ status: 200, description: 'Data wipe recorded' })
  async recordDataWipe(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      certificateNumber: string;
      wipeMethod: string;
      documentPath?: string;
    },
  ) {
    const request = await this.disposalService.recordDataWipe(id, {
      certificateNumber: body.certificateNumber,
      wipedBy: req.user.id,
      wipeMethod: body.wipeMethod,
      documentPath: body.documentPath,
    });
    if (!request) {
      return { error: 'Disposal request not found' };
    }
    return request;
  }

  @Post('requests/:id/complete')
  @ApiOperation({ summary: 'Complete disposal' })
  @ApiResponse({ status: 200, description: 'Disposal completed' })
  async completeDisposal(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      actualProceeds?: number;
      certificateNumber?: string;
      buyerId?: string;
      buyerName?: string;
      notes?: string;
    },
  ) {
    try {
      const request = await this.disposalService.completeDisposal(id, {
        actualProceeds: body.actualProceeds,
        certificateNumber: body.certificateNumber,
        buyerId: body.buyerId,
        buyerName: body.buyerName,
        notes: body.notes,
        completedBy: req.user.id,
      });
      if (!request) {
        return { error: 'Disposal request not found or not in correct status' };
      }
      return request;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== WORKFLOWS ===================

  @Post('workflows')
  @ApiOperation({ summary: 'Create disposal workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async createWorkflow(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      conditions: {
        minValue?: number;
        maxValue?: number;
        categories?: string[];
        methods?: DisposalMethod[];
      };
      approvalLevels: Array<{
        level: ApprovalLevel;
        approvers: string[];
        requireAll: boolean;
        escalationDays?: number;
      }>;
    },
  ) {
    return this.disposalService.createWorkflow({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Get disposal workflows' })
  @ApiResponse({ status: 200, description: 'Workflows list' })
  async getWorkflows(@Request() req: any) {
    const workflows = await this.disposalService.getWorkflows(req.user.tenantId);
    return { workflows, total: workflows.length };
  }

  @Put('workflows/:id')
  @ApiOperation({ summary: 'Update disposal workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated' })
  async updateWorkflow(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      conditions?: {
        minValue?: number;
        maxValue?: number;
        categories?: string[];
        methods?: DisposalMethod[];
      };
      approvalLevels?: Array<{
        level: ApprovalLevel;
        approvers: string[];
        requireAll: boolean;
        escalationDays?: number;
      }>;
      isActive?: boolean;
    },
  ) {
    const workflow = await this.disposalService.updateWorkflow(id, body);
    if (!workflow) {
      return { error: 'Workflow not found' };
    }
    return workflow;
  }

  // =================== STATISTICS ===================

  @Get('summary')
  @ApiOperation({ summary: 'Get disposal summary' })
  @ApiResponse({ status: 200, description: 'Disposal summary' })
  async getDisposalSummary(@Request() req: any) {
    return this.disposalService.getDisposalSummary(req.user.tenantId);
  }
}
