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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentFilterDto = exports.ModerateCommentDto = exports.UpdateCommentDto = exports.CreateCommentDto = exports.GenerateBlogPostDto = exports.BlogPostFilterDto = exports.PublishPostDto = exports.ReviewPostDto = exports.SubmitForReviewDto = exports.UpdateBlogPostDto = exports.CreateBlogPostDto = exports.UpdateBlogCategoryDto = exports.CreateBlogCategoryDto = exports.CommentStatus = exports.BlogPostStatus = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var BlogPostStatus;
(function (BlogPostStatus) {
    BlogPostStatus["DRAFT"] = "DRAFT";
    BlogPostStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    BlogPostStatus["APPROVED"] = "APPROVED";
    BlogPostStatus["PUBLISHED"] = "PUBLISHED";
    BlogPostStatus["SCHEDULED"] = "SCHEDULED";
    BlogPostStatus["REJECTED"] = "REJECTED";
    BlogPostStatus["ARCHIVED"] = "ARCHIVED";
})(BlogPostStatus || (exports.BlogPostStatus = BlogPostStatus = {}));
var CommentStatus;
(function (CommentStatus) {
    CommentStatus["PENDING"] = "PENDING";
    CommentStatus["APPROVED"] = "APPROVED";
    CommentStatus["REJECTED"] = "REJECTED";
    CommentStatus["SPAM"] = "SPAM";
})(CommentStatus || (exports.CommentStatus = CommentStatus = {}));
class CreateBlogCategoryDto {
    name;
    slug;
    description;
    icon;
    color;
    sortOrder;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String, minLength: 2, maxLength: 100 }, slug: { required: true, type: () => String, minLength: 2, maxLength: 100 }, description: { required: false, type: () => String, maxLength: 500 }, icon: { required: false, type: () => String }, color: { required: false, type: () => String }, sortOrder: { required: false, type: () => Number } };
    }
}
exports.CreateBlogCategoryDto = CreateBlogCategoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category name', example: 'Legislație Fiscală' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateBlogCategoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'URL-friendly slug', example: 'legislatie-fiscala' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateBlogCategoryDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateBlogCategoryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Icon identifier' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBlogCategoryDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category color', example: '#3b82f6' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBlogCategoryDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort order' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateBlogCategoryDto.prototype, "sortOrder", void 0);
class UpdateBlogCategoryDto {
    name;
    description;
    icon;
    color;
    sortOrder;
    isActive;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String, minLength: 2, maxLength: 100 }, description: { required: false, type: () => String, maxLength: 500 }, icon: { required: false, type: () => String }, color: { required: false, type: () => String }, sortOrder: { required: false, type: () => Number }, isActive: { required: false, type: () => Boolean } };
    }
}
exports.UpdateBlogCategoryDto = UpdateBlogCategoryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateBlogCategoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateBlogCategoryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Icon identifier' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBlogCategoryDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category color' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBlogCategoryDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort order' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], UpdateBlogCategoryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is category active' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateBlogCategoryDto.prototype, "isActive", void 0);
class CreateBlogPostDto {
    title;
    excerpt;
    content;
    coverImage;
    categoryId;
    tags;
    metaTitle;
    metaDescription;
    metaKeywords;
    language;
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: true, type: () => String, minLength: 5, maxLength: 200 }, excerpt: { required: false, type: () => String, maxLength: 500 }, content: { required: true, type: () => String, minLength: 50 }, coverImage: { required: false, type: () => String }, categoryId: { required: false, type: () => String }, tags: { required: false, type: () => [String] }, metaTitle: { required: false, type: () => String, maxLength: 70 }, metaDescription: { required: false, type: () => String, maxLength: 160 }, metaKeywords: { required: false, type: () => [String] }, language: { required: false, type: () => String } };
    }
}
exports.CreateBlogPostDto = CreateBlogPostDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Post title', example: 'Modificări TVA 2025' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateBlogPostDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Post excerpt/summary' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateBlogPostDto.prototype, "excerpt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Post content in Markdown/HTML' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(50),
    __metadata("design:type", String)
], CreateBlogPostDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cover image URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateBlogPostDto.prototype, "coverImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBlogPostDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tags', example: ['tva', 'legislatie', '2025'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateBlogPostDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SEO meta title' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(70),
    __metadata("design:type", String)
], CreateBlogPostDto.prototype, "metaTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SEO meta description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], CreateBlogPostDto.prototype, "metaDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SEO meta keywords' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateBlogPostDto.prototype, "metaKeywords", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Language code', example: 'ro' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBlogPostDto.prototype, "language", void 0);
class UpdateBlogPostDto {
    title;
    excerpt;
    content;
    coverImage;
    categoryId;
    tags;
    metaTitle;
    metaDescription;
    metaKeywords;
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: false, type: () => String, minLength: 5, maxLength: 200 }, excerpt: { required: false, type: () => String, maxLength: 500 }, content: { required: false, type: () => String, minLength: 50 }, coverImage: { required: false, type: () => String }, categoryId: { required: false, type: () => String }, tags: { required: false, type: () => [String] }, metaTitle: { required: false, type: () => String, maxLength: 70 }, metaDescription: { required: false, type: () => String, maxLength: 160 }, metaKeywords: { required: false, type: () => [String] } };
    }
}
exports.UpdateBlogPostDto = UpdateBlogPostDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Post title' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], UpdateBlogPostDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Post excerpt/summary' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateBlogPostDto.prototype, "excerpt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Post content' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(50),
    __metadata("design:type", String)
], UpdateBlogPostDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cover image URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], UpdateBlogPostDto.prototype, "coverImage", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBlogPostDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tags' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateBlogPostDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SEO meta title' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(70),
    __metadata("design:type", String)
], UpdateBlogPostDto.prototype, "metaTitle", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SEO meta description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], UpdateBlogPostDto.prototype, "metaDescription", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'SEO meta keywords' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateBlogPostDto.prototype, "metaKeywords", void 0);
class SubmitForReviewDto {
    notes;
    static _OPENAPI_METADATA_FACTORY() {
        return { notes: { required: false, type: () => String, maxLength: 1000 } };
    }
}
exports.SubmitForReviewDto = SubmitForReviewDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reviewer notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], SubmitForReviewDto.prototype, "notes", void 0);
class ReviewPostDto {
    action;
    rejectionReason;
    static _OPENAPI_METADATA_FACTORY() {
        return { action: { required: true, type: () => Object }, rejectionReason: { required: false, type: () => String, maxLength: 1000 } };
    }
}
exports.ReviewPostDto = ReviewPostDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Approve or reject', enum: ['approve', 'reject'] }),
    (0, class_validator_1.IsEnum)(['approve', 'reject']),
    __metadata("design:type", String)
], ReviewPostDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Rejection reason (required if rejecting)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], ReviewPostDto.prototype, "rejectionReason", void 0);
class PublishPostDto {
    scheduledAt;
    static _OPENAPI_METADATA_FACTORY() {
        return { scheduledAt: { required: false, type: () => Date } };
    }
}
exports.PublishPostDto = PublishPostDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Schedule for future publishing' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Date)
], PublishPostDto.prototype, "scheduledAt", void 0);
class BlogPostFilterDto {
    categoryId;
    tag;
    search;
    status;
    authorId;
    isAiGenerated;
    language;
    page;
    limit;
    static _OPENAPI_METADATA_FACTORY() {
        return { categoryId: { required: false, type: () => String }, tag: { required: false, type: () => String }, search: { required: false, type: () => String }, status: { required: false, enum: require("./blog.dto").BlogPostStatus }, authorId: { required: false, type: () => String }, isAiGenerated: { required: false, type: () => Boolean }, language: { required: false, type: () => String }, page: { required: false, type: () => Number, minimum: 1 }, limit: { required: false, type: () => Number, minimum: 1, maximum: 50 } };
    }
}
exports.BlogPostFilterDto = BlogPostFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by category ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BlogPostFilterDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by tag' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BlogPostFilterDto.prototype, "tag", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search in title/content' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BlogPostFilterDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by status', enum: BlogPostStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(BlogPostStatus),
    __metadata("design:type", String)
], BlogPostFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by author ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BlogPostFilterDto.prototype, "authorId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter AI-generated posts' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], BlogPostFilterDto.prototype, "isAiGenerated", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by language' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BlogPostFilterDto.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], BlogPostFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Items per page', default: 10 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    __metadata("design:type", Number)
], BlogPostFilterDto.prototype, "limit", void 0);
class GenerateBlogPostDto {
    topic;
    categoryId;
    tags;
    targetWordCount;
    style;
    sourceUrls;
    language;
    static _OPENAPI_METADATA_FACTORY() {
        return { topic: { required: true, type: () => String, minLength: 10, maxLength: 500 }, categoryId: { required: false, type: () => String }, tags: { required: false, type: () => [String] }, targetWordCount: { required: false, type: () => Number, minimum: 300, maximum: 3000 }, style: { required: false, type: () => String }, sourceUrls: { required: false, type: () => [String] }, language: { required: false, type: () => String } };
    }
}
exports.GenerateBlogPostDto = GenerateBlogPostDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Topic/prompt for AI generation', example: 'Noile reglementări e-Factura 2025' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(10),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], GenerateBlogPostDto.prototype, "topic", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category ID for the post' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateBlogPostDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Target tags', example: ['efactura', 'anaf'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], GenerateBlogPostDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Target length in words', default: 800 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(300),
    (0, class_validator_1.Max)(3000),
    __metadata("design:type", Number)
], GenerateBlogPostDto.prototype, "targetWordCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Writing style', example: 'professional' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateBlogPostDto.prototype, "style", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Source URLs for research' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUrl)({}, { each: true }),
    __metadata("design:type", Array)
], GenerateBlogPostDto.prototype, "sourceUrls", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Language code', default: 'ro' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GenerateBlogPostDto.prototype, "language", void 0);
class CreateCommentDto {
    content;
    parentId;
    authorName;
    authorEmail;
    static _OPENAPI_METADATA_FACTORY() {
        return { content: { required: true, type: () => String, minLength: 5, maxLength: 5000 }, parentId: { required: false, type: () => String }, authorName: { required: false, type: () => String, maxLength: 100 }, authorEmail: { required: false, type: () => String } };
    }
}
exports.CreateCommentDto = CreateCommentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Comment content' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Parent comment ID for replies' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "parentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Guest author name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "authorName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Guest author email' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "authorEmail", void 0);
class UpdateCommentDto {
    content;
    static _OPENAPI_METADATA_FACTORY() {
        return { content: { required: true, type: () => String, minLength: 5, maxLength: 5000 } };
    }
}
exports.UpdateCommentDto = UpdateCommentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Comment content' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(5),
    (0, class_validator_1.MaxLength)(5000),
    __metadata("design:type", String)
], UpdateCommentDto.prototype, "content", void 0);
class ModerateCommentDto {
    status;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: true, enum: require("./blog.dto").CommentStatus } };
    }
}
exports.ModerateCommentDto = ModerateCommentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Moderation action', enum: CommentStatus }),
    (0, class_validator_1.IsEnum)(CommentStatus),
    __metadata("design:type", String)
], ModerateCommentDto.prototype, "status", void 0);
class CommentFilterDto {
    status;
    page;
    limit;
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: false, enum: require("./blog.dto").CommentStatus }, page: { required: false, type: () => Number, minimum: 1 }, limit: { required: false, type: () => Number, minimum: 1, maximum: 100 } };
    }
}
exports.CommentFilterDto = CommentFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by status', enum: CommentStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(CommentStatus),
    __metadata("design:type", String)
], CommentFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CommentFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Items per page', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CommentFilterDto.prototype, "limit", void 0);
//# sourceMappingURL=blog.dto.js.map