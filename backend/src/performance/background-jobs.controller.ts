import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { BackgroundJobsService } from './background-jobs.service';

@Controller('performance/jobs')
export class BackgroundJobsController {
  constructor(private readonly jobsService: BackgroundJobsService) {}

  @Post()
  async addJob(
    @Request() req: any,
    @Body() body: {
      name: string;
      data: any;
      priority?: number;
      delay?: number;
    },
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    if (!body.name) {
      throw new BadRequestException('Job name is required');
    }

    try {
      const job = await this.jobsService.addJob(body.name, body.data, {
        priority: body.priority,
        delay: body.delay,
        tenantId,
      });

      return {
        success: true,
        data: job,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('bulk')
  async addBulkJobs(
    @Request() req: any,
    @Body() body: {
      jobs: Array<{ name: string; data: any; priority?: number }>;
    },
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    if (!body.jobs || body.jobs.length === 0) {
      throw new BadRequestException('Jobs array is required');
    }

    const jobsWithTenant = body.jobs.map(j => ({
      ...j,
      options: { ...j, tenantId },
    }));

    const jobs = await this.jobsService.addBulkJobs(jobsWithTenant);

    return {
      success: true,
      data: { jobs, count: jobs.length },
    };
  }

  @Get()
  async getJobs(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('name') name?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user?.tenantId || 'tenant_demo';

    const jobs = await this.jobsService.getJobs({
      status,
      name,
      tenantId,
      limit: limit ? parseInt(limit) : undefined,
    });

    return {
      success: true,
      data: { jobs },
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.jobsService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('handlers')
  async getRegisteredHandlers() {
    const handlers = await this.jobsService.getRegisteredHandlers();

    return {
      success: true,
      data: { handlers },
    };
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    const job = await this.jobsService.getJob(id);
    if (!job) {
      throw new BadRequestException('Job not found');
    }

    return {
      success: true,
      data: job,
    };
  }

  @Post(':id/cancel')
  async cancelJob(@Param('id') id: string) {
    const cancelled = await this.jobsService.cancelJob(id);

    return {
      success: true,
      data: { cancelled },
    };
  }

  @Post(':id/retry')
  async retryJob(@Param('id') id: string) {
    const job = await this.jobsService.retryJob(id);
    if (!job) {
      throw new BadRequestException('Job not found or cannot be retried');
    }

    return {
      success: true,
      data: job,
    };
  }

  @Delete('completed')
  async clearCompletedJobs() {
    const count = await this.jobsService.clearCompletedJobs();

    return {
      success: true,
      data: { cleared: count },
    };
  }
}
