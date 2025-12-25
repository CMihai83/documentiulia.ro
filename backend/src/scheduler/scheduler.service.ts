import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type JobStatus = 'PENDING' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED';

export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type JobType =
  | 'ANAF_SUBMISSION'
  | 'SAGA_SYNC'
  | 'INVOICE_GENERATION'
  | 'REPORT_GENERATION'
  | 'BACKUP'
  | 'CLEANUP'
  | 'NOTIFICATION'
  | 'EMAIL_SEND'
  | 'DATA_IMPORT'
  | 'DATA_EXPORT'
  | 'TAX_CALCULATION'
  | 'PAYROLL_PROCESS'
  | 'AUDIT_LOG'
  | 'WEBHOOK_DELIVERY'
  | 'FILE_PROCESSING'
  | 'REMINDER'
  | 'RECURRING_INVOICE'
  | 'COMPLIANCE_CHECK'
  | 'CUSTOM';

export type RecurrencePattern = 'ONCE' | 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CRON';

export interface ScheduledJob {
  id: string;
  name: string;
  nameRo?: string;
  description?: string;
  descriptionRo?: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  handler: string;
  payload: Record<string, any>;
  schedule: JobSchedule;
  retryConfig: RetryConfig;
  timeout: number;
  organizationId?: string;
  userId?: string;
  tags: string[];
  metadata: Record<string, any>;
  lastRun?: JobExecution;
  nextRunAt?: Date;
  runCount: number;
  failureCount: number;
  successCount: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobSchedule {
  pattern: RecurrencePattern;
  cronExpression?: string;
  interval?: number;
  timezone: string;
  startAt?: Date;
  endAt?: Date;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  monthsOfYear?: number[];
  excludeDates?: Date[];
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  retryOn: string[];
}

export interface JobExecution {
  id: string;
  jobId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
  error?: string;
  errorStack?: string;
  attempt: number;
  logs: JobLog[];
  metrics: JobMetrics;
}

export interface JobLog {
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  data?: Record<string, any>;
}

export interface JobMetrics {
  cpuTime?: number;
  memoryUsed?: number;
  ioOperations?: number;
  networkCalls?: number;
  recordsProcessed?: number;
}

export interface JobQueue {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  concurrency: number;
  maxSize: number;
  priority: JobPriority;
  processingRate: number;
  isPaused: boolean;
  jobCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
}

export interface SchedulerStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averageExecutionTime: number;
  successRate: number;
  jobsByType: Record<JobType, number>;
  jobsByPriority: Record<JobPriority, number>;
  executionsLast24h: number;
  failuresLast24h: number;
  upcomingJobs: ScheduledJob[];
}

