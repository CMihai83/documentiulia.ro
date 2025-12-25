import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SchedulerService,
  ScheduledJob,
  JobExecution,
  JobType,
  JobPriority,
  JobStatus,
  RecurrencePattern,
} from './scheduler.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let eventEmitter: EventEmitter2;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    service.stop();
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have default queues initialized', () => {
      const queues = service.getAllQueues();
      expect(queues.length).toBeGreaterThan(0);
    });

    it('should have ANAF queue for compliance tasks', () => {
      const anafQueue = service.getQueue('queue-anaf');
      expect(anafQueue).toBeDefined();
      expect(anafQueue!.nameRo).toBe('Coadă ANAF');
    });

    it('should have default handlers registered', () => {
      expect(service.hasHandler('noop')).toBe(true);
      expect(service.hasHandler('log')).toBe(true);
      expect(service.hasHandler('delay')).toBe(true);
    });

    it('should not be running initially', () => {
      expect(service.isSchedulerRunning()).toBe(false);
    });
  });

  describe('Scheduler Control', () => {
    it('should start scheduler', () => {
      service.start();

      expect(service.isSchedulerRunning()).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'scheduler.started',
        expect.objectContaining({ timestamp: expect.any(Date) }),
      );
    });

    it('should stop scheduler', () => {
      service.start();
      service.stop();

      expect(service.isSchedulerRunning()).toBe(false);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'scheduler.stopped',
        expect.objectContaining({ timestamp: expect.any(Date) }),
      );
    });

    it('should not start twice', () => {
      service.start();
      service.start();

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('should not stop if not running', () => {
      service.stop();

      expect(eventEmitter.emit).not.toHaveBeenCalledWith('scheduler.stopped', expect.any(Object));
    });
  });

  describe('Handler Registration', () => {
    it('should register custom handler', () => {
      const customHandler = jest.fn().mockResolvedValue({ custom: true });

      service.registerHandler('custom', customHandler);

      expect(service.hasHandler('custom')).toBe(true);
    });

    it('should unregister handler', () => {
      service.registerHandler('temp', jest.fn());
      const result = service.unregisterHandler('temp');

      expect(result).toBe(true);
      expect(service.hasHandler('temp')).toBe(false);
    });

    it('should return false when unregistering non-existent handler', () => {
      const result = service.unregisterHandler('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('Job Creation', () => {
    it('should create job with basic options', async () => {
      const job = await service.createJob(
        'Test Job',
        'CUSTOM',
        'noop',
        { data: 'test' },
        { pattern: 'ONCE' },
      );

      expect(job.id).toBeDefined();
      expect(job.name).toBe('Test Job');
      expect(job.type).toBe('CUSTOM');
      expect(job.handler).toBe('noop');
      expect(job.payload).toEqual({ data: 'test' });
      expect(job.status).toBe('SCHEDULED');
    });

    it('should create job with Romanian name', async () => {
      const job = await service.createJob(
        'Invoice Generation',
        'INVOICE_GENERATION',
        'noop',
        {},
        { pattern: 'DAILY' },
        { nameRo: 'Generare Facturi' },
      );

      expect(job.nameRo).toBe('Generare Facturi');
    });

    it('should set priority', async () => {
      const job = await service.createJob(
        'Critical Task',
        'ANAF_SUBMISSION',
        'noop',
        {},
        { pattern: 'ONCE' },
        { priority: 'CRITICAL' },
      );

      expect(job.priority).toBe('CRITICAL');
    });

    it('should set default timezone to Bucharest', async () => {
      const job = await service.createJob(
        'RO Job',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'DAILY' },
      );

      expect(job.schedule.timezone).toBe('Europe/Bucharest');
    });

    it('should emit job.created event', async () => {
      await service.createJob('Event Job', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.created',
        expect.objectContaining({
          name: 'Event Job',
          type: 'CUSTOM',
        }),
      );
    });

    it('should throw error for unregistered handler', async () => {
      await expect(
        service.createJob('Bad Job', 'CUSTOM', 'unknown-handler', {}, { pattern: 'ONCE' }),
      ).rejects.toThrow("Handler 'unknown-handler' not registered");
    });

    it('should calculate next run date', async () => {
      const startAt = new Date(Date.now() + 60000);
      const job = await service.createJob(
        'Future Job',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'ONCE', startAt },
      );

      expect(job.nextRunAt).toEqual(startAt);
    });

    it('should set retry configuration', async () => {
      const job = await service.createJob(
        'Retryable Job',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'ONCE' },
        {
          retryConfig: {
            maxRetries: 5,
            retryDelay: 5000,
          },
        },
      );

      expect(job.retryConfig.maxRetries).toBe(5);
      expect(job.retryConfig.retryDelay).toBe(5000);
    });

    it('should set tags', async () => {
      const job = await service.createJob(
        'Tagged Job',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'ONCE' },
        { tags: ['important', 'anaf'] },
      );

      expect(job.tags).toEqual(['important', 'anaf']);
    });

    it('should set organization and user IDs', async () => {
      const job = await service.createJob(
        'Org Job',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'ONCE' },
        { organizationId: mockOrgId, userId: mockUserId },
      );

      expect(job.organizationId).toBe(mockOrgId);
      expect(job.userId).toBe(mockUserId);
    });
  });

  describe('Schedule Helpers', () => {
    it('should schedule once', async () => {
      const runAt = new Date(Date.now() + 60000);
      const job = await service.scheduleOnce(
        'One Time Job',
        'NOTIFICATION',
        'noop',
        { message: 'Hello' },
        runAt,
      );

      expect(job.schedule.pattern).toBe('ONCE');
      expect(job.nextRunAt).toEqual(runAt);
    });

    it('should schedule recurring job', async () => {
      const job = await service.scheduleRecurring(
        'Hourly Job',
        'BACKUP',
        'noop',
        {},
        'HOURLY',
        2,
      );

      expect(job.schedule.pattern).toBe('HOURLY');
      expect(job.schedule.interval).toBe(2);
    });

    it('should schedule cron job', async () => {
      const job = await service.scheduleCron(
        'Cron Job',
        'REPORT_GENERATION',
        'noop',
        {},
        '0 0 * * *',
      );

      expect(job.schedule.pattern).toBe('CRON');
      expect(job.schedule.cronExpression).toBe('0 0 * * *');
    });

    it('should reject invalid cron expression', async () => {
      await expect(
        service.scheduleCron('Bad Cron', 'CUSTOM', 'noop', {}, 'invalid'),
      ).rejects.toThrow('Invalid cron expression');
    });
  });

  describe('Job Updates', () => {
    let testJob: ScheduledJob;

    beforeEach(async () => {
      testJob = await service.createJob(
        'Update Test',
        'CUSTOM',
        'noop',
        { original: true },
        { pattern: 'DAILY' },
      );
    });

    it('should update job name', async () => {
      const updated = await service.updateJob(testJob.id, { name: 'New Name' });

      expect(updated.name).toBe('New Name');
    });

    it('should update priority', async () => {
      const updated = await service.updateJob(testJob.id, { priority: 'HIGH' });

      expect(updated.priority).toBe('HIGH');
    });

    it('should update payload', async () => {
      const updated = await service.updateJob(testJob.id, { payload: { new: 'data' } });

      expect(updated.payload).toEqual({ new: 'data' });
    });

    it('should update schedule and recalculate next run', async () => {
      const updated = await service.updateJob(testJob.id, {
        schedule: { interval: 2 },
      });

      expect(updated.schedule.interval).toBe(2);
    });

    it('should update enabled status', async () => {
      const updated = await service.updateJob(testJob.id, { enabled: false });

      expect(updated.enabled).toBe(false);
    });

    it('should emit job.updated event', async () => {
      await service.updateJob(testJob.id, { name: 'Updated' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.updated',
        expect.objectContaining({ jobId: testJob.id }),
      );
    });

    it('should throw error for non-existent job', async () => {
      await expect(
        service.updateJob('non-existent', { name: 'New' }),
      ).rejects.toThrow('Job not found');
    });
  });

  describe('Job Deletion', () => {
    let testJob: ScheduledJob;

    beforeEach(async () => {
      testJob = await service.createJob(
        'Delete Test',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'ONCE' },
      );
    });

    it('should delete job', async () => {
      await service.deleteJob(testJob.id);

      const job = await service.getJob(testJob.id);
      expect(job).toBeUndefined();
    });

    it('should emit job.deleted event', async () => {
      await service.deleteJob(testJob.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.deleted',
        expect.objectContaining({ jobId: testJob.id }),
      );
    });

    it('should throw error for non-existent job', async () => {
      await expect(service.deleteJob('non-existent')).rejects.toThrow('Job not found');
    });
  });

  describe('Job Status Management', () => {
    let testJob: ScheduledJob;

    beforeEach(async () => {
      testJob = await service.createJob(
        'Status Test',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'DAILY' },
      );
    });

    it('should cancel scheduled job', async () => {
      const cancelled = await service.cancelJob(testJob.id);

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should emit job.cancelled event', async () => {
      await service.cancelJob(testJob.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.cancelled',
        expect.objectContaining({ jobId: testJob.id }),
      );
    });

    it('should throw error when cancelling completed job', async () => {
      await service.cancelJob(testJob.id);

      await expect(service.cancelJob(testJob.id)).rejects.toThrow('Cannot cancel job');
    });

    it('should pause scheduled job', async () => {
      const paused = await service.pauseJob(testJob.id);

      expect(paused.status).toBe('PAUSED');
    });

    it('should emit job.paused event', async () => {
      await service.pauseJob(testJob.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.paused',
        expect.objectContaining({ jobId: testJob.id }),
      );
    });

    it('should resume paused job', async () => {
      await service.pauseJob(testJob.id);
      const resumed = await service.resumeJob(testJob.id);

      expect(resumed.status).toBe('SCHEDULED');
    });

    it('should emit job.resumed event', async () => {
      await service.pauseJob(testJob.id);
      await service.resumeJob(testJob.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.resumed',
        expect.objectContaining({ jobId: testJob.id }),
      );
    });

    it('should throw error when pausing non-scheduled job', async () => {
      await service.cancelJob(testJob.id);

      await expect(service.pauseJob(testJob.id)).rejects.toThrow('Only scheduled jobs can be paused');
    });

    it('should throw error when resuming non-paused job', async () => {
      await expect(service.resumeJob(testJob.id)).rejects.toThrow('Only paused jobs can be resumed');
    });
  });

  describe('Job Execution', () => {
    it('should run job now', async () => {
      const job = await service.createJob(
        'Run Now',
        'CUSTOM',
        'noop',
        { test: true },
        { pattern: 'ONCE' },
      );

      const execution = await service.runJobNow(job.id);

      expect(execution.status).toBe('COMPLETED');
      expect(execution.duration).toBeDefined();
    });

    it('should emit job.started event', async () => {
      const job = await service.createJob('Start Event', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      await service.runJobNow(job.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.started',
        expect.objectContaining({
          jobId: job.id,
          attempt: 1,
        }),
      );
    });

    it('should emit job.completed event', async () => {
      const job = await service.createJob('Complete Event', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      await service.runJobNow(job.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.completed',
        expect.objectContaining({
          jobId: job.id,
        }),
      );
    });

    it('should execute handler with payload', async () => {
      const handler = jest.fn().mockResolvedValue({ processed: true });
      service.registerHandler('test-handler', handler);

      const job = await service.createJob(
        'Handler Test',
        'CUSTOM',
        'test-handler',
        { key: 'value' },
        { pattern: 'ONCE' },
      );

      await service.runJobNow(job.id);

      expect(handler).toHaveBeenCalledWith({ key: 'value' });
    });

    it('should store execution result', async () => {
      service.registerHandler('result-handler', async () => ({ result: 'success' }));

      const job = await service.createJob(
        'Result Test',
        'CUSTOM',
        'result-handler',
        {},
        { pattern: 'ONCE' },
      );

      const execution = await service.runJobNow(job.id);

      expect(execution.result).toEqual({ result: 'success' });
    });

    it('should handle job failure', async () => {
      service.registerHandler('failing-handler', async () => {
        throw new Error('Test failure');
      });

      const job = await service.createJob(
        'Failure Test',
        'CUSTOM',
        'failing-handler',
        {},
        { pattern: 'ONCE' },
        { retryConfig: { maxRetries: 0 } },
      );

      const execution = await service.runJobNow(job.id);

      expect(execution.status).toBe('FAILED');
      expect(execution.error).toContain('Test failure');
    });

    it('should emit job.failed event', async () => {
      service.registerHandler('fail-event', async () => {
        throw new Error('Failure');
      });

      const job = await service.createJob(
        'Fail Event Test',
        'CUSTOM',
        'fail-event',
        {},
        { pattern: 'ONCE' },
        { retryConfig: { maxRetries: 0 } },
      );

      await service.runJobNow(job.id);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.failed',
        expect.objectContaining({
          jobId: job.id,
          error: 'Failure',
        }),
      );
    });

    it('should handle timeout', async () => {
      service.registerHandler('slow-handler', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return { done: true };
      });

      const job = await service.createJob(
        'Timeout Test',
        'CUSTOM',
        'slow-handler',
        {},
        { pattern: 'ONCE' },
        { timeout: 100, retryConfig: { maxRetries: 0 } },
      );

      const execution = await service.runJobNow(job.id);

      expect(execution.status).toBe('TIMEOUT');
    });

    it('should update run count', async () => {
      const job = await service.createJob('Count Test', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      await service.runJobNow(job.id);

      const updatedJob = await service.getJob(job.id);
      expect(updatedJob!.runCount).toBe(1);
    });

    it('should update success count', async () => {
      const job = await service.createJob('Success Count', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      await service.runJobNow(job.id);

      const updatedJob = await service.getJob(job.id);
      expect(updatedJob!.successCount).toBe(1);
    });

    it('should update failure count', async () => {
      service.registerHandler('fail-count', async () => {
        throw new Error('fail');
      });

      const job = await service.createJob(
        'Fail Count',
        'CUSTOM',
        'fail-count',
        {},
        { pattern: 'ONCE' },
        { retryConfig: { maxRetries: 0 } },
      );

      await service.runJobNow(job.id);

      const updatedJob = await service.getJob(job.id);
      expect(updatedJob!.failureCount).toBe(1);
    });

    it('should store execution logs', async () => {
      const job = await service.createJob('Log Test', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      const execution = await service.runJobNow(job.id);

      expect(execution.logs.length).toBeGreaterThan(0);
      expect(execution.logs[0].level).toBe('INFO');
    });

    it('should throw error when running already running job', async () => {
      service.registerHandler('long-running', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return { done: true };
      });

      const job = await service.createJob('Long Job', 'CUSTOM', 'long-running', {}, { pattern: 'ONCE' });

      // Start job without awaiting
      service.runJobNow(job.id);

      // Try to run again immediately
      await expect(service.runJobNow(job.id)).rejects.toThrow('Job is already running');
    });
  });

  describe('Job Retry', () => {
    it('should retry failed job', async () => {
      let attemptCount = 0;
      service.registerHandler('retry-handler', async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Retry needed');
        }
        return { success: true };
      });

      const job = await service.createJob(
        'Retry Test',
        'CUSTOM',
        'retry-handler',
        {},
        { pattern: 'ONCE' },
        { retryConfig: { maxRetries: 0 } },
      );

      await service.runJobNow(job.id);

      // Manually retry
      const execution = await service.retryJob(job.id);

      expect(execution.status).toBe('COMPLETED');
    });

    it('should throw error when retrying non-failed job', async () => {
      const job = await service.createJob('Non-failed', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      await expect(service.retryJob(job.id)).rejects.toThrow('Only failed jobs can be retried');
    });
  });

  describe('Job Query', () => {
    beforeEach(async () => {
      await service.createJob('Job 1', 'ANAF_SUBMISSION', 'noop', {}, { pattern: 'ONCE' }, { priority: 'HIGH', tags: ['anaf'] });
      await service.createJob('Job 2', 'BACKUP', 'noop', {}, { pattern: 'DAILY' }, { priority: 'LOW', tags: ['backup'] });
      await service.createJob('Job 3', 'NOTIFICATION', 'noop', {}, { pattern: 'HOURLY' }, { priority: 'NORMAL' });
    });

    it('should query all jobs', async () => {
      const result = await service.queryJobs({});

      expect(result.jobs.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it('should filter by type', async () => {
      const result = await service.queryJobs({ type: 'ANAF_SUBMISSION' });

      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].type).toBe('ANAF_SUBMISSION');
    });

    it('should filter by priority', async () => {
      const result = await service.queryJobs({ priority: 'HIGH' });

      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].priority).toBe('HIGH');
    });

    it('should filter by tags', async () => {
      const result = await service.queryJobs({ tags: ['anaf'] });

      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].tags).toContain('anaf');
    });

    it('should filter by enabled status', async () => {
      await service.createJob('Disabled', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' }, { enabled: false });

      const result = await service.queryJobs({ enabled: true });

      expect(result.jobs.every((j) => j.enabled)).toBe(true);
    });

    it('should search by name', async () => {
      const result = await service.queryJobs({ search: 'Job 1' });

      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].name).toBe('Job 1');
    });

    it('should paginate results', async () => {
      const page1 = await service.queryJobs({ page: 1, limit: 2 });
      const page2 = await service.queryJobs({ page: 2, limit: 2 });

      expect(page1.jobs.length).toBe(2);
      expect(page1.hasMore).toBe(true);
      expect(page2.jobs.length).toBe(1);
      expect(page2.hasMore).toBe(false);
    });

    it('should sort by priority', async () => {
      const result = await service.queryJobs({ sortBy: 'priority', sortOrder: 'asc' });

      const priorities = result.jobs.map((j) => j.priority);
      expect(priorities).toEqual(['HIGH', 'LOW', 'NORMAL']);
    });
  });

  describe('Upcoming and Overdue Jobs', () => {
    it('should get upcoming jobs', async () => {
      await service.createJob(
        'Future Job',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'ONCE', startAt: new Date(Date.now() + 60000) },
      );

      const upcoming = await service.getUpcomingJobs();

      expect(upcoming.length).toBe(1);
      expect(upcoming[0].name).toBe('Future Job');
    });

    it('should get overdue jobs', async () => {
      const job = await service.createJob('Past Job', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      // Set next run to past
      job.nextRunAt = new Date(Date.now() - 60000);

      const overdue = await service.getOverdueJobs();

      expect(overdue.length).toBe(1);
    });

    it('should limit upcoming jobs', async () => {
      for (let i = 0; i < 15; i++) {
        await service.createJob(
          `Future ${i}`,
          'CUSTOM',
          'noop',
          {},
          { pattern: 'ONCE', startAt: new Date(Date.now() + (i + 1) * 60000) },
        );
      }

      const upcoming = await service.getUpcomingJobs(5);

      expect(upcoming.length).toBe(5);
    });
  });

  describe('Job Executions', () => {
    it('should get job executions', async () => {
      const job = await service.createJob('Exec Test', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      await service.runJobNow(job.id);

      const executions = await service.getJobExecutions(job.id);

      expect(executions.length).toBe(1);
      expect(executions[0].jobId).toBe(job.id);
    });

    it('should get last execution', async () => {
      const job = await service.createJob('Last Exec', 'CUSTOM', 'noop', {}, { pattern: 'DAILY' });

      await service.runJobNow(job.id);

      const lastExec = await service.getLastExecution(job.id);

      expect(lastExec).toBeDefined();
      expect(lastExec!.status).toBe('COMPLETED');
    });

    it('should limit stored executions', async () => {
      const job = await service.createJob('Many Exec', 'CUSTOM', 'noop', {}, { pattern: 'DAILY' });

      // Run multiple times
      for (let i = 0; i < 5; i++) {
        // Reset status to allow re-running
        const current = await service.getJob(job.id);
        if (current) {
          current.status = 'SCHEDULED';
        }
        await service.runJobNow(job.id);
      }

      const executions = await service.getJobExecutions(job.id);

      expect(executions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scheduler Statistics', () => {
    beforeEach(async () => {
      await service.createJob('Stat Job 1', 'ANAF_SUBMISSION', 'noop', {}, { pattern: 'ONCE' }, { priority: 'HIGH' });
      await service.createJob('Stat Job 2', 'BACKUP', 'noop', {}, { pattern: 'DAILY' }, { priority: 'LOW' });
    });

    it('should get stats', async () => {
      const stats = await service.getStats();

      expect(stats.totalJobs).toBe(2);
      expect(stats.jobsByType.ANAF_SUBMISSION).toBe(1);
      expect(stats.jobsByType.BACKUP).toBe(1);
      expect(stats.jobsByPriority.HIGH).toBe(1);
      expect(stats.jobsByPriority.LOW).toBe(1);
    });

    it('should calculate success rate', async () => {
      const job = await service.createJob('Rate Test', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });
      await service.runJobNow(job.id);

      const stats = await service.getStats();

      expect(stats.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should return upcoming jobs in stats', async () => {
      await service.createJob(
        'Upcoming Stat',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'ONCE', startAt: new Date(Date.now() + 60000) },
      );

      const stats = await service.getStats();

      expect(stats.upcomingJobs.length).toBeGreaterThan(0);
    });
  });

  describe('Queue Management', () => {
    it('should get queue by ID', () => {
      const queue = service.getQueue('queue-default');

      expect(queue).toBeDefined();
      expect(queue!.name).toBe('Default Queue');
    });

    it('should get all queues', () => {
      const queues = service.getAllQueues();

      expect(queues.length).toBeGreaterThan(0);
    });

    it('should pause queue', async () => {
      const paused = await service.pauseQueue('queue-default');

      expect(paused.isPaused).toBe(true);
    });

    it('should emit queue.paused event', async () => {
      await service.pauseQueue('queue-default');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'queue.paused',
        expect.objectContaining({ queueId: 'queue-default' }),
      );
    });

    it('should resume queue', async () => {
      await service.pauseQueue('queue-default');
      const resumed = await service.resumeQueue('queue-default');

      expect(resumed.isPaused).toBe(false);
    });

    it('should emit queue.resumed event', async () => {
      await service.pauseQueue('queue-default');
      await service.resumeQueue('queue-default');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'queue.resumed',
        expect.objectContaining({ queueId: 'queue-default' }),
      );
    });

    it('should throw error for non-existent queue', async () => {
      await expect(service.pauseQueue('non-existent')).rejects.toThrow('Queue not found');
    });
  });

  describe('Recurring Jobs', () => {
    it('should schedule next run for recurring job', async () => {
      const job = await service.createJob(
        'Recurring',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'HOURLY', interval: 1 },
      );

      await service.runJobNow(job.id);

      const updated = await service.getJob(job.id);

      expect(updated!.status).toBe('SCHEDULED');
      expect(updated!.nextRunAt).toBeDefined();
      expect(updated!.nextRunAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should not reschedule one-time job', async () => {
      const job = await service.createJob('One Time', 'CUSTOM', 'noop', {}, { pattern: 'ONCE' });

      await service.runJobNow(job.id);

      const updated = await service.getJob(job.id);

      expect(updated!.status).toBe('COMPLETED');
    });
  });

  describe('Schedule Patterns', () => {
    it('should calculate minutely schedule', async () => {
      const job = await service.createJob(
        'Minutely',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'MINUTELY', interval: 5 },
      );

      expect(job.nextRunAt).toBeDefined();
      const expectedMin = Date.now() + 4 * 60 * 1000;
      const expectedMax = Date.now() + 6 * 60 * 1000;
      expect(job.nextRunAt!.getTime()).toBeGreaterThan(expectedMin);
      expect(job.nextRunAt!.getTime()).toBeLessThan(expectedMax);
    });

    it('should calculate daily schedule', async () => {
      const job = await service.createJob(
        'Daily',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'DAILY', interval: 1 },
      );

      expect(job.nextRunAt).toBeDefined();
      const expectedMin = Date.now() + 23 * 60 * 60 * 1000;
      expect(job.nextRunAt!.getTime()).toBeGreaterThan(expectedMin);
    });

    it('should calculate weekly schedule', async () => {
      const job = await service.createJob(
        'Weekly',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'WEEKLY', interval: 1 },
      );

      expect(job.nextRunAt).toBeDefined();
      const expectedMin = Date.now() + 6 * 24 * 60 * 60 * 1000;
      expect(job.nextRunAt!.getTime()).toBeGreaterThan(expectedMin);
    });

    it('should use startAt as next run if in future', async () => {
      const startAt = new Date(Date.now() + 3600000);
      const job = await service.createJob(
        'Future Start',
        'CUSTOM',
        'noop',
        {},
        { pattern: 'DAILY', startAt },
      );

      expect(job.nextRunAt).toEqual(startAt);
    });
  });
});
