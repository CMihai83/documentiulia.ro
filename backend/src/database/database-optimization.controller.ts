import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DatabaseOptimizationService } from './database-optimization.service';

@ApiTags('Database Optimization')
@Controller('database')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DatabaseOptimizationController {
  private readonly logger = new Logger(DatabaseOptimizationController.name);

  constructor(
    private readonly optimizationService: DatabaseOptimizationService,
  ) {}

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get database statistics' })
  @ApiResponse({ status: 200, description: 'Database statistics retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getDatabaseStats() {
    this.logger.log('Fetching database statistics');
    return this.optimizationService.getDatabaseStats();
  }

  @Get('health')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get database health summary' })
  @ApiResponse({ status: 200, description: 'Health summary retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHealthSummary() {
    this.logger.log('Fetching database health summary');
    return this.optimizationService.getHealthSummary();
  }

  @Get('indexes/usage')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get index usage statistics' })
  @ApiResponse({ status: 200, description: 'Index usage stats retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getIndexUsage() {
    this.logger.log('Fetching index usage statistics');
    return this.optimizationService.getIndexUsage();
  }

  @Get('indexes/unused')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get unused indexes' })
  @ApiResponse({ status: 200, description: 'Unused indexes retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnusedIndexes() {
    this.logger.log('Fetching unused indexes');
    return this.optimizationService.getUnusedIndexes();
  }

  @Get('indexes/recommendations')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get missing index recommendations' })
  @ApiResponse({ status: 200, description: 'Index recommendations retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMissingIndexRecommendations() {
    this.logger.log('Fetching missing index recommendations');
    return this.optimizationService.getMissingIndexRecommendations();
  }

  @Get('slow-queries')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get slow queries' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Slow queries retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSlowQueries(@Query('limit') limit?: number) {
    this.logger.log('Fetching slow queries');
    return this.optimizationService.getSlowQueries(limit || 10);
  }

  @Post('vacuum-analyze')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Run VACUUM ANALYZE' })
  @ApiQuery({ name: 'table', required: false, type: String })
  @ApiResponse({ status: 200, description: 'VACUUM ANALYZE completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async runVacuumAnalyze(@Query('table') table?: string) {
    this.logger.log(`Running VACUUM ANALYZE${table ? ` for ${table}` : ''}`);
    return this.optimizationService.runVacuumAnalyze(table);
  }

  @Get('pool-recommendations')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get connection pool recommendations' })
  @ApiResponse({ status: 200, description: 'Pool recommendations retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPoolRecommendations() {
    const stats = await this.optimizationService.getDatabaseStats();
    return this.optimizationService.getConnectionPoolRecommendations(
      stats.totalConnections,
    );
  }
}
