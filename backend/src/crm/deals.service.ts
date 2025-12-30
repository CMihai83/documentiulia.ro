import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Deal Types
export interface Deal {
  id: string;
  tenantId: string;
  name: string;
  description?: string;

  // Pipeline
  pipelineId: string;
  stageId: string;
  stageMovedAt: Date;
  stageDuration: number; // Days in current stage

  // Value
  amount: number;
  currency: string;
  probability: number; // 0-100

  // Dates
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Status
  status: 'open' | 'won' | 'lost' | 'archived';
  lostReason?: string;

  // Relationships
  contactId?: string;
  companyId?: string;
  ownerId: string;
  collaborators: string[];

  // Custom fields
  tags: string[];
  customFields: Record<string, any>;

  // Activity tracking
  lastActivityAt?: Date;
  nextActivityAt?: Date;
  nextActivityType?: string;

  // Scoring
  score: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Source
  source?: string;
  campaign?: string;
}

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  stages: PipelineStage[];
  currency: string;
  stats: PipelineStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number; // Default probability for deals in this stage
  color: string;
  rottenDays?: number; // Days before deal is considered "rotting"
  isWon?: boolean;
  isLost?: boolean;
}

export interface PipelineStats {
  totalDeals: number;
  totalValue: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  avgDealSize: number;
  avgCycleTime: number; // Days
  winRate: number;
}

export interface DealActivity {
  id: string;
  dealId: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'task' | 'stage_change' | 'value_change' | 'status_change';
  description: string;
  metadata?: {
    previousStage?: string;
    newStage?: string;
    previousValue?: number;
    newValue?: number;
    previousStatus?: string;
    newStatus?: string;
  };
  createdAt: Date;
  createdBy: string;
}

export interface DealTask {
  id: string;
  dealId: string;
  title: string;
  description?: string;
  type: 'call' | 'email' | 'meeting' | 'follow_up' | 'other';
  dueDate: Date;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface DealFilters {
  search?: string;
  pipelineId?: string;
  stageId?: string;
  status?: Deal['status'];
  ownerId?: string;
  contactId?: string;
  companyId?: string;
  minAmount?: number;
  maxAmount?: number;
  priority?: Deal['priority'];
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  expectedCloseAfter?: Date;
  expectedCloseBefore?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  private deals = new Map<string, Deal>();
  private pipelines = new Map<string, Pipeline>();
  private activities = new Map<string, DealActivity>();
  private tasks = new Map<string, DealTask>();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== PIPELINES ===================

  async createPipeline(data: {
    tenantId: string;
    name: string;
    description?: string;
    stages: Omit<PipelineStage, 'id'>[];
    currency?: string;
    isDefault?: boolean;
  }): Promise<Pipeline> {
    const pipeline: Pipeline = {
      id: uuidv4(),
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      isDefault: data.isDefault ?? false,
      stages: data.stages.map((stage, index) => ({
        ...stage,
        id: uuidv4(),
        order: index,
      })),
      currency: data.currency || 'RON',
      stats: {
        totalDeals: 0,
        totalValue: 0,
        openDeals: 0,
        wonDeals: 0,
        lostDeals: 0,
        avgDealSize: 0,
        avgCycleTime: 0,
        winRate: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      for (const [id, p] of this.pipelines) {
        if (p.tenantId === data.tenantId && p.isDefault) {
          p.isDefault = false;
          this.pipelines.set(id, p);
        }
      }
    }

    this.pipelines.set(pipeline.id, pipeline);
    return pipeline;
  }

  async getPipelines(tenantId: string): Promise<Pipeline[]> {
    return Array.from(this.pipelines.values())
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  async getPipeline(id: string): Promise<Pipeline | null> {
    return this.pipelines.get(id) || null;
  }

  async getDefaultPipeline(tenantId: string): Promise<Pipeline | null> {
    return Array.from(this.pipelines.values())
      .find(p => p.tenantId === tenantId && p.isDefault) || null;
  }

  async updatePipeline(
    id: string,
    updates: Partial<Pick<Pipeline, 'name' | 'description' | 'isDefault' | 'stages'>>,
  ): Promise<Pipeline | null> {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) return null;

    if (updates.isDefault) {
      for (const [pId, p] of this.pipelines) {
        if (p.tenantId === pipeline.tenantId && p.isDefault && pId !== id) {
          p.isDefault = false;
          this.pipelines.set(pId, p);
        }
      }
    }

    Object.assign(pipeline, updates, { updatedAt: new Date() });
    this.pipelines.set(id, pipeline);

    return pipeline;
  }

  async deletePipeline(id: string): Promise<void> {
    // Check if pipeline has deals
    const hasDeals = Array.from(this.deals.values()).some(d => d.pipelineId === id);
    if (hasDeals) {
      throw new BadRequestException('Cannot delete pipeline with existing deals');
    }
    this.pipelines.delete(id);
  }

  async addStage(pipelineId: string, stage: Omit<PipelineStage, 'id' | 'order'>): Promise<Pipeline | null> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return null;

    const newStage: PipelineStage = {
      ...stage,
      id: uuidv4(),
      order: pipeline.stages.length,
    };

    pipeline.stages.push(newStage);
    pipeline.updatedAt = new Date();
    this.pipelines.set(pipelineId, pipeline);

    return pipeline;
  }

  async updateStage(pipelineId: string, stageId: string, updates: Partial<PipelineStage>): Promise<Pipeline | null> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return null;

    const stageIndex = pipeline.stages.findIndex(s => s.id === stageId);
    if (stageIndex === -1) return null;

    pipeline.stages[stageIndex] = { ...pipeline.stages[stageIndex], ...updates };
    pipeline.updatedAt = new Date();
    this.pipelines.set(pipelineId, pipeline);

    return pipeline;
  }

