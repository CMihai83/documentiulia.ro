import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CachingService,
  CacheConfig,
  CacheOptions,
  CachePattern,
  RateLimitConfig,
} from './caching.service';

describe('CachingService', () => {
  let service: CachingService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CachingService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<CachingService>(CachingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await service.clear();
    service.onModuleDestroy();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get value', async () => {
      await service.set('test-key', 'test-value');
      const value = await service.get('test-key');

      expect(value).toBe('test-value');
    });

    it('should return undefined for non-existent key', async () => {
      const value = await service.get('non-existent');
      expect(value).toBeUndefined();
    });

    it('should check key existence', async () => {
      await service.set('exists', 'value');

      expect(await service.has('exists')).toBe(true);
      expect(await service.has('not-exists')).toBe(false);
    });

    it('should delete key', async () => {
      await service.set('to-delete', 'value');
      const deleted = await service.delete('to-delete');

      expect(deleted).toBe(true);
      expect(await service.has('to-delete')).toBe(false);
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await service.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should clear all entries', async () => {
      await service.set('key1', 'value1');
      await service.set('key2', 'value2');

      const count = await service.clear();

      expect(count).toBe(2);
      expect(await service.getSize()).toBe(0);
    });

    it('should cache complex objects', async () => {
      const obj = {
        id: 1,
        name: 'Test',
        nested: { value: 123 },
      };

      await service.set('object', obj);
      const retrieved = await service.get<typeof obj>('object');

      expect(retrieved).toEqual(obj);
    });

    it('should cache arrays', async () => {
      const arr = [1, 2, 3, 'test', { key: 'value' }];

      await service.set('array', arr);
      const retrieved = await service.get<typeof arr>('array');

      expect(retrieved).toEqual(arr);
    });
  });

  describe('TTL Management', () => {
    it('should expire entries after TTL', async () => {
      await service.set('short-lived', 'value', { ttl: 50 });

      expect(await service.has('short-lived')).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(await service.has('short-lived')).toBe(false);
    });

    it('should update TTL', async () => {
      await service.set('ttl-key', 'value', { ttl: 100 });
      await service.setTtl('ttl-key', 10000);

      const ttl = await service.getTtl('ttl-key');
      expect(ttl).toBeGreaterThan(5000);
    });

    it('should return undefined TTL for non-existent key', async () => {
      const ttl = await service.getTtl('non-existent');
      expect(ttl).toBeUndefined();
    });

    it('should touch entry to reset TTL', async () => {
      await service.set('touch-key', 'value', { ttl: 1000 });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const touched = await service.touch('touch-key');
      expect(touched).toBe(true);

      const ttl = await service.getTtl('touch-key');
      expect(ttl).toBeGreaterThan(900);
    });

    it('should return false when touching non-existent key', async () => {
      const touched = await service.touch('non-existent');
      expect(touched).toBe(false);
    });
  });

  describe('GetOrSet Pattern', () => {
    it('should return cached value if exists', async () => {
      await service.set('existing', 'cached-value');

      const factory = jest.fn().mockResolvedValue('factory-value');
      const value = await service.getOrSet('existing', factory);

      expect(value).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const factory = jest.fn().mockResolvedValue('factory-value');
      const value = await service.getOrSet('new-key', factory);

      expect(value).toBe('factory-value');
      expect(factory).toHaveBeenCalled();
      expect(await service.get('new-key')).toBe('factory-value');
    });
  });

  describe('Tag-based Operations', () => {
    it('should set entries with tags', async () => {
      await service.set('tagged-1', 'value1', { tags: ['category-a'] });
      await service.set('tagged-2', 'value2', { tags: ['category-a', 'category-b'] });
      await service.set('tagged-3', 'value3', { tags: ['category-b'] });

      const entriesA = await service.getByTag('category-a');
      expect(entriesA).toHaveLength(2);
    });

    it('should invalidate by single tag', async () => {
      await service.set('tag-1', 'value1', { tags: ['remove-me'] });
      await service.set('tag-2', 'value2', { tags: ['remove-me'] });
      await service.set('tag-3', 'value3', { tags: ['keep-me'] });

      const count = await service.invalidateByTag('remove-me');

      expect(count).toBe(2);
      expect(await service.has('tag-1')).toBe(false);
      expect(await service.has('tag-2')).toBe(false);
      expect(await service.has('tag-3')).toBe(true);
    });

    it('should invalidate by multiple tags', async () => {
      await service.set('multi-1', 'value1', { tags: ['tag-a'] });
      await service.set('multi-2', 'value2', { tags: ['tag-b'] });
      await service.set('multi-3', 'value3', { tags: ['tag-c'] });

      const count = await service.invalidateByTags(['tag-a', 'tag-b']);

      expect(count).toBe(2);
      expect(await service.has('multi-3')).toBe(true);
    });
  });

  describe('Pattern-based Operations', () => {
    it('should invalidate by pattern', async () => {
      await service.set('user:1:profile', 'profile1');
      await service.set('user:2:profile', 'profile2');
      await service.set('user:1:settings', 'settings1');
      await service.set('product:1:details', 'product1');

      const count = await service.invalidateByPattern('user:*:profile');

      expect(count).toBe(2);
      expect(await service.has('user:1:settings')).toBe(true);
      expect(await service.has('product:1:details')).toBe(true);
    });

    it('should get keys by pattern', async () => {
      await service.set('api:v1:users', 'data');
      await service.set('api:v1:products', 'data');
      await service.set('api:v2:users', 'data');

      const keys = await service.getKeysByPattern('api:v1:*');

      expect(keys).toHaveLength(2);
      expect(keys).toContain('api:v1:users');
      expect(keys).toContain('api:v1:products');
    });
  });

  describe('Cache Patterns Management', () => {
    it('should initialize with default patterns', async () => {
      const patterns = await service.listPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should have VAT Rates Cache pattern', async () => {
      const pattern = await service.getPatternByName('VAT Rates Cache');
      expect(pattern).toBeDefined();
      expect(pattern!.nameRo).toBe('Cache Rate TVA');
    });

    it('should have Customer Cache pattern', async () => {
      const pattern = await service.getPatternByName('Customer Cache');
      expect(pattern).toBeDefined();
      expect(pattern!.nameRo).toBe('Cache Clienți');
    });

    it('should have ANAF API Response Cache pattern', async () => {
      const pattern = await service.getPatternByName('ANAF API Response Cache');
      expect(pattern).toBeDefined();
      expect(pattern!.nameRo).toBe('Cache Răspunsuri ANAF API');
      expect(pattern!.tags).toContain('anaf');
    });

    it('should create custom pattern', async () => {
      const pattern = await service.createPattern({
        name: 'Custom Pattern',
        nameRo: 'Model Personalizat',
        description: 'A custom cache pattern',
        descriptionRo: 'Un model de cache personalizat',
        keyPattern: 'custom:*',
        ttl: 60000,
        tags: ['custom'],
      });

      expect(pattern.id).toBeDefined();
      expect(pattern.name).toBe('Custom Pattern');
    });

    it('should delete pattern', async () => {
      const pattern = await service.createPattern({
        name: 'To Delete',
        nameRo: 'De Șters',
        description: 'Pattern to delete',
        descriptionRo: 'Model de șters',
        keyPattern: 'delete:*',
        ttl: 1000,
        tags: [],
      });

      const deleted = await service.deletePattern(pattern.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getPattern(pattern.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with data', async () => {
      const patterns = await service.listPatterns();
      const pattern = patterns[0];

      const data = [
        { key: 'warm:1', value: 'value1' },
        { key: 'warm:2', value: 'value2' },
        { key: 'warm:3', value: 'value3' },
      ];

      const task = await service.warmup(pattern.id, data);

      expect(task.status).toBe('COMPLETED');
      expect(task.entriesWarmed).toBe(3);
      expect(await service.get('warm:1')).toBe('value1');
    });

    it('should throw error for invalid pattern', async () => {
      await expect(service.warmup('invalid-id', [])).rejects.toThrow('Pattern not found');
    });

    it('should get warmup task', async () => {
      const patterns = await service.listPatterns();
      const task = await service.warmup(patterns[0].id, [{ key: 'test', value: 'value' }]);

      const retrieved = await service.getWarmupTask(task.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(task.id);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const config: RateLimitConfig = {
        key: 'api:user:1',
        maxRequests: 3,
        windowMs: 10000,
      };

      const result1 = await service.checkRateLimit(config);
      const result2 = await service.checkRateLimit(config);
      const result3 = await service.checkRateLimit(config);

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should deny requests over limit', async () => {
      const config: RateLimitConfig = {
        key: 'api:user:2',
        maxRequests: 2,
        windowMs: 10000,
      };

      await service.checkRateLimit(config);
      await service.checkRateLimit(config);
      const result = await service.checkRateLimit(config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should block after exceeding limit with block duration', async () => {
      const config: RateLimitConfig = {
        key: 'api:user:3',
        maxRequests: 1,
        windowMs: 10000,
        blockDurationMs: 5000,
      };

      await service.checkRateLimit(config);
      const exceeded = await service.checkRateLimit(config);

      expect(exceeded.allowed).toBe(false);
      expect(exceeded.blocked).toBe(true);
      expect(exceeded.blockedUntil).toBeDefined();
    });

    it('should reset rate limit', async () => {
      const config: RateLimitConfig = {
        key: 'api:user:4',
        maxRequests: 1,
        windowMs: 10000,
      };

      await service.checkRateLimit(config);
      await service.checkRateLimit(config);

      await service.resetRateLimit(config.key);
      const result = await service.checkRateLimit(config);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      await service.set('stat-key', 'value');
      await service.get('stat-key');
      await service.get('stat-key');
      await service.get('non-existent');

      const stats = service.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate', async () => {
      await service.set('hit-rate', 'value');
      await service.get('hit-rate');
      await service.get('hit-rate');
      await service.get('miss');

      const stats = service.getStats();
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('should track memory usage', async () => {
      await service.set('mem-1', 'some value here');
      await service.set('mem-2', { nested: { data: 'more data' } });

      const stats = service.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should track entries by tag', async () => {
      await service.set('tagged-stat-1', 'v1', { tags: ['stat-tag'] });
      await service.set('tagged-stat-2', 'v2', { tags: ['stat-tag'] });
      await service.get('tagged-stat-1');

      const stats = service.getStats();
      expect(stats.byTag['stat-tag']).toBeDefined();
      expect(stats.byTag['stat-tag'].entries).toBe(2);
      expect(stats.byTag['stat-tag'].hits).toBe(1);
    });

    it('should track evictions', async () => {
      service.configure({ maxEntries: 2 });

      await service.set('evict-1', 'v1');
      await service.set('evict-2', 'v2');
      await service.set('evict-3', 'v3');

      const stats = service.getStats();
      expect(stats.evictions).toBeGreaterThanOrEqual(1);
    });

    it('should track invalidations', async () => {
      await service.set('invalidate-me', 'value');
      await service.delete('invalidate-me');

      const stats = service.getStats();
      expect(stats.invalidations).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should get default config', () => {
      const config = service.getConfig();

      expect(config.defaultTtl).toBe(3600000);
      expect(config.strategy).toBe('LRU');
      expect(config.layers).toContain('MEMORY');
    });

    it('should update config', () => {
      service.configure({ defaultTtl: 7200000, strategy: 'LFU' });
      const config = service.getConfig();

      expect(config.defaultTtl).toBe(7200000);
      expect(config.strategy).toBe('LFU');
    });

    it('should emit event on config change', () => {
      service.configure({ enableStats: false });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache.configured', expect.any(Object));
    });
  });

  describe('Eviction Strategies', () => {
    it('should evict LRU entry', async () => {
      service.configure({ maxEntries: 3, strategy: 'LRU' });

      await service.set('lru-1', 'v1');
      await new Promise((r) => setTimeout(r, 10));
      await service.set('lru-2', 'v2');
      await new Promise((r) => setTimeout(r, 10));
      await service.set('lru-3', 'v3');

      // Access lru-1 to make it more recent
      await service.get('lru-1');
      await new Promise((r) => setTimeout(r, 10));

      // Add new entry, should evict lru-2 (least recently accessed)
      await service.set('lru-4', 'v4');

      expect(await service.has('lru-1')).toBe(true);
      expect(await service.has('lru-2')).toBe(false);
    });

    it('should evict LFU entry', async () => {
      service.configure({ maxEntries: 3, strategy: 'LFU' });

      await service.set('lfu-1', 'v1');
      await service.set('lfu-2', 'v2');
      await service.set('lfu-3', 'v3');

      // Access lfu-1 multiple times
      await service.get('lfu-1');
      await service.get('lfu-1');
      await service.get('lfu-3');

      // lfu-2 has 0 accesses, should be evicted
      await service.set('lfu-4', 'v4');

      expect(await service.has('lfu-1')).toBe(true);
      expect(await service.has('lfu-2')).toBe(false);
    });

    it('should evict FIFO entry', async () => {
      service.configure({ maxEntries: 3, strategy: 'FIFO' });

      await service.set('fifo-1', 'v1');
      await new Promise((r) => setTimeout(r, 10));
      await service.set('fifo-2', 'v2');
      await new Promise((r) => setTimeout(r, 10));
      await service.set('fifo-3', 'v3');

      // fifo-1 was created first, should be evicted
      await service.set('fifo-4', 'v4');

      expect(await service.has('fifo-1')).toBe(false);
      expect(await service.has('fifo-2')).toBe(true);
    });

    it('should evict TTL entry (soonest expiring)', async () => {
      service.configure({ maxEntries: 3, strategy: 'TTL' });

      await service.set('ttl-1', 'v1', { ttl: 5000 });
      await service.set('ttl-2', 'v2', { ttl: 100 }); // Shortest TTL
      await service.set('ttl-3', 'v3', { ttl: 3000 });

      // ttl-2 expires soonest, should be evicted
      await service.set('ttl-4', 'v4');

      expect(await service.has('ttl-1')).toBe(true);
      expect(await service.has('ttl-2')).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', async () => {
      await service.set('batch-1', 'value1');
      await service.set('batch-2', 'value2');
      await service.set('batch-3', 'value3');

      const results = await service.mget(['batch-1', 'batch-2', 'batch-missing']);

      expect(results.get('batch-1')).toBe('value1');
      expect(results.get('batch-2')).toBe('value2');
      expect(results.get('batch-missing')).toBeUndefined();
    });

    it('should set multiple values', async () => {
      const entries = [
        { key: 'mset-1', value: 'v1' },
        { key: 'mset-2', value: 'v2' },
        { key: 'mset-3', value: 'v3' },
      ];

      const count = await service.mset(entries);

      expect(count).toBe(3);
      expect(await service.get('mset-1')).toBe('v1');
    });

    it('should delete multiple values', async () => {
      await service.set('mdel-1', 'v1');
      await service.set('mdel-2', 'v2');
      await service.set('mdel-3', 'v3');

      const count = await service.mdelete(['mdel-1', 'mdel-2']);

      expect(count).toBe(2);
      expect(await service.has('mdel-3')).toBe(true);
    });
  });

  describe('Entry Information', () => {
    it('should get entry details', async () => {
      await service.set('entry-info', 'value', { tags: ['info-tag'], ttl: 5000 });
      const entry = await service.getEntry('entry-info');

      expect(entry).toBeDefined();
      expect(entry!.key).toBe('entry-info');
      expect(entry!.value).toBe('value');
      expect(entry!.tags).toContain('info-tag');
      expect(entry!.ttl).toBe(5000);
    });

    it('should return undefined for non-existent entry', async () => {
      const entry = await service.getEntry('non-existent');
      expect(entry).toBeUndefined();
    });

    it('should get all keys', async () => {
      await service.set('key-a', 'a');
      await service.set('key-b', 'b');

      const keys = await service.getAllKeys();

      expect(keys).toContain('key-a');
      expect(keys).toContain('key-b');
    });

    it('should get cache size', async () => {
      await service.set('size-1', 'v1');
      await service.set('size-2', 'v2');

      const size = await service.getSize();
      expect(size).toBe(2);
    });
  });

  describe('Events', () => {
    it('should emit set event', async () => {
      await service.set('event-key', 'value', { tags: ['event-tag'] });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache.set', expect.objectContaining({
        key: 'event-key',
        tags: ['event-tag'],
      }));
    });

    it('should emit hit event', async () => {
      await service.set('hit-event', 'value');
      jest.clearAllMocks();
      await service.get('hit-event');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache.hit', expect.objectContaining({
        key: 'hit-event',
      }));
    });

    it('should emit deleted event', async () => {
      await service.set('delete-event', 'value');
      jest.clearAllMocks();
      await service.delete('delete-event');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache.deleted', expect.objectContaining({
        key: 'delete-event',
      }));
    });

    it('should emit cleared event', async () => {
      await service.set('clear-1', 'v1');
      await service.set('clear-2', 'v2');
      jest.clearAllMocks();
      await service.clear();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache.cleared', expect.objectContaining({
        entriesCleared: 2,
      }));
    });

    it('should emit rate limit exceeded event', async () => {
      const config: RateLimitConfig = {
        key: 'rate-event',
        maxRequests: 1,
        windowMs: 10000,
      };

      await service.checkRateLimit(config);
      jest.clearAllMocks();
      await service.checkRateLimit(config);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('cache.ratelimit.exceeded', expect.any(Object));
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian pattern names', async () => {
      const patterns = await service.listPatterns();

      for (const pattern of patterns) {
        expect(pattern.nameRo).toBeDefined();
        expect(pattern.nameRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian pattern descriptions', async () => {
      const patterns = await service.listPatterns();

      for (const pattern of patterns) {
        expect(pattern.descriptionRo).toBeDefined();
        expect(pattern.descriptionRo.length).toBeGreaterThan(0);
      }
    });

    it('should have Romanian diacritics in descriptions', async () => {
      const pattern = await service.getPatternByName('Customer Cache');
      expect(pattern!.descriptionRo).toMatch(/[ăîâșțĂÎÂȘȚ]/);
    });

    it('should have Exchange Rates Cache with BNR reference', async () => {
      const pattern = await service.getPatternByName('Exchange Rates Cache');
      expect(pattern).toBeDefined();
      expect(pattern!.descriptionRo).toContain('BNR');
      expect(pattern!.tags).toContain('bnr');
    });

    it('should have Session Cache pattern', async () => {
      const pattern = await service.getPatternByName('Session Cache');
      expect(pattern).toBeDefined();
      expect(pattern!.nameRo).toBe('Cache Sesiuni');
    });
  });

  describe('Memory Management', () => {
    it('should evict entries when memory limit exceeded', async () => {
      service.configure({ maxMemorySize: 100 }); // 100 bytes

      // This should trigger eviction
      await service.set('large-1', 'x'.repeat(30));
      await service.set('large-2', 'x'.repeat(30));
      await service.set('large-3', 'x'.repeat(30));
      await service.set('large-4', 'x'.repeat(30));

      const stats = service.getStats();
      expect(stats.memoryUsage).toBeLessThanOrEqual(100);
    });

    it('should track size per entry', async () => {
      await service.set('sized-entry', { data: 'test data for size calculation' });
      const entry = await service.getEntry('sized-entry');

      expect(entry!.size).toBeGreaterThan(0);
    });
  });
});
