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
exports.CreateCompanyDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateCompanyDto {
    name;
    cui;
    regCom;
    euid;
    address;
    city;
    county;
    postalCode;
    country;
    email;
    phone;
    website;
    bankName;
    iban;
    swift;
    vatPayer;
    vatNumber;
    vatRate;
    currency;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, cui: { required: true, type: () => String }, regCom: { required: false, type: () => String }, euid: { required: false, type: () => String }, address: { required: false, type: () => String }, city: { required: false, type: () => String }, county: { required: false, type: () => String }, postalCode: { required: false, type: () => String }, country: { required: false, type: () => String }, email: { required: false, type: () => String }, phone: { required: false, type: () => String }, website: { required: false, type: () => String }, bankName: { required: false, type: () => String }, iban: { required: false, type: () => String }, swift: { required: false, type: () => String }, vatPayer: { required: false, type: () => Boolean }, vatNumber: { required: false, type: () => String }, vatRate: { required: false, type: () => Number, minimum: 0, maximum: 100 }, currency: { required: false, type: () => String } };
    }
}
exports.CreateCompanyDto = CreateCompanyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Company name', example: 'Tech Solutions SRL' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'CUI/CIF (tax ID)', example: 'RO12345678' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "cui", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Trade registry number', example: 'J40/1234/2020' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "regCom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'European Unique Identifier' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "euid", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Company address', example: 'Str. Victoriei nr. 100' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'City', example: 'București' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'County/State', example: 'București' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "county", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Postal code', example: '010001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Country code', default: 'RO' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Company email', example: 'contact@company.ro' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Phone number', example: '+40 21 123 4567' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Website URL', example: 'https://company.ro' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank name', example: 'Banca Transilvania' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Bank account IBAN', example: 'RO49BTRL0301207123456789' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "iban", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SWIFT/BIC code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "swift", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is VAT payer', default: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateCompanyDto.prototype, "vatPayer", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'VAT number (RO + CUI)', example: 'RO12345678' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "vatNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'VAT rate percentage', example: 19, default: 19 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateCompanyDto.prototype, "vatRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Currency code', default: 'RON' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCompanyDto.prototype, "currency", void 0);
//# sourceMappingURL=create-company.dto.js.map