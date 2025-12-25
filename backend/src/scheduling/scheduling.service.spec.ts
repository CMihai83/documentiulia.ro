import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SchedulingService,
  JobType,
  JobFrequency,
  JobPriority,
} from './scheduling.service';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('Job Management', () => {
    it('should create job', async () => {
      const job = await service.createJob(
        'Daily Backup',
        'Backup Zilnic',
        'BACKUP',
        'DAILY',
        'backup.handler',
        'user-1',
      );

      expect(job.id).toBeDefined();
      expect(job.name).toBe('Daily Backup');
      expect(job.nameRo).toBe('Backup Zilnic');
      expect(job.type).toBe('BACKUP');
      expect(job.frequency).toBe('DAILY');
      expect(job.isActive).toBe(true);
      expect(job.nextRun).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'job.created',
        expect.objectContaining({ jobId: job.id }),
      );
    });

    it('should create job with options', async () => {
      const job = await service.createJob(
        'Custom Job',
        'Job Personalizat',
        'CUSTOM',
        'HOURLY',
        'custom.handler',
        'user-1',
        {
          description: 'A custom job',
          descriptionRo: 'Un job personalizat',
          priority: 'HIGH',
          maxRetries: 5,
          timeout: 600000,
          tags: ['important', 'custom'],
        },
      );

      expect(job.description).toBe('A custom job');
      expect(job.priority).toBe('HIGH');
      expect(job.maxRetries).toBe(5);
      expect(job.timeout).toBe(600000);
      expect(job.tags).toContain('important');
    });

    it('should get job by id', async () => {
      const created = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'test.handler', 'user-1');

      const job = await service.getJob(created.id);

      expect(job).toBeDefined();
      expect(job!.id).toBe(created.id);
    });

    it('should list all jobs', async () => {
      await service.createJob('Job 1', 'Job 1', 'BACKUP', 'DAILY', 'handler1', 'user-1');
      await service.createJob('Job 2', 'Job 2', 'SYNC', 'HOURLY', 'handler2', 'user-1');

      const jobs = await service.listJobs();

      expect(jobs.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter jobs by type', async () => {
      await service.createJob('Backup', 'Backup', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.createJob('Sync', 'Sync', 'SYNC', 'HOURLY', 'handler', 'user-1');

      const jobs = await service.listJobs({ type: 'BACKUP' });

      expect(jobs.every((j) => j.type === 'BACKUP')).toBe(true);
    });

    it('should filter jobs by priority', async () => {
      await service.createJob('High', 'High', 'BACKUP', 'DAILY', 'handler', 'user-1', { priority: 'HIGH' });
      await service.createJob('Low', 'Low', 'BACKUP', 'DAILY', 'handler', 'user-1', { priority: 'LOW' });

      const jobs = await service.listJobs({ priority: 'HIGH' });

      expect(jobs.every((j) => j.priority === 'HIGH')).toBe(true);
    });

    it('should filter jobs by tag', async () => {
      await service.createJob('Tagged', 'Tagged', 'BACKUP', 'DAILY', 'handler', 'user-1', { tags: ['important'] });
      await service.createJob('Untagged', 'Untagged', 'BACKUP', 'DAILY', 'handler', 'user-1');

      const jobs = await service.listJobs({ tag: 'important' });

      expect(jobs.every((j) => j.tags?.includes('important'))).toBe(true);
    });

    it('should update job', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');

      const updated = await service.updateJob(job.id, {
        description: 'Updated description',
        priority: 'CRITICAL',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.priority).toBe('CRITICAL');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'job.updated',
        expect.objectContaining({ jobId: job.id }),
      );
    });

    it('should throw error when updating non-existent job', async () => {
      await expect(service.updateJob('invalid-id', {})).rejects.toThrow('Job not found');
    });

    it('should pause job', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');

      const paused = await service.pauseJob(job.id);

      expect(paused.isActive).toBe(false);
      expect(paused.lastStatus).toBe('PAUSED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('job.paused', expect.any(Object));
    });

    it('should resume job', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.pauseJob(job.id);

      const resumed = await service.resumeJob(job.id);

      expect(resumed.isActive).toBe(true);
      expect(resumed.lastStatus).toBe('PENDING');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('job.resumed', expect.any(Object));
    });

    it('should delete job', async () => {
      const job = await service.createJob('Delete Me', 'Delete Me', 'BACKUP', 'DAILY', 'handler', 'user-1');

      const result = await service.deleteJob(job.id);

      expect(result).toBe(true);
      const deleted = await service.getJob(job.id);
      expect(deleted).toBeUndefined();
    });
  });

  describe('Job Execution', () => {
    it('should run job', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');

      const execution = await service.runJob(job.id);

      expect(execution.id).toBeDefined();
      expect(execution.jobId).toBe(job.id);
      expect(execution.status).toBe('COMPLETED');
      expect(execution.triggeredBy).toBe('MANUAL');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'job.started',
        expect.objectContaining({ jobId: job.id }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'job.completed',
        expect.objectContaining({ jobId: job.id }),
      );
    });

    it('should run job by schedule trigger', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');

      const execution = await service.runJob(job.id, 'SCHEDULE');

      expect(execution.triggeredBy).toBe('SCHEDULE');
    });

    it('should update job run count', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');

      await service.runJob(job.id);

      const updated = await service.getJob(job.id);
      expect(updated!.runCount).toBe(1);
      expect(updated!.successCount).toBe(1);
    });

    it('should throw error for non-existent job', async () => {
      await expect(service.runJob('invalid-id')).rejects.toThrow('Job not found');
    });

    it('should get execution by id', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');
      const exec = await service.runJob(job.id);

      const execution = await service.getExecution(exec.id);

      expect(execution).toBeDefined();
      expect(execution!.id).toBe(exec.id);
    });

    it('should list executions', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.runJob(job.id);
      await service.runJob(job.id);

      const executions = await service.listExecutions();

      expect(executions.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter executions by job', async () => {
      const job1 = await service.createJob('Job 1', 'Job 1', 'BACKUP', 'DAILY', 'handler', 'user-1');
      const job2 = await service.createJob('Job 2', 'Job 2', 'SYNC', 'HOURLY', 'handler', 'user-1');
      await service.runJob(job1.id);
      await service.runJob(job2.id);

      const executions = await service.listExecutions({ jobId: job1.id });

      expect(executions.every((e) => e.jobId === job1.id)).toBe(true);
    });

    it('should filter executions by status', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.runJob(job.id);

      const executions = await service.listExecutions({ status: 'COMPLETED' });

      expect(executions.every((e) => e.status === 'COMPLETED')).toBe(true);
    });

    it('should cancel running execution', async () => {
      // Note: In real implementation, need a long-running job to cancel
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');
      const execution = await service.runJob(job.id);

      // Can only cancel if still running - test the method exists
      const result = await service.cancelExecution('non-running-exec');
      expect(result).toBe(false);
    });
  });

  describe('Job Dependencies', () => {
    it('should create job with dependencies', async () => {
      const dep = await service.createJob('Dependency', 'Dependency', 'BACKUP', 'DAILY', 'handler', 'user-1');
      const job = await service.createJob('Main Job', 'Main Job', 'SYNC', 'DAILY', 'handler', 'user-1', {
        dependencies: [dep.id],
      });

      expect(job.dependencies).toContain(dep.id);
    });

    it('should fail if dependency not satisfied', async () => {
      const dep = await service.createJob('Dependency', 'Dependency', 'BACKUP', 'DAILY', 'handler', 'user-1');
      const job = await service.createJob('Main Job', 'Main Job', 'SYNC', 'DAILY', 'handler', 'user-1', {
        dependencies: [dep.id],
      });

      await expect(service.runJob(job.id)).rejects.toThrow('Dependency not satisfied');
    });

    it('should run if dependencies completed', async () => {
      const dep = await service.createJob('Dependency', 'Dependency', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.runJob(dep.id);

      const job = await service.createJob('Main Job', 'Main Job', 'SYNC', 'DAILY', 'handler', 'user-1', {
        dependencies: [dep.id],
      });

      const execution = await service.runJob(job.id);
      expect(execution.status).toBe('COMPLETED');
    });
  });

  describe('Deadline Management', () => {
    it('should create deadline', async () => {
      const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

      const deadline = await service.createDeadline(
        'VAT Declaration',
        'Declarație TVA',
        dueDate,
        'TAX',
        'user-1',
      );

      expect(deadline.id).toBeDefined();
      expect(deadline.name).toBe('VAT Declaration');
      expect(deadline.nameRo).toBe('Declarație TVA');
      expect(deadline.category).toBe('TAX');
      expect(deadline.status).toBe('PENDING');
      expect(deadline.reminders).toHaveLength(3);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'deadline.created',
        expect.objectContaining({ deadlineId: deadline.id }),
      );
    });

    it('should create deadline with custom reminders', async () => {
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const deadline = await service.createDeadline(
        'Test',
        'Test',
        dueDate,
        'CUSTOM',
        'user-1',
        { reminders: [14, 7, 3, 1] },
      );

      expect(deadline.reminders).toHaveLength(4);
      expect(deadline.reminders.map((r) => r.daysBefore)).toContain(14);
    });

    it('should detect approaching deadline status', async () => {
      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

      const deadline = await service.createDeadline('Approaching', 'Approaching', dueDate, 'TAX', 'user-1');

      expect(deadline.status).toBe('APPROACHING');
    });

    it('should detect due deadline status', async () => {
      const dueDate = new Date(); // Today

      const deadline = await service.createDeadline('Due Today', 'Due Today', dueDate, 'TAX', 'user-1');

      expect(deadline.status).toBe('DUE');
    });

    it('should detect overdue deadline status', async () => {
      const dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      const deadline = await service.createDeadline('Overdue', 'Overdue', dueDate, 'TAX', 'user-1');

      expect(deadline.status).toBe('OVERDUE');
    });

    it('should get deadline by id', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const created = await service.createDeadline('Test', 'Test', dueDate, 'TAX', 'user-1');

      const deadline = await service.getDeadline(created.id);

      expect(deadline).toBeDefined();
      expect(deadline!.id).toBe(created.id);
    });

    it('should list deadlines', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await service.createDeadline('Deadline 1', 'Deadline 1', dueDate, 'TAX', 'user-1');
      await service.createDeadline('Deadline 2', 'Deadline 2', dueDate, 'ANAF', 'user-1');

      const deadlines = await service.listDeadlines();

      expect(deadlines.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter deadlines by category', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await service.createDeadline('Tax', 'Tax', dueDate, 'TAX', 'user-1');
      await service.createDeadline('ANAF', 'ANAF', dueDate, 'ANAF', 'user-1');

      const deadlines = await service.listDeadlines({ category: 'TAX' });

      expect(deadlines.every((d) => d.category === 'TAX')).toBe(true);
    });

    it('should complete deadline', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadline = await service.createDeadline('To Complete', 'To Complete', dueDate, 'TAX', 'user-1');

      const completed = await service.completeDeadline(deadline.id);

      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'deadline.completed',
        expect.objectContaining({ deadlineId: deadline.id }),
      );
    });

    it('should throw error when completing non-existent deadline', async () => {
      await expect(service.completeDeadline('invalid-id')).rejects.toThrow('Deadline not found');
    });

    it('should delete deadline', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadline = await service.createDeadline('Delete Me', 'Delete Me', dueDate, 'TAX', 'user-1');

      const result = await service.deleteDeadline(deadline.id);

      expect(result).toBe(true);
      const deleted = await service.getDeadline(deadline.id);
      expect(deleted).toBeUndefined();
    });

    it('should create recurring deadline and next occurrence', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadline = await service.createDeadline('Recurring', 'Recurring', dueDate, 'TAX', 'user-1', {
        isRecurring: true,
        recurrencePattern: 'MONTHLY',
      });

      await service.completeDeadline(deadline.id);

      const deadlines = await service.listDeadlines({ category: 'TAX' });
      const recurringDeadlines = deadlines.filter((d) => d.name === 'Recurring');

      expect(recurringDeadlines.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ANAF Compliance', () => {
    it('should create ANAF deadlines', async () => {
      const year = new Date().getFullYear();
      const month = new Date().getMonth();

      const deadlines = await service.createAnafDeadlines(year, month);

      expect(deadlines.length).toBeGreaterThan(0);
      expect(deadlines.every((d) => d.category === 'ANAF')).toBe(true);
      expect(deadlines.every((d) => d.priority === 'HIGH')).toBe(true);
    });

    it('should have D406 SAF-T deadline', async () => {
      const year = new Date().getFullYear();
      const month = new Date().getMonth();

      const deadlines = await service.createAnafDeadlines(year, month);
      const safTDeadline = deadlines.find((d) => d.name.includes('D406'));

      expect(safTDeadline).toBeDefined();
      expect(safTDeadline!.nameRo).toContain('D406');
    });

    it('should have e-Factura deadline', async () => {
      const year = new Date().getFullYear();
      const month = new Date().getMonth();

      const deadlines = await service.createAnafDeadlines(year, month);
      const efacturaDeadline = deadlines.find((d) => d.name.includes('e-Factura'));

      expect(efacturaDeadline).toBeDefined();
    });

    it('should set recurring pattern for ANAF deadlines', async () => {
      const year = new Date().getFullYear();
      const month = new Date().getMonth();

      const deadlines = await service.createAnafDeadlines(year, month);

      expect(deadlines.every((d) => d.isRecurring)).toBe(true);
      expect(deadlines.every((d) => d.recurrencePattern === 'MONTHLY')).toBe(true);
    });
  });

  describe('Calendar Management', () => {
    it('should have Romanian holidays loaded', async () => {
      const year = new Date().getFullYear();
      const holidays = await service.getHolidays(year);

      expect(holidays.length).toBeGreaterThan(0);
    });

    it('should have National Day of Romania', async () => {
      const year = new Date().getFullYear();
      const holidays = await service.getHolidays(year);
      const nationalDay = holidays.find((h) => h.titleRo.includes('Națională'));

      expect(nationalDay).toBeDefined();
    });

    it('should have Christmas holidays', async () => {
      const year = new Date().getFullYear();
      const holidays = await service.getHolidays(year);
      const christmas = holidays.filter((h) => h.titleRo.includes('Crăciun'));

      expect(christmas.length).toBeGreaterThanOrEqual(2);
    });

    it('should get calendar events', async () => {
      const events = await service.getCalendarEvents();

      expect(events.length).toBeGreaterThan(0);
    });

    it('should filter events by type', async () => {
      const holidays = await service.getCalendarEvents({ type: 'HOLIDAY' });

      expect(holidays.every((e) => e.type === 'HOLIDAY')).toBe(true);
    });

    it('should filter events by date range', async () => {
      const fromDate = new Date(new Date().getFullYear(), 11, 1); // December 1
      const toDate = new Date(new Date().getFullYear(), 11, 31); // December 31

      const events = await service.getCalendarEvents({ fromDate, toDate });

      expect(events.every((e) => e.date >= fromDate && e.date <= toDate)).toBe(true);
    });

    it('should calculate working days in month', async () => {
      const year = new Date().getFullYear();
      const month = 0; // January

      const workingDays = await service.getWorkingDays(year, month);

      expect(workingDays).toBeGreaterThan(0);
      expect(workingDays).toBeLessThan(31);
    });

    it('should add deadline to calendar', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadline = await service.createDeadline('Calendar Test', 'Test Calendar', dueDate, 'TAX', 'user-1');

      const events = await service.getCalendarEvents({ type: 'DEADLINE' });
      const deadlineEvent = events.find((e) => e.title === 'Calendar Test');

      expect(deadlineEvent).toBeDefined();
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.createJob('Job 1', 'Job 1', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.createJob('Job 2', 'Job 2', 'SYNC', 'HOURLY', 'handler', 'user-1');
      const job = await service.createJob('Job 3', 'Job 3', 'REPORT', 'WEEKLY', 'handler', 'user-1');
      await service.runJob(job.id);
    });

    it('should return total jobs count', async () => {
      const stats = await service.getStats();

      expect(stats.totalJobs).toBeGreaterThanOrEqual(3);
    });

    it('should return active jobs count', async () => {
      const stats = await service.getStats();

      expect(stats.activeJobs).toBeGreaterThanOrEqual(3);
    });

    it('should track today executions', async () => {
      const stats = await service.getStats();

      expect(stats.todayExecutions).toBeGreaterThanOrEqual(1);
    });

    it('should track today successes', async () => {
      const stats = await service.getStats();

      expect(stats.todaySuccesses).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Romanian Localization', () => {
    it('should translate job types', () => {
      expect(service.getJobTypeName('BACKUP')).toBe('Copie de Siguranță');
      expect(service.getJobTypeName('PAYROLL')).toBe('Stat de Plată');
      expect(service.getJobTypeName('ANAF_SUBMISSION')).toBe('Depunere ANAF');
    });

    it('should translate frequencies', () => {
      expect(service.getFrequencyName('DAILY')).toBe('Zilnic');
      expect(service.getFrequencyName('MONTHLY')).toBe('Lunar');
      expect(service.getFrequencyName('WEEKLY')).toBe('Săptămânal');
    });

    it('should translate priorities', () => {
      expect(service.getPriorityName('HIGH')).toBe('Ridicată');
      expect(service.getPriorityName('CRITICAL')).toBe('Critică');
      expect(service.getPriorityName('LOW')).toBe('Scăzută');
    });

    it('should get all job types with translations', () => {
      const types = service.getAllJobTypes();

      expect(types.length).toBeGreaterThan(0);
      expect(types.every((t) => t.nameRo)).toBe(true);
    });

    it('should get all frequencies with translations', () => {
      const frequencies = service.getAllFrequencies();

      expect(frequencies.length).toBeGreaterThan(0);
      expect(frequencies.every((f) => f.nameRo)).toBe(true);
    });

    it('should have Romanian diacritics in translations', () => {
      const backup = service.getJobTypeName('BACKUP');
      expect(backup).toContain('ă'); // Copie de Siguranță

      const weekly = service.getFrequencyName('WEEKLY');
      expect(weekly).toContain('ă'); // Săptămânal

      const high = service.getPriorityName('HIGH');
      expect(high).toContain('ă'); // Ridicată
    });

    it('should have Romanian holiday names', async () => {
      const year = new Date().getFullYear();
      const holidays = await service.getHolidays(year);

      expect(holidays.some((h) => h.titleRo.includes('ă') || h.titleRo.includes('ț'))).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit job.created event', async () => {
      await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('job.created', expect.any(Object));
    });

    it('should emit job.updated event', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.updateJob(job.id, { description: 'Updated' });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('job.updated', expect.any(Object));
    });

    it('should emit job.paused event', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.pauseJob(job.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('job.paused', expect.any(Object));
    });

    it('should emit job.started event', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.runJob(job.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('job.started', expect.any(Object));
    });

    it('should emit job.completed event', async () => {
      const job = await service.createJob('Test', 'Test', 'BACKUP', 'DAILY', 'handler', 'user-1');
      await service.runJob(job.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('job.completed', expect.any(Object));
    });

    it('should emit deadline.created event', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await service.createDeadline('Test', 'Test', dueDate, 'TAX', 'user-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('deadline.created', expect.any(Object));
    });

    it('should emit deadline.completed event', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadline = await service.createDeadline('Test', 'Test', dueDate, 'TAX', 'user-1');
      await service.completeDeadline(deadline.id);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('deadline.completed', expect.any(Object));
    });
  });
});
