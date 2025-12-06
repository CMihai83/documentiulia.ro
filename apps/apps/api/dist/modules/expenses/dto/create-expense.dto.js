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
exports.CreateExpenseDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateExpenseDto {
    description;
    category;
    vendorName;
    vendorCui;
    amount;
    vatAmount;
    vatRate;
    currency;
    isDeductible;
    deductiblePercent;
    expenseDate;
    paymentMethod;
    isPaid;
    invoiceNumber;
    notes;
    tags;
    static _OPENAPI_METADATA_FACTORY() {
        return { description: { required: true, type: () => String }, category: { required: true, type: () => Object }, vendorName: { required: false, type: () => String, maxLength: 255 }, vendorCui: { required: false, type: () => String }, amount: { required: true, type: () => Number, minimum: 0 }, vatAmount: { required: false, type: () => Number, minimum: 0 }, vatRate: { required: false, type: () => Number, minimum: 0, maximum: 100 }, currency: { required: false, type: () => String }, isDeductible: { required: false, type: () => Boolean }, deductiblePercent: { required: false, type: () => Number, minimum: 0, maximum: 100 }, expenseDate: { required: true, type: () => String }, paymentMethod: { required: false, type: () => String }, isPaid: { required: false, type: () => Boolean }, invoiceNumber: { required: false, type: () => String }, notes: { required: false, type: () => String }, tags: { required: false, type: () => [String] } };
    }
}
exports.CreateExpenseDto = CreateExpenseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Expense description', example: 'Consumabile birou Q1 2024' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Expense category', enum: client_1.ExpenseCategory }),
    (0, class_validator_1.IsEnum)(client_1.ExpenseCategory),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vendor name', example: 'Office Pro SRL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "vendorName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vendor CUI', example: 'RO12345678' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "vendorCui", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Amount (without VAT)', example: 450 }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateExpenseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'VAT amount', example: 85.50, default: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateExpenseDto.prototype, "vatAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'VAT rate', example: 19, default: 19 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateExpenseDto.prototype, "vatRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Currency', default: 'RON' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is deductible', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateExpenseDto.prototype, "isDeductible", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Deductible percentage', default: 100 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateExpenseDto.prototype, "deductiblePercent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Expense date', example: '2024-01-15' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "expenseDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Payment method (cash, card, transfer)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "paymentMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is expense paid', default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateExpenseDto.prototype, "isPaid", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Supplier invoice number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "invoiceNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tags', type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateExpenseDto.prototype, "tags", void 0);
//# sourceMappingURL=create-expense.dto.js.map