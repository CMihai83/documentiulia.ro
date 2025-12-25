import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Time Tracking & Project Workspaces Service
// Shared workspaces with time tracking, screenshot proofs, fiscal invoicing sync,
// NDA auto-generation, and IP clause management

// ===== TYPES =====

export interface Workspace {
  id: string;
  name: string;
  description: string;
  projectId: string;
  contractId?: string;
  ownerId: string;
  ownerType: 'CLIENT' | 'AGENCY';
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: Date;
  permissions: MemberPermissions;
  hourlyRate?: number;
  currency?: string;
}

export interface MemberPermissions {
  canManageMembers: boolean;
  canManageTasks: boolean;
  canTrackTime: boolean;
  canViewReports: boolean;
  canApproveTime: boolean;
  canAccessFiles: boolean;
  canCreateInvoices: boolean;
}

export interface WorkspaceSettings {
  requireScreenshots: boolean;
  screenshotInterval: number; // minutes
  activityTracking: boolean;
  idleTimeout: number; // minutes
  requireManualApproval: boolean;
  autoInvoicing: boolean;
  invoicingSchedule: 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY' | 'ON_COMPLETION';
  ndaRequired: boolean;
  ipClauseType: 'CLIENT_OWNS_ALL' | 'FREELANCER_RETAINS' | 'SHARED' | 'CUSTOM';
  customIpTerms?: string;
  overtimeMultiplier: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
}

