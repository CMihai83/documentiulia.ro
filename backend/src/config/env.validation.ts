import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsEnum, validateSync, Min, Max, MinLength, ValidateIf } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters for security' })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION?: string = '7d';

  // ANAF credentials - optional, not required for basic auth flow
  // Enable validation when ANAF integration is properly configured
  @IsString()
  @IsOptional()
  ANAF_API_URL?: string;

  @IsString()
  @IsOptional()
  ANAF_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  ANAF_CLIENT_SECRET?: string;

  // SAGA integration
  @IsString()
  @IsOptional()
  SAGA_API_URL?: string;

  @IsString()
  @IsOptional()
  SAGA_API_KEY?: string;

  // AI integration
  @IsString()
  @IsOptional()
  GROK_API_KEY?: string;

  @IsString()
  @IsOptional()
  ANTHROPIC_API_KEY?: string;  // Claude Vision for OCR

  // Redis for caching/sessions
  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  // CORS origins (comma-separated)
  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints ? Object.values(error.constraints).join(', ') : 'Unknown error';
        return `${error.property}: ${constraints}`;
      })
      .join('\n');
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  // Production-specific warnings
  if (validatedConfig.NODE_ENV === Environment.Production) {
    if (!validatedConfig.REDIS_URL) {
      console.warn('⚠️  WARNING: REDIS_URL not set in production - session management may be affected');
    }
    if (!validatedConfig.CORS_ORIGINS) {
      console.warn('⚠️  WARNING: CORS_ORIGINS not set - defaulting to restrictive policy');
    }
  }

  return validatedConfig;
}
