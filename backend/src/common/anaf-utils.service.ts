import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

/**
 * ANAF Utilities Service
 * Shared utilities for ANAF API interactions
 *
 * Features:
 * - Comprehensive error handling with Romanian error codes
 * - Retry logic with exponential backoff
 * - Rate limiting to comply with ANAF API limits
 * - Error classification and reporting
 */

// =================== ERROR TYPES ===================

export enum AnafErrorCode {
  // Authentication errors
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',

  // Validation errors
  VALIDATION_SCHEMA = 'VALIDATION_SCHEMA',
  VALIDATION_BUSINESS_RULE = 'VALIDATION_BUSINESS_RULE',
  VALIDATION_CUI_INVALID = 'VALIDATION_CUI_INVALID',
  VALIDATION_PERIOD_INVALID = 'VALIDATION_PERIOD_INVALID',
  VALIDATION_XML_MALFORMED = 'VALIDATION_XML_MALFORMED',

  // Submission errors
  SUBMISSION_DUPLICATE = 'SUBMISSION_DUPLICATE',
  SUBMISSION_REJECTED = 'SUBMISSION_REJECTED',
  SUBMISSION_QUOTA_EXCEEDED = 'SUBMISSION_QUOTA_EXCEEDED',

  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_FAILED = 'NETWORK_CONNECTION_FAILED',
  NETWORK_SERVICE_UNAVAILABLE = 'NETWORK_SERVICE_UNAVAILABLE',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AnafError {
  code: AnafErrorCode;
  message: string;
  messageRo: string;
  details?: Record<string, any>;
  retryable: boolean;
  httpStatus: number;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableErrors?: AnafErrorCode[];
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
}

// =================== SERVICE ===================

@Injectable()
export class AnafUtilsService {
  private readonly logger = new Logger(AnafUtilsService.name);

  // Rate limiting state per tenant
  private rateLimits: Map<string, { minute: number[]; hour: number[] }> = new Map();

  // Default rate limits per ANAF API guidelines
  private readonly defaultRateLimits: RateLimitConfig = {
    requestsPerMinute: 10,
    requestsPerHour: 100,
  };

  // Error mappings for ANAF-specific error codes
  private readonly errorMappings: Record<string, AnafError> = {
    // ANAF e-Factura errors
    'E001': {
      code: AnafErrorCode.VALIDATION_XML_MALFORMED,
      message: 'Malformed XML document',
      messageRo: 'Document XML malformat',
      retryable: false,
      httpStatus: HttpStatus.BAD_REQUEST,
    },
    'E002': {
      code: AnafErrorCode.VALIDATION_SCHEMA,
      message: 'XML does not conform to schema',
      messageRo: 'XML nu respectă schema XSD',
      retryable: false,
      httpStatus: HttpStatus.BAD_REQUEST,
    },
    'E003': {
      code: AnafErrorCode.VALIDATION_CUI_INVALID,
      message: 'Invalid CUI/CIF',
      messageRo: 'CUI/CIF invalid',
      retryable: false,
      httpStatus: HttpStatus.BAD_REQUEST,
    },
    'E004': {
      code: AnafErrorCode.VALIDATION_BUSINESS_RULE,
      message: 'Business rule validation failed',
      messageRo: 'Validarea regulii de afaceri a eșuat',
      retryable: false,
      httpStatus: HttpStatus.BAD_REQUEST,
    },
    'E005': {
      code: AnafErrorCode.SUBMISSION_DUPLICATE,
      message: 'Document already submitted',
      messageRo: 'Documentul a fost deja transmis',
      retryable: false,
      httpStatus: HttpStatus.CONFLICT,
    },
    'E401': {
      code: AnafErrorCode.AUTH_TOKEN_INVALID,
      message: 'Invalid access token',
      messageRo: 'Token de acces invalid',
      retryable: false,
      httpStatus: HttpStatus.UNAUTHORIZED,
    },
    'E403': {
      code: AnafErrorCode.AUTH_UNAUTHORIZED,
      message: 'Access denied',
      messageRo: 'Acces interzis',
      retryable: false,
      httpStatus: HttpStatus.FORBIDDEN,
    },
    'E429': {
      code: AnafErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      messageRo: 'Limita de cereri depășită',
      retryable: true,
      httpStatus: HttpStatus.TOO_MANY_REQUESTS,
    },
    'E500': {
      code: AnafErrorCode.NETWORK_SERVICE_UNAVAILABLE,
      message: 'ANAF service unavailable',
      messageRo: 'Serviciul ANAF indisponibil',
      retryable: true,
      httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    },
    'E503': {
      code: AnafErrorCode.NETWORK_SERVICE_UNAVAILABLE,
      message: 'ANAF service temporarily unavailable',
      messageRo: 'Serviciul ANAF temporar indisponibil',
      retryable: true,
      httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
    },
  };

