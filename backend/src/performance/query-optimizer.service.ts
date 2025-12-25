import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface QueryMetrics {
  queryId: string;
  query: string;
  table: string;
  executionTimeMs: number;
  rowsExamined: number;
  rowsReturned: number;
  indexUsed: boolean;
  indexName?: string;
  timestamp: Date;
  userId?: string;
  tenantId?: string;
}

export interface QueryAnalysis {
  query: string;
  issues: string[];
  suggestions: string[];
  estimatedImprovement: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indexRecommendations: Array<{
    table: string;
    columns: string[];
    reason: string;
  }>;
}

export interface SlowQueryReport {
  period: string;
  totalQueries: number;
  slowQueries: number;
  averageTime: number;
  p95Time: number;
  p99Time: number;
  slowestQueries: QueryMetrics[];
  frequentSlowPatterns: Array<{
    pattern: string;
    count: number;
    avgTime: number;
  }>;
  recommendations: string[];
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  estimatedImpact: 'low' | 'medium' | 'high';
  queryPattern: string;
  createStatement: string;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);

  // In-memory storage for query metrics
  private queryMetrics: QueryMetrics[] = [];
  private readonly maxMetricsStored = 10000;
  private readonly slowQueryThresholdMs = 100;

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleMetrics();
  }

  private initializeSampleMetrics(): void {
    // Generate sample query metrics for demo
    const tables = ['invoices', 'clients', 'payments', 'users', 'audit_log'];
    const now = Date.now();

    for (let i = 0; i < 100; i++) {
      const table = tables[Math.floor(Math.random() * tables.length)];
      const executionTime = Math.random() > 0.9
        ? Math.floor(Math.random() * 2000) + 100  // Slow queries
        : Math.floor(Math.random() * 50);         // Normal queries

      this.queryMetrics.push({
        queryId: `query_${i}`,
        query: this.generateSampleQuery(table),
        table,
        executionTimeMs: executionTime,
        rowsExamined: Math.floor(Math.random() * 10000),
        rowsReturned: Math.floor(Math.random() * 100),
        indexUsed: Math.random() > 0.3,
        indexName: Math.random() > 0.5 ? `idx_${table}_id` : undefined,
        timestamp: new Date(now - Math.floor(Math.random() * 86400000)),
        tenantId: 'tenant_demo',
      });
    }
  }

  private generateSampleQuery(table: string): string {
    const queries = [
      `SELECT * FROM ${table} WHERE id = $1`,
      `SELECT * FROM ${table} WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 100`,
      `SELECT COUNT(*) FROM ${table} WHERE status = $1`,
      `SELECT * FROM ${table} WHERE created_at BETWEEN $1 AND $2`,
      `SELECT ${table}.*, clients.name FROM ${table} JOIN clients ON ${table}.client_id = clients.id`,
    ];
    return queries[Math.floor(Math.random() * queries.length)];
  }

  async recordQuery(metrics: Omit<QueryMetrics, 'queryId' | 'timestamp'>): Promise<void> {
    const queryMetric: QueryMetrics = {
      ...metrics,
      queryId: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.queryMetrics.push(queryMetric);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsStored) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsStored);
    }

    // Emit event for slow queries
    if (metrics.executionTimeMs > this.slowQueryThresholdMs) {
      this.eventEmitter.emit('query.slow', queryMetric);
      this.logger.warn(`Slow query detected: ${metrics.executionTimeMs}ms - ${metrics.query.substring(0, 100)}`);
    }
  }

  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const indexRecommendations: QueryAnalysis['indexRecommendations'] = [];
    let severity: QueryAnalysis['severity'] = 'low';

    const upperQuery = query.toUpperCase();

    // Check for SELECT *
    if (upperQuery.includes('SELECT *')) {
      issues.push('Using SELECT * fetches all columns unnecessarily');
      suggestions.push('Specify only the columns you need');
      severity = 'medium';
    }

    // Check for missing WHERE clause
    if (!upperQuery.includes('WHERE') && !upperQuery.includes('LIMIT')) {
      issues.push('Query without WHERE or LIMIT clause may return too many rows');
      suggestions.push('Add appropriate filtering conditions');
      severity = 'high';
    }

    // Check for LIKE with leading wildcard
    if (upperQuery.includes("LIKE '%") || upperQuery.includes("LIKE $")) {
      issues.push('LIKE with leading wildcard cannot use indexes');
      suggestions.push('Consider full-text search or restructure the query');
      severity = 'medium';
    }

    // Check for NOT IN
    if (upperQuery.includes('NOT IN')) {
      issues.push('NOT IN can be slow with large datasets');
      suggestions.push('Consider using NOT EXISTS or LEFT JOIN with NULL check');
    }

    // Check for ORDER BY without index hint
    if (upperQuery.includes('ORDER BY') && !upperQuery.includes('INDEX')) {
      suggestions.push('Ensure ORDER BY columns are indexed for better performance');
    }

    // Check for JOINs without clear conditions
    if (upperQuery.includes('JOIN') && !upperQuery.includes('ON')) {
      issues.push('JOIN without ON clause may cause cartesian product');
      suggestions.push('Always specify join conditions');
      severity = 'critical';
    }

    // Extract table names for index recommendations
    const tableMatch = upperQuery.match(/FROM\s+(\w+)/);
    if (tableMatch) {
      const table = tableMatch[1].toLowerCase();

      // Recommend indexes based on WHERE clauses
      const whereMatch = upperQuery.match(/WHERE\s+(\w+)\s*=/);
      if (whereMatch) {
        indexRecommendations.push({
          table,
          columns: [whereMatch[1].toLowerCase()],
          reason: `Frequently filtered on ${whereMatch[1]}`,
        });
      }
    }

    return {
      query,
      issues,
      suggestions,
      estimatedImprovement: this.estimateImprovement(issues.length, severity),
      severity,
      indexRecommendations,
    };
  }

  private estimateImprovement(issueCount: number, severity: string): string {
    if (issueCount === 0) return 'Query looks optimized';
    if (severity === 'critical') return 'Potential 10x+ improvement possible';
    if (severity === 'high') return 'Potential 5-10x improvement possible';
    if (severity === 'medium') return 'Potential 2-5x improvement possible';
    return 'Minor optimization possible';
  }

  async getSlowQueryReport(
    tenantId: string,
    period: 'hour' | 'day' | 'week' = 'day',
  ): Promise<SlowQueryReport> {
    const now = Date.now();
    const periodMs = {
      hour: 3600000,
      day: 86400000,
      week: 604800000,
    };

    const cutoff = now - periodMs[period];

    const periodMetrics = this.queryMetrics.filter(m =>
      m.timestamp.getTime() > cutoff &&
      (!tenantId || m.tenantId === tenantId)
    );

    const slowQueries = periodMetrics.filter(m => m.executionTimeMs > this.slowQueryThresholdMs);

    // Calculate statistics
    const executionTimes = periodMetrics.map(m => m.executionTimeMs).sort((a, b) => a - b);
    const averageTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length || 0;
    const p95Index = Math.floor(executionTimes.length * 0.95);
    const p99Index = Math.floor(executionTimes.length * 0.99);

    // Find frequent slow patterns
    const patternCounts = new Map<string, { count: number; totalTime: number }>();
    for (const q of slowQueries) {
      const pattern = this.normalizeQueryPattern(q.query);
      const existing = patternCounts.get(pattern) || { count: 0, totalTime: 0 };
      patternCounts.set(pattern, {
        count: existing.count + 1,
        totalTime: existing.totalTime + q.executionTimeMs,
      });
    }

    const frequentSlowPatterns = Array.from(patternCounts.entries())
      .map(([pattern, stats]) => ({
        pattern,
        count: stats.count,
        avgTime: Math.round(stats.totalTime / stats.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate recommendations
    const recommendations: string[] = [];
    if (slowQueries.length > periodMetrics.length * 0.1) {
      recommendations.push('High percentage of slow queries detected - review database indexes');
    }
    if (slowQueries.some(q => !q.indexUsed)) {
      recommendations.push('Some queries are not using indexes - consider adding appropriate indexes');
    }
    if (slowQueries.some(q => q.rowsExamined > 10000)) {
      recommendations.push('Queries examining large row counts - optimize with better filtering');
    }

    return {
      period,
      totalQueries: periodMetrics.length,
      slowQueries: slowQueries.length,
      averageTime: Math.round(averageTime),
      p95Time: executionTimes[p95Index] || 0,
      p99Time: executionTimes[p99Index] || 0,
      slowestQueries: slowQueries
        .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
        .slice(0, 10),
      frequentSlowPatterns,
      recommendations,
    };
  }

  private normalizeQueryPattern(query: string): string {
    // Normalize query by removing specific values
    return query
      .replace(/\$\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/\d+/g, '?')
      .substring(0, 200);
  }

  async getIndexRecommendations(tenantId: string): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];
    const tableStats = new Map<string, {
      slowQueries: number;
      noIndexQueries: number;
      columns: Map<string, number>;
    }>();

    const tenantMetrics = this.queryMetrics.filter(m =>
      (!tenantId || m.tenantId === tenantId) &&
      m.executionTimeMs > this.slowQueryThresholdMs
    );

    for (const metric of tenantMetrics) {
      const stats = tableStats.get(metric.table) || {
        slowQueries: 0,
        noIndexQueries: 0,
        columns: new Map(),
      };

      stats.slowQueries++;
      if (!metric.indexUsed) {
        stats.noIndexQueries++;
      }

      // Extract columns from WHERE clause
      const whereMatch = metric.query.toUpperCase().match(/WHERE\s+(\w+)/g);
      if (whereMatch) {
        for (const match of whereMatch) {
          const col = match.replace('WHERE ', '').toLowerCase();
          stats.columns.set(col, (stats.columns.get(col) || 0) + 1);
        }
      }

      tableStats.set(metric.table, stats);
    }

    // Generate recommendations based on stats
    for (const [table, stats] of tableStats) {
      if (stats.noIndexQueries > 10) {
        const topColumns = Array.from(stats.columns.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([col]) => col);

        if (topColumns.length > 0) {
          recommendations.push({
            table,
            columns: topColumns,
            estimatedImpact: stats.slowQueries > 50 ? 'high' : stats.slowQueries > 20 ? 'medium' : 'low',
            queryPattern: `Queries filtering on ${topColumns.join(', ')}`,
            createStatement: `CREATE INDEX idx_${table}_${topColumns.join('_')} ON ${table} (${topColumns.join(', ')})`,
          });
        }
      }
    }

    return recommendations.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.estimatedImpact] - impactOrder[b.estimatedImpact];
    });
  }

  async getQueryStats(tenantId: string): Promise<{
    totalQueries: number;
    avgExecutionTime: number;
    slowQueryPercent: number;
    queriesPerMinute: number;
    byTable: Record<string, { count: number; avgTime: number }>;
    byHour: Array<{ hour: number; count: number; avgTime: number }>;
  }> {
    const tenantMetrics = this.queryMetrics.filter(m =>
      !tenantId || m.tenantId === tenantId
    );

    const totalTime = tenantMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0);
    const slowCount = tenantMetrics.filter(m => m.executionTimeMs > this.slowQueryThresholdMs).length;

    // By table
    const byTable: Record<string, { count: number; totalTime: number }> = {};
    for (const m of tenantMetrics) {
      if (!byTable[m.table]) {
        byTable[m.table] = { count: 0, totalTime: 0 };
      }
      byTable[m.table].count++;
      byTable[m.table].totalTime += m.executionTimeMs;
    }

    const byTableWithAvg: Record<string, { count: number; avgTime: number }> = {};
    for (const [table, stats] of Object.entries(byTable)) {
      byTableWithAvg[table] = {
        count: stats.count,
        avgTime: Math.round(stats.totalTime / stats.count),
      };
    }

    // By hour
    const byHourMap = new Map<number, { count: number; totalTime: number }>();
    for (const m of tenantMetrics) {
      const hour = m.timestamp.getHours();
      const existing = byHourMap.get(hour) || { count: 0, totalTime: 0 };
      byHourMap.set(hour, {
        count: existing.count + 1,
        totalTime: existing.totalTime + m.executionTimeMs,
      });
    }

    const byHour = Array.from(byHourMap.entries())
      .map(([hour, stats]) => ({
        hour,
        count: stats.count,
        avgTime: Math.round(stats.totalTime / stats.count),
      }))
      .sort((a, b) => a.hour - b.hour);

    // Calculate queries per minute
    const timeRange = tenantMetrics.length > 0
      ? (Math.max(...tenantMetrics.map(m => m.timestamp.getTime())) -
         Math.min(...tenantMetrics.map(m => m.timestamp.getTime()))) / 60000
      : 1;

    return {
      totalQueries: tenantMetrics.length,
      avgExecutionTime: Math.round(totalTime / tenantMetrics.length || 0),
      slowQueryPercent: Math.round((slowCount / tenantMetrics.length) * 100 || 0),
      queriesPerMinute: Math.round(tenantMetrics.length / timeRange || 0),
      byTable: byTableWithAvg,
      byHour,
    };
  }
}
