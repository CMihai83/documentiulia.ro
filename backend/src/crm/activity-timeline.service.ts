import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Activity Types
export interface TimelineActivity {
  id: string;
  tenantId: string;

  // Entity reference
  entityType: 'contact' | 'deal' | 'company' | 'invoice' | 'project' | 'task';
  entityId: string;
  entityName?: string;

  // Activity details
  type: ActivityType;
  action: string;
  description: string;
  details?: Record<string, any>;

  // Related entities
  relatedEntities?: Array<{
    type: string;
    id: string;
    name?: string;
  }>;

  // User info
  userId: string;
  userName?: string;
  userAvatar?: string;

  // Metadata
  metadata?: {
    source?: 'manual' | 'automatic' | 'integration' | 'api';
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };

  // Timestamps
  occurredAt: Date;
  createdAt: Date;
}

export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'meeting'
  | 'task'
  | 'deal'
  | 'invoice'
  | 'payment'
  | 'document'
  | 'status_change'
  | 'assignment'
  | 'comment'
  | 'integration'
  | 'system';

export interface ActivityComment {
  id: string;
  activityId: string;
  content: string;
  userId: string;
  userName?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ActivityReaction {
  activityId: string;
  userId: string;
  type: 'like' | 'love' | 'celebrate' | 'helpful';
  createdAt: Date;
}

export interface ActivityFilters {
  entityType?: TimelineActivity['entityType'];
  entityId?: string;
  types?: ActivityType[];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityAggregation {
  period: 'day' | 'week' | 'month';
  activities: Array<{
    date: string;
    total: number;
    byType: Record<ActivityType, number>;
  }>;
}

@Injectable()
export class ActivityTimelineService {
  private readonly logger = new Logger(ActivityTimelineService.name);

  private activities = new Map<string, TimelineActivity>();
  private comments = new Map<string, ActivityComment>();
  private reactions: ActivityReaction[] = [];

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== ACTIVITIES ===================

  async logActivity(data: {
    tenantId: string;
    entityType: TimelineActivity['entityType'];
    entityId: string;
    entityName?: string;
    type: ActivityType;
    action: string;
    description: string;
    details?: Record<string, any>;
    relatedEntities?: TimelineActivity['relatedEntities'];
    userId: string;
    userName?: string;
    userAvatar?: string;
    metadata?: TimelineActivity['metadata'];
    occurredAt?: Date;
  }): Promise<TimelineActivity> {
    const activity: TimelineActivity = {
      id: uuidv4(),
      tenantId: data.tenantId,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      type: data.type,
      action: data.action,
      description: data.description,
      details: data.details,
      relatedEntities: data.relatedEntities,
      userId: data.userId,
      userName: data.userName,
      userAvatar: data.userAvatar,
      metadata: {
        source: 'manual',
        ...data.metadata,
      },
      occurredAt: data.occurredAt || new Date(),
      createdAt: new Date(),
    };

    this.activities.set(activity.id, activity);

    this.eventEmitter.emit('activity.created', {
      activityId: activity.id,
      tenantId: data.tenantId,
      entityType: data.entityType,
      entityId: data.entityId,
    });

    return activity;
  }

  async getActivities(
    tenantId: string,
    filters?: ActivityFilters,
  ): Promise<{ activities: TimelineActivity[]; total: number }> {
    let activities = Array.from(this.activities.values())
      .filter(a => a.tenantId === tenantId);

    // Apply filters
    if (filters) {
      if (filters.entityType) {
        activities = activities.filter(a => a.entityType === filters.entityType);
      }
      if (filters.entityId) {
        activities = activities.filter(a => a.entityId === filters.entityId);
      }
      if (filters.types?.length) {
        activities = activities.filter(a => filters.types!.includes(a.type));
      }
      if (filters.userId) {
        activities = activities.filter(a => a.userId === filters.userId);
      }
      if (filters.startDate) {
        activities = activities.filter(a => a.occurredAt >= filters.startDate!);
      }
      if (filters.endDate) {
        activities = activities.filter(a => a.occurredAt <= filters.endDate!);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        activities = activities.filter(a =>
          a.description.toLowerCase().includes(search) ||
          a.action.toLowerCase().includes(search) ||
          a.entityName?.toLowerCase().includes(search)
        );
      }
    }

    const total = activities.length;

    // Sort by occurred at descending
    activities.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    activities = activities.slice(offset, offset + limit);

    return { activities, total };
  }

