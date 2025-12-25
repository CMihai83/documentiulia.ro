import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

// CDN Provider Types
export type CdnProvider = 'bunny' | 'cloudflare' | 'cloudfront' | 'azure';

// CDN Configuration Interfaces
export interface CdnProviderConfig {
  provider: CdnProvider;
  name: string;
  apiKey?: string;
  apiSecret?: string;
  accountId?: string;
  zoneId?: string;
  distributionId?: string;
  pullZoneId?: string;
  storageZone?: string;
  baseUrl: string;
  enabled: boolean;
  regions?: string[];
}

export interface CdnAsset {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  cdnUrl: string;
  provider: CdnProvider;
  path: string;
  checksum: string;
  uploadedAt: Date;
  expiresAt?: Date;
  metadata: Record<string, any>;
  cached: boolean;
  cacheStatus?: 'hit' | 'miss' | 'expired' | 'stale';
}

export interface UploadOptions {
  path?: string;
  fileName?: string;
  mimeType?: string;
  isPublic?: boolean;
  expiresIn?: number; // seconds
  metadata?: Record<string, any>;
  optimize?: boolean;
  resizeWidth?: number;
  resizeHeight?: number;
  quality?: number;
}

export interface SignedUrlOptions {
  expiresIn: number; // seconds
  ipAddress?: string;
  countryCode?: string;
  headers?: Record<string, string>;
}

export interface CacheInvalidation {
  id: string;
  paths: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider: CdnProvider;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface CdnUsageStats {
  provider: CdnProvider;
  period: {
    start: Date;
    end: Date;
  };
  bandwidth: {
    total: number; // bytes
    cached: number;
    uncached: number;
  };
  requests: {
    total: number;
    cached: number;
    uncached: number;
  };
  cacheHitRatio: number;
  costs: {
    bandwidth: number;
    requests: number;
    storage: number;
    total: number;
    currency: string;
  };
}

export interface EdgeLocation {
  id: string;
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  active: boolean;
  provider: CdnProvider;
}

export interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  savedBytes: number;
  savedPercent: number;
  format: string;
  width?: number;
  height?: number;
}

// CDN Provider Configurations
export const CDN_PROVIDERS: Record<CdnProvider, Partial<CdnProviderConfig>> = {
  bunny: {
    provider: 'bunny',
    name: 'Bunny CDN',
    baseUrl: 'https://storage.bunnycdn.com',
    regions: ['EU', 'US', 'ASIA', 'SA', 'AF', 'SY'],
  },
  cloudflare: {
    provider: 'cloudflare',
    name: 'Cloudflare CDN',
    baseUrl: 'https://api.cloudflare.com/client/v4',
    regions: ['Global'],
  },
  cloudfront: {
    provider: 'cloudfront',
    name: 'AWS CloudFront',
    baseUrl: 'https://cloudfront.amazonaws.com',
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'],
  },
  azure: {
    provider: 'azure',
    name: 'Azure CDN',
    baseUrl: 'https://management.azure.com',
    regions: ['westeurope', 'eastus', 'westus2', 'southeastasia'],
  },
};

