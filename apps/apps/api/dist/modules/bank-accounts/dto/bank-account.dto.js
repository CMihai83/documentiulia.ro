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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionFilterDto = exports.UpdateTransactionDto = exports.CreateTransactionDto = exports.UpdateBankAccountDto = exports.CreateBankAccountDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateBankAccountDto {
    name;
    bankName;
    iban;
    swift;
    currency;
    balance;
    isDefault;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, bankName: { required: true, type: () => String }, iban: { required: true, type: () => String }, swift: { required: false, type: () => String }, currency: { required: false, type: () => String }, balance: { required: false, type: () => Number }, isDefault: { required: false, type: () => Boolean } };
    }
}
exports.CreateBankAccountDto = CreateBankAccountDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Account name', example: 'Main Business Account' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Bank name', example: 'BCR' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'IBAN', example: 'RO49AAAA1B31007593840000' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "iban", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SWIFT/BIC code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "swift", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Account currency', default: 'RON' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBankAccountDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Initial balance' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    __metadata("design:type", Number)
], CreateBankAccountDto.prototype, "balance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is default account', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateBankAccountDto.prototype, "isDefault", void 0);
class UpdateBankAccountDto extends (0, swagger_1.PartialType)(CreateBankAccountDto) {
    static _OPENAPI_METADATA_FACTORY() {
        return {};
    }
}
exports.UpdateBankAccountDto = UpdateBankAccountDto;
class CreateTransactionDto {
    transactionDate;
    valueDate;
    description;
    reference;
    amount;
    currency;
    type;
    category;
    static _OPENAPI_METADATA_FACTORY() {
        return { transactionDate: { required: true, type: () => String }, valueDate: { required: false, type: () => String }, description: { required: true, type: () => String }, reference: { required: false, type: () => String }, amount: { required: true, type: () => Number, minimum: 0.01 }, currency: { required: false, type: () => String }, type: { required: true, type: () => Object }, category: { required: false, type: () => String } };
    }
}
exports.CreateTransactionDto = CreateTransactionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Transaction date' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "transactionDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Value date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "valueDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Transaction description' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reference number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Amount' }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateTransactionDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Currency', default: 'RON' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Transaction type', enum: client_1.TransactionType }),
    (0, class_validator_1.IsEnum)(client_1.TransactionType),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTransactionDto.prototype, "category", void 0);
class UpdateTransactionDto extends (0, swagger_1.PartialType)(CreateTransactionDto) {
    isReconciled;
    static _OPENAPI_METADATA_FACTORY() {
        return { isReconciled: { required: false, type: () => Boolean } };
    }
}
exports.UpdateTransactionDto = UpdateTransactionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is reconciled', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTransactionDto.prototype, "isReconciled", void 0);
class TransactionFilterDto {
    type;
    isReconciled;
    startDate;
    endDate;
    search;
    page;
    limit;
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: false, type: () => Object }, isReconciled: { required: false, type: () => Boolean }, startDate: { required: false, type: () => String }, endDate: { required: false, type: () => String }, search: { required: false, type: () => String }, page: { required: false, type: () => Number }, limit: { required: false, type: () => Number } };
    }
}
exports.TransactionFilterDto = TransactionFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by type', enum: client_1.TransactionType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TransactionType),
    __metadata("design:type", String)
], TransactionFilterDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by reconciled status' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TransactionFilterDto.prototype, "isReconciled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Start date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], TransactionFilterDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'End date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], TransactionFilterDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search term' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransactionFilterDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TransactionFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Items per page', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TransactionFilterDto.prototype, "limit", void 0);
//# sourceMappingURL=bank-account.dto.js.map