import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { CourseDifficulty } from '@prisma/client';

// Course DTOs
export class CreateCourseDto {
  @ApiProperty({ description: 'Course title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Course description' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Short description for cards' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ description: 'Difficulty level', enum: CourseDifficulty })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Is free course' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Price (if not free)' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: 'Course title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Short description' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional({ description: 'Difficulty level', enum: CourseDifficulty })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Is free course' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Price' })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Is published' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

// Lesson DTOs
export class CreateLessonDto {
  @ApiProperty({ description: 'Lesson title' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Lesson description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Lesson content (markdown)' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is free preview' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;
}

export class UpdateLessonDto {
  @ApiPropertyOptional({ description: 'Lesson title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Lesson description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Lesson content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Is free preview' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Is published' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

// Quiz DTOs
export class CreateQuizDto {
  @ApiProperty({ description: 'Question' })
  @IsString()
  question!: string;

  @ApiProperty({ description: 'Options array' })
  @IsArray()
  @IsString({ each: true })
  options!: string[];

  @ApiProperty({ description: 'Correct answer index (0-based)' })
  @IsNumber()
  correctAnswer!: number;

  @ApiPropertyOptional({ description: 'Explanation' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// Review DTOs
export class CreateReviewDto {
  @ApiProperty({ description: 'Rating 1-5' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Review title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Review content' })
  @IsOptional()
  @IsString()
  content?: string;
}

// Progress DTOs
export class UpdateLessonProgressDto {
  @ApiPropertyOptional({ description: 'Is completed' })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Watched seconds' })
  @IsOptional()
  @IsNumber()
  watchedSeconds?: number;

  @ApiPropertyOptional({ description: 'Quiz passed' })
  @IsOptional()
  @IsBoolean()
  quizPassed?: boolean;

  @ApiPropertyOptional({ description: 'Quiz score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  quizScore?: number;
}

// Filter DTOs
export class CourseFilterDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Difficulty', enum: CourseDifficulty })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({ description: 'Free courses only' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}
