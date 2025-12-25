import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export type JobType =
  | 'REPORT'
  | 'BACKUP'
  | 'SYNC'
  | 'NOTIFICATION'
  | 'CLEANUP'
  | 'ANAF_SUBMISSION'
  | 'INVOICE_REMINDER'
  | 'PAYROLL'
  | 'HEALTH_CHECK'
  | 'CUSTOM';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED';

export type JobFrequency = 'ONCE' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CRON';

export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface ScheduledJob {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  type: JobType;
  frequency: JobFrequency;
  cronExpression?: string;
  priority: JobPriority;
  handler: string;
  parameters: Record<string, any>;
  isActive: boolean;
  nextRun: Date;
  lastRun?: Date;
  lastStatus?: JobStatus;
  runCount: number;
  successCount: number;
  failureCount: number;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  dependencies?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tenantId?: string;
}

export interface JobExecution {
  id: string;
  jobId: string;
  status: JobStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
  error?: string;
  attempts: number;
  triggeredBy: 'SCHEDULE' | 'MANUAL' | 'DEPENDENCY';
  metadata?: Record<string, any>;
}

export interface Deadline {
  id: string;
  name: string;
  nameRo: string;
  description: string;
  descriptionRo: string;
  dueDate: Date;
  category: 'ANAF' | 'TAX' | 'PAYROLL' | 'CONTRACT' | 'CUSTOM';
  priority: JobPriority;
  status: 'PENDING' | 'APPROACHING' | 'DUE' | 'OVERDUE' | 'COMPLETED';
  reminders: DeadlineReminder[];
  entityType?: string;
  entityId?: string;
  isRecurring: boolean;
  recurrencePattern?: JobFrequency;
  completedAt?: Date;
  createdBy: string;
  tenantId?: string;
}

export interface DeadlineReminder {
  daysBefore: number;
  sent: boolean;
  sentAt?: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  titleRo: string;
  type: 'HOLIDAY' | 'DEADLINE' | 'MEETING' | 'TASK' | 'REMINDER';
  date: Date;
  endDate?: Date;
  allDay: boolean;
  description?: string;
  descriptionRo?: string;
  isRecurring: boolean;
  metadata?: Record<string, any>;
}

export interface ScheduleStats {
  totalJobs: number;
  activeJobs: number;
  runningJobs: number;
  todayExecutions: number;
  todaySuccesses: number;
  todayFailures: number;
  upcomingDeadlines: number;
}

// Romanian translations for job types
const JOB_TYPE_TRANSLATIONS: Record<JobType, string> = {
  REPORT: 'Raport',
  BACKUP: 'Copie de Siguranță',
  SYNC: 'Sincronizare',
  NOTIFICATION: 'Notificare',
  CLEANUP: 'Curățare Date',
  ANAF_SUBMISSION: 'Depunere ANAF',
  INVOICE_REMINDER: 'Reminder Facturi',
  PAYROLL: 'Stat de Plată',
  HEALTH_CHECK: 'Verificare Sistem',
  CUSTOM: 'Personalizat',
};

// Romanian translations for frequencies
const FREQUENCY_TRANSLATIONS: Record<JobFrequency, string> = {
  ONCE: 'O singură dată',
  HOURLY: 'Orar',
  DAILY: 'Zilnic',
  WEEKLY: 'Săptămânal',
  MONTHLY: 'Lunar',
  QUARTERLY: 'Trimestrial',
  YEARLY: 'Anual',
  CRON: 'Expresie Cron',
};

// Romanian translations for priorities
const PRIORITY_TRANSLATIONS: Record<JobPriority, string> = {
  LOW: 'Scăzută',
  NORMAL: 'Normală',
  HIGH: 'Ridicată',
  CRITICAL: 'Critică',
};

// Romanian public holidays 2024-2025
const ROMANIAN_HOLIDAYS: Array<{ date: string; name: string; nameRo: string }> = [
  { date: '01-01', name: "New Year's Day", nameRo: 'Anul Nou' },
  { date: '01-02', name: "New Year's Day (2nd)", nameRo: 'Anul Nou (ziua 2)' },
  { date: '01-24', name: 'Unification Day', nameRo: 'Ziua Unirii Principatelor' },
  { date: '05-01', name: 'Labour Day', nameRo: 'Ziua Muncii' },
  { date: '06-01', name: "Children's Day", nameRo: 'Ziua Copilului' },
  { date: '08-15', name: 'Assumption of Mary', nameRo: 'Adormirea Maicii Domnului' },
  { date: '11-30', name: "St. Andrew's Day", nameRo: 'Sfântul Andrei' },
  { date: '12-01', name: 'National Day', nameRo: 'Ziua Națională a României' },
  { date: '12-25', name: 'Christmas Day', nameRo: 'Crăciun' },
  { date: '12-26', name: 'Christmas Day (2nd)', nameRo: 'Crăciun (ziua 2)' },
];

