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
exports.TaxCodesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tax_codes_service_1 = require("./tax-codes.service");
const tax_code_dto_1 = require("./dto/tax-code.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
let TaxCodesController = class TaxCodesController {
    taxCodesService;
    constructor(taxCodesService) {
        this.taxCodesService = taxCodesService;
    }
    async create(companyId, dto) {
        return this.taxCodesService.create(companyId, dto);
    }
    async findAll(companyId, filters) {
        return this.taxCodesService.findAll(companyId, filters);
    }
    async getVatSummary(companyId) {
        return this.taxCodesService.getVatSummary(companyId);
    }
    async getFiscalCompliance() {
        return this.taxCodesService.getFiscalComplianceStatus();
    }
    async getApplicableRate(companyId, dateStr, rateType = 'standard') {
        const transactionDate = dateStr ? new Date(dateStr) : new Date();
        const taxCode = await this.taxCodesService.getApplicableTaxCode(companyId, transactionDate, rateType);
        const rate = this.taxCodesService.getApplicableVatRate(transactionDate, rateType);
        return {
            transactionDate,
            rateType,
            applicableRate: rate,
            taxCode,
            regime: transactionDate >= new Date('2025-08-01') ? '2026' : '2024',
        };
    }
    async initializeDefaults(companyId) {
        return this.taxCodesService.initializeDefaults(companyId);
    }
    async findOne(companyId, id) {
        return this.taxCodesService.findOne(companyId, id);
    }
    async update(companyId, id, dto) {
        return this.taxCodesService.update(companyId, id, dto);
    }
    async delete(companyId, id) {
        return this.taxCodesService.delete(companyId, id);
    }
    async setDefault(companyId, id) {
        return this.taxCodesService.setDefault(companyId, id);
    }
};
exports.TaxCodesController = TaxCodesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new tax code' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Tax code created' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Tax code already exists' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, tax_code_dto_1.CreateTaxCodeDto]),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all tax codes for a company' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tax codes returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, tax_code_dto_1.TaxCodeFilterDto]),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('vat-summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Get VAT rates summary' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'VAT summary returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "getVatSummary", null);
__decorate([
    (0, common_1.Get)('fiscal-compliance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get 2026 fiscal compliance status' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Fiscal compliance status returned' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "getFiscalCompliance", null);
__decorate([
    (0, common_1.Get)('applicable-rate'),
    (0, swagger_1.ApiOperation)({ summary: 'Get applicable VAT rate for a transaction date' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Applicable rate returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "getApplicableRate", null);
__decorate([
    (0, common_1.Post)('initialize'),
    (0, swagger_1.ApiOperation)({ summary: 'Initialize default Romanian tax codes' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Default tax codes initialized' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "initializeDefaults", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a tax code by ID' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Tax code ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tax code returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Tax code not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a tax code' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Tax code ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tax code updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Tax code not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, tax_code_dto_1.UpdateTaxCodeDto]),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a tax code' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Tax code ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tax code deleted' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Tax code not found' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/set-default'),
    (0, swagger_1.ApiOperation)({ summary: 'Set tax code as default for its type' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Tax code ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tax code set as default' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TaxCodesController.prototype, "setDefault", null);
exports.TaxCodesController = TaxCodesController = __decorate([
    (0, swagger_1.ApiTags)('Tax Codes'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('companies/:companyId/tax-codes'),
    __metadata("design:paramtypes", [tax_codes_service_1.TaxCodesService])
], TaxCodesController);
//# sourceMappingURL=tax-codes.controller.js.map