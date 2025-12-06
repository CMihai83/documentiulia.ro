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
exports.TaxCodeFilterDto = exports.UpdateTaxCodeDto = exports.CreateTaxCodeDto = exports.TaxType = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var TaxType;
(function (TaxType) {
    TaxType["VAT_STANDARD"] = "VAT_STANDARD";
    TaxType["VAT_STANDARD_21"] = "VAT_STANDARD_21";
    TaxType["VAT_REDUCED_9"] = "VAT_REDUCED_9";
    TaxType["VAT_REDUCED_11"] = "VAT_REDUCED_11";
    TaxType["VAT_REDUCED_5"] = "VAT_REDUCED_5";
    TaxType["VAT_ZERO"] = "VAT_ZERO";
    TaxType["VAT_EXEMPT"] = "VAT_EXEMPT";
    TaxType["INCOME_TAX"] = "INCOME_TAX";
    TaxType["SOCIAL_CONTRIB"] = "SOCIAL_CONTRIB";
    TaxType["DIVIDEND_TAX"] = "DIVIDEND_TAX";
})(TaxType || (exports.TaxType = TaxType = {}));
class CreateTaxCodeDto {
    code;
    name;
    rate;
    type;
    saftCode;
    isDefault;
    static _OPENAPI_METADATA_FACTORY() {
        return { code: { required: true, type: () => String }, name: { required: true, type: () => String }, rate: { required: true, type: () => Number }, type: { required: true, enum: require("./tax-code.dto").TaxType }, saftCode: { required: false, type: () => String }, isDefault: { required: false, type: () => Boolean } };
    }
}
exports.CreateTaxCodeDto = CreateTaxCodeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tax code identifier' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaxCodeDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tax code name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaxCodeDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Tax rate percentage' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateTaxCodeDto.prototype, "rate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: TaxType, description: 'Type of tax' }),
    (0, class_validator_1.IsEnum)(TaxType),
    __metadata("design:type", String)
], CreateTaxCodeDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SAF-T code for Romanian tax authority' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTaxCodeDto.prototype, "saftCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether this is the default tax code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTaxCodeDto.prototype, "isDefault", void 0);
class UpdateTaxCodeDto {
    name;
    rate;
    type;
    saftCode;
    isDefault;
    isActive;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String }, rate: { required: false, type: () => Number }, type: { required: false, enum: require("./tax-code.dto").TaxType }, saftCode: { required: false, type: () => String }, isDefault: { required: false, type: () => Boolean }, isActive: { required: false, type: () => Boolean } };
    }
}
exports.UpdateTaxCodeDto = UpdateTaxCodeDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tax code name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaxCodeDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tax rate percentage' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTaxCodeDto.prototype, "rate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: TaxType, description: 'Type of tax' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(TaxType),
    __metadata("design:type", String)
], UpdateTaxCodeDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SAF-T code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTaxCodeDto.prototype, "saftCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether this is the default tax code' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTaxCodeDto.prototype, "isDefault", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether the tax code is active' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTaxCodeDto.prototype, "isActive", void 0);
class TaxCodeFilterDto {
    type;
    isActive;
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: false, enum: require("./tax-code.dto").TaxType }, isActive: { required: false, type: () => Boolean } };
    }
}
exports.TaxCodeFilterDto = TaxCodeFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: TaxType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(TaxType),
    __metadata("design:type", String)
], TaxCodeFilterDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TaxCodeFilterDto.prototype, "isActive", void 0);
//# sourceMappingURL=tax-code.dto.js.map