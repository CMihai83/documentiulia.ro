import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type DeliveryChannel = 'email' | 'slack' | 'teams' | 'webhook' | 'sftp' | 's3';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'html' | 'json';

export interface ScheduledReport {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  reportId: string;
  reportName: string;
  schedule: ReportSchedule;
  parameters: Record<string, any>;
  outputFormat: ReportFormat;
  delivery: DeliveryConfig;
  filters?: ScheduleFilter[];
  recipients: Recipient[];
  retryConfig?: RetryConfig;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  failureCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSchedule {
  frequency: ScheduleFrequency;
  timezone: string;
  time?: string; // HH:mm
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  month?: number; // 1-12 for yearly
  cron?: string; // for custom
  startDate?: Date;
  endDate?: Date;
}

export interface ScheduleFilter {
  type: 'date_range' | 'relative_date' | 'custom';
  field: string;
  config: {
    relative?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year';
    startOffset?: number;
    endOffset?: number;
    unit?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
}

export interface DeliveryConfig {
  channels: ChannelConfig[];
  attachReport?: boolean;
  includeLink?: boolean;
  customSubject?: string;
  customMessage?: string;
  compressOutput?: boolean;
  passwordProtect?: boolean;
  password?: string;
}

export interface ChannelConfig {
  type: DeliveryChannel;
  config: EmailConfig | SlackConfig | WebhookConfig | SftpConfig | S3Config;
}

export interface EmailConfig {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

export interface SlackConfig {
  channel: string;
  webhookUrl: string;
  mentionUsers?: string[];
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  authentication?: {
    type: 'basic' | 'bearer' | 'api_key';
    credentials: Record<string, string>;
  };
}

export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  remotePath: string;
}

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  path: string;
  acl?: string;
}

export interface Recipient {
  id: string;
  type: 'user' | 'email' | 'group';
  value: string;
  name?: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryInterval: number; // minutes
  alertOnFailure: boolean;
  alertRecipients?: string[];
}

export interface ScheduleRun {
  id: string;
  scheduleId: string;
  tenantId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  outputPath?: string;
  outputSize?: number;
  deliveryStatus: DeliveryStatus[];
  error?: string;
  retryCount: number;
  parameters: Record<string, any>;
  createdAt: Date;
}

export interface DeliveryStatus {
  channel: DeliveryChannel;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  error?: string;
  recipient?: string;
}

export interface ScheduleStats {
  totalSchedules: number;
  activeSchedules: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  byFrequency: Record<string, number>;
  byFormat: Record<string, number>;
  upcomingRuns: { schedule: ScheduledReport; nextRun: Date }[];
  recentRuns: ScheduleRun[];
}

@Injectable()
export class ScheduledReportsService {
  private schedules: Map<string, ScheduledReport> = new Map();
  private runs: Map<string, ScheduleRun> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== SCHEDULES ===================

  async createSchedule(data: {
    tenantId: string;
    name: string;
    description?: string;
    reportId: string;
    reportName: string;
    schedule: ReportSchedule;
    parameters: Record<string, any>;
    outputFormat: ReportFormat;
    delivery: DeliveryConfig;
    filters?: ScheduleFilter[];
    recipients: Recipient[];
    retryConfig?: RetryConfig;
    createdBy: string;
  }): Promise<ScheduledReport> {
    const id = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const nextRun = this.calculateNextRun(data.schedule);

    const schedule: ScheduledReport = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      reportId: data.reportId,
      reportName: data.reportName,
      schedule: data.schedule,
      parameters: data.parameters,
      outputFormat: data.outputFormat,
      delivery: data.delivery,
      filters: data.filters,
      recipients: data.recipients,
      retryConfig: data.retryConfig || { maxRetries: 3, retryInterval: 15, alertOnFailure: true },
      isActive: true,
      nextRun,
      runCount: 0,
      failureCount: 0,
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.schedules.set(id, schedule);
    this.eventEmitter.emit('schedule.created', { schedule });
    return schedule;
  }

  async getSchedule(id: string): Promise<ScheduledReport | undefined> {
    return this.schedules.get(id);
  }

