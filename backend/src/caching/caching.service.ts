import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type CacheLayer = 'MEMORY' | 'REDIS' | 'DISTRIBUTED';

export type CacheStrategy = 'LRU' | 'LFU' | 'FIFO' | 'TTL';

export type InvalidationStrategy = 'IMMEDIATE' | 'LAZY' | 'SCHEDULED';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  tags: string[];
  layer: CacheLayer;
  size: number;
}

export interface CacheConfig {
  defaultTtl: number;
  maxMemorySize: number;
  maxEntries: number;
  strategy: CacheStrategy;
  layers: CacheLayer[];
  invalidationStrategy: InvalidationStrategy;
  compressionThreshold: number;
  enableStats: boolean;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  layer?: CacheLayer;
  compress?: boolean;
  priority?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage: number;
  evictions: number;
  invalidations: number;
  averageAccessTime: number;
  byLayer: Record<CacheLayer, LayerStats>;
  byTag: Record<string, TagStats>;
}

export interface LayerStats {
  entries: number;
  hits: number;
  misses: number;
  memoryUsage: number;
}

export interface TagStats {
  entries: number;
  hits: number;
  lastInvalidated?: Date;
}

export interface CachePattern {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  keyPattern: string;
  ttl: number;
  tags: string[];
  warmupQuery?: string;
}

export interface WarmupTask {
  id: string;
  patternId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  entriesWarmed: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface RateLimitConfig {
  key: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  blocked: boolean;
  blockedUntil?: Date;
}

@Injectable()
export class CachingService implements OnModuleInit, OnModuleDestroy {
  private cache: Map<string, CacheEntry> = new Map();
  private patterns: Map<string, CachePattern> = new Map();
  private warmupTasks: Map<string, WarmupTask> = new Map();
  private rateLimiters: Map<string, { count: number; resetAt: Date; blockedUntil?: Date }> = new Map();
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private statsInterval?: ReturnType<typeof setInterval>;

  private config: CacheConfig = {
    defaultTtl: 3600000, // 1 hour
    maxMemorySize: 100 * 1024 * 1024, // 100MB
    maxEntries: 10000,
    strategy: 'LRU',
    layers: ['MEMORY'],
    invalidationStrategy: 'IMMEDIATE',
    compressionThreshold: 1024, // 1KB
    enableStats: true,
  };

  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalEntries: 0,
    memoryUsage: 0,
    evictions: 0,
    invalidations: 0,
    averageAccessTime: 0,
    byLayer: {
      MEMORY: { entries: 0, hits: 0, misses: 0, memoryUsage: 0 },
      REDIS: { entries: 0, hits: 0, misses: 0, memoryUsage: 0 },
      DISTRIBUTED: { entries: 0, hits: 0, misses: 0, memoryUsage: 0 },
    },
    byTag: {},
  };