export interface JobQuery {
  type?: JobType;
  status?: JobStatus;
  priority?: JobPriority;
  organizationId?: string;
  userId?: string;
  tags?: string[];
  enabled?: boolean;
  scheduledBefore?: Date;
  scheduledAfter?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JobQueryResult {
  jobs: ScheduledJob[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private jobs: Map<string, ScheduledJob> = new Map();
  private executions: Map<string, JobExecution[]> = new Map();
  private queues: Map<string, JobQueue> = new Map();
  private handlers: Map<string, (payload: any) => Promise<any>> = new Map();
  private runningJobs: Map<string, JobExecution> = new Map();
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultQueues();
    this.registerDefaultHandlers();
  }

  private initializeDefaultQueues(): void {
    const defaultQueues: Omit<JobQueue, 'jobCount' | 'processingCount' | 'completedCount' | 'failedCount'>[] = [
      {
        id: 'queue-default',
        name: 'Default Queue',
        nameRo: 'Coadă Implicită',
        description: 'Default job queue for general tasks',
        descriptionRo: 'Coada de joburi implicită pentru sarcini generale',
        concurrency: 5,
        maxSize: 1000,
        priority: 'NORMAL',
        processingRate: 10,
        isPaused: false,
      },
      {
        id: 'queue-priority',
        name: 'Priority Queue',
        nameRo: 'Coadă Prioritară',
        description: 'Queue for high-priority and critical tasks',
        descriptionRo: 'Coadă pentru sarcini cu prioritate înaltă și critice',
        concurrency: 10,
        maxSize: 500,
        priority: 'HIGH',
        processingRate: 20,
        isPaused: false,
      },
      {
        id: 'queue-anaf',
        name: 'ANAF Queue',
        nameRo: 'Coadă ANAF',
        description: 'Queue for ANAF submissions and compliance tasks',
        descriptionRo: 'Coadă pentru trimiteri ANAF și sarcini de conformitate',
        concurrency: 3,
        maxSize: 200,
        priority: 'HIGH',
        processingRate: 5,
        isPaused: false,
      },
      {
        id: 'queue-background',
        name: 'Background Queue',
        nameRo: 'Coadă de Fundal',
        description: 'Queue for low-priority background tasks',
        descriptionRo: 'Coadă pentru sarcini de fundal cu prioritate scăzută',
        concurrency: 2,
        maxSize: 2000,
        priority: 'LOW',
        processingRate: 5,
        isPaused: false,
      },
    ];

    defaultQueues.forEach((queue) => {
      this.queues.set(queue.id, {
        ...queue,
        jobCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
      });
    });
  }

  private registerDefaultHandlers(): void {
    this.handlers.set('noop', async () => ({ success: true }));

    this.handlers.set('log', async (payload) => {
      this.logger.log(`Log handler: ${JSON.stringify(payload)}`);
      return { logged: true };
    });

    this.handlers.set('delay', async (payload) => {
      const delay = payload.delay || 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return { delayed: delay };
    });

    this.handlers.set('webhook', async (payload) => {
      return { delivered: true, url: payload.url };
    });

    this.handlers.set('email', async (payload) => {
      return { sent: true, to: payload.to };
    });

    this.handlers.set('notification', async (payload) => {
      return { notified: true, userId: payload.userId };
    });
  }

  registerHandler(name: string, handler: (payload: any) => Promise<any>): void {
    this.handlers.set(name, handler);
    this.logger.log(`Handler registered: ${name}`);
  }

  unregisterHandler(name: string): boolean {
    const deleted = this.handlers.delete(name);
    if (deleted) {
      this.logger.log(`Handler unregistered: ${name}`);
    }
    return deleted;
  }

  hasHandler(name: string): boolean {
    return this.handlers.has(name);
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.schedulerInterval = setInterval(() => {
      this.processScheduledJobs();
    }, 1000);

    this.eventEmitter.emit('scheduler.started', { timestamp: new Date() });
    this.logger.log('Scheduler started');
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    this.eventEmitter.emit('scheduler.stopped', { timestamp: new Date() });
    this.logger.log('Scheduler stopped');
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  async createJob(
    name: string,
    type: JobType,
    handler: string,
    payload: Record<string, any>,
    schedule: Partial<JobSchedule>,
    options: {
      nameRo?: string;
      description?: string;
      descriptionRo?: string;
      priority?: JobPriority;
      timeout?: number;
      retryConfig?: Partial<RetryConfig>;
      organizationId?: string;
      userId?: string;
      tags?: string[];
      metadata?: Record<string, any>;
      enabled?: boolean;
    } = {},
  ): Promise<ScheduledJob> {
    if (!this.handlers.has(handler)) {
      throw new Error(`Handler '${handler}' not registered`);
    }

    const jobId = this.generateId('job');
    const now = new Date();

    const fullSchedule: JobSchedule = {
      pattern: schedule.pattern || 'ONCE',
      cronExpression: schedule.cronExpression,
      interval: schedule.interval,
      timezone: schedule.timezone || 'Europe/Bucharest',
      startAt: schedule.startAt,
      endAt: schedule.endAt,
      daysOfWeek: schedule.daysOfWeek,
      daysOfMonth: schedule.daysOfMonth,
      monthsOfYear: schedule.monthsOfYear,
      excludeDates: schedule.excludeDates,
    };

    const retryConfig: RetryConfig = {
      maxRetries: options.retryConfig?.maxRetries ?? 3,
      retryDelay: options.retryConfig?.retryDelay ?? 1000,
      backoffMultiplier: options.retryConfig?.backoffMultiplier ?? 2,
      maxDelay: options.retryConfig?.maxDelay ?? 30000,
      retryOn: options.retryConfig?.retryOn ?? ['TIMEOUT', 'ERROR'],
    };

    const job: ScheduledJob = {
      id: jobId,
      name,
      nameRo: options.nameRo,
      description: options.description,
      descriptionRo: options.descriptionRo,
      type,
      status: 'SCHEDULED',
      priority: options.priority || 'NORMAL',
      handler,
      payload,
      schedule: fullSchedule,
      retryConfig,
      timeout: options.timeout || 30000,
      organizationId: options.organizationId,
      userId: options.userId,
      tags: options.tags || [],
      metadata: options.metadata || {},
      nextRunAt: this.calculateNextRun(fullSchedule),
      runCount: 0,
      failureCount: 0,
      successCount: 0,
      enabled: options.enabled !== false,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(job.id, job);
    this.executions.set(job.id, []);

    this.eventEmitter.emit('job.created', {
      jobId: job.id,
      name: job.name,
      type: job.type,
      nextRunAt: job.nextRunAt,
    });

    this.logger.log(`Job created: ${job.id} (${job.name})`);

    return job;
  }

  async scheduleOnce(
    name: string,
    type: JobType,
    handler: string,
    payload: Record<string, any>,
    runAt: Date,
    options: {
      priority?: JobPriority;
      organizationId?: string;
      userId?: string;
    } = {},
  ): Promise<ScheduledJob> {
    return this.createJob(name, type, handler, payload, {
      pattern: 'ONCE',
      startAt: runAt,
    }, options);
  }

  async scheduleRecurring(
    name: string,
    type: JobType,
    handler: string,
    payload: Record<string, any>,
    pattern: RecurrencePattern,
    interval: number,
    options: {
      priority?: JobPriority;
      organizationId?: string;
      userId?: string;
      startAt?: Date;
      endAt?: Date;
    } = {},
  ): Promise<ScheduledJob> {
    return this.createJob(name, type, handler, payload, {
      pattern,
      interval,
      startAt: options.startAt,
      endAt: options.endAt,
    }, {
      priority: options.priority,
      organizationId: options.organizationId,
      userId: options.userId,
    });
  }

  async scheduleCron(
    name: string,
    type: JobType,
    handler: string,
    payload: Record<string, any>,
    cronExpression: string,
    options: {
      priority?: JobPriority;
      organizationId?: string;
      userId?: string;
      timezone?: string;
    } = {},
  ): Promise<ScheduledJob> {
    if (!this.isValidCronExpression(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    return this.createJob(name, type, handler, payload, {
      pattern: 'CRON',
      cronExpression,
      timezone: options.timezone,
    }, {
      priority: options.priority,
      organizationId: options.organizationId,
      userId: options.userId,
    });
  }

  async updateJob(
    jobId: string,
    updates: Partial<Omit<Pick<ScheduledJob, 'name' | 'nameRo' | 'description' | 'descriptionRo' | 'priority' | 'payload' | 'timeout' | 'tags' | 'metadata' | 'enabled'>, 'schedule' | 'retryConfig'>> & {
      schedule?: Partial<JobSchedule>;
      retryConfig?: Partial<RetryConfig>;
    },
  ): Promise<ScheduledJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'RUNNING') {
      throw new Error('Cannot update running job');
    }

    if (updates.name) job.name = updates.name;
    if (updates.nameRo) job.nameRo = updates.nameRo;
    if (updates.description) job.description = updates.description;
    if (updates.descriptionRo) job.descriptionRo = updates.descriptionRo;
    if (updates.priority) job.priority = updates.priority;
    if (updates.payload) job.payload = updates.payload;
    if (updates.schedule) {
      job.schedule = { ...job.schedule, ...updates.schedule };
      job.nextRunAt = this.calculateNextRun(job.schedule);
    }
    if (updates.retryConfig) {
      job.retryConfig = { ...job.retryConfig, ...updates.retryConfig };
    }
    if (updates.timeout) job.timeout = updates.timeout;
    if (updates.tags) job.tags = updates.tags;
    if (updates.metadata) job.metadata = { ...job.metadata, ...updates.metadata };
    if (updates.enabled !== undefined) job.enabled = updates.enabled;

    job.updatedAt = new Date();
    this.jobs.set(job.id, job);

    this.eventEmitter.emit('job.updated', { jobId: job.id, updates });

    return job;
  }

  async deleteJob(jobId: string, force: boolean = false): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'RUNNING' && !force) {
      throw new Error('Cannot delete running job. Use force=true to cancel and delete.');
    }

    if (job.status === 'RUNNING') {
      await this.cancelJob(jobId);
    }

    this.jobs.delete(jobId);
    this.executions.delete(jobId);

    this.eventEmitter.emit('job.deleted', { jobId });

    this.logger.log(`Job deleted: ${jobId}`);
  }

  async cancelJob(jobId: string): Promise<ScheduledJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      throw new Error(`Cannot cancel job in ${job.status} status`);
    }

