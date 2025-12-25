import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';

export type JobStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED';
export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type JobType = 'INVOICE_GENERATION' | 'REPORT_EXPORT' | 'DATA_IMPORT' | 'DATA_EXPORT' | 'ANAF_SUBMISSION' | 'EMAIL_BATCH' | 'DOCUMENT_PROCESSING' | 'CUSTOM';
export type ProcessingMode = 'SEQUENTIAL' | 'PARALLEL' | 'CHUNKED';

export interface BatchJob {
  id: string;
  name: string;
  nameRo: string;
  description?: string;
  descriptionRo?: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  processingMode: ProcessingMode;
  createdBy: string;
  tenantId?: string;
  items: BatchItem[];
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  progress: number;
  configuration: JobConfiguration;
  schedule?: JobSchedule;
  results: BatchResult[];
  errors: BatchError[];
  startedAt?: Date;
  completedAt?: Date;
  estimatedEndTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export interface BatchItem {
  id: string;
  jobId: string;
  index: number;
  data: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  result?: any;
  error?: string;
  attempts: number;
  processedAt?: Date;
  duration?: number;
}

export interface JobConfiguration {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  concurrency: number;
  chunkSize: number;
  continueOnError: boolean;
  notifyOnCompletion: boolean;
  notifyOnError: boolean;
  saveResults: boolean;
  cleanupAfterDays: number;
}

export interface JobSchedule {
  type: 'ONCE' | 'RECURRING';
  scheduledAt?: Date;
  cronExpression?: string;
  timezone: string;
  nextRunAt?: Date;
  lastRunAt?: Date;
  runCount: number;
  maxRuns?: number;
  isActive: boolean;
}

export interface BatchResult {
  itemId: string;
  itemIndex: number;
  success: boolean;
  data?: any;
  message?: string;
  processedAt: Date;
}

export interface BatchError {
  itemId: string;
  itemIndex: number;
  code: string;
  message: string;
  messageRo?: string;
  stack?: string;
  timestamp: Date;
  attempt: number;
  isRetryable: boolean;
}

export interface JobSummary {
  jobId: string;
  jobName: string;
  status: JobStatus;
  progress: number;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  duration: number;
  averageItemDuration: number;
  errorRate: number;
}

export interface ProcessorFunction {
  (item: BatchItem, job: BatchJob): Promise<{ success: boolean; result?: any; error?: string }>;
}

export interface JobTemplate {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: JobType;
  defaultConfiguration: Partial<JobConfiguration>;
  inputSchema?: Record<string, any>;
  isPublic: boolean;
  createdAt: Date;
}

@Injectable()
export class BatchProcessingService {
  private jobs: Map<string, BatchJob> = new Map();
  private processors: Map<JobType, ProcessorFunction> = new Map();
  private templates: Map<string, JobTemplate> = new Map();
  private runningJobs: Set<string> = new Set();

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDefaultProcessors();
    this.initializeDefaultTemplates();
  }

  private initializeDefaultProcessors(): void {
    this.processors.set('INVOICE_GENERATION', async (item) => {
      await this.simulateProcessing(100);
      return { success: true, result: { invoiceId: `INV-${item.index}`, generated: true } };
    });

    this.processors.set('REPORT_EXPORT', async (item) => {
      await this.simulateProcessing(200);
      return { success: true, result: { reportUrl: `/reports/${item.id}.pdf` } };
    });

    this.processors.set('DATA_IMPORT', async (item) => {
      await this.simulateProcessing(50);
      return { success: true, result: { recordId: item.data.id, imported: true } };
    });

    this.processors.set('DATA_EXPORT', async (item) => {
      await this.simulateProcessing(75);
      return { success: true, result: { exported: true } };
    });

    this.processors.set('ANAF_SUBMISSION', async (item) => {
      await this.simulateProcessing(500);
      return { success: true, result: { submissionId: `ANAF-${randomUUID().slice(0, 8)}`, status: 'ACCEPTED' } };
    });

    this.processors.set('EMAIL_BATCH', async (item) => {
      await this.simulateProcessing(100);
      return { success: true, result: { emailId: `email-${item.index}`, sent: true } };
    });

    this.processors.set('DOCUMENT_PROCESSING', async (item) => {
      await this.simulateProcessing(300);
      return { success: true, result: { documentId: item.data.documentId, processed: true } };
    });

    this.processors.set('CUSTOM', async (item) => {
      await this.simulateProcessing(100);
      return { success: true, result: item.data };
    });
  }

