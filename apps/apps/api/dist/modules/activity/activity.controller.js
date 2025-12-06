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
exports.ActivityController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const activity_service_1 = require("./activity.service");
const activity_dto_1 = require("./dto/activity.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let ActivityController = class ActivityController {
    activityService;
    constructor(activityService) {
        this.activityService = activityService;
    }
    async findAll(filters) {
        return this.activityService.findAll(filters);
    }
    async findByCompany(companyId, filters) {
        return this.activityService.findByCompany(companyId, filters);
    }
    async getRecentActivity(limit) {
        return this.activityService.getRecentActivity(limit || 20);
    }
    async getStats(startDate, endDate) {
        return this.activityService.getStats(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    }
    async getMyActivity(user, limit) {
        return this.activityService.getByUser(user.id, limit || 50);
    }
    async getByEntity(entityType, entityId) {
        return this.activityService.getByEntity(entityType, entityId);
    }
    async getByUser(userId, limit) {
        return this.activityService.getByUser(userId, limit || 50);
    }
    async cleanup(retentionDays) {
        return this.activityService.cleanup(retentionDays || 90);
    }
};
exports.ActivityController = ActivityController;
__decorate([
    (0, common_1.Get)('activity'),
    (0, swagger_1.ApiOperation)({ summary: 'Get activity logs with filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Activity logs returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [activity_dto_1.ActivityFilterDto]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/activity'),
    (0, swagger_1.ApiOperation)({ summary: 'Get company activity logs' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Company activity logs returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, activity_dto_1.ActivityFilterDto]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "findByCompany", null);
__decorate([
    (0, common_1.Get)('activity/recent'),
    (0, swagger_1.ApiOperation)({ summary: 'Get recent activity' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Recent activity returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getRecentActivity", null);
__decorate([
    (0, common_1.Get)('activity/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get activity statistics' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Activity stats returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('activity/me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user activity' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User activity returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getMyActivity", null);
__decorate([
    (0, common_1.Get)('activity/entity/:entityType/:entityId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get activity for a specific entity' }),
    (0, swagger_1.ApiParam)({ name: 'entityType', description: 'Entity type (invoice, expense, etc.)' }),
    (0, swagger_1.ApiParam)({ name: 'entityId', description: 'Entity ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Entity activity returned' }),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __param(0, (0, common_1.Param)('entityType')),
    __param(1, (0, common_1.Param)('entityId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getByEntity", null);
__decorate([
    (0, common_1.Get)('activity/user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get activity for a specific user' }),
    (0, swagger_1.ApiParam)({ name: 'userId', description: 'User ID' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User activity returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getByUser", null);
__decorate([
    (0, common_1.Post)('activity/cleanup'),
    (0, swagger_1.ApiOperation)({ summary: 'Cleanup old activity logs (admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'retentionDays', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cleanup completed' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Query)('retentionDays')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "cleanup", null);
exports.ActivityController = ActivityController = __decorate([
    (0, swagger_1.ApiTags)('Activity Log'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [activity_service_1.ActivityService])
], ActivityController);
//# sourceMappingURL=activity.controller.js.map