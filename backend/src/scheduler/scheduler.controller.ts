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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  SchedulerService,
  JobType,
  JobStatus,
  JobPriority,
  RecurrencePattern,
  JobQuery,
} from './scheduler.service';

@ApiTags('Scheduler')
@Controller('scheduler')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  // =================== JOB MANAGEMENT ===================

  @Get('jobs')
  @ApiOperation({ summary: 'Get scheduled jobs with filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'enabled', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of scheduled jobs' })
  async getJobs(
    @Query('type') type?: JobType,
    @Query('status') status?: JobStatus,
    @Query('priority') priority?: JobPriority,
    @Query('enabled') enabled?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: JobQuery = {
      type,
      status,
      priority,
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };
    return this.schedulerService.queryJobs(query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get scheduled job by ID' })
  @ApiResponse({ status: 200, description: 'Scheduled job details' })
  async getJob(@Param('id') id: string) {
    const job = await this.schedulerService.getJob(id);
    return job || { error: 'Job not found' };
  }

  @Post('jobs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create scheduled job' })
  @ApiResponse({ status: 201, description: 'Scheduled job created' })
  async createJob(
    @Body() body: {
      name: string;
      nameRo?: string;
      description?: string;
      descriptionRo?: string;
      type: JobType;
      priority?: JobPriority;
      handler: string;
      payload: Record<string, any>;
      schedule: {
        pattern: RecurrencePattern;
        startAt?: string;
        endAt?: string;
        cronExpression?: string;
        timezone?: string;
        interval?: number;
        daysOfWeek?: number[];
        daysOfMonth?: number[];
        monthsOfYear?: number[];
      };
      retryConfig?: {
        maxRetries?: number;
        retryDelay?: number;
        backoffMultiplier?: number;
        maxDelay?: number;
      };
      timeout?: number;
      tags?: string[];
      metadata?: Record<string, any>;
      organizationId?: string;
      userId?: string;
      enabled?: boolean;
    },
  ) {
    return this.schedulerService.createJob(
      body.name,
      body.type,
      body.handler,
      body.payload,
      {
        pattern: body.schedule.pattern,
        cronExpression: body.schedule.cronExpression,
        interval: body.schedule.interval,
        timezone: body.schedule.timezone,
        startAt: body.schedule.startAt ? new Date(body.schedule.startAt) : undefined,
        endAt: body.schedule.endAt ? new Date(body.schedule.endAt) : undefined,
        daysOfWeek: body.schedule.daysOfWeek,
        daysOfMonth: body.schedule.daysOfMonth,
        monthsOfYear: body.schedule.monthsOfYear,
      },
      {
        nameRo: body.nameRo,
        description: body.description,
        descriptionRo: body.descriptionRo,
        priority: body.priority,
        timeout: body.timeout,
        retryConfig: body.retryConfig,
        organizationId: body.organizationId,
        userId: body.userId,
        tags: body.tags,
        metadata: body.metadata,
        enabled: body.enabled,
      },
    );
  }

  @Post('jobs/once')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Schedule one-time job' })
  @ApiResponse({ status: 201, description: 'One-time job scheduled' })
  async scheduleOnce(
    @Body() body: {
      name: string;
      type: JobType;
      handler: string;
      payload: Record<string, any>;
      runAt: string;
      priority?: JobPriority;
      organizationId?: string;
      userId?: string;
    },
  ) {
    return this.schedulerService.scheduleOnce(
      body.name,
      body.type,
      body.handler,
      body.payload,
      new Date(body.runAt),
      {
        priority: body.priority,
        organizationId: body.organizationId,
        userId: body.userId,
      },
    );
  }

  @Post('jobs/cron')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Schedule cron job' })
  @ApiResponse({ status: 201, description: 'Cron job scheduled' })
  async scheduleCron(
    @Body() body: {
      name: string;
      type: JobType;
      handler: string;
      payload: Record<string, any>;
      cronExpression: string;
      priority?: JobPriority;
      organizationId?: string;
      userId?: string;
      timezone?: string;
    },
  ) {
    return this.schedulerService.scheduleCron(
      body.name,
      body.type,
      body.handler,
      body.payload,
      body.cronExpression,
      {
        priority: body.priority,
        organizationId: body.organizationId,
        userId: body.userId,
        timezone: body.timezone,
      },
    );
  }

  @Put('jobs/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update scheduled job' })
  @ApiResponse({ status: 200, description: 'Scheduled job updated' })
  async updateJob(
    @Param('id') id: string,
    @Body() updates: {
      name?: string;
      nameRo?: string;
      description?: string;
      descriptionRo?: string;
      priority?: JobPriority;
      payload?: Record<string, any>;
      schedule?: {
        pattern?: RecurrencePattern;
        cronExpression?: string;
        timezone?: string;
        interval?: number;
      };
      retryConfig?: {
        maxRetries?: number;
        retryDelay?: number;
        backoffMultiplier?: number;
      };
      timeout?: number;
      tags?: string[];
      metadata?: Record<string, any>;
      enabled?: boolean;
    },
  ) {
    return this.schedulerService.updateJob(id, updates);
  }

  @Delete('jobs/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete scheduled job' })
  @ApiQuery({ name: 'force', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Scheduled job deleted' })
  async deleteJob(
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    await this.schedulerService.deleteJob(id, force === 'true');
    return { success: true };
  }

  // =================== JOB ACTIONS ===================

  @Post('jobs/:id/run')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Run job immediately' })
  @ApiResponse({ status: 200, description: 'Job execution started' })
  async runJob(@Param('id') id: string) {
    return this.schedulerService.runJobNow(id);
  }

  @Post('jobs/:id/pause')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Pause scheduled job' })
  @ApiResponse({ status: 200, description: 'Job paused' })
  async pauseJob(@Param('id') id: string) {
    return this.schedulerService.pauseJob(id);
  }

  @Post('jobs/:id/resume')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resume paused job' })
  @ApiResponse({ status: 200, description: 'Job resumed' })
  async resumeJob(@Param('id') id: string) {
    return this.schedulerService.resumeJob(id);
  }

  @Post('jobs/:id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  async cancelJob(@Param('id') id: string) {
    return this.schedulerService.cancelJob(id);
  }

  @Post('jobs/:id/retry')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Retry failed job' })
  @ApiResponse({ status: 200, description: 'Job retry started' })
  async retryJob(@Param('id') id: string) {
    return this.schedulerService.retryJob(id);
  }

  @Post('jobs/:id/enable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Enable scheduled job' })
  @ApiResponse({ status: 200, description: 'Job enabled' })
  async enableJob(@Param('id') id: string) {
    return this.schedulerService.updateJob(id, { enabled: true });
  }

  @Post('jobs/:id/disable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Disable scheduled job' })
  @ApiResponse({ status: 200, description: 'Job disabled' })
  async disableJob(@Param('id') id: string) {
    return this.schedulerService.updateJob(id, { enabled: false });
  }

  // =================== JOB HISTORY ===================

  @Get('jobs/:id/executions')
  @ApiOperation({ summary: 'Get job execution history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Execution history' })
  async getJobExecutions(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.schedulerService.getJobExecutions(id, limit ? parseInt(limit) : 10);
  }

  @Get('jobs/:id/last-execution')
  @ApiOperation({ summary: 'Get last job execution' })
  @ApiResponse({ status: 200, description: 'Last execution details' })
  async getLastExecution(@Param('id') id: string) {
    const execution = await this.schedulerService.getLastExecution(id);
    return execution || { error: 'No executions found' };
  }

  // =================== SCHEDULER CONTROL ===================

  @Post('start')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Start the scheduler' })
  @ApiResponse({ status: 200, description: 'Scheduler started' })
  startScheduler() {
    this.schedulerService.start();
    return { success: true, running: true };
  }

  @Post('stop')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Stop the scheduler' })
  @ApiResponse({ status: 200, description: 'Scheduler stopped' })
  stopScheduler() {
    this.schedulerService.stop();
    return { success: true, running: false };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get scheduler status' })
  @ApiResponse({ status: 200, description: 'Scheduler status' })
  getSchedulerStatus() {
    return {
      running: this.schedulerService.isSchedulerRunning(),
    };
  }

  // =================== QUEUES ===================

  @Get('queues')
  @ApiOperation({ summary: 'Get all job queues' })
  @ApiResponse({ status: 200, description: 'List of queues' })
  getQueues() {
    return this.schedulerService.getAllQueues();
  }

  @Get('queues/:id')
  @ApiOperation({ summary: 'Get queue by ID' })
  @ApiResponse({ status: 200, description: 'Queue details' })
  getQueue(@Param('id') id: string) {
    const queue = this.schedulerService.getQueue(id);
    return queue || { error: 'Queue not found' };
  }

  @Post('queues/:id/pause')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Pause queue' })
  @ApiResponse({ status: 200, description: 'Queue paused' })
  async pauseQueue(@Param('id') id: string) {
    return this.schedulerService.pauseQueue(id);
  }

  @Post('queues/:id/resume')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resume queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed' })
  async resumeQueue(@Param('id') id: string) {
    return this.schedulerService.resumeQueue(id);
  }

  // =================== HANDLERS ===================

  @Get('handlers/:name/exists')
  @ApiOperation({ summary: 'Check if handler exists' })
  @ApiResponse({ status: 200, description: 'Handler existence' })
  hasHandler(@Param('name') name: string) {
    return { name, exists: this.schedulerService.hasHandler(name) };
  }

  // =================== STATISTICS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get scheduler statistics' })
  @ApiResponse({ status: 200, description: 'Scheduler statistics' })
  async getStats() {
    return this.schedulerService.getStats();
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming scheduled jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Upcoming jobs' })
  async getUpcoming(@Query('limit') limit?: string) {
    return this.schedulerService.getUpcomingJobs(limit ? parseInt(limit) : 10);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue jobs' })
  @ApiResponse({ status: 200, description: 'Overdue jobs' })
  async getOverdue() {
    return this.schedulerService.getOverdueJobs();
  }

  // =================== CONFIGURATION ===================

  @Get('config/job-types')
  @ApiOperation({ summary: 'Get job types' })
  @ApiResponse({ status: 200, description: 'List of job types' })
  getJobTypes() {
    return [
      { value: 'ANAF_SUBMISSION', label: 'ANAF Submission', labelRo: 'Trimitere ANAF' },
      { value: 'SAGA_SYNC', label: 'SAGA Sync', labelRo: 'Sincronizare SAGA' },
      { value: 'INVOICE_GENERATION', label: 'Invoice Generation', labelRo: 'Generare Facturi' },
      { value: 'REPORT_GENERATION', label: 'Report Generation', labelRo: 'Generare Rapoarte' },
      { value: 'BACKUP', label: 'Backup', labelRo: 'Backup' },
      { value: 'CLEANUP', label: 'Cleanup', labelRo: 'Curățare' },
      { value: 'NOTIFICATION', label: 'Notification', labelRo: 'Notificare' },
      { value: 'EMAIL_SEND', label: 'Email Send', labelRo: 'Trimitere Email' },
      { value: 'DATA_IMPORT', label: 'Data Import', labelRo: 'Import Date' },
      { value: 'DATA_EXPORT', label: 'Data Export', labelRo: 'Export Date' },
      { value: 'TAX_CALCULATION', label: 'Tax Calculation', labelRo: 'Calcul Taxe' },
      { value: 'PAYROLL_PROCESS', label: 'Payroll Process', labelRo: 'Procesare Salariu' },
      { value: 'RECURRING_INVOICE', label: 'Recurring Invoice', labelRo: 'Factură Recurentă' },
      { value: 'COMPLIANCE_CHECK', label: 'Compliance Check', labelRo: 'Verificare Conformitate' },
      { value: 'CUSTOM', label: 'Custom', labelRo: 'Personalizat' },
    ];
  }

  @Get('config/patterns')
  @ApiOperation({ summary: 'Get recurrence patterns' })
  @ApiResponse({ status: 200, description: 'List of recurrence patterns' })
  getPatterns() {
    return [
      { value: 'ONCE', label: 'Once', labelRo: 'O Dată' },
      { value: 'MINUTELY', label: 'Every Minute', labelRo: 'La Fiecare Minut' },
      { value: 'HOURLY', label: 'Hourly', labelRo: 'La Fiecare Oră' },
      { value: 'DAILY', label: 'Daily', labelRo: 'Zilnic' },
      { value: 'WEEKLY', label: 'Weekly', labelRo: 'Săptămânal' },
      { value: 'MONTHLY', label: 'Monthly', labelRo: 'Lunar' },
      { value: 'YEARLY', label: 'Yearly', labelRo: 'Anual' },
      { value: 'CRON', label: 'Custom (Cron)', labelRo: 'Personalizat (Cron)' },
    ];
  }

  @Get('config/priorities')
  @ApiOperation({ summary: 'Get job priorities' })
  @ApiResponse({ status: 200, description: 'List of priorities' })
  getPriorities() {
    return [
      { value: 'LOW', label: 'Low', labelRo: 'Scăzută' },
      { value: 'NORMAL', label: 'Normal', labelRo: 'Normală' },
      { value: 'HIGH', label: 'High', labelRo: 'Ridicată' },
      { value: 'CRITICAL', label: 'Critical', labelRo: 'Critică' },
    ];
  }

  @Get('config/statuses')
  @ApiOperation({ summary: 'Get job statuses' })
  @ApiResponse({ status: 200, description: 'List of statuses' })
  getStatuses() {
    return [
      { value: 'PENDING', label: 'Pending', labelRo: 'În Așteptare' },
      { value: 'SCHEDULED', label: 'Scheduled', labelRo: 'Programat' },
      { value: 'RUNNING', label: 'Running', labelRo: 'În Execuție' },
      { value: 'COMPLETED', label: 'Completed', labelRo: 'Finalizat' },
      { value: 'FAILED', label: 'Failed', labelRo: 'Eșuat' },
      { value: 'CANCELLED', label: 'Cancelled', labelRo: 'Anulat' },
      { value: 'PAUSED', label: 'Paused', labelRo: 'Suspendat' },
    ];
  }
}
