import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  BatchProcessingService,
  JobType,
  JobStatus,
  JobPriority,
  ProcessingMode,
} from './batch-processing.service';

describe('BatchProcessingService', () => {
  let service: BatchProcessingService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BatchProcessingService, EventEmitter2],
    }).compile();

    service = module.get<BatchProcessingService>(BatchProcessingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Job Creation', () => {
    it('should create a batch job', () => {
      const job = service.createJob({
        name: 'Test Job',
        nameRo: 'Job Test',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ data: 'item1' }, { data: 'item2' }],
      });

      expect(job.id).toContain('job-');
      expect(job.name).toBe('Test Job');
      expect(job.totalItems).toBe(2);
      expect(job.status).toBe('PENDING');
    });

    it('should create job with all options', () => {
      const job = service.createJob({
        name: 'Full Options Job',
        nameRo: 'Job cu Opțiuni Complete',
        description: 'Test description',
        descriptionRo: 'Descriere test',
        type: 'INVOICE_GENERATION',
        createdBy: 'user-1',
        tenantId: 'tenant-1',
        items: [{ id: 1 }],
        priority: 'HIGH',
        processingMode: 'SEQUENTIAL',
        configuration: {
          maxRetries: 5,
          concurrency: 10,
        },
        metadata: { custom: 'data' },
      });

      expect(job.priority).toBe('HIGH');
      expect(job.processingMode).toBe('SEQUENTIAL');
      expect(job.tenantId).toBe('tenant-1');
      expect(job.configuration.maxRetries).toBe(5);
      expect(job.metadata.custom).toBe('data');
    });

    it('should create job with schedule', () => {
      const scheduledAt = new Date(Date.now() + 3600000);
      const job = service.createJob({
        name: 'Scheduled Job',
        nameRo: 'Job Programat',
        type: 'REPORT_EXPORT',
        createdBy: 'user-1',
        items: [{ id: 1 }],
        schedule: {
          type: 'ONCE',
          scheduledAt,
        },
      });

      expect(job.schedule).toBeDefined();
      expect(job.schedule?.type).toBe('ONCE');
      expect(job.schedule?.scheduledAt).toEqual(scheduledAt);
    });

    it('should assign indices to items', () => {
      const job = service.createJob({
        name: 'Index Test',
        nameRo: 'Test Index',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ a: 1 }, { a: 2 }, { a: 3 }],
      });

      expect(job.items[0].index).toBe(0);
      expect(job.items[1].index).toBe(1);
      expect(job.items[2].index).toBe(2);
    });

    it('should use default configuration', () => {
      const job = service.createJob({
        name: 'Default Config',
        nameRo: 'Config Implicit',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      expect(job.configuration.maxRetries).toBe(3);
      expect(job.configuration.concurrency).toBe(5);
      expect(job.configuration.continueOnError).toBe(true);
    });
  });

  describe('Job Retrieval', () => {
    it('should get job by id', () => {
      const created = service.createJob({
        name: 'Get Test',
        nameRo: 'Test Get',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      const job = service.getJob(created.id);
      expect(job.id).toBe(created.id);
    });

    it('should throw NotFoundException for invalid job', () => {
      expect(() => service.getJob('invalid-job')).toThrow(NotFoundException);
    });

    it('should get all jobs', () => {
      service.createJob({
        name: 'Job 1',
        nameRo: 'Job 1',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });
      service.createJob({
        name: 'Job 2',
        nameRo: 'Job 2',
        type: 'DATA_IMPORT',
        createdBy: 'user-2',
        items: [{ id: 2 }],
      });

      const jobs = service.getAllJobs();
      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter jobs by status', () => {
      service.createJob({
        name: 'Status Filter',
        nameRo: 'Filtru Status',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      const jobs = service.getAllJobs({ status: 'PENDING' });
      expect(jobs.every((j) => j.status === 'PENDING')).toBe(true);
    });

    it('should filter jobs by type', () => {
      service.createJob({
        name: 'Type Filter',
        nameRo: 'Filtru Tip',
        type: 'EMAIL_BATCH',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      const jobs = service.getAllJobs({ type: 'EMAIL_BATCH' });
      expect(jobs.every((j) => j.type === 'EMAIL_BATCH')).toBe(true);
    });

    it('should filter jobs by creator', () => {
      service.createJob({
        name: 'Creator Filter',
        nameRo: 'Filtru Creator',
        type: 'CUSTOM',
        createdBy: 'filter-creator',
        items: [{ id: 1 }],
      });

      const jobs = service.getAllJobs({ createdBy: 'filter-creator' });
      expect(jobs.every((j) => j.createdBy === 'filter-creator')).toBe(true);
    });

    it('should filter jobs by tenant', () => {
      service.createJob({
        name: 'Tenant Filter',
        nameRo: 'Filtru Tenant',
        type: 'CUSTOM',
        createdBy: 'user-1',
        tenantId: 'filter-tenant',
        items: [{ id: 1 }],
      });

      const jobs = service.getAllJobs({ tenantId: 'filter-tenant' });
      expect(jobs.every((j) => j.tenantId === 'filter-tenant')).toBe(true);
    });
  });

  describe('Job Execution', () => {
    it('should start a job', async () => {
      const job = service.createJob({
        name: 'Start Test',
        nameRo: 'Test Start',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      const started = await service.startJob(job.id);

      expect(started.status).toBe('RUNNING');
      expect(started.startedAt).toBeInstanceOf(Date);
    });

    it('should throw when starting already running job', async () => {
      const job = service.createJob({
        name: 'Running Test',
        nameRo: 'Test Rulare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      await service.startJob(job.id);

      await expect(service.startJob(job.id)).rejects.toThrow(BadRequestException);
    });

    it('should process items and complete job', async () => {
      const job = service.createJob({
        name: 'Complete Test',
        nameRo: 'Test Completare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }, { id: 2 }],
      });

      await service.startJob(job.id);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const completed = service.getJob(job.id);
      expect(completed.processedItems).toBeGreaterThan(0);
    });
  });

  describe('Job Control', () => {
    it('should pause a running job', async () => {
      const job = service.createJob({
        name: 'Pause Test',
        nameRo: 'Test Pauză',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: Array(10).fill({ id: 1 }),
      });

      await service.startJob(job.id);
      const paused = service.pauseJob(job.id);

      expect(paused.status).toBe('PAUSED');
    });

    it('should throw when pausing non-running job', () => {
      const job = service.createJob({
        name: 'Pause Error',
        nameRo: 'Eroare Pauză',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      expect(() => service.pauseJob(job.id)).toThrow(BadRequestException);
    });

    it('should resume a paused job', async () => {
      const job = service.createJob({
        name: 'Resume Test',
        nameRo: 'Test Reluare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: Array(10).fill({ id: 1 }),
      });

      await service.startJob(job.id);
      service.pauseJob(job.id);
      const resumed = service.resumeJob(job.id);

      expect(resumed.status).toBe('RUNNING');
    });

    it('should throw when resuming non-paused job', () => {
      const job = service.createJob({
        name: 'Resume Error',
        nameRo: 'Eroare Reluare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      expect(() => service.resumeJob(job.id)).toThrow(BadRequestException);
    });

    it('should cancel a job', () => {
      const job = service.createJob({
        name: 'Cancel Test',
        nameRo: 'Test Anulare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      const cancelled = service.cancelJob(job.id);

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should throw when cancelling completed job', async () => {
      const job = service.createJob({
        name: 'Cancel Completed',
        nameRo: 'Anulare Completat',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      await service.startJob(job.id);
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(() => service.cancelJob(job.id)).toThrow(BadRequestException);
    });

    it('should retry a failed job', () => {
      const job = service.createJob({
        name: 'Retry Test',
        nameRo: 'Test Reîncercare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      job.status = 'FAILED';
      job.items[0].status = 'FAILED';
      job.failedItems = 1;

      const retried = service.retryJob(job.id);

      expect(retried.status).toBe('PENDING');
      expect(retried.items[0].status).toBe('PENDING');
      expect(retried.failedItems).toBe(0);
    });

    it('should delete a job', () => {
      const job = service.createJob({
        name: 'Delete Test',
        nameRo: 'Test Ștergere',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      service.deleteJob(job.id);

      expect(() => service.getJob(job.id)).toThrow(NotFoundException);
    });

    it('should throw when deleting running job', async () => {
      const job = service.createJob({
        name: 'Delete Running',
        nameRo: 'Ștergere Rulare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: Array(10).fill({ id: 1 }),
      });

      await service.startJob(job.id);

      expect(() => service.deleteJob(job.id)).toThrow(BadRequestException);
    });
  });

  describe('Job Summary & Statistics', () => {
    it('should get job summary', () => {
      const job = service.createJob({
        name: 'Summary Test',
        nameRo: 'Test Sumar',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }, { id: 2 }],
      });

      const summary = service.getJobSummary(job.id);

      expect(summary.jobId).toBe(job.id);
      expect(summary.jobName).toBe('Summary Test');
      expect(summary.totalItems).toBe(2);
      expect(summary.progress).toBe(0);
    });

    it('should get job errors', () => {
      const job = service.createJob({
        name: 'Errors Test',
        nameRo: 'Test Erori',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      const errors = service.getJobErrors(job.id);
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should get job results', () => {
      const job = service.createJob({
        name: 'Results Test',
        nameRo: 'Test Rezultate',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      const results = service.getJobResults(job.id);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should get job items', () => {
      const job = service.createJob({
        name: 'Items Test',
        nameRo: 'Test Elemente',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }, { id: 2 }],
      });

      const items = service.getJobItems(job.id);
      expect(items.length).toBe(2);
    });

    it('should filter job items by status', () => {
      const job = service.createJob({
        name: 'Filter Items',
        nameRo: 'Filtru Elemente',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }, { id: 2 }],
      });

      const pending = service.getJobItems(job.id, 'PENDING');
      expect(pending.every((i) => i.status === 'PENDING')).toBe(true);
    });
  });

  describe('Templates', () => {
    it('should have pre-defined templates', () => {
      const templates = service.getTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should get template by id', () => {
      const templates = service.getTemplates();
      const template = service.getTemplate(templates[0].id);

      expect(template.id).toBe(templates[0].id);
    });

    it('should throw for invalid template id', () => {
      expect(() => service.getTemplate('invalid-template')).toThrow(NotFoundException);
    });

    it('should create job from template', () => {
      const templates = service.getTemplates();
      const template = templates[0];

      const job = service.createJobFromTemplate(template.id, {
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      expect(job.type).toBe(template.type);
      expect(job.name).toBe(template.name);
    });

    it('should override template configuration', () => {
      const templates = service.getTemplates();
      const template = templates[0];

      const job = service.createJobFromTemplate(template.id, {
        createdBy: 'user-1',
        items: [{ id: 1 }],
        configurationOverrides: {
          maxRetries: 10,
        },
      });

      expect(job.configuration.maxRetries).toBe(10);
    });
  });

  describe('Processor Management', () => {
    it('should register a custom processor', () => {
      service.registerProcessor('CUSTOM', async (item) => ({
        success: true,
        result: { processed: item.index },
      }));

      expect(service.hasProcessor('CUSTOM')).toBe(true);
    });

    it('should have default processors', () => {
      expect(service.hasProcessor('INVOICE_GENERATION')).toBe(true);
      expect(service.hasProcessor('REPORT_EXPORT')).toBe(true);
      expect(service.hasProcessor('DATA_IMPORT')).toBe(true);
      expect(service.hasProcessor('ANAF_SUBMISSION')).toBe(true);
    });
  });

  describe('Queue Statistics', () => {
    it('should get queue stats', () => {
      service.createJob({
        name: 'Queue Stats 1',
        nameRo: 'Statistici Coadă 1',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      const stats = service.getQueueStats();

      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('running');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('totalJobs');
    });

    it('should count pending jobs', () => {
      service.createJob({
        name: 'Pending Count',
        nameRo: 'Numărare Așteptare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      const stats = service.getQueueStats();
      expect(stats.pending).toBeGreaterThanOrEqual(1);
    });

    it('should get running jobs', async () => {
      const job = service.createJob({
        name: 'Running Jobs',
        nameRo: 'Joburi în Rulare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: Array(10).fill({ id: 1 }),
      });

      await service.startJob(job.id);

      const running = service.getRunningJobs();
      expect(running.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Service Statistics', () => {
    it('should get service stats', () => {
      const stats = service.getServiceStats();

      expect(stats).toHaveProperty('totalJobs');
      expect(stats).toHaveProperty('totalItemsProcessed');
      expect(stats).toHaveProperty('averageSuccessRate');
      expect(stats).toHaveProperty('registeredProcessors');
      expect(stats).toHaveProperty('availableTemplates');
      expect(stats).toHaveProperty('runningJobsCount');
    });

    it('should count registered processors', () => {
      const stats = service.getServiceStats();
      expect(stats.registeredProcessors).toBeGreaterThan(0);
    });

    it('should count available templates', () => {
      const stats = service.getServiceStats();
      expect(stats.availableTemplates).toBeGreaterThan(0);
    });
  });

  describe('Job Types', () => {
    const types: JobType[] = [
      'INVOICE_GENERATION',
      'REPORT_EXPORT',
      'DATA_IMPORT',
      'DATA_EXPORT',
      'ANAF_SUBMISSION',
      'EMAIL_BATCH',
      'DOCUMENT_PROCESSING',
      'CUSTOM',
    ];

    types.forEach((type) => {
      it(`should create ${type} job`, () => {
        const job = service.createJob({
          name: `${type} Job`,
          nameRo: `Job ${type}`,
          type,
          createdBy: 'user-1',
          items: [{ id: 1 }],
        });

        expect(job.type).toBe(type);
      });
    });
  });

  describe('Job Priorities', () => {
    const priorities: JobPriority[] = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

    priorities.forEach((priority) => {
      it(`should create ${priority} priority job`, () => {
        const job = service.createJob({
          name: `${priority} Job`,
          nameRo: `Job ${priority}`,
          type: 'CUSTOM',
          createdBy: 'user-1',
          items: [{ id: 1 }],
          priority,
        });

        expect(job.priority).toBe(priority);
      });
    });
  });

  describe('Processing Modes', () => {
    const modes: ProcessingMode[] = ['SEQUENTIAL', 'PARALLEL', 'CHUNKED'];

    modes.forEach((mode) => {
      it(`should create job with ${mode} processing mode`, () => {
        const job = service.createJob({
          name: `${mode} Job`,
          nameRo: `Job ${mode}`,
          type: 'CUSTOM',
          createdBy: 'user-1',
          items: [{ id: 1 }],
          processingMode: mode,
        });

        expect(job.processingMode).toBe(mode);
      });
    });
  });

  describe('Event Emission', () => {
    let emitSpy: jest.SpyInstance;

    beforeEach(() => {
      emitSpy = jest.spyOn(eventEmitter, 'emit');
    });

    afterEach(() => {
      emitSpy.mockRestore();
    });

    it('should emit job created event', () => {
      service.createJob({
        name: 'Event Job',
        nameRo: 'Job Eveniment',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      expect(emitSpy).toHaveBeenCalledWith('batch.job.created', expect.any(Object));
    });

    it('should emit job started event', async () => {
      const job = service.createJob({
        name: 'Start Event',
        nameRo: 'Eveniment Start',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      await service.startJob(job.id);

      expect(emitSpy).toHaveBeenCalledWith('batch.job.started', expect.any(Object));
    });

    it('should emit job cancelled event', () => {
      const job = service.createJob({
        name: 'Cancel Event',
        nameRo: 'Eveniment Anulare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      service.cancelJob(job.id);

      expect(emitSpy).toHaveBeenCalledWith('batch.job.cancelled', expect.any(Object));
    });

    it('should emit job deleted event', () => {
      const job = service.createJob({
        name: 'Delete Event',
        nameRo: 'Eveniment Ștergere',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
      });

      service.deleteJob(job.id);

      expect(emitSpy).toHaveBeenCalledWith('batch.job.deleted', expect.any(Object));
    });
  });

  describe('Job Configuration', () => {
    it('should apply custom retry configuration', () => {
      const job = service.createJob({
        name: 'Retry Config',
        nameRo: 'Config Reîncercare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
        configuration: {
          maxRetries: 10,
          retryDelayMs: 5000,
        },
      });

      expect(job.configuration.maxRetries).toBe(10);
      expect(job.configuration.retryDelayMs).toBe(5000);
    });

    it('should apply custom timeout configuration', () => {
      const job = service.createJob({
        name: 'Timeout Config',
        nameRo: 'Config Timeout',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
        configuration: {
          timeoutMs: 120000,
        },
      });

      expect(job.configuration.timeoutMs).toBe(120000);
    });

    it('should apply custom notification configuration', () => {
      const job = service.createJob({
        name: 'Notification Config',
        nameRo: 'Config Notificare',
        type: 'CUSTOM',
        createdBy: 'user-1',
        items: [{ id: 1 }],
        configuration: {
          notifyOnCompletion: false,
          notifyOnError: true,
        },
      });

      expect(job.configuration.notifyOnCompletion).toBe(false);
      expect(job.configuration.notifyOnError).toBe(true);
    });
  });
});
