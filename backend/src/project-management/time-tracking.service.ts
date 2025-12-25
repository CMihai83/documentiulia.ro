import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Time Tracking Types
export interface TimeEntry {
  id: string;
  tenantId: string;
  userId: string;
  userName?: string;

  // Task reference
  taskId?: string;
  projectId?: string;

  // Entry details
  description: string;
  date: Date;
  startTime?: Date;
  endTime?: Date;
  duration: number; // Minutes
  billable: boolean;
  billableRate?: number;
  billableAmount?: number;

  // Status
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'invoiced';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;

  // Categorization
  activityType?: ActivityType;
  tags: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityType =
  | 'development'
  | 'design'
  | 'meeting'
  | 'planning'
  | 'research'
  | 'testing'
  | 'documentation'
  | 'support'
  | 'admin'
  | 'other';

export interface Timer {
  id: string;
  tenantId: string;
  userId: string;
  taskId?: string;
  projectId?: string;
  description: string;
  startedAt: Date;
  isRunning: boolean;
  totalPausedDuration: number; // Minutes
  pausedAt?: Date;
}

export interface TimeSheet {
  id: string;
  tenantId: string;
  userId: string;
  userName?: string;
  weekStartDate: Date;
  weekEndDate: Date;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  entries: string[]; // TimeEntry IDs
  totalHours: number;
  billableHours: number;
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  totalAmount: number;
  byUser: Array<{
    userId: string;
    userName?: string;
    hours: number;
    billableHours: number;
    amount: number;
  }>;
  byProject: Array<{
    projectId: string;
    projectName?: string;
    hours: number;
    billableHours: number;
    amount: number;
  }>;
  byActivity: Array<{
    activity: ActivityType;
    hours: number;
    percentage: number;
  }>;
  byDay: Array<{
    date: string;
    hours: number;
    billableHours: number;
  }>;
}

export interface TimeEntryFilters {
  userId?: string;
  taskId?: string;
  projectId?: string;
  status?: TimeEntry['status'] | TimeEntry['status'][];
  billable?: boolean;
  activityType?: ActivityType;
  startDate?: Date;
  endDate?: Date;
  minDuration?: number;
  maxDuration?: number;
  tags?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

@Injectable()
export class TimeTrackingService {
  private readonly logger = new Logger(TimeTrackingService.name);

  private entries = new Map<string, TimeEntry>();
  private timers = new Map<string, Timer>();
  private timesheets = new Map<string, TimeSheet>();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== TIME ENTRIES ===================

  async createEntry(data: {
    tenantId: string;
    userId: string;
    userName?: string;
    taskId?: string;
    projectId?: string;
    description: string;
    date: Date;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    billable?: boolean;
    billableRate?: number;
    activityType?: ActivityType;
    tags?: string[];
  }): Promise<TimeEntry> {
    // Calculate duration if start/end time provided
    let duration = data.duration || 0;
    if (data.startTime && data.endTime) {
      duration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / 60000);
    }

    if (duration <= 0) {
      throw new BadRequestException('Duration must be greater than 0');
    }

    const billableAmount = data.billable && data.billableRate
      ? (duration / 60) * data.billableRate
      : undefined;

    const entry: TimeEntry = {
      id: uuidv4(),
      tenantId: data.tenantId,
      userId: data.userId,
      userName: data.userName,
      taskId: data.taskId,
      projectId: data.projectId,
      description: data.description,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      duration,
      billable: data.billable ?? true,
      billableRate: data.billableRate,
      billableAmount,
      status: 'draft',
      activityType: data.activityType,
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.entries.set(entry.id, entry);

    this.eventEmitter.emit('time-entry.created', {
      entryId: entry.id,
      tenantId: data.tenantId,
      userId: data.userId,
      duration,
    });

    return entry;
  }

