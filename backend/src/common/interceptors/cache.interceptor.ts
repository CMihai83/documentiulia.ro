import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

/**
 * TECH-002: Response Caching Interceptor
 *
 * Implements response caching for API endpoints:
 * - Per-endpoint cache configuration
 * - TTL-based expiration
 * - Cache key generation based on request params
 * - Memory-based storage (can be upgraded to Redis)
 */

interface CacheEntry {
  data: any;
  expireAt: number;
}

// Cache configuration
export const CACHE_KEY = 'cacheConfig';

export interface CacheOptions {
  ttl: number; // TTL in seconds
  key?: string; // Custom cache key prefix
  varyBy?: string[]; // Query params to include in cache key
}

// In-memory cache store
const cacheStore = new Map<string, CacheEntry>();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expireAt < now) {
      cacheStore.delete(key);
    }
  }
}, 30000); // Every 30 seconds

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Get cache options from decorator
    const options = this.reflector.get<CacheOptions>(
      CACHE_KEY,
      context.getHandler(),
    );

    // Skip if no cache config
    if (!options) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(request, options);
    const now = Date.now();

    // Check cache
    const cached = cacheStore.get(cacheKey);
    if (cached && cached.expireAt > now) {
      // Return cached response
      response.setHeader('X-Cache', 'HIT');
      response.setHeader(
        'X-Cache-Expires',
        Math.ceil((cached.expireAt - now) / 1000).toString(),
      );
      return of(cached.data);
    }

    // Cache miss - execute handler and cache result
    response.setHeader('X-Cache', 'MISS');

    return next.handle().pipe(
      tap((data) => {
        // Store in cache
        cacheStore.set(cacheKey, {
          data,
          expireAt: now + options.ttl * 1000,
        });
      }),
    );
  }

  private generateCacheKey(
    request: any,
    options: CacheOptions,
  ): string {
    const userId = request.user?.id || request.auth?.userId || 'anonymous';
    const path = request.route?.path || request.url.split('?')[0];
    const prefix = options.key || 'api';

    // Build key parts
    const parts = [prefix, userId, path];

    // Add query params if specified
    if (options.varyBy && options.varyBy.length > 0) {
      const queryParts = options.varyBy
        .map((param) => `${param}=${request.query[param] || ''}`)
        .sort()
        .join('&');
      parts.push(queryParts);
    }

    return parts.join(':');
  }
}

/**
 * Decorator for caching endpoints
 */
export const Cache = (options: CacheOptions) =>
  SetMetadata(CACHE_KEY, options);

/**
 * Decorator to skip caching
 */
export const NoCache = () => SetMetadata(CACHE_KEY, null);

/**
 * Pre-defined cache configurations
 */
export const CacheTTL = {
  // Short-lived cache (30 seconds)
  SHORT: 30,

  // Medium cache (5 minutes)
  MEDIUM: 300,

  // Long cache (1 hour)
  LONG: 3600,

  // Dashboard data (2 minutes)
  DASHBOARD: 120,

  // Static data (24 hours)
  STATIC: 86400,

  // Exchange rates (4 hours)
  EXCHANGE_RATES: 14400,
};

/**
 * Utility to clear cache for a specific user
 */
export function clearUserCache(userId: string): void {
  for (const key of cacheStore.keys()) {
    if (key.includes(`:${userId}:`)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Utility to clear all cache
 */
export function clearAllCache(): void {
  cacheStore.clear();
}

/**
 * Utility to get cache stats
 */
export function getCacheStats(): {
  entries: number;
  keys: string[];
} {
  return {
    entries: cacheStore.size,
    keys: Array.from(cacheStore.keys()),
  };
}
