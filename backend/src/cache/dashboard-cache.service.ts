import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService, CacheTTL, CachePrefix } from './redis-cache.service';

/**
 * Dashboard-specific caching strategies
 * Implements intelligent caching for analytics and dashboard data
 */

export interface DashboardCacheConfig {
  metrics: number; // TTL for metrics data
  charts: number; // TTL for chart data
  activity: number; // TTL for activity feed
  goals: number; // TTL for goals progress
}

export const DEFAULT_DASHBOARD_CACHE_CONFIG: DashboardCacheConfig = {
  metrics: 300, // 5 minutes
  charts: 600, // 10 minutes
  activity: 60, // 1 minute
  goals: 300, // 5 minutes
};

@Injectable()
export class DashboardCacheService {
  private readonly logger = new Logger(DashboardCacheService.name);
  private readonly prefix = CachePrefix.DASHBOARD;

  constructor(private readonly redis: RedisCacheService) {}

  /**
   * Cache dashboard metrics
   */
  async cacheMetrics(
    organizationId: string,
    dateRange: string,
    data: unknown,
    ttl: number = DEFAULT_DASHBOARD_CACHE_CONFIG.metrics,
  ): Promise<void> {
    const key = this.getMetricsKey(organizationId, dateRange);
    await this.redis.set(key, data, { ttl, tags: ['dashboard', `org:${organizationId}`] });
    this.logger.debug(`Cached metrics for org ${organizationId}, range: ${dateRange}`);
  }

  /**
   * Get cached dashboard metrics
   */
  async getMetrics(organizationId: string, dateRange: string): Promise<unknown | null> {
    const key = this.getMetricsKey(organizationId, dateRange);
    return this.redis.get(key);
  }

  /**
   * Cache revenue trend data
   */
  async cacheRevenueTrend(
    organizationId: string,
    months: number,
    data: unknown,
    ttl: number = DEFAULT_DASHBOARD_CACHE_CONFIG.charts,
  ): Promise<void> {
    const key = this.getRevenueTrendKey(organizationId, months);
    await this.redis.set(key, data, { ttl, tags: ['dashboard', 'charts', `org:${organizationId}`] });
    this.logger.debug(`Cached revenue trend for org ${organizationId}, months: ${months}`);
  }

  /**
   * Get cached revenue trend
   */
  async getRevenueTrend(organizationId: string, months: number): Promise<unknown | null> {
    const key = this.getRevenueTrendKey(organizationId, months);
    return this.redis.get(key);
  }

  /**
   * Cache activity feed
   */
  async cacheActivity(
    organizationId: string,
    data: unknown,
    ttl: number = DEFAULT_DASHBOARD_CACHE_CONFIG.activity,
  ): Promise<void> {
    const key = this.getActivityKey(organizationId);
    await this.redis.set(key, data, { ttl, tags: ['dashboard', 'activity', `org:${organizationId}`] });
  }

  /**
   * Get cached activity feed
   */
  async getActivity(organizationId: string): Promise<unknown | null> {
    const key = this.getActivityKey(organizationId);
    return this.redis.get(key);
  }

  /**
   * Cache goals progress
   */
  async cacheGoals(
    organizationId: string,
    data: unknown,
    ttl: number = DEFAULT_DASHBOARD_CACHE_CONFIG.goals,
  ): Promise<void> {
    const key = this.getGoalsKey(organizationId);
    await this.redis.set(key, data, { ttl, tags: ['dashboard', 'goals', `org:${organizationId}`] });
  }

  /**
   * Get cached goals progress
   */
  async getGoals(organizationId: string): Promise<unknown | null> {
    const key = this.getGoalsKey(organizationId);
    return this.redis.get(key);
  }

  /**
   * Cache complete dashboard summary
   */
  async cacheSummary(
    organizationId: string,
    dateRange: string,
    data: unknown,
    ttl: number = DEFAULT_DASHBOARD_CACHE_CONFIG.metrics,
  ): Promise<void> {
    const key = this.getSummaryKey(organizationId, dateRange);
    await this.redis.set(key, data, { ttl, tags: ['dashboard', 'summary', `org:${organizationId}`] });
    this.logger.debug(`Cached dashboard summary for org ${organizationId}`);
  }

  /**
   * Get cached dashboard summary
   */
  async getSummary(organizationId: string, dateRange: string): Promise<unknown | null> {
    const key = this.getSummaryKey(organizationId, dateRange);
    return this.redis.get(key);
  }

  /**
   * Invalidate all dashboard cache for an organization
   */
  async invalidateOrganization(organizationId: string): Promise<void> {
    await this.redis.invalidateTag(`org:${organizationId}`);
    this.logger.log(`Invalidated all dashboard cache for org ${organizationId}`);
  }

  /**
   * Invalidate specific cache type
   */
  async invalidateByType(type: 'metrics' | 'charts' | 'activity' | 'goals' | 'summary'): Promise<void> {
    const tag = type === 'charts' ? 'charts' : type;
    await this.redis.invalidateTag(tag);
    this.logger.log(`Invalidated all ${type} cache`);
  }

  /**
   * Warm up dashboard cache for an organization
   * Pre-populates cache with commonly requested data
   */
  async warmUpCache(
    organizationId: string,
    dataProvider: {
      getMetrics: (range: string) => Promise<unknown>;
      getRevenueTrend: (months: number) => Promise<unknown>;
      getActivity: () => Promise<unknown>;
      getGoals: () => Promise<unknown>;
    },
  ): Promise<void> {
    this.logger.log(`Warming up dashboard cache for org ${organizationId}`);

    try {
      // Pre-cache common date ranges
      const dateRanges = ['7d', '30d', '90d'];
      await Promise.all(
        dateRanges.map(async (range) => {
          const metrics = await dataProvider.getMetrics(range);
          await this.cacheMetrics(organizationId, range, metrics);
        }),
      );

      // Pre-cache revenue trends
      const revenueTrend = await dataProvider.getRevenueTrend(6);
      await this.cacheRevenueTrend(organizationId, 6, revenueTrend);

      // Pre-cache activity
      const activity = await dataProvider.getActivity();
      await this.cacheActivity(organizationId, activity);

      // Pre-cache goals
      const goals = await dataProvider.getGoals();
      await this.cacheGoals(organizationId, goals);

      this.logger.log(`Dashboard cache warmed up for org ${organizationId}`);
    } catch (error) {
      this.logger.error(`Cache warm-up failed for org ${organizationId}: ${error.message}`);
    }
  }

  // Key generators
  private getMetricsKey(organizationId: string, dateRange: string): string {
    return `${this.prefix}metrics:${organizationId}:${dateRange}`;
  }

  private getRevenueTrendKey(organizationId: string, months: number): string {
    return `${this.prefix}revenue:${organizationId}:${months}m`;
  }

  private getActivityKey(organizationId: string): string {
    return `${this.prefix}activity:${organizationId}`;
  }

  private getGoalsKey(organizationId: string): string {
    return `${this.prefix}goals:${organizationId}`;
  }

  private getSummaryKey(organizationId: string, dateRange: string): string {
    return `${this.prefix}summary:${organizationId}:${dateRange}`;
  }
}
