import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    sAFTReport: {
      findFirst: jest.fn(),
    },
    vATReport: {
      findFirst: jest.fn(),
    },
    document: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    partner: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  // Helper to create mock invoices
  const createMockInvoice = (overrides: any = {}) => ({
    id: 'inv-001',
    userId: 'user-001',
    invoiceNumber: 'FV-2025-001',
    invoiceDate: new Date(),
    grossAmount: 1190,
    vatAmount: 190,
    type: 'ISSUED',
    status: 'APPROVED',
    partnerName: 'Client Test SRL',
    createdAt: new Date(),
    updatedAt: new Date(),
    efacturaStatus: null,
    ...overrides,
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getSummary', () => {
    const userId = 'user-001';

    beforeEach(() => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.sAFTReport.findFirst.mockResolvedValue(null);
      mockPrismaService.vATReport.findFirst.mockResolvedValue(null);
      mockPrismaService.document.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.groupBy.mockResolvedValue([]);
    });

    it('should return dashboard summary', async () => {
      const result = await service.getSummary(userId);

      expect(result).toBeDefined();
      expect(result.cashFlow).toBeInstanceOf(Array);
      expect(result.vatSummary).toBeInstanceOf(Array);
      expect(result.complianceStatus).toBeInstanceOf(Array);
      expect(result.recentActivity).toBeInstanceOf(Array);
    });

    describe('Cash Flow Calculation', () => {
      it('should calculate income from ISSUED invoices', async () => {
        const invoices = [
          createMockInvoice({
            invoiceDate: new Date(),
            grossAmount: 1000,
            type: 'ISSUED',
          }),
          createMockInvoice({
            invoiceDate: new Date(),
            grossAmount: 500,
            type: 'ISSUED',
          }),
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.getSummary(userId);

        expect(result.totalIncome).toBe(1500);
      });

      it('should calculate expenses from RECEIVED invoices', async () => {
        const invoices = [
          createMockInvoice({
            invoiceDate: new Date(),
            grossAmount: 800,
            type: 'RECEIVED',
          }),
          createMockInvoice({
            invoiceDate: new Date(),
            grossAmount: 200,
            type: 'RECEIVED',
          }),
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.getSummary(userId);

        expect(result.totalExpenses).toBe(1000);
      });

      it('should return 6 months of cash flow data', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);

        const result = await service.getSummary(userId);

        expect(result.cashFlow).toHaveLength(6);
        result.cashFlow.forEach((item) => {
          expect(item).toHaveProperty('month');
          expect(item).toHaveProperty('income');
          expect(item).toHaveProperty('expenses');
        });
      });

      it('should group invoices by month correctly', async () => {
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 15);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

        const invoices = [
          createMockInvoice({
            invoiceDate: currentMonth,
            grossAmount: 1000,
            type: 'ISSUED',
          }),
          createMockInvoice({
            invoiceDate: lastMonth,
            grossAmount: 500,
            type: 'ISSUED',
          }),
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.getSummary(userId);

        // Current month should have the 1000 income
        const currentMonthData = result.cashFlow[result.cashFlow.length - 1];
        expect(currentMonthData.income).toBe(1000);
      });

      it('should use Romanian month names', async () => {
        const result = await service.getSummary(userId);

        const validMonths = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        result.cashFlow.forEach((item) => {
          expect(validMonths).toContain(item.month);
        });
      });
    });

    describe('VAT Calculation', () => {
      it('should calculate VAT collected from ISSUED invoices', async () => {
        const invoices = [
          createMockInvoice({
            vatAmount: 190,
            type: 'ISSUED',
          }),
          createMockInvoice({
            vatAmount: 90,
            type: 'ISSUED',
          }),
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.getSummary(userId);

        expect(result.vatCollected).toBe(280);
      });

      it('should calculate VAT deductible from RECEIVED invoices', async () => {
        const invoices = [
          createMockInvoice({
            vatAmount: 100,
            type: 'RECEIVED',
          }),
          createMockInvoice({
            vatAmount: 50,
            type: 'RECEIVED',
          }),
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.getSummary(userId);

        expect(result.vatDeductible).toBe(150);
      });

      it('should calculate VAT payable as positive difference', async () => {
        const invoices = [
          createMockInvoice({
            vatAmount: 500,
            type: 'ISSUED',
          }),
          createMockInvoice({
            vatAmount: 200,
            type: 'RECEIVED',
          }),
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.getSummary(userId);

        expect(result.vatPayable).toBe(300); // 500 - 200
      });

      it('should return 0 for VAT payable when deductible exceeds collected', async () => {
        const invoices = [
          createMockInvoice({
            vatAmount: 100,
            type: 'ISSUED',
          }),
          createMockInvoice({
            vatAmount: 300,
            type: 'RECEIVED',
          }),
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.getSummary(userId);

        expect(result.vatPayable).toBe(0);
      });

      it('should return VAT summary with correct colors', async () => {
        const result = await service.getSummary(userId);

        expect(result.vatSummary).toEqual([
          expect.objectContaining({ name: 'TVA Colectat', color: '#3b82f6' }),
          expect.objectContaining({ name: 'TVA Deductibil', color: '#22c55e' }),
          expect.objectContaining({ name: 'TVA de Plată', color: '#f59e0b' }),
        ]);
      });
    });

    describe('Invoice Counts', () => {
      it('should count total invoices', async () => {
        const invoices = [
          createMockInvoice({ status: 'APPROVED' }),
          createMockInvoice({ status: 'PENDING' }),
          createMockInvoice({ status: 'DRAFT' }),
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.getSummary(userId);

        expect(result.invoiceCount).toBe(3);
      });

      it('should count pending invoices (PENDING and DRAFT)', async () => {
        const invoices = [
          createMockInvoice({ status: 'APPROVED' }),
          createMockInvoice({ status: 'PENDING' }),
          createMockInvoice({ status: 'DRAFT' }),
          createMockInvoice({ status: 'SUBMITTED' }),
        ];
        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

        const result = await service.getSummary(userId);

        expect(result.pendingInvoices).toBe(2); // PENDING + DRAFT
      });
    });

    describe('Compliance Status', () => {
      it('should return SAF-T status as ok when submitted', async () => {
        mockPrismaService.sAFTReport.findFirst.mockResolvedValue({
          status: 'SUBMITTED',
          submittedAt: new Date(),
        });

        const result = await service.getSummary(userId);

        const saftStatus = result.complianceStatus.find((c) => c.name === 'SAF-T D406');
        expect(saftStatus?.status).toBe('ok');
      });

      it('should return SAF-T status as pending when not submitted', async () => {
        mockPrismaService.sAFTReport.findFirst.mockResolvedValue(null);

        const result = await service.getSummary(userId);

        const saftStatus = result.complianceStatus.find((c) => c.name === 'SAF-T D406');
        expect(saftStatus?.status).toBe('pending');
      });

      it('should return e-Factura status as ok when accepted', async () => {
        mockPrismaService.invoice.findFirst.mockResolvedValue({
          efacturaStatus: 'ACCEPTED',
          updatedAt: new Date(),
        });

        const result = await service.getSummary(userId);

        const efacturaStatus = result.complianceStatus.find((c) => c.name === 'e-Factura SPV');
        expect(efacturaStatus?.status).toBe('ok');
      });

      it('should return e-Factura status as error when rejected', async () => {
        mockPrismaService.invoice.findFirst.mockResolvedValue({
          efacturaStatus: 'REJECTED',
          updatedAt: new Date(),
        });

        const result = await service.getSummary(userId);

        const efacturaStatus = result.complianceStatus.find((c) => c.name === 'e-Factura SPV');
        expect(efacturaStatus?.status).toBe('error');
      });

      it('should return VAT declaration status as ok when submitted', async () => {
        mockPrismaService.vATReport.findFirst.mockResolvedValue({
          status: 'SUBMITTED',
          submittedAt: new Date(),
        });

        const result = await service.getSummary(userId);

        const vatStatus = result.complianceStatus.find((c) => c.name === 'Declarație TVA');
        expect(vatStatus?.status).toBe('ok');
      });
    });

    describe('Recent Activity', () => {
      it('should include recent invoices in activity', async () => {
        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce([]) // For main query
          .mockResolvedValueOnce([
            createMockInvoice({
              id: 'inv-001',
              invoiceNumber: 'FV-001',
              partnerName: 'Client A',
              grossAmount: 1000,
              type: 'ISSUED',
              status: 'APPROVED',
              createdAt: new Date(),
            }),
          ]);

        const result = await service.getSummary(userId);

        expect(result.recentActivity).toContainEqual(
          expect.objectContaining({
            type: 'invoice',
            title: expect.stringContaining('FV-001'),
          }),
        );
      });

      it('should include recent documents in activity', async () => {
        mockPrismaService.document.findMany.mockResolvedValue([
          {
            id: 'doc-001',
            filename: 'factura.pdf',
            status: 'PROCESSED',
            createdAt: new Date(),
          },
        ]);

        const result = await service.getSummary(userId);

        expect(result.recentActivity).toContainEqual(
          expect.objectContaining({
            type: 'document',
            description: 'factura.pdf',
          }),
        );
      });

      it('should include recent payments in activity', async () => {
        mockPrismaService.payment.findMany.mockResolvedValue([
          {
            id: 'pay-001',
            amount: 500,
            paymentDate: new Date(),
            invoice: {
              invoiceNumber: 'FV-001',
              partnerName: 'Client B',
            },
          },
        ]);

        const result = await service.getSummary(userId);

        expect(result.recentActivity).toContainEqual(
          expect.objectContaining({
            type: 'payment',
            title: 'Plată înregistrată',
          }),
        );
      });

      it('should sort activities by timestamp descending', async () => {
        const oldDate = new Date('2025-01-01');
        const newDate = new Date('2025-01-15');

        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            createMockInvoice({ createdAt: oldDate }),
          ]);

        mockPrismaService.document.findMany.mockResolvedValue([
          { id: 'doc', filename: 'new.pdf', createdAt: newDate, status: 'OK' },
        ]);

        const result = await service.getSummary(userId);

        if (result.recentActivity.length >= 2) {
          const timestamps = result.recentActivity.map((a) => new Date(a.timestamp).getTime());
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
          }
        }
      });

      it('should limit to 10 activities', async () => {
        // Create many invoices
        const manyInvoices = Array.from({ length: 15 }, (_, i) =>
          createMockInvoice({
            id: `inv-${i}`,
            invoiceNumber: `FV-${i}`,
            createdAt: new Date(Date.now() - i * 1000),
          }),
        );

        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce(manyInvoices.slice(0, 5));

        mockPrismaService.document.findMany.mockResolvedValue(
          Array.from({ length: 5 }, (_, i) => ({
            id: `doc-${i}`,
            filename: `doc${i}.pdf`,
            status: 'OK',
            createdAt: new Date(Date.now() - i * 1000),
          })),
        );

        mockPrismaService.payment.findMany.mockResolvedValue(
          Array.from({ length: 5 }, (_, i) => ({
            id: `pay-${i}`,
            amount: 100 * i,
            paymentDate: new Date(Date.now() - i * 1000),
            invoice: { invoiceNumber: `FV-${i}`, partnerName: 'Client' },
          })),
        );

        const result = await service.getSummary(userId);

        expect(result.recentActivity.length).toBeLessThanOrEqual(10);
      });
    });

    describe('Invoice Status Breakdown', () => {
      it('should return invoice counts by status', async () => {
        mockPrismaService.invoice.groupBy.mockResolvedValue([
          { status: 'DRAFT', _count: { status: 5 } },
          { status: 'PENDING', _count: { status: 3 } },
          { status: 'APPROVED', _count: { status: 10 } },
        ]);

        const result = await service.getSummary(userId);

        expect(result.invoiceStatusBreakdown).toContainEqual(
          expect.objectContaining({ status: 'DRAFT', count: 5 }),
        );
        expect(result.invoiceStatusBreakdown).toContainEqual(
          expect.objectContaining({ status: 'PENDING', count: 3 }),
        );
        expect(result.invoiceStatusBreakdown).toContainEqual(
          expect.objectContaining({ status: 'APPROVED', count: 10 }),
        );
      });

      it('should include colors for each status', async () => {
        mockPrismaService.invoice.groupBy.mockResolvedValue([
          { status: 'DRAFT', _count: { status: 1 } },
          { status: 'SUBMITTED', _count: { status: 1 } },
        ]);

        const result = await service.getSummary(userId);

        result.invoiceStatusBreakdown.forEach((item) => {
          expect(item.color).toMatch(/^#[0-9a-f]{6}$/i);
        });
      });
    });
  });

  describe('getQuickStats', () => {
    const userId = 'user-001';

    beforeEach(() => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);
      mockPrismaService.partner.findMany.mockResolvedValue([]);
      mockPrismaService.sAFTReport.findFirst.mockResolvedValue(null);
      mockPrismaService.vATReport.findFirst.mockResolvedValue(null);
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);
    });

    it('should return quick stats structure', async () => {
      const result = await service.getQuickStats(userId);

      expect(result).toMatchObject({
        revenue: expect.objectContaining({ current: expect.any(Number), previous: expect.any(Number), change: expect.any(Number) }),
        expenses: expect.objectContaining({ current: expect.any(Number), previous: expect.any(Number), change: expect.any(Number) }),
        profit: expect.objectContaining({ current: expect.any(Number), previous: expect.any(Number), change: expect.any(Number) }),
        invoices: expect.objectContaining({ total: expect.any(Number), pending: expect.any(Number), overdue: expect.any(Number) }),
        partners: expect.objectContaining({ total: expect.any(Number), active: expect.any(Number) }),
        vatPayable: expect.any(Number),
        cashBalance: expect.any(Number),
        compliance: expect.any(Object),
      });
    });

    describe('Revenue Calculation', () => {
      it('should calculate current month revenue', async () => {
        const currentMonthInvoices = [
          createMockInvoice({ grossAmount: 1000, type: 'ISSUED' }),
          createMockInvoice({ grossAmount: 500, type: 'ISSUED' }),
        ];
        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(currentMonthInvoices)
          .mockResolvedValueOnce([]);

        const result = await service.getQuickStats(userId);

        expect(result.revenue.current).toBe(1500);
      });

      it('should calculate previous month revenue', async () => {
        const previousMonthInvoices = [
          createMockInvoice({ grossAmount: 2000, type: 'ISSUED' }),
        ];
        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce(previousMonthInvoices);

        const result = await service.getQuickStats(userId);

        expect(result.revenue.previous).toBe(2000);
      });

      it('should calculate revenue change percentage', async () => {
        const current = [createMockInvoice({ grossAmount: 1500, type: 'ISSUED' })];
        const previous = [createMockInvoice({ grossAmount: 1000, type: 'ISSUED' })];

        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(current)
          .mockResolvedValueOnce(previous);

        const result = await service.getQuickStats(userId);

        expect(result.revenue.change).toBe(50); // 50% increase
      });

      it('should return 0 change when previous revenue is 0', async () => {
        const current = [createMockInvoice({ grossAmount: 1000, type: 'ISSUED' })];

        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(current)
          .mockResolvedValueOnce([]);

        const result = await service.getQuickStats(userId);

        expect(result.revenue.change).toBe(0);
      });
    });

    describe('Expenses Calculation', () => {
      it('should calculate current month expenses', async () => {
        const invoices = [
          createMockInvoice({ grossAmount: 600, type: 'RECEIVED' }),
          createMockInvoice({ grossAmount: 400, type: 'RECEIVED' }),
        ];
        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(invoices)
          .mockResolvedValueOnce([]);

        const result = await service.getQuickStats(userId);

        expect(result.expenses.current).toBe(1000);
      });
    });

    describe('Profit Calculation', () => {
      it('should calculate profit as revenue minus expenses', async () => {
        const current = [
          createMockInvoice({ grossAmount: 1500, type: 'ISSUED' }),
          createMockInvoice({ grossAmount: 500, type: 'RECEIVED' }),
        ];

        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(current)
          .mockResolvedValueOnce([]);

        const result = await service.getQuickStats(userId);

        expect(result.profit.current).toBe(1000); // 1500 - 500
      });

      it('should handle negative profit', async () => {
        const current = [
          createMockInvoice({ grossAmount: 500, type: 'ISSUED' }),
          createMockInvoice({ grossAmount: 1000, type: 'RECEIVED' }),
        ];

        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(current)
          .mockResolvedValueOnce([]);

        const result = await service.getQuickStats(userId);

        expect(result.profit.current).toBe(-500);
      });
    });

    describe('Invoice Metrics', () => {
      it('should return total current month invoices', async () => {
        const invoices = [
          createMockInvoice({ status: 'APPROVED' }),
          createMockInvoice({ status: 'SUBMITTED' }),
          createMockInvoice({ status: 'DRAFT' }),
        ];
        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(invoices)
          .mockResolvedValueOnce([]);

        const result = await service.getQuickStats(userId);

        expect(result.invoices.total).toBe(3);
      });

      it('should return pending invoice count', async () => {
        mockPrismaService.invoice.count.mockResolvedValueOnce(5);

        const result = await service.getQuickStats(userId);

        expect(result.invoices.pending).toBe(5);
      });

      it('should return overdue invoice count', async () => {
        mockPrismaService.invoice.count
          .mockResolvedValueOnce(3) // pending
          .mockResolvedValueOnce(2); // overdue

        const result = await service.getQuickStats(userId);

        expect(result.invoices.overdue).toBe(2);
      });
    });

    describe('Partner Metrics', () => {
      it('should count total partners', async () => {
        mockPrismaService.partner.findMany.mockResolvedValue([
          { id: 'p1', createdAt: new Date() },
          { id: 'p2', createdAt: new Date() },
          { id: 'p3', createdAt: new Date() },
        ]);

        const result = await service.getQuickStats(userId);

        expect(result.partners.total).toBe(3);
      });

      it('should count active partners (created within 90 days)', async () => {
        const recentDate = new Date();
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 100);

        mockPrismaService.partner.findMany.mockResolvedValue([
          { id: 'p1', createdAt: recentDate },
          { id: 'p2', createdAt: recentDate },
          { id: 'p3', createdAt: oldDate },
        ]);

        const result = await service.getQuickStats(userId);

        expect(result.partners.active).toBe(2);
      });
    });

    describe('VAT Calculation', () => {
      it('should calculate VAT payable', async () => {
        const invoices = [
          createMockInvoice({ vatAmount: 500, type: 'ISSUED' }),
          createMockInvoice({ vatAmount: 200, type: 'RECEIVED' }),
        ];
        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(invoices)
          .mockResolvedValueOnce([]);

        const result = await service.getQuickStats(userId);

        expect(result.vatPayable).toBe(300); // 500 - 200
      });

      it('should return 0 for negative VAT payable', async () => {
        const invoices = [
          createMockInvoice({ vatAmount: 100, type: 'ISSUED' }),
          createMockInvoice({ vatAmount: 300, type: 'RECEIVED' }),
        ];
        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(invoices)
          .mockResolvedValueOnce([]);

        const result = await service.getQuickStats(userId);

        expect(result.vatPayable).toBe(0);
      });
    });

    describe('Cash Balance', () => {
      it('should calculate cash balance as revenue minus expenses', async () => {
        const invoices = [
          createMockInvoice({ grossAmount: 2000, type: 'ISSUED' }),
          createMockInvoice({ grossAmount: 500, type: 'RECEIVED' }),
        ];
        mockPrismaService.invoice.findMany
          .mockResolvedValueOnce(invoices)
          .mockResolvedValueOnce([]);

        const result = await service.getQuickStats(userId);

        expect(result.cashBalance).toBe(1500); // 2000 - 500
      });
    });

    describe('Compliance Status', () => {
      it('should include SAF-T, e-Factura, and VAT status', async () => {
        const result = await service.getQuickStats(userId);

        expect(result.compliance).toMatchObject({
          saftStatus: expect.any(String),
          efacturaStatus: expect.any(String),
          vatStatus: expect.any(String),
        });
      });

      it('should return ok status for submitted reports', async () => {
        mockPrismaService.sAFTReport.findFirst.mockResolvedValue({
          status: 'SUBMITTED',
          submittedAt: new Date(),
        });
        mockPrismaService.vATReport.findFirst.mockResolvedValue({
          status: 'SUBMITTED',
          submittedAt: new Date(),
        });
        mockPrismaService.invoice.findFirst.mockResolvedValue({
          efacturaStatus: 'ACCEPTED',
          updatedAt: new Date(),
        });

        const result = await service.getQuickStats(userId);

        expect(result.compliance.saftStatus).toBe('ok');
        expect(result.compliance.vatStatus).toBe('ok');
        expect(result.compliance.efacturaStatus).toBe('ok');
      });
    });
  });

  describe('Edge Cases', () => {
    const userId = 'user-001';

    beforeEach(() => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.sAFTReport.findFirst.mockResolvedValue(null);
      mockPrismaService.vATReport.findFirst.mockResolvedValue(null);
      mockPrismaService.document.findMany.mockResolvedValue([]);
      mockPrismaService.payment.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.groupBy.mockResolvedValue([]);
    });

    it('should handle null grossAmount', async () => {
      const invoices = [
        createMockInvoice({ grossAmount: null, type: 'ISSUED' }),
      ];
      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.getSummary(userId);

      expect(result.totalIncome).toBe(0);
    });

    it('should handle null vatAmount', async () => {
      const invoices = [
        createMockInvoice({ vatAmount: null, type: 'ISSUED' }),
      ];
      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.getSummary(userId);

      expect(result.vatCollected).toBe(0);
    });

    it('should handle empty partner name', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          createMockInvoice({
            partnerName: null,
            grossAmount: 100,
          }),
        ]);

      const result = await service.getSummary(userId);

      const activity = result.recentActivity.find((a) => a.type === 'invoice');
      expect(activity?.description).toContain('Client');
    });

    it('should handle empty recent activity', async () => {
      const result = await service.getSummary(userId);

      expect(result.recentActivity).toEqual([]);
    });

    it('should round monetary values', async () => {
      const invoices = [
        createMockInvoice({ grossAmount: 100.567, vatAmount: 19.123, type: 'ISSUED' }),
      ];
      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.getSummary(userId);

      // Values should be rounded to integers
      expect(Number.isInteger(result.vatCollected)).toBe(true);
      expect(Number.isInteger(result.cashFlow[result.cashFlow.length - 1].income)).toBe(true);
    });
  });
});
