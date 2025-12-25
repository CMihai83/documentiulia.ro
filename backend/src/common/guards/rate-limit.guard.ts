import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

/**
 * Rate Limiting Guard and Service
 * Implements token bucket algorithm with Redis support
 */

// ============================================================================
// DECORATORS
// ============================================================================

export const RATE_LIMIT_KEY = 'rate_limit';
export const SKIP_RATE_LIMIT_KEY = 'skip_rate_limit';

export interface RateLimitOptions {
  requests: number;       // Max requests allowed
  window: number;         // Time window in seconds
  keyPrefix?: string;     // Custom key prefix for grouping
  errorMessage?: string;  // Custom error message
  skipIf?: (request: Request) => boolean; // Condition to skip
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);

// ============================================================================
// RATE LIMIT SERVICE
// ============================================================================

export interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  requests: number[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
  retryAfter?: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private buckets: Map<string, RateLimitBucket> = new Map();

  // Default rate limits by tier
  private readonly tierLimits = {
    free: { requests: 100, window: 3600 },      // 100/hour
    pro: { requests: 1000, window: 3600 },      // 1000/hour
    business: { requests: 10000, window: 3600 }, // 10000/hour
    enterprise: { requests: 100000, window: 3600 }, // 100000/hour
  };

  // Endpoint-specific limits
  private readonly endpointLimits: Record<string, { requests: number; window: number }> = {
    'POST /api/v1/auth/login': { requests: 5, window: 60 },       // 5/min for login
    'POST /api/v1/auth/register': { requests: 3, window: 3600 },  // 3/hour for register
    'POST /api/v1/auth/forgot-password': { requests: 3, window: 3600 },
    'POST /api/v1/ocr/process': { requests: 50, window: 3600 },   // 50/hour for OCR
    'POST /api/v1/invoices': { requests: 100, window: 3600 },     // 100/hour for invoice creation
    'GET /api/v1/reports/*': { requests: 20, window: 3600 },      // 20/hour for reports
    'POST /api/v1/anaf/*': { requests: 30, window: 3600 },        // 30/hour for ANAF
  };

  /**
   * Check rate limit and consume a token
   */
  async checkLimit(
    key: string,
    limit: number,
    window: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = window * 1000;

    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: limit,
        lastRefill: now,
        requests: [],
      };
      this.buckets.set(key, bucket);
    }

    // Clean old requests outside the window
    bucket.requests = bucket.requests.filter((ts) => now - ts < windowMs);

    // Calculate remaining tokens
    const used = bucket.requests.length;
    const remaining = Math.max(0, limit - used);

    // Find reset time (oldest request in window + window duration)
    const oldestRequest = bucket.requests.length > 0 ? Math.min(...bucket.requests) : now;
    const reset = Math.ceil((oldestRequest + windowMs) / 1000);

    if (remaining <= 0) {
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        reset,
        limit,
        retryAfter,
      };
    }

    // Consume a token
    bucket.requests.push(now);
    this.buckets.set(key, bucket);

    return {
      allowed: true,
      remaining: remaining - 1,
      reset,
      limit,
    };
  }

  /**
   * Get rate limit for an endpoint and tier
   */
  getLimitForEndpoint(
    endpoint: string,
    method: string,
    tier: string = 'free',
  ): { requests: number; window: number } {
    const endpointKey = `${method} ${endpoint}`;

    // Check for exact match
    if (this.endpointLimits[endpointKey]) {
      return this.endpointLimits[endpointKey];
    }

    // Check for wildcard match
    for (const [pattern, limits] of Object.entries(this.endpointLimits)) {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2);
        if (endpointKey.startsWith(prefix)) {
          return limits;
        }
      }
    }

    // Return tier default
    return this.tierLimits[tier as keyof typeof this.tierLimits] || this.tierLimits.free;
  }

  /**
   * Get current rate limit status without consuming
   */
  async getStatus(
    key: string,
    limit: number,
    window: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = window * 1000;

    const bucket = this.buckets.get(key);
    if (!bucket) {
      return {
        allowed: true,
        remaining: limit,
        reset: Math.ceil((now + windowMs) / 1000),
        limit,
      };
    }

    const validRequests = bucket.requests.filter((ts) => now - ts < windowMs);
    const used = validRequests.length;
    const remaining = Math.max(0, limit - used);
    const oldestRequest = validRequests.length > 0 ? Math.min(...validRequests) : now;
    const reset = Math.ceil((oldestRequest + windowMs) / 1000);

    return {
      allowed: remaining > 0,
      remaining,
      reset,
      limit,
    };
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  /**
   * Get all rate limit buckets (for monitoring)
   */
  getAllBuckets(): Map<string, RateLimitBucket> {
    return new Map(this.buckets);
  }

  /**
   * Clean up expired buckets
   */
  cleanup(maxAge: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, bucket] of this.buckets) {
      // Remove buckets with no recent requests
      const recentRequests = bucket.requests.filter((ts) => now - ts < maxAge);
      if (recentRequests.length === 0) {
        this.buckets.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalBuckets: number;
    totalRequests: number;
    topClients: Array<{ key: string; requests: number }>;
  } {
    const now = Date.now();
    const hourAgo = now - 3600000;

    let totalRequests = 0;
    const clientRequests: Array<{ key: string; requests: number }> = [];

    for (const [key, bucket] of this.buckets) {
      const recentRequests = bucket.requests.filter((ts) => ts > hourAgo);
      totalRequests += recentRequests.length;
      clientRequests.push({ key, requests: recentRequests.length });
    }

    clientRequests.sort((a, b) => b.requests - a.requests);

    return {
      totalBuckets: this.buckets.size,
      totalRequests,
      topClients: clientRequests.slice(0, 10),
    };
  }
}

