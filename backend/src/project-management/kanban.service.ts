import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Kanban Types
export interface KanbanBoard {
  id: string;
  tenantId: string;
  projectId?: string;
  name: string;
  description?: string;
  type: 'kanban' | 'scrum' | 'custom';
  columns: KanbanColumn[];
  settings: BoardSettings;
  filters: BoardFilter[];
  swimlanes?: Swimlane[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  status: string; // Maps to task status
  order: number;
  color: string;
  wipLimit?: number; // Work in progress limit
  collapsed: boolean;
  autoArchive?: {
    enabled: boolean;
    daysAfterComplete: number;
  };
}

export interface BoardSettings {
  showSubtasks: boolean;
  showAssignee: boolean;
  showDueDate: boolean;
  showPriority: boolean;
  showLabels: boolean;
  showEstimate: boolean;
  showProgress: boolean;
  cardSize: 'compact' | 'normal' | 'detailed';
  groupBy?: 'none' | 'assignee' | 'priority' | 'label' | 'due_date';
  defaultView: 'board' | 'list' | 'calendar' | 'timeline';
}

export interface BoardFilter {
  id: string;
  name: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in';
  value: any;
  isActive: boolean;
}

export interface Swimlane {
  id: string;
  name: string;
  type: 'assignee' | 'priority' | 'epic' | 'custom';
  collapsed: boolean;
  order: number;
  value?: any;
}

export interface KanbanCard {
  id: string;
  boardId: string;
  taskId: string;
  columnId: string;
  swimlaneId?: string;
  position: number;
  customFields?: Record<string, any>;
}

export interface BoardActivity {
  id: string;
  boardId: string;
  type: 'card_moved' | 'card_created' | 'column_added' | 'column_removed' | 'settings_changed';
  description: string;
  metadata?: Record<string, any>;
  userId: string;
  occurredAt: Date;
}

export interface SprintConfig {
  id: string;
  boardId: string;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed';
  taskIds: string[];
  stats: {
    totalPoints: number;
    completedPoints: number;
    totalTasks: number;
    completedTasks: number;
  };
  createdAt: Date;
}

@Injectable()
export class KanbanService {
  private readonly logger = new Logger(KanbanService.name);

  private boards = new Map<string, KanbanBoard>();
  private cards = new Map<string, KanbanCard>();
  private activities = new Map<string, BoardActivity>();
  private sprints = new Map<string, SprintConfig>();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== BOARDS ===================

  async createBoard(data: {
    tenantId: string;
    projectId?: string;
    name: string;
    description?: string;
    type?: KanbanBoard['type'];
    columns?: Omit<KanbanColumn, 'id' | 'order'>[];
    settings?: Partial<BoardSettings>;
    isDefault?: boolean;
    createdBy: string;
  }): Promise<KanbanBoard> {
    const defaultColumns: KanbanColumn[] = [
      { id: uuidv4(), name: 'Backlog', status: 'backlog', order: 0, color: '#6b7280', collapsed: false },
      { id: uuidv4(), name: 'To Do', status: 'todo', order: 1, color: '#3b82f6', collapsed: false },
      { id: uuidv4(), name: 'In Progress', status: 'in_progress', order: 2, color: '#f59e0b', collapsed: false, wipLimit: 5 },
      { id: uuidv4(), name: 'In Review', status: 'in_review', order: 3, color: '#8b5cf6', collapsed: false },
      { id: uuidv4(), name: 'Done', status: 'done', order: 4, color: '#22c55e', collapsed: false, autoArchive: { enabled: true, daysAfterComplete: 14 } },
    ];

    const board: KanbanBoard = {
      id: uuidv4(),
      tenantId: data.tenantId,
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      type: data.type || 'kanban',
      columns: data.columns
        ? data.columns.map((col, index) => ({ ...col, id: uuidv4(), order: index }))
        : defaultColumns,
      settings: {
        showSubtasks: true,
        showAssignee: true,
        showDueDate: true,
        showPriority: true,
        showLabels: true,
        showEstimate: false,
        showProgress: false,
        cardSize: 'normal',
        groupBy: 'none',
        defaultView: 'board',
        ...data.settings,
      },
      filters: [],
      isDefault: data.isDefault ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: data.createdBy,
    };

    // Unset other defaults if this is default
    if (data.isDefault) {
      for (const [id, b] of this.boards) {
        if (b.tenantId === data.tenantId && b.projectId === data.projectId && b.isDefault) {
          b.isDefault = false;
          this.boards.set(id, b);
        }
      }
    }

    this.boards.set(board.id, board);

    this.eventEmitter.emit('board.created', {
      boardId: board.id,
      tenantId: data.tenantId,
    });

    return board;
  }

