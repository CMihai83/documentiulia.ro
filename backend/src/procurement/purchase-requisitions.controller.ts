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
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PurchaseRequisitionsService,
  PurchaseRequisition,
  CreateRequisitionDto,
  UpdateRequisitionDto,
  ApprovalActionDto,
  CreateApprovalRuleDto,
  ApprovalRule,
  RequisitionSearchParams,
  RequisitionStatus,
  RequisitionPriority,
  ApprovalQueueItem,
} from './purchase-requisitions.service';

@ApiTags('Purchase Requisitions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement/requisitions')
export class PurchaseRequisitionsController {
  constructor(
    private readonly requisitionsService: PurchaseRequisitionsService,
  ) {}

  // Requisition Management
  @Post()
  @ApiOperation({ summary: 'Create a new purchase requisition' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Requisition created successfully',
  })
  async createRequisition(
    @Request() req: any,
    @Body() dto: CreateRequisitionDto,
  ): Promise<PurchaseRequisition> {
    return this.requisitionsService.createRequisition(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list purchase requisitions' })
  @ApiQuery({ name: 'status', enum: RequisitionStatus, required: false })
  @ApiQuery({ name: 'priority', enum: RequisitionPriority, required: false })
  @ApiQuery({ name: 'requesterId', required: false })
  @ApiQuery({ name: 'approverId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'minAmount', type: Number, required: false })
  @ApiQuery({ name: 'maxAmount', type: Number, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of requisitions',
  })
  async searchRequisitions(
    @Request() req: any,
    @Query('status') status?: RequisitionStatus,
    @Query('priority') priority?: RequisitionPriority,
    @Query('requesterId') requesterId?: string,
    @Query('approverId') approverId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: PurchaseRequisition[]; total: number; page: number; limit: number }> {
    const params: RequisitionSearchParams = {
      status,
      priority,
      requesterId,
      approverId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      minAmount,
      maxAmount,
      search,
      page,
      limit,
    };

    return this.requisitionsService.searchRequisitions(req.user.tenantId, params);
  }

  @Get('my-requisitions')
  @ApiOperation({ summary: 'Get current user requisitions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user requisitions',
  })
  async getMyRequisitions(
    @Request() req: any,
    @Query('status') status?: RequisitionStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: PurchaseRequisition[]; total: number; page: number; limit: number }> {
    return this.requisitionsService.searchRequisitions(req.user.tenantId, {
      requesterId: req.user.id,
      status,
      page,
      limit,
    });
  }

  @Get('approval-queue')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of pending approvals',
  })
  async getApprovalQueue(@Request() req: any): Promise<ApprovalQueueItem[]> {
    return this.requisitionsService.getApprovalQueue(
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get requisition details' })
  @ApiParam({ name: 'id', description: 'Requisition ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requisition details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Requisition not found',
  })
  async getRequisition(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseRequisition> {
    return this.requisitionsService.getRequisition(req.user.tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft requisition' })
  @ApiParam({ name: 'id', description: 'Requisition ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requisition updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update non-draft requisition',
  })
  async updateRequisition(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRequisitionDto,
  ): Promise<PurchaseRequisition> {
    return this.requisitionsService.updateRequisition(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft requisition' })
  @ApiParam({ name: 'id', description: 'Requisition ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requisition deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete non-draft requisition',
  })
  async deleteRequisition(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.requisitionsService.deleteRequisition(req.user.tenantId, id);
    return { success: true };
  }

  // Submission and Approval
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit requisition for approval' })
  @ApiParam({ name: 'id', description: 'Requisition ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requisition submitted for approval',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot submit requisition',
  })
  async submitForApproval(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PurchaseRequisition> {
    return this.requisitionsService.submitForApproval(req.user.tenantId, id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Process approval action on requisition' })
  @ApiParam({ name: 'id', description: 'Requisition ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval action processed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot process approval action',
  })
  async processApproval(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
  ): Promise<PurchaseRequisition> {
    return this.requisitionsService.processApproval(
      req.user.tenantId,
      id,
      req.user.id,
      req.user.name || req.user.email,
      dto,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a requisition' })
  @ApiParam({ name: 'id', description: 'Requisition ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requisition cancelled',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel requisition',
  })
  async cancelRequisition(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<PurchaseRequisition> {
    return this.requisitionsService.cancelRequisition(
      req.user.tenantId,
      id,
      req.user.id,
      req.user.name || req.user.email,
      reason,
    );
  }

  @Post(':id/convert-to-po')
  @ApiOperation({ summary: 'Mark requisition as converted to purchase order' })
  @ApiParam({ name: 'id', description: 'Requisition ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requisition marked as converted',
  })
  async markAsConvertedToPO(
    @Request() req: any,
    @Param('id') id: string,
    @Body('purchaseOrderId') purchaseOrderId: string,
  ): Promise<PurchaseRequisition> {
    return this.requisitionsService.markAsConvertedToPO(
      req.user.tenantId,
      id,
      purchaseOrderId,
    );
  }

  // Analytics
  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get requisition analytics' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Requisition analytics',
  })
  async getRequisitionAnalytics(
    @Request() req: any,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ): Promise<{
    totalRequisitions: number;
    totalAmount: number;
    byStatus: Record<RequisitionStatus, number>;
    byPriority: Record<RequisitionPriority, number>;
    averageApprovalTime: number;
    approvalRate: number;
  }> {
    return this.requisitionsService.getRequisitionAnalytics(
      req.user.tenantId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }
}

// Approval Rules Controller
@ApiTags('Approval Rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement/approval-rules')
export class ApprovalRulesController {
  constructor(
    private readonly requisitionsService: PurchaseRequisitionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new approval rule' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Approval rule created successfully',
  })
  async createApprovalRule(
    @Request() req: any,
    @Body() dto: CreateApprovalRuleDto,
  ): Promise<ApprovalRule> {
    return this.requisitionsService.createApprovalRule(req.user.tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all approval rules' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of approval rules',
  })
  async getApprovalRules(@Request() req: any): Promise<ApprovalRule[]> {
    return this.requisitionsService.getApprovalRules(req.user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an approval rule' })
  @ApiParam({ name: 'id', description: 'Approval rule ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval rule updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Approval rule not found',
  })
  async updateApprovalRule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateApprovalRuleDto>,
  ): Promise<ApprovalRule> {
    return this.requisitionsService.updateApprovalRule(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an approval rule' })
  @ApiParam({ name: 'id', description: 'Approval rule ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Approval rule deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Approval rule not found',
  })
  async deleteApprovalRule(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    await this.requisitionsService.deleteApprovalRule(req.user.tenantId, id);
    return { success: true };
  }
}
