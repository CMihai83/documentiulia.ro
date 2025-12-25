import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DataPipelineService,
  ImportJob,
  ExportJob,
  Pipeline,
  EntityType,
  FieldMapping,
} from './data-pipeline.service';

describe('DataPipelineService', () => {
  let service: DataPipelineService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataPipelineService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DataPipelineService>(DataPipelineService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with import templates', async () => {
      const templates = await service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should include Romanian business templates', async () => {
      const templates = await service.getTemplates();
      const invoices = templates.find(t => t.entityType === 'invoices');
      const partners = templates.find(t => t.entityType === 'partners');

      expect(invoices).toBeDefined();
      expect(partners).toBeDefined();
    });
  });

  describe('Import Jobs', () => {
    const validImportParams = {
      tenantId: 'tenant-1',
      name: 'Partner Import',
      type: 'csv' as const,
      entityType: 'partners' as EntityType,
      sourceFile: {
        name: 'partners.csv',
        size: 1024,
        mimeType: 'text/csv',
        uploadedAt: new Date(),
      },
      mapping: [
        { sourceField: 'Company Name', targetField: 'name', required: true },
        { sourceField: 'CUI', targetField: 'cui', required: false },
      ],
      createdBy: 'user-1',
    };

    describe('createImportJob', () => {
      it('should create an import job', async () => {
        const job = await service.createImportJob(validImportParams);

        expect(job.id).toBeDefined();
        expect(job.tenantId).toBe('tenant-1');
        expect(job.name).toBe('Partner Import');
        expect(job.type).toBe('csv');
        expect(job.entityType).toBe('partners');
        expect(job.status).toBe('pending');
      });

      it('should initialize progress', async () => {
        const job = await service.createImportJob(validImportParams);

        expect(job.progress).toEqual({
          totalRows: 0,
          processedRows: 0,
          successRows: 0,
          failedRows: 0,
          percentage: 0,
        });
      });

      it('should use default options', async () => {
        const job = await service.createImportJob(validImportParams);

        expect(job.options.skipFirstRow).toBe(true);
        expect(job.options.updateExisting).toBe(false);
        expect(job.options.validateOnly).toBe(false);
        expect(job.options.batchSize).toBe(100);
        expect(job.options.delimiter).toBe(',');
        expect(job.options.encoding).toBe('utf-8');
        expect(job.options.dateFormat).toBe('YYYY-MM-DD');
        expect(job.options.decimalSeparator).toBe('.');
      });

      it('should accept custom options', async () => {
        const job = await service.createImportJob({
          ...validImportParams,
          options: {
            skipFirstRow: false,
            updateExisting: true,
            matchField: 'cui',
            batchSize: 50,
            delimiter: ';',
            decimalSeparator: ',',
          },
        });

        expect(job.options.skipFirstRow).toBe(false);
        expect(job.options.updateExisting).toBe(true);
        expect(job.options.matchField).toBe('cui');
        expect(job.options.batchSize).toBe(50);
        expect(job.options.delimiter).toBe(';');
        expect(job.options.decimalSeparator).toBe(',');
      });

      it('should emit import.job.created event', async () => {
        const job = await service.createImportJob(validImportParams);

        expect(mockEventEmitter.emit).toHaveBeenCalledWith('import.job.created', { job });
      });

      it('should support different file types', async () => {
        for (const type of ['csv', 'excel', 'json', 'xml'] as const) {
          const job = await service.createImportJob({
            ...validImportParams,
            type,
          });
          expect(job.type).toBe(type);
        }
      });

      it('should support different entity types', async () => {
        for (const entityType of ['invoices', 'partners', 'products', 'employees'] as EntityType[]) {
          const job = await service.createImportJob({
            ...validImportParams,
            entityType,
          });
          expect(job.entityType).toBe(entityType);
        }
      });
    });

    describe('startImportJob', () => {
      let job: ImportJob;

      beforeEach(async () => {
        job = await service.createImportJob(validImportParams);
      });

      it('should start import job', async () => {
        const started = await service.startImportJob(job.id);

        expect(started.status).toBe('processing');
        expect(started.startedAt).toBeDefined();
      });

      it('should throw NotFoundException for invalid job', async () => {
        await expect(service.startImportJob('invalid-id')).rejects.toThrow('Import job not found');
      });

      it('should throw BadRequestException for non-pending job', async () => {
        await service.startImportJob(job.id);

        await expect(service.startImportJob(job.id)).rejects.toThrow('Job is not in pending status');
      });
    });

    describe('cancelImportJob', () => {
      let job: ImportJob;

      beforeEach(async () => {
        job = await service.createImportJob(validImportParams);
        await service.startImportJob(job.id);
      });

      it('should cancel processing job', async () => {
        await service.cancelImportJob(job.id);

        const cancelled = await service.getImportJob(job.id);
        expect(cancelled?.status).toBe('cancelled');
      });

      it('should throw NotFoundException for invalid job', async () => {
        await expect(service.cancelImportJob('invalid-id')).rejects.toThrow('Import job not found');
      });

      it('should throw BadRequestException for non-processing job', async () => {
        const pendingJob = await service.createImportJob(validImportParams);

        await expect(service.cancelImportJob(pendingJob.id)).rejects.toThrow('Can only cancel processing jobs');
      });
    });

    describe('getImportJob', () => {
      it('should return job by ID', async () => {
        const created = await service.createImportJob(validImportParams);

        const job = await service.getImportJob(created.id);

        expect(job).toBeDefined();
        expect(job?.id).toBe(created.id);
      });

      it('should return null for non-existent job', async () => {
        const job = await service.getImportJob('invalid-id');

        expect(job).toBeNull();
      });
    });

    describe('getImportJobs', () => {
      beforeEach(async () => {
        await service.createImportJob({
          ...validImportParams,
          name: 'Import 1',
        });

        await new Promise(resolve => setTimeout(resolve, 5));

        await service.createImportJob({
          ...validImportParams,
          name: 'Import 2',
        });

        await service.createImportJob({
          ...validImportParams,
          tenantId: 'tenant-2',
          name: 'Other tenant import',
        });
      });

      it('should return jobs for tenant', async () => {
        const jobs = await service.getImportJobs('tenant-1');

        expect(jobs.length).toBe(2);
        expect(jobs.every(j => j.tenantId === 'tenant-1')).toBe(true);
      });

      it('should sort by createdAt descending', async () => {
        const jobs = await service.getImportJobs('tenant-1');

        expect(jobs[0].name).toBe('Import 2');
        expect(jobs[1].name).toBe('Import 1');
      });

      it('should limit results', async () => {
        const jobs = await service.getImportJobs('tenant-1', 1);

        expect(jobs.length).toBe(1);
      });

      it('should return empty array for tenant without jobs', async () => {
        const jobs = await service.getImportJobs('tenant-99');

        expect(jobs).toEqual([]);
      });
    });
  });

  describe('Export Jobs', () => {
    const validExportParams = {
      tenantId: 'tenant-1',
      name: 'Invoice Export',
      format: 'csv' as const,
      entityType: 'invoices' as EntityType,
      filters: { status: 'paid' },
      fields: ['number', 'date', 'amount'],
      createdBy: 'user-1',
    };

    describe('createExportJob', () => {
      it('should create an export job', async () => {
        const job = await service.createExportJob(validExportParams);

        expect(job.id).toBeDefined();
        expect(job.tenantId).toBe('tenant-1');
        expect(job.name).toBe('Invoice Export');
        expect(job.format).toBe('csv');
        expect(job.entityType).toBe('invoices');
        expect(job.status).toBe('pending');
      });

      it('should store filters', async () => {
        const job = await service.createExportJob(validExportParams);

        expect(job.filters).toEqual({ status: 'paid' });
      });

      it('should store selected fields', async () => {
        const job = await service.createExportJob(validExportParams);

        expect(job.fields).toEqual(['number', 'date', 'amount']);
      });

      it('should initialize progress', async () => {
        const job = await service.createExportJob(validExportParams);

        expect(job.progress).toEqual({
          totalRecords: 0,
          processedRecords: 0,
          percentage: 0,
        });
      });

      it('should use default options', async () => {
        const job = await service.createExportJob(validExportParams);

        expect(job.options.includeHeaders).toBe(true);
        expect(job.options.delimiter).toBe(',');
        expect(job.options.dateFormat).toBe('YYYY-MM-DD');
        expect(job.options.decimalSeparator).toBe('.');
        expect(job.options.encoding).toBe('utf-8');
        expect(job.options.compress).toBe(false);
      });

      it('should accept custom options', async () => {
        const job = await service.createExportJob({
          ...validExportParams,
          options: {
            includeHeaders: false,
            delimiter: ';',
            compress: true,
          },
        });

        expect(job.options.includeHeaders).toBe(false);
        expect(job.options.delimiter).toBe(';');
        expect(job.options.compress).toBe(true);
      });

      it('should support different formats', async () => {
        for (const format of ['csv', 'excel', 'json', 'xml', 'pdf'] as const) {
          const job = await service.createExportJob({
            ...validExportParams,
            format,
          });
          expect(job.format).toBe(format);
        }
      });
    });

    describe('startExportJob', () => {
      let job: ExportJob;

      beforeEach(async () => {
        job = await service.createExportJob(validExportParams);
      });

      it('should start export job', async () => {
        const started = await service.startExportJob(job.id);

        expect(started.status).toBe('processing');
        expect(started.startedAt).toBeDefined();
      });

      it('should throw NotFoundException for invalid job', async () => {
        await expect(service.startExportJob('invalid-id')).rejects.toThrow('Export job not found');
      });
    });

    describe('getExportJob', () => {
      it('should return job by ID', async () => {
        const created = await service.createExportJob(validExportParams);

        const job = await service.getExportJob(created.id);

        expect(job).toBeDefined();
        expect(job?.id).toBe(created.id);
      });

      it('should return null for non-existent job', async () => {
        const job = await service.getExportJob('invalid-id');

        expect(job).toBeNull();
      });
    });

    describe('getExportJobs', () => {
      beforeEach(async () => {
        await service.createExportJob({
          ...validExportParams,
          name: 'Export 1',
        });

        await new Promise(resolve => setTimeout(resolve, 5));

        await service.createExportJob({
          ...validExportParams,
          name: 'Export 2',
        });
      });

      it('should return jobs for tenant', async () => {
        const jobs = await service.getExportJobs('tenant-1');

        expect(jobs.length).toBe(2);
        expect(jobs.every(j => j.tenantId === 'tenant-1')).toBe(true);
      });

      it('should sort by createdAt descending', async () => {
        const jobs = await service.getExportJobs('tenant-1');

        expect(jobs[0].name).toBe('Export 2');
        expect(jobs[1].name).toBe('Export 1');
      });

      it('should limit results', async () => {
        const jobs = await service.getExportJobs('tenant-1', 1);

        expect(jobs.length).toBe(1);
      });
    });
  });

  describe('Pipelines', () => {
    const validPipelineParams = {
      tenantId: 'tenant-1',
      name: 'Daily Invoice Sync',
      description: 'Import invoices from external system',
      type: 'import' as const,
      entityType: 'invoices' as EntityType,
      source: {
        type: 'ftp' as const,
        config: { host: 'ftp.example.com', path: '/invoices' },
      },
      destination: {
        type: 'database' as const,
        config: { table: 'invoices' },
      },
      mapping: [
        { sourceField: 'inv_no', targetField: 'number', required: true },
        { sourceField: 'inv_date', targetField: 'issueDate', required: true },
      ],
      schedule: '0 6 * * *',
    };

    describe('createPipeline', () => {
      it('should create a pipeline', async () => {
        const pipeline = await service.createPipeline(validPipelineParams);

        expect(pipeline.id).toBeDefined();
        expect(pipeline.tenantId).toBe('tenant-1');
        expect(pipeline.name).toBe('Daily Invoice Sync');
        expect(pipeline.type).toBe('import');
        expect(pipeline.entityType).toBe('invoices');
        expect(pipeline.isActive).toBe(true);
      });

      it('should store source configuration', async () => {
        const pipeline = await service.createPipeline(validPipelineParams);

        expect(pipeline.source.type).toBe('ftp');
        expect(pipeline.source.config.host).toBe('ftp.example.com');
      });

      it('should store destination configuration', async () => {
        const pipeline = await service.createPipeline(validPipelineParams);

        expect(pipeline.destination.type).toBe('database');
        expect(pipeline.destination.config.table).toBe('invoices');
      });

      it('should store mapping', async () => {
        const pipeline = await service.createPipeline(validPipelineParams);

        expect(pipeline.mapping.length).toBe(2);
        expect(pipeline.mapping[0].sourceField).toBe('inv_no');
      });

      it('should store schedule', async () => {
        const pipeline = await service.createPipeline(validPipelineParams);

        expect(pipeline.schedule).toBe('0 6 * * *');
      });

      it('should initialize stats', async () => {
        const pipeline = await service.createPipeline(validPipelineParams);

        expect(pipeline.stats).toEqual({
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
        });
      });

      it('should support different source types', async () => {
        for (const sourceType of ['file', 'api', 'database', 'ftp', 'sftp', 's3'] as const) {
          const pipeline = await service.createPipeline({
            ...validPipelineParams,
            source: { type: sourceType, config: {} },
          });
          expect(pipeline.source.type).toBe(sourceType);
        }
      });
    });

    describe('updatePipeline', () => {
      let pipeline: Pipeline;

      beforeEach(async () => {
        pipeline = await service.createPipeline(validPipelineParams);
      });

      it('should update name', async () => {
        const updated = await service.updatePipeline(pipeline.id, {
          name: 'Updated Pipeline',
        });

        expect(updated?.name).toBe('Updated Pipeline');
      });

      it('should update description', async () => {
        const updated = await service.updatePipeline(pipeline.id, {
          description: 'New description',
        });

        expect(updated?.description).toBe('New description');
      });

      it('should update schedule', async () => {
        const updated = await service.updatePipeline(pipeline.id, {
          schedule: '0 12 * * *',
        });

        expect(updated?.schedule).toBe('0 12 * * *');
      });

      it('should update isActive', async () => {
        const updated = await service.updatePipeline(pipeline.id, {
          isActive: false,
        });

        expect(updated?.isActive).toBe(false);
      });

      it('should update updatedAt', async () => {
        const originalUpdatedAt = pipeline.updatedAt;
        await new Promise(resolve => setTimeout(resolve, 5));

        const updated = await service.updatePipeline(pipeline.id, {
          name: 'Updated',
        });

        expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      });

      it('should return null for non-existent pipeline', async () => {
        const updated = await service.updatePipeline('invalid-id', { name: 'Test' });

        expect(updated).toBeNull();
      });
    });

    describe('deletePipeline', () => {
      let pipeline: Pipeline;

      beforeEach(async () => {
        pipeline = await service.createPipeline(validPipelineParams);
      });

      it('should delete pipeline', async () => {
        await service.deletePipeline(pipeline.id);

        const pipelines = await service.getPipelines('tenant-1');
        expect(pipelines.find(p => p.id === pipeline.id)).toBeUndefined();
      });
    });

    describe('getPipelines', () => {
      beforeEach(async () => {
        await service.createPipeline({
          ...validPipelineParams,
          name: 'Pipeline 1',
        });

        await new Promise(resolve => setTimeout(resolve, 5));

        await service.createPipeline({
          ...validPipelineParams,
          name: 'Pipeline 2',
        });
      });

      it('should return pipelines for tenant', async () => {
        const pipelines = await service.getPipelines('tenant-1');

        expect(pipelines.length).toBe(2);
        expect(pipelines.every(p => p.tenantId === 'tenant-1')).toBe(true);
      });

      it('should sort by createdAt descending', async () => {
        const pipelines = await service.getPipelines('tenant-1');

        expect(pipelines[0].name).toBe('Pipeline 2');
        expect(pipelines[1].name).toBe('Pipeline 1');
      });
    });

    describe('runPipeline', () => {
      let pipeline: Pipeline;

      beforeEach(async () => {
        pipeline = await service.createPipeline(validPipelineParams);
      });

      it('should run pipeline', async () => {
        const result = await service.runPipeline(pipeline.id);

        expect(typeof result.success).toBe('boolean');
        expect(result.message).toBeDefined();
      });

      it('should update lastRunAt', async () => {
        await service.runPipeline(pipeline.id);

        const updated = (await service.getPipelines('tenant-1')).find(p => p.id === pipeline.id);
        expect(updated?.lastRunAt).toBeDefined();
      });

      it('should increment totalRuns', async () => {
        await service.runPipeline(pipeline.id);
        await service.runPipeline(pipeline.id);

        const updated = (await service.getPipelines('tenant-1')).find(p => p.id === pipeline.id);
        expect(updated?.stats.totalRuns).toBe(2);
      });

      it('should throw NotFoundException for invalid pipeline', async () => {
        await expect(service.runPipeline('invalid-id')).rejects.toThrow('Pipeline not found');
      });
    });
  });

  describe('Templates', () => {
    describe('getTemplates', () => {
      it('should return all templates', async () => {
        const templates = await service.getTemplates();

        expect(templates.length).toBeGreaterThan(0);
      });

      it('should filter by entity type', async () => {
        const invoiceTemplates = await service.getTemplates('invoices');

        expect(invoiceTemplates.length).toBe(1);
        expect(invoiceTemplates[0].entityType).toBe('invoices');
      });

      it('should return empty array for unknown entity type', async () => {
        const templates = await service.getTemplates('unknown' as EntityType);

        expect(templates).toEqual([]);
      });
    });

    describe('getTemplate', () => {
      it('should return template by ID', async () => {
        const template = await service.getTemplate('tpl-invoices');

        expect(template).toBeDefined();
        expect(template?.name).toBe('Invoices Import');
      });

      it('should return null for non-existent template', async () => {
        const template = await service.getTemplate('invalid-id');

        expect(template).toBeNull();
      });
    });

    describe('Invoice template', () => {
      it('should have required invoice fields', async () => {
        const template = await service.getTemplate('tpl-invoices');

        const fieldNames = template?.fields.map(f => f.name);
        expect(fieldNames).toContain('number');
        expect(fieldNames).toContain('series');
        expect(fieldNames).toContain('issueDate');
        expect(fieldNames).toContain('dueDate');
        expect(fieldNames).toContain('partnerName');
        expect(fieldNames).toContain('netAmount');
        expect(fieldNames).toContain('vatRate');
        expect(fieldNames).toContain('currency');
      });

      it('should include Romanian CUI field', async () => {
        const template = await service.getTemplate('tpl-invoices');

        const cuiField = template?.fields.find(f => f.name === 'partnerCui');
        expect(cuiField).toBeDefined();
        expect(cuiField?.example).toBe('RO12345678');
      });
    });

    describe('Partners template', () => {
      it('should have required partner fields', async () => {
        const template = await service.getTemplate('tpl-partners');

        const fieldNames = template?.fields.map(f => f.name);
        expect(fieldNames).toContain('name');
        expect(fieldNames).toContain('cui');
        expect(fieldNames).toContain('regCom');
        expect(fieldNames).toContain('type');
        expect(fieldNames).toContain('email');
        expect(fieldNames).toContain('address');
        expect(fieldNames).toContain('city');
        expect(fieldNames).toContain('country');
      });

      it('should include Romanian trade register field', async () => {
        const template = await service.getTemplate('tpl-partners');

        const regComField = template?.fields.find(f => f.name === 'regCom');
        expect(regComField).toBeDefined();
        expect(regComField?.example).toBe('J40/1234/2020');
      });
    });
  });

  describe('Field Detection', () => {
    describe('detectFields', () => {
      it('should detect fields from sample data', async () => {
        const fields = await service.detectFields({
          type: 'csv',
          sampleData: 'name,email,amount\nTest,test@example.com,100',
        });

        expect(fields.length).toBeGreaterThan(0);
        expect(fields[0]).toHaveProperty('name');
        expect(fields[0]).toHaveProperty('type');
        expect(fields[0]).toHaveProperty('sample');
      });

      it('should detect different field types', async () => {
        const fields = await service.detectFields({
          type: 'csv',
          sampleData: 'data',
        });

        const types = fields.map(f => f.type);
        expect(types).toContain('string');
        expect(types).toContain('number');
        expect(types).toContain('date');
        expect(types).toContain('email');
      });
    });

    describe('suggestMapping', () => {
      it('should suggest mappings for source fields', async () => {
        const mappings = await service.suggestMapping({
          sourceFields: ['Invoice Number', 'Issue Date', 'Net Amount'],
          entityType: 'invoices',
        });

        expect(mappings.length).toBe(3);
        expect(mappings.every(m => m.sourceField)).toBe(true);
      });

      it('should match fields by name', async () => {
        const mappings = await service.suggestMapping({
          sourceFields: ['number', 'currency'],
          entityType: 'invoices',
        });

        const numberMapping = mappings.find(m => m.sourceField === 'number');
        expect(numberMapping?.targetField).toBe('number');
      });

      it('should return empty target for unmatched fields', async () => {
        const mappings = await service.suggestMapping({
          sourceFields: ['unknownField123'],
          entityType: 'invoices',
        });

        expect(mappings[0].targetField).toBe('');
      });

      it('should return empty array for unknown entity type', async () => {
        const mappings = await service.suggestMapping({
          sourceFields: ['field1'],
          entityType: 'unknown' as EntityType,
        });

        expect(mappings.every(m => m.targetField === '')).toBe(true);
      });
    });
  });

  describe('Stats', () => {
    beforeEach(async () => {
      // Create import jobs
      await service.createImportJob({
        tenantId: 'tenant-1',
        name: 'Import 1',
        type: 'csv',
        entityType: 'partners',
        sourceFile: { name: 'file.csv', size: 100, mimeType: 'text/csv', uploadedAt: new Date() },
        mapping: [],
        createdBy: 'user-1',
      });

      // Create export jobs
      await service.createExportJob({
        tenantId: 'tenant-1',
        name: 'Export 1',
        format: 'csv',
        entityType: 'invoices',
        createdBy: 'user-1',
      });

      // Create pipelines
      await service.createPipeline({
        tenantId: 'tenant-1',
        name: 'Pipeline 1',
        type: 'import',
        entityType: 'partners',
        source: { type: 'ftp', config: {} },
        destination: { type: 'database', config: {} },
        mapping: [],
      });
    });

    describe('getStats', () => {
      it('should return total imports', async () => {
        const stats = await service.getStats();

        expect(stats.totalImports).toBe(1);
      });

      it('should return total exports', async () => {
        const stats = await service.getStats();

        expect(stats.totalExports).toBe(1);
      });

      it('should return total pipelines', async () => {
        const stats = await service.getStats();

        expect(stats.totalPipelines).toBe(1);
      });

      it('should return active pipelines', async () => {
        const stats = await service.getStats();

        expect(stats.activePipelines).toBe(1);
      });

      it('should include recent activity', async () => {
        const stats = await service.getStats();

        expect(stats.recentActivity.length).toBeGreaterThan(0);
        expect(stats.recentActivity[0]).toHaveProperty('type');
        expect(stats.recentActivity[0]).toHaveProperty('name');
        expect(stats.recentActivity[0]).toHaveProperty('status');
        expect(stats.recentActivity[0]).toHaveProperty('timestamp');
      });

      it('should filter by tenant', async () => {
        await service.createImportJob({
          tenantId: 'tenant-2',
          name: 'Other import',
          type: 'csv',
          entityType: 'partners',
          sourceFile: { name: 'file.csv', size: 100, mimeType: 'text/csv', uploadedAt: new Date() },
          mapping: [],
          createdBy: 'user-2',
        });

        const stats = await service.getStats('tenant-1');

        expect(stats.totalImports).toBe(1);
      });
    });
  });

  describe('Romanian Business Specifics', () => {
    describe('VAT rates in templates', () => {
      it('should include VAT rate field in invoices', async () => {
        const template = await service.getTemplate('tpl-invoices');

        const vatField = template?.fields.find(f => f.name === 'vatRate');
        expect(vatField).toBeDefined();
        expect(vatField?.type).toBe('number');
        expect(vatField?.example).toBe('19');
      });

      it('should include VAT rate field in products', async () => {
        const template = await service.getTemplate('tpl-products');

        const vatField = template?.fields.find(f => f.name === 'vatRate');
        expect(vatField).toBeDefined();
        expect(vatField?.example).toBe('19');
      });
    });

    describe('CUI validation', () => {
      it('should have CUI field in partner template', async () => {
        const template = await service.getTemplate('tpl-partners');

        const cuiField = template?.fields.find(f => f.name === 'cui');
        expect(cuiField).toBeDefined();
        expect(cuiField?.label).toBe('CUI/VAT Number');
      });
    });

    describe('Romanian address fields', () => {
      it('should have Romanian city example', async () => {
        const template = await service.getTemplate('tpl-partners');

        const cityField = template?.fields.find(f => f.name === 'city');
        expect(cityField?.example).toBe('București');
      });

      it('should have Romania as country example', async () => {
        const template = await service.getTemplate('tpl-partners');

        const countryField = template?.fields.find(f => f.name === 'country');
        expect(countryField?.example).toBe('Romania');
      });
    });

    describe('Romanian currency', () => {
      it('should have RON as currency example', async () => {
        const template = await service.getTemplate('tpl-invoices');

        const currencyField = template?.fields.find(f => f.name === 'currency');
        expect(currencyField?.example).toBe('RON');
      });
    });
  });

  describe('Import options for Romanian data', () => {
    it('should support semicolon delimiter (EU standard)', async () => {
      const job = await service.createImportJob({
        tenantId: 'tenant-1',
        name: 'EU CSV Import',
        type: 'csv',
        entityType: 'partners',
        sourceFile: { name: 'file.csv', size: 100, mimeType: 'text/csv', uploadedAt: new Date() },
        mapping: [],
        createdBy: 'user-1',
        options: {
          delimiter: ';',
          decimalSeparator: ',',
        },
      });

      expect(job.options.delimiter).toBe(';');
      expect(job.options.decimalSeparator).toBe(',');
    });

    it('should support Romanian date format', async () => {
      const job = await service.createImportJob({
        tenantId: 'tenant-1',
        name: 'Romanian Date Import',
        type: 'csv',
        entityType: 'invoices',
        sourceFile: { name: 'file.csv', size: 100, mimeType: 'text/csv', uploadedAt: new Date() },
        mapping: [],
        createdBy: 'user-1',
        options: {
          dateFormat: 'DD.MM.YYYY',
        },
      });

      expect(job.options.dateFormat).toBe('DD.MM.YYYY');
    });
  });
});