  async getBoards(tenantId: string, projectId?: string): Promise<KanbanBoard[]> {
    return Array.from(this.boards.values())
      .filter(b => b.tenantId === tenantId && (!projectId || b.projectId === projectId))
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  async getBoard(id: string): Promise<KanbanBoard | null> {
    return this.boards.get(id) || null;
  }

  async updateBoard(
    id: string,
    updates: Partial<Pick<KanbanBoard, 'name' | 'description' | 'settings' | 'isDefault'>>,
  ): Promise<KanbanBoard | null> {
    const board = this.boards.get(id);
    if (!board) return null;

    if (updates.isDefault) {
      for (const [bId, b] of this.boards) {
        if (b.tenantId === board.tenantId && b.projectId === board.projectId && b.isDefault && bId !== id) {
          b.isDefault = false;
          this.boards.set(bId, b);
        }
      }
    }

    Object.assign(board, updates, { updatedAt: new Date() });
    this.boards.set(id, board);

    return board;
  }

  async deleteBoard(id: string): Promise<void> {
    this.boards.delete(id);

    // Delete related cards
    for (const [cardId, card] of this.cards) {
      if (card.boardId === id) this.cards.delete(cardId);
    }

    // Delete sprints
    for (const [sprintId, sprint] of this.sprints) {
      if (sprint.boardId === id) this.sprints.delete(sprintId);
    }
  }

  // =================== COLUMNS ===================

  async addColumn(boardId: string, column: Omit<KanbanColumn, 'id' | 'order'>): Promise<KanbanBoard | null> {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const newColumn: KanbanColumn = {
      ...column,
      id: uuidv4(),
      order: board.columns.length,
    };

    board.columns.push(newColumn);
    board.updatedAt = new Date();
    this.boards.set(boardId, board);

    return board;
  }

  async updateColumn(
    boardId: string,
    columnId: string,
    updates: Partial<KanbanColumn>,
  ): Promise<KanbanBoard | null> {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const column = board.columns.find(c => c.id === columnId);
    if (!column) return null;

    Object.assign(column, updates);
    board.updatedAt = new Date();
    this.boards.set(boardId, board);

    return board;
  }

  async reorderColumns(boardId: string, columnIds: string[]): Promise<KanbanBoard | null> {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const columnMap = new Map(board.columns.map(c => [c.id, c]));
    board.columns = columnIds.map((id, order) => {
      const column = columnMap.get(id);
      if (column) column.order = order;
      return column!;
    }).filter(Boolean);

    board.updatedAt = new Date();
    this.boards.set(boardId, board);

    return board;
  }

  async deleteColumn(boardId: string, columnId: string, moveToColumnId?: string): Promise<KanbanBoard | null> {
    const board = this.boards.get(boardId);
    if (!board) return null;

    // Move cards to another column if specified
    if (moveToColumnId) {
      for (const card of this.cards.values()) {
        if (card.boardId === boardId && card.columnId === columnId) {
          card.columnId = moveToColumnId;
          this.cards.set(card.id, card);
        }
      }
    } else {
      // Delete cards in column
      for (const [cardId, card] of this.cards) {
        if (card.boardId === boardId && card.columnId === columnId) {
          this.cards.delete(cardId);
        }
      }
    }

    board.columns = board.columns.filter(c => c.id !== columnId);
    board.columns.forEach((c, i) => c.order = i);
    board.updatedAt = new Date();
    this.boards.set(boardId, board);

    return board;
  }

  // =================== CARDS ===================

  async addCard(data: {
    boardId: string;
    taskId: string;
    columnId: string;
    swimlaneId?: string;
    position?: number;
  }): Promise<KanbanCard> {
    const board = this.boards.get(data.boardId);
    if (!board) throw new NotFoundException('Board not found');

    // Get cards in the column to determine position
    const columnCards = Array.from(this.cards.values())
      .filter(c => c.boardId === data.boardId && c.columnId === data.columnId)
      .sort((a, b) => a.position - b.position);

    const card: KanbanCard = {
      id: uuidv4(),
      boardId: data.boardId,
      taskId: data.taskId,
      columnId: data.columnId,
      swimlaneId: data.swimlaneId,
      position: data.position ?? columnCards.length,
    };

    this.cards.set(card.id, card);

    await this.recordActivity({
      boardId: data.boardId,
      type: 'card_created',
      description: `Card added to ${board.columns.find(c => c.id === data.columnId)?.name}`,
      userId: 'system',
    });

    return card;
  }

  async moveCard(
    cardId: string,
    toColumnId: string,
    position: number,
    movedBy: string,
  ): Promise<KanbanCard | null> {
    const card = this.cards.get(cardId);
    if (!card) return null;

    const board = this.boards.get(card.boardId);
    if (!board) return null;

    const fromColumn = board.columns.find(c => c.id === card.columnId);
    const toColumn = board.columns.find(c => c.id === toColumnId);

    // Check WIP limit
    if (toColumn?.wipLimit) {
      const cardsInColumn = Array.from(this.cards.values())
        .filter(c => c.boardId === card.boardId && c.columnId === toColumnId)
        .length;

      if (cardsInColumn >= toColumn.wipLimit && card.columnId !== toColumnId) {
        throw new BadRequestException(`Column "${toColumn.name}" has reached its WIP limit of ${toColumn.wipLimit}`);
      }
    }

    const oldColumnId = card.columnId;
    card.columnId = toColumnId;
    card.position = position;
    this.cards.set(cardId, card);

    // Reorder other cards
    const columnCards = Array.from(this.cards.values())
      .filter(c => c.boardId === card.boardId && c.columnId === toColumnId && c.id !== cardId)
      .sort((a, b) => a.position - b.position);

    columnCards.splice(position, 0, card);
    columnCards.forEach((c, i) => {
      c.position = i;
      this.cards.set(c.id, c);
    });

    // Record activity
    if (oldColumnId !== toColumnId) {
      await this.recordActivity({
        boardId: card.boardId,
        type: 'card_moved',
        description: `Card moved from ${fromColumn?.name} to ${toColumn?.name}`,
        metadata: { fromColumn: oldColumnId, toColumn: toColumnId },
        userId: movedBy,
      });

      this.eventEmitter.emit('card.moved', {
        cardId,
        taskId: card.taskId,
        fromColumn: oldColumnId,
        toColumn: toColumnId,
        toStatus: toColumn?.status,
      });
    }

    return card;
  }

  async getCards(boardId: string): Promise<KanbanCard[]> {
    return Array.from(this.cards.values())
      .filter(c => c.boardId === boardId)
      .sort((a, b) => a.position - b.position);
  }

  async getCardsByColumn(boardId: string, columnId: string): Promise<KanbanCard[]> {
    return Array.from(this.cards.values())
      .filter(c => c.boardId === boardId && c.columnId === columnId)
      .sort((a, b) => a.position - b.position);
  }

  async removeCard(cardId: string): Promise<void> {
    this.cards.delete(cardId);
  }

  // =================== SWIMLANES ===================

  async addSwimlane(boardId: string, swimlane: Omit<Swimlane, 'id' | 'order'>): Promise<KanbanBoard | null> {
    const board = this.boards.get(boardId);
    if (!board) return null;

    if (!board.swimlanes) board.swimlanes = [];

    const newSwimlane: Swimlane = {
      ...swimlane,
      id: uuidv4(),
      order: board.swimlanes.length,
    };

    board.swimlanes.push(newSwimlane);
    board.updatedAt = new Date();
    this.boards.set(boardId, board);

    return board;
  }

  async removeSwimlane(boardId: string, swimlaneId: string): Promise<KanbanBoard | null> {
    const board = this.boards.get(boardId);
    if (!board || !board.swimlanes) return null;

    board.swimlanes = board.swimlanes.filter(s => s.id !== swimlaneId);
    board.swimlanes.forEach((s, i) => s.order = i);
    board.updatedAt = new Date();
    this.boards.set(boardId, board);

    // Reset swimlane on cards
    for (const card of this.cards.values()) {
      if (card.boardId === boardId && card.swimlaneId === swimlaneId) {
        card.swimlaneId = undefined;
        this.cards.set(card.id, card);
      }
    }

    return board;
  }

  // =================== FILTERS ===================

  async addFilter(boardId: string, filter: Omit<BoardFilter, 'id'>): Promise<KanbanBoard | null> {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const newFilter: BoardFilter = {
      ...filter,
      id: uuidv4(),
    };

    board.filters.push(newFilter);
    board.updatedAt = new Date();
    this.boards.set(boardId, board);

    return board;
  }

  async updateFilter(
    boardId: string,
    filterId: string,
    updates: Partial<BoardFilter>,
  ): Promise<KanbanBoard | null> {
    const board = this.boards.get(boardId);
    if (!board) return null;

    const filter = board.filters.find(f => f.id === filterId);
    if (!filter) return null;

    Object.assign(filter, updates);
    board.updatedAt = new Date();
    this.boards.set(boardId, board);

    return board;
  }

  async removeFilter(boardId: string, filterId: string): Promise<KanbanBoard | null> {
    const board = this.boards.get(boardId);
    if (!board) return null;

    board.filters = board.filters.filter(f => f.id !== filterId);
    board.updatedAt = new Date();
    this.boards.set(boardId, board);

    return board;
  }

  // =================== SPRINTS (Scrum) ===================

  async createSprint(data: {
    boardId: string;
    name: string;
    goal?: string;
    startDate: Date;
    endDate: Date;
    taskIds?: string[];
  }): Promise<SprintConfig> {
    const board = this.boards.get(data.boardId);
    if (!board || board.type !== 'scrum') {
      throw new BadRequestException('Board must be of type scrum for sprints');
    }

    const sprint: SprintConfig = {
      id: uuidv4(),
      boardId: data.boardId,
      name: data.name,
      goal: data.goal,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'planning',
      taskIds: data.taskIds || [],
      stats: {
        totalPoints: 0,
        completedPoints: 0,
        totalTasks: data.taskIds?.length || 0,
        completedTasks: 0,
      },
      createdAt: new Date(),
    };

    this.sprints.set(sprint.id, sprint);
    return sprint;
  }

  async getSprints(boardId: string): Promise<SprintConfig[]> {
    return Array.from(this.sprints.values())
      .filter(s => s.boardId === boardId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getActiveSprint(boardId: string): Promise<SprintConfig | null> {
    return Array.from(this.sprints.values())
      .find(s => s.boardId === boardId && s.status === 'active') || null;
  }

  async startSprint(sprintId: string): Promise<SprintConfig | null> {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) return null;

    // Complete any existing active sprint
    const activeSprint = await this.getActiveSprint(sprint.boardId);
    if (activeSprint) {
      activeSprint.status = 'completed';
      this.sprints.set(activeSprint.id, activeSprint);
    }

    sprint.status = 'active';
    this.sprints.set(sprintId, sprint);

    return sprint;
  }

  async completeSprint(sprintId: string, moveIncompleteToBacklog = true): Promise<SprintConfig | null> {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) return null;

    sprint.status = 'completed';
    this.sprints.set(sprintId, sprint);

    // Move incomplete tasks to backlog if requested
    if (moveIncompleteToBacklog) {
      const board = this.boards.get(sprint.boardId);
      if (board) {
        const backlogColumn = board.columns.find(c => c.status === 'backlog');

        if (backlogColumn) {
          for (const card of this.cards.values()) {
            if (card.boardId === sprint.boardId && sprint.taskIds.includes(card.taskId)) {
              const column = board.columns.find(c => c.id === card.columnId);
              if (column && column.status !== 'done') {
                card.columnId = backlogColumn.id;
                this.cards.set(card.id, card);
              }
            }
          }
        }
      }
    }

    return sprint;
  }

  async addToSprint(sprintId: string, taskIds: string[]): Promise<SprintConfig | null> {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) return null;

    sprint.taskIds = [...new Set([...sprint.taskIds, ...taskIds])];
    sprint.stats.totalTasks = sprint.taskIds.length;
    this.sprints.set(sprintId, sprint);

    return sprint;
  }

