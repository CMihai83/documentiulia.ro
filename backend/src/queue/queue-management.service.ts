import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type QueueType =
  | 'EMAIL'
  | 'PDF'
  | 'INVOICE'
  | 'ANAF_SUBMISSION'
  | 'SAGA_SYNC'
  | 'REPORT'
  | 'NOTIFICATION'
  | 'IMPORT'
  | 'EXPORT'
  | 'BACKUP'
  | 'CLEANUP'
  | 'ANALYTICS'
  | 'WEBHOOK'
  | 'CUSTOM';

export type JobStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'DEAD' | 'CANCELLED';

export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface QueuedJob {
  id: string;
  name: string;
  nameRo: string;
  queueType: QueueType;
  status: JobStatus;
  priority: JobPriority;
  payload: Record<string, any>;
  result?: any;
  error?: string;
  attempts: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  timeout: number;
  progress: number;
  workerId?: string;
  organizationId?: string;
  userId?: string;
  tags: string[];
  metadata: Record<string, any>;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Queue {
  id: string;
  name: string;
  nameRo: string;
  type: QueueType;
  description: string;
  descriptionRo: string;
  isActive: boolean;
  isPaused: boolean;
  concurrency: number;
  rateLimit: number;
  rateLimitPeriodMs: number;
  defaultPriority: JobPriority;
  defaultTimeout: number;
  defaultMaxAttempts: number;
  retryOnFail: boolean;
  deadLetterQueue?: string;
  jobCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Worker {
  id: string;
  name: string;
  queueTypes: QueueType[];
  status: 'IDLE' | 'BUSY' | 'STOPPING' | 'STOPPED';
  currentJobId?: string;
  jobsProcessed: number;
  lastActiveAt: Date;
  startedAt: Date;
  metadata: Record<string, any>;
}

export interface QueueStats {
  totalQueues: number;
  activeQueues: number;
  pausedQueues: number;
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  deadJobs: number;
  activeWorkers: number;
  averageProcessingTime: number;
  byQueue: Record<string, { pending: number; processing: number; completed: number; failed: number }>;
  byPriority: Record<JobPriority, number>;
  recentJobs: QueuedJob[];
}

export interface AddJobOptions {
  name?: string;
  nameRo?: string;
  priority?: JobPriority;
  delay?: number;
  scheduledAt?: Date;
  timeout?: number;
  maxAttempts?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  organizationId?: string;
  userId?: string;
}

export interface ProcessResult {
  success: boolean;
  result?: any;
  error?: string;
}

type JobProcessor = (job: QueuedJob) => Promise<ProcessResult>;

@Injectable()
export class QueueManagementService {
  private readonly logger = new Logger(QueueManagementService.name);
  private queues: Map<string, Queue> = new Map();
  private jobs: Map<string, QueuedJob> = new Map();
  private workers: Map<string, Worker> = new Map();
  private deadLetterJobs: Map<string, QueuedJob> = new Map();
  private processors: Map<QueueType, JobProcessor> = new Map();
  private processingTimes: number[] = [];
  private rateLimitCounters: Map<string, { count: number; resetAt: number }> = new Map();
  private heartbeatInterval?: ReturnType<typeof setInterval>;

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultQueues();
    this.startWorkerHeartbeat();
  }

  onModuleDestroy(): void {
    this.stopHeartbeat();
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private initializeDefaultQueues(): void {
    const defaultQueues: Omit<Queue, 'id' | 'createdAt' | 'updatedAt' | 'jobCount' | 'processingCount' | 'completedCount' | 'failedCount'>[] = [
      {
        name: 'Email Queue',
        nameRo: 'Coadă Email',
        type: 'EMAIL',
        description: 'Queue for email sending tasks',
        descriptionRo: 'Coadă pentru trimiterea emailurilor',
        isActive: true,
        isPaused: false,
        concurrency: 5,
        rateLimit: 100,
        rateLimitPeriodMs: 60000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 30000,
        defaultMaxAttempts: 3,
        retryOnFail: true,
      },
      {
        name: 'PDF Queue',
        nameRo: 'Coadă PDF',
        type: 'PDF',
        description: 'Queue for PDF generation tasks',
        descriptionRo: 'Coadă pentru generarea PDF-urilor',
        isActive: true,
        isPaused: false,
        concurrency: 3,
        rateLimit: 50,
        rateLimitPeriodMs: 60000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 60000,
        defaultMaxAttempts: 2,
        retryOnFail: true,
      },
      {
        name: 'ANAF Submission Queue',
        nameRo: 'Coadă Trimitere ANAF',
        type: 'ANAF_SUBMISSION',
        description: 'Queue for ANAF e-Factura and SAF-T submissions',
        descriptionRo: 'Coadă pentru trimiterea e-Factura și SAF-T către ANAF',
        isActive: true,
        isPaused: false,
        concurrency: 2,
        rateLimit: 10,
        rateLimitPeriodMs: 1000,
        defaultPriority: 'HIGH',
        defaultTimeout: 120000,
        defaultMaxAttempts: 5,
        retryOnFail: true,
        deadLetterQueue: 'dead-letter-anaf',
      },
      {
        name: 'SAGA Sync Queue',
        nameRo: 'Coadă Sincronizare SAGA',
        type: 'SAGA_SYNC',
        description: 'Queue for SAGA synchronization tasks',
        descriptionRo: 'Coadă pentru sincronizarea cu SAGA',
        isActive: true,
        isPaused: false,
        concurrency: 2,
        rateLimit: 10,
        rateLimitPeriodMs: 1000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 60000,
        defaultMaxAttempts: 3,
        retryOnFail: true,
      },
      {
        name: 'Report Queue',
        nameRo: 'Coadă Rapoarte',
        type: 'REPORT',
        description: 'Queue for report generation tasks',
        descriptionRo: 'Coadă pentru generarea rapoartelor',
        isActive: true,
        isPaused: false,
        concurrency: 2,
        rateLimit: 20,
        rateLimitPeriodMs: 60000,
        defaultPriority: 'LOW',
        defaultTimeout: 300000,
        defaultMaxAttempts: 2,
        retryOnFail: true,
      },
      {
        name: 'Notification Queue',
        nameRo: 'Coadă Notificări',
        type: 'NOTIFICATION',
        description: 'Queue for sending notifications',
        descriptionRo: 'Coadă pentru trimiterea notificărilor',
        isActive: true,
        isPaused: false,
        concurrency: 10,
        rateLimit: 200,
        rateLimitPeriodMs: 60000,
        defaultPriority: 'NORMAL',
        defaultTimeout: 15000,
        defaultMaxAttempts: 3,
        retryOnFail: true,
      },
    ];

    const now = new Date();
    defaultQueues.forEach((queue) => {
      const id = this.generateId('queue');
      this.queues.set(id, {
        ...queue,
        id,
        jobCount: 0,
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  private startWorkerHeartbeat(): void {
    // Simulate worker heartbeat checking
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [id, worker] of this.workers) {
        if (worker.status !== 'STOPPED' && now - worker.lastActiveAt.getTime() > 60000) {
          worker.status = 'STOPPED';
          this.workers.set(id, worker);
          this.eventEmitter.emit('worker.stopped', { workerId: id, reason: 'heartbeat_timeout' });
        }
      }
    }, 30000);
  }

  // Queue Management

  async createQueue(
    queue: Omit<Queue, 'id' | 'createdAt' | 'updatedAt' | 'jobCount' | 'processingCount' | 'completedCount' | 'failedCount'>,
  ): Promise<Queue> {
    const id = this.generateId('queue');
    const now = new Date();

    const newQueue: Queue = {
      ...queue,
      id,
      jobCount: 0,
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.queues.set(id, newQueue);

    this.eventEmitter.emit('queue.created', { queueId: id, name: queue.name, type: queue.type });

    this.logger.log(`Queue created: ${id} (${queue.name})`);

    return newQueue;
  }

  async getQueue(queueId: string): Promise<Queue | undefined> {
    return this.queues.get(queueId);
  }

  async getQueueByType(type: QueueType): Promise<Queue | undefined> {
    return Array.from(this.queues.values()).find((q) => q.type === type);
  }

  async getAllQueues(): Promise<Queue[]> {
    return Array.from(this.queues.values());
  }

  async pauseQueue(queueId: string): Promise<Queue> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }

    queue.isPaused = true;
    queue.updatedAt = new Date();
    this.queues.set(queueId, queue);

    this.eventEmitter.emit('queue.paused', { queueId });

    return queue;
  }

  async resumeQueue(queueId: string): Promise<Queue> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }

    queue.isPaused = false;
    queue.updatedAt = new Date();
    this.queues.set(queueId, queue);

    this.eventEmitter.emit('queue.resumed', { queueId });

    return queue;
  }

  async clearQueue(queueId: string): Promise<number> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }

    let clearedCount = 0;
    for (const [jobId, job] of this.jobs) {
      if (this.getQueueForJob(job)?.id === queueId && job.status === 'PENDING') {
        this.jobs.delete(jobId);
        clearedCount++;
      }
    }

    queue.jobCount -= clearedCount;
    queue.updatedAt = new Date();
    this.queues.set(queueId, queue);

    this.eventEmitter.emit('queue.cleared', { queueId, clearedCount });

    return clearedCount;
  }

  async deleteQueue(queueId: string): Promise<void> {
    const queue = this.queues.get(queueId);
    if (!queue) {
      throw new Error('Queue not found');
    }

    // Check for pending jobs
    const hasPendingJobs = Array.from(this.jobs.values()).some(
      (j) => this.getQueueForJob(j)?.id === queueId && (j.status === 'PENDING' || j.status === 'PROCESSING'),
    );

    if (hasPendingJobs) {
      throw new Error('Cannot delete queue with pending or processing jobs');
    }

    this.queues.delete(queueId);

    this.eventEmitter.emit('queue.deleted', { queueId });
  }

  // Job Management

  async addJob(queueType: QueueType, payload: Record<string, any>, options: AddJobOptions = {}): Promise<QueuedJob> {
    const queue = await this.getQueueByType(queueType);
    if (!queue) {
      throw new Error(`Queue not found for type: ${queueType}`);
    }

    if (!queue.isActive) {
      throw new Error('Queue is not active');
    }

    // Check rate limit
    if (!this.checkRateLimit(queue)) {
      throw new Error('Queue rate limit exceeded');
    }

    const jobId = this.generateId('job');
    const now = new Date();

    const job: QueuedJob = {
      id: jobId,
      name: options.name || `${queueType} Job`,
      nameRo: options.nameRo || `Job ${queueType}`,
      queueType,
      status: options.scheduledAt || options.delay ? 'QUEUED' : 'PENDING',
      priority: options.priority || queue.defaultPriority,
      payload,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? queue.defaultMaxAttempts,
      backoffMs: options.backoffMs ?? 1000,
      backoffMultiplier: options.backoffMultiplier ?? 2,
      maxBackoffMs: options.maxBackoffMs ?? 60000,
      timeout: options.timeout ?? queue.defaultTimeout,
      progress: 0,
      organizationId: options.organizationId,
      userId: options.userId,
      tags: options.tags || [],
      metadata: options.metadata || {},
      scheduledAt: options.scheduledAt || (options.delay ? new Date(now.getTime() + options.delay) : undefined),
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(jobId, job);

    queue.jobCount++;
    queue.updatedAt = new Date();
    this.queues.set(queue.id, queue);

    this.eventEmitter.emit('job.added', {
      jobId,
      queueType,
      priority: job.priority,
    });

    this.logger.log(`Job added: ${jobId} to ${queueType} queue`);

    // Auto-process if not scheduled
    if (!job.scheduledAt && !queue.isPaused) {
      this.processNextJob(queueType);
    }

    return job;
  }

  async getJob(jobId: string): Promise<QueuedJob | undefined> {
    return this.jobs.get(jobId) || this.deadLetterJobs.get(jobId);
  }

  async getJobsByQueue(queueType: QueueType, limit: number = 50): Promise<QueuedJob[]> {
    return Array.from(this.jobs.values())
      .filter((j) => j.queueType === queueType)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getJobsByStatus(status: JobStatus): Promise<QueuedJob[]> {
    return Array.from(this.jobs.values()).filter((j) => j.status === status);
  }

  async getJobsByOrganization(organizationId: string, limit: number = 50): Promise<QueuedJob[]> {
    return Array.from(this.jobs.values())
      .filter((j) => j.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async updateJobProgress(jobId: string, progress: number): Promise<QueuedJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    job.progress = Math.min(100, Math.max(0, progress));
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    this.eventEmitter.emit('job.progress', { jobId, progress: job.progress });

    return job;
  }

  async cancelJob(jobId: string): Promise<QueuedJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'DEAD') {
      throw new Error('Cannot cancel completed, failed, or dead job');
    }

    job.status = 'CANCELLED';
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    const queue = await this.getQueueByType(job.queueType);
    if (queue) {
      queue.jobCount--;
      this.queues.set(queue.id, queue);
    }

    this.eventEmitter.emit('job.cancelled', { jobId });

    return job;
  }

  async retryJob(jobId: string): Promise<QueuedJob> {
    const job = this.jobs.get(jobId) || this.deadLetterJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'FAILED' && job.status !== 'DEAD') {
      throw new Error('Only failed or dead jobs can be retried');
    }

    // Remove from dead letter if applicable
    if (this.deadLetterJobs.has(jobId)) {
      this.deadLetterJobs.delete(jobId);
    }

    job.status = 'PENDING';
    job.attempts = 0;
    job.error = undefined;
    job.failedAt = undefined;
    job.nextRetryAt = undefined;
    job.updatedAt = new Date();

    this.jobs.set(jobId, job);

    this.eventEmitter.emit('job.retried', { jobId });

    this.processNextJob(job.queueType);

    return job;
  }

  // Job Processing

  registerProcessor(queueType: QueueType, processor: JobProcessor): void {
    this.processors.set(queueType, processor);
    this.logger.log(`Processor registered for ${queueType}`);
  }

  private async processNextJob(queueType: QueueType): Promise<void> {
    const queue = await this.getQueueByType(queueType);
    if (!queue || queue.isPaused || !queue.isActive) {
      return;
    }

    if (queue.processingCount >= queue.concurrency) {
      return;
    }

    // Get next pending job by priority
    const pendingJobs = Array.from(this.jobs.values())
      .filter((j) => j.queueType === queueType && j.status === 'PENDING')
      .sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    const job = pendingJobs[0];
    if (!job) {
      return;
    }

    await this.processJob(job);
  }

  async processJob(job: QueuedJob): Promise<void> {
    const startTime = Date.now();

    job.status = 'PROCESSING';
    job.startedAt = new Date();
    job.attempts++;
    job.updatedAt = new Date();
    this.jobs.set(job.id, job);

    const queue = await this.getQueueByType(job.queueType);
    if (queue) {
      queue.processingCount++;
      this.queues.set(queue.id, queue);
    }

    this.eventEmitter.emit('job.started', { jobId: job.id, attempt: job.attempts });

    try {
      const processor = this.processors.get(job.queueType);
      let result: ProcessResult;

      if (processor) {
        result = await Promise.race([
          processor(job),
          new Promise<ProcessResult>((_, reject) =>
            setTimeout(() => reject(new Error('Job timeout')), job.timeout),
          ),
        ]);
      } else {
        // Default processor (simulate)
        result = await this.defaultProcessor(job);
      }

      if (result.success) {
        job.status = 'COMPLETED';
        job.result = result.result;
        job.completedAt = new Date();
        job.progress = 100;

        if (queue) {
          queue.processingCount--;
          queue.completedCount++;
          this.queues.set(queue.id, queue);
        }

        this.eventEmitter.emit('job.completed', {
          jobId: job.id,
          result: result.result,
          processingTime: Date.now() - startTime,
        });
      } else {
        throw new Error(result.error || 'Job failed');
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      job.error = error;

      if (queue) {
        queue.processingCount--;
      }

      if (job.attempts < job.maxAttempts && queue?.retryOnFail) {
        // Schedule retry with backoff
        const backoff = Math.min(
          job.backoffMs * Math.pow(job.backoffMultiplier, job.attempts - 1),
          job.maxBackoffMs,
        );
        job.status = 'RETRYING';
        job.nextRetryAt = new Date(Date.now() + backoff);

        this.eventEmitter.emit('job.retrying', {
          jobId: job.id,
          attempt: job.attempts,
          nextRetryAt: job.nextRetryAt,
        });

        // Schedule retry
        setTimeout(() => {
          if (job.status === 'RETRYING') {
            job.status = 'PENDING';
            job.updatedAt = new Date();
            this.jobs.set(job.id, job);
            this.processNextJob(job.queueType);
          }
        }, backoff);
      } else {
        job.status = 'FAILED';
        job.failedAt = new Date();

        if (queue) {
          queue.failedCount++;
          this.queues.set(queue.id, queue);

          // Move to dead letter queue if configured
          if (queue.deadLetterQueue) {
            this.moveToDeadLetter(job);
          }
        }

        this.eventEmitter.emit('job.failed', {
          jobId: job.id,
          error,
          attempts: job.attempts,
        });
      }
    }

    job.updatedAt = new Date();
    this.jobs.set(job.id, job);

    const processingTime = Date.now() - startTime;
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-500);
    }

    // Process next job
    this.processNextJob(job.queueType);
  }

  private async defaultProcessor(job: QueuedJob): Promise<ProcessResult> {
    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Simulate failure for testing
    if (job.payload.simulateFailure) {
      return { success: false, error: 'Simulated failure' };
    }

    return { success: true, result: { processed: true, jobId: job.id } };
  }

  private moveToDeadLetter(job: QueuedJob): void {
    job.status = 'DEAD';
    this.deadLetterJobs.set(job.id, job);
    this.jobs.delete(job.id);

    this.eventEmitter.emit('job.dead', { jobId: job.id, queueType: job.queueType });

    this.logger.warn(`Job moved to dead letter: ${job.id}`);
  }

  // Dead Letter Queue

  async getDeadLetterJobs(queueType?: QueueType): Promise<QueuedJob[]> {
    let jobs = Array.from(this.deadLetterJobs.values());
    if (queueType) {
      jobs = jobs.filter((j) => j.queueType === queueType);
    }
    return jobs.sort((a, b) => b.failedAt!.getTime() - a.failedAt!.getTime());
  }

  async reprocessDeadLetterJob(jobId: string): Promise<QueuedJob> {
    return this.retryJob(jobId);
  }

  async clearDeadLetterQueue(queueType?: QueueType): Promise<number> {
    let clearedCount = 0;
    for (const [id, job] of this.deadLetterJobs) {
      if (!queueType || job.queueType === queueType) {
        this.deadLetterJobs.delete(id);
        clearedCount++;
      }
    }

    this.eventEmitter.emit('deadletter.cleared', { queueType, clearedCount });

    return clearedCount;
  }

  // Worker Management

  async registerWorker(name: string, queueTypes: QueueType[]): Promise<Worker> {
    const workerId = this.generateId('worker');
    const now = new Date();

    const worker: Worker = {
      id: workerId,
      name,
      queueTypes,
      status: 'IDLE',
      jobsProcessed: 0,
      lastActiveAt: now,
      startedAt: now,
      metadata: {},
    };

    this.workers.set(workerId, worker);

    this.eventEmitter.emit('worker.registered', { workerId, name, queueTypes });

    this.logger.log(`Worker registered: ${workerId} (${name})`);

    return worker;
  }

  async getWorker(workerId: string): Promise<Worker | undefined> {
    return this.workers.get(workerId);
  }

  async getAllWorkers(): Promise<Worker[]> {
    return Array.from(this.workers.values());
  }

  async updateWorkerHeartbeat(workerId: string): Promise<Worker> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    worker.lastActiveAt = new Date();
    this.workers.set(workerId, worker);

    return worker;
  }

  async stopWorker(workerId: string): Promise<Worker> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    worker.status = 'STOPPING';
    this.workers.set(workerId, worker);

    // Wait for current job to complete
    if (worker.currentJobId) {
      // In production, would wait for job completion
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    worker.status = 'STOPPED';
    this.workers.set(workerId, worker);

    this.eventEmitter.emit('worker.stopped', { workerId, reason: 'manual' });

    return worker;
  }

  async removeWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.status === 'BUSY') {
      throw new Error('Cannot remove busy worker');
    }

    this.workers.delete(workerId);

    this.eventEmitter.emit('worker.removed', { workerId });
  }

  // Statistics

  async getStats(): Promise<QueueStats> {
    const queues = Array.from(this.queues.values());
    const jobs = Array.from(this.jobs.values());
    const workers = Array.from(this.workers.values());
    const deadJobs = Array.from(this.deadLetterJobs.values());

    const byQueue: Record<string, { pending: number; processing: number; completed: number; failed: number }> = {};
    for (const queue of queues) {
      const queueJobs = jobs.filter((j) => j.queueType === queue.type);
      byQueue[queue.type] = {
        pending: queueJobs.filter((j) => j.status === 'PENDING').length,
        processing: queueJobs.filter((j) => j.status === 'PROCESSING').length,
        completed: queue.completedCount,
        failed: queue.failedCount,
      };
    }

    const byPriority: Record<JobPriority, number> = {
      LOW: 0,
      NORMAL: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const job of jobs) {
      if (job.status === 'PENDING' || job.status === 'QUEUED') {
        byPriority[job.priority]++;
      }
    }

    return {
      totalQueues: queues.length,
      activeQueues: queues.filter((q) => q.isActive && !q.isPaused).length,
      pausedQueues: queues.filter((q) => q.isPaused).length,
      totalJobs: jobs.length,
      pendingJobs: jobs.filter((j) => j.status === 'PENDING' || j.status === 'QUEUED').length,
      processingJobs: jobs.filter((j) => j.status === 'PROCESSING').length,
      completedJobs: jobs.filter((j) => j.status === 'COMPLETED').length,
      failedJobs: jobs.filter((j) => j.status === 'FAILED').length,
      deadJobs: deadJobs.length,
      activeWorkers: workers.filter((w) => w.status === 'IDLE' || w.status === 'BUSY').length,
      averageProcessingTime:
        this.processingTimes.length > 0
          ? Math.floor(this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length)
          : 0,
      byQueue,
      byPriority,
      recentJobs: jobs.slice(-10).reverse(),
    };
  }

  // Helper Methods

  private getQueueForJob(job: QueuedJob): Queue | undefined {
    return Array.from(this.queues.values()).find((q) => q.type === job.queueType);
  }

  private checkRateLimit(queue: Queue): boolean {
    const key = queue.id;
    const now = Date.now();
    const counter = this.rateLimitCounters.get(key);

    if (!counter || counter.resetAt < now) {
      this.rateLimitCounters.set(key, {
        count: 1,
        resetAt: now + queue.rateLimitPeriodMs,
      });
      return true;
    }

    if (counter.count >= queue.rateLimit) {
      return false;
    }

    counter.count++;
    this.rateLimitCounters.set(key, counter);
    return true;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
