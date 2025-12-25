import { Controller, Post, Get, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OCRService } from './ocr.service';
import {
  ProcessOCRDto,
  BatchProcessOCRDto,
  CorrectOCRDto,
  ConvertToInvoiceDto,
  OCRResultDto,
} from './dto/ocr.dto';

@ApiTags('ocr')
@Controller('ocr')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OCRController {
  constructor(private readonly ocrService: OCRService) {}

  @Post('process/:documentId')
  @ApiOperation({ summary: 'Process document with OCR' })
  @ApiResponse({ status: 200, description: 'OCR result', type: OCRResultDto })
  async processDocument(
    @Param('documentId') documentId: string,
    @Body() options: ProcessOCRDto,
  ): Promise<OCRResultDto> {
    return this.ocrService.processDocument(documentId, options);
  }

  @Post('process-batch')
  @ApiOperation({ summary: 'Batch process multiple documents' })
  @ApiResponse({ status: 200, description: 'Array of OCR results' })
  async processBatch(@Body() dto: BatchProcessOCRDto): Promise<OCRResultDto[]> {
    return this.ocrService.processBatch(dto.documentIds, dto.templateId);
  }

  @Get('status/:documentId')
  @ApiOperation({ summary: 'Get OCR processing status' })
  async getStatus(@Param('documentId') documentId: string) {
    return this.ocrService.getExtractionStatus(documentId);
  }

  @Post('correct/:documentId')
  @ApiOperation({ summary: 'Submit manual corrections' })
  async submitCorrections(
    @Param('documentId') documentId: string,
    @Body() corrections: CorrectOCRDto,
  ) {
    await this.ocrService.submitCorrections(documentId, corrections);
    return { success: true, message: 'Corrections applied' };
  }

  @Post('convert-to-invoice/:documentId')
  @ApiOperation({ summary: 'Create invoice from extracted data' })
  async convertToInvoice(
    @Param('documentId') documentId: string,
    @Body() options: ConvertToInvoiceDto,
    @Request() req: any,
  ) {
    return this.ocrService.convertToInvoice(documentId, options, req.user?.id);
  }

  @Get('preview/:documentId')
  @ApiOperation({ summary: 'Get extraction preview with validation and suggestions' })
  @ApiResponse({ status: 200, description: 'Extraction preview with validation results' })
  async getExtractionPreview(@Param('documentId') documentId: string) {
    return this.ocrService.getExtractionPreview(documentId);
  }

  @Post('preview/:documentId/apply-corrections')
  @ApiOperation({ summary: 'Apply suggested auto-corrections to extraction' })
  @ApiResponse({ status: 200, description: 'Corrections applied successfully' })
  async applyAutoCorrections(
    @Param('documentId') documentId: string,
    @Body() body: { corrections: Array<{ field: string; value: any }> },
  ) {
    await this.ocrService.applyAutoCorrections(documentId, body.corrections);
    return { success: true, message: 'Auto-corrections applied' };
  }

  @Get('metrics')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get OCR quality metrics and statistics' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to include (default: 30)' })
  @ApiResponse({ status: 200, description: 'OCR metrics retrieved' })
  async getMetrics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.ocrService.getQualityMetrics(daysNum);
  }

  @Get('metrics/templates')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get per-template OCR metrics' })
  @ApiResponse({ status: 200, description: 'Template metrics retrieved' })
  async getTemplateMetrics() {
    return this.ocrService.getTemplateMetrics();
  }

  @Get('metrics/fields')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get field-level accuracy metrics' })
  @ApiResponse({ status: 200, description: 'Field metrics retrieved' })
  async getFieldMetrics() {
    return this.ocrService.getFieldMetrics();
  }
}
