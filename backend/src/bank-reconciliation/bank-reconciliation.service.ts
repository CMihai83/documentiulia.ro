import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  currency: string;
  balance: number;
  lastSync: Date;
  status: 'active' | 'inactive' | 'pending_verification';
  psd2Connected: boolean;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: Date;
  valueDate: Date;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  counterparty: string;
  counterpartyIban?: string;
  type: 'credit' | 'debit';
  category?: string;
  matched: boolean;
  matchedInvoiceId?: string;
  matchedPaymentId?: string;
  reconciliationStatus: 'pending' | 'matched' | 'unmatched' | 'disputed';
}

export interface ReconciliationSession {
  id: string;
  accountId: string;
  startDate: Date;
  endDate: Date;
  status: 'in_progress' | 'completed' | 'reviewed';
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  disputedTransactions: number;
  openingBalance: number;
  closingBalance: number;
  difference: number;
  createdAt: Date;
  completedAt?: Date;
  reviewedBy?: string;
}

export interface ReconciliationRule {
  id: string;
  name: string;
  type: 'exact_match' | 'partial_match' | 'amount_range' | 'pattern';
  field: 'description' | 'reference' | 'amount' | 'counterparty';
  pattern?: string;
  amountTolerance?: number;
  action: 'auto_match' | 'suggest' | 'categorize';
  category?: string;
  enabled: boolean;
  priority: number;
}

