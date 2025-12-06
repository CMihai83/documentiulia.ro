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
exports.LinkReceiptToExpenseDto = exports.UpdateReceiptOcrDto = exports.CreateReceiptDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateReceiptDto {
    fileUrl;
    fileName;
    fileSize;
    mimeType;
    vendorName;
    receiptDate;
    total;
    vatAmount;
    currency;
    static _OPENAPI_METADATA_FACTORY() {
        return { fileUrl: { required: true, type: () => String }, fileName: { required: true, type: () => String }, fileSize: { required: true, type: () => Number }, mimeType: { required: true, type: () => String }, vendorName: { required: false, type: () => String }, receiptDate: { required: false, type: () => String }, total: { required: false, type: () => Number, minimum: 0 }, vatAmount: { required: false, type: () => Number, minimum: 0 }, currency: { required: false, type: () => String } };
    }
}
exports.CreateReceiptDto = CreateReceiptDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File URL in storage' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "fileUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original filename' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File size in bytes' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "fileSize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'MIME type' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Vendor name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "vendorName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Receipt date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "receiptDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Total amount' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'VAT amount' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "vatAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Currency', default: 'RON' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "currency", void 0);
class UpdateReceiptOcrDto {
    ocrStatus;
    ocrConfidence;
    ocrRawData;
    ocrItems;
    vendorName;
    total;
    vatAmount;
    receiptDate;
    static _OPENAPI_METADATA_FACTORY() {
        return { ocrStatus: { required: false, type: () => Object }, ocrConfidence: { required: false, type: () => Number, minimum: 0 }, ocrRawData: { required: false, type: () => Object }, ocrItems: { required: false, type: () => Object }, vendorName: { required: false, type: () => String }, total: { required: false, type: () => Number, minimum: 0 }, vatAmount: { required: false, type: () => Number, minimum: 0 }, receiptDate: { required: false, type: () => String } };
    }
}
exports.UpdateReceiptOcrDto = UpdateReceiptOcrDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'OCR status', enum: client_1.OcrStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.OcrStatus),
    __metadata("design:type", String)
], UpdateReceiptOcrDto.prototype, "ocrStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'OCR confidence score 0-100' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateReceiptOcrDto.prototype, "ocrConfidence", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Raw OCR data as JSON' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateReceiptOcrDto.prototype, "ocrRawData", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Extracted line items as JSON' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateReceiptOcrDto.prototype, "ocrItems", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Extracted vendor name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateReceiptOcrDto.prototype, "vendorName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Extracted total amount' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateReceiptOcrDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Extracted VAT amount' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateReceiptOcrDto.prototype, "vatAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Extracted date' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateReceiptOcrDto.prototype, "receiptDate", void 0);
class LinkReceiptToExpenseDto {
    expenseId;
    static _OPENAPI_METADATA_FACTORY() {
        return { expenseId: { required: true, type: () => String } };
    }
}
exports.LinkReceiptToExpenseDto = LinkReceiptToExpenseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Expense ID to link' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LinkReceiptToExpenseDto.prototype, "expenseId", void 0);
//# sourceMappingURL=create-receipt.dto.js.map