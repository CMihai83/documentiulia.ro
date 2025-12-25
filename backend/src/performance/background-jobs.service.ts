import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

export interface JobDefinition {
  name: string;
  handler: (data: any) => Promise<any>;
  options?: {
    priority?: number;
    attempts?: number;
    backoff?: number;
    timeout?: number;
    concurrency?: number;
  };
}

export interface Job {
  id: string;
  name: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'delayed';
  priority: number;
  attempts: number;
  maxAttempts: number;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  nextRetryAt?: Date;
  processTime?: number;
  tenantId?: string;
}

export interface JobStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  delayed: number;
  processingRate: number;
  avgProcessTime: number;
  byJobType: Record<string, { total: number; failed: number; avgTime: number }>;
}

export interface ScheduledJob {
  id: string;
  name: string;
  cronExpression: string;
  data: any;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  createdAt: Date;
}

@Injectable()
export class BackgroundJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackgroundJobsService.name);

  // In-memory job queue
  private jobQueue: Job[] = [];
  private processingJobs = new Map<string, Job>();
  private completedJobs: Job[] = [];
  private jobHandlers = new Map<string, JobDefinition>();
  private scheduledJobs = new Map<string, ScheduledJob>();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  private readonly maxCompletedJobsStored = 1000;
  private readonly defaultConcurrency = 5;
  private readonly defaultTimeout = 30000;
  private readonly defaultAttempts = 3;
  private readonly defaultBackoff = 5000;

  constructor(private eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    this.registerDefaultHandlers();
    this.startProcessing();
    this.logger.log('Background job processor started');
  }

  async onModuleDestroy(): Promise<void> {
    this.stopProcessing();
    this.logger.log('Background job processor stopped');
  }

  private registerDefaultHandlers(): void {
    // Register sample handlers
    this.registerHandler({
      name: 'send-email',
      handler: async (data: { to: string; subject: string; body: string }) => {
        await this.simulateWork(500);
        this.logger.log(`Email sent to ${data.to}: ${data.subject}`);
        return { sent: true, to: data.to };
      },
      options: { priority: 5, attempts: 3, timeout: 10000 },
    });

    this.registerHandler({
      name: 'generate-report',
      handler: async (data: { reportType: string; tenantId: string }) => {
        await this.simulateWork(2000);
        this.logger.log(`Report generated: ${data.reportType}`);
        return { reportId: `report_${Date.now()}`, type: data.reportType };
      },
      options: { priority: 3, attempts: 2, timeout: 60000 },
    });

    this.registerHandler({
      name: 'process-invoice',
      handler: async (data: { invoiceId: string }) => {
        await this.simulateWork(1000);
        this.logger.log(`Invoice processed: ${data.invoiceId}`);
        return { invoiceId: data.invoiceId, processed: true };
      },
      options: { priority: 7, attempts: 3 },
    });

    this.registerHandler({
      name: 'sync-external-api',
      handler: async (data: { apiName: string; endpoint: string }) => {
        await this.simulateWork(3000);
        this.logger.log(`API synced: ${data.apiName}`);
        return { synced: true, apiName: data.apiName };
      },
      options: { priority: 2, attempts: 5, backoff: 10000 },
    });

    this.registerHandler({
      name: 'cleanup-old-data',
      handler: async (data: { olderThanDays: number }) => {
        await this.simulateWork(5000);
        this.logger.log(`Cleanup completed for data older than ${data.olderThanDays} days`);
        return { cleaned: true, recordsRemoved: Math.floor(Math.random() * 1000) };
      },
      options: { priority: 1, attempts: 1, timeout: 120000 },
    });
  }

  private async simulateWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  registerHandler(definition: JobDefinition): void {
    this.jobHandlers.set(definition.name, definition);
    this.logger.log(`Registered job handler: ${definition.name}`);
  }

  async addJob(
    name: string,
    data: any,
    options?: {
      priority?: number;
      delay?: number;
      tenantId?: string;
    },
  ): Promise<Job> {
    const handler = this.jobHandlers.get(name);
    if (!handler) {
      throw new Error(`No handler registered for job type: ${name}`);
    }

    const job: Job = {
      id: `job_${crypto.randomBytes(12).toString('hex')}`,
      name,
      data,
      status: options?.delay ? 'delayed' : 'pending',
      priority: options?.priority ?? handler.options?.priority ?? 5,
      attempts: 0,
      maxAttempts: handler.options?.attempts ?? this.defaultAttempts,
      createdAt: new Date(),
      tenantId: options?.tenantId,
    };

    if (options?.delay) {
      job.nextRetryAt = new Date(Date.now() + options.delay);
    }

    this.jobQueue.push(job);
    this.sortQueue();

    this.eventEmitter.emit('job.added', { jobId: job.id, name });
    this.logger.debug(`Job added: ${name} (${job.id})`);

    return job;
  }

  async addBulkJobs(
    jobs: Array<{ name: string; data: any; options?: { priority?: number; tenantId?: string } }>,
  ): Promise<Job[]> {
    const addedJobs: Job[] = [];

    for (const jobDef of jobs) {
      const job = await this.addJob(jobDef.name, jobDef.data, jobDef.options);
      addedJobs.push(job);
    }

    return addedJobs;
  }

  private sortQueue(): void {
    this.jobQueue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Older jobs first
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 100);
  }

  private stopProcessing(): void {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  private async processJobs(): Promise<void> {
    // Check delayed jobs
    const now = new Date();
    for (const job of this.jobQueue) {
      if (job.status === 'delayed' && job.nextRetryAt && job.nextRetryAt <= now) {
        job.status = 'pending';
      }
    }

    // Get pending jobs up to concurrency limit
    const availableSlots = this.defaultConcurrency - this.processingJobs.size;
    if (availableSlots <= 0) return;

    const pendingJobs = this.jobQueue
      .filter(j => j.status === 'pending')
      .slice(0, availableSlots);

    for (const job of pendingJobs) {
      this.processJob(job);
    }
  }

  private async processJob(job: Job): Promise<void> {
    const handler = this.jobHandlers.get(job.name);
    if (!handler) {
      job.status = 'failed';
      job.error = 'Handler not found';
      return;
    }

    job.status = 'processing';
    job.startedAt = new Date();
    job.attempts++;

    this.processingJobs.set(job.id, job);

    // Remove from queue
    const queueIndex = this.jobQueue.findIndex(j => j.id === job.id);
    if (queueIndex > -1) {
      this.jobQueue.splice(queueIndex, 1);
    }

    const timeout = handler.options?.timeout ?? this.defaultTimeout;

    try {
      const result = await Promise.race([
        handler.handler(job.data),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Job timeout')), timeout)
        ),
      ]);

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      job.processTime = job.completedAt.getTime() - job.startedAt!.getTime();

      this.eventEmitter.emit('job.completed', { jobId: job.id, result });
      this.logger.debug(`Job completed: ${job.name} (${job.id}) in ${job.processTime}ms`);

    } catch (error: any) {
      job.error = error.message;

      if (job.attempts < job.maxAttempts) {
        // Retry
        const backoff = handler.options?.backoff ?? this.defaultBackoff;
        job.status = 'delayed';
        job.nextRetryAt = new Date(Date.now() + backoff * job.attempts);
        this.jobQueue.push(job);
        this.sortQueue();

        this.logger.warn(`Job failed, will retry: ${job.name} (${job.id}) - ${error.message}`);
      } else {
        // Max attempts reached
        job.status = 'failed';
        job.completedAt = new Date();
        job.processTime = job.completedAt.getTime() - job.startedAt!.getTime();

        this.eventEmitter.emit('job.failed', { jobId: job.id, error: error.message });
        this.logger.error(`Job permanently failed: ${job.name} (${job.id}) - ${error.message}`);
      }
    } finally {
      this.processingJobs.delete(job.id);

      if (job.status === 'completed' || job.status === 'failed') {
        this.completedJobs.unshift(job);
        if (this.completedJobs.length > this.maxCompletedJobsStored) {
          this.completedJobs = this.completedJobs.slice(0, this.maxCompletedJobsStored);
        }
      }
    }
  }

  async getJob(jobId: string): Promise<Job | null> {
    // Check queue
    let job = this.jobQueue.find(j => j.id === jobId);
    if (job) return job;

    // Check processing
    job = this.processingJobs.get(jobId);
    if (job) return job;

    // Check completed
    job = this.completedJobs.find(j => j.id === jobId);
    return job || null;
  }

  async getJobs(
    filters?: {
      status?: string;
      name?: string;
      tenantId?: string;
      limit?: number;
    },
  ): Promise<Job[]> {
    let allJobs = [
      ...this.jobQueue,
      ...Array.from(this.processingJobs.values()),
      ...this.completedJobs,
    ];

    if (filters?.status) {
      allJobs = allJobs.filter(j => j.status === filters.status);
    }
    if (filters?.name) {
      allJobs = allJobs.filter(j => j.name === filters.name);
    }
    if (filters?.tenantId) {
      allJobs = allJobs.filter(j => j.tenantId === filters.tenantId);
    }

    return allJobs.slice(0, filters?.limit || 100);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const queueIndex = this.jobQueue.findIndex(j => j.id === jobId);
    if (queueIndex > -1) {
      const job = this.jobQueue[queueIndex];
      if (job.status === 'pending' || job.status === 'delayed') {
        job.status = 'failed';
        job.error = 'Cancelled by user';
        this.jobQueue.splice(queueIndex, 1);
        this.completedJobs.unshift(job);
        return true;
      }
    }
    return false;
  }

  async retryJob(jobId: string): Promise<Job | null> {
    const job = this.completedJobs.find(j => j.id === jobId && j.status === 'failed');
    if (!job) return null;

    // Reset job for retry
    job.status = 'pending';
    job.attempts = 0;
    job.error = undefined;
    job.result = undefined;
    job.startedAt = undefined;
    job.completedAt = undefined;

    // Move back to queue
    const completedIndex = this.completedJobs.findIndex(j => j.id === jobId);
    if (completedIndex > -1) {
      this.completedJobs.splice(completedIndex, 1);
    }

    this.jobQueue.push(job);
    this.sortQueue();

    return job;
  }

  async getStats(): Promise<JobStats> {
    const allJobs = [
      ...this.jobQueue,
      ...Array.from(this.processingJobs.values()),
      ...this.completedJobs,
    ];

    const completed = allJobs.filter(j => j.status === 'completed');
    const failed = allJobs.filter(j => j.status === 'failed');

    const avgProcessTime = completed.length > 0
      ? completed.reduce((sum, j) => sum + (j.processTime || 0), 0) / completed.length
      : 0;

    // By job type
    const byJobType: Record<string, { total: number; failed: number; totalTime: number }> = {};
    for (const job of allJobs) {
      if (!byJobType[job.name]) {
        byJobType[job.name] = { total: 0, failed: 0, totalTime: 0 };
      }
      byJobType[job.name].total++;
      if (job.status === 'failed') byJobType[job.name].failed++;
      if (job.processTime) byJobType[job.name].totalTime += job.processTime;
    }

    const byJobTypeStats: JobStats['byJobType'] = {};
    for (const [name, stats] of Object.entries(byJobType)) {
      const completedOfType = allJobs.filter(j => j.name === name && j.status === 'completed').length;
      byJobTypeStats[name] = {
        total: stats.total,
        failed: stats.failed,
        avgTime: completedOfType > 0 ? Math.round(stats.totalTime / completedOfType) : 0,
      };
    }

    return {
      pending: this.jobQueue.filter(j => j.status === 'pending').length,
      processing: this.processingJobs.size,
      completed: completed.length,
      failed: failed.length,
      delayed: this.jobQueue.filter(j => j.status === 'delayed').length,
      processingRate: Math.round(completed.length / 60), // per minute approx
      avgProcessTime: Math.round(avgProcessTime),
      byJobType: byJobTypeStats,
    };
  }

  async getRegisteredHandlers(): Promise<string[]> {
    return Array.from(this.jobHandlers.keys());
  }

  async clearCompletedJobs(): Promise<number> {
    const count = this.completedJobs.length;
    this.completedJobs = [];
    return count;
  }
}
