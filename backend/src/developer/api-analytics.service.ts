import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * API Analytics Service
 * Track and analyze API usage patterns
 *
 * Features:
 * - Request tracking
 * - Usage metrics
 * - Endpoint analytics
 * - Error tracking
 * - Performance monitoring
 */

// =================== TYPES ===================

export interface APIRequest {
  id: string;
  tenantId: string;
  apiKeyId?: string;
  userId?: string;
  method: string;
  endpoint: string;
  statusCode: number;
  duration: number;
  requestSize: number;
  responseSize: number;
  userAgent?: string;
  ipAddress?: string;
  country?: string;
  error?: string;
  timestamp: Date;
}

export interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  totalDataTransferred: number;
  uniqueEndpoints: number;
  uniqueUsers: number;
}

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  errorRate: number;
  topErrors: Array<{ error: string; count: number }>;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCode: Record<number, number>;
  errorsByEndpoint: Record<string, number>;
  topErrors: Array<{ message: string; count: number; lastOccurrence: Date }>;
}

export interface APIKeyUsage {
  apiKeyId: string;
  apiKeyName: string;
  totalRequests: number;
  successRate: number;
  lastUsed?: Date;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

// =================== SERVICE ===================

@Injectable()
export class APIAnalyticsService {
  private readonly logger = new Logger(APIAnalyticsService.name);

  // Storage
  private requests: APIRequest[] = [];

  // Limits
  private readonly maxStoredRequests = 100000;
  private readonly retentionDays = 30;

  constructor(private eventEmitter: EventEmitter2) {
    // Cleanup old data periodically
    setInterval(() => this.cleanupOldData(), 60 * 60 * 1000); // Every hour
  }

  // =================== REQUEST TRACKING ===================

  async trackRequest(request: Omit<APIRequest, 'id' | 'timestamp'>): Promise<void> {
    const fullRequest: APIRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...request,
    };

    this.requests.push(fullRequest);

    // Enforce storage limit
    if (this.requests.length > this.maxStoredRequests) {
      this.requests = this.requests.slice(-this.maxStoredRequests);
    }

    // Emit event for real-time monitoring
    this.eventEmitter.emit('api.request.tracked', { request: fullRequest });
  }

  // =================== USAGE METRICS ===================

