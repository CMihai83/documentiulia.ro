import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type MaintenanceType = 'preventive' | 'corrective' | 'predictive' | 'condition_based' | 'emergency';
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'custom';

export interface MaintenanceSchedule {
  id: string;
  tenantId: string;
  assetId: string;
  assetName: string;
  title: string;
  description?: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval?: number; // days for custom
  scheduledDate: Date;
  estimatedDuration?: number; // minutes
  estimatedCost?: number;
  assignedTo?: string;
  assignedToName?: string;
  vendorId?: string;
  vendorName?: string;
  checklist?: MaintenanceChecklistItem[];
  requiredParts?: MaintenancePart[];
  instructions?: string;
  notifyBefore?: number; // days
  status: MaintenanceStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export interface MaintenancePart {
  partId: string;
  partName: string;
  quantity: number;
  unitCost?: number;
  inStock?: boolean;
}

export interface MaintenanceRecord {
  id: string;
  tenantId: string;
  assetId: string;
  assetName: string;
  scheduleId?: string;
  type: MaintenanceType;
  title: string;
  description?: string;
  performedAt: Date;
  performedBy: string;
  performedByName: string;
  duration?: number; // minutes
  laborCost?: number;
  partsCost?: number;
  totalCost?: number;
  partsUsed?: MaintenancePart[];
  findings?: string;
  recommendations?: string;
  nextMaintenanceDate?: Date;
  attachments?: string[];
  meterReading?: number;
  conditionBefore?: string;
  conditionAfter?: string;
  status: 'completed' | 'partial' | 'failed';
  createdAt: Date;
}

export interface MaintenanceVendor {
  id: string;
  tenantId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  specializations?: string[];
  rating?: number;
  contractNumber?: string;
  contractExpiry?: Date;
  hourlyRate?: number;
  responseTime?: number; // hours
  notes?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface MaintenanceAlert {
  id: string;
  tenantId: string;
  assetId: string;
  assetName: string;
  scheduleId?: string;
  alertType: 'upcoming' | 'overdue' | 'warranty_expiring' | 'meter_based' | 'condition_based';
  title: string;
  message: string;
  priority: MaintenancePriority;
  scheduledDate?: Date;
  daysUntil?: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

// =================== SERVICE ===================

@Injectable()
export class AssetMaintenanceService {
  private schedules: Map<string, MaintenanceSchedule> = new Map();
  private records: Map<string, MaintenanceRecord> = new Map();
  private vendors: Map<string, MaintenanceVendor> = new Map();
  private alerts: Map<string, MaintenanceAlert> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Sample vendor
    const vendorId = `vendor-${Date.now()}`;
    this.vendors.set(vendorId, {
      id: vendorId,
      tenantId: 'system',
      name: 'TechServ Maintenance SRL',
      contactPerson: 'Alexandru Ionescu',
      email: 'contact@techserv.ro',
      phone: '+40 721 123 456',
      specializations: ['IT Hardware', 'Office Equipment', 'HVAC'],
      rating: 4.5,
      hourlyRate: 150,
      responseTime: 24,
      isActive: true,
      createdAt: new Date(),
    });
  }

  // =================== MAINTENANCE SCHEDULES ===================

  async createSchedule(data: {
    tenantId: string;
    assetId: string;
    assetName: string;
    title: string;
    description?: string;
    type: MaintenanceType;
    priority?: MaintenancePriority;
    isRecurring?: boolean;
    recurrencePattern?: RecurrencePattern;
    recurrenceInterval?: number;
    scheduledDate: Date;
    estimatedDuration?: number;
    estimatedCost?: number;
    assignedTo?: string;
    assignedToName?: string;
    vendorId?: string;
    vendorName?: string;
    checklist?: Array<{ task: string }>;
    requiredParts?: MaintenancePart[];
    instructions?: string;
    notifyBefore?: number;
    createdBy: string;
  }): Promise<MaintenanceSchedule> {
    const id = `maint-sched-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const checklist: MaintenanceChecklistItem[] = (data.checklist || []).map((item, index) => ({
      id: `check-${index}`,
      task: item.task,
      completed: false,
    }));

    const schedule: MaintenanceSchedule = {
      id,
      tenantId: data.tenantId,
      assetId: data.assetId,
      assetName: data.assetName,
      title: data.title,
      description: data.description,
      type: data.type,
      priority: data.priority || 'medium',
      isRecurring: data.isRecurring || false,
      recurrencePattern: data.recurrencePattern,
      recurrenceInterval: data.recurrenceInterval,
      scheduledDate: data.scheduledDate,
      estimatedDuration: data.estimatedDuration,
      estimatedCost: data.estimatedCost,
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName,
      vendorId: data.vendorId,
      vendorName: data.vendorName,
      checklist,
      requiredParts: data.requiredParts,
      instructions: data.instructions,
      notifyBefore: data.notifyBefore || 7,
      status: 'scheduled',
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.schedules.set(id, schedule);

    // Create alert if scheduled soon
    await this.checkAndCreateAlerts(schedule);

    this.eventEmitter.emit('maintenance.scheduled', { schedule });

    return schedule;
  }

  async getSchedule(id: string): Promise<MaintenanceSchedule | null> {
    return this.schedules.get(id) || null;
  }

  async getSchedules(
    tenantId: string,
    filters?: {
      assetId?: string;
      type?: MaintenanceType;
      status?: MaintenanceStatus;
      priority?: MaintenancePriority;
      assignedTo?: string;
      vendorId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<MaintenanceSchedule[]> {
    let schedules = Array.from(this.schedules.values()).filter(
      (s) => s.tenantId === tenantId || s.tenantId === 'system',
    );

    // Update overdue status
    const now = new Date();
    for (const schedule of schedules) {
      if (schedule.status === 'scheduled' && schedule.scheduledDate < now) {
        schedule.status = 'overdue';
      }
    }

    if (filters?.assetId) {
      schedules = schedules.filter((s) => s.assetId === filters.assetId);
    }

    if (filters?.type) {
      schedules = schedules.filter((s) => s.type === filters.type);
    }

    if (filters?.status) {
      schedules = schedules.filter((s) => s.status === filters.status);
    }

    if (filters?.priority) {
      schedules = schedules.filter((s) => s.priority === filters.priority);
    }

    if (filters?.assignedTo) {
      schedules = schedules.filter((s) => s.assignedTo === filters.assignedTo);
    }

    if (filters?.vendorId) {
      schedules = schedules.filter((s) => s.vendorId === filters.vendorId);
    }

    if (filters?.startDate) {
      schedules = schedules.filter((s) => s.scheduledDate >= filters.startDate!);
    }

    if (filters?.endDate) {
      schedules = schedules.filter((s) => s.scheduledDate <= filters.endDate!);
    }

    schedules = schedules.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

    if (filters?.limit) {
      schedules = schedules.slice(0, filters.limit);
    }

    return schedules;
  }

  async updateSchedule(
    id: string,
    data: Partial<MaintenanceSchedule>,
  ): Promise<MaintenanceSchedule | null> {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;

    const updated: MaintenanceSchedule = {
      ...schedule,
      ...data,
      id: schedule.id,
      tenantId: schedule.tenantId,
      assetId: schedule.assetId,
      createdBy: schedule.createdBy,
      createdAt: schedule.createdAt,
      updatedAt: new Date(),
    };

    this.schedules.set(id, updated);

    this.eventEmitter.emit('maintenance.schedule_updated', { schedule: updated });

    return updated;
  }

  async startMaintenance(
    scheduleId: string,
    startedBy: string,
  ): Promise<MaintenanceSchedule | null> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    schedule.status = 'in_progress';
    schedule.updatedAt = new Date();

    this.schedules.set(scheduleId, schedule);

    this.eventEmitter.emit('maintenance.started', { schedule, startedBy });

    return schedule;
  }

  async updateChecklistItem(
    scheduleId: string,
    itemId: string,
    data: {
      completed: boolean;
      completedBy?: string;
      notes?: string;
    },
  ): Promise<MaintenanceChecklistItem | null> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || !schedule.checklist) return null;

    const item = schedule.checklist.find((c) => c.id === itemId);
    if (!item) return null;

    item.completed = data.completed;
    item.completedAt = data.completed ? new Date() : undefined;
    item.completedBy = data.completedBy;
    item.notes = data.notes;

    schedule.updatedAt = new Date();
    this.schedules.set(scheduleId, schedule);

    return item;
  }

  async cancelSchedule(
    scheduleId: string,
    reason?: string,
  ): Promise<MaintenanceSchedule | null> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return null;

    schedule.status = 'cancelled';
    schedule.description = schedule.description
      ? `${schedule.description}\n\nCancellation reason: ${reason || 'Not specified'}`
      : `Cancellation reason: ${reason || 'Not specified'}`;
    schedule.updatedAt = new Date();

    this.schedules.set(scheduleId, schedule);

    this.eventEmitter.emit('maintenance.cancelled', { schedule, reason });

    return schedule;
  }

  // =================== MAINTENANCE RECORDS ===================

  async completeMaintenance(data: {
    tenantId: string;
    assetId: string;
    assetName: string;
    scheduleId?: string;
    type: MaintenanceType;
    title: string;
    description?: string;
    performedBy: string;
    performedByName: string;
    duration?: number;
    laborCost?: number;
    partsCost?: number;
    partsUsed?: MaintenancePart[];
    findings?: string;
    recommendations?: string;
    nextMaintenanceDate?: Date;
    meterReading?: number;
    conditionBefore?: string;
    conditionAfter?: string;
    status?: 'completed' | 'partial' | 'failed';
    attachments?: string[];
  }): Promise<MaintenanceRecord> {
    const id = `maint-rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const totalCost = (data.laborCost || 0) + (data.partsCost || 0);

    const record: MaintenanceRecord = {
      id,
      tenantId: data.tenantId,
      assetId: data.assetId,
      assetName: data.assetName,
      scheduleId: data.scheduleId,
      type: data.type,
      title: data.title,
      description: data.description,
      performedAt: new Date(),
      performedBy: data.performedBy,
      performedByName: data.performedByName,
      duration: data.duration,
      laborCost: data.laborCost,
      partsCost: data.partsCost,
      totalCost,
      partsUsed: data.partsUsed,
      findings: data.findings,
      recommendations: data.recommendations,
      nextMaintenanceDate: data.nextMaintenanceDate,
      attachments: data.attachments,
      meterReading: data.meterReading,
      conditionBefore: data.conditionBefore,
      conditionAfter: data.conditionAfter,
      status: data.status || 'completed',
      createdAt: new Date(),
    };

    this.records.set(id, record);

    // Update schedule if linked
    if (data.scheduleId) {
      const schedule = this.schedules.get(data.scheduleId);
      if (schedule) {
        schedule.status = 'completed';
        schedule.updatedAt = new Date();
        this.schedules.set(data.scheduleId, schedule);

        // Create next occurrence for recurring schedules
        if (schedule.isRecurring) {
          await this.createNextOccurrence(schedule);
        }
      }
    }

    // Schedule next maintenance if specified
    if (data.nextMaintenanceDate) {
      await this.createSchedule({
        tenantId: data.tenantId,
        assetId: data.assetId,
        assetName: data.assetName,
        title: `Follow-up: ${data.title}`,
        description: `Follow-up maintenance based on recommendations: ${data.recommendations || 'N/A'}`,
        type: data.type,
        scheduledDate: data.nextMaintenanceDate,
        createdBy: data.performedBy,
      });
    }

    this.eventEmitter.emit('maintenance.completed', { record });

    return record;
  }

  async getMaintenanceRecords(
    tenantId: string,
    filters?: {
      assetId?: string;
      type?: MaintenanceType;
      performedBy?: string;
      startDate?: Date;
      endDate?: Date;
      status?: MaintenanceRecord['status'];
      limit?: number;
    },
  ): Promise<MaintenanceRecord[]> {
    let records = Array.from(this.records.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    if (filters?.assetId) {
      records = records.filter((r) => r.assetId === filters.assetId);
    }

    if (filters?.type) {
      records = records.filter((r) => r.type === filters.type);
    }

    if (filters?.performedBy) {
      records = records.filter((r) => r.performedBy === filters.performedBy);
    }

    if (filters?.startDate) {
      records = records.filter((r) => r.performedAt >= filters.startDate!);
    }

    if (filters?.endDate) {
      records = records.filter((r) => r.performedAt <= filters.endDate!);
    }

    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status);
    }

    records = records.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

    if (filters?.limit) {
      records = records.slice(0, filters.limit);
    }

    return records;
  }

