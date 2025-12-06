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
exports.BlogController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const blog_service_1 = require("./blog.service");
const blog_dto_1 = require("./dto/blog.dto");
const clerk_guard_1 = require("../auth/guards/clerk.guard");
let BlogController = class BlogController {
    blogService;
    constructor(blogService) {
        this.blogService = blogService;
    }
    async getPosts(filters) {
        return this.blogService.getPosts(filters);
    }
    async getPostBySlug(slug) {
        return this.blogService.getPostBySlug(slug);
    }
    async getCategories() {
        return this.blogService.getCategories();
    }
    async getCategoryBySlug(slug) {
        return this.blogService.getCategoryBySlug(slug);
    }
    async getRssFeed(res) {
        const items = await this.blogService.getRssFeed();
        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DocumentIulia Blog - Contabilitate și Fiscalitate</title>
    <link>https://documentiulia.ro/blog</link>
    <description>Articole despre contabilitate, fiscalitate și legislație românească</description>
    <language>ro</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://documentiulia.ro/blog/feed/rss" rel="self" type="application/rss+xml"/>
    ${items
            .map((item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${item.guid}</guid>
      ${item.author ? `<author>${item.author}</author>` : ''}
      ${item.category ? `<category>${item.category}</category>` : ''}
    </item>`)
            .join('\n')}
  </channel>
</rss>`;
        res.set('Content-Type', 'application/rss+xml; charset=utf-8');
        res.send(rss);
    }
    async getBlogStats() {
        return this.blogService.getBlogStats();
    }
    async getComments(postId, filters) {
        return this.blogService.getComments(postId, filters);
    }
    async createComment(postId, dto, req) {
        const userId = req.auth?.userId || null;
        return this.blogService.createComment(postId, userId, dto);
    }
    async createPost(req, dto) {
        return this.blogService.createPost(req.user.clerkId, dto);
    }
    async updatePost(id, req, dto) {
        return this.blogService.updatePost(id, req.user.clerkId, dto);
    }
    async deletePost(id, req) {
        return this.blogService.deletePost(id, req.user.clerkId);
    }
    async submitForReview(id, req) {
        return this.blogService.submitForReview(id, req.user.clerkId);
    }
    async publishPost(id, req, dto) {
        return this.blogService.publishPost(id, req.user.clerkId, dto);
    }
    async unpublishPost(id) {
        return this.blogService.unpublishPost(id, true);
    }
    async generatePost(req, dto) {
        return this.blogService.generatePost(req.user.clerkId, dto);
    }
    async getAdminPosts(filters) {
        return this.blogService.getPosts({ ...filters, status: filters.status });
    }
    async getAdminPostById(id) {
        return this.blogService.getPostById(id);
    }
    async getPendingReviews(page = 1, limit = 10) {
        return this.blogService.getPendingReviews(page, limit);
    }
    async reviewPost(id, req, dto) {
        return this.blogService.reviewPost(id, req.user.clerkId, dto);
    }
    async getPendingComments(page = 1, limit = 20) {
        return this.blogService.getPendingComments(page, limit);
    }
    async moderateComment(id, req, dto) {
        return this.blogService.moderateComment(id, req.user.clerkId, dto);
    }
    async createCategory(dto) {
        return this.blogService.createCategory(dto);
    }
    async updateCategory(id, dto) {
        return this.blogService.updateCategory(id, dto);
    }
    async deleteCategory(id) {
        return this.blogService.deleteCategory(id);
    }
    async updateComment(id, req, dto) {
        return this.blogService.updateComment(id, req.user.clerkId, dto);
    }
    async deleteComment(id, req) {
        return this.blogService.deleteComment(id, req.user.clerkId);
    }
};
exports.BlogController = BlogController;
__decorate([
    (0, common_1.Get)('posts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get published blog posts' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Blog posts retrieved' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [blog_dto_1.BlogPostFilterDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getPosts", null);
__decorate([
    (0, common_1.Get)('posts/:slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get blog post by slug' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Blog post retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Post not found' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getPostBySlug", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, swagger_1.ApiOperation)({ summary: 'Get blog categories' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Categories retrieved' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('categories/:slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get category by slug' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category retrieved' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Category not found' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getCategoryBySlug", null);
__decorate([
    (0, common_1.Get)('feed/rss'),
    (0, swagger_1.ApiOperation)({ summary: 'Get RSS feed' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'RSS feed generated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getRssFeed", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get blog statistics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Stats retrieved' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getBlogStats", null);
__decorate([
    (0, common_1.Get)('posts/:postId/comments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get comments for a post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comments retrieved' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('postId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, blog_dto_1.CommentFilterDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getComments", null);
__decorate([
    (0, common_1.Post)('posts/:postId/comments'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a comment (guests allowed)' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Comment created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Param)('postId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, blog_dto_1.CreateCommentDto, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "createComment", null);
__decorate([
    (0, common_1.Post)('posts'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new blog post' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Post created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, blog_dto_1.CreateBlogPostDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "createPost", null);
__decorate([
    (0, common_1.Put)('posts/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a blog post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post updated' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, blog_dto_1.UpdateBlogPostDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "updatePost", null);
__decorate([
    (0, common_1.Delete)('posts/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a blog post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post deleted' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "deletePost", null);
__decorate([
    (0, common_1.Post)('posts/:id/submit'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Submit post for review' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post submitted for review' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "submitForReview", null);
__decorate([
    (0, common_1.Post)('posts/:id/publish'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Publish a post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post published' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, blog_dto_1.PublishPostDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "publishPost", null);
__decorate([
    (0, common_1.Post)('posts/:id/unpublish'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Unpublish a post (admin only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post unpublished' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "unpublishPost", null);
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Generate blog post with AI' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'AI-generated post created' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, blog_dto_1.GenerateBlogPostDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "generatePost", null);
__decorate([
    (0, common_1.Get)('admin/posts'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all posts (admin view)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Posts retrieved' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [blog_dto_1.BlogPostFilterDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getAdminPosts", null);
__decorate([
    (0, common_1.Get)('admin/posts/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get post by ID (admin view)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post retrieved' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getAdminPostById", null);
__decorate([
    (0, common_1.Get)('admin/pending-reviews'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get posts pending review' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pending posts retrieved' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getPendingReviews", null);
__decorate([
    (0, common_1.Post)('admin/posts/:id/review'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Review a post (approve/reject)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post reviewed' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, blog_dto_1.ReviewPostDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "reviewPost", null);
__decorate([
    (0, common_1.Get)('admin/pending-comments'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get comments pending moderation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pending comments retrieved' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getPendingComments", null);
__decorate([
    (0, common_1.Patch)('admin/comments/:id/moderate'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Moderate a comment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment moderated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, blog_dto_1.ModerateCommentDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "moderateComment", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a category' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Category created' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [blog_dto_1.CreateBlogCategoryDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Put)('categories/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update a category' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, blog_dto_1.UpdateBlogCategoryDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a category' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category deleted' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Put)('comments/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update own comment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment updated' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, blog_dto_1.UpdateCommentDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "updateComment", null);
__decorate([
    (0, common_1.Delete)('comments/:id'),
    (0, common_1.UseGuards)(clerk_guard_1.ClerkAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete own comment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment deleted' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "deleteComment", null);
exports.BlogController = BlogController = __decorate([
    (0, swagger_1.ApiTags)('Blog'),
    (0, common_1.Controller)('blog'),
    __metadata("design:paramtypes", [blog_service_1.BlogService])
], BlogController);
//# sourceMappingURL=blog.controller.js.map