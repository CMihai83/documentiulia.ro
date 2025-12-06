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
exports.EuFundsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const company_id_decorator_1 = require("../auth/decorators/company-id.decorator");
const eu_funds_service_1 = require("./eu-funds.service");
const eu_funds_dto_1 = require("./dto/eu-funds.dto");
let EuFundsController = class EuFundsController {
    euFundsService;
    constructor(euFundsService) {
        this.euFundsService = euFundsService;
    }
    async getPrograms(source, status, sector, minFunding, maxFunding) {
        return this.euFundsService.getPrograms({
            source,
            status,
            sector,
            minFunding: minFunding ? Number(minFunding) : undefined,
            maxFunding: maxFunding ? Number(maxFunding) : undefined,
        });
    }
    async getProgram(programId) {
        return this.euFundsService.getProgram(programId);
    }
    async checkEligibility(dto) {
        return this.euFundsService.checkEligibility(dto);
    }
    async createApplication(companyId, dto) {
        return this.euFundsService.createApplication(companyId, dto);
    }
    async getApplications(companyId, status, programId) {
        return this.euFundsService.getApplications(companyId, { status, programId });
    }
    async getApplication(companyId, applicationId) {
        return this.euFundsService.getApplication(companyId, applicationId);
    }
    async updateApplication(companyId, applicationId, dto) {
        return this.euFundsService.updateApplication(companyId, applicationId, dto);
    }
    async submitApplication(companyId, applicationId) {
        return this.euFundsService.submitApplication(companyId, applicationId);
    }
    async deleteApplication(companyId, applicationId) {
        await this.euFundsService.deleteApplication(companyId, applicationId);
    }
    async updateMilestone(companyId, applicationId, milestoneId, dto) {
        return this.euFundsService.updateMilestone(companyId, applicationId, milestoneId, dto);
    }
    async getAnalytics(companyId) {
        return this.euFundsService.getAnalytics(companyId);
    }
    async applyForVoucher(companyId, dto) {
        return this.euFundsService.applyForVoucher(companyId, dto);
    }
    async seedPrograms() {
        return this.euFundsService.seedPrograms();
    }
};
exports.EuFundsController = EuFundsController;
__decorate([
    (0, common_1.Get)('programs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all funding programs - PNRR/Cohesion/InvestEU scanner' }),
    (0, swagger_1.ApiQuery)({ name: 'source', enum: eu_funds_dto_1.FundSource, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: eu_funds_dto_1.ProgramStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'sector', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'minFunding', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'maxFunding', type: Number, required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of funding programs' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('source')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('sector')),
    __param(3, (0, common_1.Query)('minFunding')),
    __param(4, (0, common_1.Query)('maxFunding')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, Number]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "getPrograms", null);
__decorate([
    (0, common_1.Get)('programs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get single funding program details' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Program ID' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "getProgram", null);
__decorate([
    (0, common_1.Post)('eligibility/check'),
    (0, swagger_1.ApiOperation)({ summary: 'AI-powered eligibility check - Match company to programs' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Eligibility results with scores and recommendations' }),
    openapi.ApiResponse({ status: 201, type: [require("./dto/eu-funds.dto").EligibilityResultDto] }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eu_funds_dto_1.EligibilityCheckDto]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "checkEligibility", null);
__decorate([
    (0, common_1.Post)('applications'),
    (0, swagger_1.ApiOperation)({ summary: 'Create new funding application' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Application created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, eu_funds_dto_1.CreateApplicationDto]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "createApplication", null);
__decorate([
    (0, common_1.Get)('applications'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all applications for company' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: eu_funds_dto_1.ApplicationStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'programId', required: false }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('programId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "getApplications", null);
__decorate([
    (0, common_1.Get)('applications/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get single application with milestones' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Application ID' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "getApplication", null);
__decorate([
    (0, common_1.Put)('applications/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update application - Edit before submission' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Application ID' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, eu_funds_dto_1.UpdateApplicationDto]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "updateApplication", null);
__decorate([
    (0, common_1.Post)('applications/:id/submit'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit application for review' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Application ID' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "submitApplication", null);
__decorate([
    (0, common_1.Delete)('applications/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete draft application' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Application ID' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "deleteApplication", null);
__decorate([
    (0, common_1.Put)('applications/:applicationId/milestones/:milestoneId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update milestone status' }),
    (0, swagger_1.ApiParam)({ name: 'applicationId', description: 'Application ID' }),
    (0, swagger_1.ApiParam)({ name: 'milestoneId', description: 'Milestone ID' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('applicationId')),
    __param(2, (0, common_1.Param)('milestoneId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, eu_funds_dto_1.UpdateMilestoneDto]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "updateMilestone", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get EU Funds dashboard analytics' }),
    openapi.ApiResponse({ status: 200, type: require("./dto/eu-funds.dto").FundsAnalyticsDto }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Post)('vouchers/apply'),
    (0, swagger_1.ApiOperation)({ summary: 'Apply for InvestEU voucher (€5k-€50k simplified)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Voucher application created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, eu_funds_dto_1.InvestEUVoucherDto]),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "applyForVoucher", null);
__decorate([
    (0, common_1.Post)('seed'),
    (0, swagger_1.ApiOperation)({ summary: 'Seed funding programs (development only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Programs seeded' }),
    openapi.ApiResponse({ status: 201 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EuFundsController.prototype, "seedPrograms", null);
exports.EuFundsController = EuFundsController = __decorate([
    (0, swagger_1.ApiTags)('EU Funds'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('eu-funds'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    __metadata("design:paramtypes", [eu_funds_service_1.EuFundsService])
], EuFundsController);
//# sourceMappingURL=eu-funds.controller.js.map