// ============================================================================
// RATE LIMIT GUARD
// ============================================================================

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if rate limiting should be skipped
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
      SKIP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipRateLimit) {
      return true;
    }

    // Get custom rate limit options from decorator
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Check skipIf condition
    if (options?.skipIf && options.skipIf(request)) {
      return true;
    }

    // Determine rate limit key
    const key = this.getKey(request, options?.keyPrefix);

    // Get limits
    const userTier = (request as any).user?.subscriptionTier || 'free';
    const defaultLimits = this.rateLimitService.getLimitForEndpoint(
      request.path,
      request.method,
      userTier,
    );

    const limit = options?.requests || defaultLimits.requests;
    const window = options?.window || defaultLimits.window;

    // Check rate limit
    const result = await this.rateLimitService.checkLimit(key, limit, window);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', result.limit.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader('X-RateLimit-Reset', result.reset.toString());

    if (!result.allowed) {
      response.setHeader('Retry-After', result.retryAfter?.toString() || '60');

      this.logger.warn(
        `Rate limit exceeded for ${key}: ${limit} requests per ${window}s`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: options?.errorMessage || 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getKey(request: Request, prefix?: string): string {
    // Try to get user ID from authenticated request
    const userId = (request as any).user?.id || (request as any).user?.sub;

    // Fall back to IP address
    const ip =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.socket.remoteAddress ||
      'unknown';

    // Include API key if present
    const apiKey = request.headers['x-api-key'] as string;

    const identifier = userId || apiKey || ip;
    const endpoint = `${request.method}:${request.path}`;

    return prefix
      ? `ratelimit:${prefix}:${identifier}`
      : `ratelimit:${endpoint}:${identifier}`;
  }
}

// ============================================================================
// GLOBAL RATE LIMIT INTERCEPTOR
// ============================================================================

import { CallHandler, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class GlobalRateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GlobalRateLimitInterceptor.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Global rate limit (e.g., 1000 requests per minute per IP)
    const ip =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.socket.remoteAddress ||
      'unknown';

    const key = `global:${ip}`;
    const result = await this.rateLimitService.checkLimit(key, 1000, 60);

    response.setHeader('X-RateLimit-Global-Remaining', result.remaining.toString());

    if (!result.allowed) {
      this.logger.warn(`Global rate limit exceeded for IP: ${ip}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Global rate limit exceeded. Please slow down.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}
