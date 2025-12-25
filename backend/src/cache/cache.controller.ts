import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { RedisCacheService, CacheStats } from './redis-cache.service';
import { CloudflareCacheService, ContentType, CachePurgeResult } from './cloudflare-cache.service';

/**
 * Cache Controller
 * Admin endpoints for cache management and monitoring
 */
@ApiTags('Cache Management')
@ApiBearerAuth()
@Controller('cache')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CacheController {
  constructor(
    private readonly cacheService: RedisCacheService,
    private readonly cloudflareCache: CloudflareCacheService,
  ) {}

  // =================== CACHE STATISTICS ===================

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cache statistics' })
  async getStats(): Promise<CacheStats> {
    return this.cacheService.getStats();
  }

  @Get('health')
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Check cache health status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cache health status' })
  async getHealth(): Promise<{ status: string; connected: boolean; message: string }> {
    const isReady = this.cacheService.isReady();
    return {
      status: isReady ? 'healthy' : 'degraded',
      connected: isReady,
      message: isReady
        ? 'Redis cache is operational'
        : 'Redis cache is unavailable - falling back to database',
    };
  }

  // =================== KEY MANAGEMENT ===================

  @Get('keys')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List cache keys matching pattern' })
  @ApiQuery({ name: 'pattern', required: false, description: 'Key pattern (default: *)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max keys to return (default: 100)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of matching keys' })
  async getKeys(
    @Query('pattern') pattern?: string,
    @Query('limit') limit?: string,
  ): Promise<{ keys: string[]; count: number; pattern: string }> {
    const searchPattern = pattern || '*';
    const maxKeys = limit ? parseInt(limit, 10) : 100;

    const keys = await this.cacheService.getKeys(searchPattern);
    const limitedKeys = keys.slice(0, maxKeys);

    return {
      keys: limitedKeys,
      count: keys.length,
      pattern: searchPattern,
    };
  }

  @Get('key/:key')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get value for specific cache key' })
  @ApiParam({ name: 'key', description: 'Cache key' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cached value' })
  async getKey(@Param('key') key: string): Promise<{ key: string; value: any; exists: boolean }> {
    const value = await this.cacheService.get(key);
    return {
      key,
      value,
      exists: value !== null,
    };
  }

  @Delete('key/:key')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete specific cache key' })
  @ApiParam({ name: 'key', description: 'Cache key to delete' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Key deleted' })
  async deleteKey(@Param('key') key: string): Promise<{ deleted: boolean; key: string }> {
    const deleted = await this.cacheService.delete(key);
    return { deleted, key };
  }

  // =================== PATTERN DELETION ===================

  @Delete('pattern/:pattern')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete all keys matching pattern' })
  @ApiParam({ name: 'pattern', description: 'Key pattern to match (e.g., user:*)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Keys deleted' })
  async deletePattern(
    @Param('pattern') pattern: string,
  ): Promise<{ deletedCount: number; pattern: string }> {
    const deletedCount = await this.cacheService.deletePattern(pattern);
    return { deletedCount, pattern };
  }

  // =================== TAG INVALIDATION ===================

  @Delete('tag/:tag')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invalidate all cache entries with specific tag' })
  @ApiParam({ name: 'tag', description: 'Cache tag to invalidate' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tag invalidated' })
  async invalidateTag(
    @Param('tag') tag: string,
  ): Promise<{ invalidatedCount: number; tag: string }> {
    const invalidatedCount = await this.cacheService.invalidateTag(tag);
    return { invalidatedCount, tag };
  }

  @Post('invalidate/user/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invalidate all cache for specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User cache invalidated' })
  async invalidateUserCache(
    @Param('userId') userId: string,
  ): Promise<{ invalidatedCount: number; userId: string }> {
    const invalidatedCount = await this.cacheService.invalidateUserCache(userId);
    return { invalidatedCount, userId };
  }

  @Post('invalidate/fleet/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invalidate fleet cache for specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fleet cache invalidated' })
  async invalidateFleetCache(
    @Param('userId') userId: string,
  ): Promise<{ invalidatedCount: number; userId: string }> {
    const invalidatedCount = await this.cacheService.invalidateFleetCache(userId);
    return { invalidatedCount, userId };
  }

  @Post('invalidate/dashboard/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invalidate dashboard cache for specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard cache invalidated' })
  async invalidateDashboardCache(
    @Param('userId') userId: string,
  ): Promise<{ invalidatedCount: number; userId: string }> {
    const invalidatedCount = await this.cacheService.invalidateDashboardCache(userId);
    return { invalidatedCount, userId };
  }

  @Post('invalidate/analytics/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invalidate analytics cache for specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Analytics cache invalidated' })
  async invalidateAnalyticsCache(
    @Param('userId') userId: string,
  ): Promise<{ invalidatedCount: number; userId: string }> {
    const invalidatedCount = await this.cacheService.invalidateAnalyticsCache(userId);
    return { invalidatedCount, userId };
  }

  // =================== FLUSH OPERATIONS ===================

  @Post('flush/db')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Flush current database (dangerous!)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Database flushed' })
  async flushDb(): Promise<{ flushed: boolean; warning: string }> {
    const flushed = await this.cacheService.flushDb();
    return {
      flushed,
      warning: 'All cache entries in current database have been deleted',
    };
  }

  @Post('stats/reset')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset cache statistics counters' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Stats reset' })
  resetStats(): { reset: boolean; message: string } {
    this.cacheService.resetStats();
    return {
      reset: true,
      message: 'Cache statistics counters have been reset',
    };
  }

  // =================== CLOUDFLARE CDN CACHE ===================

  @Get('cloudflare/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get Cloudflare cache service status' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cloudflare status' })
  getCloudflareStatus(): { enabled: boolean; zoneId: string } {
    return this.cloudflareCache.getStatus();
  }

  @Post('cloudflare/purge/courses')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge courses pages from Cloudflare cache' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Courses cache purged' })
  async purgeCloudflareCoursesCache(): Promise<CachePurgeResult> {
    return this.cloudflareCache.purgeByContentType('courses');
  }

  @Post('cloudflare/purge/blog')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge blog pages from Cloudflare cache' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Blog cache purged' })
  async purgeCloudfareBlogCache(): Promise<CachePurgeResult> {
    return this.cloudflareCache.purgeByContentType('blog');
  }

  @Post('cloudflare/purge/forum')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge forum pages from Cloudflare cache' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Forum cache purged' })
  async purgeCloudflareForumCache(): Promise<CachePurgeResult> {
    return this.cloudflareCache.purgeByContentType('forum');
  }

  @Post('cloudflare/purge/all')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge entire Cloudflare cache (use sparingly)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All cache purged' })
  async purgeCloudflareAll(): Promise<CachePurgeResult> {
    return this.cloudflareCache.purgeEverything();
  }

  @Post('cloudflare/purge/urls')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge specific URLs from Cloudflare cache' })
  @ApiBody({ schema: { type: 'object', properties: { urls: { type: 'array', items: { type: 'string' } } } } })
  @ApiResponse({ status: HttpStatus.OK, description: 'URLs purged' })
  async purgeCloudflareUrls(@Body() body: { urls: string[] }): Promise<CachePurgeResult> {
    return this.cloudflareCache.purgeUrls(body.urls);
  }
}
