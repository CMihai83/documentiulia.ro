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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  DataImportExportService,
  ImportFormat,
  ExportFormat,
  ImportStatus,
  ExportStatus,
  DataType,
  FieldMapping,
  ValidationRule,
} from './data-import-export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Data Import/Export')
@Controller('data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataImportExportController {
  constructor(private readonly dataService: DataImportExportService) {}

  // =================== IMPORT CONFIGS ===================

  @Post('import/configs')
  @ApiOperation({ summary: 'Create import configuration' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        dataType: { type: 'string' },
        format: { type: 'string' },
        fieldMappings: { type: 'array' },
        createdBy: { type: 'string' },
        validationRules: { type: 'array' },
        skipDuplicates: { type: 'boolean' },
        updateExisting: { type: 'boolean' },
        batchSize: { type: 'number' },
      },
      required: ['tenantId', 'name', 'dataType', 'format', 'fieldMappings', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Config created' })
  async createImportConfig(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('dataType') dataType: DataType,
    @Body('format') format: ImportFormat,
    @Body('fieldMappings') fieldMappings: FieldMapping[],
    @Body('createdBy') createdBy: string,
    @Body('validationRules') validationRules?: ValidationRule[],
    @Body('skipDuplicates') skipDuplicates?: boolean,
    @Body('updateExisting') updateExisting?: boolean,
    @Body('batchSize') batchSize?: number,
  ) {
    return this.dataService.createImportConfig(
      tenantId,
      name,
      dataType,
      format,
      fieldMappings,
      createdBy,
      { validationRules, skipDuplicates, updateExisting, batchSize },
    );
  }

  @Get('import/configs/:configId')
  @ApiOperation({ summary: 'Get import config by ID' })
  @ApiResponse({ status: 200, description: 'Config details' })
  async getImportConfig(@Param('configId') configId: string) {
    const config = await this.dataService.getImportConfig(configId);
    if (!config) return { error: 'Config not found' };
    return config;
  }

  @Get('import/configs/tenant/:tenantId')
  @ApiOperation({ summary: 'Get import configs for tenant' })
  @ApiQuery({ name: 'dataType', required: false })
  @ApiResponse({ status: 200, description: 'List of configs' })
  async getImportConfigs(
    @Param('tenantId') tenantId: string,
    @Query('dataType') dataType?: DataType,
  ) {
    return {
      configs: await this.dataService.getImportConfigs(tenantId, dataType),
    };
  }

  @Put('import/configs/:configId')
  @ApiOperation({ summary: 'Update import config' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  async updateImportConfig(
    @Param('configId') configId: string,
    @Body() updates: Record<string, any>,
  ) {
    const config = await this.dataService.updateImportConfig(configId, updates);
    if (!config) return { error: 'Config not found' };
    return config;
  }

  @Delete('import/configs/:configId')
  @ApiOperation({ summary: 'Delete import config' })
  @ApiResponse({ status: 200, description: 'Config deleted' })
  async deleteImportConfig(@Param('configId') configId: string) {
    const success = await this.dataService.deleteImportConfig(configId);
    return { success };
  }

  // =================== IMPORT PREVIEW ===================

  @Post('import/preview')
  @ApiOperation({ summary: 'Preview import data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        fileContent: { type: 'string' },
        format: { type: 'string' },
        dataType: { type: 'string' },
      },
      required: ['tenantId', 'fileContent', 'format', 'dataType'],
    },
  })
  @ApiResponse({ status: 200, description: 'Preview result' })
  async previewImport(
    @Body('tenantId') tenantId: string,
    @Body('fileContent') fileContent: string,
    @Body('format') format: ImportFormat,
    @Body('dataType') dataType: DataType,
  ) {
    return this.dataService.previewImport(tenantId, fileContent, format, dataType);
  }

  // =================== IMPORT JOBS ===================

  @Post('import/start')
  @ApiOperation({ summary: 'Start import job' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        configId: { type: 'string' },
        fileContent: { type: 'string' },
        fileName: { type: 'string' },
        createdBy: { type: 'string' },
      },
      required: ['tenantId', 'configId', 'fileContent', 'fileName', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Import started' })
  async startImport(
    @Body('tenantId') tenantId: string,
    @Body('configId') configId: string,
    @Body('fileContent') fileContent: string,
    @Body('fileName') fileName: string,
    @Body('createdBy') createdBy: string,
  ) {
    try {
      return await this.dataService.startImport(
        tenantId,
        configId,
        fileContent,
        fileName,
        createdBy,
      );
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('import/jobs/:jobId')
  @ApiOperation({ summary: 'Get import job by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async getImportJob(@Param('jobId') jobId: string) {
    const job = await this.dataService.getImportJob(jobId);
    if (!job) return { error: 'Job not found' };
    return job;
  }

  @Get('import/jobs/tenant/:tenantId')
  @ApiOperation({ summary: 'Get import jobs for tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dataType', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  async getImportJobs(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: ImportStatus,
    @Query('dataType') dataType?: DataType,
    @Query('limit') limit?: string,
  ) {
    return {
      jobs: await this.dataService.getImportJobs(tenantId, {
        status,
        dataType,
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  @Get('import/jobs/:jobId/progress')
  @ApiOperation({ summary: 'Get import progress' })
  @ApiResponse({ status: 200, description: 'Progress details' })
  async getImportProgress(@Param('jobId') jobId: string) {
    const progress = await this.dataService.getImportProgress(jobId);
    if (!progress) return { error: 'Job not found' };
    return progress;
  }

  @Post('import/jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel import job' })
  @ApiResponse({ status: 200, description: 'Job cancelled' })
  async cancelImport(@Param('jobId') jobId: string) {
    const success = await this.dataService.cancelImport(jobId);
    return { success };
  }

  // =================== EXPORT CONFIGS ===================

  @Post('export/configs')
  @ApiOperation({ summary: 'Create export configuration' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        dataType: { type: 'string' },
        format: { type: 'string' },
        fields: { type: 'array', items: { type: 'string' } },
        createdBy: { type: 'string' },
        filters: { type: 'object' },
        sorting: { type: 'array' },
        includeHeaders: { type: 'boolean' },
        dateFormat: { type: 'string' },
      },
      required: ['tenantId', 'name', 'dataType', 'format', 'fields', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Config created' })
  async createExportConfig(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('dataType') dataType: DataType,
    @Body('format') format: ExportFormat,
    @Body('fields') fields: string[],
    @Body('createdBy') createdBy: string,
    @Body('filters') filters?: Record<string, any>,
    @Body('sorting') sorting?: { field: string; order: 'asc' | 'desc' }[],
    @Body('includeHeaders') includeHeaders?: boolean,
    @Body('dateFormat') dateFormat?: string,
  ) {
    return this.dataService.createExportConfig(
      tenantId,
      name,
      dataType,
      format,
      fields,
      createdBy,
      { filters, sorting, includeHeaders, dateFormat },
    );
  }

  @Get('export/configs/:configId')
  @ApiOperation({ summary: 'Get export config by ID' })
  @ApiResponse({ status: 200, description: 'Config details' })
  async getExportConfig(@Param('configId') configId: string) {
    const config = await this.dataService.getExportConfig(configId);
    if (!config) return { error: 'Config not found' };
    return config;
  }

  @Get('export/configs/tenant/:tenantId')
  @ApiOperation({ summary: 'Get export configs for tenant' })
  @ApiQuery({ name: 'dataType', required: false })
  @ApiResponse({ status: 200, description: 'List of configs' })
  async getExportConfigs(
    @Param('tenantId') tenantId: string,
    @Query('dataType') dataType?: DataType,
  ) {
    return {
      configs: await this.dataService.getExportConfigs(tenantId, dataType),
    };
  }

  @Delete('export/configs/:configId')
  @ApiOperation({ summary: 'Delete export config' })
  @ApiResponse({ status: 200, description: 'Config deleted' })
  async deleteExportConfig(@Param('configId') configId: string) {
    const success = await this.dataService.deleteExportConfig(configId);
    return { success };
  }

  // =================== EXPORT JOBS ===================

  @Post('export/start')
  @ApiOperation({ summary: 'Start export job' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        dataType: { type: 'string' },
        format: { type: 'string' },
        createdBy: { type: 'string' },
        configId: { type: 'string' },
        fields: { type: 'array', items: { type: 'string' } },
        filters: { type: 'object' },
      },
      required: ['tenantId', 'dataType', 'format', 'createdBy'],
    },
  })
  @ApiResponse({ status: 201, description: 'Export started' })
  async startExport(
    @Body('tenantId') tenantId: string,
    @Body('dataType') dataType: DataType,
    @Body('format') format: ExportFormat,
    @Body('createdBy') createdBy: string,
    @Body('configId') configId?: string,
    @Body('fields') fields?: string[],
    @Body('filters') filters?: Record<string, any>,
  ) {
    return this.dataService.startExport(tenantId, dataType, format, createdBy, {
      configId,
      fields,
      filters,
    });
  }

  @Get('export/jobs/:jobId')
  @ApiOperation({ summary: 'Get export job by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async getExportJob(@Param('jobId') jobId: string) {
    const job = await this.dataService.getExportJob(jobId);
    if (!job) return { error: 'Job not found' };
    return job;
  }

  @Get('export/jobs/tenant/:tenantId')
  @ApiOperation({ summary: 'Get export jobs for tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dataType', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  async getExportJobs(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: ExportStatus,
    @Query('dataType') dataType?: DataType,
    @Query('limit') limit?: string,
  ) {
    return {
      jobs: await this.dataService.getExportJobs(tenantId, {
        status,
        dataType,
        limit: limit ? parseInt(limit) : undefined,
      }),
    };
  }

  // =================== SCHEMAS ===================

  @Get('schemas/:dataType')
  @ApiOperation({ summary: 'Get data schema' })
  @ApiResponse({ status: 200, description: 'Schema details' })
  async getSchema(@Param('dataType') dataType: DataType) {
    const schema = this.dataService.getSchema(dataType);
    if (!schema) return { error: 'Schema not found' };
    return schema;
  }

  @Get('schemas')
  @ApiOperation({ summary: 'Get all schemas' })
  @ApiResponse({ status: 200, description: 'List of schemas' })
  async getSchemas() {
    return { schemas: this.dataService.getSchemas() };
  }

  // =================== METADATA ===================

  @Get('metadata/import-formats')
  @ApiOperation({ summary: 'Get import formats' })
  async getImportFormats() {
    return { formats: this.dataService.getImportFormats() };
  }

  @Get('metadata/export-formats')
  @ApiOperation({ summary: 'Get export formats' })
  async getExportFormats() {
    return { formats: this.dataService.getExportFormats() };
  }

  @Get('metadata/data-types')
  @ApiOperation({ summary: 'Get data types' })
  async getDataTypes() {
    return { types: this.dataService.getDataTypes() };
  }

  @Get('metadata/import-statuses')
  @ApiOperation({ summary: 'Get import statuses' })
  async getImportStatuses() {
    return { statuses: this.dataService.getImportStatuses() };
  }

  @Get('metadata/export-statuses')
  @ApiOperation({ summary: 'Get export statuses' })
  async getExportStatuses() {
    return { statuses: this.dataService.getExportStatuses() };
  }
}