  async getUsageMetrics(filters?: {
    tenantId?: string;
    apiKeyId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<UsageMetrics> {
    let requests = this.filterRequests(filters);

    const successful = requests.filter(r => r.statusCode >= 200 && r.statusCode < 400);
    const failed = requests.filter(r => r.statusCode >= 400);
    const latencies = requests.map(r => r.duration).sort((a, b) => a - b);

    return {
      totalRequests: requests.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageLatency: this.calculateAverage(latencies),
      p50Latency: this.calculatePercentile(latencies, 50),
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      totalDataTransferred: requests.reduce((sum, r) => sum + r.requestSize + r.responseSize, 0),
      uniqueEndpoints: new Set(requests.map(r => r.endpoint)).size,
      uniqueUsers: new Set(requests.filter(r => r.userId).map(r => r.userId)).size,
    };
  }

  async getUsageOverTime(params: {
    tenantId?: string;
    apiKeyId?: string;
    period: 'hour' | 'day' | 'week' | 'month';
    metric: 'requests' | 'latency' | 'errors' | 'data_transfer';
    startDate?: Date;
    endDate?: Date;
  }): Promise<TimeSeriesDataPoint[]> {
    let requests = this.filterRequests({
      tenantId: params.tenantId,
      apiKeyId: params.apiKeyId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const buckets = this.groupByPeriod(requests, params.period);
    const dataPoints: TimeSeriesDataPoint[] = [];

    for (const [timestamp, bucketRequests] of Object.entries(buckets)) {
      let value: number;

      switch (params.metric) {
        case 'requests':
          value = bucketRequests.length;
          break;
        case 'latency':
          value = this.calculateAverage(bucketRequests.map(r => r.duration));
          break;
        case 'errors':
          value = bucketRequests.filter(r => r.statusCode >= 400).length;
          break;
        case 'data_transfer':
          value = bucketRequests.reduce((sum, r) => sum + r.requestSize + r.responseSize, 0);
          break;
      }

      dataPoints.push({ timestamp: new Date(timestamp), value });
    }

    return dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // =================== ENDPOINT ANALYTICS ===================

  async getEndpointMetrics(filters?: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<EndpointMetrics[]> {
    let requests = this.filterRequests(filters);

    const endpointGroups = new Map<string, APIRequest[]>();
    for (const request of requests) {
      const key = `${request.method} ${request.endpoint}`;
      const group = endpointGroups.get(key) || [];
      group.push(request);
      endpointGroups.set(key, group);
    }

    const metrics: EndpointMetrics[] = [];
    for (const [key, groupRequests] of endpointGroups) {
      const [method, ...endpointParts] = key.split(' ');
      const endpoint = endpointParts.join(' ');
      const successful = groupRequests.filter(r => r.statusCode >= 200 && r.statusCode < 400);
      const failed = groupRequests.filter(r => r.statusCode >= 400);

      // Count errors
      const errorCounts = new Map<string, number>();
      for (const req of failed) {
        if (req.error) {
          errorCounts.set(req.error, (errorCounts.get(req.error) || 0) + 1);
        }
      }

      const topErrors = Array.from(errorCounts.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      metrics.push({
        endpoint,
        method,
        totalRequests: groupRequests.length,
        successRate: groupRequests.length > 0
          ? Math.round((successful.length / groupRequests.length) * 100)
          : 0,
        averageLatency: Math.round(this.calculateAverage(groupRequests.map(r => r.duration))),
        errorRate: groupRequests.length > 0
          ? Math.round((failed.length / groupRequests.length) * 100)
          : 0,
        topErrors,
      });
    }

    return metrics
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, filters?.limit || 20);
  }

  async getTopEndpoints(params: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy: 'requests' | 'latency' | 'errors';
    limit?: number;
  }): Promise<Array<{ endpoint: string; method: string; value: number }>> {
    const metrics = await this.getEndpointMetrics({
      tenantId: params.tenantId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const sorted = metrics.sort((a, b) => {
      switch (params.sortBy) {
        case 'requests':
          return b.totalRequests - a.totalRequests;
        case 'latency':
          return b.averageLatency - a.averageLatency;
        case 'errors':
          return b.errorRate - a.errorRate;
        default:
          return 0;
      }
    });

    return sorted.slice(0, params.limit || 10).map(m => ({
      endpoint: m.endpoint,
      method: m.method,
      value: params.sortBy === 'requests' ? m.totalRequests
        : params.sortBy === 'latency' ? m.averageLatency
        : m.errorRate,
    }));
  }

  // =================== ERROR TRACKING ===================

  async getErrorMetrics(filters?: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ErrorMetrics> {
    let requests = this.filterRequests(filters);
    const errors = requests.filter(r => r.statusCode >= 400);

    const errorsByCode: Record<number, number> = {};
    const errorsByEndpoint: Record<string, number> = {};
    const errorMessages = new Map<string, { count: number; lastOccurrence: Date }>();

    for (const request of errors) {
      // By status code
      errorsByCode[request.statusCode] = (errorsByCode[request.statusCode] || 0) + 1;

      // By endpoint
      errorsByEndpoint[request.endpoint] = (errorsByEndpoint[request.endpoint] || 0) + 1;

      // By error message
      if (request.error) {
        const existing = errorMessages.get(request.error) || { count: 0, lastOccurrence: new Date(0) };
        existing.count++;
        if (request.timestamp > existing.lastOccurrence) {
          existing.lastOccurrence = request.timestamp;
        }
        errorMessages.set(request.error, existing);
      }
    }

    const topErrors = Array.from(errorMessages.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: errors.length,
      errorsByCode,
      errorsByEndpoint,
      topErrors,
    };
  }

  // =================== API KEY USAGE ===================

  async getAPIKeyUsage(params: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<APIKeyUsage[]> {
    let requests = this.filterRequests({
      tenantId: params.tenantId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    // Filter requests with API keys
    requests = requests.filter(r => r.apiKeyId);

    // Group by API key
    const keyGroups = new Map<string, APIRequest[]>();
    for (const request of requests) {
      if (request.apiKeyId) {
        const group = keyGroups.get(request.apiKeyId) || [];
        group.push(request);
        keyGroups.set(request.apiKeyId, group);
      }
    }

    const usage: APIKeyUsage[] = [];
    for (const [apiKeyId, keyRequests] of keyGroups) {
      const successful = keyRequests.filter(r => r.statusCode >= 200 && r.statusCode < 400);

      // Count endpoints
      const endpointCounts = new Map<string, number>();
      for (const req of keyRequests) {
        endpointCounts.set(req.endpoint, (endpointCounts.get(req.endpoint) || 0) + 1);
      }

      const topEndpoints = Array.from(endpointCounts.entries())
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const lastUsed = keyRequests.length > 0
        ? keyRequests.reduce((latest, r) => r.timestamp > latest ? r.timestamp : latest, keyRequests[0].timestamp)
        : undefined;

      usage.push({
        apiKeyId,
        apiKeyName: `Key ${apiKeyId.substring(0, 8)}...`,
        totalRequests: keyRequests.length,
        successRate: keyRequests.length > 0
          ? Math.round((successful.length / keyRequests.length) * 100)
          : 0,
        lastUsed,
        topEndpoints,
      });
    }

    return usage
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, params.limit || 10);
  }

  // =================== GEOGRAPHIC ANALYTICS ===================

  async getGeographicMetrics(filters?: {
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Array<{ country: string; requests: number; percentage: number }>> {
    let requests = this.filterRequests(filters);
    const requestsWithCountry = requests.filter(r => r.country);

    const countryGroups = new Map<string, number>();
    for (const request of requestsWithCountry) {
      if (request.country) {
        countryGroups.set(request.country, (countryGroups.get(request.country) || 0) + 1);
      }
    }

    const total = requestsWithCountry.length;

    return Array.from(countryGroups.entries())
      .map(([country, count]) => ({
        country,
        requests: count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 20);
  }

  // =================== REAL-TIME METRICS ===================

  async getRealTimeMetrics(tenantId?: string): Promise<{
    requestsPerMinute: number;
    averageLatency: number;
    errorRate: number;
    activeEndpoints: number;
    recentErrors: Array<{ endpoint: string; error: string; timestamp: Date }>;
  }> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    let requests = this.filterRequests({
      tenantId,
      startDate: fiveMinutesAgo,
      endDate: now,
    });

    const lastMinuteRequests = requests.filter(r => r.timestamp >= oneMinuteAgo);
    const errors = requests.filter(r => r.statusCode >= 400);

    const recentErrors = errors
      .slice(-5)
      .map(r => ({
        endpoint: r.endpoint,
        error: r.error || `HTTP ${r.statusCode}`,
        timestamp: r.timestamp,
      }))
      .reverse();

    return {
      requestsPerMinute: lastMinuteRequests.length,
      averageLatency: Math.round(this.calculateAverage(requests.map(r => r.duration))),
      errorRate: requests.length > 0
        ? Math.round((errors.length / requests.length) * 100)
        : 0,
      activeEndpoints: new Set(requests.map(r => r.endpoint)).size,
      recentErrors,
    };
  }

  // =================== HELPERS ===================

  private filterRequests(filters?: {
    tenantId?: string;
    apiKeyId?: string;
    startDate?: Date;
    endDate?: Date;
  }): APIRequest[] {
    let requests = [...this.requests];

    if (filters?.tenantId) {
      requests = requests.filter(r => r.tenantId === filters.tenantId);
    }
    if (filters?.apiKeyId) {
      requests = requests.filter(r => r.apiKeyId === filters.apiKeyId);
    }
    if (filters?.startDate) {
      requests = requests.filter(r => r.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      requests = requests.filter(r => r.timestamp <= filters.endDate!);
    }

    return requests;
  }

  private groupByPeriod(
    requests: APIRequest[],
    period: 'hour' | 'day' | 'week' | 'month',
  ): Record<string, APIRequest[]> {
    const buckets: Record<string, APIRequest[]> = {};

    for (const request of requests) {
      let bucketKey: string;
      const date = new Date(request.timestamp);

      switch (period) {
        case 'hour':
          date.setMinutes(0, 0, 0);
          bucketKey = date.toISOString();
          break;
        case 'day':
          date.setHours(0, 0, 0, 0);
          bucketKey = date.toISOString();
          break;
        case 'week':
          const dayOfWeek = date.getDay();
          date.setDate(date.getDate() - dayOfWeek);
          date.setHours(0, 0, 0, 0);
          bucketKey = date.toISOString();
          break;
        case 'month':
          date.setDate(1);
          date.setHours(0, 0, 0, 0);
          bucketKey = date.toISOString();
          break;
      }

      if (!buckets[bucketKey]) {
        buckets[bucketKey] = [];
      }
      buckets[bucketKey].push(request);
    }

    return buckets;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const before = this.requests.length;
    this.requests = this.requests.filter(r => r.timestamp >= cutoff);
    const after = this.requests.length;

    if (before !== after) {
      this.logger.debug(`Cleaned up ${before - after} old API requests`);
    }
  }

  // =================== EXPORT ===================

  async exportAnalytics(params: {
    tenantId?: string;
    startDate: Date;
    endDate: Date;
    format: 'json' | 'csv';
  }): Promise<{ data: string; filename: string }> {
    const requests = this.filterRequests({
      tenantId: params.tenantId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const filename = `api-analytics-${params.startDate.toISOString().split('T')[0]}-${params.endDate.toISOString().split('T')[0]}`;

    if (params.format === 'json') {
      return {
        data: JSON.stringify(requests, null, 2),
        filename: `${filename}.json`,
      };
    } else {
      // CSV format
      const headers = ['id', 'timestamp', 'method', 'endpoint', 'statusCode', 'duration', 'requestSize', 'responseSize'];
      const rows = requests.map(r =>
        [r.id, r.timestamp.toISOString(), r.method, r.endpoint, r.statusCode, r.duration, r.requestSize, r.responseSize].join(','),
      );
      return {
        data: [headers.join(','), ...rows].join('\n'),
        filename: `${filename}.csv`,
      };
    }
  }
}