  private accessTimes: number[] = [];

  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    await this.initializeDefaultPatterns();
    this.startCleanupTask();
    this.startStatsTask();
  }

  onModuleDestroy(): void {
    this.stopCleanupTask();
    this.stopStatsTask();
  }

  private async initializeDefaultPatterns(): Promise<void> {
    const defaultPatterns: Omit<CachePattern, 'id'>[] = [
      {
        name: 'VAT Rates Cache',
        nameRo: 'Cache Rate TVA',
        description: 'Cache VAT rates for quick tax calculations',
        descriptionRo: 'Cache pentru ratele TVA pentru calcule fiscale rapide',
        keyPattern: 'vat:rate:*',
        ttl: 86400000, // 24 hours
        tags: ['tax', 'vat', 'rates'],
      },
      {
        name: 'Customer Cache',
        nameRo: 'Cache Clienți',
        description: 'Cache customer data for invoice generation',
        descriptionRo: 'Cache pentru datele clienților pentru generare facturi',
        keyPattern: 'customer:*',
        ttl: 3600000, // 1 hour
        tags: ['customer', 'entity'],
      },
      {
        name: 'Invoice Template Cache',
        nameRo: 'Cache Șabloane Facturi',
        description: 'Cache invoice templates for PDF generation',
        descriptionRo: 'Cache pentru șabloane facturi pentru generare PDF',
        keyPattern: 'template:invoice:*',
        ttl: 7200000, // 2 hours
        tags: ['template', 'invoice'],
      },
      {
        name: 'ANAF API Response Cache',
        nameRo: 'Cache Răspunsuri ANAF API',
        description: 'Cache ANAF API responses to reduce API calls',
        descriptionRo: 'Cache pentru răspunsuri API ANAF pentru reducerea apelurilor',
        keyPattern: 'anaf:*',
        ttl: 1800000, // 30 minutes
        tags: ['anaf', 'api', 'external'],
      },
      {
        name: 'Session Cache',
        nameRo: 'Cache Sesiuni',
        description: 'Cache user sessions for authentication',
        descriptionRo: 'Cache pentru sesiuni utilizatori pentru autentificare',
        keyPattern: 'session:*',
        ttl: 1800000, // 30 minutes
        tags: ['session', 'auth'],
      },
      {
        name: 'Exchange Rates Cache',
        nameRo: 'Cache Cursuri Valutare',
        description: 'Cache BNR exchange rates for currency conversion',
        descriptionRo: 'Cache pentru cursuri BNR pentru conversie valutară',
        keyPattern: 'exchange:rate:*',
        ttl: 3600000, // 1 hour
        tags: ['exchange', 'currency', 'bnr'],
      },
      {
        name: 'Report Cache',
        nameRo: 'Cache Rapoarte',
        description: 'Cache generated reports for quick access',
        descriptionRo: 'Cache pentru rapoarte generate pentru acces rapid',
        keyPattern: 'report:*',
        ttl: 900000, // 15 minutes
        tags: ['report', 'analytics'],
      },
    ];

    for (const pattern of defaultPatterns) {
      const id = this.generateId();
      this.patterns.set(id, { ...pattern, id });
    }
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Run every minute
  }

  private stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private startStatsTask(): void {
    this.statsInterval = setInterval(() => {
      this.updateStats();
    }, 30000); // Update every 30 seconds
  }

  private stopStatsTask(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = undefined;
    }
  }

  // Configuration
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.eventEmitter.emit('cache.configured', { config: this.config });
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  // Core Cache Operations
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    const startTime = Date.now();
    const ttl = options.ttl || this.config.defaultTtl;
    const layer = options.layer || this.config.layers[0];
    const now = new Date();

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      await this.evict();
    }

    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf-8');

    // Check memory limit
    if (this.stats.memoryUsage + size > this.config.maxMemorySize) {
      await this.evictUntilFits(size);
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttl),
      accessCount: 0,
      lastAccessedAt: now,
      tags: options.tags || [],
      layer,
      size,
    };

    this.cache.set(key, entry);
    this.updateStatsOnSet(entry);
    this.recordAccessTime(Date.now() - startTime);

    this.eventEmitter.emit('cache.set', { key, ttl, tags: entry.tags, layer });
    return true;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.stats.byLayer[this.config.layers[0]].misses++;
      this.recordAccessTime(Date.now() - startTime);
      return undefined;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      await this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessedAt = new Date();
    this.stats.hits++;
    this.stats.byLayer[entry.layer].hits++;

    // Update tag stats
    for (const tag of entry.tags) {
      if (!this.stats.byTag[tag]) {
        this.stats.byTag[tag] = { entries: 0, hits: 0 };
      }
      this.stats.byTag[tag].hits++;
    }

    this.recordAccessTime(Date.now() - startTime);
    this.eventEmitter.emit('cache.hit', { key, layer: entry.layer });
    return entry.value as T;
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.updateStatsOnDelete(entry);
    this.stats.invalidations++;

    this.eventEmitter.emit('cache.deleted', { key, layer: entry.layer });
    return true;
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (new Date() > entry.expiresAt) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  async clear(): Promise<number> {
    const count = this.cache.size;
    this.cache.clear();
    this.resetStats();

    this.eventEmitter.emit('cache.cleared', { entriesCleared: count });
    return count;
  }

  // Tag-based Operations
  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
      count++;
    }

    if (this.stats.byTag[tag]) {
      this.stats.byTag[tag].lastInvalidated = new Date();
    }

    this.eventEmitter.emit('cache.invalidated.tag', { tag, count });
    return count;
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let totalCount = 0;
    for (const tag of tags) {
      totalCount += await this.invalidateByTag(tag);
    }
    return totalCount;
  }

  async getByTag(tag: string): Promise<CacheEntry[]> {
    const entries: CacheEntry[] = [];
    const now = new Date();

    for (const entry of this.cache.values()) {
      if (entry.tags.includes(tag) && entry.expiresAt > now) {
        entries.push(entry);
      }
    }

    return entries;
  }

  // Pattern-based Operations
  async invalidateByPattern(pattern: string): Promise<number> {
    let count = 0;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
      count++;
    }

    this.eventEmitter.emit('cache.invalidated.pattern', { pattern, count });
    return count;
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }

    return keys;
  }

  // Cache Patterns Management
  async createPattern(pattern: Omit<CachePattern, 'id'>): Promise<CachePattern> {
    const id = this.generateId();
    const newPattern: CachePattern = { ...pattern, id };
    this.patterns.set(id, newPattern);

    this.eventEmitter.emit('cache.pattern.created', { patternId: id });
    return newPattern;
  }

  async getPattern(id: string): Promise<CachePattern | undefined> {
    return this.patterns.get(id);
  }

  async getPatternByName(name: string): Promise<CachePattern | undefined> {
    return Array.from(this.patterns.values()).find((p) => p.name === name);
  }

  async listPatterns(): Promise<CachePattern[]> {
    return Array.from(this.patterns.values());
  }

  async deletePattern(id: string): Promise<boolean> {
    return this.patterns.delete(id);
  }

  // Cache Warming
  async warmup(patternId: string, data: Array<{ key: string; value: any }>): Promise<WarmupTask> {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    const task: WarmupTask = {
      id: this.generateId(),
      patternId,
      status: 'RUNNING',
      entriesWarmed: 0,
      startedAt: new Date(),
    };

    this.warmupTasks.set(task.id, task);
    this.eventEmitter.emit('cache.warmup.started', { taskId: task.id, patternId });

    try {
      for (const item of data) {
        await this.set(item.key, item.value, {
          ttl: pattern.ttl,
          tags: pattern.tags,
        });
        task.entriesWarmed++;
      }

      task.status = 'COMPLETED';
      task.completedAt = new Date();
      this.eventEmitter.emit('cache.warmup.completed', {
        taskId: task.id,
        entriesWarmed: task.entriesWarmed,
      });
    } catch (error) {
      task.status = 'FAILED';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.completedAt = new Date();
      this.eventEmitter.emit('cache.warmup.failed', { taskId: task.id, error: task.error });
    }

    this.warmupTasks.set(task.id, task);
    return task;
  }

  async getWarmupTask(taskId: string): Promise<WarmupTask | undefined> {
    return this.warmupTasks.get(taskId);
  }

  // Rate Limiting
  async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    const now = new Date();
    let limiter = this.rateLimiters.get(config.key);

    // Check if blocked
    if (limiter?.blockedUntil && limiter.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: limiter.resetAt,
        blocked: true,
        blockedUntil: limiter.blockedUntil,
      };
    }

    // Initialize or reset if window expired
    if (!limiter || limiter.resetAt <= now) {
      limiter = {
        count: 0,
        resetAt: new Date(now.getTime() + config.windowMs),
      };
    }

    limiter.count++;

    const allowed = limiter.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - limiter.count);

    // Block if exceeded and blockDuration is set
    if (!allowed && config.blockDurationMs) {
      limiter.blockedUntil = new Date(now.getTime() + config.blockDurationMs);
    }

    this.rateLimiters.set(config.key, limiter);

    const result: RateLimitResult = {
      allowed,
      remaining,
      resetAt: limiter.resetAt,
      blocked: !!limiter.blockedUntil && limiter.blockedUntil > now,
      blockedUntil: limiter.blockedUntil,
    };

    if (!allowed) {
      this.eventEmitter.emit('cache.ratelimit.exceeded', { key: config.key, result });
    }

    return result;
  }

  async resetRateLimit(key: string): Promise<boolean> {
    return this.rateLimiters.delete(key);
  }

  // TTL Management
  async setTtl(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.ttl = ttl;
    entry.expiresAt = new Date(Date.now() + ttl);
    this.cache.set(key, entry);

    this.eventEmitter.emit('cache.ttl.updated', { key, ttl });
    return true;
  }

  async getTtl(key: string): Promise<number | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const remaining = entry.expiresAt.getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  async touch(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiresAt = new Date(Date.now() + entry.ttl);
    entry.lastAccessedAt = new Date();
    this.cache.set(key, entry);

    return true;
  }

  // Statistics
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    // Calculate memory usage
    let memoryUsage = 0;
    const layerCounts: Record<CacheLayer, number> = { MEMORY: 0, REDIS: 0, DISTRIBUTED: 0 };
    const layerMemory: Record<CacheLayer, number> = { MEMORY: 0, REDIS: 0, DISTRIBUTED: 0 };
    const tagCounts: Record<string, number> = {};

    for (const entry of this.cache.values()) {
      memoryUsage += entry.size;
      layerCounts[entry.layer]++;
      layerMemory[entry.layer] += entry.size;

      for (const tag of entry.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    this.stats.memoryUsage = memoryUsage;

    for (const layer of this.config.layers) {
      this.stats.byLayer[layer].entries = layerCounts[layer];
      this.stats.byLayer[layer].memoryUsage = layerMemory[layer];
    }

    for (const [tag, count] of Object.entries(tagCounts)) {
      if (!this.stats.byTag[tag]) {
        this.stats.byTag[tag] = { entries: 0, hits: 0 };
      }
      this.stats.byTag[tag].entries = count;
    }

    // Calculate average access time
    if (this.accessTimes.length > 0) {
      this.stats.averageAccessTime = this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
    }
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      memoryUsage: 0,
      evictions: 0,
      invalidations: 0,
      averageAccessTime: 0,
      byLayer: {
        MEMORY: { entries: 0, hits: 0, misses: 0, memoryUsage: 0 },
        REDIS: { entries: 0, hits: 0, misses: 0, memoryUsage: 0 },
        DISTRIBUTED: { entries: 0, hits: 0, misses: 0, memoryUsage: 0 },
      },
      byTag: {},
    };
    this.accessTimes = [];
  }

  private updateStatsOnSet(entry: CacheEntry): void {
    this.stats.memoryUsage += entry.size;
    this.stats.byLayer[entry.layer].entries++;
    this.stats.byLayer[entry.layer].memoryUsage += entry.size;

    for (const tag of entry.tags) {
      if (!this.stats.byTag[tag]) {
        this.stats.byTag[tag] = { entries: 0, hits: 0 };
      }
      this.stats.byTag[tag].entries++;
    }
  }

  private updateStatsOnDelete(entry: CacheEntry): void {
    this.stats.memoryUsage -= entry.size;
    this.stats.byLayer[entry.layer].entries--;
    this.stats.byLayer[entry.layer].memoryUsage -= entry.size;

    for (const tag of entry.tags) {
      if (this.stats.byTag[tag]) {
        this.stats.byTag[tag].entries--;
      }
    }
  }

  private recordAccessTime(time: number): void {
    this.accessTimes.push(time);
    // Keep only last 1000 access times
    if (this.accessTimes.length > 1000) {
      this.accessTimes.shift();
    }
  }

  // Eviction
  private async evict(): Promise<void> {
    const entry = this.getEntryToEvict();
    if (entry) {
      await this.delete(entry.key);
      this.stats.evictions++;
    }
  }

  private async evictUntilFits(requiredSize: number): Promise<void> {
    while (this.stats.memoryUsage + requiredSize > this.config.maxMemorySize && this.cache.size > 0) {
      await this.evict();
    }
  }

  private getEntryToEvict(): CacheEntry | undefined {
    const entries = Array.from(this.cache.values());
    if (entries.length === 0) return undefined;

    switch (this.config.strategy) {
      case 'LRU':
        return entries.reduce((oldest, entry) =>
          entry.lastAccessedAt < oldest.lastAccessedAt ? entry : oldest,
        );
      case 'LFU':
        return entries.reduce((leastUsed, entry) =>
          entry.accessCount < leastUsed.accessCount ? entry : leastUsed,
        );
      case 'FIFO':
        return entries.reduce((oldest, entry) =>
          entry.createdAt < oldest.createdAt ? entry : oldest,
        );
      case 'TTL':
        return entries.reduce((soonestExpiring, entry) =>
          entry.expiresAt < soonestExpiring.expiresAt ? entry : soonestExpiring,
        );
      default:
        return entries[0];
    }
  }

  // Cleanup
  private async cleanupExpired(): Promise<number> {
    const now = new Date();
    let count = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
      count++;
    }

    if (count > 0) {
      this.eventEmitter.emit('cache.cleanup', { expiredCount: count });
    }

    return count;
  }

  // Batch Operations
  async mget<T>(keys: string[]): Promise<Map<string, T | undefined>> {
    const results = new Map<string, T | undefined>();
    for (const key of keys) {
      results.set(key, await this.get<T>(key));
    }
    return results;
  }

  async mset<T>(entries: Array<{ key: string; value: T }>, options: CacheOptions = {}): Promise<number> {
    let count = 0;
    for (const { key, value } of entries) {
      if (await this.set(key, value, options)) {
        count++;
      }
    }
    return count;
  }

  async mdelete(keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) {
        count++;
      }
    }
    return count;
  }

  // Entry Information
  async getEntry(key: string): Promise<CacheEntry | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (new Date() > entry.expiresAt) {
      await this.delete(key);
      return undefined;
    }

    return { ...entry };
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async getSize(): Promise<number> {
    return this.cache.size;
  }

  // Utility
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
