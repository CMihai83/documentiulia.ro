import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

/**
 * TECH-002: API Rate Limiting Interceptor
 *
 * Implements rate limiting for API endpoints:
 * - Per-user rate limiting
 * - Configurable limits per endpoint
 * - Memory-based storage (can be upgraded to Redis)
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Rate limit configuration
export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  limit: number; // Max requests
  windowMs: number; // Time window in milliseconds
}

// In-memory store (should be Redis for production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Every minute

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private defaultLimit = 100; // 100 requests
  private defaultWindow = 60000; // per minute

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get rate limit options from decorator or use defaults
    const options = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    ) || {
      limit: this.defaultLimit,
      windowMs: this.defaultWindow,
    };

    // Create unique key based on user ID or IP
    const userId = request.user?.id || request.auth?.userId;
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const endpoint = `${request.method}:${request.route?.path || request.url}`;
    const key = `${userId || ip}:${endpoint}`;

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    // Initialize or reset entry if window expired
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + options.windowMs,
      };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);

    // Calculate remaining requests
    const remaining = Math.max(0, options.limit - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', options.limit.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    // Check if limit exceeded
    if (entry.count > options.limit) {
      response.setHeader('Retry-After', resetSeconds.toString());

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: resetSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}

/**
 * Decorator for custom rate limits
 */
import { SetMetadata } from '@nestjs/common';

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Pre-defined rate limit configurations
 */
export const RateLimits = {
  // Standard API endpoints
  STANDARD: { limit: 100, windowMs: 60000 }, // 100/min

  // High-traffic endpoints
  HIGH: { limit: 200, windowMs: 60000 }, // 200/min

  // Low-traffic/expensive endpoints
  LOW: { limit: 20, windowMs: 60000 }, // 20/min

  // ANAF submission endpoints (avoid overwhelming ANAF)
  ANAF: { limit: 10, windowMs: 60000 }, // 10/min

  // Auth endpoints
  AUTH: { limit: 5, windowMs: 60000 }, // 5/min (to prevent brute force)

  // Public endpoints
  PUBLIC: { limit: 30, windowMs: 60000 }, // 30/min
};
