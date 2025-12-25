import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Period Status
export enum PeriodStatus {
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  LOCKED = 'LOCKED',
}

// Accounting Period interface
export interface AccountingPeriod {
  id: string;
  userId: string;
  period: string; // YYYY-MM format
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
  status: PeriodStatus;
  closedAt?: Date;
  closedBy?: string;
  lockedAt?: Date;
  reopenedCount: number;
  notes?: string;
  validationErrors: string[];
  closingChecklist: ClosingChecklistItem[];
}

export interface ClosingChecklistItem {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  message?: string;
  required: boolean;
}

export interface PeriodClosingResult {
  success: boolean;
  period: AccountingPeriod;
  errors: string[];
  warnings: string[];
  summary: {
    totalInvoices: number;
    totalPayments: number;
    totalJournalEntries: number;
    revenue: number;
    expenses: number;
    netIncome: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checklist: ClosingChecklistItem[];
}

@Injectable()
export class PeriodClosingService {
  private readonly logger = new Logger(PeriodClosingService.name);
  private periods: Map<string, AccountingPeriod> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * Get or create an accounting period
   */
  async getOrCreatePeriod(userId: string, period: string): Promise<AccountingPeriod> {
    const key = `${userId}-${period}`;

    if (this.periods.has(key)) {
      return this.periods.get(key)!;
    }

    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    const accountingPeriod: AccountingPeriod = {
      id: key,
      userId,
      period,
      year,
      month,
      startDate,
      endDate,
      status: PeriodStatus.OPEN,
      reopenedCount: 0,
      validationErrors: [],
      closingChecklist: this.generateChecklist(),
    };

    this.periods.set(key, accountingPeriod);
    return accountingPeriod;
  }

  /**
   * Get all periods for a user
   */
  async getPeriods(userId: string, year?: number): Promise<AccountingPeriod[]> {
    const periods = Array.from(this.periods.values())
      .filter(p => p.userId === userId)
      .filter(p => !year || p.year === year)
      .sort((a, b) => b.period.localeCompare(a.period));

    return periods;
  }

  /**
   * Get period status
   */
  async getPeriodStatus(userId: string, period: string): Promise<AccountingPeriod> {
    return this.getOrCreatePeriod(userId, period);
  }

  /**
   * Validate period for closing
   */
  async validatePeriodForClosing(userId: string, period: string): Promise<ValidationResult> {
    const accountingPeriod = await this.getOrCreatePeriod(userId, period);
    const errors: string[] = [];
    const warnings: string[] = [];
    const checklist = this.generateChecklist();

    // Check if already closed
    if (accountingPeriod.status === PeriodStatus.CLOSED || accountingPeriod.status === PeriodStatus.LOCKED) {
      errors.push(`Perioada ${period} este deja inchisa`);
      return { valid: false, errors, warnings, checklist };
    }

    // Check previous periods are closed
    const previousPeriod = this.getPreviousPeriod(period);
    if (previousPeriod) {
      const prevPeriodData = this.periods.get(`${userId}-${previousPeriod}`);
      if (prevPeriodData && prevPeriodData.status === PeriodStatus.OPEN) {
        warnings.push(`Perioada anterioara ${previousPeriod} nu este inchisa`);
        this.updateChecklistItem(checklist, 'previous_periods', 'warning', 'Perioada anterioara deschisa');
      } else {
        this.updateChecklistItem(checklist, 'previous_periods', 'passed');
      }
    } else {
      this.updateChecklistItem(checklist, 'previous_periods', 'passed');
    }

    // Validate invoices
    const invoiceValidation = await this.validateInvoices(userId, period);
    if (!invoiceValidation.valid) {
      errors.push(...invoiceValidation.errors);
      this.updateChecklistItem(checklist, 'invoices', 'failed', invoiceValidation.errors.join('; '));
    } else if (invoiceValidation.warnings.length > 0) {
      warnings.push(...invoiceValidation.warnings);
      this.updateChecklistItem(checklist, 'invoices', 'warning', invoiceValidation.warnings.join('; '));
    } else {
      this.updateChecklistItem(checklist, 'invoices', 'passed');
    }

    // Validate bank reconciliation
    const bankValidation = await this.validateBankReconciliation(userId, period);
    if (!bankValidation.valid) {
      warnings.push(...bankValidation.errors);
      this.updateChecklistItem(checklist, 'bank_reconciliation', 'warning', bankValidation.errors.join('; '));
    } else {
      this.updateChecklistItem(checklist, 'bank_reconciliation', 'passed');
    }

    // Validate VAT
    const vatValidation = await this.validateVAT(userId, period);
    if (!vatValidation.valid) {
      warnings.push(...vatValidation.errors);
      this.updateChecklistItem(checklist, 'vat_declaration', 'warning', vatValidation.errors.join('; '));
    } else {
      this.updateChecklistItem(checklist, 'vat_declaration', 'passed');
    }

    // Validate trial balance
    const trialBalanceValidation = await this.validateTrialBalance(userId, period);
    if (!trialBalanceValidation.valid) {
      errors.push(...trialBalanceValidation.errors);
      this.updateChecklistItem(checklist, 'trial_balance', 'failed', trialBalanceValidation.errors.join('; '));
    } else {
      this.updateChecklistItem(checklist, 'trial_balance', 'passed');
    }

    // Update period validation errors
    accountingPeriod.validationErrors = errors;
    accountingPeriod.closingChecklist = checklist;
    this.periods.set(`${userId}-${period}`, accountingPeriod);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      checklist,
    };
  }

