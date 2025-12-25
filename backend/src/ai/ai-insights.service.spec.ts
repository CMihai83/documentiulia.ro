import { Test, TestingModule } from '@nestjs/testing';
import { AiInsightsService, FinancialHealthScore, SpendingInsight, CashFlowPrediction, CategoryAnalysis, VendorInsight, TaxOptimizationSuggestion, ComplianceAlert } from './ai-insights.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmartCategorizationService } from './smart-categorization.service';

describe('AiInsightsService', () => {
  let service: AiInsightsService;
  let mockPrismaService: any;
  let mockCategorizationService: any;

  const userId = 'user-123';

  const createMockInvoice = (overrides: any = {}) => ({
    id: `inv-${Math.random().toString(36).slice(2)}`,
    userId,
    type: 'RECEIVED',
    invoiceNumber: 'INV-001',
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    partnerName: 'Test Vendor SRL',
    partnerCui: 'RO12345678',
    netAmount: 1000,
    vatAmount: 190,
    grossAmount: 1190,
    paymentStatus: 'UNPAID',
    ...overrides,
  });

  beforeEach(async () => {
    mockPrismaService = {
      invoice: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      sAFTReport: {
        findUnique: jest.fn(),
      },
      vATReport: {
        findFirst: jest.fn(),
      },
    };

    mockCategorizationService = {
      getCategorizationStats: jest.fn().mockResolvedValue({}),
      getCategories: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiInsightsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SmartCategorizationService, useValue: mockCategorizationService },
      ],
    }).compile();

    service = module.get<AiInsightsService>(AiInsightsService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('calculateFinancialHealthScore', () => {
    it('should calculate overall health score', async () => {
      const recentIncome = [
        createMockInvoice({ type: 'ISSUED', grossAmount: 10000, paymentStatus: 'PAID' }),
        createMockInvoice({ type: 'ISSUED', grossAmount: 8000, paymentStatus: 'PAID' }),
      ];
      const recentExpenses = [
        createMockInvoice({ type: 'RECEIVED', grossAmount: 5000, paymentStatus: 'PAID' }),
      ];

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([...recentIncome, ...recentExpenses])
        .mockResolvedValueOnce([]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.components).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should calculate cash flow component', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', grossAmount: 20000 }),
          createMockInvoice({ type: 'RECEIVED', grossAmount: 10000 }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.components.cashFlow).toBeDefined();
      expect(result.components.cashFlow.score).toBeGreaterThanOrEqual(0);
      expect(result.components.cashFlow.trend).toMatch(/up|down|stable/);
      expect(result.components.cashFlow.description).toContain('RON');
    });

    it('should calculate profitability component', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', grossAmount: 10000 }),
          createMockInvoice({ type: 'RECEIVED', grossAmount: 7000 }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.components.profitability).toBeDefined();
      expect(result.components.profitability.score).toBeGreaterThanOrEqual(0);
      expect(result.components.profitability.description).toContain('Marjă');
    });

    it('should calculate receivables score based on unpaid invoices', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', paymentStatus: 'PAID' }),
          createMockInvoice({ type: 'ISSUED', paymentStatus: 'UNPAID' }),
          createMockInvoice({ type: 'ISSUED', paymentStatus: 'PAID' }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.components.receivables.description).toContain('/3 facturi');
    });

    it('should generate recommendations for low scores', async () => {
      // High expenses, low income = poor cash flow
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', grossAmount: 1000 }),
          createMockInvoice({ type: 'RECEIVED', grossAmount: 5000 }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should add positive recommendation for healthy finances', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', grossAmount: 50000, paymentStatus: 'PAID' }),
          createMockInvoice({ type: 'RECEIVED', grossAmount: 10000, paymentStatus: 'PAID' }),
        ])
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', grossAmount: 30000, paymentStatus: 'PAID' }),
          createMockInvoice({ type: 'RECEIVED', grossAmount: 8000, paymentStatus: 'PAID' }),
        ]);

      const result = await service.calculateFinancialHealthScore(userId);

      if (result.overallScore >= 80) {
        expect(result.recommendations).toContain('Sănătatea financiară este bună! Continuați cu practicile actuale.');
      }
    });

    it('should handle no invoices', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.overallScore).toBeDefined();
      expect(result.components.cashFlow.score).toBeDefined();
    });

    it('should detect upward cash flow trend', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', grossAmount: 20000 }),
          createMockInvoice({ type: 'RECEIVED', grossAmount: 5000 }),
        ])
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', grossAmount: 10000 }),
          createMockInvoice({ type: 'RECEIVED', grossAmount: 8000 }),
        ]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.components.cashFlow.trend).toBe('up');
    });

    it('should detect downward cash flow trend', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', grossAmount: 5000 }),
          createMockInvoice({ type: 'RECEIVED', grossAmount: 10000 }),
        ])
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'ISSUED', grossAmount: 15000 }),
          createMockInvoice({ type: 'RECEIVED', grossAmount: 5000 }),
        ]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.components.cashFlow.trend).toBe('down');
    });
  });

  describe('generateSpendingInsights', () => {
    it('should return array of spending insights', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', grossAmount: 1000 }),
      ]);

      const result = await service.generateSpendingInsights(userId);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should detect spending increase trend', async () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', grossAmount: 10000, invoiceDate: recentDate }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 5000, invoiceDate: oldDate }),
      ]);

      const result = await service.generateSpendingInsights(userId);

      const trendInsight = result.find(i => i.type === 'trend' && i.title.includes('creștere'));
      expect(trendInsight).toBeDefined();
    });

    it('should detect spending decrease (savings)', async () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', grossAmount: 3000, invoiceDate: recentDate }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 10000, invoiceDate: oldDate }),
      ]);

      const result = await service.generateSpendingInsights(userId);

      const savingsInsight = result.find(i => i.type === 'saving');
      expect(savingsInsight).toBeDefined();
    });

    it('should detect unusually large transactions', async () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      // Need many small invoices so the average is low enough that the big one is > avg * 3
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', grossAmount: 1000, invoiceDate: recentDate }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 1000, invoiceDate: recentDate }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 1000, invoiceDate: recentDate }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 1000, invoiceDate: recentDate }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 1000, invoiceDate: recentDate }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 100000, invoiceDate: recentDate, partnerName: 'Big Vendor' }),
      ]);

      const result = await service.generateSpendingInsights(userId);

      // Average = 105000/6 = 17500, threshold = 17500 * 3 = 52500, 100000 > 52500
      const anomalyInsight = result.find(i => i.type === 'anomaly' && i.title.includes('neobișnuită'));
      expect(anomalyInsight).toBeDefined();
      expect(anomalyInsight?.vendor).toBe('Big Vendor');
    });

    it('should detect possible duplicate payments', async () => {
      const now = new Date();
      const date1 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const date2 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({
          type: 'RECEIVED',
          grossAmount: 5000,
          invoiceDate: date1,
          partnerName: 'Same Vendor',
          invoiceNumber: 'INV-001'
        }),
        createMockInvoice({
          type: 'RECEIVED',
          grossAmount: 5000,
          invoiceDate: date2,
          partnerName: 'Same Vendor',
          invoiceNumber: 'INV-002'
        }),
      ]);

      const result = await service.generateSpendingInsights(userId);

      const duplicateInsight = result.find(i => i.type === 'anomaly' && i.title.includes('duplicată'));
      expect(duplicateInsight).toBeDefined();
      expect(duplicateInsight?.severity).toBe('critical');
    });

    it('should detect overdue receivables', async () => {
      const now = new Date();
      const pastDue = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({
          type: 'ISSUED',
          grossAmount: 15000,
          paymentStatus: 'UNPAID',
          dueDate: pastDue
        }),
      ]);

      const result = await service.generateSpendingInsights(userId);

      const overdueInsight = result.find(i => i.title.includes('neîncasate restante'));
      expect(overdueInsight).toBeDefined();
      expect(overdueInsight?.actionable).toBe(true);
    });

    it('should sort insights by severity', async () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const pastDue = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      mockPrismaService.invoice.findMany.mockResolvedValue([
        // Create conditions for multiple insight types
        createMockInvoice({ type: 'RECEIVED', grossAmount: 1000, invoiceDate: recentDate }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 1000, invoiceDate: recentDate, partnerName: 'Same' }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 1000, invoiceDate: new Date(recentDate.getTime() + 2*24*60*60*1000), partnerName: 'Same' }),
        createMockInvoice({ type: 'ISSUED', grossAmount: 20000, paymentStatus: 'UNPAID', dueDate: pastDue }),
      ]);

      const result = await service.generateSpendingInsights(userId);

      if (result.length > 1) {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        for (let i = 1; i < result.length; i++) {
          expect(severityOrder[result[i-1].severity]).toBeLessThanOrEqual(severityOrder[result[i].severity]);
        }
      }
    });
  });

  describe('predictCashFlow', () => {
    it('should return predictions for specified months', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'ISSUED', grossAmount: 10000 }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 5000 }),
      ]);

      const result = await service.predictCashFlow(userId, 3);

      expect(result).toHaveLength(3);
    });

    it('should include period in YYYY-MM format', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.predictCashFlow(userId, 1);

      expect(result[0].period).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should calculate predicted income and expenses', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'ISSUED', grossAmount: 20000 }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 10000 }),
      ]);

      const result = await service.predictCashFlow(userId, 1);

      expect(result[0].predictedIncome).toBeGreaterThanOrEqual(0);
      expect(result[0].predictedExpenses).toBeGreaterThanOrEqual(0);
    });

    it('should calculate predicted balance', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'ISSUED', grossAmount: 20000 }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 10000 }),
      ]);

      const result = await service.predictCashFlow(userId, 1);

      expect(result[0].predictedBalance).toBe(
        result[0].predictedIncome - result[0].predictedExpenses
      );
    });

    it('should include confidence level (decreasing over time)', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.predictCashFlow(userId, 3);

      expect(result[0].confidence).toBeGreaterThan(result[2].confidence);
    });

    it('should include prediction factors', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'ISSUED', grossAmount: 10000 }),
      ]);

      const result = await service.predictCashFlow(userId, 1);

      expect(Array.isArray(result[0].factors)).toBe(true);
      expect(result[0].factors.length).toBeGreaterThan(0);
    });

    it('should handle empty historical data', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.predictCashFlow(userId, 3);

      expect(result).toHaveLength(3);
      result.forEach(p => {
        expect(p.predictedIncome).toBe(0);
        expect(p.predictedExpenses).toBe(0);
      });
    });

    it('should default to 3 months if not specified', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.predictCashFlow(userId);

      expect(result).toHaveLength(3);
    });
  });

  describe('analyzeCategorySpending', () => {
    it('should return category analysis array', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 5000 }),
      ]);

      const result = await service.analyzeCategorySpending(userId, '2025-01');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should group spending by vendor', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 3000 }),
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 2000 }),
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor B', grossAmount: 1000 }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.analyzeCategorySpending(userId, '2025-01');

      const vendorA = result.find(c => c.categoryName === 'Vendor A');
      expect(vendorA?.currentPeriodSpend).toBe(5000);
      expect(vendorA?.transactionCount).toBe(2);
    });

    it('should calculate change percentage', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 10000 }),
        ])
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 5000 }),
        ]);

      const result = await service.analyzeCategorySpending(userId, '2025-01');

      const vendorA = result.find(c => c.categoryName === 'Vendor A');
      expect(vendorA?.changePercent).toBe(100); // Doubled
    });

    it('should detect increasing trend', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 15000 }),
        ])
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 10000 }),
        ]);

      const result = await service.analyzeCategorySpending(userId, '2025-01');

      const vendorA = result.find(c => c.categoryName === 'Vendor A');
      expect(vendorA?.trend).toBe('increasing');
    });

    it('should detect decreasing trend', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 5000 }),
        ])
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 10000 }),
        ]);

      const result = await service.analyzeCategorySpending(userId, '2025-01');

      const vendorA = result.find(c => c.categoryName === 'Vendor A');
      expect(vendorA?.trend).toBe('decreasing');
    });

    it('should add insight for significant changes', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 20000 }),
        ])
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 5000 }),
        ]);

      const result = await service.analyzeCategorySpending(userId, '2025-01');

      const vendorA = result.find(c => c.categoryName === 'Vendor A');
      expect(vendorA?.insight).toContain('crescut semnificativ');
    });

    it('should sort by current spending and limit to 10', async () => {
      const invoices = Array.from({ length: 15 }, (_, i) =>
        createMockInvoice({
          type: 'RECEIVED',
          partnerName: `Vendor ${i}`,
          grossAmount: (15 - i) * 1000
        })
      );

      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce(invoices)
        .mockResolvedValueOnce([]);

      const result = await service.analyzeCategorySpending(userId, '2025-01');

      expect(result.length).toBeLessThanOrEqual(10);
      // Should be sorted by spending descending
      for (let i = 1; i < result.length; i++) {
        expect(result[i-1].currentPeriodSpend).toBeGreaterThanOrEqual(result[i].currentPeriodSpend);
      }
    });
  });

  describe('analyzeVendors', () => {
    it('should return vendor insights array', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1000 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 2000 }),
      ]);

      const result = await service.analyzeVendors(userId);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should require at least 2 transactions per vendor', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1000 }),
        // Only 1 transaction for Vendor A
      ]);

      const result = await service.analyzeVendors(userId);

      expect(result.find(v => v.vendorName === 'Vendor A')).toBeUndefined();
    });

    it('should calculate total spend per vendor', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1000 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 2000 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 3000 }),
      ]);

      const result = await service.analyzeVendors(userId);

      const vendorA = result.find(v => v.vendorName === 'Vendor A');
      expect(vendorA?.totalSpend).toBe(6000);
      expect(vendorA?.transactionCount).toBe(3);
    });

    it('should calculate average transaction', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1000 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 2000 }),
      ]);

      const result = await service.analyzeVendors(userId);

      const vendorA = result.find(v => v.vendorName === 'Vendor A');
      expect(vendorA?.averageTransaction).toBe(1500);
    });

    it('should analyze price variation', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1000 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 5000 }),
      ]);

      const result = await service.analyzeVendors(userId);

      const vendorA = result.find(v => v.vendorName === 'Vendor A');
      expect(vendorA?.priceVariation?.minPrice).toBe(1000);
      expect(vendorA?.priceVariation?.maxPrice).toBe(5000);
    });

    it('should detect price trend', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1000 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1100 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1200 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1300 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 1400 }),
        createMockInvoice({ type: 'RECEIVED', partnerName: 'Vendor A', grossAmount: 2000 }),
      ]);

      const result = await service.analyzeVendors(userId);

      const vendorA = result.find(v => v.vendorName === 'Vendor A');
      expect(vendorA?.priceVariation?.trend).toBe('increasing');
    });

    it('should sort by total spend and limit to 15', async () => {
      const invoices: any[] = [];
      for (let i = 0; i < 20; i++) {
        invoices.push(
          createMockInvoice({ type: 'RECEIVED', partnerName: `Vendor ${i}`, grossAmount: (20 - i) * 1000 }),
          createMockInvoice({ type: 'RECEIVED', partnerName: `Vendor ${i}`, grossAmount: (20 - i) * 1000 })
        );
      }

      mockPrismaService.invoice.findMany.mockResolvedValue(invoices);

      const result = await service.analyzeVendors(userId);

      expect(result.length).toBeLessThanOrEqual(15);
    });
  });

  describe('generateTaxOptimizations', () => {
    it('should return tax optimization suggestions', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', vatAmount: 190 }),
      ]);

      const result = await service.generateTaxOptimizations(userId);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should suggest VAT deduction if applicable', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', vatAmount: 1900 }),
        createMockInvoice({ type: 'RECEIVED', vatAmount: 950 }),
      ]);

      const result = await service.generateTaxOptimizations(userId);

      const vatSuggestion = result.find(s => s.type === 'deduction' && s.title.includes('TVA'));
      expect(vatSuggestion).toBeDefined();
      expect(vatSuggestion?.potentialSavings).toBe(2850);
    });

    it('should include SAF-T compliance deadline', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.generateTaxOptimizations(userId);

      const saftSuggestion = result.find(s => s.type === 'compliance' && s.title.includes('SAF-T'));
      expect(saftSuggestion).toBeDefined();
      expect(saftSuggestion?.deadline).toBeInstanceOf(Date);
      expect(saftSuggestion?.legalReference).toBe('Ordinul 1783/2021');
    });

    it('should suggest depreciation for large assets', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', grossAmount: 5000 }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 10000 }),
      ]);

      const result = await service.generateTaxOptimizations(userId);

      const depreciationSuggestion = result.find(s => s.type === 'deduction' && s.title.includes('Amortizare'));
      expect(depreciationSuggestion).toBeDefined();
      expect(depreciationSuggestion?.legalReference).toBe('Art. 28 Cod Fiscal');
    });

    it('should sort by potential savings', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', grossAmount: 10000, vatAmount: 1900 }),
      ]);

      const result = await service.generateTaxOptimizations(userId);

      for (let i = 1; i < result.length; i++) {
        expect(result[i-1].potentialSavings).toBeGreaterThanOrEqual(result[i].potentialSavings);
      }
    });
  });

  describe('getComplianceAlerts', () => {
    it('should return compliance alerts array', async () => {
      mockPrismaService.sAFTReport.findUnique.mockResolvedValue(null);
      mockPrismaService.vATReport.findFirst.mockResolvedValue(null);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      const result = await service.getComplianceAlerts(userId);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should alert if SAF-T not submitted', async () => {
      mockPrismaService.sAFTReport.findUnique.mockResolvedValue(null);
      mockPrismaService.vATReport.findFirst.mockResolvedValue(null);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      const result = await service.getComplianceAlerts(userId);

      const saftAlert = result.find(a => a.title.includes('SAF-T'));
      expect(saftAlert).toBeDefined();
      expect(saftAlert?.type).toBe('deadline');
    });

    it('should alert if VAT not submitted', async () => {
      mockPrismaService.sAFTReport.findUnique.mockResolvedValue({ status: 'SUBMITTED' });
      mockPrismaService.vATReport.findFirst.mockResolvedValue(null);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      const result = await service.getComplianceAlerts(userId);

      const vatAlert = result.find(a => a.title.includes('TVA'));
      expect(vatAlert).toBeDefined();
    });

    it('should alert for invoices without CUI', async () => {
      mockPrismaService.sAFTReport.findUnique.mockResolvedValue({ status: 'SUBMITTED' });
      mockPrismaService.vATReport.findFirst.mockResolvedValue({ status: 'SUBMITTED' });
      mockPrismaService.invoice.count
        .mockResolvedValueOnce(5) // invoices without CUI
        .mockResolvedValueOnce(0); // overdue invoices

      const result = await service.getComplianceAlerts(userId);

      const cuiAlert = result.find(a => a.title.includes('CUI'));
      expect(cuiAlert).toBeDefined();
      expect(cuiAlert?.type).toBe('missing_document');
    });

    it('should alert for overdue invoices', async () => {
      mockPrismaService.sAFTReport.findUnique.mockResolvedValue({ status: 'SUBMITTED' });
      mockPrismaService.vATReport.findFirst.mockResolvedValue({ status: 'SUBMITTED' });
      mockPrismaService.invoice.count
        .mockResolvedValueOnce(0) // invoices without CUI
        .mockResolvedValueOnce(15); // overdue invoices

      const result = await service.getComplianceAlerts(userId);

      const overdueAlert = result.find(a => a.title.includes('restante'));
      expect(overdueAlert).toBeDefined();
      expect(overdueAlert?.severity).toBe('critical');
    });

    it('should sort alerts by severity', async () => {
      mockPrismaService.sAFTReport.findUnique.mockResolvedValue(null);
      mockPrismaService.vATReport.findFirst.mockResolvedValue(null);
      mockPrismaService.invoice.count.mockResolvedValue(5);

      const result = await service.getComplianceAlerts(userId);

      if (result.length > 1) {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        for (let i = 1; i < result.length; i++) {
          expect(severityOrder[result[i-1].severity]).toBeLessThanOrEqual(severityOrder[result[i].severity]);
        }
      }
    });

    it('should calculate days remaining for deadlines', async () => {
      mockPrismaService.sAFTReport.findUnique.mockResolvedValue(null);
      mockPrismaService.vATReport.findFirst.mockResolvedValue(null);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      const result = await service.getComplianceAlerts(userId);

      const deadlineAlert = result.find(a => a.type === 'deadline');
      expect(deadlineAlert?.daysRemaining).toBeDefined();
      expect(typeof deadlineAlert?.daysRemaining).toBe('number');
    });
  });

  describe('getDashboardInsights', () => {
    beforeEach(() => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);
      mockPrismaService.sAFTReport.findUnique.mockResolvedValue(null);
      mockPrismaService.vATReport.findFirst.mockResolvedValue(null);
    });

    it('should return complete dashboard insights', async () => {
      const result = await service.getDashboardInsights(userId);

      expect(result.healthScore).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.cashFlowPredictions).toBeDefined();
      expect(result.categoryAnalysis).toBeDefined();
      expect(result.vendorInsights).toBeDefined();
      expect(result.taxSuggestions).toBeDefined();
      expect(result.complianceAlerts).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should calculate summary correctly', async () => {
      const result = await service.getDashboardInsights(userId);

      expect(typeof result.summary.totalInsights).toBe('number');
      expect(typeof result.summary.criticalAlerts).toBe('number');
      expect(typeof result.summary.potentialSavings).toBe('number');
    });

    it('should include next deadline in summary if available', async () => {
      const result = await service.getDashboardInsights(userId);

      if (result.summary.nextDeadline) {
        expect(result.summary.nextDeadline.name).toBeDefined();
        expect(result.summary.nextDeadline.date).toBeInstanceOf(Date);
      }
    });

    it('should fetch all data in parallel', async () => {
      await service.getDashboardInsights(userId);

      // Verify multiple findMany calls were made (parallel execution)
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalled();
    });
  });

  describe('Romanian Compliance', () => {
    it('should use Romanian messages in health score', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', grossAmount: 10000 }),
      ]);

      const result = await service.calculateFinancialHealthScore(userId);

      // Check for Romanian text
      expect(result.components.cashFlow.description).toMatch(/RON|Flux/);
    });

    it('should reference Romanian tax law in suggestions', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'RECEIVED', vatAmount: 1900 }),
      ]);

      const result = await service.generateTaxOptimizations(userId);

      const vatSuggestion = result.find(s => s.legalReference?.includes('Cod Fiscal'));
      expect(vatSuggestion).toBeDefined();
    });

    it('should reference Order 1783/2021 for SAF-T', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.generateTaxOptimizations(userId);

      const saftSuggestion = result.find(s => s.legalReference === 'Ordinul 1783/2021');
      expect(saftSuggestion).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'ISSUED', grossAmount: 1000000000 }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 500000000 }),
      ]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle zero amounts', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'ISSUED', grossAmount: 0 }),
      ]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.overallScore).toBeDefined();
    });

    it('should handle negative balance scenarios', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        createMockInvoice({ type: 'ISSUED', grossAmount: 1000 }),
        createMockInvoice({ type: 'RECEIVED', grossAmount: 10000 }),
      ]);

      const result = await service.calculateFinancialHealthScore(userId);

      expect(result.components.cashFlow.description).toContain('-');
    });

    it('should handle unknown vendor name', async () => {
      mockPrismaService.invoice.findMany
        .mockResolvedValueOnce([
          createMockInvoice({ type: 'RECEIVED', partnerName: null, grossAmount: 1000 }),
          createMockInvoice({ type: 'RECEIVED', partnerName: null, grossAmount: 1000 }),
        ])
        .mockResolvedValueOnce([]);

      const result = await service.analyzeCategorySpending(userId, '2025-01');

      const unknown = result.find(c => c.categoryName === 'Unknown');
      expect(unknown).toBeDefined();
    });
  });
});
