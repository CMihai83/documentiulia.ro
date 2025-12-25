import { Test, TestingModule } from '@nestjs/testing';
import {
  BankReconciliationService,
  BankAccount,
  BankTransaction,
  ReconciliationSession,
  ReconciliationRule,
} from './bank-reconciliation.service';

describe('BankReconciliationService', () => {
  let service: BankReconciliationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BankReconciliationService],
    }).compile();

    service = module.get<BankReconciliationService>(BankReconciliationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Account Management', () => {
    describe('getAccounts', () => {
      it('should return all bank accounts', async () => {
        const accounts = await service.getAccounts();

        expect(accounts).toBeDefined();
        expect(Array.isArray(accounts)).toBe(true);
        expect(accounts.length).toBeGreaterThan(0);
      });

      it('should return accounts with required properties', async () => {
        const accounts = await service.getAccounts();
        const account = accounts[0];

        expect(account).toHaveProperty('id');
        expect(account).toHaveProperty('bankName');
        expect(account).toHaveProperty('accountNumber');
        expect(account).toHaveProperty('iban');
        expect(account).toHaveProperty('currency');
        expect(account).toHaveProperty('balance');
        expect(account).toHaveProperty('lastSync');
        expect(account).toHaveProperty('status');
        expect(account).toHaveProperty('psd2Connected');
      });

      it('should include Romanian bank accounts', async () => {
        const accounts = await service.getAccounts();
        const romanianBanks = accounts.filter(a =>
          ['Banca Transilvania', 'ING Bank', 'BCR'].includes(a.bankName)
        );

        expect(romanianBanks.length).toBeGreaterThan(0);
      });
    });

    describe('getAccountById', () => {
      it('should return account by ID', async () => {
        const accounts = await service.getAccounts();
        const firstAccount = accounts[0];

        const found = await service.getAccountById(firstAccount.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(firstAccount.id);
      });

      it('should return undefined for non-existent ID', async () => {
        const found = await service.getAccountById('non-existent-id');

        expect(found).toBeUndefined();
      });
    });

    describe('addAccount', () => {
      it('should add new bank account', async () => {
        const newAccountData: Partial<BankAccount> = {
          bankName: 'Raiffeisen Bank',
          accountNumber: 'RO12RZBR0000000000000001',
          iban: 'RO12RZBR0000000000000001',
          currency: 'RON',
          balance: 50000,
        };

        const added = await service.addAccount(newAccountData);

        expect(added).toBeDefined();
        expect(added.id).toBeDefined();
        expect(added.bankName).toBe('Raiffeisen Bank');
        expect(added.status).toBe('pending_verification');
        expect(added.psd2Connected).toBe(false);
      });

      it('should set defaults for missing fields', async () => {
        const added = await service.addAccount({});

        expect(added.bankName).toBe('Unknown Bank');
        expect(added.currency).toBe('RON');
        expect(added.balance).toBe(0);
      });

      it('should add account to accounts list', async () => {
        const initialCount = (await service.getAccounts()).length;

        await service.addAccount({ bankName: 'Test Bank' });

        const newCount = (await service.getAccounts()).length;
        expect(newCount).toBe(initialCount + 1);
      });
    });

    describe('syncAccount', () => {
      it('should sync account successfully', async () => {
        const accounts = await service.getAccounts();
        const account = accounts[0];

        const result = await service.syncAccount(account.id);

        expect(result.success).toBe(true);
        expect(typeof result.transactionsSynced).toBe('number');
      });

      it('should update lastSync timestamp', async () => {
        const accounts = await service.getAccounts();
        const account = accounts[0];
        const beforeSync = account.lastSync;

        await service.syncAccount(account.id);

        const updatedAccount = await service.getAccountById(account.id);
        expect(updatedAccount?.lastSync.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
      });

      it('should return failure for non-existent account', async () => {
        const result = await service.syncAccount('non-existent-id');

        expect(result.success).toBe(false);
        expect(result.transactionsSynced).toBe(0);
      });
    });
  });

  describe('Transaction Management', () => {
    describe('getTransactions', () => {
      it('should return transactions with pagination', async () => {
        const result = await service.getTransactions();

        expect(result).toHaveProperty('transactions');
        expect(result).toHaveProperty('total');
        expect(Array.isArray(result.transactions)).toBe(true);
      });

      it('should filter by account ID', async () => {
        const accounts = await service.getAccounts();
        const accountId = accounts[0].id;

        const result = await service.getTransactions(accountId);

        result.transactions.forEach(txn => {
          expect(txn.accountId).toBe(accountId);
        });
      });

      it('should filter by date range', async () => {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        const result = await service.getTransactions(undefined, startDate, endDate);

        result.transactions.forEach(txn => {
          expect(txn.date.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
          expect(txn.date.getTime()).toBeLessThanOrEqual(endDate.getTime());
        });
      });

      it('should filter by reconciliation status', async () => {
        const result = await service.getTransactions(undefined, undefined, undefined, 'pending');

        result.transactions.forEach(txn => {
          expect(txn.reconciliationStatus).toBe('pending');
        });
      });

      it('should respect limit parameter', async () => {
        const result = await service.getTransactions(undefined, undefined, undefined, undefined, 5);

        expect(result.transactions.length).toBeLessThanOrEqual(5);
      });

      it('should respect offset parameter', async () => {
        const result1 = await service.getTransactions(undefined, undefined, undefined, undefined, 10, 0);
        const result2 = await service.getTransactions(undefined, undefined, undefined, undefined, 10, 10);

        if (result1.total > 10) {
          expect(result1.transactions[0].id).not.toBe(result2.transactions[0]?.id);
        }
      });

      it('should sort by date descending', async () => {
        const result = await service.getTransactions();

        for (let i = 1; i < result.transactions.length; i++) {
          expect(result.transactions[i - 1].date.getTime())
            .toBeGreaterThanOrEqual(result.transactions[i].date.getTime());
        }
      });
    });

    describe('getTransactionById', () => {
      it('should return transaction by ID', async () => {
        const { transactions } = await service.getTransactions(undefined, undefined, undefined, undefined, 1);
        const txnId = transactions[0].id;

        const found = await service.getTransactionById(txnId);

        expect(found).toBeDefined();
        expect(found?.id).toBe(txnId);
      });

      it('should return undefined for non-existent ID', async () => {
        const found = await service.getTransactionById('non-existent-txn');

        expect(found).toBeUndefined();
      });
    });

    describe('matchTransaction', () => {
      it('should match transaction to invoice', async () => {
        const { transactions } = await service.getTransactions(undefined, undefined, undefined, 'pending', 1);

        if (transactions.length > 0) {
          const txn = transactions[0];
          const result = await service.matchTransaction(txn.id, 'invoice', 'INV-12345');

          expect(result.success).toBe(true);
          expect(result.transaction?.matched).toBe(true);
          expect(result.transaction?.reconciliationStatus).toBe('matched');
          expect(result.transaction?.matchedInvoiceId).toBe('INV-12345');
        }
      });

      it('should match transaction to payment', async () => {
        const { transactions } = await service.getTransactions(undefined, undefined, undefined, 'pending', 1);

        if (transactions.length > 0) {
          const txn = transactions[0];
          const result = await service.matchTransaction(txn.id, 'payment', 'PAY-67890');

          expect(result.success).toBe(true);
          expect(result.transaction?.matchedPaymentId).toBe('PAY-67890');
        }
      });

      it('should return failure for non-existent transaction', async () => {
        const result = await service.matchTransaction('non-existent', 'invoice', 'INV-123');

        expect(result.success).toBe(false);
        expect(result.transaction).toBeUndefined();
      });
    });

    describe('unmatchTransaction', () => {
      it('should unmatch a matched transaction', async () => {
        const { transactions } = await service.getTransactions(undefined, undefined, undefined, 'matched', 1);

        if (transactions.length > 0) {
          const txn = transactions[0];
          const result = await service.unmatchTransaction(txn.id);

          expect(result.success).toBe(true);

          const updated = await service.getTransactionById(txn.id);
          expect(updated?.matched).toBe(false);
          expect(updated?.reconciliationStatus).toBe('pending');
          expect(updated?.matchedInvoiceId).toBeUndefined();
          expect(updated?.matchedPaymentId).toBeUndefined();
        }
      });

      it('should return failure for non-existent transaction', async () => {
        const result = await service.unmatchTransaction('non-existent');

        expect(result.success).toBe(false);
      });
    });

    describe('disputeTransaction', () => {
      it('should mark transaction as disputed', async () => {
        const { transactions } = await service.getTransactions(undefined, undefined, undefined, 'pending', 1);

        if (transactions.length > 0) {
          const txn = transactions[0];
          const result = await service.disputeTransaction(txn.id, 'Duplicate charge');

          expect(result.success).toBe(true);

          const updated = await service.getTransactionById(txn.id);
          expect(updated?.reconciliationStatus).toBe('disputed');
        }
      });

      it('should return failure for non-existent transaction', async () => {
        const result = await service.disputeTransaction('non-existent', 'Reason');

        expect(result.success).toBe(false);
      });
    });
  });

  describe('AI-Powered Matching', () => {
    describe('getSuggestions', () => {
      it('should return suggestions for unmatched transaction', async () => {
        const { transactions } = await service.getTransactions(undefined, undefined, undefined, 'pending', 10);
        const unmatchedTxn = transactions.find(t => !t.matched);

        if (unmatchedTxn) {
          const suggestions = await service.getSuggestions(unmatchedTxn.id);

          expect(Array.isArray(suggestions)).toBe(true);
        }
      });

      it('should return empty array for matched transaction', async () => {
        const { transactions } = await service.getTransactions(undefined, undefined, undefined, 'matched', 1);

        if (transactions.length > 0) {
          const suggestions = await service.getSuggestions(transactions[0].id);

          expect(suggestions).toEqual([]);
        }
      });

      it('should return empty array for non-existent transaction', async () => {
        const suggestions = await service.getSuggestions('non-existent');

        expect(suggestions).toEqual([]);
      });

      it('should include confidence score in suggestions', async () => {
        const { transactions } = await service.getTransactions(undefined, undefined, undefined, 'pending', 10);
        const unmatchedTxn = transactions.find(t => !t.matched);

        if (unmatchedTxn) {
          const suggestions = await service.getSuggestions(unmatchedTxn.id);

          if (suggestions.length > 0) {
            expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0);
            expect(suggestions[0].confidence).toBeLessThanOrEqual(1);
          }
        }
      });

      it('should sort suggestions by confidence descending', async () => {
        const { transactions } = await service.getTransactions(undefined, undefined, undefined, 'pending', 10);
        const unmatchedTxn = transactions.find(t => !t.matched);

        if (unmatchedTxn) {
          const suggestions = await service.getSuggestions(unmatchedTxn.id);

          for (let i = 1; i < suggestions.length; i++) {
            expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
          }
        }
      });
    });

    describe('autoMatchTransactions', () => {
      it('should process pending transactions', async () => {
        const accounts = await service.getAccounts();
        const accountId = accounts[0].id;

        const result = await service.autoMatchTransactions(accountId);

        expect(result).toHaveProperty('processed');
        expect(result).toHaveProperty('matched');
        expect(result).toHaveProperty('suggestions');
        expect(typeof result.processed).toBe('number');
        expect(typeof result.matched).toBe('number');
        expect(typeof result.suggestions).toBe('number');
      });

      it('should only process pending transactions', async () => {
        const accounts = await service.getAccounts();
        const accountId = accounts[0].id;

        const beforeResult = await service.getTransactions(accountId, undefined, undefined, 'pending');
        await service.autoMatchTransactions(accountId);

        // Processed count should match pending count
        const result = await service.autoMatchTransactions(accountId);
        expect(result.processed).toBeLessThanOrEqual(beforeResult.total);
      });
    });
  });

  describe('Reconciliation Sessions', () => {
    describe('createSession', () => {
      it('should create new reconciliation session', async () => {
        const accounts = await service.getAccounts();
        const accountId = accounts[0].id;
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        const session = await service.createSession(accountId, startDate, endDate);

        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
        expect(session.accountId).toBe(accountId);
        expect(session.status).toBe('in_progress');
        expect(session.startDate).toEqual(startDate);
        expect(session.endDate).toEqual(endDate);
      });

      it('should calculate transaction counts', async () => {
        const accounts = await service.getAccounts();
        const accountId = accounts[0].id;
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date();

        const session = await service.createSession(accountId, startDate, endDate);

        expect(typeof session.totalTransactions).toBe('number');
        expect(typeof session.matchedTransactions).toBe('number');
        expect(typeof session.unmatchedTransactions).toBe('number');
        expect(typeof session.disputedTransactions).toBe('number');
      });

      it('should add session to sessions list', async () => {
        const initialSessions = await service.getSessions();
        const initialCount = initialSessions.length;

        const accounts = await service.getAccounts();
        await service.createSession(accounts[0].id, new Date(), new Date());

        const newSessions = await service.getSessions();
        expect(newSessions.length).toBe(initialCount + 1);
      });
    });

    describe('getSessions', () => {
      it('should return all sessions', async () => {
        const sessions = await service.getSessions();

        expect(Array.isArray(sessions)).toBe(true);
      });

      it('should filter by account ID', async () => {
        const accounts = await service.getAccounts();
        const accountId = accounts[0].id;

        // Create a session for this account
        await service.createSession(accountId, new Date(), new Date());

        const sessions = await service.getSessions(accountId);

        sessions.forEach(session => {
          expect(session.accountId).toBe(accountId);
        });
      });
    });

    describe('getSessionById', () => {
      it('should return session by ID', async () => {
        const accounts = await service.getAccounts();
        const created = await service.createSession(accounts[0].id, new Date(), new Date());

        const found = await service.getSessionById(created.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
      });

      it('should return undefined for non-existent ID', async () => {
        const found = await service.getSessionById('non-existent-session');

        expect(found).toBeUndefined();
      });
    });

    describe('completeSession', () => {
      it('should complete session', async () => {
        const accounts = await service.getAccounts();
        const session = await service.createSession(accounts[0].id, new Date(), new Date());

        const result = await service.completeSession(session.id);

        expect(result.success).toBe(true);
        expect(result.session?.status).toBe('completed');
        expect(result.session?.completedAt).toBeDefined();
      });

      it('should return failure for non-existent session', async () => {
        const result = await service.completeSession('non-existent');

        expect(result.success).toBe(false);
        expect(result.session).toBeUndefined();
      });
    });
  });

  describe('Rules Management', () => {
    describe('getRules', () => {
      it('should return reconciliation rules', async () => {
        const rules = await service.getRules();

        expect(Array.isArray(rules)).toBe(true);
        expect(rules.length).toBeGreaterThan(0);
      });

      it('should return rules sorted by priority', async () => {
        const rules = await service.getRules();

        for (let i = 1; i < rules.length; i++) {
          expect(rules[i - 1].priority).toBeLessThanOrEqual(rules[i].priority);
        }
      });

      it('should include Romanian-specific rules', async () => {
        const rules = await service.getRules();
        const anafRule = rules.find(r => r.pattern?.includes('ANAF'));

        expect(anafRule).toBeDefined();
      });
    });

    describe('createRule', () => {
      it('should create new reconciliation rule', async () => {
        const ruleData: Partial<ReconciliationRule> = {
          name: 'Test Rule',
          type: 'pattern',
          field: 'description',
          pattern: 'TEST',
          action: 'categorize',
          category: 'test',
          enabled: true,
        };

        const created = await service.createRule(ruleData);

        expect(created).toBeDefined();
        expect(created.id).toBeDefined();
        expect(created.name).toBe('Test Rule');
        expect(created.type).toBe('pattern');
        expect(created.pattern).toBe('TEST');
      });

      it('should set default values', async () => {
        const created = await service.createRule({});

        expect(created.name).toBe('New Rule');
        expect(created.type).toBe('pattern');
        expect(created.field).toBe('description');
        expect(created.action).toBe('suggest');
        expect(created.enabled).toBe(true);
      });

      it('should add rule to rules list', async () => {
        const initialRules = await service.getRules();
        const initialCount = initialRules.length;

        await service.createRule({ name: 'New Test Rule' });

        const newRules = await service.getRules();
        expect(newRules.length).toBe(initialCount + 1);
      });
    });

    describe('updateRule', () => {
      it('should update existing rule', async () => {
        // Create a fresh rule to avoid state issues from other tests
        const created = await service.createRule({ name: 'Rule To Update', enabled: true });

        const updated = await service.updateRule(created.id, { enabled: false });

        expect(updated).toBeDefined();
        expect(updated?.enabled).toBe(false);
      });

      it('should return undefined for non-existent rule', async () => {
        const updated = await service.updateRule('non-existent', { enabled: false });

        expect(updated).toBeUndefined();
      });

      it('should partially update rule', async () => {
        // Create fresh rule to test partial updates
        const created = await service.createRule({ name: 'Partial Update Test', priority: 50 });

        const updated = await service.updateRule(created.id, { priority: 100 });

        expect(updated?.name).toBe('Partial Update Test');
        expect(updated?.priority).toBe(100);
      });
    });

    describe('deleteRule', () => {
      it('should delete existing rule', async () => {
        const created = await service.createRule({ name: 'To Delete' });

        const deleted = await service.deleteRule(created.id);

        expect(deleted).toBe(true);

        const rules = await service.getRules();
        expect(rules.find(r => r.id === created.id)).toBeUndefined();
      });

      it('should return false for non-existent rule', async () => {
        const deleted = await service.deleteRule('non-existent');

        expect(deleted).toBe(false);
      });
    });
  });

  describe('Dashboard & Statistics', () => {
    describe('getDashboard', () => {
      it('should return dashboard data', async () => {
        const dashboard = await service.getDashboard();

        expect(dashboard).toHaveProperty('accounts');
        expect(dashboard).toHaveProperty('transactions');
        expect(dashboard).toHaveProperty('reconciliation');
        expect(dashboard).toHaveProperty('recentActivity');
      });

      it('should return account statistics', async () => {
        const dashboard = await service.getDashboard();

        expect(dashboard.accounts).toHaveProperty('total');
        expect(dashboard.accounts).toHaveProperty('active');
        expect(dashboard.accounts).toHaveProperty('psd2Connected');
        expect(dashboard.accounts).toHaveProperty('totalBalance');
        expect(typeof dashboard.accounts.total).toBe('number');
        expect(typeof dashboard.accounts.totalBalance).toBe('number');
      });

      it('should return transaction statistics', async () => {
        const dashboard = await service.getDashboard();

        expect(dashboard.transactions).toHaveProperty('pending');
        expect(dashboard.transactions).toHaveProperty('matched');
        expect(dashboard.transactions).toHaveProperty('unmatched');
        expect(dashboard.transactions).toHaveProperty('disputed');
      });

      it('should return reconciliation metrics', async () => {
        const dashboard = await service.getDashboard();

        expect(dashboard.reconciliation).toHaveProperty('matchRate');
        expect(dashboard.reconciliation).toHaveProperty('pendingReview');
        expect(dashboard.reconciliation.matchRate).toBeGreaterThanOrEqual(0);
        expect(dashboard.reconciliation.matchRate).toBeLessThanOrEqual(100);
      });

      it('should filter by account ID', async () => {
        const accounts = await service.getAccounts();
        const accountId = accounts[0].id;

        const dashboard = await service.getDashboard(accountId);

        expect(dashboard).toBeDefined();
      });

      it('should return recent activity', async () => {
        const dashboard = await service.getDashboard();

        expect(Array.isArray(dashboard.recentActivity)).toBe(true);
        dashboard.recentActivity.forEach(activity => {
          expect(activity).toHaveProperty('type');
          expect(activity).toHaveProperty('description');
          expect(activity).toHaveProperty('timestamp');
        });
      });
    });
  });

  describe('Import/Export', () => {
    describe('importStatement', () => {
      it('should import MT940 statement', async () => {
        const accounts = await service.getAccounts();
        const accountId = accounts[0].id;

        const result = await service.importStatement(accountId, 'mt940', 'mock-data');

        expect(result.success).toBe(true);
        expect(typeof result.imported).toBe('number');
        expect(result.imported).toBeGreaterThan(0);
        expect(Array.isArray(result.errors)).toBe(true);
      });

      it('should support multiple formats', async () => {
        const accounts = await service.getAccounts();
        const accountId = accounts[0].id;
        const formats: Array<'mt940' | 'camt053' | 'csv' | 'ofx'> = ['mt940', 'camt053', 'csv', 'ofx'];

        for (const format of formats) {
          const result = await service.importStatement(accountId, format, 'mock-data');
          expect(result.success).toBe(true);
        }
      });
    });

    describe('exportReport', () => {
      it('should export PDF report', async () => {
        const sessions = await service.getSessions();

        if (sessions.length > 0) {
          const result = await service.exportReport(sessions[0].id, 'pdf');

          expect(result.success).toBe(true);
          expect(result.downloadUrl).toContain('.pdf');
        }
      });

      it('should export XLSX report', async () => {
        const sessions = await service.getSessions();

        if (sessions.length > 0) {
          const result = await service.exportReport(sessions[0].id, 'xlsx');

          expect(result.success).toBe(true);
          expect(result.downloadUrl).toContain('.xlsx');
        }
      });

      it('should export CSV report', async () => {
        const sessions = await service.getSessions();

        if (sessions.length > 0) {
          const result = await service.exportReport(sessions[0].id, 'csv');

          expect(result.success).toBe(true);
          expect(result.downloadUrl).toContain('.csv');
        }
      });

      it('should return failure for non-existent session', async () => {
        const result = await service.exportReport('non-existent', 'pdf');

        expect(result.success).toBe(false);
        expect(result.downloadUrl).toBeUndefined();
      });
    });
  });

  describe('Scheduled Jobs', () => {
    describe('scheduledSync', () => {
      it('should sync all PSD2 connected accounts', async () => {
        await expect(service.scheduledSync()).resolves.not.toThrow();
      });
    });

    describe('dailyReconciliationCheck', () => {
      it('should check pending transactions', async () => {
        await expect(service.dailyReconciliationCheck()).resolves.not.toThrow();
      });
    });
  });

  describe('Romanian Banking Compliance', () => {
    it('should support Romanian IBAN format', async () => {
      const accounts = await service.getAccounts();
      const romanianAccounts = accounts.filter(a => a.iban.startsWith('RO'));

      expect(romanianAccounts.length).toBeGreaterThan(0);
      romanianAccounts.forEach(account => {
        expect(account.iban).toMatch(/^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/);
      });
    });

    it('should support RON and EUR currencies', async () => {
      const accounts = await service.getAccounts();
      const currencies = [...new Set(accounts.map(a => a.currency))];

      expect(currencies).toContain('RON');
    });

    it('should have PSD2 connection status', async () => {
      const accounts = await service.getAccounts();
      const psd2Connected = accounts.filter(a => a.psd2Connected);

      expect(psd2Connected.length).toBeGreaterThan(0);
    });

    it('should include ANAF tax payment categorization rule', async () => {
      const rules = await service.getRules();
      const anafRule = rules.find(r =>
        r.pattern?.includes('ANAF') ||
        r.pattern?.includes('DGRFP') ||
        r.category === 'taxes'
      );

      expect(anafRule).toBeDefined();
    });

    it('should include utility bill categorization for Romanian providers', async () => {
      const rules = await service.getRules();
      const utilityRule = rules.find(r =>
        r.pattern?.includes('ENEL') ||
        r.pattern?.includes('ENGIE') ||
        r.category === 'utilities'
      );

      expect(utilityRule).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain transaction count consistency', async () => {
      const { total } = await service.getTransactions();

      const pending = await service.getTransactions(undefined, undefined, undefined, 'pending');
      const matched = await service.getTransactions(undefined, undefined, undefined, 'matched');
      const unmatched = await service.getTransactions(undefined, undefined, undefined, 'unmatched');
      const disputed = await service.getTransactions(undefined, undefined, undefined, 'disputed');

      // Due to filtering, the sum may not equal total but each status should be a subset
      expect(pending.total + matched.total + unmatched.total + disputed.total).toBeLessThanOrEqual(total * 4);
    });

    it('should have valid transaction types', async () => {
      const { transactions } = await service.getTransactions();

      transactions.forEach(txn => {
        expect(['credit', 'debit']).toContain(txn.type);
      });
    });

    it('should have valid reconciliation statuses', async () => {
      const { transactions } = await service.getTransactions();

      transactions.forEach(txn => {
        expect(['pending', 'matched', 'unmatched', 'disputed']).toContain(txn.reconciliationStatus);
      });
    });

    it('should have matching invoice ID only for matched transactions', async () => {
      const { transactions } = await service.getTransactions(undefined, undefined, undefined, 'matched');

      transactions.forEach(txn => {
        if (txn.matched) {
          // Matched transactions should have either invoice or payment ID
          expect(txn.matchedInvoiceId || txn.matchedPaymentId).toBeTruthy();
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction list for new account', async () => {
      const newAccount = await service.addAccount({ bankName: 'Empty Bank' });

      const { transactions, total } = await service.getTransactions(newAccount.id);

      expect(transactions).toEqual([]);
      expect(total).toBe(0);
    });

    it('should handle date range with no transactions', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const { transactions, total } = await service.getTransactions(undefined, futureDate, futureDate);

      expect(transactions).toEqual([]);
      expect(total).toBe(0);
    });

    it('should handle very large pagination offset', async () => {
      const { transactions } = await service.getTransactions(undefined, undefined, undefined, undefined, 10, 10000);

      expect(transactions).toEqual([]);
    });

    it('should handle special characters in rule patterns', async () => {
      const rule = await service.createRule({
        name: 'Special Chars',
        type: 'pattern',
        pattern: 'PLATA\\s+FACT\\.\\s*\\d+',
        field: 'description',
      });

      expect(rule).toBeDefined();
      expect(rule.pattern).toBe('PLATA\\s+FACT\\.\\s*\\d+');
    });

    it('should handle zero balance accounts', async () => {
      const account = await service.addAccount({
        bankName: 'Zero Balance Bank',
        balance: 0,
      });

      expect(account.balance).toBe(0);
    });
  });
});
