import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { BackupService } from './backup.service';

@ApiTags('backup')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get backup statistics' })
  @ApiResponse({ status: 200, description: 'Backup statistics' })
  async getStats() {
    return this.backupService.getBackupStats();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get backup history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['completed', 'failed', 'pending', 'in_progress'] })
  @ApiQuery({ name: 'type', required: false, enum: ['full', 'incremental', 'differential'] })
  @ApiResponse({ status: 200, description: 'List of backups' })
  async getHistory(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: 'completed' | 'failed' | 'pending' | 'in_progress',
    @Query('type') type?: 'full' | 'incremental' | 'differential',
  ) {
    return this.backupService.getBackupHistory(
      limit || 20,
      offset || 0,
      status,
      type,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get backup by ID' })
  @ApiParam({ name: 'id', description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Backup details' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async getBackupById(@Param('id') id: string) {
    const backup = await this.backupService.getBackupById(id);
    if (!backup) {
      return { error: 'Backup not found', statusCode: 404 };
    }
    return backup;
  }

  @Post('create')
  @ApiOperation({ summary: 'Create a new backup' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['full', 'incremental', 'differential'] },
        compress: { type: 'boolean' },
        encrypt: { type: 'boolean' },
        tables: { type: 'array', items: { type: 'string' } },
        retentionDays: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Backup created' })
  async createBackup(
    @Body()
    body: {
      type: 'full' | 'incremental' | 'differential';
      compress?: boolean;
      encrypt?: boolean;
      tables?: string[];
      retentionDays?: number;
    },
  ) {
    return this.backupService.createBackup(body.type, {
      compress: body.compress,
      encrypt: body.encrypt,
      tables: body.tables,
      retentionDays: body.retentionDays,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a backup' })
  @ApiParam({ name: 'id', description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Backup deleted' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  @HttpCode(HttpStatus.OK)
  async deleteBackup(@Param('id') id: string) {
    const result = await this.backupService.deleteBackup(id);
    return { success: result, id };
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Verify backup integrity' })
  @ApiParam({ name: 'id', description: 'Backup ID' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyBackup(@Param('id') id: string) {
    return this.backupService.verifyBackup(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore from backup' })
  @ApiParam({ name: 'id', description: 'Backup ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tables: { type: 'array', items: { type: 'string' } },
        dryRun: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Restore result' })
  async restoreFromBackup(
    @Param('id') id: string,
    @Body() body: { tables?: string[]; dryRun?: boolean },
  ) {
    return this.backupService.restoreFromBackup(id, {
      tables: body.tables,
      dryRun: body.dryRun,
    });
  }

  @Get('restore-points/list')
  @ApiOperation({ summary: 'Get all restore points' })
  @ApiResponse({ status: 200, description: 'List of restore points' })
  async getRestorePoints() {
    return this.backupService.getRestorePoints();
  }

  @Post('restore-points/create')
  @ApiOperation({ summary: 'Create a restore point' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['backupId', 'description'],
      properties: {
        backupId: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Restore point created' })
  async createRestorePoint(
    @Body() body: { backupId: string; description: string },
  ) {
    return this.backupService.createRestorePoint(body.backupId, body.description);
  }

  @Get('schedules/list')
  @ApiOperation({ summary: 'Get backup schedules' })
  @ApiResponse({ status: 200, description: 'List of backup schedules' })
  async getSchedules() {
    return this.backupService.getSchedules();
  }

  @Post('schedules/create')
  @ApiOperation({ summary: 'Create a backup schedule' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'type', 'cronExpression'],
      properties: {
        name: { type: 'string' },
        type: { type: 'string', enum: ['full', 'incremental', 'differential'] },
        cronExpression: { type: 'string' },
        enabled: { type: 'boolean' },
        retentionDays: { type: 'number' },
        compress: { type: 'boolean' },
        encrypt: { type: 'boolean' },
        notifyOnComplete: { type: 'boolean' },
        notifyOnFailure: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createSchedule(
    @Body()
    body: {
      name: string;
      type: 'full' | 'incremental' | 'differential';
      cronExpression: string;
      enabled?: boolean;
      retentionDays?: number;
      compress?: boolean;
      encrypt?: boolean;
      notifyOnComplete?: boolean;
      notifyOnFailure?: boolean;
    },
  ) {
    return this.backupService.createSchedule({
      name: body.name,
      type: body.type,
      cronExpression: body.cronExpression,
      enabled: body.enabled ?? true,
      retentionDays: body.retentionDays ?? 7,
      compress: body.compress ?? true,
      encrypt: body.encrypt ?? true,
      notifyOnComplete: body.notifyOnComplete ?? true,
      notifyOnFailure: body.notifyOnFailure ?? true,
    });
  }

  @Post('schedules/:id')
  @ApiOperation({ summary: 'Update a backup schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updateSchedule(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      cronExpression?: string;
      enabled?: boolean;
      retentionDays?: number;
      compress?: boolean;
      encrypt?: boolean;
      notifyOnComplete?: boolean;
      notifyOnFailure?: boolean;
    },
  ) {
    return this.backupService.updateSchedule(id, body);
  }

  @Delete('schedules/:id')
  @ApiOperation({ summary: 'Delete a backup schedule' })
  @ApiParam({ name: 'id', description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Schedule deleted' })
  @HttpCode(HttpStatus.OK)
  async deleteSchedule(@Param('id') id: string) {
    const result = await this.backupService.deleteSchedule(id);
    return { success: result, id };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Run backup cleanup (remove expired backups)' })
  @ApiResponse({ status: 200, description: 'Cleanup result' })
  async runCleanup() {
    return this.backupService.runCleanup();
  }

  @Get('export/report')
  @ApiOperation({ summary: 'Export backup report' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Backup report' })
  async exportReport(
    @Query('format') format?: 'json' | 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange =
      startDate && endDate
        ? { start: new Date(startDate), end: new Date(endDate) }
        : undefined;

    return this.backupService.exportBackupReport(format || 'json', dateRange);
  }
}
