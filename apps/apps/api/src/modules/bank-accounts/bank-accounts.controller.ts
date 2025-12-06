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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BankAccountsService } from './bank-accounts.service';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionFilterDto,
} from './dto/bank-account.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Bank Accounts')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('companies/:companyId/bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  // Bank Account endpoints
  @Post()
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Bank account created' })
  @ApiResponse({ status: 409, description: 'IBAN already exists' })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateBankAccountDto,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.create(companyId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bank accounts' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Bank accounts returned' })
  async findAll(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.findAll(companyId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank account by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 200, description: 'Bank account returned' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.findOne(companyId, id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update bank account' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 200, description: 'Bank account updated' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.update(companyId, id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete bank account' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 204, description: 'Bank account deleted' })
  async delete(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.delete(companyId, id, user.id);
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set bank account as default' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 200, description: 'Bank account set as default' })
  async setDefault(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.setDefault(companyId, id, user.id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get bank account statistics' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 200, description: 'Statistics returned' })
  async getStats(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.getAccountStats(companyId, id, user.id);
  }

  // Transaction endpoints
  @Post(':id/transactions')
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 201, description: 'Transaction created' })
  async createTransaction(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.createTransaction(companyId, id, dto, user.id);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get transactions for bank account' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 200, description: 'Transactions returned' })
  async getTransactions(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query() filters: TransactionFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.getTransactions(companyId, id, filters, user.id);
  }

  @Get(':id/transactions/:transactionId')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction returned' })
  async getTransaction(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.getTransaction(companyId, id, transactionId, user.id);
  }

  @Put(':id/transactions/:transactionId')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction updated' })
  async updateTransaction(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('transactionId') transactionId: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.updateTransaction(
      companyId,
      id,
      transactionId,
      dto,
      user.id,
    );
  }

  @Delete(':id/transactions/:transactionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 204, description: 'Transaction deleted' })
  async deleteTransaction(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.deleteTransaction(
      companyId,
      id,
      transactionId,
      user.id,
    );
  }

  @Post(':id/transactions/:transactionId/reconcile')
  @ApiOperation({ summary: 'Mark transaction as reconciled' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction reconciled' })
  async reconcileTransaction(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('transactionId') transactionId: string,
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.reconcileTransaction(
      companyId,
      id,
      transactionId,
      user.id,
    );
  }

  @Post(':id/transactions/bulk-reconcile')
  @ApiOperation({ summary: 'Bulk reconcile transactions' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Bank account ID' })
  @ApiResponse({ status: 200, description: 'Transactions reconciled' })
  async bulkReconcile(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('transactionIds') transactionIds: string[],
    @CurrentUser() user: any,
  ) {
    return this.bankAccountsService.bulkReconcile(companyId, id, transactionIds, user.id);
  }
}