export interface TimeEntry {
  id: string;
  workspaceId: string;
  userId: string;
  taskId?: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  hourlyRate: number;
  currency: string;
  amount: number;
  status: 'TRACKING' | 'PAUSED' | 'COMPLETED' | 'APPROVED' | 'REJECTED' | 'INVOICED';
  screenshots: Screenshot[];
  activityLevel: number; // 0-100%
  keystrokes?: number;
  mouseClicks?: number;
  appUsage?: AppUsageEntry[];
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  invoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Screenshot {
  id: string;
  timeEntryId: string;
  timestamp: Date;
  url: string;
  thumbnailUrl?: string;
  activityLevel: number;
  blurred: boolean; // Privacy option
  flagged: boolean;
  flagReason?: string;
}

export interface AppUsageEntry {
  appName: string;
  windowTitle: string;
  duration: number; // seconds
  productive: boolean;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  estimatedHours?: number;
  trackedHours: number;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: Date;
  tags: string[];
  attachments: TaskAttachment[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface TaskAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface NDADocument {
  id: string;
  workspaceId: string;
  templateType: 'STANDARD' | 'MUTUAL' | 'UNILATERAL' | 'CUSTOM';
  title: string;
  content: string;
  parties: NDAParty[];
  effectiveDate: Date;
  expirationDate?: Date;
  perpetual: boolean;
  confidentialityPeriod: number; // years
  governingLaw: string;
  jurisdiction: string;
  status: 'DRAFT' | 'PENDING_SIGNATURES' | 'PARTIALLY_SIGNED' | 'FULLY_EXECUTED' | 'EXPIRED' | 'TERMINATED';
  createdAt: Date;
  executedAt?: Date;
}

export interface NDAParty {
  type: 'DISCLOSER' | 'RECIPIENT' | 'MUTUAL';
  name: string;
  email: string;
  company?: string;
  address?: string;
  signedAt?: Date;
  signatureHash?: string;
  ipAddress?: string;
}

export interface IPAgreement {
  id: string;
  workspaceId: string;
  contractId?: string;
  type: 'WORK_FOR_HIRE' | 'LICENSE' | 'ASSIGNMENT' | 'JOINT_OWNERSHIP' | 'CUSTOM';
  ownership: 'CLIENT' | 'FREELANCER' | 'SHARED';
  scope: string;
  exclusions?: string[];
  licensedRights?: LicenseRights;
  customTerms?: string;
  parties: IPParty[];
  effectiveDate: Date;
  status: 'DRAFT' | 'ACTIVE' | 'TERMINATED';
  createdAt: Date;
}

export interface LicenseRights {
  commercial: boolean;
  modification: boolean;
  distribution: boolean;
  sublicensing: boolean;
  territory: 'WORLDWIDE' | 'REGIONAL' | 'COUNTRY_SPECIFIC';
  countries?: string[];
  duration: 'PERPETUAL' | 'LIMITED';
  years?: number;
}

export interface IPParty {
  role: 'CREATOR' | 'ASSIGNEE' | 'LICENSOR' | 'LICENSEE';
  name: string;
  email: string;
  company?: string;
  acknowledgedAt?: Date;
}

export interface ActivityFeedItem {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  type: 'MEMBER_JOINED' | 'MEMBER_LEFT' | 'TASK_CREATED' | 'TASK_COMPLETED' |
        'TIME_LOGGED' | 'TIME_APPROVED' | 'FILE_UPLOADED' | 'COMMENT_ADDED' |
        'NDA_SIGNED' | 'INVOICE_GENERATED' | 'MILESTONE_COMPLETED' | 'WORKSPACE_UPDATED';
  entityId?: string;
  entityType?: 'TASK' | 'TIME_ENTRY' | 'FILE' | 'COMMENT' | 'NDA' | 'INVOICE';
  message: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface WorkspaceInvoice {
  id: string;
  workspaceId: string;
  contractId?: string;
  invoiceNumber: string;
  freelancerId: string;
  clientId: string;
  periodStart: Date;
  periodEnd: Date;
  timeEntries: string[]; // timeEntryIds
  totalHours: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  status: 'DRAFT' | 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: Date;
  paidAt?: Date;
  eFacturaId?: string;
  notes?: string;
  createdAt: Date;
}

export interface TimeReport {
  workspaceId: string;
  periodStart: Date;
  periodEnd: Date;
  totalHours: number;
  billableHours: number;
  totalAmount: number;
  currency: string;
  byMember: MemberTimeStats[];
  byTask: TaskTimeStats[];
  byDay: DailyTimeStats[];
  averageActivityLevel: number;
  screenshots: number;
  approvalRate: number;
}

export interface MemberTimeStats {
  userId: string;
  userName: string;
  hours: number;
  amount: number;
  averageActivity: number;
  tasksCompleted: number;
}

export interface TaskTimeStats {
  taskId: string;
  taskTitle: string;
  estimatedHours: number;
  actualHours: number;
  variance: number; // percentage
  status: string;
}

export interface DailyTimeStats {
  date: string;
  hours: number;
  amount: number;
  entries: number;
  averageActivity: number;
}

@Injectable()
export class WorkspaceService {
  // In-memory storage (would be Prisma in production)
  private workspaces = new Map<string, Workspace>();
  private timeEntries = new Map<string, TimeEntry>();
  private tasks = new Map<string, Task>();
  private ndaDocuments = new Map<string, NDADocument>();
  private ipAgreements = new Map<string, IPAgreement>();
  private activityFeed = new Map<string, ActivityFeedItem>();
  private invoices = new Map<string, WorkspaceInvoice>();

  constructor(private configService: ConfigService) {}

  // Reset state for testing
  resetState(): void {
    this.workspaces.clear();
    this.timeEntries.clear();
    this.tasks.clear();
    this.ndaDocuments.clear();
    this.ipAgreements.clear();
    this.activityFeed.clear();
    this.invoices.clear();
  }

  // ===== WORKSPACE MANAGEMENT =====

  async createWorkspace(data: {
    name: string;
    description: string;
    projectId: string;
    contractId?: string;
    ownerId: string;
    ownerType: 'CLIENT' | 'AGENCY';
    settings?: Partial<WorkspaceSettings>;
  }): Promise<Workspace> {
    const workspaceId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const defaultSettings: WorkspaceSettings = {
      requireScreenshots: true,
      screenshotInterval: 10,
      activityTracking: true,
      idleTimeout: 5,
      requireManualApproval: true,
      autoInvoicing: false,
      invoicingSchedule: 'MONTHLY',
      ndaRequired: true,
      ipClauseType: 'CLIENT_OWNS_ALL',
      overtimeMultiplier: 1.5,
      maxDailyHours: 10,
      maxWeeklyHours: 48,
    };

    const workspace: Workspace = {
      id: workspaceId,
      name: data.name,
      description: data.description,
      projectId: data.projectId,
      contractId: data.contractId,
      ownerId: data.ownerId,
      ownerType: data.ownerType,
      members: [
        {
          userId: data.ownerId,
          role: 'OWNER',
          joinedAt: new Date(),
          permissions: {
            canManageMembers: true,
            canManageTasks: true,
            canTrackTime: false,
            canViewReports: true,
            canApproveTime: true,
            canAccessFiles: true,
            canCreateInvoices: true,
          },
        },
      ],
      settings: { ...defaultSettings, ...data.settings },
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workspaces.set(workspaceId, workspace);

    // Add activity feed entry
    await this.addActivityEntry({
      workspaceId,
      userId: data.ownerId,
      userName: 'Owner',
      type: 'WORKSPACE_UPDATED',
      message: `Workspace "${data.name}" was created`,
    });

    return workspace;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    return this.workspaces.get(workspaceId) || null;
  }

  async updateWorkspace(
    workspaceId: string,
    updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>
  ): Promise<Workspace> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const updated: Workspace = {
      ...workspace,
      ...updates,
      updatedAt: new Date(),
    };

    this.workspaces.set(workspaceId, updated);
    return updated;
  }

  async addWorkspaceMember(
    workspaceId: string,
    userId: string,
    role: WorkspaceMember['role'],
    hourlyRate?: number,
    currency?: string
  ): Promise<Workspace> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const existingMember = workspace.members.find(m => m.userId === userId);
    if (existingMember) {
      throw new Error('User is already a member');
    }

    const permissionsMap: Record<WorkspaceMember['role'], MemberPermissions> = {
      OWNER: {
        canManageMembers: true,
        canManageTasks: true,
        canTrackTime: false,
        canViewReports: true,
        canApproveTime: true,
        canAccessFiles: true,
        canCreateInvoices: true,
      },
      ADMIN: {
        canManageMembers: true,
        canManageTasks: true,
        canTrackTime: true,
        canViewReports: true,
        canApproveTime: true,
        canAccessFiles: true,
        canCreateInvoices: true,
      },
      MEMBER: {
        canManageMembers: false,
        canManageTasks: false,
        canTrackTime: true,
        canViewReports: false,
        canApproveTime: false,
        canAccessFiles: true,
        canCreateInvoices: false,
      },
      VIEWER: {
        canManageMembers: false,
        canManageTasks: false,
        canTrackTime: false,
        canViewReports: true,
        canApproveTime: false,
        canAccessFiles: true,
        canCreateInvoices: false,
      },
    };

    const newMember: WorkspaceMember = {
      userId,
      role,
      joinedAt: new Date(),
      permissions: permissionsMap[role],
      hourlyRate,
      currency,
    };

    workspace.members.push(newMember);
    workspace.updatedAt = new Date();
    this.workspaces.set(workspaceId, workspace);

    await this.addActivityEntry({
      workspaceId,
      userId,
      userName: userId,
      type: 'MEMBER_JOINED',
      message: `${userId} joined the workspace as ${role}`,
    });

    return workspace;
  }

  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<Workspace> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const memberIndex = workspace.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      throw new Error('User is not a member');
    }

    if (workspace.members[memberIndex].role === 'OWNER') {
      throw new Error('Cannot remove workspace owner');
    }

    workspace.members.splice(memberIndex, 1);
    workspace.updatedAt = new Date();
    this.workspaces.set(workspaceId, workspace);

    await this.addActivityEntry({
      workspaceId,
      userId,
      userName: userId,
      type: 'MEMBER_LEFT',
      message: `${userId} left the workspace`,
    });

    return workspace;
  }

