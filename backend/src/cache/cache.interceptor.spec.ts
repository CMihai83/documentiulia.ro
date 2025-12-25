import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import {
  CacheInterceptor,
  CacheInvalidationInterceptor,
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_TAGS_METADATA,
  CACHE_SKIP_METADATA,
  CACHE_USER_SCOPED_METADATA,
  CacheKey,
  CacheTTLDecorator,
  CacheTags,
  SkipCache,
  UserScopedCache,
  Cacheable,
  InvalidateCache,
} from './cache.interceptor';
import { RedisCacheService, CacheTTL } from './redis-cache.service';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let cacheService: RedisCacheService;
  let reflector: Reflector;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(true),
    invalidateTags: jest.fn().mockResolvedValue(1),
    invalidateTag: jest.fn().mockResolvedValue(1),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  const createMockExecutionContext = (
    method: string = 'GET',
    url: string = '/api/test',
    query: Record<string, any> = {},
    user: any = null,
  ): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        url,
        query,
        user,
        params: { id: '123' },
      }),
      getResponse: () => ({}),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  }) as unknown as ExecutionContext;

  const createMockCallHandler = (response: any = { data: 'test' }): CallHandler => ({
    handle: () => of(response),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInterceptor,
        { provide: RedisCacheService, useValue: mockCacheService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    interceptor = module.get<CacheInterceptor>(CacheInterceptor);
    cacheService = module.get<RedisCacheService>(RedisCacheService);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('GET Requests', () => {
    it('should return cached response when available', async () => {
      const cachedData = { id: 1, name: 'Cached' };
      mockCacheService.get.mockResolvedValue(cachedData);
      mockReflector.get.mockReturnValue(undefined);

      const context = createMockExecutionContext('GET', '/api/test');
      const handler = createMockCallHandler();

      const result = await interceptor.intercept(context, handler);
      const response = await result.toPromise();

      expect(response).toEqual(cachedData);
      expect(mockCacheService.get).toHaveBeenCalled();
    });

    it('should cache response when not in cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockReturnValue(undefined);

      const context = createMockExecutionContext('GET', '/api/test');
      const handler = createMockCallHandler({ id: 1, name: 'New' });

      const result = await interceptor.intercept(context, handler);
      await result.toPromise();

      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should use custom cache key from decorator', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockImplementation((key: string) => {
        if (key === CACHE_KEY_METADATA) return 'custom-key';
        return undefined;
      });

      const context = createMockExecutionContext('GET', '/api/test');
      const handler = createMockCallHandler();

      await interceptor.intercept(context, handler);

      expect(mockCacheService.get).toHaveBeenCalledWith('api:custom-key');
    });

    it('should use custom TTL from decorator', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockImplementation((key: string) => {
        if (key === CACHE_TTL_METADATA) return 600;
        return undefined;
      });

      const context = createMockExecutionContext('GET', '/api/test');
      const handler = createMockCallHandler({ data: 'test' });

      const result = await interceptor.intercept(context, handler);
      await result.toPromise();

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        { data: 'test' },
        expect.objectContaining({ ttl: 600 }),
      );
    });

    it('should use tags from decorator', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockImplementation((key: string) => {
        if (key === CACHE_TAGS_METADATA) return ['fleet', 'vehicles'];
        return undefined;
      });

      const context = createMockExecutionContext('GET', '/api/test');
      const handler = createMockCallHandler({ data: 'test' });

      const result = await interceptor.intercept(context, handler);
      await result.toPromise();

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        { data: 'test' },
        expect.objectContaining({ tags: ['fleet', 'vehicles'] }),
      );
    });

    it('should skip cache when SkipCache decorator is used', async () => {
      mockReflector.get.mockImplementation((key: string) => {
        if (key === CACHE_SKIP_METADATA) return true;
        return undefined;
      });

      const context = createMockExecutionContext('GET', '/api/test');
      const handler = createMockCallHandler();

      await interceptor.intercept(context, handler);

      expect(mockCacheService.get).not.toHaveBeenCalled();
    });

    it('should use user-scoped cache key', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockImplementation((key: string) => {
        if (key === CACHE_USER_SCOPED_METADATA) return true;
        return undefined;
      });

      const context = createMockExecutionContext('GET', '/api/test', {}, { id: 'user-123' });
      const handler = createMockCallHandler();

      await interceptor.intercept(context, handler);

      expect(mockCacheService.get).toHaveBeenCalledWith(expect.stringContaining('user:user-123'));
    });

    it('should include query params in cache key', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockReturnValue(undefined);

      const context = createMockExecutionContext('GET', '/api/test', { page: '1', limit: '10' });
      const handler = createMockCallHandler();

      await interceptor.intercept(context, handler);

      expect(mockCacheService.get).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
      expect(mockCacheService.get).toHaveBeenCalledWith(expect.stringContaining('page=1'));
    });

    it('should not cache null or undefined responses', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockReflector.get.mockReturnValue(undefined);

      const context = createMockExecutionContext('GET', '/api/test');
      const handler = createMockCallHandler(null);

      const result = await interceptor.intercept(context, handler);
      await result.toPromise();

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('Mutation Requests (POST/PUT/DELETE)', () => {
    it('should not cache POST requests', async () => {
      mockReflector.get.mockReturnValue(undefined);

      const context = createMockExecutionContext('POST', '/api/test');
      const handler = createMockCallHandler();

      await interceptor.intercept(context, handler);

      expect(mockCacheService.get).not.toHaveBeenCalled();
    });

    it('should invalidate cache tags on mutation', async () => {
      mockReflector.get.mockImplementation((key: string) => {
        if (key === 'cache:invalidate') return ['fleet', 'vehicles'];
        return undefined;
      });

      const context = createMockExecutionContext('POST', '/api/test');
      const handler = createMockCallHandler();

      const result = await interceptor.intercept(context, handler);
      await result.toPromise();

      expect(mockCacheService.invalidateTags).toHaveBeenCalledWith(['fleet', 'vehicles']);
    });

    it('should replace {userId} placeholder in invalidation tags', async () => {
      mockReflector.get.mockImplementation((key: string) => {
        if (key === 'cache:invalidate') return ['user:{userId}', 'fleet:{userId}'];
        return undefined;
      });

      const context = createMockExecutionContext('POST', '/api/test', {}, { id: 'user-456' });
      const handler = createMockCallHandler();

      const result = await interceptor.intercept(context, handler);
      await result.toPromise();

      expect(mockCacheService.invalidateTags).toHaveBeenCalledWith(['user:user-456', 'fleet:user-456']);
    });
  });
});

