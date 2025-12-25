import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { QueueManagementService, QueueType, JobStatus, JobPriority } from './queue-management.service';

@ApiTags('Queue Management')
@Controller('queues')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QueueController {
  constructor(private readonly queueService: QueueManagementService) {}

  // =================== QUEUE MANAGEMENT ===================

  @Get()
  @ApiOperation({ summary: 'Get all queues' })
  @ApiResponse({ status: 200, description: 'List of queues' })
  async getQueues() {
    return this.queueService.getAllQueues();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  async getStats() {
    return this.queueService.getStats();
  }

  @Get(':type')
  @ApiOperation({ summary: 'Get queue by type' })
  @ApiResponse({ status: 200, description: 'Queue details' })
  async getQueue(@Param('type') type: QueueType) {
    const queue = await this.queueService.getQueueByType(type);
    return queue || { error: 'Queue not found' };
  }

  // =================== JOB MANAGEMENT ===================

  @Get(':type/jobs')
  @ApiOperation({ summary: 'Get jobs in queue' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  async getJobs(
    @Param('type') type: QueueType,
    @Query('status') status?: JobStatus,
    @Query('limit') limit?: string,
  ) {
    const jobLimit = limit ? parseInt(limit) : 50;

    if (status) {
      // Get by status then filter by type
      const allByStatus = await this.queueService.getJobsByStatus(status);
      return allByStatus.filter(j => j.queueType === type).slice(0, jobLimit);
    }

    return this.queueService.getJobsByQueue(type, jobLimit);
  }

  @Post(':type/jobs')
  @ApiOperation({ summary: 'Add job to queue' })
  @ApiResponse({ status: 201, description: 'Job added' })
  async addJob(
    @Request() req: any,
    @Param('type') type: QueueType,
    @Body() body: {
      name?: string;
      nameRo?: string;
      priority?: JobPriority;
      payload: Record<string, any>;
      scheduledAt?: string;
      timeout?: number;
      maxAttempts?: number;
      tags?: string[];
      metadata?: Record<string, any>;
    },
  ) {
    return this.queueService.addJob(type, body.payload, {
      name: body.name,
      nameRo: body.nameRo,
      priority: body.priority,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      timeout: body.timeout,
      maxAttempts: body.maxAttempts,
      tags: body.tags,
      metadata: body.metadata,
      organizationId: req.user.organizationId || req.user.sub,
      userId: req.user.sub,
    });
  }

  @Get(':type/jobs/:id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async getJob(@Param('id') id: string) {
    const job = await this.queueService.getJob(id);
    return job || { error: 'Job not found' };
  }

  @Post(':type/jobs/:id/retry')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Retry failed job' })
  @ApiResponse({ status: 200, description: 'Job retried' })
  async retryJob(@Param('id') id: string) {
    return this.queueService.retryJob(id);
  }

  @Post(':type/jobs/:id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  async cancelJob(@Param('id') id: string) {
    return this.queueService.cancelJob(id);
  }

  @Post(':type/jobs/:id/progress')
  @ApiOperation({ summary: 'Update job progress' })
  @ApiResponse({ status: 200, description: 'Job progress updated' })
  async updateProgress(
    @Param('id') id: string,
    @Body() body: { progress: number },
  ) {
    return this.queueService.updateJobProgress(id, body.progress);
  }

  // =================== QUEUE OPERATIONS ===================

  @Post(':type/pause')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Pause queue' })
  @ApiResponse({ status: 200, description: 'Queue paused' })
  async pauseQueue(@Param('type') type: QueueType) {
    const queue = await this.queueService.getQueueByType(type);
    if (!queue) {
      return { error: 'Queue not found' };
    }
    return this.queueService.pauseQueue(queue.id);
  }

  @Post(':type/resume')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resume queue' })
  @ApiResponse({ status: 200, description: 'Queue resumed' })
  async resumeQueue(@Param('type') type: QueueType) {
    const queue = await this.queueService.getQueueByType(type);
    if (!queue) {
      return { error: 'Queue not found' };
    }
    return this.queueService.resumeQueue(queue.id);
  }

  @Post(':type/clear')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear all pending jobs from queue' })
  @ApiResponse({ status: 200, description: 'Queue cleared' })
  async clearQueue(@Param('type') type: QueueType) {
    const queue = await this.queueService.getQueueByType(type);
    if (!queue) {
      return { error: 'Queue not found' };
    }
    const count = await this.queueService.clearQueue(queue.id);
    return { cleared: count };
  }

  // =================== DEAD LETTER QUEUE ===================

  @Get(':type/dead-letter')
  @ApiOperation({ summary: 'Get dead letter jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Dead letter jobs' })
  async getDeadLetterJobs(
    @Param('type') type: QueueType,
    @Query('limit') limit?: string,
  ) {
    const jobs = await this.queueService.getDeadLetterJobs(type);
    const jobLimit = limit ? parseInt(limit) : 50;
    return jobs.slice(0, jobLimit);
  }

  @Post(':type/dead-letter/:id/requeue')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Requeue dead letter job' })
  @ApiResponse({ status: 200, description: 'Job requeued' })
  async requeueDeadLetter(@Param('id') id: string) {
    return this.queueService.reprocessDeadLetterJob(id);
  }

  @Delete(':type/dead-letter')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear dead letter queue' })
  @ApiResponse({ status: 200, description: 'Dead letter queue cleared' })
  async clearDeadLetter(@Param('type') type: QueueType) {
    const count = await this.queueService.clearDeadLetterQueue(type);
    return { cleared: count };
  }

  // =================== WORKERS ===================

  @Get('workers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all workers' })
  @ApiResponse({ status: 200, description: 'List of workers' })
  async getWorkers() {
    return this.queueService.getAllWorkers();
  }

  @Get('workers/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get worker by ID' })
  @ApiResponse({ status: 200, description: 'Worker details' })
  async getWorker(@Param('id') id: string) {
    const worker = await this.queueService.getWorker(id);
    return worker || { error: 'Worker not found' };
  }

  @Post('workers/:id/stop')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Stop worker' })
  @ApiResponse({ status: 200, description: 'Worker stopped' })
  async stopWorker(@Param('id') id: string) {
    return this.queueService.stopWorker(id);
  }

  // =================== CONFIGURATION ===================

  @Get('config/types')
  @ApiOperation({ summary: 'Get queue types' })
  @ApiResponse({ status: 200, description: 'List of queue types' })
  getQueueTypes() {
    return [
      { value: 'EMAIL', label: 'Email', labelRo: 'Email' },
      { value: 'PDF', label: 'PDF Generation', labelRo: 'Generare PDF' },
      { value: 'INVOICE', label: 'Invoice', labelRo: 'Factură' },
      { value: 'ANAF_SUBMISSION', label: 'ANAF Submission', labelRo: 'Trimitere ANAF' },
      { value: 'SAGA_SYNC', label: 'SAGA Sync', labelRo: 'Sincronizare SAGA' },
      { value: 'REPORT', label: 'Report', labelRo: 'Raport' },
      { value: 'NOTIFICATION', label: 'Notification', labelRo: 'Notificare' },
      { value: 'IMPORT', label: 'Import', labelRo: 'Import' },
      { value: 'EXPORT', label: 'Export', labelRo: 'Export' },
      { value: 'BACKUP', label: 'Backup', labelRo: 'Backup' },
      { value: 'CLEANUP', label: 'Cleanup', labelRo: 'Curățare' },
      { value: 'ANALYTICS', label: 'Analytics', labelRo: 'Analiză' },
      { value: 'WEBHOOK', label: 'Webhook', labelRo: 'Webhook' },
      { value: 'CUSTOM', label: 'Custom', labelRo: 'Personalizat' },
    ];
  }

  @Get('config/statuses')
  @ApiOperation({ summary: 'Get job statuses' })
  @ApiResponse({ status: 200, description: 'List of job statuses' })
  getJobStatuses() {
    return [
      { value: 'PENDING', label: 'Pending', labelRo: 'În Așteptare' },
      { value: 'QUEUED', label: 'Queued', labelRo: 'În Coadă' },
      { value: 'PROCESSING', label: 'Processing', labelRo: 'Procesare' },
      { value: 'COMPLETED', label: 'Completed', labelRo: 'Finalizat' },
      { value: 'FAILED', label: 'Failed', labelRo: 'Eșuat' },
      { value: 'RETRYING', label: 'Retrying', labelRo: 'Reîncercare' },
      { value: 'DEAD', label: 'Dead Letter', labelRo: 'Eșec Final' },
      { value: 'CANCELLED', label: 'Cancelled', labelRo: 'Anulat' },
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
}
