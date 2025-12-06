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
exports.SaftValidationResultDto = exports.SaftExportDto = exports.SaftExportType = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var SaftExportType;
(function (SaftExportType) {
    SaftExportType["FULL"] = "FULL";
    SaftExportType["INVOICES"] = "INVOICES";
    SaftExportType["GENERAL_LEDGER"] = "GENERAL_LEDGER";
    SaftExportType["PAYMENTS"] = "PAYMENTS";
})(SaftExportType || (exports.SaftExportType = SaftExportType = {}));
class SaftExportDto {
    startDate;
    endDate;
    exportType;
    declarationId;
    static _OPENAPI_METADATA_FACTORY() {
        return { startDate: { required: true, type: () => String }, endDate: { required: true, type: () => String }, exportType: { required: false, enum: require("./saft-export.dto").SaftExportType }, declarationId: { required: false, type: () => String } };
    }
}
exports.SaftExportDto = SaftExportDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Start date for export period' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SaftExportDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'End date for export period' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SaftExportDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: SaftExportType, default: SaftExportType.FULL }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(SaftExportType),
    __metadata("design:type", String)
], SaftExportDto.prototype, "exportType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Declaration ID for D406 submission' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaftExportDto.prototype, "declarationId", void 0);
class SaftValidationResultDto {
    isValid;
    errors;
    warnings;
    summary;
    static _OPENAPI_METADATA_FACTORY() {
        return { isValid: { required: true, type: () => Boolean }, errors: { required: true, type: () => [String] }, warnings: { required: true, type: () => [String] }, summary: { required: true, type: () => ({ totalInvoices: { required: true, type: () => Number }, totalVatAmount: { required: true, type: () => Number }, totalAmount: { required: true, type: () => Number }, period: { required: true, type: () => String } }) } };
    }
}
exports.SaftValidationResultDto = SaftValidationResultDto;
//# sourceMappingURL=saft-export.dto.js.map