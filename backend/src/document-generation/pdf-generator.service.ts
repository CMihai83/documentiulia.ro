import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// =================== TYPES ===================

export type PDFPageSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid' | 'Custom';
export type PDFOrientation = 'portrait' | 'landscape';
export type PDFCompression = 'none' | 'low' | 'medium' | 'high';

export interface PDFMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PDFFont {
  name: string;
  style: 'normal' | 'bold' | 'italic' | 'bolditalic';
  size: number;
  color: string;
}

export interface PDFPageSettings {
  size: PDFPageSize;
  orientation: PDFOrientation;
  margins: PDFMargins;
  customWidth?: number;
  customHeight?: number;
  background?: string;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PDFSecurity {
  password?: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
    fillingForms?: boolean;
    contentAccessibility?: boolean;
    documentAssembly?: boolean;
  };
  encryption?: '40bit' | '128bit' | '256bit';
}

export interface PDFWatermark {
  text?: string;
  image?: string;
  opacity: number;
  rotation: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize?: number;
  color?: string;
}

export interface PDFHeader {
  enabled: boolean;
  height: number;
  content?: string;
  leftContent?: string;
  centerContent?: string;
  rightContent?: string;
  font?: PDFFont;
  showOnFirstPage?: boolean;
  showPageNumber?: boolean;
}

export interface PDFFooter {
  enabled: boolean;
  height: number;
  content?: string;
  leftContent?: string;
  centerContent?: string;
  rightContent?: string;
  font?: PDFFont;
  showOnFirstPage?: boolean;
  showPageNumber?: boolean;
  pageNumberFormat?: string;
}

export interface PDFTableOfContents {
  enabled: boolean;
  title?: string;
  maxLevel?: number;
  showPageNumbers?: boolean;
  dotLeader?: boolean;
}

export interface PDFGenerationOptions {
  pageSettings: PDFPageSettings;
  metadata?: PDFMetadata;
  security?: PDFSecurity;
  watermark?: PDFWatermark;
  header?: PDFHeader;
  footer?: PDFFooter;
  tableOfContents?: PDFTableOfContents;
  compression?: PDFCompression;
  embedFonts?: boolean;
  pdfVersion?: '1.4' | '1.5' | '1.6' | '1.7' | '2.0';
  tagged?: boolean;
  outline?: boolean;
}

export interface PDFElement {
  type: 'text' | 'image' | 'table' | 'shape' | 'line' | 'barcode' | 'qrcode' | 'chart' | 'html';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  content: any;
  style?: Record<string, any>;
}

export interface PDFPage {
  elements: PDFElement[];
  settings?: Partial<PDFPageSettings>;
}

export interface PDFDocument {
  id: string;
  pages: PDFPage[];
  options: PDFGenerationOptions;
  createdAt: Date;
}

export interface PDFGenerationResult {
  id: string;
  success: boolean;
  content?: string;
  size?: number;
  pageCount?: number;
  error?: string;
  warnings?: string[];
  generationTime: number;
}

// =================== SERVICE ===================

@Injectable()
export class PDFGeneratorService {
  private documents: Map<string, PDFDocument> = new Map();

  constructor(private eventEmitter: EventEmitter2) {}

  // =================== PAGE SIZE HELPERS ===================

  getPageDimensions(size: PDFPageSize, orientation: PDFOrientation): { width: number; height: number } {
    const sizes: Record<PDFPageSize, { width: number; height: number }> = {
      A4: { width: 595.28, height: 841.89 },
      A3: { width: 841.89, height: 1190.55 },
      A5: { width: 419.53, height: 595.28 },
      Letter: { width: 612, height: 792 },
      Legal: { width: 612, height: 1008 },
      Tabloid: { width: 792, height: 1224 },
      Custom: { width: 595.28, height: 841.89 },
    };

    const dimensions = sizes[size] || sizes.A4;

    if (orientation === 'landscape') {
      return { width: dimensions.height, height: dimensions.width };
    }

    return dimensions;
  }

  // =================== DOCUMENT CREATION ===================

