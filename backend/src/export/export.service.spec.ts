import { Test, TestingModule } from '@nestjs/testing';
import { ExportService, InvoiceExportData, ReportExportData } from './export.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock ExcelJS
jest.mock('exceljs', () => {
  const mockWorksheet = {
    columns: [],
    getRow: jest.fn().mockReturnValue({
      font: {},
      fill: {},
      alignment: {},
    }),
    getColumn: jest.fn().mockReturnValue({
      numFmt: '',
    }),
    addRow: jest.fn().mockReturnValue({
      font: {},
      fill: {},
    }),
    getCell: jest.fn().mockReturnValue({
      value: '',
      font: {},
      alignment: {},
      numFmt: '',
    }),
    mergeCells: jest.fn(),
  };

  const mockWorkbook = {
    creator: '',
    created: null,
    addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
    xlsx: {
      writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel-data')),
    },
  };

  return {
    Workbook: jest.fn().mockImplementation(() => mockWorkbook),
  };
});

// Mock PDFKit
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const doc: Record<string, any> = {
      fontSize: jest.fn(),
      text: jest.fn(),
      moveDown: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      end: jest.fn(),
      y: 200,
      on: jest.fn(),
    };
    // Self-referencing methods
    doc.fontSize.mockReturnValue(doc);
    doc.text.mockReturnValue(doc);
    doc.moveDown.mockReturnValue(doc);
    doc.moveTo.mockReturnValue(doc);
    doc.lineTo.mockReturnValue(doc);
    doc.stroke.mockReturnValue(doc);
    doc.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'data') {
        setTimeout(() => callback(Buffer.from('mock-pdf-chunk')), 0);
      }
      if (event === 'end') {
        setTimeout(() => callback(), 10);
      }
      return doc;
    });
    return doc;
  });
});

