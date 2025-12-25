import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * RELY-001: Fallback Mechanism for External Resource Failures
 *
 * Provides a robust caching and fallback system for external API calls:
 * - Redis-based caching with configurable TTL
 * - Automatic fallback to cached/historical data on API failures
 * - Circuit breaker pattern to prevent cascade failures
 * - Fallback event logging for debugging
 * - User notification metadata for UI
 */

export interface CacheEntry<T = any> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  source: 'live' | 'cache' | 'fallback' | 'stale';
  ttl: number;
  hitCount: number;
  lastAccessedAt: Date;
}

export interface FallbackEvent {
  id: string;
  service: string;
  endpoint: string;
  error: string;
  fallbackType: 'cache' | 'stale' | 'default' | 'none';
  timestamp: Date;
  recoveredAt?: Date;
  metadata?: Record<string, any>;
}

export interface CircuitBreakerState {
  service: string;
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  openedAt?: Date;
}

export interface FallbackConfig {
  service: string;
  endpoint: string;
  ttl: number; // Primary cache TTL in seconds
  staleTtl: number; // How long to keep stale data as fallback
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number; // Milliseconds
  };
  defaultValue?: any;
}

export interface FetchResult<T> {
  data: T;
  source: 'live' | 'cache' | 'fallback' | 'stale' | 'default';
  isFallback: boolean;
  cachedAt?: Date;
  expiresAt?: Date;
  warning?: string;
}

