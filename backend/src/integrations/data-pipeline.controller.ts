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
  DataPipelineService,
  EntityType,
  FieldMapping,
  ImportOptions,
  ExportOptions,
  PipelineSource,
  PipelineDestination,
} from './data-pipeline.service';

@ApiTags('Integrations - Data Pipelines')
@Controller('integrations/pipelines')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataPipelineController {
  constructor(private readonly pipelineService: DataPipelineService) {}

  // =================== IMPORT ===================

  @Post('import')
  @ApiOperation({ summary: 'Create import job' })
  @ApiResponse({ status: 201, description: 'Import job created' })
  async createImportJob(
    @Request() req: any,
    @Body() body: {
      name: string;
      type: 'csv' | 'excel' | 'json' | 'xml';
      entityType: EntityType;
      sourceFile: {
        name: string;
        size: number;
        mimeType: string;
      };
      mapping: FieldMapping[];
      options?: Partial<ImportOptions>;
    },
  ) {
    return this.pipelineService.createImportJob({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      name: body.name,
      type: body.type,
      entityType: body.entityType,
      sourceFile: {
        ...body.sourceFile,
        uploadedAt: new Date(),
      },
      mapping: body.mapping,
      options: body.options,
    });
  }

  @Post('import/:id/start')
  @ApiOperation({ summary: 'Start import job' })
  @ApiResponse({ status: 200, description: 'Import job started' })
  async startImportJob(@Param('id') id: string) {
    return this.pipelineService.startImportJob(id);
  }

  @Post('import/:id/cancel')
  @ApiOperation({ summary: 'Cancel import job' })
  @ApiResponse({ status: 200, description: 'Import job cancelled' })
  async cancelImportJob(@Param('id') id: string) {
    await this.pipelineService.cancelImportJob(id);
    return { success: true };
  }

  @Get('import')
  @ApiOperation({ summary: 'Get import jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Import jobs' })
  async getImportJobs(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const jobs = await this.pipelineService.getImportJobs(
      req.user.tenantId,
      limit ? parseInt(limit) : 20,
    );
    return { jobs, total: jobs.length };
  }

  @Get('import/:id')
  @ApiOperation({ summary: 'Get import job details' })
  @ApiResponse({ status: 200, description: 'Import job details' })
  async getImportJob(@Param('id') id: string) {
    const job = await this.pipelineService.getImportJob(id);
    if (!job) {
      return { error: 'Import job not found' };
    }
    return job;
  }

  // =================== EXPORT ===================

  @Post('export')
  @ApiOperation({ summary: 'Create export job' })
  @ApiResponse({ status: 201, description: 'Export job created' })
  async createExportJob(
    @Request() req: any,
    @Body() body: {
      name: string;
      format: 'csv' | 'excel' | 'json' | 'xml' | 'pdf';
      entityType: EntityType;
      filters?: Record<string, any>;
      fields?: string[];
      options?: Partial<ExportOptions>;
    },
  ) {
    const job = await this.pipelineService.createExportJob({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });

    // Auto-start export jobs
    return this.pipelineService.startExportJob(job.id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Get export jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Export jobs' })
  async getExportJobs(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const jobs = await this.pipelineService.getExportJobs(
      req.user.tenantId,
      limit ? parseInt(limit) : 20,
    );
    return { jobs, total: jobs.length };
  }

  @Get('export/:id')
  @ApiOperation({ summary: 'Get export job details' })
  @ApiResponse({ status: 200, description: 'Export job details' })
  async getExportJob(@Param('id') id: string) {
    const job = await this.pipelineService.getExportJob(id);
    if (!job) {
      return { error: 'Export job not found' };
    }
    return job;
  }

  // =================== SCHEDULED PIPELINES ===================

  @Post('scheduled')
  @ApiOperation({ summary: 'Create scheduled pipeline' })
  @ApiResponse({ status: 201, description: 'Pipeline created' })
  async createPipeline(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: 'import' | 'export';
      entityType: EntityType;
      source: PipelineSource;
      destination: PipelineDestination;
      mapping: FieldMapping[];
      schedule?: string;
    },
  ) {
    return this.pipelineService.createPipeline({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Get scheduled pipelines' })
  @ApiResponse({ status: 200, description: 'Scheduled pipelines' })
  async getPipelines(@Request() req: any) {
    const pipelines = await this.pipelineService.getPipelines(req.user.tenantId);
    return { pipelines, total: pipelines.length };
  }

  @Put('scheduled/:id')
  @ApiOperation({ summary: 'Update pipeline' })
  @ApiResponse({ status: 200, description: 'Pipeline updated' })
  async updatePipeline(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      mapping?: FieldMapping[];
      schedule?: string;
      isActive?: boolean;
    },
  ) {
    const pipeline = await this.pipelineService.updatePipeline(id, body);
    if (!pipeline) {
      return { error: 'Pipeline not found' };
    }
    return pipeline;
  }

  @Delete('scheduled/:id')
  @ApiOperation({ summary: 'Delete pipeline' })
  @ApiResponse({ status: 200, description: 'Pipeline deleted' })
  async deletePipeline(@Param('id') id: string) {
    await this.pipelineService.deletePipeline(id);
    return { success: true };
  }

  @Post('scheduled/:id/run')
  @ApiOperation({ summary: 'Run pipeline manually' })
  @ApiResponse({ status: 200, description: 'Pipeline run result' })
  async runPipeline(@Param('id') id: string) {
    return this.pipelineService.runPipeline(id);
  }

  // =================== TEMPLATES ===================

  @Get('templates')
  @ApiOperation({ summary: 'Get import templates' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiResponse({ status: 200, description: 'Import templates' })
  async getTemplates(@Query('entityType') entityType?: EntityType) {
    const templates = await this.pipelineService.getTemplates(entityType);
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.pipelineService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  // =================== FIELD MAPPING ===================

  @Post('detect-fields')
  @ApiOperation({ summary: 'Detect fields from sample data' })
  @ApiResponse({ status: 200, description: 'Detected fields' })
  async detectFields(
    @Body() body: {
      type: 'csv' | 'excel' | 'json';
      sampleData: string;
      delimiter?: string;
    },
  ) {
    const fields = await this.pipelineService.detectFields(body);
    return { fields };
  }

  @Post('suggest-mapping')
  @ApiOperation({ summary: 'Suggest field mapping' })
  @ApiResponse({ status: 200, description: 'Suggested mapping' })
  async suggestMapping(
    @Body() body: {
      sourceFields: string[];
      entityType: EntityType;
    },
  ) {
    const mapping = await this.pipelineService.suggestMapping(body);
    return { mapping };
  }

  // =================== STATS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  @ApiResponse({ status: 200, description: 'Pipeline stats' })
  async getStats(@Request() req: any) {
    return this.pipelineService.getStats(req.user.tenantId);
  }
}
