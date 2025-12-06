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
exports.EtransportController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const etransport_service_1 = require("./etransport.service");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let EtransportController = class EtransportController {
    etransportService;
    constructor(etransportService) {
        this.etransportService = etransportService;
    }
    async createDeclaration(companyId, declaration, user) {
        return this.etransportService.createDeclaration(companyId, declaration);
    }
    async listDeclarations(companyId, status, startDate, endDate, page, limit) {
        return this.etransportService.listDeclarations(companyId, {
            status: status,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: page ? parseInt(String(page)) : 1,
            limit: limit ? parseInt(String(limit)) : 20,
        });
    }
    async getDeclaration(companyId, uit) {
        return this.etransportService.getDeclaration(companyId, uit);
    }
    async confirmStart(companyId, uit) {
        return this.etransportService.confirmStart(companyId, uit);
    }
    async confirmDelivery(companyId, uit, deliveryData) {
        return this.etransportService.confirmDelivery(companyId, uit, deliveryData);
    }
    async cancelDeclaration(companyId, uit, reason) {
        return this.etransportService.cancelDeclaration(companyId, uit, reason);
    }
    async downloadXml(companyId, uit, res) {
        const declaration = await this.etransportService.getDeclaration(companyId, uit);
        const xml = this.etransportService.generateDeclarationXml(declaration);
        res.set('Content-Type', 'application/xml');
        res.set('Content-Disposition', `attachment; filename="etransport-${uit}.xml"`);
        res.send(xml);
    }
    async getCountyCodes() {
        return this.etransportService.getCountyCodes();
    }
    async getOperationTypes() {
        return [
            { code: 'AIC', description: 'Achiziție intracomunitară' },
            { code: 'AIE', description: 'Aprovizionare internă pentru export' },
            { code: 'LHI', description: 'Livrare high-risk în interiorul țării' },
            { code: 'TDT', description: 'Transport domestic taxabil' },
            { code: 'ACI', description: 'Achiziție comercială internațională' },
        ];
    }
};
exports.EtransportController = EtransportController;
__decorate([
    (0, common_1.Post)('declarations'),
    (0, swagger_1.ApiOperation)({ summary: 'Create transport declaration and get UIT' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Declaration created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EtransportController.prototype, "createDeclaration", null);
__decorate([
    (0, common_1.Get)('declarations'),
    (0, swagger_1.ApiOperation)({ summary: 'List all transport declarations' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], EtransportController.prototype, "listDeclarations", null);
__decorate([
    (0, common_1.Get)('declarations/:uit'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transport declaration by UIT' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'uit', description: 'Unique Identifier for Transport' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('uit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EtransportController.prototype, "getDeclaration", null);
__decorate([
    (0, common_1.Post)('declarations/:uit/start'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm transport start' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'uit', description: 'Unique Identifier for Transport' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('uit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EtransportController.prototype, "confirmStart", null);
__decorate([
    (0, common_1.Post)('declarations/:uit/delivery'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm transport delivery' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'uit', description: 'Unique Identifier for Transport' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('uit')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EtransportController.prototype, "confirmDelivery", null);
__decorate([
    (0, common_1.Delete)('declarations/:uit'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel transport declaration' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'uit', description: 'Unique Identifier for Transport' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('uit')),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], EtransportController.prototype, "cancelDeclaration", null);
__decorate([
    (0, common_1.Get)('declarations/:uit/xml'),
    (0, swagger_1.ApiOperation)({ summary: 'Download declaration XML' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'uit', description: 'Unique Identifier for Transport' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('uit')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EtransportController.prototype, "downloadXml", null);
__decorate([
    (0, common_1.Get)('counties'),
    (0, swagger_1.ApiOperation)({ summary: 'Get Romanian county codes' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EtransportController.prototype, "getCountyCodes", null);
__decorate([
    (0, common_1.Get)('operation-types'),
    (0, swagger_1.ApiOperation)({ summary: 'Get operation type codes and descriptions' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EtransportController.prototype, "getOperationTypes", null);
exports.EtransportController = EtransportController = __decorate([
    (0, swagger_1.ApiTags)('E-Transport'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('companies/:companyId/etransport'),
    __metadata("design:paramtypes", [etransport_service_1.EtransportService])
], EtransportController);
//# sourceMappingURL=etransport.controller.js.map