  async getSchedules(tenantId: string, options?: {
    reportId?: string;
    isActive?: boolean;
    frequency?: ScheduleFrequency;
  }): Promise<ScheduledReport[]> {
    let schedules = Array.from(this.schedules.values()).filter(s => s.tenantId === tenantId);

    if (options?.reportId) {
      schedules = schedules.filter(s => s.reportId === options.reportId);
    }
    if (options?.isActive !== undefined) {
      schedules = schedules.filter(s => s.isActive === options.isActive);
    }
    if (options?.frequency) {
      schedules = schedules.filter(s => s.schedule.frequency === options.frequency);
    }

    return schedules.sort((a, b) => {
      if (a.nextRun && b.nextRun) {
        return a.nextRun.getTime() - b.nextRun.getTime();
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
  }

  async updateSchedule(id: string, updates: Partial<{
    name: string;
    description: string;
    schedule: ReportSchedule;
    parameters: Record<string, any>;
    outputFormat: ReportFormat;
    delivery: DeliveryConfig;
    filters: ScheduleFilter[];
    recipients: Recipient[];
    retryConfig: RetryConfig;
    isActive: boolean;
  }>): Promise<ScheduledReport | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;

    Object.assign(schedule, updates, { updatedAt: new Date() });

    if (updates.schedule) {
      schedule.nextRun = this.calculateNextRun(updates.schedule);
    }

    this.eventEmitter.emit('schedule.updated', { schedule });
    return schedule;
  }

  async deleteSchedule(id: string): Promise<void> {
    this.schedules.delete(id);
    this.eventEmitter.emit('schedule.deleted', { scheduleId: id });
  }

  async activateSchedule(id: string): Promise<ScheduledReport | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;

    schedule.isActive = true;
    schedule.nextRun = this.calculateNextRun(schedule.schedule);
    schedule.updatedAt = new Date();

    this.eventEmitter.emit('schedule.activated', { schedule });
    return schedule;
  }

  async deactivateSchedule(id: string): Promise<ScheduledReport | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;

    schedule.isActive = false;
    schedule.nextRun = undefined;
    schedule.updatedAt = new Date();

    this.eventEmitter.emit('schedule.deactivated', { schedule });
    return schedule;
  }

  // =================== RUNS ===================

  async runNow(scheduleId: string): Promise<ScheduleRun | undefined> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return undefined;

    return this.executeSchedule(schedule);
  }

