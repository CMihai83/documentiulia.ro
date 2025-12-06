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
exports.SagaController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const saga_service_1 = require("./saga.service");
const clerk_guard_1 = require("../../auth/guards/clerk.guard");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class SagaInvoiceItemDto {
    denumire;
    cantitate;
    pret_unitar;
    valoare;
    cota_tva;
    unitate_masura;
    cod_produs;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SagaInvoiceItemDto.prototype, "denumire", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SagaInvoiceItemDto.prototype, "cantitate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SagaInvoiceItemDto.prototype, "pret_unitar", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SagaInvoiceItemDto.prototype, "valoare", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SagaInvoiceItemDto.prototype, "cota_tva", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SagaInvoiceItemDto.prototype, "unitate_masura", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SagaInvoiceItemDto.prototype, "cod_produs", void 0);
class CreateSagaInvoiceDto {
    numar_factura;
    data_factura;
    denumire_client;
    cui_client;
    adresa_client;
    valoare_fara_tva;
    valoare_tva;
    valoare_totala;
    cota_tva;
    moneda;
    serie_factura;
    items;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSagaInvoiceDto.prototype, "numar_factura", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateSagaInvoiceDto.prototype, "data_factura", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSagaInvoiceDto.prototype, "denumire_client", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSagaInvoiceDto.prototype, "cui_client", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSagaInvoiceDto.prototype, "adresa_client", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSagaInvoiceDto.prototype, "valoare_fara_tva", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSagaInvoiceDto.prototype, "valoare_tva", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSagaInvoiceDto.prototype, "valoare_totala", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateSagaInvoiceDto.prototype, "cota_tva", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSagaInvoiceDto.prototype, "moneda", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSagaInvoiceDto.prototype, "serie_factura", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SagaInvoiceItemDto),
    __metadata("design:type", Array)
], CreateSagaInvoiceDto.prototype, "items", void 0);
class OAuthCallbackDto {
    code;
    state;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OAuthCallbackDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OAuthCallbackDto.prototype, "state", void 0);
let SagaController = class SagaController {
    sagaService;
    constructor(sagaService) {
        this.sagaService = sagaService;
    }
    getAuthUrl(companyId, redirectUri) {
        const url = this.sagaService.getAuthorizationUrl(companyId, redirectUri);
        return { authorizationUrl: url };
    }
    async handleCallback(companyId, dto, redirectUri) {
        const tokens = await this.sagaService.exchangeCodeForTokens(dto.code, redirectUri);
        await this.sagaService.saveCredentials(companyId, tokens);
        return { success: true, message: 'Integrarea SAGA a fost configurată cu succes' };
    }
    async getStatus(companyId) {
        return this.sagaService.getIntegrationStatus(companyId);
    }
    async disconnect(companyId) {
        await this.sagaService.disconnect(companyId);
        return { success: true, message: 'Integrarea SAGA a fost dezactivată' };
    }
    async getCompanyInfo(companyId) {
        return this.sagaService.getCompanyInfo(companyId);
    }
    async listInvoices(companyId, from, to, page, limit) {
        return this.sagaService.listInvoices(companyId, {
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    async getInvoice(companyId, invoiceId) {
        return this.sagaService.getInvoice(companyId, invoiceId);
    }
    async createInvoice(companyId, dto) {
        return this.sagaService.createInvoice(companyId, dto);
    }
    async printInvoice(companyId, invoiceId, res) {
        const pdfBuffer = await this.sagaService.printInvoice(companyId, invoiceId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="factura-${invoiceId}.pdf"`,
            'Content-Length': pdfBuffer.length,
        });
        res.send(pdfBuffer);
    }
    async deleteInvoice(companyId, invoiceId) {
        await this.sagaService.deleteInvoice(companyId, invoiceId);
        return { success: true, message: 'Factura a fost ștearsă din SAGA' };
    }
    async listPartners(companyId) {
        return this.sagaService.listPartners(companyId);
    }
    async sync(companyId, lastSyncDate) {
        return this.sagaService.syncInvoices(companyId, lastSyncDate ? new Date(lastSyncDate) : undefined);
    }
};
exports.SagaController = SagaController;
__decorate([
    (0, common_1.Get)('auth/url'),
    (0, swagger_1.ApiOperation)({ summary: 'Get SAGA OAuth authorization URL' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiQuery)({ name: 'redirectUri', description: 'OAuth redirect URI' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Authorization URL returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('redirectUri')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SagaController.prototype, "getAuthUrl", null);
__decorate([
    (0, common_1.Post)('auth/callback'),
    (0, swagger_1.ApiOperation)({ summary: 'Handle SAGA OAuth callback' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Tokens exchanged and stored' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('redirectUri')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, OAuthCallbackDto, String]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "handleCallback", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get SAGA integration status' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Integration status returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Delete)('disconnect'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Disconnect SAGA integration' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Integration disconnected' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Get)('company-info'),
    (0, swagger_1.ApiOperation)({ summary: 'Get company info from SAGA' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company info returned' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "getCompanyInfo", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'List invoices from SAGA' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiQuery)({ name: 'from', required: false, description: 'Start date (YYYY-MM-DD)' }),
    (0, swagger_1.ApiQuery)({ name: 'to', required: false, description: 'End date (YYYY-MM-DD)' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, description: 'Page number' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Items per page' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invoices returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "listInvoices", null);
__decorate([
    (0, common_1.Get)('invoices/:invoiceId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get invoice from SAGA' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'SAGA Invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invoice returned' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.Post)('invoices'),
    (0, swagger_1.ApiOperation)({ summary: 'Create invoice in SAGA' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Invoice created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateSagaInvoiceDto]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "createInvoice", null);
__decorate([
    (0, common_1.Get)('invoices/:invoiceId/print'),
    (0, swagger_1.ApiOperation)({ summary: 'Print/download invoice PDF from SAGA' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'SAGA Invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PDF returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "printInvoice", null);
__decorate([
    (0, common_1.Delete)('invoices/:invoiceId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete invoice from SAGA' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'invoiceId', description: 'SAGA Invoice ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invoice deleted' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('invoiceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "deleteInvoice", null);
__decorate([
    (0, common_1.Get)('partners'),
    (0, swagger_1.ApiOperation)({ summary: 'List partners from SAGA' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Partners returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "listPartners", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync data from SAGA' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiQuery)({ name: 'lastSyncDate', required: false, description: 'Last sync date (YYYY-MM-DD)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Sync completed' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('lastSyncDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SagaController.prototype, "sync", null);
exports.SagaController = SagaController = __decorate([
    (0, swagger_1.ApiTags)('SAGA Integration'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('companies/:companyId/integrations/saga'),
    __metadata("design:paramtypes", [saga_service_1.SagaIntegrationService])
], SagaController);
//# sourceMappingURL=saga.controller.js.map