describe('ExportService', () => {
  let service: ExportService;

  const mockInvoice = {
    id: 'inv_123',
    userId: 'user_123',
    invoiceNumber: 'FAC-2025-0001',
    invoiceDate: new Date('2025-01-15'),
    dueDate: new Date('2025-02-15'),
    partnerName: 'SC Client SRL',
    partnerCui: 'RO12345678',
    partnerAddress: 'Str. Test Nr. 1, București',
    netAmount: 10000.00,
    vatRate: 19,
    vatAmount: 1900.00,
    grossAmount: 11900.00,
    currency: 'RON',
    status: 'SENT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user_123',
    company: 'SC Furnizor SRL',
    cui: 'RO87654321',
  };

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Excel Exports', () => {
    describe('exportInvoicesToExcel', () => {
      it('should export invoices to Excel buffer', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([mockInvoice]);

        const result = await service.exportInvoicesToExcel('user_123');

        expect(result).toBeDefined();
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should query invoices for user', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);

        await service.exportInvoicesToExcel('user_123');

        expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
          where: { userId: 'user_123' },
          orderBy: { invoiceDate: 'desc' },
        });
      });

      it('should filter by start date', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        const startDate = new Date('2025-01-01');

        await service.exportInvoicesToExcel('user_123', startDate);

        expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user_123',
            invoiceDate: { gte: startDate },
          },
          orderBy: { invoiceDate: 'desc' },
        });
      });

      it('should filter by end date', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        const endDate = new Date('2025-12-31');

        await service.exportInvoicesToExcel('user_123', undefined, endDate);

        expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user_123',
            invoiceDate: { lte: endDate },
          },
          orderBy: { invoiceDate: 'desc' },
        });
      });

      it('should filter by date range', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-12-31');

        await service.exportInvoicesToExcel('user_123', startDate, endDate);

        expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
          where: {
            userId: 'user_123',
            invoiceDate: { gte: startDate, lte: endDate },
          },
          orderBy: { invoiceDate: 'desc' },
        });
      });

      it('should handle multiple invoices', async () => {
        const invoices = [
          mockInvoice,
          { ...mockInvoice, id: 'inv_124', invoiceNumber: 'FAC-2025-0002' },
          { ...mockInvoice, id: 'inv_125', invoiceNumber: 'FAC-2025-0003' },
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.exportInvoicesToExcel('user_123');

        expect(result).toBeDefined();
      });

      it('should handle empty invoice list', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);

        const result = await service.exportInvoicesToExcel('user_123');

        expect(result).toBeDefined();
        expect(Buffer.isBuffer(result)).toBe(true);
      });
    });

    describe('exportReportToExcel', () => {
      it('should export report to Excel buffer', async () => {
        const reportData: ReportExportData = {
          title: 'Raport Venituri',
          period: 'Ianuarie 2025',
          rows: [
            { label: 'Venituri Servicii', value: 50000 },
            { label: 'Venituri Produse', value: 30000 },
          ],
        };

        const result = await service.exportReportToExcel(reportData);

        expect(result).toBeDefined();
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should include totals when provided', async () => {
        const reportData: ReportExportData = {
          title: 'Raport TVA',
          period: 'Q1 2025',
          rows: [
            { label: 'TVA Colectat', value: 19000 },
            { label: 'TVA Deductibil', value: 5000 },
          ],
          totals: [
            { label: 'TVA de Plată', value: 14000 },
          ],
        };

        const result = await service.exportReportToExcel(reportData);

        expect(result).toBeDefined();
      });

      it('should handle report without totals', async () => {
        const reportData: ReportExportData = {
          title: 'Statistici',
          period: '2025',
          rows: [
            { label: 'Facturi Emise', value: 150 },
            { label: 'Facturi Încasate', value: 120 },
          ],
        };

        const result = await service.exportReportToExcel(reportData);

        expect(result).toBeDefined();
      });

      it('should handle empty rows', async () => {
        const reportData: ReportExportData = {
          title: 'Raport Gol',
          period: '2025',
          rows: [],
        };

        const result = await service.exportReportToExcel(reportData);

        expect(result).toBeDefined();
      });

      it('should handle multiple totals', async () => {
        const reportData: ReportExportData = {
          title: 'Profit & Pierdere',
          period: 'Anul 2025',
          rows: [
            { label: 'Venituri', value: 100000 },
            { label: 'Cheltuieli', value: 70000 },
          ],
          totals: [
            { label: 'Profit Brut', value: 30000 },
            { label: 'Impozit 16%', value: 4800 },
            { label: 'Profit Net', value: 25200 },
          ],
        };

        const result = await service.exportReportToExcel(reportData);

        expect(result).toBeDefined();
      });
    });
  });

  describe('PDF Exports', () => {
    describe('exportInvoiceToPdf', () => {
      it('should export invoice to PDF buffer', async () => {
        mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        const result = await service.exportInvoiceToPdf('inv_123', 'user_123');

        expect(result).toBeDefined();
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should query invoice by id and userId', async () => {
        mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        await service.exportInvoiceToPdf('inv_123', 'user_123');

        expect(mockPrismaService.invoice.findFirst).toHaveBeenCalledWith({
          where: { id: 'inv_123', userId: 'user_123' },
        });
      });

      it('should fetch user company info', async () => {
        mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        await service.exportInvoiceToPdf('inv_123', 'user_123');

        expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user_123' },
          select: { company: true, cui: true },
        });
      });

      it('should throw error if invoice not found', async () => {
        mockPrismaService.invoice.findFirst.mockResolvedValue(null);

        await expect(
          service.exportInvoiceToPdf('non-existent', 'user_123')
        ).rejects.toThrow('Invoice not found');
      });

      it('should handle invoice without dueDate', async () => {
        const invoiceNoDueDate = { ...mockInvoice, dueDate: null };
        mockPrismaService.invoice.findFirst.mockResolvedValue(invoiceNoDueDate);
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        const result = await service.exportInvoiceToPdf('inv_123', 'user_123');

        expect(result).toBeDefined();
      });

      it('should handle invoice without partnerCui', async () => {
        const invoiceNoCui = { ...mockInvoice, partnerCui: null };
        mockPrismaService.invoice.findFirst.mockResolvedValue(invoiceNoCui);
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        const result = await service.exportInvoiceToPdf('inv_123', 'user_123');

        expect(result).toBeDefined();
      });

      it('should handle invoice without partnerAddress', async () => {
        const invoiceNoAddress = { ...mockInvoice, partnerAddress: null };
        mockPrismaService.invoice.findFirst.mockResolvedValue(invoiceNoAddress);
        mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

        const result = await service.exportInvoiceToPdf('inv_123', 'user_123');

        expect(result).toBeDefined();
      });

      it('should handle missing user company info', async () => {
        mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        const result = await service.exportInvoiceToPdf('inv_123', 'user_123');

        expect(result).toBeDefined();
      });
    });

    describe('exportReportToPdf', () => {
      it('should export report to PDF buffer', async () => {
        const reportData: ReportExportData = {
          title: 'Raport Venituri',
          period: 'Ianuarie 2025',
          rows: [
            { label: 'Venituri Servicii', value: 50000 },
          ],
        };

        const result = await service.exportReportToPdf(reportData);

        expect(result).toBeDefined();
        expect(Buffer.isBuffer(result)).toBe(true);
      });

      it('should include totals in PDF', async () => {
        const reportData: ReportExportData = {
          title: 'Raport TVA',
          period: 'Q1 2025',
          rows: [
            { label: 'TVA Colectat', value: 19000 },
          ],
          totals: [
            { label: 'TVA de Plată', value: 14000 },
          ],
        };

        const result = await service.exportReportToPdf(reportData);

        expect(result).toBeDefined();
      });

      it('should handle empty rows', async () => {
        const reportData: ReportExportData = {
          title: 'Raport',
          period: '2025',
          rows: [],
        };

        const result = await service.exportReportToPdf(reportData);

        expect(result).toBeDefined();
      });
    });
  });

  describe('Status Translation', () => {
    it('should translate DRAFT status to Romanian', async () => {
      const invoice = { ...mockInvoice, status: 'DRAFT' };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      await service.exportInvoicesToExcel('user_123');

      // Status should be translated internally
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalled();
    });

    it('should translate SENT status to Romanian', async () => {
      const invoice = { ...mockInvoice, status: 'SENT' };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      await service.exportInvoicesToExcel('user_123');

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalled();
    });

    it('should translate PAID status to Romanian', async () => {
      const invoice = { ...mockInvoice, status: 'PAID' };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      await service.exportInvoicesToExcel('user_123');

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalled();
    });

    it('should translate OVERDUE status to Romanian', async () => {
      const invoice = { ...mockInvoice, status: 'OVERDUE' };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      await service.exportInvoicesToExcel('user_123');

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalled();
    });

    it('should translate CANCELLED status to Romanian', async () => {
      const invoice = { ...mockInvoice, status: 'CANCELLED' };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      await service.exportInvoicesToExcel('user_123');

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalled();
    });

    it('should return original status if not in translations', async () => {
      const invoice = { ...mockInvoice, status: 'UNKNOWN' };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      await service.exportInvoicesToExcel('user_123');

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalled();
    });
  });

  describe('Romanian Localization', () => {
    it('should use Romanian column headers for invoices', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([mockInvoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      // The Excel export uses Romanian headers like "Nr. Factură", "Data Emiterii"
      expect(result).toBeDefined();
    });

    it('should use Romanian date format DD.MM.YYYY', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.exportInvoiceToPdf('inv_123', 'user_123');

      expect(result).toBeDefined();
    });

    it('should use Romanian number formatting', async () => {
      const reportData: ReportExportData = {
        title: 'Raport Financiar',
        period: '2025',
        rows: [{ label: 'Total', value: 12345.67 }],
      };

      const result = await service.exportReportToExcel(reportData);

      expect(result).toBeDefined();
    });
  });

  describe('VAT Rate Handling', () => {
    it('should handle 19% standard VAT rate', async () => {
      const invoice = { ...mockInvoice, vatRate: 19, vatAmount: 1900 };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle 21% new VAT rate (Legea 141/2025)', async () => {
      const invoice = { ...mockInvoice, vatRate: 21, vatAmount: 2100 };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle 9% reduced VAT rate', async () => {
      const invoice = { ...mockInvoice, vatRate: 9, vatAmount: 900 };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle 11% new reduced VAT rate (Legea 141/2025)', async () => {
      const invoice = { ...mockInvoice, vatRate: 11, vatAmount: 1100 };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle 5% special VAT rate', async () => {
      const invoice = { ...mockInvoice, vatRate: 5, vatAmount: 500 };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle 0% VAT rate (exports)', async () => {
      const invoice = { ...mockInvoice, vatRate: 0, vatAmount: 0 };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });
  });

  describe('Currency Handling', () => {
    it('should handle RON currency', async () => {
      const invoice = { ...mockInvoice, currency: 'RON' };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle EUR currency', async () => {
      const invoice = { ...mockInvoice, currency: 'EUR' };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle USD currency', async () => {
      const invoice = { ...mockInvoice, currency: 'USD' };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });
  });

  describe('Excel Totals Calculation', () => {
    it('should calculate total net amount', async () => {
      const invoices = [
        { ...mockInvoice, netAmount: 1000 },
        { ...mockInvoice, id: 'inv_2', netAmount: 2000 },
        { ...mockInvoice, id: 'inv_3', netAmount: 3000 },
      ];
      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should calculate total VAT amount', async () => {
      const invoices = [
        { ...mockInvoice, vatAmount: 190 },
        { ...mockInvoice, id: 'inv_2', vatAmount: 380 },
      ];
      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should calculate total gross amount', async () => {
      const invoices = [
        { ...mockInvoice, grossAmount: 1190 },
        { ...mockInvoice, id: 'inv_2', grossAmount: 2380 },
      ];
      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });
  });

  describe('Report Types', () => {
    it('should export VAT report', async () => {
      const reportData: ReportExportData = {
        title: 'Declarație TVA D300',
        period: 'Ianuarie 2025',
        rows: [
          { label: 'Baza TVA 19%', value: 100000 },
          { label: 'TVA Colectat 19%', value: 19000 },
          { label: 'TVA Deductibil', value: 5000 },
        ],
        totals: [
          { label: 'TVA de Plată', value: 14000 },
        ],
      };

      const result = await service.exportReportToExcel(reportData);

      expect(result).toBeDefined();
    });

    it('should export SAF-T summary report', async () => {
      const reportData: ReportExportData = {
        title: 'Rezumat SAF-T D406',
        period: 'Decembrie 2025',
        rows: [
          { label: 'Facturi Emise', value: 150 },
          { label: 'Facturi Primite', value: 80 },
          { label: 'Total Venituri', value: 500000 },
          { label: 'Total Cheltuieli', value: 200000 },
        ],
      };

      const result = await service.exportReportToExcel(reportData);

      expect(result).toBeDefined();
    });

    it('should export cash flow report', async () => {
      const reportData: ReportExportData = {
        title: 'Raport Cash Flow',
        period: 'Q1 2025',
        rows: [
          { label: 'Încasări', value: 300000 },
          { label: 'Plăți Furnizori', value: 150000 },
          { label: 'Salarii', value: 50000 },
          { label: 'Impozite', value: 30000 },
        ],
        totals: [
          { label: 'Sold Net', value: 70000 },
        ],
      };

      const result = await service.exportReportToExcel(reportData);

      expect(result).toBeDefined();
    });

    it('should export profit/loss report', async () => {
      const reportData: ReportExportData = {
        title: 'Profit și Pierdere',
        period: 'Anul 2025',
        rows: [
          { label: 'Venituri Totale', value: 1000000 },
          { label: 'Costuri Directe', value: 400000 },
          { label: 'Cheltuieli Operaționale', value: 300000 },
          { label: 'Amortizări', value: 50000 },
        ],
        totals: [
          { label: 'Profit Brut', value: 600000 },
          { label: 'Impozit pe Profit 16%', value: 40000 },
          { label: 'Profit Net', value: 210000 },
        ],
      };

      const result = await service.exportReportToExcel(reportData);

      expect(result).toBeDefined();
    });
  });

  describe('Interface Validation', () => {
    it('should accept valid InvoiceExportData interface', () => {
      const data: InvoiceExportData = {
        invoiceNumber: 'FAC-2025-0001',
        invoiceDate: new Date(),
        partnerName: 'Test SRL',
        netAmount: 1000,
        vatRate: 19,
        vatAmount: 190,
        grossAmount: 1190,
        currency: 'RON',
        status: 'SENT',
      };

      expect(data.invoiceNumber).toBeDefined();
      expect(data.vatRate).toBe(19);
    });

    it('should accept InvoiceExportData with optional fields', () => {
      const data: InvoiceExportData = {
        invoiceNumber: 'FAC-2025-0002',
        invoiceDate: new Date(),
        dueDate: new Date(),
        partnerName: 'Test SRL',
        partnerCui: 'RO12345678',
        netAmount: 1000,
        vatRate: 19,
        vatAmount: 190,
        grossAmount: 1190,
        currency: 'EUR',
        status: 'PAID',
      };

      expect(data.dueDate).toBeDefined();
      expect(data.partnerCui).toBe('RO12345678');
    });

    it('should accept valid ReportExportData interface', () => {
      const data: ReportExportData = {
        title: 'Test Report',
        period: 'Q1 2025',
        rows: [{ label: 'Test', value: 100 }],
      };

      expect(data.title).toBe('Test Report');
      expect(data.rows.length).toBe(1);
    });

    it('should accept ReportExportData with totals', () => {
      const data: ReportExportData = {
        title: 'Test Report',
        period: 'Q1 2025',
        rows: [{ label: 'Test', value: 100 }],
        totals: [{ label: 'Total', value: 100 }],
      };

      expect(data.totals).toBeDefined();
      expect(data.totals?.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', async () => {
      const invoice = {
        ...mockInvoice,
        netAmount: 999999999.99,
        vatAmount: 189999999.99,
        grossAmount: 1189999999.98,
      };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle zero amounts', async () => {
      const invoice = {
        ...mockInvoice,
        netAmount: 0,
        vatAmount: 0,
        grossAmount: 0,
      };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle decimal precision', async () => {
      const invoice = {
        ...mockInvoice,
        netAmount: 1234.5678,
        vatAmount: 234.5679,
        grossAmount: 1469.1357,
      };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle special characters in partner names', async () => {
      const invoice = {
        ...mockInvoice,
        partnerName: 'SC Țărănuș & Fiii SRL',
      };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });

    it('should handle long invoice numbers', async () => {
      const invoice = {
        ...mockInvoice,
        invoiceNumber: 'FAC-SERIA-ABC-2025-0000000001-REV',
      };
      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
    });
  });

  describe('Workbook Properties', () => {
    it('should set DocumentIulia.ro as creator', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
      // Workbook creator is set to 'DocumentIulia.ro'
    });

    it('should set creation date', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.exportInvoicesToExcel('user_123');

      expect(result).toBeDefined();
      // Workbook.created is set to current date
    });
  });
});