export interface ReconciliationSuggestion {
  transactionId: string;
  invoiceId?: string;
  paymentId?: string;
  confidence: number;
  reason: string;
  type: 'invoice' | 'payment' | 'expense';
}

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);
  private accounts: BankAccount[] = [];
  private transactions: BankTransaction[] = [];
  private sessions: ReconciliationSession[] = [];
  private rules: ReconciliationRule[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock bank accounts
    this.accounts = [
      {
        id: 'acc-001',
        bankName: 'Banca Transilvania',
        accountNumber: 'RO49BTRLRONCRT0123456789',
        iban: 'RO49BTRLRONCRT0123456789',
        currency: 'RON',
        balance: 125750.50,
        lastSync: new Date(),
        status: 'active',
        psd2Connected: true,
      },
      {
        id: 'acc-002',
        bankName: 'ING Bank',
        accountNumber: 'RO84INGBRONN123456789012',
        iban: 'RO84INGBRONN123456789012',
        currency: 'RON',
        balance: 45200.00,
        lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'active',
        psd2Connected: true,
      },
      {
        id: 'acc-003',
        bankName: 'BCR',
        accountNumber: 'RO65RNCBRONN098765432109',
        iban: 'RO65RNCBRONN098765432109',
        currency: 'EUR',
        balance: 8500.00,
        lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'active',
        psd2Connected: false,
      },
    ];

    // Generate mock transactions for last 30 days
    this.generateMockTransactions();

    // Mock reconciliation rules
    this.rules = [
      {
        id: 'rule-001',
        name: 'Invoice Match by Reference',
        type: 'exact_match',
        field: 'reference',
        action: 'auto_match',
        enabled: true,
        priority: 1,
      },
      {
        id: 'rule-002',
        name: 'Utility Bills',
        type: 'pattern',
        field: 'description',
        pattern: '(ENEL|EON|ENGIE|GDF|APA|DISTRIGAZ)',
        action: 'categorize',
        category: 'utilities',
        enabled: true,
        priority: 2,
      },
      {
        id: 'rule-003',
        name: 'Salary Payments',
        type: 'pattern',
        field: 'description',
        pattern: '(SALAR|SALARY|WAGE)',
        action: 'categorize',
        category: 'salaries',
        enabled: true,
        priority: 3,
      },
      {
        id: 'rule-004',
        name: 'Amount Match with Tolerance',
        type: 'amount_range',
        field: 'amount',
        amountTolerance: 0.50,
        action: 'suggest',
        enabled: true,
        priority: 4,
      },
      {
        id: 'rule-005',
        name: 'Tax Payments (ANAF)',
        type: 'pattern',
        field: 'counterparty',
        pattern: '(ANAF|DGRFP|FISC)',
        action: 'categorize',
        category: 'taxes',
        enabled: true,
        priority: 5,
      },
    ];

    // Mock reconciliation sessions
    this.sessions = [
      {
        id: 'session-001',
        accountId: 'acc-001',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        status: 'completed',
        totalTransactions: 145,
        matchedTransactions: 138,
        unmatchedTransactions: 5,
        disputedTransactions: 2,
        openingBalance: 98500.00,
        closingBalance: 125750.50,
        difference: 0,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        reviewedBy: 'admin@documentiulia.ro',
      },
    ];
  }

  private generateMockTransactions() {
    const descriptions = [
      'Plata factura FC-2024-001',
      'Incasare client ABC SRL',
      'Transfer intern',
      'Plata ENEL factura',
      'Incasare comanda #12345',
      'Plata salarii noiembrie',
      'Taxa ANAF TVA',
      'Achizitie materiale',
      'Servicii consultanta',
      'Plata chirie birou',
    ];

    const counterparties = [
      'ABC SRL',
      'XYZ IMPEX',
      'MEGA CONSTRUCT',
      'EURO TECH',
      'ANAF BUCURESTI',
      'ENEL ENERGIE',
      'BCR ASIGURARI',
      'ORANGE ROMANIA',
    ];

    for (let i = 0; i < 60; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const isCredit = Math.random() > 0.4;
      const amount = Math.round((Math.random() * 15000 + 100) * 100) / 100;
      const matched = Math.random() > 0.3;

      this.transactions.push({
        id: `txn-${String(i).padStart(5, '0')}`,
        accountId: this.accounts[Math.floor(Math.random() * this.accounts.length)].id,
        date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        valueDate: new Date(Date.now() - (daysAgo + 1) * 24 * 60 * 60 * 1000),
        amount: isCredit ? amount : -amount,
        currency: 'RON',
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        reference: `REF-${Date.now()}-${i}`,
        counterparty: counterparties[Math.floor(Math.random() * counterparties.length)],
        type: isCredit ? 'credit' : 'debit',
        matched,
        reconciliationStatus: matched ? 'matched' : (Math.random() > 0.8 ? 'disputed' : 'pending'),
        matchedInvoiceId: matched ? `INV-${Math.floor(Math.random() * 1000)}` : undefined,
      });
    }
  }

  // Account Management
  async getAccounts(): Promise<BankAccount[]> {
    return this.accounts;
  }

  async getAccountById(id: string): Promise<BankAccount | undefined> {
    return this.accounts.find(a => a.id === id);
  }

  async addAccount(accountData: Partial<BankAccount>): Promise<BankAccount> {
    const account: BankAccount = {
      id: `acc-${Date.now()}`,
      bankName: accountData.bankName || 'Unknown Bank',
      accountNumber: accountData.accountNumber || '',
      iban: accountData.iban || '',
      currency: accountData.currency || 'RON',
      balance: accountData.balance || 0,
      lastSync: new Date(),
      status: 'pending_verification',
      psd2Connected: false,
    };
    this.accounts.push(account);
    return account;
  }

  async syncAccount(accountId: string): Promise<{ success: boolean; transactionsSynced: number }> {
    const account = this.accounts.find(a => a.id === accountId);
    if (!account) {
      return { success: false, transactionsSynced: 0 };
    }

    // Simulate PSD2 sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    account.lastSync = new Date();

    const newTransactions = Math.floor(Math.random() * 10);
    this.logger.log(`Synced ${newTransactions} new transactions for account ${accountId}`);

    return { success: true, transactionsSynced: newTransactions };
  }

  // Transaction Management
  async getTransactions(
    accountId?: string,
    startDate?: Date,
    endDate?: Date,
    status?: string,
    limit = 50,
    offset = 0,
  ): Promise<{ transactions: BankTransaction[]; total: number }> {
    let filtered = this.transactions;

    if (accountId) {
      filtered = filtered.filter(t => t.accountId === accountId);
    }
    if (startDate) {
      filtered = filtered.filter(t => t.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(t => t.date <= endDate);
    }
    if (status) {
      filtered = filtered.filter(t => t.reconciliationStatus === status);
    }

    filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      transactions: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  async getTransactionById(id: string): Promise<BankTransaction | undefined> {
    return this.transactions.find(t => t.id === id);
  }

  async matchTransaction(
    transactionId: string,
    matchType: 'invoice' | 'payment' | 'expense',
    matchId: string,
  ): Promise<{ success: boolean; transaction: BankTransaction | undefined }> {
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (!transaction) {
      return { success: false, transaction: undefined };
    }

    transaction.matched = true;
    transaction.reconciliationStatus = 'matched';

    if (matchType === 'invoice') {
      transaction.matchedInvoiceId = matchId;
    } else if (matchType === 'payment') {
      transaction.matchedPaymentId = matchId;
    }

    this.logger.log(`Transaction ${transactionId} matched to ${matchType} ${matchId}`);
    return { success: true, transaction };
  }

  async unmatchTransaction(transactionId: string): Promise<{ success: boolean }> {
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (!transaction) {
      return { success: false };
    }

    transaction.matched = false;
    transaction.reconciliationStatus = 'pending';
    transaction.matchedInvoiceId = undefined;
    transaction.matchedPaymentId = undefined;

    return { success: true };
  }

  async disputeTransaction(transactionId: string, reason: string): Promise<{ success: boolean }> {
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (!transaction) {
      return { success: false };
    }

    transaction.reconciliationStatus = 'disputed';
    this.logger.log(`Transaction ${transactionId} disputed: ${reason}`);
    return { success: true };
  }

  // AI-Powered Matching Suggestions
  async getSuggestions(transactionId: string): Promise<ReconciliationSuggestion[]> {
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.matched) {
      return [];
    }

    const suggestions: ReconciliationSuggestion[] = [];

    // Simulate AI matching based on amount and description
    if (transaction.type === 'credit' && transaction.amount > 0) {
      // Suggest matching invoices
      suggestions.push({
        transactionId,
        invoiceId: `INV-${Math.floor(Math.random() * 10000)}`,
        confidence: 0.85 + Math.random() * 0.10,
        reason: `Amount matches invoice total (${transaction.amount} RON)`,
        type: 'invoice',
      });

      if (transaction.description.includes('factura')) {
        suggestions[0].confidence = 0.95;
        suggestions[0].reason = 'Reference matches invoice number in description';
      }
    } else {
      // Suggest matching expenses/payments
      suggestions.push({
        transactionId,
        paymentId: `PAY-${Math.floor(Math.random() * 10000)}`,
        confidence: 0.75 + Math.random() * 0.15,
        reason: 'Matches expected payment based on counterparty history',
        type: 'payment',
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  async autoMatchTransactions(accountId: string): Promise<{
    processed: number;
    matched: number;
    suggestions: number;
  }> {
    const accountTransactions = this.transactions.filter(
      t => t.accountId === accountId && t.reconciliationStatus === 'pending',
    );

    let matched = 0;
    let suggestions = 0;

    for (const transaction of accountTransactions) {
      // Apply rules
      for (const rule of this.rules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority)) {
        if (rule.action === 'auto_match' && this.ruleMatches(transaction, rule)) {
          transaction.matched = true;
          transaction.reconciliationStatus = 'matched';
          matched++;
          break;
        } else if (rule.action === 'suggest' && this.ruleMatches(transaction, rule)) {
          suggestions++;
        }
      }
    }

    this.logger.log(`Auto-matched ${matched} transactions, ${suggestions} suggestions for account ${accountId}`);
    return { processed: accountTransactions.length, matched, suggestions };
  }

  private ruleMatches(transaction: BankTransaction, rule: ReconciliationRule): boolean {
    if (rule.type === 'pattern' && rule.pattern) {
      const regex = new RegExp(rule.pattern, 'i');
      const fieldValue = transaction[rule.field as keyof BankTransaction];
      return typeof fieldValue === 'string' && regex.test(fieldValue);
    }
    if (rule.type === 'amount_range' && rule.amountTolerance) {
      return Math.abs(transaction.amount) > 0; // Simplified for demo
    }
    return false;
  }

  // Reconciliation Sessions
  async createSession(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ReconciliationSession> {
    const accountTransactions = this.transactions.filter(
      t => t.accountId === accountId && t.date >= startDate && t.date <= endDate,
    );

    const session: ReconciliationSession = {
      id: `session-${Date.now()}`,
      accountId,
      startDate,
      endDate,
      status: 'in_progress',
      totalTransactions: accountTransactions.length,
      matchedTransactions: accountTransactions.filter(t => t.matched).length,
      unmatchedTransactions: accountTransactions.filter(t => !t.matched && t.reconciliationStatus !== 'disputed').length,
      disputedTransactions: accountTransactions.filter(t => t.reconciliationStatus === 'disputed').length,
      openingBalance: 0,
      closingBalance: 0,
      difference: 0,
      createdAt: new Date(),
    };

    this.sessions.push(session);
    return session;
  }

  async getSessions(accountId?: string): Promise<ReconciliationSession[]> {
    if (accountId) {
      return this.sessions.filter(s => s.accountId === accountId);
    }
    return this.sessions;
  }

  async getSessionById(id: string): Promise<ReconciliationSession | undefined> {
    return this.sessions.find(s => s.id === id);
  }

  async completeSession(sessionId: string): Promise<{ success: boolean; session?: ReconciliationSession }> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false };
    }

    session.status = 'completed';
    session.completedAt = new Date();
    return { success: true, session };
  }

  // Rules Management
  async getRules(): Promise<ReconciliationRule[]> {
    return this.rules.sort((a, b) => a.priority - b.priority);
  }

  async createRule(ruleData: Partial<ReconciliationRule>): Promise<ReconciliationRule> {
    const rule: ReconciliationRule = {
      id: `rule-${Date.now()}`,
      name: ruleData.name || 'New Rule',
      type: ruleData.type || 'pattern',
      field: ruleData.field || 'description',
      pattern: ruleData.pattern,
      amountTolerance: ruleData.amountTolerance,
      action: ruleData.action || 'suggest',
      category: ruleData.category,
      enabled: ruleData.enabled ?? true,
      priority: ruleData.priority || this.rules.length + 1,
    };
    this.rules.push(rule);
    return rule;
  }

  async updateRule(id: string, updates: Partial<ReconciliationRule>): Promise<ReconciliationRule | undefined> {
    const rule = this.rules.find(r => r.id === id);
    if (!rule) return undefined;

    Object.assign(rule, updates);
    return rule;
  }

  async deleteRule(id: string): Promise<boolean> {
    const index = this.rules.findIndex(r => r.id === id);
    if (index === -1) return false;
    this.rules.splice(index, 1);
    return true;
  }

  // Dashboard & Statistics
  async getDashboard(accountId?: string): Promise<{
    accounts: {
      total: number;
      active: number;
      psd2Connected: number;
      totalBalance: number;
    };
    transactions: {
      pending: number;
      matched: number;
      unmatched: number;
      disputed: number;
    };
    reconciliation: {
      lastSessionDate?: Date;
      matchRate: number;
      pendingReview: number;
    };
    recentActivity: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }>;
  }> {
    const activeAccounts = this.accounts.filter(a => a.status === 'active');
    const relevantTransactions = accountId
      ? this.transactions.filter(t => t.accountId === accountId)
      : this.transactions;

    const matchedCount = relevantTransactions.filter(t => t.reconciliationStatus === 'matched').length;
    const totalCount = relevantTransactions.length;

    return {
      accounts: {
        total: this.accounts.length,
        active: activeAccounts.length,
        psd2Connected: this.accounts.filter(a => a.psd2Connected).length,
        totalBalance: activeAccounts.reduce((sum, a) => sum + a.balance, 0),
      },
      transactions: {
        pending: relevantTransactions.filter(t => t.reconciliationStatus === 'pending').length,
        matched: matchedCount,
        unmatched: relevantTransactions.filter(t => t.reconciliationStatus === 'unmatched').length,
        disputed: relevantTransactions.filter(t => t.reconciliationStatus === 'disputed').length,
      },
      reconciliation: {
        lastSessionDate: this.sessions.length > 0
          ? this.sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
          : undefined,
        matchRate: totalCount > 0 ? (matchedCount / totalCount) * 100 : 0,
        pendingReview: this.sessions.filter(s => s.status === 'in_progress').length,
      },
      recentActivity: [
        { type: 'sync', description: 'Account BT synced - 5 new transactions', timestamp: new Date() },
        { type: 'match', description: 'Auto-matched 12 transactions', timestamp: new Date(Date.now() - 3600000) },
        { type: 'review', description: 'Reconciliation session completed', timestamp: new Date(Date.now() - 7200000) },
      ],
    };
  }

  // Import bank statements
  async importStatement(
    accountId: string,
    format: 'mt940' | 'camt053' | 'csv' | 'ofx',
    data: string,
  ): Promise<{ success: boolean; imported: number; errors: string[] }> {
    // Simulate import processing
    this.logger.log(`Importing ${format} statement for account ${accountId}`);

    const importedCount = Math.floor(Math.random() * 20) + 5;

    return {
      success: true,
      imported: importedCount,
      errors: [],
    };
  }

  // Export reconciliation report
  async exportReport(
    sessionId: string,
    format: 'pdf' | 'xlsx' | 'csv',
  ): Promise<{ success: boolean; downloadUrl?: string }> {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false };
    }

    return {
      success: true,
      downloadUrl: `/api/v1/bank-reconciliation/reports/${sessionId}.${format}`,
    };
  }

  // Scheduled sync job
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSync() {
    this.logger.log('Running scheduled bank account sync...');

    const connectedAccounts = this.accounts.filter(a => a.psd2Connected && a.status === 'active');
    for (const account of connectedAccounts) {
      await this.syncAccount(account.id);
    }
  }

  // Daily reconciliation check
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async dailyReconciliationCheck() {
    this.logger.log('Running daily reconciliation check...');

    const pendingTransactions = this.transactions.filter(t => t.reconciliationStatus === 'pending');
    if (pendingTransactions.length > 10) {
      this.logger.warn(`${pendingTransactions.length} transactions pending reconciliation`);
    }
  }
}
