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
exports.WebhooksController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const webhooks_service_1 = require("./webhooks.service");
const webhook_dto_1 = require("./dto/webhook.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let WebhooksController = class WebhooksController {
    webhooksService;
    constructor(webhooksService) {
        this.webhooksService = webhooksService;
    }
    getAvailableEvents() {
        return this.webhooksService.getAvailableEvents();
    }
    async create(companyId, user, dto) {
        return this.webhooksService.create(companyId, dto, user.id);
    }
    async findAll(companyId, user) {
        return this.webhooksService.findAll(companyId, user.id);
    }
    async findOne(companyId, id, user) {
        return this.webhooksService.findOne(companyId, id, user.id);
    }
    async update(companyId, id, user, dto) {
        return this.webhooksService.update(companyId, id, dto, user.id);
    }
    async remove(companyId, id, user) {
        return this.webhooksService.remove(companyId, id, user.id);
    }
    async getLogs(companyId, id, user, limit) {
        return this.webhooksService.getLogs(companyId, id, user.id, limit);
    }
    async test(companyId, id, user) {
        return this.webhooksService.test(companyId, id, user.id);
    }
    async retry(companyId, logId, user) {
        return this.webhooksService.retry(companyId, logId, user.id);
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Get)('events'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available webhook events' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Available events returned' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WebhooksController.prototype, "getAvailableEvents", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new webhook' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Webhook created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, webhook_dto_1.CreateWebhookDto]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all webhooks' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhooks returned' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get webhook by ID' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Webhook ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Webhook not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update webhook' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Webhook ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, webhook_dto_1.UpdateWebhookDto]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete webhook' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Webhook ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook deleted' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/logs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get webhook delivery logs' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Webhook ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logs returned' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Number]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Post)(':id/test'),
    (0, swagger_1.ApiOperation)({ summary: 'Send test webhook' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Webhook ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Test webhook sent' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "test", null);
__decorate([
    (0, common_1.Post)('logs/:logId/retry'),
    (0, swagger_1.ApiOperation)({ summary: 'Retry failed webhook delivery' }),
    (0, swagger_1.ApiParam)({ name: 'companyId', description: 'Company ID' }),
    (0, swagger_1.ApiParam)({ name: 'logId', description: 'Log entry ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook retried' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('logId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "retry", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, swagger_1.ApiTags)('Webhooks'),
    (0, common_1.Controller)('companies/:companyId/webhooks'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [webhooks_service_1.WebhooksService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map