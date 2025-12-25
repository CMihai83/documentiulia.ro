import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ActivityTimelineService,
  TimelineActivity,
  ActivityType,
  ActivityReaction,
} from './activity-timeline.service';

@ApiTags('CRM - Activity Timeline')
@Controller('crm/activities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityTimelineController {
  constructor(private readonly activityService: ActivityTimelineService) {}

  // =================== ACTIVITIES ===================

  @Post()
  @ApiOperation({ summary: 'Log activity' })
  @ApiResponse({ status: 201, description: 'Activity logged' })
  async logActivity(
    @Request() req: any,
    @Body() body: {
      entityType: TimelineActivity['entityType'];
      entityId: string;
      entityName?: string;
      type: ActivityType;
      action: string;
      description: string;
      details?: Record<string, any>;
      relatedEntities?: TimelineActivity['relatedEntities'];
      occurredAt?: string;
    },
  ) {
    return this.activityService.logActivity({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      userName: req.user.name,
      userAvatar: req.user.avatar,
      entityType: body.entityType,
      entityId: body.entityId,
      entityName: body.entityName,
      type: body.type,
      action: body.action,
      description: body.description,
      details: body.details,
      relatedEntities: body.relatedEntities,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
      metadata: {
        source: 'manual',
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get activities' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'types', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Activities list' })
  async getActivities(
    @Request() req: any,
    @Query('entityType') entityType?: TimelineActivity['entityType'],
    @Query('entityId') entityId?: string,
    @Query('types') types?: string,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.activityService.getActivities(req.user.tenantId, {
      entityType,
      entityId,
      types: types ? types.split(',') as ActivityType[] : undefined,
      userId,
      search,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get entity timeline' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Entity timeline' })
  async getEntityTimeline(
    @Param('entityType') entityType: TimelineActivity['entityType'],
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
  ) {
    const activities = await this.activityService.getEntityTimeline(
      entityType,
      entityId,
      limit ? parseInt(limit) : 50,
    );
    return { activities, total: activities.length };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User activities' })
  async getUserActivities(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const activities = await this.activityService.getUserActivities(
      userId,
      limit ? parseInt(limit) : 50,
    );
    return { activities, total: activities.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get activity details' })
  @ApiResponse({ status: 200, description: 'Activity details' })
  async getActivity(@Param('id') id: string) {
    const activity = await this.activityService.getActivity(id);
    if (!activity) {
      return { error: 'Activity not found' };
    }
    return activity;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update activity' })
  @ApiResponse({ status: 200, description: 'Activity updated' })
  async updateActivity(
    @Param('id') id: string,
    @Body() body: Partial<Pick<TimelineActivity, 'description' | 'details'>>,
  ) {
    const activity = await this.activityService.updateActivity(id, body);
    if (!activity) {
      return { error: 'Activity not found' };
    }
    return activity;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete activity' })
  @ApiResponse({ status: 200, description: 'Activity deleted' })
  async deleteActivity(@Param('id') id: string) {
    await this.activityService.deleteActivity(id);
    return { success: true };
  }

  // =================== COMMENTS ===================

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to activity' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(
    @Request() req: any,
    @Param('id') activityId: string,
    @Body() body: { content: string },
  ) {
    return this.activityService.addComment({
      activityId,
      content: body.content,
      userId: req.user.id,
      userName: req.user.name,
    });
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get activity comments' })
  @ApiResponse({ status: 200, description: 'Activity comments' })
  async getComments(@Param('id') activityId: string) {
    const comments = await this.activityService.getComments(activityId);
    return { comments, total: comments.length };
  }

  @Put('comments/:commentId')
  @ApiOperation({ summary: 'Update comment' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() body: { content: string },
  ) {
    const comment = await this.activityService.updateComment(commentId, body.content);
    if (!comment) {
      return { error: 'Comment not found' };
    }
    return comment;
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  async deleteComment(@Param('commentId') commentId: string) {
    await this.activityService.deleteComment(commentId);
    return { success: true };
  }

  // =================== REACTIONS ===================

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add reaction to activity' })
  @ApiResponse({ status: 201, description: 'Reaction added' })
  async addReaction(
    @Request() req: any,
    @Param('id') activityId: string,
    @Body() body: { type: ActivityReaction['type'] },
  ) {
    return this.activityService.addReaction({
      activityId,
      userId: req.user.id,
      type: body.type,
    });
  }

  @Delete(':id/reactions')
  @ApiOperation({ summary: 'Remove reaction from activity' })
  @ApiResponse({ status: 200, description: 'Reaction removed' })
  async removeReaction(
    @Request() req: any,
    @Param('id') activityId: string,
  ) {
    await this.activityService.removeReaction(activityId, req.user.id);
    return { success: true };
  }

  @Get(':id/reactions')
  @ApiOperation({ summary: 'Get activity reactions' })
  @ApiResponse({ status: 200, description: 'Activity reactions' })
  async getReactions(@Param('id') activityId: string) {
    return this.activityService.getReactions(activityId);
  }

  // =================== AGGREGATIONS ===================

  @Get('aggregation/timeline')
  @ApiOperation({ summary: 'Get activity aggregation' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiResponse({ status: 200, description: 'Activity aggregation' })
  async getAggregation(
    @Request() req: any,
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.activityService.getActivityAggregation(
      req.user.tenantId,
      period,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('summary/overview')
  @ApiOperation({ summary: 'Get activity summary' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Activity summary' })
  async getSummary(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    return this.activityService.getActivitySummary(
      req.user.tenantId,
      days ? parseInt(days) : 30,
    );
  }

  // =================== STATS ===================

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get activity stats' })
  @ApiResponse({ status: 200, description: 'Activity stats' })
  async getStats(@Request() req: any) {
    return this.activityService.getStats(req.user.tenantId);
  }
}
