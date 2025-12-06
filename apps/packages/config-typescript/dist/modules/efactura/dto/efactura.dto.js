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
exports.UpdateInvoiceEfacturaDto = exports.AnafStatusDto = exports.SendToAnafDto = exports.UpdateEfacturaConfigDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class UpdateEfacturaConfigDto {
    isEnabled;
    autoUpload;
    autoDownload;
    certificateFile;
    certificatePassword;
    static _OPENAPI_METADATA_FACTORY() {
        return { isEnabled: { required: false, type: () => Boolean }, autoUpload: { required: false, type: () => Boolean }, autoDownload: { required: false, type: () => Boolean }, certificateFile: { required: false, type: () => String }, certificatePassword: { required: false, type: () => String } };
    }
}
exports.UpdateEfacturaConfigDto = UpdateEfacturaConfigDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Enable e-Factura integration' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateEfacturaConfigDto.prototype, "isEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Auto-upload invoices to ANAF' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateEfacturaConfigDto.prototype, "autoUpload", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Auto-download invoices from ANAF' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateEfacturaConfigDto.prototype, "autoDownload", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Certificate file path' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEfacturaConfigDto.prototype, "certificateFile", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Certificate password (will be encrypted)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateEfacturaConfigDto.prototype, "certificatePassword", void 0);
class SendToAnafDto {
    invoiceId;
    static _OPENAPI_METADATA_FACTORY() {
        return { invoiceId: { required: true, type: () => String } };
    }
}
exports.SendToAnafDto = SendToAnafDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Invoice ID to send' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SendToAnafDto.prototype, "invoiceId", void 0);
class AnafStatusDto {
    uploadId;
    static _OPENAPI_METADATA_FACTORY() {
        return { uploadId: { required: true, type: () => String } };
    }
}
exports.AnafStatusDto = AnafStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ANAF upload ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnafStatusDto.prototype, "uploadId", void 0);
class UpdateInvoiceEfacturaDto {
    efacturaStatus;
    efacturaIndexId;
    efacturaUploadId;
    efacturaXml;
    static _OPENAPI_METADATA_FACTORY() {
        return { efacturaStatus: { required: false, type: () => Object }, efacturaIndexId: { required: false, type: () => String }, efacturaUploadId: { required: false, type: () => String }, efacturaXml: { required: false, type: () => String } };
    }
}
exports.UpdateInvoiceEfacturaDto = UpdateInvoiceEfacturaDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'e-Factura status', enum: client_1.EfacturaStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.EfacturaStatus),
    __metadata("design:type", String)
], UpdateInvoiceEfacturaDto.prototype, "efacturaStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ANAF index ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInvoiceEfacturaDto.prototype, "efacturaIndexId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'ANAF upload ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInvoiceEfacturaDto.prototype, "efacturaUploadId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'e-Factura XML content' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateInvoiceEfacturaDto.prototype, "efacturaXml", void 0);
//# sourceMappingURL=efactura.dto.js.map