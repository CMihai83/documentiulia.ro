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
exports.CompaniesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const companies_service_1 = require("./companies.service");
const create_company_dto_1 = require("./dto/create-company.dto");
const update_company_dto_1 = require("./dto/update-company.dto");
const add_member_dto_1 = require("./dto/add-member.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let CompaniesController = class CompaniesController {
    companiesService;
    constructor(companiesService) {
        this.companiesService = companiesService;
    }
    async create(dto, user) {
        return this.companiesService.create(dto, user.id);
    }
    async findAll(user) {
        return this.companiesService.findAll(user.id);
    }
    async findOne(id, user) {
        return this.companiesService.findOne(id, user.id);
    }
    async update(id, dto, user) {
        return this.companiesService.update(id, dto, user.id);
    }
    async delete(id, user) {
        return this.companiesService.delete(id, user.id);
    }
    async getMembers(id, user) {
        return this.companiesService.getMembers(id, user.id);
    }
    async addMember(id, dto, user) {
        return this.companiesService.addMember(id, dto, user.id);
    }
    async updateMemberRole(id, memberId, dto, user) {
        return this.companiesService.updateMemberRole(id, memberId, dto, user.id);
    }
    async removeMember(id, memberId, user) {
        return this.companiesService.removeMember(id, memberId, user.id);
    }
    async getStats(id, user) {
        return this.companiesService.getStats(id, user.id);
    }
};
exports.CompaniesController = CompaniesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new company' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Company created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Company with CUI already exists' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_dto_1.CreateCompanyDto, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all companies for current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Companies returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get company by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update company' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company updated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'No permission' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Company not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_company_dto_1.UpdateCompanyDto, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete company' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Company deleted' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Only owner can delete' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(':id/members'),
    (0, swagger_1.ApiOperation)({ summary: 'Get company members' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Members returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "getMembers", null);
__decorate([
    (0, common_1.Post)(':id/members'),
    (0, swagger_1.ApiOperation)({ summary: 'Add member to company' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Member added' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Already a member' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_member_dto_1.AddMemberDto, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "addMember", null);
__decorate([
    (0, common_1.Put)(':id/members/:memberId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update member role' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'memberId', description: 'Member user ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Role updated' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, add_member_dto_1.UpdateMemberRoleDto, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "updateMemberRole", null);
__decorate([
    (0, common_1.Delete)(':id/members/:memberId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Remove member from company' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'memberId', description: 'Member user ID' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Member removed' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "removeMember", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get company statistics' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Stats returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "getStats", null);
exports.CompaniesController = CompaniesController = __decorate([
    (0, swagger_1.ApiTags)('Companies'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('companies'),
    __metadata("design:paramtypes", [companies_service_1.CompaniesService])
], CompaniesController);
//# sourceMappingURL=companies.controller.js.map