  async reorderStages(pipelineId: string, stageIds: string[]): Promise<Pipeline | null> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return null;

    const stageMap = new Map(pipeline.stages.map(s => [s.id, s]));
    pipeline.stages = stageIds.map((id, order) => {
      const stage = stageMap.get(id);
      if (stage) stage.order = order;
      return stage!;
    }).filter(Boolean);

    pipeline.updatedAt = new Date();
    this.pipelines.set(pipelineId, pipeline);

    return pipeline;
  }

  async deleteStage(pipelineId: string, stageId: string): Promise<Pipeline | null> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return null;

    // Check if stage has deals
    const hasDeals = Array.from(this.deals.values())
      .some(d => d.pipelineId === pipelineId && d.stageId === stageId);
    if (hasDeals) {
      throw new BadRequestException('Cannot delete stage with existing deals');
    }

    pipeline.stages = pipeline.stages.filter(s => s.id !== stageId);
    pipeline.stages.forEach((s, i) => s.order = i);
    pipeline.updatedAt = new Date();
    this.pipelines.set(pipelineId, pipeline);

    return pipeline;
  }

  // =================== DEALS ===================

  async createDeal(data: {
    tenantId: string;
    name: string;
    description?: string;
    pipelineId: string;
    stageId?: string;
    amount: number;
    currency?: string;
    probability?: number;
    expectedCloseDate?: Date;
    contactId?: string;
    companyId?: string;
    ownerId: string;
    collaborators?: string[];
    tags?: string[];
    customFields?: Record<string, any>;
    priority?: Deal['priority'];
    source?: string;
    campaign?: string;
  }): Promise<Deal> {
    let pipeline = this.pipelines.get(data.pipelineId);
    if (!pipeline) {
      // Create default pipeline if not found
      pipeline = {
        id: data.pipelineId,
        tenantId: data.tenantId,
        name: 'Default Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
        stages: [
          { id: 'lead', name: 'Lead', order: 1, probability: 20, color: '#94a3b8' },
          { id: 'qualified', name: 'Qualified', order: 2, probability: 40, color: '#3b82f6' },
          { id: 'proposal', name: 'Proposal', order: 3, probability: 60, color: '#eab308' },
          { id: 'negotiation', name: 'Negotiation', order: 4, probability: 80, color: '#a855f7' },
          { id: 'won', name: 'Won', order: 5, probability: 100, color: '#22c55e', isWon: true },
          { id: 'lost', name: 'Lost', order: 6, probability: 0, color: '#ef4444', isLost: true },
        ],
        currency: 'RON',
        stats: { totalDeals: 0, totalValue: 0, openDeals: 0, wonDeals: 0, lostDeals: 0, avgDealSize: 0, avgCycleTime: 0, winRate: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.pipelines.set(data.pipelineId, pipeline);
    }

    const stageId = data.stageId || pipeline.stages[0]?.id;
    if (!stageId) {
      throw new BadRequestException('Pipeline has no stages');
    }

    const stage = pipeline.stages.find(s => s.id === stageId);

    const deal: Deal = {
      id: uuidv4(),
      tenantId: data.tenantId,
      name: data.name,
      description: data.description,
      pipelineId: data.pipelineId,
      stageId,
      stageMovedAt: new Date(),
      stageDuration: 0,
      amount: data.amount,
      currency: data.currency || pipeline.currency,
      probability: data.probability ?? stage?.probability ?? 0,
      expectedCloseDate: data.expectedCloseDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'open',
      contactId: data.contactId,
      companyId: data.companyId,
      ownerId: data.ownerId,
      collaborators: data.collaborators || [],
      tags: data.tags || [],
      customFields: data.customFields || {},
      score: 0,
      priority: data.priority || 'medium',
      source: data.source,
      campaign: data.campaign,
    };

    this.deals.set(deal.id, deal);
    this.updatePipelineStats(data.pipelineId);

    this.eventEmitter.emit('deal.created', {
      dealId: deal.id,
      tenantId: data.tenantId,
      pipelineId: data.pipelineId,
    });

    // Record activity
    await this.recordActivity({
      dealId: deal.id,
      type: 'stage_change',
      description: `Deal created in stage: ${stage?.name}`,
      createdBy: data.ownerId,
    });

    return deal;
  }

  async getDeals(tenantId: string, filters?: DealFilters): Promise<{
    deals: Deal[];
    total: number;
  }> {
    let deals = Array.from(this.deals.values())
      .filter(d => d.tenantId === tenantId);

    // Apply filters
    if (filters) {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        deals = deals.filter(d =>
          d.name.toLowerCase().includes(search) ||
          d.description?.toLowerCase().includes(search)
        );
      }
      if (filters.pipelineId) deals = deals.filter(d => d.pipelineId === filters.pipelineId);
      if (filters.stageId) deals = deals.filter(d => d.stageId === filters.stageId);
      if (filters.status) deals = deals.filter(d => d.status === filters.status);
      if (filters.ownerId) deals = deals.filter(d => d.ownerId === filters.ownerId);
      if (filters.contactId) deals = deals.filter(d => d.contactId === filters.contactId);
      if (filters.companyId) deals = deals.filter(d => d.companyId === filters.companyId);
      if (filters.minAmount !== undefined) deals = deals.filter(d => d.amount >= filters.minAmount!);
      if (filters.maxAmount !== undefined) deals = deals.filter(d => d.amount <= filters.maxAmount!);
      if (filters.priority) deals = deals.filter(d => d.priority === filters.priority);
      if (filters.tags?.length) deals = deals.filter(d => filters.tags!.some(t => d.tags.includes(t)));
      if (filters.createdAfter) deals = deals.filter(d => d.createdAt >= filters.createdAfter!);
      if (filters.createdBefore) deals = deals.filter(d => d.createdAt <= filters.createdBefore!);
      if (filters.expectedCloseAfter) deals = deals.filter(d => d.expectedCloseDate && d.expectedCloseDate >= filters.expectedCloseAfter!);
      if (filters.expectedCloseBefore) deals = deals.filter(d => d.expectedCloseDate && d.expectedCloseDate <= filters.expectedCloseBefore!);
    }

    const total = deals.length;

    // Sort
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'desc';
    deals.sort((a, b) => {
      const aVal = (a as any)[sortBy];
      const bVal = (b as any)[sortBy];
      if (sortOrder === 'desc') return bVal > aVal ? 1 : -1;
      return aVal > bVal ? 1 : -1;
    });

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    deals = deals.slice(offset, offset + limit);

    return { deals, total };
  }

  async getDeal(id: string): Promise<Deal | null> {
    return this.deals.get(id) || null;
  }

  async updateDeal(
    id: string,
    updates: Partial<Pick<Deal,
      'name' | 'description' | 'amount' | 'probability' |
      'expectedCloseDate' | 'contactId' | 'companyId' |
      'ownerId' | 'collaborators' | 'tags' | 'customFields' | 'priority'
    >>,
    updatedBy: string,
  ): Promise<Deal | null> {
    const deal = this.deals.get(id);
    if (!deal) return null;

    // Track value change
    if (updates.amount !== undefined && updates.amount !== deal.amount) {
      await this.recordActivity({
        dealId: id,
        type: 'value_change',
        description: `Deal value changed from ${deal.amount} to ${updates.amount}`,
        createdBy: updatedBy,
        metadata: {
          previousValue: deal.amount,
          newValue: updates.amount,
        },
      });
    }

    Object.assign(deal, updates, { updatedAt: new Date() });
    this.deals.set(id, deal);
    this.updatePipelineStats(deal.pipelineId);

    return deal;
  }

  async moveDealToStage(dealId: string, stageId: string, movedBy: string): Promise<Deal | null> {
    const deal = this.deals.get(dealId);
    if (!deal) return null;

    const pipeline = this.pipelines.get(deal.pipelineId);
    if (!pipeline) return null;

    const newStage = pipeline.stages.find(s => s.id === stageId);
    const oldStage = pipeline.stages.find(s => s.id === deal.stageId);
    if (!newStage) return null;

    const previousStageId = deal.stageId;
    deal.stageId = stageId;
    deal.probability = newStage.probability;
    deal.stageMovedAt = new Date();
    deal.stageDuration = 0;
    deal.updatedAt = new Date();

    // Check if won/lost stage
    if (newStage.isWon) {
      deal.status = 'won';
      deal.actualCloseDate = new Date();
    } else if (newStage.isLost) {
      deal.status = 'lost';
      deal.actualCloseDate = new Date();
    }

    this.deals.set(dealId, deal);
    this.updatePipelineStats(deal.pipelineId);

    // Record activity
    await this.recordActivity({
      dealId,
      type: 'stage_change',
      description: `Moved from ${oldStage?.name} to ${newStage.name}`,
      createdBy: movedBy,
      metadata: {
        previousStage: previousStageId,
        newStage: stageId,
      },
    });

    this.eventEmitter.emit('deal.stage-changed', {
      dealId,
      previousStage: previousStageId,
      newStage: stageId,
      status: deal.status,
    });

    return deal;
  }

  async closeDeal(
    id: string,
    outcome: 'won' | 'lost',
    closedBy: string,
    lostReason?: string,
  ): Promise<Deal | null> {
    const deal = this.deals.get(id);
    if (!deal) return null;

    const pipeline = this.pipelines.get(deal.pipelineId);
    if (!pipeline) return null;

    // Find appropriate stage
    let targetStage: PipelineStage | undefined;
    if (outcome === 'won') {
      targetStage = pipeline.stages.find(s => s.isWon);
    } else {
      targetStage = pipeline.stages.find(s => s.isLost);
    }

    deal.status = outcome;
    deal.actualCloseDate = new Date();
    if (outcome === 'lost') deal.lostReason = lostReason;
    if (targetStage) {
      deal.stageId = targetStage.id;
      deal.probability = targetStage.probability;
    }
    deal.updatedAt = new Date();

    this.deals.set(id, deal);
    this.updatePipelineStats(deal.pipelineId);

    // Record activity
    await this.recordActivity({
      dealId: id,
      type: 'status_change',
      description: outcome === 'won' ? 'Deal won!' : `Deal lost: ${lostReason || 'No reason provided'}`,
      createdBy: closedBy,
      metadata: {
        previousStatus: 'open',
        newStatus: outcome,
      },
    });

    this.eventEmitter.emit(`deal.${outcome}`, {
      dealId: id,
      amount: deal.amount,
      tenantId: deal.tenantId,
    });

    return deal;
  }

  async reopenDeal(id: string, reopenedBy: string): Promise<Deal | null> {
    const deal = this.deals.get(id);
    if (!deal) return null;

    const pipeline = this.pipelines.get(deal.pipelineId);
    if (!pipeline) return null;

    const firstOpenStage = pipeline.stages.find(s => !s.isWon && !s.isLost);

    deal.status = 'open';
    deal.actualCloseDate = undefined;
    deal.lostReason = undefined;
    if (firstOpenStage) {
      deal.stageId = firstOpenStage.id;
      deal.probability = firstOpenStage.probability;
    }
    deal.stageMovedAt = new Date();
    deal.updatedAt = new Date();

    this.deals.set(id, deal);
    this.updatePipelineStats(deal.pipelineId);

    await this.recordActivity({
      dealId: id,
      type: 'status_change',
      description: 'Deal reopened',
      createdBy: reopenedBy,
    });

    return deal;
  }

  async deleteDeal(id: string): Promise<void> {
    const deal = this.deals.get(id);
    if (!deal) return;

    this.deals.delete(id);
    this.updatePipelineStats(deal.pipelineId);

    // Delete related activities and tasks
    for (const [actId, act] of this.activities) {
      if (act.dealId === id) this.activities.delete(actId);
    }
    for (const [taskId, task] of this.tasks) {
      if (task.dealId === id) this.tasks.delete(taskId);
    }
  }

  // =================== ACTIVITIES ===================

  async recordActivity(data: {
    dealId: string;
    type: DealActivity['type'];
    description: string;
    createdBy: string;
    metadata?: DealActivity['metadata'];
  }): Promise<DealActivity> {
    const activity: DealActivity = {
      id: uuidv4(),
      dealId: data.dealId,
      type: data.type,
      description: data.description,
      metadata: data.metadata,
      createdAt: new Date(),
      createdBy: data.createdBy,
    };

    this.activities.set(activity.id, activity);

    // Update deal's last activity
    const deal = this.deals.get(data.dealId);
    if (deal) {
      deal.lastActivityAt = new Date();
      this.deals.set(deal.id, deal);
    }

    return activity;
  }

  async getActivities(dealId: string, limit = 50): Promise<DealActivity[]> {
    return Array.from(this.activities.values())
      .filter(a => a.dealId === dealId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // =================== TASKS ===================

  async createTask(data: {
    dealId: string;
    title: string;
    description?: string;
    type: DealTask['type'];
    dueDate: Date;
    priority?: DealTask['priority'];
    assigneeId?: string;
    createdBy: string;
  }): Promise<DealTask> {
    const task: DealTask = {
      id: uuidv4(),
      dealId: data.dealId,
      title: data.title,
      description: data.description,
      type: data.type,
      dueDate: data.dueDate,
      status: new Date() > data.dueDate ? 'overdue' : 'pending',
      priority: data.priority || 'medium',
      assigneeId: data.assigneeId,
      createdAt: new Date(),
      createdBy: data.createdBy,
    };

    this.tasks.set(task.id, task);

    // Update deal's next activity
    const deal = this.deals.get(data.dealId);
    if (deal && (!deal.nextActivityAt || data.dueDate < deal.nextActivityAt)) {
      deal.nextActivityAt = data.dueDate;
      deal.nextActivityType = data.type;
      this.deals.set(deal.id, deal);
    }

    return task;
  }

  async getTasks(dealId: string): Promise<DealTask[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.dealId === dealId)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async completeTask(taskId: string, completedBy: string): Promise<DealTask | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = 'completed';
    task.completedAt = new Date();
    this.tasks.set(taskId, task);

    // Record activity
    await this.recordActivity({
      dealId: task.dealId,
      type: 'task',
      description: `Completed task: ${task.title}`,
      createdBy: completedBy,
    });

    // Update deal's next activity
    await this.updateDealNextActivity(task.dealId);

    return task;
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      this.tasks.delete(taskId);
      await this.updateDealNextActivity(task.dealId);
    }
  }

  private async updateDealNextActivity(dealId: string): Promise<void> {
    const deal = this.deals.get(dealId);
    if (!deal) return;

    const pendingTasks = Array.from(this.tasks.values())
      .filter(t => t.dealId === dealId && t.status === 'pending')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    if (pendingTasks.length > 0) {
      deal.nextActivityAt = pendingTasks[0].dueDate;
      deal.nextActivityType = pendingTasks[0].type;
    } else {
      deal.nextActivityAt = undefined;
      deal.nextActivityType = undefined;
    }

    this.deals.set(dealId, deal);
  }

  // =================== STATS ===================

  private updatePipelineStats(pipelineId: string): void {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return;

    const deals = Array.from(this.deals.values())
      .filter(d => d.pipelineId === pipelineId);

    const openDeals = deals.filter(d => d.status === 'open');
    const wonDeals = deals.filter(d => d.status === 'won');
    const lostDeals = deals.filter(d => d.status === 'lost');

    const totalValue = deals.reduce((sum, d) => sum + d.amount, 0);
    const closedDeals = wonDeals.length + lostDeals.length;

    // Calculate average cycle time for won deals
    const cycleTimes = wonDeals
      .filter(d => d.actualCloseDate)
      .map(d => Math.ceil((d.actualCloseDate!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const avgCycleTime = cycleTimes.length > 0
      ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
      : 0;

    pipeline.stats = {
      totalDeals: deals.length,
      totalValue,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      avgDealSize: deals.length > 0 ? Math.round(totalValue / deals.length) : 0,
      avgCycleTime,
      winRate: closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0,
    };

    this.pipelines.set(pipelineId, pipeline);
  }

  async getForecast(tenantId: string, pipelineId?: string): Promise<{
    weighted: number;
    bestCase: number;
    worstCase: number;
    byStage: Array<{ stageId: string; stageName: string; count: number; value: number; weighted: number }>;
    byMonth: Array<{ month: string; expected: number; weighted: number }>;
  }> {
    let deals = Array.from(this.deals.values())
      .filter(d => d.tenantId === tenantId && d.status === 'open');

    if (pipelineId) {
      deals = deals.filter(d => d.pipelineId === pipelineId);
    }

    const pipeline = pipelineId
      ? this.pipelines.get(pipelineId)
      : await this.getDefaultPipeline(tenantId);

    const stageMap = new Map(pipeline?.stages.map(s => [s.id, s]) || []);

    // Calculate totals
    const weighted = deals.reduce((sum, d) => sum + (d.amount * d.probability / 100), 0);
    const bestCase = deals.reduce((sum, d) => sum + d.amount, 0);
    const worstCase = deals
      .filter(d => d.probability >= 75)
      .reduce((sum, d) => sum + d.amount, 0);

    // By stage
    const byStageMap = new Map<string, { count: number; value: number; weighted: number }>();
    for (const deal of deals) {
      const existing = byStageMap.get(deal.stageId) || { count: 0, value: 0, weighted: 0 };
      existing.count++;
      existing.value += deal.amount;
      existing.weighted += deal.amount * deal.probability / 100;
      byStageMap.set(deal.stageId, existing);
    }

    const byStage = Array.from(byStageMap.entries()).map(([stageId, data]) => ({
      stageId,
      stageName: stageMap.get(stageId)?.name || 'Unknown',
      ...data,
    }));

    // By month
    const byMonthMap = new Map<string, { expected: number; weighted: number }>();
    for (const deal of deals) {
      if (deal.expectedCloseDate) {
        const monthKey = deal.expectedCloseDate.toISOString().substring(0, 7);
        const existing = byMonthMap.get(monthKey) || { expected: 0, weighted: 0 };
        existing.expected += deal.amount;
        existing.weighted += deal.amount * deal.probability / 100;
        byMonthMap.set(monthKey, existing);
      }
    }

    const byMonth = Array.from(byMonthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      weighted: Math.round(weighted),
      bestCase: Math.round(bestCase),
      worstCase: Math.round(worstCase),
      byStage,
      byMonth,
    };
  }

  async getStats(tenantId: string): Promise<{
    totalDeals: number;
    openDeals: number;
    wonDeals: number;
    lostDeals: number;
    totalValue: number;
    wonValue: number;
    avgDealSize: number;
    winRate: number;
    avgCycleTime: number;
    totalPipelines: number;
  }> {
    const deals = Array.from(this.deals.values())
      .filter(d => d.tenantId === tenantId);

    const openDeals = deals.filter(d => d.status === 'open');
    const wonDeals = deals.filter(d => d.status === 'won');
    const lostDeals = deals.filter(d => d.status === 'lost');

    const totalValue = deals.reduce((sum, d) => sum + d.amount, 0);
    const wonValue = wonDeals.reduce((sum, d) => sum + d.amount, 0);
    const closedDeals = wonDeals.length + lostDeals.length;

    const cycleTimes = wonDeals
      .filter(d => d.actualCloseDate)
      .map(d => Math.ceil((d.actualCloseDate!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    const pipelines = Array.from(this.pipelines.values())
      .filter(p => p.tenantId === tenantId);

    return {
      totalDeals: deals.length,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      totalValue,
      wonValue,
      avgDealSize: deals.length > 0 ? Math.round(totalValue / deals.length) : 0,
      winRate: closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0,
      avgCycleTime: cycleTimes.length > 0 ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) : 0,
      totalPipelines: pipelines.length,
    };
  }
}