  async getRuns(scheduleId: string, options?: {
    status?: ScheduleRun['status'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ScheduleRun[]> {
    let runs = Array.from(this.runs.values()).filter(r => r.scheduleId === scheduleId);

    if (options?.status) {
      runs = runs.filter(r => r.status === options.status);
    }
    if (options?.startDate) {
      runs = runs.filter(r => r.createdAt >= options.startDate!);
    }
    if (options?.endDate) {
      runs = runs.filter(r => r.createdAt <= options.endDate!);
    }

    runs = runs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options?.limit) {
      runs = runs.slice(0, options.limit);
    }

    return runs;
  }

  async getRun(runId: string): Promise<ScheduleRun | undefined> {
    return this.runs.get(runId);
  }

  async cancelRun(runId: string): Promise<ScheduleRun | undefined> {
    const run = this.runs.get(runId);
    if (!run || run.status !== 'running') return undefined;

    run.status = 'cancelled';
    run.completedAt = new Date();

    this.eventEmitter.emit('schedule.run.cancelled', { run });
    return run;
  }

  // =================== EXECUTION ===================

  @Cron(CronExpression.EVERY_MINUTE)
  async processSchedules(): Promise<void> {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (!schedule.isActive) continue;
      if (!schedule.nextRun) continue;
      if (schedule.nextRun > now) continue;

      // Check date range constraints
      if (schedule.schedule.startDate && now < schedule.schedule.startDate) continue;
      if (schedule.schedule.endDate && now > schedule.schedule.endDate) {
        schedule.isActive = false;
        continue;
      }

      // Execute the schedule
      await this.executeSchedule(schedule);

      // Calculate next run
      schedule.nextRun = this.calculateNextRun(schedule.schedule);
      schedule.lastRun = now;
    }
  }

  private async executeSchedule(schedule: ScheduledReport): Promise<ScheduleRun> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const run: ScheduleRun = {
      id: runId,
      scheduleId: schedule.id,
      tenantId: schedule.tenantId,
      status: 'pending',
      deliveryStatus: schedule.delivery.channels.map(c => ({
        channel: c.type,
        status: 'pending' as const,
      })),
      retryCount: 0,
      parameters: this.resolveParameters(schedule),
      createdAt: new Date(),
    };

    this.runs.set(runId, run);
    this.eventEmitter.emit('schedule.run.started', { schedule, run });

    try {
      run.status = 'running';
      run.startedAt = new Date();

      // Generate report (simulated)
      await this.generateReport(schedule, run);

      // Deliver to all channels
      for (let i = 0; i < schedule.delivery.channels.length; i++) {
        const channel = schedule.delivery.channels[i];
        try {
          await this.deliverReport(channel, schedule, run);
          run.deliveryStatus[i].status = 'sent';
          run.deliveryStatus[i].sentAt = new Date();
        } catch (error: any) {
          run.deliveryStatus[i].status = 'failed';
          run.deliveryStatus[i].error = error.message;
        }
      }

      // Check if all deliveries succeeded
      const allDelivered = run.deliveryStatus.every(d => d.status === 'sent');
      const anyDelivered = run.deliveryStatus.some(d => d.status === 'sent');

      if (allDelivered) {
        run.status = 'completed';
        schedule.runCount++;
      } else if (anyDelivered) {
        run.status = 'completed'; // Partial success
        schedule.runCount++;
      } else {
        throw new Error('All delivery channels failed');
      }

      run.completedAt = new Date();
      run.duration = run.completedAt.getTime() - run.startedAt.getTime();

      this.eventEmitter.emit('schedule.run.completed', { schedule, run });
    } catch (error: any) {
      run.status = 'failed';
      run.error = error.message;
      run.completedAt = new Date();

      schedule.failureCount++;

      this.eventEmitter.emit('schedule.run.failed', { schedule, run, error });

      // Retry if configured
      if (schedule.retryConfig && run.retryCount < schedule.retryConfig.maxRetries) {
        await this.scheduleRetry(schedule, run);
      } else if (schedule.retryConfig?.alertOnFailure) {
        await this.sendFailureAlert(schedule, run);
      }
    }

    return run;
  }

  private resolveParameters(schedule: ScheduledReport): Record<string, any> {
    const params = { ...schedule.parameters };

    // Resolve dynamic date filters
    if (schedule.filters) {
      for (const filter of schedule.filters) {
        if (filter.type === 'relative_date' && filter.config.relative) {
          const dates = this.getRelativeDateRange(filter.config.relative);
          params[`${filter.field}_start`] = dates.start;
          params[`${filter.field}_end`] = dates.end;
        }
      }
    }

    return params;
  }