  /**
   * Close an accounting period
   */
  async closePeriod(userId: string, period: string, closedBy: string): Promise<PeriodClosingResult> {
    // Validate first
    const validation = await this.validatePeriodForClosing(userId, period);

    if (!validation.valid) {
      return {
        success: false,
        period: await this.getOrCreatePeriod(userId, period),
        errors: validation.errors,
        warnings: validation.warnings,
        summary: { totalInvoices: 0, totalPayments: 0, totalJournalEntries: 0, revenue: 0, expenses: 0, netIncome: 0 },
      };
    }

    const accountingPeriod = await this.getOrCreatePeriod(userId, period);

    // Generate closing entries
    await this.generateClosingEntries(userId, period);

    // Calculate summary
    const summary = await this.calculatePeriodSummary(userId, period);

    // Update period status
    accountingPeriod.status = PeriodStatus.CLOSED;
    accountingPeriod.closedAt = new Date();
    accountingPeriod.closedBy = closedBy;
    this.periods.set(`${userId}-${period}`, accountingPeriod);

    // Log audit
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PERIOD_CLOSED',
        entity: 'ACCOUNTING_PERIOD',
        entityId: period,
        details: JSON.parse(JSON.stringify({
          period,
          closedBy,
          summary,
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`Period ${period} closed by ${closedBy}`);

    return {
      success: true,
      period: accountingPeriod,
      errors: [],
      warnings: validation.warnings,
      summary,
    };
  }

  /**
   * Lock a period (prevent any modifications including reopening)
   */
  async lockPeriod(userId: string, period: string): Promise<AccountingPeriod> {
    const accountingPeriod = await this.getOrCreatePeriod(userId, period);

    if (accountingPeriod.status !== PeriodStatus.CLOSED) {
      throw new BadRequestException('Perioada trebuie inchisa inainte de blocare');
    }

    accountingPeriod.status = PeriodStatus.LOCKED;
    accountingPeriod.lockedAt = new Date();
    this.periods.set(`${userId}-${period}`, accountingPeriod);

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PERIOD_LOCKED',
        entity: 'ACCOUNTING_PERIOD',
        entityId: period,
        details: JSON.parse(JSON.stringify({ period })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`Period ${period} locked`);
    return accountingPeriod;
  }

  /**
   * Reopen a closed period (not locked)
   */
  async reopenPeriod(userId: string, period: string, reason: string): Promise<AccountingPeriod> {
    const accountingPeriod = await this.getOrCreatePeriod(userId, period);

    if (accountingPeriod.status === PeriodStatus.LOCKED) {
      throw new BadRequestException('Perioada este blocata si nu poate fi redeschisa');
    }

    if (accountingPeriod.status === PeriodStatus.OPEN) {
      throw new BadRequestException('Perioada este deja deschisa');
    }

    accountingPeriod.status = PeriodStatus.OPEN;
    accountingPeriod.reopenedCount++;
    accountingPeriod.notes = reason;
    this.periods.set(`${userId}-${period}`, accountingPeriod);

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PERIOD_REOPENED',
        entity: 'ACCOUNTING_PERIOD',
        entityId: period,
        details: JSON.parse(JSON.stringify({
          period,
          reason,
          reopenedCount: accountingPeriod.reopenedCount,
        })),
        ipAddress: '127.0.0.1',
      },
    });

