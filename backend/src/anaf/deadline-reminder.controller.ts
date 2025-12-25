import { Controller, Get, Post, Param, Body, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { DeadlineReminderService, DeadlineReminder, DeadlineType } from './deadline-reminder.service';
import { CacheInterceptor, CacheKey, CacheTTLDecorator, CacheTags } from '../cache/cache.interceptor';
import { CacheTTL } from '../cache/redis-cache.service';

@ApiTags('Deadline Reminders')
@Controller('deadlines')
export class DeadlineReminderController {
  constructor(private readonly deadlineService: DeadlineReminderService) {}

  @Get('configs')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('deadlines:configs')
  @CacheTTLDecorator(CacheTTL.DAY) // 24 hours - configurations rarely change
  @CacheTags('deadlines', 'configs', 'compliance')
  @ApiOperation({
    summary: 'Get deadline configurations',
    description: 'Returns all ANAF compliance deadline configurations',
  })
  @ApiResponse({ status: 200, description: 'Deadline configurations' })
  getConfigs() {
    return {
      configs: this.deadlineService.getDeadlineConfigs(),
      law: 'Ordin 1783/2021, Legea 141/2025',
    };
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Get upcoming deadlines',
    description: 'Returns all deadlines within the specified number of days',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look ahead (default: 30)' })
  @ApiResponse({ status: 200, description: 'List of upcoming deadlines' })
  getUpcoming(@Query('days') days?: string) {
    const daysNumber = parseInt(days || '30', 10);
    return {
      deadlines: this.deadlineService.getUpcomingDeadlines(daysNumber),
      period: `${daysNumber} days`,
    };
  }

  @Get('overdue')
  @ApiOperation({
    summary: 'Get overdue deadlines',
    description: 'Returns all deadlines that are past due',
  })
  @ApiResponse({ status: 200, description: 'List of overdue deadlines' })
  getOverdue() {
    return {
      deadlines: this.deadlineService.getOverdueDeadlines(),
      alert: 'ATENȚIE: Termenele depășite pot atrage penalități!',
    };
  }

  @Get('summary')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('deadlines:summary')
  @CacheTTLDecorator(CacheTTL.MEDIUM) // 5 minutes - summary changes with time
  @CacheTags('deadlines', 'summary')
  @ApiOperation({
    summary: 'Get deadline summary',
    description: 'Returns a summary of deadlines for dashboard display',
  })
  @ApiResponse({ status: 200, description: 'Deadline summary' })
  getSummary() {
    return this.deadlineService.getDeadlineSummary();
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Mark deadline as completed',
    description: 'Marks a deadline reminder as completed',
  })
  @ApiResponse({ status: 200, description: 'Deadline marked as completed' })
  @ApiResponse({ status: 404, description: 'Deadline not found' })
  markCompleted(@Param('id') id: string) {
    const success = this.deadlineService.markCompleted(id);
    if (!success) {
      return { error: 'Deadline not found', statusCode: 404 };
    }
    return { message: 'Deadline marked as completed', id };
  }

  @Post('custom')
  @ApiOperation({
    summary: 'Create custom deadline reminder',
    description: 'Creates a custom deadline reminder for a user',
  })
  @ApiResponse({ status: 201, description: 'Custom deadline created' })
  async createCustom(
    @Body() body: {
      userId: string;
      type: DeadlineType;
      description: string;
      dueDate: string;
      reminderDays?: number[];
    },
  ): Promise<DeadlineReminder> {
    return this.deadlineService.createCustomReminder(
      body.userId,
      body.type,
      body.description,
      new Date(body.dueDate),
      body.reminderDays,
    );
  }
}