    const runningExecution = this.runningJobs.get(jobId);
    if (runningExecution) {
      runningExecution.status = 'CANCELLED';
      runningExecution.completedAt = new Date();
      this.runningJobs.delete(jobId);
    }

    job.status = 'CANCELLED';
    job.updatedAt = new Date();
    this.jobs.set(job.id, job);

    this.eventEmitter.emit('job.cancelled', { jobId });

    return job;
  }

  async pauseJob(jobId: string): Promise<ScheduledJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'SCHEDULED') {
      throw new Error('Only scheduled jobs can be paused');
    }

    job.status = 'PAUSED';
    job.updatedAt = new Date();
    this.jobs.set(job.id, job);

    this.eventEmitter.emit('job.paused', { jobId });

    return job;
  }

  async resumeJob(jobId: string): Promise<ScheduledJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'PAUSED') {
      throw new Error('Only paused jobs can be resumed');
    }

    job.status = 'SCHEDULED';
    job.nextRunAt = this.calculateNextRun(job.schedule);
    job.updatedAt = new Date();
    this.jobs.set(job.id, job);

    this.eventEmitter.emit('job.resumed', { jobId });

    return job;
  }

  async runJobNow(jobId: string): Promise<JobExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'RUNNING') {
      throw new Error('Job is already running');
    }

    return this.executeJob(job);
  }

  async retryJob(jobId: string): Promise<JobExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'FAILED') {
      throw new Error('Only failed jobs can be retried');
    }

    job.status = 'SCHEDULED';
    job.nextRunAt = new Date();
    this.jobs.set(job.id, job);

    return this.executeJob(job);
  }

  async getJob(jobId: string): Promise<ScheduledJob | undefined> {
    return this.jobs.get(jobId);
  }

  async getJobExecutions(jobId: string, limit: number = 10): Promise<JobExecution[]> {
    const executions = this.executions.get(jobId) || [];
    return executions.slice(-limit);
  }

  async getLastExecution(jobId: string): Promise<JobExecution | undefined> {
    const executions = this.executions.get(jobId) || [];
    return executions[executions.length - 1];
  }

  async queryJobs(query: JobQuery): Promise<JobQueryResult> {
    let jobs = Array.from(this.jobs.values());

    if (query.type) {
      jobs = jobs.filter((j) => j.type === query.type);
    }
    if (query.status) {
      jobs = jobs.filter((j) => j.status === query.status);
    }
    if (query.priority) {
      jobs = jobs.filter((j) => j.priority === query.priority);
    }
    if (query.organizationId) {
      jobs = jobs.filter((j) => j.organizationId === query.organizationId);
    }
    if (query.userId) {
      jobs = jobs.filter((j) => j.userId === query.userId);
    }
    if (query.tags && query.tags.length > 0) {
      jobs = jobs.filter((j) => query.tags!.some((tag) => j.tags.includes(tag)));
    }
    if (query.enabled !== undefined) {
      jobs = jobs.filter((j) => j.enabled === query.enabled);
    }
    if (query.scheduledBefore) {
      jobs = jobs.filter((j) => j.nextRunAt && j.nextRunAt <= query.scheduledBefore!);
    }
    if (query.scheduledAfter) {
      jobs = jobs.filter((j) => j.nextRunAt && j.nextRunAt >= query.scheduledAfter!);
    }
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.name.toLowerCase().includes(searchLower) ||
          j.description?.toLowerCase().includes(searchLower) ||
          j.tags.some((t) => t.toLowerCase().includes(searchLower)),
      );
    }

    const total = jobs.length;

    const sortBy = query.sortBy || 'nextRunAt';
    const sortOrder = query.sortOrder || 'asc';
    jobs.sort((a, b) => {
      const aVal = a[sortBy as keyof ScheduledJob];
      const bVal = b[sortBy as keyof ScheduledJob];
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    jobs = jobs.slice(start, start + limit);

    return {
      jobs,
      total,
      page,
      limit,
      hasMore: start + jobs.length < total,
    };
  }

  async getUpcomingJobs(limit: number = 10): Promise<ScheduledJob[]> {
    const now = new Date();
    return Array.from(this.jobs.values())
      .filter((j) => j.enabled && j.status === 'SCHEDULED' && j.nextRunAt && j.nextRunAt > now)
      .sort((a, b) => (a.nextRunAt?.getTime() || 0) - (b.nextRunAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getOverdueJobs(): Promise<ScheduledJob[]> {
    const now = new Date();
    return Array.from(this.jobs.values())
      .filter((j) => j.enabled && j.status === 'SCHEDULED' && j.nextRunAt && j.nextRunAt < now);
  }

  async getStats(): Promise<SchedulerStats> {
    const jobs = Array.from(this.jobs.values());
    const allExecutions = Array.from(this.executions.values()).flat();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentExecutions = allExecutions.filter(
      (e) => e.startedAt >= last24h,
    );
    const completedExecutions = allExecutions.filter((e) => e.status === 'COMPLETED');

    const avgExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length
      : 0;

    const successRate = allExecutions.length > 0
      ? (completedExecutions.length / allExecutions.length) * 100
      : 100;

    const jobsByType: Record<JobType, number> = {} as any;
    const jobsByPriority: Record<JobPriority, number> = {} as any;

    for (const job of jobs) {
      jobsByType[job.type] = (jobsByType[job.type] || 0) + 1;
      jobsByPriority[job.priority] = (jobsByPriority[job.priority] || 0) + 1;
    }

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter((j) => j.status === 'PENDING').length,
      runningJobs: jobs.filter((j) => j.status === 'RUNNING').length,
      completedJobs: jobs.filter((j) => j.status === 'COMPLETED').length,
      failedJobs: jobs.filter((j) => j.status === 'FAILED').length,
      cancelledJobs: jobs.filter((j) => j.status === 'CANCELLED').length,
      averageExecutionTime: avgExecutionTime,
      successRate,
      jobsByType,
      jobsByPriority,
      executionsLast24h: recentExecutions.length,
      failuresLast24h: recentExecutions.filter((e) => e.status === 'FAILED').length,
      upcomingJobs: await this.getUpcomingJobs(5),
    };
  }

  getQueue(queueId: string): JobQueue | undefined {
    return this.queues.get(queueId);
  }

  getAllQueues(): JobQueue[] {
    return Array.from(this.queues.values());
  }

  async pauseQueue(queueId: string): Promise<JobQueue> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }

    queue.isPaused = true;
    this.queues.set(queueId, queue);

    this.eventEmitter.emit('queue.paused', { queueId });

    return queue;
  }

  async resumeQueue(queueId: string): Promise<JobQueue> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }

    queue.isPaused = false;
    this.queues.set(queueId, queue);

    this.eventEmitter.emit('queue.resumed', { queueId });

    return queue;
  }

  private async processScheduledJobs(): Promise<void> {
    const now = new Date();
    const overdueJobs = await this.getOverdueJobs();

    for (const job of overdueJobs) {
      if (!job.enabled || job.status !== 'SCHEDULED') continue;

      // Check if schedule has ended
      if (job.schedule.endAt && job.schedule.endAt < now) {
        job.status = 'COMPLETED';
        job.updatedAt = now;
        this.jobs.set(job.id, job);
        continue;
      }

      // Check excluded dates
      if (job.schedule.excludeDates?.some((d) => this.isSameDay(d, now))) {
        job.nextRunAt = this.calculateNextRun(job.schedule);
        this.jobs.set(job.id, job);
        continue;
      }

      // Execute the job
      this.executeJob(job).catch((err) => {
        this.logger.error(`Job execution failed: ${job.id}`, err);
      });
    }
  }

  private async executeJob(job: ScheduledJob): Promise<JobExecution> {
    const executionId = this.generateId('exec');
    const now = new Date();

    const execution: JobExecution = {
      id: executionId,
      jobId: job.id,
      status: 'RUNNING',
      startedAt: now,
      attempt: 1,
      logs: [],
      metrics: {},
    };

    job.status = 'RUNNING';
    job.updatedAt = now;
    this.jobs.set(job.id, job);
    this.runningJobs.set(job.id, execution);

    execution.logs.push({
      timestamp: now,
      level: 'INFO',
      message: `Job ${job.id} started`,
    });

    this.eventEmitter.emit('job.started', {
      jobId: job.id,
      executionId,
      attempt: execution.attempt,
    });

    try {
      const handler = this.handlers.get(job.handler);
      if (!handler) {
        throw new Error(`Handler '${job.handler}' not found`);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        handler(job.payload),
        job.timeout,
      );

      execution.status = 'COMPLETED';
      execution.result = result;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      execution.logs.push({
        timestamp: new Date(),
        level: 'INFO',
        message: `Job ${job.id} completed successfully`,
        data: { result },
      });

      job.status = 'COMPLETED';
      job.successCount++;
      job.lastRun = execution;

      // Schedule next run for recurring jobs
      if (job.schedule.pattern !== 'ONCE') {
        job.status = 'SCHEDULED';
        job.nextRunAt = this.calculateNextRun(job.schedule);
      }

      this.eventEmitter.emit('job.completed', {
        jobId: job.id,
        executionId,
        duration: execution.duration,
        result,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      execution.status = errorMessage.includes('timeout') ? 'TIMEOUT' : 'FAILED';
      execution.error = errorMessage;
      execution.errorStack = errorStack;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();

      execution.logs.push({
        timestamp: new Date(),
        level: 'ERROR',
        message: `Job ${job.id} failed: ${errorMessage}`,
        data: { error: errorMessage },
      });

      job.status = 'FAILED';
      job.failureCount++;
      job.lastRun = execution;

      this.eventEmitter.emit('job.failed', {
        jobId: job.id,
        executionId,
        error: errorMessage,
        attempt: execution.attempt,
      });

      // Handle retry
      if (execution.attempt < job.retryConfig.maxRetries) {
        const retryDelay = Math.min(
          job.retryConfig.retryDelay * Math.pow(job.retryConfig.backoffMultiplier, execution.attempt - 1),
          job.retryConfig.maxDelay,
        );

        job.status = 'SCHEDULED';
        job.nextRunAt = new Date(Date.now() + retryDelay);

        this.eventEmitter.emit('job.retry.scheduled', {
          jobId: job.id,
          attempt: execution.attempt + 1,
          retryAt: job.nextRunAt,
        });
      }
    } finally {
      job.runCount++;
      job.updatedAt = new Date();
      this.jobs.set(job.id, job);
      this.runningJobs.delete(job.id);

      // Store execution
      const executions = this.executions.get(job.id) || [];
      executions.push(execution);

      // Limit stored executions
      while (executions.length > 100) {
        executions.shift();
      }
      this.executions.set(job.id, executions);
    }

    return execution;
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Job execution timeout after ${timeout}ms`));
      }, timeout);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private calculateNextRun(schedule: JobSchedule): Date | undefined {
    const now = new Date();

    if (schedule.startAt && schedule.startAt > now) {
      return schedule.startAt;
    }

    switch (schedule.pattern) {
      case 'ONCE':
        return schedule.startAt || now;

      case 'MINUTELY':
        return new Date(now.getTime() + (schedule.interval || 1) * 60 * 1000);

      case 'HOURLY':
        return new Date(now.getTime() + (schedule.interval || 1) * 60 * 60 * 1000);

      case 'DAILY':
        return new Date(now.getTime() + (schedule.interval || 1) * 24 * 60 * 60 * 1000);

      case 'WEEKLY':
        return new Date(now.getTime() + (schedule.interval || 1) * 7 * 24 * 60 * 60 * 1000);

      case 'MONTHLY':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + (schedule.interval || 1));
        return nextMonth;

      case 'YEARLY':
        const nextYear = new Date(now);
        nextYear.setFullYear(nextYear.getFullYear() + (schedule.interval || 1));
        return nextYear;

      case 'CRON':
        return this.getNextCronDate(schedule.cronExpression!, now);

      default:
        return now;
    }
  }

  private getNextCronDate(cronExpression: string, fromDate: Date): Date {
    // Simplified cron parser - returns next minute for testing
    // In production, use a proper cron parser library
    const next = new Date(fromDate);
    next.setMinutes(next.getMinutes() + 1);
    next.setSeconds(0);
    next.setMilliseconds(0);
    return next;
  }

  private isValidCronExpression(expression: string): boolean {
    // Simple validation - 5 or 6 fields
    const parts = expression.trim().split(/\s+/);
    return parts.length >= 5 && parts.length <= 6;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
