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
  ScheduledReportsService,
  ScheduleFrequency,
  ReportSchedule,
  ReportFormat,
  DeliveryConfig,
  ScheduleFilter,
  Recipient,
  RetryConfig,
} from './scheduled-reports.service';

@ApiTags('Business Intelligence - Scheduled Reports')
@Controller('bi/schedules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ScheduledReportsController {
  constructor(private readonly scheduleService: ScheduledReportsService) {}

  // =================== SCHEDULES ===================

  @Post()
  @ApiOperation({ summary: 'Create scheduled report' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createSchedule(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      reportId: string;
      reportName: string;
      schedule: ReportSchedule;
      parameters: Record<string, any>;
      outputFormat: ReportFormat;
      delivery: DeliveryConfig;
      filters?: ScheduleFilter[];
      recipients: Recipient[];
      retryConfig?: RetryConfig;
    },
  ) {
    return this.scheduleService.createSchedule({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get scheduled reports' })
  @ApiQuery({ name: 'reportId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'frequency', required: false })
  @ApiResponse({ status: 200, description: 'Schedules list' })
  async getSchedules(
    @Request() req: any,
    @Query('reportId') reportId?: string,
    @Query('isActive') isActive?: string,
    @Query('frequency') frequency?: ScheduleFrequency,
  ) {
    const schedules = await this.scheduleService.getSchedules(req.user.tenantId, {
      reportId,
      isActive: isActive ? isActive === 'true' : undefined,
      frequency,
    });
    return { schedules, total: schedules.length };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get schedule stats' })
  @ApiResponse({ status: 200, description: 'Schedule statistics' })
  async getStats(@Request() req: any) {
    return this.scheduleService.getStats(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule details' })
  @ApiResponse({ status: 200, description: 'Schedule details' })
  async getSchedule(@Param('id') id: string) {
    const schedule = await this.scheduleService.getSchedule(id);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated' })
  async updateSchedule(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      schedule: ReportSchedule;
      parameters: Record<string, any>;
      outputFormat: ReportFormat;
      delivery: DeliveryConfig;
      filters: ScheduleFilter[];
      recipients: Recipient[];
      retryConfig: RetryConfig;
      isActive: boolean;
    }>,
  ) {
    const schedule = await this.scheduleService.updateSchedule(id, body);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deleted' })
  async deleteSchedule(@Param('id') id: string) {
    await this.scheduleService.deleteSchedule(id);
    return { success: true };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate schedule' })
  @ApiResponse({ status: 200, description: 'Schedule activated' })
  async activateSchedule(@Param('id') id: string) {
    const schedule = await this.scheduleService.activateSchedule(id);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deactivated' })
  async deactivateSchedule(@Param('id') id: string) {
    const schedule = await this.scheduleService.deactivateSchedule(id);
    if (!schedule) {
      return { error: 'Schedule not found' };
    }
    return schedule;
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Run schedule now' })
  @ApiResponse({ status: 200, description: 'Schedule run triggered' })
  async runNow(@Param('id') id: string) {
    const run = await this.scheduleService.runNow(id);
    if (!run) {
      return { error: 'Schedule not found' };
    }
    return run;
  }

  // =================== RUNS ===================

  @Get(':id/runs')
  @ApiOperation({ summary: 'Get schedule runs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Runs list' })
  async getRuns(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    const runs = await this.scheduleService.getRuns(id, {
      status: status as any,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { runs, total: runs.length };
  }

  @Get('runs/:runId')
  @ApiOperation({ summary: 'Get run details' })
  @ApiResponse({ status: 200, description: 'Run details' })
  async getRun(@Param('runId') runId: string) {
    const run = await this.scheduleService.getRun(runId);
    if (!run) {
      return { error: 'Run not found' };
    }
    return run;
  }

  @Post('runs/:runId/cancel')
  @ApiOperation({ summary: 'Cancel run' })
  @ApiResponse({ status: 200, description: 'Run cancelled' })
  async cancelRun(@Param('runId') runId: string) {
    const run = await this.scheduleService.cancelRun(runId);
    if (!run) {
      return { error: 'Run not found or not running' };
    }
    return run;
  }

  // =================== BULK OPERATIONS ===================

  @Post('bulk/activate')
  @ApiOperation({ summary: 'Bulk activate schedules' })
  @ApiResponse({ status: 200, description: 'Schedules activated' })
  async bulkActivate(@Body() body: { ids: string[] }) {
    const count = await this.scheduleService.bulkActivate(body.ids);
    return { success: true, activated: count };
  }

  @Post('bulk/deactivate')
  @ApiOperation({ summary: 'Bulk deactivate schedules' })
  @ApiResponse({ status: 200, description: 'Schedules deactivated' })
  async bulkDeactivate(@Body() body: { ids: string[] }) {
    const count = await this.scheduleService.bulkDeactivate(body.ids);
    return { success: true, deactivated: count };
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete schedules' })
  @ApiResponse({ status: 200, description: 'Schedules deleted' })
  async bulkDelete(@Body() body: { ids: string[] }) {
    const count = await this.scheduleService.bulkDelete(body.ids);
    return { success: true, deleted: count };
  }
}