  async getEntityTimeline(
    entityType: TimelineActivity['entityType'],
    entityId: string,
    limit = 50,
  ): Promise<TimelineActivity[]> {
    return Array.from(this.activities.values())
      .filter(a => a.entityType === entityType && a.entityId === entityId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  }

  async getUserActivities(userId: string, limit = 50): Promise<TimelineActivity[]> {
    return Array.from(this.activities.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, limit);
  }

  async getActivity(id: string): Promise<TimelineActivity | null> {
    return this.activities.get(id) || null;
  }

  async updateActivity(
    id: string,
    updates: Partial<Pick<TimelineActivity, 'description' | 'details'>>,
  ): Promise<TimelineActivity | null> {
    const activity = this.activities.get(id);
    if (!activity) return null;

    Object.assign(activity, updates);
    this.activities.set(id, activity);

    return activity;
  }

  async deleteActivity(id: string): Promise<void> {
    this.activities.delete(id);

    // Delete related comments and reactions
    for (const [commentId, comment] of this.comments) {
      if (comment.activityId === id) {
        this.comments.delete(commentId);
      }
    }
    this.reactions = this.reactions.filter(r => r.activityId !== id);
  }

  // =================== COMMENTS ===================

  async addComment(data: {
    activityId: string;
    content: string;
    userId: string;
    userName?: string;
  }): Promise<ActivityComment> {
    const comment: ActivityComment = {
      id: uuidv4(),
      activityId: data.activityId,
      content: data.content,
      userId: data.userId,
      userName: data.userName,
      createdAt: new Date(),
    };

    this.comments.set(comment.id, comment);
    return comment;
  }

  async getComments(activityId: string): Promise<ActivityComment[]> {
    return Array.from(this.comments.values())
      .filter(c => c.activityId === activityId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateComment(
    id: string,
    content: string,
  ): Promise<ActivityComment | null> {
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

  // =================== REACTIONS ===================

  async addReaction(data: {
    activityId: string;
    userId: string;
    type: ActivityReaction['type'];
  }): Promise<ActivityReaction> {
    // Remove existing reaction from same user
    this.reactions = this.reactions.filter(
      r => !(r.activityId === data.activityId && r.userId === data.userId)
    );

    const reaction: ActivityReaction = {
      activityId: data.activityId,
      userId: data.userId,
      type: data.type,
      createdAt: new Date(),
    };

    this.reactions.push(reaction);
    return reaction;
  }

  async removeReaction(activityId: string, userId: string): Promise<void> {
    this.reactions = this.reactions.filter(
      r => !(r.activityId === activityId && r.userId === userId)
    );
  }

  async getReactions(activityId: string): Promise<{
    total: number;
    byType: Record<ActivityReaction['type'], number>;
    users: Array<{ userId: string; type: ActivityReaction['type'] }>;
  }> {
    const activityReactions = this.reactions.filter(r => r.activityId === activityId);

    const byType: Record<string, number> = {
      like: 0,
      love: 0,
      celebrate: 0,
      helpful: 0,
    };

    for (const reaction of activityReactions) {
      byType[reaction.type]++;
    }

    return {
      total: activityReactions.length,
      byType: byType as Record<ActivityReaction['type'], number>,
      users: activityReactions.map(r => ({ userId: r.userId, type: r.type })),
    };
  }

  // =================== AGGREGATIONS ===================

  async getActivityAggregation(
    tenantId: string,
    period: 'day' | 'week' | 'month',
    startDate: Date,
    endDate: Date,
  ): Promise<ActivityAggregation> {
    const activities = Array.from(this.activities.values())
      .filter(a =>
        a.tenantId === tenantId &&
        a.occurredAt >= startDate &&
        a.occurredAt <= endDate
      );

    const aggregation: Map<string, { total: number; byType: Record<string, number> }> = new Map();

    for (const activity of activities) {
      let dateKey: string;
      const date = activity.occurredAt;

      if (period === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = date.toISOString().substring(0, 7);
      }

      const existing = aggregation.get(dateKey) || { total: 0, byType: {} };
      existing.total++;
      existing.byType[activity.type] = (existing.byType[activity.type] || 0) + 1;
      aggregation.set(dateKey, existing);
    }

    return {
      period,
      activities: Array.from(aggregation.entries())
        .map(([date, data]) => ({
          date,
          total: data.total,
          byType: data.byType as Record<ActivityType, number>,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getActivitySummary(
    tenantId: string,
    days = 30,
  ): Promise<{
    totalActivities: number;
    byType: Record<ActivityType, number>;
    byUser: Array<{ userId: string; userName?: string; count: number }>;
    byEntity: Array<{ entityType: string; count: number }>;
    recentTrend: Array<{ date: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = Array.from(this.activities.values())
      .filter(a => a.tenantId === tenantId && a.occurredAt >= startDate);

    const byType: Record<string, number> = {};
    const byUserMap = new Map<string, { userName?: string; count: number }>();
    const byEntityMap = new Map<string, number>();
    const byDateMap = new Map<string, number>();

    for (const activity of activities) {
      // By type
      byType[activity.type] = (byType[activity.type] || 0) + 1;

      // By user
      const userEntry = byUserMap.get(activity.userId) || { userName: activity.userName, count: 0 };
      userEntry.count++;
      byUserMap.set(activity.userId, userEntry);

      // By entity
      byEntityMap.set(activity.entityType, (byEntityMap.get(activity.entityType) || 0) + 1);

      // By date
      const dateKey = activity.occurredAt.toISOString().split('T')[0];
      byDateMap.set(dateKey, (byDateMap.get(dateKey) || 0) + 1);
    }

    return {
      totalActivities: activities.length,
      byType: byType as Record<ActivityType, number>,
      byUser: Array.from(byUserMap.entries())
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      byEntity: Array.from(byEntityMap.entries())
        .map(([entityType, count]) => ({ entityType, count }))
        .sort((a, b) => b.count - a.count),
      recentTrend: Array.from(byDateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // =================== EVENT HANDLERS ===================

  @OnEvent('contact.created')
  async handleContactCreated(payload: { contactId: string; tenantId: string }) {
    // Log automatically when event is emitted
    this.logger.debug(`Contact created event: ${payload.contactId}`);
  }

  @OnEvent('deal.created')
  async handleDealCreated(payload: { dealId: string; tenantId: string; pipelineId: string }) {
    this.logger.debug(`Deal created event: ${payload.dealId}`);
  }

  @OnEvent('deal.stage-changed')
  async handleDealStageChanged(payload: {
    dealId: string;
    previousStage: string;
    newStage: string;
    status: string;
  }) {
    this.logger.debug(`Deal stage changed: ${payload.dealId} -> ${payload.newStage}`);
  }

  @OnEvent('deal.won')
  async handleDealWon(payload: { dealId: string; amount: number; tenantId: string }) {
    this.logger.debug(`Deal won: ${payload.dealId}, amount: ${payload.amount}`);
  }

  @OnEvent('deal.lost')
  async handleDealLost(payload: { dealId: string; amount: number; tenantId: string }) {
    this.logger.debug(`Deal lost: ${payload.dealId}`);
  }

  // =================== STATS ===================

  async getStats(tenantId: string): Promise<{
    totalActivities: number;
    todayActivities: number;
    weekActivities: number;
    topActivityTypes: Array<{ type: ActivityType; count: number }>;
    mostActiveUsers: Array<{ userId: string; count: number }>;
  }> {
    const activities = Array.from(this.activities.values())
      .filter(a => a.tenantId === tenantId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const typeCount = new Map<ActivityType, number>();
    const userCount = new Map<string, number>();

    for (const activity of activities) {
      typeCount.set(activity.type, (typeCount.get(activity.type) || 0) + 1);
      userCount.set(activity.userId, (userCount.get(activity.userId) || 0) + 1);
    }

    return {
      totalActivities: activities.length,
      todayActivities: activities.filter(a => a.occurredAt >= todayStart).length,
      weekActivities: activities.filter(a => a.occurredAt >= weekStart).length,
      topActivityTypes: Array.from(typeCount.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      mostActiveUsers: Array.from(userCount.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }
}
