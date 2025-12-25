import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateErrorDto {
  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  stack?: string;

  @IsString()
  type: string;

  @IsString()
  @IsOptional()
  componentStack?: string;

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