  async removeFromSprint(sprintId: string, taskIds: string[]): Promise<SprintConfig | null> {
    const sprint = this.sprints.get(sprintId);
    if (!sprint) return null;

    sprint.taskIds = sprint.taskIds.filter(id => !taskIds.includes(id));
    sprint.stats.totalTasks = sprint.taskIds.length;
    this.sprints.set(sprintId, sprint);

    return sprint;
  }

  // =================== ACTIVITIES ===================

  private async recordActivity(data: {
    boardId: string;
    type: BoardActivity['type'];
    description: string;
    metadata?: Record<string, any>;
    userId: string;
  }): Promise<BoardActivity> {
    const activity: BoardActivity = {
      id: uuidv4(),
      boardId: data.boardId,
      type: data.type,
      description: data.description,
      metadata: data.metadata,
      userId: data.userId,
      occurredAt: new Date(),
    };

    this.activities.set(activity.id, activity);
    return activity;
  }

  async getActivities(boardId: string, limit = 50): Promise<BoardActivity[]> {
    return Array.from(this.activities.values())
      .filter(a => a.boardId === boardId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  }

  // =================== STATS ===================

  async getBoardStats(boardId: string): Promise<{
    totalCards: number;
    cardsByColumn: Array<{ columnId: string; columnName: string; count: number; wipLimit?: number }>;
    cardsOverWip: number;
    avgCycleTime: number;
    throughput: number;
  }> {
    const board = this.boards.get(boardId);
    if (!board) throw new NotFoundException('Board not found');

    const cards = Array.from(this.cards.values())
      .filter(c => c.boardId === boardId);

    const cardsByColumn = board.columns.map(col => {
      const count = cards.filter(c => c.columnId === col.id).length;
      return {
        columnId: col.id,
        columnName: col.name,
        count,
        wipLimit: col.wipLimit,
      };
    });

    const cardsOverWip = cardsByColumn
      .filter(c => c.wipLimit && c.count > c.wipLimit)
      .reduce((sum, c) => sum + (c.count - (c.wipLimit || 0)), 0);

    return {
      totalCards: cards.length,
      cardsByColumn,
      cardsOverWip,
      avgCycleTime: 0, // Would need task completion data
      throughput: 0, // Would need historical data
    };
  }

  async getStats(tenantId: string): Promise<{
    totalBoards: number;
    totalCards: number;
    activeSprints: number;
    boardsByType: Record<string, number>;
  }> {
    const boards = Array.from(this.boards.values())
      .filter(b => b.tenantId === tenantId);

    const cards = Array.from(this.cards.values())
      .filter(c => boards.some(b => b.id === c.boardId));

    const activeSprints = Array.from(this.sprints.values())
      .filter(s => boards.some(b => b.id === s.boardId) && s.status === 'active');

    const boardsByType: Record<string, number> = {};
    for (const board of boards) {
      boardsByType[board.type] = (boardsByType[board.type] || 0) + 1;
    }

    return {
      totalBoards: boards.length,
      totalCards: cards.length,
      activeSprints: activeSprints.length,
      boardsByType,
    };
  }
}
