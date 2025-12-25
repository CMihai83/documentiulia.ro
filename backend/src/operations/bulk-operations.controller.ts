import {
  Controller,
  Get,
  Post,
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
  BulkOperationsService,
  BulkOperationType,
  BulkOperationStatus,
  EntityType,
  ExportFormat,
  FieldMapping,
  ImportConfig,
  ExportConfig,
  ExportColumn,
} from './bulk-operations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Bulk Operations')
@Controller('bulk')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BulkOperationsController {
  constructor(private readonly bulkService: BulkOperationsService) {}

  // =================== OPERATIONS ===================

  @Get('operations/:operationId')
  @ApiOperation({ summary: 'Get bulk operation by ID' })
  @ApiResponse({ status: 200, description: 'Operation details' })
  async getOperation(@Param('operationId') operationId: string) {
    const operation = await this.bulkService.getOperation(operationId);
    if (!operation) {
      return { error: 'Operation not found' };
    }
    return operation;
  }

  @Get('operations/tenant/:tenantId')
  @ApiOperation({ summary: 'Get bulk operations for tenant' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of operations' })
  async getOperations(
    @Param('tenantId') tenantId: string,
    @Query('type') type?: BulkOperationType,
    @Query('entityType') entityType?: EntityType,
    @Query('status') status?: BulkOperationStatus,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      operations: await this.bulkService.getOperations(
        tenantId,
        { type, entityType, status, userId },
        limit ? parseInt(limit) : 50,
      ),
    };
  }

  @Get('operations/:operationId/progress')
  @ApiOperation({ summary: 'Get operation progress' })
  @ApiResponse({ status: 200, description: 'Operation progress' })
  async getOperationProgress(@Param('operationId') operationId: string) {
    const progress = await this.bulkService.getOperationProgress(operationId);
    if (!progress) {
      return { error: 'Operation not found' };
    }
    return progress;
  }

  @Post('operations/:operationId/cancel')
  @ApiOperation({ summary: 'Cancel bulk operation' })
  @ApiResponse({ status: 200, description: 'Operation cancelled' })
  async cancelOperation(@Param('operationId') operationId: string) {
    const operation = await this.bulkService.cancelOperation(operationId);
    if (!operation) {
      return { error: 'Operation not found' };
    }
    return operation;
  }

  // =================== BULK CREATE ===================

  @Post('create')
  @ApiOperation({ summary: 'Bulk create entities' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        entityType: { type: 'string', enum: ['invoice', 'customer', 'product', 'employee', 'transaction', 'order'] },
        items: { type: 'array', items: { type: 'object' } },
        options: {
          type: 'object',
          properties: {
            batchSize: { type: 'number' },
            skipValidation: { type: 'boolean' },
            stopOnError: { type: 'boolean' },
            dryRun: { type: 'boolean' },
          },
        },
      },
      required: ['tenantId', 'userId', 'entityType', 'items'],
    },
  })
  @ApiResponse({ status: 201, description: 'Bulk create operation started' })
  async bulkCreate(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('entityType') entityType: EntityType,
    @Body('items') items: Record<string, any>[],
    @Body('options') options?: Record<string, any>,
  ) {
    return this.bulkService.bulkCreate(tenantId, userId, entityType, items, options);
  }

  // =================== BULK UPDATE ===================

  @Post('update')
  @ApiOperation({ summary: 'Bulk update entities' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        entityType: { type: 'string', enum: ['invoice', 'customer', 'product', 'employee', 'transaction', 'order'] },
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
        options: { type: 'object' },
      },
      required: ['tenantId', 'userId', 'entityType', 'updates'],
    },
  })
  @ApiResponse({ status: 200, description: 'Bulk update operation completed' })
  async bulkUpdate(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('entityType') entityType: EntityType,
    @Body('updates') updates: { id: string; data: Record<string, any> }[],
    @Body('options') options?: Record<string, any>,
  ) {
    return this.bulkService.bulkUpdate(tenantId, userId, entityType, updates, options);
  }

  // =================== BULK DELETE ===================

  @Post('delete')
  @ApiOperation({ summary: 'Bulk delete entities' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        entityType: { type: 'string', enum: ['invoice', 'customer', 'product', 'employee', 'transaction', 'order'] },
        ids: { type: 'array', items: { type: 'string' } },
        options: { type: 'object' },
      },
      required: ['tenantId', 'userId', 'entityType', 'ids'],
    },
  })
  @ApiResponse({ status: 200, description: 'Bulk delete operation completed' })
  async bulkDelete(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('entityType') entityType: EntityType,
    @Body('ids') ids: string[],
    @Body('options') options?: Record<string, any>,
  ) {
    return this.bulkService.bulkDelete(tenantId, userId, entityType, ids, options);
  }

  // =================== IMPORT ===================

  @Post('import')
  @ApiOperation({ summary: 'Import data from CSV or JSON' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        entityType: { type: 'string', enum: ['invoice', 'customer', 'product', 'employee', 'transaction', 'order'] },
        data: { type: 'string', description: 'CSV or JSON data as string' },
        format: { type: 'string', enum: ['csv', 'json'] },
        options: {
          type: 'object',
          properties: {
            includeHeaders: { type: 'boolean' },
            mapping: { type: 'array' },
            skipValidation: { type: 'boolean' },
          },
        },
      },
      required: ['tenantId', 'userId', 'entityType', 'data', 'format'],
    },
  })
  @ApiResponse({ status: 201, description: 'Import operation completed' })
  async importData(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('entityType') entityType: EntityType,
    @Body('data') data: string,
    @Body('format') format: 'csv' | 'json',
    @Body('options') options?: Record<string, any>,
  ) {
    return this.bulkService.importData(tenantId, userId, entityType, data, format, options);
  }

  // =================== EXPORT ===================

  @Post('export')
  @ApiOperation({ summary: 'Export data to various formats' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        userId: { type: 'string' },
        entityType: { type: 'string', enum: ['invoice', 'customer', 'product', 'employee', 'transaction', 'order'] },
        format: { type: 'string', enum: ['csv', 'excel', 'json', 'pdf'] },
        options: {
          type: 'object',
          properties: {
            filters: { type: 'object' },
            includeHeaders: { type: 'boolean' },
          },
        },
      },
      required: ['tenantId', 'userId', 'entityType', 'format'],
    },
  })
  @ApiResponse({ status: 200, description: 'Export operation completed' })
  async exportData(
    @Body('tenantId') tenantId: string,
    @Body('userId') userId: string,
    @Body('entityType') entityType: EntityType,
    @Body('format') format: ExportFormat,
    @Body('options') options?: Record<string, any>,
  ) {
    return this.bulkService.exportData(tenantId, userId, entityType, format, options);
  }

  // =================== IMPORT TEMPLATES ===================

  @Post('templates/import')
  @ApiOperation({ summary: 'Create import template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        entityType: { type: 'string' },
        config: { type: 'object' },
      },
      required: ['tenantId', 'name', 'entityType', 'config'],
    },
  })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createImportTemplate(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('entityType') entityType: EntityType,
    @Body('config') config: ImportConfig,
  ) {
    return this.bulkService.createImportTemplate(tenantId, name, entityType, config);
  }

  @Get('templates/import/:templateId')
  @ApiOperation({ summary: 'Get import template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getImportTemplate(@Param('templateId') templateId: string) {
    const template = await this.bulkService.getImportTemplate(templateId);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Get('templates/import/tenant/:tenantId')
  @ApiOperation({ summary: 'Get import templates for tenant' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getImportTemplates(
    @Param('tenantId') tenantId: string,
    @Query('entityType') entityType?: EntityType,
  ) {
    return { templates: await this.bulkService.getImportTemplates(tenantId, entityType) };
  }

  @Delete('templates/import/:templateId')
  @ApiOperation({ summary: 'Delete import template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteImportTemplate(@Param('templateId') templateId: string) {
    const success = await this.bulkService.deleteImportTemplate(templateId);
    return { success };
  }

  // =================== EXPORT TEMPLATES ===================

  @Post('templates/export')
  @ApiOperation({ summary: 'Create export template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        name: { type: 'string' },
        entityType: { type: 'string' },
        config: { type: 'object' },
      },
      required: ['tenantId', 'name', 'entityType', 'config'],
    },
  })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createExportTemplate(
    @Body('tenantId') tenantId: string,
    @Body('name') name: string,
    @Body('entityType') entityType: EntityType,
    @Body('config') config: ExportConfig,
  ) {
    return this.bulkService.createExportTemplate(tenantId, name, entityType, config);
  }

  @Get('templates/export/:templateId')
  @ApiOperation({ summary: 'Get export template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getExportTemplate(@Param('templateId') templateId: string) {
    const template = await this.bulkService.getExportTemplate(templateId);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Get('templates/export/tenant/:tenantId')
  @ApiOperation({ summary: 'Get export templates for tenant' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getExportTemplates(
    @Param('tenantId') tenantId: string,
    @Query('entityType') entityType?: EntityType,
  ) {
    return { templates: await this.bulkService.getExportTemplates(tenantId, entityType) };
  }

  @Delete('templates/export/:templateId')
  @ApiOperation({ summary: 'Delete export template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteExportTemplate(@Param('templateId') templateId: string) {
    const success = await this.bulkService.deleteExportTemplate(templateId);
    return { success };
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get bulk operations statistics' })
  @ApiResponse({ status: 200, description: 'Operations stats' })
  async getOperationStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.bulkService.getOperationStats(tenantId) };
  }

  // =================== METADATA ===================

  @Get('metadata/entity-types')
  @ApiOperation({ summary: 'Get entity types' })
  @ApiResponse({ status: 200, description: 'Available entity types' })
  async getEntityTypes() {
    return { types: this.bulkService.getEntityTypes() };
  }

  @Get('metadata/export-formats')
  @ApiOperation({ summary: 'Get export formats' })
  @ApiResponse({ status: 200, description: 'Available export formats' })
  async getExportFormats() {
    return { formats: this.bulkService.getExportFormats() };
  }

  @Get('metadata/operation-types')
  @ApiOperation({ summary: 'Get operation types' })
  @ApiResponse({ status: 200, description: 'Available operation types' })
  async getOperationTypes() {
    return { types: this.bulkService.getOperationTypes() };
  }

  @Get('metadata/transform-types')
  @ApiOperation({ summary: 'Get field transform types' })
  @ApiResponse({ status: 200, description: 'Available transform types' })
  async getTransformTypes() {
    return { types: this.bulkService.getTransformTypes() };
  }
}
