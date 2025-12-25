import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { RedisCacheService, CacheTTL, CacheOptions } from './redis-cache.service';

/**
 * Cache Interceptor
 * Automatically caches API responses based on decorators
 *
 * Usage:
 * @UseInterceptors(CacheInterceptor)
 * @CacheKey('my-endpoint')
 * @CacheTTL(300)
 * async myEndpoint() { ... }
 */

// Metadata keys
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';
export const CACHE_TAGS_METADATA = 'cache:tags';
export const CACHE_SKIP_METADATA = 'cache:skip';
export const CACHE_USER_SCOPED_METADATA = 'cache:user-scoped';

// Decorators
export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);
export const CacheTTLDecorator = (seconds: number) => SetMetadata(CACHE_TTL_METADATA, seconds);
export const CacheTags = (...tags: string[]) => SetMetadata(CACHE_TAGS_METADATA, tags);
export const SkipCache = () => SetMetadata(CACHE_SKIP_METADATA, true);
export const UserScopedCache = () => SetMetadata(CACHE_USER_SCOPED_METADATA, true);

// Combined decorator for convenience
export function Cacheable(options: {
  key?: string;
  ttl?: number;
  tags?: string[];
  userScoped?: boolean;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (options.key) {
      SetMetadata(CACHE_KEY_METADATA, options.key)(target, propertyKey, descriptor);
    }
    if (options.ttl) {
      SetMetadata(CACHE_TTL_METADATA, options.ttl)(target, propertyKey, descriptor);
    }
    if (options.tags) {
      SetMetadata(CACHE_TAGS_METADATA, options.tags)(target, propertyKey, descriptor);
    }
    if (options.userScoped) {
      SetMetadata(CACHE_USER_SCOPED_METADATA, true)(target, propertyKey, descriptor);
    }
    return descriptor;
  };
}

// Cache invalidation decorator
export const InvalidateCache = (...tags: string[]) => SetMetadata('cache:invalidate', tags);

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: RedisCacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    // Check if cache should be skipped
    const skipCache = this.reflector.get<boolean>(CACHE_SKIP_METADATA, context.getHandler());
    if (skipCache) {
      return next.handle();
    }

    // Only cache GET requests
    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') {
      return this.handleMutation(context, next);
    }

    // Build cache key
    const cacheKey = this.buildCacheKey(context);
    if (!cacheKey) {
      return next.handle();
    }

    // Check cache
    const cachedResponse = await this.cacheService.get(cacheKey);
    if (cachedResponse !== null) {
      return of(cachedResponse);
    }

    // Get TTL and tags from metadata
    const ttl =
      this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) || CacheTTL.MEDIUM;
    const tags = this.reflector.get<string[]>(CACHE_TAGS_METADATA, context.getHandler()) || [];

    // Add user-specific tag if user-scoped
    const isUserScoped = this.reflector.get<boolean>(
      CACHE_USER_SCOPED_METADATA,
      context.getHandler(),
    );
    if (isUserScoped && request.user?.id) {
      tags.push(`user:${request.user.id}`);
    }

    // Execute handler and cache result
    return next.handle().pipe(
      tap(async (response) => {
        if (response !== undefined && response !== null) {
          await this.cacheService.set(cacheKey, response, { ttl, tags });
        }
      }),
    );
  }

  private buildCacheKey(context: ExecutionContext): string | null {
    const request = context.switchToHttp().getRequest();

    // Get custom cache key from decorator
    const customKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());

    // Check if user-scoped
    const isUserScoped = this.reflector.get<boolean>(
      CACHE_USER_SCOPED_METADATA,
      context.getHandler(),
    );

    let baseKey: string;

    if (customKey) {
      baseKey = customKey;
    } else {
      // Auto-generate key from URL and query params
      const url = request.url.split('?')[0];
      const queryString = this.sortedQueryString(request.query);
      baseKey = queryString ? `${url}?${queryString}` : url;
    }

    // Add user ID prefix if user-scoped
    if (isUserScoped && request.user?.id) {
      return `user:${request.user.id}:${baseKey}`;
    }

    return `api:${baseKey}`;
  }

  private sortedQueryString(query: Record<string, any>): string {
    if (!query || Object.keys(query).length === 0) {
      return '';
    }

    return Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
  }

  private async handleMutation(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Check for cache invalidation tags
    const invalidateTags = this.reflector.get<string[]>('cache:invalidate', context.getHandler());

    if (!invalidateTags || invalidateTags.length === 0) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    // Replace {userId} placeholder with actual user ID
    const resolvedTags = invalidateTags.map((tag) => {
      if (tag.includes('{userId}') && request.user?.id) {
        return tag.replace('{userId}', request.user.id);
      }
      return tag;
    });

    return next.handle().pipe(
      tap(async () => {
        await this.cacheService.invalidateTags(resolvedTags);
      }),
    );
  }
}

/**
 * Cache Invalidation Interceptor
 * Use for POST/PUT/DELETE endpoints to invalidate related caches
 */
@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: RedisCacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const invalidateTags = this.reflector.get<string[]>('cache:invalidate', context.getHandler());

    if (!invalidateTags || invalidateTags.length === 0) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    // Replace placeholders
    const resolvedTags = invalidateTags.map((tag) => {
      let resolved = tag;
      if (resolved.includes('{userId}') && request.user?.id) {
        resolved = resolved.replace('{userId}', request.user.id);
      }
      if (resolved.includes('{id}') && request.params?.id) {
        resolved = resolved.replace('{id}', request.params.id);
      }
      return resolved;
    });

    return next.handle().pipe(
      tap(async () => {
        for (const tag of resolvedTags) {
          await this.cacheService.invalidateTag(tag);
        }
      }),
    );
  }
}