// ANAF compliance deadlines
const ANAF_DEADLINES: Array<{ dayOfMonth: number; name: string; nameRo: string; description: string }> = [
  { dayOfMonth: 25, name: 'VAT Declaration', nameRo: 'Declarație TVA (D300)', description: 'Monthly VAT declaration due' },
  { dayOfMonth: 25, name: 'D406 SAF-T', nameRo: 'Declarație D406 SAF-T', description: 'Monthly SAF-T submission' },
  { dayOfMonth: 25, name: 'Income Tax Declaration', nameRo: 'Declarație Impozit Venit', description: 'Monthly income tax' },
  { dayOfMonth: 5, name: 'e-Factura Deadline', nameRo: 'Termen e-Factura', description: '5 working days from issuance' },
];

@Injectable()
export class SchedulingService implements OnModuleInit {
  private jobs: Map<string, ScheduledJob> = new Map();
  private executions: Map<string, JobExecution> = new Map();
  private deadlines: Map<string, Deadline> = new Map();
  private calendarEvents: Map<string, CalendarEvent> = new Map();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit(): Promise<void> {
    // Initialize Romanian holidays for current and next year
    this.initializeHolidays();
  }

  private initializeHolidays(): void {
    const currentYear = new Date().getFullYear();
    [currentYear, currentYear + 1].forEach((year) => {
      ROMANIAN_HOLIDAYS.forEach((holiday) => {
        const event: CalendarEvent = {
          id: `holiday-${year}-${holiday.date}`,
          title: holiday.name,
          titleRo: holiday.nameRo,
          type: 'HOLIDAY',
          date: new Date(`${year}-${holiday.date}`),
          allDay: true,
          isRecurring: true,
        };
        this.calendarEvents.set(event.id, event);
      });
    });
  }

  // Job Management
  async createJob(
    name: string,
    nameRo: string,
    type: JobType,
    frequency: JobFrequency,
    handler: string,
    createdBy: string,
    options: {
      description?: string;
      descriptionRo?: string;
      cronExpression?: string;
      priority?: JobPriority;
      parameters?: Record<string, any>;
      maxRetries?: number;
      retryDelay?: number;
      timeout?: number;
      dependencies?: string[];
      tags?: string[];
      startDate?: Date;
      tenantId?: string;
    } = {},
  ): Promise<ScheduledJob> {
    const job: ScheduledJob = {
      id: this.generateId('job'),
      name,
      nameRo,
      description: options.description || '',
      descriptionRo: options.descriptionRo || '',
      type,
      frequency,
      cronExpression: options.cronExpression,
      priority: options.priority || 'NORMAL',
      handler,
      parameters: options.parameters || {},
      isActive: true,
      nextRun: options.startDate || this.calculateNextRun(frequency, options.cronExpression),
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 60000,
      timeout: options.timeout || 300000,
      dependencies: options.dependencies,
      tags: options.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      tenantId: options.tenantId,
    };

    this.jobs.set(job.id, job);

    this.eventEmitter.emit('job.created', {
      jobId: job.id,
      name: job.name,
      type: job.type,
      frequency: job.frequency,
    });

    return job;
  }

  async getJob(jobId: string): Promise<ScheduledJob | undefined> {
    return this.jobs.get(jobId);
  }

  async listJobs(options: {
    type?: JobType;
    status?: JobStatus;
    priority?: JobPriority;
    isActive?: boolean;
    tag?: string;
  } = {}): Promise<ScheduledJob[]> {
    let jobs = Array.from(this.jobs.values());

    if (options.type) {
      jobs = jobs.filter((j) => j.type === options.type);
    }
    if (options.priority) {
      jobs = jobs.filter((j) => j.priority === options.priority);
    }
    if (options.isActive !== undefined) {
      jobs = jobs.filter((j) => j.isActive === options.isActive);
    }
    if (options.tag) {
      jobs = jobs.filter((j) => j.tags?.includes(options.tag!));
    }

    return jobs;
  }