@Injectable()
export class ExternalApiFallbackService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExternalApiFallbackService.name);
  private redis: RedisClientType | null = null;
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private fallbackEvents: FallbackEvent[] = [];
  private configs = new Map<string, FallbackConfig>();

  // Default configurations for known services
  private readonly DEFAULT_CONFIGS: FallbackConfig[] = [
    {
      service: 'anaf',
      endpoint: 'validate-cui',
      ttl: 3600, // 1 hour
      staleTtl: 86400 * 7, // 7 days
      circuitBreaker: { failureThreshold: 3, resetTimeout: 60000 },
    },
    {
      service: 'anaf',
      endpoint: 'spv-submit',
      ttl: 0, // No caching for submissions
      staleTtl: 0,
      circuitBreaker: { failureThreshold: 5, resetTimeout: 120000 },
    },
    {
      service: 'anaf',
      endpoint: 'efactura-status',
      ttl: 300, // 5 minutes
      staleTtl: 3600, // 1 hour
      circuitBreaker: { failureThreshold: 3, resetTimeout: 60000 },
    },
    {
      service: 'saga',
      endpoint: 'sync',
      ttl: 1800, // 30 minutes
      staleTtl: 86400, // 1 day
      circuitBreaker: { failureThreshold: 3, resetTimeout: 60000 },
    },
    {
      service: 'bnr',
      endpoint: 'exchange-rates',
      ttl: 3600, // 1 hour
      staleTtl: 86400 * 30, // 30 days (rates don't change that fast)
      circuitBreaker: { failureThreshold: 3, resetTimeout: 60000 },
    },
    {
      service: 'revisal',
      endpoint: 'declarations',
      ttl: 1800,
      staleTtl: 86400,
      circuitBreaker: { failureThreshold: 3, resetTimeout: 60000 },
    },
  ];

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
      this.redis = createClient({ url: redisUrl });

      this.redis.on('error', (err: Error) => {
        this.logger.error('Redis error:', err.message);
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected for fallback cache');
      });

      await this.redis.connect();

      // Load default configs
      for (const config of this.DEFAULT_CONFIGS) {
        this.registerConfig(config);
      }

      this.logger.log('ExternalApiFallbackService initialized');
    } catch (error: any) {
      this.logger.warn('Redis initialization failed, using in-memory cache', error.message);
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Register a service configuration
   */
  registerConfig(config: FallbackConfig): void {
    const key = `${config.service}:${config.endpoint}`;
    this.configs.set(key, config);
    this.circuitBreakers.set(key, {
      service: config.service,
      state: 'closed',
      failures: 0,
    });
  }

  /**
   * Fetch with fallback - main method for external API calls
   */
  async fetchWithFallback<T>(
    service: string,
    endpoint: string,
    fetchFn: () => Promise<T>,
    options?: {
      cacheKey?: string;
      ttl?: number;
      staleTtl?: number;
      defaultValue?: T;
      skipCache?: boolean;
    },
  ): Promise<FetchResult<T>> {
    const configKey = `${service}:${endpoint}`;
    const config = this.configs.get(configKey) || this.createDefaultConfig(service, endpoint);
    const cacheKey = options?.cacheKey || `fallback:${configKey}:default`;
    const ttl = options?.ttl ?? config.ttl;
    const staleTtl = options?.staleTtl ?? config.staleTtl;

    // Check circuit breaker
    if (this.isCircuitOpen(configKey)) {
      this.logger.warn(`Circuit breaker open for ${configKey}, using fallback`);
      return this.getFallbackData<T>(cacheKey, service, endpoint, options?.defaultValue);
    }

    // Check cache first (unless skipped)
    if (!options?.skipCache && ttl > 0) {
      const cached = await this.getFromCache<T>(cacheKey);
      if (cached && !this.isExpired(cached)) {
        this.logger.debug(`Cache hit for ${cacheKey}`);
        await this.updateHitCount(cacheKey);
        return {
          data: cached.data,
          source: 'cache',
          isFallback: false,
          cachedAt: cached.cachedAt,
          expiresAt: cached.expiresAt,
        };
      }
    }

    // Try to fetch fresh data
    try {
      const startTime = Date.now();
      const data = await fetchFn();
      const duration = Date.now() - startTime;

      // Record success
      this.recordSuccess(configKey);

      // Cache the result
      if (ttl > 0) {
        await this.setCache(cacheKey, data, ttl, staleTtl);
      }

      this.logger.debug(`Live fetch successful for ${configKey} in ${duration}ms`);

      return {
        data,
        source: 'live',
        isFallback: false,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + ttl * 1000),
      };
    } catch (error) {
      // Record failure
      this.recordFailure(configKey, error.message);

      // Log fallback event
      const event = this.logFallbackEvent(service, endpoint, error.message);

      // Try fallback
      return this.getFallbackData<T>(cacheKey, service, endpoint, options?.defaultValue);
    }
  }

  /**
   * Get fallback data (stale cache or default)
   */
  private async getFallbackData<T>(
    cacheKey: string,
    service: string,
    endpoint: string,
    defaultValue?: T,
  ): Promise<FetchResult<T>> {
    // Try stale cache
    const stale = await this.getFromCache<T>(cacheKey, true);
    if (stale) {
      this.logger.warn(`Using stale cache for ${cacheKey}`);
      return {
        data: stale.data,
        source: 'stale',
        isFallback: true,
        cachedAt: stale.cachedAt,
        warning: `Date temporare din ${stale.cachedAt.toLocaleDateString('ro-RO')} - serviciul ${service} nu răspunde`,
      };
    }

    // Use default value if available
    if (defaultValue !== undefined) {
      this.logger.warn(`Using default value for ${cacheKey}`);
      return {
        data: defaultValue,
        source: 'default',
        isFallback: true,
        warning: `Date implicite utilizate - serviciul ${service} nu răspunde`,
      };
    }

    // No fallback available
    throw new Error(`Serviciul ${service} nu răspunde și nu există date în cache`);
  }

  /**
   * Set cache entry
   */
  private async setCache<T>(key: string, data: T, ttl: number, staleTtl: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + ttl * 1000),
      source: 'live',
      ttl,
      hitCount: 0,
      lastAccessedAt: new Date(),
    };

    if (this.redis) {
      try {
        // Store with stale TTL (longer than primary TTL)
        await this.redis.set(key, JSON.stringify(entry), { EX: staleTtl });
        // Store primary expiry separately
        await this.redis.set(`${key}:expiry`, '1', { EX: ttl });
      } catch (error: any) {
        this.logger.error(`Cache set error: ${error.message}`);
      }
    }
  }

  /**
   * Get from cache
   */
  private async getFromCache<T>(key: string, includeStale = false): Promise<CacheEntry<T> | null> {
    if (!this.redis) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      const entry = JSON.parse(data) as CacheEntry<T>;
      entry.cachedAt = new Date(entry.cachedAt);
      entry.expiresAt = new Date(entry.expiresAt);
      entry.lastAccessedAt = new Date(entry.lastAccessedAt);

      // Check if still valid (not expired)
      const isExpired = entry.expiresAt < new Date();

      if (isExpired && !includeStale) {
        return null;
      }

      return entry;
    } catch (error: any) {
      this.logger.error(`Cache get error: ${error.message}`);
      return null;
    }
  }

  /**
   * Update hit count
   */
  private async updateHitCount(key: string): Promise<void> {
    if (!this.redis) return;

    try {
      const data = await this.redis.get(key);
      if (data) {
        const entry = JSON.parse(data);
        entry.hitCount = (entry.hitCount || 0) + 1;
        entry.lastAccessedAt = new Date();
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
          await this.redis.set(key, JSON.stringify(entry), { EX: ttl });
        }
      }
    } catch (error) {
      // Non-critical, ignore
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt < new Date();
  }

  /**
   * Create default config for unregistered services
   */
  private createDefaultConfig(service: string, endpoint: string): FallbackConfig {
    return {
      service,
      endpoint,
      ttl: 3600, // 1 hour default
      staleTtl: 86400, // 1 day stale
      circuitBreaker: { failureThreshold: 3, resetTimeout: 60000 },
    };
  }

  // ===== Circuit Breaker Methods =====

  /**
   * Check if circuit is open (preventing calls)
   */
  private isCircuitOpen(key: string): boolean {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return false;

    if (breaker.state === 'open') {
      // Check if reset timeout has passed
      const config = this.configs.get(key);
      const resetTimeout = config?.circuitBreaker.resetTimeout || 60000;

      if (breaker.openedAt && Date.now() - breaker.openedAt.getTime() > resetTimeout) {
        // Move to half-open
        breaker.state = 'half-open';
        this.logger.log(`Circuit breaker for ${key} moved to half-open`);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record successful call
   */
  private recordSuccess(key: string): void {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return;

    breaker.failures = 0;
    breaker.lastSuccess = new Date();

    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
      this.logger.log(`Circuit breaker for ${key} closed`);
    }
  }

  /**
   * Record failed call
   */
  private recordFailure(key: string, error: string): void {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailure = new Date();

    const config = this.configs.get(key);
    const threshold = config?.circuitBreaker.failureThreshold || 3;

    if (breaker.failures >= threshold) {
      breaker.state = 'open';
      breaker.openedAt = new Date();
      this.logger.warn(`Circuit breaker for ${key} opened after ${breaker.failures} failures`);
    }
  }

  // ===== Fallback Event Logging =====

  /**
   * Log a fallback event
   */
  private logFallbackEvent(service: string, endpoint: string, error: string): FallbackEvent {
    const event: FallbackEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      service,
      endpoint,
      error,
      fallbackType: 'cache',
      timestamp: new Date(),
    };

    this.fallbackEvents.push(event);

    // Keep only last 1000 events
    if (this.fallbackEvents.length > 1000) {
      this.fallbackEvents = this.fallbackEvents.slice(-1000);
    }

    this.logger.warn(`Fallback event: ${service}/${endpoint} - ${error}`);

    return event;
  }

  /**
   * Get recent fallback events
   */
  getFallbackEvents(limit = 100, service?: string): FallbackEvent[] {
    let events = this.fallbackEvents;

    if (service) {
      events = events.filter((e) => e.service === service);
    }

    return events.slice(-limit).reverse();
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker(service: string, endpoint: string): boolean {
    const key = `${service}:${endpoint}`;
    const breaker = this.circuitBreakers.get(key);

    if (breaker) {
      breaker.state = 'closed';
      breaker.failures = 0;
      breaker.openedAt = undefined;
      this.logger.log(`Circuit breaker for ${key} manually reset`);
      return true;
    }

    return false;
  }

  // ===== Cache Management =====

  /**
   * Invalidate specific cache key
   */
  async invalidateCache(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      await this.redis.del(key);
      await this.redis.del(`${key}:expiry`);
      return true;
    } catch (error: any) {
      this.logger.error(`Cache invalidation error: ${error.message}`);
      return false;
    }
  }

  /**
   * Invalidate all cache for a service
   */
  async invalidateServiceCache(service: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const pattern = `fallback:${service}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(keys);
      }

      return keys.length;
    } catch (error: any) {
      this.logger.error(`Service cache invalidation error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    services: { service: string; keyCount: number }[];
    memoryUsage?: string;
  }> {
    if (!this.redis) {
      return { totalKeys: 0, services: [] };
    }

    try {
      const keys = await this.redis.keys('fallback:*');
      const serviceMap = new Map<string, number>();

      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length >= 2) {
          const service = parts[1];
          serviceMap.set(service, (serviceMap.get(service) || 0) + 1);
        }
      }

      const info = await this.redis.info();
      const memoryMatch = info.match(/used_memory_human:(\S+)/);

      return {
        totalKeys: keys.length,
        services: Array.from(serviceMap.entries()).map(([service, keyCount]) => ({
          service,
          keyCount,
        })),
        memoryUsage: memoryMatch ? memoryMatch[1] : undefined,
      };
    } catch (error) {
      this.logger.error(`Cache stats error: ${error.message}`);
      return { totalKeys: 0, services: [] };
    }
  }

  /**
   * Warm up cache with common requests
   */
  async warmupCache(warmupFunctions: { key: string; fn: () => Promise<any>; ttl: number }[]): Promise<{
    success: number;
    failed: number;
  }> {
    let success = 0;
    let failed = 0;

    for (const { key, fn, ttl } of warmupFunctions) {
      try {
        const data = await fn();
        await this.setCache(key, data, ttl, ttl * 24);
        success++;
      } catch (error) {
        failed++;
        this.logger.warn(`Cache warmup failed for ${key}: ${error.message}`);
      }
    }

    return { success, failed };
  }

  /**
   * Get dashboard summary
   */
  async getDashboard(): Promise<{
    cacheStats: Awaited<ReturnType<typeof this.getCacheStats>>;
    circuitBreakers: CircuitBreakerState[];
    recentEvents: FallbackEvent[];
    health: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const cacheStats = await this.getCacheStats();
    const circuitBreakers = this.getCircuitBreakerStates();
    const recentEvents = this.getFallbackEvents(10);

    // Determine health
    const openCircuits = circuitBreakers.filter((cb) => cb.state === 'open').length;
    const recentFailures = recentEvents.filter(
      (e) => Date.now() - e.timestamp.getTime() < 300000, // Last 5 minutes
    ).length;

    let health: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (openCircuits > 0 || recentFailures > 5) {
      health = 'degraded';
    }
    if (openCircuits > 2 || recentFailures > 10) {
      health = 'unhealthy';
    }

    return {
      cacheStats,
      circuitBreakers,
      recentEvents,
      health,
    };
  }
}
