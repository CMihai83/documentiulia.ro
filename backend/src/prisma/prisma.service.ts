import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private queryCount = 0;
  private slowQueryThresholdMs = 100;

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Query performance logging
    (this as any).$on('query', (e: Prisma.QueryEvent) => {
      this.queryCount++;
      if (e.duration > this.slowQueryThresholdMs) {
        this.logger.warn(
          `Slow query detected (${e.duration}ms): ${e.query.substring(0, 200)}...`,
        );
      }
    });

    (this as any).$on('error', (e: Prisma.LogEvent) => {
      this.logger.error(`Database error: ${e.message}`);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  getQueryCount(): number {
    return this.queryCount;
  }

  resetQueryCount(): void {
    this.queryCount = 0;
  }

  setSlowQueryThreshold(ms: number): void {
    this.slowQueryThresholdMs = ms;
  }

  async healthCheck(): Promise<{ status: string; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - start,
      };
    }
  }

  async getTableStats(): Promise<{
    table: string;
    rowCount: number;
    sizeBytes: number;
  }[]> {
    try {
      const result = await this.$queryRaw<
        { table_name: string; row_count: bigint; total_bytes: bigint }[]
      >`
        SELECT
          relname as table_name,
          n_live_tup as row_count,
          pg_total_relation_size(quote_ident(relname)) as total_bytes
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(quote_ident(relname)) DESC
        LIMIT 20
      `;

      return result.map((r) => ({
        table: r.table_name,
        rowCount: Number(r.row_count),
        sizeBytes: Number(r.total_bytes),
      }));
    } catch {
      return [];
    }
  }

  async getIndexStats(): Promise<{
    index: string;
    table: string;
    scans: number;
    sizeBytes: number;
  }[]> {
    try {
      const result = await this.$queryRaw<
        { indexname: string; tablename: string; idx_scan: bigint; index_size: bigint }[]
      >`
        SELECT
          indexrelname as indexname,
          relname as tablename,
          idx_scan,
          pg_relation_size(indexrelid) as index_size
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
        LIMIT 30
      `;

      return result.map((r) => ({
        index: r.indexname,
        table: r.tablename,
        scans: Number(r.idx_scan),
        sizeBytes: Number(r.index_size),
      }));
    } catch {
      return [];
    }
  }

  async getUnusedIndexes(): Promise<{ index: string; table: string }[]> {
    try {
      const result = await this.$queryRaw<
        { indexname: string; tablename: string }[]
      >`
        SELECT
          indexrelname as indexname,
          relname as tablename
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
        AND indexrelname NOT LIKE '%_pkey'
        AND indexrelname NOT LIKE '%_unique%'
      `;

      return result.map((r) => ({
        index: r.indexname,
        table: r.tablename,
      }));
    } catch {
      return [];
    }
  }

  async vacuum(tableName?: string): Promise<void> {
    if (tableName) {
      await this.$executeRawUnsafe(`VACUUM ANALYZE "${tableName}"`);
    } else {
      await this.$executeRaw`VACUUM ANALYZE`;
    }
    this.logger.log(`VACUUM ANALYZE completed${tableName ? ` for ${tableName}` : ''}`);
  }

  async reindex(tableName: string): Promise<void> {
    await this.$executeRawUnsafe(`REINDEX TABLE "${tableName}"`);
    this.logger.log(`REINDEX completed for ${tableName}`);
  }
}
