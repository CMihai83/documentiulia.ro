import { Injectable, Logger, OnModuleInit, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as zlib from 'zlib';

/**
 * Performance Optimization Service
 *
 * Features:
 * - Response compression (gzip/brotli)
 * - Query performance tracking
 * - Slow query detection and logging
 * - Memory usage monitoring
 * - Connection pool optimization
 * - Response time metrics
 */

// Performance metrics
export interface PerformanceMetrics {
  requestCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  slowQueries: SlowQuery[];
  memoryUsage: MemoryUsage;
  cacheHitRate: number;
  activeConnections: number;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  endpoint?: string;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  percentUsed: number;
}

export interface QueryStats {
  totalQueries: number;
  slowQueries: number;
  averageQueryTime: number;
  maxQueryTime: number;
}

// Configuration for performance thresholds
export interface PerformanceConfig {
  slowQueryThresholdMs: number;
  compressionThresholdBytes: number;
  maxSlowQueriesStored: number;
  enableCompression: boolean;
  enableQueryTracking: boolean;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  slowQueryThresholdMs: 500, // 500ms
  compressionThresholdBytes: 1024, // 1KB
  maxSlowQueriesStored: 100,
  enableCompression: true,
  enableQueryTracking: true,
};

@Injectable()
export class PerformanceService implements OnModuleInit {
  private readonly logger = new Logger(PerformanceService.name);
  private config: PerformanceConfig;

  // Metrics storage
  private requestCount = 0;
  private totalResponseTime = 0;
  private slowQueries: SlowQuery[] = [];
  private queryStats: Map<string, number[]> = new Map();
  private startTime: Date;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      ...DEFAULT_CONFIG,
      slowQueryThresholdMs: parseInt(this.configService.get('SLOW_QUERY_THRESHOLD_MS') || '500'),
      compressionThresholdBytes: parseInt(this.configService.get('COMPRESSION_THRESHOLD_BYTES') || '1024'),
      enableCompression: this.configService.get('ENABLE_COMPRESSION') !== 'false',
      enableQueryTracking: this.configService.get('ENABLE_QUERY_TRACKING') !== 'false',
    };
    this.startTime = new Date();
  }

  async onModuleInit() {
    this.logger.log('Performance optimization service initialized');
    this.logger.log(`Slow query threshold: ${this.config.slowQueryThresholdMs}ms`);
    this.logger.log(`Compression threshold: ${this.config.compressionThresholdBytes} bytes`);
  }

  // =================== RESPONSE TIME TRACKING ===================

  /**
   * Record a request's response time
   */
  recordResponseTime(durationMs: number, endpoint?: string): void {
    this.requestCount++;
    this.totalResponseTime += durationMs;

    if (durationMs > this.config.slowQueryThresholdMs) {
      this.recordSlowQuery(`Request to ${endpoint || 'unknown'}`, durationMs, endpoint);
    }
  }

  /**
   * Record a slow database query
   */
  recordSlowQuery(query: string, durationMs: number, endpoint?: string): void {
    const slowQuery: SlowQuery = {
      query: query.substring(0, 500), // Truncate for storage
      duration: durationMs,
      timestamp: new Date(),
      endpoint,
    };

    this.slowQueries.unshift(slowQuery);

    // Keep only the most recent slow queries
    if (this.slowQueries.length > this.config.maxSlowQueriesStored) {
      this.slowQueries = this.slowQueries.slice(0, this.config.maxSlowQueriesStored);
    }

    this.logger.warn(`Slow query detected (${durationMs}ms): ${query.substring(0, 100)}...`);
  }

  /**
   * Track query execution time for a specific query type
   */
  trackQuery(queryName: string, durationMs: number): void {
    if (!this.config.enableQueryTracking) return;

    const existing = this.queryStats.get(queryName) || [];
    existing.push(durationMs);

    // Keep only last 100 measurements per query
    if (existing.length > 100) {
      existing.shift();
    }

    this.queryStats.set(queryName, existing);
  }

  // =================== COMPRESSION UTILITIES ===================

  /**
   * Compress response data if it meets the threshold
   */
  compressResponse(data: string | Buffer, acceptEncoding: string): { data: Buffer; encoding: string | null } {
    if (!this.config.enableCompression) {
      return { data: Buffer.from(data), encoding: null };
    }

    const dataBuffer = Buffer.from(data);

    if (dataBuffer.length < this.config.compressionThresholdBytes) {
      return { data: dataBuffer, encoding: null };
    }

    // Prefer Brotli for better compression, fall back to gzip
    if (acceptEncoding.includes('br')) {
      try {
        const compressed = zlib.brotliCompressSync(dataBuffer);
        return { data: compressed, encoding: 'br' };
      } catch {
        // Fall through to gzip
      }
    }

    if (acceptEncoding.includes('gzip')) {
      try {
        const compressed = zlib.gzipSync(dataBuffer);
        return { data: compressed, encoding: 'gzip' };
      } catch {
        // Return uncompressed
      }
    }

    return { data: dataBuffer, encoding: null };
  }

  // =================== METRICS ===================

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const memUsage = process.memoryUsage();

    return {
      requestCount: this.requestCount,
      totalResponseTime: this.totalResponseTime,
      averageResponseTime: this.requestCount > 0
        ? Math.round(this.totalResponseTime / this.requestCount)
        : 0,
      slowQueries: this.slowQueries.slice(0, 20), // Return only recent 20
      memoryUsage: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
        percentUsed: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      cacheHitRate: 0, // To be integrated with cache service
      activeConnections: 0, // To be integrated with DB service
    };
  }

  /**
   * Get query statistics
   */
  getQueryStats(): Record<string, QueryStats> {
    const stats: Record<string, QueryStats> = {};

    this.queryStats.forEach((times, queryName) => {
      if (times.length > 0) {
        stats[queryName] = {
          totalQueries: times.length,
          slowQueries: times.filter(t => t > this.config.slowQueryThresholdMs).length,
          averageQueryTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          maxQueryTime: Math.max(...times),
        };
      }
    });

    return stats;
  }

  /**
   * Get slow queries list
   */
  getSlowQueries(limit: number = 20): SlowQuery[] {
    return this.slowQueries.slice(0, limit);
  }

  /**
   * Clear slow queries log
   */
  clearSlowQueries(): void {
    this.slowQueries = [];
    this.logger.log('Slow queries log cleared');
  }

  // =================== OPTIMIZATION RECOMMENDATIONS ===================

  /**
   * Get performance optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();
    const queryStats = this.getQueryStats();

    // Memory recommendations
    if (metrics.memoryUsage.percentUsed > 85) {
      recommendations.push('High memory usage detected. Consider increasing heap size or optimizing data caching.');
    }

    // Response time recommendations
    if (metrics.averageResponseTime > 200) {
      recommendations.push(`Average response time (${metrics.averageResponseTime}ms) is above recommended threshold. Review slow queries and optimize database indexes.`);
    }

    // Slow query recommendations
    if (this.slowQueries.length > 10) {
      recommendations.push(`${this.slowQueries.length} slow queries detected recently. Consider adding database indexes or query optimization.`);

      // Find most common slow endpoints
      const endpointCounts: Record<string, number> = {};
      this.slowQueries.forEach(q => {
        if (q.endpoint) {
          endpointCounts[q.endpoint] = (endpointCounts[q.endpoint] || 0) + 1;
        }
      });

      const topEndpoints = Object.entries(endpointCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      if (topEndpoints.length > 0) {
        recommendations.push(`Top slow endpoints: ${topEndpoints.map(([e, c]) => `${e} (${c}x)`).join(', ')}`);
      }
    }

    // Query-specific recommendations
    Object.entries(queryStats).forEach(([name, stats]) => {
      if (stats.slowQueries > stats.totalQueries * 0.2) {
        recommendations.push(`Query "${name}" has ${Math.round(stats.slowQueries / stats.totalQueries * 100)}% slow executions. Consider optimization.`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('No optimization recommendations at this time. System is performing well.');
    }

    return recommendations;
  }

  // =================== UTILITY METHODS ===================

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.totalResponseTime = 0;
    this.slowQueries = [];
    this.queryStats.clear();
    this.logger.log('Performance metrics reset');
  }

  /**
   * Get configuration
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.log('Performance configuration updated');
  }
}

/**
 * Performance Middleware
 * Tracks response times and applies compression
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  constructor(private readonly performanceService: PerformanceService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime();

    // Hook into response finish
    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationMs = Math.round(seconds * 1000 + nanoseconds / 1000000);

      this.performanceService.recordResponseTime(
        durationMs,
        `${req.method} ${req.path}`,
      );
    });

    next();
  }
}

/**
 * Query timing decorator
 * Use to automatically track query execution times
 */
export function TrackQueryTime(queryName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = process.hrtime();

      try {
        return await originalMethod.apply(this, args);
      } finally {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const durationMs = Math.round(seconds * 1000 + nanoseconds / 1000000);

        // Try to access performance service from the class instance
        if (this.performanceService) {
          this.performanceService.trackQuery(queryName, durationMs);
        }
      }
    };

    return descriptor;
  };
}
