import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  DocumentGeneratorService,
  DocumentType,
  DocumentFormat,
  DocumentStatus,
  DocumentSection,
  DocumentStyling,
  GenerationOptions,
} from './document-generator.service';

@ApiTags('Document Generation')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentGeneratorController {
  constructor(private readonly documentService: DocumentGeneratorService) {}

  // =================== TEMPLATES ===================

  @Get('templates')
  @ApiOperation({ summary: 'Get document templates' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(
    @Request() req: any,
    @Query('type') type?: DocumentType,
    @Query('category') category?: string,
    @Query('language') language?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const templates = await this.documentService.getTemplates(req.user.tenantId, {
      type,
      category,
      language,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
    return { templates, total: templates.length };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template details' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.documentService.getTemplate(id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create document template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: DocumentType;
      category?: string;
      language: string;
      outputFormats: DocumentFormat[];
      sections: DocumentSection[];
      styling: DocumentStyling;
      variables?: Record<string, any>;
      metadata?: Record<string, any>;
    },
  ) {
    return this.documentService.createTemplate({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...body,
    });
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      category: string;
      language: string;
      outputFormats: DocumentFormat[];
      sections: DocumentSection[];
      styling: DocumentStyling;
      variables: Record<string, any>;
      metadata: Record<string, any>;
      isActive: boolean;
    }>,
  ) {
    const template = await this.documentService.updateTemplate(id, body);
    if (!template) {
      return { error: 'Template not found or is a system template' };
    }
    return template;
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('id') id: string) {
    await this.documentService.deleteTemplate(id);
    return { success: true };
  }

  @Post('templates/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate template' })
  @ApiResponse({ status: 201, description: 'Template duplicated' })
  async duplicateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    const template = await this.documentService.duplicateTemplate(
      id,
      body.name,
      req.user.tenantId,
      req.user.id,
    );
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  // =================== DOCUMENT GENERATION ===================

  @Post('generate')
  @ApiOperation({ summary: 'Generate document' })
  @ApiResponse({ status: 201, description: 'Document generated' })
  async generateDocument(
    @Request() req: any,
    @Body() body: {
      templateId: string;
      name: string;
      data: Record<string, any>;
      options: GenerationOptions;
    },
  ) {
    try {
      return await this.documentService.generateDocument({
        tenantId: req.user.tenantId,
        templateId: body.templateId,
        name: body.name,
        data: body.data,
        options: body.options,
        generatedBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get generated documents' })
  @ApiQuery({ name: 'templateId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Documents list' })
  async getDocuments(
    @Request() req: any,
    @Query('templateId') templateId?: string,
    @Query('type') type?: DocumentType,
    @Query('status') status?: DocumentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    const documents = await this.documentService.getDocuments(req.user.tenantId, {
      templateId,
      type,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { documents, total: documents.length };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  @ApiResponse({ status: 200, description: 'Document details' })
  async getDocument(@Param('id') id: string) {
    const document = await this.documentService.getDocument(id);
    if (!document) {
      return { error: 'Document not found' };
    }
    return document;
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download document' })
  @ApiResponse({ status: 200, description: 'Document file' })
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const download = await this.documentService.downloadDocument(id);
    if (!download) {
      return res.status(404).json({ error: 'Document not found or not ready' });
    }

    res.setHeader('Content-Type', download.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${download.fileName}"`);
    res.send(download.content);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  async deleteDocument(@Param('id') id: string) {
    await this.documentService.deleteDocument(id);
    return { success: true };
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive document' })
  @ApiResponse({ status: 200, description: 'Document archived' })
  async archiveDocument(@Param('id') id: string) {
    const document = await this.documentService.archiveDocument(id);
    if (!document) {
      return { error: 'Document not found' };
    }
    return document;
  }

  // =================== BATCH GENERATION ===================

  @Post('batch')
  @ApiOperation({ summary: 'Create batch generation job' })
  @ApiResponse({ status: 201, description: 'Batch job created' })
  async createBatchJob(
    @Request() req: any,
    @Body() body: {
      templateId: string;
      dataSource: 'manual' | 'csv' | 'database' | 'api';
      data: Record<string, any>[];
      options: GenerationOptions;
    },
  ) {
    try {
      return await this.documentService.createBatchJob({
        tenantId: req.user.tenantId,
        templateId: body.templateId,
        dataSource: body.dataSource,
        data: body.data,
        options: body.options,
        createdBy: req.user.id,
      });
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get('batch/jobs')
  @ApiOperation({ summary: 'Get batch jobs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Batch jobs list' })
  async getBatchJobs(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const jobs = await this.documentService.getBatchJobs(req.user.tenantId, {
      status: status as any,
      limit: limit ? parseInt(limit) : undefined,
    });
    return { jobs, total: jobs.length };
  }

  @Get('batch/jobs/:id')
  @ApiOperation({ summary: 'Get batch job details' })
  @ApiResponse({ status: 200, description: 'Batch job details' })
  async getBatchJob(@Param('id') id: string) {
    const job = await this.documentService.getBatchJob(id);
    if (!job) {
      return { error: 'Batch job not found' };
    }
    return job;
  }

  @Post('batch/jobs/:id/cancel')
  @ApiOperation({ summary: 'Cancel batch job' })
  @ApiResponse({ status: 200, description: 'Batch job cancelled' })
  async cancelBatchJob(@Param('id') id: string) {
    const job = await this.documentService.cancelBatchJob(id);
    if (!job) {
      return { error: 'Batch job not found or cannot be cancelled' };
    }
    return job;
  }

  // =================== STATS ===================

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get document stats' })
  @ApiResponse({ status: 200, description: 'Document statistics' })
  async getStats(@Request() req: any) {
    return this.documentService.getStats(req.user.tenantId);
  }
}
