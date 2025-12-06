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
exports.EfacturaController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const efactura_service_1 = require("./efactura.service");
const efactura_dto_1 = require("./dto/efactura.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let EfacturaController = class EfacturaController {
    efacturaService;
    constructor(efacturaService) {
        this.efacturaService = efacturaService;
    }
    async getConfig(companyId, user) {
        return this.efacturaService.getConfig(companyId, user.id);
    }
    async updateConfig(companyId, dto, user) {
        return this.efacturaService.updateConfig(companyId, dto, user.id);
    }
    async generateXml(companyId, invoiceId, user, res) {
        const xml = await this.efacturaService.generateXml(companyId, invoiceId, user.id);
        res.set('Content-Type', 'application/xml');
        res.set('Content-Disposition', `attachment; filename="efactura-${invoiceId}.xml"`);
        res.send(xml);
    }
    async validate(companyId, invoiceId, user) {
        return this.efacturaService.validateForEfactura(companyId, invoiceId, user.id);
    }
    async sendToAnaf(companyId, invoiceId, user) {
        return this.efacturaService.sendToAnaf(companyId, invoiceId, user.id);
    }
    async checkStatus(companyId, invoiceId, user) {
        return this.efacturaService.checkAnafStatus(companyId, invoiceId, user.id);
    }
    async updateStatus(companyId, invoiceId, dto, user) {
        return this.efacturaService.updateInvoiceEfacturaStatus(companyId, invoiceId, dto, user.id);
    }
    async getStatusSummary(companyId, user) {
        return this.efacturaService.getStatusSummary(companyId);
    }
    async getHistory(companyId, user) {
        return this.efacturaService.getHistory(companyId);
    }
    async getPending(companyId, user) {
        return this.efacturaService.getPendingEfactura(companyId, user.id);
    }
    async getFailed(companyId, user) {
        return this.efacturaService.getFailedEfactura(companyId, user.id);
    }
};
exports.EfacturaController = EfacturaController;
__decorate([
    (0, common_1.Get)('config'),
    (0, swagger_1.ApiOperation)({ summary: 'Get e-Factura configuration' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Configuration returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)('config'),
    (0, swagger_1.ApiOperation)({ summary: 'Update e-Factura configuration' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Configuration updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, efactura_dto_1.UpdateEfacturaConfigDto, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Get)('invoices/:invoiceId/xml'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate UBL XML for invoice' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'Invoice ID' }),
    (0, swagger_1.ApiProduces)('application/xml'),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'XML returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "generateXml", null);
__decorate([
    (0, common_1.Get)('invoices/:invoiceId/validate'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate invoice for e-Factura' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'Invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Validation result returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "validate", null);
__decorate([
    (0, common_1.Post)('invoices/:invoiceId/send'),
    (0, swagger_1.ApiOperation)({ summary: 'Send invoice to ANAF' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'Invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invoice sent to ANAF' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "sendToAnaf", null);
__decorate([
    (0, common_1.Get)('invoices/:invoiceId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Check ANAF status for invoice' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'Invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "checkStatus", null);
__decorate([
    (0, common_1.Put)('invoices/:invoiceId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update e-Factura status (webhook/polling)' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'Invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, efactura_dto_1.UpdateInvoiceEfacturaDto, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get e-Factura status summary' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status summary returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "getStatusSummary", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get e-Factura submission history' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Submission history returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('pending'),
    (0, swagger_1.ApiOperation)({ summary: 'Get invoices pending ANAF processing' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pending invoices returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "getPending", null);
__decorate([
    (0, common_1.Get)('failed'),
    (0, swagger_1.ApiOperation)({ summary: 'Get invoices rejected by ANAF' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Failed invoices returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EfacturaController.prototype, "getFailed", null);
exports.EfacturaController = EfacturaController = __decorate([
    (0, swagger_1.ApiTags)('E-Factura'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('companies/:companyId/efactura'),
    __metadata("design:paramtypes", [efactura_service_1.EfacturaService])
], EfacturaController);
//# sourceMappingURL=efactura.controller.js.map