import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Financial Consolidation Service (OneStream-like)
 * Multi-entity consolidation with intercompany eliminations
 *
 * Features:
 * - Multi-entity hierarchy management
 * - Consolidation rules and mappings
 * - Intercompany transaction elimination
 * - Currency translation (current rate, historical rate, average rate)
 * - Minority interest calculations
 * - Consolidation journal entries
 * - Consolidated financial statements
 * - Audit trail and reconciliation
 */

// =================== TYPES & ENUMS ===================

export enum EntityType {
  HOLDING = 'HOLDING',
  SUBSIDIARY = 'SUBSIDIARY',
  ASSOCIATE = 'ASSOCIATE',
  JOINT_VENTURE = 'JOINT_VENTURE',
  BRANCH = 'BRANCH',
}

export enum ConsolidationMethod {
  FULL = 'FULL', // 100% consolidated
  PROPORTIONAL = 'PROPORTIONAL', // Based on ownership %
  EQUITY = 'EQUITY', // Equity method for associates
  NONE = 'NONE', // Not consolidated
}

export enum CurrencyTranslationMethod {
  CURRENT_RATE = 'CURRENT_RATE', // All items at closing rate
  TEMPORAL = 'TEMPORAL', // Monetary at current, non-monetary at historical
  AVERAGE_RATE = 'AVERAGE_RATE', // P&L items at average rate
}

export enum EliminationType {
  INTERCOMPANY_RECEIVABLE = 'INTERCOMPANY_RECEIVABLE',
  INTERCOMPANY_PAYABLE = 'INTERCOMPANY_PAYABLE',
  INTERCOMPANY_REVENUE = 'INTERCOMPANY_REVENUE',
  INTERCOMPANY_EXPENSE = 'INTERCOMPANY_EXPENSE',
  INTERCOMPANY_DIVIDEND = 'INTERCOMPANY_DIVIDEND',
  INVESTMENT_ELIMINATION = 'INVESTMENT_ELIMINATION',
  UNREALIZED_PROFIT = 'UNREALIZED_PROFIT',
}

export enum ConsolidationStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
}

// =================== INTERFACES ===================

export interface LegalEntity {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: EntityType;
  parentEntityId?: string;
  ownershipPercentage: number;
  consolidationMethod: ConsolidationMethod;
  functionalCurrency: string;
  reportingCurrency: string;
  translationMethod: CurrencyTranslationMethod;
  fiscalYearEnd: string; // MM-DD format
  country: string;
  taxId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityHierarchy {
  entity: LegalEntity;
  children: EntityHierarchy[];
  level: number;
  effectiveOwnership: number;
}

export interface ConsolidationPeriod {
  id: string;
  tenantId: string;
  name: string;
  year: number;
  period: number; // 1-12 for monthly, 1-4 for quarterly
  periodType: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  startDate: Date;
  endDate: Date;
  status: ConsolidationStatus;
  lockedAt?: Date;
  lockedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsolidationRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  ruleType: 'ELIMINATION' | 'TRANSLATION' | 'ADJUSTMENT' | 'ALLOCATION';
  sourceAccountPattern: string;
  targetAccountPattern?: string;
  eliminationType?: EliminationType;
  formula?: string;
  isAutomatic: boolean;
  priority: number;
  isActive: boolean;
}

export interface IntercompanyTransaction {
  id: string;
  tenantId: string;
  periodId: string;
  sourceEntityId: string;
  targetEntityId: string;
  transactionType: EliminationType;
  accountCode: string;
  description: string;
  amount: number;
  currency: string;
  sourceReference?: string;
  targetReference?: string;
  status: 'PENDING' | 'MATCHED' | 'ELIMINATED' | 'EXCEPTION';
  matchedTransactionId?: string;
  eliminationEntryId?: string;
  createdAt: Date;
}

export interface EliminationEntry {
  id: string;
  tenantId: string;
  periodId: string;
  ruleId?: string;
  transactionId?: string;
  description: string;
  entries: JournalLine[];
  amount: number;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  createdAt: Date;
  postedAt?: Date;
  postedBy?: string;
}

export interface JournalLine {
  entityId: string;
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
  currency: string;
  exchangeRate: number;
  reportingAmount: number;
}

export interface CurrencyRate {
  currency: string;
  date: Date;
  closingRate: number;
  averageRate: number;
  historicalRate?: number;
}

export interface TrialBalance {
  entityId: string;
  entityName: string;
  periodId: string;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

export interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  openingBalance: number;
  debits: number;
  credits: number;
  closingBalance: number;
  functionalAmount: number;
  reportingAmount: number;
  translationAdjustment: number;
}

export interface ConsolidatedStatement {
  periodId: string;
  periodName: string;
  statementType: 'BALANCE_SHEET' | 'INCOME_STATEMENT' | 'CASH_FLOW' | 'EQUITY_CHANGES';
  reportingCurrency: string;
  generatedAt: Date;
  entities: string[];
  sections: StatementSection[];
  totals: { [key: string]: number };
}

export interface StatementSection {
  name: string;
  accounts: StatementLine[];
  subtotal: number;
}

export interface StatementLine {
  accountCode: string;
  accountName: string;
  amounts: { [entityId: string]: number };
  eliminations: number;
  consolidated: number;
  priorPeriod?: number;
  variance?: number;
  variancePercent?: number;
}

// =================== SERVICE ===================

@Injectable()
export class FinancialConsolidationService {
  private readonly logger = new Logger(FinancialConsolidationService.name);

  // In-memory storage (would use Prisma in production)
  private entities: Map<string, LegalEntity> = new Map();
  private periods: Map<string, ConsolidationPeriod> = new Map();
  private rules: Map<string, ConsolidationRule> = new Map();
  private intercompanyTxns: Map<string, IntercompanyTransaction> = new Map();
  private eliminations: Map<string, EliminationEntry> = new Map();
  private currencyRates: Map<string, CurrencyRate[]> = new Map();
  private trialBalances: Map<string, TrialBalance> = new Map();

  private counters = {
    entity: 0,
    period: 0,
    rule: 0,
    transaction: 0,
    elimination: 0,
  };

