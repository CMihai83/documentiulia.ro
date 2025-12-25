import {
  Controller,
  Get,
  Post,
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
import { DocumentAiService, DocumentType, TemplateField } from './document-ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Document AI')
@Controller('documents/ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentAiController {
  constructor(private readonly documentAiService: DocumentAiService) {}

  // =================== DOCUMENT UPLOAD ===================

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document for processing' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' },
        userId: { type: 'string' },
        tenantId: { type: 'string' },
      },
      required: ['filename', 'mimeType', 'size', 'userId', 'tenantId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  async uploadDocument(
    @Body('filename') filename: string,
    @Body('mimeType') mimeType: string,
    @Body('size') size: number,
    @Body('userId') userId: string,
    @Body('tenantId') tenantId: string,
  ) {
    return this.documentAiService.uploadDocument(filename, mimeType, size, userId, tenantId);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  async getDocument(@Param('documentId') documentId: string) {
    const document = await this.documentAiService.getDocument(documentId);
    if (!document) {
      return { error: 'Document not found' };
    }
    return document;
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get all documents for a tenant' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async getDocuments(@Param('tenantId') tenantId: string) {
    return { documents: await this.documentAiService.getDocuments(tenantId) };
  }

  // =================== PROCESSING ===================

  @Post(':documentId/process')
  @ApiOperation({ summary: 'Process a document with AI' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        templateId: { type: 'string' },
        language: { type: 'string' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 200, description: 'Processed document' })
  async processDocument(
    @Param('documentId') documentId: string,
    @Body('content') content: string,
    @Body('templateId') templateId?: string,
    @Body('language') language?: string,
  ) {
    try {
      return await this.documentAiService.processDocument(documentId, content, {
        templateId,
        language,
      });
    } catch (error) {
      return { error: error.message };
    }
  }

  @Get(':documentId/processed')
  @ApiOperation({ summary: 'Get processed document data' })
  @ApiResponse({ status: 200, description: 'Processed document data' })
  async getProcessedDocument(@Param('documentId') documentId: string) {
    const processed = await this.documentAiService.getProcessedDocument(documentId);
    if (!processed) {
      return { error: 'Processed document not found' };
    }
    return processed;
  }

  // =================== CLASSIFICATION ===================

  @Post('classify')
  @ApiOperation({ summary: 'Classify document content' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 200, description: 'Classification result' })
  async classifyDocument(@Body('content') content: string) {
    return { classification: this.documentAiService.classifyDocument(content) };
  }

  // =================== ENTITY EXTRACTION ===================

  @Post('extract-entities')
  @ApiOperation({ summary: 'Extract entities from document content' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        documentType: { type: 'string' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 200, description: 'Extracted entities' })
  async extractEntities(
    @Body('content') content: string,
    @Body('documentType') documentType?: DocumentType,
  ) {
    return {
      entities: this.documentAiService.extractEntities(
        content,
        documentType || 'unknown',
      ),
    };
  }

  // =================== INVOICE EXTRACTION ===================

  @Get(':documentId/invoice-data')
  @ApiOperation({ summary: 'Extract structured invoice data' })
  @ApiResponse({ status: 200, description: 'Invoice data' })
  async extractInvoiceData(@Param('documentId') documentId: string) {
    const invoiceData = await this.documentAiService.extractInvoiceData(documentId);
    if (!invoiceData) {
      return { error: 'Could not extract invoice data' };
    }
    return { invoice: invoiceData };
  }

  // =================== BATCH PROCESSING ===================

  @Post('batch')
  @ApiOperation({ summary: 'Create a batch of documents' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              filename: { type: 'string' },
              mimeType: { type: 'string' },
              size: { type: 'number' },
            },
          },
        },
        userId: { type: 'string' },
        tenantId: { type: 'string' },
      },
      required: ['documents', 'userId', 'tenantId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Batch created' })
  async createBatch(
    @Body('documents') documents: { filename: string; mimeType: string; size: number }[],
    @Body('userId') userId: string,
    @Body('tenantId') tenantId: string,
  ) {
    return this.documentAiService.createBatch(documents, userId, tenantId);
  }

  @Post('batch/:batchId/process')
  @ApiOperation({ summary: 'Process a batch of documents' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        contents: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['contents'],
    },
  })
  @ApiResponse({ status: 200, description: 'Batch processed' })
  async processBatch(
    @Param('batchId') batchId: string,
    @Body('contents') contents: Record<string, string>,
  ) {
    const contentsMap = new Map(Object.entries(contents));
    return this.documentAiService.processBatch(batchId, contentsMap);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get batch status and results' })
  @ApiResponse({ status: 200, description: 'Batch details' })
  async getBatch(@Param('batchId') batchId: string) {
    const batch = await this.documentAiService.getBatch(batchId);
    if (!batch) {
      return { error: 'Batch not found' };
    }
    return batch;
  }

  // =================== TEMPLATES ===================

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a document template' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        fields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              required: { type: 'boolean' },
            },
          },
        },
        tenantId: { type: 'string' },
      },
      required: ['name', 'type', 'fields', 'tenantId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Body('name') name: string,
    @Body('type') type: DocumentType,
    @Body('fields') fields: TemplateField[],
    @Body('tenantId') tenantId: string,
  ) {
    return this.documentAiService.createTemplate(name, type, fields, tenantId);
  }

  @Get('templates/:tenantId')
  @ApiOperation({ summary: 'Get templates for a tenant' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getTemplates(@Param('tenantId') tenantId: string) {
    return { templates: await this.documentAiService.getTemplates(tenantId) };
  }

  @Get('template/:templateId')
  @ApiOperation({ summary: 'Get a specific template' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = await this.documentAiService.getTemplate(templateId);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  // =================== STATISTICS ===================

  @Get('stats/:tenantId')
  @ApiOperation({ summary: 'Get processing statistics' })
  @ApiResponse({ status: 200, description: 'Processing stats' })
  async getProcessingStats(@Param('tenantId') tenantId: string) {
    return { stats: await this.documentAiService.getProcessingStats(tenantId) };
  }
}
