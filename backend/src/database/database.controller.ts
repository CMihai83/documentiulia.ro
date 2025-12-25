import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('database')
export class DatabaseController {
  private readonly logger = new Logger(DatabaseController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async getHealth() {
    const health = await this.prisma.healthCheck();
    return {
      database: health,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  async getStats() {
    const [tables, indexes, unusedIndexes] = await Promise.all([
      this.prisma.getTableStats(),
      this.prisma.getIndexStats(),
      this.prisma.getUnusedIndexes(),
    ]);

    const totalSize = tables.reduce((sum, t) => sum + t.sizeBytes, 0);
    const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);

    return {
      summary: {
        totalTables: tables.length,
        totalRows,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
        queryCount: this.prisma.getQueryCount(),
        unusedIndexCount: unusedIndexes.length,
      },
      tables: tables.slice(0, 10).map((t) => ({
        ...t,
        sizeMB: Math.round(t.sizeBytes / 1024 / 1024 * 100) / 100,
      })),
      topIndexes: indexes.slice(0, 10),
      unusedIndexes: unusedIndexes.slice(0, 10),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('tables')
  async getTableStats() {
    const tables = await this.prisma.getTableStats();
    return {
      tables: tables.map((t) => ({
        ...t,
        sizeMB: Math.round(t.sizeBytes / 1024 / 1024 * 100) / 100,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('indexes')
  async getIndexStats() {
    const indexes = await this.prisma.getIndexStats();
    return {
      indexes: indexes.map((i) => ({
        ...i,
        sizeMB: Math.round(i.sizeBytes / 1024 / 1024 * 100) / 100,
      })),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('indexes/unused')
  async getUnusedIndexes() {
    const indexes = await this.prisma.getUnusedIndexes();
    return {
      unusedIndexes: indexes,
      count: indexes.length,
      recommendation: indexes.length > 0
        ? 'Consider dropping unused indexes to improve write performance'
        : 'No unused indexes found',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('queries/count')
  getQueryCount() {
    return {
      count: this.prisma.getQueryCount(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('queries/reset')
  @HttpCode(HttpStatus.OK)
  resetQueryCount() {
    this.prisma.resetQueryCount();
    return {
      message: 'Query count reset',
      count: 0,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('maintenance/vacuum')
  @HttpCode(HttpStatus.OK)
  async vacuum() {
    this.logger.log('Starting VACUUM ANALYZE...');
    await this.prisma.vacuum();
    return {
      message: 'VACUUM ANALYZE completed',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('maintenance/vacuum/:table')
  @HttpCode(HttpStatus.OK)
  async vacuumTable(@Param('table') table: string) {
    this.logger.log(`Starting VACUUM ANALYZE for ${table}...`);
    await this.prisma.vacuum(table);
    return {
      message: `VACUUM ANALYZE completed for ${table}`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('maintenance/reindex/:table')
  @HttpCode(HttpStatus.OK)
  async reindexTable(@Param('table') table: string) {
    this.logger.log(`Starting REINDEX for ${table}...`);
    await this.prisma.reindex(table);
    return {
      message: `REINDEX completed for ${table}`,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('recommendations')
  async getRecommendations() {
    const [tables, indexes, unusedIndexes] = await Promise.all([
      this.prisma.getTableStats(),
      this.prisma.getIndexStats(),
      this.prisma.getUnusedIndexes(),
    ]);

    const recommendations: string[] = [];

    // Check for large tables that might need partitioning
    const largeTables = tables.filter((t) => t.rowCount > 100000);
    if (largeTables.length > 0) {
      recommendations.push(
        `Consider partitioning these large tables: ${largeTables.map((t) => t.table).join(', ')}`,
      );
    }

    // Check for unused indexes
    if (unusedIndexes.length > 5) {
      recommendations.push(
        `Found ${unusedIndexes.length} unused indexes. Consider dropping them to improve write performance.`,
      );
    }

    // Check for tables without recent vacuum
    recommendations.push(
      'Run VACUUM ANALYZE periodically to update statistics and reclaim space.',
    );

    // Index suggestions based on common query patterns
    const indexSuggestions = [
      'Ensure composite indexes match query WHERE clause order',
      'Consider covering indexes for frequently accessed columns',
      'Monitor slow query logs for optimization opportunities',
    ];

    return {
      recommendations,
      indexSuggestions,
      performanceTips: [
        'Use connection pooling (PgBouncer) for high-concurrency workloads',
        'Enable statement_timeout to prevent long-running queries',
        'Consider read replicas for read-heavy workloads',
        'Use EXPLAIN ANALYZE to understand query execution plans',
      ],
      timestamp: new Date().toISOString(),
    };
  }
}
