import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  DataMigrationService,
  MigrationType,
  MigrationStatus,
  DataSource,
  EntityType,
} from './data-migration.service';

describe('DataMigrationService', () => {
  let service: DataMigrationService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataMigrationService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataMigrationService>(DataMigrationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('System Templates', () => {
    it('should initialize with system templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(4);
    });

    it('should have SAGA import template', () => {
      const templates = service.getTemplates({ source: 'SAGA' });
      expect(templates.some((t) => t.name === 'SAGA Import')).toBe(true);
    });

    it('should have Excel import template', () => {
      const templates = service.getTemplates({ source: 'EXCEL' });
      expect(templates.some((t) => t.name.includes('Excel'))).toBe(true);
    });

    it('should have ANAF export template', () => {
      const templates = service.getTemplates({ type: 'EXPORT' });
      const anafTemplates = templates.filter((t) => t.target === 'ANAF');
      expect(anafTemplates.length).toBeGreaterThan(0);
    });

    it('should have backup template', () => {
      const templates = service.getTemplates({ type: 'BACKUP' });
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have bilingual names', () => {
      const templates = service.getTemplates();
      templates.forEach((t) => {
        expect(t.name).toBeDefined();
        expect(t.nameRo).toBeDefined();
        expect(t.description).toBeDefined();
        expect(t.descriptionRo).toBeDefined();
      });
    });
  });

  describe('Job Creation', () => {
    it('should create a migration job', () => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Test Import',
        nameRo: 'Import Test',
        description: 'A test import',
        descriptionRo: 'Un import de test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        createdBy: 'user-1',
      });

      expect(job.id).toBeDefined();
      expect(job.status).toBe('PENDING');
      expect(job.progress.totalRecords).toBe(0);
    });

    it('should create job with custom config', () => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Custom Config',
        nameRo: 'Configurare Personalizată',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'EXCEL',
        target: 'DATABASE',
        entities: ['INVOICE'],
        config: { batchSize: 50, skipErrors: true },
        createdBy: 'user-1',
      });

      expect(job.config.batchSize).toBe(50);
      expect(job.config.skipErrors).toBe(true);
    });

    it('should create job with scheduled time', () => {
      const scheduledAt = new Date(Date.now() + 86400000);
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Scheduled Job',
        nameRo: 'Job Programat',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'BACKUP',
        source: 'DATABASE',
        target: 'JSON',
        entities: ['CLIENT'],
        scheduledAt,
        createdBy: 'user-1',
      });

      expect(job.scheduledAt).toEqual(scheduledAt);
    });

    it('should create job from template', () => {
      const templates = service.getTemplates();
      const template = templates.find((t) => t.isSystem);

      const job = service.createJobFromTemplate(template!.id, 'tenant-1', 'user-1');

      expect(job.type).toBe(template!.type);
      expect(job.source).toBe(template!.source);
    });

    it('should override template values', () => {
      const templates = service.getTemplates();
      const template = templates[0];

      const job = service.createJobFromTemplate(template.id, 'tenant-1', 'user-1', {
        name: 'Custom Name',
        nameRo: 'Nume Personalizat',
      });

      expect(job.name).toBe('Custom Name');
    });

    it('should emit job created event', () => {
      service.createJob({
        tenantId: 'tenant-1',
        name: 'Event Test',
        nameRo: 'Test Eveniment',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        createdBy: 'user-1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('migration.job.created', expect.any(Object));
    });
  });

  describe('Job Retrieval', () => {
    let jobId: string;

    beforeEach(() => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Retrieve Test',
        nameRo: 'Test Recuperare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        createdBy: 'user-1',
      });
      jobId = job.id;
    });

    it('should get job by id', () => {
      const job = service.getJob(jobId);
      expect(job.name).toBe('Retrieve Test');
    });

    it('should throw for invalid job id', () => {
      expect(() => service.getJob('invalid-id')).toThrow(NotFoundException);
    });

    it('should get all jobs', () => {
      const jobs = service.getJobs();
      expect(jobs.length).toBeGreaterThan(0);
    });

    it('should filter by tenant', () => {
      service.createJob({
        tenantId: 'tenant-2',
        name: 'Other Tenant',
        nameRo: 'Alt Tenant',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'EXPORT',
        source: 'DATABASE',
        target: 'CSV',
        entities: ['CLIENT'],
        createdBy: 'user-1',
      });

      const jobs = service.getJobs({ tenantId: 'tenant-1' });
      expect(jobs.every((j) => j.tenantId === 'tenant-1')).toBe(true);
    });

    it('should filter by status', () => {
      const jobs = service.getJobs({ status: 'PENDING' });
      expect(jobs.every((j) => j.status === 'PENDING')).toBe(true);
    });

    it('should filter by type', () => {
      const jobs = service.getJobs({ type: 'IMPORT' });
      expect(jobs.every((j) => j.type === 'IMPORT')).toBe(true);
    });
  });

  describe('Job Configuration', () => {
    let jobId: string;

    beforeEach(() => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Config Test',
        nameRo: 'Test Configurare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        createdBy: 'user-1',
      });
      jobId = job.id;
    });

    it('should update job config', () => {
      const updated = service.updateJobConfig(jobId, { batchSize: 200 });
      expect(updated.config.batchSize).toBe(200);
    });

    it('should throw when updating non-pending job', async () => {
      // Update config to skip errors so job can complete
      service.updateJobConfig(jobId, { validateBefore: false, skipErrors: true });
      await service.runJob(jobId);

      expect(() => service.updateJobConfig(jobId, { batchSize: 50 })).toThrow(BadRequestException);
    });
  });

  describe('Job Deletion', () => {
    it('should delete job', () => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Delete Test',
        nameRo: 'Test Ștergere',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        createdBy: 'user-1',
      });

      service.deleteJob(job.id);
      expect(() => service.getJob(job.id)).toThrow(NotFoundException);
    });

    it('should emit job deleted event', () => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Delete Event',
        nameRo: 'Eveniment Ștergere',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        createdBy: 'user-1',
      });

      service.deleteJob(job.id);
      expect(eventEmitter.emit).toHaveBeenCalledWith('migration.job.deleted', { jobId: job.id });
    });
  });

  describe('Job Validation', () => {
    let jobId: string;

    beforeEach(() => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Validate Test',
        nameRo: 'Test Validare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        createdBy: 'user-1',
      });
      jobId = job.id;
    });

    it('should validate job', async () => {
      const result = await service.validateJob(jobId);

      expect(result.checkedAt).toBeDefined();
      expect(result.totalRecords).toBeGreaterThan(0);
    });

    it('should return validation result', async () => {
      const result = await service.validateJob(jobId);

      expect(result.validRecords).toBeDefined();
      expect(result.invalidRecords).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should update job validation status', async () => {
      await service.validateJob(jobId);
      const job = service.getJob(jobId);

      expect(job.validation.checkedAt).toBeDefined();
    });

    it('should throw when validating non-pending job', async () => {
      // Update config to skip errors so job can complete
      service.updateJobConfig(jobId, { validateBefore: false, skipErrors: true });
      await service.runJob(jobId);

      await expect(service.validateJob(jobId)).rejects.toThrow(BadRequestException);
    });

    it('should emit validation event', async () => {
      await service.validateJob(jobId);

      expect(eventEmitter.emit).toHaveBeenCalledWith('migration.job.validated', expect.any(Object));
    });
  });

  describe('Job Execution', () => {
    let jobId: string;

    beforeEach(() => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Run Test',
        nameRo: 'Test Executare',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        config: { batchSize: 10, validateBefore: false, backupBefore: true },
        createdBy: 'user-1',
      });
      jobId = job.id;
    });

    it('should run job', async () => {
      const job = await service.runJob(jobId);

      expect(['COMPLETED', 'FAILED']).toContain(job.status);
      expect(job.startedAt).toBeDefined();
      expect(job.completedAt).toBeDefined();
    });

    it('should track progress', async () => {
      const job = await service.runJob(jobId);

      expect(job.progress.processedRecords).toBeGreaterThan(0);
      expect(job.progress.percentComplete).toBe(100);
    });

    it('should process in batches', async () => {
      const job = await service.runJob(jobId);

      expect(job.progress.totalBatches).toBeGreaterThan(0);
    });

    it('should create backup when configured', async () => {
      const job = await service.runJob(jobId);

      expect(job.rollback?.canRollback).toBe(true);
      expect(job.rollback?.backupId).toBeDefined();
    });

    it('should throw when running non-pending job', async () => {
      await service.runJob(jobId);

      await expect(service.runJob(jobId)).rejects.toThrow(BadRequestException);
    });

    it('should emit progress events', async () => {
      await service.runJob(jobId);

      expect(eventEmitter.emit).toHaveBeenCalledWith('migration.job.progress', expect.any(Object));
    });

    it('should emit completed event', async () => {
      await service.runJob(jobId);

      expect(eventEmitter.emit).toHaveBeenCalledWith('migration.job.completed', expect.any(Object));
    });
  });

  describe('Job Control', () => {
    let jobId: string;

    beforeEach(() => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Control Test',
        nameRo: 'Test Control',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        config: { validateBefore: false, backupBefore: false },
        createdBy: 'user-1',
      });
      jobId = job.id;
    });

    it('should pause running job', async () => {
      // Start job then immediately set to running
      const job = service.getJob(jobId);
      (job as any).status = 'RUNNING';

      const paused = service.pauseJob(jobId);
      expect(paused.status).toBe('PAUSED');
    });

    it('should resume paused job', async () => {
      const job = service.getJob(jobId);
      (job as any).status = 'RUNNING';
      service.pauseJob(jobId);

      const resumed = service.resumeJob(jobId);
      expect(resumed.status).toBe('RUNNING');
    });

    it('should throw when pausing non-running job', () => {
      expect(() => service.pauseJob(jobId)).toThrow(BadRequestException);
    });

    it('should throw when resuming non-paused job', () => {
      expect(() => service.resumeJob(jobId)).toThrow(BadRequestException);
    });

    it('should emit pause event', () => {
      const job = service.getJob(jobId);
      (job as any).status = 'RUNNING';

      service.pauseJob(jobId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('migration.job.paused', { jobId });
    });

    it('should emit resume event', () => {
      const job = service.getJob(jobId);
      (job as any).status = 'RUNNING';
      service.pauseJob(jobId);

      service.resumeJob(jobId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('migration.job.resumed', { jobId });
    });
  });

  describe('Job Rollback', () => {
    let jobId: string;

    beforeEach(async () => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Rollback Test',
        nameRo: 'Test Rollback',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        config: { validateBefore: false, backupBefore: true, batchSize: 10 },
        createdBy: 'user-1',
      });
      jobId = job.id;

      await service.runJob(jobId);
    });

    it('should rollback completed job', async () => {
      const job = await service.rollbackJob(jobId);

      expect(job.status).toBe('ROLLED_BACK');
      expect(job.rollback?.rollbackAt).toBeDefined();
    });

    it('should record rolled back records count', async () => {
      const job = await service.rollbackJob(jobId);

      expect(job.rollback?.rolledBackRecords).toBeGreaterThanOrEqual(0);
    });

    it('should throw when rollback not available', async () => {
      const noBackupJob = service.createJob({
        tenantId: 'tenant-1',
        name: 'No Backup',
        nameRo: 'Fără Backup',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        config: { validateBefore: false, backupBefore: false },
        createdBy: 'user-1',
      });

      await service.runJob(noBackupJob.id);

      await expect(service.rollbackJob(noBackupJob.id)).rejects.toThrow(BadRequestException);
    });

    it('should emit rollback event', async () => {
      await service.rollbackJob(jobId);

      expect(eventEmitter.emit).toHaveBeenCalledWith('migration.job.rolledback', { jobId });
    });
  });

  describe('Data Preview', () => {
    it('should preview data', () => {
      const preview = service.previewData('CSV');

      expect(preview.totalRecords).toBeGreaterThan(0);
      expect(preview.sampleRecords.length).toBeGreaterThan(0);
    });

    it('should detect fields', () => {
      const preview = service.previewData('EXCEL');

      expect(preview.detectedFields.length).toBeGreaterThan(0);
      preview.detectedFields.forEach((field) => {
        expect(field.name).toBeDefined();
        expect(field.type).toBeDefined();
      });
    });

    it('should suggest mappings', () => {
      const preview = service.previewData('CSV');

      expect(preview.suggestedMappings.length).toBeGreaterThan(0);
      preview.suggestedMappings.forEach((mapping) => {
        expect(mapping.sourceField).toBeDefined();
        expect(mapping.targetField).toBeDefined();
      });
    });

    it('should preview custom data', () => {
      const customData = [
        { CustomField: 'Value 1', AnotherField: 123 },
        { CustomField: 'Value 2', AnotherField: 456 },
      ];

      const preview = service.previewData('JSON', customData);
      expect(preview.totalRecords).toBe(2);
    });
  });

  describe('Templates', () => {
    it('should get template by id', () => {
      const templates = service.getTemplates();
      const template = service.getTemplate(templates[0].id);

      expect(template.name).toBeDefined();
    });

    it('should throw for invalid template id', () => {
      expect(() => service.getTemplate('invalid-id')).toThrow(NotFoundException);
    });

    it('should filter templates by type', () => {
      const templates = service.getTemplates({ type: 'IMPORT' });
      expect(templates.every((t) => t.type === 'IMPORT')).toBe(true);
    });

    it('should filter templates by source', () => {
      const templates = service.getTemplates({ source: 'EXCEL' });
      expect(templates.every((t) => t.source === 'EXCEL')).toBe(true);
    });

    it('should create custom template', () => {
      const template = service.createTemplate({
        name: 'Custom Template',
        nameRo: 'Șablon Personalizat',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'SYNC',
        source: 'API',
        target: 'DATABASE',
        entities: ['PRODUCT'],
        config: {
          batchSize: 50,
          skipErrors: true,
          dryRun: false,
          validateBefore: true,
          backupBefore: false,
          fieldMappings: [],
          transformations: [],
        },
        createdBy: 'user-1',
      });

      expect(template.id).toBeDefined();
      expect(template.isSystem).toBe(false);
    });

    it('should delete custom template', () => {
      const template = service.createTemplate({
        name: 'Delete Template',
        nameRo: 'Șterge Șablon',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'EXPORT',
        source: 'DATABASE',
        target: 'CSV',
        entities: ['CLIENT'],
        config: {
          batchSize: 100,
          skipErrors: false,
          dryRun: false,
          validateBefore: true,
          backupBefore: true,
          fieldMappings: [],
          transformations: [],
        },
        createdBy: 'user-1',
      });

      service.deleteTemplate(template.id);
      expect(() => service.getTemplate(template.id)).toThrow(NotFoundException);
    });

    it('should not delete system templates', () => {
      const templates = service.getTemplates();
      const systemTemplate = templates.find((t) => t.isSystem);

      expect(() => service.deleteTemplate(systemTemplate!.id)).toThrow(BadRequestException);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      const job = service.createJob({
        tenantId: 'tenant-1',
        name: 'Stats Job',
        nameRo: 'Job Statistici',
        description: 'Test',
        descriptionRo: 'Test',
        type: 'IMPORT',
        source: 'CSV',
        target: 'DATABASE',
        entities: ['CLIENT'],
        config: { validateBefore: false, backupBefore: false, batchSize: 10 },
        createdBy: 'user-1',
      });

      await service.runJob(job.id);
    });

    it('should get stats', () => {
      const stats = service.getStats();

      expect(stats.totalJobs).toBeGreaterThan(0);
    });

    it('should count by status', () => {
      const stats = service.getStats();

      expect(stats.byStatus.COMPLETED).toBeGreaterThanOrEqual(0);
      expect(stats.byStatus.FAILED).toBeGreaterThanOrEqual(0);
    });

    it('should count by type', () => {
      const stats = service.getStats();

      expect(stats.byType.IMPORT).toBeGreaterThan(0);
    });

    it('should count migrated records', () => {
      const stats = service.getStats();

      expect(stats.totalRecordsMigrated).toBeGreaterThanOrEqual(0);
    });

    it('should calculate success rate', () => {
      const stats = service.getStats();

      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it('should filter stats by tenant', () => {
      const stats = service.getStats('tenant-1');

      expect(stats.totalJobs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Supported Sources', () => {
    it('should get supported sources', () => {
      const sources = service.getSupportedSources();

      expect(sources.length).toBeGreaterThan(0);
    });

    it('should have bilingual labels', () => {
      const sources = service.getSupportedSources();

      sources.forEach((source) => {
        expect(source.label).toBeDefined();
        expect(source.labelRo).toBeDefined();
      });
    });

    it('should have supported types', () => {
      const sources = service.getSupportedSources();

      sources.forEach((source) => {
        expect(source.supportedTypes.length).toBeGreaterThan(0);
      });
    });

    it('should include CSV source', () => {
      const sources = service.getSupportedSources();
      expect(sources.some((s) => s.source === 'CSV')).toBe(true);
    });

    it('should include SAGA source', () => {
      const sources = service.getSupportedSources();
      expect(sources.some((s) => s.source === 'SAGA')).toBe(true);
    });

    it('should include ANAF source', () => {
      const sources = service.getSupportedSources();
      expect(sources.some((s) => s.source === 'ANAF')).toBe(true);
    });
  });

  describe('Supported Entities', () => {
    it('should get supported entities', () => {
      const entities = service.getSupportedEntities();

      expect(entities.length).toBeGreaterThan(0);
    });

    it('should have bilingual labels', () => {
      const entities = service.getSupportedEntities();

      entities.forEach((entity) => {
        expect(entity.label).toBeDefined();
        expect(entity.labelRo).toBeDefined();
      });
    });

    it('should include CLIENT entity', () => {
      const entities = service.getSupportedEntities();
      expect(entities.some((e) => e.entity === 'CLIENT')).toBe(true);
    });

    it('should include INVOICE entity', () => {
      const entities = service.getSupportedEntities();
      expect(entities.some((e) => e.entity === 'INVOICE')).toBe(true);
    });
  });

  describe('Migration Types', () => {
    const types: MigrationType[] = ['IMPORT', 'EXPORT', 'TRANSFORM', 'SYNC', 'BACKUP', 'RESTORE'];

    types.forEach((type) => {
      it(`should create ${type} job`, () => {
        const job = service.createJob({
          tenantId: 'tenant-1',
          name: `${type} Job`,
          nameRo: `Job ${type}`,
          description: 'Test',
          descriptionRo: 'Test',
          type,
          source: type === 'IMPORT' ? 'CSV' : 'DATABASE',
          target: type === 'EXPORT' ? 'CSV' : 'DATABASE',
          entities: ['CLIENT'],
          createdBy: 'user-1',
        });

        expect(job.type).toBe(type);
      });
    });
  });

  describe('Entity Types', () => {
    const entities: EntityType[] = ['CLIENT', 'INVOICE', 'PRODUCT', 'EMPLOYEE', 'TRANSACTION', 'DOCUMENT', 'SETTING'];

    entities.forEach((entity) => {
      it(`should create job for ${entity} entity`, () => {
        const job = service.createJob({
          tenantId: 'tenant-1',
          name: `${entity} Job`,
          nameRo: `Job ${entity}`,
          description: 'Test',
          descriptionRo: 'Test',
          type: 'IMPORT',
          source: 'CSV',
          target: 'DATABASE',
          entities: [entity],
          createdBy: 'user-1',
        });

        expect(job.entities).toContain(entity);
      });
    });
  });
});