  private initializeDefaultTemplates(): void {
    const templates: Omit<JobTemplate, 'id' | 'createdAt'>[] = [
      {
        name: 'Bulk Invoice Generation',
        nameRo: 'Generare Facturi în Masă',
        description: 'Generate multiple invoices from a list of orders',
        descriptionRo: 'Generează mai multe facturi dintr-o listă de comenzi',
        type: 'INVOICE_GENERATION',
        defaultConfiguration: {
          maxRetries: 3,
          concurrency: 5,
          chunkSize: 50,
          continueOnError: true,
        },
        isPublic: true,
      },
      {
        name: 'Monthly Report Export',
        nameRo: 'Export Rapoarte Lunare',
        description: 'Export monthly financial reports for all departments',
        descriptionRo: 'Exportă rapoartele financiare lunare pentru toate departamentele',
        type: 'REPORT_EXPORT',
        defaultConfiguration: {
          maxRetries: 2,
          concurrency: 3,
          timeoutMs: 300000,
          saveResults: true,
        },
        isPublic: true,
      },
      {
        name: 'SAF-T Data Submission',
        nameRo: 'Trimitere Date SAF-T',
        description: 'Submit SAF-T D406 data to ANAF',
        descriptionRo: 'Trimite date SAF-T D406 către ANAF',
        type: 'ANAF_SUBMISSION',
        defaultConfiguration: {
          maxRetries: 5,
          retryDelayMs: 5000,
          concurrency: 1,
          timeoutMs: 600000,
          notifyOnCompletion: true,
          notifyOnError: true,
        },
        isPublic: true,
      },
      {
        name: 'Customer Data Import',
        nameRo: 'Import Date Clienți',
        description: 'Import customer data from CSV or Excel files',
        descriptionRo: 'Importă date clienți din fișiere CSV sau Excel',
        type: 'DATA_IMPORT',
        defaultConfiguration: {
          maxRetries: 2,
          concurrency: 10,
          chunkSize: 100,
          continueOnError: true,
        },
        isPublic: true,
      },
      {
        name: 'Bulk Email Campaign',
        nameRo: 'Campanie Email în Masă',
        description: 'Send marketing or notification emails to customers',
        descriptionRo: 'Trimite emailuri marketing sau notificări către clienți',
        type: 'EMAIL_BATCH',
        defaultConfiguration: {
          maxRetries: 3,
          retryDelayMs: 10000,
          concurrency: 20,
          chunkSize: 100,
        },
        isPublic: true,
      },
    ];

    templates.forEach((template) => {
      const fullTemplate: JobTemplate = {
        ...template,
        id: `template-${randomUUID()}`,
        createdAt: new Date(),
      };
      this.templates.set(fullTemplate.id, fullTemplate);
    });
  }

