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
exports.HrController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const company_id_decorator_1 = require("../auth/decorators/company-id.decorator");
const hr_service_1 = require("./hr.service");
const hr_dto_1 = require("./dto/hr.dto");
let HrController = class HrController {
    hrService;
    constructor(hrService) {
        this.hrService = hrService;
    }
    async createCandidate(companyId, dto) {
        return this.hrService.createCandidate(companyId, dto);
    }
    async getCandidates(companyId, status, jobId, minScore, search, page, limit) {
        return this.hrService.getCandidates(companyId, {
            status,
            jobId,
            minScore: minScore ? Number(minScore) : undefined,
            search,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
        });
    }
    async updateCandidate(companyId, candidateId, dto) {
        return this.hrService.updateCandidate(companyId, candidateId, dto);
    }
    async deleteCandidate(companyId, candidateId) {
        await this.hrService.deleteCandidate(companyId, candidateId);
    }
    async createJob(companyId, dto) {
        return this.hrService.createJob(companyId, dto);
    }
    async getJobs(companyId, status, department) {
        return this.hrService.getJobs(companyId, { status, department });
    }
    async updateJob(companyId, jobId, dto) {
        return this.hrService.updateJob(companyId, jobId, dto);
    }
    async deleteJob(companyId, jobId) {
        await this.hrService.deleteJob(companyId, jobId);
    }
    async matchCandidates(companyId, dto) {
        return this.hrService.matchCandidates(companyId, dto);
    }
    async createEmployee(companyId, dto) {
        return this.hrService.createEmployee(companyId, dto);
    }
    async getEmployees(companyId, department) {
        return this.hrService.getEmployees(companyId, department);
    }
    async updateEmployee(companyId, employeeId, dto) {
        return this.hrService.updateEmployee(companyId, employeeId, dto);
    }
    async createPerformanceReview(companyId, dto) {
        return this.hrService.createPerformanceReview(companyId, dto);
    }
    async getPerformanceReviews(companyId, employeeId) {
        return this.hrService.getPerformanceReviews(companyId, employeeId);
    }
    async submitWellnessSurvey(companyId, employeeId, dto) {
        return this.hrService.submitWellnessSurvey(companyId, employeeId, dto);
    }
    async getWellnessAnalytics(companyId) {
        return this.hrService.getWellnessAnalytics(companyId);
    }
    async getAnalytics(companyId) {
        return this.hrService.getAnalytics(companyId);
    }
};
exports.HrController = HrController;
__decorate([
    (0, common_1.Post)('candidates'),
    (0, swagger_1.ApiOperation)({ summary: 'Create new candidate - First recruitment spell' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Candidate created with AI match score' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, hr_dto_1.CreateCandidateDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "createCandidate", null);
__decorate([
    (0, common_1.Get)('candidates'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all candidates with filtering' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: hr_dto_1.CandidateStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'jobId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'minScore', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', type: Number, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: Number, required: false }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('jobId')),
    __param(3, (0, common_1.Query)('minScore')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, String, Number, Number]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "getCandidates", null);
__decorate([
    (0, common_1.Put)('candidates/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update candidate - Pipeline advancement' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Candidate ID' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, hr_dto_1.UpdateCandidateDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "updateCandidate", null);
__decorate([
    (0, common_1.Delete)('candidates/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete candidate' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Candidate ID' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "deleteCandidate", null);
__decorate([
    (0, common_1.Post)('jobs'),
    (0, swagger_1.ApiOperation)({ summary: 'Create job posting - Talent attraction incantation' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Job posting created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, hr_dto_1.CreateJobDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "createJob", null);
__decorate([
    (0, common_1.Get)('jobs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all job postings' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: hr_dto_1.JobStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'department', required: false }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('department')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "getJobs", null);
__decorate([
    (0, common_1.Put)('jobs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update job posting' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, hr_dto_1.UpdateJobDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "updateJob", null);
__decorate([
    (0, common_1.Delete)('jobs/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete job posting' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "deleteJob", null);
__decorate([
    (0, common_1.Post)('ats/match'),
    (0, swagger_1.ApiOperation)({ summary: 'AI-powered candidate matching - 99% accuracy spell' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Matched candidates with scores and recommendations' }),
    openapi.ApiResponse({ status: 201, type: [require("./dto/hr.dto").ATSMatchResultDto] }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, hr_dto_1.ATSMatchRequestDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "matchCandidates", null);
__decorate([
    (0, common_1.Post)('employees'),
    (0, swagger_1.ApiOperation)({ summary: 'Create employee record' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Employee created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, hr_dto_1.CreateEmployeeDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "createEmployee", null);
__decorate([
    (0, common_1.Get)('employees'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all employees' }),
    (0, swagger_1.ApiQuery)({ name: 'department', required: false }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Query)('department')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "getEmployees", null);
__decorate([
    (0, common_1.Put)('employees/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update employee' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Employee ID' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, hr_dto_1.UpdateEmployeeDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "updateEmployee", null);
__decorate([
    (0, common_1.Post)('performance/reviews'),
    (0, swagger_1.ApiOperation)({ summary: 'Create performance review - 360° evaluation elixir' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Performance review created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, hr_dto_1.CreatePerformanceReviewDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "createPerformanceReview", null);
__decorate([
    (0, common_1.Get)('performance/reviews/:employeeId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get performance reviews for employee' }),
    (0, swagger_1.ApiParam)({ name: 'employeeId', description: 'Employee ID' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "getPerformanceReviews", null);
__decorate([
    (0, common_1.Post)('wellness/survey/:employeeId'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit wellness survey - Health aura measurement' }),
    (0, swagger_1.ApiParam)({ name: 'employeeId', description: 'Employee ID' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __param(1, (0, common_1.Param)('employeeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, hr_dto_1.WellnessSurveyDto]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "submitWellnessSurvey", null);
__decorate([
    (0, common_1.Get)('wellness/analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get wellness analytics for company' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "getWellnessAnalytics", null);
__decorate([
    (0, common_1.Get)('analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get HR dashboard analytics' }),
    openapi.ApiResponse({ status: 200, type: require("./dto/hr.dto").HRAnalyticsDto }),
    __param(0, (0, company_id_decorator_1.CompanyId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HrController.prototype, "getAnalytics", null);
exports.HrController = HrController = __decorate([
    (0, swagger_1.ApiTags)('HR Intelligence'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('hr'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    __metadata("design:paramtypes", [hr_service_1.HrService])
], HrController);
//# sourceMappingURL=hr.controller.js.map