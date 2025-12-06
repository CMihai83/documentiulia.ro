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
exports.ForumController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const forum_service_1 = require("./forum.service");
const forum_dto_1 = require("./dto/forum.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let ForumController = class ForumController {
    forumService;
    constructor(forumService) {
        this.forumService = forumService;
    }
    async getCategories() {
        return this.forumService.getCategories();
    }
    async getCategoryBySlug(slug) {
        return this.forumService.getCategoryBySlug(slug);
    }
    async createCategory(dto) {
        return this.forumService.createCategory(dto);
    }
    async updateCategory(id, dto) {
        return this.forumService.updateCategory(id, dto);
    }
    async deleteCategory(id) {
        return this.forumService.deleteCategory(id);
    }
    async getTopics(filters) {
        return this.forumService.getTopics(filters);
    }
    async getTopicBySlug(categorySlug, topicSlug) {
        return this.forumService.getTopicBySlug(categorySlug, topicSlug);
    }
    async createTopic(user, dto) {
        return this.forumService.createTopic(user.id, dto);
    }
    async updateTopic(id, user, dto) {
        return this.forumService.updateTopic(id, user.id, dto);
    }
    async deleteTopic(id, user) {
        return this.forumService.deleteTopic(id, user.id);
    }
    async createReply(topicId, user, dto) {
        return this.forumService.createReply(topicId, user.id, dto);
    }
    async updateReply(id, user, dto) {
        return this.forumService.updateReply(id, user.id, dto);
    }
    async deleteReply(id, user) {
        return this.forumService.deleteReply(id, user.id);
    }
    async markReplyAsAccepted(topicId, replyId, user) {
        return this.forumService.markReplyAsAccepted(topicId, replyId, user.id);
    }
    async getForumStats() {
        return this.forumService.getForumStats();
    }
};
exports.ForumController = ForumController;
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all forum categories' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Categories returned' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('categories/:slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get category by slug' }),
    (0, swagger_1.ApiParam)({ name: 'slug', description: 'Category slug' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Category not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "getCategoryBySlug", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new category (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Category created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forum_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Put)('categories/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update category (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Category ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, forum_dto_1.UpdateCategoryDto]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete category (admin only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Category ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category deleted' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Get)('topics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all topics with filters' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Topics returned' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forum_dto_1.TopicFilterDto]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "getTopics", null);
__decorate([
    (0, common_1.Get)('topics/:categorySlug/:topicSlug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get topic by slug' }),
    (0, swagger_1.ApiParam)({ name: 'categorySlug', description: 'Category slug' }),
    (0, swagger_1.ApiParam)({ name: 'topicSlug', description: 'Topic slug' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Topic returned' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Topic not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('categorySlug')),
    __param(1, (0, common_1.Param)('topicSlug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "getTopicBySlug", null);
__decorate([
    (0, common_1.Post)('topics'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new topic' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Topic created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, forum_dto_1.CreateTopicDto]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "createTopic", null);
__decorate([
    (0, common_1.Put)('topics/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update topic' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Topic ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Topic updated' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, forum_dto_1.UpdateTopicDto]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "updateTopic", null);
__decorate([
    (0, common_1.Delete)('topics/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete topic' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Topic ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Topic deleted' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "deleteTopic", null);
__decorate([
    (0, common_1.Post)('topics/:topicId/replies'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a reply to a topic' }),
    (0, swagger_1.ApiParam)({ name: 'topicId', description: 'Topic ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Reply created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('topicId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, forum_dto_1.CreateReplyDto]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "createReply", null);
__decorate([
    (0, common_1.Put)('replies/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update reply' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Reply ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reply updated' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, forum_dto_1.UpdateReplyDto]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "updateReply", null);
__decorate([
    (0, common_1.Delete)('replies/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete reply' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Reply ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reply deleted' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "deleteReply", null);
__decorate([
    (0, common_1.Post)('topics/:topicId/replies/:replyId/accept'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Mark reply as accepted solution' }),
    (0, swagger_1.ApiParam)({ name: 'topicId', description: 'Topic ID' }),
    (0, swagger_1.ApiParam)({ name: 'replyId', description: 'Reply ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reply marked as accepted' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('topicId')),
    __param(1, (0, common_1.Param)('replyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "markReplyAsAccepted", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get forum statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Forum stats returned' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ForumController.prototype, "getForumStats", null);
exports.ForumController = ForumController = __decorate([
    (0, swagger_1.ApiTags)('Forum'),
    (0, common_1.Controller)('forum'),
    __metadata("design:paramtypes", [forum_service_1.ForumService])
], ForumController);
//# sourceMappingURL=forum.controller.js.map