  // ===== TIME TRACKING =====

  async startTimeTracking(data: {
    workspaceId: string;
    userId: string;
    taskId?: string;
    description: string;
    hourlyRate: number;
    currency: string;
  }): Promise<TimeEntry> {
    const workspace = this.workspaces.get(data.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Check if user has active tracking session
    const existingActive = Array.from(this.timeEntries.values()).find(
      e => e.workspaceId === data.workspaceId &&
           e.userId === data.userId &&
           e.status === 'TRACKING'
    );
    if (existingActive) {
      throw new Error('User already has an active time tracking session');
    }

    const entryId = `te-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entry: TimeEntry = {
      id: entryId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      taskId: data.taskId,
      description: data.description,
      startTime: new Date(),
      duration: 0,
      hourlyRate: data.hourlyRate,
      currency: data.currency,
      amount: 0,
      status: 'TRACKING',
      screenshots: [],
      activityLevel: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.timeEntries.set(entryId, entry);

    // Update task status if linked
    if (data.taskId) {
      const task = this.tasks.get(data.taskId);
      if (task && task.status === 'TODO') {
        task.status = 'IN_PROGRESS';
        task.updatedAt = new Date();
        this.tasks.set(data.taskId, task);
      }
    }

    return entry;
  }

  async pauseTimeTracking(entryId: string): Promise<TimeEntry> {
    const entry = this.timeEntries.get(entryId);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.status !== 'TRACKING') {
      throw new Error('Time entry is not currently tracking');
    }

    const now = new Date();
    const elapsed = Math.floor((now.getTime() - entry.startTime.getTime()) / 60000);

    entry.duration = elapsed;
    entry.amount = (elapsed / 60) * entry.hourlyRate;
    entry.status = 'PAUSED';
    entry.updatedAt = now;

    this.timeEntries.set(entryId, entry);
    return entry;
  }

  async resumeTimeTracking(entryId: string): Promise<TimeEntry> {
    const entry = this.timeEntries.get(entryId);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.status !== 'PAUSED') {
      throw new Error('Time entry is not paused');
    }

    // Start fresh from now, preserving existing duration
    entry.startTime = new Date(Date.now() - entry.duration * 60000);
    entry.status = 'TRACKING';
    entry.updatedAt = new Date();

    this.timeEntries.set(entryId, entry);
    return entry;
  }

  async stopTimeTracking(entryId: string): Promise<TimeEntry> {
    const entry = this.timeEntries.get(entryId);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.status !== 'TRACKING' && entry.status !== 'PAUSED') {
      throw new Error('Time entry is not active');
    }

    const now = new Date();
    const elapsed = entry.status === 'TRACKING'
      ? Math.floor((now.getTime() - entry.startTime.getTime()) / 60000)
      : entry.duration;

    entry.endTime = now;
    entry.duration = elapsed;
    entry.amount = (elapsed / 60) * entry.hourlyRate;
    entry.status = 'COMPLETED';
    entry.updatedAt = now;

    this.timeEntries.set(entryId, entry);

    // Update task tracked hours
    if (entry.taskId) {
      const task = this.tasks.get(entry.taskId);
      if (task) {
        task.trackedHours += elapsed / 60;
        task.updatedAt = now;
        this.tasks.set(entry.taskId, task);
      }
    }

    const workspace = this.workspaces.get(entry.workspaceId);
    await this.addActivityEntry({
      workspaceId: entry.workspaceId,
      userId: entry.userId,
      userName: entry.userId,
      type: 'TIME_LOGGED',
      entityId: entryId,
      entityType: 'TIME_ENTRY',
      message: `Logged ${(elapsed / 60).toFixed(2)} hours on "${entry.description}"`,
      metadata: { hours: elapsed / 60, amount: entry.amount, currency: entry.currency },
    });

    return entry;
  }

  async addScreenshot(
    entryId: string,
    screenshot: Omit<Screenshot, 'id' | 'timeEntryId'>
  ): Promise<TimeEntry> {
    const entry = this.timeEntries.get(entryId);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    const screenshotId = `ss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    entry.screenshots.push({
      id: screenshotId,
      timeEntryId: entryId,
      ...screenshot,
    });

    // Update activity level based on screenshots
    const avgActivity = entry.screenshots.reduce((sum, s) => sum + s.activityLevel, 0) / entry.screenshots.length;
    entry.activityLevel = Math.round(avgActivity);
    entry.updatedAt = new Date();

    this.timeEntries.set(entryId, entry);
    return entry;
  }

  async approveTimeEntry(entryId: string, approverId: string): Promise<TimeEntry> {
    const entry = this.timeEntries.get(entryId);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.status !== 'COMPLETED') {
      throw new Error('Only completed time entries can be approved');
    }

    entry.status = 'APPROVED';
    entry.approvedBy = approverId;
    entry.approvedAt = new Date();
    entry.updatedAt = new Date();

    this.timeEntries.set(entryId, entry);

    await this.addActivityEntry({
      workspaceId: entry.workspaceId,
      userId: approverId,
      userName: approverId,
      type: 'TIME_APPROVED',
      entityId: entryId,
      entityType: 'TIME_ENTRY',
      message: `Approved ${(entry.duration / 60).toFixed(2)} hours from ${entry.userId}`,
    });

    return entry;
  }

