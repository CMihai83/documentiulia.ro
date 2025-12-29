import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Epic Types
export type EpicStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export interface Epic {
  id: string;
  tenantId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: EpicStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  color?: string;
  startDate?: Date;
  targetDate?: Date;
  completedDate?: Date;
  tags: string[];
  taskIds: string[];
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName?: string;
}

export interface EpicFilters {
  search?: string;
  projectId?: string;
  status?: EpicStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  limit?: number;
  offset?: number;
}

@Injectable()
export class EpicsService {
  private readonly logger = new Logger(EpicsService.name);
  private epics = new Map<string, Epic>();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== EPICS ===================

  async createEpic(data: {
    tenantId: string;
    projectId?: string;
    title: string;
    description?: string;
    status?: EpicStatus;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    startDate?: Date;
    targetDate?: Date;
    color?: string;
    tags?: string[];
    createdBy: string;
    createdByName?: string;
  }): Promise<Epic> {
    try {
      const epic: Epic = {
        id: uuidv4(),
        tenantId: data.tenantId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        status: data.status || 'planning',
        priority: data.priority || 'medium',
        color: data.color || '#3b82f6',
        startDate: data.startDate,
        targetDate: data.targetDate,
        tags: data.tags || [],
        taskIds: [],
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: data.createdBy,
        createdByName: data.createdByName,
      };

      this.epics.set(epic.id, epic);

      this.eventEmitter.emit('epic.created', {
        epicId: epic.id,
        tenantId: data.tenantId,
      });

      this.logger.log(`Epic created: ${epic.id} - ${epic.title}`);

      return epic;
    } catch (error) {
      this.logger.error(`Failed to create epic: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getEpics(tenantId: string, filters?: EpicFilters): Promise<{
    epics: Epic[];
    total: number;
  }> {
    try {
      let epics = Array.from(this.epics.values())
        .filter(e => e.tenantId === tenantId);

      // Apply filters
      if (filters) {
        if (filters.search) {
          const search = filters.search.toLowerCase();
          epics = epics.filter(e =>
            e.title.toLowerCase().includes(search) ||
            e.description?.toLowerCase().includes(search)
          );
        }
        if (filters.projectId) {
          epics = epics.filter(e => e.projectId === filters.projectId);
        }
        if (filters.status) {
          epics = epics.filter(e => e.status === filters.status);
        }
        if (filters.priority) {
          epics = epics.filter(e => e.priority === filters.priority);
        }
        if (filters.tags?.length) {
          epics = epics.filter(e => filters.tags!.some(t => e.tags.includes(t)));
        }
      }

      const total = epics.length;

      // Sort by created date (newest first)
      epics.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Pagination
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      epics = epics.slice(offset, offset + limit);

      return { epics, total };
    } catch (error) {
      this.logger.error(`Failed to fetch epics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getEpic(id: string): Promise<Epic | null> {
    return this.epics.get(id) || null;
  }

  async updateEpic(
    id: string,
    updates: Partial<Omit<Epic, 'id' | 'tenantId' | 'createdAt' | 'createdBy'>>,
    userId: string,
  ): Promise<Epic | null> {
    try {
      const epic = this.epics.get(id);
      if (!epic) return null;

      // Calculate progress if status changed to completed
      if (updates.status === 'completed' && !updates.completedDate) {
        updates.completedDate = new Date();
        updates.progress = 100;
      }

      Object.assign(epic, updates, { updatedAt: new Date() });
      this.epics.set(id, epic);

      this.eventEmitter.emit('epic.updated', {
        epicId: id,
        updates,
        userId,
      });

      this.logger.log(`Epic updated: ${id}`);

      return epic;
    } catch (error) {
      this.logger.error(`Failed to update epic ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteEpic(id: string): Promise<void> {
    try {
      const epic = this.epics.get(id);
      if (!epic) {
        throw new Error('Epic not found');
      }

      this.epics.delete(id);

      this.eventEmitter.emit('epic.deleted', {
        epicId: id,
        tenantId: epic.tenantId,
      });

      this.logger.log(`Epic deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete epic ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async addTasks(epicId: string, taskIds: string[]): Promise<Epic | null> {
    try {
      const epic = this.epics.get(epicId);
      if (!epic) return null;

      // Add tasks (avoid duplicates)
      epic.taskIds = [...new Set([...epic.taskIds, ...taskIds])];
      epic.updatedAt = new Date();

      this.epics.set(epicId, epic);

      this.eventEmitter.emit('epic.tasks.added', {
        epicId,
        taskIds,
      });

      this.logger.log(`Added ${taskIds.length} tasks to epic ${epicId}`);

      return epic;
    } catch (error) {
      this.logger.error(`Failed to add tasks to epic ${epicId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async removeTasks(epicId: string, taskIds: string[]): Promise<Epic | null> {
    try {
      const epic = this.epics.get(epicId);
      if (!epic) return null;

      // Remove tasks
      epic.taskIds = epic.taskIds.filter(id => !taskIds.includes(id));
      epic.updatedAt = new Date();

      this.epics.set(epicId, epic);

      this.eventEmitter.emit('epic.tasks.removed', {
        epicId,
        taskIds,
      });

      this.logger.log(`Removed ${taskIds.length} tasks from epic ${epicId}`);

      return epic;
    } catch (error) {
      this.logger.error(`Failed to remove tasks from epic ${epicId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getEpicStats(epicId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    progress: number;
    daysRemaining: number | null;
    overdue: boolean;
  }> {
    try {
      const epic = this.epics.get(epicId);
      if (!epic) {
        throw new Error('Epic not found');
      }

      // In a real implementation, we would fetch task details
      // For now, return basic stats based on epic data
      const totalTasks = epic.taskIds.length;
      const progress = epic.progress;

      let daysRemaining: number | null = null;
      let overdue = false;

      if (epic.targetDate) {
        const now = new Date();
        const target = new Date(epic.targetDate);
        const diffTime = target.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        overdue = daysRemaining < 0 && epic.status !== 'completed';
      }

      return {
        totalTasks,
        completedTasks: Math.round((totalTasks * progress) / 100),
        inProgressTasks: 0, // Would need task details
        todoTasks: 0, // Would need task details
        progress,
        daysRemaining,
        overdue,
      };
    } catch (error) {
      this.logger.error(`Failed to get epic stats for ${epicId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =================== BULK OPERATIONS ===================

  async bulkUpdateEpics(
    epicIds: string[],
    updates: Partial<Pick<Epic, 'status' | 'priority' | 'tags'>>,
    userId: string,
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const id of epicIds) {
      const epic = await this.updateEpic(id, updates, userId);
      if (epic) {
        updated++;
      } else {
        failed++;
      }
    }

    return { updated, failed };
  }

  async bulkDeleteEpics(epicIds: string[]): Promise<{ deleted: number }> {
    let deleted = 0;

    for (const id of epicIds) {
      try {
        await this.deleteEpic(id);
        deleted++;
      } catch (error) {
        this.logger.error(`Failed to delete epic ${id} in bulk operation`, error);
      }
    }

    return { deleted };
  }

  // =================== STATS ===================

  async getStats(tenantId: string, projectId?: string): Promise<{
    totalEpics: number;
    byStatus: Record<EpicStatus, number>;
    byPriority: Record<string, number>;
    avgProgress: number;
    overdueEpics: number;
  }> {
    const epics = Array.from(this.epics.values())
      .filter(e => e.tenantId === tenantId && (!projectId || e.projectId === projectId));

    const byStatus: Record<string, number> = {
      planning: 0,
      in_progress: 0,
      on_hold: 0,
      completed: 0,
      cancelled: 0,
    };

    const byPriority: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalProgress = 0;
    let overdueCount = 0;
    const now = new Date();

    for (const epic of epics) {
      byStatus[epic.status] = (byStatus[epic.status] || 0) + 1;
      byPriority[epic.priority] = (byPriority[epic.priority] || 0) + 1;
      totalProgress += epic.progress;

      if (epic.targetDate && new Date(epic.targetDate) < now && epic.status !== 'completed') {
        overdueCount++;
      }
    }

    return {
      totalEpics: epics.length,
      byStatus: byStatus as Record<EpicStatus, number>,
      byPriority,
      avgProgress: epics.length > 0 ? Math.round(totalProgress / epics.length) : 0,
      overdueEpics: overdueCount,
    };
  }
}