describe('CacheInvalidationInterceptor', () => {
  let interceptor: CacheInvalidationInterceptor;
  let cacheService: RedisCacheService;
  let reflector: Reflector;

  const mockCacheService = {
    invalidateTag: jest.fn().mockResolvedValue(1),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  const createMockExecutionContext = (
    user: any = null,
    params: Record<string, string> = {},
  ): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        user,
        params,
      }),
    }),
    getHandler: () => jest.fn(),
  }) as unknown as ExecutionContext;

  const createMockCallHandler = (): CallHandler => ({
    handle: () => of({ success: true }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheInvalidationInterceptor,
        { provide: RedisCacheService, useValue: mockCacheService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    interceptor = module.get<CacheInvalidationInterceptor>(CacheInvalidationInterceptor);
    cacheService = module.get<RedisCacheService>(RedisCacheService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should invalidate tags after successful mutation', async () => {
    mockReflector.get.mockReturnValue(['fleet', 'vehicles']);

    const context = createMockExecutionContext();
    const handler = createMockCallHandler();

    const result = await interceptor.intercept(context, handler);
    await result.toPromise();

    expect(mockCacheService.invalidateTag).toHaveBeenCalledWith('fleet');
    expect(mockCacheService.invalidateTag).toHaveBeenCalledWith('vehicles');
  });

  it('should replace {userId} placeholder', async () => {
    mockReflector.get.mockReturnValue(['user:{userId}']);

    const context = createMockExecutionContext({ id: 'user-789' });
    const handler = createMockCallHandler();

    const result = await interceptor.intercept(context, handler);
    await result.toPromise();

    expect(mockCacheService.invalidateTag).toHaveBeenCalledWith('user:user-789');
  });

  it('should replace {id} placeholder from params', async () => {
    mockReflector.get.mockReturnValue(['vehicle:{id}']);

    const context = createMockExecutionContext(null, { id: 'vehicle-123' });
    const handler = createMockCallHandler();

    const result = await interceptor.intercept(context, handler);
    await result.toPromise();

    expect(mockCacheService.invalidateTag).toHaveBeenCalledWith('vehicle:vehicle-123');
  });

  it('should not invalidate when no tags are specified', async () => {
    mockReflector.get.mockReturnValue(undefined);

    const context = createMockExecutionContext();
    const handler = createMockCallHandler();

    const result = await interceptor.intercept(context, handler);
    await result.toPromise();

    expect(mockCacheService.invalidateTag).not.toHaveBeenCalled();
  });
});

describe('Cache Decorators', () => {
  describe('CacheKey', () => {
    it('should set cache key metadata', () => {
      const decorator = CacheKey('my-custom-key');
      const target = {};
      const propertyKey = 'testMethod';
      const descriptor = { value: jest.fn() };

      decorator(target, propertyKey, descriptor);

      expect(Reflect.getMetadata(CACHE_KEY_METADATA, descriptor.value)).toBe('my-custom-key');
    });
  });

  describe('CacheTTLDecorator', () => {
    it('should set TTL metadata', () => {
      const decorator = CacheTTLDecorator(600);
      const target = {};
      const propertyKey = 'testMethod';
      const descriptor = { value: jest.fn() };

      decorator(target, propertyKey, descriptor);

      expect(Reflect.getMetadata(CACHE_TTL_METADATA, descriptor.value)).toBe(600);
    });
  });

  describe('CacheTags', () => {
    it('should set tags metadata', () => {
      const decorator = CacheTags('fleet', 'vehicles');
      const target = {};
      const propertyKey = 'testMethod';
      const descriptor = { value: jest.fn() };

      decorator(target, propertyKey, descriptor);

      expect(Reflect.getMetadata(CACHE_TAGS_METADATA, descriptor.value)).toEqual(['fleet', 'vehicles']);
    });
  });

  describe('SkipCache', () => {
    it('should set skip metadata', () => {
      const decorator = SkipCache();
      const target = {};
      const propertyKey = 'testMethod';
      const descriptor = { value: jest.fn() };

      decorator(target, propertyKey, descriptor);

      expect(Reflect.getMetadata(CACHE_SKIP_METADATA, descriptor.value)).toBe(true);
    });
  });

  describe('UserScopedCache', () => {
    it('should set user-scoped metadata', () => {
      const decorator = UserScopedCache();
      const target = {};
      const propertyKey = 'testMethod';
      const descriptor = { value: jest.fn() };

      decorator(target, propertyKey, descriptor);

      expect(Reflect.getMetadata(CACHE_USER_SCOPED_METADATA, descriptor.value)).toBe(true);
    });
  });

  describe('Cacheable', () => {
    it('should set multiple cache options', () => {
      const decorator = Cacheable({
        key: 'combined-key',
        ttl: 900,
        tags: ['tag1', 'tag2'],
        userScoped: true,
      });
      const target = {};
      const propertyKey = 'testMethod';
      const descriptor = { value: jest.fn() };

      decorator(target, propertyKey, descriptor);

      expect(Reflect.getMetadata(CACHE_KEY_METADATA, descriptor.value)).toBe('combined-key');
      expect(Reflect.getMetadata(CACHE_TTL_METADATA, descriptor.value)).toBe(900);
      expect(Reflect.getMetadata(CACHE_TAGS_METADATA, descriptor.value)).toEqual(['tag1', 'tag2']);
      expect(Reflect.getMetadata(CACHE_USER_SCOPED_METADATA, descriptor.value)).toBe(true);
    });
  });

  describe('InvalidateCache', () => {
    it('should set invalidation tags metadata', () => {
      const decorator = InvalidateCache('fleet', 'vehicles');
      const target = {};
      const propertyKey = 'testMethod';
      const descriptor = { value: jest.fn() };

      decorator(target, propertyKey, descriptor);

      expect(Reflect.getMetadata('cache:invalidate', descriptor.value)).toEqual(['fleet', 'vehicles']);
    });
  });
});
