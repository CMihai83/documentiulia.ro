import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Task Types
export interface Task {
  id: string;
  tenantId: string;
  projectId?: string;

  // Task info
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;

  // Assignment
  assigneeId?: string;
  assigneeName?: string;
  reporterId: string;
  reporterName?: string;
  watchers: string[];

  // Dates
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Time tracking
  estimatedHours?: number;
  loggedHours: number;
  remainingHours?: number;

  // Organization
  tags: string[];
  labels: TaskLabel[];
  parentTaskId?: string;
  subtaskIds: string[];

  // Progress
  progress: number; // 0-100

  // Attachments & Links
  attachments: TaskAttachment[];
  linkedTasks: LinkedTask[];

  // Custom fields
  customFields: Record<string, any>;

  // Recurrence
  isRecurring: boolean;
  recurrence?: TaskRecurrence;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'lowest' | 'low' | 'medium' | 'high' | 'highest';
export type TaskType = 'task' | 'bug' | 'story' | 'epic' | 'feature' | 'improvement' | 'subtask';

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface LinkedTask {
  taskId: string;
  type: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' | 'duplicated_by';
}

export interface TaskRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[]; // 0-6
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  userId: string;
  userName?: string;
  mentions: string[];
  attachments: TaskAttachment[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedAt: Date;
}

export interface TaskFilters {
  search?: string;
  projectId?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  type?: TaskType | TaskType[];
  assigneeId?: string;
  reporterId?: string;
  tags?: string[];
  labels?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  isOverdue?: boolean;
  hasSubtasks?: boolean;
  parentTaskId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  private tasks = new Map<string, Task>();
  private comments = new Map<string, TaskComment>();
  private history = new Map<string, TaskHistory>();
  private labels = new Map<string, TaskLabel>();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultLabels();
  }

  private initializeDefaultLabels(): void {
    const defaultLabels: Omit<TaskLabel, 'id'>[] = [
      { name: 'Bug', color: '#ef4444' },
      { name: 'Feature', color: '#3b82f6' },
      { name: 'Enhancement', color: '#8b5cf6' },
      { name: 'Documentation', color: '#06b6d4' },
      { name: 'Help Wanted', color: '#22c55e' },
      { name: 'Priority', color: '#f97316' },
      { name: 'Blocked', color: '#dc2626' },
      { name: 'In Review', color: '#eab308' },
    ];

    defaultLabels.forEach((label, index) => {
      const id = `label-default-${index + 1}`;
      this.labels.set(id, { ...label, id });
    });
  }

  // =================== TASKS ===================

  async createTask(data: {
    tenantId: string;
    projectId?: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    assigneeId?: string;
    assigneeName?: string;
    reporterId: string;
    reporterName?: string;
    dueDate?: Date;
    startDate?: Date;
    estimatedHours?: number;
    tags?: string[];
    labels?: TaskLabel[];
    parentTaskId?: string;
    customFields?: Record<string, any>;
  }): Promise<Task> {
    const task: Task = {
      id: uuidv4(),
      tenantId: data.tenantId,
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      type: data.type || 'task',
      assigneeId: data.assigneeId,
      assigneeName: data.assigneeName,
      reporterId: data.reporterId,
      reporterName: data.reporterName,
      watchers: [data.reporterId],
      dueDate: data.dueDate,
      startDate: data.startDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedHours: data.estimatedHours,
      loggedHours: 0,
      tags: data.tags || [],
      labels: data.labels || [],
      subtaskIds: [],
      progress: 0,
      attachments: [],
      linkedTasks: [],
      customFields: data.customFields || {},
      isRecurring: false,
    };

    // If subtask, add to parent
    if (data.parentTaskId) {
      task.parentTaskId = data.parentTaskId;
      task.type = 'subtask';
      const parent = this.tasks.get(data.parentTaskId);
      if (parent) {
        parent.subtaskIds.push(task.id);
        this.tasks.set(data.parentTaskId, parent);
      }
    }

    this.tasks.set(task.id, task);

    this.eventEmitter.emit('task.created', {
      taskId: task.id,
      tenantId: data.tenantId,
      projectId: data.projectId,
    });

    return task;
  }

