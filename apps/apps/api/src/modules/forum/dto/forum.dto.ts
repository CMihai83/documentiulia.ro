import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, Min, Max } from 'class-validator';

// Category DTOs
export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'URL-friendly slug' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Category color (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Icon name' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Category color (hex)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Topic DTOs
export class CreateTopicDto {
  @ApiProperty({ description: 'Topic title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Topic content (markdown supported)' })
  @IsString()
  content!: string;

  @ApiProperty({ description: 'Category ID' })
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTopicDto {
  @ApiPropertyOptional({ description: 'Topic title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Topic content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is pinned' })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ description: 'Is locked' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'Is solved' })
  @IsOptional()
  @IsBoolean()
  isSolved?: boolean;
}

// Reply DTOs
export class CreateReplyDto {
  @ApiProperty({ description: 'Reply content (markdown supported)' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Parent reply ID for nested replies' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateReplyDto {
  @ApiPropertyOptional({ description: 'Reply content' })
  @IsOptional()
  @IsString()
  content?: string;
}

// Filter DTOs
export class TopicFilterDto {
  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Filter solved topics' })
  @IsOptional()
  @IsBoolean()
  isSolved?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
