import { Controller, Get, Post, Delete, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MigrationImportService } from './migration-import.service';
import { MigrationEntity, RowStatus } from './migration.validators';

class StageDto {
  format: 'csv' | 'xml';
  content: string;
  entityType?: MigrationEntity;
  sourceType?: string;
}

/**
 * Data-migration studio — import/staging (DOC-46-1/46-3).
 * Base path: /api/v1/migration
 */
@Controller('migration')
export class MigrationImportController {
  constructor(private readonly migration: MigrationImportService) {}

  private orgId(req: any): string {
    return req?.headers?.['x-organization-id'] || req?.user?.organizationId || 'demo-org';
  }
  private userId(req: any): string {
    return req?.user?.sub || req?.user?.id || 'demo-user';
  }

  /** Parse + validate a SAGA export into a staging batch (no live writes). */
  @Post('import')
  @UseGuards(JwtAuthGuard)
  stage(@Request() req: any, @Body() dto: StageDto) {
    return this.migration.stage(this.orgId(req), dto);
  }

  /** Staged rows for a batch (optionally filtered by status). */
  @Get('batches/:batchId')
  @UseGuards(JwtAuthGuard)
  getStaging(@Request() req: any, @Param('batchId') batchId: string, @Query('status') status?: RowStatus) {
    return this.migration.getStaging(this.orgId(req), batchId, status);
  }

  /** Dry-run reconciliation (counts, invoice control total, error samples). */
  @Get('batches/:batchId/dry-run')
  @UseGuards(JwtAuthGuard)
  dryRun(@Request() req: any, @Param('batchId') batchId: string) {
    return this.migration.dryRun(this.orgId(req), batchId);
  }

  /** SAF-T re-validation of migrated master data (DOC-46-4). */
  @Get('batches/:batchId/saft-check')
  @UseGuards(JwtAuthGuard)
  saftCheck(@Request() req: any, @Param('batchId') batchId: string) {
    return this.migration.saftCheck(this.orgId(req), batchId);
  }

  /** Commit a reviewed batch to live master data (DOC-46-3). */
  @Post('batches/:batchId/commit')
  @UseGuards(JwtAuthGuard)
  commit(@Request() req: any, @Param('batchId') batchId: string) {
    return this.migration.commitBatch(this.orgId(req), this.userId(req), batchId);
  }

  @Delete('batches/:batchId')
  @UseGuards(JwtAuthGuard)
  discard(@Request() req: any, @Param('batchId') batchId: string) {
    return this.migration.discardBatch(this.orgId(req), batchId);
  }
}