  async updateJob(
    jobId: string,
    updates: Partial<Omit<ScheduledJob, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<ScheduledJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const updated: ScheduledJob = {
      ...job,
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.frequency || updates.cronExpression) {
      updated.nextRun = this.calculateNextRun(updated.frequency, updated.cronExpression);
    }

    this.jobs.set(jobId, updated);

    this.eventEmitter.emit('job.updated', {
      jobId: updated.id,
      changes: Object.keys(updates),
    });

    return updated;
  }

  async pauseJob(jobId: string): Promise<ScheduledJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.isActive = false;
    job.lastStatus = 'PAUSED';
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    this.eventEmitter.emit('job.paused', { jobId });

    return job;
  }

  async resumeJob(jobId: string): Promise<ScheduledJob> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.isActive = true;
    job.lastStatus = 'PENDING';
    job.nextRun = this.calculateNextRun(job.frequency, job.cronExpression);
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);

    this.eventEmitter.emit('job.resumed', { jobId });

    return job;
  }

  async deleteJob(jobId: string): Promise<boolean> {
    return this.jobs.delete(jobId);
  }

  // Job Execution
  async runJob(jobId: string, triggeredBy: JobExecution['triggeredBy'] = 'MANUAL'): Promise<JobExecution> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Check dependencies
    if (job.dependencies && job.dependencies.length > 0) {
      for (const depId of job.dependencies) {
        const depJob = this.jobs.get(depId);
        if (depJob && depJob.lastStatus !== 'COMPLETED') {
          throw new Error(`Dependency not satisfied: ${depId}`);
        }
      }
    }

    const execution: JobExecution = {
      id: this.generateId('exec'),
      jobId,
      status: 'RUNNING',
      startedAt: new Date(),
      attempts: 1,
      triggeredBy,
    };

    this.executions.set(execution.id, execution);

    // Update job status
    job.lastRun = new Date();
    job.runCount++;
    job.lastStatus = 'RUNNING';
    this.jobs.set(jobId, job);

    this.eventEmitter.emit('job.started', {
      jobId,
      executionId: execution.id,
      triggeredBy,
    });

    // Simulate job execution
    try {
      await this.executeJob(job, execution);

      execution.status = 'COMPLETED';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.result = { success: true };
      this.executions.set(execution.id, execution);

      job.successCount++;
      job.lastStatus = 'COMPLETED';
      job.nextRun = this.calculateNextRun(job.frequency, job.cronExpression);
      this.jobs.set(jobId, job);

      this.eventEmitter.emit('job.completed', {
        jobId,
        executionId: execution.id,
        duration: execution.duration,
      });
    } catch (error) {
      execution.status = 'FAILED';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      this.executions.set(execution.id, execution);

      job.failureCount++;
      job.lastStatus = 'FAILED';
      this.jobs.set(jobId, job);

      this.eventEmitter.emit('job.failed', {
        jobId,
        executionId: execution.id,
        error: execution.error,
      });
    }

    return execution;
  }

  private async executeJob(job: ScheduledJob, execution: JobExecution): Promise<void> {
    // Simulate job execution based on type
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  async getExecution(executionId: string): Promise<JobExecution | undefined> {
    return this.executions.get(executionId);
  }

  async listExecutions(options: {
    jobId?: string;
    status?: JobStatus;
    limit?: number;
  } = {}): Promise<JobExecution[]> {
    let executions = Array.from(this.executions.values());

    if (options.jobId) {
      executions = executions.filter((e) => e.jobId === options.jobId);
    }
    if (options.status) {
      executions = executions.filter((e) => e.status === options.status);
    }

    executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    if (options.limit) {
      executions = executions.slice(0, options.limit);
    }

    return executions;
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'RUNNING') {
      return false;
    }

    execution.status = 'CANCELLED';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
    this.executions.set(executionId, execution);

    const job = this.jobs.get(execution.jobId);
    if (job) {
      job.lastStatus = 'CANCELLED';
      this.jobs.set(execution.jobId, job);
    }

    this.eventEmitter.emit('job.cancelled', {
      jobId: execution.jobId,
      executionId,
    });

    return true;
  }

  // Deadline Management
  async createDeadline(
    name: string,
    nameRo: string,
    dueDate: Date,
    category: Deadline['category'],
    createdBy: string,
    options: {
      description?: string;
      descriptionRo?: string;
      priority?: JobPriority;
      reminders?: number[];
      entityType?: string;
      entityId?: string;
      isRecurring?: boolean;
      recurrencePattern?: JobFrequency;
      tenantId?: string;
    } = {},
  ): Promise<Deadline> {
    const reminders: DeadlineReminder[] = (options.reminders || [7, 3, 1]).map((days) => ({
      daysBefore: days,
      sent: false,
    }));

    const deadline: Deadline = {
      id: this.generateId('ddl'),
      name,
      nameRo,
      description: options.description || '',
      descriptionRo: options.descriptionRo || '',
      dueDate,
      category,
      priority: options.priority || 'NORMAL',
      status: this.calculateDeadlineStatus(dueDate),
      reminders,
      entityType: options.entityType,
      entityId: options.entityId,
      isRecurring: options.isRecurring || false,
      recurrencePattern: options.recurrencePattern,
      createdBy,
      tenantId: options.tenantId,
    };

    this.deadlines.set(deadline.id, deadline);

    // Add to calendar
    const calendarEvent: CalendarEvent = {
      id: `deadline-${deadline.id}`,
      title: name,
      titleRo: nameRo,
      type: 'DEADLINE',
      date: dueDate,
      allDay: true,
      description: options.description,
      descriptionRo: options.descriptionRo,
      isRecurring: deadline.isRecurring,
    };
    this.calendarEvents.set(calendarEvent.id, calendarEvent);

    this.eventEmitter.emit('deadline.created', {
      deadlineId: deadline.id,
      name: deadline.name,
      dueDate: deadline.dueDate,
      category: deadline.category,
    });

    return deadline;
  }

  private calculateDeadlineStatus(dueDate: Date): Deadline['status'] {
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'OVERDUE';
    if (diffDays === 0) return 'DUE';
    if (diffDays <= 7) return 'APPROACHING';
    return 'PENDING';
  }

  async getDeadline(deadlineId: string): Promise<Deadline | undefined> {
    return this.deadlines.get(deadlineId);
  }

  async listDeadlines(options: {
    category?: Deadline['category'];
    status?: Deadline['status'];
    priority?: JobPriority;
    fromDate?: Date;
    toDate?: Date;
  } = {}): Promise<Deadline[]> {
    let deadlines = Array.from(this.deadlines.values());

    if (options.category) {
      deadlines = deadlines.filter((d) => d.category === options.category);
    }
    if (options.status) {
      deadlines = deadlines.filter((d) => d.status === options.status);
    }
    if (options.priority) {
      deadlines = deadlines.filter((d) => d.priority === options.priority);
    }
    if (options.fromDate) {
      deadlines = deadlines.filter((d) => d.dueDate >= options.fromDate!);
    }
    if (options.toDate) {
      deadlines = deadlines.filter((d) => d.dueDate <= options.toDate!);
    }

    deadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    return deadlines;
  }

  async completeDeadline(deadlineId: string): Promise<Deadline> {
    const deadline = this.deadlines.get(deadlineId);
    if (!deadline) {
      throw new Error(`Deadline not found: ${deadlineId}`);
    }

    deadline.status = 'COMPLETED';
    deadline.completedAt = new Date();
    this.deadlines.set(deadlineId, deadline);

    this.eventEmitter.emit('deadline.completed', {
      deadlineId: deadline.id,
      name: deadline.name,
    });

    // Create next occurrence if recurring
    if (deadline.isRecurring && deadline.recurrencePattern) {
      const nextDueDate = this.calculateNextRun(deadline.recurrencePattern);
      await this.createDeadline(deadline.name, deadline.nameRo, nextDueDate, deadline.category, deadline.createdBy, {
        description: deadline.description,
        descriptionRo: deadline.descriptionRo,
        priority: deadline.priority,
        reminders: deadline.reminders.map((r) => r.daysBefore),
        isRecurring: true,
        recurrencePattern: deadline.recurrencePattern,
        tenantId: deadline.tenantId,
      });
    }

    return deadline;
  }

  async deleteDeadline(deadlineId: string): Promise<boolean> {
    this.calendarEvents.delete(`deadline-${deadlineId}`);
    return this.deadlines.delete(deadlineId);
  }

  // ANAF Compliance Deadlines
  async createAnafDeadlines(year: number, month: number): Promise<Deadline[]> {
    const deadlines: Deadline[] = [];

    for (const anafDeadline of ANAF_DEADLINES) {
      const dueDate = new Date(year, month, anafDeadline.dayOfMonth);

      // Adjust for weekends
      while (this.isWeekend(dueDate) || this.isHoliday(dueDate)) {
        dueDate.setDate(dueDate.getDate() - 1);
      }

      const deadline = await this.createDeadline(
        anafDeadline.name,
        anafDeadline.nameRo,
        dueDate,
        'ANAF',
        'system',
        {
          description: anafDeadline.description,
          descriptionRo: anafDeadline.description,
          priority: 'HIGH',
          reminders: [7, 3, 1],
          isRecurring: true,
          recurrencePattern: 'MONTHLY',
        },
      );

      deadlines.push(deadline);
    }

    return deadlines;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private isHoliday(date: Date): boolean {
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return ROMANIAN_HOLIDAYS.some((h) => h.date === monthDay);
  }

  // Calendar Management
  async getCalendarEvents(options: {
    type?: CalendarEvent['type'];
    fromDate?: Date;
    toDate?: Date;
  } = {}): Promise<CalendarEvent[]> {
    let events = Array.from(this.calendarEvents.values());

    if (options.type) {
      events = events.filter((e) => e.type === options.type);
    }
    if (options.fromDate) {
      events = events.filter((e) => e.date >= options.fromDate!);
    }
    if (options.toDate) {
      events = events.filter((e) => e.date <= options.toDate!);
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    return events;
  }

  async getHolidays(year: number): Promise<CalendarEvent[]> {
    return this.getCalendarEvents({
      type: 'HOLIDAY',
      fromDate: new Date(year, 0, 1),
      toDate: new Date(year, 11, 31),
    });
  }

  async getWorkingDays(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    let workingDays = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (!this.isWeekend(d) && !this.isHoliday(d)) {
        workingDays++;
      }
    }

    return workingDays;
  }

  // Schedule Calculation
  private calculateNextRun(frequency: JobFrequency, cronExpression?: string): Date {
    const now = new Date();

    switch (frequency) {
      case 'ONCE':
        return now;
      case 'HOURLY':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'DAILY':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      case 'WEEKLY':
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + (7 - now.getDay()));
        return new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 0, 0, 0);
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
      case 'QUARTERLY':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), (quarter + 1) * 3, 1, 0, 0, 0);
      case 'YEARLY':
        return new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
      case 'CRON':
        // Simplified cron parsing - in production use a cron library
        return new Date(now.getTime() + 60 * 60 * 1000);
      default:
        return now;
    }
  }

  // Statistics
  async getStats(): Promise<ScheduleStats> {
    const jobs = Array.from(this.jobs.values());
    const executions = Array.from(this.executions.values());
    const deadlines = Array.from(this.deadlines.values());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayExecs = executions.filter((e) => e.startedAt >= today && e.startedAt < tomorrow);

    const upcomingDeadlines = deadlines.filter(
      (d) => d.status !== 'COMPLETED' && d.dueDate >= today,
    );

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.isActive).length,
      runningJobs: jobs.filter((j) => j.lastStatus === 'RUNNING').length,
      todayExecutions: todayExecs.length,
      todaySuccesses: todayExecs.filter((e) => e.status === 'COMPLETED').length,
      todayFailures: todayExecs.filter((e) => e.status === 'FAILED').length,
      upcomingDeadlines: upcomingDeadlines.length,
    };
  }

  // Romanian Localization
  getJobTypeName(type: JobType): string {
    return JOB_TYPE_TRANSLATIONS[type];
  }

  getFrequencyName(frequency: JobFrequency): string {
    return FREQUENCY_TRANSLATIONS[frequency];
  }

  getPriorityName(priority: JobPriority): string {
    return PRIORITY_TRANSLATIONS[priority];
  }

  getAllJobTypes(): Array<{ type: JobType; name: string; nameRo: string }> {
    return (Object.keys(JOB_TYPE_TRANSLATIONS) as JobType[]).map((type) => ({
      type,
      name: type.replace(/_/g, ' '),
      nameRo: JOB_TYPE_TRANSLATIONS[type],
    }));
  }

  getAllFrequencies(): Array<{ frequency: JobFrequency; name: string; nameRo: string }> {
    return (Object.keys(FREQUENCY_TRANSLATIONS) as JobFrequency[]).map((frequency) => ({
      frequency,
      name: frequency,
      nameRo: FREQUENCY_TRANSLATIONS[frequency],
    }));
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
