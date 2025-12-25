import { Test, TestingModule } from '@nestjs/testing';
import {
  ReconciliationService,
  ReconciliationResult,
  AgingReport,
} from './reconciliation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  // Helper functions
  const createMockInvoice = (overrides: any = {}) => ({
    id: 'inv-001',
    userId: 'user-001',
    invoiceNumber: 'FV-2025-001',
    invoiceDate: new Date('2025-01-15'),
    dueDate: new Date('2025-01-30'),
    partnerName: 'Client Test SRL',
    grossAmount: 1190,
    netAmount: 1000,
    paidAmount: 0,
    paymentStatus: 'UNPAID',
    type: 'ISSUED',
    ...overrides,
  });

  const createMockPayment = (overrides: any = {}) => ({
    id: 'pay-001',
    invoiceId: null,
    amount: 1190,
    paymentDate: new Date('2025-01-20'),
    reference: 'FV-2025-001',
    method: 'BANK_TRANSFER',
    invoice: null,
    ...overrides,
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('runReconciliation', () => {
    const userId = 'user-001';

    describe('Basic Reconciliation', () => {
      it('should run reconciliation for a user', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        mockPrismaService.payment.findMany.mockResolvedValue([]);

        const result = await service.runReconciliation(userId);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.summary).toBeDefined();
      });

      it('should use default date range (current month) when not provided', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        mockPrismaService.payment.findMany.mockResolvedValue([]);

        const result = await service.runReconciliation(userId);

        expect(result.period).toContain('-');
        expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userId,
              invoiceDate: expect.any(Object),
            }),
          }),
        );
      });

      it('should use custom date range when provided', async () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-01-31');
        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        mockPrismaService.payment.findMany.mockResolvedValue([]);

        const result = await service.runReconciliation(userId, startDate, endDate);

        expect(result.period).toBe('2025-01-01 - 2025-01-31');
      });

      it('should return empty matches when no invoices or payments', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        mockPrismaService.payment.findMany.mockResolvedValue([]);

        const result = await service.runReconciliation(userId);

        expect(result.matches).toHaveLength(0);
        expect(result.unmatchedInvoices).toHaveLength(0);
        expect(result.unmatchedPayments).toHaveLength(0);
        expect(result.summary.matchedCount).toBe(0);
      });

      it('should include reconciledAt timestamp', async () => {
        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        mockPrismaService.payment.findMany.mockResolvedValue([]);

        const before = new Date();
        const result = await service.runReconciliation(userId);
        const after = new Date();

        expect(result.reconciledAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.reconciledAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    });

    describe('Phase 1: Exact Matches by Invoice ID', () => {
      it('should match payment already linked to invoice', async () => {
        const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 1190 });
        const payment = createMockPayment({
          id: 'pay-001',
          invoiceId: 'inv-001',
          amount: 1190,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]).toMatchObject({
          invoiceId: 'inv-001',
          paymentId: 'pay-001',
          matchConfidence: 100,
          matchType: 'exact',
          status: 'matched',
          discrepancy: 0,
        });
      });

      it('should identify partial payment (payment less than invoice)', async () => {
        const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 1000 });
        const payment = createMockPayment({
          id: 'pay-001',
          invoiceId: 'inv-001',
          amount: 500,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.matches[0].status).toBe('partial');
        expect(result.matches[0].discrepancy).toBe(500);
        expect(result.summary.partialCount).toBe(1);
      });

      it('should identify overpayment', async () => {
        const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 1000 });
        const payment = createMockPayment({
          id: 'pay-001',
          invoiceId: 'inv-001',
          amount: 1200,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.matches[0].status).toBe('overpaid');
        expect(result.matches[0].discrepancy).toBe(-200);
      });

      it('should use payment reference when no reference provided', async () => {
        const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 1190 });
        const payment = createMockPayment({
          id: 'pay-001',
          invoiceId: 'inv-001',
          amount: 1190,
          reference: null,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.matches[0].paymentReference).toBe('pay-001');
      });
    });

    describe('Phase 2: Reference Matching', () => {
      it('should match by invoice number in payment reference', async () => {
        const invoice = createMockInvoice({
          id: 'inv-002',
          invoiceNumber: 'FV-2025-002',
          grossAmount: 500,
        });
        const payment = createMockPayment({
          id: 'pay-002',
          invoiceId: null,
          reference: 'Payment for FV-2025-002',
          amount: 500,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]).toMatchObject({
          matchConfidence: 85,
          matchType: 'reference',
        });
      });

      it('should match when payment reference is part of invoice number', async () => {
        const invoice = createMockInvoice({
          id: 'inv-003',
          invoiceNumber: 'FV-2025-003-ABC',
          grossAmount: 750,
        });
        const payment = createMockPayment({
          id: 'pay-003',
          invoiceId: null,
          reference: 'FV-2025-003',
          amount: 750,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].matchType).toBe('reference');
      });

      it('should skip reference matching for already matched payments', async () => {
        const invoices = [
          createMockInvoice({ id: 'inv-001', invoiceNumber: 'FV-001', grossAmount: 100 }),
          createMockInvoice({ id: 'inv-002', invoiceNumber: 'FV-002', grossAmount: 200 }),
        ];
        const payment = createMockPayment({
          id: 'pay-001',
          invoiceId: 'inv-001', // Already linked
          reference: 'FV-002', // But has different reference
          amount: 100,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        // Should match via exact match, not reference
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].invoiceId).toBe('inv-001');
        expect(result.matches[0].matchType).toBe('exact');
      });

      it('should not match if reference is null', async () => {
        const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 999 });
        const payment = createMockPayment({
          id: 'pay-001',
          invoiceId: null,
          reference: null,
          amount: 1000,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        // Should not match by reference (no reference)
        // But may match by amount if close enough
        expect(result.matches.filter((m) => m.matchType === 'reference')).toHaveLength(0);
      });
    });

    describe('Phase 3: Amount Matching', () => {
      it('should match by exact amount', async () => {
        const invoice = createMockInvoice({
          id: 'inv-004',
          invoiceNumber: 'FV-004',
          grossAmount: 1234.56,
        });
        const payment = createMockPayment({
          id: 'pay-004',
          invoiceId: null,
          reference: 'Random ref',
          amount: 1234.56,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]).toMatchObject({
          matchConfidence: 70,
          matchType: 'amount',
          status: 'matched',
          discrepancy: 0,
        });
      });

      it('should match amounts within 0.01 tolerance', async () => {
        const invoice = createMockInvoice({
          id: 'inv-005',
          invoiceNumber: 'FV-005',
          grossAmount: 100.005,
        });
        const payment = createMockPayment({
          id: 'pay-005',
          invoiceId: null,
          reference: null,
          amount: 100.00,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.matches).toHaveLength(1);
        expect(result.matches[0].matchType).toBe('amount');
      });

      it('should create alert for amount match', async () => {
        const invoice = createMockInvoice({
          id: 'inv-006',
          invoiceNumber: 'FV-006',
          grossAmount: 555,
        });
        const payment = createMockPayment({
          id: 'pay-006',
          invoiceId: null,
          reference: 'No match ref',
          amount: 555,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.alerts).toContainEqual(
          expect.objectContaining({
            type: 'info',
            code: 'AMOUNT_MATCH',
            message: expect.stringContaining('FV-006'),
            relatedId: 'inv-006',
          }),
        );
      });

      it('should not match amounts with difference > 0.01', async () => {
        const invoice = createMockInvoice({
          id: 'inv-007',
          invoiceNumber: 'FV-007',
          grossAmount: 100,
        });
        const payment = createMockPayment({
          id: 'pay-007',
          invoiceId: null,
          reference: 'No ref match',
          amount: 100.02,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.matches).toHaveLength(0);
        expect(result.unmatchedInvoices).toHaveLength(1);
        expect(result.unmatchedPayments).toHaveLength(1);
      });
    });

    describe('Unmatched Items', () => {
      it('should return unmatched invoices', async () => {
        const invoice = createMockInvoice({
          id: 'inv-unmatched',
          invoiceNumber: 'FV-UNMATCHED',
          partnerName: 'Client Nou SRL',
          grossAmount: 999,
          dueDate: new Date('2025-02-15'),
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([]);

        const result = await service.runReconciliation(userId);

        expect(result.unmatchedInvoices).toHaveLength(1);
        expect(result.unmatchedInvoices[0]).toMatchObject({
          id: 'inv-unmatched',
          invoiceNumber: 'FV-UNMATCHED',
          partnerName: 'Client Nou SRL',
          amount: 999,
        });
        expect(result.summary.unmatchedInvoices).toBe(1);
      });

      it('should return unmatched payments', async () => {
        const payment = createMockPayment({
          id: 'pay-unmatched',
          reference: 'UNKNOWN-REF',
          amount: 777,
          method: 'CASH',
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        mockPrismaService.payment.findMany.mockResolvedValue([payment]);

        const result = await service.runReconciliation(userId);

        expect(result.unmatchedPayments).toHaveLength(1);
        expect(result.unmatchedPayments[0]).toMatchObject({
          id: 'pay-unmatched',
          reference: 'UNKNOWN-REF',
          amount: 777,
          method: 'CASH',
        });
        expect(result.summary.unmatchedPayments).toBe(1);
      });
    });

    describe('Alerts', () => {
      it('should generate warning for invoices older than 30 days', async () => {
        const oldInvoice = createMockInvoice({
          id: 'inv-old',
          invoiceNumber: 'FV-OLD',
          invoiceDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          grossAmount: 1000,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([oldInvoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([]);

        const result = await service.runReconciliation(userId);

        expect(result.alerts).toContainEqual(
          expect.objectContaining({
            type: 'warning',
            code: 'OLD_UNMATCHED',
            message: expect.stringContaining('neincasata de peste 30 zile'),
            relatedId: 'inv-old',
            amount: 1000,
          }),
        );
      });

      it('should not generate warning for recent invoices', async () => {
        const recentInvoice = createMockInvoice({
          id: 'inv-recent',
          invoiceNumber: 'FV-RECENT',
          invoiceDate: new Date(), // Today
          grossAmount: 500,
        });

        mockPrismaService.invoice.findMany.mockResolvedValue([recentInvoice]);
        mockPrismaService.payment.findMany.mockResolvedValue([]);

        const result = await service.runReconciliation(userId);

        expect(result.alerts).not.toContainEqual(
          expect.objectContaining({
            code: 'OLD_UNMATCHED',
          }),
        );
      });
    });

    describe('Summary Calculations', () => {
      it('should calculate total invoice amount', async () => {
        const invoices = [
          createMockInvoice({ id: 'inv-1', grossAmount: 100 }),
          createMockInvoice({ id: 'inv-2', grossAmount: 200 }),
          createMockInvoice({ id: 'inv-3', grossAmount: 300 }),
        ];

        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);
        mockPrismaService.payment.findMany.mockResolvedValue([]);

        const result = await service.runReconciliation(userId);

        expect(result.summary.totalInvoices).toBe(3);
        expect(result.summary.totalInvoiceAmount).toBe(600);
      });

      it('should calculate total payment amount', async () => {
        const payments = [
          createMockPayment({ id: 'pay-1', amount: 150 }),
          createMockPayment({ id: 'pay-2', amount: 250 }),
        ];

        mockPrismaService.invoice.findMany.mockResolvedValue([]);
        mockPrismaService.payment.findMany.mockResolvedValue(payments);

        const result = await service.runReconciliation(userId);

        expect(result.summary.totalPayments).toBe(2);
        expect(result.summary.totalPaymentAmount).toBe(400);
      });

      it('should calculate reconciled amount and discrepancy', async () => {
        const invoices = [
          createMockInvoice({ id: 'inv-1', invoiceNumber: 'FV-1', grossAmount: 1000 }),
          createMockInvoice({ id: 'inv-2', invoiceNumber: 'FV-2', grossAmount: 500 }),
        ];
        const payments = [
          createMockPayment({ id: 'pay-1', invoiceId: 'inv-1', amount: 1000 }),
        ];

        mockPrismaService.invoice.findMany.mockResolvedValue(invoices);
        mockPrismaService.payment.findMany.mockResolvedValue(payments);

        const result = await service.runReconciliation(userId);

        expect(result.summary.totalReconciled).toBe(1000);
        expect(result.summary.discrepancyAmount).toBe(500); // 1500 - 1000
      });
    });
  });

  describe('manualMatch', () => {
    const userId = 'user-001';

    it('should successfully match invoice with payment', async () => {
      const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 1000 });
      const payment = createMockPayment({ id: 'pay-001', amount: 1000 });

      mockPrismaService.invoice.findFirst.mockResolvedValue(invoice);
      mockPrismaService.payment.findFirst.mockResolvedValue(payment);
      mockPrismaService.payment.update.mockResolvedValue({ ...payment, invoiceId: 'inv-001' });
      mockPrismaService.payment.findMany.mockResolvedValue([{ ...payment, invoiceId: 'inv-001' }]);
      mockPrismaService.invoice.update.mockResolvedValue({ ...invoice, paidAmount: 1000, paymentStatus: 'PAID' });

      const result = await service.manualMatch(userId, 'inv-001', 'pay-001');

      expect(result.success).toBe(true);
      expect(result.message).toContain('a fost potrivita cu plata');
      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay-001' },
        data: { invoiceId: 'inv-001' },
      });
    });

    it('should return error if invoice not found', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);
      mockPrismaService.payment.findFirst.mockResolvedValue(createMockPayment());

      const result = await service.manualMatch(userId, 'inv-not-found', 'pay-001');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Factura nu a fost gasita');
    });

    it('should return error if payment not found', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue(createMockInvoice());
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      const result = await service.manualMatch(userId, 'inv-001', 'pay-not-found');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Plata nu a fost gasita');
    });

    it('should update invoice status to PAID when fully paid', async () => {
      const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 500 });
      const payment = createMockPayment({ id: 'pay-001', amount: 500 });

      mockPrismaService.invoice.findFirst.mockResolvedValue(invoice);
      mockPrismaService.payment.findFirst.mockResolvedValue(payment);
      mockPrismaService.payment.update.mockResolvedValue({ ...payment, invoiceId: 'inv-001' });
      mockPrismaService.payment.findMany.mockResolvedValue([{ ...payment, invoiceId: 'inv-001', amount: 500 }]);
      mockPrismaService.invoice.update.mockResolvedValue({});

      await service.manualMatch(userId, 'inv-001', 'pay-001');

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-001' },
        data: expect.objectContaining({
          paidAmount: 500,
          paymentStatus: 'PAID',
          paidAt: expect.any(Date),
        }),
      });
    });

    it('should update invoice status to PARTIAL when partially paid', async () => {
      const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 1000 });
      const payment = createMockPayment({ id: 'pay-001', amount: 300 });

      mockPrismaService.invoice.findFirst.mockResolvedValue(invoice);
      mockPrismaService.payment.findFirst.mockResolvedValue(payment);
      mockPrismaService.payment.update.mockResolvedValue({ ...payment, invoiceId: 'inv-001' });
      mockPrismaService.payment.findMany.mockResolvedValue([{ ...payment, invoiceId: 'inv-001', amount: 300 }]);
      mockPrismaService.invoice.update.mockResolvedValue({});

      await service.manualMatch(userId, 'inv-001', 'pay-001');

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-001' },
        data: expect.objectContaining({
          paidAmount: 300,
          paymentStatus: 'PARTIAL',
          paidAt: null,
        }),
      });
    });

    it('should keep UNPAID status when no payment amount', async () => {
      const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 1000 });
      const payment = createMockPayment({ id: 'pay-001', amount: 0 });

      mockPrismaService.invoice.findFirst.mockResolvedValue(invoice);
      mockPrismaService.payment.findFirst.mockResolvedValue(payment);
      mockPrismaService.payment.update.mockResolvedValue({ ...payment, invoiceId: 'inv-001' });
      mockPrismaService.payment.findMany.mockResolvedValue([{ ...payment, invoiceId: 'inv-001', amount: 0 }]);
      mockPrismaService.invoice.update.mockResolvedValue({});

      await service.manualMatch(userId, 'inv-001', 'pay-001');

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-001' },
        data: expect.objectContaining({
          paymentStatus: 'UNPAID',
        }),
      });
    });

    it('should aggregate multiple payments for total paid calculation', async () => {
      const invoice = createMockInvoice({ id: 'inv-001', grossAmount: 1000 });
      const payment = createMockPayment({ id: 'pay-002', amount: 200 });

      mockPrismaService.invoice.findFirst.mockResolvedValue(invoice);
      mockPrismaService.payment.findFirst.mockResolvedValue(payment);
      mockPrismaService.payment.update.mockResolvedValue({ ...payment, invoiceId: 'inv-001' });
      mockPrismaService.payment.findMany.mockResolvedValue([
        { id: 'pay-001', amount: 500, invoiceId: 'inv-001' },
        { id: 'pay-002', amount: 200, invoiceId: 'inv-001' },
      ]);
      mockPrismaService.invoice.update.mockResolvedValue({});

      await service.manualMatch(userId, 'inv-001', 'pay-002');

      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-001' },
        data: expect.objectContaining({
          paidAmount: 700, // 500 + 200
          paymentStatus: 'PARTIAL',
        }),
      });
    });
  });

  describe('getAgingReport', () => {
    const userId = 'user-001';

    it('should return empty aging report when no unpaid invoices', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.getAgingReport(userId);

      expect(result.summary.total).toBe(0);
      expect(result.invoices).toHaveLength(0);
    });

    it('should categorize current (not yet due) invoices', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const invoice = createMockInvoice({
        dueDate: futureDate,
        grossAmount: 1000,
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      });

      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.getAgingReport(userId);

      expect(result.summary.current).toBe(1000);
      expect(result.invoices[0].bucket).toBe('current');
      expect(result.invoices[0].daysOverdue).toBe(0);
    });

    it('should categorize 1-30 day overdue invoices', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 15);

      const invoice = createMockInvoice({
        dueDate: pastDate,
        grossAmount: 500,
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      });

      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.getAgingReport(userId);

      expect(result.summary.days30).toBe(500);
      expect(result.invoices[0].bucket).toBe('1-30');
      expect(result.invoices[0].daysOverdue).toBeGreaterThanOrEqual(14); // May be 14-15 due to time calculations
    });

    it('should categorize 31-60 day overdue invoices', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 45);

      const invoice = createMockInvoice({
        dueDate: pastDate,
        grossAmount: 750,
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      });

      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.getAgingReport(userId);

      expect(result.summary.days60).toBe(750);
      expect(result.invoices[0].bucket).toBe('31-60');
    });

    it('should categorize 61-90 day overdue invoices', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 75);

      const invoice = createMockInvoice({
        dueDate: pastDate,
        grossAmount: 250,
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      });

      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.getAgingReport(userId);

      expect(result.summary.days90).toBe(250);
      expect(result.invoices[0].bucket).toBe('61-90');
    });

    it('should categorize 90+ day overdue invoices', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 120);

      const invoice = createMockInvoice({
        dueDate: pastDate,
        grossAmount: 2000,
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      });

      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.getAgingReport(userId);

      expect(result.summary.days90Plus).toBe(2000);
      expect(result.invoices[0].bucket).toBe('90+');
    });

    it('should calculate outstanding amount for partial payments', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const invoice = createMockInvoice({
        dueDate: pastDate,
        grossAmount: 1000,
        paidAmount: 400,
        paymentStatus: 'PARTIAL',
      });

      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.getAgingReport(userId);

      expect(result.invoices[0].outstanding).toBe(600);
      expect(result.invoices[0].paidAmount).toBe(400);
    });

    it('should use invoiceDate as dueDate fallback', async () => {
      const invoiceDate = new Date();
      invoiceDate.setDate(invoiceDate.getDate() - 5);

      const invoice = createMockInvoice({
        invoiceDate,
        dueDate: null,
        grossAmount: 300,
        paidAmount: 0,
        paymentStatus: 'UNPAID',
      });

      mockPrismaService.invoice.findMany.mockResolvedValue([invoice]);

      const result = await service.getAgingReport(userId);

      expect(result.invoices[0].dueDate).toEqual(invoiceDate);
    });

    it('should calculate total across all buckets', async () => {
      const today = new Date();
      const invoices = [
        createMockInvoice({
          id: '1',
          dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // future
          grossAmount: 100,
          paidAmount: 0,
          paymentStatus: 'UNPAID',
        }),
        createMockInvoice({
          id: '2',
          dueDate: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          grossAmount: 200,
          paidAmount: 0,
          paymentStatus: 'UNPAID',
        }),
        createMockInvoice({
          id: '3',
          dueDate: new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
          grossAmount: 300,
          paidAmount: 0,
          paymentStatus: 'UNPAID',
        }),
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.getAgingReport(userId);

      expect(result.summary.total).toBe(600);
    });

    it('should include period in report', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.getAgingReport(userId);

      expect(result.period).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getReconciliationHistory', () => {
    it('should return empty array (not implemented)', async () => {
      const result = await service.getReconciliationHistory('user-001');

      expect(result).toEqual([]);
    });

    it('should accept limit parameter', async () => {
      const result = await service.getReconciliationHistory('user-001', 5);

      expect(result).toEqual([]);
    });
  });

  describe('calculateDSO', () => {
    const userId = 'user-001';

    it('should calculate DSO correctly', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { grossAmount: 3000 } }) // receivables
        .mockResolvedValueOnce({ _sum: { grossAmount: 10000 } }); // total sales

      const result = await service.calculateDSO(userId);

      // DSO = (3000 / 10000) * 90 = 27
      expect(result).toBe(27);
    });

    it('should return 0 when no sales', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { grossAmount: 0 } })
        .mockResolvedValueOnce({ _sum: { grossAmount: 0 } });

      const result = await service.calculateDSO(userId);

      expect(result).toBe(0);
    });

    it('should handle null sums', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { grossAmount: null } })
        .mockResolvedValueOnce({ _sum: { grossAmount: null } });

      const result = await service.calculateDSO(userId);

      expect(result).toBe(0);
    });

    it('should use custom days parameter', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { grossAmount: 5000 } })
        .mockResolvedValueOnce({ _sum: { grossAmount: 20000 } });

      const result = await service.calculateDSO(userId, 30);

      // DSO = (5000 / 20000) * 30 = 7.5 -> 8 (rounded)
      expect(result).toBe(8);
    });
  });

  describe('getCollectionRate', () => {
    const userId = 'user-001';

    it('should calculate collection rate correctly', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { grossAmount: 10000 } }) // invoiced
        .mockResolvedValueOnce({ _sum: { paidAmount: 8000 } }); // collected

      const result = await service.getCollectionRate(userId);

      expect(result).toBe(80);
    });

    it('should return 100 when no invoices', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { grossAmount: 0 } })
        .mockResolvedValueOnce({ _sum: { paidAmount: 0 } });

      const result = await service.getCollectionRate(userId);

      expect(result).toBe(100);
    });

    it('should handle null sums', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { grossAmount: null } })
        .mockResolvedValueOnce({ _sum: { paidAmount: null } });

      const result = await service.getCollectionRate(userId);

      expect(result).toBe(100);
    });

    it('should use custom days parameter', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { grossAmount: 5000 } })
        .mockResolvedValueOnce({ _sum: { paidAmount: 4500 } });

      const result = await service.getCollectionRate(userId, 30);

      expect(result).toBe(90);
    });
  });

  describe('getPaymentMetrics', () => {
    const userId = 'user-001';

    it('should return all payment metrics', async () => {
      // Mock DSO
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { grossAmount: 2000 } })
        .mockResolvedValueOnce({ _sum: { grossAmount: 10000 } })
        // Mock collection rate
        .mockResolvedValueOnce({ _sum: { grossAmount: 10000 } })
        .mockResolvedValueOnce({ _sum: { paidAmount: 9000 } });

      // Mock paid invoices for delay calculation
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { dueDate: new Date('2025-01-15'), paidAt: new Date('2025-01-15') }, // on time
        { dueDate: new Date('2025-01-10'), paidAt: new Date('2025-01-20') }, // 10 days late
      ]);

      const result = await service.getPaymentMetrics(userId);

      expect(result).toMatchObject({
        dso: expect.any(Number),
        collectionRate: expect.any(Number),
        avgPaymentDelay: expect.any(Number),
        onTimePaymentRate: expect.any(Number),
      });
    });

    it('should calculate average payment delay', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValue({ _sum: { grossAmount: 1000, paidAmount: 1000 } });

      mockPrismaService.invoice.findMany.mockResolvedValue([
        { dueDate: new Date('2025-01-10'), paidAt: new Date('2025-01-15') }, // 5 days late
        { dueDate: new Date('2025-01-10'), paidAt: new Date('2025-01-25') }, // 15 days late
      ]);

      const result = await service.getPaymentMetrics(userId);

      expect(result.avgPaymentDelay).toBe(10); // (5 + 15) / 2
    });

    it('should calculate on-time payment rate', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValue({ _sum: { grossAmount: 1000, paidAmount: 1000 } });

      mockPrismaService.invoice.findMany.mockResolvedValue([
        { dueDate: new Date('2025-01-15'), paidAt: new Date('2025-01-10') }, // early
        { dueDate: new Date('2025-01-15'), paidAt: new Date('2025-01-15') }, // on time
        { dueDate: new Date('2025-01-15'), paidAt: new Date('2025-01-20') }, // late
      ]);

      const result = await service.getPaymentMetrics(userId);

      expect(result.onTimePaymentRate).toBe(67); // 2/3 = 66.67 -> 67
    });

    it('should return default values when no paid invoices', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValue({ _sum: { grossAmount: 0, paidAmount: 0 } });

      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.getPaymentMetrics(userId);

      expect(result.avgPaymentDelay).toBe(0);
      expect(result.onTimePaymentRate).toBe(100);
    });

    it('should handle invoices with null dates', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValue({ _sum: { grossAmount: 1000, paidAmount: 1000 } });

      mockPrismaService.invoice.findMany.mockResolvedValue([
        { dueDate: null, paidAt: new Date() },
        { dueDate: new Date(), paidAt: null },
        { dueDate: new Date('2025-01-15'), paidAt: new Date('2025-01-15') },
      ]);

      const result = await service.getPaymentMetrics(userId);

      // 1 valid on-time invoice out of 3 total = 33%
      // (service counts all invoices in divisor, skips null ones for calculation)
      expect(result.onTimePaymentRate).toBe(33);
    });

    it('should not count negative delays (early payments)', async () => {
      mockPrismaService.invoice.aggregate
        .mockResolvedValue({ _sum: { grossAmount: 1000, paidAmount: 1000 } });

      mockPrismaService.invoice.findMany.mockResolvedValue([
        { dueDate: new Date('2025-01-20'), paidAt: new Date('2025-01-10') }, // 10 days early
      ]);

      const result = await service.getPaymentMetrics(userId);

      expect(result.avgPaymentDelay).toBe(0);
      expect(result.onTimePaymentRate).toBe(100);
    });
  });
});