// Edge Locations (sample)
export const EDGE_LOCATIONS: EdgeLocation[] = [
  // Europe
  { id: 'eu-frankfurt', name: 'Frankfurt', region: 'Europe', country: 'DE', latitude: 50.1109, longitude: 8.6821, active: true, provider: 'bunny' },
  { id: 'eu-london', name: 'London', region: 'Europe', country: 'GB', latitude: 51.5074, longitude: -0.1278, active: true, provider: 'bunny' },
  { id: 'eu-paris', name: 'Paris', region: 'Europe', country: 'FR', latitude: 48.8566, longitude: 2.3522, active: true, provider: 'bunny' },
  { id: 'eu-amsterdam', name: 'Amsterdam', region: 'Europe', country: 'NL', latitude: 52.3676, longitude: 4.9041, active: true, provider: 'bunny' },
  { id: 'eu-bucharest', name: 'Bucharest', region: 'Europe', country: 'RO', latitude: 44.4268, longitude: 26.1025, active: true, provider: 'bunny' },
  // US
  { id: 'us-newyork', name: 'New York', region: 'North America', country: 'US', latitude: 40.7128, longitude: -74.0060, active: true, provider: 'bunny' },
  { id: 'us-losangeles', name: 'Los Angeles', region: 'North America', country: 'US', latitude: 34.0522, longitude: -118.2437, active: true, provider: 'bunny' },
  { id: 'us-chicago', name: 'Chicago', region: 'North America', country: 'US', latitude: 41.8781, longitude: -87.6298, active: true, provider: 'bunny' },
  // Asia
  { id: 'asia-tokyo', name: 'Tokyo', region: 'Asia', country: 'JP', latitude: 35.6762, longitude: 139.6503, active: true, provider: 'bunny' },
  { id: 'asia-singapore', name: 'Singapore', region: 'Asia', country: 'SG', latitude: 1.3521, longitude: 103.8198, active: true, provider: 'bunny' },
  { id: 'asia-hongkong', name: 'Hong Kong', region: 'Asia', country: 'HK', latitude: 22.3193, longitude: 114.1694, active: true, provider: 'bunny' },
  // Other
  { id: 'sa-saopaulo', name: 'São Paulo', region: 'South America', country: 'BR', latitude: -23.5505, longitude: -46.6333, active: true, provider: 'bunny' },
  { id: 'oc-sydney', name: 'Sydney', region: 'Oceania', country: 'AU', latitude: -33.8688, longitude: 151.2093, active: true, provider: 'bunny' },
];

// MIME type to extension mapping
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/json': 'json',
  'text/css': 'css',
  'text/javascript': 'js',
  'application/javascript': 'js',
  'text/html': 'html',
  'font/woff': 'woff',
  'font/woff2': 'woff2',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
};

@Injectable()
export class CdnService {
  private readonly logger = new Logger(CdnService.name);
  private providers: Map<CdnProvider, CdnProviderConfig> = new Map();
  private assets: Map<string, CdnAsset> = new Map();
  private invalidations: Map<string, CacheInvalidation> = new Map();
  private activeProvider: CdnProvider = 'bunny';

  constructor(private configService: ConfigService) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Bunny CDN (primary)
    this.providers.set('bunny', {
      ...CDN_PROVIDERS.bunny,
      provider: 'bunny',
      name: 'Bunny CDN',
      apiKey: this.configService.get<string>('BUNNY_API_KEY') || 'mock-bunny-key',
      storageZone: this.configService.get<string>('BUNNY_STORAGE_ZONE') || 'documentiulia',
      pullZoneId: this.configService.get<string>('BUNNY_PULL_ZONE_ID') || 'pz-123456',
      baseUrl: 'https://storage.bunnycdn.com',
      enabled: true,
      regions: ['EU', 'US', 'ASIA'],
    });

    // Initialize Cloudflare
    this.providers.set('cloudflare', {
      ...CDN_PROVIDERS.cloudflare,
      provider: 'cloudflare',
      name: 'Cloudflare CDN',
      apiKey: this.configService.get<string>('CLOUDFLARE_API_KEY') || 'mock-cf-key',
      accountId: this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID') || 'cf-account-123',
      zoneId: this.configService.get<string>('CLOUDFLARE_ZONE_ID') || 'cf-zone-456',
      baseUrl: 'https://api.cloudflare.com/client/v4',
      enabled: false,
    });

    // Initialize CloudFront
    this.providers.set('cloudfront', {
      ...CDN_PROVIDERS.cloudfront,
      provider: 'cloudfront',
      name: 'AWS CloudFront',
      apiKey: this.configService.get<string>('AWS_ACCESS_KEY_ID') || 'mock-aws-key',
      apiSecret: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || 'mock-aws-secret',
      distributionId: this.configService.get<string>('CLOUDFRONT_DISTRIBUTION_ID') || 'E1234567890ABC',
      baseUrl: 'https://d123456789.cloudfront.net',
      enabled: false,
    });

