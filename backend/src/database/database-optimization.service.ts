import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface QueryAnalysis {
  query: string;
  executionTime: number;
  rowsExamined: number;
  rowsReturned: number;
  indexUsed: string | null;
  suggestion: string | null;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  estimatedImprovement: string;
}

export interface DatabaseStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  totalQueries: number;
  slowQueries: number;
  cacheHitRatio: number;
  databaseSize: string;
  tableStats: TableStats[];
}

export interface TableStats {
  name: string;
  rowCount: number;
  sizeBytes: number;
  indexCount: number;
  lastVacuum: Date | null;
  lastAnalyze: Date | null;
}

export interface SlowQuery {
  query: string;
  calls: number;
  totalTime: number;
  avgTime: number;
  maxTime: number;
  rows: number;
}

@Injectable()
export class DatabaseOptimizationService {
  private readonly logger = new Logger(DatabaseOptimizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    this.logger.log('Fetching database statistics');

    try {
      // Get connection stats
      const connectionStats = await this.prisma.$queryRaw<{ count: string }[]>`
        SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()
      `;

      const activeConnections = await this.prisma.$queryRaw<{ count: string }[]>`
        SELECT count(*) FROM pg_stat_activity
        WHERE datname = current_database() AND state = 'active'
      `;

      const idleConnections = await this.prisma.$queryRaw<{ count: string }[]>`
        SELECT count(*) FROM pg_stat_activity
        WHERE datname = current_database() AND state = 'idle'
      `;

      // Get database size
      const dbSize = await this.prisma.$queryRaw<{ pg_size_pretty: string }[]>`
        SELECT pg_size_pretty(pg_database_size(current_database()))
      `;

      // Get cache hit ratio
      const cacheStats = await this.prisma.$queryRaw<{ ratio: number }[]>`
        SELECT
          CASE WHEN sum(blks_hit) + sum(blks_read) > 0
            THEN round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2)
            ELSE 100
          END as ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `;

      // Get table statistics
      const tableStats = await this.getTableStats();

      return {
        totalConnections: parseInt(connectionStats[0]?.count || '0'),
        activeConnections: parseInt(activeConnections[0]?.count || '0'),
        idleConnections: parseInt(idleConnections[0]?.count || '0'),
        totalQueries: 0, // Would need pg_stat_statements extension
        slowQueries: 0,
        cacheHitRatio: cacheStats[0]?.ratio || 100,
        databaseSize: dbSize[0]?.pg_size_pretty || 'Unknown',
        tableStats,
      };
    } catch (error) {
      this.logger.error(`Failed to get database stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get table-level statistics
   */
  async getTableStats(): Promise<TableStats[]> {
    try {
      const stats = await this.prisma.$queryRaw<{
        tablename: string;
        n_live_tup: string;
        pg_total_relation_size: string;
        idx_count: string;
        last_vacuum: Date | null;
        last_analyze: Date | null;
      }[]>`
        SELECT
          c.relname as tablename,
          s.n_live_tup::text,
          pg_total_relation_size(c.oid)::text as pg_total_relation_size,
          (SELECT count(*) FROM pg_indexes WHERE tablename = c.relname)::text as idx_count,
          s.last_vacuum,
          s.last_analyze
        FROM pg_class c
        JOIN pg_stat_user_tables s ON c.relname = s.relname
        WHERE c.relkind = 'r' AND c.relnamespace = (
          SELECT oid FROM pg_namespace WHERE nspname = 'public'
        )
        ORDER BY pg_total_relation_size(c.oid) DESC
        LIMIT 20
      `;

      return stats.map(s => ({
        name: s.tablename,
        rowCount: parseInt(s.n_live_tup || '0'),
        sizeBytes: parseInt(s.pg_total_relation_size || '0'),
        indexCount: parseInt(s.idx_count || '0'),
        lastVacuum: s.last_vacuum,
        lastAnalyze: s.last_analyze,
      }));
    } catch (error) {
      this.logger.warn(`Could not fetch table stats: ${error.message}`);
      return [];
    }
  }

  /**
   * Get slow queries (requires pg_stat_statements extension)
   */
  async getSlowQueries(limit: number = 10): Promise<SlowQuery[]> {
    try {
      const queries = await this.prisma.$queryRaw<SlowQuery[]>`
        SELECT
          query,
          calls::int,
          round(total_exec_time::numeric, 2) as "totalTime",
          round((total_exec_time / calls)::numeric, 2) as "avgTime",
          round(max_exec_time::numeric, 2) as "maxTime",
          rows::int
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        ORDER BY total_exec_time DESC
        LIMIT ${limit}
      `;
      return queries;
    } catch (error) {
      this.logger.warn(`pg_stat_statements not available: ${error.message}`);
      return [];
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsage(): Promise<{
    tableName: string;
    indexName: string;
    indexScans: number;
    rowsRead: number;
    rowsFetched: number;
    sizeBytes: number;
  }[]> {
    try {
      const usage = await this.prisma.$queryRaw<{
        relname: string;
        indexrelname: string;
        idx_scan: string;
        idx_tup_read: string;
        idx_tup_fetch: string;
        pg_relation_size: string;
      }[]>`
        SELECT
          s.relname,
          s.indexrelname,
          s.idx_scan::text,
          s.idx_tup_read::text,
          s.idx_tup_fetch::text,
          pg_relation_size(i.indexrelid)::text as pg_relation_size
        FROM pg_stat_user_indexes s
        JOIN pg_index i ON s.indexrelid = i.indexrelid
        WHERE s.schemaname = 'public'
        ORDER BY s.idx_scan DESC
        LIMIT 50
      `;

      return usage.map(u => ({
        tableName: u.relname,
        indexName: u.indexrelname,
        indexScans: parseInt(u.idx_scan || '0'),
        rowsRead: parseInt(u.idx_tup_read || '0'),
        rowsFetched: parseInt(u.idx_tup_fetch || '0'),
        sizeBytes: parseInt(u.pg_relation_size || '0'),
      }));
    } catch (error) {
      this.logger.warn(`Could not fetch index usage: ${error.message}`);
      return [];
    }
  }

  /**
   * Get unused indexes
   */
  async getUnusedIndexes(): Promise<{
    tableName: string;
    indexName: string;
    sizeBytes: number;
    recommendation: string;
  }[]> {
    try {
      const unused = await this.prisma.$queryRaw<{
        relname: string;
        indexrelname: string;
        pg_relation_size: string;
      }[]>`
        SELECT
          s.relname,
          s.indexrelname,
          pg_relation_size(i.indexrelid)::text as pg_relation_size
        FROM pg_stat_user_indexes s
        JOIN pg_index i ON s.indexrelid = i.indexrelid
        WHERE s.idx_scan = 0
          AND s.schemaname = 'public'
          AND NOT i.indisprimary
          AND NOT i.indisunique
        ORDER BY pg_relation_size(i.indexrelid) DESC
      `;

      return unused.map(u => ({
        tableName: u.relname,
        indexName: u.indexrelname,
        sizeBytes: parseInt(u.pg_relation_size || '0'),
        recommendation: 'Consider dropping this unused index to save space and improve write performance',
      }));
    } catch (error) {
      this.logger.warn(`Could not fetch unused indexes: ${error.message}`);
      return [];
    }
  }

  /**
   * Get missing index recommendations based on sequential scans
   */
  async getMissingIndexRecommendations(): Promise<IndexRecommendation[]> {
    try {
      const seqScans = await this.prisma.$queryRaw<{
        relname: string;
        seq_scan: string;
        seq_tup_read: string;
        idx_scan: string;
      }[]>`
        SELECT
          relname,
          seq_scan::text,
          seq_tup_read::text,
          idx_scan::text
        FROM pg_stat_user_tables
        WHERE seq_scan > 100
          AND seq_tup_read > 10000
          AND (idx_scan IS NULL OR seq_scan > idx_scan * 10)
        ORDER BY seq_tup_read DESC
        LIMIT 10
      `;

      return seqScans.map(t => ({
        table: t.relname,
        columns: ['Analyze query patterns to determine optimal columns'],
        reason: `High sequential scans (${t.seq_scan}) vs index scans (${t.idx_scan || 0})`,
        estimatedImprovement: 'Could reduce query time by 50-90%',
      }));
    } catch (error) {
      this.logger.warn(`Could not get missing index recommendations: ${error.message}`);
      return [];
    }
  }

  /**
   * Run VACUUM ANALYZE on specified table or all tables
   */
  async runVacuumAnalyze(tableName?: string): Promise<{ success: boolean; message: string }> {
    try {
      if (tableName) {
        // Sanitize table name to prevent SQL injection
        const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE "${safeTableName}"`);
        this.logger.log(`VACUUM ANALYZE completed for table: ${safeTableName}`);
        return { success: true, message: `VACUUM ANALYZE completed for ${safeTableName}` };
      } else {
        await this.prisma.$executeRaw`VACUUM ANALYZE`;
        this.logger.log('VACUUM ANALYZE completed for all tables');
        return { success: true, message: 'VACUUM ANALYZE completed for all tables' };
      }
    } catch (error) {
      this.logger.error(`VACUUM ANALYZE failed: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get database health summary
   */
  async getHealthSummary(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const stats = await this.getDatabaseStats();

      // Check cache hit ratio
      if (stats.cacheHitRatio < 90) {
        issues.push(`Low cache hit ratio: ${stats.cacheHitRatio}%`);
        recommendations.push('Consider increasing shared_buffers in PostgreSQL configuration');
      }

      // Check for tables needing vacuum
      const needsVacuum = stats.tableStats.filter(t => {
        if (!t.lastVacuum) return t.rowCount > 1000;
        const daysSinceVacuum = (Date.now() - t.lastVacuum.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceVacuum > 7 && t.rowCount > 10000;
      });

      if (needsVacuum.length > 0) {
        issues.push(`${needsVacuum.length} tables need VACUUM`);
        recommendations.push(`Run VACUUM ANALYZE on: ${needsVacuum.map(t => t.name).join(', ')}`);
      }

      // Check unused indexes
      const unusedIndexes = await this.getUnusedIndexes();
      if (unusedIndexes.length > 5) {
        issues.push(`${unusedIndexes.length} unused indexes found`);
        recommendations.push('Review and consider dropping unused indexes');
      }

      // Check missing indexes
      const missingIndexes = await this.getMissingIndexRecommendations();
      if (missingIndexes.length > 0) {
        issues.push(`${missingIndexes.length} tables may benefit from additional indexes`);
        recommendations.push('Analyze query patterns and add appropriate indexes');
      }

      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (issues.length > 3 || stats.cacheHitRatio < 80) {
        status = 'critical';
      } else if (issues.length > 0) {
        status = 'warning';
      }

      return { status, issues, recommendations };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return {
        status: 'critical',
        issues: [`Health check failed: ${error.message}`],
        recommendations: ['Check database connectivity and permissions'],
      };
    }
  }

  /**
   * Optimize connection pool settings
   */
  getConnectionPoolRecommendations(currentConnections: number): {
    minPoolSize: number;
    maxPoolSize: number;
    idleTimeout: number;
    connectionTimeout: number;
  } {
    // Based on PostgreSQL best practices and the formula:
    // connections = ((core_count * 2) + effective_spindle_count)
    // For cloud environments, typically 20-50 connections per instance

    const baseConnections = Math.max(10, currentConnections);
    const cpuCount = 4; // Assuming CX31 has 4 vCPUs

    return {
      minPoolSize: Math.min(5, baseConnections),
      maxPoolSize: Math.min(50, cpuCount * 2 + 4),
      idleTimeout: 30000, // 30 seconds
      connectionTimeout: 10000, // 10 seconds
    };
  }
}
