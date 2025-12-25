import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  PdfGenerationService,
  PdfTemplateType,
  PdfGenerationOptions,
} from './pdf-generation.service';

@ApiTags('PDF Generation')
@Controller('pdf')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PdfController {
  constructor(private readonly pdfService: PdfGenerationService) {}

  // =================== PDF GENERATION ===================

  @Post('generate')
  @ApiOperation({ summary: 'Generate a PDF document from HTML content' })
  @ApiResponse({ status: 200, description: 'PDF generation result' })
  async generatePdf(
    @Request() req: any,
    @Body() body: {
      htmlContent: string;
      options?: PdfGenerationOptions;
      name?: string;
      type?: PdfTemplateType;
    },
  ) {
    return this.pdfService.generatePdf(body.htmlContent, body.options, {
      name: body.name,
      type: body.type,
      organizationId: req.user.organizationId || req.user.sub,
      userId: req.user.sub,
    });
  }

  @Post('generate/template')
  @ApiOperation({ summary: 'Generate PDF from template' })
  @ApiResponse({ status: 200, description: 'PDF generated from template' })
  async generateFromTemplate(
    @Request() req: any,
    @Body() body: {
      templateId: string;
      data: Record<string, any>;
      options?: PdfGenerationOptions;
    },
  ) {
    return this.pdfService.generateFromTemplate(body.templateId, body.data, body.options);
  }

  @Post('generate/batch')
  @ApiOperation({ summary: 'Generate multiple PDFs in batch' })
  @ApiResponse({ status: 200, description: 'Batch generation result' })
  async generateBatch(
    @Body() body: {
      items: { templateId: string; data: Record<string, any>; options?: PdfGenerationOptions }[];
      batchName: string;
      batchNameRo?: string;
    },
  ) {
    return this.pdfService.generateBatch(body.items, body.batchName, body.batchNameRo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get PDF by ID' })
  @ApiResponse({ status: 200, description: 'PDF details' })
  async getPdf(@Param('id') id: string) {
    const pdf = await this.pdfService.getPdf(id);
    return pdf || { error: 'PDF not found' };
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Download generated PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  async downloadPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.pdfService.getPdf(id);
    if (!pdf) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    const content = await this.pdfService.getPdfContent(id);
    if (!content) {
      res.status(404).json({ error: 'PDF content not found' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdf.name}.pdf"`);
    res.send(content);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete PDF' })
  @ApiResponse({ status: 200, description: 'PDF deleted' })
  async deletePdf(@Param('id') id: string) {
    await this.pdfService.deletePdf(id);
    return { success: true };
  }

  // =================== PDF OPERATIONS ===================

  @Post('merge')
  @ApiOperation({ summary: 'Merge multiple PDFs' })
  @ApiResponse({ status: 200, description: 'Merged PDF' })
  async mergePdfs(
    @Body() body: { pdfIds: string[]; name: string },
  ) {
    return this.pdfService.mergePdfs(body.pdfIds, body.name);
  }

  @Post(':id/split')
  @ApiOperation({ summary: 'Split PDF by page ranges' })
  @ApiResponse({ status: 200, description: 'Split PDFs' })
  async splitPdf(
    @Param('id') id: string,
    @Body() body: { pageRanges: { start: number; end: number }[] },
  ) {
    return this.pdfService.splitPdf(id, body.pageRanges);
  }

  // =================== USER/ORG PDFs ===================

  @Get('organization/:orgId')
  @ApiOperation({ summary: 'Get PDFs by organization' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organization PDFs' })
  async getPdfsByOrganization(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: string,
  ) {
    return this.pdfService.getPdfsByOrganization(orgId, limit ? parseInt(limit) : 50);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get PDFs by user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User PDFs' })
  async getPdfsByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.pdfService.getPdfsByUser(userId, limit ? parseInt(limit) : 50);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get PDFs by type' })
  @ApiResponse({ status: 200, description: 'PDFs by type' })
  async getPdfsByType(@Param('type') type: PdfTemplateType) {
    return this.pdfService.getPdfsByType(type);
  }

  // =================== BATCHES ===================

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get batch by ID' })
  @ApiResponse({ status: 200, description: 'Batch details' })
  async getBatch(@Param('batchId') batchId: string) {
    const batch = await this.pdfService.getBatch(batchId);
    return batch || { error: 'Batch not found' };
  }

  // =================== TEMPLATES ===================

  @Get('templates')
  @ApiOperation({ summary: 'Get all PDF templates' })
  @ApiResponse({ status: 200, description: 'List of PDF templates' })
  async getTemplates() {
    return this.pdfService.getAllTemplates();
  }

  @Get('templates/type/:type')
  @ApiOperation({ summary: 'Get templates by type' })
  @ApiResponse({ status: 200, description: 'Templates by type' })
  async getTemplatesByType(@Param('type') type: PdfTemplateType) {
    return this.pdfService.getTemplatesByType(type);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.pdfService.getTemplate(id);
    return template || { error: 'Template not found' };
  }

  @Post('templates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create PDF template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Body() body: {
      name: string;
      nameRo: string;
      description: string;
      descriptionRo: string;
      type: PdfTemplateType;
      htmlContent: string;
      htmlContentRo: string;
      cssStyles: string;
      variables: Array<{
        name: string;
        description: string;
        descriptionRo: string;
        type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'ARRAY' | 'OBJECT' | 'CURRENCY' | 'IMAGE';
        required: boolean;
        defaultValue?: any;
        format?: string;
      }>;
      defaultOptions?: PdfGenerationOptions;
      isActive?: boolean;
      version?: number;
    },
  ) {
    return this.pdfService.createTemplate({
      ...body,
      defaultOptions: body.defaultOptions ?? {
        pageSize: 'A4',
        orientation: 'PORTRAIT',
        margins: { top: 20, right: 15, bottom: 20, left: 15 },
      },
      isActive: body.isActive ?? true,
      version: body.version ?? 1,
    });
  }

  @Post('templates/:id/activate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activate template' })
  @ApiResponse({ status: 200, description: 'Template activated' })
  async activateTemplate(@Param('id') id: string) {
    return this.pdfService.activateTemplate(id);
  }

  @Post('templates/:id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate template' })
  @ApiResponse({ status: 200, description: 'Template deactivated' })
  async deactivateTemplate(@Param('id') id: string) {
    return this.pdfService.deactivateTemplate(id);
  }

  @Delete('templates/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('id') id: string) {
    await this.pdfService.deleteTemplate(id);
    return { success: true };
  }

  // =================== CACHING ===================

  @Get('cache/:key')
  @ApiOperation({ summary: 'Get cached PDF' })
  @ApiResponse({ status: 200, description: 'Cached PDF' })
  async getCachedPdf(@Param('key') key: string) {
    const pdf = await this.pdfService.getCachedPdf(key);
    return pdf || { error: 'Cached PDF not found or expired' };
  }

  @Post('cache/clear')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Clear PDF cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared' })
  clearCache() {
    this.pdfService.clearCache();
    return { success: true };
  }

  // =================== STATISTICS ===================

  @Get('stats')
  @ApiOperation({ summary: 'Get PDF generation statistics' })
  @ApiQuery({ name: 'since', required: false })
  @ApiResponse({ status: 200, description: 'Generation statistics' })
  async getStats(@Query('since') since?: string) {
    const sinceDate = since ? new Date(since) : undefined;
    return this.pdfService.getStats(sinceDate);
  }

  // =================== CONFIGURATION ===================

  @Get('config/template-types')
  @ApiOperation({ summary: 'Get PDF template types' })
  @ApiResponse({ status: 200, description: 'List of template types' })
  getTemplateTypes() {
    return [
      { value: 'INVOICE', label: 'Invoice', labelRo: 'Factură' },
      { value: 'RECEIPT', label: 'Receipt', labelRo: 'Chitanță' },
      { value: 'CONTRACT', label: 'Contract', labelRo: 'Contract' },
      { value: 'REPORT', label: 'Report', labelRo: 'Raport' },
      { value: 'STATEMENT', label: 'Statement', labelRo: 'Extras' },
      { value: 'CERTIFICATE', label: 'Certificate', labelRo: 'Certificat' },
      { value: 'OFFER', label: 'Offer', labelRo: 'Ofertă' },
      { value: 'ORDER', label: 'Order', labelRo: 'Comandă' },
      { value: 'DELIVERY_NOTE', label: 'Delivery Note', labelRo: 'Aviz de Livrare' },
      { value: 'TAX_REPORT', label: 'Tax Report', labelRo: 'Raport Fiscal' },
      { value: 'ANAF_DECLARATION', label: 'ANAF Declaration', labelRo: 'Declarație ANAF' },
      { value: 'PAYROLL', label: 'Payroll', labelRo: 'Stat de Plată' },
      { value: 'CUSTOM', label: 'Custom', labelRo: 'Personalizat' },
    ];
  }

  @Get('config/page-sizes')
  @ApiOperation({ summary: 'Get available page sizes' })
  @ApiResponse({ status: 200, description: 'List of page sizes' })
  getPageSizes() {
    return [
      { value: 'A4', label: 'A4 (210 × 297 mm)', default: true },
      { value: 'A3', label: 'A3 (297 × 420 mm)' },
      { value: 'A5', label: 'A5 (148 × 210 mm)' },
      { value: 'LETTER', label: 'Letter (216 × 279 mm)' },
      { value: 'LEGAL', label: 'Legal (216 × 356 mm)' },
    ];
  }

  @Get('config/orientations')
  @ApiOperation({ summary: 'Get page orientations' })
  @ApiResponse({ status: 200, description: 'List of orientations' })
  getOrientations() {
    return [
      { value: 'PORTRAIT', label: 'Portrait', labelRo: 'Portret', default: true },
      { value: 'LANDSCAPE', label: 'Landscape', labelRo: 'Peisaj' },
    ];
  }
}
