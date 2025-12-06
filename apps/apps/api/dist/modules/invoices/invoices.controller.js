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
exports.InvoicesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const invoices_service_1 = require("./invoices.service");
const dto_1 = require("./dto");
let InvoicesController = class InvoicesController {
    invoicesService;
    constructor(invoicesService) {
        this.invoicesService = invoicesService;
    }
    create(companyId, dto) {
        return this.invoicesService.create(companyId, dto);
    }
    findAll(companyId, filters) {
        return this.invoicesService.findAll(companyId, filters);
    }
    getStats(companyId) {
        return this.invoicesService.getDashboardStats(companyId);
    }
    findOne(companyId, id) {
        return this.invoicesService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.invoicesService.update(companyId, id, dto);
    }
    delete(companyId, id) {
        return this.invoicesService.delete(companyId, id);
    }
    markAsSent(companyId, id) {
        return this.invoicesService.markAsSent(companyId, id);
    }
    markAsPaid(companyId, id, amount) {
        return this.invoicesService.markAsPaid(companyId, id, amount);
    }
};
exports.InvoicesController = InvoicesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Creează o factură nouă' }),
    (0, swagger_1.ApiHeader)({ name: 'x-company-id', required: true, description: 'ID-ul companiei' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Factura a fost creată' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Date invalide' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Headers)('x-company-id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateInvoiceDto]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listează toate facturile' }),
    (0, swagger_1.ApiHeader)({ name: 'x-company-id', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lista facturilor' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Headers)('x-company-id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.InvoiceFilterDto]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Statistici facturi pentru dashboard' }),
    (0, swagger_1.ApiHeader)({ name: 'x-company-id', required: true }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistici facturi' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Headers)('x-company-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obține detalii factură' }),
    (0, swagger_1.ApiHeader)({ name: 'x-company-id', required: true }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID-ul facturii' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Detalii factură' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Factura nu a fost găsită' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Headers)('x-company-id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizează o factură' }),
    (0, swagger_1.ApiHeader)({ name: 'x-company-id', required: true }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID-ul facturii' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Factura a fost actualizată' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Date invalide sau factura nu poate fi modificată' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Factura nu a fost găsită' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Headers)('x-company-id')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateInvoiceDto]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Șterge o factură' }),
    (0, swagger_1.ApiHeader)({ name: 'x-company-id', required: true }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID-ul facturii' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Factura a fost ștearsă' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Factura nu poate fi ștearsă' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Factura nu a fost găsită' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Headers)('x-company-id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/send'),
    (0, swagger_1.ApiOperation)({ summary: 'Marchează factura ca trimisă' }),
    (0, swagger_1.ApiHeader)({ name: 'x-company-id', required: true }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID-ul facturii' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Factura a fost marcată ca trimisă' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Headers)('x-company-id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "markAsSent", null);
__decorate([
    (0, common_1.Post)(':id/pay'),
    (0, swagger_1.ApiOperation)({ summary: 'Înregistrează plată pentru factură' }),
    (0, swagger_1.ApiHeader)({ name: 'x-company-id', required: true }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID-ul facturii' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Plata a fost înregistrată' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Headers)('x-company-id')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", void 0)
], InvoicesController.prototype, "markAsPaid", null);
exports.InvoicesController = InvoicesController = __decorate([
    (0, swagger_1.ApiTags)('invoices'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('invoices'),
    __metadata("design:paramtypes", [invoices_service_1.InvoicesService])
], InvoicesController);
//# sourceMappingURL=invoices.controller.js.map