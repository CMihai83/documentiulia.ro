import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface BackupRecord {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  size: number;
  path: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  tables?: string[];
  compressed: boolean;
  encrypted: boolean;
  retentionDays: number;
}

export interface BackupStats {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  totalSizeBytes: number;
  lastBackup?: BackupRecord;
  nextScheduledBackup: Date;
  storageUsedPercent: number;
  retentionPolicy: {
    dailyBackups: number;
    weeklyBackups: number;
    monthlyBackups: number;
  };
}

export interface RestorePoint {
  id: string;
  backupId: string;
  description: string;
  createdAt: Date;
  tables: string[];
  recordCount: number;
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  cronExpression: string;
  enabled: boolean;
  retentionDays: number;
  compress: boolean;
  encrypt: boolean;
  notifyOnComplete: boolean;
  notifyOnFailure: boolean;
  lastRun?: Date;
  nextRun: Date;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private backups: BackupRecord[] = [];
  private restorePoints: RestorePoint[] = [];
  private schedules: BackupSchedule[] = [];
  private readonly backupDir: string;
  private readonly maxStorageBytes: number;

  constructor(private configService: ConfigService) {
    this.backupDir = this.configService.get('BACKUP_DIR') || '/var/backups/documentiulia';
    this.maxStorageBytes = 50 * 1024 * 1024 * 1024; // 50GB default
    this.initializeSchedules();
    this.loadMockData();
  }