    this.logger.log(`Period ${period} reopened: ${reason}`);
    return accountingPeriod;
  }

  /**
   * Get closing checklist for a period
   */
  async getClosingChecklist(userId: string, period: string): Promise<ClosingChecklistItem[]> {
    const validation = await this.validatePeriodForClosing(userId, period);
    return validation.checklist;
  }

  /**
   * Get period summary report
   */
  async getPeriodSummary(userId: string, period: string): Promise<{
    period: AccountingPeriod;
    summary: {
      totalInvoices: number;
      totalPayments: number;
      totalJournalEntries: number;
      revenue: number;
      expenses: number;
      netIncome: number;
    };
    validation: ValidationResult;
  }> {
    const accountingPeriod = await this.getOrCreatePeriod(userId, period);
    const summary = await this.calculatePeriodSummary(userId, period);
    const validation = await this.validatePeriodForClosing(userId, period);

    return {
      period: accountingPeriod,
      summary,
      validation,
    };
  }

  // ===== Helper Methods =====

  private generateChecklist(): ClosingChecklistItem[] {
    return [
      {
        id: 'previous_periods',
        name: 'Perioade anterioare',
        description: 'Toate perioadele anterioare sunt inchise',
        status: 'pending',
        required: false,
      },
      {
        id: 'invoices',
        name: 'Facturi',
        description: 'Toate facturile sunt inregistrate si validate',
        status: 'pending',
        required: true,
      },
      {
        id: 'bank_reconciliation',
        name: 'Reconciliere bancara',
        description: 'Conturile bancare sunt reconciliate',
        status: 'pending',
        required: false,
      },
      {
        id: 'vat_declaration',
        name: 'Declaratie TVA',
        description: 'Declaratia D394/D300 este pregatita',
        status: 'pending',
        required: false,
      },
      {
        id: 'trial_balance',
        name: 'Balanta de verificare',
        description: 'Balanta este echilibrata (debit = credit)',
        status: 'pending',
        required: true,
      },
      {
        id: 'depreciation',
        name: 'Amortizari',
        description: 'Amortizarile lunare sunt calculate',
        status: 'pending',
        required: false,
      },
      {
        id: 'payroll',
        name: 'Salarii',
        description: 'Salariile si contributiile sunt inregistrate',
        status: 'pending',
        required: false,
      },
    ];
  }

  private updateChecklistItem(
    checklist: ClosingChecklistItem[],
    id: string,
    status: ClosingChecklistItem['status'],
    message?: string,
  ): void {
    const item = checklist.find(c => c.id === id);
    if (item) {
      item.status = status;
      if (message) item.message = message;
    }
  }

  private getPreviousPeriod(period: string): string | null {
    const [year, month] = period.split('-').map(Number);
    if (month === 1) {
      return `${year - 1}-12`;
    }
    return `${year}-${String(month - 1).padStart(2, '0')}`;
  }

  private async validateInvoices(userId: string, period: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Count invoices in period
    const invoiceCount = await this.prisma.invoice.count({
      where: {
        userId,
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Check for draft invoices
    const draftCount = await this.prisma.invoice.count({
      where: {
        userId,
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'DRAFT',
      },
    });

    if (draftCount > 0) {
      warnings.push(`${draftCount} facturi in starea Draft`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private async validateBankReconciliation(userId: string, period: string): Promise<{ valid: boolean; errors: string[] }> {
    // Simplified validation - in production would check actual bank reconciliation status
    return { valid: true, errors: [] };
  }

  private async validateVAT(userId: string, period: string): Promise<{ valid: boolean; errors: string[] }> {
    // Simplified validation - in production would check VAT declaration status
    return { valid: true, errors: [] };
  }

  private async validateTrialBalance(userId: string, period: string): Promise<{ valid: boolean; errors: string[] }> {
    // Simplified validation - in production would calculate and check trial balance
    return { valid: true, errors: [] };
  }

  private async generateClosingEntries(userId: string, period: string): Promise<void> {
    // In production, this would generate journal entries for:
    // - Revenue/expense account closures
    // - Transfer to retained earnings
    // - Accruals and prepayments
    this.logger.log(`Generating closing entries for ${period}`);
  }

  private async calculatePeriodSummary(userId: string, period: string): Promise<{
    totalInvoices: number;
    totalPayments: number;
    totalJournalEntries: number;
    revenue: number;
    expenses: number;
    netIncome: number;
  }> {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Count invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        userId,
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const issuedInvoices = invoices.filter(i => i.type === 'ISSUED');
    const receivedInvoices = invoices.filter(i => i.type === 'RECEIVED');

    const revenue = issuedInvoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0);
    const expenses = receivedInvoices.reduce((sum, inv) => sum + Number(inv.netAmount), 0);

    return {
      totalInvoices: invoices.length,
      totalPayments: 0, // Would count from payments table
      totalJournalEntries: 0, // Would count from journal entries
      revenue: Math.round(revenue * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      netIncome: Math.round((revenue - expenses) * 100) / 100,
    };
  }
}
