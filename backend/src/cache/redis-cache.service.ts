import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis Cache Service
 * Provides high-performance caching for API responses and data
 *
 * Features:
 * - Connection pooling and auto-reconnect
 * - TTL-based expiration
 * - Cache tagging for grouped invalidation
 * - Pattern-based key deletion
 * - Cache statistics and monitoring
 * - Graceful fallback on Redis unavailability
 */

// Cache entry metadata
export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;
  tags?: string[];
}

// Cache options
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for grouped invalidation
  compress?: boolean; // Compress large payloads
}

// Cache statistics
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
  memoryUsage: string;
  uptime: number;
  connected: boolean;
}

// Default TTL values in seconds
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 900, // 15 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

// Cache key prefixes for different domains
export const CachePrefix = {
  USER: 'user:',
  FLEET: 'fleet:',
  VEHICLE: 'vehicle:',
  ROUTE: 'route:',
  INVOICE: 'invoice:',
  ANALYTICS: 'analytics:',
  DASHBOARD: 'dashboard:',
  CONFIG: 'config:',
  SESSION: 'session:',
  RATE_LIMIT: 'ratelimit:',
  INTEGRATION: 'integration:',
  HR: 'hr:',
  FINANCE: 'finance:',
  LOGISTICS: 'logistics:',
  LMS: 'lms:',
} as const;

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: RedisClientType | null = null;
  private isConnected = false;
  private stats = { hits: 0, misses: 0 };
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000; // 5 seconds

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  // =================== CONNECTION MANAGEMENT ===================

  private async connect(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries >= this.maxReconnectAttempts) {
              this.logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 1000, 30000);
            this.logger.warn(`Reconnecting to Redis in ${delay}ms (attempt ${retries + 1})`);
            return delay;
          },
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.logger.log('Connected to Redis');
      });

      this.client.on('error', (err) => {
        this.logger.error(`Redis error: ${err.message}`);
      });

      this.client.on('disconnect', () => {
        this.isConnected = false;
        this.logger.warn('Disconnected from Redis');
      });

      await this.client.connect();
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error}`);
      this.isConnected = false;
    }
  }

  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      this.logger.log('Disconnected from Redis');
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  // =================== CORE CACHE OPERATIONS ===================

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      this.stats.misses++;
      return null;
    }

    try {
      const data = await this.client!.get(key);
      if (data) {
        this.stats.hits++;
        const entry: CacheEntry<T> = JSON.parse(data);
        return entry.data;
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error}`);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const ttl = options.ttl || CacheTTL.MEDIUM;
      const entry: CacheEntry<T> = {
        data: value,
        cachedAt: Date.now(),
        ttl,
        tags: options.tags,
      };

      await this.client!.setEx(key, ttl, JSON.stringify(entry));

      // Store tag associations for grouped invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addKeyToTags(key, options.tags, ttl);
      }

      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error}`);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}: ${error}`);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}: ${error}`);
      return false;
    }
  }

  // =================== PATTERN-BASED OPERATIONS ===================

  async deletePattern(pattern: string): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      let cursor = 0;
      let deletedCount = 0;

      do {
        const result = await this.client!.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;

        if (result.keys.length > 0) {
          await this.client!.del(result.keys);
          deletedCount += result.keys.length;
        }
      } while (cursor !== 0);

      this.logger.debug(`Deleted ${deletedCount} keys matching pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Cache deletePattern error for pattern ${pattern}: ${error}`);
      return 0;
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    if (!this.isReady()) {
      return [];
    }

    try {
      const keys: string[] = [];
      let cursor = 0;

      do {
        const result = await this.client!.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      return keys;
    } catch (error) {
      this.logger.error(`Cache getKeys error for pattern ${pattern}: ${error}`);
      return [];
    }
  }

  // =================== TAG-BASED INVALIDATION ===================

  private async addKeyToTags(key: string, tags: string[], ttl: number): Promise<void> {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      await this.client!.sAdd(tagKey, key);
      await this.client!.expire(tagKey, ttl + 60); // Tag expires slightly after keys
    }
  }

  async invalidateTag(tag: string): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.client!.sMembers(tagKey);

      if (keys.length > 0) {
        await this.client!.del(keys);
        await this.client!.del(tagKey);
      }

      this.logger.debug(`Invalidated ${keys.length} keys for tag: ${tag}`);
      return keys.length;
    } catch (error) {
      this.logger.error(`Cache invalidateTag error for tag ${tag}: ${error}`);
      return 0;
    }
  }

  async invalidateTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;
    for (const tag of tags) {
      totalInvalidated += await this.invalidateTag(tag);
    }
    return totalInvalidated;
  }

  // =================== USER/TENANT CACHE OPERATIONS ===================

  async getUserCache<T>(userId: string, key: string): Promise<T | null> {
    return this.get<T>(`${CachePrefix.USER}${userId}:${key}`);
  }

  async setUserCache<T>(
    userId: string,
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    const fullKey = `${CachePrefix.USER}${userId}:${key}`;
    const tags = [...(options.tags || []), `user:${userId}`];
    return this.set(fullKey, value, { ...options, tags });
  }

  async invalidateUserCache(userId: string): Promise<number> {
    return this.invalidateTag(`user:${userId}`);
  }

  // =================== FLEET CACHE OPERATIONS ===================

  async getFleetCache<T>(userId: string, key: string): Promise<T | null> {
    return this.get<T>(`${CachePrefix.FLEET}${userId}:${key}`);
  }

  async setFleetCache<T>(
    userId: string,
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    const fullKey = `${CachePrefix.FLEET}${userId}:${key}`;
    const tags = [...(options.tags || []), `fleet:${userId}`];
    return this.set(fullKey, value, { ...options, tags });
  }

  async invalidateFleetCache(userId: string): Promise<number> {
    return this.invalidateTag(`fleet:${userId}`);
  }

  // =================== ANALYTICS CACHE OPERATIONS ===================

  async getAnalyticsCache<T>(userId: string, reportType: string): Promise<T | null> {
    return this.get<T>(`${CachePrefix.ANALYTICS}${userId}:${reportType}`);
  }

  async setAnalyticsCache<T>(
    userId: string,
    reportType: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    const fullKey = `${CachePrefix.ANALYTICS}${userId}:${reportType}`;
    const tags = [...(options.tags || []), `analytics:${userId}`];
    return this.set(fullKey, value, { ...options, tags });
  }

  async invalidateAnalyticsCache(userId: string): Promise<number> {
    return this.invalidateTag(`analytics:${userId}`);
  }

  // =================== DASHBOARD CACHE OPERATIONS ===================

  async getDashboardCache<T>(userId: string, widgetId: string): Promise<T | null> {
    return this.get<T>(`${CachePrefix.DASHBOARD}${userId}:${widgetId}`);
  }

  async setDashboardCache<T>(
    userId: string,
    widgetId: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    const fullKey = `${CachePrefix.DASHBOARD}${userId}:${widgetId}`;
    const tags = [...(options.tags || []), `dashboard:${userId}`];
    return this.set(fullKey, value, { ...options, tags });
  }

  async invalidateDashboardCache(userId: string): Promise<number> {
    return this.invalidateTag(`dashboard:${userId}`);
  }

  // =================== RATE LIMITING ===================

  async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    if (!this.isReady()) {
      return { allowed: true, remaining: maxRequests, resetIn: 0 };
    }

    const key = `${CachePrefix.RATE_LIMIT}${identifier}`;

    try {
      const current = await this.client!.incr(key);

      if (current === 1) {
        await this.client!.expire(key, windowSeconds);
      }

      const ttl = await this.client!.ttl(key);
      const remaining = Math.max(0, maxRequests - current);
      const allowed = current <= maxRequests;

      return { allowed, remaining, resetIn: ttl };
    } catch (error) {
      this.logger.error(`Rate limit check error: ${error}`);
      return { allowed: true, remaining: maxRequests, resetIn: 0 };
    }
  }

  // =================== CACHE STATISTICS ===================

  async getStats(): Promise<CacheStats> {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0;

    if (!this.isReady()) {
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        keys: 0,
        memoryUsage: '0 bytes',
        uptime: 0,
        connected: false,
      };
    }

    try {
      const info = await this.client!.info('memory');
      const dbSize = await this.client!.dbSize();
      const serverInfo = await this.client!.info('server');

      // Parse memory usage
      const memMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsage = memMatch ? memMatch[1] : 'unknown';

      // Parse uptime
      const uptimeMatch = serverInfo.match(/uptime_in_seconds:(\d+)/);
      const uptime = uptimeMatch ? parseInt(uptimeMatch[1], 10) : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        keys: dbSize,
        memoryUsage,
        uptime,
        connected: true,
      };
    } catch (error) {
      this.logger.error(`Stats retrieval error: ${error}`);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        keys: 0,
        memoryUsage: 'unknown',
        uptime: 0,
        connected: this.isConnected,
      };
    }
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  // =================== CACHE WARMING ===================

  async warmCache<T>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>,
  ): Promise<number> {
    let warmed = 0;
    for (const entry of entries) {
      const success = await this.set(entry.key, entry.value, entry.options);
      if (success) warmed++;
    }
    this.logger.log(`Warmed ${warmed}/${entries.length} cache entries`);
    return warmed;
  }

  // =================== FLUSH OPERATIONS ===================

  async flushAll(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client!.flushAll();
      this.resetStats();
      this.logger.warn('Flushed all cache entries');
      return true;
    } catch (error) {
      this.logger.error(`Flush all error: ${error}`);
      return false;
    }
  }

  async flushDb(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.client!.flushDb();
      this.resetStats();
      this.logger.warn('Flushed current database');
      return true;
    } catch (error) {
      this.logger.error(`Flush DB error: ${error}`);
      return false;
    }
  }

  // =================== PERF-003: CACHE OPTIMIZATION ENHANCEMENTS ===================

  /**
   * Set a value with adaptive TTL based on access patterns
   * Frequently accessed items get longer TTL
   */
  async setWithAdaptiveTTL<T>(
    key: string,
    value: T,
    baseTTL: number,
    options: CacheOptions = {},
  ): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      // Check previous access count
      const accessKey = `access:${key}`;
      const accessCount = await this.client!.get(accessKey);
      const count = parseInt(accessCount || '0', 10);

      // Adaptive TTL: increase TTL based on access frequency
      let adaptedTTL = baseTTL;
      if (count > 100) adaptedTTL = baseTTL * 4; // Very hot: 4x TTL
      else if (count > 50) adaptedTTL = baseTTL * 2; // Hot: 2x TTL
      else if (count > 20) adaptedTTL = Math.floor(baseTTL * 1.5); // Warm: 1.5x TTL

      // Cap at 24 hours
      adaptedTTL = Math.min(adaptedTTL, CacheTTL.DAY);

      return this.set(key, value, { ...options, ttl: adaptedTTL });
    } catch (error) {
      this.logger.error(`Adaptive TTL set error: ${error}`);
      return this.set(key, value, { ...options, ttl: baseTTL });
    }
  }

  /**
   * Track access for adaptive TTL
   */
  async trackAccess(key: string): Promise<void> {
    if (!this.isReady()) return;

    try {
      const accessKey = `access:${key}`;
      await this.client!.incr(accessKey);
      // Access counter expires after 1 hour of no access
      await this.client!.expire(accessKey, 3600);
    } catch {
      // Non-critical, silently fail
    }
  }

  /**
   * Get with LRU-style access tracking
   */
  async getWithTracking<T>(key: string): Promise<T | null> {
    const value = await this.get<T>(key);
    if (value !== null) {
      this.trackAccess(key);
    }
    return value;
  }

  /**
   * Batch get - optimized for fetching multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();

    if (!this.isReady() || keys.length === 0) {
      keys.forEach((key) => results.set(key, null));
      return results;
    }

    try {
      const values = await this.client!.mGet(keys);

      keys.forEach((key, index) => {
        const value = values[index];
        if (value) {
          this.stats.hits++;
          const entry: CacheEntry<T> = JSON.parse(value);
          results.set(key, entry.data);
        } else {
          this.stats.misses++;
          results.set(key, null);
        }
      });

      return results;
    } catch (error) {
      this.logger.error(`Batch get error: ${error}`);
      keys.forEach((key) => results.set(key, null));
      return results;
    }
  }

  /**
   * Batch set - optimized for setting multiple keys at once
   */
  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<number> {
    if (!this.isReady() || entries.length === 0) {
      return 0;
    }

    try {
      let successCount = 0;
      const pipeline = this.client!.multi();

      for (const entry of entries) {
        const ttl = entry.ttl || CacheTTL.MEDIUM;
        const cacheEntry: CacheEntry<T> = {
          data: entry.value,
          cachedAt: Date.now(),
          ttl,
        };
        pipeline.setEx(entry.key, ttl, JSON.stringify(cacheEntry));
        successCount++;
      }

      await pipeline.exec();
      return successCount;
    } catch (error) {
      this.logger.error(`Batch set error: ${error}`);
      return 0;
    }
  }

  /**
   * Get or set with lazy loading
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.trackAccess(key);
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Stale-while-revalidate pattern
   * Returns stale data immediately while refreshing in background
   */
  async getStaleWhileRevalidate<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: { ttl?: number; staleTTL?: number } = {},
  ): Promise<{ data: T; isStale: boolean }> {
    const ttl = options.ttl || CacheTTL.MEDIUM;
    const staleTTL = options.staleTTL || ttl * 2;

    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      // Check if still fresh
      const staleKey = `stale:${key}`;
      const isStale = await this.exists(staleKey);

      if (isStale) {
        // Data is stale, refresh in background
        this.refreshInBackground(key, staleKey, fetchFn, ttl, staleTTL);
      }

      return { data: cached, isStale: !isStale };
    }

    // No cache, fetch fresh
    const value = await fetchFn();
    await this.set(key, value, { ttl: staleTTL });
    await this.set(`stale:${key}`, '1', { ttl });

    return { data: value, isStale: false };
  }

  private async refreshInBackground<T>(
    key: string,
    staleKey: string,
    fetchFn: () => Promise<T>,
    ttl: number,
    staleTTL: number,
  ): Promise<void> {
    setImmediate(async () => {
      try {
        const value = await fetchFn();
        await this.set(key, value, { ttl: staleTTL });
        await this.set(staleKey, '1', { ttl });
      } catch (error) {
        this.logger.warn(`Background refresh failed for ${key}: ${error}`);
      }
    });
  }

  /**
   * Get comprehensive cache metrics for PERF-003
   */
  async getDetailedMetrics(): Promise<{
    stats: CacheStats;
    memory: { used: string; peak: string; fragmentation: number };
    clients: number;
    keyspaceStats: Record<string, { keys: number; expires: number }>;
    slowLogCount: number;
  }> {
    const stats = await this.getStats();

    if (!this.isReady()) {
      return {
        stats,
        memory: { used: '0', peak: '0', fragmentation: 0 },
        clients: 0,
        keyspaceStats: {},
        slowLogCount: 0,
      };
    }

    try {
      const memoryInfo = await this.client!.info('memory');
      const clientInfo = await this.client!.info('clients');
      const keyspaceInfo = await this.client!.info('keyspace');

      // Parse memory
      const usedMatch = memoryInfo.match(/used_memory_human:(\S+)/);
      const peakMatch = memoryInfo.match(/used_memory_peak_human:(\S+)/);
      const fragMatch = memoryInfo.match(/mem_fragmentation_ratio:(\S+)/);

      // Parse clients
      const clientsMatch = clientInfo.match(/connected_clients:(\d+)/);

      // Parse keyspace
      const keyspaceStats: Record<string, { keys: number; expires: number }> = {};
      const dbMatches = keyspaceInfo.matchAll(/db(\d+):keys=(\d+),expires=(\d+)/g);
      for (const match of dbMatches) {
        keyspaceStats[`db${match[1]}`] = {
          keys: parseInt(match[2], 10),
          expires: parseInt(match[3], 10),
        };
      }

      // Get slow log count (using sendCommand for compatibility)
      let slowLogLen = 0;
      try {
        const slowLogResult = await this.client!.sendCommand(['SLOWLOG', 'LEN']);
        slowLogLen = typeof slowLogResult === 'number' ? slowLogResult : 0;
      } catch {
        // Slow log not available or not supported
      }

      return {
        stats,
        memory: {
          used: usedMatch ? usedMatch[1] : 'unknown',
          peak: peakMatch ? peakMatch[1] : 'unknown',
          fragmentation: fragMatch ? parseFloat(fragMatch[1]) : 0,
        },
        clients: clientsMatch ? parseInt(clientsMatch[1], 10) : 0,
        keyspaceStats,
        slowLogCount: slowLogLen,
      };
    } catch (error) {
      this.logger.error(`Detailed metrics error: ${error}`);
      return {
        stats,
        memory: { used: 'unknown', peak: 'unknown', fragmentation: 0 },
        clients: 0,
        keyspaceStats: {},
        slowLogCount: 0,
      };
    }
  }

  /**
   * Configure eviction policies
   */
  async configureEviction(
    maxMemory: string,
    policy: 'volatile-lru' | 'allkeys-lru' | 'volatile-lfu' | 'allkeys-lfu' | 'volatile-random' | 'allkeys-random' | 'volatile-ttl' | 'noeviction',
  ): Promise<boolean> {
    if (!this.isReady()) return false;

    try {
      await this.client!.configSet('maxmemory', maxMemory);
      await this.client!.configSet('maxmemory-policy', policy);
      this.logger.log(`Configured eviction: maxmemory=${maxMemory}, policy=${policy}`);
      return true;
    } catch (error) {
      this.logger.error(`Eviction configuration error: ${error}`);
      return false;
    }
  }

  /**
   * Optimize for fallback use case
   * Extends TTL for fallback data and marks as stale
   */
  async extendForFallback(key: string, additionalTTL: number): Promise<boolean> {
    if (!this.isReady()) return false;

    try {
      const currentTTL = await this.client!.ttl(key);
      if (currentTTL > 0) {
        await this.client!.expire(key, currentTTL + additionalTTL);
        // Mark as fallback data
        await this.client!.set(`fallback:${key}`, '1', { EX: currentTTL + additionalTTL });
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Extend for fallback error: ${error}`);
      return false;
    }
  }

  /**
   * Check if data is from fallback
   */
  async isFallbackData(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    return this.exists(`fallback:${key}`);
  }

  // =================== INTEGRATION MODULE CACHE OPERATIONS ===================

  /**
   * Cache integration dashboard metrics
   */
  async getIntegrationMetrics<T>(): Promise<T | null> {
    return this.get<T>(`${CachePrefix.INTEGRATION}dashboard:metrics`);
  }

  async setIntegrationMetrics<T>(value: T, ttl: number = CacheTTL.SHORT): Promise<boolean> {
    return this.set(`${CachePrefix.INTEGRATION}dashboard:metrics`, value, {
      ttl,
      tags: ['integration', 'dashboard'],
    });
  }

  /**
   * Cache HR-Finance payroll entries
   */
  async getPayrollEntries<T>(employeeId?: string): Promise<T | null> {
    const key = employeeId
      ? `${CachePrefix.HR}payroll:${employeeId}`
      : `${CachePrefix.HR}payroll:all`;
    return this.get<T>(key);
  }

  async setPayrollEntries<T>(value: T, employeeId?: string, ttl: number = CacheTTL.MEDIUM): Promise<boolean> {
    const key = employeeId
      ? `${CachePrefix.HR}payroll:${employeeId}`
      : `${CachePrefix.HR}payroll:all`;
    return this.set(key, value, { ttl, tags: ['hr', 'payroll', 'finance'] });
  }

  /**
   * Cache Finance transactions
   */
  async getFinanceTransactions<T>(module?: string): Promise<T | null> {
    const key = module
      ? `${CachePrefix.FINANCE}transactions:${module}`
      : `${CachePrefix.FINANCE}transactions:all`;
    return this.get<T>(key);
  }

  async setFinanceTransactions<T>(value: T, module?: string, ttl: number = CacheTTL.MEDIUM): Promise<boolean> {
    const key = module
      ? `${CachePrefix.FINANCE}transactions:${module}`
      : `${CachePrefix.FINANCE}transactions:all`;
    return this.set(key, value, { ttl, tags: ['finance', 'transactions'] });
  }

  /**
   * Cache Logistics-Finance expenses
   */
  async getLogisticsExpenses<T>(filters?: Record<string, string>): Promise<T | null> {
    const filterKey = filters ? Object.entries(filters).map(([k, v]) => `${k}:${v}`).join(':') : 'all';
    return this.get<T>(`${CachePrefix.LOGISTICS}expenses:${filterKey}`);
  }

  async setLogisticsExpenses<T>(value: T, filters?: Record<string, string>, ttl: number = CacheTTL.MEDIUM): Promise<boolean> {
    const filterKey = filters ? Object.entries(filters).map(([k, v]) => `${k}:${v}`).join(':') : 'all';
    return this.set(`${CachePrefix.LOGISTICS}expenses:${filterKey}`, value, {
      ttl,
      tags: ['logistics', 'expenses', 'finance'],
    });
  }

  /**
   * Cache LMS-HR competency data
   */
  async getCompetencyMatrix<T>(employeeId: string): Promise<T | null> {
    return this.get<T>(`${CachePrefix.LMS}competency:${employeeId}`);
  }

  async setCompetencyMatrix<T>(employeeId: string, value: T, ttl: number = CacheTTL.LONG): Promise<boolean> {
    return this.set(`${CachePrefix.LMS}competency:${employeeId}`, value, {
      ttl,
      tags: ['lms', 'hr', `employee:${employeeId}`],
    });
  }

  /**
   * Invalidate all integration-related caches
   */
  async invalidateIntegrationCaches(): Promise<number> {
    let totalInvalidated = 0;
    totalInvalidated += await this.invalidateTag('integration');
    totalInvalidated += await this.invalidateTag('hr');
    totalInvalidated += await this.invalidateTag('finance');
    totalInvalidated += await this.invalidateTag('logistics');
    totalInvalidated += await this.invalidateTag('lms');
    return totalInvalidated;
  }

  /**
   * Invalidate caches for a specific employee
   */
  async invalidateEmployeeCaches(employeeId: string): Promise<number> {
    return this.invalidateTag(`employee:${employeeId}`);
  }

  /**
   * Cache audit trail with pagination
   */
  async getAuditTrail<T>(page: number = 1, limit: number = 50): Promise<T | null> {
    return this.get<T>(`${CachePrefix.INTEGRATION}audit:page:${page}:limit:${limit}`);
  }

  async setAuditTrail<T>(value: T, page: number = 1, limit: number = 50, ttl: number = CacheTTL.SHORT): Promise<boolean> {
    return this.set(`${CachePrefix.INTEGRATION}audit:page:${page}:limit:${limit}`, value, {
      ttl,
      tags: ['integration', 'audit'],
    });
  }

  /**
   * Cache integration rules
   */
  async getIntegrationRules<T>(): Promise<T | null> {
    return this.get<T>(`${CachePrefix.INTEGRATION}rules:all`);
  }

  async setIntegrationRules<T>(value: T, ttl: number = CacheTTL.LONG): Promise<boolean> {
    return this.set(`${CachePrefix.INTEGRATION}rules:all`, value, {
      ttl,
      tags: ['integration', 'rules'],
    });
  }

  async invalidateIntegrationRules(): Promise<number> {
    return this.invalidateTag('rules');
  }
}