  private initializeSchedules(): void {
    this.schedules = [
      {
        id: 'sched-daily-full',
        name: 'Daily Full Backup',
        type: 'full',
        cronExpression: '0 2 * * *', // 2 AM daily
        enabled: true,
        retentionDays: 7,
        compress: true,
        encrypt: true,
        notifyOnComplete: true,
        notifyOnFailure: true,
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000),
        nextRun: this.getNextCronRun('0 2 * * *'),
      },
      {
        id: 'sched-hourly-incr',
        name: 'Hourly Incremental',
        type: 'incremental',
        cronExpression: '0 * * * *', // Every hour
        enabled: true,
        retentionDays: 2,
        compress: true,
        encrypt: false,
        notifyOnComplete: false,
        notifyOnFailure: true,
        lastRun: new Date(Date.now() - 60 * 60 * 1000),
        nextRun: this.getNextCronRun('0 * * * *'),
      },
      {
        id: 'sched-weekly-archive',
        name: 'Weekly Archive',
        type: 'full',
        cronExpression: '0 3 * * 0', // 3 AM Sunday
        enabled: true,
        retentionDays: 30,
        compress: true,
        encrypt: true,
        notifyOnComplete: true,
        notifyOnFailure: true,
        lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        nextRun: this.getNextCronRun('0 3 * * 0'),
      },
      {
        id: 'sched-monthly-archive',
        name: 'Monthly Archive',
        type: 'full',
        cronExpression: '0 4 1 * *', // 4 AM 1st of month
        enabled: true,
        retentionDays: 365,
        compress: true,
        encrypt: true,
        notifyOnComplete: true,
        notifyOnFailure: true,
        lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        nextRun: this.getNextCronRun('0 4 1 * *'),
      },
    ];
  }

  private loadMockData(): void {
    const tables = [
      'users', 'tenants', 'invoices', 'invoice_items', 'partners',
      'employees', 'payroll', 'transactions', 'documents', 'audit_logs'
    ];

    // Generate mock backup history
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const isSuccess = Math.random() > 0.05; // 95% success rate

      this.backups.push({
        id: `backup-${date.toISOString().split('T')[0]}-${i}`,
        type: i % 7 === 0 ? 'full' : 'incremental',
        status: isSuccess ? 'completed' : 'failed',
        size: isSuccess ? Math.floor(Math.random() * 500 * 1024 * 1024) + 100 * 1024 * 1024 : 0,
        path: `${this.backupDir}/${date.toISOString().split('T')[0]}/backup-${i}.tar.gz.enc`,
        createdAt: date,
        completedAt: isSuccess ? new Date(date.getTime() + Math.random() * 30 * 60 * 1000) : undefined,
        error: isSuccess ? undefined : 'Connection timeout to database',
        tables: isSuccess ? tables : undefined,
        compressed: true,
        encrypted: true,
        retentionDays: i % 7 === 0 ? 30 : 7,
      });
    }

    // Generate restore points
    this.restorePoints = [
      {
        id: 'rp-001',
        backupId: this.backups[0].id,
        description: 'Pre-migration checkpoint',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        tables: tables,
        recordCount: 1250000,
      },
      {
        id: 'rp-002',
        backupId: this.backups[7].id,
        description: 'Weekly stable snapshot',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        tables: tables,
        recordCount: 1180000,
      },
      {
        id: 'rp-003',
        backupId: this.backups[14].id,
        description: 'End of month archive',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        tables: tables,
        recordCount: 1100000,
      },
    ];
  }

  private getNextCronRun(cronExpression: string): Date {
    // Simplified next run calculation
    const now = new Date();
    const parts = cronExpression.split(' ');
    const minute = parseInt(parts[0]) || 0;
    const hour = parseInt(parts[1]) || now.getHours();

    const next = new Date(now);
    next.setMinutes(minute);
    next.setSeconds(0);
    next.setMilliseconds(0);

    if (parts[1] !== '*') {
      next.setHours(hour);
    }

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  // Scheduled backup job - runs at 2 AM daily
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runScheduledDailyBackup(): Promise<void> {
    this.logger.log('Starting scheduled daily backup');
    await this.createBackup('full', { compress: true, encrypt: true });
  }

  // Hourly incremental backup
  @Cron(CronExpression.EVERY_HOUR)
  async runScheduledHourlyBackup(): Promise<void> {
    this.logger.log('Starting scheduled hourly incremental backup');
    await this.createBackup('incremental', { compress: true, encrypt: false });
  }

  async getBackupStats(): Promise<BackupStats> {
    const completedBackups = this.backups.filter(b => b.status === 'completed');
    const failedBackups = this.backups.filter(b => b.status === 'failed');
    const totalSize = completedBackups.reduce((sum, b) => sum + b.size, 0);

    return {
      totalBackups: this.backups.length,
      successfulBackups: completedBackups.length,
      failedBackups: failedBackups.length,
      totalSizeBytes: totalSize,
      lastBackup: this.backups[0],
      nextScheduledBackup: this.schedules
        .filter(s => s.enabled)
        .map(s => s.nextRun)
        .sort((a, b) => a.getTime() - b.getTime())[0],
      storageUsedPercent: Math.round((totalSize / this.maxStorageBytes) * 100),
      retentionPolicy: {
        dailyBackups: 7,
        weeklyBackups: 4,
        monthlyBackups: 12,
      },
    };
  }

  async getBackupHistory(
    limit: number = 20,
    offset: number = 0,
    status?: 'completed' | 'failed' | 'pending' | 'in_progress',
    type?: 'full' | 'incremental' | 'differential',
  ): Promise<{ backups: BackupRecord[]; total: number }> {
    let filtered = [...this.backups];

    if (status) {
      filtered = filtered.filter(b => b.status === status);
    }
    if (type) {
      filtered = filtered.filter(b => b.type === type);
    }

    return {
      backups: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  async getBackupById(id: string): Promise<BackupRecord | null> {
    return this.backups.find(b => b.id === id) || null;
  }

  async createBackup(
    type: 'full' | 'incremental' | 'differential',
    options: {
      compress?: boolean;
      encrypt?: boolean;
      tables?: string[];
      retentionDays?: number;
    } = {},
  ): Promise<BackupRecord> {
    const id = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const backup: BackupRecord = {
      id,
      type,
      status: 'in_progress',
      size: 0,
      path: `${this.backupDir}/${now.toISOString().split('T')[0]}/${id}.tar.gz${options.encrypt ? '.enc' : ''}`,
      createdAt: now,
      tables: options.tables || ['all'],
      compressed: options.compress !== false,
      encrypted: options.encrypt !== false,
      retentionDays: options.retentionDays || (type === 'full' ? 30 : 7),
    };

    this.backups.unshift(backup);

    // Simulate backup process
    try {
      this.logger.log(`Creating ${type} backup: ${id}`);

      // Simulate backup time based on type
      const duration = type === 'full' ? 5000 : 1000;
      await new Promise(resolve => setTimeout(resolve, duration));

      // Simulate success
      backup.status = 'completed';
      backup.completedAt = new Date();
      backup.size = type === 'full'
        ? Math.floor(Math.random() * 300 * 1024 * 1024) + 200 * 1024 * 1024
        : Math.floor(Math.random() * 50 * 1024 * 1024) + 10 * 1024 * 1024;

      this.logger.log(`Backup ${id} completed successfully: ${this.formatBytes(backup.size)}`);
    } catch (error) {
      backup.status = 'failed';
      backup.error = error.message;
      this.logger.error(`Backup ${id} failed: ${error.message}`);
    }

    return backup;
  }

  async deleteBackup(id: string): Promise<boolean> {
    const index = this.backups.findIndex(b => b.id === id);
    if (index === -1) return false;

    const backup = this.backups[index];

    // Don't delete recent backups
    const minAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - backup.createdAt.getTime() < minAge) {
      throw new Error('Cannot delete backups less than 24 hours old');
    }

    this.backups.splice(index, 1);
    this.logger.log(`Deleted backup: ${id}`);
    return true;
  }

  async getRestorePoints(): Promise<RestorePoint[]> {
    return this.restorePoints;
  }

  async createRestorePoint(
    backupId: string,
    description: string,
  ): Promise<RestorePoint> {
    const backup = await this.getBackupById(backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }
    if (backup.status !== 'completed') {
      throw new Error('Can only create restore points from completed backups');
    }

    const restorePoint: RestorePoint = {
      id: `rp-${Date.now()}`,
      backupId,
      description,
      createdAt: new Date(),
      tables: backup.tables || [],
      recordCount: Math.floor(Math.random() * 500000) + 1000000,
    };

    this.restorePoints.unshift(restorePoint);
    this.logger.log(`Created restore point: ${restorePoint.id} from backup ${backupId}`);
    return restorePoint;
  }

  async restoreFromBackup(
    backupId: string,
    options: {
      tables?: string[];
      targetTimestamp?: Date;
      dryRun?: boolean;
    } = {},
  ): Promise<{
    success: boolean;
    message: string;
    restoredTables: string[];
    recordsRestored: number;
    duration: number;
  }> {
    const backup = await this.getBackupById(backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    this.logger.log(`${options.dryRun ? '[DRY RUN] ' : ''}Starting restore from backup: ${backupId}`);

    const startTime = Date.now();

    // Simulate restore process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const tables = options.tables || backup.tables || [];
    const recordsRestored = Math.floor(Math.random() * 100000) + 50000;

    return {
      success: true,
      message: options.dryRun
        ? 'Dry run completed - no changes made'
        : `Successfully restored ${tables.length} tables from backup ${backupId}`,
      restoredTables: tables,
      recordsRestored,
      duration: Date.now() - startTime,
    };
  }

  async getSchedules(): Promise<BackupSchedule[]> {
    return this.schedules;
  }

  async updateSchedule(
    id: string,
    updates: Partial<Omit<BackupSchedule, 'id'>>,
  ): Promise<BackupSchedule | null> {
    const schedule = this.schedules.find(s => s.id === id);
    if (!schedule) return null;

    Object.assign(schedule, updates);

    if (updates.cronExpression) {
      schedule.nextRun = this.getNextCronRun(updates.cronExpression);
    }

    this.logger.log(`Updated backup schedule: ${id}`);
    return schedule;
  }

  async createSchedule(
    schedule: Omit<BackupSchedule, 'id' | 'lastRun' | 'nextRun'>,
  ): Promise<BackupSchedule> {
    const newSchedule: BackupSchedule = {
      ...schedule,
      id: `sched-${Date.now()}`,
      nextRun: this.getNextCronRun(schedule.cronExpression),
    };

    this.schedules.push(newSchedule);
    this.logger.log(`Created backup schedule: ${newSchedule.id}`);
    return newSchedule;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const index = this.schedules.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.schedules.splice(index, 1);
    this.logger.log(`Deleted backup schedule: ${id}`);
    return true;
  }

  async runCleanup(): Promise<{
    deletedBackups: number;
    freedBytes: number;
    errors: string[];
  }> {
    const now = Date.now();
    const errors: string[] = [];
    let deletedCount = 0;
    let freedBytes = 0;

    const expiredBackups = this.backups.filter(b => {
      const age = (now - b.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      return age > b.retentionDays && b.status === 'completed';
    });

    for (const backup of expiredBackups) {
      try {
        freedBytes += backup.size;
        await this.deleteBackup(backup.id);
        deletedCount++;
      } catch (error) {
        errors.push(`Failed to delete ${backup.id}: ${error.message}`);
      }
    }

    this.logger.log(`Cleanup completed: ${deletedCount} backups deleted, ${this.formatBytes(freedBytes)} freed`);

    return {
      deletedBackups: deletedCount,
      freedBytes,
      errors,
    };
  }

  async verifyBackup(id: string): Promise<{
    valid: boolean;
    checksumMatch: boolean;
    integrityCheck: boolean;
    errors: string[];
  }> {
    const backup = await this.getBackupById(id);
    if (!backup) {
      throw new Error(`Backup ${id} not found`);
    }

    this.logger.log(`Verifying backup: ${id}`);

    // Simulate verification
    await new Promise(resolve => setTimeout(resolve, 1000));

    const isValid = backup.status === 'completed' && Math.random() > 0.02;

    return {
      valid: isValid,
      checksumMatch: isValid,
      integrityCheck: isValid,
      errors: isValid ? [] : ['Checksum mismatch detected'],
    };
  }

  async exportBackupReport(
    format: 'json' | 'csv' = 'json',
    dateRange?: { start: Date; end: Date },
  ): Promise<string> {
    let backups = this.backups;

    if (dateRange) {
      backups = backups.filter(
        b => b.createdAt >= dateRange.start && b.createdAt <= dateRange.end,
      );
    }

    if (format === 'csv') {
      const headers = 'ID,Type,Status,Size,Created,Completed,Compressed,Encrypted\n';
      const rows = backups.map(b =>
        `${b.id},${b.type},${b.status},${b.size},${b.createdAt.toISOString()},${b.completedAt?.toISOString() || ''},${b.compressed},${b.encrypted}`
      ).join('\n');
      return headers + rows;
    }

    return JSON.stringify(backups, null, 2);
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let value = bytes;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}
