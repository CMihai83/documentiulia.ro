import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisCacheService } from './redis-cache.service';
import { DashboardCacheService } from './dashboard-cache.service';
import { CacheInterceptor, CacheInvalidationInterceptor } from './cache.interceptor';
import { CacheController } from './cache.controller';
import { ExternalApiFallbackService } from './external-api-fallback.service';
import { CloudflareCacheService } from './cloudflare-cache.service';

/**
 * Cache Module
 * Global module providing Redis caching infrastructure
 *
 * Features:
 * - Redis connection management
 * - Cache interceptors for automatic response caching
 * - Cache invalidation mechanisms
 * - Admin endpoints for cache management
 * - Dashboard-specific caching strategies
 * - RELY-001: External API fallback mechanism with circuit breaker
 */
@Global()
@Module({
  imports: [ConfigModule, EventEmitterModule.forRoot()],
  controllers: [CacheController],
  providers: [
    RedisCacheService,
    DashboardCacheService,
    CacheInterceptor,
    CacheInvalidationInterceptor,
    ExternalApiFallbackService,
    CloudflareCacheService,
  ],
  exports: [
    RedisCacheService,
    DashboardCacheService,
    CacheInterceptor,
    CacheInvalidationInterceptor,
    ExternalApiFallbackService,
    CloudflareCacheService,
  ],
})
export class CacheModule {}
