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
  BudgetTrackingService,
  TransactionType,
  TransactionStatus,
  CommitmentRecord,
  SpendingLimit,
  SpendingAlert,
} from './budget-tracking.service';

@ApiTags('Budget Management - Tracking')
@Controller('budgets/tracking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetTrackingController {
  constructor(private readonly trackingService: BudgetTrackingService) {}

  // =================== TRANSACTIONS ===================

  @Post('transactions')
  @ApiOperation({ summary: 'Record budget transaction' })
  @ApiResponse({ status: 201, description: 'Transaction recorded' })
  async recordTransaction(
    @Request() req: any,
    @Body() body: {
      budgetId: string;
      lineItemId: string;
      type: TransactionType;
      amount: number;
      description: string;
      reference?: string;
      vendorId?: string;
      vendorName?: string;
      invoiceNumber?: string;
      poNumber?: string;
      transactionDate: string;
      costCenterId?: string;
      costCenterName?: string;
      projectId?: string;
      projectName?: string;
      glAccountCode?: string;
      attachments?: string[];
      notes?: string;
    },
  ) {
    return this.trackingService.recordTransaction({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.email,
      ...body,
      transactionDate: new Date(body.transactionDate),
    });
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get budget transactions' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiQuery({ name: 'lineItemId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transactions list' })
  async getTransactions(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
    @Query('lineItemId') lineItemId?: string,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('vendorId') vendorId?: string,
    @Query('limit') limit?: string,
  ) {
    const transactions = await this.trackingService.getTransactions(req.user.tenantId, {
      budgetId,
      lineItemId,
      type,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      vendorId,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { transactions, total: transactions.length };
  }

  @Post('transactions/:id/approve')
  @ApiOperation({ summary: 'Approve transaction' })
  @ApiResponse({ status: 200, description: 'Transaction approved' })
  async approveTransaction(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const transaction = await this.trackingService.approveTransaction(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!transaction) {
      return { error: 'Transaction not found or not pending' };
    }
    return transaction;
  }

  @Post('transactions/:id/post')
  @ApiOperation({ summary: 'Post transaction to budget' })
  @ApiResponse({ status: 200, description: 'Transaction posted' })
  async postTransaction(@Param('id') id: string) {
    const transaction = await this.trackingService.postTransaction(id);
    if (!transaction) {
      return { error: 'Transaction not found or not approved' };
    }
    return transaction;
  }

  @Post('transactions/:id/reverse')
  @ApiOperation({ summary: 'Reverse transaction' })
  @ApiResponse({ status: 200, description: 'Transaction reversed' })
  async reverseTransaction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const transaction = await this.trackingService.reverseTransaction(
      id,
      body.reason,
      req.user.id,
    );
    if (!transaction) {
      return { error: 'Transaction not found or not posted' };
    }
    return transaction;
  }

  // =================== TRANSFERS ===================

  @Post('transfers')
  @ApiOperation({ summary: 'Request budget transfer' })
  @ApiResponse({ status: 201, description: 'Transfer requested' })
  async requestTransfer(
    @Request() req: any,
    @Body() body: {
      fromBudgetId: string;
      fromLineItemId: string;
      toBudgetId: string;
      toLineItemId: string;
      amount: number;
      reason: string;
    },
  ) {
    try {
      return await this.trackingService.requestTransfer({
        tenantId: req.user.tenantId,
        createdBy: req.user.id,
        createdByName: req.user.name || req.user.email,
        ...body,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('transfers')
  @ApiOperation({ summary: 'Get budget transfers' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transfers list' })
  async getTransfers(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
    @Query('status') status?: 'pending' | 'approved' | 'completed' | 'rejected',
    @Query('limit') limit?: string,
  ) {
    const transfers = await this.trackingService.getTransfers(req.user.tenantId, {
      budgetId,
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { transfers, total: transfers.length };
  }

  @Post('transfers/:id/approve')
  @ApiOperation({ summary: 'Approve budget transfer' })
  @ApiResponse({ status: 200, description: 'Transfer approved' })
  async approveTransfer(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const transfer = await this.trackingService.approveTransfer(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!transfer) {
      return { error: 'Transfer not found or not pending' };
    }
    return transfer;
  }

  @Post('transfers/:id/execute')
  @ApiOperation({ summary: 'Execute budget transfer' })
  @ApiResponse({ status: 200, description: 'Transfer executed' })
  async executeTransfer(@Param('id') id: string) {
    const transfer = await this.trackingService.executeTransfer(id);
    if (!transfer) {
      return { error: 'Transfer not found or not approved' };
    }
    return transfer;
  }

  // =================== COMMITMENTS ===================

  @Post('commitments')
  @ApiOperation({ summary: 'Create commitment' })
  @ApiResponse({ status: 201, description: 'Commitment created' })
  async createCommitment(
    @Request() req: any,
    @Body() body: {
      budgetId: string;
      lineItemId: string;
      type: CommitmentRecord['type'];
      reference: string;
      description: string;
      vendorId?: string;
      vendorName?: string;
      amount: number;
      expectedDate?: string;
    },
  ) {
    return this.trackingService.createCommitment({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
      expectedDate: body.expectedDate ? new Date(body.expectedDate) : undefined,
    });
  }

  @Get('commitments')
  @ApiOperation({ summary: 'Get commitments' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiQuery({ name: 'lineItemId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Commitments list' })
  async getCommitments(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
    @Query('lineItemId') lineItemId?: string,
    @Query('status') status?: CommitmentRecord['status'],
    @Query('limit') limit?: string,
  ) {
    const commitments = await this.trackingService.getCommitments(req.user.tenantId, {
      budgetId,
      lineItemId,
      status,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { commitments, total: commitments.length };
  }

  @Post('commitments/:id/fulfill')
  @ApiOperation({ summary: 'Fulfill commitment' })
  @ApiResponse({ status: 200, description: 'Commitment fulfilled' })
  async fulfillCommitment(
    @Param('id') id: string,
    @Body() body: { actualAmount: number },
  ) {
    const commitment = await this.trackingService.fulfillCommitment(id, body.actualAmount);
    if (!commitment) {
      return { error: 'Commitment not found or already fulfilled' };
    }
    return commitment;
  }

  // =================== SPENDING LIMITS ===================

  @Post('limits')
  @ApiOperation({ summary: 'Set spending limit' })
  @ApiResponse({ status: 201, description: 'Limit set' })
  async setSpendingLimit(
    @Request() req: any,
    @Body() body: {
      budgetId?: string;
      lineItemId?: string;
      userId?: string;
      departmentId?: string;
      limitType: SpendingLimit['limitType'];
      amount: number;
      warningThreshold?: number;
    },
  ) {
    return this.trackingService.setSpendingLimit({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('limits')
  @ApiOperation({ summary: 'Get spending limits' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiResponse({ status: 200, description: 'Limits list' })
  async getSpendingLimits(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
    @Query('userId') userId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    const limits = await this.trackingService.getSpendingLimits(req.user.tenantId, {
      budgetId,
      userId,
      departmentId,
    });
    return { limits, total: limits.length };
  }

  // =================== ALERTS ===================

  @Get('alerts')
  @ApiOperation({ summary: 'Get spending alerts' })
  @ApiQuery({ name: 'budgetId', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'acknowledged', required: false })
  @ApiResponse({ status: 200, description: 'Alerts list' })
  async getAlerts(
    @Request() req: any,
    @Query('budgetId') budgetId?: string,
    @Query('severity') severity?: SpendingAlert['severity'],
    @Query('acknowledged') acknowledged?: string,
  ) {
    const alerts = await this.trackingService.getAlerts(req.user.tenantId, {
      budgetId,
      severity,
      acknowledged: acknowledged ? acknowledged === 'true' : undefined,
    });
    return { alerts, total: alerts.length };
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const alert = await this.trackingService.acknowledgeAlert(id, req.user.id);
    if (!alert) {
      return { error: 'Alert not found' };
    }
    return alert;
  }

  // =================== STATISTICS ===================

  @Get('statistics')
  @ApiOperation({ summary: 'Get tracking statistics' })
  @ApiResponse({ status: 200, description: 'Tracking statistics' })
  async getStatistics(@Request() req: any) {
    return this.trackingService.getTrackingStatistics(req.user.tenantId);
  }
}
