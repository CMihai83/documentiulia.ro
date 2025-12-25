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
import { BankReconciliationService } from './bank-reconciliation.service';

@ApiTags('bank-reconciliation')
@Controller('bank-reconciliation')
export class BankReconciliationController {
  constructor(private readonly reconciliationService: BankReconciliationService) {}

  // Dashboard
  @Get('dashboard')
  @ApiOperation({ summary: 'Get reconciliation dashboard overview' })
  @ApiQuery({ name: 'accountId', required: false, description: 'Filter by bank account ID' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@Query('accountId') accountId?: string) {
    return this.reconciliationService.getDashboard(accountId);
  }

  // Bank Accounts
  @Get('accounts')
  @ApiOperation({ summary: 'Get all connected bank accounts' })
  @ApiResponse({ status: 200, description: 'List of bank accounts' })
  async getAccounts() {
    return this.reconciliationService.getAccounts();
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Get bank account by ID' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Bank account details' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getAccountById(@Param('id') id: string) {
    const account = await this.reconciliationService.getAccountById(id);
    if (!account) {
      return { error: 'Account not found', statusCode: 404 };
    }
    return account;
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Add a new bank account' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bankName: { type: 'string' },
        accountNumber: { type: 'string' },
        iban: { type: 'string' },
        currency: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Account created' })
  async addAccount(
    @Body() body: {
      bankName: string;
      accountNumber: string;
      iban: string;
      currency?: string;
    },
  ) {
    return this.reconciliationService.addAccount(body);
  }

  @Post('accounts/:id/sync')
  @ApiOperation({ summary: 'Sync bank account transactions (PSD2)' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Sync result' })
  async syncAccount(@Param('id') id: string) {
    return this.reconciliationService.syncAccount(id);
  }

  // Transactions
  @Get('transactions')
  @ApiOperation({ summary: 'Get bank transactions' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'matched', 'unmatched', 'disputed'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  async getTransactions(
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.reconciliationService.getTransactions(
      accountId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      status,
      limit,
      offset,
    );
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  async getTransactionById(@Param('id') id: string) {
    const transaction = await this.reconciliationService.getTransactionById(id);
    if (!transaction) {
      return { error: 'Transaction not found', statusCode: 404 };
    }
    return transaction;
  }

  @Get('transactions/:id/suggestions')
  @ApiOperation({ summary: 'Get AI-powered match suggestions for a transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Match suggestions' })
  async getSuggestions(@Param('id') id: string) {
    return this.reconciliationService.getSuggestions(id);
  }

  @Post('transactions/:id/match')
  @ApiOperation({ summary: 'Match transaction to invoice/payment' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['matchType', 'matchId'],
      properties: {
        matchType: { type: 'string', enum: ['invoice', 'payment', 'expense'] },
        matchId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Match result' })
  async matchTransaction(
    @Param('id') id: string,
    @Body() body: { matchType: 'invoice' | 'payment' | 'expense'; matchId: string },
  ) {
    return this.reconciliationService.matchTransaction(id, body.matchType, body.matchId);
  }

  @Post('transactions/:id/unmatch')
  @ApiOperation({ summary: 'Remove match from transaction' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Unmatch result' })
  @HttpCode(HttpStatus.OK)
  async unmatchTransaction(@Param('id') id: string) {
    return this.reconciliationService.unmatchTransaction(id);
  }

  @Post('transactions/:id/dispute')
  @ApiOperation({ summary: 'Mark transaction as disputed' })
  @ApiParam({ name: 'id', description: 'Transaction ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Dispute result' })
  async disputeTransaction(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.reconciliationService.disputeTransaction(id, body.reason);
  }

  // Auto-matching
  @Post('accounts/:id/auto-match')
  @ApiOperation({ summary: 'Run AI-powered auto-matching for account' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Auto-match result' })
  async autoMatchTransactions(@Param('id') id: string) {
    return this.reconciliationService.autoMatchTransactions(id);
  }

  // Reconciliation Sessions
  @Get('sessions')
  @ApiOperation({ summary: 'Get reconciliation sessions' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async getSessions(@Query('accountId') accountId?: string) {
    return this.reconciliationService.getSessions(accountId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get reconciliation session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session details' })
  async getSessionById(@Param('id') id: string) {
    const session = await this.reconciliationService.getSessionById(id);
    if (!session) {
      return { error: 'Session not found', statusCode: 404 };
    }
    return session;
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new reconciliation session' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['accountId', 'startDate', 'endDate'],
      properties: {
        accountId: { type: 'string' },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @Body() body: { accountId: string; startDate: string; endDate: string },
  ) {
    return this.reconciliationService.createSession(
      body.accountId,
      new Date(body.startDate),
      new Date(body.endDate),
    );
  }

  @Post('sessions/:id/complete')
  @ApiOperation({ summary: 'Mark reconciliation session as complete' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session completed' })
  async completeSession(@Param('id') id: string) {
    return this.reconciliationService.completeSession(id);
  }

  @Get('sessions/:id/export')
  @ApiOperation({ summary: 'Export reconciliation report' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiQuery({ name: 'format', required: false, enum: ['pdf', 'xlsx', 'csv'] })
  @ApiResponse({ status: 200, description: 'Export download URL' })
  async exportReport(
    @Param('id') id: string,
    @Query('format') format?: 'pdf' | 'xlsx' | 'csv',
  ) {
    return this.reconciliationService.exportReport(id, format || 'pdf');
  }

  // Reconciliation Rules
  @Get('rules')
  @ApiOperation({ summary: 'Get reconciliation rules' })
  @ApiResponse({ status: 200, description: 'List of rules' })
  async getRules() {
    return this.reconciliationService.getRules();
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create a new reconciliation rule' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'type', 'field', 'action'],
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['exact_match', 'partial_match', 'amount_range', 'pattern'] },
        field: { type: 'string', enum: ['description', 'reference', 'amount', 'counterparty'] },
        pattern: { type: 'string' },
        amountTolerance: { type: 'number' },
        action: { type: 'string', enum: ['auto_match', 'suggest', 'categorize'] },
        category: { type: 'string' },
        enabled: { type: 'boolean' },
        priority: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Rule created' })
  async createRule(
    @Body() body: {
      name: string;
      type: 'exact_match' | 'partial_match' | 'amount_range' | 'pattern';
      field: 'description' | 'reference' | 'amount' | 'counterparty';
      pattern?: string;
      amountTolerance?: number;
      action: 'auto_match' | 'suggest' | 'categorize';
      category?: string;
      enabled?: boolean;
      priority?: number;
    },
  ) {
    return this.reconciliationService.createRule(body);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update a reconciliation rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  async updateRule(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      pattern?: string;
      amountTolerance?: number;
      action?: 'auto_match' | 'suggest' | 'categorize';
      category?: string;
      enabled?: boolean;
      priority?: number;
    },
  ) {
    const rule = await this.reconciliationService.updateRule(id, body);
    if (!rule) {
      return { error: 'Rule not found', statusCode: 404 };
    }
    return rule;
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete a reconciliation rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Rule deleted' })
  @HttpCode(HttpStatus.OK)
  async deleteRule(@Param('id') id: string) {
    const result = await this.reconciliationService.deleteRule(id);
    return { success: result, id };
  }

  // Import statements
  @Post('import')
  @ApiOperation({ summary: 'Import bank statement file' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['accountId', 'format', 'data'],
      properties: {
        accountId: { type: 'string' },
        format: { type: 'string', enum: ['mt940', 'camt053', 'csv', 'ofx'] },
        data: { type: 'string', description: 'Base64 encoded file content' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Import result' })
  async importStatement(
    @Body() body: {
      accountId: string;
      format: 'mt940' | 'camt053' | 'csv' | 'ofx';
      data: string;
    },
  ) {
    return this.reconciliationService.importStatement(
      body.accountId,
      body.format,
      body.data,
    );
  }
}