  private async simulateProcessing(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.random() * ms));
  }

  private getDefaultConfiguration(): JobConfiguration {
    return {
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 60000,
      concurrency: 5,
      chunkSize: 100,
      continueOnError: true,
      notifyOnCompletion: true,
      notifyOnError: true,
      saveResults: true,
      cleanupAfterDays: 30,
    };
  }

  // Job Management
  createJob(data: {
    name: string;
    nameRo: string;
    description?: string;
    descriptionRo?: string;
    type: JobType;
    createdBy: string;
    tenantId?: string;
    items: Record<string, any>[];
    priority?: JobPriority;
    processingMode?: ProcessingMode;
    configuration?: Partial<JobConfiguration>;
    schedule?: Partial<JobSchedule>;
    metadata?: Record<string, any>;
  }): BatchJob {
    const config = { ...this.getDefaultConfiguration(), ...data.configuration };

    const batchItems: BatchItem[] = data.items.map((itemData, index) => ({
      id: `item-${randomUUID()}`,
      jobId: '',
      index,
      data: itemData,
      status: 'PENDING',
      attempts: 0,
    }));

    const job: BatchJob = {
      id: `job-${randomUUID()}`,
      name: data.name,
      nameRo: data.nameRo,
      description: data.description,
      descriptionRo: data.descriptionRo,
      type: data.type,
      status: 'PENDING',
      priority: data.priority || 'NORMAL',
      processingMode: data.processingMode || 'PARALLEL',
      createdBy: data.createdBy,
      tenantId: data.tenantId,
      items: batchItems,
      totalItems: batchItems.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      progress: 0,
      configuration: config,
      schedule: data.schedule ? {
        type: data.schedule.type || 'ONCE',
        scheduledAt: data.schedule.scheduledAt,
        cronExpression: data.schedule.cronExpression,
        timezone: data.schedule.timezone || 'Europe/Bucharest',
        runCount: 0,
        maxRuns: data.schedule.maxRuns,
        isActive: true,
      } : undefined,
      results: [],
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: data.metadata || {},
    };

    batchItems.forEach((item) => (item.jobId = job.id));
    this.jobs.set(job.id, job);

    this.eventEmitter.emit('batch.job.created', { jobId: job.id, type: data.type });

    return job;
  }

  getJob(jobId: string): BatchJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return job;
  }

  getAllJobs(filters?: {
    status?: JobStatus;
    type?: JobType;
    createdBy?: string;
    tenantId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): BatchJob[] {
    let jobs = Array.from(this.jobs.values());

    if (filters?.status) {
      jobs = jobs.filter((j) => j.status === filters.status);
    }
    if (filters?.type) {
      jobs = jobs.filter((j) => j.type === filters.type);
    }
    if (filters?.createdBy) {
      jobs = jobs.filter((j) => j.createdBy === filters.createdBy);
    }
    if (filters?.tenantId) {
      jobs = jobs.filter((j) => j.tenantId === filters.tenantId);
    }
    if (filters?.fromDate) {
      jobs = jobs.filter((j) => j.createdAt >= filters.fromDate!);
    }
    if (filters?.toDate) {
      jobs = jobs.filter((j) => j.createdAt <= filters.toDate!);
    }

    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async startJob(jobId: string): Promise<BatchJob> {
    const job = this.getJob(jobId);

    if (job.status === 'RUNNING') {
      throw new BadRequestException('Job is already running');
    }
    if (job.status === 'COMPLETED') {
      throw new BadRequestException('Job is already completed');
    }

    job.status = 'RUNNING';
    job.startedAt = new Date();
    job.updatedAt = new Date();
    this.runningJobs.add(jobId);

    this.eventEmitter.emit('batch.job.started', { jobId });

    this.processJob(job).catch((error) => {
      this.handleJobError(job, error);
    });

    return job;
  }

  private async processJob(job: BatchJob): Promise<void> {
    const processor = this.processors.get(job.type);
    if (!processor) {
      throw new Error(`No processor registered for job type: ${job.type}`);
    }

    const pendingItems = job.items.filter((i) => i.status === 'PENDING' || i.status === 'FAILED');

    switch (job.processingMode) {
      case 'SEQUENTIAL':
        await this.processSequential(job, pendingItems, processor);
        break;
      case 'PARALLEL':
        await this.processParallel(job, pendingItems, processor);
        break;
      case 'CHUNKED':
        await this.processChunked(job, pendingItems, processor);
        break;
    }

    this.completeJob(job);
  }

  private async processSequential(job: BatchJob, items: BatchItem[], processor: ProcessorFunction): Promise<void> {
    for (const item of items) {
      if (job.status === 'CANCELLED' || job.status === 'PAUSED') break;
      await this.processItem(job, item, processor);
    }
  }

  private async processParallel(job: BatchJob, items: BatchItem[], processor: ProcessorFunction): Promise<void> {
    const concurrency = job.configuration.concurrency;
    const batches: BatchItem[][] = [];

    for (let i = 0; i < items.length; i += concurrency) {
      batches.push(items.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      if (job.status === 'CANCELLED' || job.status === 'PAUSED') break;
      await Promise.all(batch.map((item) => this.processItem(job, item, processor)));
    }
  }

  private async processChunked(job: BatchJob, items: BatchItem[], processor: ProcessorFunction): Promise<void> {
    const chunkSize = job.configuration.chunkSize;

    for (let i = 0; i < items.length; i += chunkSize) {
      if (job.status === 'CANCELLED' || job.status === 'PAUSED') break;

      const chunk = items.slice(i, i + chunkSize);
      await Promise.all(chunk.map((item) => this.processItem(job, item, processor)));

      this.eventEmitter.emit('batch.job.chunk.completed', {
        jobId: job.id,
        chunkIndex: Math.floor(i / chunkSize),
        totalChunks: Math.ceil(items.length / chunkSize),
      });
    }
  }

  private async processItem(job: BatchJob, item: BatchItem, processor: ProcessorFunction): Promise<void> {
    item.status = 'PROCESSING';
    item.attempts++;
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        processor(item, job),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Item processing timeout')), job.configuration.timeoutMs)
        ),
      ]);

      item.status = result.success ? 'COMPLETED' : 'FAILED';
      item.result = result.result;
      item.processedAt = new Date();
      item.duration = Date.now() - startTime;

      if (result.success) {
        job.successfulItems++;
        job.results.push({
          itemId: item.id,
          itemIndex: item.index,
          success: true,
          data: result.result,
          processedAt: new Date(),
        });
      } else {
        item.error = result.error;
        job.failedItems++;
        this.recordError(job, item, 'PROCESSING_ERROR', result.error || 'Processing failed', true);
      }
    } catch (error: any) {
      item.status = 'FAILED';
      item.error = error.message;
      item.duration = Date.now() - startTime;
      job.failedItems++;

      const isRetryable = item.attempts < job.configuration.maxRetries;
      this.recordError(job, item, 'EXCEPTION', error.message, isRetryable);

      if (isRetryable) {
        await this.delay(job.configuration.retryDelayMs);
        item.status = 'PENDING';
        job.failedItems--;
      } else if (!job.configuration.continueOnError) {
        throw error;
      }
    }

    job.processedItems++;
    job.progress = Math.round((job.processedItems / job.totalItems) * 100);
    job.updatedAt = new Date();

    this.eventEmitter.emit('batch.item.processed', {
      jobId: job.id,
      itemId: item.id,
      success: item.status === 'COMPLETED',
      progress: job.progress,
    });
  }

  private completeJob(job: BatchJob): void {
    job.status = job.failedItems > 0 && job.successfulItems === 0 ? 'FAILED' : 'COMPLETED';
    job.completedAt = new Date();
    job.updatedAt = new Date();
    this.runningJobs.delete(job.id);

    if (job.schedule) {
      job.schedule.lastRunAt = new Date();
      job.schedule.runCount++;
    }

    this.eventEmitter.emit('batch.job.completed', {
      jobId: job.id,
      status: job.status,
      successfulItems: job.successfulItems,
      failedItems: job.failedItems,
    });
  }

  private handleJobError(job: BatchJob, error: Error): void {
    job.status = 'FAILED';
    job.completedAt = new Date();
    job.updatedAt = new Date();
    this.runningJobs.delete(job.id);

    job.errors.push({
      itemId: 'job',
      itemIndex: -1,
      code: 'JOB_ERROR',
      message: error.message,
      timestamp: new Date(),
      attempt: 0,
      isRetryable: false,
    });

    this.eventEmitter.emit('batch.job.failed', { jobId: job.id, error: error.message });
  }

  private recordError(job: BatchJob, item: BatchItem, code: string, message: string, isRetryable: boolean): void {
    job.errors.push({
      itemId: item.id,
      itemIndex: item.index,
      code,
      message,
      timestamp: new Date(),
      attempt: item.attempts,
      isRetryable,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  pauseJob(jobId: string): BatchJob {
    const job = this.getJob(jobId);

    if (job.status !== 'RUNNING') {
      throw new BadRequestException('Can only pause running jobs');
    }

    job.status = 'PAUSED';
    job.updatedAt = new Date();

    this.eventEmitter.emit('batch.job.paused', { jobId });

    return job;
  }

  resumeJob(jobId: string): BatchJob {
    const job = this.getJob(jobId);

    if (job.status !== 'PAUSED') {
      throw new BadRequestException('Can only resume paused jobs');
    }

    job.status = 'RUNNING';
    job.updatedAt = new Date();

    this.processJob(job).catch((error) => {
      this.handleJobError(job, error);
    });

    this.eventEmitter.emit('batch.job.resumed', { jobId });

    return job;
  }

  cancelJob(jobId: string): BatchJob {
    const job = this.getJob(jobId);

    if (!['PENDING', 'QUEUED', 'RUNNING', 'PAUSED'].includes(job.status)) {
      throw new BadRequestException('Cannot cancel completed or failed jobs');
    }

    job.status = 'CANCELLED';
    job.updatedAt = new Date();
    this.runningJobs.delete(jobId);

    this.eventEmitter.emit('batch.job.cancelled', { jobId });

    return job;
  }

  retryJob(jobId: string): BatchJob {
    const job = this.getJob(jobId);

    if (job.status !== 'FAILED' && job.status !== 'COMPLETED') {
      throw new BadRequestException('Can only retry failed or completed jobs');
    }

    job.items.forEach((item) => {
      if (item.status === 'FAILED') {
        item.status = 'PENDING';
        item.attempts = 0;
        item.error = undefined;
      }
    });

    job.status = 'PENDING';
    job.failedItems = 0;
    job.processedItems = job.successfulItems;
    job.progress = Math.round((job.processedItems / job.totalItems) * 100);
    job.errors = [];
    job.updatedAt = new Date();

    this.eventEmitter.emit('batch.job.retried', { jobId });

    return job;
  }

  deleteJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    if (job.status === 'RUNNING') {
      throw new BadRequestException('Cannot delete running jobs');
    }

    this.jobs.delete(jobId);
    this.eventEmitter.emit('batch.job.deleted', { jobId });
  }

  // Job Statistics & Summary
  getJobSummary(jobId: string): JobSummary {
    const job = this.getJob(jobId);

    const duration = job.completedAt
      ? job.completedAt.getTime() - (job.startedAt?.getTime() || job.createdAt.getTime())
      : job.startedAt
      ? Date.now() - job.startedAt.getTime()
      : 0;

    const avgItemDuration =
      job.processedItems > 0
        ? job.items.filter((i) => i.duration).reduce((sum, i) => sum + (i.duration || 0), 0) / job.processedItems
        : 0;

    return {
      jobId: job.id,
      jobName: job.name,
      status: job.status,
      progress: job.progress,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      successfulItems: job.successfulItems,
      failedItems: job.failedItems,
      duration,
      averageItemDuration: avgItemDuration,
      errorRate: job.processedItems > 0 ? (job.failedItems / job.processedItems) * 100 : 0,
    };
  }

  getJobErrors(jobId: string): BatchError[] {
    const job = this.getJob(jobId);
    return job.errors;
  }

  getJobResults(jobId: string): BatchResult[] {
    const job = this.getJob(jobId);
    return job.results;
  }

  getJobItems(jobId: string, status?: BatchItem['status']): BatchItem[] {
    const job = this.getJob(jobId);
    if (status) {
      return job.items.filter((i) => i.status === status);
    }
    return job.items;
  }

  // Templates
  getTemplates(): JobTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(templateId: string): JobTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    return template;
  }

  createJobFromTemplate(templateId: string, data: {
    name?: string;
    nameRo?: string;
    createdBy: string;
    tenantId?: string;
    items: Record<string, any>[];
    configurationOverrides?: Partial<JobConfiguration>;
    schedule?: Partial<JobSchedule>;
  }): BatchJob {
    const template = this.getTemplate(templateId);

    return this.createJob({
      name: data.name || template.name,
      nameRo: data.nameRo || template.nameRo,
      description: template.description,
      descriptionRo: template.descriptionRo,
      type: template.type,
      createdBy: data.createdBy,
      tenantId: data.tenantId,
      items: data.items,
      configuration: { ...template.defaultConfiguration, ...data.configurationOverrides },
      schedule: data.schedule,
    });
  }

  // Processor Registration
  registerProcessor(type: JobType, processor: ProcessorFunction): void {
    this.processors.set(type, processor);
  }

  hasProcessor(type: JobType): boolean {
    return this.processors.has(type);
  }

  // Queue & Statistics
  getQueueStats(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    totalJobs: number;
  } {
    const jobs = Array.from(this.jobs.values());

    return {
      pending: jobs.filter((j) => j.status === 'PENDING' || j.status === 'QUEUED').length,
      running: jobs.filter((j) => j.status === 'RUNNING').length,
      completed: jobs.filter((j) => j.status === 'COMPLETED').length,
      failed: jobs.filter((j) => j.status === 'FAILED').length,
      cancelled: jobs.filter((j) => j.status === 'CANCELLED').length,
      totalJobs: jobs.length,
    };
  }

  getRunningJobs(): BatchJob[] {
    return Array.from(this.runningJobs).map((id) => this.jobs.get(id)!).filter(Boolean);
  }

  getServiceStats(): {
    totalJobs: number;
    totalItemsProcessed: number;
    averageSuccessRate: number;
    registeredProcessors: number;
    availableTemplates: number;
    runningJobsCount: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const totalItems = jobs.reduce((sum, j) => sum + j.processedItems, 0);
    const successfulItems = jobs.reduce((sum, j) => sum + j.successfulItems, 0);

    return {
      totalJobs: jobs.length,
      totalItemsProcessed: totalItems,
      averageSuccessRate: totalItems > 0 ? (successfulItems / totalItems) * 100 : 0,
      registeredProcessors: this.processors.size,
      availableTemplates: this.templates.size,
      runningJobsCount: this.runningJobs.size,
    };
  }
}
