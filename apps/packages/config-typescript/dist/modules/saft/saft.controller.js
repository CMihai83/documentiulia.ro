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
exports.SaftController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const saft_service_1 = require("./saft.service");
const saft_export_dto_1 = require("./dto/saft-export.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let SaftController = class SaftController {
    saftService;
    constructor(saftService) {
        this.saftService = saftService;
    }
    async exportSaftXml(companyId, dto, user, res) {
        const xml = await this.saftService.generateSaftXml(companyId, dto, user.id);
        const filename = `SAFT_D406_${new Date().toISOString().split('T')[0]}.xml`;
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(xml);
    }
    async validateSaftData(companyId, dto, user) {
        return this.saftService.validateSaftData(companyId, dto, user.id);
    }
    async getExportHistory(companyId, user) {
        return this.saftService.getExportHistory(companyId, user.id);
    }
    async previewExport(companyId, dto, user) {
        const validation = await this.saftService.validateSaftData(companyId, dto, user.id);
        return {
            ...validation,
            period: {
                startDate: dto.startDate,
                endDate: dto.endDate,
            },
            canExport: validation.isValid,
        };
    }
};
exports.SaftController = SaftController;
__decorate([
    (0, common_1.Post)('export'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate SAF-T D406 XML export',
        description: 'Generates Romanian SAF-T D406 compliant XML file for ANAF submission',
    }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiProduces)('application/xml'),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'SAF-T XML file generated successfully',
        content: {
            'application/xml': {
                schema: { type: 'string', format: 'binary' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid date range or missing data' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'No access to company' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, saft_export_dto_1.SaftExportDto, Object, Object]),
    __metadata("design:returntype", Promise)
], SaftController.prototype, "exportSaftXml", null);
__decorate([
    (0, common_1.Post)('validate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Validate SAF-T data before export',
        description: 'Checks data completeness and compliance before generating export',
    }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Validation result',
        type: saft_export_dto_1.SaftValidationResultDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'No access to company' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: require("./dto/saft-export.dto").SaftValidationResultDto }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, saft_export_dto_1.SaftExportDto, Object]),
    __metadata("design:returntype", Promise)
], SaftController.prototype, "validateSaftData", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get SAF-T export history',
        description: 'Returns list of previous SAF-T exports for the company',
    }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Export history' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SaftController.prototype, "getExportHistory", null);
__decorate([
    (0, common_1.Get)('preview'),
    (0, swagger_1.ApiOperation)({
        summary: 'Preview SAF-T export data',
        description: 'Returns summary of data that will be included in the export',
    }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Export preview data' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, saft_export_dto_1.SaftExportDto, Object]),
    __metadata("design:returntype", Promise)
], SaftController.prototype, "previewExport", null);
exports.SaftController = SaftController = __decorate([
    (0, swagger_1.ApiTags)('SAF-T D406'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('companies/:companyId/saft'),
    __metadata("design:paramtypes", [saft_service_1.SaftService])
], SaftController);
//# sourceMappingURL=saft.controller.js.map