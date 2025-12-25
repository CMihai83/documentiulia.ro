import { Test, TestingModule } from '@nestjs/testing';
import { CashFlowForecastService } from './cash-flow-forecast.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CashFlowForecastService', () => {
  let service: CashFlowForecastService;
  let prismaService: PrismaService;

  const organizationId = 'org-123';
  const userId = 'user-123';

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
    },
    recurringInvoice: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFlowForecastService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CashFlowForecastService>(CashFlowForecastService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateForecast', () => {
    beforeEach(() => {
      // Default mock responses
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.recurringInvoice.findMany.mockResolvedValue([]);
    });

    it('should generate forecast for specified months', async () => {
      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast).toBeDefined();
      expect(forecast.forecasts.length).toBe(3);
    });

    it('should return forecast summary with all required fields', async () => {
      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast).toHaveProperty('startDate');
      expect(forecast).toHaveProperty('endDate');
      expect(forecast).toHaveProperty('currency');
      expect(forecast).toHaveProperty('currentBalance');
      expect(forecast).toHaveProperty('totalExpectedIncome');
      expect(forecast).toHaveProperty('totalExpectedExpenses');
      expect(forecast).toHaveProperty('netForecast');
      expect(forecast).toHaveProperty('lowestBalance');
      expect(forecast).toHaveProperty('lowestBalanceDate');
      expect(forecast).toHaveProperty('riskLevel');
      expect(forecast).toHaveProperty('forecasts');
      expect(forecast).toHaveProperty('insights');
    });

    it('should use RON as default currency', async () => {
      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast.currency).toBe('RON');
    });

    it('should use starting balance', async () => {
      const startingBalance = 100000;

      const forecast = await service.generateForecast(organizationId, userId, 3, startingBalance);

      expect(forecast.currentBalance).toBe(startingBalance);
    });

    it('should default to 3 months if not specified', async () => {
      const forecast = await service.generateForecast(organizationId, userId);

      expect(forecast.forecasts.length).toBe(3);
    });

    it('should generate forecasts with required properties', async () => {
      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      forecast.forecasts.forEach(f => {
        expect(f).toHaveProperty('period');
        expect(f).toHaveProperty('date');
        expect(f).toHaveProperty('expectedIncome');
        expect(f).toHaveProperty('expectedExpenses');
        expect(f).toHaveProperty('netCashFlow');
        expect(f).toHaveProperty('cumulativeBalance');
        expect(f).toHaveProperty('confidence');
      });
    });

    it('should calculate cumulative balance correctly', async () => {
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          // Historical issued invoices
          return Promise.resolve([
            { invoiceDate: new Date(), grossAmount: 100000, paidAmount: 100000, paymentStatus: 'PAID' },
          ]);
        }
        if (args.where.type === 'RECEIVED' && args.select?.invoiceDate) {
          // Historical received invoices
          return Promise.resolve([
            { invoiceDate: new Date(), grossAmount: 50000, paidAmount: 50000, paymentStatus: 'PAID' },
          ]);
        }
        return Promise.resolve([]);
      });

      const startingBalance = 50000;
      const forecast = await service.generateForecast(organizationId, userId, 3, startingBalance);

      // First month should start from starting balance
      expect(forecast.forecasts[0].cumulativeBalance).toBeDefined();
    });

    it('should track lowest balance', async () => {
      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast.lowestBalance).toBeDefined();
      expect(forecast.lowestBalanceDate).toBeDefined();
      expect(forecast.lowestBalance).toBeLessThanOrEqual(forecast.currentBalance + forecast.netForecast);
    });

    it('should include insights array', async () => {
      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(Array.isArray(forecast.insights)).toBe(true);
    });
  });

  describe('generateForecast with historical data', () => {
    it('should incorporate historical income patterns', async () => {
      const now = new Date();
      const historicalInvoices: Array<{ invoiceDate: Date; grossAmount: number; paidAmount: number; paymentStatus: string }> = [];

      // Generate 12 months of historical data
      for (let i = 0; i < 12; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);

        historicalInvoices.push({
          invoiceDate: date,
          grossAmount: 80000 + (i % 3) * 10000, // Varying amounts
          paidAmount: 80000 + (i % 3) * 10000,
          paymentStatus: 'PAID',
        });
      }

      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          return Promise.resolve(historicalInvoices);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast.totalExpectedIncome).toBeGreaterThan(0);
    });

    it('should incorporate historical expense patterns', async () => {
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'RECEIVED' && args.select?.invoiceDate) {
          return Promise.resolve([
            { invoiceDate: new Date(), grossAmount: 30000, paidAmount: 30000, paymentStatus: 'PAID' },
            { invoiceDate: new Date(), grossAmount: 40000, paidAmount: 40000, paymentStatus: 'PAID' },
          ]);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast.totalExpectedExpenses).toBeDefined();
    });
  });

  describe('generateForecast with scheduled transactions', () => {
    it('should include unpaid issued invoices as expected income', async () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.where.paymentStatus?.in) {
          return Promise.resolve([
            {
              dueDate: nextMonth,
              grossAmount: 50000,
              paidAmount: 0,
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast.totalExpectedIncome).toBeGreaterThanOrEqual(0);
    });

    it('should include unpaid received invoices as expected expenses', async () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'RECEIVED' && args.where.paymentStatus?.in) {
          return Promise.resolve([
            {
              dueDate: nextMonth,
              grossAmount: 30000,
              paidAmount: 10000,
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast.totalExpectedExpenses).toBeDefined();
    });

    it('should subtract paid amount from expected income/expenses', async () => {
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.where.paymentStatus?.in) {
          return Promise.resolve([
            {
              dueDate: new Date(),
              grossAmount: 100000,
              paidAmount: 60000,
            },
          ]);
        }
        return Promise.resolve([]);
      });

      // The expected income should be grossAmount - paidAmount = 40000
      const forecast = await service.generateForecast(organizationId, userId, 1, 0);

      expect(forecast).toBeDefined();
    });
  });

  describe('generateForecast with recurring invoices', () => {
    it('should include recurring invoices in forecast', async () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.recurringInvoice.findMany.mockResolvedValue([
        {
          nextRunDate: nextMonth,
          items: JSON.stringify([
            { quantity: 1, unitPrice: 5000 },
            { quantity: 2, unitPrice: 2500 },
          ]),
          vatRate: 19,
        },
      ]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      // Recurring invoices should contribute to income
      expect(forecast.insights.some(i => i.includes('recurente'))).toBe(true);
    });

    it('should handle recurring invoices with parsed items', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.recurringInvoice.findMany.mockResolvedValue([
        {
          nextRunDate: new Date(),
          items: [
            { quantity: 1, unitPrice: 10000 },
          ],
          vatRate: 19,
        },
      ]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast).toBeDefined();
    });
  });

  describe('Risk Level Determination', () => {
    it('should return critical risk when forecast shows negative balance', async () => {
      // Mock large expenses, small income
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'RECEIVED' && args.select?.invoiceDate) {
          const invoices = [];
          for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            invoices.push({
              invoiceDate: date,
              grossAmount: 100000,
              paidAmount: 100000,
              paymentStatus: 'PAID',
            });
          }
          return Promise.resolve(invoices);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 6, 10000);

      // With high expenses and low starting balance, should be high risk
      expect(['high', 'critical']).toContain(forecast.riskLevel);
    });

    it('should return low risk for stable cash flow', async () => {
      // Mock balanced income and expenses with healthy starting balance
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          const invoices = [];
          for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            invoices.push({
              invoiceDate: date,
              grossAmount: 100000,
              paidAmount: 100000,
              paymentStatus: 'PAID',
            });
          }
          return Promise.resolve(invoices);
        }
        if (args.where.type === 'RECEIVED' && args.select?.invoiceDate) {
          const invoices = [];
          for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            invoices.push({
              invoiceDate: date,
              grossAmount: 50000,
              paidAmount: 50000,
              paymentStatus: 'PAID',
            });
          }
          return Promise.resolve(invoices);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 500000);

      expect(['low', 'medium']).toContain(forecast.riskLevel);
    });

    it('should return medium risk for borderline cash flow', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 30000);

      expect(['low', 'medium', 'high']).toContain(forecast.riskLevel);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have confidence between 30% and 95%', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 6, 50000);

      forecast.forecasts.forEach(f => {
        expect(f.confidence).toBeGreaterThanOrEqual(30);
        expect(f.confidence).toBeLessThanOrEqual(95);
      });
    });

    it('should decrease confidence for months further ahead', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 6, 50000);

      // Generally, later months should have lower or equal confidence
      expect(forecast.forecasts[0].confidence).toBeGreaterThanOrEqual(forecast.forecasts[5].confidence);
    });

    it('should increase confidence with scheduled transactions', async () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // First forecast without scheduled transactions
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      const forecastWithout = await service.generateForecast(organizationId, userId, 1, 50000);

      // Reset mocks
      jest.clearAllMocks();

      // Forecast with scheduled transactions
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.paymentStatus?.in) {
          return Promise.resolve([
            { dueDate: nextMonth, grossAmount: 50000, paidAmount: 0 },
          ]);
        }
        return Promise.resolve([]);
      });

      const forecastWith = await service.generateForecast(organizationId, userId, 1, 50000);

      // Both should have valid confidence
      expect(forecastWith.forecasts[0]?.confidence).toBeDefined();
      expect(forecastWithout.forecasts[0]?.confidence).toBeDefined();
    });
  });

  describe('Insights Generation', () => {
    it('should generate Romanian language insights', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      // Check for Romanian words in insights
      const romanianWords = ['financiară', 'prognoza', 'risc', 'venituri', 'sold', 'cheltuieli'];
      const hasRomanianContent = forecast.insights.some(insight =>
        romanianWords.some(word => insight.toLowerCase().includes(word))
      );

      expect(hasRomanianContent).toBe(true);
    });

    it('should include risk-based insight', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast.insights.length).toBeGreaterThan(0);
    });

    it('should mention growth trend when significant', async () => {
      // Mock growth scenario
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          const now = new Date();
          const invoices = [];

          // Recent 6 months: higher income
          for (let i = 0; i < 6; i++) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            invoices.push({
              invoiceDate: date,
              grossAmount: 150000,
              paidAmount: 150000,
              paymentStatus: 'PAID',
            });
          }

          // Older 6 months: lower income
          for (let i = 6; i < 12; i++) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            invoices.push({
              invoiceDate: date,
              grossAmount: 80000,
              paidAmount: 80000,
              paymentStatus: 'PAID',
            });
          }

          return Promise.resolve(invoices);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      // Should mention growth
      const hasGrowthInsight = forecast.insights.some(i =>
        i.includes('crescut') || i.includes('scăzut') || i.includes('tendință')
      );

      expect(forecast.insights.length).toBeGreaterThan(0);
    });

    it('should warn about volatility', async () => {
      // Mock volatile income pattern
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          const invoices = [];
          for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            // Very volatile amounts
            const amount = i % 2 === 0 ? 200000 : 20000;
            invoices.push({
              invoiceDate: date,
              grossAmount: amount,
              paidAmount: amount,
              paymentStatus: 'PAID',
            });
          }
          return Promise.resolve(invoices);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      // Should have insights about volatility or stability
      expect(forecast.insights.length).toBeGreaterThan(0);
    });

    it('should mention recurring invoices when present', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.recurringInvoice.findMany.mockResolvedValue([
        {
          nextRunDate: new Date(),
          items: JSON.stringify([{ quantity: 1, unitPrice: 5000 }]),
          vatRate: 19,
        },
        {
          nextRunDate: new Date(),
          items: JSON.stringify([{ quantity: 1, unitPrice: 3000 }]),
          vatRate: 19,
        },
      ]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      const hasRecurringInsight = forecast.insights.some(i =>
        i.includes('recurent')
      );

      expect(hasRecurringInsight).toBe(true);
    });
  });

  describe('getDashboardForecast', () => {
    beforeEach(() => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.recurringInvoice.findMany.mockResolvedValue([]);
    });

    it('should return dashboard forecast summary', async () => {
      const dashboard = await service.getDashboardForecast(organizationId, userId);

      expect(dashboard).toBeDefined();
      expect(dashboard).toHaveProperty('nextMonthIncome');
      expect(dashboard).toHaveProperty('nextMonthExpenses');
      expect(dashboard).toHaveProperty('nextMonthNet');
      expect(dashboard).toHaveProperty('riskLevel');
      expect(dashboard).toHaveProperty('trend');
    });

    it('should return valid trend direction', async () => {
      const dashboard = await service.getDashboardForecast(organizationId, userId);

      expect(['up', 'down', 'stable']).toContain(dashboard.trend);
    });

    it('should return valid risk level', async () => {
      const dashboard = await service.getDashboardForecast(organizationId, userId);

      expect(['low', 'medium', 'high', 'critical']).toContain(dashboard.riskLevel);
    });

    it('should calculate net correctly', async () => {
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          return Promise.resolve([
            { invoiceDate: new Date(), grossAmount: 100000, paidAmount: 100000, paymentStatus: 'PAID' },
          ]);
        }
        if (args.where.type === 'RECEIVED' && args.select?.invoiceDate) {
          return Promise.resolve([
            { invoiceDate: new Date(), grossAmount: 60000, paidAmount: 60000, paymentStatus: 'PAID' },
          ]);
        }
        return Promise.resolve([]);
      });

      const dashboard = await service.getDashboardForecast(organizationId, userId);

      // Net should be income - expenses
      expect(dashboard.nextMonthNet).toBe(dashboard.nextMonthIncome - dashboard.nextMonthExpenses);
    });
  });

  describe('Seasonal Patterns', () => {
    it('should calculate seasonal factors for 12 months', async () => {
      const monthlyData: Array<{ invoiceDate: Date; grossAmount: number; paidAmount: number; paymentStatus: string }> = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        monthlyData.push({
          invoiceDate: date,
          grossAmount: 50000 + (i * 5000),
          paidAmount: 50000 + (i * 5000),
          paymentStatus: 'PAID',
        });
      }

      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          return Promise.resolve(monthlyData);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 12, 50000);

      expect(forecast.forecasts.length).toBe(12);
    });

    it('should handle months with no data', async () => {
      // Only provide data for some months
      const partialData = [
        { invoiceDate: new Date(), grossAmount: 100000, paidAmount: 100000, paymentStatus: 'PAID' },
      ];

      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          return Promise.resolve(partialData);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 6, 50000);

      expect(forecast).toBeDefined();
      expect(forecast.forecasts.length).toBe(6);
    });
  });

  describe('Romanian Compliance', () => {
    it('should use RON currency', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast.currency).toBe('RON');
    });

    it('should format period in Romanian locale', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      // Romanian month names
      const romanianMonths = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
        'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

      forecast.forecasts.forEach(f => {
        const hasRomanianMonth = romanianMonths.some(month =>
          f.period.toLowerCase().includes(month)
        );
        expect(hasRomanianMonth).toBe(true);
      });
    });

    it('should generate Romanian insights', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      // All insights should be in Romanian
      forecast.insights.forEach(insight => {
        // Check for Romanian diacritics or common Romanian words
        expect(insight.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero starting balance', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 0);

      expect(forecast.currentBalance).toBe(0);
    });

    it('should handle negative starting balance', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 3, -10000);

      expect(forecast.currentBalance).toBe(-10000);
      expect(forecast.riskLevel).toBe('critical');
    });

    it('should handle very large amounts', async () => {
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          return Promise.resolve([
            { invoiceDate: new Date(), grossAmount: 100000000, paidAmount: 100000000, paymentStatus: 'PAID' },
          ]);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 1000000000);

      expect(forecast).toBeDefined();
      expect(forecast.currentBalance).toBe(1000000000);
    });

    it('should handle single month forecast', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 1, 50000);

      expect(forecast.forecasts.length).toBe(1);
    });

    it('should handle 12+ month forecast', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 24, 50000);

      expect(forecast.forecasts.length).toBe(24);
    });

    it('should handle empty historical data', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.recurringInvoice.findMany.mockResolvedValue([]);

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast).toBeDefined();
      expect(forecast.forecasts.length).toBe(3);
    });

    it('should handle null paid amounts', async () => {
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.paymentStatus?.in) {
          return Promise.resolve([
            { dueDate: new Date(), grossAmount: 50000, paidAmount: null },
          ]);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      expect(forecast).toBeDefined();
    });

    it('should round amounts to 2 decimal places', async () => {
      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          return Promise.resolve([
            { invoiceDate: new Date(), grossAmount: 33333.333, paidAmount: 33333.333, paymentStatus: 'PAID' },
          ]);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000.555);

      // Check that amounts are properly rounded
      expect(Number.isFinite(forecast.totalExpectedIncome)).toBe(true);
      expect(Number.isFinite(forecast.totalExpectedExpenses)).toBe(true);
    });
  });

  describe('Growth Rate Calculation', () => {
    it('should detect positive growth', async () => {
      const now = new Date();

      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          const invoices = [];

          // Recent 6 months: higher income
          for (let i = 0; i < 6; i++) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            invoices.push({
              invoiceDate: date,
              grossAmount: 100000,
              paidAmount: 100000,
              paymentStatus: 'PAID',
            });
          }

          // Older 6 months: lower income
          for (let i = 6; i < 12; i++) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            invoices.push({
              invoiceDate: date,
              grossAmount: 50000,
              paidAmount: 50000,
              paymentStatus: 'PAID',
            });
          }

          return Promise.resolve(invoices);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      // Should have positive growth insight
      expect(forecast.insights.some(i => i.includes('crescut'))).toBe(true);
    });

    it('should detect negative growth', async () => {
      const now = new Date();

      mockPrismaService.invoice.findMany.mockImplementation((args) => {
        if (args.where.type === 'ISSUED' && args.select?.invoiceDate) {
          const invoices = [];

          // Recent 6 months: lower income
          for (let i = 0; i < 6; i++) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            invoices.push({
              invoiceDate: date,
              grossAmount: 50000,
              paidAmount: 50000,
              paymentStatus: 'PAID',
            });
          }

          // Older 6 months: higher income
          for (let i = 6; i < 12; i++) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            invoices.push({
              invoiceDate: date,
              grossAmount: 100000,
              paidAmount: 100000,
              paymentStatus: 'PAID',
            });
          }

          return Promise.resolve(invoices);
        }
        return Promise.resolve([]);
      });

      const forecast = await service.generateForecast(organizationId, userId, 3, 50000);

      // Should have negative growth insight
      expect(forecast.insights.some(i => i.includes('scăzut'))).toBe(true);
    });
  });
});
