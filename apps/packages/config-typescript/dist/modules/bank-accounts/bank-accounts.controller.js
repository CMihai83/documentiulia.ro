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
exports.BankAccountsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bank_accounts_service_1 = require("./bank-accounts.service");
const bank_account_dto_1 = require("./dto/bank-account.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let BankAccountsController = class BankAccountsController {
    bankAccountsService;
    constructor(bankAccountsService) {
        this.bankAccountsService = bankAccountsService;
    }
    async create(companyId, dto, user) {
        return this.bankAccountsService.create(companyId, dto, user.id);
    }
    async findAll(companyId, user) {
        return this.bankAccountsService.findAll(companyId, user.id);
    }
    async findOne(companyId, id, user) {
        return this.bankAccountsService.findOne(companyId, id, user.id);
    }
    async update(companyId, id, dto, user) {
        return this.bankAccountsService.update(companyId, id, dto, user.id);
    }
    async delete(companyId, id, user) {
        return this.bankAccountsService.delete(companyId, id, user.id);
    }
    async setDefault(companyId, id, user) {
        return this.bankAccountsService.setDefault(companyId, id, user.id);
    }
    async getStats(companyId, id, user) {
        return this.bankAccountsService.getAccountStats(companyId, id, user.id);
    }
    async createTransaction(companyId, id, dto, user) {
        return this.bankAccountsService.createTransaction(companyId, id, dto, user.id);
    }
    async getTransactions(companyId, id, filters, user) {
        return this.bankAccountsService.getTransactions(companyId, id, filters, user.id);
    }
    async getTransaction(companyId, id, transactionId, user) {
        return this.bankAccountsService.getTransaction(companyId, id, transactionId, user.id);
    }
    async updateTransaction(companyId, id, transactionId, dto, user) {
        return this.bankAccountsService.updateTransaction(companyId, id, transactionId, dto, user.id);
    }
    async deleteTransaction(companyId, id, transactionId, user) {
        return this.bankAccountsService.deleteTransaction(companyId, id, transactionId, user.id);
    }
    async reconcileTransaction(companyId, id, transactionId, user) {
        return this.bankAccountsService.reconcileTransaction(companyId, id, transactionId, user.id);
    }
    async bulkReconcile(companyId, id, transactionIds, user) {
        return this.bankAccountsService.bulkReconcile(companyId, id, transactionIds, user.id);
    }
};
exports.BankAccountsController = BankAccountsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new bank account' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Bank account created' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'IBAN already exists' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, bank_account_dto_1.CreateBankAccountDto, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all bank accounts' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Bank accounts returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get bank account by ID' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Bank account returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Bank account not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update bank account' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Bank account updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Bank account not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, bank_account_dto_1.UpdateBankAccountDto, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete bank account' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Bank account deleted' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/set-default'),
    (0, swagger_1.ApiOperation)({ summary: 'Set bank account as default' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Bank account set as default' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "setDefault", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get bank account statistics' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistics returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)(':id/transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new transaction' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Transaction created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, bank_account_dto_1.CreateTransactionDto, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Get)(':id/transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transactions for bank account' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transactions returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, bank_account_dto_1.TransactionFilterDto, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)(':id/transactions/:transactionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction by ID' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiParam)({ name: 'transactionId', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction returned' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('transactionId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "getTransaction", null);
__decorate([
    (0, common_1.Put)(':id/transactions/:transactionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update transaction' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiParam)({ name: 'transactionId', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('transactionId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, bank_account_dto_1.UpdateTransactionDto, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "updateTransaction", null);
__decorate([
    (0, common_1.Delete)(':id/transactions/:transactionId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete transaction' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiParam)({ name: 'transactionId', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Transaction deleted' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('transactionId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "deleteTransaction", null);
__decorate([
    (0, common_1.Post)(':id/transactions/:transactionId/reconcile'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark transaction as reconciled' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiParam)({ name: 'transactionId', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction reconciled' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('transactionId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "reconcileTransaction", null);
__decorate([
    (0, common_1.Post)(':id/transactions/bulk-reconcile'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk reconcile transactions' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bank account ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transactions reconciled' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('transactionIds')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Array, Object]),
    __metadata("design:returntype", Promise)
], BankAccountsController.prototype, "bulkReconcile", null);
exports.BankAccountsController = BankAccountsController = __decorate([
    (0, swagger_1.ApiTags)('Bank Accounts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('companies/:companyId/bank-accounts'),
    __metadata("design:paramtypes", [bank_accounts_service_1.BankAccountsService])
], BankAccountsController);
//# sourceMappingURL=bank-accounts.controller.js.map