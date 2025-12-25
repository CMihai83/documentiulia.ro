import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';

export interface InvoiceExportData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  partnerName: string;
  partnerCui?: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  status: string;
}

export interface ReportExportData {
  title: string;
  period: string;
  rows: Array<{ label: string; value: number }>;
  totals?: { label: string; value: number }[];
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===== Excel Exports =====

  async exportInvoicesToExcel(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Buffer> {
    this.logger.log(`Exporting invoices to Excel for user ${userId}`);

    const whereClause: any = { userId };
    if (startDate || endDate) {
      whereClause.invoiceDate = {};
      if (startDate) whereClause.invoiceDate.gte = startDate;
      if (endDate) whereClause.invoiceDate.lte = endDate;
    }

    const invoices = await this.prisma.invoice.findMany({
      where: whereClause,
      orderBy: { invoiceDate: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DocumentIulia.ro';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Facturi', {
      properties: { tabColor: { argb: '2563EB' } },
    });

    // Header row with Romanian column names
    sheet.columns = [
      { header: 'Nr. Factură', key: 'invoiceNumber', width: 15 },
      { header: 'Data Emiterii', key: 'invoiceDate', width: 15 },
      { header: 'Data Scadență', key: 'dueDate', width: 15 },
      { header: 'Client', key: 'partnerName', width: 30 },
      { header: 'CUI Client', key: 'partnerCui', width: 15 },
      { header: 'Valoare Netă', key: 'netAmount', width: 15 },
      { header: 'Cotă TVA (%)', key: 'vatRate', width: 12 },
      { header: 'Valoare TVA', key: 'vatAmount', width: 15 },
      { header: 'Total', key: 'grossAmount', width: 15 },
      { header: 'Monedă', key: 'currency', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2563EB' },
    };
    sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    invoices.forEach((invoice) => {
      sheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        partnerName: invoice.partnerName,
        partnerCui: invoice.partnerCui || '',
        netAmount: Number(invoice.netAmount),
        vatRate: Number(invoice.vatRate),
        vatAmount: Number(invoice.vatAmount),
        grossAmount: Number(invoice.grossAmount),
        currency: invoice.currency,
        status: this.translateStatus(invoice.status),
      });
    });

    // Format number columns
    sheet.getColumn('netAmount').numFmt = '#,##0.00';
    sheet.getColumn('vatAmount').numFmt = '#,##0.00';
    sheet.getColumn('grossAmount').numFmt = '#,##0.00';
    sheet.getColumn('vatRate').numFmt = '0.00';

    // Format date columns
    sheet.getColumn('invoiceDate').numFmt = 'DD.MM.YYYY';
    sheet.getColumn('dueDate').numFmt = 'DD.MM.YYYY';

    // Add totals row
    const totalRow = sheet.addRow({
      invoiceNumber: 'TOTAL',
      netAmount: invoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0),
      vatAmount: invoices.reduce((sum, inv) => sum + Number(inv.vatAmount), 0),
      grossAmount: invoices.reduce((sum, inv) => sum + Number(inv.grossAmount), 0),
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E5E7EB' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportReportToExcel(reportData: ReportExportData): Promise<Buffer> {
    this.logger.log(`Exporting report "${reportData.title}" to Excel`);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DocumentIulia.ro';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Raport');

    // Title
    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = reportData.title;
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    // Period
    sheet.mergeCells('A2:B2');
    sheet.getCell('A2').value = `Perioadă: ${reportData.period}`;
    sheet.getCell('A2').font = { italic: true };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    // Headers
    sheet.getCell('A4').value = 'Descriere';
    sheet.getCell('B4').value = 'Valoare (RON)';
    sheet.getRow(4).font = { bold: true };
    sheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2563EB' },
    };
    sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFF' } };

    // Data rows
    let rowIndex = 5;
    reportData.rows.forEach((row) => {
      sheet.getCell(`A${rowIndex}`).value = row.label;
      sheet.getCell(`B${rowIndex}`).value = row.value;
      sheet.getCell(`B${rowIndex}`).numFmt = '#,##0.00';
      rowIndex++;
    });

    // Totals
    if (reportData.totals) {
      rowIndex++; // Empty row
      reportData.totals.forEach((total) => {
        sheet.getCell(`A${rowIndex}`).value = total.label;
        sheet.getCell(`B${rowIndex}`).value = total.value;
        sheet.getCell(`B${rowIndex}`).numFmt = '#,##0.00';
        sheet.getRow(rowIndex).font = { bold: true };
        sheet.getRow(rowIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'E5E7EB' },
        };
        rowIndex++;
      });
    }

    sheet.getColumn('A').width = 40;
    sheet.getColumn('B').width = 20;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ===== PDF Exports =====

  async exportInvoiceToPdf(invoiceId: string, userId: string): Promise<Buffer> {
    this.logger.log(`Exporting invoice ${invoiceId} to PDF`);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { company: true, cui: true },
    });

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('FACTURĂ', { align: 'center' });
      doc.moveDown(0.5);

