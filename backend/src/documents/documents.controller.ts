import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload document for OCR processing' })
  async upload(@Body() body: { userId: string; file: any }) {
    return this.documentsService.uploadDocument(body.userId, body.file);
  }

  @Post(':id/ocr')
  @ApiOperation({ summary: 'Process document with OCR' })
  async processOCR(@Param('id') id: string, @Body() ocrData: any) {
    return this.documentsService.processWithOCR(id, ocrData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  async getDocuments(@Query('userId') userId: string) {
    return this.documentsService.getDocuments(userId);
  }
}
