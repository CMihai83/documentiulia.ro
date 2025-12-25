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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  BatchProcessingService,
  JobType,
  JobStatus,
  JobPriority,
  ProcessingMode,
  JobConfiguration,
  JobSchedule,
} from './batch-processing.service';

@ApiTags('Batch Processing')
@Controller('batch')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BatchController {
  constructor(private readonly batchService: BatchProcessingService) {}

  // =================== JOB MANAGEMENT ===================

  @Post('jobs')
  @ApiOperation({ summary: 'Create a new batch job' })
  @ApiResponse({ status: 201, description: 'Batch job created' })
  createJob(
    @Request() req: any,
    @Body() body: {
      name: string;
      nameRo: string;
      description?: string;
      descriptionRo?: string;
      type: JobType;
      items: Record<string, any>[];
      priority?: JobPriority;
      processingMode?: ProcessingMode;
      configuration?: Partial<JobConfiguration>;
      schedule?: Partial<JobSchedule>;
      metadata?: Record<string, any>;
    },
  ) {
    return this.batchService.createJob({
      ...body,
      createdBy: req.user.sub,
      tenantId: req.user.organizationId,
    });
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List all batch jobs' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED'] })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiResponse({ status: 200, description: 'List of batch jobs' })
  getAllJobs(
    @Request() req: any,
    @Query('status') status?: JobStatus,
    @Query('type') type?: JobType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.batchService.getAllJobs({
      status,
      type,
      tenantId: req.user.organizationId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get batch job details' })
  @ApiResponse({ status: 200, description: 'Batch job details' })
  getJob(@Param('id') id: string) {
    return this.batchService.getJob(id);
  }

  @Get('jobs/:id/summary')
  @ApiOperation({ summary: 'Get batch job summary' })
  @ApiResponse({ status: 200, description: 'Job summary with statistics' })
  getJobSummary(@Param('id') id: string) {
    return this.batchService.getJobSummary(id);
  }

  @Get('jobs/:id/errors')
  @ApiOperation({ summary: 'Get batch job errors' })
  @ApiResponse({ status: 200, description: 'List of job errors' })
  getJobErrors(@Param('id') id: string) {
    return this.batchService.getJobErrors(id);
  }

  @Get('jobs/:id/results')
  @ApiOperation({ summary: 'Get batch job results' })
  @ApiResponse({ status: 200, description: 'List of job results' })
  getJobResults(@Param('id') id: string) {
    return this.batchService.getJobResults(id);
  }

  @Get('jobs/:id/items')
  @ApiOperation({ summary: 'Get batch job items' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED'] })
  @ApiResponse({ status: 200, description: 'List of job items' })
  getJobItems(
    @Param('id') id: string,
    @Query('status') status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED',
  ) {
    return this.batchService.getJobItems(id, status);
  }

  // =================== JOB ACTIONS ===================

  @Post('jobs/:id/start')
  @ApiOperation({ summary: 'Start a batch job' })
  @ApiResponse({ status: 200, description: 'Job started' })
  async startJob(@Param('id') id: string) {
    return this.batchService.startJob(id);
  }

  @Post('jobs/:id/pause')
  @ApiOperation({ summary: 'Pause a running batch job' })
  @ApiResponse({ status: 200, description: 'Job paused' })
  pauseJob(@Param('id') id: string) {
    return this.batchService.pauseJob(id);
  }

  @Post('jobs/:id/resume')
  @ApiOperation({ summary: 'Resume a paused batch job' })
  @ApiResponse({ status: 200, description: 'Job resumed' })
  resumeJob(@Param('id') id: string) {
    return this.batchService.resumeJob(id);
  }

  @Post('jobs/:id/cancel')
  @ApiOperation({ summary: 'Cancel a batch job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  cancelJob(@Param('id') id: string) {
    return this.batchService.cancelJob(id);
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Retry failed items in a batch job' })
  @ApiResponse({ status: 200, description: 'Job retry initiated' })
  retryJob(@Param('id') id: string) {
    return this.batchService.retryJob(id);
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Delete a batch job' })
  @ApiResponse({ status: 200, description: 'Job deleted' })
  deleteJob(@Param('id') id: string) {
    this.batchService.deleteJob(id);
    return { success: true };
  }

  // =================== TEMPLATES ===================

  @Get('templates')
  @ApiOperation({ summary: 'Get all job templates' })
  @ApiResponse({ status: 200, description: 'List of job templates' })
  getTemplates() {
    return this.batchService.getTemplates();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get job template details' })
  @ApiResponse({ status: 200, description: 'Job template details' })
  getTemplate(@Param('id') id: string) {
    return this.batchService.getTemplate(id);
  }

  @Post('templates/:id/jobs')
  @ApiOperation({ summary: 'Create a job from template' })
  @ApiResponse({ status: 201, description: 'Job created from template' })
  createJobFromTemplate(
    @Request() req: any,
    @Param('id') templateId: string,
    @Body() body: {
      name?: string;
      nameRo?: string;
      items: Record<string, any>[];
      configurationOverrides?: Partial<JobConfiguration>;
      schedule?: Partial<JobSchedule>;
    },
  ) {
    return this.batchService.createJobFromTemplate(templateId, {
      ...body,
      createdBy: req.user.sub,
      tenantId: req.user.organizationId,
    });
  }

  // =================== STATISTICS ===================

  @Get('stats/queue')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics' })
  getQueueStats() {
    return this.batchService.getQueueStats();
  }

  @Get('stats/service')
  @ApiOperation({ summary: 'Get service statistics' })
  @ApiResponse({ status: 200, description: 'Service statistics' })
  getServiceStats() {
    return this.batchService.getServiceStats();
  }

  @Get('running')
  @ApiOperation({ summary: 'Get currently running jobs' })
  @ApiResponse({ status: 200, description: 'List of running jobs' })
  getRunningJobs() {
    return this.batchService.getRunningJobs();
  }

  // =================== JOB TYPES ===================

  @Get('job-types')
  @ApiOperation({ summary: 'Get available job types' })
  @ApiResponse({ status: 200, description: 'List of job types' })
  getJobTypes() {
    return [
      { value: 'INVOICE_GENERATION', label: 'Invoice Generation', labelRo: 'Generare Facturi' },
      { value: 'REPORT_EXPORT', label: 'Report Export', labelRo: 'Export Rapoarte' },
      { value: 'DATA_IMPORT', label: 'Data Import', labelRo: 'Import Date' },
      { value: 'DATA_EXPORT', label: 'Data Export', labelRo: 'Export Date' },
      { value: 'ANAF_SUBMISSION', label: 'ANAF Submission', labelRo: 'Trimitere ANAF' },
      { value: 'EMAIL_BATCH', label: 'Batch Email', labelRo: 'Email în Masă' },
      { value: 'DOCUMENT_PROCESSING', label: 'Document Processing', labelRo: 'Procesare Documente' },
      { value: 'CUSTOM', label: 'Custom', labelRo: 'Personalizat' },
    ];
  }

  @Get('priorities')
  @ApiOperation({ summary: 'Get job priority levels' })
  @ApiResponse({ status: 200, description: 'List of priority levels' })
  getPriorities() {
    return [
      { value: 'LOW', label: 'Low', labelRo: 'Scăzută' },
      { value: 'NORMAL', label: 'Normal', labelRo: 'Normală' },
      { value: 'HIGH', label: 'High', labelRo: 'Ridicată' },
      { value: 'CRITICAL', label: 'Critical', labelRo: 'Critică' },
    ];
  }

  @Get('processing-modes')
  @ApiOperation({ summary: 'Get processing modes' })
  @ApiResponse({ status: 200, description: 'List of processing modes' })
  getProcessingModes() {
    return [
      { value: 'SEQUENTIAL', label: 'Sequential', labelRo: 'Secvențial', description: 'Process items one by one' },
      { value: 'PARALLEL', label: 'Parallel', labelRo: 'Paralel', description: 'Process multiple items concurrently' },
      { value: 'CHUNKED', label: 'Chunked', labelRo: 'În Blocuri', description: 'Process items in batches' },
    ];
  }
}