  private getRelativeDateRange(relative: string): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (relative) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 86400000 - 1) };

      case 'yesterday':
        const yesterday = new Date(today.getTime() - 86400000);
        return { start: yesterday, end: new Date(today.getTime() - 1) };

      case 'this_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: now };

      case 'last_week':
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return { start: lastWeekStart, end: lastWeekEnd };

      case 'this_month':
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };

      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: lastMonthStart, end: lastMonthEnd };

      case 'this_quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        return { start: quarterStart, end: now };

      case 'last_quarter':
        const lastQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
        const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
        return { start: lastQuarterStart, end: lastQuarterEnd };

      case 'this_year':
        return { start: new Date(now.getFullYear(), 0, 1), end: now };

      case 'last_year':
        return {
          start: new Date(now.getFullYear() - 1, 0, 1),
          end: new Date(now.getFullYear() - 1, 11, 31),
        };

      default:
        return { start: today, end: now };
    }
  }

  private async generateReport(_schedule: ScheduledReport, run: ScheduleRun): Promise<void> {
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 100));

    run.outputPath = `/reports/scheduled/${run.id}.${_schedule.outputFormat}`;
    run.outputSize = Math.floor(Math.random() * 1000000) + 10000;
  }

  private async deliverReport(channel: ChannelConfig, _schedule: ScheduledReport, _run: ScheduleRun): Promise<void> {
    // Simulate delivery
    await new Promise(resolve => setTimeout(resolve, 50));

    switch (channel.type) {
      case 'email':
        // Send email with report
        break;
      case 'slack':
        // Post to Slack channel
        break;
      case 'webhook':
        // Call webhook
        break;
      case 'sftp':
        // Upload to SFTP
        break;
      case 's3':
        // Upload to S3
        break;
    }
  }

  private async scheduleRetry(schedule: ScheduledReport, run: ScheduleRun): Promise<void> {
    const retryDelay = schedule.retryConfig!.retryInterval * 60 * 1000;

    setTimeout(async () => {
      run.retryCount++;
      await this.executeSchedule(schedule);
    }, retryDelay);
  }

  private async sendFailureAlert(schedule: ScheduledReport, run: ScheduleRun): Promise<void> {
    this.eventEmitter.emit('schedule.alert.failure', {
      schedule,
      run,
      recipients: schedule.retryConfig?.alertRecipients || [schedule.createdBy],
    });
  }

  // =================== SCHEDULING ===================

  private calculateNextRun(schedule: ReportSchedule): Date | undefined {
    const now = new Date();
    const [hours, minutes] = (schedule.time || '08:00').split(':').map(Number);

    let next = new Date();
    next.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case 'hourly':
        next = new Date(now.getTime() + 3600000);
        next.setMinutes(minutes, 0, 0);
        break;

      case 'daily':
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;

      case 'weekly':
        const dayDiff = (schedule.dayOfWeek || 1) - next.getDay();
        next.setDate(next.getDate() + (dayDiff <= 0 && next <= now ? dayDiff + 7 : dayDiff));
        if (next <= now) {
          next.setDate(next.getDate() + 7);
        }
        break;

      case 'monthly':
        next.setDate(schedule.dayOfMonth || 1);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        break;

      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        next.setMonth(currentQuarter * 3 + 3);
        next.setDate(schedule.dayOfMonth || 1);
        if (next <= now) {
          next.setMonth(next.getMonth() + 3);
        }
        break;

      case 'yearly':
        next.setMonth((schedule.month || 1) - 1);
        next.setDate(schedule.dayOfMonth || 1);
        if (next <= now) {
          next.setFullYear(next.getFullYear() + 1);
        }
        break;

      case 'custom':
        // Parse cron expression (simplified)
        if (schedule.cron) {
          next = this.parseNextCron(schedule.cron, now);
        }
        break;
    }

    return next;
  }

  private parseNextCron(_cron: string, from: Date): Date {
    // Simplified cron parsing - in production use a proper cron library
    const next = new Date(from);
    next.setMinutes(next.getMinutes() + 1);
    return next;
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<ScheduleStats> {
    const schedules = Array.from(this.schedules.values()).filter(s => s.tenantId === tenantId);
    const runs = Array.from(this.runs.values()).filter(r => r.tenantId === tenantId);

    const byFrequency: Record<string, number> = {};
    const byFormat: Record<string, number> = {};

    schedules.forEach(s => {
      byFrequency[s.schedule.frequency] = (byFrequency[s.schedule.frequency] || 0) + 1;
      byFormat[s.outputFormat] = (byFormat[s.outputFormat] || 0) + 1;
    });

    const upcomingRuns = schedules
      .filter(s => s.isActive && s.nextRun)
      .map(s => ({ schedule: s, nextRun: s.nextRun! }))
      .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime())
      .slice(0, 10);

    const recentRuns = runs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      totalSchedules: schedules.length,
      activeSchedules: schedules.filter(s => s.isActive).length,
      totalRuns: runs.length,
      successfulRuns: runs.filter(r => r.status === 'completed').length,
      failedRuns: runs.filter(r => r.status === 'failed').length,
      byFrequency,
      byFormat,
      upcomingRuns,
      recentRuns,
    };
  }

  // =================== BULK OPERATIONS ===================

  async bulkActivate(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const result = await this.activateSchedule(id);
      if (result) count++;
    }
    return count;
  }

  async bulkDeactivate(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const result = await this.deactivateSchedule(id);
      if (result) count++;
    }
    return count;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (this.schedules.has(id)) {
        await this.deleteSchedule(id);
        count++;
      }
    }
    return count;
  }
}
