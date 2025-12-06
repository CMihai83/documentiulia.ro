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
exports.DocumentFilterDto = exports.UpdateDocumentDto = exports.CreateDocumentDto = exports.DocumentType = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var DocumentType;
(function (DocumentType) {
    DocumentType["INVOICE_PDF"] = "INVOICE_PDF";
    DocumentType["RECEIPT"] = "RECEIPT";
    DocumentType["CONTRACT"] = "CONTRACT";
    DocumentType["REPORT"] = "REPORT";
    DocumentType["EFACTURA_XML"] = "EFACTURA_XML";
    DocumentType["SAFT_XML"] = "SAFT_XML";
    DocumentType["OTHER"] = "OTHER";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
class CreateDocumentDto {
    name;
    description;
    fileUrl;
    fileName;
    fileSize;
    mimeType;
    type;
    invoiceId;
    expenseId;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, description: { required: false, type: () => String }, fileUrl: { required: true, type: () => String }, fileName: { required: true, type: () => String }, fileSize: { required: true, type: () => Number }, mimeType: { required: true, type: () => String }, type: { required: false, enum: require("./document.dto").DocumentType }, invoiceId: { required: false, type: () => String }, expenseId: { required: false, type: () => String } };
    }
}
exports.CreateDocumentDto = CreateDocumentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Document name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Document description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File URL' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "fileUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Original file name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "fileName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'File size in bytes' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateDocumentDto.prototype, "fileSize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'MIME type' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "mimeType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: DocumentType, default: DocumentType.OTHER }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(DocumentType),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Related invoice ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "invoiceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Related expense ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "expenseId", void 0);
class UpdateDocumentDto {
    name;
    description;
    type;
    invoiceId;
    expenseId;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String }, description: { required: false, type: () => String }, type: { required: false, enum: require("./document.dto").DocumentType }, invoiceId: { required: false, type: () => String }, expenseId: { required: false, type: () => String } };
    }
}
exports.UpdateDocumentDto = UpdateDocumentDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Document name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocumentDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Document description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocumentDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: DocumentType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(DocumentType),
    __metadata("design:type", String)
], UpdateDocumentDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Related invoice ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocumentDto.prototype, "invoiceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Related expense ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDocumentDto.prototype, "expenseId", void 0);
class DocumentFilterDto {
    type;
    invoiceId;
    expenseId;
    search;
    page;
    limit;
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: false, enum: require("./document.dto").DocumentType }, invoiceId: { required: false, type: () => String }, expenseId: { required: false, type: () => String }, search: { required: false, type: () => String }, page: { required: false, type: () => Number }, limit: { required: false, type: () => Number } };
    }
}
exports.DocumentFilterDto = DocumentFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: DocumentType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(DocumentType),
    __metadata("design:type", String)
], DocumentFilterDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Invoice ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DocumentFilterDto.prototype, "invoiceId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Expense ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DocumentFilterDto.prototype, "expenseId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search term' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DocumentFilterDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DocumentFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Items per page', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], DocumentFilterDto.prototype, "limit", void 0);
//# sourceMappingURL=document.dto.js.map