  createDocument(options?: Partial<PDFGenerationOptions>): PDFDocument {
    const id = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const defaultOptions: PDFGenerationOptions = {
      pageSettings: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 72, right: 72, bottom: 72, left: 72 },
      },
      compression: 'medium',
      embedFonts: true,
      pdfVersion: '1.7',
      tagged: false,
      outline: true,
    };

    const document: PDFDocument = {
      id,
      pages: [],
      options: { ...defaultOptions, ...options },
      createdAt: new Date(),
    };

    this.documents.set(id, document);

    return document;
  }

  // =================== PAGE MANAGEMENT ===================

  addPage(documentId: string, page?: PDFPage): PDFPage {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const newPage: PDFPage = page || { elements: [] };
    document.pages.push(newPage);

    return newPage;
  }

  getPage(documentId: string, pageIndex: number): PDFPage | null {
    const document = this.documents.get(documentId);
    if (!document) {
      return null;
    }

    return document.pages[pageIndex] || null;
  }

  removePage(documentId: string, pageIndex: number): boolean {
    const document = this.documents.get(documentId);
    if (!document || !document.pages[pageIndex]) {
      return false;
    }

    document.pages.splice(pageIndex, 1);
    return true;
  }

  // =================== ELEMENT MANAGEMENT ===================

  addElement(documentId: string, pageIndex: number, element: PDFElement): PDFElement {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    if (!document.pages[pageIndex]) {
      throw new Error('Page not found');
    }

    document.pages[pageIndex].elements.push(element);
    return element;
  }

  // =================== TEXT RENDERING ===================

  addText(
    documentId: string,
    pageIndex: number,
    text: string,
    options?: {
      x?: number;
      y?: number;
      width?: number;
      font?: PDFFont;
      align?: 'left' | 'center' | 'right' | 'justify';
      lineHeight?: number;
    },
  ): PDFElement {
    const element: PDFElement = {
      type: 'text',
      x: options?.x || 72,
      y: options?.y || 72,
      width: options?.width,
      content: text,
      style: {
        font: options?.font || { name: 'Helvetica', style: 'normal', size: 12, color: '#000000' },
        align: options?.align || 'left',
        lineHeight: options?.lineHeight || 1.2,
      },
    };

    return this.addElement(documentId, pageIndex, element);
  }

  addHeading(
    documentId: string,
    pageIndex: number,
    text: string,
    level: 1 | 2 | 3 | 4 | 5 | 6,
    options?: { x?: number; y?: number },
  ): PDFElement {
    const sizes = { 1: 24, 2: 20, 3: 16, 4: 14, 5: 12, 6: 10 };

    return this.addText(documentId, pageIndex, text, {
      ...options,
      font: {
        name: 'Helvetica',
        style: 'bold',
        size: sizes[level],
        color: '#000000',
      },
    });
  }

  addParagraph(
    documentId: string,
    pageIndex: number,
    text: string,
    options?: { x?: number; y?: number; width?: number; indent?: number },
  ): PDFElement {
    const formattedText = options?.indent ? ' '.repeat(options.indent) + text : text;

    return this.addText(documentId, pageIndex, formattedText, {
      ...options,
      align: 'justify',
      lineHeight: 1.5,
    });
  }

  // =================== IMAGE RENDERING ===================

  addImage(
    documentId: string,
    pageIndex: number,
    imageData: string | Buffer,
    options?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      fit?: 'contain' | 'cover' | 'fill' | 'none';
      align?: 'left' | 'center' | 'right';
      valign?: 'top' | 'middle' | 'bottom';
    },
  ): PDFElement {
    const element: PDFElement = {
      type: 'image',
      x: options?.x || 72,
      y: options?.y || 72,
      width: options?.width,
      height: options?.height,
      content: imageData,
      style: {
        fit: options?.fit || 'contain',
        align: options?.align || 'left',
        valign: options?.valign || 'top',
      },
    };

    return this.addElement(documentId, pageIndex, element);
  }

  // =================== TABLE RENDERING ===================

  addTable(
    documentId: string,
    pageIndex: number,
    data: {
      headers?: string[];
      rows: string[][];
    },
    options?: {
      x?: number;
      y?: number;
      width?: number;
      columnWidths?: number[];
      headerStyle?: Record<string, any>;
      cellStyle?: Record<string, any>;
      borderStyle?: Record<string, any>;
      alternateRows?: boolean;
      alternateRowColor?: string;
    },
  ): PDFElement {
    const element: PDFElement = {
      type: 'table',
      x: options?.x || 72,
      y: options?.y || 72,
      width: options?.width,
      content: data,
      style: {
        columnWidths: options?.columnWidths,
        headerStyle: options?.headerStyle || {
          font: { name: 'Helvetica', style: 'bold', size: 10, color: '#ffffff' },
          background: '#333333',
          padding: 8,
        },
        cellStyle: options?.cellStyle || {
          font: { name: 'Helvetica', style: 'normal', size: 10, color: '#000000' },
          padding: 6,
        },
        borderStyle: options?.borderStyle || {
          width: 1,
          color: '#cccccc',
        },
        alternateRows: options?.alternateRows ?? true,
        alternateRowColor: options?.alternateRowColor || '#f5f5f5',
      },
    };

    return this.addElement(documentId, pageIndex, element);
  }

  // =================== SHAPES ===================

  addRectangle(
    documentId: string,
    pageIndex: number,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      borderRadius?: number;
    },
  ): PDFElement {
    const element: PDFElement = {
      type: 'shape',
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      content: { shape: 'rectangle' },
      style: {
        fill: options.fill,
        stroke: options.stroke,
        strokeWidth: options.strokeWidth || 1,
        borderRadius: options.borderRadius || 0,
      },
    };

    return this.addElement(documentId, pageIndex, element);
  }

  addCircle(
    documentId: string,
    pageIndex: number,
    options: {
      x: number;
      y: number;
      radius: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    },
  ): PDFElement {
    const element: PDFElement = {
      type: 'shape',
      x: options.x,
      y: options.y,
      width: options.radius * 2,
      height: options.radius * 2,
      content: { shape: 'circle', radius: options.radius },
      style: {
        fill: options.fill,
        stroke: options.stroke,
        strokeWidth: options.strokeWidth || 1,
      },
    };

    return this.addElement(documentId, pageIndex, element);
  }

  addLine(
    documentId: string,
    pageIndex: number,
    options: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke?: string;
      strokeWidth?: number;
      dashPattern?: number[];
    },
  ): PDFElement {
    const element: PDFElement = {
      type: 'line',
      x: options.x1,
      y: options.y1,
      content: { x2: options.x2, y2: options.y2 },
      style: {
        stroke: options.stroke || '#000000',
        strokeWidth: options.strokeWidth || 1,
        dashPattern: options.dashPattern,
      },
    };

    return this.addElement(documentId, pageIndex, element);
  }

  // =================== BARCODES & QR CODES ===================

  addBarcode(
    documentId: string,
    pageIndex: number,
    value: string,
    options?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      type?: 'code128' | 'code39' | 'ean13' | 'ean8' | 'upc' | 'itf14';
      showText?: boolean;
      textPosition?: 'top' | 'bottom';
    },
  ): PDFElement {
    const element: PDFElement = {
      type: 'barcode',
      x: options?.x || 72,
      y: options?.y || 72,
      width: options?.width || 200,
      height: options?.height || 50,
      content: {
        value,
        type: options?.type || 'code128',
      },
      style: {
        showText: options?.showText ?? true,
        textPosition: options?.textPosition || 'bottom',
      },
    };

    return this.addElement(documentId, pageIndex, element);
  }

  addQRCode(
    documentId: string,
    pageIndex: number,
    value: string,
    options?: {
      x?: number;
      y?: number;
      size?: number;
      errorCorrection?: 'L' | 'M' | 'Q' | 'H';
      foreground?: string;
      background?: string;
    },
  ): PDFElement {
    const element: PDFElement = {
      type: 'qrcode',
      x: options?.x || 72,
      y: options?.y || 72,
      width: options?.size || 100,
      height: options?.size || 100,
      content: {
        value,
        errorCorrection: options?.errorCorrection || 'M',
      },
      style: {
        foreground: options?.foreground || '#000000',
        background: options?.background || '#ffffff',
      },
    };

    return this.addElement(documentId, pageIndex, element);
  }

  // =================== HTML RENDERING ===================

  addHTML(
    documentId: string,
    pageIndex: number,
    html: string,
    options?: {
      x?: number;
      y?: number;
      width?: number;
      css?: string;
    },
  ): PDFElement {
    const element: PDFElement = {
      type: 'html',
      x: options?.x || 72,
      y: options?.y || 72,
      width: options?.width,
      content: html,
      style: {
        css: options?.css,
      },
    };

    return this.addElement(documentId, pageIndex, element);
  }

  // =================== PDF GENERATION ===================

  async generate(documentId: string): Promise<PDFGenerationResult> {
    const startTime = Date.now();
    const document = this.documents.get(documentId);

    if (!document) {
      return {
        id: documentId,
        success: false,
        error: 'Document not found',
        generationTime: Date.now() - startTime,
      };
    }

    try {
      const warnings: string[] = [];

      // Build PDF content
      const pdfContent = await this.buildPDF(document, warnings);

      const result: PDFGenerationResult = {
        id: documentId,
        success: true,
        content: pdfContent,
        size: pdfContent.length,
        pageCount: document.pages.length,
        warnings: warnings.length > 0 ? warnings : undefined,
        generationTime: Date.now() - startTime,
      };

      this.eventEmitter.emit('pdf.generated', { documentId, result });

      return result;

    } catch (error: any) {
      return {
        id: documentId,
        success: false,
        error: error.message,
        generationTime: Date.now() - startTime,
      };
    }
  }

  private async buildPDF(document: PDFDocument, warnings: string[]): Promise<string> {
    const { options, pages } = document;

    // Build PDF structure (simplified representation)
    const pdfParts: string[] = [];

    // PDF Header
    pdfParts.push(`%PDF-${options.pdfVersion || '1.7'}`);
    pdfParts.push('%âãÏÓ'); // Binary marker

    // Metadata
    if (options.metadata) {
      pdfParts.push(this.buildMetadata(options.metadata));
    }

    // Page dimensions
    const dims = this.getPageDimensions(
      options.pageSettings.size,
      options.pageSettings.orientation,
    );

    // Process each page
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageSettings = { ...options.pageSettings, ...page.settings };

      pdfParts.push(`\n%% Page ${i + 1}`);

      // Header
      if (options.header?.enabled && (i > 0 || options.header.showOnFirstPage)) {
        pdfParts.push(this.buildHeader(options.header, i + 1, pages.length));
      }

      // Content
      for (const element of page.elements) {
        try {
          pdfParts.push(this.renderElement(element));
        } catch (error: any) {
          warnings.push(`Error rendering element on page ${i + 1}: ${error.message}`);
        }
      }

      // Footer
      if (options.footer?.enabled && (i > 0 || options.footer.showOnFirstPage)) {
        pdfParts.push(this.buildFooter(options.footer, i + 1, pages.length));
      }

      // Watermark
      if (options.watermark) {
        pdfParts.push(this.buildWatermark(options.watermark));
      }
    }

    // Security
    if (options.security?.password) {
      pdfParts.push(this.buildSecurity(options.security));
    }

    // PDF trailer
    pdfParts.push('\n%%EOF');

    return pdfParts.join('\n');
  }

  private buildMetadata(metadata: PDFMetadata): string {
    const parts: string[] = ['<< /Type /Metadata'];

    if (metadata.title) parts.push(`/Title (${this.escapeString(metadata.title)})`);
    if (metadata.author) parts.push(`/Author (${this.escapeString(metadata.author)})`);
    if (metadata.subject) parts.push(`/Subject (${this.escapeString(metadata.subject)})`);
    if (metadata.keywords) parts.push(`/Keywords (${metadata.keywords.join(', ')})`);
    if (metadata.creator) parts.push(`/Creator (${this.escapeString(metadata.creator)})`);
    if (metadata.producer) parts.push(`/Producer (${this.escapeString(metadata.producer || 'DocumentIulia PDF Generator')})`);
    if (metadata.creationDate) parts.push(`/CreationDate (D:${this.formatPDFDate(metadata.creationDate)})`);

    parts.push('>>');
    return parts.join(' ');
  }

  private buildHeader(header: PDFHeader, pageNum: number, totalPages: number): string {
    let content = '';

    if (header.leftContent) content += this.processHeaderFooterContent(header.leftContent, pageNum, totalPages);
    if (header.centerContent) content += this.processHeaderFooterContent(header.centerContent, pageNum, totalPages);
    if (header.rightContent) content += this.processHeaderFooterContent(header.rightContent, pageNum, totalPages);

    return `%% Header\n${content}`;
  }

  private buildFooter(footer: PDFFooter, pageNum: number, totalPages: number): string {
    let content = '';

    if (footer.leftContent) content += this.processHeaderFooterContent(footer.leftContent, pageNum, totalPages);
    if (footer.centerContent) content += this.processHeaderFooterContent(footer.centerContent, pageNum, totalPages);
    if (footer.rightContent) content += this.processHeaderFooterContent(footer.rightContent, pageNum, totalPages);

    if (footer.showPageNumber) {
      const format = footer.pageNumberFormat || 'Page {{page}} of {{total}}';
      content += format.replace('{{page}}', String(pageNum)).replace('{{total}}', String(totalPages));
    }

    return `%% Footer\n${content}`;
  }

  private processHeaderFooterContent(content: string, pageNum: number, totalPages: number): string {
    return content
      .replace(/\{\{page\}\}/g, String(pageNum))
      .replace(/\{\{total\}\}/g, String(totalPages))
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
  }

  private buildWatermark(watermark: PDFWatermark): string {
    if (watermark.text) {
      return `%% Watermark: ${watermark.text} (opacity: ${watermark.opacity}, rotation: ${watermark.rotation})`;
    }
    if (watermark.image) {
      return `%% Watermark Image: ${watermark.image}`;
    }
    return '';
  }

  private buildSecurity(security: PDFSecurity): string {
    const parts: string[] = ['%% Security'];
    parts.push(`Encryption: ${security.encryption || '128bit'}`);
    if (security.permissions) {
      parts.push(`Permissions: ${JSON.stringify(security.permissions)}`);
    }
    return parts.join('\n');
  }

  private renderElement(element: PDFElement): string {
    switch (element.type) {
      case 'text':
        return this.renderText(element);
      case 'image':
        return this.renderImage(element);
      case 'table':
        return this.renderTable(element);
      case 'shape':
        return this.renderShape(element);
      case 'line':
        return this.renderLine(element);
      case 'barcode':
        return this.renderBarcode(element);
      case 'qrcode':
        return this.renderQRCode(element);
      case 'html':
        return this.renderHTMLContent(element);
      default:
        return `%% Unknown element type: ${element.type}`;
    }
  }

  private renderText(element: PDFElement): string {
    const { x, y, width, content, style } = element;
    return `BT
${x} ${y} Td
/${style?.font?.name || 'Helvetica'} ${style?.font?.size || 12} Tf
(${this.escapeString(content)}) Tj
ET`;
  }

  private renderImage(element: PDFElement): string {
    const { x, y, width, height } = element;
    return `%% Image at (${x}, ${y}) size ${width}x${height}`;
  }

  private renderTable(element: PDFElement): string {
    const { content, style } = element;
    const { headers, rows } = content;

    let tableContent = '%% Table\n';
    if (headers) {
      tableContent += `%% Headers: ${headers.join(' | ')}\n`;
    }
    for (const row of rows) {
      tableContent += `%% Row: ${row.join(' | ')}\n`;
    }
    return tableContent;
  }

  private renderShape(element: PDFElement): string {
    const { x, y, width, height, content, style } = element;
    return `%% Shape: ${content.shape} at (${x}, ${y}) size ${width}x${height}`;
  }

  private renderLine(element: PDFElement): string {
    const { x, y, content, style } = element;
    return `${x} ${y} m
${content.x2} ${content.y2} l
${style?.strokeWidth || 1} w
S`;
  }

  private renderBarcode(element: PDFElement): string {
    const { x, y, width, height, content } = element;
    return `%% Barcode: ${content.value} (${content.type}) at (${x}, ${y})`;
  }

  private renderQRCode(element: PDFElement): string {
    const { x, y, width, content } = element;
    return `%% QR Code: ${content.value} at (${x}, ${y}) size ${width}`;
  }

  private renderHTMLContent(element: PDFElement): string {
    return `%% HTML Content rendered`;
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private formatPDFDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // =================== UTILITIES ===================

  async fromHTML(html: string, options?: Partial<PDFGenerationOptions>): Promise<PDFGenerationResult> {
    const doc = this.createDocument(options);
    this.addPage(doc.id);
    this.addHTML(doc.id, 0, html);
    return this.generate(doc.id);
  }

  async merge(documentIds: string[]): Promise<PDFGenerationResult> {
    const startTime = Date.now();
    const mergedDoc = this.createDocument();

    for (const docId of documentIds) {
      const doc = this.documents.get(docId);
      if (doc) {
        for (const page of doc.pages) {
          mergedDoc.pages.push(page);
        }
      }
    }

    return this.generate(mergedDoc.id);
  }

  async split(documentId: string, pageRanges: Array<{ start: number; end: number }>): Promise<PDFGenerationResult[]> {
    const results: PDFGenerationResult[] = [];
    const sourceDoc = this.documents.get(documentId);

    if (!sourceDoc) {
      return [{ id: documentId, success: false, error: 'Document not found', generationTime: 0 }];
    }

    for (const range of pageRanges) {
      const splitDoc = this.createDocument(sourceDoc.options);

      for (let i = range.start; i <= Math.min(range.end, sourceDoc.pages.length - 1); i++) {
        splitDoc.pages.push(sourceDoc.pages[i]);
      }

      results.push(await this.generate(splitDoc.id));
    }

    return results;
  }

  deleteDocument(documentId: string): void {
    this.documents.delete(documentId);
  }

  getDocument(documentId: string): PDFDocument | null {
    return this.documents.get(documentId) || null;
  }
}
