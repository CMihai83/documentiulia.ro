import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { CdnService, CDN_PROVIDERS, EDGE_LOCATIONS } from './cdn.service';

describe('CdnService', () => {
  let service: CdnService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CdnService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CdnService>(CdnService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default active provider as bunny', () => {
      expect(service.getActiveProvider()).toBe('bunny');
    });

    it('should have providers configured', () => {
      const providers = service.getAllProviders();
      expect(providers.length).toBeGreaterThan(0);
    });
  });

  describe('provider management', () => {
    it('should return all providers', () => {
      const providers = service.getAllProviders();
      expect(providers.length).toBe(3);
      expect(providers.some((p) => p.provider === 'bunny')).toBe(true);
      expect(providers.some((p) => p.provider === 'cloudflare')).toBe(true);
      expect(providers.some((p) => p.provider === 'cloudfront')).toBe(true);
    });

    it('should return enabled providers', () => {
      const enabled = service.getEnabledProviders();
      expect(enabled.length).toBeGreaterThan(0);
      expect(enabled.every((p) => p.enabled)).toBe(true);
    });

    it('should get provider config', () => {
      const config = service.getProviderConfig('bunny');
      expect(config).toBeDefined();
      expect(config?.name).toBe('Bunny CDN');
    });

    it('should return null for unknown provider', () => {
      const config = service.getProviderConfig('unknown' as any);
      expect(config).toBeNull();
    });

    it('should enable a provider', () => {
      const result = service.enableProvider('cloudflare');
      expect(result).toBe(true);

      const config = service.getProviderConfig('cloudflare');
      expect(config?.enabled).toBe(true);
    });

    it('should not disable active provider', () => {
      expect(() => service.disableProvider('bunny')).toThrow(BadRequestException);
    });

    it('should set active provider', () => {
      service.enableProvider('cloudflare');
      service.setActiveProvider('cloudflare');
      expect(service.getActiveProvider()).toBe('cloudflare');
    });

    it('should throw for unconfigured provider', () => {
      expect(() => service.setActiveProvider('unknown' as any)).toThrow(BadRequestException);
    });

    it('should throw for disabled provider', () => {
      service.disableProvider('cloudflare');
      expect(() => service.setActiveProvider('cloudflare')).toThrow(BadRequestException);
    });
  });

  describe('asset upload', () => {
    it('should upload buffer asset', async () => {
      const buffer = Buffer.from('test data');
      const asset = await service.uploadAsset(buffer, {
        fileName: 'test.txt',
        mimeType: 'text/plain',
        path: '/uploads',
      });

      expect(asset.id).toBeDefined();
      expect(asset.fileName).toBe('test.txt');
      expect(asset.path).toBe('/uploads/test.txt');
      expect(asset.provider).toBe('bunny');
      expect(asset.cdnUrl).toContain('b-cdn.net');
    });

    it('should upload base64 asset', async () => {
      const base64 = Buffer.from('test data').toString('base64');
      const asset = await service.uploadAsset(base64, {
        fileName: 'test.txt',
      });

      expect(asset.id).toBeDefined();
      expect(asset.size).toBeGreaterThan(0);
    });

    it('should generate checksum for asset', async () => {
      const buffer = Buffer.from('test data');
      const asset = await service.uploadAsset(buffer);

      expect(asset.checksum).toBeDefined();
      expect(asset.checksum.length).toBe(32);
    });

    it('should handle optimization for images', async () => {
      const buffer = Buffer.alloc(1000);
      const asset = await service.uploadAsset(buffer, {
        mimeType: 'image/jpeg',
        optimize: true,
      });

      expect(asset.size).toBeLessThan(1000);
      expect(asset.metadata.optimization).toBeDefined();
      expect(asset.metadata.optimization.savedPercent).toBe(20);
    });

    it('should set expiration if provided', async () => {
      const buffer = Buffer.from('test');
      const asset = await service.uploadAsset(buffer, {
        expiresIn: 3600,
      });

      expect(asset.expiresAt).toBeDefined();
      expect(asset.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('asset management', () => {
    let assetId: string;

    beforeEach(async () => {
      const buffer = Buffer.from('test data');
      const asset = await service.uploadAsset(buffer, { fileName: 'test.txt' });
      assetId = asset.id;
    });

    it('should get asset by id', async () => {
      const asset = await service.getAsset(assetId);
      expect(asset).toBeDefined();
      expect(asset?.id).toBe(assetId);
    });

    it('should return null for unknown asset', async () => {
      const asset = await service.getAsset('unknown');
      expect(asset).toBeNull();
    });

    it('should delete asset', async () => {
      const result = await service.deleteAsset(assetId);
      expect(result).toBe(true);

      const asset = await service.getAsset(assetId);
      expect(asset).toBeNull();
    });

    it('should return false for unknown asset deletion', async () => {
      const result = await service.deleteAsset('unknown');
      expect(result).toBe(false);
    });

    it('should list assets', async () => {
      const { assets, total } = await service.listAssets();
      expect(total).toBeGreaterThan(0);
      expect(assets.length).toBe(total);
    });

    it('should filter assets by path', async () => {
      await service.uploadAsset(Buffer.from('data'), { path: '/images' });
      await service.uploadAsset(Buffer.from('data'), { path: '/documents' });

      const { assets } = await service.listAssets({ path: '/images' });
      expect(assets.every((a) => a.path.startsWith('/images'))).toBe(true);
    });

    it('should paginate asset listing', async () => {
      for (let i = 0; i < 5; i++) {
        await service.uploadAsset(Buffer.from(`data ${i}`));
      }

      const { assets } = await service.listAssets({ limit: 3, offset: 0 });
      expect(assets.length).toBe(3);
    });
  });

  describe('URL generation', () => {
    it('should generate CDN URL for bunny', () => {
      const url = service.generateCdnUrl('/images/photo.jpg', 'bunny');
      expect(url).toContain('b-cdn.net');
      expect(url).toContain('/images/photo.jpg');
    });

    it('should generate signed URL', () => {
      const { url, expiresAt } = service.generateSignedUrl('/protected/file.pdf', {
        expiresIn: 3600,
      });

      expect(url).toContain('token=');
      expect(url).toContain('expires=');
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should verify valid signed URL', () => {
      const { url } = service.generateSignedUrl('/file.pdf', { expiresIn: 3600 });
      const isValid = service.verifySignedUrl(url);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signed URL', () => {
      const isValid = service.verifySignedUrl('https://example.com/file.pdf');
      expect(isValid).toBe(false);
    });

    it('should reject URL with missing token', () => {
      const isValid = service.verifySignedUrl('https://cdn.example.com/file.pdf?expires=9999999999');
      expect(isValid).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should invalidate cache paths', async () => {
      const invalidation = await service.invalidateCache(['/images/*', '/css/*']);

      expect(invalidation.id).toBeDefined();
      expect(invalidation.paths).toEqual(['/images/*', '/css/*']);
      expect(invalidation.status).toBe('processing');
    });

    it('should purge all cache', async () => {
      const invalidation = await service.purgeAll();
      expect(invalidation.paths).toEqual(['/*']);
    });

    it('should get invalidation status', async () => {
      const created = await service.invalidateCache(['/test']);
      const status = await service.getInvalidationStatus(created.id);

      expect(status).toBeDefined();
      expect(status?.id).toBe(created.id);
    });

    it('should list invalidations', async () => {
      await service.invalidateCache(['/path1']);
      await service.invalidateCache(['/path2']);

      const invalidations = await service.listInvalidations();
      expect(invalidations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge locations', () => {
    it('should return all edge locations', () => {
      const locations = service.getEdgeLocations();
      expect(locations.length).toBeGreaterThan(0);
    });

    it('should filter edge locations by provider', () => {
      const locations = service.getEdgeLocations('bunny');
      expect(locations.every((l) => l.provider === 'bunny')).toBe(true);
    });

    it('should get edge locations by region', () => {
      const locations = service.getEdgeLocationsByRegion('Europe');
      expect(locations.length).toBeGreaterThan(0);
      expect(locations.every((l) => l.region === 'Europe')).toBe(true);
    });

    it('should get edge locations by country', () => {
      const locations = service.getEdgeLocationsByCountry('DE');
      expect(locations.some((l) => l.country === 'DE')).toBe(true);
    });

    it('should get active edge locations', () => {
      const locations = service.getActiveEdgeLocations();
      expect(locations.every((l) => l.active)).toBe(true);
    });

    it('should find nearest edge location', () => {
      // Bucharest coordinates
      const nearest = service.getNearestEdgeLocation(44.4268, 26.1025);
      expect(nearest).toBeDefined();
      expect(nearest?.id).toBe('eu-bucharest');
    });

    it('should find nearest edge location for Tokyo', () => {
      const nearest = service.getNearestEdgeLocation(35.6762, 139.6503);
      expect(nearest).toBeDefined();
      expect(nearest?.id).toBe('asia-tokyo');
    });
  });

  describe('usage statistics', () => {
    it('should return usage stats', async () => {
      const stats = await service.getUsageStats();

      expect(stats.provider).toBe('bunny');
      expect(stats.bandwidth).toBeDefined();
      expect(stats.requests).toBeDefined();
      expect(stats.cacheHitRatio).toBeGreaterThanOrEqual(0);
      expect(stats.costs).toBeDefined();
    });

    it('should return stats for specific period', async () => {
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = new Date();

      const stats = await service.getUsageStats('bunny', { start, end });
      expect(stats.period.start).toEqual(start);
      expect(stats.period.end).toEqual(end);
    });
  });

  describe('image optimization', () => {
    it('should optimize image asset', async () => {
      const buffer = Buffer.alloc(1000);
      const asset = await service.uploadAsset(buffer, {
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      });

      const result = await service.optimizeImage(asset.id, { quality: 80 });

      expect(result.originalSize).toBe(asset.size);
      expect(result.optimizedSize).toBeLessThan(result.originalSize);
      expect(result.savedPercent).toBeGreaterThan(0);
    });

    it('should throw for non-image assets', async () => {
      const buffer = Buffer.from('text content');
      const asset = await service.uploadAsset(buffer, {
        fileName: 'doc.txt',
        mimeType: 'text/plain',
      });

      await expect(service.optimizeImage(asset.id)).rejects.toThrow(BadRequestException);
    });

    it('should throw for unknown asset', async () => {
      await expect(service.optimizeImage('unknown')).rejects.toThrow(BadRequestException);
    });

    it('should generate image variants', async () => {
      const buffer = Buffer.alloc(1000);
      const asset = await service.uploadAsset(buffer, {
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      });

      const thumbnailUrl = service.generateImageVariant(asset.id, 'thumbnail');
      expect(thumbnailUrl).toContain('width=150');
      expect(thumbnailUrl).toContain('height=150');

      const largeUrl = service.generateImageVariant(asset.id, 'large');
      expect(largeUrl).toContain('width=1280');
    });
  });

  describe('health and dashboard', () => {
    it('should return health status', async () => {
      const health = await service.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.providers.length).toBeGreaterThan(0);
    });

    it('should return dashboard data', () => {
      const dashboard = service.getDashboard();

      expect(dashboard.activeProvider).toBe('bunny');
      expect(dashboard.totalAssets).toBeGreaterThanOrEqual(0);
      expect(dashboard.providers).toBeDefined();
      expect(dashboard.edgeLocationsCount).toBeGreaterThan(0);
    });
  });

  describe('CDN provider configurations', () => {
    it('should have bunny provider config', () => {
      expect(CDN_PROVIDERS.bunny).toBeDefined();
      expect(CDN_PROVIDERS.bunny.name).toBe('Bunny CDN');
    });

    it('should have cloudflare provider config', () => {
      expect(CDN_PROVIDERS.cloudflare).toBeDefined();
      expect(CDN_PROVIDERS.cloudflare.name).toBe('Cloudflare CDN');
    });

    it('should have cloudfront provider config', () => {
      expect(CDN_PROVIDERS.cloudfront).toBeDefined();
      expect(CDN_PROVIDERS.cloudfront.name).toBe('AWS CloudFront');
    });
  });

  describe('edge locations constants', () => {
    it('should have European locations', () => {
      const euLocations = EDGE_LOCATIONS.filter((l) => l.region === 'Europe');
      expect(euLocations.length).toBeGreaterThan(0);
    });

    it('should have Romania location', () => {
      const roLocation = EDGE_LOCATIONS.find((l) => l.country === 'RO');
      expect(roLocation).toBeDefined();
      expect(roLocation?.name).toBe('Bucharest');
    });

    it('should have valid coordinates', () => {
      for (const location of EDGE_LOCATIONS) {
        expect(location.latitude).toBeGreaterThanOrEqual(-90);
        expect(location.latitude).toBeLessThanOrEqual(90);
        expect(location.longitude).toBeGreaterThanOrEqual(-180);
        expect(location.longitude).toBeLessThanOrEqual(180);
      }
    });
  });

  describe('error handling', () => {
    it('should throw for upload when provider unavailable', async () => {
      service.disableProvider('cloudflare');
      service.disableProvider('cloudfront');

      // Force disable bunny by accessing internal state (for testing)
      const providers = (service as any).providers;
      const bunnyConfig = providers.get('bunny');
      bunnyConfig.enabled = false;
      providers.set('bunny', bunnyConfig);

      await expect(
        service.uploadAsset(Buffer.from('test'))
      ).rejects.toThrow(BadRequestException);
    });
  });
});