  async rejectTimeEntry(entryId: string, reason: string): Promise<TimeEntry> {
    const entry = this.timeEntries.get(entryId);
    if (!entry) {
      throw new Error('Time entry not found');
    }

    if (entry.status !== 'COMPLETED') {
      throw new Error('Only completed time entries can be rejected');
    }

    entry.status = 'REJECTED';
    entry.rejectionReason = reason;
    entry.updatedAt = new Date();

    this.timeEntries.set(entryId, entry);
    return entry;
  }

  async getTimeEntry(entryId: string): Promise<TimeEntry | null> {
    return this.timeEntries.get(entryId) || null;
  }

  async getTimeEntriesForWorkspace(
    workspaceId: string,
    filters?: {
      userId?: string;
      taskId?: string;
      status?: TimeEntry['status'];
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<TimeEntry[]> {
    let entries = Array.from(this.timeEntries.values()).filter(
      e => e.workspaceId === workspaceId
    );

    if (filters?.userId) {
      entries = entries.filter(e => e.userId === filters.userId);
    }
    if (filters?.taskId) {
      entries = entries.filter(e => e.taskId === filters.taskId);
    }
    if (filters?.status) {
      entries = entries.filter(e => e.status === filters.status);
    }
    if (filters?.startDate) {
      entries = entries.filter(e => e.startTime >= filters.startDate!);
    }
    if (filters?.endDate) {
      entries = entries.filter(e => e.startTime <= filters.endDate!);
    }

    return entries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async createManualTimeEntry(data: {
    workspaceId: string;
    userId: string;
    taskId?: string;
    description: string;
    startTime: Date;
    endTime: Date;
    hourlyRate: number;
    currency: string;
    notes?: string;
  }): Promise<TimeEntry> {
    const workspace = this.workspaces.get(data.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const duration = Math.floor((data.endTime.getTime() - data.startTime.getTime()) / 60000);
    const amount = (duration / 60) * data.hourlyRate;

    const entryId = `te-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entry: TimeEntry = {
      id: entryId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      taskId: data.taskId,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      duration,
      hourlyRate: data.hourlyRate,
      currency: data.currency,
      amount,
      status: workspace.settings.requireManualApproval ? 'COMPLETED' : 'APPROVED',
      screenshots: [],
      activityLevel: 0, // Manual entries don't have activity tracking
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.timeEntries.set(entryId, entry);

    // Update task tracked hours
    if (data.taskId) {
      const task = this.tasks.get(data.taskId);
      if (task) {
        task.trackedHours += duration / 60;
        task.updatedAt = new Date();
        this.tasks.set(data.taskId, task);
      }
    }

    return entry;
  }

  // ===== TASK MANAGEMENT =====

  async createTask(data: {
    workspaceId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    estimatedHours?: number;
    priority: Task['priority'];
    dueDate?: Date;
    tags?: string[];
    createdBy: string;
  }): Promise<Task> {
    const workspace = this.workspaces.get(data.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const task: Task = {
      id: taskId,
      workspaceId: data.workspaceId,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId,
      estimatedHours: data.estimatedHours,
      trackedHours: 0,
      status: 'TODO',
      priority: data.priority,
      dueDate: data.dueDate,
      tags: data.tags || [],
      attachments: [],
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(taskId, task);

    await this.addActivityEntry({
      workspaceId: data.workspaceId,
      userId: data.createdBy,
      userName: data.createdBy,
      type: 'TASK_CREATED',
      entityId: taskId,
      entityType: 'TASK',
      message: `Created task "${data.title}"`,
    });

    return task;
  }

  async getTask(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) || null;
  }

  async updateTask(
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'workspaceId' | 'createdBy' | 'createdAt'>>
  ): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const updated: Task = {
      ...task,
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.status === 'COMPLETED' && !task.completedAt) {
      updated.completedAt = new Date();

      await this.addActivityEntry({
        workspaceId: task.workspaceId,
        userId: task.assigneeId || task.createdBy,
        userName: task.assigneeId || task.createdBy,
        type: 'TASK_COMPLETED',
        entityId: taskId,
        entityType: 'TASK',
        message: `Completed task "${task.title}"`,
      });
    }

    this.tasks.set(taskId, updated);
    return updated;
  }

  async getTasksForWorkspace(
    workspaceId: string,
    filters?: {
      status?: Task['status'];
      assigneeId?: string;
      priority?: Task['priority'];
    }
  ): Promise<Task[]> {
    let tasks = Array.from(this.tasks.values()).filter(
      t => t.workspaceId === workspaceId
    );

    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (filters?.assigneeId) {
      tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
    }
    if (filters?.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }

    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async addTaskAttachment(taskId: string, attachment: Omit<TaskAttachment, 'id'>): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    task.attachments.push({
      id: attachmentId,
      ...attachment,
    });
    task.updatedAt = new Date();

    this.tasks.set(taskId, task);

    await this.addActivityEntry({
      workspaceId: task.workspaceId,
      userId: attachment.uploadedBy,
      userName: attachment.uploadedBy,
      type: 'FILE_UPLOADED',
      entityId: attachmentId,
      entityType: 'FILE',
      message: `Uploaded "${attachment.filename}" to task "${task.title}"`,
    });

    return task;
  }

  // ===== NDA MANAGEMENT =====

  async generateNDA(data: {
    workspaceId: string;
    templateType: NDADocument['templateType'];
    parties: Omit<NDAParty, 'signedAt' | 'signatureHash' | 'ipAddress'>[];
    confidentialityPeriod?: number;
    governingLaw?: string;
    jurisdiction?: string;
    perpetual?: boolean;
    expirationDate?: Date;
  }): Promise<NDADocument> {
    const workspace = this.workspaces.get(data.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const ndaId = `nda-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const templateContent = this.getNDATemplateContent(data.templateType, data.parties);

    const nda: NDADocument = {
      id: ndaId,
      workspaceId: data.workspaceId,
      templateType: data.templateType,
      title: `Non-Disclosure Agreement - ${workspace.name}`,
      content: templateContent,
      parties: data.parties.map(p => ({
        ...p,
        signedAt: undefined,
        signatureHash: undefined,
        ipAddress: undefined,
      })),
      effectiveDate: new Date(),
      expirationDate: data.expirationDate,
      perpetual: data.perpetual ?? false,
      confidentialityPeriod: data.confidentialityPeriod ?? 3,
      governingLaw: data.governingLaw ?? 'Romanian Law',
      jurisdiction: data.jurisdiction ?? 'Courts of Bucharest, Romania',
      status: 'DRAFT',
      createdAt: new Date(),
    };

    this.ndaDocuments.set(ndaId, nda);
    return nda;
  }

  private getNDATemplateContent(
    type: NDADocument['templateType'],
    parties: Omit<NDAParty, 'signedAt' | 'signatureHash' | 'ipAddress'>[]
  ): string {
    const partyNames = parties.map(p => p.name).join(' and ');

    const templates: Record<NDADocument['templateType'], string> = {
      STANDARD: `
NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into by and between ${partyNames}.

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by either party, including but not limited to technical, business, financial, and operational information.

2. OBLIGATIONS
The receiving party agrees to:
- Keep Confidential Information strictly confidential
- Not disclose to any third party without prior written consent
- Use only for the purposes of the business relationship
- Return or destroy upon request

3. EXCLUSIONS
This Agreement does not apply to information that:
- Is publicly available
- Was known prior to disclosure
- Is independently developed
- Is required by law to be disclosed

4. TERM
This Agreement shall remain in effect for the confidentiality period specified.

5. GOVERNING LAW
This Agreement shall be governed by the laws specified herein.
      `,
      MUTUAL: `
MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into by and between ${partyNames}.

Both parties agree to protect each other's Confidential Information with the same standard of care.

[Full mutual NDA terms would be included here]
      `,
      UNILATERAL: `
UNILATERAL NON-DISCLOSURE AGREEMENT

This Unilateral Non-Disclosure Agreement ("Agreement") is entered into by and between ${partyNames}.

The Discloser shares information, and the Recipient agrees to maintain confidentiality.

[Full unilateral NDA terms would be included here]
      `,
      CUSTOM: `
CUSTOM NON-DISCLOSURE AGREEMENT

This Custom Non-Disclosure Agreement shall be tailored based on specific requirements.

Parties: ${partyNames}

[Custom terms to be added]
      `,
    };

    return templates[type];
  }

  async signNDA(
    ndaId: string,
    partyEmail: string,
    signatureHash: string,
    ipAddress?: string
  ): Promise<NDADocument> {
    const nda = this.ndaDocuments.get(ndaId);
    if (!nda) {
      throw new Error('NDA not found');
    }

    const partyIndex = nda.parties.findIndex(p => p.email === partyEmail);
    if (partyIndex === -1) {
      throw new Error('Party not found in NDA');
    }

    if (nda.parties[partyIndex].signedAt) {
      throw new Error('Party has already signed');
    }

    nda.parties[partyIndex].signedAt = new Date();
    nda.parties[partyIndex].signatureHash = signatureHash;
    nda.parties[partyIndex].ipAddress = ipAddress;

    // Check if all parties have signed
    const allSigned = nda.parties.every(p => p.signedAt);
    if (allSigned) {
      nda.status = 'FULLY_EXECUTED';
      nda.executedAt = new Date();
    } else {
      nda.status = 'PARTIALLY_SIGNED';
    }

    this.ndaDocuments.set(ndaId, nda);

    await this.addActivityEntry({
      workspaceId: nda.workspaceId,
      userId: partyEmail,
      userName: nda.parties[partyIndex].name,
      type: 'NDA_SIGNED',
      entityId: ndaId,
      entityType: 'NDA',
      message: `${nda.parties[partyIndex].name} signed the NDA`,
    });

    return nda;
  }

  async getNDA(ndaId: string): Promise<NDADocument | null> {
    return this.ndaDocuments.get(ndaId) || null;
  }

  async getNDAsForWorkspace(workspaceId: string): Promise<NDADocument[]> {
    return Array.from(this.ndaDocuments.values()).filter(
      n => n.workspaceId === workspaceId
    );
  }

  async sendNDAForSignature(ndaId: string): Promise<NDADocument> {
    const nda = this.ndaDocuments.get(ndaId);
    if (!nda) {
      throw new Error('NDA not found');
    }

    if (nda.status !== 'DRAFT') {
      throw new Error('NDA is not in draft status');
    }

    nda.status = 'PENDING_SIGNATURES';
    this.ndaDocuments.set(ndaId, nda);

    // In production, this would send email notifications to all parties
    return nda;
  }

  // ===== IP AGREEMENT MANAGEMENT =====

  async createIPAgreement(data: {
    workspaceId: string;
    contractId?: string;
    type: IPAgreement['type'];
    ownership: IPAgreement['ownership'];
    scope: string;
    exclusions?: string[];
    licensedRights?: LicenseRights;
    customTerms?: string;
    parties: Omit<IPParty, 'acknowledgedAt'>[];
  }): Promise<IPAgreement> {
    const workspace = this.workspaces.get(data.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const ipId = `ip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const agreement: IPAgreement = {
      id: ipId,
      workspaceId: data.workspaceId,
      contractId: data.contractId,
      type: data.type,
      ownership: data.ownership,
      scope: data.scope,
      exclusions: data.exclusions,
      licensedRights: data.licensedRights,
      customTerms: data.customTerms,
      parties: data.parties.map(p => ({
        ...p,
        acknowledgedAt: undefined,
      })),
      effectiveDate: new Date(),
      status: 'DRAFT',
      createdAt: new Date(),
    };

    this.ipAgreements.set(ipId, agreement);
    return agreement;
  }

  async acknowledgeIPAgreement(
    agreementId: string,
    partyEmail: string
  ): Promise<IPAgreement> {
    const agreement = this.ipAgreements.get(agreementId);
    if (!agreement) {
      throw new Error('IP Agreement not found');
    }

    const partyIndex = agreement.parties.findIndex(p => p.email === partyEmail);
    if (partyIndex === -1) {
      throw new Error('Party not found in agreement');
    }

    agreement.parties[partyIndex].acknowledgedAt = new Date();

    // Check if all parties have acknowledged
    const allAcknowledged = agreement.parties.every(p => p.acknowledgedAt);
    if (allAcknowledged) {
      agreement.status = 'ACTIVE';
    }

    this.ipAgreements.set(agreementId, agreement);
    return agreement;
  }

  async getIPAgreement(agreementId: string): Promise<IPAgreement | null> {
    return this.ipAgreements.get(agreementId) || null;
  }

  async getIPAgreementsForWorkspace(workspaceId: string): Promise<IPAgreement[]> {
    return Array.from(this.ipAgreements.values()).filter(
      a => a.workspaceId === workspaceId
    );
  }

  // ===== ACTIVITY FEED =====

  private async addActivityEntry(data: {
    workspaceId: string;
    userId: string;
    userName: string;
    type: ActivityFeedItem['type'];
    entityId?: string;
    entityType?: ActivityFeedItem['entityType'];
    message: string;
    metadata?: Record<string, any>;
  }): Promise<ActivityFeedItem> {
    const entryId = `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const entry: ActivityFeedItem = {
      id: entryId,
      workspaceId: data.workspaceId,
      userId: data.userId,
      userName: data.userName,
      type: data.type,
      entityId: data.entityId,
      entityType: data.entityType,
      message: data.message,
      metadata: data.metadata,
      createdAt: new Date(),
    };

    this.activityFeed.set(entryId, entry);
    return entry;
  }

  async getActivityFeed(
    workspaceId: string,
    limit: number = 50
  ): Promise<ActivityFeedItem[]> {
    const entries = Array.from(this.activityFeed.values())
      .filter(e => e.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return entries.slice(0, limit);
  }

  // ===== INVOICING =====

  async generateInvoiceFromTimeEntries(data: {
    workspaceId: string;
    freelancerId: string;
    clientId: string;
    periodStart: Date;
    periodEnd: Date;
    vatRate?: number;
    notes?: string;
  }): Promise<WorkspaceInvoice> {
    const workspace = this.workspaces.get(data.workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Get approved time entries for the period
    const entries = Array.from(this.timeEntries.values()).filter(
      e => e.workspaceId === data.workspaceId &&
           e.userId === data.freelancerId &&
           e.status === 'APPROVED' &&
           e.startTime >= data.periodStart &&
           e.startTime <= data.periodEnd
    );

    if (entries.length === 0) {
      throw new Error('No approved time entries found for the period');
    }

    const totalHours = entries.reduce((sum, e) => sum + e.duration, 0) / 60;
    const subtotal = entries.reduce((sum, e) => sum + e.amount, 0);
    const currency = entries[0].currency;
    const vatRate = data.vatRate ?? 19; // Romanian standard VAT
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    const invoiceId = `winv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const invoiceNumber = `WS-${new Date().getFullYear()}-${String(this.invoices.size + 1).padStart(5, '0')}`;

    const invoice: WorkspaceInvoice = {
      id: invoiceId,
      workspaceId: data.workspaceId,
      contractId: workspace.contractId,
      invoiceNumber,
      freelancerId: data.freelancerId,
      clientId: data.clientId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      timeEntries: entries.map(e => e.id),
      totalHours,
      subtotal,
      vatRate,
      vatAmount,
      total,
      currency,
      status: 'DRAFT',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      notes: data.notes,
      createdAt: new Date(),
    };

    this.invoices.set(invoiceId, invoice);

    // Mark time entries as invoiced
    entries.forEach(e => {
      e.status = 'INVOICED';
      e.invoiceId = invoiceId;
      this.timeEntries.set(e.id, e);
    });

    await this.addActivityEntry({
      workspaceId: data.workspaceId,
      userId: data.freelancerId,
      userName: data.freelancerId,
      type: 'INVOICE_GENERATED',
      entityId: invoiceId,
      entityType: 'INVOICE',
      message: `Generated invoice ${invoiceNumber} for ${totalHours.toFixed(2)} hours (${total.toFixed(2)} ${currency})`,
    });

    return invoice;
  }

  async getInvoice(invoiceId: string): Promise<WorkspaceInvoice | null> {
    return this.invoices.get(invoiceId) || null;
  }

  async getInvoicesForWorkspace(workspaceId: string): Promise<WorkspaceInvoice[]> {
    return Array.from(this.invoices.values()).filter(
      i => i.workspaceId === workspaceId
    );
  }

  async updateInvoiceStatus(
    invoiceId: string,
    status: WorkspaceInvoice['status'],
    eFacturaId?: string
  ): Promise<WorkspaceInvoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.status = status;
    if (status === 'PAID') {
      invoice.paidAt = new Date();
    }
    if (eFacturaId) {
      invoice.eFacturaId = eFacturaId;
    }

    this.invoices.set(invoiceId, invoice);
    return invoice;
  }

  // ===== REPORTS =====

  async generateTimeReport(
    workspaceId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<TimeReport> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const entries = Array.from(this.timeEntries.values()).filter(
      e => e.workspaceId === workspaceId &&
           e.startTime >= periodStart &&
           e.startTime <= periodEnd
    );

    const tasks = Array.from(this.tasks.values()).filter(
      t => t.workspaceId === workspaceId
    );

    const totalHours = entries.reduce((sum, e) => sum + e.duration, 0) / 60;
    const billableHours = entries
      .filter(e => ['APPROVED', 'INVOICED'].includes(e.status))
      .reduce((sum, e) => sum + e.duration, 0) / 60;
    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
    const currency = entries[0]?.currency || 'EUR';

    // Group by member
    const memberStats = new Map<string, MemberTimeStats>();
    entries.forEach(e => {
      const existing = memberStats.get(e.userId) || {
        userId: e.userId,
        userName: e.userId,
        hours: 0,
        amount: 0,
        averageActivity: 0,
        tasksCompleted: 0,
      };
      existing.hours += e.duration / 60;
      existing.amount += e.amount;
      existing.averageActivity = (existing.averageActivity + e.activityLevel) / 2;
      memberStats.set(e.userId, existing);
    });

    // Count completed tasks per member
    tasks.filter(t => t.status === 'COMPLETED').forEach(t => {
      if (t.assigneeId) {
        const stats = memberStats.get(t.assigneeId);
        if (stats) {
          stats.tasksCompleted++;
        }
      }
    });

    // Task stats
    const taskStats: TaskTimeStats[] = tasks.map(t => {
      const taskEntries = entries.filter(e => e.taskId === t.id);
      const actualHours = taskEntries.reduce((sum, e) => sum + e.duration, 0) / 60;
      const variance = t.estimatedHours
        ? ((actualHours - t.estimatedHours) / t.estimatedHours) * 100
        : 0;

      return {
        taskId: t.id,
        taskTitle: t.title,
        estimatedHours: t.estimatedHours || 0,
        actualHours,
        variance,
        status: t.status,
      };
    });

    // Daily stats
    const dailyMap = new Map<string, DailyTimeStats>();
    entries.forEach(e => {
      const dateKey = e.startTime.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || {
        date: dateKey,
        hours: 0,
        amount: 0,
        entries: 0,
        averageActivity: 0,
      };
      existing.hours += e.duration / 60;
      existing.amount += e.amount;
      existing.entries++;
      existing.averageActivity = (existing.averageActivity + e.activityLevel) / 2;
      dailyMap.set(dateKey, existing);
    });

    const avgActivity = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.activityLevel, 0) / entries.length
      : 0;

    const screenshotCount = entries.reduce((sum, e) => sum + e.screenshots.length, 0);

    const approvedCount = entries.filter(e => ['APPROVED', 'INVOICED'].includes(e.status)).length;
    const approvalRate = entries.length > 0 ? (approvedCount / entries.length) * 100 : 0;

    return {
      workspaceId,
      periodStart,
      periodEnd,
      totalHours,
      billableHours,
      totalAmount,
      currency,
      byMember: Array.from(memberStats.values()),
      byTask: taskStats,
      byDay: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      averageActivityLevel: avgActivity,
      screenshots: screenshotCount,
      approvalRate,
    };
  }

  // ===== REFERENCE DATA =====

  getDefaultWorkspaceSettings(): WorkspaceSettings {
    return {
      requireScreenshots: true,
      screenshotInterval: 10,
      activityTracking: true,
      idleTimeout: 5,
      requireManualApproval: true,
      autoInvoicing: false,
      invoicingSchedule: 'MONTHLY',
      ndaRequired: true,
      ipClauseType: 'CLIENT_OWNS_ALL',
      overtimeMultiplier: 1.5,
      maxDailyHours: 10,
      maxWeeklyHours: 48, // EU Working Time Directive
    };
  }

  getIPAgreementTypes(): { type: IPAgreement['type']; description: string }[] {
    return [
      {
        type: 'WORK_FOR_HIRE',
        description: 'All IP created belongs to the client from creation',
      },
      {
        type: 'LICENSE',
        description: 'Creator retains ownership but grants license to use',
      },
      {
        type: 'ASSIGNMENT',
        description: 'IP ownership is transferred after creation',
      },
      {
        type: 'JOINT_OWNERSHIP',
        description: 'Both parties share ownership of created IP',
      },
      {
        type: 'CUSTOM',
        description: 'Custom terms defined by parties',
      },
    ];
  }

  getNDATemplateTypes(): { type: NDADocument['templateType']; description: string }[] {
    return [
      {
        type: 'STANDARD',
        description: 'Standard one-way confidentiality agreement',
      },
      {
        type: 'MUTUAL',
        description: 'Both parties share and protect confidential information',
      },
      {
        type: 'UNILATERAL',
        description: 'Only one party discloses confidential information',
      },
      {
        type: 'CUSTOM',
        description: 'Custom NDA with specific terms',
      },
    ];
  }
}
