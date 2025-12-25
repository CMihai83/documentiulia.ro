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
  TimeTrackingService,
  TimeEntry,
  ActivityType,
} from './time-tracking.service';

@ApiTags('Project Management - Time Tracking')
@Controller('pm/time')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TimeTrackingController {
  constructor(private readonly timeService: TimeTrackingService) {}

  // =================== TIME ENTRIES ===================

  @Post('entries')
  @ApiOperation({ summary: 'Create time entry' })
  @ApiResponse({ status: 201, description: 'Entry created' })
  async createEntry(
    @Request() req: any,
    @Body() body: {
      taskId?: string;
      projectId?: string;
      description: string;
      date: string;
      startTime?: string;
      endTime?: string;
      duration?: number;
      billable?: boolean;
      billableRate?: number;
      activityType?: ActivityType;
      tags?: string[];
    },
  ) {
    return this.timeService.createEntry({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      userName: req.user.name,
      taskId: body.taskId,
      projectId: body.projectId,
      description: body.description,
      date: new Date(body.date),
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      duration: body.duration,
      billable: body.billable,
      billableRate: body.billableRate,
      activityType: body.activityType,
      tags: body.tags,
    });
  }

  @Get('entries')
  @ApiOperation({ summary: 'Get time entries' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'billable', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Time entries' })
  async getEntries(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('taskId') taskId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('billable') billable?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.timeService.getEntries(req.user.tenantId, {
      userId,
      taskId,
      projectId,
      status: status as TimeEntry['status'],
      billable: billable ? billable === 'true' : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('entries/my')
  @ApiOperation({ summary: 'Get my time entries' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'My time entries' })
  async getMyEntries(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeService.getEntries(req.user.tenantId, {
      userId: req.user.id,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('entries/:id')
  @ApiOperation({ summary: 'Get entry details' })
  @ApiResponse({ status: 200, description: 'Entry details' })
  async getEntry(@Param('id') id: string) {
    const entry = await this.timeService.getEntry(id);
    if (!entry) {
      return { error: 'Entry not found' };
    }
    return entry;
  }

  @Put('entries/:id')
  @ApiOperation({ summary: 'Update entry' })
  @ApiResponse({ status: 200, description: 'Entry updated' })
  async updateEntry(
    @Param('id') id: string,
    @Body() body: Partial<{
      description: string;
      date: string;
      startTime: string;
      endTime: string;
      duration: number;
      billable: boolean;
      billableRate: number;
      activityType: ActivityType;
      tags: string[];
      taskId: string;
      projectId: string;
    }>,
  ) {
    const updates = {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    };
    const entry = await this.timeService.updateEntry(id, updates);
    if (!entry) {
      return { error: 'Entry not found' };
    }
    return entry;
  }

  @Delete('entries/:id')
  @ApiOperation({ summary: 'Delete entry' })
  @ApiResponse({ status: 200, description: 'Entry deleted' })
  async deleteEntry(@Param('id') id: string) {
    await this.timeService.deleteEntry(id);
    return { success: true };
  }

  @Post('entries/:id/submit')
  @ApiOperation({ summary: 'Submit entry for approval' })
  @ApiResponse({ status: 200, description: 'Entry submitted' })
  async submitEntry(@Param('id') id: string) {
    const entry = await this.timeService.submitEntry(id);
    if (!entry) {
      return { error: 'Entry not found' };
    }
    return entry;
  }

  @Post('entries/:id/approve')
  @ApiOperation({ summary: 'Approve entry' })
  @ApiResponse({ status: 200, description: 'Entry approved' })
  async approveEntry(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const entry = await this.timeService.approveEntry(id, req.user.id);
    if (!entry) {
      return { error: 'Entry not found' };
    }
    return entry;
  }

  @Post('entries/:id/reject')
  @ApiOperation({ summary: 'Reject entry' })
  @ApiResponse({ status: 200, description: 'Entry rejected' })
  async rejectEntry(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const entry = await this.timeService.rejectEntry(id, req.user.id, body.reason);
    if (!entry) {
      return { error: 'Entry not found' };
    }
    return entry;
  }

  // =================== TIMERS ===================

  @Post('timer/start')
  @ApiOperation({ summary: 'Start timer' })
  @ApiResponse({ status: 201, description: 'Timer started' })
  async startTimer(
    @Request() req: any,
    @Body() body: {
      taskId?: string;
      projectId?: string;
      description: string;
    },
  ) {
    return this.timeService.startTimer({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      ...body,
    });
  }

  @Post('timer/:id/pause')
  @ApiOperation({ summary: 'Pause timer' })
  @ApiResponse({ status: 200, description: 'Timer paused' })
  async pauseTimer(@Param('id') id: string) {
    const timer = await this.timeService.pauseTimer(id);
    if (!timer) {
      return { error: 'Timer not found or not running' };
    }
    return timer;
  }

  @Post('timer/:id/resume')
  @ApiOperation({ summary: 'Resume timer' })
  @ApiResponse({ status: 200, description: 'Timer resumed' })
  async resumeTimer(@Param('id') id: string) {
    const timer = await this.timeService.resumeTimer(id);
    if (!timer) {
      return { error: 'Timer not found or already running' };
    }
    return timer;
  }

  @Post('timer/:id/stop')
  @ApiOperation({ summary: 'Stop timer and create entry' })
  @ApiResponse({ status: 200, description: 'Timer stopped' })
  async stopTimer(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const entry = await this.timeService.stopTimer(id, req.user.id);
    if (!entry) {
      return { error: 'Timer not found' };
    }
    return entry;
  }

  @Delete('timer/:id')
  @ApiOperation({ summary: 'Discard timer' })
  @ApiResponse({ status: 200, description: 'Timer discarded' })
  async discardTimer(@Param('id') id: string) {
    await this.timeService.discardTimer(id);
    return { success: true };
  }

  @Get('timer/running')
  @ApiOperation({ summary: 'Get running timer' })
  @ApiResponse({ status: 200, description: 'Running timer' })
  async getRunningTimer(@Request() req: any) {
    const timer = await this.timeService.getRunningTimer(req.user.tenantId, req.user.id);
    if (!timer) {
      return { running: false };
    }
    return { running: true, timer };
  }

  @Get('timers')
  @ApiOperation({ summary: 'Get my timers' })
  @ApiResponse({ status: 200, description: 'My timers' })
  async getTimers(@Request() req: any) {
    const timers = await this.timeService.getTimers(req.user.tenantId, req.user.id);
    return { timers, total: timers.length };
  }

  // =================== TIMESHEETS ===================

  @Post('timesheets')
  @ApiOperation({ summary: 'Create timesheet' })
  @ApiResponse({ status: 201, description: 'Timesheet created' })
  async createTimesheet(
    @Request() req: any,
    @Body() body: { weekStartDate: string },
  ) {
    return this.timeService.createTimesheet({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      userName: req.user.name,
      weekStartDate: new Date(body.weekStartDate),
    });
  }

  @Get('timesheets')
  @ApiOperation({ summary: 'Get timesheets' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200, description: 'Timesheets' })
  async getTimesheets(
    @Request() req: any,
    @Query('userId') userId?: string,
  ) {
    const timesheets = await this.timeService.getTimesheets(req.user.tenantId, userId);
    return { timesheets, total: timesheets.length };
  }

  @Get('timesheets/:id')
  @ApiOperation({ summary: 'Get timesheet details' })
  @ApiResponse({ status: 200, description: 'Timesheet details' })
  async getTimesheet(@Param('id') id: string) {
    const timesheet = await this.timeService.getTimesheet(id);
    if (!timesheet) {
      return { error: 'Timesheet not found' };
    }
    return timesheet;
  }

  @Post('timesheets/:id/submit')
  @ApiOperation({ summary: 'Submit timesheet' })
  @ApiResponse({ status: 200, description: 'Timesheet submitted' })
  async submitTimesheet(
    @Param('id') id: string,
    @Body() body: { comments?: string },
  ) {
    const timesheet = await this.timeService.submitTimesheet(id, body.comments);
    if (!timesheet) {
      return { error: 'Timesheet not found' };
    }
    return timesheet;
  }

  @Post('timesheets/:id/approve')
  @ApiOperation({ summary: 'Approve timesheet' })
  @ApiResponse({ status: 200, description: 'Timesheet approved' })
  async approveTimesheet(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const timesheet = await this.timeService.approveTimesheet(id, req.user.id);
    if (!timesheet) {
      return { error: 'Timesheet not found' };
    }
    return timesheet;
  }

  @Post('timesheets/:id/reject')
  @ApiOperation({ summary: 'Reject timesheet' })
  @ApiResponse({ status: 200, description: 'Timesheet rejected' })
  async rejectTimesheet(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const timesheet = await this.timeService.rejectTimesheet(id, req.user.id, body.reason);
    if (!timesheet) {
      return { error: 'Timesheet not found' };
    }
    return timesheet;
  }

  // =================== REPORTS ===================

  @Get('reports')
  @ApiOperation({ summary: 'Generate time report' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiResponse({ status: 200, description: 'Time report' })
  async generateReport(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.timeService.generateReport(
      req.user.tenantId,
      new Date(startDate),
      new Date(endDate),
      { userId, projectId },
    );
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get time tracking stats' })
  @ApiResponse({ status: 200, description: 'Time stats' })
  async getStats(@Request() req: any) {
    return this.timeService.getStats(req.user.tenantId, req.user.id);
  }

  @Get('stats/team')
  @ApiOperation({ summary: 'Get team time stats' })
  @ApiResponse({ status: 200, description: 'Team time stats' })
  async getTeamStats(@Request() req: any) {
    return this.timeService.getStats(req.user.tenantId);
  }
}