      // Invoice number and date
      doc.fontSize(12);
      doc.text(`Nr. Factură: ${invoice.invoiceNumber}`);
      doc.text(`Data emiterii: ${this.formatDate(invoice.invoiceDate)}`);
      if (invoice.dueDate) {
        doc.text(`Data scadenței: ${this.formatDate(invoice.dueDate)}`);
      }
      doc.moveDown();

      // Supplier info
      doc.fontSize(11).text('FURNIZOR:', { underline: true });
      doc.text(user?.company || 'N/A');
      doc.text(`CUI: ${user?.cui || 'N/A'}`);
      doc.text('');
      doc.moveDown();

      // Customer info
      doc.text('CLIENT:', { underline: true });
      doc.text(invoice.partnerName);
      if (invoice.partnerCui) doc.text(`CUI: ${invoice.partnerCui}`);
      if (invoice.partnerAddress) doc.text(invoice.partnerAddress);
      doc.moveDown();

      // Table header
      const tableTop = doc.y + 20;
      doc.fontSize(10);
      this.drawTableRow(doc, tableTop, ['Descriere', 'Cant.', 'Preț', 'TVA%', 'Total']);
      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

      // Table row (simplified - single item)
      this.drawTableRow(doc, tableTop + 25, [
        'Servicii/Produse conform contract',
        '1',
        this.formatCurrency(Number(invoice.netAmount)),
        `${Number(invoice.vatRate)}%`,
        this.formatCurrency(Number(invoice.grossAmount)),
      ]);

      // Totals
      const totalsTop = tableTop + 80;
      doc.moveTo(50, totalsTop).lineTo(545, totalsTop).stroke();
      doc.moveDown(2);

      doc.fontSize(11);
      doc.text(`Valoare netă: ${this.formatCurrency(Number(invoice.netAmount))} ${invoice.currency}`, { align: 'right' });
      doc.text(`TVA (${Number(invoice.vatRate)}%): ${this.formatCurrency(Number(invoice.vatAmount))} ${invoice.currency}`, { align: 'right' });
      doc.fontSize(13).text(`TOTAL: ${this.formatCurrency(Number(invoice.grossAmount))} ${invoice.currency}`, { align: 'right', underline: true });

      // Footer
      doc.fontSize(8);
      doc.text('Document generat de DocumentIulia.ro', 50, 750);
      doc.text(`Generat la: ${new Date().toLocaleString('ro-RO')}`, 50, 760);

      doc.end();
    });
  }

  async exportReportToPdf(reportData: ReportExportData): Promise<Buffer> {
    this.logger.log(`Exporting report "${reportData.title}" to PDF`);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(18).text(reportData.title, { align: 'center' });
      doc.fontSize(12).text(`Perioadă: ${reportData.period}`, { align: 'center' });
      doc.moveDown(2);

      // Data rows
      doc.fontSize(11);
      reportData.rows.forEach((row) => {
        doc.text(`${row.label}: ${this.formatCurrency(row.value)} RON`);
      });

      // Totals
      if (reportData.totals) {
        doc.moveDown();
        doc.fontSize(12);
        reportData.totals.forEach((total) => {
          doc.text(`${total.label}: ${this.formatCurrency(total.value)} RON`, { underline: true });
        });
      }

      // Footer
      doc.fontSize(8);
      doc.text('Document generat de DocumentIulia.ro', 50, 750);
      doc.text(`Generat la: ${new Date().toLocaleString('ro-RO')}`, 50, 760);

      doc.end();
    });
  }

  // ===== Helper Methods =====

  private drawTableRow(doc: PDFKit.PDFDocument, y: number, columns: string[]) {
    const colWidths = [200, 50, 80, 60, 80];
    let x = 50;
    columns.forEach((col, i) => {
      doc.text(col, x, y, { width: colWidths[i], align: i === 0 ? 'left' : 'right' });
      x += colWidths[i] + 10;
    });
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatCurrency(amount: number): string {
    return amount.toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private translateStatus(status: string): string {
    const translations: Record<string, string> = {
      DRAFT: 'Ciornă',
      SENT: 'Trimisă',
      PAID: 'Plătită',
      OVERDUE: 'Restantă',
      CANCELLED: 'Anulată',
    };
    return translations[status] || status;
  }
}
