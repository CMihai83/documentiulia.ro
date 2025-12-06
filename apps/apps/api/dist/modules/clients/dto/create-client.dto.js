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
exports.CreateClientDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class CreateClientDto {
    type;
    name;
    cui;
    regCom;
    contactName;
    contactEmail;
    contactPhone;
    address;
    city;
    county;
    country;
    postalCode;
    bankName;
    iban;
    defaultPaymentTerms;
    creditLimit;
    notes;
    tags;
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: true, type: () => Object }, name: { required: true, type: () => String, maxLength: 255 }, cui: { required: false, type: () => String }, regCom: { required: false, type: () => String }, contactName: { required: false, type: () => String }, contactEmail: { required: false, type: () => String }, contactPhone: { required: false, type: () => String }, address: { required: false, type: () => String }, city: { required: false, type: () => String }, county: { required: false, type: () => String }, country: { required: false, type: () => String }, postalCode: { required: false, type: () => String }, bankName: { required: false, type: () => String }, iban: { required: false, type: () => String }, defaultPaymentTerms: { required: false, type: () => Number, minimum: 0 }, creditLimit: { required: false, type: () => Number, minimum: 0 }, notes: { required: false, type: () => String }, tags: { required: false, type: () => [String] } };
    }
}
exports.CreateClientDto = CreateClientDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Client type', enum: client_1.ClientType }),
    (0, class_validator_1.IsEnum)(client_1.ClientType),
    __metadata("design:type", String)
], CreateClientDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Client name or company name', example: 'ABC Industries SRL' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateClientDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'CUI/CIF for companies', example: 'RO12345678' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "cui", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Trade registry number', example: 'J40/1234/2020' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "regCom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Contact person name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "contactName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Contact email', example: 'contact@client.ro' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "contactEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Contact phone', example: '+40 21 123 4567' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "contactPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Address', example: 'Str. Industriei nr. 10' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'City', example: 'București' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'County', example: 'București' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "county", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Country', default: 'RO' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Postal code', example: '010001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank name', example: 'Banca Transilvania' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank account IBAN', example: 'RO49BTRL0301207123456789' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "iban", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Default payment terms in days', default: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateClientDto.prototype, "defaultPaymentTerms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Credit limit' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateClientDto.prototype, "creditLimit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateClientDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tags', type: [String] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateClientDto.prototype, "tags", void 0);
//# sourceMappingURL=create-client.dto.js.map