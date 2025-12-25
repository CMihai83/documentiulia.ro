import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService, CacheTTL, CachePrefix, CacheOptions } from './redis-cache.service';

// Create a fresh mock Redis client for each test
const createMockRedisClient = () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  scan: jest.fn().mockResolvedValue({ cursor: 0, keys: [] }),
  sAdd: jest.fn().mockResolvedValue(1),
  sMembers: jest.fn().mockResolvedValue([]),
  expire: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(60),
  info: jest.fn().mockResolvedValue('used_memory_human:1M\nuptime_in_seconds:100'),
  dbSize: jest.fn().mockResolvedValue(0),
  flushAll: jest.fn().mockResolvedValue('OK'),
  flushDb: jest.fn().mockResolvedValue('OK'),
  on: jest.fn(),
});

let mockRedisClient: ReturnType<typeof createMockRedisClient>;

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  };

  beforeEach(async () => {
    // Create fresh mock client BEFORE creating module
    mockRedisClient = createMockRedisClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
    configService = module.get<ConfigService>(ConfigService);

    // Simulate successful connection by injecting the mock client
    (service as any).isConnected = true;
    (service as any).client = mockRedisClient;
    // Reset stats for each test
    (service as any).stats = { hits: 0, misses: 0 };
  });

  afterEach(async () => {
    // Don't actually destroy - the mock doesn't need cleanup
    (service as any).client = null;
  });

  describe('Connection Management', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should connect to Redis on module init', async () => {
      const newService = new RedisCacheService(configService);
      await newService.onModuleInit();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should report ready status correctly', () => {
      expect(service.isReady()).toBe(true);
    });

    it('should handle connection failure gracefully', async () => {
      const newService = new RedisCacheService(configService);
      mockRedisClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
      await newService.onModuleInit();
      expect(newService.isReady()).toBe(false);
    });

    it('should disconnect on module destroy', async () => {
      await service.onModuleDestroy();
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });
  });

  describe('Core Cache Operations', () => {
    describe('get', () => {
      it('should return cached data when key exists', async () => {
        const cachedEntry = {
          data: { id: 1, name: 'Test' },
          cachedAt: Date.now(),
          ttl: 300,
        };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));

        const result = await service.get('test-key');

        expect(result).toEqual({ id: 1, name: 'Test' });
        expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null when key does not exist', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await service.get('nonexistent-key');

        expect(result).toBeNull();
      });

      it('should return null when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.get('test-key');

        expect(result).toBeNull();
        expect(mockRedisClient.get).not.toHaveBeenCalled();
      });

      it('should track cache hits', async () => {
        const cachedEntry = { data: 'test', cachedAt: Date.now(), ttl: 300 };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));

        await service.get('test-key');
        const stats = await service.getStats();

        expect(stats.hits).toBeGreaterThan(0);
      });

      it('should track cache misses', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        await service.get('test-key');
        const stats = await service.getStats();

        expect(stats.misses).toBeGreaterThan(0);
      });

      it('should handle get errors gracefully', async () => {
        mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

        const result = await service.get('test-key');

        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('should store data with default TTL', async () => {
        const result = await service.set('test-key', { id: 1 });

        expect(result).toBe(true);
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'test-key',
          CacheTTL.MEDIUM,
          expect.any(String),
        );
      });

      it('should store data with custom TTL', async () => {
        const result = await service.set('test-key', { id: 1 }, { ttl: 600 });

        expect(result).toBe(true);
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'test-key',
          600,
          expect.any(String),
        );
      });

      it('should store data with tags', async () => {
        const result = await service.set('test-key', { id: 1 }, { tags: ['user:123', 'fleet:456'] });

        expect(result).toBe(true);
        expect(mockRedisClient.sAdd).toHaveBeenCalledWith('tag:user:123', 'test-key');
        expect(mockRedisClient.sAdd).toHaveBeenCalledWith('tag:fleet:456', 'test-key');
      });

      it('should return false when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.set('test-key', { id: 1 });

        expect(result).toBe(false);
      });

      it('should handle set errors gracefully', async () => {
        mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

        const result = await service.set('test-key', { id: 1 });

        expect(result).toBe(false);
      });
    });

    describe('delete', () => {
      it('should delete a key successfully', async () => {
        mockRedisClient.del.mockResolvedValue(1);

        const result = await service.delete('test-key');

        expect(result).toBe(true);
        expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
      });

      it('should return false when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.delete('test-key');

        expect(result).toBe(false);
      });

      it('should handle delete errors gracefully', async () => {
        mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

        const result = await service.delete('test-key');

        expect(result).toBe(false);
      });
    });

    describe('exists', () => {
      it('should return true when key exists', async () => {
        mockRedisClient.exists.mockResolvedValue(1);

        const result = await service.exists('test-key');

        expect(result).toBe(true);
      });

      it('should return false when key does not exist', async () => {
        mockRedisClient.exists.mockResolvedValue(0);

        const result = await service.exists('test-key');

        expect(result).toBe(false);
      });

      it('should return false when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.exists('test-key');

        expect(result).toBe(false);
      });
    });
  });

  describe('Pattern-Based Operations', () => {
    describe('deletePattern', () => {
      it('should delete all keys matching pattern', async () => {
        mockRedisClient.scan
          .mockResolvedValueOnce({ cursor: 5, keys: ['key1', 'key2'] })
          .mockResolvedValueOnce({ cursor: 0, keys: ['key3'] });

        const result = await service.deletePattern('user:*');

        expect(result).toBe(3);
        expect(mockRedisClient.del).toHaveBeenCalledWith(['key1', 'key2']);
        expect(mockRedisClient.del).toHaveBeenCalledWith(['key3']);
      });

      it('should return 0 when no keys match', async () => {
        mockRedisClient.scan.mockResolvedValue({ cursor: 0, keys: [] });

        const result = await service.deletePattern('nonexistent:*');

        expect(result).toBe(0);
      });

      it('should return 0 when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.deletePattern('user:*');

        expect(result).toBe(0);
      });
    });

    describe('getKeys', () => {
      it('should return all keys matching pattern', async () => {
        mockRedisClient.scan
          .mockResolvedValueOnce({ cursor: 5, keys: ['key1', 'key2'] })
          .mockResolvedValueOnce({ cursor: 0, keys: ['key3'] });

        const result = await service.getKeys('user:*');

        expect(result).toEqual(['key1', 'key2', 'key3']);
      });

      it('should return empty array when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.getKeys('user:*');

        expect(result).toEqual([]);
      });
    });
  });

  describe('Tag-Based Invalidation', () => {
    describe('invalidateTag', () => {
      it('should invalidate all keys with specific tag', async () => {
        mockRedisClient.sMembers.mockResolvedValue(['key1', 'key2', 'key3']);

        const result = await service.invalidateTag('user:123');

        expect(result).toBe(3);
        expect(mockRedisClient.del).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
        expect(mockRedisClient.del).toHaveBeenCalledWith('tag:user:123');
      });

      it('should return 0 when no keys have the tag', async () => {
        mockRedisClient.sMembers.mockResolvedValue([]);

        const result = await service.invalidateTag('nonexistent');

        expect(result).toBe(0);
      });

      it('should return 0 when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.invalidateTag('user:123');

        expect(result).toBe(0);
      });
    });

    describe('invalidateTags', () => {
      it('should invalidate multiple tags', async () => {
        mockRedisClient.sMembers
          .mockResolvedValueOnce(['key1', 'key2'])
          .mockResolvedValueOnce(['key3']);

        const result = await service.invalidateTags(['user:123', 'fleet:456']);

        expect(result).toBe(3);
      });
    });
  });

  describe('User Cache Operations', () => {
    const userId = 'user-123';

    describe('getUserCache', () => {
      it('should get user-scoped cache', async () => {
        const cachedEntry = { data: { name: 'John' }, cachedAt: Date.now(), ttl: 300 };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));

        const result = await service.getUserCache(userId, 'profile');

        expect(mockRedisClient.get).toHaveBeenCalledWith('user:user-123:profile');
        expect(result).toEqual({ name: 'John' });
      });
    });

    describe('setUserCache', () => {
      it('should set user-scoped cache with user tag', async () => {
        await service.setUserCache(userId, 'profile', { name: 'John' });

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'user:user-123:profile',
          expect.any(Number),
          expect.any(String),
        );
        expect(mockRedisClient.sAdd).toHaveBeenCalledWith('tag:user:user-123', 'user:user-123:profile');
      });
    });

    describe('invalidateUserCache', () => {
      it('should invalidate all user cache', async () => {
        mockRedisClient.sMembers.mockResolvedValue(['key1', 'key2']);

        const result = await service.invalidateUserCache(userId);

        expect(result).toBe(2);
      });
    });
  });

  describe('Fleet Cache Operations', () => {
    const userId = 'user-123';

    describe('getFleetCache', () => {
      it('should get fleet-scoped cache', async () => {
        const cachedEntry = { data: { vehicles: 10 }, cachedAt: Date.now(), ttl: 300 };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));

        const result = await service.getFleetCache(userId, 'summary');

        expect(mockRedisClient.get).toHaveBeenCalledWith('fleet:user-123:summary');
        expect(result).toEqual({ vehicles: 10 });
      });
    });

    describe('setFleetCache', () => {
      it('should set fleet-scoped cache with fleet tag', async () => {
        await service.setFleetCache(userId, 'summary', { vehicles: 10 });

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'fleet:user-123:summary',
          expect.any(Number),
          expect.any(String),
        );
        expect(mockRedisClient.sAdd).toHaveBeenCalledWith('tag:fleet:user-123', 'fleet:user-123:summary');
      });
    });

    describe('invalidateFleetCache', () => {
      it('should invalidate all fleet cache for user', async () => {
        mockRedisClient.sMembers.mockResolvedValue(['key1', 'key2', 'key3']);

        const result = await service.invalidateFleetCache(userId);

        expect(result).toBe(3);
      });
    });
  });

  describe('Analytics Cache Operations', () => {
    const userId = 'user-123';

    describe('getAnalyticsCache', () => {
      it('should get analytics cache', async () => {
        const cachedEntry = { data: { revenue: 50000 }, cachedAt: Date.now(), ttl: 300 };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));

        const result = await service.getAnalyticsCache(userId, 'monthly-revenue');

        expect(mockRedisClient.get).toHaveBeenCalledWith('analytics:user-123:monthly-revenue');
        expect(result).toEqual({ revenue: 50000 });
      });
    });

    describe('setAnalyticsCache', () => {
      it('should set analytics cache with analytics tag', async () => {
        await service.setAnalyticsCache(userId, 'monthly-revenue', { revenue: 50000 });

        expect(mockRedisClient.sAdd).toHaveBeenCalledWith(
          'tag:analytics:user-123',
          'analytics:user-123:monthly-revenue',
        );
      });
    });

    describe('invalidateAnalyticsCache', () => {
      it('should invalidate all analytics cache for user', async () => {
        mockRedisClient.sMembers.mockResolvedValue(['key1']);

        const result = await service.invalidateAnalyticsCache(userId);

        expect(result).toBe(1);
      });
    });
  });

  describe('Dashboard Cache Operations', () => {
    const userId = 'user-123';

    describe('getDashboardCache', () => {
      it('should get dashboard widget cache', async () => {
        const cachedEntry = { data: { kpis: [1, 2, 3] }, cachedAt: Date.now(), ttl: 300 };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));

        const result = await service.getDashboardCache(userId, 'kpi-widget');

        expect(mockRedisClient.get).toHaveBeenCalledWith('dashboard:user-123:kpi-widget');
        expect(result).toEqual({ kpis: [1, 2, 3] });
      });
    });

    describe('setDashboardCache', () => {
      it('should set dashboard cache with dashboard tag', async () => {
        await service.setDashboardCache(userId, 'kpi-widget', { kpis: [1, 2, 3] });

        expect(mockRedisClient.sAdd).toHaveBeenCalledWith(
          'tag:dashboard:user-123',
          'dashboard:user-123:kpi-widget',
        );
      });
    });

    describe('invalidateDashboardCache', () => {
      it('should invalidate all dashboard cache for user', async () => {
        mockRedisClient.sMembers.mockResolvedValue(['key1', 'key2']);

        const result = await service.invalidateDashboardCache(userId);

        expect(result).toBe(2);
      });
    });
  });

  describe('Rate Limiting', () => {
    describe('checkRateLimit', () => {
      it('should allow requests under the limit', async () => {
        mockRedisClient.incr.mockResolvedValue(5);
        mockRedisClient.ttl.mockResolvedValue(55);

        const result = await service.checkRateLimit('api:user:123', 100, 60);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(95);
        expect(result.resetIn).toBe(55);
      });

      it('should deny requests over the limit', async () => {
        mockRedisClient.incr.mockResolvedValue(101);
        mockRedisClient.ttl.mockResolvedValue(30);

        const result = await service.checkRateLimit('api:user:123', 100, 60);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
      });

      it('should set expiry on first request', async () => {
        mockRedisClient.incr.mockResolvedValue(1);
        mockRedisClient.ttl.mockResolvedValue(60);

        await service.checkRateLimit('api:user:123', 100, 60);

        expect(mockRedisClient.expire).toHaveBeenCalledWith('ratelimit:api:user:123', 60);
      });

      it('should allow all requests when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.checkRateLimit('api:user:123', 100, 60);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(100);
      });
    });
  });

  describe('Cache Statistics', () => {
    describe('getStats', () => {
      it('should return cache statistics', async () => {
        mockRedisClient.info.mockResolvedValue('used_memory_human:1.5M\n');
        mockRedisClient.dbSize.mockResolvedValue(150);

        // Generate some hits and misses
        const cachedEntry = { data: 'test', cachedAt: Date.now(), ttl: 300 };
        mockRedisClient.get
          .mockResolvedValueOnce(JSON.stringify(cachedEntry))
          .mockResolvedValueOnce(null);

        await service.get('hit-key');
        await service.get('miss-key');

        const stats = await service.getStats();

        expect(stats).toMatchObject({
          hits: expect.any(Number),
          misses: expect.any(Number),
          hitRate: expect.any(Number),
          keys: 150,
          memoryUsage: '1.5M',
          connected: true,
        });
      });

      it('should return default stats when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const stats = await service.getStats();

        expect(stats.connected).toBe(false);
        expect(stats.keys).toBe(0);
      });
    });

    describe('resetStats', () => {
      it('should reset hit and miss counters', async () => {
        // Generate some hits
        const cachedEntry = { data: 'test', cachedAt: Date.now(), ttl: 300 };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedEntry));
        await service.get('key1');
        await service.get('key2');

        service.resetStats();
        const stats = await service.getStats();

        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
      });
    });
  });

  describe('Cache Warming', () => {
    describe('warmCache', () => {
      it('should warm cache with multiple entries', async () => {
        const entries = [
          { key: 'key1', value: { id: 1 }, options: { ttl: 300 } },
          { key: 'key2', value: { id: 2 }, options: { ttl: 600 } },
          { key: 'key3', value: { id: 3 } },
        ];

        const result = await service.warmCache(entries);

        expect(result).toBe(3);
        expect(mockRedisClient.setEx).toHaveBeenCalledTimes(3);
      });

      it('should return count of successfully warmed entries', async () => {
        mockRedisClient.setEx
          .mockResolvedValueOnce('OK')
          .mockRejectedValueOnce(new Error('Redis error'))
          .mockResolvedValueOnce('OK');

        const entries = [
          { key: 'key1', value: { id: 1 } },
          { key: 'key2', value: { id: 2 } },
          { key: 'key3', value: { id: 3 } },
        ];

        const result = await service.warmCache(entries);

        expect(result).toBe(2);
      });
    });
  });

  describe('Flush Operations', () => {
    describe('flushAll', () => {
      it('should flush all Redis databases', async () => {
        const result = await service.flushAll();

        expect(result).toBe(true);
        expect(mockRedisClient.flushAll).toHaveBeenCalled();
      });

      it('should reset stats after flush', async () => {
        await service.flushAll();
        const stats = await service.getStats();

        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
      });

      it('should return false when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.flushAll();

        expect(result).toBe(false);
      });
    });

    describe('flushDb', () => {
      it('should flush current database', async () => {
        const result = await service.flushDb();

        expect(result).toBe(true);
        expect(mockRedisClient.flushDb).toHaveBeenCalled();
      });

      it('should return false when Redis is not ready', async () => {
        (service as any).isConnected = false;

        const result = await service.flushDb();

        expect(result).toBe(false);
      });
    });
  });

  describe('Constants', () => {
    it('should have correct TTL values', () => {
      expect(CacheTTL.SHORT).toBe(60);
      expect(CacheTTL.MEDIUM).toBe(300);
      expect(CacheTTL.LONG).toBe(900);
      expect(CacheTTL.HOUR).toBe(3600);
      expect(CacheTTL.DAY).toBe(86400);
      expect(CacheTTL.WEEK).toBe(604800);
    });

    it('should have correct cache prefixes', () => {
      expect(CachePrefix.USER).toBe('user:');
      expect(CachePrefix.FLEET).toBe('fleet:');
      expect(CachePrefix.VEHICLE).toBe('vehicle:');
      expect(CachePrefix.ROUTE).toBe('route:');
      expect(CachePrefix.INVOICE).toBe('invoice:');
      expect(CachePrefix.ANALYTICS).toBe('analytics:');
      expect(CachePrefix.DASHBOARD).toBe('dashboard:');
      expect(CachePrefix.CONFIG).toBe('config:');
      expect(CachePrefix.SESSION).toBe('session:');
      expect(CachePrefix.RATE_LIMIT).toBe('ratelimit:');
    });
  });
});
