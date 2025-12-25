import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake');
import { TDocumentDefinitions, Alignment } from 'pdfmake/interfaces';

// Romanian invoice PDF generator compliant with fiscal requirements

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date | null;
  supplier: {
    name: string;
    cui: string;
    address?: string;
  };
  customer: {
    name: string;
    cui?: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }>;
  totals: {
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  };
  currency: string;
}

@Injectable()
export class PdfService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private printer: any;

  constructor() {
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique',
      },
    };
    this.printer = new PdfPrinter(fonts);
  }

  async generateInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      content: [
        // Header
        {
          columns: [
            {
              text: 'FACTURĂ FISCALĂ',
              style: 'header',
              width: '*',
            },
            {
              text: invoice.invoiceNumber,
              style: 'invoiceNumber',
              width: 'auto',
              alignment: 'right' as Alignment,
            },
          ],
          margin: [0, 0, 0, 20],
        },
        // Dates
        {
          columns: [
            { text: `Data emiterii: ${this.formatDate(invoice.invoiceDate)}`, style: 'date' },
            {
              text: invoice.dueDate
                ? `Scadență: ${this.formatDate(invoice.dueDate)}`
                : '',
              style: 'date',
              alignment: 'right' as Alignment,
            },
          ],
          margin: [0, 0, 0, 20],
        },
        // Supplier and Customer
        {
          columns: [
            {
              width: '48%',
              stack: [
                { text: 'FURNIZOR', style: 'sectionTitle' },
                { text: invoice.supplier.name, style: 'companyName' },
                { text: `CUI: ${invoice.supplier.cui}`, style: 'companyDetail' },
                { text: invoice.supplier.address || '', style: 'companyDetail' },
              ],
            },
            { width: '4%', text: '' },
            {
              width: '48%',
              stack: [
                { text: 'CLIENT', style: 'sectionTitle' },
                { text: invoice.customer.name, style: 'companyName' },
                { text: invoice.customer.cui ? `CUI: ${invoice.customer.cui}` : '', style: 'companyDetail' },
                { text: invoice.customer.address || '', style: 'companyDetail' },
              ],
            },
          ],
          margin: [0, 0, 0, 30],
        },
        // Items table
        {
          table: {
            headerRows: 1,
            widths: ['*', 50, 70, 50, 80],
            body: [
              [
                { text: 'Descriere', style: 'tableHeader' },
                { text: 'Cant.', style: 'tableHeader', alignment: 'right' as Alignment },
                { text: 'Preț unit.', style: 'tableHeader', alignment: 'right' as Alignment },
                { text: 'TVA %', style: 'tableHeader', alignment: 'right' as Alignment },
                { text: 'Total', style: 'tableHeader', alignment: 'right' as Alignment },
              ],
              ...invoice.items.map((item) => [
                { text: item.description },
                { text: item.quantity.toString(), alignment: 'right' as Alignment },
                { text: this.formatAmount(item.unitPrice, invoice.currency), alignment: 'right' as Alignment },
                { text: `${item.vatRate}%`, alignment: 'right' as Alignment },
                { text: this.formatAmount(item.total, invoice.currency), alignment: 'right' as Alignment },
              ]),
            ],
          },
          margin: [0, 0, 0, 20],
        },
        // Totals
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 200,
              table: {
                widths: ['*', 100],
                body: [
                  [
                    { text: 'Subtotal (fără TVA):', alignment: 'right' as Alignment },
                    { text: this.formatAmount(invoice.totals.netAmount, invoice.currency), alignment: 'right' as Alignment },
                  ],
                  [
                    { text: 'TVA:', alignment: 'right' as Alignment },
                    { text: this.formatAmount(invoice.totals.vatAmount, invoice.currency), alignment: 'right' as Alignment },
                  ],
                  [
                    { text: 'TOTAL:', style: 'totalLabel', alignment: 'right' as Alignment },
                    { text: this.formatAmount(invoice.totals.grossAmount, invoice.currency), style: 'totalAmount', alignment: 'right' as Alignment },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
          margin: [0, 10, 0, 30],
        },
        // Footer
        {
          text: 'Factură generată electronic prin DocumentIulia.ro - Conformă cu Legea 141/2025',
          style: 'footer',
          margin: [0, 30, 0, 0],
        },
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#1e40af',
        },
        invoiceNumber: {
          fontSize: 16,
          bold: true,
          color: '#374151',
        },
        date: {
          fontSize: 10,
          color: '#6b7280',
        },
        sectionTitle: {
          fontSize: 10,
          bold: true,
          color: '#6b7280',
          margin: [0, 0, 0, 5],
        },
        companyName: {
          fontSize: 12,
          bold: true,
          color: '#111827',
          margin: [0, 0, 0, 3],
        },
        companyDetail: {
          fontSize: 10,
          color: '#4b5563',
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          color: '#374151',
          fillColor: '#f3f4f6',
        },
        totalLabel: {
          fontSize: 12,
          bold: true,
        },
        totalAmount: {
          fontSize: 14,
          bold: true,
          color: '#1e40af',
        },
        footer: {
          fontSize: 8,
          color: '#9ca3af',
          alignment: 'center',
        },
      },
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 10,
      },
    };

    return new Promise<Buffer>((resolve, reject) => {
      const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];

      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatAmount(amount: number, currency: string): string {
    return `${Number(amount).toLocaleString('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  }
}