  async getEntries(tenantId: string, filters?: TimeEntryFilters): Promise<{
    entries: TimeEntry[];
    total: number;
    totalDuration: number;
    totalBillable: number;
  }> {
    let entries = Array.from(this.entries.values())
      .filter(e => e.tenantId === tenantId);

    // Apply filters
    if (filters) {
      if (filters.userId) entries = entries.filter(e => e.userId === filters.userId);
      if (filters.taskId) entries = entries.filter(e => e.taskId === filters.taskId);
      if (filters.projectId) entries = entries.filter(e => e.projectId === filters.projectId);
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        entries = entries.filter(e => statuses.includes(e.status));
      }
      if (filters.billable !== undefined) entries = entries.filter(e => e.billable === filters.billable);
      if (filters.activityType) entries = entries.filter(e => e.activityType === filters.activityType);
      if (filters.startDate) entries = entries.filter(e => e.date >= filters.startDate!);
      if (filters.endDate) entries = entries.filter(e => e.date <= filters.endDate!);
      if (filters.minDuration !== undefined) entries = entries.filter(e => e.duration >= filters.minDuration!);
      if (filters.maxDuration !== undefined) entries = entries.filter(e => e.duration <= filters.maxDuration!);
      if (filters.tags?.length) entries = entries.filter(e => filters.tags!.some(t => e.tags.includes(t)));
    }

    const total = entries.length;
    const totalDuration = entries.reduce((sum, e) => sum + e.duration, 0);
    const totalBillable = entries.filter(e => e.billable).reduce((sum, e) => sum + e.duration, 0);

    // Sort
    const sortBy = filters?.sortBy || 'date';
    const sortOrder = filters?.sortOrder || 'desc';
    entries.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      if (sortOrder === 'desc') return bVal > aVal ? 1 : -1;
      return aVal > bVal ? 1 : -1;
    });

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    entries = entries.slice(offset, offset + limit);

