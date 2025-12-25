import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ExpenseManagementService } from './expense-management.service';

@ApiTags('expense-management')
@Controller('expense-management')
export class ExpenseManagementController {
  constructor(private readonly expenseService: ExpenseManagementService) {}

  // Dashboard
  @Get('dashboard')
  @ApiOperation({ summary: 'Get expense management dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard() {
    return this.expenseService.getDashboard();
  }

  // Categories
  @Get('categories')
  @ApiOperation({ summary: 'Get expense categories' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories(@Query('activeOnly') activeOnly?: boolean) {
    return this.expenseService.getCategories(activeOnly);
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async getCategoryById(@Param('id') id: string) {
    const category = await this.expenseService.getCategoryById(id);
    if (!category) {
      return { error: 'Category not found', statusCode: 404 };
    }
    return category;
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create expense category' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'code'],
      properties: {
        name: { type: 'string' },
        code: { type: 'string' },
        description: { type: 'string' },
        taxDeductible: { type: 'boolean' },
        defaultVatRate: { type: 'number' },
        accountCode: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(
    @Body() body: {
      name: string;
      code: string;
      description?: string;
      taxDeductible?: boolean;
      defaultVatRate?: number;
      accountCode?: string;
    },
  ) {
    return this.expenseService.createCategory(body);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update expense category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      taxDeductible?: boolean;
      defaultVatRate?: number;
      accountCode?: string;
      active?: boolean;
    },
  ) {
    const category = await this.expenseService.updateCategory(id, body);
    if (!category) {
      return { error: 'Category not found', statusCode: 404 };
    }
    return category;
  }

  // Expenses
  @Get('expenses')
  @ApiOperation({ summary: 'Get expenses' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'submitted', 'approved', 'rejected', 'paid', 'reimbursed'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of expenses' })
  async getExpenses(
    @Query('tenantId') tenantId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.expenseService.getExpenses(
      tenantId,
      employeeId,
      categoryId,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    );
  }

  @Get('expenses/:id')
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense details' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  async getExpenseById(@Param('id') id: string) {
    const expense = await this.expenseService.getExpenseById(id);
    if (!expense) {
      return { error: 'Expense not found', statusCode: 404 };
    }
    return expense;
  }

  @Post('expenses')
  @ApiOperation({ summary: 'Create expense' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['categoryId', 'amount', 'description', 'expenseDate'],
      properties: {
        categoryId: { type: 'string' },
        employeeId: { type: 'string' },
        employeeName: { type: 'string' },
        amount: { type: 'number' },
        description: { type: 'string' },
        expenseDate: { type: 'string', format: 'date' },
        paymentMethod: { type: 'string', enum: ['cash', 'card', 'bank_transfer', 'other'] },
        vendorName: { type: 'string' },
        vendorCui: { type: 'string' },
        receiptNumber: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Expense created' })
  async createExpense(
    @Body() body: {
      categoryId: string;
      employeeId?: string;
      employeeName?: string;
      amount: number;
      description: string;
      expenseDate: string;
      paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other';
      vendorName?: string;
      vendorCui?: string;
      receiptNumber?: string;
      tags?: string[];
    },
  ) {
    return this.expenseService.createExpense({
      ...body,
      expenseDate: new Date(body.expenseDate),
    });
  }

  @Put('expenses/:id')
  @ApiOperation({ summary: 'Update expense' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense updated' })
  async updateExpense(
    @Param('id') id: string,
    @Body() body: {
      categoryId?: string;
      amount?: number;
      description?: string;
      paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other';
      vendorName?: string;
      tags?: string[];
    },
  ) {
    const expense = await this.expenseService.updateExpense(id, body);
    if (!expense) {
      return { error: 'Expense not found', statusCode: 404 };
    }
    return expense;
  }

  @Post('expenses/:id/submit')
  @ApiOperation({ summary: 'Submit expense for approval' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense submitted' })
  @HttpCode(HttpStatus.OK)
  async submitExpense(@Param('id') id: string) {
    const expense = await this.expenseService.submitExpense(id);
    if (!expense) {
      return { error: 'Expense not found or not in draft status', statusCode: 400 };
    }
    return expense;
  }

  @Post('expenses/:id/approve')
  @ApiOperation({ summary: 'Approve expense' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['approverId'],
      properties: {
        approverId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Expense approved' })
  @HttpCode(HttpStatus.OK)
  async approveExpense(
    @Param('id') id: string,
    @Body() body: { approverId: string },
  ) {
    const expense = await this.expenseService.approveExpense(id, body.approverId);
    if (!expense) {
      return { error: 'Expense not found or not in submitted status', statusCode: 400 };
    }
    return expense;
  }

  @Post('expenses/:id/reject')
  @ApiOperation({ summary: 'Reject expense' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Expense rejected' })
  @HttpCode(HttpStatus.OK)
  async rejectExpense(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const expense = await this.expenseService.rejectExpense(id, body.reason);
    if (!expense) {
      return { error: 'Expense not found or not in submitted status', statusCode: 400 };
    }
    return expense;
  }

  @Delete('expenses/:id')
  @ApiOperation({ summary: 'Delete expense' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense deleted' })
  @HttpCode(HttpStatus.OK)
  async deleteExpense(@Param('id') id: string) {
    const result = await this.expenseService.deleteExpense(id);
    return { success: result, id };
  }

  // Expense Reports
  @Get('reports')
  @ApiOperation({ summary: 'Get expense reports' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of expense reports' })
  async getReports(
    @Query('tenantId') tenantId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.expenseService.getReports(tenantId, employeeId, status, limit, offset);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get expense report by ID' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report details' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReportById(@Param('id') id: string) {
    const report = await this.expenseService.getReportById(id);
    if (!report) {
      return { error: 'Report not found', statusCode: 404 };
    }
    return report;
  }

  @Post('reports')
  @ApiOperation({ summary: 'Create expense report' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['employeeId', 'employeeName', 'title', 'expenses'],
      properties: {
        employeeId: { type: 'string' },
        employeeName: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        expenses: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Report created' })
  async createReport(
    @Body() body: {
      employeeId: string;
      employeeName: string;
      title: string;
      description?: string;
      expenses: string[];
    },
  ) {
    return this.expenseService.createReport(body);
  }

  @Post('reports/:id/submit')
  @ApiOperation({ summary: 'Submit expense report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report submitted' })
  @HttpCode(HttpStatus.OK)
  async submitReport(@Param('id') id: string) {
    const report = await this.expenseService.submitReport(id);
    if (!report) {
      return { error: 'Report not found or not in draft status', statusCode: 400 };
    }
    return report;
  }

  @Post('reports/:id/approve')
  @ApiOperation({ summary: 'Approve expense report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['approverId'],
      properties: {
        approverId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Report approved' })
  @HttpCode(HttpStatus.OK)
  async approveReport(
    @Param('id') id: string,
    @Body() body: { approverId: string },
  ) {
    const report = await this.expenseService.approveReport(id, body.approverId);
    if (!report) {
      return { error: 'Report not found or not in submitted status', statusCode: 400 };
    }
    return report;
  }

  // Policies
  @Get('policies')
  @ApiOperation({ summary: 'Get expense policies' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiResponse({ status: 200, description: 'List of policies' })
  async getPolicies(@Query('tenantId') tenantId?: string) {
    return this.expenseService.getPolicies(tenantId);
  }

  @Post('policies')
  @ApiOperation({ summary: 'Create expense policy' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'description'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        categoryId: { type: 'string' },
        maxAmount: { type: 'number' },
        requiresReceipt: { type: 'boolean' },
        requiresApproval: { type: 'boolean' },
        approvalThreshold: { type: 'number' },
        autoApproveBelow: { type: 'number' },
        allowedPaymentMethods: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Policy created' })
  async createPolicy(
    @Body() body: {
      name: string;
      description: string;
      categoryId?: string;
      maxAmount?: number;
      requiresReceipt?: boolean;
      requiresApproval?: boolean;
      approvalThreshold?: number;
      autoApproveBelow?: number;
      allowedPaymentMethods?: string[];
    },
  ) {
    return this.expenseService.createPolicy(body);
  }

  // Analytics
  @Get('analytics')
  @ApiOperation({ summary: 'Get expense analytics' })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Analytics data' })
  async getAnalytics(
    @Query('tenantId') tenantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expenseService.getAnalytics(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // OCR Receipt Processing
  @Post('receipts/process')
  @ApiOperation({ summary: 'Process receipt with OCR' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['receiptData'],
      properties: {
        receiptData: { type: 'string', description: 'Base64 encoded receipt image' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Extracted expense data' })
  async processReceipt(@Body() body: { receiptData: string }) {
    return this.expenseService.processReceipt(body.receiptData);
  }

  // Export
  @Get('export')
  @ApiOperation({ summary: 'Export expenses' })
  @ApiQuery({ name: 'format', required: false, enum: ['xlsx', 'csv', 'pdf'] })
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Export download URL' })
  async exportExpenses(
    @Query('format') format?: 'xlsx' | 'csv' | 'pdf',
    @Query('tenantId') tenantId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.expenseService.exportExpenses(
      format || 'xlsx',
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // =================== APPROVAL WORKFLOW ENDPOINTS ===================

  @Get('approval/workflows')
  @ApiOperation({ summary: 'Get approval workflows (Fluxuri de aprobare)' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'List of approval workflows' })
  async getApprovalWorkflows(@Query('tenantId') tenantId: string) {
    return this.expenseService.getApprovalWorkflows(tenantId);
  }

  @Post('approval/workflows')
  @ApiOperation({ summary: 'Create approval workflow (Creare flux de aprobare)' })
  @ApiResponse({ status: 201, description: 'Workflow created' })
  async createApprovalWorkflow(
    @Body() body: {
      tenantId: string;
      name: string;
      description?: string;
      levels: Array<{
        level: number;
        name: string;
        approverType: 'manager' | 'department_head' | 'finance' | 'ceo' | 'specific' | 'any';
        approverId?: string;
        approverName?: string;
        amountThreshold?: number;
        categoryIds?: string[];
        timeoutHours?: number;
      }>;
      autoApproveRules?: Array<{
        id: string;
        type: 'amount_below' | 'category' | 'vendor' | 'employee_level';
        threshold?: number;
        categoryIds?: string[];
        vendorCuis?: string[];
        description: string;
      }>;
    },
  ) {
    return this.expenseService.createApprovalWorkflow(body);
  }

  @Post('expenses/:id/route-approval')
  @ApiOperation({ summary: 'Route expense for approval (Trimite pentru aprobare)' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Expense routed for approval' })
  @HttpCode(HttpStatus.OK)
  async routeForApproval(
    @Param('id') id: string,
    @Body() body: { submitterId: string },
  ) {
    return this.expenseService.routeForApproval(id, body.submitterId);
  }

  @Post('expenses/:id/approval-decision')
  @ApiOperation({ summary: 'Process approval decision (Decizie aprobare)' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Decision processed' })
  @HttpCode(HttpStatus.OK)
  async processApprovalDecision(
    @Param('id') id: string,
    @Body() body: {
      approverId: string;
      decision: 'approve' | 'reject' | 'request_changes';
      comment?: string;
    },
  ) {
    return this.expenseService.processApprovalDecision(
      id,
      body.approverId,
      body.decision,
      body.comment,
    );
  }

  @Get('approval/pending')
  @ApiOperation({ summary: 'Get pending approvals for user (Aprobări în așteptare)' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Pending approvals' })
  async getPendingApprovals(
    @Query('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.expenseService.getPendingApprovalsForUser(userId, tenantId);
  }

  @Get('expenses/:id/approval-history')
  @ApiOperation({ summary: 'Get approval history (Istoric aprobări)' })
  @ApiParam({ name: 'id', description: 'Expense ID' })
  @ApiResponse({ status: 200, description: 'Approval history' })
  async getApprovalHistory(@Param('id') id: string) {
    return this.expenseService.getApprovalHistory(id);
  }

  @Post('approval/bulk-approve')
  @ApiOperation({ summary: 'Bulk approve expenses (Aprobare în masă)' })
  @ApiResponse({ status: 200, description: 'Bulk approval results' })
  @HttpCode(HttpStatus.OK)
  async bulkApprove(
    @Body() body: {
      expenseIds: string[];
      approverId: string;
      comment?: string;
    },
  ) {
    return this.expenseService.bulkApprove(
      body.expenseIds,
      body.approverId,
      body.comment,
    );
  }

  @Post('approval/delegation')
  @ApiOperation({ summary: 'Create approval delegation (Delegare aprobare)' })
  @ApiResponse({ status: 201, description: 'Delegation created' })
  async createDelegation(
    @Body() body: {
      delegatorId: string;
      delegateeId: string;
      delegateeName: string;
      startDate: string;
      endDate: string;
      reason?: string;
      tenantId: string;
    },
  ) {
    return this.expenseService.createDelegation({
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    });
  }

  @Get('approval/delegation/:userId')
  @ApiOperation({ summary: 'Get active delegation (Delegare activă)' })
  @ApiParam({ name: 'userId', description: 'Delegator user ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiResponse({ status: 200, description: 'Active delegation or null' })
  async getActiveDelegation(
    @Param('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.expenseService.getActiveDelegation(userId, tenantId);
  }
}