  async getAssetMaintenanceHistory(assetId: string): Promise<MaintenanceRecord[]> {
    return Array.from(this.records.values())
      .filter((r) => r.assetId === assetId)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  private async createNextOccurrence(schedule: MaintenanceSchedule): Promise<void> {
    let nextDate: Date;
    const currentDate = schedule.scheduledDate;

    switch (schedule.recurrencePattern) {
      case 'daily':
        nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'semi_annually':
        nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'annually':
        nextDate = new Date(currentDate);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      case 'custom':
        const days = schedule.recurrenceInterval || 30;
        nextDate = new Date(currentDate.getTime() + days * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    await this.createSchedule({
      tenantId: schedule.tenantId,
      assetId: schedule.assetId,
      assetName: schedule.assetName,
      title: schedule.title,
      description: schedule.description,
      type: schedule.type,
      priority: schedule.priority,
      isRecurring: true,
      recurrencePattern: schedule.recurrencePattern,
      recurrenceInterval: schedule.recurrenceInterval,
      scheduledDate: nextDate,
      estimatedDuration: schedule.estimatedDuration,
      estimatedCost: schedule.estimatedCost,
      assignedTo: schedule.assignedTo,
      assignedToName: schedule.assignedToName,
      vendorId: schedule.vendorId,
      vendorName: schedule.vendorName,
      checklist: schedule.checklist?.map((c) => ({ task: c.task })),
      requiredParts: schedule.requiredParts,
      instructions: schedule.instructions,
      notifyBefore: schedule.notifyBefore,
      createdBy: schedule.createdBy,
    });
  }

  // =================== VENDORS ===================

  async createVendor(data: {
    tenantId: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    specializations?: string[];
    contractNumber?: string;
    contractExpiry?: Date;
    hourlyRate?: number;
    responseTime?: number;
    notes?: string;
  }): Promise<MaintenanceVendor> {
    const id = `vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const vendor: MaintenanceVendor = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      specializations: data.specializations,
      contractNumber: data.contractNumber,
      contractExpiry: data.contractExpiry,
      hourlyRate: data.hourlyRate,
      responseTime: data.responseTime,
      notes: data.notes,
      isActive: true,
      createdAt: new Date(),
    };

    this.vendors.set(id, vendor);

    return vendor;
  }

  async getVendors(
    tenantId: string,
    filters?: {
      specialization?: string;
      isActive?: boolean;
    },
  ): Promise<MaintenanceVendor[]> {
    let vendors = Array.from(this.vendors.values()).filter(
      (v) => v.tenantId === tenantId || v.tenantId === 'system',
    );

    if (filters?.specialization) {
      vendors = vendors.filter((v) =>
        v.specializations?.some((s) =>
          s.toLowerCase().includes(filters.specialization!.toLowerCase()),
        ),
      );
    }

    if (filters?.isActive !== undefined) {
      vendors = vendors.filter((v) => v.isActive === filters.isActive);
    }

    return vendors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  async updateVendorRating(
    vendorId: string,
    rating: number,
  ): Promise<MaintenanceVendor | null> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return null;

    // Running average
    vendor.rating = vendor.rating
      ? (vendor.rating + rating) / 2
      : rating;

    this.vendors.set(vendorId, vendor);

    return vendor;
  }

  // =================== ALERTS ===================

  private async checkAndCreateAlerts(schedule: MaintenanceSchedule): Promise<void> {
    const now = new Date();
    const daysUntil = Math.ceil(
      (schedule.scheduledDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (daysUntil <= (schedule.notifyBefore || 7) && daysUntil > 0) {
      await this.createAlert({
        tenantId: schedule.tenantId,
        assetId: schedule.assetId,
        assetName: schedule.assetName,
        scheduleId: schedule.id,
        alertType: 'upcoming',
        title: `Upcoming maintenance: ${schedule.title}`,
        message: `Maintenance scheduled in ${daysUntil} days for ${schedule.assetName}`,
        priority: schedule.priority,
        scheduledDate: schedule.scheduledDate,
        daysUntil,
      });
    }
  }

  async createAlert(data: {
    tenantId: string;
    assetId: string;
    assetName: string;
    scheduleId?: string;
    alertType: MaintenanceAlert['alertType'];
    title: string;
    message: string;
    priority: MaintenancePriority;
    scheduledDate?: Date;
    daysUntil?: number;
  }): Promise<MaintenanceAlert> {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const alert: MaintenanceAlert = {
      id,
      tenantId: data.tenantId,
      assetId: data.assetId,
      assetName: data.assetName,
      scheduleId: data.scheduleId,
      alertType: data.alertType,
      title: data.title,
      message: data.message,
      priority: data.priority,
      scheduledDate: data.scheduledDate,
      daysUntil: data.daysUntil,
      acknowledged: false,
      createdAt: new Date(),
    };

    this.alerts.set(id, alert);

    this.eventEmitter.emit('maintenance.alert_created', { alert });

    return alert;
  }

  async getAlerts(
    tenantId: string,
    filters?: {
      acknowledged?: boolean;
      alertType?: MaintenanceAlert['alertType'];
      priority?: MaintenancePriority;
      assetId?: string;
    },
  ): Promise<MaintenanceAlert[]> {
    let alerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId,
    );

    if (filters?.acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === filters.acknowledged);
    }

    if (filters?.alertType) {
      alerts = alerts.filter((a) => a.alertType === filters.alertType);
    }

    if (filters?.priority) {
      alerts = alerts.filter((a) => a.priority === filters.priority);
    }

    if (filters?.assetId) {
      alerts = alerts.filter((a) => a.assetId === filters.assetId);
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<MaintenanceAlert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.alerts.set(alertId, alert);

    return alert;
  }

  // =================== STATISTICS ===================

  async getMaintenanceStatistics(tenantId: string): Promise<{
    scheduled: number;
    inProgress: number;
    completed: number;
    overdue: number;
    totalCostThisMonth: number;
    totalCostThisYear: number;
    avgDuration: number;
    byType: Record<MaintenanceType, number>;
    byPriority: Record<MaintenancePriority, number>;
    upcomingThisWeek: number;
    pendingAlerts: number;
  }> {
    const schedules = Array.from(this.schedules.values()).filter(
      (s) => s.tenantId === tenantId,
    );

    const records = Array.from(this.records.values()).filter(
      (r) => r.tenantId === tenantId,
    );

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Update overdue status
    for (const schedule of schedules) {
      if (schedule.status === 'scheduled' && schedule.scheduledDate < now) {
        schedule.status = 'overdue';
      }
    }

    const byType: Record<MaintenanceType, number> = {
      preventive: 0,
      corrective: 0,
      predictive: 0,
      condition_based: 0,
      emergency: 0,
    };

    const byPriority: Record<MaintenancePriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const schedule of schedules) {
      byType[schedule.type]++;
      byPriority[schedule.priority]++;
    }

    const monthRecords = records.filter((r) => r.performedAt >= startOfMonth);
    const yearRecords = records.filter((r) => r.performedAt >= startOfYear);

    const totalCostThisMonth = monthRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const totalCostThisYear = yearRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);

    const completedRecords = records.filter((r) => r.duration);
    const avgDuration = completedRecords.length > 0
      ? completedRecords.reduce((sum, r) => sum + (r.duration || 0), 0) / completedRecords.length
      : 0;

    const upcomingThisWeek = schedules.filter(
      (s) =>
        s.status === 'scheduled' &&
        s.scheduledDate >= now &&
        s.scheduledDate <= oneWeekFromNow,
    ).length;

    const pendingAlerts = Array.from(this.alerts.values()).filter(
      (a) => a.tenantId === tenantId && !a.acknowledged,
    ).length;

    return {
      scheduled: schedules.filter((s) => s.status === 'scheduled').length,
      inProgress: schedules.filter((s) => s.status === 'in_progress').length,
      completed: schedules.filter((s) => s.status === 'completed').length,
      overdue: schedules.filter((s) => s.status === 'overdue').length,
      totalCostThisMonth: Math.round(totalCostThisMonth * 100) / 100,
      totalCostThisYear: Math.round(totalCostThisYear * 100) / 100,
      avgDuration: Math.round(avgDuration),
      byType,
      byPriority,
      upcomingThisWeek,
      pendingAlerts,
    };
  }
}