  async getTasks(tenantId: string, filters?: TaskFilters): Promise<{
    tasks: Task[];
    total: number;
  }> {
    let tasks = Array.from(this.tasks.values())
      .filter(t => t.tenantId === tenantId);

    // Apply filters
    if (filters) {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        tasks = tasks.filter(t =>
          t.title.toLowerCase().includes(search) ||
          t.description?.toLowerCase().includes(search)
        );
      }
      if (filters.projectId) tasks = tasks.filter(t => t.projectId === filters.projectId);
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        tasks = tasks.filter(t => statuses.includes(t.status));
      }
      if (filters.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
        tasks = tasks.filter(t => priorities.includes(t.priority));
      }
      if (filters.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        tasks = tasks.filter(t => types.includes(t.type));
      }
      if (filters.assigneeId) tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
      if (filters.reporterId) tasks = tasks.filter(t => t.reporterId === filters.reporterId);
      if (filters.tags?.length) tasks = tasks.filter(t => filters.tags!.some(tag => t.tags.includes(tag)));
      if (filters.labels?.length) tasks = tasks.filter(t => filters.labels!.some(l => t.labels.some(tl => tl.id === l)));
      if (filters.dueDateFrom) tasks = tasks.filter(t => t.dueDate && t.dueDate >= filters.dueDateFrom!);
      if (filters.dueDateTo) tasks = tasks.filter(t => t.dueDate && t.dueDate <= filters.dueDateTo!);
      if (filters.isOverdue) {
        const now = new Date();
        tasks = tasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'done' && t.status !== 'cancelled');
      }
      if (filters.hasSubtasks !== undefined) {
        tasks = tasks.filter(t => filters.hasSubtasks ? t.subtaskIds.length > 0 : t.subtaskIds.length === 0);
      }
      if (filters.parentTaskId !== undefined) {
        tasks = tasks.filter(t => t.parentTaskId === filters.parentTaskId);
      }
    }

    const total = tasks.length;

    // Sort
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';
    tasks.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      if (sortOrder === 'desc') return bVal > aVal ? 1 : -1;
      return aVal > bVal ? 1 : -1;
    });

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    tasks = tasks.slice(offset, offset + limit);

    return { tasks, total };
  }

  async getTask(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async updateTask(
    id: string,
    updates: Partial<Pick<Task,
      'title' | 'description' | 'status' | 'priority' | 'type' |
      'assigneeId' | 'assigneeName' | 'dueDate' | 'startDate' |
      'estimatedHours' | 'tags' | 'labels' | 'progress' | 'customFields'
    >>,
    updatedBy: string,
  ): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) return null;

    // Track changes
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = (task as any)[field];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        await this.recordHistory({
          taskId: id,
          field,
          oldValue,
          newValue,
          changedBy: updatedBy,
        });
      }
    }

    // Handle status change
    if (updates.status && updates.status !== task.status) {
      if (updates.status === 'done') {
        task.completedAt = new Date();
        task.progress = 100;
      } else if (updates.status === 'in_progress' && !task.startDate) {
        task.startDate = new Date();
      }
    }

    Object.assign(task, updates, { updatedAt: new Date() });
    this.tasks.set(id, task);

    this.eventEmitter.emit('task.updated', {
      taskId: id,
      updates,
      updatedBy,
    });

    return task;
  }

  async deleteTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) return;

    // Remove from parent
    if (task.parentTaskId) {
      const parent = this.tasks.get(task.parentTaskId);
      if (parent) {
        parent.subtaskIds = parent.subtaskIds.filter(s => s !== id);
        this.tasks.set(task.parentTaskId, parent);
      }
    }

    // Delete subtasks
    for (const subtaskId of task.subtaskIds) {
      await this.deleteTask(subtaskId);
    }

    // Delete related data
    for (const [commentId, comment] of this.comments) {
      if (comment.taskId === id) this.comments.delete(commentId);
    }
    for (const [historyId, h] of this.history) {
      if (h.taskId === id) this.history.delete(historyId);
    }

    this.tasks.delete(id);
  }

  async moveTask(taskId: string, status: TaskStatus, movedBy: string): Promise<Task | null> {
    return this.updateTask(taskId, { status }, movedBy);
  }

  async assignTask(taskId: string, assigneeId: string, assigneeName?: string, assignedBy?: string): Promise<Task | null> {
    return this.updateTask(taskId, { assigneeId, assigneeName }, assignedBy || 'system');
  }

  async unassignTask(taskId: string, unassignedBy: string): Promise<Task | null> {
    return this.updateTask(taskId, { assigneeId: undefined, assigneeName: undefined }, unassignedBy);
  }

  // =================== SUBTASKS ===================

  async getSubtasks(parentTaskId: string): Promise<Task[]> {
    const parent = this.tasks.get(parentTaskId);
    if (!parent) return [];

    return parent.subtaskIds
      .map(id => this.tasks.get(id))
      .filter(Boolean) as Task[];
  }

  async convertToSubtask(taskId: string, parentTaskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    const parent = this.tasks.get(parentTaskId);
    if (!task || !parent) return null;

    // Remove from old parent if exists
    if (task.parentTaskId) {
      const oldParent = this.tasks.get(task.parentTaskId);
      if (oldParent) {
        oldParent.subtaskIds = oldParent.subtaskIds.filter(s => s !== taskId);
        this.tasks.set(task.parentTaskId, oldParent);
      }
    }

    task.parentTaskId = parentTaskId;
    task.type = 'subtask';
    parent.subtaskIds.push(taskId);

    this.tasks.set(taskId, task);
    this.tasks.set(parentTaskId, parent);

    return task;
  }

  async promoteToTask(taskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task || !task.parentTaskId) return null;

    const parent = this.tasks.get(task.parentTaskId);
    if (parent) {
      parent.subtaskIds = parent.subtaskIds.filter(s => s !== taskId);
      this.tasks.set(task.parentTaskId, parent);
    }

    task.parentTaskId = undefined;
    task.type = 'task';
    this.tasks.set(taskId, task);

    return task;
  }

  // =================== LINKED TASKS ===================

  async linkTasks(taskId: string, linkedTaskId: string, type: LinkedTask['type']): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    const linkedTask = this.tasks.get(linkedTaskId);
    if (!task || !linkedTask) return null;

    // Add link
    task.linkedTasks.push({ taskId: linkedTaskId, type });

    // Add reverse link
    const reverseType = this.getReverseLinkedType(type);
    linkedTask.linkedTasks.push({ taskId, type: reverseType });

    this.tasks.set(taskId, task);
    this.tasks.set(linkedTaskId, linkedTask);

    return task;
  }

  async unlinkTasks(taskId: string, linkedTaskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    const linkedTask = this.tasks.get(linkedTaskId);
    if (!task || !linkedTask) return null;

    task.linkedTasks = task.linkedTasks.filter(l => l.taskId !== linkedTaskId);
    linkedTask.linkedTasks = linkedTask.linkedTasks.filter(l => l.taskId !== taskId);

    this.tasks.set(taskId, task);
    this.tasks.set(linkedTaskId, linkedTask);

    return task;
  }

  private getReverseLinkedType(type: LinkedTask['type']): LinkedTask['type'] {
    switch (type) {
      case 'blocks': return 'blocked_by';
      case 'blocked_by': return 'blocks';
      case 'duplicates': return 'duplicated_by';
      case 'duplicated_by': return 'duplicates';
      default: return 'relates_to';
    }
  }

  // =================== COMMENTS ===================

  async addComment(data: {
    taskId: string;
    content: string;
    userId: string;
    userName?: string;
    mentions?: string[];
    attachments?: TaskAttachment[];
  }): Promise<TaskComment> {
    const comment: TaskComment = {
      id: uuidv4(),
      taskId: data.taskId,
      content: data.content,
      userId: data.userId,
      userName: data.userName,
      mentions: data.mentions || [],
      attachments: data.attachments || [],
      createdAt: new Date(),
    };

    this.comments.set(comment.id, comment);

    // Update task
    const task = this.tasks.get(data.taskId);
    if (task) {
      task.updatedAt = new Date();
      this.tasks.set(data.taskId, task);
    }

    // Emit mentions
    for (const mentionedUserId of comment.mentions) {
      this.eventEmitter.emit('task.mentioned', {
        taskId: data.taskId,
        mentionedUserId,
        mentionedBy: data.userId,
      });
    }

    return comment;
  }

  async getComments(taskId: string): Promise<TaskComment[]> {
    return Array.from(this.comments.values())
      .filter(c => c.taskId === taskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateComment(id: string, content: string): Promise<TaskComment | null> {
    const comment = this.comments.get(id);
    if (!comment) return null;

    comment.content = content;
    comment.updatedAt = new Date();
    this.comments.set(id, comment);

    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    this.comments.delete(id);
  }

  // =================== HISTORY ===================

  private async recordHistory(data: {
    taskId: string;
    field: string;
    oldValue: any;
    newValue: any;
    changedBy: string;
  }): Promise<TaskHistory> {
    const history: TaskHistory = {
      id: uuidv4(),
      taskId: data.taskId,
      field: data.field,
      oldValue: data.oldValue,
      newValue: data.newValue,
      changedBy: data.changedBy,
      changedAt: new Date(),
    };

    this.history.set(history.id, history);
    return history;
  }

  async getHistory(taskId: string): Promise<TaskHistory[]> {
    return Array.from(this.history.values())
      .filter(h => h.taskId === taskId)
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
  }

  // =================== ATTACHMENTS ===================

  async addAttachment(taskId: string, attachment: Omit<TaskAttachment, 'id'>): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.attachments.push({
      ...attachment,
      id: uuidv4(),
    });
    task.updatedAt = new Date();
    this.tasks.set(taskId, task);

    return task;
  }

  async removeAttachment(taskId: string, attachmentId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.attachments = task.attachments.filter(a => a.id !== attachmentId);
    task.updatedAt = new Date();
    this.tasks.set(taskId, task);

    return task;
  }

  // =================== WATCHERS ===================

  async addWatcher(taskId: string, userId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (!task.watchers.includes(userId)) {
      task.watchers.push(userId);
      this.tasks.set(taskId, task);
    }

    return task;
  }

  async removeWatcher(taskId: string, userId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.watchers = task.watchers.filter(w => w !== userId);
    this.tasks.set(taskId, task);

    return task;
  }

  // =================== LABELS ===================

  async getLabels(tenantId: string): Promise<TaskLabel[]> {
    return Array.from(this.labels.values());
  }

  async createLabel(tenantId: string, label: Omit<TaskLabel, 'id'>): Promise<TaskLabel> {
    const newLabel: TaskLabel = {
      ...label,
      id: uuidv4(),
    };
    this.labels.set(newLabel.id, newLabel);
    return newLabel;
  }

  async deleteLabel(id: string): Promise<void> {
    this.labels.delete(id);
    // Remove from all tasks
    for (const task of this.tasks.values()) {
      task.labels = task.labels.filter(l => l.id !== id);
    }
  }

  // =================== BULK OPERATIONS ===================

  async bulkUpdateTasks(
    taskIds: string[],
    updates: Partial<Pick<Task, 'status' | 'priority' | 'assigneeId' | 'tags'>>,
    updatedBy: string,
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const id of taskIds) {
      const result = await this.updateTask(id, updates, updatedBy);
      if (result) updated++;
      else failed++;
    }

    return { updated, failed };
  }

  async bulkDeleteTasks(taskIds: string[]): Promise<{ deleted: number }> {
    let deleted = 0;
    for (const id of taskIds) {
      if (this.tasks.has(id)) {
        await this.deleteTask(id);
        deleted++;
      }
    }
    return { deleted };
  }

  // =================== STATS ===================

  async getStats(tenantId: string, projectId?: string): Promise<{
    totalTasks: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    overdueTasks: number;
    completedThisWeek: number;
    avgCompletionTime: number;
    unassignedTasks: number;
  }> {
    let tasks = Array.from(this.tasks.values())
      .filter(t => t.tenantId === tenantId);

    if (projectId) {
      tasks = tasks.filter(t => t.projectId === projectId);
    }

    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const byStatus: Record<string, number> = {
      backlog: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, cancelled: 0,
    };
    const byPriority: Record<string, number> = {
      lowest: 0, low: 0, medium: 0, high: 0, highest: 0,
    };

    let overdueTasks = 0;
    let completedThisWeek = 0;
    let totalCompletionTime = 0;
    let completedCount = 0;
    let unassignedTasks = 0;

    for (const task of tasks) {
      byStatus[task.status]++;
      byPriority[task.priority]++;

      if (task.dueDate && task.dueDate < now && task.status !== 'done' && task.status !== 'cancelled') {
        overdueTasks++;
      }

      if (task.completedAt && task.completedAt >= weekAgo) {
        completedThisWeek++;
      }

      if (task.completedAt && task.startDate) {
        const completionTime = Math.ceil((task.completedAt.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
        totalCompletionTime += completionTime;
        completedCount++;
      }

      if (!task.assigneeId) {
        unassignedTasks++;
      }
    }

    return {
      totalTasks: tasks.length,
      byStatus: byStatus as Record<TaskStatus, number>,
      byPriority: byPriority as Record<TaskPriority, number>,
      overdueTasks,
      completedThisWeek,
      avgCompletionTime: completedCount > 0 ? Math.round(totalCompletionTime / completedCount) : 0,
      unassignedTasks,
    };
  }
}
