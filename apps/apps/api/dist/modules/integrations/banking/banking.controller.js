"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const banking_service_1 = require("./banking.service");
class ConnectBankDto {
    bankCode;
    companyId;
    state;
}
class ExchangeCodeDto {
    bankCode;
    code;
    companyId;
}
class InitiatePaymentDto {
    bankCode;
    debtorIban;
    creditorIban;
    creditorName;
    amount;
    currency;
    description;
}
class SyncTransactionsDto {
    bankCode;
    accountId;
    companyId;
}
let BankingController = class BankingController {
    bankingService;
    constructor(bankingService) {
        this.bankingService = bankingService;
    }
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
    async connectBank(dto) {
        const state = dto.state || `state_${Date.now()}`;
        const result = await this.bankingService.getAuthorizationUrl(dto.bankCode, dto.companyId, state);
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
    async handleCallback(dto) {
        const tokens = await this.bankingService.exchangeCodeForToken(dto.bankCode, dto.code, dto.companyId);
        return {
            success: true,
            ...tokens,
            note: 'Store tokens securely. Access token expires in expiresIn seconds.',
        };
    }
    async getAccounts(bankCode, accessToken) {
        const accounts = await this.bankingService.getAccounts(bankCode, accessToken);
        return {
            success: true,
            bank: bankCode,
            accounts,
            count: accounts.length,
        };
    }
    async getBalances(bankCode, accountId, accessToken) {
        const balances = await this.bankingService.getBalances(bankCode, accessToken, accountId);
        return {
            success: true,
            bank: bankCode,
            accountId,
            balances,
        };
    }
    async getTransactions(bankCode, accountId, accessToken, dateFrom, dateTo) {
        const result = await this.bankingService.getTransactions(bankCode, accessToken, accountId, dateFrom, dateTo);
        const income = result.categorized
            .filter((tx) => parseFloat(tx.transactionAmount.amount) > 0)
            .reduce((sum, tx) => sum + parseFloat(tx.transactionAmount.amount), 0);
        const expenses = result.categorized
            .filter((tx) => parseFloat(tx.transactionAmount.amount) < 0)
            .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.transactionAmount.amount)), 0);
        const byCategory = result.categorized.reduce((acc, tx) => {
            const cat = tx.category;
            if (!acc[cat]) {
                acc[cat] = { count: 0, total: 0 };
            }
            acc[cat].count++;
            acc[cat].total += parseFloat(tx.transactionAmount.amount);
            return acc;
        }, {});
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
    async initiatePayment(dto) {
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
    async getPaymentStatus(paymentId, bankCode, accessToken) {
        const status = await this.bankingService.getPaymentStatus(bankCode, accessToken, paymentId);
        return {
            success: true,
            ...status,
            statusDescription: this.getStatusDescription(status.transactionStatus),
        };
    }
    async syncTransactions(dto) {
        const result = await this.bankingService.syncTransactions(dto.companyId, dto.bankCode, 'access_token', dto.accountId);
        return {
            success: true,
            ...result,
            message: `Synced ${result.synced} transactions, ${result.reconciled} matched with invoices`,
        };
    }
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
    getStatusDescription(status) {
        const descriptions = {
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
};
exports.BankingController = BankingController;
__decorate([
    (0, common_1.Get)('banks'),
    (0, swagger_1.ApiOperation)({ summary: 'Get list of supported banks' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'List of supported Romanian banks for PSD2 integration',
    }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BankingController.prototype, "getSupportedBanks", null);
__decorate([
    (0, common_1.Post)('connect'),
    (0, swagger_1.ApiOperation)({ summary: 'Initialize bank connection' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns authorization URL for bank consent',
    }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ConnectBankDto]),
    __metadata("design:returntype", Promise)
], BankingController.prototype, "connectBank", null);
__decorate([
    (0, common_1.Post)('callback'),
    (0, swagger_1.ApiOperation)({ summary: 'Exchange authorization code for access token' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns access and refresh tokens',
    }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ExchangeCodeDto]),
    __metadata("design:returntype", Promise)
], BankingController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('accounts/:bankCode'),
    (0, swagger_1.ApiOperation)({ summary: 'Get connected bank accounts' }),
    (0, swagger_1.ApiParam)({ name: 'bankCode', description: 'Bank code (BCR, BRD, RAIFFEISEN, ING)' }),
    (0, swagger_1.ApiQuery)({ name: 'accessToken', description: 'OAuth access token' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('bankCode')),
    __param(1, (0, common_1.Query)('accessToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BankingController.prototype, "getAccounts", null);
__decorate([
    (0, common_1.Get)('accounts/:bankCode/:accountId/balances'),
    (0, swagger_1.ApiOperation)({ summary: 'Get account balances' }),
    (0, swagger_1.ApiParam)({ name: 'bankCode', description: 'Bank code' }),
    (0, swagger_1.ApiParam)({ name: 'accountId', description: 'Account resource ID' }),
    (0, swagger_1.ApiQuery)({ name: 'accessToken', description: 'OAuth access token' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('bankCode')),
    __param(1, (0, common_1.Param)('accountId')),
    __param(2, (0, common_1.Query)('accessToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BankingController.prototype, "getBalances", null);
__decorate([
    (0, common_1.Get)('accounts/:bankCode/:accountId/transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get account transactions with automatic categorization' }),
    (0, swagger_1.ApiParam)({ name: 'bankCode', description: 'Bank code' }),
    (0, swagger_1.ApiParam)({ name: 'accountId', description: 'Account resource ID' }),
    (0, swagger_1.ApiQuery)({ name: 'accessToken', description: 'OAuth access token' }),
    (0, swagger_1.ApiQuery)({ name: 'dateFrom', required: false, description: 'Start date (YYYY-MM-DD)' }),
    (0, swagger_1.ApiQuery)({ name: 'dateTo', required: false, description: 'End date (YYYY-MM-DD)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('bankCode')),
    __param(1, (0, common_1.Param)('accountId')),
    __param(2, (0, common_1.Query)('accessToken')),
    __param(3, (0, common_1.Query)('dateFrom')),
    __param(4, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], BankingController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('payments/initiate'),
    (0, swagger_1.ApiOperation)({ summary: 'Initiate a payment (requires SCA)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Payment initiated, returns SCA redirect URL',
    }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [InitiatePaymentDto]),
    __metadata("design:returntype", Promise)
], BankingController.prototype, "initiatePayment", null);
__decorate([
    (0, common_1.Get)('payments/:paymentId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get payment status' }),
    (0, swagger_1.ApiParam)({ name: 'paymentId', description: 'Payment ID from initiation' }),
    (0, swagger_1.ApiQuery)({ name: 'bankCode', description: 'Bank code' }),
    (0, swagger_1.ApiQuery)({ name: 'accessToken', description: 'OAuth access token' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('paymentId')),
    __param(1, (0, common_1.Query)('bankCode')),
    __param(2, (0, common_1.Query)('accessToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BankingController.prototype, "getPaymentStatus", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync bank transactions with accounting system' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns sync results including categorization and reconciliation',
    }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SyncTransactionsDto]),
    __metadata("design:returntype", Promise)
], BankingController.prototype, "syncTransactions", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available transaction categories' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BankingController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Health check for banking service' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BankingController.prototype, "healthCheck", null);
exports.BankingController = BankingController = __decorate([
    (0, swagger_1.ApiTags)('Banking - PSD2 Integration'),
    (0, common_1.Controller)('banking'),
    __metadata("design:paramtypes", [banking_service_1.BankingService])
], BankingController);
//# sourceMappingURL=banking.controller.js.map