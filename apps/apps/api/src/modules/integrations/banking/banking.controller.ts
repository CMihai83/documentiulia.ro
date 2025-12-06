/**
 * BCR PSD2 Banking Controller
 * REST endpoints for Open Banking integration
 */

import {
  Controller,
  Get,
  Post,
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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BankingService } from './banking.service';

// DTOs
class ConnectBankDto {
  bankCode!: string;
  companyId!: string;
  state?: string;
}

class ExchangeCodeDto {
  bankCode!: string;
  code!: string;
  companyId!: string;
}

class InitiatePaymentDto {
  bankCode!: string;
  debtorIban!: string;
  creditorIban!: string;
  creditorName!: string;
  amount!: number;
  currency!: string;
  description!: string;
}

class SyncTransactionsDto {
  bankCode!: string;
  accountId!: string;
  companyId!: string;
}

@ApiTags('Banking - PSD2 Integration')
@Controller('banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  @Get('banks')
  @ApiOperation({ summary: 'Get list of supported banks' })
  @ApiResponse({
    status: 200,
    description: 'List of supported Romanian banks for PSD2 integration',
  })
  getSupportedBanks() {
    return {
      success: true,
      banks: this.bankingService.getSupportedBanks(),
      psd2Info: {
        description: 'PSD2 (Payment Services Directive 2) enables secure bank connections',
        features: [
          'AIS - Account Information Service (view balances and transactions)',
          'PIS - Payment Initiation Service (initiate payments)',
        ],
        security: 'All connections use OAuth 2.0 with Strong Customer Authentication (SCA)',
      },
    };
  }

  @Post('connect')
  @ApiOperation({ summary: 'Initialize bank connection' })
  @ApiResponse({
    status: 200,
    description: 'Returns authorization URL for bank consent',
  })
  async connectBank(@Body() dto: ConnectBankDto) {
    const state = dto.state || `state_${Date.now()}`;
    const result = await this.bankingService.getAuthorizationUrl(
      dto.bankCode,
      dto.companyId,
      state
    );

    return {
      success: true,
      authorizationUrl: result.url,
      consentId: result.consentId,
      state,
      instructions: [
        'Redirect user to authorizationUrl',
        'User authenticates with their bank',
        'Bank redirects back with authorization code',
        'Exchange code for access token using /banking/callback endpoint',
      ],
    };
  }

  @Post('callback')
  @ApiOperation({ summary: 'Exchange authorization code for access token' })
  @ApiResponse({
    status: 200,
    description: 'Returns access and refresh tokens',
  })
  async handleCallback(@Body() dto: ExchangeCodeDto) {
    const tokens = await this.bankingService.exchangeCodeForToken(
      dto.bankCode,
      dto.code,
      dto.companyId
    );

    return {
      success: true,
      ...tokens,
      note: 'Store tokens securely. Access token expires in expiresIn seconds.',
    };
  }

  @Get('accounts/:bankCode')
  @ApiOperation({ summary: 'Get connected bank accounts' })
  @ApiParam({ name: 'bankCode', description: 'Bank code (BCR, BRD, RAIFFEISEN, ING)' })
  @ApiQuery({ name: 'accessToken', description: 'OAuth access token' })
  async getAccounts(
    @Param('bankCode') bankCode: string,
    @Query('accessToken') accessToken: string
  ) {
    const accounts = await this.bankingService.getAccounts(bankCode, accessToken);

    return {
      success: true,
      bank: bankCode,
      accounts,
      count: accounts.length,
    };
  }

  @Get('accounts/:bankCode/:accountId/balances')
  @ApiOperation({ summary: 'Get account balances' })
  @ApiParam({ name: 'bankCode', description: 'Bank code' })
  @ApiParam({ name: 'accountId', description: 'Account resource ID' })
  @ApiQuery({ name: 'accessToken', description: 'OAuth access token' })
  async getBalances(
    @Param('bankCode') bankCode: string,
    @Param('accountId') accountId: string,
    @Query('accessToken') accessToken: string
  ) {
    const balances = await this.bankingService.getBalances(bankCode, accessToken, accountId);

    return {
      success: true,
      bank: bankCode,
      accountId,
      balances,
    };
  }

  @Get('accounts/:bankCode/:accountId/transactions')
  @ApiOperation({ summary: 'Get account transactions with automatic categorization' })
  @ApiParam({ name: 'bankCode', description: 'Bank code' })
  @ApiParam({ name: 'accountId', description: 'Account resource ID' })
  @ApiQuery({ name: 'accessToken', description: 'OAuth access token' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date (YYYY-MM-DD)' })
  async getTransactions(
    @Param('bankCode') bankCode: string,
    @Param('accountId') accountId: string,
    @Query('accessToken') accessToken: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    const result = await this.bankingService.getTransactions(
      bankCode,
      accessToken,
      accountId,
      dateFrom,
      dateTo
    );

    // Calculate summary
    const income = result.categorized
      .filter((tx) => parseFloat(tx.transactionAmount.amount) > 0)
      .reduce((sum, tx) => sum + parseFloat(tx.transactionAmount.amount), 0);

    const expenses = result.categorized
      .filter((tx) => parseFloat(tx.transactionAmount.amount) < 0)
      .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.transactionAmount.amount)), 0);

    // Group by category
    const byCategory = result.categorized.reduce((acc, tx) => {
      const cat = tx.category;
      if (!acc[cat]) {
        acc[cat] = { count: 0, total: 0 };
      }
      acc[cat].count++;
      acc[cat].total += parseFloat(tx.transactionAmount.amount);
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return {
      success: true,
      bank: bankCode,
      accountId,
      transactions: result.categorized,
      count: result.transactions.length,
      summary: {
        totalIncome: income.toFixed(2),
        totalExpenses: expenses.toFixed(2),
        netFlow: (income - expenses).toFixed(2),
        byCategory,
      },
    };
  }

  @Post('payments/initiate')
  @ApiOperation({ summary: 'Initiate a payment (requires SCA)' })
  @ApiResponse({
    status: 200,
    description: 'Payment initiated, returns SCA redirect URL',
  })
  async initiatePayment(@Body() dto: InitiatePaymentDto) {
    const result = await this.bankingService.initiatePayment(dto.bankCode, 'access_token', {
      instructedAmount: {
        currency: dto.currency,
        amount: dto.amount.toString(),
      },
      debtorAccount: { iban: dto.debtorIban },
      creditorName: dto.creditorName,
      creditorAccount: { iban: dto.creditorIban },
      remittanceInformationUnstructured: dto.description,
    });

    return {
      success: true,
      ...result,
      nextSteps: [
        'Redirect user to scaRedirect URL for Strong Customer Authentication',
        'User authenticates the payment with their bank',
        'Check payment status using /banking/payments/{paymentId}/status',
      ],
    };
  }

  @Get('payments/:paymentId/status')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID from initiation' })
  @ApiQuery({ name: 'bankCode', description: 'Bank code' })
  @ApiQuery({ name: 'accessToken', description: 'OAuth access token' })
  async getPaymentStatus(
    @Param('paymentId') paymentId: string,
    @Query('bankCode') bankCode: string,
    @Query('accessToken') accessToken: string
  ) {
    const status = await this.bankingService.getPaymentStatus(bankCode, accessToken, paymentId);

    return {
      success: true,
      ...status,
      statusDescription: this.getStatusDescription(status.transactionStatus),
    };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync bank transactions with accounting system' })
  @ApiResponse({
    status: 200,
    description: 'Returns sync results including categorization and reconciliation',
  })
  async syncTransactions(@Body() dto: SyncTransactionsDto) {
    const result = await this.bankingService.syncTransactions(
      dto.companyId,
      dto.bankCode,
      'access_token', // In production, retrieve from stored tokens
      dto.accountId
    );

    return {
      success: true,
      ...result,
      message: `Synced ${result.synced} transactions, ${result.reconciled} matched with invoices`,
    };
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get available transaction categories' })
  getCategories() {
    return {
      success: true,
      categories: {
        income: [
          { code: 'INCASARE_FACTURA', name: 'Încasare Factură', contAccount: '5311' },
          { code: 'TRANSFER_PRIMIT', name: 'Transfer Primit', contAccount: '5121' },
          { code: 'DOBANDA', name: 'Dobândă', contAccount: '766' },
          { code: 'RAMBURSARE', name: 'Rambursare', contAccount: '461' },
        ],
        expense: [
          { code: 'PLATA_FURNIZOR', name: 'Plată Furnizor', contAccount: '401' },
          { code: 'SALARII', name: 'Salarii', contAccount: '421' },
          { code: 'IMPOZITE', name: 'Impozite și Taxe', contAccount: '446' },
          { code: 'UTILITATI', name: 'Utilități', contAccount: '605' },
          { code: 'CHIRIE', name: 'Chirie', contAccount: '612' },
          { code: 'COMISIOANE_BANCARE', name: 'Comisioane Bancare', contAccount: '627' },
          { code: 'ASIGURARI', name: 'Asigurări', contAccount: '613' },
          { code: 'CARBURANT', name: 'Carburant', contAccount: '6022' },
          { code: 'MATERIALE', name: 'Materiale', contAccount: '602' },
          { code: 'SERVICII', name: 'Servicii Externe', contAccount: '628' },
        ],
      },
      note: 'Categories map to Romanian accounting plan (Planul de Conturi)',
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for banking service' })
  healthCheck() {
    return {
      status: 'operational',
      service: 'banking-psd2',
      supportedBanks: ['BCR', 'BRD', 'RAIFFEISEN', 'ING'],
      features: [
        'Account Information Service (AIS)',
        'Payment Initiation Service (PIS)',
        'Automatic transaction categorization',
        'Romanian accounting plan mapping',
        'Invoice reconciliation',
      ],
      compliance: ['PSD2', 'GDPR', 'SCA'],
    };
  }

  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      RCVD: 'Received - Payment request received by the bank',
      PDNG: 'Pending - Payment is being processed',
      ACTC: 'Accepted Technical - Passed technical validation',
      ACSC: 'Accepted Settlement Completed - Payment successful',
      ACSP: 'Accepted Settlement In Progress - Settlement in progress',
      CANC: 'Cancelled - Payment was cancelled',
      RJCT: 'Rejected - Payment was rejected',
    };

    return descriptions[status] || 'Unknown status';
  }
}
