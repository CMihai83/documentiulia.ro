import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum BlogPostStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  SCHEDULED = 'SCHEDULED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum CommentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SPAM = 'SPAM',
}

// ==================== CATEGORY DTOs ====================

export class CreateBlogCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Legislație Fiscală' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'URL-friendly slug', example: 'legislatie-fiscala' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  slug!: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Icon identifier' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Category color', example: '#3b82f6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateBlogCategoryDto {
  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Icon identifier' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Category color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is category active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== POST DTOs ====================

export class CreateBlogPostDto {
  @ApiProperty({ description: 'Post title', example: 'Modificări TVA 2025' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: 'Post excerpt/summary' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiProperty({ description: 'Post content in Markdown/HTML' })
  @IsString()
  @MinLength(50)
  content!: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Tags', example: ['tva', 'legislatie', '2025'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'SEO meta title' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'SEO meta keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({ description: 'Language code', example: 'ro' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class UpdateBlogPostDto {
  @ApiPropertyOptional({ description: 'Post title' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Post excerpt/summary' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Post content' })
  @IsOptional()
  @IsString()
  @MinLength(50)
  content?: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'SEO meta title' })
  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO meta description' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'SEO meta keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];
}

export class SubmitForReviewDto {
  @ApiPropertyOptional({ description: 'Reviewer notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ReviewPostDto {
  @ApiProperty({ description: 'Approve or reject', enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @ApiPropertyOptional({ description: 'Rejection reason (required if rejecting)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}

export class PublishPostDto {
  @ApiPropertyOptional({ description: 'Schedule for future publishing' })
  @IsOptional()
  scheduledAt?: Date;
}

export class BlogPostFilterDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Search in title/content' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: BlogPostStatus })
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @ApiPropertyOptional({ description: 'Filter by author ID' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ description: 'Filter AI-generated posts' })
  @IsOptional()
  @IsBoolean()
  isAiGenerated?: boolean;

  @ApiPropertyOptional({ description: 'Filter by language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

// ==================== AI GENERATION DTOs ====================

export class GenerateBlogPostDto {
  @ApiProperty({ description: 'Topic/prompt for AI generation', example: 'Noile reglementări e-Factura 2025' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  topic!: string;

  @ApiPropertyOptional({ description: 'Category ID for the post' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Target tags', example: ['efactura', 'anaf'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Target length in words', default: 800 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(300)
  @Max(3000)
  targetWordCount?: number;

  @ApiPropertyOptional({ description: 'Writing style', example: 'professional' })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({ description: 'Source URLs for research' })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  sourceUrls?: string[];

  @ApiPropertyOptional({ description: 'Language code', default: 'ro' })
  @IsOptional()
  @IsString()
  language?: string;
}

// ==================== COMMENT DTOs ====================

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  content!: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Guest author name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorName?: string;

  @ApiPropertyOptional({ description: 'Guest author email' })
  @IsOptional()
  @IsString()
  authorEmail?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  content!: string;
}

export class ModerateCommentDto {
  @ApiProperty({ description: 'Moderation action', enum: CommentStatus })
  @IsEnum(CommentStatus)
  status!: CommentStatus;
}

export class CommentFilterDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: CommentStatus })
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ==================== RSS DTO ====================

export interface RssFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
  category?: string;
  guid: string;
}