  constructor(private readonly prisma: PrismaService) {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Default elimination rules
    const defaultRules: Partial<ConsolidationRule>[] = [
      {
        name: 'Intercompany Receivables/Payables',
        ruleType: 'ELIMINATION',
        sourceAccountPattern: '1311*', // Intercompany receivables
        targetAccountPattern: '401*', // Trade payables
        eliminationType: EliminationType.INTERCOMPANY_RECEIVABLE,
        isAutomatic: true,
        priority: 1,
      },
      {
        name: 'Intercompany Revenue/Expense',
        ruleType: 'ELIMINATION',
        sourceAccountPattern: '704*', // Revenue from related parties
        targetAccountPattern: '604*', // Expenses to related parties
        eliminationType: EliminationType.INTERCOMPANY_REVENUE,
        isAutomatic: true,
        priority: 2,
      },
      {
        name: 'Investment Elimination',
        ruleType: 'ELIMINATION',
        sourceAccountPattern: '261*', // Investments in subsidiaries
        eliminationType: EliminationType.INVESTMENT_ELIMINATION,
        isAutomatic: false,
        priority: 3,
      },
    ];

    defaultRules.forEach((rule, index) => {
      const id = `rule_default_${index + 1}`;
      this.rules.set(id, {
        id,
        tenantId: 'system',
        description: '',
        isActive: true,
        ...rule,
      } as ConsolidationRule);
    });
  }

  // =================== ENTITY MANAGEMENT ===================

