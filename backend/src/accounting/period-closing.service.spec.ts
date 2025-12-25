import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  PeriodClosingService,
  PeriodStatus,
  AccountingPeriod,
  ValidationResult,
} from './period-closing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PeriodClosingService', () => {
  let service: PeriodClosingService;

  const mockPrismaService = {
    invoice: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeriodClosingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PeriodClosingService>(PeriodClosingService);
    jest.clearAllMocks();
    mockPrismaService.invoice.count.mockResolvedValue(0);
    mockPrismaService.invoice.findMany.mockResolvedValue([]);
    mockPrismaService.auditLog.create.mockResolvedValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreatePeriod', () => {
    it('should create a new period', async () => {
      const period = await service.getOrCreatePeriod('user_123', '2025-01');

      expect(period).toBeDefined();
      expect(period.userId).toBe('user_123');
      expect(period.period).toBe('2025-01');
      expect(period.year).toBe(2025);
      expect(period.month).toBe(1);
    });

    it('should return existing period on second call', async () => {
      const period1 = await service.getOrCreatePeriod('user_123', '2025-01');
      const period2 = await service.getOrCreatePeriod('user_123', '2025-01');

      expect(period1.id).toBe(period2.id);
    });

    it('should set OPEN status by default', async () => {
      const period = await service.getOrCreatePeriod('user_123', '2025-01');

      expect(period.status).toBe(PeriodStatus.OPEN);
    });

    it('should calculate correct start date', async () => {
      const period = await service.getOrCreatePeriod('user_123', '2025-03');

      expect(period.startDate.getFullYear()).toBe(2025);
      expect(period.startDate.getMonth()).toBe(2); // March (0-indexed)
      expect(period.startDate.getDate()).toBe(1);
    });

    it('should calculate correct end date', async () => {
      const period = await service.getOrCreatePeriod('user_123', '2025-02');

      expect(period.endDate.getFullYear()).toBe(2025);
      expect(period.endDate.getMonth()).toBe(1); // February
      expect(period.endDate.getDate()).toBe(28); // Feb 2025 has 28 days
    });

    it('should initialize empty validation errors', async () => {
      const period = await service.getOrCreatePeriod('user_123', '2025-01');

      expect(period.validationErrors).toEqual([]);
    });

    it('should generate closing checklist', async () => {
      const period = await service.getOrCreatePeriod('user_123', '2025-01');

      expect(period.closingChecklist).toBeDefined();
      expect(period.closingChecklist.length).toBeGreaterThan(0);
    });
  });

  describe('getPeriods', () => {
    it('should return periods for user', async () => {
      await service.getOrCreatePeriod('user_123', '2025-01');
      await service.getOrCreatePeriod('user_123', '2025-02');

      const periods = await service.getPeriods('user_123');

      expect(periods.length).toBe(2);
    });

    it('should filter by year', async () => {
      await service.getOrCreatePeriod('user_123', '2024-12');
      await service.getOrCreatePeriod('user_123', '2025-01');

      const periods = await service.getPeriods('user_123', 2025);

      expect(periods.length).toBe(1);
      expect(periods[0].year).toBe(2025);
    });

    it('should sort by period descending', async () => {
      await service.getOrCreatePeriod('user_123', '2025-01');
      await service.getOrCreatePeriod('user_123', '2025-03');
      await service.getOrCreatePeriod('user_123', '2025-02');

      const periods = await service.getPeriods('user_123');

      expect(periods[0].period).toBe('2025-03');
      expect(periods[1].period).toBe('2025-02');
      expect(periods[2].period).toBe('2025-01');
    });
  });

  describe('getPeriodStatus', () => {
    it('should return period status', async () => {
      const period = await service.getPeriodStatus('user_123', '2025-01');

      expect(period.status).toBe(PeriodStatus.OPEN);
    });

    it('should create period if not exists', async () => {
      const period = await service.getPeriodStatus('user_new', '2025-06');

      expect(period).toBeDefined();
      expect(period.userId).toBe('user_new');
    });
  });

  describe('validatePeriodForClosing', () => {
    it('should return valid for new period', async () => {
      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return invalid for already closed period', async () => {
      await service.getOrCreatePeriod('user_123', '2025-01');
      await service.closePeriod('user_123', '2025-01', 'admin');

      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('deja inchisa'))).toBe(true);
    });

    it('should include checklist items', async () => {
      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      expect(result.checklist).toBeDefined();
      expect(result.checklist.length).toBeGreaterThan(0);
    });

    it('should check previous periods', async () => {
      const result = await service.validatePeriodForClosing('user_123', '2025-02');

      const prevPeriodItem = result.checklist.find(c => c.id === 'previous_periods');
      expect(prevPeriodItem).toBeDefined();
    });

    it('should check invoices', async () => {
      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      const invoicesItem = result.checklist.find(c => c.id === 'invoices');
      expect(invoicesItem).toBeDefined();
    });

    it('should check bank reconciliation', async () => {
      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      const bankItem = result.checklist.find(c => c.id === 'bank_reconciliation');
      expect(bankItem).toBeDefined();
    });

    it('should check VAT declaration', async () => {
      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      const vatItem = result.checklist.find(c => c.id === 'vat_declaration');
      expect(vatItem).toBeDefined();
    });

    it('should check trial balance', async () => {
      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      const trialBalanceItem = result.checklist.find(c => c.id === 'trial_balance');
      expect(trialBalanceItem).toBeDefined();
    });

    it('should warn about draft invoices', async () => {
      mockPrismaService.invoice.count
        .mockResolvedValueOnce(10) // total invoices
        .mockResolvedValueOnce(2);  // draft invoices

      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      expect(result.warnings.some(w => w.includes('Draft'))).toBe(true);
    });
  });

  describe('closePeriod', () => {
    it('should close a valid period', async () => {
      const result = await service.closePeriod('user_123', '2025-01', 'admin');

      expect(result.success).toBe(true);
      expect(result.period.status).toBe(PeriodStatus.CLOSED);
    });

    it('should set closedAt timestamp', async () => {
      const result = await service.closePeriod('user_123', '2025-01', 'admin');

      expect(result.period.closedAt).toBeDefined();
    });

    it('should set closedBy', async () => {
      const result = await service.closePeriod('user_123', '2025-01', 'admin@company.ro');

      expect(result.period.closedBy).toBe('admin@company.ro');
    });

    it('should return summary', async () => {
      const result = await service.closePeriod('user_123', '2025-01', 'admin');

      expect(result.summary).toBeDefined();
      expect(typeof result.summary.totalInvoices).toBe('number');
      expect(typeof result.summary.revenue).toBe('number');
      expect(typeof result.summary.expenses).toBe('number');
      expect(typeof result.summary.netIncome).toBe('number');
    });

    it('should create audit log', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PERIOD_CLOSED',
            entity: 'ACCOUNTING_PERIOD',
          }),
        }),
      );
    });

    it('should return errors for invalid period', async () => {
      // Close the period first
      await service.closePeriod('user_123', '2025-01', 'admin');

      // Try to close again
      const result = await service.closePeriod('user_123', '2025-01', 'admin');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('lockPeriod', () => {
    it('should lock a closed period', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');

      const period = await service.lockPeriod('user_123', '2025-01');

      expect(period.status).toBe(PeriodStatus.LOCKED);
    });

    it('should set lockedAt timestamp', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');

      const period = await service.lockPeriod('user_123', '2025-01');

      expect(period.lockedAt).toBeDefined();
    });

    it('should throw error for open period', async () => {
      await service.getOrCreatePeriod('user_123', '2025-01');

      await expect(
        service.lockPeriod('user_123', '2025-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error with Romanian message', async () => {
      await service.getOrCreatePeriod('user_123', '2025-01');

      await expect(service.lockPeriod('user_123', '2025-01')).rejects.toThrow(
        'Perioada trebuie inchisa inainte de blocare',
      );
    });

    it('should create audit log', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');
      jest.clearAllMocks();

      await service.lockPeriod('user_123', '2025-01');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PERIOD_LOCKED',
          }),
        }),
      );
    });
  });

  describe('reopenPeriod', () => {
    it('should reopen a closed period', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');

      const period = await service.reopenPeriod('user_123', '2025-01', 'Corectare factura');

      expect(period.status).toBe(PeriodStatus.OPEN);
    });

    it('should increment reopenedCount', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');
      await service.reopenPeriod('user_123', '2025-01', 'Reason 1');

      await service.closePeriod('user_123', '2025-01', 'admin');
      const period = await service.reopenPeriod('user_123', '2025-01', 'Reason 2');

      expect(period.reopenedCount).toBe(2);
    });

    it('should store reason in notes', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');

      const period = await service.reopenPeriod('user_123', '2025-01', 'Corectare eroare TVA');

      expect(period.notes).toBe('Corectare eroare TVA');
    });

    it('should throw error for locked period', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');
      await service.lockPeriod('user_123', '2025-01');

      await expect(
        service.reopenPeriod('user_123', '2025-01', 'Test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error with Romanian message for locked', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');
      await service.lockPeriod('user_123', '2025-01');

      await expect(
        service.reopenPeriod('user_123', '2025-01', 'Test'),
      ).rejects.toThrow('blocata si nu poate fi redeschisa');
    });

    it('should throw error for already open period', async () => {
      await service.getOrCreatePeriod('user_123', '2025-01');

      await expect(
        service.reopenPeriod('user_123', '2025-01', 'Test'),
      ).rejects.toThrow('deja deschisa');
    });

    it('should create audit log', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');
      jest.clearAllMocks();

      await service.reopenPeriod('user_123', '2025-01', 'Corectare');

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PERIOD_REOPENED',
          }),
        }),
      );
    });
  });

  describe('getClosingChecklist', () => {
    it('should return checklist', async () => {
      const checklist = await service.getClosingChecklist('user_123', '2025-01');

      expect(Array.isArray(checklist)).toBe(true);
      expect(checklist.length).toBeGreaterThan(0);
    });

    it('should include required items', async () => {
      const checklist = await service.getClosingChecklist('user_123', '2025-01');

      const requiredItems = checklist.filter(c => c.required);
      expect(requiredItems.length).toBeGreaterThan(0);
    });

    it('should include invoices check', async () => {
      const checklist = await service.getClosingChecklist('user_123', '2025-01');

      const invoicesItem = checklist.find(c => c.id === 'invoices');
      expect(invoicesItem?.required).toBe(true);
    });

    it('should include trial balance check', async () => {
      const checklist = await service.getClosingChecklist('user_123', '2025-01');

      const trialBalanceItem = checklist.find(c => c.id === 'trial_balance');
      expect(trialBalanceItem?.required).toBe(true);
    });

    it('should include depreciation check', async () => {
      const checklist = await service.getClosingChecklist('user_123', '2025-01');

      const depreciationItem = checklist.find(c => c.id === 'depreciation');
      expect(depreciationItem).toBeDefined();
    });

    it('should include payroll check', async () => {
      const checklist = await service.getClosingChecklist('user_123', '2025-01');

      const payrollItem = checklist.find(c => c.id === 'payroll');
      expect(payrollItem).toBeDefined();
    });
  });

  describe('getPeriodSummary', () => {
    it('should return period with summary', async () => {
      const result = await service.getPeriodSummary('user_123', '2025-01');

      expect(result.period).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.validation).toBeDefined();
    });

    it('should include financial summary', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { type: 'ISSUED', netAmount: 10000 },
        { type: 'ISSUED', netAmount: 5000 },
        { type: 'RECEIVED', netAmount: 3000 },
      ]);

      const result = await service.getPeriodSummary('user_123', '2025-01');

      expect(result.summary.revenue).toBe(15000);
      expect(result.summary.expenses).toBe(3000);
      expect(result.summary.netIncome).toBe(12000);
    });

    it('should include invoice count', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { type: 'ISSUED', netAmount: 1000 },
        { type: 'ISSUED', netAmount: 2000 },
      ]);

      const result = await service.getPeriodSummary('user_123', '2025-01');

      expect(result.summary.totalInvoices).toBe(2);
    });
  });

  describe('Period Statuses', () => {
    it('should support OPEN status', async () => {
      const period = await service.getOrCreatePeriod('user_123', '2025-01');
      expect(period.status).toBe(PeriodStatus.OPEN);
    });

    it('should support CLOSING status', () => {
      expect(PeriodStatus.CLOSING).toBe('CLOSING');
    });

    it('should support CLOSED status', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');
      const period = await service.getPeriodStatus('user_123', '2025-01');
      expect(period.status).toBe(PeriodStatus.CLOSED);
    });

    it('should support LOCKED status', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');
      const period = await service.lockPeriod('user_123', '2025-01');
      expect(period.status).toBe(PeriodStatus.LOCKED);
    });
  });

  describe('Romanian Localization', () => {
    it('should have Romanian checklist names', async () => {
      const checklist = await service.getClosingChecklist('user_123', '2025-01');

      const perioadeItem = checklist.find(c => c.name.includes('Perioade'));
      const facturiItem = checklist.find(c => c.name === 'Facturi');
      const balantaItem = checklist.find(c => c.name.includes('Balanta'));

      expect(perioadeItem).toBeDefined();
      expect(facturiItem).toBeDefined();
      expect(balantaItem).toBeDefined();
    });

    it('should have Romanian descriptions', async () => {
      const checklist = await service.getClosingChecklist('user_123', '2025-01');

      const facturiItem = checklist.find(c => c.id === 'invoices');
      expect(facturiItem?.description).toContain('inregistrate');
    });

    it('should have Romanian error messages', async () => {
      await service.closePeriod('user_123', '2025-01', 'admin');
      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      expect(result.errors.some(e => e.includes('inchisa'))).toBe(true);
    });
  });

  describe('Checklist Item Statuses', () => {
    it('should support pending status', async () => {
      const period = await service.getOrCreatePeriod('user_123', '2025-01');
      const pendingItems = period.closingChecklist.filter(c => c.status === 'pending');
      expect(pendingItems.length).toBeGreaterThan(0);
    });

    it('should update to passed status', async () => {
      const result = await service.validatePeriodForClosing('user_123', '2025-01');
      const passedItems = result.checklist.filter(c => c.status === 'passed');
      expect(passedItems.length).toBeGreaterThan(0);
    });
  });

  describe('Previous Period Handling', () => {
    it('should calculate previous month correctly', async () => {
      // February -> January
      await service.getOrCreatePeriod('user_123', '2025-01');
      const result = await service.validatePeriodForClosing('user_123', '2025-02');

      expect(result.checklist).toBeDefined();
    });

    it('should handle year boundary (January -> December)', async () => {
      await service.getOrCreatePeriod('user_123', '2024-12');
      const result = await service.validatePeriodForClosing('user_123', '2025-01');

      expect(result.valid).toBe(true);
    });

    it('should warn if previous period is open', async () => {
      await service.getOrCreatePeriod('user_123', '2025-01');
      const result = await service.validatePeriodForClosing('user_123', '2025-02');

      expect(result.warnings.some(w => w.includes('anterioara'))).toBe(true);
    });
  });
});
