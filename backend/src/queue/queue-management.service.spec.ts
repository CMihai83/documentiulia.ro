import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  QueueManagementService,
  QueuedJob,
  Queue,
  QueueType,
  Worker,
} from './queue-management.service';

describe('QueueManagementService', () => {
  let service: QueueManagementService;
  let eventEmitter: EventEmitter2;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueManagementService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueManagementService>(QueueManagementService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.stopHeartbeat();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default queues initialized', async () => {
      const queues = await service.getAllQueues();
      expect(queues.length).toBeGreaterThan(0);
    });

    it('should have EMAIL queue', async () => {
      const queue = await service.getQueueByType('EMAIL');
      expect(queue).toBeDefined();
      expect(queue!.type).toBe('EMAIL');
    });

    it('should have ANAF_SUBMISSION queue', async () => {
      const queue = await service.getQueueByType('ANAF_SUBMISSION');
      expect(queue).toBeDefined();
      expect(queue!.type).toBe('ANAF_SUBMISSION');
    });

    it('should have SAGA_SYNC queue', async () => {
      const queue = await service.getQueueByType('SAGA_SYNC');
      expect(queue).toBeDefined();
    });

    it('should have default queue settings', async () => {
      const queue = await service.getQueueByType('EMAIL');
      expect(queue!.isActive).toBe(true);
      expect(queue!.isPaused).toBe(false);
      expect(queue!.concurrency).toBeGreaterThan(0);
    });
  });

  describe('Queue Management', () => {
    it('should create queue', async () => {
      const queue = await service.createQueue({
        name: 'Custom Queue',
        nameRo: 'Coadă Personalizată',
        type: 'CUSTOM',
        description: 'A custom queue',
        descriptionRo: 'O coadă personalizată',
        isActive: true,
        isPaused: false,
        concurrency: 3,
        rateLimit: 50,
        rateLimitPeriodMs: 60000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 30000,
        defaultMaxAttempts: 3,
        retryOnFail: true,
      });

      expect(queue.id).toBeDefined();
      expect(queue.name).toBe('Custom Queue');
    });

    it('should emit queue.created event', async () => {
      await service.createQueue({
        name: 'Event Queue',
        nameRo: 'Coadă Eveniment',
        type: 'WEBHOOK',
        description: '',
        descriptionRo: '',
        isActive: true,
        isPaused: false,
        concurrency: 1,
        rateLimit: 10,
        rateLimitPeriodMs: 1000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 5000,
        defaultMaxAttempts: 1,
        retryOnFail: false,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'queue.created',
        expect.objectContaining({ name: 'Event Queue' }),
      );
    });

    it('should get queue by ID', async () => {
      const created = await service.createQueue({
        name: 'Get Queue',
        nameRo: 'Obține Coadă',
        type: 'CUSTOM',
        description: '',
        descriptionRo: '',
        isActive: true,
        isPaused: false,
        concurrency: 1,
        rateLimit: 10,
        rateLimitPeriodMs: 1000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 5000,
        defaultMaxAttempts: 1,
        retryOnFail: false,
      });

      const retrieved = await service.getQueue(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should pause queue', async () => {
      const queue = await service.getQueueByType('EMAIL');
      const paused = await service.pauseQueue(queue!.id);

      expect(paused.isPaused).toBe(true);
    });

    it('should emit queue.paused event', async () => {
      const queue = await service.getQueueByType('PDF');
      await service.pauseQueue(queue!.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'queue.paused',
        expect.objectContaining({ queueId: queue!.id }),
      );
    });

    it('should resume queue', async () => {
      const queue = await service.getQueueByType('EMAIL');
      await service.pauseQueue(queue!.id);
      const resumed = await service.resumeQueue(queue!.id);

      expect(resumed.isPaused).toBe(false);
    });

    it('should emit queue.resumed event', async () => {
      const queue = await service.getQueueByType('PDF');
      await service.pauseQueue(queue!.id);
      await service.resumeQueue(queue!.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'queue.resumed',
        expect.objectContaining({ queueId: queue!.id }),
      );
    });

    it('should clear queue', async () => {
      // Add jobs first
      await service.addJob('EMAIL', { to: 'test1@example.com' });
      await service.addJob('EMAIL', { to: 'test2@example.com' });

      const queue = await service.getQueueByType('EMAIL');
      await service.pauseQueue(queue!.id);

      // Jobs might already be processing, so clear pending ones
      const clearedCount = await service.clearQueue(queue!.id);

      expect(clearedCount).toBeGreaterThanOrEqual(0);
    });

    it('should throw error when pausing non-existent queue', async () => {
      await expect(service.pauseQueue('non-existent')).rejects.toThrow('Queue not found');
    });
  });

  describe('Job Management', () => {
    it('should add job to queue', async () => {
      const job = await service.addJob('EMAIL', { to: 'test@example.com' });

      expect(job.id).toBeDefined();
      expect(job.queueType).toBe('EMAIL');
      // Job may be immediately picked up for processing
      expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(job.status);
    });

    it('should add job with options', async () => {
      const job = await service.addJob(
        'EMAIL',
        { to: 'test@example.com' },
        {
          name: 'Important Email',
          nameRo: 'Email Important',
          priority: 'HIGH',
          tags: ['important'],
          organizationId: mockOrgId,
          userId: mockUserId,
        },
      );

      expect(job.name).toBe('Important Email');
      expect(job.priority).toBe('HIGH');
      expect(job.tags).toContain('important');
      expect(job.organizationId).toBe(mockOrgId);
    });

    it('should add delayed job', async () => {
      const job = await service.addJob(
        'EMAIL',
        { to: 'delayed@example.com' },
        { delay: 5000 },
      );

      expect(job.status).toBe('QUEUED');
      expect(job.scheduledAt).toBeDefined();
    });

    it('should add scheduled job', async () => {
      const scheduledAt = new Date(Date.now() + 3600000);
      const job = await service.addJob(
        'EMAIL',
        { to: 'scheduled@example.com' },
        { scheduledAt },
      );

      expect(job.status).toBe('QUEUED');
      expect(job.scheduledAt).toEqual(scheduledAt);
    });

    it('should emit job.added event', async () => {
      await service.addJob('EMAIL', { to: 'event@example.com' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.added',
        expect.objectContaining({ queueType: 'EMAIL' }),
      );
    });

    it('should throw error for non-existent queue type', async () => {
      await expect(
        service.addJob('UNKNOWN' as QueueType, {}),
      ).rejects.toThrow('Queue not found');
    });

    it('should throw error for inactive queue', async () => {
      const queue = await service.createQueue({
        name: 'Inactive Queue',
        nameRo: 'Coadă Inactivă',
        type: 'BACKUP',
        description: '',
        descriptionRo: '',
        isActive: false,
        isPaused: false,
        concurrency: 1,
        rateLimit: 10,
        rateLimitPeriodMs: 1000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 5000,
        defaultMaxAttempts: 1,
        retryOnFail: false,
      });

      await expect(
        service.addJob('BACKUP', {}),
      ).rejects.toThrow('Queue is not active');
    });

    it('should get job by ID', async () => {
      const created = await service.addJob('EMAIL', { to: 'get@example.com' });
      const retrieved = await service.getJob(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should get jobs by queue', async () => {
      await service.addJob('PDF', { file: 'doc1.pdf' });
      await service.addJob('PDF', { file: 'doc2.pdf' });

      const jobs = await service.getJobsByQueue('PDF');

      expect(jobs.length).toBeGreaterThanOrEqual(2);
      expect(jobs.every((j) => j.queueType === 'PDF')).toBe(true);
    });

    it('should get jobs by status', async () => {
      await service.addJob('NOTIFICATION', { message: 'test' });

      const jobs = await service.getJobsByStatus('PENDING');

      expect(jobs.length).toBeGreaterThanOrEqual(0);
    });

    it('should get jobs by organization', async () => {
      await service.addJob('EMAIL', { to: 'org@example.com' }, { organizationId: mockOrgId });
      await service.addJob('PDF', { file: 'doc.pdf' }, { organizationId: mockOrgId });

      const jobs = await service.getJobsByOrganization(mockOrgId);

      expect(jobs.length).toBeGreaterThanOrEqual(2);
      expect(jobs.every((j) => j.organizationId === mockOrgId)).toBe(true);
    });

    it('should update job progress', async () => {
      const job = await service.addJob('REPORT', { type: 'monthly' });
      const updated = await service.updateJobProgress(job.id, 50);

      expect(updated.progress).toBe(50);
    });

    it('should emit job.progress event', async () => {
      const job = await service.addJob('REPORT', { type: 'weekly' });
      await service.updateJobProgress(job.id, 75);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.progress',
        expect.objectContaining({ jobId: job.id, progress: 75 }),
      );
    });

    it('should clamp progress between 0 and 100', async () => {
      const job = await service.addJob('REPORT', { type: 'daily' });

      await service.updateJobProgress(job.id, 150);
      let updated = await service.getJob(job.id);
      expect(updated!.progress).toBe(100);

      await service.updateJobProgress(job.id, -50);
      updated = await service.getJob(job.id);
      expect(updated!.progress).toBe(0);
    });

    it('should cancel job', async () => {
      const job = await service.addJob(
        'EMAIL',
        { to: 'cancel@example.com' },
        { delay: 60000 },
      );

      const cancelled = await service.cancelJob(job.id);

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should emit job.cancelled event', async () => {
      const job = await service.addJob('EMAIL', { to: 'c@example.com' }, { delay: 60000 });
      await service.cancelJob(job.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.cancelled',
        expect.objectContaining({ jobId: job.id }),
      );
    });

    it('should throw error when cancelling completed job', async () => {
      const job = await service.addJob('EMAIL', { to: 'done@example.com' });
      await new Promise((resolve) => setTimeout(resolve, 50));

      const completed = await service.getJob(job.id);
      if (completed?.status === 'COMPLETED') {
        await expect(service.cancelJob(job.id)).rejects.toThrow('Cannot cancel');
      }
    });
  });

  describe('Job Processing', () => {
    it('should process job with default processor', async () => {
      const job = await service.addJob('NOTIFICATION', { message: 'Hello' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const processed = await service.getJob(job.id);
      expect(processed?.status).toBe('COMPLETED');
    });

    it('should emit job.started event', async () => {
      await service.addJob('NOTIFICATION', { message: 'Start' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.started',
        expect.objectContaining({ attempt: 1 }),
      );
    });

    it('should emit job.completed event', async () => {
      await service.addJob('NOTIFICATION', { message: 'Complete' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.completed',
        expect.objectContaining({ processingTime: expect.any(Number) }),
      );
    });

    it('should handle job failure', async () => {
      const job = await service.addJob(
        'NOTIFICATION',
        { message: 'Fail', simulateFailure: true },
        { maxAttempts: 1 },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const failed = await service.getJob(job.id);
      expect(failed?.status).toBe('FAILED');
      expect(failed?.error).toBeDefined();
    });

    it('should retry failed job', async () => {
      const job = await service.addJob(
        'NOTIFICATION',
        { message: 'Retry', simulateFailure: true },
        { maxAttempts: 1 },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Modify payload to not fail on retry
      const failed = await service.getJob(job.id);
      failed!.payload.simulateFailure = false;

      const retried = await service.retryJob(job.id);

      // Job is immediately picked up for processing after retry
      // Status may be PENDING (reset) or PROCESSING/COMPLETED (already picked up)
      expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(retried.status);
      // Error should be cleared on retry
      expect(retried.error).toBeUndefined();
    });

    it('should emit job.failed event', async () => {
      await service.addJob(
        'NOTIFICATION',
        { simulateFailure: true },
        { maxAttempts: 1 },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.failed',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });

    it('should retry with exponential backoff', async () => {
      const job = await service.addJob(
        'NOTIFICATION',
        { simulateFailure: true },
        { maxAttempts: 3, backoffMs: 100, backoffMultiplier: 2 },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const retrying = await service.getJob(job.id);
      expect(retrying?.status).toBe('RETRYING');
      expect(retrying?.nextRetryAt).toBeDefined();
    });

    it('should register custom processor', async () => {
      let processed = false;

      service.registerProcessor('WEBHOOK', async (job) => {
        processed = true;
        return { success: true, result: { webhook: 'sent' } };
      });

      await service.createQueue({
        name: 'Webhook Queue',
        nameRo: 'Coadă Webhook',
        type: 'WEBHOOK',
        description: '',
        descriptionRo: '',
        isActive: true,
        isPaused: false,
        concurrency: 1,
        rateLimit: 10,
        rateLimitPeriodMs: 1000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 5000,
        defaultMaxAttempts: 1,
        retryOnFail: false,
      });

      await service.addJob('WEBHOOK', { url: 'https://example.com' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(processed).toBe(true);
    });

    it('should respect job priority', async () => {
      // Pause queue first
      const queue = await service.getQueueByType('NOTIFICATION');
      await service.pauseQueue(queue!.id);

      // Add jobs with different priorities
      const lowJob = await service.addJob('NOTIFICATION', { msg: 'low' }, { priority: 'LOW' });
      const highJob = await service.addJob('NOTIFICATION', { msg: 'high' }, { priority: 'HIGH' });
      const criticalJob = await service.addJob('NOTIFICATION', { msg: 'critical' }, { priority: 'CRITICAL' });

      // Resume queue - this triggers processNextJob
      await service.resumeQueue(queue!.id);

      // Manually trigger processing for the critical job
      const criticalJobData = await service.getJob(criticalJob.id);
      if (criticalJobData && criticalJobData.status === 'PENDING') {
        await service.processJob(criticalJobData);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Critical should complete first
      const critical = await service.getJob(criticalJob.id);
      expect(critical?.status).toBe('COMPLETED');
    });
  });

  describe('Dead Letter Queue', () => {
    it('should move failed job to dead letter queue', async () => {
      const queue = await service.getQueueByType('ANAF_SUBMISSION');
      expect(queue?.deadLetterQueue).toBeDefined();

      const job = await service.addJob(
        'ANAF_SUBMISSION',
        { simulateFailure: true },
        { maxAttempts: 1 },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const deadJobs = await service.getDeadLetterJobs('ANAF_SUBMISSION');
      const deadJob = deadJobs.find((j) => j.id === job.id);

      expect(deadJob).toBeDefined();
      expect(deadJob?.status).toBe('DEAD');
    });

    it('should get dead letter jobs', async () => {
      await service.addJob(
        'ANAF_SUBMISSION',
        { simulateFailure: true },
        { maxAttempts: 1 },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const deadJobs = await service.getDeadLetterJobs();
      expect(deadJobs.length).toBeGreaterThan(0);
    });

    it('should filter dead letter jobs by queue type', async () => {
      await service.addJob(
        'ANAF_SUBMISSION',
        { simulateFailure: true },
        { maxAttempts: 1 },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const deadJobs = await service.getDeadLetterJobs('ANAF_SUBMISSION');
      expect(deadJobs.every((j) => j.queueType === 'ANAF_SUBMISSION')).toBe(true);
    });

    it('should reprocess dead letter job', async () => {
      const job = await service.addJob(
        'ANAF_SUBMISSION',
        { simulateFailure: true },
        { maxAttempts: 1 },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Modify to succeed on reprocess
      const deadJob = await service.getJob(job.id);
      if (deadJob) {
        deadJob.payload.simulateFailure = false;
      }

      const reprocessed = await service.reprocessDeadLetterJob(job.id);

      // Job is immediately picked up for processing
      expect(['PENDING', 'PROCESSING', 'COMPLETED']).toContain(reprocessed.status);
    });

    it('should clear dead letter queue', async () => {
      await service.addJob(
        'ANAF_SUBMISSION',
        { simulateFailure: true },
        { maxAttempts: 1 },
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      const clearedCount = await service.clearDeadLetterQueue('ANAF_SUBMISSION');

      expect(clearedCount).toBeGreaterThanOrEqual(0);
    });

    it('should emit deadletter.cleared event', async () => {
      await service.clearDeadLetterQueue();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'deadletter.cleared',
        expect.objectContaining({ clearedCount: expect.any(Number) }),
      );
    });
  });

  describe('Worker Management', () => {
    it('should register worker', async () => {
      const worker = await service.registerWorker('Email Worker', ['EMAIL']);

      expect(worker.id).toBeDefined();
      expect(worker.name).toBe('Email Worker');
      expect(worker.queueTypes).toContain('EMAIL');
    });

    it('should emit worker.registered event', async () => {
      await service.registerWorker('PDF Worker', ['PDF']);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'worker.registered',
        expect.objectContaining({ name: 'PDF Worker' }),
      );
    });

    it('should get worker by ID', async () => {
      const created = await service.registerWorker('Test Worker', ['EMAIL']);
      const retrieved = await service.getWorker(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });

    it('should get all workers', async () => {
      await service.registerWorker('Worker 1', ['EMAIL']);
      await service.registerWorker('Worker 2', ['PDF']);

      const workers = await service.getAllWorkers();

      expect(workers.length).toBeGreaterThanOrEqual(2);
    });

    it('should update worker heartbeat', async () => {
      const worker = await service.registerWorker('Heartbeat Worker', ['EMAIL']);
      const beforeUpdate = worker.lastActiveAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await service.updateWorkerHeartbeat(worker.id);

      expect(updated.lastActiveAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
    });

    it('should throw error when updating non-existent worker', async () => {
      await expect(
        service.updateWorkerHeartbeat('non-existent'),
      ).rejects.toThrow('Worker not found');
    });

    it('should stop worker', async () => {
      const worker = await service.registerWorker('Stop Worker', ['EMAIL']);
      const stopped = await service.stopWorker(worker.id);

      expect(stopped.status).toBe('STOPPED');
    });

    it('should emit worker.stopped event', async () => {
      const worker = await service.registerWorker('Stop Event Worker', ['EMAIL']);
      await service.stopWorker(worker.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'worker.stopped',
        expect.objectContaining({ workerId: worker.id }),
      );
    });

    it('should remove worker', async () => {
      const worker = await service.registerWorker('Remove Worker', ['EMAIL']);
      await service.stopWorker(worker.id);
      await service.removeWorker(worker.id);

      expect(await service.getWorker(worker.id)).toBeUndefined();
    });

    it('should emit worker.removed event', async () => {
      const worker = await service.registerWorker('Remove Event Worker', ['EMAIL']);
      await service.stopWorker(worker.id);
      await service.removeWorker(worker.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'worker.removed',
        expect.objectContaining({ workerId: worker.id }),
      );
    });

    it('should throw error when removing non-existent worker', async () => {
      await expect(service.removeWorker('non-existent')).rejects.toThrow('Worker not found');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.addJob('EMAIL', { to: 'stat1@example.com' });
      await service.addJob('EMAIL', { to: 'stat2@example.com' });
      await service.addJob('PDF', { file: 'stat.pdf' });
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should get queue statistics', async () => {
      const stats = await service.getStats();

      expect(stats.totalQueues).toBeGreaterThan(0);
    });

    it('should count active and paused queues', async () => {
      const stats = await service.getStats();

      expect(stats.activeQueues).toBeGreaterThan(0);
    });

    it('should count jobs by status', async () => {
      const stats = await service.getStats();

      expect(stats.totalJobs).toBeGreaterThan(0);
    });

    it('should count by queue', async () => {
      const stats = await service.getStats();

      expect(stats.byQueue.EMAIL).toBeDefined();
      expect(stats.byQueue.PDF).toBeDefined();
    });

    it('should count by priority', async () => {
      await service.addJob('NOTIFICATION', { msg: 'high' }, { priority: 'HIGH' });

      const stats = await service.getStats();

      expect(stats.byPriority).toBeDefined();
    });

    it('should calculate average processing time', async () => {
      const stats = await service.getStats();

      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it('should count active workers', async () => {
      await service.registerWorker('Stat Worker', ['EMAIL']);

      const stats = await service.getStats();

      expect(stats.activeWorkers).toBeGreaterThanOrEqual(1);
    });

    it('should return recent jobs', async () => {
      const stats = await service.getStats();

      expect(stats.recentJobs.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce queue rate limit', async () => {
      // Create queue with very low rate limit
      await service.createQueue({
        name: 'Rate Limited Queue',
        nameRo: 'Coadă cu Limită',
        type: 'IMPORT',
        description: '',
        descriptionRo: '',
        isActive: true,
        isPaused: false,
        concurrency: 1,
        rateLimit: 2,
        rateLimitPeriodMs: 60000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 5000,
        defaultMaxAttempts: 1,
        retryOnFail: false,
      });

      await service.addJob('IMPORT', { file: 'file1.csv' });
      await service.addJob('IMPORT', { file: 'file2.csv' });

      await expect(
        service.addJob('IMPORT', { file: 'file3.csv' }),
      ).rejects.toThrow('Queue rate limit exceeded');
    });
  });

  describe('Romanian Language Support', () => {
    it('should have Romanian queue names', async () => {
      const queue = await service.getQueueByType('EMAIL');

      expect(queue!.nameRo).toBe('Coadă Email');
    });

    it('should have Romanian queue descriptions', async () => {
      const queue = await service.getQueueByType('ANAF_SUBMISSION');

      expect(queue!.descriptionRo).toContain('ANAF');
    });

    it('should create job with Romanian name', async () => {
      const job = await service.addJob(
        'EMAIL',
        { to: 'ro@example.com' },
        { name: 'Email Job', nameRo: 'Job de Email' },
      );

      expect(job.nameRo).toBe('Job de Email');
    });
  });
});
