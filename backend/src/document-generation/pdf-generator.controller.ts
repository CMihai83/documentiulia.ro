import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PDFGeneratorService,
  PDFGenerationOptions,
  PDFElement,
  PDFPage,
} from './pdf-generator.service';

@ApiTags('Document Generation - PDF')
@Controller('documents/pdf')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PDFGeneratorController {
  constructor(private readonly pdfService: PDFGeneratorService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create new PDF document' })
  @ApiResponse({ status: 201, description: 'Document created' })
  async createDocument(@Body() body: { options?: Partial<PDFGenerationOptions> }) {
    const document = this.pdfService.createDocument(body.options);
    return { documentId: document.id, options: document.options };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details' })
  @ApiResponse({ status: 200, description: 'Document details' })
  async getDocument(@Param('id') id: string) {
    const document = this.pdfService.getDocument(id);
    if (!document) {
      return { error: 'Document not found' };
    }
    return document;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  async deleteDocument(@Param('id') id: string) {
    this.pdfService.deleteDocument(id);
    return { success: true };
  }

  // =================== PAGE MANAGEMENT ===================

  @Post(':id/pages')
  @ApiOperation({ summary: 'Add page to document' })
  @ApiResponse({ status: 201, description: 'Page added' })
  async addPage(@Param('id') id: string, @Body() body: { page?: PDFPage }) {
    try {
      const page = this.pdfService.addPage(id, body.page);
      return { success: true, page };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Get(':id/pages/:pageIndex')
  @ApiOperation({ summary: 'Get page' })
  @ApiResponse({ status: 200, description: 'Page details' })
  async getPage(@Param('id') id: string, @Param('pageIndex') pageIndex: string) {
    const page = this.pdfService.getPage(id, parseInt(pageIndex));
    if (!page) {
      return { error: 'Page not found' };
    }
    return page;
  }

  @Delete(':id/pages/:pageIndex')
  @ApiOperation({ summary: 'Remove page' })
  @ApiResponse({ status: 200, description: 'Page removed' })
  async removePage(@Param('id') id: string, @Param('pageIndex') pageIndex: string) {
    const success = this.pdfService.removePage(id, parseInt(pageIndex));
    return { success };
  }

  // =================== ELEMENTS ===================

  @Post(':id/pages/:pageIndex/elements')
  @ApiOperation({ summary: 'Add element to page' })
  @ApiResponse({ status: 201, description: 'Element added' })
  async addElement(
    @Param('id') id: string,
    @Param('pageIndex') pageIndex: string,
    @Body() element: PDFElement,
  ) {
    try {
      const result = this.pdfService.addElement(id, parseInt(pageIndex), element);
      return { success: true, element: result };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post(':id/pages/:pageIndex/text')
  @ApiOperation({ summary: 'Add text to page' })
  @ApiResponse({ status: 201, description: 'Text added' })
  async addText(
    @Param('id') id: string,
    @Param('pageIndex') pageIndex: string,
    @Body() body: {
      text: string;
      x?: number;
      y?: number;
      width?: number;
      font?: { name: string; style: string; size: number; color: string };
      align?: 'left' | 'center' | 'right' | 'justify';
    },
  ) {
    try {
      const element = this.pdfService.addText(id, parseInt(pageIndex), body.text, {
        x: body.x,
        y: body.y,
        width: body.width,
        font: body.font as any,
        align: body.align,
      });
      return { success: true, element };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post(':id/pages/:pageIndex/image')
  @ApiOperation({ summary: 'Add image to page' })
  @ApiResponse({ status: 201, description: 'Image added' })
  async addImage(
    @Param('id') id: string,
    @Param('pageIndex') pageIndex: string,
    @Body() body: {
      imageData: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fit?: 'contain' | 'cover' | 'fill' | 'none';
    },
  ) {
    try {
      const element = this.pdfService.addImage(id, parseInt(pageIndex), body.imageData, {
        x: body.x,
        y: body.y,
        width: body.width,
        height: body.height,
        fit: body.fit,
      });
      return { success: true, element };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post(':id/pages/:pageIndex/table')
  @ApiOperation({ summary: 'Add table to page' })
  @ApiResponse({ status: 201, description: 'Table added' })
  async addTable(
    @Param('id') id: string,
    @Param('pageIndex') pageIndex: string,
    @Body() body: {
      headers?: string[];
      rows: string[][];
      x?: number;
      y?: number;
      width?: number;
      columnWidths?: number[];
      alternateRows?: boolean;
    },
  ) {
    try {
      const element = this.pdfService.addTable(
        id,
        parseInt(pageIndex),
        { headers: body.headers, rows: body.rows },
        {
          x: body.x,
          y: body.y,
          width: body.width,
          columnWidths: body.columnWidths,
          alternateRows: body.alternateRows,
        },
      );
      return { success: true, element };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post(':id/pages/:pageIndex/barcode')
  @ApiOperation({ summary: 'Add barcode to page' })
  @ApiResponse({ status: 201, description: 'Barcode added' })
  async addBarcode(
    @Param('id') id: string,
    @Param('pageIndex') pageIndex: string,
    @Body() body: {
      value: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      type?: 'code128' | 'code39' | 'ean13' | 'ean8' | 'upc' | 'itf14';
      showText?: boolean;
    },
  ) {
    try {
      const element = this.pdfService.addBarcode(id, parseInt(pageIndex), body.value, {
        x: body.x,
        y: body.y,
        width: body.width,
        height: body.height,
        type: body.type,
        showText: body.showText,
      });
      return { success: true, element };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @Post(':id/pages/:pageIndex/qrcode')
  @ApiOperation({ summary: 'Add QR code to page' })
  @ApiResponse({ status: 201, description: 'QR code added' })
  async addQRCode(
    @Param('id') id: string,
    @Param('pageIndex') pageIndex: string,
    @Body() body: {
      value: string;
      x?: number;
      y?: number;
      size?: number;
      errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    },
  ) {
    try {
      const element = this.pdfService.addQRCode(id, parseInt(pageIndex), body.value, {
        x: body.x,
        y: body.y,
        size: body.size,
        errorCorrection: body.errorCorrection,
      });
      return { success: true, element };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // =================== GENERATION ===================

  @Post(':id/generate')
  @ApiOperation({ summary: 'Generate PDF' })
  @ApiResponse({ status: 200, description: 'PDF generated' })
  async generate(@Param('id') id: string) {
    return this.pdfService.generate(id);
  }

  @Post(':id/download')
  @ApiOperation({ summary: 'Generate and download PDF' })
  @ApiResponse({ status: 200, description: 'PDF file' })
  async download(@Param('id') id: string, @Res() res: Response) {
    const result = await this.pdfService.generate(id);

    if (!result.success || !result.content) {
      return res.status(400).json({ error: result.error || 'Generation failed' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="document-${id}.pdf"`);
    res.send(result.content);
  }

  // =================== UTILITIES ===================

  @Post('from-html')
  @ApiOperation({ summary: 'Generate PDF from HTML' })
  @ApiResponse({ status: 200, description: 'PDF generated' })
  async fromHTML(
    @Body() body: {
      html: string;
      options?: Partial<PDFGenerationOptions>;
    },
  ) {
    return this.pdfService.fromHTML(body.html, body.options);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge multiple PDFs' })
  @ApiResponse({ status: 200, description: 'PDFs merged' })
  async merge(@Body() body: { documentIds: string[] }) {
    return this.pdfService.merge(body.documentIds);
  }

  @Post(':id/split')
  @ApiOperation({ summary: 'Split PDF by page ranges' })
  @ApiResponse({ status: 200, description: 'PDF split' })
  async split(
    @Param('id') id: string,
    @Body() body: { pageRanges: Array<{ start: number; end: number }> },
  ) {
    const results = await this.pdfService.split(id, body.pageRanges);
    return { results };
  }

  @Get('page-sizes')
  @ApiOperation({ summary: 'Get available page sizes' })
  @ApiResponse({ status: 200, description: 'Page sizes' })
  async getPageSizes() {
    const sizes = ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid', 'Custom'];
    const dimensions = sizes.map((size) => ({
      name: size,
      portrait: this.pdfService.getPageDimensions(size as any, 'portrait'),
      landscape: this.pdfService.getPageDimensions(size as any, 'landscape'),
    }));
    return { sizes: dimensions };
  }
}
