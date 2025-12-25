import { Test, TestingModule } from '@nestjs/testing';
import {
  AccountingService,
  LedgerAccount,
  JournalEntry,
  TrialBalanceRow,
} from './accounting.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AccountingService', () => {
  let service: AccountingService;

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    journalEntry: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AccountingService>(AccountingService);
    jest.clearAllMocks();
    mockPrismaService.invoice.findMany.mockResolvedValue([]);
    mockPrismaService.journalEntry.findMany.mockResolvedValue([]);
    mockPrismaService.payment.findMany.mockResolvedValue([]);
    mockPrismaService.expense.findMany.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Chart of Accounts (Plan de Conturi)', () => {
    describe('getChartOfAccounts', () => {
      it('should return chart of accounts', async () => {
        const accounts = await service.getChartOfAccounts('user_123');

        expect(Array.isArray(accounts)).toBe(true);
        expect(accounts.length).toBeGreaterThan(0);
      });

      it('should include Romanian account codes', async () => {
        const accounts = await service.getChartOfAccounts('user_123');

        // Check for standard Romanian account codes
        const capitalSocial = accounts.find(a => a.code === '101');
        const clienti = accounts.find(a => a.code === '411');
        const furnizori = accounts.find(a => a.code === '401');

        expect(capitalSocial).toBeDefined();
        expect(clienti).toBeDefined();
        expect(furnizori).toBeDefined();
      });

      it('should have Romanian account names', async () => {
        const accounts = await service.getChartOfAccounts('user_123');

        const capitalSocial = accounts.find(a => a.code === '101');
        expect(capitalSocial?.name).toBe('Capital social');
      });

      it('should include all account types', async () => {
        const accounts = await service.getChartOfAccounts('user_123');

        const types = new Set(accounts.map(a => a.type));
        expect(types.has('ASSET')).toBe(true);
        expect(types.has('LIABILITY')).toBe(true);
        expect(types.has('EQUITY')).toBe(true);
        expect(types.has('REVENUE')).toBe(true);
        expect(types.has('EXPENSE')).toBe(true);
      });

      it('should include TVA accounts', async () => {
        const accounts = await service.getChartOfAccounts('user_123');

        const tvaPlata = accounts.find(a => a.code === '4423');
        const tvaDeductibila = accounts.find(a => a.code === '4426');
        const tvaColectata = accounts.find(a => a.code === '4427');

        expect(tvaPlata?.name).toBe('TVA de plata');
        expect(tvaDeductibila?.name).toBe('TVA deductibila');
        expect(tvaColectata?.name).toBe('TVA colectata');
      });

      it('should include treasury accounts', async () => {
        const accounts = await service.getChartOfAccounts('user_123');

        const conturiBanci = accounts.find(a => a.code === '5121');
        const casa = accounts.find(a => a.code === '531');

        expect(conturiBanci?.name).toBe('Conturi la banci in lei');
        expect(casa?.name).toBe('Casa');
      });

      it('should include expense accounts (Class 6)', async () => {
        const accounts = await service.getChartOfAccounts('user_123');

        const cheltuieliSalarii = accounts.find(a => a.code === '641');
        const amortizari = accounts.find(a => a.code === '681');

        expect(cheltuieliSalarii?.name).toBe('Cheltuieli cu salariile');
        expect(amortizari?.name).toBe('Cheltuieli cu amortizarile');
      });

      it('should include revenue accounts (Class 7)', async () => {
        const accounts = await service.getChartOfAccounts('user_123');

        const venituriServicii = accounts.find(a => a.code === '704');
        const venituriMarfuri = accounts.find(a => a.code === '707');

        expect(venituriServicii?.name).toBe('Venituri din lucrari executate si servicii');
        expect(venituriMarfuri?.name).toBe('Venituri din vanzarea marfurilor');
      });
    });
  });

  describe('General Ledger', () => {
    describe('getGeneralLedger', () => {
      it('should return general ledger entries', async () => {
        const ledger = await service.getGeneralLedger('user_123');

        expect(ledger).toBeDefined();
      });

      it('should filter by account code', async () => {
        const ledger = await service.getGeneralLedger('user_123', { accountCode: '411' });

        expect(ledger).toBeDefined();
      });

      it('should accept date range', async () => {
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2025-01-31');

        const ledger = await service.getGeneralLedger('user_123', {
          accountCode: '411',
          startDate,
          endDate,
        });

        expect(ledger).toBeDefined();
      });
    });
  });

  describe('Journal Entries', () => {
    describe('getJournalEntries', () => {
      it('should return journal entries', async () => {
        const entries = await service.getJournalEntries('user_123');

        expect(Array.isArray(entries)).toBe(true);
      });

      it('should filter by date range', async () => {
        const entries = await service.getJournalEntries('user_123', {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        });

        expect(entries).toBeDefined();
      });

      it('should filter by status', async () => {
        const entries = await service.getJournalEntries('user_123', {
          status: 'POSTED',
        });

        expect(entries).toBeDefined();
      });
    });
  });

  describe('Trial Balance (Balanta de Verificare)', () => {
    describe('getTrialBalance', () => {
      it('should return trial balance', async () => {
        const balance = await service.getTrialBalance('user_123');

        expect(balance).toBeDefined();
      });

      it('should accept date range options', async () => {
        const balance = await service.getTrialBalance('user_123', {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        });

        expect(balance).toBeDefined();
      });
    });
  });

  describe('Financial Statements', () => {
    describe('getBalanceSheet', () => {
      it('should return balance sheet', async () => {
        const balanceSheet = await service.getBalanceSheet('user_123', new Date('2025-01-31'));

        expect(balanceSheet).toBeDefined();
      });

      it('should return FinancialStatement type', async () => {
        const balanceSheet = await service.getBalanceSheet('user_123', new Date('2025-01-31'));

        expect(balanceSheet.type).toBe('BALANCE_SHEET');
      });

      it('should include period info', async () => {
        const balanceSheet = await service.getBalanceSheet('user_123', new Date('2025-01-31'));

        expect(balanceSheet.period).toBeDefined();
      });

      it('should include data', async () => {
        const balanceSheet = await service.getBalanceSheet('user_123', new Date('2025-01-31'));

        expect(balanceSheet.data).toBeDefined();
      });
    });

    describe('getProfitLoss', () => {
      it('should return profit/loss statement', async () => {
        const pnl = await service.getProfitLoss(
          'user_123',
          new Date('2025-01-01'),
          new Date('2025-01-31'),
        );

        expect(pnl).toBeDefined();
      });

      it('should return FinancialStatement type', async () => {
        const pnl = await service.getProfitLoss(
          'user_123',
          new Date('2025-01-01'),
          new Date('2025-01-31'),
        );

        expect(pnl.type).toBe('PROFIT_LOSS');
      });

      it('should include period info', async () => {
        const pnl = await service.getProfitLoss(
          'user_123',
          new Date('2025-01-01'),
          new Date('2025-01-31'),
        );

        expect(pnl.period).toBeDefined();
        expect(pnl.period.startDate).toBeDefined();
        expect(pnl.period.endDate).toBeDefined();
      });

      it('should include data', async () => {
        const pnl = await service.getProfitLoss(
          'user_123',
          new Date('2025-01-01'),
          new Date('2025-01-31'),
        );

        expect(pnl.data).toBeDefined();
      });
    });

    describe('getCashFlow', () => {
      it('should return cash flow statement', async () => {
        const cashFlow = await service.getCashFlow(
          'user_123',
          new Date('2025-01-01'),
          new Date('2025-01-31'),
        );

        expect(cashFlow).toBeDefined();
      });

      it('should return FinancialStatement type', async () => {
        const cashFlow = await service.getCashFlow(
          'user_123',
          new Date('2025-01-01'),
          new Date('2025-01-31'),
        );

        expect(cashFlow.type).toBe('CASH_FLOW');
      });

      it('should include period info', async () => {
        const cashFlow = await service.getCashFlow(
          'user_123',
          new Date('2025-01-01'),
          new Date('2025-01-31'),
        );

        expect(cashFlow.period).toBeDefined();
      });

      it('should include data', async () => {
        const cashFlow = await service.getCashFlow(
          'user_123',
          new Date('2025-01-01'),
          new Date('2025-01-31'),
        );

        expect(cashFlow.data).toBeDefined();
      });
    });
  });

  describe('Year-End Closing (Inchidere An)', () => {
    describe('initiateYearEndClosing', () => {
      it('should initiate year-end closing', async () => {
        const result = await service.initiateYearEndClosing('user_123', 2025);

        expect(result).toBeDefined();
      });

      it('should include steps', async () => {
        const result = await service.initiateYearEndClosing('user_123', 2025);

        expect(result.steps).toBeDefined();
        expect(Array.isArray(result.steps)).toBe(true);
      });

      it('should include status', async () => {
        const result = await service.initiateYearEndClosing('user_123', 2025);

        expect(result.status).toBeDefined();
      });
    });

    describe('getYearEndChecklist', () => {
      it('should return year-end checklist', async () => {
        const result = await service.getYearEndChecklist('user_123', 2025);

        expect(result.checklist).toBeDefined();
        expect(Array.isArray(result.checklist)).toBe(true);
      });
    });
  });

  describe('Financial Ratios', () => {
    describe('getFinancialRatios', () => {
      it('should return financial ratios', async () => {
        const ratios = await service.getFinancialRatios('user_123');

        expect(ratios).toBeDefined();
      });

      it('should include liquidity ratios', async () => {
        const ratios = await service.getFinancialRatios('user_123');

        expect(ratios.liquidity).toBeDefined();
      });

      it('should include profitability ratios', async () => {
        const ratios = await service.getFinancialRatios('user_123');

        expect(ratios.profitability).toBeDefined();
      });

      it('should include solvency ratios', async () => {
        const ratios = await service.getFinancialRatios('user_123');

        expect(ratios.solvency).toBeDefined();
      });

      it('should include efficiency ratios', async () => {
        const ratios = await service.getFinancialRatios('user_123');

        expect(ratios.efficiency).toBeDefined();
      });
    });
  });

  describe('Profit Margin Analysis', () => {
    describe('getProfitMarginAnalysis', () => {
      it('should return profit margin analysis', async () => {
        const analysis = await service.getProfitMarginAnalysis('user_123', {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
        });

        expect(analysis).toBeDefined();
      });

      it('should include summary with gross margin', async () => {
        const analysis = await service.getProfitMarginAnalysis('user_123');

        expect(analysis.summary).toBeDefined();
        expect(typeof analysis.summary.grossMargin).toBe('number');
      });

      it('should include summary with operating margin', async () => {
        const analysis = await service.getProfitMarginAnalysis('user_123');

        expect(analysis.summary.operatingMargin).toBeDefined();
      });

      it('should include summary with net margin', async () => {
        const analysis = await service.getProfitMarginAnalysis('user_123');

        expect(analysis.summary.netMargin).toBeDefined();
      });

      it('should include breakdown', async () => {
        const analysis = await service.getProfitMarginAnalysis('user_123');

        expect(analysis.breakdown).toBeDefined();
      });
    });
  });

  describe('Contribution Margin', () => {
    describe('getContributionMarginAnalysis', () => {
      it('should return contribution margin analysis', async () => {
        const analysis = await service.getContributionMarginAnalysis('user_123', {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
        });

        expect(analysis).toBeDefined();
      });
    });
  });

  describe('Deferred Revenue (Venituri in Avans)', () => {
    describe('createDeferredRevenue', () => {
      it('should create deferred revenue record', async () => {
        const result = await service.createDeferredRevenue('user_123', {
          invoiceId: 'inv_123',
          customerId: 'cust_123',
          customerName: 'SC Client SRL',
          description: 'Abonament anual',
          totalAmount: 12000,
          currency: 'RON',
          serviceStartDate: new Date('2025-01-01'),
          serviceEndDate: new Date('2025-12-31'),
          recognitionMethod: 'straight_line',
        });

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
      });
    });

    describe('processRevenueRecognition', () => {
      it('should process revenue recognition', async () => {
        const result = await service.processRevenueRecognition(
          'user_123',
          '2025-01',
        );

        expect(result).toBeDefined();
      });
    });

    describe('getDeferredRevenueSummary', () => {
      it('should return deferred revenue summary', async () => {
        const summary = await service.getDeferredRevenueSummary('user_123');

        expect(summary).toBeDefined();
      });
    });

    describe('getDeferredRevenueRecords', () => {
      it('should return deferred revenue records', async () => {
        const records = await service.getDeferredRevenueRecords('user_123');

        expect(Array.isArray(records)).toBe(true);
      });
    });
  });

  describe('Romanian Accounting Standards', () => {
    it('should follow Romanian chart of accounts structure', async () => {
      const accounts = await service.getChartOfAccounts('user_123');

      // Class 1 - Capital (100-199)
      const class1 = accounts.filter(a => a.code.startsWith('1'));
      expect(class1.length).toBeGreaterThan(0);

      // Class 4 - Third parties (400-499)
      const class4 = accounts.filter(a => a.code.startsWith('4'));
      expect(class4.length).toBeGreaterThan(0);

      // Class 5 - Treasury (500-599)
      const class5 = accounts.filter(a => a.code.startsWith('5'));
      expect(class5.length).toBeGreaterThan(0);

      // Class 6 - Expenses (600-699)
      const class6 = accounts.filter(a => a.code.startsWith('6'));
      expect(class6.length).toBeGreaterThan(0);

      // Class 7 - Revenue (700-799)
      const class7 = accounts.filter(a => a.code.startsWith('7'));
      expect(class7.length).toBeGreaterThan(0);
    });

    it('should include social contributions account', async () => {
      const accounts = await service.getChartOfAccounts('user_123');

      const asigurariSociale = accounts.find(a => a.code === '431');
      expect(asigurariSociale?.name).toBe('Asigurari sociale');
    });

    it('should include profit tax account', async () => {
      const accounts = await service.getChartOfAccounts('user_123');

      const impozitProfit = accounts.find(a => a.code === '441');
      expect(impozitProfit?.name).toBe('Impozit pe profit');
    });

    it('should include retained earnings account', async () => {
      const accounts = await service.getChartOfAccounts('user_123');

      const rezultatReportat = accounts.find(a => a.code === '117');
      expect(rezultatReportat?.name).toBe('Rezultatul reportat');
    });
  });

  describe('Account Types', () => {
    it('should classify assets correctly', async () => {
      const accounts = await service.getChartOfAccounts('user_123');

      const clienti = accounts.find(a => a.code === '411');
      const banci = accounts.find(a => a.code === '5121');
      const casa = accounts.find(a => a.code === '531');

      expect(clienti?.type).toBe('ASSET');
      expect(banci?.type).toBe('ASSET');
      expect(casa?.type).toBe('ASSET');
    });

    it('should classify liabilities correctly', async () => {
      const accounts = await service.getChartOfAccounts('user_123');

      const furnizori = accounts.find(a => a.code === '401');
      const salarii = accounts.find(a => a.code === '421');
      const tvaPlata = accounts.find(a => a.code === '4423');

      expect(furnizori?.type).toBe('LIABILITY');
      expect(salarii?.type).toBe('LIABILITY');
      expect(tvaPlata?.type).toBe('LIABILITY');
    });

    it('should classify equity correctly', async () => {
      const accounts = await service.getChartOfAccounts('user_123');

      const capital = accounts.find(a => a.code === '101');
      const profitPierdere = accounts.find(a => a.code === '121');

      expect(capital?.type).toBe('EQUITY');
      expect(profitPierdere?.type).toBe('EQUITY');
    });

    it('should classify expenses correctly', async () => {
      const accounts = await service.getChartOfAccounts('user_123');

      const cheltuieliSalarii = accounts.find(a => a.code === '641');
      const cheltuieliAmortizari = accounts.find(a => a.code === '681');

      expect(cheltuieliSalarii?.type).toBe('EXPENSE');
      expect(cheltuieliAmortizari?.type).toBe('EXPENSE');
    });

    it('should classify revenue correctly', async () => {
      const accounts = await service.getChartOfAccounts('user_123');

      const venituriServicii = accounts.find(a => a.code === '704');
      const venituriDobanzi = accounts.find(a => a.code === '766');

      expect(venituriServicii?.type).toBe('REVENUE');
      expect(venituriDobanzi?.type).toBe('REVENUE');
    });
  });
});
