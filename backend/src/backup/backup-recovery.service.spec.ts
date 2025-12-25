import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BackupRecoveryService,
  BackupType,
  BackupTarget,
} from './backup-recovery.service';

describe('BackupRecoveryService', () => {
  let service: BackupRecoveryService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupRecoveryService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BackupRecoveryService>(BackupRecoveryService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('backup configuration', () => {
    const tenantId = 'tenant-backup';

    it('should create backup config', async () => {
      const config = await service.createBackupConfig(
        tenantId,
        'Daily Backup',
        'full',
        ['database'],
        'user-1',
      );

      expect(config.id).toBeDefined();
      expect(config.name).toBe('Daily Backup');
      expect(config.type).toBe('full');
      expect(config.targets).toContain('database');
      expect(config.enabled).toBe(true);
    });

    it('should create config with schedule', async () => {
      const config = await service.createBackupConfig(
        tenantId,
        'Scheduled Backup',
        'incremental',
        ['database', 'files'],
        'user-1',
        {
          schedule: {
            frequency: 'daily',
            time: '02:00',
            timezone: 'Europe/Bucharest',
          },
        },
      );

      expect(config.schedule).toBeDefined();
      expect(config.schedule?.frequency).toBe('daily');
      expect(config.schedule?.nextRun).toBeInstanceOf(Date);
    });

    it('should create config with retention policy', async () => {
      const config = await service.createBackupConfig(
        tenantId,
        'Retention Test',
        'full',
        ['all'],
        'user-1',
        {
          retention: {
            daily: 14,
            weekly: 8,
            monthly: 24,
            yearly: 5,
          },
        },
      );

      expect(config.retention.daily).toBe(14);
      expect(config.retention.weekly).toBe(8);
      expect(config.retention.monthly).toBe(24);
      expect(config.retention.yearly).toBe(5);
    });

    it('should create config with storage options', async () => {
      const config = await service.createBackupConfig(
        tenantId,
        'S3 Backup',
        'full',
        ['database'],
        'user-1',
        {
          storage: {
            location: 's3',
            bucket: 'my-backups',
            region: 'eu-central-1',
          },
        },
      );

      expect(config.storage.location).toBe('s3');
      expect(config.storage.bucket).toBe('my-backups');
    });

    it('should get backup config by id', async () => {
      const created = await service.createBackupConfig(
        tenantId,
        'Get Test',
        'differential',
        ['config'],
        'user-1',
      );

      const retrieved = await service.getBackupConfig(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Get Test');
    });

    it('should return null for non-existent config', async () => {
      const config = await service.getBackupConfig('non-existent');
      expect(config).toBeNull();
    });

    it('should get configs for tenant', async () => {
      await service.createBackupConfig(tenantId, 'Config 1', 'full', ['database'], 'user-1');
      await service.createBackupConfig(tenantId, 'Config 2', 'incremental', ['files'], 'user-1');
      await service.createBackupConfig('other-tenant', 'Other Config', 'full', ['all'], 'user-2');

      const configs = await service.getBackupConfigs(tenantId);
      expect(configs.every(c => c.tenantId === tenantId)).toBe(true);
    });

    it('should update backup config', async () => {
      const config = await service.createBackupConfig(
        tenantId,
        'Update Test',
        'full',
        ['database'],
        'user-1',
      );

      const updated = await service.updateBackupConfig(config.id, {
        name: 'Updated Backup',
        compression: false,
      });

      expect(updated?.name).toBe('Updated Backup');
      expect(updated?.compression).toBe(false);
    });

    it('should delete backup config', async () => {
      const config = await service.createBackupConfig(
        tenantId,
        'Delete Test',
        'full',
        ['database'],
        'user-1',
      );

      const deleted = await service.deleteBackupConfig(config.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getBackupConfig(config.id);
      expect(retrieved).toBeNull();
    });

    it('should enable and disable config', async () => {
      const config = await service.createBackupConfig(
        tenantId,
        'Toggle Test',
        'full',
        ['database'],
        'user-1',
      );

      await service.disableBackupConfig(config.id);
      const disabled = await service.getBackupConfig(config.id);
      expect(disabled?.enabled).toBe(false);

      await service.enableBackupConfig(config.id);
      const enabled = await service.getBackupConfig(config.id);
      expect(enabled?.enabled).toBe(true);
    });
  });

  describe('backup execution', () => {
    it('should start backup job', async () => {
      const config = await service.createBackupConfig(
        'tenant-exec',
        'Exec Test',
        'full',
        ['database'],
        'user-1',
      );

      const job = await service.startBackup('tenant-exec', config.id, 'user-1');

      expect(job.id).toBeDefined();
      expect(job.configId).toBe(config.id);
      expect(job.status).toBeDefined();
    });

    it('should complete backup with metadata', async () => {
      const config = await service.createBackupConfig(
        'tenant-complete',
        'Complete Test',
        'full',
        ['database'],
        'user-1',
      );

      const job = await service.startBackup('tenant-complete', config.id, 'user-1');

      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      const completed = await service.getBackupJob(job.id);
      expect(completed?.status).toBe('completed');
      expect(completed?.sizeBytes).toBeGreaterThan(0);
      expect(completed?.checksum).toBeDefined();
      expect(completed?.storagePath).toBeDefined();
    });

    it('should throw error for non-existent config', async () => {
      await expect(
        service.startBackup('tenant-1', 'non-existent', 'user-1'),
      ).rejects.toThrow('Backup config not found');
    });

    it('should get backup job by id', async () => {
      const config = await service.createBackupConfig(
        'tenant-get',
        'Get Job Test',
        'full',
        ['database'],
        'user-1',
      );

      const job = await service.startBackup('tenant-get', config.id, 'user-1');
      const retrieved = await service.getBackupJob(job.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(job.id);
    });

    it('should get backup jobs for tenant', async () => {
      const config = await service.createBackupConfig(
        'tenant-jobs',
        'Jobs Test',
        'full',
        ['database'],
        'user-1',
      );

      await service.startBackup('tenant-jobs', config.id, 'user-1');
      await service.startBackup('tenant-jobs', config.id, 'user-1');

      const jobs = await service.getBackupJobs('tenant-jobs');
      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter jobs by status', async () => {
      const config = await service.createBackupConfig(
        'tenant-filter',
        'Filter Test',
        'full',
        ['database'],
        'user-1',
      );

      await service.startBackup('tenant-filter', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const completedJobs = await service.getBackupJobs('tenant-filter', { status: 'completed' });
      expect(completedJobs.every(j => j.status === 'completed')).toBe(true);
    });

    it('should cancel pending backup', async () => {
      const config = await service.createBackupConfig(
        'tenant-cancel',
        'Cancel Test',
        'full',
        ['database'],
        'user-1',
      );

      const job = await service.startBackup('tenant-cancel', config.id, 'user-1');

      // May already be completed by async execution
      const result = await service.cancelBackup(job.id);
      expect(typeof result).toBe('boolean');
    });

    it('should delete backup', async () => {
      const config = await service.createBackupConfig(
        'tenant-delete',
        'Delete Backup Test',
        'full',
        ['database'],
        'user-1',
      );

      const job = await service.startBackup('tenant-delete', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const deleted = await service.deleteBackup(job.id);
      expect(deleted).toBe(true);

      const retrieved = await service.getBackupJob(job.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('restore', () => {
    it('should start restore job', async () => {
      const config = await service.createBackupConfig(
        'tenant-restore',
        'Restore Test',
        'full',
        ['database'],
        'user-1',
      );

      const backup = await service.startBackup('tenant-restore', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const restore = await service.startRestore('tenant-restore', backup.id, 'user-1');

      expect(restore.id).toBeDefined();
      expect(restore.backupId).toBe(backup.id);
      expect(restore.status).toBeDefined();
    });

    it('should complete restore', async () => {
      const config = await service.createBackupConfig(
        'tenant-restore-complete',
        'Restore Complete Test',
        'full',
        ['database'],
        'user-1',
      );

      const backup = await service.startBackup('tenant-restore-complete', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const restore = await service.startRestore('tenant-restore-complete', backup.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 200));

      const completed = await service.getRestoreJob(restore.id);
      expect(completed?.status).toBe('completed');
      expect(completed?.progress).toBe(100);
    });

    it('should throw error for non-existent backup', async () => {
      await expect(
        service.startRestore('tenant-1', 'non-existent', 'user-1'),
      ).rejects.toThrow('Backup not found');
    });

    it('should get restore jobs for tenant', async () => {
      const config = await service.createBackupConfig(
        'tenant-restore-jobs',
        'Restore Jobs Test',
        'full',
        ['database'],
        'user-1',
      );

      const backup = await service.startBackup('tenant-restore-jobs', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      await service.startRestore('tenant-restore-jobs', backup.id, 'user-1');

      const jobs = await service.getRestoreJobs('tenant-restore-jobs');
      expect(jobs.length).toBeGreaterThan(0);
    });

    it('should get restore progress', async () => {
      const config = await service.createBackupConfig(
        'tenant-progress',
        'Progress Test',
        'full',
        ['database'],
        'user-1',
      );

      const backup = await service.startBackup('tenant-progress', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const restore = await service.startRestore('tenant-progress', backup.id, 'user-1');
      const progress = await service.getRestoreProgress(restore.id);

      expect(progress).not.toBeNull();
      expect(progress?.status).toBeDefined();
    });
  });

  describe('verification', () => {
    it('should verify backup', async () => {
      const config = await service.createBackupConfig(
        'tenant-verify',
        'Verify Test',
        'full',
        ['database'],
        'user-1',
      );

      const backup = await service.startBackup('tenant-verify', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const verification = await service.verifyBackup(backup.id);

      expect(verification.backupId).toBe(backup.id);
      expect(verification.verified).toBe(true);
      expect(verification.checksumValid).toBe(true);
      expect(verification.structureValid).toBe(true);
    });

    it('should fail verification for non-existent backup', async () => {
      const verification = await service.verifyBackup('non-existent');

      expect(verification.verified).toBe(false);
      expect(verification.issues).toContain('Backup not found');
    });

    it('should get verification result', async () => {
      const config = await service.createBackupConfig(
        'tenant-get-verify',
        'Get Verify Test',
        'full',
        ['database'],
        'user-1',
      );

      const backup = await service.startBackup('tenant-get-verify', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      await service.verifyBackup(backup.id);
      const verification = await service.getVerification(backup.id);

      expect(verification).not.toBeNull();
      expect(verification?.verified).toBe(true);
    });
  });

  describe('restore points', () => {
    it('should get restore points', async () => {
      const config = await service.createBackupConfig(
        'tenant-points',
        'Points Test',
        'full',
        ['database'],
        'user-1',
      );

      await service.startBackup('tenant-points', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const points = await service.getRestorePoints('tenant-points');

      expect(points.length).toBeGreaterThan(0);
      expect(points[0].backupId).toBeDefined();
      expect(points[0].timestamp).toBeInstanceOf(Date);
    });

    it('should filter restore points by date', async () => {
      const config = await service.createBackupConfig(
        'tenant-date-filter',
        'Date Filter Test',
        'full',
        ['database'],
        'user-1',
      );

      await service.startBackup('tenant-date-filter', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const fromDate = new Date(Date.now() - 1000);
      const points = await service.getRestorePoints('tenant-date-filter', { fromDate });

      expect(points.every(p => p.timestamp >= fromDate)).toBe(true);
    });

    it('should limit restore points', async () => {
      const config = await service.createBackupConfig(
        'tenant-limit-points',
        'Limit Points Test',
        'full',
        ['database'],
        'user-1',
      );

      await service.startBackup('tenant-limit-points', config.id, 'user-1');
      await service.startBackup('tenant-limit-points', config.id, 'user-1');
      await service.startBackup('tenant-limit-points', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 150));

      const points = await service.getRestorePoints('tenant-limit-points', { limit: 2 });
      expect(points.length).toBeLessThanOrEqual(2);
    });
  });

  describe('retention management', () => {
    it('should apply retention policy', async () => {
      const config = await service.createBackupConfig(
        'tenant-retention',
        'Retention Test',
        'full',
        ['database'],
        'user-1',
        {
          retention: {
            daily: 1,
            weekly: 0,
            monthly: 0,
            yearly: 0,
            minBackups: 1,
            maxBackups: 5,
          },
        },
      );

      // Create some backups
      await service.startBackup('tenant-retention', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await service.applyRetentionPolicy('tenant-retention', config.id);

      expect(result.retained).toBeGreaterThanOrEqual(0);
      expect(typeof result.deleted).toBe('number');
      expect(typeof result.freedBytes).toBe('number');
    });

    it('should throw error for non-existent config', async () => {
      await expect(
        service.applyRetentionPolicy('tenant-1', 'non-existent'),
      ).rejects.toThrow('Config not found');
    });
  });

  describe('statistics', () => {
    it('should get backup statistics', async () => {
      const config = await service.createBackupConfig(
        'tenant-stats',
        'Stats Test',
        'full',
        ['database'],
        'user-1',
      );

      await service.startBackup('tenant-stats', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = await service.getBackupStats('tenant-stats');

      expect(stats.totalBackups).toBeGreaterThan(0);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.byType).toBeDefined();
      expect(stats.byStatus).toBeDefined();
    });

    it('should return empty stats for new tenant', async () => {
      const stats = await service.getBackupStats('new-tenant');

      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
    });

    it('should track stats by type', async () => {
      const fullConfig = await service.createBackupConfig(
        'tenant-type-stats',
        'Full Backup',
        'full',
        ['database'],
        'user-1',
      );

      const incrConfig = await service.createBackupConfig(
        'tenant-type-stats',
        'Incremental Backup',
        'incremental',
        ['database'],
        'user-1',
      );

      await service.startBackup('tenant-type-stats', fullConfig.id, 'user-1');
      await service.startBackup('tenant-type-stats', incrConfig.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = await service.getBackupStats('tenant-type-stats');

      expect(stats.byType.full).toBeGreaterThan(0);
      expect(stats.byType.incremental).toBeGreaterThan(0);
    });
  });

  describe('metadata', () => {
    it('should return backup types', () => {
      const types = service.getBackupTypes();

      expect(types).toContain('full');
      expect(types).toContain('incremental');
      expect(types).toContain('differential');
    });

    it('should return backup statuses', () => {
      const statuses = service.getBackupStatuses();

      expect(statuses).toContain('pending');
      expect(statuses).toContain('running');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('cancelled');
    });

    it('should return restore statuses', () => {
      const statuses = service.getRestoreStatuses();

      expect(statuses).toContain('pending');
      expect(statuses).toContain('validating');
      expect(statuses).toContain('restoring');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('failed');
    });

    it('should return backup targets', () => {
      const targets = service.getBackupTargets();

      expect(targets).toContain('database');
      expect(targets).toContain('files');
      expect(targets).toContain('config');
      expect(targets).toContain('all');
    });

    it('should return storage locations', () => {
      const locations = service.getStorageLocations();

      expect(locations).toContain('local');
      expect(locations).toContain('s3');
      expect(locations).toContain('gcs');
      expect(locations).toContain('azure');
    });

    it('should return schedule frequencies', () => {
      const frequencies = service.getScheduleFrequencies();

      expect(frequencies).toContain('hourly');
      expect(frequencies).toContain('daily');
      expect(frequencies).toContain('weekly');
      expect(frequencies).toContain('monthly');
    });
  });

  describe('backup targets', () => {
    it('should backup database target', async () => {
      const config = await service.createBackupConfig(
        'tenant-db',
        'Database Backup',
        'full',
        ['database'],
        'user-1',
      );

      const job = await service.startBackup('tenant-db', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const completed = await service.getBackupJob(job.id);
      expect(completed?.metadata.recordCounts).toBeDefined();
    });

    it('should backup files target', async () => {
      const config = await service.createBackupConfig(
        'tenant-files',
        'Files Backup',
        'full',
        ['files'],
        'user-1',
      );

      const job = await service.startBackup('tenant-files', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const completed = await service.getBackupJob(job.id);
      expect(completed?.metadata.fileCount).toBeDefined();
    });

    it('should backup all targets', async () => {
      const config = await service.createBackupConfig(
        'tenant-all',
        'Full System Backup',
        'full',
        ['all'],
        'user-1',
      );

      const job = await service.startBackup('tenant-all', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const completed = await service.getBackupJob(job.id);
      expect(completed?.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('compression and encryption', () => {
    it('should apply compression', async () => {
      const config = await service.createBackupConfig(
        'tenant-compress',
        'Compressed Backup',
        'full',
        ['database'],
        'user-1',
        { compression: true },
      );

      const job = await service.startBackup('tenant-compress', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const completed = await service.getBackupJob(job.id);
      expect(completed?.metadata.compressed).toBe(true);
      expect(completed?.metadata.compressionRatio).toBeGreaterThan(0);
    });

    it('should mark encryption status', async () => {
      const config = await service.createBackupConfig(
        'tenant-encrypt',
        'Encrypted Backup',
        'full',
        ['database'],
        'user-1',
        { encryption: true },
      );

      const job = await service.startBackup('tenant-encrypt', config.id, 'user-1');
      await new Promise(resolve => setTimeout(resolve, 100));

      const completed = await service.getBackupJob(job.id);
      expect(completed?.metadata.encrypted).toBe(true);
    });
  });
});