    return { entries, total, totalDuration, totalBillable };
  }

  async getEntry(id: string): Promise<TimeEntry | null> {
    return this.entries.get(id) || null;
  }

  async updateEntry(
    id: string,
    updates: Partial<Pick<TimeEntry,
      'description' | 'date' | 'startTime' | 'endTime' | 'duration' |
      'billable' | 'billableRate' | 'activityType' | 'tags' | 'taskId' | 'projectId'
    >>,
  ): Promise<TimeEntry | null> {
    const entry = this.entries.get(id);
    if (!entry) return null;

    if (entry.status === 'approved' || entry.status === 'invoiced') {
      throw new BadRequestException('Cannot update approved or invoiced entries');
    }

    // Recalculate duration if times changed
    if (updates.startTime || updates.endTime) {
      const start = updates.startTime || entry.startTime;
      const end = updates.endTime || entry.endTime;
      if (start && end) {
        updates.duration = Math.round((end.getTime() - start.getTime()) / 60000);
      }
    }

    // Recalculate billable amount
    if (updates.billable !== undefined || updates.billableRate !== undefined || updates.duration !== undefined) {
      const billable = updates.billable ?? entry.billable;
      const rate = updates.billableRate ?? entry.billableRate;
      const duration = updates.duration ?? entry.duration;
      if (billable && rate) {
        (entry as any).billableAmount = (duration / 60) * rate;
      }
    }

    Object.assign(entry, updates, { updatedAt: new Date() });
    this.entries.set(id, entry);

    return entry;
  }

  async deleteEntry(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) return;

    if (entry.status === 'approved' || entry.status === 'invoiced') {
      throw new BadRequestException('Cannot delete approved or invoiced entries');
    }

    this.entries.delete(id);
  }

  async submitEntry(id: string): Promise<TimeEntry | null> {
    const entry = this.entries.get(id);
    if (!entry) return null;

    entry.status = 'submitted';
    entry.updatedAt = new Date();
    this.entries.set(id, entry);

    return entry;
  }

  async approveEntry(id: string, approvedBy: string): Promise<TimeEntry | null> {
    const entry = this.entries.get(id);
    if (!entry) return null;

    entry.status = 'approved';
    entry.approvedBy = approvedBy;
    entry.approvedAt = new Date();
    entry.updatedAt = new Date();
    this.entries.set(id, entry);

    this.eventEmitter.emit('time-entry.approved', {
      entryId: id,
      userId: entry.userId,
      approvedBy,
    });

    return entry;
  }

  async rejectEntry(id: string, rejectedBy: string, reason: string): Promise<TimeEntry | null> {
    const entry = this.entries.get(id);
    if (!entry) return null;

    entry.status = 'rejected';
    entry.rejectionReason = reason;
    entry.updatedAt = new Date();
    this.entries.set(id, entry);

    return entry;
  }

  // =================== TIMERS ===================

  async startTimer(data: {
    tenantId: string;
    userId: string;
    taskId?: string;
    projectId?: string;
    description: string;
  }): Promise<Timer> {
    // Stop any existing running timer
    const existingTimer = await this.getRunningTimer(data.tenantId, data.userId);
    if (existingTimer) {
      await this.stopTimer(existingTimer.id, data.userId);
    }

    const timer: Timer = {
      id: uuidv4(),
      tenantId: data.tenantId,
      userId: data.userId,
      taskId: data.taskId,
      projectId: data.projectId,
      description: data.description,
      startedAt: new Date(),
      isRunning: true,
      totalPausedDuration: 0,
    };

    this.timers.set(timer.id, timer);

    this.eventEmitter.emit('timer.started', {
      timerId: timer.id,
      userId: data.userId,
    });

    return timer;
  }

  async pauseTimer(timerId: string): Promise<Timer | null> {
    const timer = this.timers.get(timerId);
    if (!timer || !timer.isRunning) return null;

    timer.isRunning = false;
    timer.pausedAt = new Date();
    this.timers.set(timerId, timer);

    return timer;
  }

  async resumeTimer(timerId: string): Promise<Timer | null> {
    const timer = this.timers.get(timerId);
    if (!timer || timer.isRunning || !timer.pausedAt) return null;

    const pauseDuration = Math.round((new Date().getTime() - timer.pausedAt.getTime()) / 60000);
    timer.totalPausedDuration += pauseDuration;
    timer.isRunning = true;
    timer.pausedAt = undefined;
    this.timers.set(timerId, timer);

    return timer;
  }

  async stopTimer(timerId: string, userId: string): Promise<TimeEntry | null> {
    const timer = this.timers.get(timerId);
    if (!timer) return null;

    // Calculate duration (excluding paused time)
    let endTime = new Date();
    if (!timer.isRunning && timer.pausedAt) {
      endTime = timer.pausedAt;
    }

    const totalMinutes = Math.round((endTime.getTime() - timer.startedAt.getTime()) / 60000);
    const duration = totalMinutes - timer.totalPausedDuration;

    // Create time entry
    const entry = await this.createEntry({
      tenantId: timer.tenantId,
      userId: timer.userId,
      taskId: timer.taskId,
      projectId: timer.projectId,
      description: timer.description,
      date: timer.startedAt,
      startTime: timer.startedAt,
      endTime,
      duration: Math.max(1, duration), // Minimum 1 minute
      billable: true,
    });

    this.timers.delete(timerId);

    this.eventEmitter.emit('timer.stopped', {
      timerId,
      entryId: entry.id,
      duration,
    });

    return entry;
  }

  async discardTimer(timerId: string): Promise<void> {
    this.timers.delete(timerId);
  }

  async getRunningTimer(tenantId: string, userId: string): Promise<Timer | null> {
    return Array.from(this.timers.values())
      .find(t => t.tenantId === tenantId && t.userId === userId && t.isRunning) || null;
  }

  async getTimers(tenantId: string, userId: string): Promise<Timer[]> {
    return Array.from(this.timers.values())
      .filter(t => t.tenantId === tenantId && t.userId === userId);
  }

  // =================== TIMESHEETS ===================

  async createTimesheet(data: {
    tenantId: string;
    userId: string;
    userName?: string;
    weekStartDate: Date;
  }): Promise<TimeSheet> {
    // Calculate week end date
    const weekEndDate = new Date(data.weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    // Get entries for this week
    const { entries } = await this.getEntries(data.tenantId, {
      userId: data.userId,
      startDate: data.weekStartDate,
      endDate: weekEndDate,
    });

    const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
    const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + e.duration, 0);

    const timesheet: TimeSheet = {
      id: uuidv4(),
      tenantId: data.tenantId,
      userId: data.userId,
      userName: data.userName,
      weekStartDate: data.weekStartDate,
      weekEndDate,
      status: 'draft',
      entries: entries.map(e => e.id),
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      billableHours: Math.round((billableMinutes / 60) * 100) / 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.timesheets.set(timesheet.id, timesheet);
    return timesheet;
  }

  async getTimesheets(tenantId: string, userId?: string): Promise<TimeSheet[]> {
    return Array.from(this.timesheets.values())
      .filter(ts => ts.tenantId === tenantId && (!userId || ts.userId === userId))
      .sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime());
  }

  async getTimesheet(id: string): Promise<TimeSheet | null> {
    return this.timesheets.get(id) || null;
  }

  async submitTimesheet(id: string, comments?: string): Promise<TimeSheet | null> {
    const timesheet = this.timesheets.get(id);
    if (!timesheet) return null;

    timesheet.status = 'submitted';
    timesheet.submittedAt = new Date();
    timesheet.comments = comments;
    timesheet.updatedAt = new Date();
    this.timesheets.set(id, timesheet);

    // Submit all entries
    for (const entryId of timesheet.entries) {
      await this.submitEntry(entryId);
    }

    return timesheet;
  }

  async approveTimesheet(id: string, approvedBy: string): Promise<TimeSheet | null> {
    const timesheet = this.timesheets.get(id);
    if (!timesheet) return null;

    timesheet.status = 'approved';
    timesheet.approvedBy = approvedBy;
    timesheet.approvedAt = new Date();
    timesheet.updatedAt = new Date();
    this.timesheets.set(id, timesheet);

    // Approve all entries
    for (const entryId of timesheet.entries) {
      await this.approveEntry(entryId, approvedBy);
    }

    return timesheet;
  }

  async rejectTimesheet(id: string, rejectedBy: string, reason: string): Promise<TimeSheet | null> {
    const timesheet = this.timesheets.get(id);
    if (!timesheet) return null;

    timesheet.status = 'rejected';
    timesheet.rejectionReason = reason;
    timesheet.updatedAt = new Date();
    this.timesheets.set(id, timesheet);

    // Reject all entries
    for (const entryId of timesheet.entries) {
      await this.rejectEntry(entryId, rejectedBy, reason);
    }

    return timesheet;
  }

  // =================== REPORTS ===================

  async generateReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    filters?: { userId?: string; projectId?: string },
  ): Promise<TimeReport> {
    const { entries } = await this.getEntries(tenantId, {
      startDate,
      endDate,
      userId: filters?.userId,
      projectId: filters?.projectId,
      limit: 10000,
    });

    const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
    const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + e.duration, 0);
    const totalAmount = entries.reduce((sum, e) => sum + (e.billableAmount || 0), 0);

    // Group by user
    const byUserMap = new Map<string, { userName?: string; minutes: number; billableMinutes: number; amount: number }>();
    for (const entry of entries) {
      const existing = byUserMap.get(entry.userId) || { userName: entry.userName, minutes: 0, billableMinutes: 0, amount: 0 };
      existing.minutes += entry.duration;
      if (entry.billable) existing.billableMinutes += entry.duration;
      existing.amount += entry.billableAmount || 0;
      byUserMap.set(entry.userId, existing);
    }

    // Group by project
    const byProjectMap = new Map<string, { projectName?: string; minutes: number; billableMinutes: number; amount: number }>();
    for (const entry of entries) {
      if (!entry.projectId) continue;
      const existing = byProjectMap.get(entry.projectId) || { minutes: 0, billableMinutes: 0, amount: 0 };
      existing.minutes += entry.duration;
      if (entry.billable) existing.billableMinutes += entry.duration;
      existing.amount += entry.billableAmount || 0;
      byProjectMap.set(entry.projectId, existing);
    }

    // Group by activity
    const byActivityMap = new Map<ActivityType, number>();
    for (const entry of entries) {
      if (!entry.activityType) continue;
      byActivityMap.set(entry.activityType, (byActivityMap.get(entry.activityType) || 0) + entry.duration);
    }

    // Group by day
    const byDayMap = new Map<string, { minutes: number; billableMinutes: number }>();
    for (const entry of entries) {
      const dateKey = entry.date.toISOString().split('T')[0];
      const existing = byDayMap.get(dateKey) || { minutes: 0, billableMinutes: 0 };
      existing.minutes += entry.duration;
      if (entry.billable) existing.billableMinutes += entry.duration;
      byDayMap.set(dateKey, existing);
    }

    return {
      period: { startDate, endDate },
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      billableHours: Math.round((billableMinutes / 60) * 100) / 100,
      nonBillableHours: Math.round(((totalMinutes - billableMinutes) / 60) * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      byUser: Array.from(byUserMap.entries()).map(([userId, data]) => ({
        userId,
        userName: data.userName,
        hours: Math.round((data.minutes / 60) * 100) / 100,
        billableHours: Math.round((data.billableMinutes / 60) * 100) / 100,
        amount: Math.round(data.amount * 100) / 100,
      })),
      byProject: Array.from(byProjectMap.entries()).map(([projectId, data]) => ({
        projectId,
        projectName: data.projectName,
        hours: Math.round((data.minutes / 60) * 100) / 100,
        billableHours: Math.round((data.billableMinutes / 60) * 100) / 100,
        amount: Math.round(data.amount * 100) / 100,
      })),
      byActivity: Array.from(byActivityMap.entries()).map(([activity, minutes]) => ({
        activity,
        hours: Math.round((minutes / 60) * 100) / 100,
        percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
      })),
      byDay: Array.from(byDayMap.entries())
        .map(([date, data]) => ({
          date,
          hours: Math.round((data.minutes / 60) * 100) / 100,
          billableHours: Math.round((data.billableMinutes / 60) * 100) / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // =================== STATS ===================

  async getStats(tenantId: string, userId?: string): Promise<{
    todayHours: number;
    weekHours: number;
    monthHours: number;
    pendingApproval: number;
    billablePercentage: number;
    avgDailyHours: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const entries = Array.from(this.entries.values())
      .filter(e => e.tenantId === tenantId && (!userId || e.userId === userId));

    const todayEntries = entries.filter(e => e.date >= todayStart);
    const weekEntries = entries.filter(e => e.date >= weekStart);
    const monthEntries = entries.filter(e => e.date >= monthStart);

    const todayMinutes = todayEntries.reduce((sum, e) => sum + e.duration, 0);
    const weekMinutes = weekEntries.reduce((sum, e) => sum + e.duration, 0);
    const monthMinutes = monthEntries.reduce((sum, e) => sum + e.duration, 0);
    const billableMinutes = entries.reduce((sum, e) => sum + (e.billable ? e.duration : 0), 0);
    const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);

    const pendingEntries = entries.filter(e => e.status === 'submitted');

    // Calculate working days this month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let workingDays = 0;
    for (let day = 1; day <= now.getDate(); day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      if (date.getDay() !== 0 && date.getDay() !== 6) workingDays++;
    }

    return {
      todayHours: Math.round((todayMinutes / 60) * 100) / 100,
      weekHours: Math.round((weekMinutes / 60) * 100) / 100,
      monthHours: Math.round((monthMinutes / 60) * 100) / 100,
      pendingApproval: pendingEntries.length,
      billablePercentage: totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0,
      avgDailyHours: workingDays > 0 ? Math.round((monthMinutes / 60 / workingDays) * 100) / 100 : 0,
    };
  }
}