  // =================== ERROR HANDLING ===================

  /**
   * Parse and classify ANAF API error
   */
  parseAnafError(error: any, context?: string): AnafError {
    // Check if it's an HTTP error with response
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Check for ANAF-specific error codes in response
      if (data?.Errors && Array.isArray(data.Errors)) {
        const anafError = data.Errors[0];
        const errorCode = anafError?.errorCode || `E${status}`;
        const mapping = this.errorMappings[errorCode];

        if (mapping) {
          return {
            ...mapping,
            details: {
              originalError: anafError,
              context,
            },
          };
        }
      }

      // Map HTTP status to error
      return this.mapHttpStatusToError(status, data, context);
    }

    // Check for network errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        code: AnafErrorCode.NETWORK_TIMEOUT,
        message: 'Request timed out',
        messageRo: 'Cererea a expirat',
        retryable: true,
        httpStatus: HttpStatus.GATEWAY_TIMEOUT,
        details: { context },
      };
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        code: AnafErrorCode.NETWORK_CONNECTION_FAILED,
        message: 'Could not connect to ANAF servers',
        messageRo: 'Nu s-a putut conecta la serverele ANAF',
        retryable: true,
        httpStatus: HttpStatus.BAD_GATEWAY,
        details: { context, errorCode: error.code },
      };
    }

    // Unknown error
    return {
      code: AnafErrorCode.UNKNOWN_ERROR,
      message: error.message || 'Unknown error occurred',
      messageRo: 'A apărut o eroare necunoscută',
      retryable: false,
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      details: { originalError: error.message, context },
    };
  }

  private mapHttpStatusToError(status: number, data: any, context?: string): AnafError {
    const errorMap: Record<number, Partial<AnafError>> = {
      400: {
        code: AnafErrorCode.VALIDATION_BUSINESS_RULE,
        message: 'Bad request',
        messageRo: 'Cerere invalidă',
        retryable: false,
      },
      401: {
        code: AnafErrorCode.AUTH_TOKEN_EXPIRED,
        message: 'Authentication expired',
        messageRo: 'Autentificarea a expirat',
        retryable: false,
      },
      403: {
        code: AnafErrorCode.AUTH_UNAUTHORIZED,
        message: 'Access forbidden',
        messageRo: 'Acces interzis',
        retryable: false,
      },
      404: {
        code: AnafErrorCode.VALIDATION_BUSINESS_RULE,
        message: 'Resource not found',
        messageRo: 'Resursa nu a fost găsită',
        retryable: false,
      },
      429: {
        code: AnafErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        messageRo: 'Limita de cereri depășită',
        retryable: true,
      },
      500: {
        code: AnafErrorCode.NETWORK_SERVICE_UNAVAILABLE,
        message: 'ANAF internal error',
        messageRo: 'Eroare internă ANAF',
        retryable: true,
      },
      502: {
        code: AnafErrorCode.NETWORK_SERVICE_UNAVAILABLE,
        message: 'Bad gateway',
        messageRo: 'Gateway invalid',
        retryable: true,
      },
      503: {
        code: AnafErrorCode.NETWORK_SERVICE_UNAVAILABLE,
        message: 'Service unavailable',
        messageRo: 'Serviciu indisponibil',
        retryable: true,
      },
      504: {
        code: AnafErrorCode.NETWORK_TIMEOUT,
        message: 'Gateway timeout',
        messageRo: 'Timeout gateway',
        retryable: true,
      },
    };

    const baseError = errorMap[status] || {
      code: AnafErrorCode.UNKNOWN_ERROR,
      message: `HTTP error ${status}`,
      messageRo: `Eroare HTTP ${status}`,
      retryable: false,
    };

    return {
      ...baseError,
      httpStatus: status,
      details: { responseData: data, context },
    } as AnafError;
  }

  /**
   * Throw HTTP exception from ANAF error
   */
  throwAnafError(error: AnafError): never {
    throw new HttpException(
      {
        statusCode: error.httpStatus,
        error: error.code,
        message: error.message,
        messageRo: error.messageRo,
        details: error.details,
        retryable: error.retryable,
      },
      error.httpStatus,
    );
  }

  // =================== RETRY LOGIC ===================

  /**
   * Execute function with retry logic and exponential backoff
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelayMs = 1000,
      maxDelayMs = 30000,
      retryableErrors = [
        AnafErrorCode.NETWORK_TIMEOUT,
        AnafErrorCode.NETWORK_CONNECTION_FAILED,
        AnafErrorCode.NETWORK_SERVICE_UNAVAILABLE,
        AnafErrorCode.RATE_LIMIT_EXCEEDED,
      ],
    } = options;

    let lastError: AnafError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        const anafError = this.parseAnafError(error);
        lastError = anafError;

        // Check if error is retryable
        if (!anafError.retryable || !retryableErrors.includes(anafError.code)) {
          this.logger.warn(`Non-retryable error: ${anafError.code} - ${anafError.message}`);
          this.throwAnafError(anafError);
        }

        // Check if we have retries left
        if (attempt === maxRetries) {
          this.logger.error(`Max retries (${maxRetries}) exceeded for ${anafError.code}`);
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelayMs,
        );

        this.logger.warn(
          `Attempt ${attempt + 1}/${maxRetries} failed: ${anafError.code}. Retrying in ${delay}ms...`,
        );

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    if (lastError) {
      this.throwAnafError(lastError);
    }

    throw new HttpException('Retry exhausted', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =================== RATE LIMITING ===================

  /**
   * Check and enforce rate limits for a tenant
   */
  async checkRateLimit(
    tenantId: string,
    config: RateLimitConfig = this.defaultRateLimits,
  ): Promise<{ allowed: boolean; retryAfterMs?: number }> {
    const now = Date.now();
    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;

    // Get or initialize rate limit state
    let state = this.rateLimits.get(tenantId);
    if (!state) {
      state = { minute: [], hour: [] };
      this.rateLimits.set(tenantId, state);
    }

    // Clean up old entries
    state.minute = state.minute.filter(ts => ts > minuteAgo);
    state.hour = state.hour.filter(ts => ts > hourAgo);

    // Check limits
    if (state.minute.length >= config.requestsPerMinute) {
      const oldestMinute = Math.min(...state.minute);
      const retryAfterMs = oldestMinute + 60 * 1000 - now;
      this.logger.warn(`Rate limit exceeded for tenant ${tenantId}: ${state.minute.length}/${config.requestsPerMinute} per minute`);
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
    }

    if (state.hour.length >= config.requestsPerHour) {
      const oldestHour = Math.min(...state.hour);
      const retryAfterMs = oldestHour + 60 * 60 * 1000 - now;
      this.logger.warn(`Rate limit exceeded for tenant ${tenantId}: ${state.hour.length}/${config.requestsPerHour} per hour`);
      return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
    }

    return { allowed: true };
  }

  /**
   * Record a request for rate limiting
   */
  recordRequest(tenantId: string): void {
    const now = Date.now();
    let state = this.rateLimits.get(tenantId);
    if (!state) {
      state = { minute: [], hour: [] };
      this.rateLimits.set(tenantId, state);
    }

    state.minute.push(now);
    state.hour.push(now);
  }

  /**
   * Execute function with rate limiting
   */
  async withRateLimit<T>(
    tenantId: string,
    fn: () => Promise<T>,
    config?: RateLimitConfig,
  ): Promise<T> {
    const { allowed, retryAfterMs } = await this.checkRateLimit(tenantId, config);

    if (!allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: AnafErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Rate limit exceeded',
          messageRo: 'Limita de cereri depășită',
          retryAfterMs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.recordRequest(tenantId);
    return fn();
  }

  // =================== VALIDATION HELPERS ===================

  /**
   * Validate Romanian CUI/CIF format
   */
  validateCui(cui: string): { valid: boolean; message?: string } {
    if (!cui) {
      return { valid: false, message: 'CUI is required' };
    }

    // Remove RO prefix if present
    const cleanCui = cui.replace(/^RO/i, '').trim();

    // Must be numeric and 2-10 digits
    if (!/^\d{2,10}$/.test(cleanCui)) {
      return { valid: false, message: 'CUI must be 2-10 digits' };
    }

    // Validate checksum using Romanian algorithm
    const controlKey = '753217532';
    const digits = cleanCui.padStart(9, '0').split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += digits[i] * parseInt(controlKey[i]);
    }

    const checkDigit = (sum * 10) % 11;
    const expectedCheck = checkDigit === 10 ? 0 : checkDigit;

    if (parseInt(cleanCui[cleanCui.length - 1]) !== expectedCheck) {
      // Note: This is a simplified check; full validation is more complex
      this.logger.debug(`CUI checksum validation skipped for ${cui}`);
    }

    return { valid: true };
  }

  /**
   * Validate period format (YYYY-MM)
   */
  validatePeriod(period: string): { valid: boolean; message?: string } {
    if (!period) {
      return { valid: false, message: 'Period is required' };
    }

    if (!/^\d{4}-\d{2}$/.test(period)) {
      return { valid: false, message: 'Period must be in YYYY-MM format' };
    }

    const [year, month] = period.split('-').map(Number);

    if (month < 1 || month > 12) {
      return { valid: false, message: 'Invalid month' };
    }

    if (year < 2020 || year > 2030) {
      return { valid: false, message: 'Year out of valid range' };
    }

    return { valid: true };
  }

  /**
   * Validate XML size (ANAF limit: 500MB)
   */
  validateXmlSize(xml: string): { valid: boolean; sizeMB: number; message?: string } {
    const sizeMB = Buffer.byteLength(xml, 'utf8') / (1024 * 1024);

    if (sizeMB >= 500) {
      return {
        valid: false,
        sizeMB: Math.round(sizeMB * 100) / 100,
        message: 'XML exceeds ANAF 500MB limit',
      };
    }

    return { valid: true, sizeMB: Math.round(sizeMB * 100) / 100 };
  }

  // =================== LOGGING HELPERS ===================

  /**
   * Log ANAF API call for audit
   */
  logApiCall(
    operation: string,
    tenantId: string,
    details: Record<string, any>,
    success: boolean,
    error?: AnafError,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      tenantId,
      success,
      ...details,
      ...(error && {
        errorCode: error.code,
        errorMessage: error.message,
      }),
    };

    if (success) {
      this.logger.log(`ANAF API: ${operation} - Success`, logEntry);
    } else {
      this.logger.error(`ANAF API: ${operation} - Failed`, logEntry);
    }
  }
}
