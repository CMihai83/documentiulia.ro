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
exports.TopicFilterDto = exports.UpdateReplyDto = exports.CreateReplyDto = exports.UpdateTopicDto = exports.CreateTopicDto = exports.UpdateCategoryDto = exports.CreateCategoryDto = void 0;
const openapi = require("@nestjs/swagger");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateCategoryDto {
    name;
    slug;
    description;
    icon;
    color;
    sortOrder;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, slug: { required: true, type: () => String }, description: { required: false, type: () => String }, icon: { required: false, type: () => String }, color: { required: false, type: () => String }, sortOrder: { required: false, type: () => Number } };
    }
}
exports.CreateCategoryDto = CreateCategoryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category name' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'URL-friendly slug' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Icon name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category color (hex)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCategoryDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort order' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateCategoryDto.prototype, "sortOrder", void 0);
class UpdateCategoryDto {
    name;
    description;
    icon;
    color;
    sortOrder;
    isActive;
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: false, type: () => String }, description: { required: false, type: () => String }, icon: { required: false, type: () => String }, color: { required: false, type: () => String }, sortOrder: { required: false, type: () => Number }, isActive: { required: false, type: () => Boolean } };
    }
}
exports.UpdateCategoryDto = UpdateCategoryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCategoryDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCategoryDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Icon name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCategoryDto.prototype, "icon", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category color (hex)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCategoryDto.prototype, "color", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Sort order' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateCategoryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is active' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCategoryDto.prototype, "isActive", void 0);
class CreateTopicDto {
    title;
    content;
    categoryId;
    tags;
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: true, type: () => String }, content: { required: true, type: () => String }, categoryId: { required: true, type: () => String }, tags: { required: false, type: () => [String] } };
    }
}
exports.CreateTopicDto = CreateTopicDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Topic title' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTopicDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Topic content (markdown supported)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTopicDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTopicDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tags' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateTopicDto.prototype, "tags", void 0);
class UpdateTopicDto {
    title;
    content;
    tags;
    isPinned;
    isLocked;
    isSolved;
    static _OPENAPI_METADATA_FACTORY() {
        return { title: { required: false, type: () => String }, content: { required: false, type: () => String }, tags: { required: false, type: () => [String] }, isPinned: { required: false, type: () => Boolean }, isLocked: { required: false, type: () => Boolean }, isSolved: { required: false, type: () => Boolean } };
    }
}
exports.UpdateTopicDto = UpdateTopicDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Topic title' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTopicDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Topic content' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTopicDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Tags' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateTopicDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is pinned' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTopicDto.prototype, "isPinned", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is locked' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTopicDto.prototype, "isLocked", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Is solved' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateTopicDto.prototype, "isSolved", void 0);
class CreateReplyDto {
    content;
    parentId;
    static _OPENAPI_METADATA_FACTORY() {
        return { content: { required: true, type: () => String }, parentId: { required: false, type: () => String } };
    }
}
exports.CreateReplyDto = CreateReplyDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Reply content (markdown supported)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReplyDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Parent reply ID for nested replies' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReplyDto.prototype, "parentId", void 0);
class UpdateReplyDto {
    content;
    static _OPENAPI_METADATA_FACTORY() {
        return { content: { required: false, type: () => String } };
    }
}
exports.UpdateReplyDto = UpdateReplyDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Reply content' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateReplyDto.prototype, "content", void 0);
class TopicFilterDto {
    categoryId;
    search;
    tag;
    isSolved;
    page = 1;
    limit = 20;
    static _OPENAPI_METADATA_FACTORY() {
        return { categoryId: { required: false, type: () => String }, search: { required: false, type: () => String }, tag: { required: false, type: () => String }, isSolved: { required: false, type: () => Boolean }, page: { required: false, type: () => Number, default: 1, minimum: 1 }, limit: { required: false, type: () => Number, default: 20, minimum: 1, maximum: 100 } };
    }
}
exports.TopicFilterDto = TopicFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category ID' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TopicFilterDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Search query' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TopicFilterDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by tag' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TopicFilterDto.prototype, "tag", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter solved topics' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TopicFilterDto.prototype, "isSolved", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Page number', default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], TopicFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Items per page', default: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], TopicFilterDto.prototype, "limit", void 0);
//# sourceMappingURL=forum.dto.js.map