    this.logger.log('CDN providers initialized');
  }

  // =================== PROVIDER MANAGEMENT ===================

  getActiveProvider(): CdnProvider {
    return this.activeProvider;
  }

  setActiveProvider(provider: CdnProvider): void {
    const config = this.providers.get(provider);
    if (!config) {
      throw new BadRequestException(`Provider ${provider} not configured`);
    }
    if (!config.enabled) {
      throw new BadRequestException(`Provider ${provider} is not enabled`);
    }
    this.activeProvider = provider;
    this.logger.log(`Active CDN provider set to ${provider}`);
  }

  getProviderConfig(provider?: CdnProvider): CdnProviderConfig | null {
    return this.providers.get(provider || this.activeProvider) || null;
  }

  getAllProviders(): CdnProviderConfig[] {
    return Array.from(this.providers.values());
  }

  getEnabledProviders(): CdnProviderConfig[] {
    return Array.from(this.providers.values()).filter((p) => p.enabled);
  }

  enableProvider(provider: CdnProvider): boolean {
    const config = this.providers.get(provider);
    if (!config) return false;
    config.enabled = true;
    this.providers.set(provider, config);
    return true;
  }

  disableProvider(provider: CdnProvider): boolean {
    const config = this.providers.get(provider);
    if (!config) return false;

    // Don't disable if it's the active provider
    if (this.activeProvider === provider) {
      throw new BadRequestException('Cannot disable the active provider');
    }

    config.enabled = false;
    this.providers.set(provider, config);
    return true;
  }

  // =================== ASSET MANAGEMENT ===================

  async uploadAsset(
    data: Buffer | string,
    options: UploadOptions = {},
  ): Promise<CdnAsset> {
    const provider = this.activeProvider;
    const config = this.providers.get(provider);
    if (!config || !config.enabled) {
      throw new BadRequestException('CDN provider not available');
    }

    const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
    const checksum = crypto.createHash('md5').update(buffer).digest('hex');

    const extension = options.mimeType
      ? MIME_EXTENSIONS[options.mimeType] || 'bin'
      : 'bin';

    const fileName = options.fileName || `${Date.now()}_${checksum.substring(0, 8)}.${extension}`;
    const path = options.path || '/assets';
    const fullPath = `${path}/${fileName}`.replace(/\/+/g, '/');

    // Simulate optimization
    let optimizedSize = buffer.length;
    let optimizationResult: OptimizationResult | undefined;

    if (options.optimize && options.mimeType?.startsWith('image/')) {
      // Simulate image optimization (20% reduction)
      optimizedSize = Math.floor(buffer.length * 0.8);
      optimizationResult = {
        originalSize: buffer.length,
        optimizedSize,
        savedBytes: buffer.length - optimizedSize,
        savedPercent: 20,
        format: extension,
        width: options.resizeWidth,
        height: options.resizeHeight,
      };
    }

    const assetId = `asset_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const cdnUrl = this.generateCdnUrl(fullPath, provider);

    const asset: CdnAsset = {
      id: assetId,
      fileName,
      originalName: options.fileName || fileName,
      mimeType: options.mimeType || 'application/octet-stream',
      size: optimizedSize,
      url: `${config.baseUrl}/${config.storageZone || 'default'}${fullPath}`,
      cdnUrl,
      provider,
      path: fullPath,
      checksum,
      uploadedAt: new Date(),
      expiresAt: options.expiresIn
        ? new Date(Date.now() + options.expiresIn * 1000)
        : undefined,
      metadata: {
        ...options.metadata,
        isPublic: options.isPublic ?? true,
        optimization: optimizationResult,
      },
      cached: true,
      cacheStatus: 'miss',
    };

    this.assets.set(assetId, asset);
    this.logger.log(`Asset uploaded: ${assetId} to ${provider}`);

    return asset;
  }

  async getAsset(assetId: string): Promise<CdnAsset | null> {
    return this.assets.get(assetId) || null;
  }

  async deleteAsset(assetId: string): Promise<boolean> {
    const asset = this.assets.get(assetId);
    if (!asset) return false;

    this.assets.delete(assetId);
    this.logger.log(`Asset deleted: ${assetId}`);

    // Invalidate cache for the asset
    await this.invalidateCache([asset.path]);

    return true;
  }

  async listAssets(
    options: {
      path?: string;
      provider?: CdnProvider;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ assets: CdnAsset[]; total: number }> {
    let assets = Array.from(this.assets.values());

    if (options.path) {
      assets = assets.filter((a) => a.path.startsWith(options.path!));
    }

    if (options.provider) {
      assets = assets.filter((a) => a.provider === options.provider);
    }

    const total = assets.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    assets = assets
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(offset, offset + limit);

    return { assets, total };
  }

  // =================== URL GENERATION ===================

  generateCdnUrl(path: string, provider?: CdnProvider): string {
    const p = provider || this.activeProvider;
    const config = this.providers.get(p);

    if (!config) {
      throw new BadRequestException(`Provider ${p} not configured`);
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    switch (p) {
      case 'bunny':
        return `https://${config.storageZone}.b-cdn.net${cleanPath}`;
      case 'cloudflare':
        return `https://${config.zoneId}.r2.cloudflarestorage.com${cleanPath}`;
      case 'cloudfront':
        return `${config.baseUrl}${cleanPath}`;
      case 'azure':
        return `https://${config.accountId}.azureedge.net${cleanPath}`;
      default:
        return `${config.baseUrl}${cleanPath}`;
    }
  }

  generateSignedUrl(
    path: string,
    options: SignedUrlOptions,
  ): { url: string; expiresAt: Date } {
    const config = this.providers.get(this.activeProvider);
    if (!config) {
      throw new BadRequestException('CDN provider not configured');
    }

    const expiresAt = new Date(Date.now() + options.expiresIn * 1000);
    const timestamp = Math.floor(expiresAt.getTime() / 1000);

    // Create token based on provider
    const dataToSign = [
      path,
      timestamp.toString(),
      options.ipAddress || '',
      options.countryCode || '',
    ].join(':');

    const token = crypto
      .createHmac('sha256', config.apiKey || 'secret')
      .update(dataToSign)
      .digest('hex')
      .substring(0, 16);

    const cdnUrl = this.generateCdnUrl(path);
    const signedUrl = `${cdnUrl}?token=${token}&expires=${timestamp}`;

    return { url: signedUrl, expiresAt };
  }

  verifySignedUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      const expires = urlObj.searchParams.get('expires');

      if (!token || !expires) return false;

      const expiresTimestamp = parseInt(expires, 10);
      if (Date.now() > expiresTimestamp * 1000) return false;

      // Token validation would happen here
      return token.length === 16;
    } catch {
      return false;
    }
  }

  // =================== CACHE MANAGEMENT ===================

  async invalidateCache(paths: string[]): Promise<CacheInvalidation> {
    const provider = this.activeProvider;
    const id = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const invalidation: CacheInvalidation = {
      id,
      paths,
      status: 'processing',
      provider,
      createdAt: new Date(),
    };

    this.invalidations.set(id, invalidation);

    // Simulate async invalidation
    setTimeout(() => {
      invalidation.status = 'completed';
      invalidation.completedAt = new Date();
      this.invalidations.set(id, invalidation);
    }, 100);

    this.logger.log(`Cache invalidation started: ${id} for ${paths.length} paths`);

    return invalidation;
  }

  async purgeAll(): Promise<CacheInvalidation> {
    return this.invalidateCache(['/*']);
  }

  async getInvalidationStatus(id: string): Promise<CacheInvalidation | null> {
    return this.invalidations.get(id) || null;
  }

  async listInvalidations(
    limit = 20,
  ): Promise<CacheInvalidation[]> {
    return Array.from(this.invalidations.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // =================== EDGE LOCATIONS ===================

  getEdgeLocations(provider?: CdnProvider): EdgeLocation[] {
    if (provider) {
      return EDGE_LOCATIONS.filter((loc) => loc.provider === provider);
    }
    return EDGE_LOCATIONS;
  }

  getEdgeLocationsByRegion(region: string): EdgeLocation[] {
    return EDGE_LOCATIONS.filter(
      (loc) => loc.region.toLowerCase() === region.toLowerCase(),
    );
  }

  getEdgeLocationsByCountry(country: string): EdgeLocation[] {
    return EDGE_LOCATIONS.filter(
      (loc) => loc.country.toLowerCase() === country.toLowerCase(),
    );
  }

  getActiveEdgeLocations(): EdgeLocation[] {
    return EDGE_LOCATIONS.filter((loc) => loc.active);
  }

  getNearestEdgeLocation(
    latitude: number,
    longitude: number,
  ): EdgeLocation | null {
    let nearest: EdgeLocation | null = null;
    let minDistance = Infinity;

    for (const location of EDGE_LOCATIONS.filter((l) => l.active)) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        location.latitude,
        location.longitude,
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = location;
      }
    }

    return nearest;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // =================== USAGE STATISTICS ===================

  async getUsageStats(
    provider?: CdnProvider,
    period?: { start: Date; end: Date },
  ): Promise<CdnUsageStats> {
    const p = provider || this.activeProvider;
    const now = new Date();
    const startDate = period?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = period?.end || now;

    // Calculate stats from assets
    const providerAssets = Array.from(this.assets.values())
      .filter((a) => a.provider === p)
      .filter((a) => a.uploadedAt >= startDate && a.uploadedAt <= endDate);

    const totalSize = providerAssets.reduce((sum, a) => sum + a.size, 0);
    const totalRequests = providerAssets.length * 100; // Simulated

    // Simulate realistic stats
    const cachedBandwidth = Math.floor(totalSize * 0.85);
    const cachedRequests = Math.floor(totalRequests * 0.90);

    return {
      provider: p,
      period: { start: startDate, end: endDate },
      bandwidth: {
        total: totalSize * 100, // Simulated traffic
        cached: cachedBandwidth * 100,
        uncached: (totalSize - cachedBandwidth) * 100,
      },
      requests: {
        total: totalRequests,
        cached: cachedRequests,
        uncached: totalRequests - cachedRequests,
      },
      cacheHitRatio: 0.90,
      costs: {
        bandwidth: (totalSize / (1024 * 1024 * 1024)) * 0.01, // $0.01/GB
        requests: (totalRequests / 10000) * 0.01, // $0.01/10k requests
        storage: (totalSize / (1024 * 1024 * 1024)) * 0.005, // $0.005/GB/month
        total: 0,
        currency: 'USD',
      },
    };
  }

  // =================== ASSET OPTIMIZATION ===================

  async optimizeImage(
    assetId: string,
    options: {
      quality?: number;
      width?: number;
      height?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
    } = {},
  ): Promise<OptimizationResult> {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new BadRequestException('Asset not found');
    }

    if (!asset.mimeType.startsWith('image/')) {
      throw new BadRequestException('Asset is not an image');
    }

    const quality = options.quality || 80;
    const compressionRatio = quality / 100;
    const optimizedSize = Math.floor(asset.size * compressionRatio * 0.7);

    return {
      originalSize: asset.size,
      optimizedSize,
      savedBytes: asset.size - optimizedSize,
      savedPercent: Math.round(((asset.size - optimizedSize) / asset.size) * 100),
      format: options.format || 'webp',
      width: options.width,
      height: options.height,
    };
  }

  generateImageVariant(
    assetId: string,
    variant: 'thumbnail' | 'small' | 'medium' | 'large',
  ): string {
    const asset = this.assets.get(assetId);
    if (!asset) {
      throw new BadRequestException('Asset not found');
    }

    const dimensions = {
      thumbnail: { width: 150, height: 150 },
      small: { width: 320, height: 240 },
      medium: { width: 640, height: 480 },
      large: { width: 1280, height: 960 },
    };

    const { width, height } = dimensions[variant];
    return `${asset.cdnUrl}?width=${width}&height=${height}&fit=cover`;
  }

  // =================== HEALTH & DIAGNOSTICS ===================

  async healthCheck(): Promise<{
    healthy: boolean;
    providers: Array<{ provider: CdnProvider; status: 'up' | 'down'; latency: number }>;
  }> {
    const providerStatuses = await Promise.all(
      Array.from(this.providers.entries())
        .filter(([, config]) => config.enabled)
        .map(async ([provider]) => ({
          provider,
          status: 'up' as const,
          latency: Math.floor(Math.random() * 50) + 10, // Simulated 10-60ms
        })),
    );

    return {
      healthy: providerStatuses.every((p) => p.status === 'up'),
      providers: providerStatuses,
    };
  }

  getDashboard(): {
    activeProvider: CdnProvider;
    totalAssets: number;
    totalSize: number;
    providers: Array<{ name: string; enabled: boolean; assetsCount: number }>;
    recentUploads: CdnAsset[];
    edgeLocationsCount: number;
  } {
    const assets = Array.from(this.assets.values());
    const providers = Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      enabled: p.enabled,
      assetsCount: assets.filter((a) => a.provider === p.provider).length,
    }));

    return {
      activeProvider: this.activeProvider,
      totalAssets: assets.length,
      totalSize: assets.reduce((sum, a) => sum + a.size, 0),
      providers,
      recentUploads: assets
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .slice(0, 10),
      edgeLocationsCount: EDGE_LOCATIONS.filter((l) => l.active).length,
    };
  }
}
