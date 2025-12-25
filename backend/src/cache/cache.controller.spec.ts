import { Test, TestingModule } from '@nestjs/testing';
import { CacheController } from './cache.controller';
import { RedisCacheService, CacheStats } from './redis-cache.service';

describe('CacheController', () => {
  let controller: CacheController;
  let cacheService: RedisCacheService;

  const mockCacheService = {
    getStats: jest.fn(),
    isReady: jest.fn(),
    getKeys: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    deletePattern: jest.fn(),
    invalidateTag: jest.fn(),
    invalidateUserCache: jest.fn(),
    invalidateFleetCache: jest.fn(),
    invalidateDashboardCache: jest.fn(),
    invalidateAnalyticsCache: jest.fn(),
    flushDb: jest.fn(),
    resetStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [
        { provide: RedisCacheService, useValue: mockCacheService },
      ],
    }).compile();

    controller = module.get<CacheController>(CacheController);
    cacheService = module.get<RedisCacheService>(RedisCacheService);
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockStats: CacheStats = {
        hits: 1000,
        misses: 200,
        hitRate: 83.33,
        keys: 500,
        memoryUsage: '10.5M',
        uptime: 86400,
        connected: true,
      };
      mockCacheService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(mockCacheService.getStats).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when Redis is connected', async () => {
      mockCacheService.isReady.mockReturnValue(true);

      const result = await controller.getHealth();

      expect(result).toEqual({
        status: 'healthy',
        connected: true,
        message: 'Redis cache is operational',
      });
    });

    it('should return degraded status when Redis is disconnected', async () => {
      mockCacheService.isReady.mockReturnValue(false);

      const result = await controller.getHealth();

      expect(result).toEqual({
        status: 'degraded',
        connected: false,
        message: 'Redis cache is unavailable - falling back to database',
      });
    });
  });

  describe('getKeys', () => {
    it('should return keys matching default pattern', async () => {
      mockCacheService.getKeys.mockResolvedValue(['key1', 'key2', 'key3']);

      const result = await controller.getKeys();

      expect(result).toEqual({
        keys: ['key1', 'key2', 'key3'],
        count: 3,
        pattern: '*',
      });
      expect(mockCacheService.getKeys).toHaveBeenCalledWith('*');
    });

    it('should return keys matching custom pattern', async () => {
      mockCacheService.getKeys.mockResolvedValue(['user:1', 'user:2']);

      const result = await controller.getKeys('user:*');

      expect(result).toEqual({
        keys: ['user:1', 'user:2'],
        count: 2,
        pattern: 'user:*',
      });
      expect(mockCacheService.getKeys).toHaveBeenCalledWith('user:*');
    });

    it('should limit returned keys', async () => {
      const manyKeys = Array.from({ length: 150 }, (_, i) => `key${i}`);
      mockCacheService.getKeys.mockResolvedValue(manyKeys);

      const result = await controller.getKeys('*', '50');

      expect(result.keys.length).toBe(50);
      expect(result.count).toBe(150);
    });

    it('should use default limit of 100', async () => {
      const manyKeys = Array.from({ length: 150 }, (_, i) => `key${i}`);
      mockCacheService.getKeys.mockResolvedValue(manyKeys);

      const result = await controller.getKeys();

      expect(result.keys.length).toBe(100);
    });
  });

  describe('getKey', () => {
    it('should return value when key exists', async () => {
      mockCacheService.get.mockResolvedValue({ id: 1, name: 'Test' });

      const result = await controller.getKey('test-key');

      expect(result).toEqual({
        key: 'test-key',
        value: { id: 1, name: 'Test' },
        exists: true,
      });
    });

    it('should return null value when key does not exist', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await controller.getKey('nonexistent-key');

      expect(result).toEqual({
        key: 'nonexistent-key',
        value: null,
        exists: false,
      });
    });
  });

  describe('deleteKey', () => {
    it('should delete a specific key', async () => {
      mockCacheService.delete.mockResolvedValue(true);

      const result = await controller.deleteKey('test-key');

      expect(result).toEqual({
        deleted: true,
        key: 'test-key',
      });
      expect(mockCacheService.delete).toHaveBeenCalledWith('test-key');
    });

    it('should return false when key does not exist', async () => {
      mockCacheService.delete.mockResolvedValue(false);

      const result = await controller.deleteKey('nonexistent-key');

      expect(result).toEqual({
        deleted: false,
        key: 'nonexistent-key',
      });
    });
  });

  describe('deletePattern', () => {
    it('should delete all keys matching pattern', async () => {
      mockCacheService.deletePattern.mockResolvedValue(15);

      const result = await controller.deletePattern('user:*');

      expect(result).toEqual({
        deletedCount: 15,
        pattern: 'user:*',
      });
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('user:*');
    });

    it('should return 0 when no keys match', async () => {
      mockCacheService.deletePattern.mockResolvedValue(0);

      const result = await controller.deletePattern('nonexistent:*');

      expect(result).toEqual({
        deletedCount: 0,
        pattern: 'nonexistent:*',
      });
    });
  });

  describe('invalidateTag', () => {
    it('should invalidate all entries with specific tag', async () => {
      mockCacheService.invalidateTag.mockResolvedValue(10);

      const result = await controller.invalidateTag('fleet');

      expect(result).toEqual({
        invalidatedCount: 10,
        tag: 'fleet',
      });
      expect(mockCacheService.invalidateTag).toHaveBeenCalledWith('fleet');
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate all cache for specific user', async () => {
      mockCacheService.invalidateUserCache.mockResolvedValue(25);

      const result = await controller.invalidateUserCache('user-123');

      expect(result).toEqual({
        invalidatedCount: 25,
        userId: 'user-123',
      });
      expect(mockCacheService.invalidateUserCache).toHaveBeenCalledWith('user-123');
    });
  });

  describe('invalidateFleetCache', () => {
    it('should invalidate fleet cache for specific user', async () => {
      mockCacheService.invalidateFleetCache.mockResolvedValue(8);

      const result = await controller.invalidateFleetCache('user-123');

      expect(result).toEqual({
        invalidatedCount: 8,
        userId: 'user-123',
      });
      expect(mockCacheService.invalidateFleetCache).toHaveBeenCalledWith('user-123');
    });
  });

  describe('invalidateDashboardCache', () => {
    it('should invalidate dashboard cache for specific user', async () => {
      mockCacheService.invalidateDashboardCache.mockResolvedValue(5);

      const result = await controller.invalidateDashboardCache('user-123');

      expect(result).toEqual({
        invalidatedCount: 5,
        userId: 'user-123',
      });
      expect(mockCacheService.invalidateDashboardCache).toHaveBeenCalledWith('user-123');
    });
  });

  describe('invalidateAnalyticsCache', () => {
    it('should invalidate analytics cache for specific user', async () => {
      mockCacheService.invalidateAnalyticsCache.mockResolvedValue(12);

      const result = await controller.invalidateAnalyticsCache('user-123');

      expect(result).toEqual({
        invalidatedCount: 12,
        userId: 'user-123',
      });
      expect(mockCacheService.invalidateAnalyticsCache).toHaveBeenCalledWith('user-123');
    });
  });

  describe('flushDb', () => {
    it('should flush the current database', async () => {
      mockCacheService.flushDb.mockResolvedValue(true);

      const result = await controller.flushDb();

      expect(result).toEqual({
        flushed: true,
        warning: 'All cache entries in current database have been deleted',
      });
      expect(mockCacheService.flushDb).toHaveBeenCalled();
    });

    it('should return false when flush fails', async () => {
      mockCacheService.flushDb.mockResolvedValue(false);

      const result = await controller.flushDb();

      expect(result).toEqual({
        flushed: false,
        warning: 'All cache entries in current database have been deleted',
      });
    });
  });

  describe('resetStats', () => {
    it('should reset cache statistics', () => {
      const result = controller.resetStats();

      expect(result).toEqual({
        reset: true,
        message: 'Cache statistics counters have been reset',
      });
      expect(mockCacheService.resetStats).toHaveBeenCalled();
    });
  });
});
