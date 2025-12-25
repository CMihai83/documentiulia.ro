import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  BackupRecoveryService,
  BackupType,
  BackupStatus,
  BackupTarget,
  BackupSchedule,
  RetentionPolicy,
  StorageConfig,
  RestoreStatus,
} from './backup-recovery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Backup & Recovery')
@Controller('backup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BackupRecoveryController {
  constructor(private readonly backupService: BackupRecoveryService) {}

  // =================== BACKUP CONFIGS ===================

  @Post('configs')
  @ApiOperation({ summary: 'Create backup configuration' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        type: { type: 'string', enum: ['full', 'incremental', 'differential'] },
        targets: { type: 'array', items: { type: 'string' } },
        createdBy: { type: 'string' },
        schedule: { type: 'object' },
        retention: { type: 'object' },
        storage: { type: 'object' },
        compression: { type: 'boolean' },
        encryption: { type: 'boolean' },
      },
      required: ['tenantId', 'name', 'type', 'targets', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Config created' })
  async createConfig(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('type') type: BackupType,
    @Body('targets') targets: BackupTarget[],
    @Body('createdBy') createdBy: string,
    @Body('schedule') schedule?: BackupSchedule,
    @Body('retention') retention?: Partial<RetentionPolicy>,
    @Body('storage') storage?: Partial<StorageConfig>,
    @Body('compression') compression?: boolean,
    @Body('encryption') encryption?: boolean,
  ) {
    return this.backupService.createBackupConfig(
      tenantId,
      name,
      type,
      targets,
      createdBy,
      { schedule, retention, storage, compression, encryption },
    );
  }

  @Get('configs/:configId')
  @ApiOperation({ summary: 'Get backup config by ID' })
  @ApiResponse({ status: 200, description: 'Config details' })
  async getConfig(@Param('configId') configId: string) {
    const config = await this.backupService.getBackupConfig(configId);
    if (!config) return { error: 'Config not found' };
    return config;
  }

  @Get('configs/tenant/:tenantId')
  @ApiOperation({ summary: 'Get backup configs for tenant' })
  @ApiResponse({ status: 200, description: 'List of configs' })
  async getConfigs(@Param('tenantId') tenantId: string) {
    return { configs: await this.backupService.getBackupConfigs(tenantId) };
  }

  @Put('configs/:configId')
  @ApiOperation({ summary: 'Update backup config' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  async updateConfig(
    @Param('configId') configId: string,
    @Body() updates: Record<string, any>,
  ) {
    const config = await this.backupService.updateBackupConfig(configId, updates);
    if (!config) return { error: 'Config not found' };
    return config;
  }

  @Delete('configs/:configId')
  @ApiOperation({ summary: 'Delete backup config' })
  @ApiResponse({ status: 200, description: 'Config deleted' })
  async deleteConfig(@Param('configId') configId: string) {
    const success = await this.backupService.deleteBackupConfig(configId);
    return { success };
  }

  @Put('configs/:configId/enable')
  @ApiOperation({ summary: 'Enable backup config' })
  @ApiResponse({ status: 200, description: 'Config enabled' })
  async enableConfig(@Param('configId') configId: string) {
    const config = await this.backupService.enableBackupConfig(configId);
    if (!config) return { error: 'Config not found' };
    return config;
  }

  @Put('configs/:configId/disable')
  @ApiOperation({ summary: 'Disable backup config' })
  @ApiResponse({ status: 200, description: 'Config disabled' })
  async disableConfig(@Param('configId') configId: string) {
    const config = await this.backupService.disableBackupConfig(configId);
    if (!config) return { error: 'Config not found' };
    return config;
  }

  // =================== BACKUP JOBS ===================

  @Post('start')
  @ApiOperation({ summary: 'Start backup job' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        configId: { type: 'string' },
        createdBy: { type: 'string' },
        type: { type: 'string' },
        targets: { type: 'array' },
        parentBackupId: { type: 'string' },
      },
      required: ['tenantId', 'configId', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Backup started' })
  async startBackup(
    @Body('tenantId') tenantId: string,
    @Body('configId') configId: string,
    @Body('createdBy') createdBy: string,
    @Body('type') type?: BackupType,
    @Body('targets') targets?: BackupTarget[],
    @Body('parentBackupId') parentBackupId?: string,
  ) {
    try {
      return await this.backupService.startBackup(tenantId, configId, createdBy, {
        type,
        targets,
        parentBackupId,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get backup job by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.backupService.getBackupJob(jobId);
    if (!job) return { error: 'Job not found' };
    return job;
  }

  @Get('jobs/tenant/:tenantId')
  @ApiOperation({ summary: 'Get backup jobs for tenant' })
  @ApiQuery({ name: 'configId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  async getJobs(
    @Param('tenantId') tenantId: string,
    @Query('configId') configId?: string,
    @Query('status') status?: BackupStatus,
    @Query('type') type?: BackupType,
    @Query('limit') limit?: string,
  ) {
    return {
      jobs: await this.backupService.getBackupJobs(tenantId, {
        configId,
        status,
        type,
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  @Post('jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel backup job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  async cancelJob(@Param('jobId') jobId: string) {
    const success = await this.backupService.cancelBackup(jobId);
    return { success };
  }

  @Delete('jobs/:jobId')
  @ApiOperation({ summary: 'Delete backup' })
  @ApiResponse({ status: 200, description: 'Backup deleted' })
  async deleteBackup(@Param('jobId') jobId: string) {
    const success = await this.backupService.deleteBackup(jobId);
    return { success };
  }

  // =================== RESTORE ===================

  @Post('restore/start')
  @ApiOperation({ summary: 'Start restore job' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        backupId: { type: 'string' },
        createdBy: { type: 'string' },
        targets: { type: 'array' },
        pointInTime: { type: 'string' },
      },
      required: ['tenantId', 'backupId', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Restore started' })
  async startRestore(
    @Body('tenantId') tenantId: string,
    @Body('backupId') backupId: string,
    @Body('createdBy') createdBy: string,
    @Body('targets') targets?: BackupTarget[],
    @Body('pointInTime') pointInTime?: string,
  ) {
    try {
      return await this.backupService.startRestore(tenantId, backupId, createdBy, {
        targets,
        pointInTime: pointInTime ? new Date(pointInTime) : undefined,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('restore/jobs/:jobId')
  @ApiOperation({ summary: 'Get restore job by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async getRestoreJob(@Param('jobId') jobId: string) {
    const job = await this.backupService.getRestoreJob(jobId);
    if (!job) return { error: 'Job not found' };
    return job;
  }

  @Get('restore/jobs/tenant/:tenantId')
  @ApiOperation({ summary: 'Get restore jobs for tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of restore jobs' })
  async getRestoreJobs(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: RestoreStatus,
    @Query('limit') limit?: string,
  ) {
    return {
      jobs: await this.backupService.getRestoreJobs(tenantId, {
        status,
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  @Get('restore/jobs/:jobId/progress')
  @ApiOperation({ summary: 'Get restore progress' })
  @ApiResponse({ status: 200, description: 'Progress details' })
  async getRestoreProgress(@Param('jobId') jobId: string) {
    const progress = await this.backupService.getRestoreProgress(jobId);
    if (!progress) return { error: 'Job not found' };
    return progress;
  }

  // =================== VERIFICATION ===================

  @Post('verify/:backupId')
  @ApiOperation({ summary: 'Verify backup' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyBackup(@Param('backupId') backupId: string) {
    return this.backupService.verifyBackup(backupId);
  }

  @Get('verify/:backupId')
  @ApiOperation({ summary: 'Get verification result' })
  @ApiResponse({ status: 200, description: 'Verification details' })
  async getVerification(@Param('backupId') backupId: string) {
    const verification = await this.backupService.getVerification(backupId);
    if (!verification) return { error: 'Verification not found' };
    return verification;
  }

  // =================== RESTORE POINTS ===================

  @Get('restore-points/:tenantId')
  @ApiOperation({ summary: 'Get restore points' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiResponse({ status: 200, description: 'List of restore points' })
  async getRestorePoints(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return {
      restorePoints: await this.backupService.getRestorePoints(tenantId, {
        limit: limit ? parseInt(limit) : undefined,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      }),
    };
  }

  // =================== RETENTION ===================

  @Post('retention/:tenantId/:configId')
  @ApiOperation({ summary: 'Apply retention policy' })
  @ApiResponse({ status: 200, description: 'Retention applied' })
  async applyRetention(
    @Param('tenantId') tenantId: string,
    @Param('configId') configId: string,
  ) {
    try {
      return await this.backupService.applyRetentionPolicy(tenantId, configId);
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get backup statistics' })
  @ApiResponse({ status: 200, description: 'Backup stats' })
  async getStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.backupService.getBackupStats(tenantId) };
  }

  // =================== METADATA ===================

  @Get('metadata/types')
  @ApiOperation({ summary: 'Get backup types' })
  async getBackupTypes() {
    return { types: this.backupService.getBackupTypes() };
  }

  @Get('metadata/statuses')
  @ApiOperation({ summary: 'Get backup statuses' })
  async getBackupStatuses() {
    return { statuses: this.backupService.getBackupStatuses() };
  }

  @Get('metadata/restore-statuses')
  @ApiOperation({ summary: 'Get restore statuses' })
  async getRestoreStatuses() {
    return { statuses: this.backupService.getRestoreStatuses() };
  }

  @Get('metadata/targets')
  @ApiOperation({ summary: 'Get backup targets' })
  async getBackupTargets() {
    return { targets: this.backupService.getBackupTargets() };
  }

  @Get('metadata/storage-locations')
  @ApiOperation({ summary: 'Get storage locations' })
  async getStorageLocations() {
    return { locations: this.backupService.getStorageLocations() };
  }

  @Get('metadata/frequencies')
  @ApiOperation({ summary: 'Get schedule frequencies' })
  async getScheduleFrequencies() {
    return { frequencies: this.backupService.getScheduleFrequencies() };
  }
}
