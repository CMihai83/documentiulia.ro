import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnected = false;

  // Metrics tracking
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
  };

  // Connection pool settings
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms
  private readonly connectionTimeout = 5000; // ms
  private readonly commandTimeout = 3000; // ms

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('Redis URL not configured. Cache will be disabled.');
      return;
    }

    try {
      // Create Redis client with connection pooling and retry logic
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: this.connectionTimeout,
          reconnectStrategy: (retries: number) => {
            if (retries > this.maxRetries) {
              this.logger.error('Max Redis connection retries exceeded');
              return new Error('Max retries exceeded');
            }
            const delay = Math.min(retries * this.retryDelay, 5000);
            this.logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          },
        },
        commandsQueueMaxLength: 1000, // Limit command queue size
      });

      // Event handlers
      this.client.on('error', (err) => {
        this.logger.error(`Redis client error: ${err.message}`);
        this.metrics.errors++;
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.log('Redis client connecting...');
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        this.logger.warn('Redis client reconnecting...');
        this.isConnected = false;
      });

      this.client.on('end', () => {
        this.logger.log('Redis client connection closed');
        this.isConnected = false;
      });

      // Connect to Redis
      await this.client.connect();
      this.logger.log('Redis connection established successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.logger.log('Redis connection closed gracefully');
      } catch (error) {
        this.logger.error(`Error closing Redis connection: ${error.message}`);
      }
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = string>(key: string): Promise<T | null> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const value = await this.client.get(key);

      if (value) {
        this.metrics.hits++;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}: ${error.message}`);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache set');
      return false;
    }

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      this.metrics.sets++;
      return true;
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}: ${error.message}`);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping cache delete');
      return false;
    }

    try {
      await this.client.del(key);
      this.metrics.deletes++;
      return true;
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}: ${error.message}`);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping pattern delete');
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      await this.client.del(keys);
      this.metrics.deletes += keys.length;
      return keys.length;
    } catch (error) {
      this.logger.error(`Redis DEL pattern error for ${pattern}: ${error.message}`);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Redis EXISTS error for key ${key}: ${error.message}`);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Set TTL on an existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result;
    } catch (error) {
      this.logger.error(`Redis EXPIRE error for key ${key}: ${error.message}`);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error(`Redis INCR error for key ${key}: ${error.message}`);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    if (!this.isConnected) {
      return 0;
    }

    try {
      return await this.client.decr(key);
    } catch (error) {
      this.logger.error(`Redis DECR error for key ${key}: ${error.message}`);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const values = await this.client.mGet(keys);
      return values.map((value) => {
        if (value) {
          this.metrics.hits++;
          try {
            return JSON.parse(value) as T;
          } catch {
            return value as T;
          }
        } else {
          this.metrics.misses++;
          return null;
        }
      });
    } catch (error) {
      this.logger.error(`Redis MGET error: ${error.message}`);
      this.metrics.errors++;
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs at once
   */
  async mset(pairs: Record<string, any>): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const serializedPairs: Record<string, string> = {};
      for (const [key, value] of Object.entries(pairs)) {
        serializedPairs[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }

      await this.client.mSet(serializedPairs);
      this.metrics.sets += Object.keys(pairs).length;
      return true;
    } catch (error) {
      this.logger.error(`Redis MSET error: ${error.message}`);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Flush all keys (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.client.flushAll();
      this.logger.warn('Redis: All keys flushed');
      return true;
    } catch (error) {
      this.logger.error(`Redis FLUSHALL error: ${error.message}`);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: parseFloat(hitRate.toFixed(2)),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
    };
    this.logger.log('Redis metrics reset');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    if (!this.isConnected) {
      return {
        status: 'unhealthy',
        connected: false,
        error: 'Not connected',
      };
    }

    const start = Date.now();
    try {
      await this.client.ping();
      const latencyMs = Date.now() - start;

      return {
        status: 'healthy',
        connected: true,
        latencyMs,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        latencyMs: Date.now() - start,
        error: error.message,
      };
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<Record<string, any>> {
    if (!this.isConnected) {
      return {};
    }

    try {
      const info = await this.client.info();
      const lines = info.split('\r\n');
      const result: Record<string, any> = {};

      lines.forEach((line) => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            result[key] = value;
          }
        }
      });

      return result;
    } catch (error) {
      this.logger.error(`Redis INFO error: ${error.message}`);
      return {};
    }
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get the underlying Redis client (use with caution)
   */
  getClient(): RedisClientType {
    return this.client;
  }
}