  async createEntity(
    tenantId: string,
    data: Omit<LegalEntity, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): Promise<LegalEntity> {
    const id = `ent_${++this.counters.entity}_${Date.now()}`;

    // Validate parent if specified
    if (data.parentEntityId) {
      const parent = this.entities.get(data.parentEntityId);
      if (!parent || parent.tenantId !== tenantId) {
        throw new NotFoundException('Parent entity not found');
      }
    }

    const entity: LegalEntity = {
      id,
      tenantId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.entities.set(id, entity);
    this.logger.log(`Created legal entity ${id}: ${data.name}`);

    return entity;
  }

  async getEntity(tenantId: string, entityId: string): Promise<LegalEntity> {
    const entity = this.entities.get(entityId);
    if (!entity || entity.tenantId !== tenantId) {
      throw new NotFoundException('Entity not found');
    }
    return entity;
  }

  async getEntities(tenantId: string, options?: {
    type?: EntityType;
    parentId?: string;
    isActive?: boolean;
  }): Promise<LegalEntity[]> {
    let entities = Array.from(this.entities.values())
      .filter(e => e.tenantId === tenantId);

    if (options?.type) {
      entities = entities.filter(e => e.type === options.type);
    }
    if (options?.parentId) {
      entities = entities.filter(e => e.parentEntityId === options.parentId);
    }
    if (options?.isActive !== undefined) {
      entities = entities.filter(e => e.isActive === options.isActive);
    }

    return entities.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateEntity(
    tenantId: string,
    entityId: string,
    data: Partial<Omit<LegalEntity, 'id' | 'tenantId' | 'createdAt'>>,
  ): Promise<LegalEntity> {
    const entity = await this.getEntity(tenantId, entityId);
    Object.assign(entity, data, { updatedAt: new Date() });
    return entity;
  }

  async getEntityHierarchy(tenantId: string, rootEntityId?: string): Promise<EntityHierarchy[]> {
    const entities = await this.getEntities(tenantId, { isActive: true });

    const buildHierarchy = (
      parentId: string | undefined,
      level: number,
      parentOwnership: number,
    ): EntityHierarchy[] => {
      return entities
        .filter(e => e.parentEntityId === parentId)
        .map(entity => {
          const effectiveOwnership = (parentOwnership * entity.ownershipPercentage) / 100;
          return {
            entity,
            level,
            effectiveOwnership,
            children: buildHierarchy(entity.id, level + 1, effectiveOwnership),
          };
        });
    };

    if (rootEntityId) {
      const rootEntity = await this.getEntity(tenantId, rootEntityId);
      return [{
        entity: rootEntity,
        level: 0,
        effectiveOwnership: 100,
        children: buildHierarchy(rootEntityId, 1, 100),
      }];
    }

    // Return all top-level entities (no parent)
    return buildHierarchy(undefined, 0, 100);
  }

  // =================== CONSOLIDATION PERIODS ===================

  async createPeriod(
    tenantId: string,
    data: Omit<ConsolidationPeriod, 'id' | 'tenantId' | 'status' | 'createdAt' | 'updatedAt'>,
  ): Promise<ConsolidationPeriod> {
    const id = `per_${++this.counters.period}_${Date.now()}`;

    const period: ConsolidationPeriod = {
      id,
      tenantId,
      ...data,
      status: ConsolidationStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.periods.set(id, period);
    this.logger.log(`Created consolidation period ${id}: ${data.name}`);

    return period;
  }

  async getPeriod(tenantId: string, periodId: string): Promise<ConsolidationPeriod> {
    const period = this.periods.get(periodId);
    if (!period || period.tenantId !== tenantId) {
      throw new NotFoundException('Period not found');
    }
    return period;
  }

  async getPeriods(tenantId: string, options?: {
    year?: number;
    status?: ConsolidationStatus;
  }): Promise<ConsolidationPeriod[]> {
    let periods = Array.from(this.periods.values())
      .filter(p => p.tenantId === tenantId);

    if (options?.year) {
      periods = periods.filter(p => p.year === options.year);
    }
    if (options?.status) {
      periods = periods.filter(p => p.status === options.status);
    }

    return periods.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.period - a.period;
    });
  }

  async updatePeriodStatus(
    tenantId: string,
    periodId: string,
    status: ConsolidationStatus,
    userId?: string,
  ): Promise<ConsolidationPeriod> {
    const period = await this.getPeriod(tenantId, periodId);

    // Validate status transition
    const validTransitions: { [key: string]: ConsolidationStatus[] } = {
      [ConsolidationStatus.DRAFT]: [ConsolidationStatus.IN_PROGRESS],
      [ConsolidationStatus.IN_PROGRESS]: [ConsolidationStatus.REVIEW, ConsolidationStatus.DRAFT],
      [ConsolidationStatus.REVIEW]: [ConsolidationStatus.APPROVED, ConsolidationStatus.IN_PROGRESS],
      [ConsolidationStatus.APPROVED]: [ConsolidationStatus.PUBLISHED, ConsolidationStatus.REVIEW],
      [ConsolidationStatus.PUBLISHED]: [],
    };

    if (!validTransitions[period.status].includes(status)) {
      throw new BadRequestException(`Cannot transition from ${period.status} to ${status}`);
    }

    period.status = status;
    period.updatedAt = new Date();

    if (status === ConsolidationStatus.PUBLISHED) {
      period.lockedAt = new Date();
      period.lockedBy = userId;
    }

    return period;
  }

  // =================== INTERCOMPANY TRANSACTIONS ===================

  async recordIntercompanyTransaction(
    tenantId: string,
    data: Omit<IntercompanyTransaction, 'id' | 'tenantId' | 'status' | 'createdAt'>,
  ): Promise<IntercompanyTransaction> {
    const id = `ict_${++this.counters.transaction}_${Date.now()}`;

    // Validate entities
    await this.getEntity(tenantId, data.sourceEntityId);
    await this.getEntity(tenantId, data.targetEntityId);

    const transaction: IntercompanyTransaction = {
      id,
      tenantId,
      ...data,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.intercompanyTxns.set(id, transaction);

    // Attempt automatic matching
    await this.matchIntercompanyTransactions(tenantId, data.periodId);

    return transaction;
  }

  async getIntercompanyTransactions(
    tenantId: string,
    periodId: string,
    options?: {
      entityId?: string;
      status?: string;
      type?: EliminationType;
    },
  ): Promise<IntercompanyTransaction[]> {
    let transactions = Array.from(this.intercompanyTxns.values())
      .filter(t => t.tenantId === tenantId && t.periodId === periodId);

    if (options?.entityId) {
      transactions = transactions.filter(t =>
        t.sourceEntityId === options.entityId || t.targetEntityId === options.entityId
      );
    }
    if (options?.status) {
      transactions = transactions.filter(t => t.status === options.status);
    }
    if (options?.type) {
      transactions = transactions.filter(t => t.transactionType === options.type);
    }

    return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async matchIntercompanyTransactions(tenantId: string, periodId: string): Promise<{
    matched: number;
    exceptions: number;
  }> {
    const transactions = await this.getIntercompanyTransactions(tenantId, periodId, {
      status: 'PENDING',
    });

    let matched = 0;
    let exceptions = 0;

    // Group by transaction type and find matching pairs
    const receivables = transactions.filter(t =>
      t.transactionType === EliminationType.INTERCOMPANY_RECEIVABLE
    );
    const payables = transactions.filter(t =>
      t.transactionType === EliminationType.INTERCOMPANY_PAYABLE
    );

    for (const receivable of receivables) {
      // Find matching payable (reversed source/target, same amount)
      const matchingPayable = payables.find(p =>
        p.sourceEntityId === receivable.targetEntityId &&
        p.targetEntityId === receivable.sourceEntityId &&
        Math.abs(p.amount - receivable.amount) < 0.01 &&
        p.status === 'PENDING'
      );

      if (matchingPayable) {
        receivable.status = 'MATCHED';
        receivable.matchedTransactionId = matchingPayable.id;
        matchingPayable.status = 'MATCHED';
        matchingPayable.matchedTransactionId = receivable.id;
        matched += 2;
      } else {
        receivable.status = 'EXCEPTION';
        exceptions++;
      }
    }

    // Mark unmatched payables as exceptions
    for (const payable of payables) {
      if (payable.status === 'PENDING') {
        payable.status = 'EXCEPTION';
        exceptions++;
      }
    }

    this.logger.log(`Matched ${matched} transactions, ${exceptions} exceptions`);
    return { matched, exceptions };
  }

  // =================== ELIMINATION ENTRIES ===================

  async createEliminationEntry(
    tenantId: string,
    periodId: string,
    data: {
      description: string;
      entries: JournalLine[];
      ruleId?: string;
      transactionId?: string;
    },
  ): Promise<EliminationEntry> {
    const id = `elim_${++this.counters.elimination}_${Date.now()}`;

    // Validate entries balance
    const totalDebits = data.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = data.entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException('Elimination entry must balance');
    }

    const entry: EliminationEntry = {
      id,
      tenantId,
      periodId,
      ruleId: data.ruleId,
      transactionId: data.transactionId,
      description: data.description,
      entries: data.entries,
      amount: totalDebits,
      status: 'DRAFT',
      createdAt: new Date(),
    };

    this.eliminations.set(id, entry);
    this.logger.log(`Created elimination entry ${id}`);

    return entry;
  }

  async generateAutomaticEliminations(
    tenantId: string,
    periodId: string,
  ): Promise<EliminationEntry[]> {
    const matchedTransactions = await this.getIntercompanyTransactions(tenantId, periodId, {
      status: 'MATCHED',
    });

    const eliminations: EliminationEntry[] = [];

    // Process matched pairs
    const processedPairs = new Set<string>();

    for (const txn of matchedTransactions) {
      if (!txn.matchedTransactionId || processedPairs.has(txn.id)) continue;

      const matchedTxn = this.intercompanyTxns.get(txn.matchedTransactionId);
      if (!matchedTxn) continue;

      processedPairs.add(txn.id);
      processedPairs.add(matchedTxn.id);

      // Create elimination entry
      const elimination = await this.createEliminationEntry(tenantId, periodId, {
        description: `IC Elimination: ${txn.description}`,
        transactionId: txn.id,
        entries: [
          {
            entityId: txn.sourceEntityId,
            accountCode: txn.accountCode,
            description: `Eliminate IC receivable from ${matchedTxn.sourceEntityId}`,
            debit: 0,
            credit: txn.amount,
            currency: txn.currency,
            exchangeRate: 1,
            reportingAmount: txn.amount,
          },
          {
            entityId: matchedTxn.sourceEntityId,
            accountCode: matchedTxn.accountCode,
            description: `Eliminate IC payable to ${txn.sourceEntityId}`,
            debit: matchedTxn.amount,
            credit: 0,
            currency: matchedTxn.currency,
            exchangeRate: 1,
            reportingAmount: matchedTxn.amount,
          },
        ],
      });

      // Update transaction status
      txn.status = 'ELIMINATED';
      txn.eliminationEntryId = elimination.id;
      matchedTxn.status = 'ELIMINATED';
      matchedTxn.eliminationEntryId = elimination.id;

      eliminations.push(elimination);
    }

    return eliminations;
  }

  async postEliminationEntry(
    tenantId: string,
    eliminationId: string,
    userId: string,
  ): Promise<EliminationEntry> {
    const elimination = this.eliminations.get(eliminationId);
    if (!elimination || elimination.tenantId !== tenantId) {
      throw new NotFoundException('Elimination entry not found');
    }

    if (elimination.status !== 'DRAFT') {
      throw new BadRequestException('Entry already posted');
    }

    elimination.status = 'POSTED';
    elimination.postedAt = new Date();
    elimination.postedBy = userId;

    return elimination;
  }

  async getEliminationEntries(
    tenantId: string,
    periodId: string,
    options?: { status?: string },
  ): Promise<EliminationEntry[]> {
    let eliminations = Array.from(this.eliminations.values())
      .filter(e => e.tenantId === tenantId && e.periodId === periodId);

    if (options?.status) {
      eliminations = eliminations.filter(e => e.status === options.status);
    }

    return eliminations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // =================== CURRENCY TRANSLATION ===================

  async setCurrencyRates(
    tenantId: string,
    periodId: string,
    rates: CurrencyRate[],
  ): Promise<void> {
    this.currencyRates.set(`${tenantId}_${periodId}`, rates);
    this.logger.log(`Set ${rates.length} currency rates for period ${periodId}`);
  }

  async getCurrencyRates(tenantId: string, periodId: string): Promise<CurrencyRate[]> {
    return this.currencyRates.get(`${tenantId}_${periodId}`) || [];
  }

  async translateTrialBalance(
    tenantId: string,
    entityId: string,
    periodId: string,
  ): Promise<TrialBalance> {
    const entity = await this.getEntity(tenantId, entityId);
    const rates = await this.getCurrencyRates(tenantId, periodId);

    // Get rate for entity's functional currency
    const currencyRate = rates.find(r => r.currency === entity.functionalCurrency);
    const closingRate = currencyRate?.closingRate || 1;
    const averageRate = currencyRate?.averageRate || 1;

    // Get or create trial balance
    const tbKey = `${entityId}_${periodId}`;
    let trialBalance = this.trialBalances.get(tbKey);

    if (!trialBalance) {
      // Generate mock trial balance
      trialBalance = this.generateMockTrialBalance(entity, periodId);
      this.trialBalances.set(tbKey, trialBalance);
    }

    // Apply translation
    for (const account of trialBalance.accounts) {
      const rate = this.getTranslationRate(
        account.accountType,
        entity.translationMethod,
        closingRate,
        averageRate,
      );

      account.reportingAmount = account.functionalAmount * rate;
      account.translationAdjustment = account.reportingAmount - account.functionalAmount;
    }

    return trialBalance;
  }

  private getTranslationRate(
    accountType: string,
    method: CurrencyTranslationMethod,
    closingRate: number,
    averageRate: number,
  ): number {
    switch (method) {
      case CurrencyTranslationMethod.CURRENT_RATE:
        return closingRate;

      case CurrencyTranslationMethod.TEMPORAL:
        // Non-monetary items at historical rate (approximated by 1)
        if (accountType === 'ASSET' || accountType === 'EQUITY') {
          return 1;
        }
        return closingRate;

      case CurrencyTranslationMethod.AVERAGE_RATE:
        // P&L items at average rate
        if (accountType === 'REVENUE' || accountType === 'EXPENSE') {
          return averageRate;
        }
        return closingRate;

      default:
        return closingRate;
    }
  }

  private generateMockTrialBalance(entity: LegalEntity, periodId: string): TrialBalance {
    // Mock trial balance for demonstration
    const accounts: TrialBalanceAccount[] = [
      { accountCode: '1011', accountName: 'Cash', accountType: 'ASSET', openingBalance: 50000, debits: 100000, credits: 80000, closingBalance: 70000, functionalAmount: 70000, reportingAmount: 70000, translationAdjustment: 0 },
      { accountCode: '4111', accountName: 'Trade Receivables', accountType: 'ASSET', openingBalance: 100000, debits: 200000, credits: 180000, closingBalance: 120000, functionalAmount: 120000, reportingAmount: 120000, translationAdjustment: 0 },
      { accountCode: '2111', accountName: 'Buildings', accountType: 'ASSET', openingBalance: 500000, debits: 0, credits: 20000, closingBalance: 480000, functionalAmount: 480000, reportingAmount: 480000, translationAdjustment: 0 },
      { accountCode: '4011', accountName: 'Trade Payables', accountType: 'LIABILITY', openingBalance: 80000, debits: 150000, credits: 160000, closingBalance: 90000, functionalAmount: 90000, reportingAmount: 90000, translationAdjustment: 0 },
      { accountCode: '1012', accountName: 'Share Capital', accountType: 'EQUITY', openingBalance: 200000, debits: 0, credits: 0, closingBalance: 200000, functionalAmount: 200000, reportingAmount: 200000, translationAdjustment: 0 },
      { accountCode: '1061', accountName: 'Retained Earnings', accountType: 'EQUITY', openingBalance: 270000, debits: 0, credits: 110000, closingBalance: 380000, functionalAmount: 380000, reportingAmount: 380000, translationAdjustment: 0 },
      { accountCode: '7011', accountName: 'Revenue', accountType: 'REVENUE', openingBalance: 0, debits: 0, credits: 500000, closingBalance: 500000, functionalAmount: 500000, reportingAmount: 500000, translationAdjustment: 0 },
      { accountCode: '6011', accountName: 'Cost of Sales', accountType: 'EXPENSE', openingBalance: 0, debits: 300000, credits: 0, closingBalance: 300000, functionalAmount: 300000, reportingAmount: 300000, translationAdjustment: 0 },
      { accountCode: '6411', accountName: 'Salaries', accountType: 'EXPENSE', openingBalance: 0, debits: 90000, credits: 0, closingBalance: 90000, functionalAmount: 90000, reportingAmount: 90000, translationAdjustment: 0 },
    ];

    const totalDebits = accounts.reduce((sum, a) => sum + a.debits, 0);
    const totalCredits = accounts.reduce((sum, a) => sum + a.credits, 0);

    return {
      entityId: entity.id,
      entityName: entity.name,
      periodId,
      accounts,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  // =================== CONSOLIDATED STATEMENTS ===================

  async generateConsolidatedBalanceSheet(
    tenantId: string,
    periodId: string,
  ): Promise<ConsolidatedStatement> {
    const entities = await this.getEntities(tenantId, { isActive: true });
    const eliminations = await this.getEliminationEntries(tenantId, periodId, { status: 'POSTED' });

    // Collect trial balances
    const trialBalances: TrialBalance[] = [];
    for (const entity of entities) {
      if (entity.consolidationMethod === ConsolidationMethod.NONE) continue;
      const tb = await this.translateTrialBalance(tenantId, entity.id, periodId);
      trialBalances.push(tb);
    }

    // Calculate eliminations by account
    const eliminationsByAccount: Map<string, number> = new Map();
    for (const elim of eliminations) {
      for (const entry of elim.entries) {
        const current = eliminationsByAccount.get(entry.accountCode) || 0;
        eliminationsByAccount.set(entry.accountCode, current + entry.debit - entry.credit);
      }
    }

    // Build consolidated balance sheet
    const assetAccounts = this.consolidateAccounts(trialBalances, ['ASSET'], eliminationsByAccount);
    const liabilityAccounts = this.consolidateAccounts(trialBalances, ['LIABILITY'], eliminationsByAccount);
    const equityAccounts = this.consolidateAccounts(trialBalances, ['EQUITY'], eliminationsByAccount);

    const totalAssets = assetAccounts.reduce((sum, a) => sum + a.consolidated, 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + a.consolidated, 0);
    const totalEquity = equityAccounts.reduce((sum, a) => sum + a.consolidated, 0);

    return {
      periodId,
      periodName: `Period ${periodId}`,
      statementType: 'BALANCE_SHEET',
      reportingCurrency: 'RON',
      generatedAt: new Date(),
      entities: entities.map(e => e.id),
      sections: [
        { name: 'Assets', accounts: assetAccounts, subtotal: totalAssets },
        { name: 'Liabilities', accounts: liabilityAccounts, subtotal: totalLiabilities },
        { name: 'Equity', accounts: equityAccounts, subtotal: totalEquity },
      ],
      totals: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      },
    };
  }

  async generateConsolidatedIncomeStatement(
    tenantId: string,
    periodId: string,
  ): Promise<ConsolidatedStatement> {
    const entities = await this.getEntities(tenantId, { isActive: true });
    const eliminations = await this.getEliminationEntries(tenantId, periodId, { status: 'POSTED' });

    // Collect trial balances
    const trialBalances: TrialBalance[] = [];
    for (const entity of entities) {
      if (entity.consolidationMethod === ConsolidationMethod.NONE) continue;
      const tb = await this.translateTrialBalance(tenantId, entity.id, periodId);
      trialBalances.push(tb);
    }

    // Calculate eliminations by account
    const eliminationsByAccount: Map<string, number> = new Map();
    for (const elim of eliminations) {
      for (const entry of elim.entries) {
        const current = eliminationsByAccount.get(entry.accountCode) || 0;
        eliminationsByAccount.set(entry.accountCode, current + entry.debit - entry.credit);
      }
    }

    // Build consolidated income statement
    const revenueAccounts = this.consolidateAccounts(trialBalances, ['REVENUE'], eliminationsByAccount);
    const expenseAccounts = this.consolidateAccounts(trialBalances, ['EXPENSE'], eliminationsByAccount);

    const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.consolidated, 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.consolidated, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      periodId,
      periodName: `Period ${periodId}`,
      statementType: 'INCOME_STATEMENT',
      reportingCurrency: 'RON',
      generatedAt: new Date(),
      entities: entities.map(e => e.id),
      sections: [
        { name: 'Revenue', accounts: revenueAccounts, subtotal: totalRevenue },
        { name: 'Expenses', accounts: expenseAccounts, subtotal: totalExpenses },
      ],
      totals: {
        totalRevenue,
        totalExpenses,
        grossProfit: totalRevenue - expenseAccounts.filter(a => a.accountCode.startsWith('60')).reduce((s, a) => s + a.consolidated, 0),
        operatingIncome: netIncome + 10000, // Simplified
        netIncome,
      },
    };
  }

  private consolidateAccounts(
    trialBalances: TrialBalance[],
    accountTypes: string[],
    eliminations: Map<string, number>,
  ): StatementLine[] {
    const accountMap: Map<string, StatementLine> = new Map();

    for (const tb of trialBalances) {
      for (const account of tb.accounts) {
        if (!accountTypes.includes(account.accountType)) continue;

        const existing = accountMap.get(account.accountCode) || {
          accountCode: account.accountCode,
          accountName: account.accountName,
          amounts: {},
          eliminations: 0,
          consolidated: 0,
        };

        existing.amounts[tb.entityId] = account.reportingAmount;
        accountMap.set(account.accountCode, existing);
      }
    }

    // Apply eliminations and calculate consolidated amounts
    for (const [code, line] of accountMap) {
      const entityTotal = Object.values(line.amounts).reduce((sum, amt) => sum + amt, 0);
      line.eliminations = eliminations.get(code) || 0;
      line.consolidated = entityTotal - line.eliminations;
    }

    return Array.from(accountMap.values())
      .sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  // =================== CONSOLIDATION WORKFLOW ===================

  async runConsolidation(
    tenantId: string,
    periodId: string,
    userId: string,
  ): Promise<{
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    steps: { step: string; status: string; message: string }[];
    balanceSheet?: ConsolidatedStatement;
    incomeStatement?: ConsolidatedStatement;
  }> {
    const steps: { step: string; status: string; message: string }[] = [];

    try {
      // Step 1: Validate period
      const period = await this.getPeriod(tenantId, periodId);
      if (period.status === ConsolidationStatus.PUBLISHED) {
        throw new BadRequestException('Period is already published');
      }
      steps.push({ step: 'Validate Period', status: 'SUCCESS', message: 'Period validated' });

      // Step 2: Update period status
      await this.updatePeriodStatus(tenantId, periodId, ConsolidationStatus.IN_PROGRESS, userId);
      steps.push({ step: 'Update Status', status: 'SUCCESS', message: 'Status updated to IN_PROGRESS' });

      // Step 3: Match intercompany transactions
      const matchResult = await this.matchIntercompanyTransactions(tenantId, periodId);
      steps.push({
        step: 'Match IC Transactions',
        status: matchResult.exceptions > 0 ? 'WARNING' : 'SUCCESS',
        message: `Matched ${matchResult.matched}, ${matchResult.exceptions} exceptions`,
      });

      // Step 4: Generate eliminations
      const eliminations = await this.generateAutomaticEliminations(tenantId, periodId);
      steps.push({
        step: 'Generate Eliminations',
        status: 'SUCCESS',
        message: `Generated ${eliminations.length} elimination entries`,
      });

      // Step 5: Post eliminations
      for (const elim of eliminations) {
        await this.postEliminationEntry(tenantId, elim.id, userId);
      }
      steps.push({
        step: 'Post Eliminations',
        status: 'SUCCESS',
        message: `Posted ${eliminations.length} entries`,
      });

      // Step 6: Generate consolidated statements
      const balanceSheet = await this.generateConsolidatedBalanceSheet(tenantId, periodId);
      const incomeStatement = await this.generateConsolidatedIncomeStatement(tenantId, periodId);
      steps.push({
        step: 'Generate Statements',
        status: 'SUCCESS',
        message: 'Consolidated statements generated',
      });

      // Step 7: Update status to review
      await this.updatePeriodStatus(tenantId, periodId, ConsolidationStatus.REVIEW, userId);
      steps.push({
        step: 'Complete',
        status: 'SUCCESS',
        message: 'Consolidation complete, ready for review',
      });

      return {
        status: matchResult.exceptions > 0 ? 'PARTIAL' : 'SUCCESS',
        steps,
        balanceSheet,
        incomeStatement,
      };
    } catch (error) {
      steps.push({
        step: 'Error',
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        status: 'FAILED',
        steps,
      };
    }
  }

  // =================== REPORTS & ANALYTICS ===================

  async getConsolidationSummary(tenantId: string, periodId: string): Promise<{
    period: ConsolidationPeriod;
    entities: { total: number; consolidated: number; excluded: number };
    transactions: { total: number; matched: number; exceptions: number; eliminated: number };
    eliminations: { total: number; posted: number; amount: number };
    statements: { balanceSheet: boolean; incomeStatement: boolean };
  }> {
    const period = await this.getPeriod(tenantId, periodId);
    const entities = await this.getEntities(tenantId, { isActive: true });
    const transactions = await this.getIntercompanyTransactions(tenantId, periodId);
    const eliminations = await this.getEliminationEntries(tenantId, periodId);

    const consolidated = entities.filter(e => e.consolidationMethod !== ConsolidationMethod.NONE);

    return {
      period,
      entities: {
        total: entities.length,
        consolidated: consolidated.length,
        excluded: entities.length - consolidated.length,
      },
      transactions: {
        total: transactions.length,
        matched: transactions.filter(t => t.status === 'MATCHED').length,
        exceptions: transactions.filter(t => t.status === 'EXCEPTION').length,
        eliminated: transactions.filter(t => t.status === 'ELIMINATED').length,
      },
      eliminations: {
        total: eliminations.length,
        posted: eliminations.filter(e => e.status === 'POSTED').length,
        amount: eliminations.reduce((sum, e) => sum + e.amount, 0),
      },
      statements: {
        balanceSheet: true,
        incomeStatement: true,
      },
    };
  }

  async getIntercompanyReport(tenantId: string, periodId: string): Promise<{
    summary: { totalReceivables: number; totalPayables: number; netPosition: number };
    byEntity: Array<{
      entityId: string;
      entityName: string;
      receivables: number;
      payables: number;
      net: number;
    }>;
    exceptions: IntercompanyTransaction[];
  }> {
    const entities = await this.getEntities(tenantId, { isActive: true });
    const transactions = await this.getIntercompanyTransactions(tenantId, periodId);

    let totalReceivables = 0;
    let totalPayables = 0;
    const byEntity: Map<string, { receivables: number; payables: number }> = new Map();

    for (const txn of transactions) {
      if (txn.transactionType === EliminationType.INTERCOMPANY_RECEIVABLE) {
        totalReceivables += txn.amount;
        const source = byEntity.get(txn.sourceEntityId) || { receivables: 0, payables: 0 };
        source.receivables += txn.amount;
        byEntity.set(txn.sourceEntityId, source);
      } else if (txn.transactionType === EliminationType.INTERCOMPANY_PAYABLE) {
        totalPayables += txn.amount;
        const source = byEntity.get(txn.sourceEntityId) || { receivables: 0, payables: 0 };
        source.payables += txn.amount;
        byEntity.set(txn.sourceEntityId, source);
      }
    }

    return {
      summary: {
        totalReceivables,
        totalPayables,
        netPosition: totalReceivables - totalPayables,
      },
      byEntity: Array.from(byEntity.entries()).map(([entityId, data]) => {
        const entity = entities.find(e => e.id === entityId);
        return {
          entityId,
          entityName: entity?.name || 'Unknown',
          receivables: data.receivables,
          payables: data.payables,
          net: data.receivables - data.payables,
        };
      }),
      exceptions: transactions.filter(t => t.status === 'EXCEPTION'),
    };
  }

  // =================== ADDITIONAL API METHODS ===================

  async deleteEntity(tenantId: string, entityId: string): Promise<void> {
    const entity = this.entities.get(entityId);
    if (!entity || entity.tenantId !== tenantId) {
      throw new NotFoundException('Entity not found');
    }
    // Check if entity has children
    const hasChildren = Array.from(this.entities.values()).some(
      e => e.parentEntityId === entityId && e.tenantId === tenantId
    );
    if (hasChildren) {
      throw new BadRequestException('Cannot delete entity with children');
    }
    this.entities.delete(entityId);
  }

  async lockPeriod(tenantId: string, periodId: string, userId: string): Promise<ConsolidationPeriod> {
    const period = this.periods.get(periodId);
    if (!period || period.tenantId !== tenantId) {
      throw new NotFoundException('Period not found');
    }
    period.lockedAt = new Date();
    period.lockedBy = userId;
    period.status = ConsolidationStatus.APPROVED;
    return period;
  }

  async unlockPeriod(tenantId: string, periodId: string): Promise<ConsolidationPeriod> {
    const period = this.periods.get(periodId);
    if (!period || period.tenantId !== tenantId) {
      throw new NotFoundException('Period not found');
    }
    period.lockedAt = undefined;
    period.lockedBy = undefined;
    period.status = ConsolidationStatus.IN_PROGRESS;
    return period;
  }

  async deleteEliminationEntry(tenantId: string, eliminationId: string): Promise<void> {
    const elimination = this.eliminations.get(eliminationId);
    if (!elimination || elimination.tenantId !== tenantId) {
      throw new NotFoundException('Elimination entry not found');
    }
    if (elimination.status === 'POSTED') {
      throw new BadRequestException('Cannot delete posted elimination entry');
    }
    this.eliminations.delete(eliminationId);
  }

  async submitTrialBalance(
    tenantId: string,
    data: {
      entityId: string;
      periodId: string;
      entries: Array<{
        accountCode: string;
        accountName: string;
        debit: number;
        credit: number;
      }>;
    },
  ): Promise<TrialBalance> {
    const entity = await this.getEntity(tenantId, data.entityId);
    const period = await this.getPeriod(tenantId, data.periodId);

    const totalDebits = data.entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = data.entries.reduce((sum, e) => sum + e.credit, 0);

    const trialBalance: TrialBalance = {
      entityId: data.entityId,
      entityName: entity.name,
      periodId: data.periodId,
      accounts: data.entries.map(e => ({
        accountCode: e.accountCode,
        accountName: e.accountName,
        accountType: 'ASSET' as const, // Default, would be determined by account code
        openingBalance: 0,
        debits: e.debit,
        credits: e.credit,
        closingBalance: e.debit - e.credit,
        functionalAmount: e.debit - e.credit,
        reportingAmount: e.debit - e.credit,
        translationAdjustment: 0,
      })),
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };

    const key = `${tenantId}_${data.entityId}_${data.periodId}`;
    this.trialBalances.set(key, trialBalance);
    return trialBalance;
  }

  async getTrialBalance(
    tenantId: string,
    entityId: string,
    periodId: string,
  ): Promise<TrialBalance | null> {
    const key = `${tenantId}_${entityId}_${periodId}`;
    return this.trialBalances.get(key) || null;
  }

  async setExchangeRate(
    tenantId: string,
    data: {
      fromCurrency: string;
      toCurrency: string;
      date: Date;
      rate: number;
      rateType: 'SPOT' | 'AVERAGE' | 'HISTORICAL';
    },
  ): Promise<CurrencyRate> {
    const currencyRate: CurrencyRate = {
      currency: data.fromCurrency,
      date: data.date,
      closingRate: data.rateType === 'SPOT' ? data.rate : 1,
      averageRate: data.rateType === 'AVERAGE' ? data.rate : 1,
      historicalRate: data.rateType === 'HISTORICAL' ? data.rate : undefined,
    };

    const key = `${tenantId}_${data.fromCurrency}_${data.toCurrency}`;
    const existing = this.currencyRates.get(key) || [];
    existing.push(currencyRate);
    this.currencyRates.set(key, existing);
    return currencyRate;
  }

  async getExchangeRates(
    tenantId: string,
    options?: {
      fromCurrency?: string;
      toCurrency?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<CurrencyRate[]> {
    const allRates: CurrencyRate[] = [];

    this.currencyRates.forEach((rates, key) => {
      if (key.startsWith(tenantId)) {
        allRates.push(...rates);
      }
    });

    let filtered = allRates;

    if (options?.fromCurrency) {
      filtered = filtered.filter(r => r.currency === options.fromCurrency);
    }
    if (options?.startDate) {
      filtered = filtered.filter(r => r.date >= options.startDate!);
    }
    if (options?.endDate) {
      filtered = filtered.filter(r => r.date <= options.endDate!);
    }

    return filtered;
  }

  async getConsolidationStatus(
    tenantId: string,
    periodId: string,
  ): Promise<{
    period: ConsolidationPeriod;
    entitiesStatus: Array<{
      entityId: string;
      entityName: string;
      trialBalanceSubmitted: boolean;
      translated: boolean;
    }>;
    eliminationsGenerated: boolean;
    consolidationComplete: boolean;
  }> {
    const period = await this.getPeriod(tenantId, periodId);
    const entities = await this.getEntities(tenantId, { isActive: true });

    const entitiesStatus = entities.map(entity => {
      const key = `${tenantId}_${entity.id}_${periodId}`;
      const tb = this.trialBalances.get(key);
      return {
        entityId: entity.id,
        entityName: entity.name,
        trialBalanceSubmitted: !!tb,
        translated: !!tb, // Simplified - treat submitted as translated
      };
    });

    const eliminations = Array.from(this.eliminations.values()).filter(
      e => e.tenantId === tenantId && e.periodId === periodId
    );

    return {
      period,
      entitiesStatus,
      eliminationsGenerated: eliminations.length > 0,
      consolidationComplete: period.status === ConsolidationStatus.PUBLISHED,
    };
  }

  async generateConsolidatedCashFlow(
    tenantId: string,
    periodId: string,
  ): Promise<ConsolidatedStatement> {
    const period = await this.getPeriod(tenantId, periodId);
    const entities = await this.getEntities(tenantId, { isActive: true });

    // Cash flow categories
    const operatingActivities: StatementLine[] = [
      { accountCode: 'CF_OP_NI', accountName: 'Net Income', amounts: {}, eliminations: 0, consolidated: 0 },
      { accountCode: 'CF_OP_DEP', accountName: 'Depreciation & Amortization', amounts: {}, eliminations: 0, consolidated: 0 },
      { accountCode: 'CF_OP_WC', accountName: 'Changes in Working Capital', amounts: {}, eliminations: 0, consolidated: 0 },
    ];

    const investingActivities: StatementLine[] = [
      { accountCode: 'CF_INV_CAPEX', accountName: 'Capital Expenditures', amounts: {}, eliminations: 0, consolidated: 0 },
      { accountCode: 'CF_INV_ACQ', accountName: 'Acquisitions', amounts: {}, eliminations: 0, consolidated: 0 },
    ];

    const financingActivities: StatementLine[] = [
      { accountCode: 'CF_FIN_DEBT', accountName: 'Debt Proceeds/Repayments', amounts: {}, eliminations: 0, consolidated: 0 },
      { accountCode: 'CF_FIN_DIV', accountName: 'Dividends Paid', amounts: {}, eliminations: 0, consolidated: 0 },
    ];

    return {
      periodId,
      periodName: period.name,
      statementType: 'CASH_FLOW',
      reportingCurrency: 'RON',
      generatedAt: new Date(),
      entities: entities.map(e => e.id),
      sections: [
        { name: 'Operating Activities', accounts: operatingActivities, subtotal: 0 },
        { name: 'Investing Activities', accounts: investingActivities, subtotal: 0 },
        { name: 'Financing Activities', accounts: financingActivities, subtotal: 0 },
      ],
      totals: {
        operatingCashFlow: 0,
        investingCashFlow: 0,
        financingCashFlow: 0,
        netCashFlow: 0,
      },
    };
  }

  async calculateMinorityInterest(
    tenantId: string,
    periodId: string,
  ): Promise<{
    totalMinorityInterest: number;
    byEntity: Array<{
      entityId: string;
      entityName: string;
      ownershipPercentage: number;
      minorityPercentage: number;
      totalEquity: number;
      minorityInterest: number;
    }>;
  }> {
    const entities = await this.getEntities(tenantId, { isActive: true });
    const subsidiaries = entities.filter(
      e => e.type === EntityType.SUBSIDIARY && e.ownershipPercentage < 100
    );

    const byEntity = subsidiaries.map(entity => {
      const minorityPercentage = 100 - entity.ownershipPercentage;
      const totalEquity = 1000000; // Would come from trial balance
      const minorityInterest = (totalEquity * minorityPercentage) / 100;

      return {
        entityId: entity.id,
        entityName: entity.name,
        ownershipPercentage: entity.ownershipPercentage,
        minorityPercentage,
        totalEquity,
        minorityInterest,
      };
    });

    return {
      totalMinorityInterest: byEntity.reduce((sum, e) => sum + e.minorityInterest, 0),
      byEntity,
    };
  }

  async getAuditTrail(
    tenantId: string,
    periodId: string,
  ): Promise<Array<{
    timestamp: Date;
    action: string;
    userId: string;
    details: string;
  }>> {
    // Return audit trail for the consolidation period
    const period = await this.getPeriod(tenantId, periodId);
    const eliminations = Array.from(this.eliminations.values()).filter(
      e => e.tenantId === tenantId && e.periodId === periodId
    );

    const auditEntries: Array<{
      timestamp: Date;
      action: string;
      userId: string;
      details: string;
    }> = [];

    // Period creation
    auditEntries.push({
      timestamp: period.createdAt,
      action: 'PERIOD_CREATED',
      userId: 'system',
      details: `Consolidation period ${period.name} created`,
    });

    // Eliminations
    for (const elim of eliminations) {
      auditEntries.push({
        timestamp: elim.createdAt,
        action: 'ELIMINATION_CREATED',
        userId: elim.postedBy || 'system',
        details: `Elimination entry: ${elim.description} for ${elim.amount}`,
      });
    }

    // Status changes
    if (period.lockedAt) {
      auditEntries.push({
        timestamp: period.lockedAt,
        action: 'PERIOD_LOCKED',
        userId: period.lockedBy || 'system',
        details: `Period locked by ${period.lockedBy}`,
      });
    }

    return auditEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getReconciliationReport(
    tenantId: string,
    periodId: string,
  ): Promise<{
    intercompanyBalance: { balanced: boolean; variance: number };
    trialBalanceStatus: Array<{
      entityId: string;
      entityName: string;
      balanced: boolean;
      variance: number;
    }>;
    eliminationsReconciled: boolean;
    issues: string[];
  }> {
    const entities = await this.getEntities(tenantId, { isActive: true });
    const transactions = await this.getIntercompanyTransactions(tenantId, periodId);

    // Check intercompany balance
    let receivables = 0;
    let payables = 0;
    for (const txn of transactions) {
      if (txn.transactionType === EliminationType.INTERCOMPANY_RECEIVABLE) {
        receivables += txn.amount;
      } else if (txn.transactionType === EliminationType.INTERCOMPANY_PAYABLE) {
        payables += txn.amount;
      }
    }
    const intercompanyVariance = Math.abs(receivables - payables);

    // Check trial balances
    const trialBalanceStatus = entities.map(entity => {
      const key = `${tenantId}_${entity.id}_${periodId}`;
      const tb = this.trialBalances.get(key);
      return {
        entityId: entity.id,
        entityName: entity.name,
        balanced: tb?.isBalanced ?? false,
        variance: tb ? Math.abs(tb.totalDebits - tb.totalCredits) : 0,
      };
    });

    const issues: string[] = [];
    if (intercompanyVariance > 0.01) {
      issues.push(`Intercompany imbalance of ${intercompanyVariance}`);
    }
    for (const tb of trialBalanceStatus) {
      if (!tb.balanced) {
        issues.push(`Trial balance for ${tb.entityName} is not balanced`);
      }
    }

    return {
      intercompanyBalance: {
        balanced: intercompanyVariance < 0.01,
        variance: intercompanyVariance,
      },
      trialBalanceStatus,
      eliminationsReconciled: transactions.every(t => t.status === 'MATCHED'),
      issues,
    };
  }

  async getEntityContributionReport(
    tenantId: string,
    periodId: string,
  ): Promise<{
    summary: {
      totalRevenue: number;
      totalAssets: number;
      totalEquity: number;
    };
    byEntity: Array<{
      entityId: string;
      entityName: string;
      revenue: number;
      revenueContribution: number;
      assets: number;
      assetsContribution: number;
      equity: number;
      equityContribution: number;
    }>;
  }> {
    const entities = await this.getEntities(tenantId, { isActive: true });

    // Mock data - in real implementation would aggregate from trial balances
    const entityData = entities.map(entity => ({
      entityId: entity.id,
      entityName: entity.name,
      revenue: Math.random() * 1000000,
      assets: Math.random() * 5000000,
      equity: Math.random() * 2000000,
    }));

    const totalRevenue = entityData.reduce((sum, e) => sum + e.revenue, 0);
    const totalAssets = entityData.reduce((sum, e) => sum + e.assets, 0);
    const totalEquity = entityData.reduce((sum, e) => sum + e.equity, 0);

    return {
      summary: {
        totalRevenue,
        totalAssets,
        totalEquity,
      },
      byEntity: entityData.map(e => ({
        ...e,
        revenueContribution: totalRevenue > 0 ? (e.revenue / totalRevenue) * 100 : 0,
        assetsContribution: totalAssets > 0 ? (e.assets / totalAssets) * 100 : 0,
        equityContribution: totalEquity > 0 ? (e.equity / totalEquity) * 100 : 0,
      })),
    };
  }

  async getPeriodComparison(
    tenantId: string,
    periodId1: string,
    periodId2: string,
  ): Promise<{
    period1: ConsolidationPeriod;
    period2: ConsolidationPeriod;
    comparison: {
      revenue: { period1: number; period2: number; change: number; changePercent: number };
      assets: { period1: number; period2: number; change: number; changePercent: number };
      equity: { period1: number; period2: number; change: number; changePercent: number };
      netIncome: { period1: number; period2: number; change: number; changePercent: number };
    };
  }> {
    const period1 = await this.getPeriod(tenantId, periodId1);
    const period2 = await this.getPeriod(tenantId, periodId2);

    // Mock comparison data
    const p1Revenue = 1000000;
    const p2Revenue = 1100000;
    const p1Assets = 5000000;
    const p2Assets = 5500000;
    const p1Equity = 2000000;
    const p2Equity = 2200000;
    const p1NetIncome = 200000;
    const p2NetIncome = 250000;

    return {
      period1,
      period2,
      comparison: {
        revenue: {
          period1: p1Revenue,
          period2: p2Revenue,
          change: p2Revenue - p1Revenue,
          changePercent: ((p2Revenue - p1Revenue) / p1Revenue) * 100,
        },
        assets: {
          period1: p1Assets,
          period2: p2Assets,
          change: p2Assets - p1Assets,
          changePercent: ((p2Assets - p1Assets) / p1Assets) * 100,
        },
        equity: {
          period1: p1Equity,
          period2: p2Equity,
          change: p2Equity - p1Equity,
          changePercent: ((p2Equity - p1Equity) / p1Equity) * 100,
        },
        netIncome: {
          period1: p1NetIncome,
          period2: p2NetIncome,
          change: p2NetIncome - p1NetIncome,
          changePercent: ((p2NetIncome - p1NetIncome) / p1NetIncome) * 100,
        },
      },
    };
  }

  async getConsolidationDashboard(tenantId: string): Promise<{
    activePeriods: number;
    completedPeriods: number;
    totalEntities: number;
    pendingEliminations: number;
    recentActivity: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }>;
    alerts: string[];
  }> {
    const periods = await this.getPeriods(tenantId);
    const entities = await this.getEntities(tenantId);
    const eliminations = Array.from(this.eliminations.values()).filter(
      e => e.tenantId === tenantId
    );

    const activePeriods = periods.filter(
      p => p.status === ConsolidationStatus.IN_PROGRESS || p.status === ConsolidationStatus.REVIEW
    ).length;

    const completedPeriods = periods.filter(
      p => p.status === ConsolidationStatus.PUBLISHED
    ).length;

    const pendingEliminations = eliminations.filter(e => e.status === 'DRAFT').length;

    const alerts: string[] = [];
    if (pendingEliminations > 0) {
      alerts.push(`${pendingEliminations} elimination entries pending approval`);
    }

    // Check for periods approaching deadline (mock)
    const now = new Date();
    for (const period of periods) {
      if (period.status === ConsolidationStatus.IN_PROGRESS) {
        const daysUntilEnd = Math.ceil(
          (period.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilEnd <= 5 && daysUntilEnd > 0) {
          alerts.push(`Period ${period.name} ends in ${daysUntilEnd} days`);
        }
      }
    }

    return {
      activePeriods,
      completedPeriods,
      totalEntities: entities.length,
      pendingEliminations,
      recentActivity: [
        {
          type: 'PERIOD_STATUS',
          description: 'Latest consolidation activity',
          timestamp: new Date(),
        },
      ],
      alerts,
    };
  }
}
